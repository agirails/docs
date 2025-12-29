import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import { usePlaygroundContext, PlaygroundContext } from '../../hooks/usePlaygroundContext';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  Connection as FlowConnection,
  Node,
  Edge,
  NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Suppress benign ResizeObserver "loop limit exceeded" error (Monaco + ReactFlow)
// without patching global ResizeObserver implementation.
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    const msg = String((e as any)?.message ?? '');
    if (msg.includes('ResizeObserver loop limit exceeded') || msg.includes('ResizeObserver loop completed')) {
      e.preventDefault();
    }
  });
}

import { nodeTypes } from './nodes/nodeTypes';
import { edgeTypes } from './edges/edgeTypes';
import { Toolbar } from './Toolbar';
import { InspectorPanel } from './panels/InspectorPanel';
import { ConnectionModal } from './modals/ConnectionModal';
import { CodeEditorPanel } from './panels/CodeEditorPanel';
import { Toast } from './Toast';
import { ScenarioGallery } from './ScenarioGallery';
import { CanvasWelcome } from '../playground/CanvasWelcome';
import {
  Agent,
  Connection,
  RuntimeEvent,
  generateId,
  resetDeterministicIds,
  syncDeterministicIdsFromState,
} from '../../lib/canvas/types';
import { useCanvasState, agentPositions } from '../../lib/canvas/useCanvasState';
import { getExampleCanvasState, getTemplate } from '../../lib/canvas/templates';
import { Scenario } from '../../lib/canvas/scenarios';
import {
  runTickWithExecution,
  RuntimeContext,
  simulateCancel,
  simulateDispute,
  getNextState,
  transitionConnectionState,
  clearAllAgentState,
  clearAgentState,
  snapshotAgentStateStore,
  restoreAgentStateStore,
} from '../../lib/canvas/runtime';
import { parseShareUrl, generateShareUrl, copyTextToClipboard } from '../../lib/canvas/share';
import { downloadAsJSON, importCanvasFromJSON } from '../../lib/canvas/export';
import { clearAllJobs, snapshotJobStore, restoreJobStore } from '../../lib/canvas/services';
import type { ServiceJob } from '../../lib/canvas/services';
import { getEventLogger, exportEventLog, importEventLog } from '../../lib/canvas/eventLog';
import { ReplayEngine } from '../../lib/canvas/replay';

function hash32(input: string): number {
  // FNV-1a 32-bit (deterministic, fast)
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function deepClone<T>(value: T): T {
  // Prefer structuredClone when available (faster, safer than JSON for big states)
  // Fallback to JSON for older environments.
  try {
    if (typeof structuredClone === 'function') {
      return structuredClone(value);
    }
  } catch {
    // ignore
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

type HistoryEntry = {
  canvasState: any;
  positions: Array<{ id: string; x: number; y: number }>;
  enabledAgentIds: string[];
  agentStateStore: Record<string, Record<string, any>>;
  jobStore: ServiceJob[];
};

function spreadScenarioPositions(
  positions: Record<string, { x: number; y: number }>
): Record<string, { x: number; y: number }> {
  const entries = Object.entries(positions);
  if (entries.length <= 1) return positions;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const [, p] of entries) {
    if (!p) continue;
    const x = Number(p.x) || 0;
    const y = Number(p.y) || 0;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const scale = 1.12; // small spread for breathing room

  const out: Record<string, { x: number; y: number }> = {};
  for (const [id, p] of entries) {
    const x = Number(p?.x) || 0;
    const y = Number(p?.y) || 0;
    const h = hash32(id);
    const dx = ((h % 3) - 1) * 28; // -28 / 0 / +28
    const dy = ((Math.floor(h / 3) % 3) - 1) * 36; // -36 / 0 / +36

    out[id] = {
      x: cx + (x - cx) * scale + dx,
      y: cy + (y - cy) * scale + dy,
    };
  }
  return out;
}

export function Canvas() {
  const {
    state,
    dispatch,
    actions,
    getAgentPosition,
    getAgent,
    serializeState,
    deserializeState,
  } = useCanvasState();

  // Connection modal state
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<{
    sourceId: string;
    targetId: string;
  } | null>(null);

  // Code editor state
  const [codeEditorAgent, setCodeEditorAgent] = useState<Agent | null>(null);

  // Toast notification state
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  } | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);

  // Scenario gallery state
  const [showScenarioGallery, setShowScenarioGallery] = useState(false);
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(false);

  // Phase D1: Recording & Replay state
  const [isRecording, setIsRecording] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayProgress, setReplayProgress] = useState(0);
  const replayEngineRef = useRef<ReplayEngine | null>(null);
  const replayIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // NOTE: runtime event IDs use deterministic generateId('rt')

  // Runtime interval ref (browser-safe type)
  const runtimeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickInFlightRef = useRef(false);
  const runtimeEpochRef = useRef(0);
  const stateRef = useRef(state);
  const actionsRef = useRef(actions);

  // Enabled agents (toggles on agent cards) - all enabled by default
  const [enabledAgentIds, setEnabledAgentIds] = useState<Set<string>>(new Set());

  // State history for Back/undo functionality
  const [stateHistory, setStateHistory] = useState<HistoryEntry[]>([]);
  const MAX_HISTORY = 50; // Keep last 50 states

  // React Flow requires a non-zero parent size. Docusaurus layout can report 0x0
  // during initial paint/hydration, which triggers React Flow error #004.
  // We gate rendering until the workspace has a measured size.
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const [workspaceReady, setWorkspaceReady] = useState(false);

  // Keep refs in sync immediately (avoid "sometimes uses old code" race with setInterval)
  stateRef.current = state;
  actionsRef.current = actions;

  // Build playground context for AI Assistant
  const playgroundContext = useMemo((): PlaygroundContext => {
    const selectedAgent = state.selectedAgentId ? state.agents.find(a => a.id === state.selectedAgentId) : null;
    const activeConnections = state.connections.filter(c => !['SETTLED', 'CANCELLED'].includes(c.state));
    const recentEvents = state.events.slice(-5).map(e => `[${e.type}] ${e.payload?.message || JSON.stringify(e.payload)}`);

    // Get connection state distribution
    const stateDistribution: Record<string, number> = {};
    state.connections.forEach(c => {
      stateDistribution[c.state] = (stateDistribution[c.state] || 0) + 1;
    });

    return {
      type: 'canvas',
      title: 'Canvas Playground (Visual Agent Builder)',
      description: 'Visual sandbox for designing and testing multi-agent workflows with ACTP protocol',
      summary: state.isRunning
        ? `Runtime active: ${state.agents.length} agents, ${activeConnections.length} active transactions, tick #${state.tick}`
        : `${state.agents.length} agents, ${state.connections.length} connections${selectedAgent ? `, selected: ${selectedAgent.name}` : ''}`,
      data: {
        agents: state.agents.map(a => ({
          id: a.id,
          name: a.name,
          templateId: a.templateId,
          status: a.status,
          balanceMicro: a.balanceMicro,
          enabled: enabledAgentIds.has(a.id),
        })),
        connections: state.connections.map(c => ({
          id: c.id.slice(0, 8),
          sourceId: c.sourceId,
          targetId: c.targetId,
          state: c.state,
        })),
        stateDistribution,
        selectedAgent: selectedAgent ? {
          id: selectedAgent.id,
          name: selectedAgent.name,
          code: selectedAgent.code?.slice(0, 500) + (selectedAgent.code && selectedAgent.code.length > 500 ? '...' : ''),
        } : null,
        runtime: {
          isRunning: state.isRunning,
          tick: state.tick,
          virtualTimeMs: state.virtualTimeMs,
          tickIntervalMs: state.tickIntervalMs,
        },
        recentEvents,
      },
    };
  }, [state, enabledAgentIds]);

  // Emit context for AI Assistant
  usePlaygroundContext(playgroundContext);

  const bumpRuntimeEpoch = useCallback((reason: string) => {
    runtimeEpochRef.current += 1;
    // Any in-flight tick must be considered stale immediately
    tickInFlightRef.current = false;
    // Best-effort: stop runtime so UI doesn't keep scheduling ticks
    actionsRef.current.stopRuntime();
    // Optional debug
    // console.debug('[canvas] runtime epoch bump:', runtimeEpochRef.current, reason);
  }, []);

  useEffect(() => {
    const el = workspaceRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setWorkspaceReady(rect.width > 0 && rect.height > 0);
    };

    update();

    // Older/embedded browsers might not support ResizeObserver; fall back to immediate render.
    if (typeof ResizeObserver === 'undefined') {
      setWorkspaceReady(true);
      return;
    }

    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  // Initialize from URL or show welcome screen
  useEffect(() => {
    // Phase D0: reset deterministic ID counters on session init.
    resetDeterministicIds();

    // Check if user has seen welcome screen
    const hasSeenWelcome = typeof window !== 'undefined' && localStorage.getItem('cv_seen_welcome') === '1';

    // Check for share URL parameter
    const sharedState = parseShareUrl();

    if (sharedState) {
      bumpRuntimeEpoch('init-share');
      // Load from share URL (clear any existing agent state first)
      clearAllAgentState();
      clearAllJobs();
      setEnabledAgentIds(new Set());
      setStateHistory([]);

      // Prime deterministic IDs from shared snapshot to avoid collisions after load.
      syncDeterministicIdsFromState({
        agents: sharedState.agents as any,
        connections: sharedState.connections as any,
      });

      const getTemplateCode = (templateId: string) => {
        const template = getTemplate(templateId);
        return template?.defaultCode || `// Template ${templateId} not found`;
      };

      const serialized = JSON.stringify(sharedState);
      deserializeState(serialized, getTemplateCode);
    } else if (!hasSeenWelcome && state.agents.length === 0) {
      // Show welcome screen on first load
      setShowWelcomeScreen(true);
    } else if (state.agents.length === 0) {
      bumpRuntimeEpoch('init-example');
      // Load example state for returning users
      const exampleState = getExampleCanvasState();
      resetDeterministicIds();
      syncDeterministicIdsFromState(exampleState as any);
      actions.loadState(exampleState);
      // Don't clear enabledAgentIds - auto-enable effect will handle it
      setStateHistory([]);

      // Set initial positions for example agents
      // Spread out horizontally with vertical offset for nice curved edges
      actions.updateAgentPosition('agent-1', { x: 100, y: 150 });
      actions.updateAgentPosition('agent-2', { x: 500, y: 250 });
    }
  }, [bumpRuntimeEpoch]);

  // Ref for enabled agent IDs (to access in interval without stale closure)
  // Sync immediately, not in effect, to avoid timing issues
  const enabledAgentIdsRef = useRef(enabledAgentIds);
  enabledAgentIdsRef.current = enabledAgentIds;

  // Check if all enabled agents have completed (SETTLED/CANCELLED or error)
  const checkAllDone = useCallback(() => {
    const s = stateRef.current;
    const enabled = enabledAgentIdsRef.current;

    // Get enabled agents
    const enabledAgents = s.agents.filter(a => enabled.has(a.id));
    if (enabledAgents.length === 0) return true;

    // Check if any agent has error status
    const hasError = enabledAgents.some(a => a.status === 'error');
    if (hasError) return true;

    // Check all connections involving enabled agents
    const enabledIds = new Set(enabledAgents.map(a => a.id));
    const relevantConnections = s.connections.filter(
      c => enabledIds.has(c.sourceId) || enabledIds.has(c.targetId)
    );

    // If no connections, not done yet (agents need to create transactions)
    if (relevantConnections.length === 0) return false;

    // All relevant connections must be in terminal state
    const allTerminal = relevantConnections.every(
      c => c.state === 'SETTLED' || c.state === 'CANCELLED'
    );

    return allTerminal;
  }, []);

  const captureHistoryEntry = useCallback((): HistoryEntry => {
    const positions = Array.from(agentPositions.entries()).map(([id, pos]) => ({
      id,
      x: Number(pos.x) || 0,
      y: Number(pos.y) || 0,
    }));

    return {
      canvasState: deepClone(stateRef.current),
      positions,
      enabledAgentIds: Array.from(enabledAgentIdsRef.current),
      agentStateStore: snapshotAgentStateStore(),
      jobStore: snapshotJobStore(),
    };
  }, []);

  // Runtime tick loop
  useEffect(() => {
    if (isReplaying) {
      // Never run the real runtime during replay (prevents state divergence).
      if (runtimeIntervalRef.current) {
        clearInterval(runtimeIntervalRef.current);
        runtimeIntervalRef.current = null;
      }
      tickInFlightRef.current = false;
      return;
    }

    if (state.isRunning && state.runtimeMode === 'auto') {
      // Run tick at configured interval (context reads latest state via refs)
      runtimeIntervalRef.current = setInterval(() => {
        // If a tick is already running, do nothing (CRITICAL: avoid side-effects while in-flight)
        if (tickInFlightRef.current) return;

        const epoch = runtimeEpochRef.current;
        const shouldAbort = () => runtimeEpochRef.current !== epoch;

        // Check if all done before running tick
        if (checkAllDone()) {
          actionsRef.current.stopRuntime();
          // Reset agent statuses to idle
          for (const agent of stateRef.current.agents) {
            if (enabledAgentIdsRef.current.has(agent.id) && agent.status === 'running') {
              actionsRef.current.updateAgentStatus(agent.id, 'completed');
            }
          }
          return;
        }

        const runtimeContext: RuntimeContext = {
          state: stateRef.current,
          dispatch: (action) => {
            const a = actionsRef.current;
            if (action.type === 'UPDATE_CONNECTION_STATE') {
              a.updateConnectionState(action.payload.connectionId, action.payload.state);
            } else if (action.type === 'UPDATE_AGENT_BALANCE') {
              a.updateAgentBalance(action.payload.agentId, action.payload.balanceMicro);
            } else if (action.type === 'UPDATE_AGENT_STATUS') {
              a.updateAgentStatus(action.payload.agentId, action.payload.status);
            } else if (action.type === 'SET_ID_COUNTER') {
              a.setIdCounter(action.payload);
            } else if (action.type === 'TICK_RUNTIME') {
              a.tickRuntime();
            } else if (action.type === 'ADD_CONNECTION') {
              a.addConnection(action.payload.connection);
            } else if (action.type === 'UPDATE_CONNECTION_HASH') {
              dispatch(action);
            }
          },
          addEvent: (event: Omit<RuntimeEvent, 'id' | 'timestamp'>) => {
            const a = actionsRef.current;
            const fullEvent: RuntimeEvent = {
              id: generateId('rt'),
              timestamp: stateRef.current.virtualTimeMs,
              ...event,
            };
            a.addRuntimeEvent(fullEvent);
          },
          shouldAbort,
        };

        tickInFlightRef.current = true;

        const agentIds = Array.from(enabledAgentIdsRef.current);
        if (agentIds.length === 0) {
          // Nothing enabled → stop scheduler
          actionsRef.current.stopRuntime();
          tickInFlightRef.current = false;
          return;
        }

        runTickWithExecution(runtimeContext, { agentIds })
          .catch((err) => {
            console.error('Runtime execution error:', err);
            const a = actionsRef.current;
            a.addRuntimeEvent({
              id: generateId('rt'),
              timestamp: stateRef.current.virtualTimeMs,
              type: 'error',
              payload: {
                message: `Runtime error: ${String(err)}`,
              },
            });
          })
          .finally(() => {
            tickInFlightRef.current = false;
          });
      }, state.tickIntervalMs);
    } else {
      // Clear interval when stopped
      if (runtimeIntervalRef.current) {
        clearInterval(runtimeIntervalRef.current);
        runtimeIntervalRef.current = null;
      }
      tickInFlightRef.current = false;
    }

    // Cleanup on unmount
    return () => {
      if (runtimeIntervalRef.current) {
        clearInterval(runtimeIntervalRef.current);
      }
      tickInFlightRef.current = false;
    };
  }, [state.isRunning, state.runtimeMode, state.tickIntervalMs, isReplaying, checkAllDone]);

  // Step forward one tick (manual execution)
  const handleStepForward = useCallback(() => {
    if (isReplaying) return;
    if (state.isRunning) return; // Don't step while auto-running

    if (tickInFlightRef.current) return;

    const epoch = runtimeEpochRef.current;
    const shouldAbort = () => runtimeEpochRef.current !== epoch;

    const agentIds = Array.from(enabledAgentIdsRef.current);
    if (agentIds.length === 0) {
      setToast({ message: 'No agents enabled', type: 'info' });
      return;
    }

    // Save state to history before step
    setStateHistory((prev) => {
      const entry = captureHistoryEntry();
      const next = [...prev, entry];
      return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
    });

    const runtimeContext: RuntimeContext = {
      state: stateRef.current,
      dispatch: (action) => {
        const a = actionsRef.current;
        if (action.type === 'UPDATE_CONNECTION_STATE') {
          a.updateConnectionState(action.payload.connectionId, action.payload.state);
        } else if (action.type === 'UPDATE_AGENT_BALANCE') {
          a.updateAgentBalance(action.payload.agentId, action.payload.balanceMicro);
        } else if (action.type === 'UPDATE_AGENT_STATUS') {
          a.updateAgentStatus(action.payload.agentId, action.payload.status);
        } else if (action.type === 'SET_ID_COUNTER') {
          a.setIdCounter(action.payload);
        } else if (action.type === 'TICK_RUNTIME') {
          a.tickRuntime();
        } else if (action.type === 'ADD_CONNECTION') {
          a.addConnection(action.payload.connection);
        } else if (action.type === 'UPDATE_CONNECTION_HASH') {
          dispatch(action);
        }
      },
      addEvent: (event: Omit<RuntimeEvent, 'id' | 'timestamp'>) => {
        const a = actionsRef.current;
        const fullEvent: RuntimeEvent = {
          id: generateId('rt'),
          timestamp: stateRef.current.virtualTimeMs,
          ...event,
        };
        a.addRuntimeEvent(fullEvent);
      },
      shouldAbort,
    };

    tickInFlightRef.current = true;

    runTickWithExecution(runtimeContext, { agentIds })
      .catch((err) => {
        console.error('Runtime execution error:', err);
        const a = actionsRef.current;
        a.addRuntimeEvent({
          id: generateId('rt'),
          timestamp: stateRef.current.virtualTimeMs,
          type: 'error',
          payload: {
            message: `Runtime error: ${String(err)}`,
          },
        });
      })
      .finally(() => {
        tickInFlightRef.current = false;
      });
  }, [state.isRunning, isReplaying, captureHistoryEntry]);

  // Step back one tick (restore previous state from history)
  const handleStepBack = useCallback(() => {
    if (isReplaying) return;
    if (state.isRunning) return; // Don't step back while running

    if (stateHistory.length === 0) {
      setToast({ message: 'No history to step back', type: 'info' });
      return;
    }

    // Pop the last snapshot from history and restore it (INCLUDING external stores)
    const entry = stateHistory[stateHistory.length - 1];
    setStateHistory(prev => prev.slice(0, -1));

    // Stop any in-flight work
    tickInFlightRef.current = false;
    actionsRef.current.stopRuntime();

    // Restore external stores first (so subsequent ticks match the UI state)
    restoreAgentStateStore(entry.agentStateStore);
    restoreJobStore(entry.jobStore);

    // Restore agent positions (stored outside reducer)
    agentPositions.clear();
    for (const p of entry.positions) {
      if (!p?.id) continue;
      agentPositions.set(p.id, { x: Number(p.x) || 0, y: Number(p.y) || 0 });
    }

    // Restore enabled set
    setEnabledAgentIds(new Set(entry.enabledAgentIds));

    // Restore deterministic ID counters from restored state snapshot (prevents collisions)
    resetDeterministicIds();
    syncDeterministicIdsFromState(entry.canvasState as any);

    // Restore the previous canvas state, but preserve UI state (inspector, selection)
    actions.loadState({
      ...entry.canvasState,
      inspectorExpanded: state.inspectorExpanded,
      selectedAgentId: state.selectedAgentId,
    });
  }, [state.isRunning, state.inspectorExpanded, state.selectedAgentId, isReplaying, stateHistory, actions]);

  // Define agent action handlers BEFORE nodes useMemo (to avoid initialization errors)
  const handleDeleteAgent = useCallback(
    (agentId: string) => {
      if (isReplaying) return;
      if (state.isRunning) {
        setToast({ message: 'Stop runtime before deleting agents', type: 'warning' });
        return;
      }

      const agent = getAgent(agentId);
      if (!agent) return;

      const ok =
        typeof window === 'undefined'
          ? true
          : window.confirm(
              `Delete "${agent.name}"?\n\nThis will also remove any connected transactions.`
            );
      if (!ok) return;

      // Clear persistent ctx.state for this agent
      clearAgentState(agentId);

      // Close code editor if it's open for this agent
      if (codeEditorAgent?.id === agentId) {
        setCodeEditorAgent(null);
      }

      // Close connection modal if it involves this agent
      if (
        pendingConnection &&
        (pendingConnection.sourceId === agentId || pendingConnection.targetId === agentId)
      ) {
        setShowConnectionModal(false);
        setPendingConnection(null);
      }

      // Remove from enabled set (effect will also handle this, but explicit is cleaner)
      setEnabledAgentIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(agentId);
        return newSet;
      });

      actions.removeAgent(agentId);
      setToast({ message: `Deleted agent: ${agent.name}`, type: 'success' });
    },
    [actions, codeEditorAgent?.id, getAgent, isReplaying, pendingConnection, state.isRunning]
  );

  // Toggle agent enabled state (for Enable/Disable toggle on agent cards)
  const handleToggleAgentEnabled = useCallback(
    (agentId: string) => {
      if (isReplaying) return;

      setEnabledAgentIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(agentId)) {
          newSet.delete(agentId);
        } else {
          newSet.add(agentId);
        }
        return newSet;
      });
    },
    [isReplaying]
  );

  // Track agent IDs for auto-enable effect (only react to ID changes, not property changes)
  const agentIdsKey = state.agents.map(a => a.id).sort().join(',');

  // Auto-enable new agents when they're added (only runs when agent IDs change)
  useEffect(() => {
    const currentAgentIds = new Set(state.agents.map(a => a.id));
    setEnabledAgentIds(prev => {
      // Only update if there's actually a change needed
      let needsUpdate = false;

      // Check for new agents
      for (const id of currentAgentIds) {
        if (!prev.has(id)) {
          needsUpdate = true;
          break;
        }
      }

      // Check for removed agents
      if (!needsUpdate) {
        for (const id of prev) {
          if (!currentAgentIds.has(id)) {
            needsUpdate = true;
            break;
          }
        }
      }

      // If no changes needed, return same reference to avoid re-render
      if (!needsUpdate) {
        return prev;
      }

      const newSet = new Set(prev);
      // Add any new agents that aren't in the enabled set yet
      for (const id of currentAgentIds) {
        if (!prev.has(id)) {
          newSet.add(id);
        }
      }
      // Remove agents that no longer exist
      for (const id of prev) {
        if (!currentAgentIds.has(id)) {
          newSet.delete(id);
        }
      }
      return newSet;
    });
  }, [agentIdsKey]); // Only run when agent IDs change, not when properties change

  // Convert Canvas agents to React Flow nodes
  const nodes = useMemo(() => {
    return state.agents.map((agent): Node => {
      const position = getAgentPosition(agent.id) || { x: 0, y: 0 };
      return {
        id: agent.id,
        type: 'agentNode',
        position,
        data: {
          agent,
          onEdit: () => setCodeEditorAgent(agent),
          onDelete: () => handleDeleteAgent(agent.id),
          onToggleEnabled: () => handleToggleAgentEnabled(agent.id),
          enabled: enabledAgentIds.has(agent.id),
          canDelete: !state.isRunning && !isReplaying,
        },
      };
    });
  }, [state.agents, state.positionVersion, getAgentPosition, handleToggleAgentEnabled, handleDeleteAgent, isReplaying, state.isRunning, enabledAgentIds]);

  // Convert Canvas connections to React Flow edges
  const edges = useMemo(() => {
    return state.connections.map((connection): Edge => ({
      id: connection.id,
      source: connection.sourceId,
      target: connection.targetId,
      type: 'transactionEdge',
      data: { connection },
    }));
  }, [state.connections]);

  // Use React Flow's node state management
  const [reactFlowNodes, setReactFlowNodes, onNodesChange] = useNodesState(nodes);
  const [reactFlowEdges, setReactFlowEdges, onEdgesChange] = useEdgesState(edges);

  // Sync when our computed nodes/edges change (use JSON comparison to avoid infinite loops)
  // Include enabled state and agent status in key so changes trigger re-sync
  const nodesKey = JSON.stringify(nodes.map(n => ({
    id: n.id,
    position: n.position,
    enabled: (n.data as any)?.enabled,
    status: (n.data as any)?.agent?.status,
    balance: (n.data as any)?.agent?.balanceMicro
  })));
  const edgesKey = JSON.stringify(edges.map(e => ({
    id: e.id,
    state: (e.data as any)?.connection?.state
  })));

  useEffect(() => {
    setReactFlowNodes(nodes);
  }, [nodesKey]);

  useEffect(() => {
    setReactFlowEdges(edges);
  }, [edgesKey]);

  // Handle node position changes
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Apply changes to React Flow
      onNodesChange(changes);

      // Update Canvas state for position changes
      changes.forEach((change) => {
        if (change.type === 'position' && change.position && !change.dragging) {
          // Only update when drag is complete
          actions.updateAgentPosition(change.id, change.position);
        }
      });
    },
    [onNodesChange, actions]
  );

  // Handle node selection
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      actions.setSelectedAgent(node.id);
    },
    [actions]
  );

  // Handle node double-click (open code editor)
  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const agent = getAgent(node.id);
      if (agent) {
        setCodeEditorAgent(agent);
      }
    },
    [getAgent]
  );

  // Handle pane click (deselect)
  const handlePaneClick = useCallback(() => {
    actions.setSelectedAgent(null);
  }, [actions]);

  // Handle connection creation - show modal
  const onConnect = useCallback(
    (params: FlowConnection) => {
      if (!params.source || !params.target) return;
      if (params.source === params.target) return;

      // Prevent duplicates (same direction)
      const exists = state.connections.some(
        (c) => c.sourceId === params.source && c.targetId === params.target
      );
      if (exists) return;

      // Store pending connection and show modal
      setPendingConnection({
        sourceId: params.source,
        targetId: params.target,
      });
      setShowConnectionModal(true);
    },
    [state.connections]
  );

  // Handle connection creation from modal
  const handleCreateConnection = useCallback(
    (connection: Connection) => {
      actions.addConnection(connection);
    },
    [actions]
  );

  // Close connection modal
  const handleCloseConnectionModal = useCallback(() => {
    setShowConnectionModal(false);
    setPendingConnection(null);
  }, []);

  // Toolbar handlers
  const handleAddAgent = useCallback(
    (agent: Agent, position: { x: number; y: number }) => {
      // Phase D0: stamp deterministic "createdAt" using virtualTime.
      actions.addAgent({ ...agent, createdAt: stateRef.current.virtualTimeMs }, position);
    },
    [actions]
  );

  const handleRun = useCallback(() => {
    if (isReplaying) return;

    const agentIds = Array.from(enabledAgentIdsRef.current);
    if (agentIds.length === 0) {
      setToast({ message: 'No agents enabled', type: 'info' });
      return;
    }

    // Save initial state to history before running
    setStateHistory((prev) => {
      const entry = captureHistoryEntry();
      const next = [...prev, entry];
      return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
    });

    // Visually mark enabled agents as running
    for (const id of agentIds) {
      actionsRef.current.updateAgentStatus(id, 'running');
    }

    actionsRef.current.startRuntime();
  }, [isReplaying, captureHistoryEntry]);

  const handleStop = useCallback(() => {
    bumpRuntimeEpoch('stop');
    actionsRef.current.stopRuntime();
    // Reset enabled agents to idle status
    for (const id of enabledAgentIdsRef.current) {
      const agent = stateRef.current.agents.find(a => a.id === id);
      if (agent && agent.status === 'running') {
        actionsRef.current.updateAgentStatus(id, 'idle');
      }
    }
  }, [bumpRuntimeEpoch]);

  const handleShare = useCallback(async () => {
    try {
      // Serialize current state
      const serialized = serializeState();
      const shareableState = JSON.parse(serialized);

      const url = generateShareUrl(shareableState);
      const sizeBytes =
        typeof Blob !== 'undefined' ? new Blob([url]).size : url.length;

      // Soft/hard URL limits:
      // - Soft: warn + show modal (still usable in many environments)
      // - Hard: block (likely to break on some browsers/proxies)
      const SAFE_LIMIT = 1536; // ~1.5KB
      const HARD_LIMIT = 16384; // 16KB

      if (sizeBytes > HARD_LIMIT) {
        setToast({
          message: 'Canvas too large for URL sharing. Export/import coming soon.',
          type: 'error',
        });
        return;
      }

      if (sizeBytes > SAFE_LIMIT) {
        setShareLink(url);
        setToast({
          message: `Long share link (${sizeBytes} bytes) — may not open in all browsers`,
          type: 'error',
        });
        return;
      }

      const success = await copyTextToClipboard(url, { timeoutMs: 500 });

      if (success) {
        setToast({ message: 'Share link copied to clipboard!', type: 'success' });
      } else {
        setShareLink(url);
        setToast({ message: 'Copy blocked — showing share link', type: 'error' });
      }
    } catch (error) {
      console.error('Share error:', error);
      setToast({ message: 'Failed to generate share link', type: 'error' });
    }
  }, [serializeState]);

  // Handle cancel transaction
  const handleCancelTransaction = useCallback(
    (connectionId: string) => {
      const connection = state.connections.find((c) => c.id === connectionId);
      if (!connection) {
        setToast({ message: 'Transaction not found', type: 'error' });
        return;
      }

      // Validate state allows cancellation
      if (connection.state === 'SETTLED' || connection.state === 'CANCELLED') {
        setToast({ message: 'Cannot cancel terminal transaction', type: 'error' });
        return;
      }

      if (connection.state === 'DELIVERED') {
        setToast({ message: 'Cannot cancel after delivery (use dispute instead)', type: 'error' });
        return;
      }

      // Create runtime context
      const runtimeContext: RuntimeContext = {
        state: stateRef.current,
        dispatch: (action) => {
          const a = actionsRef.current;
          if (action.type === 'UPDATE_CONNECTION_STATE') {
            a.updateConnectionState(action.payload.connectionId, action.payload.state);
          } else if (action.type === 'UPDATE_AGENT_BALANCE') {
            a.updateAgentBalance(action.payload.agentId, action.payload.balanceMicro);
          } else if (action.type === 'UPDATE_CONNECTION_HASH') {
            dispatch(action);
          }
        },
        addEvent: (event: Omit<RuntimeEvent, 'id' | 'timestamp'>) => {
          const a = actionsRef.current;
          const fullEvent: RuntimeEvent = {
            id: generateId('rt'),
            timestamp: stateRef.current.virtualTimeMs,
            ...event,
          };
          a.addRuntimeEvent(fullEvent);
        },
      };

      // Execute cancel
      simulateCancel(runtimeContext, connectionId);
      setToast({ message: 'Transaction cancelled', type: 'success' });
    },
    [state.connections]
  );

  // Handle dispute transaction
  const handleDisputeTransaction = useCallback(
    (connectionId: string) => {
      const connection = state.connections.find((c) => c.id === connectionId);
      if (!connection) {
        setToast({ message: 'Transaction not found', type: 'error' });
        return;
      }

      // Validate state allows dispute
      if (connection.state !== 'DELIVERED') {
        setToast({ message: 'Can only dispute from DELIVERED state', type: 'error' });
        return;
      }

      // Create runtime context
      const runtimeContext: RuntimeContext = {
        state: stateRef.current,
        dispatch: (action) => {
          const a = actionsRef.current;
          if (action.type === 'UPDATE_CONNECTION_STATE') {
            a.updateConnectionState(action.payload.connectionId, action.payload.state);
          } else if (action.type === 'UPDATE_AGENT_BALANCE') {
            a.updateAgentBalance(action.payload.agentId, action.payload.balanceMicro);
          } else if (action.type === 'UPDATE_CONNECTION_HASH') {
            dispatch(action);
          }
        },
        addEvent: (event: Omit<RuntimeEvent, 'id' | 'timestamp'>) => {
          const a = actionsRef.current;
          const fullEvent: RuntimeEvent = {
            id: generateId('rt'),
            timestamp: stateRef.current.virtualTimeMs,
            ...event,
          };
          a.addRuntimeEvent(fullEvent);
        },
      };

      // Execute dispute
      simulateDispute(runtimeContext, connectionId);
      setToast({ message: 'Dispute raised', type: 'warning' });
    },
    [state.connections]
  );

  // Handle manual state advancement
  const handleAdvanceState = useCallback(
    (connectionId: string) => {
      const connection = state.connections.find((c) => c.id === connectionId);
      if (!connection) {
        setToast({ message: 'Transaction not found', type: 'error' });
        return;
      }

      // Get next state
      const nextState = getNextState(connection.state);
      if (!nextState) {
        setToast({ message: 'Transaction is in terminal state', type: 'error' });
        return;
      }

      // Create runtime context
      const runtimeContext: RuntimeContext = {
        state: stateRef.current,
        dispatch: (action) => {
          const a = actionsRef.current;
          if (action.type === 'UPDATE_CONNECTION_STATE') {
            a.updateConnectionState(action.payload.connectionId, action.payload.state);
          } else if (action.type === 'UPDATE_AGENT_BALANCE') {
            a.updateAgentBalance(action.payload.agentId, action.payload.balanceMicro);
          } else if (action.type === 'UPDATE_CONNECTION_HASH') {
            dispatch(action);
          }
        },
        addEvent: (event: Omit<RuntimeEvent, 'id' | 'timestamp'>) => {
          const a = actionsRef.current;
          const fullEvent: RuntimeEvent = {
            id: generateId('rt'),
            timestamp: stateRef.current.virtualTimeMs,
            ...event,
          };
          a.addRuntimeEvent(fullEvent);
        },
      };

      // Execute transition (async now)
      transitionConnectionState(runtimeContext, connectionId, nextState, 'Manual advancement');
      setToast({ message: `Transitioned to ${nextState}`, type: 'success' });
    },
    [state.connections]
  );

  // Handle export
  const handleExport = useCallback(() => {
    try {
      downloadAsJSON(state);
      setToast({ message: 'Canvas exported successfully', type: 'success' });
    } catch (error) {
      console.error('Export error:', error);
      setToast({ message: 'Failed to export canvas', type: 'error' });
    }
  }, [state]);

  // Handle import (clears persistent agent state before loading new state)
  const handleImport = useCallback(
    (file: File) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const json = e.target?.result as string;
          if (!json) {
            setToast({ message: 'Failed to read file', type: 'error' });
            return;
          }

          bumpRuntimeEpoch('import');
          // Clear persistent agent state before importing
          clearAllAgentState();
          clearAllJobs();
          resetDeterministicIds();
          setEnabledAgentIds(new Set());
          setStateHistory([]);

          const result = importCanvasFromJSON(json, dispatch);

          if (result.success) {
            setToast({ message: 'Canvas imported successfully', type: 'success' });
          } else {
            setToast({ message: result.error || 'Import failed', type: 'error' });
          }
        } catch (error) {
          console.error('Import error:', error);
          setToast({ message: 'Failed to import canvas', type: 'error' });
        }
      };

      reader.onerror = () => {
        setToast({ message: 'Failed to read file', type: 'error' });
      };

      reader.readAsText(file);
    },
    [dispatch, bumpRuntimeEpoch]
  );

  // Handle reset (reloads example state - keeps agents but resets runtime)
  const handleReset = useCallback(() => {
    bumpRuntimeEpoch('reset');
    // Clear persistent runtime state
    clearAllAgentState();
    clearAllJobs();
    resetDeterministicIds();
    setStateHistory([]); // Clear undo history

    // Reload example state (with agents)
    const exampleState = getExampleCanvasState();
    syncDeterministicIdsFromState(exampleState as any);
    actions.loadState(exampleState);

    // Reset agent positions
    actions.updateAgentPosition('agent-1', { x: 100, y: 150 });
    actions.updateAgentPosition('agent-2', { x: 500, y: 250 });

    setToast({ message: 'Canvas reset to initial state', type: 'success' });
  }, [actions, bumpRuntimeEpoch]);

  // Handle fork scenario from gallery
  const handleForkScenario = useCallback(
    (scenario: Scenario) => {
      bumpRuntimeEpoch('fork-scenario');
      // Clear existing state
      clearAllAgentState();
      clearAllJobs();
      resetDeterministicIds();
      agentPositions.clear(); // Clear previous positions
      setEnabledAgentIds(new Set());
      setStateHistory([]);

      // Load scenario canvas state
      const canvasState = {
        ...scenario.canvasState,
        selectedAgentId: null,
        inspectorExpanded: true,
        isRunning: false,
        tick: 0,
        runtimeMode: 'auto' as const,
        tickIntervalMs: 1000,
        executionMode: true,
        virtualTimeMs: 0,
        idCounter: 1,
        rngSeed: 42,
      };

      // Prime deterministic IDs from scenario snapshot (prevents collisions after load).
      syncDeterministicIdsFromState(canvasState as any);
      actions.loadState(canvasState);

      // Set agent positions
      const spread = spreadScenarioPositions(scenario.positions);
      Object.entries(spread).forEach(([agentId, position]) => {
        actions.updateAgentPosition(agentId, position);
      });

      // Close gallery and show success message
      setShowScenarioGallery(false);
      setToast({
        message: `Loaded scenario: ${scenario.name}`,
        type: 'success',
      });
    },
    [actions, bumpRuntimeEpoch]
  );

  // Handle open scenario gallery
  const handleOpenGallery = useCallback(() => {
    setShowScenarioGallery(true);
  }, []);

  // Handle welcome screen actions
  const handleWelcomeBrowseScenarios = useCallback(() => {
    // Mark welcome as seen
    if (typeof window !== 'undefined') {
      localStorage.setItem('cv_seen_welcome', '1');
    }
    setShowWelcomeScreen(false);
    setShowScenarioGallery(true);
  }, []);

  const handleWelcomeStartEmpty = useCallback(() => {
    // Mark welcome as seen
    if (typeof window !== 'undefined') {
      localStorage.setItem('cv_seen_welcome', '1');
    }
    setShowWelcomeScreen(false);
    // Leave canvas empty (don't load example state)
  }, []);

  // ===== Phase D1: Recording & Replay Handlers =====

  const handleStartRecording = useCallback(() => {
    const logger = getEventLogger();
    const positions = Array.from(agentPositions.entries()).map(([id, pos]) => ({
      id,
      x: pos.x,
      y: pos.y,
    }));
    logger.startRecording(state, positions);
    setIsRecording(true);
    setToast({ message: 'Recording started', type: 'success' });
  }, [state]);

  const handleStopRecording = useCallback(() => {
    const logger = getEventLogger();
    const log = logger.stopRecording(state);
    setIsRecording(false);

    // Auto-export
    const json = exportEventLog(log);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `canvas-recording-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    setToast({
      message: `Recording saved (${log.events.length} events)`,
      type: 'success',
    });
  }, [state]);

  const handleExportRecording = useCallback(() => {
    const logger = getEventLogger();
    if (!logger.isRecording()) {
      setToast({ message: 'No active recording', type: 'error' });
      return;
    }

    const tempLog = logger.stopRecording(state);
    const json = exportEventLog(tempLog);

    // Download
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `canvas-recording-partial-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    // Resume recording
    const positions = Array.from(agentPositions.entries()).map(([id, pos]) => ({
      id,
      x: pos.x,
      y: pos.y,
    }));
    logger.startRecording(state, positions);

    setToast({ message: 'Partial recording exported', type: 'success' });
  }, [state]);

  const handleImportRecording = useCallback((file: File) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        if (!json) {
          setToast({ message: 'Failed to read file', type: 'error' });
          return;
        }

        const log = importEventLog(json);

        // Entering replay should be a clean, read-only view.
        // Clear live runtime side-stores so Inspector doesn't show stale ctx.state/jobs.
        bumpRuntimeEpoch('import-recording');
        clearAllAgentState();
        clearAllJobs();
        setEnabledAgentIds(new Set());
        setStateHistory([]);

        // Initialize replay engine
        const engine = new ReplayEngine();
        engine.load(log);
        replayEngineRef.current = engine;

        // Phase D0: freeze ID generation during replay by resetting counters to match snapshot.
        resetDeterministicIds();
        syncDeterministicIdsFromState(engine.getState() as any);

        setIsReplaying(true);
        setReplayProgress(engine.getProgress());

        // Render initial snapshot immediately (no need to wait for first interval tick).
        actions.loadState(engine.getState());
        setToast({
          message: `Loaded ${log.events.length} events for replay`,
          type: 'success',
        });

        // Start auto-replay
        handleStartReplay();
      } catch (error) {
        console.error('Import recording error:', error);
        setToast({ message: `Failed to import recording: ${error}`, type: 'error' });
      }
    };

    reader.onerror = () => {
      setToast({ message: 'Failed to read file', type: 'error' });
    };

    reader.readAsText(file);
  }, [bumpRuntimeEpoch]);

  const handleStartReplay = useCallback(() => {
    const engine = replayEngineRef.current;
    if (!engine) {
      setToast({ message: 'No replay loaded', type: 'error' });
      return;
    }

    // Clear existing interval
    if (replayIntervalRef.current) {
      clearInterval(replayIntervalRef.current);
    }

    // Start auto-play
    replayIntervalRef.current = setInterval(() => {
      const hasMore = engine.step();
      const progress = engine.getProgress();
      setReplayProgress(progress);

      // Update canvas with replayed state
      const replayedState = engine.getState();
      actions.loadState(replayedState);

      if (!hasMore) {
        // Replay complete
        if (replayIntervalRef.current) {
          clearInterval(replayIntervalRef.current);
          replayIntervalRef.current = null;
        }
        setToast({ message: 'Replay complete', type: 'success' });
      }
    }, 50); // 20fps update rate
  }, [actions]);

  const handlePauseReplay = useCallback(() => {
    if (replayIntervalRef.current) {
      clearInterval(replayIntervalRef.current);
      replayIntervalRef.current = null;
    }
    setIsReplaying(false);
    setToast({ message: 'Replay stopped', type: 'info' });
  }, []);

  const handleStepReplay = useCallback(() => {
    const engine = replayEngineRef.current;
    if (!engine) return;

    // Pause auto-play
    if (replayIntervalRef.current) {
      clearInterval(replayIntervalRef.current);
      replayIntervalRef.current = null;
    }

    // Step one event
    const hasMore = engine.step();
    const progress = engine.getProgress();
    setReplayProgress(progress);

    // Update canvas with replayed state
    const replayedState = engine.getState();
    actions.loadState(replayedState);

    if (!hasMore) {
      setToast({ message: 'Replay complete', type: 'success' });
    }
  }, [actions]);

  // Cleanup replay interval on unmount
  useEffect(() => {
    return () => {
      if (replayIntervalRef.current) {
        clearInterval(replayIntervalRef.current);
      }
    };
  }, []);

  // Get selected agent
  const selectedAgent = state.selectedAgentId ? getAgent(state.selectedAgentId) : null;

  return (
    <div className="cv-container">
      <Toolbar
        isRunning={state.isRunning}
        tickIntervalMs={state.tickIntervalMs}
        agentCount={state.agents.length}
        currentTick={state.tick}
        canStepBack={stateHistory.length > 0}
        onAddAgent={handleAddAgent}
        onRun={handleRun}
        onStop={handleStop}
        onStepForward={handleStepForward}
        onStepBack={handleStepBack}
        onReset={handleReset}
        onShare={handleShare}
        onSetTickInterval={actions.setTickInterval}
        onExport={handleExport}
        onImport={handleImport}
        onOpenGallery={handleOpenGallery}
      />

      <div className="cv-workspace" ref={workspaceRef}>
        {workspaceReady ? (
          <ReactFlow
            nodes={reactFlowNodes}
            edges={reactFlowEdges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={isReplaying ? undefined : onConnect}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            onPaneClick={handlePaneClick}
            nodesDraggable={!isReplaying}
            nodesConnectable={!isReplaying}
            elementsSelectable={!isReplaying}
            // Fix: React Flow uses SPACE for pan activation by default which can break Monaco typing.
            // Move pan activation to Shift so Space works in the code editor.
            panActivationKeyCode="Shift"
            nodeTypes={nodeTypes as any}
            edgeTypes={edgeTypes as any}
            fitView
            fitViewOptions={{
              // Slightly zoomed out by default (prevents 2-node layouts from feeling too "zoomed in")
              padding: 0.35,
              maxZoom: 0.9,
            }}
            className="cv-react-flow"
            defaultEdgeOptions={{
              type: 'transactionEdge',
            }}
            // Hide ReactFlow attribution watermark
            proOptions={{ hideAttribution: true }}
          >
            <Controls className="cv-controls" />
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#2A2A2A"
            />
          </ReactFlow>
        ) : (
          <div className="cv-workspace__loading">
            Loading canvas…
          </div>
        )}
      </div>

      <InspectorPanel
        connections={state.connections}
        events={state.events}
        selectedAgent={selectedAgent || null}
        expanded={state.inspectorExpanded}
        onToggle={actions.toggleInspector}
        onCancelTransaction={handleCancelTransaction}
        onDisputeTransaction={handleDisputeTransaction}
        onAdvanceState={handleAdvanceState}
      />

      <ConnectionModal
        isOpen={showConnectionModal}
        sourceAgent={pendingConnection ? getAgent(pendingConnection.sourceId) || null : null}
        targetAgent={pendingConnection ? getAgent(pendingConnection.targetId) || null : null}
        virtualTimeMs={state.virtualTimeMs}
        onClose={handleCloseConnectionModal}
        onCreateConnection={handleCreateConnection}
      />

      <CodeEditorPanel
        agent={codeEditorAgent}
        onCodeChange={actions.updateAgentCode}
        onClose={() => setCodeEditorAgent(null)}
      />

      {shareLink && (
        <div className="cv-modal-overlay" onClick={() => setShareLink(null)}>
          <div className="cv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cv-modal__header">
              <h2 className="cv-modal__title">Share Link</h2>
              <button className="cv-modal__close" onClick={() => setShareLink(null)}>
                ×
              </button>
            </div>
            <div className="cv-modal__body">
              <label className="cv-modal__label">
                URL
                <textarea
                  className="cv-modal__input cv-share-link__textarea"
                  value={shareLink}
                  readOnly
                  onFocus={(e) => e.currentTarget.select()}
                />
              </label>
              <div className="cv-modal__hint">Tip: click inside and press ⌘C</div>
              <div className="cv-modal__actions">
                <button
                  type="button"
                  className="cv-btn cv-btn--secondary"
                  onClick={() => setShareLink(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="cv-btn cv-btn--secondary"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.location.href = shareLink;
                    }
                  }}
                >
                  Open
                </button>
                <button
                  type="button"
                  className="cv-btn cv-btn--primary"
                  onClick={async () => {
                    const ok = await copyTextToClipboard(shareLink, { timeoutMs: 500 });
                    setToast({
                      message: ok ? 'Share link copied to clipboard!' : 'Failed to copy link',
                      type: ok ? 'success' : 'error',
                    });
                    if (ok) setShareLink(null);
                  }}
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <ScenarioGallery
        isOpen={showScenarioGallery}
        onForkScenario={handleForkScenario}
        onDismiss={() => setShowScenarioGallery(false)}
      />

      {showWelcomeScreen && (
        <CanvasWelcome
          onBrowseScenarios={handleWelcomeBrowseScenarios}
          onStartEmpty={handleWelcomeStartEmpty}
        />
      )}
    </div>
  );
}
