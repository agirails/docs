/**
 * Normalization pipeline.
 *
 * RawSurface[] → NormalizedManifest. Cross-SDK comparison lives here
 * exclusively; extractors stay pure (single-surface, no awareness of
 * other surfaces). Per A2 architecture.
 *
 * Phase 5.1 — STUB. Real cross-SDK join lands in 5.5. v1 just assembles
 * the manifest shape with `_generated` header and embeds raw surface
 * data per section so the emit step can verify atomic write end-to-end.
 */

import type {
  RawSurface,
  NormalizedManifest,
  TierMap,
  DivergenceReport,
} from './types.ts';

export interface NormalizeInput {
  /** All extractor results in order; null entries indicate extractor failure. */
  surfaces: (RawSurface | null)[];
  /** Hand-curated tier map from tier-map.ts. */
  tierMap: TierMap;
  /** Source package versions, resolved by orchestrator. */
  sourceVersions: Record<string, string>;
}

export function normalize(input: NormalizeInput): NormalizedManifest {
  const { surfaces, sourceVersions } = input;
  const now = new Date().toISOString();

  // Index surfaces by name for direct access.
  const bySurface = new Map<string, RawSurface>();
  for (const s of surfaces) {
    if (s !== null) bySurface.set(s.surface, s);
  }

  const empty: DivergenceReport = {
    ts_only: [],
    python_only: [],
    name_diffs: [],
    behavioral_diffs: [],
  };

  return {
    _generated: true,
    _doNotEdit: true,
    _generator: 'scripts/truth-ledger/build-truth-ledger.ts',
    _generatedAt: now,
    _sourceVersions: sourceVersions,
    divergences: empty,
    tiers: { _stub: true, _phase: '5.1' },
    errors: bySurface.get('errors')?.data ?? null,
    cli: bySurface.get('cli')?.data ?? null,
    contracts: bySurface.get('contracts')?.data ?? null,
    mcp: bySurface.get('mcp-tools')?.data ?? null,
    protocol: bySurface.get('agirailsmd-v4')?.data ?? null,
  };
}
