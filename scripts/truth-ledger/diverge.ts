/**
 * Divergence computer.
 *
 * NormalizedManifest + behavioral overrides → DivergenceReport.
 * Structural divergences (set diff over symbols) are computed.
 * Behavioral divergences (CLI flag silent-ignore vs reject) are
 * curated in tier-map.ts and merged through here.
 *
 * Phase 5.1 — STUB. Real symbol set diff lands in 5.5 once sdk-api-ts
 * and sdk-api-py extractors produce normalized symbol lists.
 */

import type { NormalizedManifest, DivergenceReport, NameDiff, BehavioralDiff } from './types.ts';

export interface DivergeInput {
  manifest: NormalizedManifest;
  knownNameDiffs: readonly NameDiff[];
  knownBehavioralDiffs: readonly BehavioralDiff[];
}

export function computeDivergences(input: DivergeInput): DivergenceReport {
  // v1 stub: just pass through the hand-curated lists.
  // Phase 5.5 implements the set diff over manifest.tiers symbol lists.
  return {
    ts_only: [],
    python_only: [],
    name_diffs: [...input.knownNameDiffs],
    behavioral_diffs: [...input.knownBehavioralDiffs],
  };
}
