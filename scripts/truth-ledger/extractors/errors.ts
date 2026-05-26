/**
 * Errors extractor.
 *
 * Reads error class declarations from both SDKs:
 *   - TS: sdk-js/src/errors/ACTPError.ts + index.ts + X402Errors.ts +
 *         runtime/MockRuntime.ts (which inlines a few error classes)
 *   - Python: python-sdk-v2/src/agirails/errors/{base,transaction,validation,
 *         network,storage,agent,mock}.py
 *
 * Extraction strategy: text-pattern parsing. Class declarations and
 * code-string assignments follow stable forms in both codebases; AST
 * would be overkill for what amounts to:
 *
 *   TS:     export class FooError extends ACTPError { ... super('CODE', ...) }
 *   Python: class FooError(ACTPError):  ...  code="CODE"
 *
 * Per A2 architecture.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Extractor, ExtractorConfig, RawSurface, SDK } from '../types.ts';

// ============================================================
// Output shape
// ============================================================

interface ErrorEntry {
  class_name: string;
  parent: string;
  /** Machine-readable error code from super('CODE', ...) or code="CODE". */
  code: string | null;
  /** Source file (relative to monorepo root). */
  source_file: string;
}

export interface ErrorsSurfaceData {
  ts: ErrorEntry[];
  python: ErrorEntry[];
  /** Errors present in one SDK but not the other (computed by name match). */
  cross_sdk: {
    ts_only: string[];
    python_only: string[];
  };
  /** Total class counts. */
  counts: { ts: number; python: number };
}

// ============================================================
// TS extraction
// ============================================================

const TS_ERROR_FILES = [
  'src/errors/ACTPError.ts',
  'src/errors/index.ts',
  'src/errors/X402Errors.ts',
  'src/runtime/MockRuntime.ts', // inlines a few error subclasses
] as const;

/**
 * Extract error classes from a single TS file. Returns one ErrorEntry per
 * `export class XxxError extends Parent` declaration.
 */
function extractTsErrorsFromFile(
  filePath: string,
  relPath: string,
): ErrorEntry[] {
  if (!fs.existsSync(filePath)) return [];
  const src = fs.readFileSync(filePath, 'utf-8');

  // Match: export class <Name> extends <Parent>
  // Then look ahead in the class body for the next super('CODE', ...) call
  // (or super(message, 'CODE', ...) — code is the literal that ends in
  // ALL_CAPS_UNDERSCORE pattern, present as a single-quoted string).
  const classRegex = /export\s+(?:abstract\s+)?class\s+(\w+Error)\s+extends\s+(\w+)\s*\{/g;
  const entries: ErrorEntry[] = [];
  let m: RegExpExecArray | null;
  while ((m = classRegex.exec(src)) !== null) {
    const [, className, parent] = m;
    const bodyStart = m.index + m[0].length;
    // Find matching closing brace by simple depth counting.
    const body = extractBalancedBlock(src, bodyStart - 1);
    const code = findCodeStringInBody(body);
    entries.push({
      class_name: className,
      parent,
      code,
      source_file: relPath,
    });
  }
  return entries;
}

/**
 * Extract the text between the opening brace at `openIdx` and its
 * balanced close. `src[openIdx]` must be `{`.
 */
function extractBalancedBlock(src: string, openIdx: number): string {
  if (src[openIdx] !== '{') return '';
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return src.slice(openIdx + 1, i);
    }
  }
  return src.slice(openIdx + 1); // unbalanced; return remainder
}

/**
 * Find the error code string inside a class body. Looks for:
 *   - super(..., 'CODE_STRING', ...)
 *   - super('CODE_STRING', ...)
 * Returns the first ALL_CAPS_WITH_UNDERSCORES string found in super(...).
 */
function findCodeStringInBody(body: string): string | null {
  // Match super(...args...) and inspect args for first all-caps string.
  const superCall = body.match(/super\s*\(([\s\S]*?)\);/);
  if (!superCall) return null;
  const args = superCall[1];
  // First single-quoted string literal that looks like an error code.
  const codeMatch = args.match(/'([A-Z][A-Z0-9_]+)'/);
  return codeMatch ? codeMatch[1] : null;
}

function extractAllTsErrors(config: ExtractorConfig, warnings: string[]): ErrorEntry[] {
  const all: ErrorEntry[] = [];
  for (const rel of TS_ERROR_FILES) {
    const filePath = path.join(config.sdkJsRoot, rel);
    if (!fs.existsSync(filePath)) {
      warnings.push(`TS error source missing: ${rel}`);
      continue;
    }
    all.push(...extractTsErrorsFromFile(filePath, rel));
  }
  // Deduplicate by class_name (in case a class appears in multiple files,
  // e.g. re-export from index.ts of class defined elsewhere).
  const seen = new Set<string>();
  return all.filter((e) => {
    if (seen.has(e.class_name)) return false;
    seen.add(e.class_name);
    return true;
  });
}

// ============================================================
// Python extraction
// ============================================================

const PY_ERROR_FILES = [
  'base.py',
  'transaction.py',
  'validation.py',
  'network.py',
  'storage.py',
  'agent.py',
  'mock.py',
] as const;

function extractPyErrorsFromFile(
  filePath: string,
  relPath: string,
): ErrorEntry[] {
  if (!fs.existsSync(filePath)) return [];
  const src = fs.readFileSync(filePath, 'utf-8');

  // class Name(Parent):  →  capture name + parent.
  const classRegex = /^class\s+(\w+Error)\s*\(\s*(\w+)\s*\)\s*:/gm;
  const entries: ErrorEntry[] = [];
  let m: RegExpExecArray | null;
  while ((m = classRegex.exec(src)) !== null) {
    const [, className, parent] = m;
    // Find the next `code="..."` or `code='...'` after the class declaration,
    // stopping at the next top-level class definition (to avoid leaking).
    const tailStart = m.index;
    const nextClass = src.slice(tailStart + m[0].length).search(/^class\s+\w/m);
    const tail =
      nextClass === -1
        ? src.slice(tailStart)
        : src.slice(tailStart, tailStart + m[0].length + nextClass);
    const codeMatch = tail.match(/code\s*=\s*["']([A-Z][A-Z0-9_]+)["']/);
    entries.push({
      class_name: className,
      parent,
      code: codeMatch ? codeMatch[1] : null,
      source_file: relPath,
    });
  }
  return entries;
}

function extractAllPythonErrors(
  config: ExtractorConfig,
  warnings: string[],
): ErrorEntry[] {
  const dir = path.join(config.pythonSdkRoot, 'src', 'agirails', 'errors');
  const all: ErrorEntry[] = [];
  for (const file of PY_ERROR_FILES) {
    const filePath = path.join(dir, file);
    const rel = `src/agirails/errors/${file}`;
    if (!fs.existsSync(filePath)) {
      warnings.push(`Python error source missing: ${rel}`);
      continue;
    }
    all.push(...extractPyErrorsFromFile(filePath, rel));
  }
  return all;
}

// ============================================================
// Cross-SDK comparison
// ============================================================

function computeCrossSdkDiff(
  ts: ErrorEntry[],
  py: ErrorEntry[],
): ErrorsSurfaceData['cross_sdk'] {
  const tsNames = new Set(ts.map((e) => e.class_name));
  const pyNames = new Set(py.map((e) => e.class_name));
  return {
    ts_only: ts.filter((e) => !pyNames.has(e.class_name)).map((e) => e.class_name).sort(),
    python_only: py
      .filter((e) => !tsNames.has(e.class_name))
      .map((e) => e.class_name)
      .sort(),
  };
}

// ============================================================
// Public extractor
// ============================================================

export const errorsExtractor: Extractor = {
  surface: 'errors',

  async extract(config: ExtractorConfig): Promise<RawSurface> {
    const warnings: string[] = [];
    const ts = extractAllTsErrors(config, warnings);
    const py = extractAllPythonErrors(config, warnings);

    const data: ErrorsSurfaceData = {
      ts: ts.sort((a, b) => a.class_name.localeCompare(b.class_name)),
      python: py.sort((a, b) => a.class_name.localeCompare(b.class_name)),
      cross_sdk: computeCrossSdkDiff(ts, py),
      counts: { ts: ts.length, python: py.length },
    };

    if (ts.length === 0) warnings.push('No TS errors extracted (check source paths)');
    if (py.length === 0) warnings.push('No Python errors extracted (check source paths)');

    return {
      surface: 'errors',
      extractedAt: new Date().toISOString(),
      sourceVersion: `ts:${ts.length} py:${py.length}`,
      data,
      warnings,
    };
  },
};

// Re-export SDK type for convenience
export type { SDK };
