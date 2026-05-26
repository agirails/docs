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
  SyncStatus,
} from './types.ts';
import { KNOWN_NAME_DIFFS } from './tier-map.ts';

// ============================================================
// Cross-SDK name normalization
// ============================================================

/**
 * Convert TS camelCase to Python snake_case for cross-SDK joining.
 * Class names (PascalCase) pass through unchanged. Function/variable
 * names get camelCase → snake_case conversion.
 *
 *   discoverAgents      → discover_agents
 *   computeTransactionId → compute_transaction_id
 *   ACTPClient          → ACTPClient   (pure PascalCase preserved)
 *   X402Adapter         → X402Adapter  (same)
 */
function tsToPythonName(name: string): string {
  // If starts with uppercase letter followed by another uppercase or end-of-word,
  // treat as class name — preserve as-is.
  if (/^[A-Z][A-Z0-9]/.test(name) || /^[A-Z][a-z0-9]*[A-Z]/.test(name)) {
    // PascalCase: preserve.
    return name;
  }
  // camelCase → snake_case
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

/**
 * Build a name-alias map from KNOWN_NAME_DIFFS so the diff suppresses
 * known intentional differences (e.g. DeadlineExpiredError/DeadlinePassedError).
 */
function buildKnownAliasSet(): {
  tsAliasedToPython: Map<string, string>;
  pythonAliasedToTs: Map<string, string>;
} {
  const tsToPy = new Map<string, string>();
  const pyToTs = new Map<string, string>();
  for (const d of KNOWN_NAME_DIFFS) {
    tsToPy.set(d.ts, d.python);
    pyToTs.set(d.python, d.ts);
    if (d.python_has_alias) {
      // Python re-exports the TS name as alias — symbol exists in both
      // by the TS name. Don't flag.
      tsToPy.set(d.ts, d.ts);
      pyToTs.set(d.ts, d.ts);
    }
  }
  return { tsAliasedToPython: tsToPy, pythonAliasedToTs: pyToTs };
}

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

  // Wire sdk-api-ts + sdk-api-py into a combined `sdk_api` block.
  // Cross-SDK comparison happens here (Phase 5.5):
  // - Set diff over normalized names (camelCase ↔ snake_case)
  // - sync_status per symbol (in-sync / local-ahead / remote-ahead)
  // - KNOWN_NAME_DIFFS aliases excluded from false-positive ts_only/python_only
  const sdkTs = bySurface.get('sdk-api-ts')?.data as
    | { symbols: { name: string; tier: string; kind?: string }[] }
    | undefined;
  const sdkPy = bySurface.get('sdk-api-py')?.data as
    | { symbols: { name: string; tier: string }[] }
    | undefined;

  const tiers: Record<string, { ts?: string; python?: string }> = {};
  for (const s of sdkTs?.symbols ?? []) {
    tiers[s.name] = { ...tiers[s.name], ts: s.tier };
  }
  for (const s of sdkPy?.symbols ?? []) {
    tiers[s.name] = { ...tiers[s.name], python: s.tier };
  }

  // Build cross-SDK diff for sdk_api.
  const { tsAliasedToPython, pythonAliasedToTs } = buildKnownAliasSet();
  const tsNames = new Set(sdkTs?.symbols.map((s) => s.name) ?? []);
  const pyNames = new Set(sdkPy?.symbols.map((s) => s.name) ?? []);

  // A TS symbol counts as "in both" if (1) the same name exists in Python,
  // (2) its snake_case equivalent exists in Python, or (3) it's a known alias.
  const tsHasPyMatch = (name: string): boolean => {
    if (pyNames.has(name)) return true;
    if (pyNames.has(tsToPythonName(name))) return true;
    if (tsAliasedToPython.has(name)) {
      const aliased = tsAliasedToPython.get(name)!;
      return pyNames.has(aliased);
    }
    return false;
  };
  const pyHasTsMatch = (name: string): boolean => {
    if (tsNames.has(name)) return true;
    // Python snake_case → TS camelCase is not 1:1 invertible, so check both directions
    if (pythonAliasedToTs.has(name)) return tsNames.has(pythonAliasedToTs.get(name)!);
    // Best-effort: check if any TS name normalizes to this Python name
    for (const ts of tsNames) {
      if (tsToPythonName(ts) === name) return true;
    }
    return false;
  };

  const tsOnlySymbols = [...tsNames].filter((n) => !tsHasPyMatch(n)).sort();
  const pyOnlySymbols = [...pyNames].filter((n) => !pyHasTsMatch(n)).sort();

  // Per-symbol sync_status. Phase 5.5: shape-level (present vs not).
  // Post-v1: extend with signature-shape comparison.
  const tiersWithStatus: Record<string, { ts?: string; python?: string; sync_status: SyncStatus }> = {};
  for (const [name, t] of Object.entries(tiers)) {
    let sync_status: SyncStatus = 'in-sync';
    if (t.ts && !t.python) sync_status = 'local-ahead'; // TS has it, Python doesn't
    else if (!t.ts && t.python) sync_status = 'remote-ahead'; // Python has it, TS doesn't
    // Names known to differ across SDKs are 'diverged' rather than missing
    if (tsAliasedToPython.has(name) || pythonAliasedToTs.has(name)) sync_status = 'diverged';
    tiersWithStatus[name] = { ...t, sync_status };
  }

  const sdkApiCrossSdk = {
    ts_only: tsOnlySymbols,
    python_only: pyOnlySymbols,
    counts: { ts_only: tsOnlySymbols.length, python_only: pyOnlySymbols.length },
  };

  return {
    _generated: true,
    _doNotEdit: true,
    _generator: 'scripts/truth-ledger/build-truth-ledger.ts',
    _generatedAt: now,
    _sourceVersions: sourceVersions,
    divergences: empty,
    tiers: tiersWithStatus,
    errors: bySurface.get('errors')?.data ?? null,
    cli: bySurface.get('cli')?.data ?? null,
    contracts: bySurface.get('contracts')?.data ?? null,
    mcp: bySurface.get('mcp-tools')?.data ?? null,
    protocol: bySurface.get('agirailsmd-v4')?.data ?? null,
    sdk_api: {
      ts: sdkTs ?? null,
      python: sdkPy ?? null,
      cross_sdk: sdkApiCrossSdk,
    },
  } as NormalizedManifest;
}
