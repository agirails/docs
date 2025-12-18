/* ============================================
   AGIRAILS Canvas - State Management
   ============================================ */

import { useReducer, useCallback } from 'react';
import {
  Agent,
  Connection,
  RuntimeEvent,
  TransactionState,
  AgentStatus,
  CanvasState as BaseCanvasState,
  AgentPosition,
  ShareableState,
  ShareableAgent,
  ShareableConnection,
  RuntimeMode,
} from './types';
import { getEventLogger } from './eventLog';

// Extended Canvas State with UI state
export interface ExtendedCanvasState extends BaseCanvasState {
  selectedAgentId: string | null;
  inspectorExpanded: boolean;
  tick: number; // Runtime tick counter
  executionMode: boolean; // true = run user code, false = simulation mode
  runtimeMode: RuntimeMode;
  tickIntervalMs: number;
  positionVersion: number; // Incremented when agent positions change (triggers re-render)
}

// Re-export AgentPosition for backwards compatibility
export type { AgentPosition } from './types';

// Action Types
export type CanvasAction =
  | { type: 'ADD_AGENT'; payload: { agent: Agent; position: AgentPosition } }
  | { type: 'REMOVE_AGENT'; payload: { agentId: string } }
  | { type: 'UPDATE_AGENT'; payload: { agentId: string; updates: Partial<Agent> } }
  | { type: 'UPDATE_AGENT_POSITION'; payload: { agentId: string; position: AgentPosition } }
  | { type: 'UPDATE_AGENT_CODE'; payload: { agentId: string; code: string } }
  | { type: 'UPDATE_AGENT_BALANCE'; payload: { agentId: string; balanceMicro: number } }
  | { type: 'UPDATE_AGENT_STATUS'; payload: { agentId: string; status: AgentStatus } }
  | { type: 'ADD_CONNECTION'; payload: { connection: Connection } }
  | { type: 'REMOVE_CONNECTION'; payload: { connectionId: string } }
  | { type: 'UPDATE_CONNECTION_STATE'; payload: { connectionId: string; state: TransactionState } }
  | { type: 'UPDATE_CONNECTION_AMOUNT'; payload: { connectionId: string; amountMicro: number } }
  | { type: 'UPDATE_CONNECTION_HASH'; payload: { connectionId: string; deliverableHash: string } }
  | { type: 'SET_SELECTED_AGENT'; payload: { agentId: string | null } }
  | { type: 'TOGGLE_INSPECTOR' }
  | { type: 'TOGGLE_EXECUTION_MODE' }
  | { type: 'START_RUNTIME' }
  | { type: 'STOP_RUNTIME' }
  | { type: 'TICK_RUNTIME' }
  | { type: 'ADD_RUNTIME_EVENT'; payload: { event: RuntimeEvent } }
  | { type: 'RESET_RUNTIME' }
  | { type: 'SET_ID_COUNTER'; payload: number }
  | { type: 'LOAD_STATE'; payload: { state: Partial<ExtendedCanvasState> } }
  | { type: 'RESET_STATE' }
  | { type: 'SET_RUNTIME_MODE'; payload: RuntimeMode }
  | { type: 'SET_TICK_INTERVAL'; payload: number }
  | { type: 'STEP_ONCE' };

// Agent positions stored separately (for React Flow)
export const agentPositions = new Map<string, AgentPosition>();
const MAX_EVENTS = 1000;

/**
 * Canvas State Reducer
 * Handles all state transitions for the Canvas
 *
 * Phase D1: Events are logged for replay/debugging
 */
export function canvasReducer(state: ExtendedCanvasState, action: CanvasAction): ExtendedCanvasState {
  const logger = getEventLogger();
  let nextState = state;

  switch (action.type) {
    case 'ADD_AGENT': {
      const { agent, position } = action.payload;
      agentPositions.set(agent.id, position);
      nextState = {
        ...state,
        agents: [...state.agents, agent],
        positionVersion: state.positionVersion + 1,
      };
      logger.logEvent('AGENT_ADDED', { agent, position }, nextState);
      return nextState;
    }

    case 'REMOVE_AGENT': {
      const { agentId } = action.payload;
      agentPositions.delete(agentId);
      nextState = {
        ...state,
        agents: state.agents.filter((a) => a.id !== agentId),
        connections: state.connections.filter(
          (c) => c.sourceId !== agentId && c.targetId !== agentId
        ),
        selectedAgentId: state.selectedAgentId === agentId ? null : state.selectedAgentId,
      };
      logger.logEvent('AGENT_REMOVED', { agentId }, nextState);
      return nextState;
    }

    case 'UPDATE_AGENT': {
      const { agentId, updates } = action.payload;
      nextState = {
        ...state,
        agents: state.agents.map((agent) =>
          agent.id === agentId ? { ...agent, ...updates } : agent
        ),
      };
      // Don't log generic updates (too noisy), specific updates are logged separately
      return nextState;
    }

    case 'UPDATE_AGENT_POSITION': {
      const { agentId, position } = action.payload;
      agentPositions.set(agentId, position);
      // Increment positionVersion to trigger re-render (positions stored in external Map)
      nextState = {
        ...state,
        positionVersion: state.positionVersion + 1,
      };
      logger.logEvent('AGENT_POSITION_UPDATED', { agentId, position }, nextState);
      return nextState;
    }

    case 'UPDATE_AGENT_CODE': {
      const { agentId, code } = action.payload;
      nextState = {
        ...state,
        agents: state.agents.map((agent) =>
          agent.id === agentId
            ? {
                ...agent,
                code,
                // Reset error status when code is edited (user is fixing the error)
                status: agent.status === 'error' ? 'idle' : agent.status,
              }
            : agent
        ),
      };
      logger.logEvent('AGENT_CODE_UPDATED', { agentId, code }, nextState);
      return nextState;
    }

    case 'UPDATE_AGENT_BALANCE': {
      const { agentId, balanceMicro } = action.payload;
      nextState = {
        ...state,
        agents: state.agents.map((agent) =>
          agent.id === agentId ? { ...agent, balanceMicro } : agent
        ),
      };
      logger.logEvent('AGENT_BALANCE_UPDATED', { agentId, balanceMicro }, nextState);
      return nextState;
    }

    case 'UPDATE_AGENT_STATUS': {
      const { agentId, status } = action.payload;
      nextState = {
        ...state,
        agents: state.agents.map((agent) =>
          agent.id === agentId ? { ...agent, status } : agent
        ),
      };
      logger.logEvent('AGENT_STATUS_UPDATED', { agentId, status }, nextState);
      return nextState;
    }

    case 'ADD_CONNECTION': {
      const { connection } = action.payload;
      nextState = {
        ...state,
        connections: [...state.connections, connection],
      };
      logger.logEvent('CONNECTION_CREATED', { connection }, nextState);
      return nextState;
    }

    case 'REMOVE_CONNECTION': {
      const { connectionId } = action.payload;
      nextState = {
        ...state,
        connections: state.connections.filter((c) => c.id !== connectionId),
      };
      logger.logEvent('CONNECTION_REMOVED', { connectionId }, nextState);
      return nextState;
    }

    case 'UPDATE_CONNECTION_STATE': {
      const { connectionId, state: txState } = action.payload;
      nextState = {
        ...state,
        connections: state.connections.map((conn) =>
          conn.id === connectionId
            ? { ...conn, state: txState, updatedAt: state.virtualTimeMs }
            : conn
        ),
      };
      logger.logEvent('CONNECTION_STATE_CHANGED', { connectionId, state: txState }, nextState);
      return nextState;
    }

    case 'UPDATE_CONNECTION_AMOUNT': {
      const { connectionId, amountMicro } = action.payload;
      nextState = {
        ...state,
        connections: state.connections.map((conn) =>
          conn.id === connectionId
            ? { ...conn, amountMicro, updatedAt: state.virtualTimeMs }
            : conn
        ),
      };
      logger.logEvent('CONNECTION_AMOUNT_UPDATED', { connectionId, amountMicro }, nextState);
      return nextState;
    }

    case 'UPDATE_CONNECTION_HASH': {
      const { connectionId, deliverableHash } = action.payload;
      nextState = {
        ...state,
        connections: state.connections.map((conn) =>
          conn.id === connectionId
            ? { ...conn, deliverableHash, updatedAt: state.virtualTimeMs }
            : conn
        ),
      };
      logger.logEvent('CONNECTION_HASH_UPDATED', { connectionId, deliverableHash }, nextState);
      return nextState;
    }

    case 'SET_SELECTED_AGENT': {
      const { agentId } = action.payload;
      nextState = {
        ...state,
        selectedAgentId: agentId,
      };
      logger.logEvent('AGENT_SELECTED', { agentId }, nextState);
      return nextState;
    }

    case 'TOGGLE_INSPECTOR': {
      nextState = {
        ...state,
        inspectorExpanded: !state.inspectorExpanded,
      };
      logger.logEvent('INSPECTOR_TOGGLED', {}, nextState);
      return nextState;
    }

    case 'TOGGLE_EXECUTION_MODE': {
      nextState = {
        ...state,
        executionMode: !state.executionMode,
      };
      logger.logEvent('EXECUTION_MODE_TOGGLED', {}, nextState);
      return nextState;
    }

    case 'START_RUNTIME': {
      nextState = {
        ...state,
        isRunning: true,
      };
      logger.logEvent('RUNTIME_STARTED', {}, nextState);
      return nextState;
    }

    case 'STOP_RUNTIME': {
      nextState = {
        ...state,
        isRunning: false,
      };
      logger.logEvent('RUNTIME_STOPPED', {}, nextState);
      return nextState;
    }

    case 'TICK_RUNTIME': {
      nextState = {
        ...state,
        tick: state.tick + 1,
        virtualTimeMs: state.virtualTimeMs + state.tickIntervalMs,
      };
      logger.logEvent('RUNTIME_TICK', {}, nextState);
      return nextState;
    }

    case 'ADD_RUNTIME_EVENT': {
      const { event } = action.payload;
      const nextEvents = [...state.events, event];
      nextState = {
        ...state,
        events: nextEvents.length > MAX_EVENTS ? nextEvents.slice(-MAX_EVENTS) : nextEvents,
      };
      logger.logEvent('RUNTIME_EVENT_ADDED', { event }, nextState);
      return nextState;
    }

    case 'RESET_RUNTIME': {
      nextState = {
        ...state,
        events: [],
        tick: 0,
        isRunning: false,
        agents: state.agents.map((agent) => ({ ...agent, status: 'idle' })),
        virtualTimeMs: 0,  // Reset virtual time on runtime reset
        idCounter: 1,      // Reset ID counter for deterministic replay
      };
      logger.logEvent('RUNTIME_RESET', {}, nextState);
      return nextState;
    }

    case 'SET_ID_COUNTER': {
      nextState = {
        ...state,
        idCounter: action.payload,
      };
      logger.logEvent('ID_COUNTER_SET', { idCounter: action.payload }, nextState);
      return nextState;
    }

    case 'LOAD_STATE': {
      const { state: loadedState } = action.payload;
      nextState = {
        ...state,
        ...loadedState,
        // Always increment positionVersion to ensure re-render after load
        positionVersion: state.positionVersion + 1,
      };
      logger.logEvent('STATE_LOADED', { state: loadedState }, nextState);
      return nextState;
    }

    case 'RESET_STATE': {
      agentPositions.clear();
      nextState = getDefaultCanvasState();
      logger.logEvent('STATE_RESET', {}, nextState);
      return nextState;
    }

    case 'SET_RUNTIME_MODE':
      nextState = { ...state, runtimeMode: action.payload };
      logger.logEvent('RUNTIME_MODE_CHANGED', { mode: action.payload }, nextState);
      return nextState;

    case 'SET_TICK_INTERVAL':
      nextState = { ...state, tickIntervalMs: action.payload };
      logger.logEvent('TICK_INTERVAL_CHANGED', { intervalMs: action.payload }, nextState);
      return nextState;

    case 'STEP_ONCE':
      // This is handled in Canvas.tsx, no state change needed
      return state;

    default:
      return state;
  }
}

/**
 * Default Canvas State
 */
export function getDefaultCanvasState(): ExtendedCanvasState {
  return {
    agents: [],
    connections: [],
    events: [],
    isRunning: false,
    selectedAgentId: null,
    inspectorExpanded: true,
    tick: 0,
    executionMode: true, // Always execute agent code (Simulate removed)
    runtimeMode: 'auto' as RuntimeMode,
    positionVersion: 0, // Triggers re-render when positions change
    tickIntervalMs: 2000,

    // Determinism primitives (Phase D0)
    virtualTimeMs: 0,  // Start at 0 for deterministic replay
    idCounter: 1,      // Start at 1 for predictable IDs
    rngSeed: 42,       // Fixed seed for future random needs
  };
}

/**
 * Canvas State Hook
 * Main hook for managing Canvas state
 */
export function useCanvasState() {
  const [state, dispatch] = useReducer(canvasReducer, getDefaultCanvasState());

  // Helper: Get agent by ID
  const getAgent = useCallback(
    (agentId: string): Agent | undefined => {
      return state.agents.find((a) => a.id === agentId);
    },
    [state.agents]
  );

  // Helper: Get connection by ID
  const getConnection = useCallback(
    (connectionId: string): Connection | undefined => {
      return state.connections.find((c) => c.id === connectionId);
    },
    [state.connections]
  );

  // Helper: Get all connections for an agent
  const getAgentConnections = useCallback(
    (agentId: string): Connection[] => {
      return state.connections.filter(
        (c) => c.sourceId === agentId || c.targetId === agentId
      );
    },
    [state.connections]
  );

  // Helper: Get agent position
  const getAgentPosition = useCallback((agentId: string): AgentPosition | undefined => {
    return agentPositions.get(agentId);
  }, []);

  /**
   * Serialize state to JSON for URL sharing
   * NOTE: Excludes agent code per spec - share URL contains topology only.
   * When loading, code is restored from templates.
   *
   * IMPORTANT: Output is deterministic - all arrays sorted by ID for consistent hashing.
   */
  const serializeState = useCallback((): string => {
    // Strip code from agents for URL sharing (per spec)
    const shareableAgents: ShareableAgent[] = state.agents
      .map((agent) => ({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        templateId: agent.templateId,
        icon: agent.icon,
        balanceMicro: agent.balanceMicro,
        // code intentionally excluded
      }))
      .sort((a, b) => a.id.localeCompare(b.id)); // Deterministic order

    // Strip timestamps from connections for URL size + determinism
    // Include deliverableHash for DELIVERED transactions (Phase D2: proof link)
    const shareableConnections: ShareableConnection[] = state.connections
      .map((c) => ({
        id: c.id,
        sourceId: c.sourceId,
        targetId: c.targetId,
        state: c.state,
        amountMicro: c.amountMicro,
        service: c.service,
        ...(c.deliverableHash && { deliverableHash: c.deliverableHash }), // Include hash if present
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    // Sort positions by ID for deterministic output
    const sortedPositions = Array.from(agentPositions.entries())
      .map(([id, pos]) => ({
        id,
        x: pos.x,
        y: pos.y,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    const shareable: ShareableState = {
      agents: shareableAgents,
      connections: shareableConnections,
      positions: sortedPositions,
      virtualTimeMs: state.virtualTimeMs, // Include simulation time for replay consistency
    };
    return JSON.stringify(shareable);
  }, [state.agents, state.connections, state.virtualTimeMs]);

  /**
   * Deserialize state from JSON (loaded from URL)
   * NOTE: Restores agent code from templates since share URL doesn't include code.
   * @param json - Serialized ShareableState JSON
   * @param getTemplateCode - Function to get default code for a template ID
   */
  const deserializeState = useCallback(
    (json: string, getTemplateCode?: (templateId: string) => string): void => {
      try {
        const data: ShareableState = JSON.parse(json);

        // Restore positions
        agentPositions.clear();
        if (data.positions && Array.isArray(data.positions)) {
          data.positions.forEach((pos) => {
            agentPositions.set(pos.id, { x: pos.x, y: pos.y });
          });
        }

        const baseTime = data.virtualTimeMs ?? 0;

        // Restore agents with code from templates
        const agents: Agent[] = (data.agents || []).map((shareableAgent) => ({
          ...shareableAgent,
          status: 'idle' as const,
          code: getTemplateCode
            ? getTemplateCode(shareableAgent.templateId)
            : `// ${shareableAgent.name}\n// Code loaded from template: ${shareableAgent.templateId}`,
          createdAt: baseTime,
        }));

        const connections: Connection[] = (data.connections || []).map((c) => ({
          ...c,
          createdAt: baseTime,
          updatedAt: baseTime,
        }));

        // Load state
        dispatch({
          type: 'LOAD_STATE',
          payload: {
            state: {
              agents,
              connections,
              events: [],
              isRunning: false,
              selectedAgentId: null,
              inspectorExpanded: true,
              tick: 0,
              executionMode: true,
              runtimeMode: 'auto',
              tickIntervalMs: 2000,
              // Restore virtualTimeMs from shared state if present, otherwise reset
              virtualTimeMs: data.virtualTimeMs ?? 0,
              idCounter: 1,
              rngSeed: 42,
            },
          },
        });
      } catch (error) {
        console.error('Failed to deserialize state:', error);
      }
    },
    []
  );

  // Action creators
  const actions = {
    addAgent: (agent: Agent, position: AgentPosition) =>
      dispatch({ type: 'ADD_AGENT', payload: { agent, position } }),

    removeAgent: (agentId: string) =>
      dispatch({ type: 'REMOVE_AGENT', payload: { agentId } }),

    updateAgent: (agentId: string, updates: Partial<Agent>) =>
      dispatch({ type: 'UPDATE_AGENT', payload: { agentId, updates } }),

    updateAgentPosition: (agentId: string, position: AgentPosition) =>
      dispatch({ type: 'UPDATE_AGENT_POSITION', payload: { agentId, position } }),

    updateAgentCode: (agentId: string, code: string) =>
      dispatch({ type: 'UPDATE_AGENT_CODE', payload: { agentId, code } }),

    updateAgentBalance: (agentId: string, balanceMicro: number) =>
      dispatch({ type: 'UPDATE_AGENT_BALANCE', payload: { agentId, balanceMicro } }),

    updateAgentStatus: (agentId: string, status: AgentStatus) =>
      dispatch({ type: 'UPDATE_AGENT_STATUS', payload: { agentId, status } }),

    addConnection: (connection: Connection) =>
      dispatch({ type: 'ADD_CONNECTION', payload: { connection } }),

    removeConnection: (connectionId: string) =>
      dispatch({ type: 'REMOVE_CONNECTION', payload: { connectionId } }),

    updateConnectionState: (connectionId: string, txState: TransactionState) =>
      dispatch({ type: 'UPDATE_CONNECTION_STATE', payload: { connectionId, state: txState } }),

    updateConnectionAmount: (connectionId: string, amountMicro: number) =>
      dispatch({ type: 'UPDATE_CONNECTION_AMOUNT', payload: { connectionId, amountMicro } }),

    setSelectedAgent: (agentId: string | null) =>
      dispatch({ type: 'SET_SELECTED_AGENT', payload: { agentId } }),

    toggleInspector: () =>
      dispatch({ type: 'TOGGLE_INSPECTOR' }),

    toggleExecutionMode: () =>
      dispatch({ type: 'TOGGLE_EXECUTION_MODE' }),

    startRuntime: () =>
      dispatch({ type: 'START_RUNTIME' }),

    stopRuntime: () =>
      dispatch({ type: 'STOP_RUNTIME' }),

    tickRuntime: () =>
      dispatch({ type: 'TICK_RUNTIME' }),

    setIdCounter: (value: number) =>
      dispatch({ type: 'SET_ID_COUNTER', payload: value }),

    addRuntimeEvent: (event: RuntimeEvent) =>
      dispatch({ type: 'ADD_RUNTIME_EVENT', payload: { event } }),

    resetRuntime: () =>
      dispatch({ type: 'RESET_RUNTIME' }),

    loadState: (loadedState: Partial<ExtendedCanvasState>) =>
      dispatch({ type: 'LOAD_STATE', payload: { state: loadedState } }),

    resetState: () =>
      dispatch({ type: 'RESET_STATE' }),

    setRuntimeMode: (mode: RuntimeMode) => {
      dispatch({ type: 'SET_RUNTIME_MODE', payload: mode });
    },

    setTickInterval: (intervalMs: number) => {
      dispatch({ type: 'SET_TICK_INTERVAL', payload: intervalMs });
    },

    stepOnce: () => {
      dispatch({ type: 'STEP_ONCE' });
    },
  };

  return {
    state,
    dispatch,
    actions,
    getAgent,
    getConnection,
    getAgentConnections,
    getAgentPosition,
    serializeState,
    deserializeState,
  };
}
