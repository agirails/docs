/* ============================================
   AGIRAILS Canvas - Type Definitions
   ============================================ */

// Transaction States (from ACTP Protocol)
export type TransactionState =
  | 'INITIATED'
  | 'QUOTED'
  | 'COMMITTED'
  | 'IN_PROGRESS'
  | 'DELIVERED'
  | 'SETTLED'
  | 'DISPUTED'
  | 'CANCELLED';

// Agent Types
export type AgentType = 'requester' | 'provider' | 'validator';

// Agent Status
export type AgentStatus = 'idle' | 'running' | 'completed' | 'error';

// Agent Definition
export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  templateId: string;
  icon: string;
  balanceMicro: number; // Balance in micro-USDC (6 decimals)
  status: AgentStatus;
  code: string;
  createdAt: number;
}

// Connection (Transaction) between agents
export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  state: TransactionState;
  amountMicro: number;
  service: string;
  deadline?: number;
  disputeWindow?: number;
  deliverableHash?: string; // SHA-256 hash of deliverable content (set on DELIVERED)
  createdAt: number;
  updatedAt: number;
}

// Runtime Event (for console)
export interface RuntimeEvent {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
  agentId?: string;
  connectionId?: string;
  payload: Record<string, any>;
}

// Agent Template
export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  type: AgentType;
  icon: string;
  defaultCode: string;
}

// Canvas State
export interface CanvasState {
  agents: Agent[];
  connections: Connection[];
  events: RuntimeEvent[];
  isRunning: boolean;

  // Determinism primitives (Phase D0)
  virtualTimeMs: number;  // Simulated time, starts at fixed epoch
  idCounter: number;      // Monotonic ID counter for generateIdDeterministic
  rngSeed: number;        // Optional: for future random needs
}

// Agent Position (for React Flow node positioning)
export interface AgentPosition {
  x: number;
  y: number;
}

// Shareable Agent (excludes code per spec - share URL doesn't include user code)
export interface ShareableAgent {
  id: string;
  name: string;
  type: AgentType;
  templateId: string;
  icon: string;
  balanceMicro: number;
  // NOTE: code is intentionally excluded for URL sharing
}

// Shareable Connection (URL payload excludes timestamps to reduce size)
export interface ShareableConnection {
  id: string;
  sourceId: string;
  targetId: string;
  state: TransactionState;
  amountMicro: number;
  service: string;
  deliverableHash?: string; // SHA-256 proof for DELIVERED transactions
}

// Shareable State (for URL serialization - no code, minimal payload)
export interface ShareableState {
  agents: ShareableAgent[];
  connections: ShareableConnection[];
  positions: Array<{ id: string; x: number; y: number }>;
  virtualTimeMs?: number; // Simulation time when shared (for replay consistency)
}

// Helper Functions
export function formatUSDC(microUsdc: number): string {
  const usdc = microUsdc / 1_000_000;
  return `$${usdc.toFixed(2)}`;
}

export function getStateColor(state: TransactionState): string {
  switch (state) {
    case 'INITIATED':
    case 'QUOTED':
      return '#888888';
    case 'COMMITTED':
    case 'IN_PROGRESS':
      return '#00E4E4';
    case 'DELIVERED':
      return '#FF9100';
    case 'SETTLED':
      return '#00C853';
    case 'DISPUTED':
      return '#FF1744';
    case 'CANCELLED':
      return '#888888';
    default:
      return '#888888';
  }
}

// ============================================
// Determinism Primitives (Phase D0)
// ============================================

/**
 * Per-prefix deterministic counters for IDs.
 * NOTE: These counters are intentionally process-global (per page session).
 * Reset/sync them on major state loads (scenario/import/share/reset) to keep IDs collision-free.
 */
const idCountersByPrefix = new Map<string, number>();

function parseIdWithNumericSuffix(id: string): { prefix: string; n: number } | null {
  // Accept any prefix and a numeric suffix: "<prefix>-<number>"
  const match = id.match(/^(.*)-(\d+)$/);
  if (!match) return null;

  const prefix = match[1];
  const n = Number(match[2]);
  if (!Number.isSafeInteger(n) || n < 0) return null;

  return { prefix, n };
}

/**
 * Reset all deterministic ID counters (call on new sessions / reset).
 */
export function resetDeterministicIds(): void {
  idCountersByPrefix.clear();
}

/**
 * Sync deterministic ID counters from an array of existing IDs (prevents collisions).
 */
export function syncDeterministicIdsFromIds(ids: Array<string | undefined | null>): void {
  for (const id of ids) {
    if (!id) continue;
    const parsed = parseIdWithNumericSuffix(id);
    if (!parsed) continue;

    const currentNext = idCountersByPrefix.get(parsed.prefix) ?? 1;
    const desiredNext = parsed.n + 1;
    if (desiredNext > currentNext) {
      idCountersByPrefix.set(parsed.prefix, desiredNext);
    }
  }
}

/**
 * Sync deterministic ID counters from a state-like object.
 * Use this after loading/importing/replaying state to ensure future IDs don't collide.
 */
export function syncDeterministicIdsFromState(state: {
  agents?: Array<{ id: string }>;
  connections?: Array<{ id: string }>;
  events?: Array<{ id: string }>;
}): void {
  syncDeterministicIdsFromIds([
    ...(state.agents?.map((a) => a.id) ?? []),
    ...(state.connections?.map((c) => c.id) ?? []),
    ...(state.events?.map((e) => e.id) ?? []),
  ]);
}

/**
 * Deterministic ID generator.
 * Produces `${prefix}-${N}` using a per-prefix monotonic counter.
 */
export function generateId(prefix: string = 'id'): string {
  const next = idCountersByPrefix.get(prefix) ?? 1;
  idCountersByPrefix.set(prefix, next + 1);
  return `${prefix}-${next}`;
}

/**
 * Deterministic ID generator for replay and export consistency
 * Uses monotonic counter instead of timestamp + random
 * @param prefix ID prefix (e.g., 'agent', 'tx', 'event')
 * @param state State object with idCounter property (mutated in-place)
 * @returns Deterministic ID like "agent-1", "agent-2", etc.
 */
export function generateIdDeterministic(prefix: string, state: { idCounter: number }): string {
  return `${prefix}-${state.idCounter++}`;
}

export function parseUSDC(usdcString: string): number {
  // Parse "$1.50" to 1500000 micro-USDC
  const cleanedString = usdcString.replace(/[$,]/g, '');
  const usdc = parseFloat(cleanedString);
  return Math.round(usdc * 1_000_000);
}

/**
 * Runtime execution mode
 * - 'auto': Continuous execution with interval
 * - 'step': Manual step-by-step execution
 */
export type RuntimeMode = 'auto' | 'step';

/**
 * Speed multiplier presets
 */
export const SPEED_PRESETS = {
  '0.5x': 4000,
  '1x': 2000,   // Default
  '2x': 1000,
  '4x': 500,
} as const;

export type SpeedPreset = keyof typeof SPEED_PRESETS;
