/* ============================================
   AGIRAILS Canvas - Worker RPC Protocol (Phase E)
   ============================================

   Defines the message protocol for main thread <-> worker communication.
   Worker is pure compute (executes QuickJS), main thread applies ops.
   ============================================ */

import type { TransactionState, Connection } from '../types';

// ============================================
// Worker Requests (Main → Worker)
// ============================================

export type WorkerInitRequest = {
  type: 'INIT';
  limits: {
    maxExecutionTimeMs: number;
    maxMemoryBytes: number;
    maxStackSizeBytes: number;
  };
};

export type WorkerExecuteRequest = {
  type: 'EXECUTE';
  requestId: string;
  agent: {
    id: string;
    name: string;
    type: 'requester' | 'provider' | 'validator';
    balanceMicro: number;
  };
  // Determinism inputs
  virtualTimeMs: number;
  // Deterministic id counter snapshot (main thread owned)
  idCounter: number;

  // Context snapshot
  incomingTransactions: Connection[];
  transactions: Connection[];
  persistentState?: Record<string, any>;

  // Code
  code: string;
};

export type WorkerResetRequest = {
  type: 'RESET';
};

export type WorkerRequest = WorkerInitRequest | WorkerExecuteRequest | WorkerResetRequest;

// ============================================
// Worker Operations (Worker → Main)
// ============================================

export type WorkerOp =
  | { type: 'CREATE_TX'; tx: { id: string; provider: string; amountMicro: number; service: string; deadlineMs?: number } }
  | { type: 'TRANSITION_STATE'; txId: string; state: TransactionState }
  | { type: 'RELEASE_ESCROW'; txId: string }
  | { type: 'CANCEL'; txId: string }
  | { type: 'DISPUTE'; txId: string; reason: string }
  | { type: 'SUBMIT_JOB'; job: { id: string; service: 'translate'; params: { text: string; to: string; from?: string } } };

export type WorkerLog = {
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
};

// ============================================
// Worker Responses (Worker → Main)
// ============================================

export type WorkerResult = {
  type: 'RESULT';
  requestId: string;
  success: boolean;
  error?: {
    type: 'timeout' | 'syntax' | 'runtime' | 'resource' | 'validation';
    message: string;
    line?: number;
    column?: number;
  };

  // Determinism outputs
  idCounter: number; // updated counter after allocations

  logs: WorkerLog[];
  ops: WorkerOp[];
  finalState?: Record<string, any>;
};

export type WorkerReadyResponse = {
  type: 'READY';
};

export type WorkerFatalResponse = {
  type: 'FATAL';
  message: string;
};

export type WorkerResponse = WorkerReadyResponse | WorkerResult | WorkerFatalResponse;
