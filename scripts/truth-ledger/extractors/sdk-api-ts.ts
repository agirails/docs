/**
 * TypeScript SDK API surface extractor.
 *
 * Reads `sdk-js/src/index.ts` (the barrel) and extracts the public
 * symbols. v1 uses focused regex on each `export { ... } from '...'`
 * block; multi-line block bodies are supported via balanced-brace
 * counting.
 *
 * A2 plan called for `ts.createProgram` AST walk; for barrel symbol
 * enumeration the regex approach is sufficient (single-thesis exports
 * separated by commas, no destructuring rename edge cases needed for
 * symbol-name extraction). If the barrel ever uses `export *` or
 * complex namespace re-exports, this needs upgrading.
 *
 * Pre-wires `tier_from_source` flag for post-v1 `@tier` JSDoc tag
 * migration. v1 always emits `tier_from_source: false`.
 *
 * Per A2 architecture.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Extractor, ExtractorConfig, RawSurface, Tier } from '../types.ts';
import { getTier } from '../tier-map.ts';
import { extractTsDocSummaries } from './doc-summary.ts';

// ============================================================
// Output shape
// ============================================================

interface TsSymbol {
  name: string;
  kind: 'export-from' | 'export-class' | 'export-function' | 'export-interface' | 'export-type' | 'export-enum' | 'export-const';
  tier: Tier;
  tier_from_source: boolean;
  /** First-paragraph JSDoc summary if found in source. */
  doc_summary?: string;
}

export interface SdkApiTsSurfaceData {
  package_name: string;
  package_version: string;
  source_file: string;
  symbols: TsSymbol[];
  count: number;
}

// ============================================================
// Parse barrel
// ============================================================

const BARREL_REL = 'src/index.ts';

function readTsPackageVersion(config: ExtractorConfig): string {
  const pkgPath = path.join(config.sdkJsRoot, 'package.json');
  if (!fs.existsSync(pkgPath)) return 'unknown';
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return pkg.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Find balanced { ... } block starting at openIdx (which must point to `{`).
 */
function extractBraceBlock(src: string, openIdx: number): string {
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return src.slice(openIdx + 1, i);
    }
  }
  return '';
}

/**
 * Parse `export { A, B, type C, D as E } from '...'` blocks.
 * Returns symbol names (using post-rename names when `as` is present;
 * stripping leading `type` modifier).
 */
function parseReExportBlocks(src: string, warnings: string[]): TsSymbol[] {
  const out: TsSymbol[] = [];
  // Match both `export { ... }` and `export type { ... }` — the optional
  // `type` modifier is what most type-only re-export blocks use, and dropping
  // it would make ~100 type symbols invisible to the manifest (and the
  // cross-SDK diff would falsely flag them as Python-only).
  const reExportRegex = /export\s+(?:type\s+)?\{/g;
  let m: RegExpExecArray | null;
  while ((m = reExportRegex.exec(src)) !== null) {
    const openIdx = m.index + m[0].length - 1; // position of `{`
    const body = extractBraceBlock(src, openIdx);
    if (!body) {
      warnings.push(`Unbalanced export-block near offset ${openIdx}`);
      continue;
    }
    // Strip line comments
    const clean = body.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    // Split by comma at top level
    const parts = clean.split(',').map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      // Strip leading `type` modifier
      const trimmed = part.replace(/^type\s+/, '');
      // Handle `OriginalName as ExportedName`
      const asMatch = trimmed.match(/^(\w+)\s+as\s+(\w+)/);
      const name = asMatch ? asMatch[2] : trimmed.split(/\s+/)[0];
      if (!/^\w+$/.test(name)) continue; // skip anything that isn't a clean identifier
      out.push({
        name,
        kind: 'export-from',
        tier: getTier(name),
        tier_from_source: false,
      });
    }
  }
  return out;
}

/**
 * Parse inline `export class/function/interface/type/enum/const Name` declarations.
 */
function parseInlineExports(src: string): TsSymbol[] {
  const out: TsSymbol[] = [];
  const patterns: { regex: RegExp; kind: TsSymbol['kind'] }[] = [
    { regex: /export\s+(?:abstract\s+)?class\s+(\w+)/g, kind: 'export-class' },
    { regex: /export\s+(?:async\s+)?function\s+(\w+)/g, kind: 'export-function' },
    { regex: /export\s+interface\s+(\w+)/g, kind: 'export-interface' },
    { regex: /export\s+type\s+(\w+)\s*=/g, kind: 'export-type' },
    { regex: /export\s+enum\s+(\w+)/g, kind: 'export-enum' },
    { regex: /export\s+const\s+(\w+)/g, kind: 'export-const' },
  ];
  for (const { regex, kind } of patterns) {
    let m: RegExpExecArray | null;
    while ((m = regex.exec(src)) !== null) {
      const name = m[1];
      out.push({
        name,
        kind,
        tier: getTier(name),
        tier_from_source: false,
      });
    }
  }
  return out;
}

// ============================================================
// Public extractor
// ============================================================

export const sdkApiTsExtractor: Extractor = {
  surface: 'sdk-api-ts',

  async extract(config: ExtractorConfig): Promise<RawSurface> {
    const warnings: string[] = [];
    const barrelPath = path.join(config.sdkJsRoot, BARREL_REL);
    if (!fs.existsSync(barrelPath)) {
      throw new Error(`TS SDK barrel not found at ${barrelPath}`);
    }
    const src = fs.readFileSync(barrelPath, 'utf-8');

    const reExports = parseReExportBlocks(src, warnings);
    const inlineExports = parseInlineExports(src);

    // Dedupe by name (a symbol may appear in both inline and re-export
    // contexts in some files; prefer the first occurrence).
    const seen = new Set<string>();
    const symbols: TsSymbol[] = [];
    for (const s of [...inlineExports, ...reExports]) {
      if (seen.has(s.name)) continue;
      seen.add(s.name);
      symbols.push(s);
    }
    symbols.sort((a, b) => a.name.localeCompare(b.name));

    if (symbols.length === 0) {
      warnings.push('Zero symbols extracted from TS barrel — parser may have failed silently');
    }

    // Attach JSDoc summaries by walking the SDK source tree
    const srcRoot = path.join(config.sdkJsRoot, 'src');
    const docs = extractTsDocSummaries(srcRoot);
    let attached = 0;
    for (const sym of symbols) {
      const summary = docs.summaries[sym.name];
      if (summary) {
        sym.doc_summary = summary;
        attached++;
      }
    }
    if (attached === 0 && symbols.length > 0) {
      warnings.push('JSDoc extractor attached 0 summaries — check src tree path');
    }

    const data: SdkApiTsSurfaceData = {
      package_name: '@agirails/sdk',
      package_version: readTsPackageVersion(config),
      source_file: BARREL_REL,
      symbols,
      count: symbols.length,
    };

    return {
      surface: 'sdk-api-ts',
      extractedAt: new Date().toISOString(),
      sourceVersion: data.package_version,
      data,
      warnings,
    };
  },
};
