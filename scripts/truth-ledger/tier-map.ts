/**
 * Hand-curated SDK export → tier mappings.
 *
 * Reviewed once per SDK major release. Default for unmapped exports
 * is `'standard'` (see normalize.ts). Post-v1: replace with `@tier`
 * JSDoc tags + `__tier__` docstring attributes in SDK source; this
 * file becomes the migration fallback.
 *
 * Seeded from sdk-manifest.json tiers sections (2026-02-21 snapshot,
 * SDK 2.7.0) + Explorer 1 recon of sdk-js/src/index.ts barrel.
 */

import type { Tier, NameDiff, BehavioralDiff, TierMap } from './types.ts';

// ============================================================
// Symbol → tier
// ============================================================

export const TIER_MAP: TierMap = {
  // ────────────────────────────────────────────────────
  // simple — first integration + common convenience layer
  // (consolidates pre-v1 level0 + basic into a single user-facing
  // tier; matches ACTPClient's own JSDoc which describes three tiers:
  // Basic, Standard, Advanced. We use "Simple" instead of "Basic"
  // because "Basic" reads as derogatory.)
  // ────────────────────────────────────────────────────
  ACTPClient: 'simple',
  ACTPClientConfig: 'simple',
  provide: 'simple',
  request: 'simple',
  serviceDirectory: 'simple',
  service_directory: 'simple', // Python snake_case
  Agent: 'simple',
  AgentConfig: 'simple',
  BasicAdapter: 'simple',
  BasicPayParams: 'simple',
  BasicPayResult: 'simple',
  StandardAdapter: 'simple',
  Job: 'simple',
  JobContext: 'simple',
  JobHandler: 'simple',
  State: 'simple',
  RequestOptions: 'simple',
  ProvideOptions: 'simple',
  ServiceConfig: 'simple',
  MockRuntime: 'simple',

  // ────────────────────────────────────────────────────
  // standard — production-ready patterns with lifecycle control
  // ────────────────────────────────────────────────────
  X402Adapter: 'standard',
  ACTPKernel: 'standard',
  EscrowVault: 'standard',
  AgentRegistry: 'standard',
  DIDManager: 'standard',
  DIDResolver: 'standard',
  QuoteBuilder: 'standard',
  DeliveryProofBuilder: 'standard',
  EventMonitor: 'standard',
  TransactionState: 'standard',
  Transaction: 'standard',
  AutoWalletProvider: 'standard',
  EOAWalletProvider: 'standard',
  IWalletProvider: 'standard',
  WalletTier: 'standard',
  WalletInfo: 'standard',
  ERC8004Bridge: 'standard',
  ReputationReporter: 'standard',
  discover_agents: 'standard',
  discoverAgents: 'standard',
  compute_transaction_id: 'standard',
  computeTransactionId: 'standard',
  upload_receipt: 'standard',
  uploadReceipt: 'standard',
  ReceiptUploadOptions: 'standard',
  ReceiptUploadPayload: 'standard',
  CounterOfferBuilder: 'standard',
  CounterAcceptBuilder: 'standard',
  MessageNonceManager: 'standard',

  // ────────────────────────────────────────────────────
  // advanced — full protocol control
  // ────────────────────────────────────────────────────
  MessageSigner: 'advanced',
  ProofGenerator: 'advanced',
  EASHelper: 'advanced',
  BlockchainRuntime: 'advanced',
  QuoteChannelClient: 'advanced',
  QuoteChannelHandler: 'advanced',
  ProviderOrchestrator: 'advanced',
  BuyerOrchestrator: 'advanced',
  PolicyEngine: 'advanced',
  DecisionEngine: 'advanced',
  SessionStore: 'advanced',
  FilebaseClient: 'advanced',
  ArweaveClient: 'advanced',

  // ────────────────────────────────────────────────────
  // internal — not surfaced in public docs
  // ────────────────────────────────────────────────────
  MockChannel: 'internal',
  MockStateManager: 'internal',
  MockStateCorruptedError: 'internal',
  MockStateVersionError: 'internal',
  MockStateLockError: 'internal',
  AdapterRegistry: 'internal',
  AdapterRouter: 'internal',
  InMemoryDedupStore: 'internal',
  MOCK_STATE_DEFAULTS: 'internal',
};

// ============================================================
// Known name differences across SDKs
// ============================================================

/**
 * Symbols with intentional naming differences between SDKs.
 * Used by normalize.ts to suppress false-positive `ts_only`/`python_only`
 * entries and emit them as `name_diffs` instead.
 */
export const KNOWN_NAME_DIFFS: readonly NameDiff[] = [
  {
    concept: 'deadline_expired',
    ts: 'DeadlineExpiredError',
    python: 'DeadlinePassedError',
    python_has_alias: true,
    notes:
      'Python primary class is DeadlinePassedError; DeadlineExpiredError is exported as alias for parity.',
  },
] as const;

// ============================================================
// Behavioral differences (cannot be inferred from shape)
// ============================================================

/**
 * Runtime behavior differences between SDKs that can't be detected
 * from static analysis. Hand-curated; each entry should carry a
 * tracking note. Updated when new divergences are reported.
 */
export const KNOWN_BEHAVIORAL_DIFFS: readonly BehavioralDiff[] = [
  {
    command: 'actp pay --service',
    ts: 'rejected with PAY_SERVICE_REJECTION_MESSAGE (PRD §5.9, exit code 64)',
    python: 'silently ignored (flag accepted but has no effect)',
    notes:
      'Confirmed during SDK parity audit 2026-05-25. Python fix tracked in python-sdk parity sprint.',
  },
] as const;

// ============================================================
// Tier lookup helper
// ============================================================

/**
 * Get tier for a symbol. Defaults to `'standard'` if not in TIER_MAP.
 * `normalize.ts` calls this for every NormalizedSymbol.
 */
export function getTier(name: string): Tier {
  return TIER_MAP[name] ?? 'standard';
}
