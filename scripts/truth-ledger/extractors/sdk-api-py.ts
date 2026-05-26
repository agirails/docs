/**
 * Python SDK API surface extractor.
 *
 * Reads `python-sdk-v2/src/agirails/__init__.py` and extracts the
 * `__all__` list — the canonical public surface for any Python package.
 *
 * v1 strategy: parse `__all__ = [...]` as a state machine
 * (top-level list literal; AST parsing would add a Python interpreter
 * dependency for no marginal benefit). Applies tier-map for tier
 * classification; falls back to `'standard'` for unmapped exports.
 *
 * Pre-wires `tier_from_source` flag for post-v1 `__tier__` docstring
 * attribute migration. v1 always emits `tier_from_source: false`.
 *
 * Per A2 architecture.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  Extractor,
  ExtractorConfig,
  RawSurface,
  Tier,
} from '../types.ts';
import { getTier } from '../tier-map.ts';

// ============================================================
// Output shape
// ============================================================

interface PythonSymbol {
  name: string;
  tier: Tier;
  tier_from_source: boolean;
  source_file: string;
}

export interface SdkApiPySurfaceData {
  package_name: string;
  package_version: string;
  symbols: PythonSymbol[];
  count: number;
}

// ============================================================
// Parse __all__
// ============================================================

const INIT_REL = 'src/agirails/__init__.py';

/**
 * Extract names from `__all__ = [ "...", "...", ... ]` block.
 * Tolerates comments (`#`) and multi-line layouts.
 */
function parseAllList(src: string, warnings: string[]): string[] {
  const startMatch = src.match(/^__all__\s*=\s*\[/m);
  if (!startMatch) {
    warnings.push(`__all__ not found in Python __init__.py`);
    return [];
  }
  const start = (startMatch.index ?? 0) + startMatch[0].length - 1; // position of `[`
  // Find matching ].
  let depth = 0;
  let end = -1;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) {
    warnings.push('__all__ list literal unbalanced');
    return [];
  }
  const body = src.slice(start + 1, end);
  // Strip comments
  const lines = body.split('\n').map((l) => l.replace(/#.*$/, ''));
  // Extract all "string" or 'string' tokens.
  const names: string[] = [];
  const tokenRegex = /["']([A-Za-z_][\w]*)["']/g;
  let m: RegExpExecArray | null;
  while ((m = tokenRegex.exec(lines.join('\n'))) !== null) {
    names.push(m[1]);
  }
  return [...new Set(names)]; // dedupe (defensive)
}

function readPythonPackageVersion(config: ExtractorConfig): string {
  const pyprojectPath = path.join(config.pythonSdkRoot, 'pyproject.toml');
  if (!fs.existsSync(pyprojectPath)) return 'unknown';
  try {
    const src = fs.readFileSync(pyprojectPath, 'utf-8');
    const m = src.match(/^version\s*=\s*"([^"]+)"/m);
    return m?.[1] ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

// ============================================================
// Public extractor
// ============================================================

export const sdkApiPyExtractor: Extractor = {
  surface: 'sdk-api-py',

  async extract(config: ExtractorConfig): Promise<RawSurface> {
    const warnings: string[] = [];
    const initPath = path.join(config.pythonSdkRoot, INIT_REL);
    if (!fs.existsSync(initPath)) {
      throw new Error(`Python __init__.py not found at ${initPath}`);
    }
    const src = fs.readFileSync(initPath, 'utf-8');

    const names = parseAllList(src, warnings);
    if (names.length === 0) {
      warnings.push('Zero symbols extracted from __all__ — parser may have failed silently');
    }

    const symbols: PythonSymbol[] = names
      .filter((n) => !n.startsWith('__')) // skip dunder exports like __version__
      .map((name) => ({
        name,
        tier: getTier(name),
        tier_from_source: false, // pre-wired for __tier__ migration
        source_file: INIT_REL,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const data: SdkApiPySurfaceData = {
      package_name: 'agirails',
      package_version: readPythonPackageVersion(config),
      symbols,
      count: symbols.length,
    };

    return {
      surface: 'sdk-api-py',
      extractedAt: new Date().toISOString(),
      sourceVersion: data.package_version,
      data,
      warnings,
    };
  },
};
