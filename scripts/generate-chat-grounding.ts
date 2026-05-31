#!/usr/bin/env tsx
/**
 * Generates `api/_chat-grounding.ts` — the structured grounding
 * block(s) the chat's SYSTEM_PROMPT consumes at function-cold-start.
 *
 * Two outputs:
 *
 *   1. BAD_PATTERNS_BLOCK
 *      A reformatted version of every `Rule` entry in
 *      `scripts/verify-recipes.ts`. The chat used to hallucinate
 *      `uploadReceipt`, `Agent.create()`, `client.kernel`,
 *      `payment:sent`, etc. — every single one was already banned
 *      in verify-recipes but the chat's SYSTEM_PROMPT carried a
 *      hand-curated subset. Auto-sync closes the gap: when a new
 *      BAD_PATTERN lands in verify-recipes, the chat learns about
 *      it on the next build.
 *
 *   2. SURFACE_GROUNDING_BLOCK
 *      A compact symbol grounding extracted from `static/sdk-manifest.json`:
 *        - TS public exports, by tier (simple / standard / advanced)
 *        - Python public exports, by tier
 *        - Cross-SDK name diffs (which Python snake_case maps to
 *          which TS camelCase, when they actually differ)
 *        - Python-only / TS-only divergences (filtered, not raw)
 *      The chat used to camelCase Python `upload_receipt` to a
 *      non-existent TS `uploadReceipt` because it had no structured
 *      ground-truth of "what's actually exported where." This gives
 *      it one.
 *
 * Wired into `prebuild` so the chat function bundles fresh grounding
 * on every Vercel deploy (alongside llms-full.txt regeneration).
 *
 * Run manually:
 *   npx tsx scripts/generate-chat-grounding.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const VERIFY_RECIPES_PATH = path.join(ROOT, 'scripts', 'verify-recipes.ts');
const MANIFEST_PATH = path.join(ROOT, 'static', 'sdk-manifest.json');
const OUTPUT_PATH = path.join(ROOT, 'api', '_chat-grounding.ts');

// ============================================================
// 1. Extract BAD_PATTERNS from verify-recipes.ts
// ============================================================
//
// verify-recipes.ts exports a `BAD_PATTERNS: Rule[]` constant. Each
// entry has shape `{ pattern: RegExp, reason: string, fix: string,
// allowIfLineMatches?: RegExp }`. We extract them via regex over the
// source file (rather than dynamic require, which won't work cleanly
// here because the script also has CLI side effects on import).

interface ExtractedRule {
  patternSrc: string;
  reason: string;
  fix: string;
}

function extractBadPatterns(): ExtractedRule[] {
  const src = fs.readFileSync(VERIFY_RECIPES_PATH, 'utf-8');
  const rules: ExtractedRule[] = [];

  // Stateful line parser. Each rule object in BAD_PATTERNS has three
  // load-bearing lines we care about:
  //
  //     pattern: /regex/flags,
  //     reason: '...' | "..." | `...` (may contain mixed quotes),
  //     fix:    '...' | "..." | `...` (same),
  //
  // We track current pattern when seen, then capture reason + fix on
  // their respective lines. Any field type (e.g. `allowIfLineMatches`)
  // gets ignored. The pattern emitted is the literal source between
  // the opening and closing slash plus flags — we don't try to
  // execute it; just hand it to the LLM as a marker.
  const patternLine = /^\s*pattern:\s*(\/.+\/[gimsy]*)\s*,?\s*$/;
  const reasonLine = /^\s*reason:\s*(['"`])((?:\\.|(?!\1).)*)\1\s*,?\s*$/;
  const fixLine = /^\s*fix:\s*(['"`])((?:\\.|(?!\1).)*)\1\s*,?\s*$/;

  let current: { patternSrc?: string; reason?: string; fix?: string } = {};
  for (const rawLine of src.split('\n')) {
    const pm = rawLine.match(patternLine);
    if (pm) {
      // New rule; flush any previous (incomplete) and start fresh.
      current = { patternSrc: pm[1] };
      continue;
    }
    const rm = rawLine.match(reasonLine);
    if (rm && current.patternSrc) {
      current.reason = rm[2];
      continue;
    }
    const fm = rawLine.match(fixLine);
    if (fm && current.patternSrc && current.reason) {
      current.fix = fm[2];
      rules.push({
        patternSrc: current.patternSrc,
        reason: current.reason,
        fix: current.fix,
      });
      current = {};
    }
  }

  // Drop the interface definition entry that the parser picks up
  // (pattern: RegExp; reason: string; fix: string;).
  return rules.filter((r) => r.patternSrc.startsWith('/'));

  // (rules already returned above)
  return rules;
}

function formatBadPatternsBlock(rules: ExtractedRule[]): string {
  const lines: string[] = [];
  lines.push('AUTO-EXTRACTED BANNED PATTERNS — generated from scripts/verify-recipes.ts.');
  lines.push('These patterns are confirmed-wrong against the V1 SDK source. If you see RAG context that uses any of these shapes, IT IS WRONG even if it appears in the retrieved chunk. Substitute the FIX shown below.');
  lines.push('');
  rules.forEach((r, i) => {
    lines.push(`${i + 1}. Pattern: \`${r.patternSrc}\``);
    lines.push(`   Why wrong: ${r.reason}`);
    lines.push(`   Correct shape: ${r.fix}`);
  });
  return lines.join('\n');
}

// ============================================================
// 2. Extract surface grounding from sdk-manifest.json
// ============================================================

interface Manifest {
  _generatedAt: string;
  sdk_api: {
    ts: { symbols: Array<{ name: string; tier: string; kind?: string }>; package_version: string };
    python: { symbols: Array<{ name: string; tier: string }>; package_version: string };
  };
  divergences: {
    ts_only: { sdk_api: string[]; errors: string[]; cli: string[] };
    python_only: { sdk_api: string[]; errors: string[]; cli: string[] };
    name_diffs: Array<{ concept: string; ts: string; python: string; python_has_alias?: boolean; notes?: string }>;
  };
}

function loadManifest(): Manifest {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`Manifest not found: ${MANIFEST_PATH}. Run 'npm run truth-ledger' first.`);
  }
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
}

function groupSymbolsByTier(symbols: Array<{ name: string; tier: string }>): Record<string, string[]> {
  const out: Record<string, string[]> = { simple: [], standard: [], advanced: [], internal: [] };
  for (const s of symbols) {
    if (out[s.tier]) out[s.tier].push(s.name);
  }
  for (const tier of Object.keys(out)) {
    out[tier].sort();
  }
  return out;
}

function formatSurfaceGroundingBlock(manifest: Manifest): string {
  const lines: string[] = [];
  lines.push(`CANONICAL V1 SDK SURFACE — extracted from static/sdk-manifest.json (generated ${manifest._generatedAt.slice(0, 10)}).`);
  lines.push('Use this as the SOURCE OF TRUTH for which symbols exist where. If RAG context shows a symbol not in this list, the symbol DOES NOT EXIST in the V1 public surface and you must not use it.');
  lines.push('');
  lines.push(`TypeScript SDK: @agirails/sdk@${manifest.sdk_api.ts.package_version}`);
  lines.push(`Python SDK:     agirails@${manifest.sdk_api.python.package_version}`);
  lines.push('');

  const tsByTier = groupSymbolsByTier(manifest.sdk_api.ts.symbols);
  const pyByTier = groupSymbolsByTier(manifest.sdk_api.python.symbols);

  for (const tier of ['simple', 'standard'] as const) {
    lines.push(`## ${tier[0].toUpperCase()}${tier.slice(1)} tier`);
    lines.push(`TS:     ${tsByTier[tier].join(', ') || '(none)'}`);
    lines.push(`Python: ${pyByTier[tier].join(', ') || '(none)'}`);
    lines.push('');
  }

  // Advanced + internal as a compact aggregate (less critical for chat usage,
  // but useful so the model doesn't fabricate names).
  lines.push('## Advanced tier (sample; full list in /reference/sdk-js and /reference/sdk-python)');
  lines.push(`TS sample:     ${tsByTier.advanced.slice(0, 40).join(', ')}${tsByTier.advanced.length > 40 ? ', ...' : ''}`);
  lines.push(`Python sample: ${pyByTier.advanced.slice(0, 40).join(', ')}${pyByTier.advanced.length > 40 ? ', ...' : ''}`);
  lines.push('');

  // Cross-SDK divergences. Filtered (post-KNOWN_NAME_DIFFS), so this is the
  // genuine "exists in one SDK, not in the other" list.
  lines.push('## Genuinely TS-only exports (NOT in Python)');
  lines.push(manifest.divergences.ts_only.sdk_api.join(', ') || '(none)');
  lines.push('');
  lines.push('## Genuinely Python-only exports (NOT in TS — do NOT camelCase these into TS imports)');
  lines.push(manifest.divergences.python_only.sdk_api.join(', ') || '(none)');
  lines.push('');

  // Name diffs (curated).
  if (manifest.divergences.name_diffs.length > 0) {
    lines.push('## Curated cross-SDK name diffs (same concept, different name per SDK)');
    for (const d of manifest.divergences.name_diffs) {
      const alias = d.python_has_alias ? ' (Python re-exports the TS name as alias)' : '';
      lines.push(`- ${d.concept}: TS \`${d.ts}\` ↔ Python \`${d.python}\`${alias}`);
      if (d.notes) lines.push(`  ${d.notes}`);
    }
    lines.push('');
  }

  // Error-class divergences (frequent hallucination class).
  lines.push('## TS-only error classes');
  lines.push(manifest.divergences.ts_only.errors.join(', ') || '(none)');
  lines.push('');
  lines.push('## Python-only error classes');
  lines.push(manifest.divergences.python_only.errors.join(', ') || '(none)');

  return lines.join('\n');
}

// ============================================================
// 3. Emit api/_chat-grounding.ts
// ============================================================

function emit(badPatternsBlock: string, surfaceGroundingBlock: string): void {
  // The chat function runs on Vercel edge runtime which can't `fs.readFile`
  // at runtime, so we bundle the blocks as TS string constants. Imports work
  // fine on edge.
  const content = `// AUTO-GENERATED by scripts/generate-chat-grounding.ts
// DO NOT EDIT BY HAND. Regenerate via \`npm run prebuild\` (runs in CI on
// every Vercel deploy). Source of truth:
//   - scripts/verify-recipes.ts (BAD_PATTERNS)
//   - static/sdk-manifest.json  (SURFACE_GROUNDING)
// Touch those files; this re-renders.

/* eslint-disable */

export const BAD_PATTERNS_BLOCK = ${JSON.stringify(badPatternsBlock)};

export const SURFACE_GROUNDING_BLOCK = ${JSON.stringify(surfaceGroundingBlock)};

export const CHAT_GROUNDING_GENERATED_AT = ${JSON.stringify(new Date().toISOString())};
`;

  fs.writeFileSync(OUTPUT_PATH, content, 'utf-8');
  console.log(`[generate-chat-grounding] wrote ${path.relative(ROOT, OUTPUT_PATH)}`);
  console.log(`  BAD_PATTERNS_BLOCK:     ${badPatternsBlock.length} chars`);
  console.log(`  SURFACE_GROUNDING_BLOCK: ${surfaceGroundingBlock.length} chars`);
}

function main() {
  console.log('[generate-chat-grounding] extracting BAD_PATTERNS from verify-recipes.ts...');
  const rules = extractBadPatterns();
  console.log(`  ${rules.length} rules extracted`);

  console.log('[generate-chat-grounding] loading sdk-manifest.json...');
  const manifest = loadManifest();
  console.log(`  TS symbols:     ${manifest.sdk_api.ts.symbols.length}`);
  console.log(`  Python symbols: ${manifest.sdk_api.python.symbols.length}`);

  const badPatternsBlock = formatBadPatternsBlock(rules);
  const surfaceGroundingBlock = formatSurfaceGroundingBlock(manifest);

  emit(badPatternsBlock, surfaceGroundingBlock);
}

main();
