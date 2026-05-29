#!/usr/bin/env tsx
/**
 * Recipe drift verifier.
 *
 * Scans docs/recipes/*.md for known-invented patterns surfaced by the
 * Wave A.10 verifier sweep. Re-flags any regression — i.e., a future
 * commit that re-introduces `Agent.create()`, `behavior.budget.*`,
 * `agent.discover()`, `x402Client`, etc. would fail this check.
 *
 * Use as a CI gate: any non-zero exit = a recipe is out of sync with
 * the literal V1 SDK surface again. Add to .github/workflows/* with:
 *
 *   - name: Verify recipes against V1 surface
 *     run: npx tsx scripts/verify-recipes.ts
 *
 * To extend the rule set, add an entry to BAD_PATTERNS below.
 *
 * Non-goals (deliberately out of scope):
 *   - Full AST verification of code blocks (use the parallel feature-dev
 *     verifier agents for that; this is a fast regex gate)
 *   - Verifying live SDK source matches the recipe (truth-ledger does that
 *     via `npm run truth-ledger:check` + the daily refresh workflow)
 *
 * Add new known-bad patterns here as drift gets observed in the wild.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const RECIPES_DIR = path.resolve(__dirname, '..', 'docs', 'recipes');

interface Rule {
  /** What to grep for. */
  pattern: RegExp;
  /** Human-readable reason for the rule. */
  reason: string;
  /** Where the actual V1 path lives (so the fix path is one search away). */
  fix: string;
  /** Exceptions: paths or regions where the pattern is *allowed* (e.g., the
      V1 caveat banner deliberately mentions the bad surface). */
  allowIfLineMatches?: RegExp;
}

/**
 * Global allow-list of phrases that indicate the line is **explaining** why
 * the bad surface doesn't exist, rather than calling it. Applies to all
 * rules; matches anywhere on the line.
 */
const EXPLANATORY_PHRASES = new RegExp(
  [
    'not (exposed|exported|shipped|implemented|on Agent|on the Agent)',
    'no (top-level |separate |such )?(`?\\w+`? )?(export|middleware|class|method|getter|helper)',
    'does not (exist|exist in V1|expose|surface)',
    'no `\\w+`',
    "there's no",
    'There is no',
    'is the V1 entry point',
    'is not a V1',
    "isn't in V1",
    'V1 does not',
    'V1 SDK does not',
    'V1 has (?:no|none)',
    'V1 is\\b',
    'V2 roadmap',
    'V2 helper',
    'V2 pattern',
    'conceptual target',
    'conceptual integration shape',
    'deferred to V',
    'on the V2 roadmap',
    'pre-V1',
    'use `?agent\\.client\\.',
    'use \\.build\\(',
    'is type-only',
    'reads keystore via env per AIP-13',
    'not a real event',
  ].join('|'),
  'i',
);

const BAD_PATTERNS: Rule[] = [
  {
    pattern: /\bawait\s+Agent\.create\(/,
    reason: 'Python: Agent.create() classmethod does not exist on V1 SDK',
    fix: 'Use Agent(AgentConfig(name=..., network=..., wallet=...))',
  },
  {
    pattern: /\bAgirailsAgent\.create\(/,
    reason: 'Same as Agent.create — V1 has no factory classmethod',
    fix: 'Use AgirailsAgent(AgentConfig(...))',
  },
  {
    pattern: /\btimeout_seconds\s*=/,
    reason: 'Python request() takes timeout (in seconds), not timeout_seconds',
    fix: 'Use timeout=N',
  },
  {
    pattern: /\bawait\s+ctx\.progress\(/,
    reason: 'ctx.progress is synchronous — awaiting raises TypeError',
    fix: 'Use ctx.progress(N, "msg") without await',
  },
  {
    pattern: /\bprivateKey:\s*process\.env/,
    reason: 'AgentConfig has no privateKey field',
    fix: "Use wallet: 'auto' (env-loaded per AIP-13) or wallet: '0xKEY'",
  },
  {
    pattern: /\bbehavior\s*:\s*\{[^}]*\bbudget\s*:/s,
    reason: 'behavior.budget is not a V1 AgentBehavior field',
    fix: 'Enforce caps at app level (see autonomous-agent recipe)',
  },
  {
    pattern: /\bbehavior\s*:\s*\{[^}]*\bpricing\s*:/s,
    reason: 'behavior.pricing is not a V1 AgentBehavior field',
    fix: 'Pricing policy lives in the covenant {slug}.md pricing: block',
  },
  {
    pattern: /\bagent\.discover\(/,
    reason: 'Agent class has no discover() in V1',
    fix: 'Use agent.client.contracts.agentRegistry.findByService(name) or the MCP server discoverAgents tool',
  },
  {
    pattern: /\bagent\.(dispute|disputeAsProvider|cancel)\(/,
    reason: 'Agent class has no dispute/cancel helpers in V1',
    fix: "Use agent.client.standard.transitionState(txId, 'DISPUTED' | 'CANCELLED', proof?)",
  },
  {
    pattern: /\bagent\.getTransaction\(/,
    reason: 'Agent class has no getTransaction in V1',
    fix: 'Use agent.client.standard.getTransaction(txId)',
  },
  {
    pattern: /\bagent\.fetchReceipt\(/,
    reason: 'Agent class has no fetchReceipt in V1',
    fix: 'Fetch from IPFS CID directly; verification helper deferred to V2',
  },
  {
    pattern: /\bagent\.getReputation\(/,
    reason: 'Agent class has no getReputation in V1',
    fix: 'Use agent.client.getReputationReporter()',
  },
  {
    pattern: /\bagent\.eoa\b/,
    reason: 'Agent class has no eoa getter in V1',
    fix: 'agent.address returns the SCW. The underlying EOA is not exposed at the Agent level.',
  },
  {
    pattern: /\bagent\.signer\b/,
    reason: 'Agent class has no signer property in V1',
    fix: 'Use the wallet provider signer directly when constructing builders',
  },
  {
    pattern: /\bctx\.reject\(/,
    reason: 'JobContext has no reject() in V1',
    fix: 'Use behavior.autoAccept callback OR ServiceFilter.minBudget for up-front rejection',
  },
  {
    pattern: /import\s*\{\s*acceptQuote\s*\}/,
    reason: 'acceptQuote is not a top-level export of @agirails/sdk',
    fix: 'Use agent.client.standard.acceptQuote(txId, amount)',
  },
  {
    pattern: /import\s*\{[^}]*\b(uploadReceipt|fetchReceipt)\b[^}]*\}\s*from\s*['"]@agirails\/sdk['"]/,
    reason: 'uploadReceipt/fetchReceipt are not top-level exports of @agirails/sdk',
    fix: 'V1: upload auto on DELIVERED transition; fetch via IPFS gateway',
  },
  {
    pattern: /\bx402Client\b/,
    reason: 'x402Client is not exported from @agirails/sdk',
    fix: 'Use ACTPClient + client.pay({to: "https://...", amount}) or X402Adapter directly',
    allowIfLineMatches: /not exported|conceptual target|V1 surface — verify/i,
  },
  {
    pattern: /\brequirePayment\b/,
    reason: 'requirePayment middleware is not exported from @agirails/sdk',
    fix: 'Roll your own EIP-3009 verification server-side',
    allowIfLineMatches: /not (exposed|exported|shipped)|conceptual target|V1 surface — verify|without on-server/i,
  },
  {
    pattern: /from\s+agirails\.x402\s+import\s+X402Client/,
    reason: 'agirails.x402.X402Client does not exist in V1 Python SDK',
    fix: 'Use ACTPClient.create + client.pay(...)',
  },
  {
    pattern: /\bBudgetExceededError\b/,
    reason: 'BudgetExceededError is not exported in V1',
    fix: 'Enforce caps at app level + handle DisputeRaisedError / InsufficientFundsError',
  },
  {
    pattern: /agent\.on\(['"]payment:sent['"]/,
    reason: "'payment:sent' is not a V1 event",
    fix: 'Read agent.stats.totalSpent before each request() call',
  },
  {
    pattern: /agent\.on\(['"]job:started['"]|agent\.on\(['"]job:completed['"]/,
    reason: "'job:started' / 'job:completed' are not V1 events",
    fix: "Use 'job:received' (start), instrument completion inside your handler",
  },
  {
    pattern: /\bagent\.stats\.completedJobs\b/,
    reason: 'AgentStats field is jobsCompleted, not completedJobs',
    fix: 'Use agent.stats.jobsCompleted',
  },
  {
    pattern: /\bagent\.stats\.avgMargin\b/,
    reason: 'agent.stats.avgMargin is not in AgentStats',
    fix: 'Compute margin in your own metrics layer',
  },
  {
    pattern: /CounterOfferBuilder\s*\.\s*for\(/,
    reason: 'CounterOfferBuilder is constructed, not chained via .for()',
    fix: 'new CounterOfferBuilder(signer, nonceManager).build({...})',
  },
  {
    pattern: /State\.(INITIATED|QUOTED|COMMITTED|IN_PROGRESS|DELIVERED|SETTLED|DISPUTED|CANCELLED)/,
    reason: 'TS State is a type-only export — runtime values undefined',
    fix: 'Pass string literals: client.standard.transitionState(txId, \'DELIVERED\', proof)',
    allowIfLineMatches: /Python|type annotation|from agirails/i,
  },
  {
    pattern: /agent\.on\(['"]dispute:(raised|resolved)['"]/,
    reason: "'dispute:raised' / 'dispute:resolved' are not V1 Agent events",
    fix: "Use runtime.getEvents().onStateChanged(..., (e) => { if (e.newState === 'DISPUTED') ... })",
  },
  {
    pattern: /\btx[?]?\.deliveryProofUri\b/,
    reason: 'Transaction has no deliveryProofUri field in V1',
    fix: 'Use tx.attestationUID and decode the EAS attestation to recover the receipt CID',
  },
  {
    pattern: /\be\.reason\b/,
    reason: 'DisputeRaisedError (and other ACTPError subclasses) have no .reason attribute',
    fix: 'Use str(e) for the error message',
  },
];

interface Violation {
  file: string;
  line: number;
  rule: Rule;
  match: string;
}

function scanFile(filepath: string): Violation[] {
  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.split('\n');
  const violations: Violation[] = [];

  // Skip the V1 caveat banner block — the banner deliberately names the bad
  // surface so readers know what's conceptual vs literal.
  let inBanner = false;
  let inCodeFence = false;
  let codeFenceLang = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith(':::caution V1 surface')) {
      inBanner = true;
      continue;
    }
    if (inBanner && line.trim() === ':::') {
      inBanner = false;
      continue;
    }
    if (inBanner) continue;

    // Track fenced code blocks so we can be stricter inside them
    const fence = line.match(/^```(\w*)/);
    if (fence) {
      if (!inCodeFence) {
        inCodeFence = true;
        codeFenceLang = fence[1];
      } else {
        inCodeFence = false;
        codeFenceLang = '';
      }
      continue;
    }

    for (const rule of BAD_PATTERNS) {
      const m = line.match(rule.pattern);
      if (!m) continue;
      if (rule.allowIfLineMatches && rule.allowIfLineMatches.test(line)) continue;
      // Global allow-list: explanatory phrases
      if (EXPLANATORY_PHRASES.test(line)) continue;
      violations.push({ file: filepath, line: i + 1, rule, match: m[0] });
    }
  }

  return violations;
}

function main() {
  const files = fs
    .readdirSync(RECIPES_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => path.join(RECIPES_DIR, f));

  const allViolations: Violation[] = [];
  for (const f of files) {
    allViolations.push(...scanFile(f));
  }

  console.log(`[verify:recipes] scanned ${files.length} recipe files`);
  if (allViolations.length === 0) {
    console.log('[verify:recipes] ✓ no V1-surface drift detected');
    return;
  }

  console.error(`[verify:recipes] ✗ ${allViolations.length} violation(s) found:\n`);
  for (const v of allViolations) {
    const rel = path.relative(process.cwd(), v.file);
    console.error(`  ${rel}:${v.line}`);
    console.error(`    match: ${v.match}`);
    console.error(`    why:   ${v.rule.reason}`);
    console.error(`    fix:   ${v.rule.fix}`);
    console.error();
  }
  process.exit(1);
}

main();
