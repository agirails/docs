/**
 * Divergence computer (Phase 5.5).
 *
 * Aggregates cross-SDK divergences from three surfaces:
 *   - sdk_api (set diff over symbol names, computed in normalize.ts)
 *   - errors (cross_sdk field populated by errors extractor)
 *   - cli (cross_sdk field populated by cli extractor)
 *
 * Adds the curated KNOWN_NAME_DIFFS and KNOWN_BEHAVIORAL_DIFFS — these
 * are intentional cross-SDK differences that can't be inferred from
 * shape alone.
 *
 * Output shape (top-level `divergences` field of manifest):
 *   {
 *     summary: {
 *       ts_only_count: number,
 *       python_only_count: number,
 *       name_diffs_count: number,
 *       behavioral_diffs_count: number,
 *     },
 *     ts_only: { sdk_api: [...], errors: [...], cli: [...] },
 *     python_only: { sdk_api: [...], errors: [...], cli: [...] },
 *     name_diffs: [...],   // curated
 *     behavioral_diffs: [...],  // curated
 *   }
 *
 * Per A2 architecture: cross-SDK structural diff is computed; behavioral
 * diff is curated. Boundary made explicit.
 */

import type {
  NormalizedManifest,
  NameDiff,
  BehavioralDiff,
} from './types.ts';

export interface CategorizedDivergences {
  summary: {
    ts_only_count: number;
    python_only_count: number;
    name_diffs_count: number;
    behavioral_diffs_count: number;
  };
  ts_only: {
    sdk_api: string[];
    errors: string[];
    cli: string[];
  };
  python_only: {
    sdk_api: string[];
    errors: string[];
    cli: string[];
  };
  name_diffs: NameDiff[];
  behavioral_diffs: BehavioralDiff[];
}

export interface DivergeInput {
  manifest: NormalizedManifest;
  knownNameDiffs: readonly NameDiff[];
  knownBehavioralDiffs: readonly BehavioralDiff[];
}

interface MaybeCrossSdk {
  cross_sdk?: { ts_only?: string[]; python_only?: string[] };
}

function readCrossSdk(section: unknown): { ts_only: string[]; python_only: string[] } {
  if (!section || typeof section !== 'object') {
    return { ts_only: [], python_only: [] };
  }
  const s = section as MaybeCrossSdk;
  return {
    ts_only: s.cross_sdk?.ts_only ?? [],
    python_only: s.cross_sdk?.python_only ?? [],
  };
}

export function computeDivergences(input: DivergeInput): CategorizedDivergences {
  const { manifest, knownNameDiffs, knownBehavioralDiffs } = input;

  // Names that appear in KNOWN_NAME_DIFFS are intentional cross-SDK
  // differences (e.g. DeadlineExpiredError/DeadlinePassedError). They
  // get surfaced in `name_diffs`; don't double-list them as
  // `ts_only`/`python_only` (which means "only-this-SDK-has-it").
  const aliasedNames = new Set<string>();
  for (const nd of knownNameDiffs) {
    aliasedNames.add(nd.ts);
    aliasedNames.add(nd.python);
  }
  const filterAliased = (names: string[]): string[] =>
    names.filter((n) => !aliasedNames.has(n));

  const sdkApi = readCrossSdk(manifest.sdk_api);
  const errors = readCrossSdk(manifest.errors);
  const cli = readCrossSdk(manifest.cli);

  const tsOnly = {
    sdk_api: filterAliased(sdkApi.ts_only),
    errors: filterAliased(errors.ts_only),
    cli: filterAliased(cli.ts_only),
  };
  const pythonOnly = {
    sdk_api: filterAliased(sdkApi.python_only),
    errors: filterAliased(errors.python_only),
    cli: filterAliased(cli.python_only),
  };

  const tsOnlyCount = tsOnly.sdk_api.length + tsOnly.errors.length + tsOnly.cli.length;
  const pythonOnlyCount =
    pythonOnly.sdk_api.length + pythonOnly.errors.length + pythonOnly.cli.length;

  return {
    summary: {
      ts_only_count: tsOnlyCount,
      python_only_count: pythonOnlyCount,
      name_diffs_count: knownNameDiffs.length,
      behavioral_diffs_count: knownBehavioralDiffs.length,
    },
    ts_only: tsOnly,
    python_only: pythonOnly,
    name_diffs: [...knownNameDiffs],
    behavioral_diffs: [...knownBehavioralDiffs],
  };
}
