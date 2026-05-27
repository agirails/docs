/**
 * Per-symbol doc summary extractor.
 *
 * Walks a source tree and builds a map of `symbolName → summary line`
 * by scanning each file for:
 *
 *   TypeScript: `/** ... *​/` JSDoc block immediately preceding an export
 *               (class / interface / function / type / enum / const).
 *               The summary is the first non-empty line of the JSDoc
 *               body (after stripping leading `*` and `@param`/`@returns`
 *               directive lines).
 *
 *   Python:     The first string literal inside a `def` / `async def` /
 *               `class` body. Summary is the first line of that docstring.
 *
 * Approach: regex-based, no AST. JSDoc has stable shapes in the SDK code;
 * Python docstrings follow PEP-257 in the SDK. Edge cases (multi-line
 * decorators between docstring and def, `# type: ignore` interleaving)
 * may miss; v1 reports `null` for misses and surfaces a warning count.
 *
 * Consumer: `sdkApiTsExtractor` + `sdkApiPyExtractor` attach the summary
 * onto each `TsSymbol` / `PySymbol` as the optional `doc_summary` field.
 * `render-reference.ts` displays it in the symbol tables.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const MAX_SUMMARY_LEN = 220;

function walkDir(root: string, ext: '.ts' | '.py', out: string[] = []): string[] {
  if (!fs.existsSync(root)) return out;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '__pycache__' || entry.name === 'dist' || entry.name === 'build') continue;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) walkDir(full, ext, out);
    else if (entry.name.endsWith(ext) && !entry.name.endsWith('.d.ts') && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.test.py') && !entry.name.endsWith('_test.py')) out.push(full);
  }
  return out;
}

// ============================================================
// TypeScript: JSDoc → summary line
// ============================================================

const TS_DECL_RE =
  /(?:^|\n)\s*export\s+(?:default\s+)?(?:abstract\s+)?(?:async\s+)?(?:class|interface|function|type|enum|const|let|var)\s+(\w+)/g;

/**
 * Extract a JSDoc summary block immediately preceding the declaration
 * at `declStart` in `src`. Returns the cleaned first-paragraph summary,
 * or null if no JSDoc is present.
 */
function jsdocSummaryBefore(src: string, declStart: number): string | null {
  // Walk backwards from declStart over whitespace, then look for `*/`
  let i = declStart - 1;
  while (i > 0 && /\s/.test(src[i])) i--;
  if (i < 1 || src.slice(i - 1, i + 1) !== '*/') return null;

  // Find the matching `/**`
  const openIdx = src.lastIndexOf('/**', i);
  if (openIdx === -1) return null;

  const body = src.slice(openIdx + 3, i - 1);
  // Strip leading `*` from each line, trim
  const lines = body.split('\n').map((l) => l.replace(/^\s*\*\s?/, '').trimEnd());

  // First-paragraph summary: lines until blank line or `@tag` line
  const summaryLines: string[] = [];
  for (const ln of lines) {
    const trimmed = ln.trim();
    if (!trimmed) {
      if (summaryLines.length > 0) break;
      continue;
    }
    if (trimmed.startsWith('@')) break;
    summaryLines.push(trimmed);
  }
  if (summaryLines.length === 0) return null;

  let summary = summaryLines.join(' ').trim();
  if (summary.length > MAX_SUMMARY_LEN) summary = summary.slice(0, MAX_SUMMARY_LEN - 1) + '…';
  return summary;
}

export interface DocSummaryMap {
  [symbolName: string]: string;
}

export interface DocSummaryResult {
  summaries: DocSummaryMap;
  scannedFiles: number;
  hits: number;
}

/**
 * Build name → JSDoc-summary map for a TS source tree.
 * Walks every `.ts` file under `srcRoot` (excluding tests / .d.ts).
 */
export function extractTsDocSummaries(srcRoot: string): DocSummaryResult {
  const files = walkDir(srcRoot, '.ts');
  const summaries: DocSummaryMap = {};
  let hits = 0;
  for (const file of files) {
    let src: string;
    try {
      src = fs.readFileSync(file, 'utf-8');
    } catch {
      continue;
    }
    let m: RegExpExecArray | null;
    TS_DECL_RE.lastIndex = 0;
    while ((m = TS_DECL_RE.exec(src)) !== null) {
      const name = m[1];
      if (summaries[name]) continue; // first occurrence wins
      const summary = jsdocSummaryBefore(src, m.index);
      if (summary) {
        summaries[name] = summary;
        hits++;
      }
    }
  }
  return { summaries, scannedFiles: files.length, hits };
}

// ============================================================
// Python: docstring → summary line
// ============================================================

// Match `class Foo:` or `def foo(` or `async def foo(`. Capture the name.
const PY_DECL_RE = /(?:^|\n)\s*(?:class\s+(\w+)|(?:async\s+)?def\s+(\w+))/g;

/**
 * Extract a Python docstring from the body of a declaration. After matching
 * a `class Foo:` or `def foo(...)` line, the docstring is the first
 * string literal in the next non-blank lines.
 */
function pyDocstringAfter(src: string, declStart: number): string | null {
  // Find end of the declaration line(s): a line ending in `:`
  let i = declStart;
  while (i < src.length && src[i] !== '\n') i++;
  // If decl ends with `(` (multi-line signature), find the matching `):`
  // Heuristic: look for `:` at the end of a line, then move past it.
  let attempts = 0;
  while (attempts < 50 && i < src.length) {
    const lineStart = i + 1;
    let lineEnd = src.indexOf('\n', lineStart);
    if (lineEnd === -1) lineEnd = src.length;
    const line = src.slice(lineStart, lineEnd);
    // Stop when we see a closing `):` or just `:` at the end of a line
    if (/\):\s*$/.test(line.trimEnd()) || /:\s*$/.test(line.trimEnd())) {
      i = lineEnd;
      break;
    }
    i = lineEnd;
    attempts++;
  }

  // Now scan forward for the docstring opening (triple-quote)
  let scan = i;
  while (scan < src.length) {
    if (src[scan] === '\n' || src[scan] === ' ' || src[scan] === '\t') {
      scan++;
      continue;
    }
    // Could be triple-quote
    const slice3 = src.slice(scan, scan + 3);
    if (slice3 === '"""' || slice3 === "'''") {
      const quote = slice3;
      const closeIdx = src.indexOf(quote, scan + 3);
      if (closeIdx === -1) return null;
      const body = src.slice(scan + 3, closeIdx);
      // Summary: first non-blank line
      for (const ln of body.split('\n')) {
        const trimmed = ln.trim();
        if (trimmed) {
          let s = trimmed;
          if (s.length > MAX_SUMMARY_LEN) s = s.slice(0, MAX_SUMMARY_LEN - 1) + '…';
          return s;
        }
      }
      return null;
    }
    // Not a docstring — function/class has no docstring
    return null;
  }
  return null;
}

export function extractPyDocstrings(srcRoot: string): DocSummaryResult {
  const files = walkDir(srcRoot, '.py');
  const summaries: DocSummaryMap = {};
  let hits = 0;
  for (const file of files) {
    let src: string;
    try {
      src = fs.readFileSync(file, 'utf-8');
    } catch {
      continue;
    }
    let m: RegExpExecArray | null;
    PY_DECL_RE.lastIndex = 0;
    while ((m = PY_DECL_RE.exec(src)) !== null) {
      const name = m[1] ?? m[2];
      if (!name) continue;
      if (summaries[name]) continue;
      const summary = pyDocstringAfter(src, m.index);
      if (summary) {
        summaries[name] = summary;
        hits++;
      }
    }
  }
  return { summaries, scannedFiles: files.length, hits };
}
