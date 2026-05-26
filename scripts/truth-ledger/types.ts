/**
 * Truth-ledger shared types.
 *
 * Single source of truth for all interfaces used by the extraction,
 * normalization, and emit layers. Zero imports except Node stdlib types.
 * All other modules import from here.
 *
 * Architecture: A2 (clean architecture). See `.audit/ARCH_A2.md`.
 * Locked constraints: see `.audit/PHASE3_DECISIONS.md` Q1-Q8.
 */

// ============================================================
// Network configuration
// ============================================================

export type NetworkName = 'base-mainnet' | 'base-sepolia';

export interface NetworkConfig {
  name: NetworkName;
  chainId: number;
}

export const NETWORKS: readonly NetworkConfig[] = [
  { name: 'base-mainnet', chainId: 8453 },
  { name: 'base-sepolia', chainId: 84532 },
] as const;

// ============================================================
// Extractor contract
// ============================================================

export type SurfaceName =
  | 'cli'
  | 'contracts'
  | 'sdk-api-ts'
  | 'sdk-api-py'
  | 'mcp-tools'
  | 'errors'
  | 'agirailsmd-v4';

export interface ExtractorConfig {
  /** Absolute path to AGIRAILS monorepo root. */
  repoRoot: string;
  /** Absolute path to sdk-js package root. */
  sdkJsRoot: string;
  /** Absolute path to python-sdk-v2 package root. */
  pythonSdkRoot: string;
  /** Absolute path to MCP server package root. */
  mcpServerRoot: string;
  /** Absolute path to actp-kernel deployments directory. */
  contractsRoot: string;
  /** Absolute path to canonical AGIRAILS.md spec. */
  agirailsMdPath: string;
  /** Networks to query. */
  networks: readonly NetworkConfig[];
  /** Sourcify API base URL. */
  sourcifyBaseUrl: string;
  /** Sourcify per-call timeout in milliseconds. */
  sourcifyTimeoutMs: number;
  /**
   * Strict mode. Converts soft warns to hard fails for the deploy-mismatch
   * case (deployment JSON says `verified: true` but Sourcify returns `no_match`).
   * Set `true` in CI via the CI_STRICT env var.
   */
  strict: boolean;
}

export interface RawSurface {
  surface: SurfaceName;
  /** ISO-8601 timestamp of extraction completion. */
  extractedAt: string;
  /** Version of the source package this surface was extracted from. */
  sourceVersion: string;
  /** Surface-specific data; each extractor defines its own shape. */
  data: unknown;
  /** Non-fatal warnings emitted during extraction. */
  warnings: string[];
}

export interface Extractor {
  readonly surface: SurfaceName;
  extract(config: ExtractorConfig): Promise<RawSurface>;
}

// ============================================================
// Tier system (SDK API surface)
// ============================================================

export type Tier = 'level0' | 'basic' | 'standard' | 'advanced' | 'internal';

/**
 * Hand-curated mapping of public SDK exports to tier classification.
 * Lives in `tier-map.ts`. Reviewed once per SDK major release.
 *
 * Default for any export not in this map: `'standard'`.
 *
 * Post-v1 migration: introduce `@tier` JSDoc tag (TS) and `__tier__`
 * docstring attribute (Python) in SDK source. The `tier_from_source`
 * flag on `NormalizedSymbol` is pre-wired for this — `normalize.ts`
 * v1 ignores the flag; post-v1 enables source precedence by changing
 * one condition in normalize.
 */
export type TierMap = Record<string, Tier>;

// ============================================================
// Cross-SDK comparison
// ============================================================

export type SDK = 'ts' | 'python';

/**
 * Sync status reuses the `DiffResult` vocabulary established elsewhere
 * in the protocol (see `PHASE3_DECISIONS.md` constraint 7). One
 * vocabulary across the whole system — no parallel enum drift.
 */
export type SyncStatus = 'in-sync' | 'local-ahead' | 'remote-ahead' | 'diverged';

export interface NameDiff {
  /** Normalized concept name for the divergence. */
  concept: string;
  /** TypeScript class/symbol name. */
  ts: string;
  /** Python class/symbol name. */
  python: string;
  /** True if Python re-exports the TS name as alias for parity. */
  python_has_alias: boolean;
  notes?: string;
}

export interface BehavioralDiff {
  /** Command or method that behaves differently. */
  command: string;
  /** TS behavior description. */
  ts: string;
  /** Python behavior description. */
  python: string;
  notes?: string;
}

export interface DivergenceReport {
  /** Symbols present only in the TS SDK. */
  ts_only: string[];
  /** Symbols present only in the Python SDK. */
  python_only: string[];
  /** Symbols with intentional name differences across SDKs. */
  name_diffs: NameDiff[];
  /** Runtime behavior differences that can't be inferred from shape. */
  behavioral_diffs: BehavioralDiff[];
}

// ============================================================
// Normalized manifest shape
// ============================================================

export interface NormalizedSymbol {
  /** Canonical name (TS-style, camelCase for joining). */
  name: string;
  /** Python equivalent if it differs from canonical. */
  python_name?: string;
  /** Tier classification from `TierMap` or default `'standard'`. */
  tier: Tier;
  /**
   * Pre-wired for post-v1 `@tier`-tag migration. True when the symbol
   * carried an explicit tier annotation in source. v1 ignores this
   * flag; post-v1 enables source precedence in `normalize.ts`.
   */
  tier_from_source?: boolean;
  /** SDKs this symbol is exported by. */
  present_in: SDK[];
  /** Cross-SDK sync status. */
  sync_status: SyncStatus;
  /** Surface this symbol came from. */
  surface: SurfaceName;
  /** Additional surface-specific fields. */
  [key: string]: unknown;
}

/**
 * Build-time metadata fields stripped before any downstream diff or hash.
 * Equivalent of `PUBLISH_METADATA_KEYS` in `agirailsmd.ts:58`.
 */
export const MANIFEST_GENERATED_KEYS = [
  '_generated',
  '_doNotEdit',
  '_generator',
  '_generatedAt',
  '_sourceVersions',
] as const;

export type ManifestGeneratedKey = (typeof MANIFEST_GENERATED_KEYS)[number];

export interface ManifestHeader {
  _generated: true;
  _doNotEdit: true;
  _generator: 'scripts/truth-ledger/build-truth-ledger.ts';
  _generatedAt: string;
  _sourceVersions: Record<string, string>;
}

export interface NormalizedManifest extends ManifestHeader {
  divergences: DivergenceReport;
  tiers: Record<string, unknown>;
  errors: Record<string, unknown>;
  cli: unknown;
  contracts: unknown;
  mcp: unknown;
  protocol: unknown;
}

// ============================================================
// Sourcify status (used in contract extractor)
// ============================================================

export type SourcifyStatus =
  | 'exact_match'
  | 'partial_match'
  | 'no_match'
  | 'deployment_claim_only'
  | 'unverified'
  | 'external_token';
