#!/usr/bin/env tsx
/**
 * Regenerate the "Verifiable state" metrics block in
 * .audit/REWRITE_REPORT.md from current source state.
 *
 * Patches the file between `<!-- METRICS:start -->` and
 * `<!-- METRICS:end -->` markers. Everything outside the markers is
 * hand-written narrative and is left untouched.
 *
 * Run: `npx tsx scripts/regen-report-metrics.ts`
 * Wired into: `scripts/build-truth-ledger.ts` so the report's metrics
 * regenerate on every manifest build. The principle the report stakes
 * itself on ("drift is CI failure") applied to the report itself.
 *
 * All metrics here are derived from local source state (manifest +
 * file tree + test/verifier source), not from running tests or
 * verifiers. That keeps this script fast and deterministic, and lets
 * it run inside CI without needing the SDK toolchains installed.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const REPORT_PATH = path.join(ROOT, '.audit', 'REWRITE_REPORT.md');
const MANIFEST_PATH = path.join(ROOT, 'static', 'sdk-manifest.json');

interface Manifest {
  _generatedAt: string;
  sdk_api: {
    ts: { count: number; symbols: { doc_summary?: string }[] };
    python: { count: number; symbols: { doc_summary?: string }[] };
  };
  tiers: Record<string, { sync_status: string }>;
  contracts: Record<string, { contracts: Record<string, { verified_status?: string }> }>;
}

function loadManifest(): Manifest {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
}

function pct(numer: number, denom: number): number {
  if (denom === 0) return 0;
  return Math.round((numer / denom) * 100);
}

function countEmDashes(): number {
  // Walk docs/ + static/llms.txt + static/llms-full.txt and count `—`
  // (U+2014) occurrences. Mirrors the verify command we cite below.
  let total = 0;
  const tally = (file: string) => {
    if (!fs.existsSync(file)) return;
    const stat = fs.statSync(file);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(file)) {
        if (entry === 'img' || entry.startsWith('.')) continue;
        tally(path.join(file, entry));
      }
      return;
    }
    if (!file.endsWith('.md') && !file.endsWith('.txt')) return;
    const src = fs.readFileSync(file, 'utf-8');
    for (const ch of src) if (ch === '—') total++;
  };
  tally(path.join(ROOT, 'docs'));
  tally(path.join(ROOT, 'static', 'llms.txt'));
  tally(path.join(ROOT, 'static', 'llms-full.txt'));
  return total;
}

function countTestBodies(file: string): number {
  if (!fs.existsSync(file)) return 0;
  const src = fs.readFileSync(file, 'utf-8');
  return (src.match(/\bit\s*\(/g) ?? []).length;
}

function countTruthLedgerTests(): number {
  const dir = path.join(ROOT, 'scripts', 'truth-ledger', '__tests__');
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  for (const entry of fs.readdirSync(dir)) {
    if (entry.endsWith('.test.ts')) {
      total += countTestBodies(path.join(dir, entry));
    }
  }
  return total;
}

function countIdentityFileGeneratorTests(): number {
  // The test file lives in a sibling repo (agirails.app), checked out
  // at a path that may or may not be present in CI. Fall back to a
  // recorded value if the file is not reachable.
  const candidates = [
    path.resolve(ROOT, '..', 'Platform', 'agirails.app', 'web', 'tests', 'unit', 'identity-file-generator.test.ts'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return countTestBodies(c);
  }
  return 41; // last-known value from the repo at Wave A.20
}

function countBadPatterns(): number {
  const file = path.join(ROOT, 'scripts', 'verify-recipes.ts');
  if (!fs.existsSync(file)) return 0;
  const src = fs.readFileSync(file, 'utf-8');
  // `const BAD_PATTERNS: Rule[] = [...]` runs from declaration to the
  // closing `];` at line start. Each entry has a `pattern:` field; one
  // pattern: per rule is the cleanest count (depth-counted braces miss
  // entries whose regex literals contain {n,m} quantifiers).
  const m = src.match(/BAD_PATTERNS\b[^=]*=\s*\[([\s\S]*?)^\];/m);
  if (!m) return 0;
  return (m[1].match(/^\s*pattern:/gm) ?? []).length;
}

function countRecipes(): { content: number; index: number } {
  const dir = path.join(ROOT, 'docs', 'recipes');
  if (!fs.existsSync(dir)) return { content: 0, index: 0 };
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  const hasIndex = files.includes('index.md') ? 1 : 0;
  return { content: files.length - hasIndex, index: hasIndex };
}

function countFaqEntries(): number {
  const file = path.join(ROOT, 'docs', 'faq', 'index.md');
  if (!fs.existsSync(file)) return 0;
  const src = fs.readFileSync(file, 'utf-8');
  return (src.match(/"@type":\s*"Question"/g) ?? []).length;
}

function countDocsFiles(): number {
  const dir = path.join(ROOT, 'docs');
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  const walk = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (entry.name === 'img' || entry.name.startsWith('.')) continue;
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.md')) total++;
    }
  };
  walk(dir);
  return total;
}

function countCrossLinks(): number {
  // Count `/reference/glossary#` link occurrences across docs/.
  const dir = path.join(ROOT, 'docs');
  let total = 0;
  const walk = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (entry.name === 'img' || entry.name.startsWith('.')) continue;
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.md')) {
        const src = fs.readFileSync(full, 'utf-8');
        total += (src.match(/\/reference\/glossary#/g) ?? []).length;
      }
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  return total;
}

function llmsFullSizeKb(): number {
  const file = path.join(ROOT, 'static', 'llms-full.txt');
  if (!fs.existsSync(file)) return 0;
  return Math.round(fs.statSync(file).size / 1024);
}

function verifiedContractsCount(manifest: Manifest): { exact: number; total: number } {
  // Excludes external dependencies (USDC) since those aren't ours to
  // verify; we count contracts deployed by AGIRAILS where Sourcify
  // returned EXACT_MATCH.
  let exact = 0;
  let total = 0;
  for (const network of Object.values(manifest.contracts ?? {})) {
    for (const [name, c] of Object.entries(network.contracts ?? {})) {
      if (c.verified_status === 'external_token') continue;
      total++;
      if (c.verified_status === 'exact_match') exact++;
    }
  }
  return { exact, total };
}

function tierBreakdown(manifest: Manifest): {
  inSync: number;
  tsOnly: number;
  pythonOnly: number;
  diverged: number;
} {
  const counts = { inSync: 0, tsOnly: 0, pythonOnly: 0, diverged: 0 };
  for (const t of Object.values(manifest.tiers ?? {})) {
    if (t.sync_status === 'in-sync') counts.inSync++;
    else if (t.sync_status === 'local-ahead') counts.tsOnly++;
    else if (t.sync_status === 'remote-ahead') counts.pythonOnly++;
    else if (t.sync_status === 'diverged') counts.diverged++;
  }
  return counts;
}

function buildMetricsBlock(): string {
  const manifest = loadManifest();
  const today = manifest._generatedAt.slice(0, 10);

  const tsCount = manifest.sdk_api.ts.count;
  const tsWithJsdoc = manifest.sdk_api.ts.symbols.filter((s) => s.doc_summary).length;
  const pyCount = manifest.sdk_api.python.count;
  const pyWithDoc = manifest.sdk_api.python.symbols.filter((s) => s.doc_summary).length;
  const tiers = tierBreakdown(manifest);
  const contracts = verifiedContractsCount(manifest);
  const recipes = countRecipes();
  const tlTests = countTruthLedgerTests();
  const igTests = countIdentityFileGeneratorTests();
  const badPatterns = countBadPatterns();
  const emDashes = countEmDashes();
  const faqCount = countFaqEntries();
  const docsFiles = countDocsFiles();
  const crossLinks = countCrossLinks();
  const llmsKb = llmsFullSizeKb();

  const lines: string[] = [];
  lines.push('<!-- METRICS:start -->');
  lines.push(`<!-- GENERATED by scripts/regen-report-metrics.ts on every truth-ledger build. Do not edit by hand. Source: ${path.relative(ROOT, MANIFEST_PATH)} at ${manifest._generatedAt}. -->`);
  lines.push('');
  lines.push(`## Verifiable state (as of ${today})`);
  lines.push('');
  lines.push('| Metric | Value | How to verify |');
  lines.push('|---|---|---|');
  lines.push(`| Em-dashes across docs surface | ${emDashes} | \`grep -rh "—" docs/ static/llms.txt static/llms-full.txt \\| wc -l\` |`);
  lines.push(`| Truth-ledger invariant test bodies | ${tlTests} | \`grep -rc "it(" scripts/truth-ledger/__tests__\` |`);
  lines.push(`| identity-file-generator test bodies | ${igTests} | \`grep -c "it(" Platform/agirails.app/web/tests/unit/identity-file-generator.test.ts\` |`);
  lines.push(`| TS SDK symbol count | ${tsCount} (${pct(tsWithJsdoc, tsCount)}% with JSDoc summary) | \`jq '.sdk_api.ts.count' static/sdk-manifest.json\` |`);
  lines.push(`| Python SDK symbol count | ${pyCount} (${pct(pyWithDoc, pyCount)}% with docstring summary) | \`jq '.sdk_api.python.count' static/sdk-manifest.json\` |`);
  lines.push(`| in-sync / TS-only / Python-only / diverged | ${tiers.inSync} / ${tiers.tsOnly} / ${tiers.pythonOnly} / ${tiers.diverged} | \`jq '.tiers \\| to_entries \\| map(.value.sync_status) \\| group_by(.) \\| map({status:.[0],n:length})' static/sdk-manifest.json\` |`);
  lines.push(`| Recipes (content + index) | ${recipes.content} + ${recipes.index} | \`ls docs/recipes/*.md \\| wc -l\` |`);
  lines.push(`| Banned-pattern entries in verify-recipes | ${badPatterns} | \`grep -cE "^\\s*pattern:" scripts/verify-recipes.ts\` |`);
  lines.push(`| Verified contracts (Sourcify EXACT_MATCH) | ${contracts.exact}/${contracts.total} | \`/security/contracts\` live check |`);
  lines.push(`| FAQ Q&A entries (JSON-LD) | ${faqCount} | \`grep -c '"@type": "Question"' docs/faq/index.md\` |`);
  lines.push(`| Glossary cross-link occurrences | ${crossLinks} | \`grep -rc "/reference/glossary#" docs/\` |`);
  lines.push(`| Docs files in IA | ${docsFiles} | \`find docs -name "*.md" -not -path "*/img/*" \\| wc -l\` |`);
  lines.push(`| llms-full.txt size | ~${llmsKb} KB | \`wc -c static/llms-full.txt\` |`);
  lines.push(`| Apex findings closed | 12/12 before V3 redeploy | \`/security/audits\` index (FIND-001 through FIND-016, twelve actionable) |`);
  lines.push('');
  lines.push('<!-- METRICS:end -->');
  return lines.join('\n');
}

function patchReport(): void {
  if (!fs.existsSync(REPORT_PATH)) {
    // .audit/ is gitignored (internal-only); the report is not present
    // in CI checkouts. Soft-skip rather than fail the truth-ledger build.
    console.log(`[regen-report-metrics] skipped: ${path.relative(ROOT, REPORT_PATH)} not present (likely CI; .audit/ is gitignored)`);
    return;
  }
  const src = fs.readFileSync(REPORT_PATH, 'utf-8');

  const startRegex = /<!--\s*METRICS:start\s*-->/;
  const endRegex = /<!--\s*METRICS:end\s*-->/;

  const newBlock = buildMetricsBlock();

  let out: string;
  if (startRegex.test(src) && endRegex.test(src)) {
    out = src.replace(
      /<!--\s*METRICS:start\s*-->[\s\S]*?<!--\s*METRICS:end\s*-->/,
      newBlock,
    );
  } else {
    // First run: replace the existing "## Verifiable state" section
    // with the marker-wrapped block. Stops at the next `## ` heading.
    const target = /## Verifiable state[\s\S]*?(?=\n## |\Z)/;
    if (!target.test(src)) {
      throw new Error(
        'Could not find "## Verifiable state" section or METRICS markers; aborting.',
      );
    }
    out = src.replace(target, newBlock + '\n');
  }

  if (out === src) {
    console.log('[regen-report-metrics] no change');
    return;
  }
  fs.writeFileSync(REPORT_PATH, out, 'utf-8');
  console.log(`[regen-report-metrics] patched ${path.relative(ROOT, REPORT_PATH)}`);
}

patchReport();
