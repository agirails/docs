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
const GLOSSARY_PATH = path.join(ROOT, 'docs', 'reference', 'glossary.md');
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
// 3. Extract glossary digest from docs/reference/glossary.md
// ============================================================
//
// RAG retrieval misses on alphanumeric tokens like "INV-30", "AIP-14",
// "EAS", "EOA", "SCW" because their embedding similarity to surrounding
// prose is weak — these are short tight strings that don't carry
// semantic context until the term is expanded. Live test caught it:
// "What's INV-30?" came back as "I don't have specific information" even
// though /protocol/escrow#inv-30--per-transaction-locked-bps is fully
// documented and indexed.
//
// Fix: extract every `### Term` heading from glossary.md, take the first
// sentence/paragraph as the definition, capture the explicit anchor ID
// if present (via `{#anchor-id}`), and emit a compact lookup table. The
// chat now has these definitions in-prompt — no RAG retrieval needed
// for high-traffic protocol artifacts.

interface GlossaryEntry {
  term: string;
  anchor: string;
  definition: string;
}

function extractGlossaryDigest(): GlossaryEntry[] {
  if (!fs.existsSync(GLOSSARY_PATH)) {
    console.warn(`[generate-chat-grounding] WARN: glossary not found at ${GLOSSARY_PATH}`);
    return [];
  }
  const src = fs.readFileSync(GLOSSARY_PATH, 'utf-8');

  // Strip frontmatter.
  const body = src.replace(/^---[\s\S]*?\n---\n/, '');

  // Slugify a heading to Docusaurus' default kebab-case anchor. This is
  // a simplified version (lowercases, replaces non-alphanumeric runs
  // with dashes, trims dashes). Explicit `{#anchor}` IDs override.
  const slugify = (s: string): string =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const entries: GlossaryEntry[] = [];
  // Heading line: `### Term {#optional-anchor}`. Capture both the
  // start of the heading line (headingStart) and the start of the
  // body content (bodyStart = right after the heading). Need both
  // because each entry's slice runs from THIS bodyStart up to the
  // NEXT heading's headingStart (not bodyStart, which already cuts
  // into the next entry's content).
  const headingRegex = /^###\s+(.+?)(?:\s+\{#([^}]+)\})?\s*$/gm;
  let m: RegExpExecArray | null;
  const positions: Array<{ term: string; anchor: string; headingStart: number; bodyStart: number }> = [];
  while ((m = headingRegex.exec(body)) !== null) {
    const term = m[1].trim();
    const anchor = (m[2] || slugify(term)).trim();
    positions.push({
      term,
      anchor,
      headingStart: m.index,
      bodyStart: m.index + m[0].length,
    });
  }

  for (let i = 0; i < positions.length; i++) {
    const { term, anchor, bodyStart } = positions[i];
    // Slice up to the NEXT heading's start (or any ## section break
    // that comes first — the glossary uses ## as section dividers).
    const upperBound = i + 1 < positions.length ? positions[i + 1].headingStart : body.length;
    const between = body.slice(bodyStart, upperBound);
    // If a ## section heading appears in `between`, truncate at it.
    const sectionBreak = between.search(/\n## /);
    const slice = (sectionBreak >= 0 ? between.slice(0, sectionBreak) : between).trim();

    // Take the first non-empty paragraph after the heading. Skip any
    // "See:" cross-reference lines and "**Bold-prefix**" tag-line styles
    // that don't carry the definition.
    const paragraphs = slice.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
    let definition = '';
    for (const p of paragraphs) {
      // Skip pure "See: [...]" cross-refs at top of an entry.
      if (/^See:?\s/.test(p) && !definition) continue;
      definition = p;
      break;
    }
    if (!definition) continue;

    // Strip markdown formatting and links to keep the digest compact.
    definition = definition
      .replace(/\*\*([^*]+)\*\*/g, '$1') // **bold** -> bold
      .replace(/\*([^*]+)\*/g, '$1')      // *italic* -> italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](link) -> text
      .replace(/`([^`]+)`/g, '$1')        // `code` -> code
      .replace(/\s+/g, ' ')
      .trim();

    // Cap each definition at ~200 chars to keep the digest tight.
    if (definition.length > 240) {
      definition = definition.slice(0, 230).replace(/\s+\S*$/, '') + '...';
    }

    entries.push({ term, anchor, definition });
  }

  return entries;
}

function formatGlossaryBlock(entries: GlossaryEntry[]): string {
  const lines: string[] = [];
  lines.push('CANONICAL GLOSSARY DIGEST — extracted from docs/reference/glossary.md.');
  lines.push('Use this as the AUTHORITATIVE definition for any term listed below, even if RAG retrieval came back weak. Each term links to its canonical glossary entry (/reference/glossary#anchor).');
  lines.push('');
  for (const e of entries) {
    lines.push(`- **${e.term}** (/reference/glossary#${e.anchor}): ${e.definition}`);
  }
  return lines.join('\n');
}

// ============================================================
// 4. Emit api/_chat-grounding.ts
// ============================================================

function emit(badPatternsBlock: string, surfaceGroundingBlock: string, glossaryBlock: string): void {
  // The chat function runs on Vercel edge runtime which can't `fs.readFile`
  // at runtime, so we bundle the blocks as TS string constants. Imports work
  // fine on edge.
  const content = `// AUTO-GENERATED by scripts/generate-chat-grounding.ts
// DO NOT EDIT BY HAND. Regenerate via \`npm run prebuild\` (runs in CI on
// every Vercel deploy). Source of truth:
//   - scripts/verify-recipes.ts        (BAD_PATTERNS)
//   - static/sdk-manifest.json         (SURFACE_GROUNDING)
//   - docs/reference/glossary.md       (GLOSSARY_DIGEST)
// Touch those files; this re-renders.

/* eslint-disable */

export const BAD_PATTERNS_BLOCK = ${JSON.stringify(badPatternsBlock)};

export const SURFACE_GROUNDING_BLOCK = ${JSON.stringify(surfaceGroundingBlock)};

export const GLOSSARY_DIGEST_BLOCK = ${JSON.stringify(glossaryBlock)};

export const CHAT_GROUNDING_GENERATED_AT = ${JSON.stringify(new Date().toISOString())};
`;

  fs.writeFileSync(OUTPUT_PATH, content, 'utf-8');
  console.log(`[generate-chat-grounding] wrote ${path.relative(ROOT, OUTPUT_PATH)}`);
  console.log(`  BAD_PATTERNS_BLOCK:      ${badPatternsBlock.length} chars`);
  console.log(`  SURFACE_GROUNDING_BLOCK: ${surfaceGroundingBlock.length} chars`);
  console.log(`  GLOSSARY_DIGEST_BLOCK:   ${glossaryBlock.length} chars`);
}

function main() {
  console.log('[generate-chat-grounding] extracting BAD_PATTERNS from verify-recipes.ts...');
  const rules = extractBadPatterns();
  console.log(`  ${rules.length} rules extracted`);

  console.log('[generate-chat-grounding] loading sdk-manifest.json...');
  const manifest = loadManifest();
  console.log(`  TS symbols:     ${manifest.sdk_api.ts.symbols.length}`);
  console.log(`  Python symbols: ${manifest.sdk_api.python.symbols.length}`);

  console.log('[generate-chat-grounding] extracting glossary digest from docs/reference/glossary.md...');
  const glossary = extractGlossaryDigest();
  console.log(`  ${glossary.length} terms extracted`);

  const badPatternsBlock = formatBadPatternsBlock(rules);
  const surfaceGroundingBlock = formatSurfaceGroundingBlock(manifest);
  const glossaryBlock = formatGlossaryBlock(glossary);

  emit(badPatternsBlock, surfaceGroundingBlock, glossaryBlock);
}

main();
