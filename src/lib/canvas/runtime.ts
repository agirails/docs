/* ============================================
   AGIRAILS Canvas - Mock Runtime Engine
   ============================================

   Phase 1: Scripted behavior based on ACTP state machine.
   NO user code execution - only state transitions.
   Phase 2+ will add actual agent execution.
   ============================================ */

import {
  Connection,
  TransactionState,
  RuntimeEvent,
  generateId,
  syncDeterministicIdsFromIds,
} from './types';
import { ExtendedCanvasState } from './useCanvasState';
import React from 'react';
import {
  executeAgentCodeWorker,
  SandboxContext,
} from './sandbox';
import { processJobs, getJobResult, clearCompletedJobs, submitJobWithId } from './services';
import { sha256 } from './crypto';
import type { WorkerOp } from './worker/protocol';

// ============================================
// Persistent Agent State Store
// ============================================
// Stores ctx.state for each agent between ticks
const agentStateStore = new Map<string, Record<string, any>>();

// ============================================
// Console Log Deduplication (anti-spam)
// ============================================
// Providers are realistically always-on and will poll.
// We keep them running, but we dedupe repeated INFO logs on no-op ticks.
const lastInfoLogByAgent = new Map<
  string,
  { message: string; lastAt: number; repeats: number }
>();

function flushInfoRepeats(ctx: RuntimeContext, agentId: string, nowMs: number): void {
  const entry = lastInfoLogByAgent.get(agentId);
  if (!entry || entry.repeats <= 0) return;

  ctx.addEvent({
    type: 'info',
    agentId,
    payload: {
      message: `↻ (repeated ${entry.repeats}x) ${entry.message}`,
      repeated: entry.repeats,
      repeatedMessage: entry.message,
    },
  });

  lastInfoLogByAgent.set(agentId, { message: entry.message, lastAt: nowMs, repeats: 0 });
}

/**
 * Clear state for a specific agent (call on agent removal)
 */
export function clearAgentState(agentId: string): void {
  agentStateStore.delete(agentId);
}

/**
 * Clear all agent states (call on runtime reset)
 */
export function clearAllAgentState(): void {
  agentStateStore.clear();
}

/**
 * Get stored state for an agent (for debugging/inspection)
 */
export function getAgentState(agentId: string): Record<string, any> | undefined {
  return agentStateStore.get(agentId);
}

/**
 * Snapshot all agent persistent states (ctx.state) for debug/time-travel.
 * IMPORTANT: agent state must be JSON-serializable by design.
 */
export function snapshotAgentStateStore(): Record<string, Record<string, any>> {
  const out: Record<string, Record<string, any>> = {};
  for (const [agentId, st] of agentStateStore.entries()) {
    try {
      out[agentId] = JSON.parse(JSON.stringify(st ?? {}));
    } catch {
      // If something non-serializable slips in, degrade to empty object (prevents crashes)
      out[agentId] = {};
    }
  }
  return out;
}

/**
 * Restore agent persistent states (ctx.state) from a snapshot.
 */
export function restoreAgentStateStore(snapshot: Record<string, Record<string, any>>): void {
  agentStateStore.clear();
  if (!snapshot || typeof snapshot !== 'object') return;

  for (const [agentId, st] of Object.entries(snapshot)) {
    if (!agentId) continue;
    const value = st && typeof st === 'object' && !Array.isArray(st) ? st : {};
    // Deep clone to avoid retaining references from UI state
    try {
      agentStateStore.set(agentId, JSON.parse(JSON.stringify(value)));
    } catch {
      agentStateStore.set(agentId, {});
    }
  }
}

/**
 * ACTP State Machine Transitions
 * Maps current state → allowed next states
 */
const STATE_TRANSITIONS: Record<TransactionState, TransactionState[]> = {
  'INITIATED': ['QUOTED', 'COMMITTED', 'CANCELLED'],
  'QUOTED': ['COMMITTED', 'CANCELLED'],
  'COMMITTED': ['IN_PROGRESS', 'DELIVERED', 'CANCELLED'],
  'IN_PROGRESS': ['DELIVERED', 'DISPUTED', 'CANCELLED'],
  'DELIVERED': ['SETTLED', 'DISPUTED'],
  'SETTLED': [],  // Terminal state
  'DISPUTED': ['SETTLED'],
  'CANCELLED': [],  // Terminal state
};

/**
 * Terminal states (no further transitions)
 */
const TERMINAL_STATES: TransactionState[] = ['SETTLED', 'CANCELLED'];

/**
 * Runtime Context
 * Passed to all runtime functions for state access/mutations
 */
export interface RuntimeContext {
  state: ExtendedCanvasState;
  dispatch: React.Dispatch<any>;
  addEvent: (event: Omit<RuntimeEvent, 'id' | 'timestamp'>) => void;
  /**
   * Optional abort hook: when true, runtime must stop applying any results.
   * Used to drop stale worker results after Reset/Import/Fork/etc.
   */
  shouldAbort?: () => boolean;
}

/**
 * Delay helper for async flows (used by simulateHappyPath only)
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get next state in happy path progression
 */
function getNextHappyPathState(currentState: TransactionState): TransactionState | null {
  // QUOTED is optional; if present, auto-progress to COMMITTED (escrow link).
  switch (currentState) {
    case 'INITIATED':
    case 'QUOTED':
      return 'COMMITTED';
    case 'COMMITTED':
      return 'IN_PROGRESS';
    case 'IN_PROGRESS':
      return 'DELIVERED';
    case 'DELIVERED':
      return 'SETTLED';
    default:
      return null;
  }
}

/**
 * Get next valid state for manual state transitions
 * Returns null if state is terminal / no further progression.
 */
export function getNextState(currentState: TransactionState): TransactionState | null {
  // Keep "Advance →" aligned with the auto happy-path progression (and avoid
  // getting stuck in optional states like QUOTED in auto mode).
  if (currentState === 'DISPUTED') return 'SETTLED';
  return getNextHappyPathState(currentState);
}

/**
 * Check if state transition is valid per ACTP rules
 */
export function isValidTransition(
  from: TransactionState,
  to: TransactionState
): boolean {
  const allowedStates = STATE_TRANSITIONS[from] || [];
  return allowedStates.includes(to);
}

/**
 * Simulate escrow lock when transaction moves to COMMITTED
 */
export function simulateEscrowLock(
  ctx: RuntimeContext,
  connectionId: string,
  balanceByAgent?: Map<string, number>
): void {
  const connection = ctx.state.connections.find((c) => c.id === connectionId);
  if (!connection) return;

  const requester = ctx.state.agents.find((a) => a.id === connection.sourceId);
  if (!requester) return;

  const requesterBalance =
    balanceByAgent?.get(requester.id) ?? requester.balanceMicro;

  // Prevent negative balances (Phase 1 invariant)
  if (requesterBalance < connection.amountMicro) {
    ctx.addEvent({
      type: 'error',
      agentId: requester.id,
      connectionId: connection.id,
      payload: {
        message: 'Insufficient funds - transaction cancelled',
        balance: requesterBalance,
        required: connection.amountMicro,
        service: connection.service,
      },
    });

    // Best-effort cancel (INITIATED/QUOTED/COMMITTED all allow CANCELLED)
    ctx.dispatch({
      type: 'UPDATE_CONNECTION_STATE',
      payload: { connectionId: connection.id, state: 'CANCELLED' },
    });
    return;
  }

  // Deduct funds from requester
  const newBalance = requesterBalance - connection.amountMicro;

  ctx.dispatch({
    type: 'UPDATE_AGENT_BALANCE',
    payload: { agentId: requester.id, balanceMicro: newBalance },
  });
  balanceByAgent?.set(requester.id, newBalance);

  ctx.addEvent({
    type: 'info',
    agentId: requester.id,
    connectionId: connection.id,
    payload: {
      message: 'Escrow locked',
      amount: connection.amountMicro,
      service: connection.service,
    },
  });
}

/**
 * Simulate escrow release when transaction settles
 */
export function simulateEscrowRelease(
  ctx: RuntimeContext,
  connectionId: string,
  balanceByAgent?: Map<string, number>
): void {
  const connection = ctx.state.connections.find((c) => c.id === connectionId);
  if (!connection) return;

  const provider = ctx.state.agents.find((a) => a.id === connection.targetId);
  if (!provider) return;

  const providerBalance =
    balanceByAgent?.get(provider.id) ?? provider.balanceMicro;

  // Calculate platform fee (1% with $0.05 minimum)
  const feeAmount = Math.max(
    Math.floor(connection.amountMicro / 100),
    50000 // $0.05 minimum in micro-USDC
  );
  const providerAmount = connection.amountMicro - feeAmount;

  // Credit funds to provider
  const newBalance = providerBalance + providerAmount;

  ctx.dispatch({
    type: 'UPDATE_AGENT_BALANCE',
    payload: { agentId: provider.id, balanceMicro: newBalance },
  });
  balanceByAgent?.set(provider.id, newBalance);

  ctx.addEvent({
    type: 'success',
    agentId: provider.id,
    connectionId: connection.id,
    payload: {
      message: 'Payment received',
      amount: providerAmount,
      fee: feeAmount,
      service: connection.service,
    },
  });
}

/**
 * Simulate escrow refund when a committed transaction is cancelled
 */
export function simulateEscrowRefund(
  ctx: RuntimeContext,
  connectionId: string,
  balanceByAgent?: Map<string, number>
): void {
  const connection = ctx.state.connections.find((c) => c.id === connectionId);
  if (!connection) return;

  const requester = ctx.state.agents.find((a) => a.id === connection.sourceId);
  if (!requester) return;

  const requesterBalance =
    balanceByAgent?.get(requester.id) ?? requester.balanceMicro;

  const newBalance = requesterBalance + connection.amountMicro;

  ctx.dispatch({
    type: 'UPDATE_AGENT_BALANCE',
    payload: { agentId: requester.id, balanceMicro: newBalance },
  });
  balanceByAgent?.set(requester.id, newBalance);

  ctx.addEvent({
    type: 'info',
    agentId: requester.id,
    connectionId: connection.id,
    payload: {
      message: 'Escrow refunded',
      amount: connection.amountMicro,
      service: connection.service,
    },
  });
}

/**
 * Transition connection to next state
 */
export function transitionConnectionState(
  ctx: RuntimeContext,
  connectionId: string,
  nextState: TransactionState,
  reason?: string,
  balanceByAgent?: Map<string, number>
): void {
  const connection = ctx.state.connections.find((c) => c.id === connectionId);
  if (!connection) return;

  // If we're about to commit, enforce escrow solvency first (don't let it go negative)
  if (nextState === 'COMMITTED') {
    const requester = ctx.state.agents.find((a) => a.id === connection.sourceId);
    if (!requester) return;
    const requesterBalance =
      balanceByAgent?.get(requester.id) ?? requester.balanceMicro;
    if (requesterBalance < connection.amountMicro) {
      ctx.addEvent({
        type: 'error',
        agentId: requester.id,
        connectionId: connection.id,
        payload: {
          message: 'Insufficient funds - cannot commit',
          balance: requesterBalance,
          required: connection.amountMicro,
        },
      });

      ctx.dispatch({
        type: 'UPDATE_CONNECTION_STATE',
        payload: { connectionId, state: 'CANCELLED' },
      });
      return;
    }
  }

  // Validate transition
  if (!isValidTransition(connection.state, nextState)) {
    ctx.addEvent({
      type: 'error',
      connectionId: connection.id,
      payload: {
        message: `Invalid transition from ${connection.state} to ${nextState}`,
      },
    });
    return;
  }

  // Update connection state
  ctx.dispatch({
    type: 'UPDATE_CONNECTION_STATE',
    payload: { connectionId, state: nextState },
  });

  // Handle escrow logic
  if (nextState === 'COMMITTED') {
    simulateEscrowLock(ctx, connectionId, balanceByAgent);
  } else if (nextState === 'SETTLED') {
    simulateEscrowRelease(ctx, connectionId, balanceByAgent);
  } else if (nextState === 'CANCELLED') {
    // If funds were already locked, refund them on cancel.
    if (connection.state === 'COMMITTED' || connection.state === 'IN_PROGRESS') {
      simulateEscrowRefund(ctx, connectionId, balanceByAgent);
    }
  }

  // Log state change
  const eventType =
    nextState === 'SETTLED' ? 'success' :
    nextState === 'DISPUTED' || nextState === 'CANCELLED' ? 'warning' :
    'info';

  ctx.addEvent({
    type: eventType,
    connectionId: connection.id,
    payload: {
      message: `Transaction ${connection.state} → ${nextState}`,
      reason: reason || 'Automatic progression',
      service: connection.service,
    },
  });
}

/**
 * Run one tick of the runtime simulation
 * Progresses all active (non-terminal) transactions by one state
 */
export function runTick(ctx: RuntimeContext): void {
  const activeConnections = ctx.state.connections.filter(
    (c) => !TERMINAL_STATES.includes(c.state)
  );

  if (activeConnections.length === 0) {
    return; // Nothing to do
  }

  // Local balance cache to keep per-tick progression consistent when multiple
  // transactions touch the same agent (prevents accidental overspend).
  const balanceByAgent = new Map<string, number>();
  for (const agent of ctx.state.agents) {
    balanceByAgent.set(agent.id, agent.balanceMicro);
  }

  // Phase 1: deterministic progression (no async overlap inside setInterval).
  for (const connection of activeConnections) {
    const nextState = getNextHappyPathState(connection.state);
    if (nextState) transitionConnectionState(ctx, connection.id, nextState, undefined, balanceByAgent);
  }

  // Increment tick counter
  ctx.dispatch({ type: 'TICK_RUNTIME' });
}

/**
 * Run one tick with code execution (Phase E: Worker-based)
 * Each agent's code executes in dedicated Web Worker
 */
export async function runTickWithExecution(
  ctx: RuntimeContext,
  opts?: { agentIds?: string[] }
): Promise<void> {
  if (ctx.shouldAbort?.()) return;

  // IMPORTANT: Track balances within the tick to prevent over-commits when multiple txs
  // lock/release/refund funds in the same tick (ctx.state is a snapshot during this run).
  const balanceByAgent = new Map<string, number>();
  for (const agent of ctx.state.agents) {
    balanceByAgent.set(agent.id, agent.balanceMicro);
  }

  // Phase E: Maintain deterministic ID counter across agent executions.
  // IMPORTANT: ensure we never start below the max numeric suffix already present in state
  // (prevents collisions when loading scenarios/imports that already contain tx-N ids).
  let currentIdCounter = ctx.state.idCounter ?? 1;
  const nextSafeIdCounter = computeNextIdCounterFromState(ctx.state);
  if (nextSafeIdCounter > currentIdCounter) {
    currentIdCounter = nextSafeIdCounter;
  }

  // Optional: run only a subset of agents (used by per-agent "Run" button)
  const agentIdFilter =
    Array.isArray(opts?.agentIds) && opts.agentIds.length > 0
      ? new Set<string>(opts.agentIds)
      : null;

  // IMPORTANT: Sort agents by ID for deterministic execution order
  const sortedAgents = [...ctx.state.agents]
    .filter((a) => !agentIdFilter || agentIdFilter.has(a.id))
    .sort((a, b) => a.id.localeCompare(b.id));

  // Execute each agent's code in worker
  for (const agent of sortedAgents) {
    if (ctx.shouldAbort?.()) return;

    if (!agent.code || agent.code.trim() === '') {
      continue; // Skip agents without code
    }

    // Get incoming transactions for this agent (provider-side view).
    // IMPORTANT: include terminal states so code can observe CANCELLED/SETTLED.
    const incomingTransactions = ctx.state.connections.filter(
      (c) => c.targetId === agent.id
    );

    // Get all transactions (outgoing + incoming) for this agent.
    // IMPORTANT: include terminal states so requesters can observe CANCELLED/SETTLED.
    const transactions = ctx.state.connections.filter(
      (c) => c.sourceId === agent.id || c.targetId === agent.id
    );

    // Build sandbox context (read-only snapshot for worker)
    const sandboxContext: SandboxContext = {
      agentId: agent.id,
      agentName: agent.name,
      agentType: agent.type,
      balance: balanceByAgent.get(agent.id) ?? agent.balanceMicro,
      incomingTransactions,
      transactions,
      persistentState: agentStateStore.get(agent.id),

      // Phase E: Worker doesn't call these directly (returns ops instead)
      // These are stubs to satisfy SandboxContext interface
      onLog: () => {},
      onCreateTransaction: async () => '',
      onTransitionState: async () => {},
      onReleaseEscrow: async () => {},
      onInitiateDispute: async () => {},
      onCancelTransaction: async () => {},
    };

    // Execute code in worker (Phase E)
    try {
      const result = await executeAgentCodeWorker(agent.code, sandboxContext, {
        virtualTimeMs: ctx.state.virtualTimeMs,
        idCounter: currentIdCounter,
      });

      // If state changed underneath us (reset/import/etc), drop results
      if (ctx.shouldAbort?.()) return;

      // Update ID counter from worker result (maintains determinism across agents in this tick)
      currentIdCounter = result.idCounter;

      // Process logs from worker
      const nowMs = ctx.state.virtualTimeMs;
      const noOpTick = Boolean(result.success && (!result.ops || result.ops.length === 0));

      for (const log of result.logs) {
        const eventType =
          log.level === 'error' ? 'error' : log.level === 'warn' ? 'warning' : 'info';

        // Dedupe repeated INFO logs on no-op ticks (prevents "tick #N" spam)
        if (noOpTick && eventType === 'info') {
          const prev = lastInfoLogByAgent.get(agent.id);
          const msg = String(log.message ?? '');

          if (prev && prev.message === msg && nowMs >= prev.lastAt && nowMs - prev.lastAt <= ctx.state.tickIntervalMs + 1) {
            lastInfoLogByAgent.set(agent.id, {
              message: prev.message,
              lastAt: nowMs,
              repeats: prev.repeats + 1,
            });
            continue; // swallow duplicate
          }

          // message changed: flush repeat summary before showing the new message
          flushInfoRepeats(ctx, agent.id, nowMs);
          lastInfoLogByAgent.set(agent.id, { message: msg, lastAt: nowMs, repeats: 0 });
        } else if (eventType !== 'info') {
          // before warnings/errors, flush any pending info repeats
          flushInfoRepeats(ctx, agent.id, nowMs);
        } else {
          // info log but not a no-op tick: flush any repeats and pass through
          flushInfoRepeats(ctx, agent.id, nowMs);
        }

        ctx.addEvent({
          type: eventType,
          agentId: agent.id,
          payload: { message: log.message },
        });
      }

      // Save persistent state for next tick
      if (result.finalState !== undefined) {
        agentStateStore.set(agent.id, result.finalState);
      }

      // Track DELIVERED transitions for hash computation
      const deliveredTxIds = new Set<string>();

      // Apply operations from worker (in order)
      if (result.success) {
        let opApplyFailed = false;
        for (const op of result.ops) {
          if (ctx.shouldAbort?.()) return;
          try {
            await applyWorkerOp(ctx, agent.id, op, balanceByAgent, deliveredTxIds);
          } catch (err) {
            opApplyFailed = true;
            // Production-like behavior: if runtime cannot apply an op, this agent is in error.
            ctx.dispatch({
              type: 'UPDATE_AGENT_STATUS',
              payload: { agentId: agent.id, status: 'error' },
            });
            ctx.addEvent({
              type: 'error',
              agentId: agent.id,
              payload: {
                message: `Runtime rejected operation (${op.type}): ${String(err)}`,
              },
            });
            break; // discard remaining ops (avoid partial application)
          }
        }

        // If op application failed, do not compute hashes or continue with this agent
        if (!opApplyFailed && deliveredTxIds.size > 0) {
          const providerState = agentStateStore.get(agent.id);
          for (const txId of deliveredTxIds) {
            // Support both a single deliverable string and a per-tx map.
            const deliverable =
              (providerState &&
                typeof (providerState as any).deliverables === 'object' &&
                (providerState as any).deliverables &&
                typeof (providerState as any).deliverables[txId] === 'string')
                ? String((providerState as any).deliverables[txId])
                : (providerState && typeof (providerState as any).deliverable === 'string')
                  ? String((providerState as any).deliverable)
                  : null;

            if (!deliverable) continue;

            try {
              const hash = await sha256(deliverable);
              if (ctx.shouldAbort?.()) return;
              ctx.dispatch({
                type: 'UPDATE_CONNECTION_HASH',
                payload: { connectionId: txId, deliverableHash: hash },
              });

              ctx.addEvent({
                type: 'info',
                agentId: agent.id,
                connectionId: txId,
                payload: {
                  message: `Deliverable SHA-256: ${hash.substring(0, 16)}...`,
                  deliverableHash: hash,
                },
              });
            } catch (error) {
              ctx.addEvent({
                type: 'warning',
                agentId: agent.id,
                connectionId: txId,
                payload: {
                  message: `Failed to calculate deliverable SHA-256: ${String(error)}`,
                },
              });
            }
          }
        }
      } else if (result.error) {
        // Surface code errors on the agent card as well
        ctx.dispatch({
          type: 'UPDATE_AGENT_STATUS',
          payload: { agentId: agent.id, status: 'error' },
        });
        ctx.addEvent({
          type: 'error',
          agentId: agent.id,
          payload: {
            message: `Execution error: ${result.error.message}`,
            errorType: result.error.type,
            line: result.error.line,
          },
        });
      }
    } catch (err) {
      ctx.dispatch({
        type: 'UPDATE_AGENT_STATUS',
        payload: { agentId: agent.id, status: 'error' },
      });
      ctx.addEvent({
        type: 'error',
        agentId: agent.id,
        payload: {
          message: `Worker error: ${String(err)}`,
        },
      });
    }
  }

  if (ctx.shouldAbort?.()) return;

  // Process pending service jobs (translate, etc.)
  await processJobs();

  if (ctx.shouldAbort?.()) return;

  // Write job results back into agent state (ctx.state.jobs[jobId])
  for (const agent of ctx.state.agents) {
    const state = agentStateStore.get(agent.id);
    if (!state) continue;

    // Initialize jobs object if not present
    if (!state.jobs) {
      state.jobs = {};
    }

    // Scan for job IDs referenced in state and update with results
    const allJobIds = new Set<string>();

    // Extract job IDs from state (simple scan for job-<n> strings)
    const stateJson = JSON.stringify(state);
    // Job IDs are generated via generateId('job') → `job-<n>`
    const jobIdPattern = /\bjob-\d+\b/g;
    const matches = stateJson.match(jobIdPattern);
    if (matches) {
      matches.forEach(id => allJobIds.add(id));
    }

    // Update job results
    for (const jobId of allJobIds) {
      const jobResult = getJobResult(jobId);
      if (jobResult) {
        state.jobs[jobId] = {
          status: jobResult.status,
          result: jobResult.result,
          error: jobResult.error,
        };
      }
    }

    // Update store
    agentStateStore.set(agent.id, state);
  }

  // Keep the global job store bounded; results are now copied into agent state.
  clearCompletedJobs();

  // Persist deterministic idCounter for the NEXT tick (critical for worker IDs).
  ctx.dispatch({ type: 'SET_ID_COUNTER', payload: currentIdCounter });

  // Increment tick counter
  ctx.dispatch({ type: 'TICK_RUNTIME' });
}

function computeNextIdCounterFromState(state: {
  agents: Array<{ id: string }>;
  connections: Array<{ id: string }>;
  events: Array<{ id: string }>;
}): number {
  let max = 0;
  const scan = (id: string) => {
    const m = /-(\d+)$/.exec(id);
    if (!m) return;
    const n = Number(m[1]);
    if (!Number.isSafeInteger(n) || n < 0) return;
    if (n > max) max = n;
  };

  for (const a of state.agents) scan(a.id);
  for (const c of state.connections) scan(c.id);
  for (const e of state.events) scan(e.id);

  return max + 1;
}

/**
 * Apply a single worker operation to canvas state (Phase E)
 */
async function applyWorkerOp(
  ctx: RuntimeContext,
  agentId: string,
  op: WorkerOp,
  balanceByAgent: Map<string, number>,
  deliveredTxIds: Set<string>
): Promise<void> {
  switch (op.type) {
    case 'CREATE_TX': {
      // Find target agent
      const targetAgent = ctx.state.agents.find((a) => a.id === op.tx.provider);
      if (!targetAgent) {
        throw new Error(`Provider agent ${op.tx.provider} not found`);
      }

      // Create connection
      const connection: Connection = {
        id: op.tx.id,
        sourceId: agentId,
        targetId: op.tx.provider,
        state: 'INITIATED',
        amountMicro: op.tx.amountMicro,
        service: op.tx.service,
        deadline: op.tx.deadlineMs ?? undefined,
        createdAt: ctx.state.virtualTimeMs,
        updatedAt: ctx.state.virtualTimeMs,
      };

      // Add to state
      ctx.dispatch({
        type: 'ADD_CONNECTION',
        payload: { connection },
      });

      // Keep main-thread deterministic ID generators in sync with worker-allocated IDs
      // (prevents future UI-generated IDs from colliding).
      syncDeterministicIdsFromIds([connection.id]);

      ctx.addEvent({
        type: 'info',
        agentId,
        connectionId: connection.id,
        payload: {
          message: `Transaction created: ${op.tx.service}`,
          amount: op.tx.amountMicro,
        },
      });
      break;
    }

    case 'TRANSITION_STATE': {
      const connection = ctx.state.connections.find((c) => c.id === op.txId);
      if (!connection) {
        throw new Error(`Transaction ${op.txId} not found`);
      }

      transitionConnectionState(ctx, op.txId, op.state, 'Agent code execution', balanceByAgent);
      if (op.state === 'DELIVERED') {
        deliveredTxIds.add(op.txId);
      }
      break;
    }

    case 'RELEASE_ESCROW': {
      const connection = ctx.state.connections.find((c) => c.id === op.txId);
      if (!connection) {
        throw new Error(`Transaction ${op.txId} not found`);
      }

      if (connection.state !== 'DELIVERED') {
        throw new Error(`Cannot release escrow for transaction in ${connection.state} state`);
      }

      transitionConnectionState(ctx, op.txId, 'SETTLED', 'Agent code execution', balanceByAgent);
      break;
    }

    case 'CANCEL': {
      const connection = ctx.state.connections.find((c) => c.id === op.txId);
      if (!connection) {
        throw new Error(`Transaction ${op.txId} not found`);
      }

      if (TERMINAL_STATES.includes(connection.state)) {
        throw new Error(`Cannot cancel transaction in terminal state ${connection.state}`);
      }

      if (connection.state === 'DELIVERED') {
        throw new Error(`Cannot cancel after delivery (use dispute instead)`);
      }

      transitionConnectionState(ctx, op.txId, 'CANCELLED', 'Agent code execution', balanceByAgent);
      break;
    }

    case 'DISPUTE': {
      const connection = ctx.state.connections.find((c) => c.id === op.txId);
      if (!connection) {
        throw new Error(`Transaction ${op.txId} not found`);
      }

      if (connection.state !== 'DELIVERED') {
        throw new Error(`Can only dispute from DELIVERED state`);
      }

      transitionConnectionState(ctx, op.txId, 'DISPUTED', op.reason, balanceByAgent);
      break;
    }

    case 'SUBMIT_JOB': {
      // Use worker-provided job ID to ensure determinism
      submitJobWithId(op.job.id, op.job.service, op.job.params);

      // Keep main-thread deterministic ID generators in sync with worker-allocated IDs
      syncDeterministicIdsFromIds([op.job.id]);

      ctx.addEvent({
        type: 'info',
        agentId,
        payload: {
          message: `Submitted ${op.job.service} job: ${op.job.id}`,
        },
      });
      break;
    }

    default:
      throw new Error(`Unknown worker operation type: ${(op as any).type}`);
  }
}

/**
 * Simulate full happy path for a specific connection
 * INITIATED → COMMITTED → IN_PROGRESS → DELIVERED → SETTLED
 */
export async function simulateHappyPath(
  ctx: RuntimeContext,
  connectionId: string
): Promise<void> {
  const connection = ctx.state.connections.find((c) => c.id === connectionId);
  if (!connection) {
    ctx.addEvent({
      type: 'error',
      payload: {
        message: `Connection ${connectionId} not found`,
      },
    });
    return;
  }

  const happyPath: TransactionState[] = [
    'INITIATED',
    'COMMITTED',
    'IN_PROGRESS',
    'DELIVERED',
    'SETTLED',
  ];

  const startIndex = happyPath.indexOf(connection.state);
  if (startIndex === -1) {
    ctx.addEvent({
      type: 'error',
      connectionId: connection.id,
      payload: {
        message: `Cannot simulate happy path from state ${connection.state}`,
      },
    });
    return;
  }

  // Progress through remaining states
  for (let i = startIndex + 1; i < happyPath.length; i++) {
    await delay(1000); // 1 second between states
    transitionConnectionState(
      ctx,
      connectionId,
      happyPath[i],
      'Happy path simulation'
    );
  }
}

/**
 * Simulate dispute scenario
 */
export function simulateDispute(
  ctx: RuntimeContext,
  connectionId: string
): void {
  const connection = ctx.state.connections.find((c) => c.id === connectionId);
  if (!connection) return;

  if (connection.state !== 'DELIVERED') {
    ctx.addEvent({
      type: 'error',
      connectionId: connection.id,
      payload: {
        message: 'Can only dispute from DELIVERED state',
      },
    });
    return;
  }

  transitionConnectionState(ctx, connectionId, 'DISPUTED', 'Requester disputed delivery');
}

/**
 * Simulate cancellation
 */
export function simulateCancel(
  ctx: RuntimeContext,
  connectionId: string
): void {
  const connection = ctx.state.connections.find((c) => c.id === connectionId);
  if (!connection) return;

  if (TERMINAL_STATES.includes(connection.state)) {
    ctx.addEvent({
      type: 'error',
      connectionId: connection.id,
      payload: {
        message: 'Cannot cancel transaction in terminal state',
      },
    });
    return;
  }

  if (connection.state === 'DELIVERED') {
    ctx.addEvent({
      type: 'error',
      connectionId: connection.id,
      payload: {
        message: 'Cannot cancel after delivery (use dispute instead)',
      },
    });
    return;
  }

  transitionConnectionState(ctx, connectionId, 'CANCELLED', 'Cancelled by requester');
}

/**
 * Get runtime statistics
 */
export function getRuntimeStats(state: ExtendedCanvasState) {
  const totalTransactions = state.connections.length;
  const activeTransactions = state.connections.filter(
    (c) => !TERMINAL_STATES.includes(c.state)
  ).length;
  const settledTransactions = state.connections.filter(
    (c) => c.state === 'SETTLED'
  ).length;
  const disputedTransactions = state.connections.filter(
    (c) => c.state === 'DISPUTED'
  ).length;

  const totalVolume = state.connections
    .filter((c) => c.state === 'SETTLED')
    .reduce((sum, c) => sum + c.amountMicro, 0);

  return {
    totalTransactions,
    activeTransactions,
    settledTransactions,
    disputedTransactions,
    totalVolume,
  };
}
