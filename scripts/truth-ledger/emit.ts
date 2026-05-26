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

export interface EmitOptions {
  /** Print diff to stdout instead of writing file. */
  dryRun?: boolean;
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
