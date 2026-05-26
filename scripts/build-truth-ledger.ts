#!/usr/bin/env tsx
/**
 * Truth-ledger orchestrator.
 *
 * Runs all extractors in parallel, normalizes their output into a
 * single manifest, computes cross-SDK divergences, and writes
 * `static/sdk-manifest.json` atomically.
 *
 * Per A2 architecture (see `.audit/ARCH_A2.md`). Thin orchestrator;
 * all logic lives in extractors/, normalize.ts, diverge.ts, emit.ts.
 *
 * Wired via `prebuild` hook in package.json. Also triggered by
 * `.github/workflows/truth-ledger-on-release.yml` on SDK release tags.
 *
 * Exit codes:
 *   0 — manifest written (or unchanged in dry-run)
 *   1 — fatal: all extractors failed, or Sourcify hard-fail in CI mode
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { resolveConfig, MANIFEST_OUTPUT_PATH } from './truth-ledger/config.ts';
import { EXTRACTORS } from './truth-ledger/extractors/index.ts';
import { normalize } from './truth-ledger/normalize.ts';
import { computeDivergences } from './truth-ledger/diverge.ts';
import { emitManifest } from './truth-ledger/emit.ts';
import { KNOWN_NAME_DIFFS, KNOWN_BEHAVIORAL_DIFFS, TIER_MAP } from './truth-ledger/tier-map.ts';
import type { RawSurface } from './truth-ledger/types.ts';

function readSourceVersions(config: ReturnType<typeof resolveConfig>): Record<string, string> {
  const versions: Record<string, string> = {};

  // sdk-js — package.json
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(config.sdkJsRoot, 'package.json'), 'utf-8'),
    );
    versions['sdk-js'] = pkg.version ?? 'unknown';
  } catch (e) {
    versions['sdk-js'] = `error: ${(e as Error).message}`;
  }

  // python-sdk — pyproject.toml (regex parse; toml parser would add dep)
  try {
    const pyproject = fs.readFileSync(
      path.join(config.pythonSdkRoot, 'pyproject.toml'),
      'utf-8',
    );
    const match = pyproject.match(/^version\s*=\s*"([^"]+)"/m);
    versions['agirails-python'] = match?.[1] ?? 'unknown';
  } catch (e) {
    versions['agirails-python'] = `error: ${(e as Error).message}`;
  }

  // mcp-server — package.json
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(config.mcpServerRoot, 'package.json'), 'utf-8'),
    );
    versions['mcp-server'] = pkg.version ?? 'unknown';
  } catch (e) {
    versions['mcp-server'] = `error: ${(e as Error).message}`;
  }

  return versions;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const config = resolveConfig();
  const sourceVersions = readSourceVersions(config);

  console.log('[truth-ledger] starting build');
  console.log(`[truth-ledger] strict mode: ${config.strict}`);
  console.log(`[truth-ledger] dry-run: ${dryRun}`);
  console.log(`[truth-ledger] source versions:`, sourceVersions);

  // Run all extractors in parallel; collect results + per-extractor failures.
  const results = await Promise.allSettled(
    EXTRACTORS.map((e) => e.extract(config)),
  );

  const surfaces: (RawSurface | null)[] = results.map((r, i) => {
    const expected = EXTRACTORS[i].surface;
    if (r.status === 'rejected') {
      const msg = (r.reason as Error)?.message ?? String(r.reason);
      console.warn(`[truth-ledger] ${expected} extractor failed: ${msg}`);
      return null;
    }
    for (const w of r.value.warnings) {
      console.warn(`[truth-ledger] ${expected}: ${w}`);
    }
    return r.value;
  });

  if (surfaces.every((s) => s === null)) {
    console.error('[truth-ledger] FATAL: all extractors failed; aborting');
    process.exit(1);
  }

  // Normalize raw surfaces into manifest shape.
  const manifest = normalize({ surfaces, tierMap: TIER_MAP, sourceVersions });

  // Compute divergences (currently uses curated lists; full set diff in Phase 5.5).
  manifest.divergences = computeDivergences({
    manifest,
    knownNameDiffs: KNOWN_NAME_DIFFS,
    knownBehavioralDiffs: KNOWN_BEHAVIORAL_DIFFS,
  });

  // Atomic write (or dry-run report).
  emitManifest(manifest, MANIFEST_OUTPUT_PATH, { dryRun });

  console.log('[truth-ledger] done');
}

main().catch((err) => {
  console.error('[truth-ledger] FATAL:', err);
  process.exit(1);
});
