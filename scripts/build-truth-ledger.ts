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
import { resolveConfig, checkSourceAvailability, MANIFEST_OUTPUT_PATH } from './truth-ledger/config.ts';
import { EXTRACTORS } from './truth-ledger/extractors/index.ts';
import { normalize } from './truth-ledger/normalize.ts';
import { computeDivergences } from './truth-ledger/diverge.ts';
import { emitManifest } from './truth-ledger/emit.ts';
import { KNOWN_NAME_DIFFS, KNOWN_BEHAVIORAL_DIFFS, TIER_MAP } from './truth-ledger/tier-map.ts';
import type { RawSurface } from './truth-ledger/types.ts';
import {
  loadPins,
  verifyPins,
  verifyFloors,
  reportViolations,
  emitManifestDiff,
} from './truth-ledger/pins.ts';

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
  const checkOnly = process.argv.includes('--check');
  const config = resolveConfig();

  // Pre-flight: verify all source paths exist before running extractors.
  // Truth-ledger requires the broader AGIRAILS monorepo structure
  // (sibling SDK + Platform + Protocol directories). It is meant to run
  // locally or via the CI workflow that checks out the full monorepo.
  // It is NOT designed for Vercel build environments that only clone
  // the docs repo in isolation.
  const missing = checkSourceAvailability(config);
  if (missing.length > 0) {
    console.error('[truth-ledger] FATAL: required source paths missing:');
    for (const m of missing) console.error(`  - ${m}`);
    console.error('');
    console.error('Truth-ledger requires the full AGIRAILS monorepo layout.');
    console.error('Run from the local AGIRAILS workspace, or use the CI workflow.');
    console.error('Vercel build environments only clone the docs repo — the prebuild');
    console.error('hook intentionally does NOT run truth-ledger; the committed');
    console.error('static/sdk-manifest.json is what gets deployed.');
    process.exit(1);
  }

  if (checkOnly) {
    console.log('[truth-ledger] --check: all source paths present; exiting');
    return;
  }

  // Verify source SHA pins BEFORE running extractors. A compromised
  // upstream cannot silently propagate into the manifest without also
  // moving its declared pin (which is a deliberate review act). See
  // truth-ledger.pins.json + scripts/truth-ledger/pins.ts.
  const docsSiteRoot = path.resolve(__dirname, '..');
  const pins = loadPins(docsSiteRoot);
  const pinsStrict = process.env.TRUTH_LEDGER_PINS === 'strict' || config.strict;
  if (pins) {
    const violations = verifyPins(pins, config.repoRoot);
    reportViolations(violations, pinsStrict);
  } else {
    console.log('[truth-ledger:pins] no truth-ledger.pins.json found; skipping pin verification');
  }

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

  // Verify coverage floors AFTER normalization. A silent extractor
  // regression (symbols dropped without obvious failure) shows up here:
  // counts dropping below declared minimums fail the build in strict
  // mode. Defends against the "in-sync improves while coverage
  // regresses" failure mode flagged in Apex DR-2.
  if (pins) {
    const counts = {
      ts_symbols: (manifest.sdk_api as { ts?: { count?: number } }).ts?.count ?? 0,
      python_symbols: (manifest.sdk_api as { python?: { count?: number } }).python?.count ?? 0,
      ts_errors: (manifest.errors as { ts?: unknown[] }).ts?.length ?? 0,
      python_errors: (manifest.errors as { python?: unknown[] }).python?.length ?? 0,
      mcp_tools: (manifest.mcp as { total?: number }).total ?? 0,
      ts_cli_commands: (manifest.cli as { counts?: { ts?: number } }).counts?.ts ?? 0,
      python_cli_commands: (manifest.cli as { counts?: { python?: number } }).counts?.python ?? 0,
    };
    const floorViolations = verifyFloors(pins, counts);
    reportViolations(floorViolations, pinsStrict);
  }

  // Load previous manifest before overwriting so the diff has both sides.
  let previousManifest: unknown | null = null;
  if (!dryRun && fs.existsSync(MANIFEST_OUTPUT_PATH)) {
    try {
      previousManifest = JSON.parse(fs.readFileSync(MANIFEST_OUTPUT_PATH, 'utf-8'));
    } catch {
      previousManifest = null;
    }
  }

  // Atomic write (or dry-run report).
  emitManifest(manifest, MANIFEST_OUTPUT_PATH, { dryRun });

  // Emit a human-readable manifest diff so PR review sees what changed.
  // The diff lives next to the manifest in static/ for direct linking.
  if (!dryRun) {
    const diffPath = path.join(path.dirname(MANIFEST_OUTPUT_PATH), 'sdk-manifest-diff.md');
    emitManifestDiff(previousManifest, manifest, diffPath);
  }

  // Regenerate the audit report's "Verifiable state" block from the
  // freshly-written manifest so its metrics never drift from the source
  // they cite. Skipped in dry-run mode (the report patch is a side
  // effect of the real build).
  if (!dryRun) {
    try {
      const { spawnSync } = await import('node:child_process');
      const tsx = path.join(process.cwd(), 'node_modules', '.bin', 'tsx');
      const script = path.join(__dirname, 'regen-report-metrics.ts');
      if (fs.existsSync(tsx) && fs.existsSync(script)) {
        const result = spawnSync(tsx, [script], { stdio: 'inherit' });
        if (result.status !== 0) {
          console.warn('[truth-ledger] regen-report-metrics returned non-zero; check output');
        }
      }
    } catch (err) {
      console.warn('[truth-ledger] regen-report-metrics skipped:', err instanceof Error ? err.message : String(err));
    }
  }

  console.log('[truth-ledger] done');
}

main().catch((err) => {
  console.error('[truth-ledger] FATAL:', err);
  process.exit(1);
});
