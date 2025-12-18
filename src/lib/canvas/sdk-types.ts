/* ============================================
   Canvas SDK Type Definitions
   ============================================

   Type definitions for Monaco Editor autocomplete
   in Canvas agent code editor.
   ============================================ */

/**
 * Canvas SDK Type Definitions for Agent Context
 *
 * These types are available to agents at runtime and provide
 * autocomplete in the Monaco code editor.
 */
export const CANVAS_SDK_TYPES = `
/**
 * Agent execution context - available as 'ctx' in agent code
 */
declare type AgentType = 'requester' | 'provider' | 'validator';

declare type TransactionState =
  | 'INITIATED'
  | 'QUOTED'
  | 'COMMITTED'
  | 'IN_PROGRESS'
  | 'DELIVERED'
  | 'SETTLED'
  | 'DISPUTED'
  | 'CANCELLED';

/**
 * Parameters for creating a transaction
 */
declare interface CreateTxParams {
  /** Provider agent ID */
  provider: string;

  /** Amount in micro-USDC (integer) */
  amountMicro: number;

  /** Service description */
  service: string;

  /** Deadline timestamp (milliseconds since epoch) */
  deadlineMs?: number;
}

/**
 * Transaction object structure (aligned with Canvas connections)
 */
declare interface Transaction {
  /** Transaction ID */
  id: string;

  /** Source agent ID (requester) */
  sourceId: string;

  /** Target agent ID (provider) */
  targetId: string;

  /** Transaction state */
  state: TransactionState;

  /** Amount in micro-USDC */
  amountMicro: number;

  /** Service description */
  service: string;

  /** Creation timestamp */
  createdAt: number;

  /** Last update timestamp */
  updatedAt: number;
}

/**
 * Agent execution context - available as 'ctx' in agent code
 */
declare interface AgentContext {
  /** Agent's unique identifier */
  agentId: string;

  /** Agent's display name */
  agentName: string;

  /** Agent type */
  agentType: AgentType;

  /** Current balance in micro-USDC */
  balance: number;

  /** Incoming transactions (providers) */
  incomingTransactions: Transaction[];

  /** All transactions (both outgoing and incoming) */
  transactions: Transaction[];

  /**
   * Persistent state object - survives between ticks.
   * Use this to store counters, flags, or any data that
   * should persist across execution cycles.
   * @example ctx.state.counter = (ctx.state.counter || 0) + 1;
   */
  state: Record<string, any>;

  /**
   * Services API - async operations via job queue
   * Submit jobs synchronously, check results in ctx.state.jobs[jobId]
   */
  services: {
    /**
     * Translate text to another language
     * @param params Translation parameters
     * @returns Job ID (check ctx.state.jobs[jobId].result for output)
     * @example
     * const jobId = ctx.services.translate({ text: "Hello", to: "es" });
     * ctx.state.currentJob = jobId;
     * // Next tick: check ctx.state.jobs[jobId].status
     */
    translate: (params: { text: string; to: string; from?: string }) => string;
  };

  /** Log an info message to the inspector */
  log: (message: string) => void;

  /** Log a warning message to the inspector */
  warn: (message: string) => void;

  /** Log an error message to the inspector */
  error: (message: string) => void;

  /** Create a new transaction (queued) */
  createTransaction: (params: CreateTxParams) => string;

  /** Transition transaction to a new state */
  transitionState: (txId: string, newState: TransactionState) => void;

  /** Release escrow funds to provider */
  releaseEscrow: (txId: string) => void;

  /** Cancel a transaction (when allowed by state machine) */
  cancelTransaction: (txId: string) => void;

  /** Initiate dispute on a delivered transaction */
  initiateDispute: (txId: string, reason: string) => void;

  /** Get dispute evidence for a transaction */
  getDisputeEvidence?: (txId: string) => Promise<DisputeEvidence>;

  /** Resolve a dispute (validator agents only) */
  resolveDispute?: (
    txId: string,
    resolution: 'provider' | 'requester' | 'split',
    options?: { providerShare?: number }
  ) => void;
}

/**
 * Parameters for creating a transaction
 */
/**
 * Dispute evidence structure
 */
declare interface DisputeEvidence {
  providerProof?: {
    valid: boolean;
    data?: any;
  };

  requesterClaim?: {
    valid: boolean;
    data?: any;
  };
}

/**
 * Global agent context (available in all agent code)
 */
declare const ctx: AgentContext;
`;

/**
 * Get Canvas SDK type definitions for Monaco Editor
 */
export function getCanvasSDKTypes(): string {
  return CANVAS_SDK_TYPES;
}
