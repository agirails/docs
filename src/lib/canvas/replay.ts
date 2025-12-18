/* ============================================
   AGIRAILS Canvas - Replay Engine
   Phase D1: Event-sourced Log + Replay Engine
   ============================================ */

import { ExtendedCanvasState, getDefaultCanvasState, agentPositions } from './useCanvasState';
import { EventLog, CanvasEvent } from './eventLog';
import { Agent, Connection, RuntimeEvent, AgentStatus, TransactionState } from './types';

/**
 * Replay State
 * Current playback state
 */
export type ReplayState = 'idle' | 'playing' | 'paused' | 'complete';

/**
 * Replay Engine
 * Deterministic event replay for debugging and analysis
 */
export class ReplayEngine {
  private log: EventLog | null = null;
  private currentEventIndex: number = 0;
  private playbackState: ReplayState = 'idle';
  private canvasState: ExtendedCanvasState;
  private playbackSpeed: number = 1.0; // 1.0 = real-time, 2.0 = 2x speed
  private autoPlayInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.canvasState = getDefaultCanvasState();
  }

  /**
   * Load event log for replay
   * @param log - Event log to replay
   */
  load(log: EventLog): void {
    this.log = log;
    this.currentEventIndex = 0;
    this.playbackState = 'paused';

    // Initialize canvas state from minimal initial state
    this.canvasState = {
      ...getDefaultCanvasState(),
      virtualTimeMs: log.initialState.virtualTimeMs,
      idCounter: log.initialState.idCounter,
      rngSeed: log.initialState.rngSeed,
      tickIntervalMs: log.initialState.tickIntervalMs,
    };

    // Clear agent positions
    agentPositions.clear();

    // Apply SESSION_INIT immediately (bootstraps full snapshot + positions).
    // This makes engine.getState() reflect the true start state right after load().
    if (log.events.length > 0 && log.events[0].type === 'SESSION_INIT') {
      this.applyEvent(log.events[0]);
      this.currentEventIndex = 1;
    }

    console.log('[ReplayEngine] Loaded event log', {
      events: log.events.length,
      duration: `${log.metadata.duration}ms`,
      ticks: log.metadata.totalTicks,
    });
  }

  /**
   * Start auto-playing events
   * @param speedMultiplier - Playback speed (1.0 = real-time, 2.0 = 2x)
   */
  play(speedMultiplier: number = 1.0): void {
    if (!this.log) {
      throw new Error('No event log loaded');
    }

    if (this.playbackState === 'complete') {
      console.log('[ReplayEngine] Replay complete, resetting to beginning');
      this.reset();
    }

    this.playbackState = 'playing';
    this.playbackSpeed = speedMultiplier;

    // Auto-play events based on timestamp deltas
    this.startAutoPlay();

    console.log('[ReplayEngine] Playback started', { speed: `${speedMultiplier}x` });
  }

  /**
   * Pause auto-playback
   */
  pause(): void {
    if (this.playbackState !== 'playing') return;

    this.playbackState = 'paused';
    this.stopAutoPlay();

    console.log('[ReplayEngine] Playback paused', {
      progress: `${this.currentEventIndex}/${this.log?.events.length || 0}`,
    });
  }

  /**
   * Replay one event (step-by-step mode)
   */
  step(): boolean {
    if (!this.log) {
      throw new Error('No event log loaded');
    }

    if (this.currentEventIndex >= this.log.events.length) {
      this.playbackState = 'complete';
      console.log('[ReplayEngine] Replay complete');
      return false;
    }

    const event = this.log.events[this.currentEventIndex];
    this.applyEvent(event);
    this.currentEventIndex++;

    return this.currentEventIndex < this.log.events.length;
  }

  /**
   * Jump to specific tick
   * @param tick - Target tick number
   */
  jumpToTick(tick: number): void {
    if (!this.log) {
      throw new Error('No event log loaded');
    }

    // Reset and replay up to target tick
    this.reset();

    while (this.currentEventIndex < this.log.events.length) {
      const event = this.log.events[this.currentEventIndex];
      if (event.tick > tick) break;

      this.applyEvent(event);
      this.currentEventIndex++;
    }

    console.log('[ReplayEngine] Jumped to tick', {
      tick,
      eventIndex: this.currentEventIndex,
    });
  }

  /**
   * Jump to specific event index
   * @param index - Target event index
   */
  jumpToEvent(index: number): void {
    if (!this.log) {
      throw new Error('No event log loaded');
    }

    if (index < 0 || index >= this.log.events.length) {
      throw new Error(`Invalid event index: ${index}`);
    }

    // Reset and replay up to target event
    this.reset();

    while (this.currentEventIndex <= index) {
      const event = this.log.events[this.currentEventIndex];
      this.applyEvent(event);
      this.currentEventIndex++;
    }

    console.log('[ReplayEngine] Jumped to event', {
      index,
      tick: this.canvasState.tick,
    });
  }

  /**
   * Reset to beginning
   */
  reset(): void {
    if (!this.log) return;

    this.currentEventIndex = 0;
    this.playbackState = 'paused';
    this.stopAutoPlay();

    // Reset canvas state to initial
    this.canvasState = {
      ...getDefaultCanvasState(),
      virtualTimeMs: this.log.initialState.virtualTimeMs,
      idCounter: this.log.initialState.idCounter,
      rngSeed: this.log.initialState.rngSeed,
      tickIntervalMs: this.log.initialState.tickIntervalMs,
    };

    agentPositions.clear();

    console.log('[ReplayEngine] Reset to beginning');
  }

  /**
   * Get current playback state
   */
  getPlaybackState(): ReplayState {
    return this.playbackState;
  }

  /**
   * Get current canvas state
   */
  getState(): ExtendedCanvasState {
    return this.canvasState;
  }

  /**
   * Get current tick
   */
  getCurrentTick(): number {
    return this.canvasState.tick;
  }

  /**
   * Get total ticks in recording
   */
  getTotalTicks(): number {
    return this.log?.metadata.totalTicks || 0;
  }

  /**
   * Get current event index
   */
  getCurrentEventIndex(): number {
    return this.currentEventIndex;
  }

  /**
   * Get total events
   */
  getTotalEvents(): number {
    return this.log?.events.length || 0;
  }

  /**
   * Get replay progress (0-1)
   */
  getProgress(): number {
    if (!this.log || this.log.events.length === 0) return 0;
    return this.currentEventIndex / this.log.events.length;
  }

  /**
   * Apply a single event to canvas state
   * @param event - Event to apply
   */
  private applyEvent(event: CanvasEvent): void {
    const { type, payload } = event;

    switch (type) {
      case 'SESSION_INIT':
        // Bootstrap snapshot so replay works even if recording started mid-session.
        if (payload?.snapshot) {
          const snap = payload.snapshot as any;
          this.canvasState = {
            ...getDefaultCanvasState(),
            ...snap,
            // Deep-ish clone critical collections so replay never mutates the imported log.
            agents: Array.isArray(snap.agents) ? snap.agents.map((a: any) => ({ ...a })) : [],
            connections: Array.isArray(snap.connections) ? snap.connections.map((c: any) => ({ ...c })) : [],
            events: Array.isArray(snap.events) ? snap.events.map((e: any) => ({ ...e })) : [],
          };
        }
        if (Array.isArray(payload?.positions)) {
          agentPositions.clear();
          for (const pos of payload.positions) {
            if (!pos?.id) continue;
            agentPositions.set(pos.id, { x: Number(pos.x) || 0, y: Number(pos.y) || 0 });
          }
        }
        break;

      case 'AGENT_ADDED': {
        const { agent, position } = payload;
        this.canvasState.agents.push(agent);
        agentPositions.set(agent.id, position);
        break;
      }

      case 'AGENT_REMOVED': {
        const { agentId } = payload;
        this.canvasState.agents = this.canvasState.agents.filter((a) => a.id !== agentId);
        this.canvasState.connections = this.canvasState.connections.filter(
          (c) => c.sourceId !== agentId && c.targetId !== agentId
        );
        agentPositions.delete(agentId);
        if (this.canvasState.selectedAgentId === agentId) {
          this.canvasState.selectedAgentId = null;
        }
        break;
      }

      case 'AGENT_CODE_UPDATED': {
        const { agentId, code } = payload;
        this.canvasState.agents = this.canvasState.agents.map((agent) =>
          agent.id === agentId ? { ...agent, code } : agent
        );
        break;
      }

      case 'AGENT_BALANCE_UPDATED': {
        const { agentId, balanceMicro } = payload;
        this.canvasState.agents = this.canvasState.agents.map((agent) =>
          agent.id === agentId ? { ...agent, balanceMicro } : agent
        );
        break;
      }

      case 'AGENT_STATUS_UPDATED': {
        const { agentId, status } = payload;
        this.canvasState.agents = this.canvasState.agents.map((agent) =>
          agent.id === agentId ? { ...agent, status } : agent
        );
        break;
      }

      case 'AGENT_POSITION_UPDATED': {
        const { agentId, position } = payload;
        agentPositions.set(agentId, position);
        break;
      }

      case 'CONNECTION_CREATED': {
        const { connection } = payload;
        this.canvasState.connections.push(connection);
        break;
      }

      case 'CONNECTION_REMOVED': {
        const { connectionId } = payload;
        this.canvasState.connections = this.canvasState.connections.filter(
          (c) => c.id !== connectionId
        );
        break;
      }

      case 'CONNECTION_STATE_CHANGED': {
        const { connectionId, state } = payload;
        this.canvasState.connections = this.canvasState.connections.map((conn) =>
          conn.id === connectionId
            ? { ...conn, state, updatedAt: this.canvasState.virtualTimeMs }
            : conn
        );
        break;
      }

      case 'CONNECTION_AMOUNT_UPDATED': {
        const { connectionId, amountMicro } = payload;
        this.canvasState.connections = this.canvasState.connections.map((conn) =>
          conn.id === connectionId
            ? { ...conn, amountMicro, updatedAt: this.canvasState.virtualTimeMs }
            : conn
        );
        break;
      }

      case 'CONNECTION_HASH_UPDATED': {
        const { connectionId, deliverableHash } = payload;
        this.canvasState.connections = this.canvasState.connections.map((conn) =>
          conn.id === connectionId
            ? { ...conn, deliverableHash, updatedAt: this.canvasState.virtualTimeMs }
            : conn
        );
        break;
      }

      case 'RUNTIME_STARTED':
        this.canvasState.isRunning = true;
        this.canvasState.agents = this.canvasState.agents.map((agent) => ({
          ...agent,
          status: 'running' as AgentStatus,
        }));
        break;

      case 'RUNTIME_STOPPED':
        this.canvasState.isRunning = false;
        this.canvasState.agents = this.canvasState.agents.map((agent) => ({
          ...agent,
          status: agent.status === 'error' ? 'error' : ('idle' as AgentStatus),
        }));
        break;

      case 'RUNTIME_TICK':
        this.canvasState.tick += 1;
        this.canvasState.virtualTimeMs += this.canvasState.tickIntervalMs;
        break;

      case 'RUNTIME_EVENT_ADDED': {
        const { event: runtimeEvent } = payload;
        this.canvasState.events.push(runtimeEvent);
        // Keep max 1000 events
        if (this.canvasState.events.length > 1000) {
          this.canvasState.events = this.canvasState.events.slice(-1000);
        }
        break;
      }

      case 'RUNTIME_RESET':
        this.canvasState.events = [];
        this.canvasState.tick = 0;
        this.canvasState.isRunning = false;
        this.canvasState.agents = this.canvasState.agents.map((agent) => ({
          ...agent,
          status: 'idle' as AgentStatus,
        }));
        this.canvasState.virtualTimeMs = 0;
        this.canvasState.idCounter = 1;
        break;

      case 'ID_COUNTER_SET':
        this.canvasState.idCounter = Number(payload.idCounter) || this.canvasState.idCounter;
        break;

      case 'AGENT_SELECTED':
        this.canvasState.selectedAgentId = payload.agentId;
        break;

      case 'INSPECTOR_TOGGLED':
        this.canvasState.inspectorExpanded = !this.canvasState.inspectorExpanded;
        break;

      case 'EXECUTION_MODE_TOGGLED':
        this.canvasState.executionMode = !this.canvasState.executionMode;
        break;

      case 'RUNTIME_MODE_CHANGED':
        this.canvasState.runtimeMode = payload.mode;
        break;

      case 'TICK_INTERVAL_CHANGED':
        this.canvasState.tickIntervalMs = payload.intervalMs;
        break;

      case 'STATE_LOADED':
        // Full state replacement (used for imports)
        this.canvasState = { ...this.canvasState, ...payload.state };
        break;

      case 'STATE_RESET':
        this.canvasState = getDefaultCanvasState();
        agentPositions.clear();
        break;

      default:
        console.warn('[ReplayEngine] Unknown event type:', type);
    }
  }

  /**
   * Start auto-play interval
   */
  private startAutoPlay(): void {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
    }

    // Calculate interval based on playback speed
    // We want smooth playback, so use small interval and check timestamps
    const INTERVAL_MS = 50; // 20fps update rate

    this.autoPlayInterval = setInterval(() => {
      if (!this.log || this.playbackState !== 'playing') {
        this.stopAutoPlay();
        return;
      }

      // Step through events until we catch up to playback time
      const hasMore = this.step();

      if (!hasMore) {
        this.playbackState = 'complete';
        this.stopAutoPlay();
        console.log('[ReplayEngine] Playback complete');
      }
    }, INTERVAL_MS);
  }

  /**
   * Stop auto-play interval
   */
  private stopAutoPlay(): void {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
  }
}
