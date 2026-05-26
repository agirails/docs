/**
 * Manifest emitter.
 *
 * Atomic write via tmp + rename. CI diffs against committed manifest;
 * a partial write during build interruption would create false-positive
 * diff. `fs.renameSync` is atomic on POSIX (best-effort on Windows).
 *
 * Per A2 architecture: distinct concern from data transformation.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { NormalizedManifest } from './types.ts';
import { MANIFEST_GENERATED_KEYS } from './types.ts';

export interface EmitOptions {
  /** Print diff to stdout instead of writing file. */
  dryRun?: boolean;
}

/**
 * Build-time timestamp fields that may appear anywhere in the manifest
 * (not just at top level). For content-equality comparison, these get
 * stripped recursively. Includes per-contract `verified_at` from the
 * contracts extractor (set each time Sourcify is queried).
 */
const TIMESTAMP_KEYS_ANYWHERE = new Set(['verified_at', 'extractedAt']);

/**
 * Strip build-time metadata fields so two manifest snapshots can be
 * content-compared without false-positives from timestamps. Equivalent
 * of stripPublishMetadata() in agirailsmd.ts.
 *
 * Two layers:
 *   1. Top-level header fields (MANIFEST_GENERATED_KEYS)
 *   2. Per-node timestamps anywhere in the tree (TIMESTAMP_KEYS_ANYWHERE)
 */
function stripGeneratedKeys(manifest: object): object {
  const top: Record<string, unknown> = { ...(manifest as Record<string, unknown>) };
  for (const k of MANIFEST_GENERATED_KEYS) {
    delete top[k];
  }
  return stripTimestampKeysDeep(top) as object;
}

function stripTimestampKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripTimestampKeysDeep);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (TIMESTAMP_KEYS_ANYWHERE.has(k)) continue;
      out[k] = stripTimestampKeysDeep(v);
    }
    return out;
  }
  return value;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj).sort();
  const bKeys = Object.keys(bObj).sort();
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i++) {
    if (aKeys[i] !== bKeys[i]) return false;
    if (!deepEqual(aObj[aKeys[i]], bObj[bKeys[i]])) return false;
  }
  return true;
}

export function emitManifest(
  manifest: NormalizedManifest,
  outputPath: string,
  opts: EmitOptions = {},
): void {
  const serialized = JSON.stringify(manifest, null, 2) + '\n';

  if (opts.dryRun) {
    if (fs.existsSync(outputPath)) {
      const current = fs.readFileSync(outputPath, 'utf-8');
      if (current === serialized) {
        console.log('[truth-ledger] dry-run: no changes');
      } else {
        console.log('[truth-ledger] dry-run: would update', outputPath);
        console.log('[truth-ledger] dry-run: diff byte size', serialized.length, 'vs', current.length);
      }
    } else {
      console.log('[truth-ledger] dry-run: would create', outputPath);
    }
    return;
  }

  // Content-idempotence: if the existing manifest has the same content
  // (excluding build-time metadata like _generatedAt), don't rewrite.
  // Otherwise every CI run produces a noisy "timestamp-only diff" PR.
  if (fs.existsSync(outputPath)) {
    try {
      const current = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
      if (deepEqual(stripGeneratedKeys(current), stripGeneratedKeys(manifest))) {
        console.log(
          `[truth-ledger] No content changes since last build; preserving existing ${outputPath}`,
        );
        return;
      }
    } catch {
      // Existing file is malformed JSON or unreadable; fall through to rewrite.
    }
  }

  // Atomic write: tmp + rename. POSIX-atomic.
  const tmpPath = `${outputPath}.tmp-${process.pid}-${Date.now()}`;
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(tmpPath, serialized, 'utf-8');
  fs.renameSync(tmpPath, outputPath);
  console.log(`[truth-ledger] Written to: ${outputPath} (${serialized.length} bytes)`);
}
