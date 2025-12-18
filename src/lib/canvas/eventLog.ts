/* ============================================
   AGIRAILS Canvas - Event Sourcing Layer
   Phase D1: Event-sourced Log + Replay Engine
   ============================================ */

import type { ExtendedCanvasState } from './useCanvasState';

/**
 * Canvas Event Types
 * Maps to reducer actions for complete state reconstruction
 */
export type CanvasEventType =
  // Agent lifecycle
  | 'AGENT_ADDED'
  | 'AGENT_REMOVED'
  | 'AGENT_CODE_UPDATED'
  | 'AGENT_BALANCE_UPDATED'
  | 'AGENT_STATUS_UPDATED'
  | 'AGENT_POSITION_UPDATED'

  // Connection lifecycle
  | 'CONNECTION_CREATED'
  | 'CONNECTION_REMOVED'
  | 'CONNECTION_STATE_CHANGED'
  | 'CONNECTION_AMOUNT_UPDATED'
  | 'CONNECTION_HASH_UPDATED'

  // Runtime events
  | 'RUNTIME_STARTED'
  | 'RUNTIME_STOPPED'
  | 'RUNTIME_TICK'
  | 'RUNTIME_EVENT_ADDED'
  | 'RUNTIME_RESET'
  | 'ID_COUNTER_SET'

  // UI state (optional, for full replay fidelity)
  | 'AGENT_SELECTED'
  | 'INSPECTOR_TOGGLED'
  | 'EXECUTION_MODE_TOGGLED'
  | 'RUNTIME_MODE_CHANGED'
  | 'TICK_INTERVAL_CHANGED'

  // Session markers
  | 'SESSION_INIT'
  | 'STATE_LOADED'
  | 'STATE_RESET';

/**
 * Canvas Event
 * Immutable record of a single state mutation
 */
export interface CanvasEvent {
  id: string;              // Deterministic event ID (e.g., "event-1", "event-2")
  type: CanvasEventType;
  timestamp: number;       // virtualTimeMs at event occurrence
  tick: number;            // Runtime tick when event occurred
  payload: Record<string, any>;  // Event-specific data (minimal delta)
}

/**
 * Event Log
 * Complete session recording for deterministic replay
 */
export interface EventLog {
  version: number;         // Schema version (for future migrations)
  seed: number;            // rngSeed for reproducibility
  initialState: MinimalInitialState;  // Snapshot at recording start
  events: CanvasEvent[];   // Ordered list of all events
  metadata: EventLogMetadata;
}

/**
 * Minimal Initial State
 * Only what's needed to bootstrap replay (most state is rebuilt from events)
 */
export interface MinimalInitialState {
  virtualTimeMs: number;
  idCounter: number;
  rngSeed: number;
  tickIntervalMs: number;
}

/**
 * Event Log Metadata
 * Recording session information
 */
export interface EventLogMetadata {
  recordedAt: number;      // Real timestamp when recording started
  duration: number;        // Total virtual time duration (ms)
  totalTicks: number;      // Total runtime ticks
  totalEvents: number;     // Total events logged
  canvasVersion?: string;  // Canvas version (for compatibility checks)
}

/**
 * Event Logger
 * Singleton service for recording Canvas events
 */
export class EventLogger {
  private events: CanvasEvent[] = [];
  private recording: boolean = false;
  private initialState: MinimalInitialState | null = null;
  private recordingStartTime: number = 0;

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.recording;
  }

  /**
   * Start recording events
   * @param state - Current canvas state to capture initial snapshot
   */
  startRecording(
    state: ExtendedCanvasState,
    positions?: Array<{ id: string; x: number; y: number }>
  ): void {
    if (this.recording) {
      console.warn('EventLogger: Already recording, stopping previous session');
      this.stopRecording();
    }

    this.recording = true;
    this.events = [];
    this.recordingStartTime = Date.now();

    // Capture minimal initial state
    this.initialState = {
      virtualTimeMs: state.virtualTimeMs,
      idCounter: state.idCounter,
      rngSeed: state.rngSeed,
      tickIntervalMs: state.tickIntervalMs,
    };

    // Log session init marker WITH a full snapshot so replay works even if
    // recording starts from an already-loaded scenario/canvas.
    const snapshot = {
      agents: state.agents.map((a) => ({ ...a })),
      connections: state.connections.map((c) => ({ ...c })),
      events: [], // keep logs small; replay focuses on state
      isRunning: false, // recording starts while stopped
      selectedAgentId: state.selectedAgentId,
      inspectorExpanded: state.inspectorExpanded,
      tick: state.tick,
      executionMode: state.executionMode,
      runtimeMode: state.runtimeMode,
      tickIntervalMs: state.tickIntervalMs,
      virtualTimeMs: state.virtualTimeMs,
      idCounter: state.idCounter,
      rngSeed: state.rngSeed,
    };
    this.logEvent(
      'SESSION_INIT',
      {
        snapshot,
        positions: Array.isArray(positions) ? positions : [],
      },
      state
    );

    console.log('[EventLogger] Recording started', {
      virtualTimeMs: state.virtualTimeMs,
      tick: state.tick,
      idCounter: state.idCounter,
    });
  }

  /**
   * Stop recording and return complete event log
   * @returns EventLog containing all recorded events
   */
  stopRecording(finalState?: ExtendedCanvasState): EventLog {
    if (!this.recording) {
      throw new Error('EventLogger: Not recording');
    }

    this.recording = false;

    if (!this.initialState) {
      throw new Error('EventLogger: Initial state not captured');
    }

    const duration = finalState ? finalState.virtualTimeMs - this.initialState.virtualTimeMs : 0;
    const totalTicks = finalState ? finalState.tick : 0;

    const log: EventLog = {
      version: 1,
      seed: this.initialState.rngSeed,
      initialState: this.initialState,
      events: [...this.events],
      metadata: {
        recordedAt: this.recordingStartTime,
        duration,
        totalTicks,
        totalEvents: this.events.length,
        canvasVersion: '1.0.0', // TODO: Get from package.json
      },
    };

    console.log('[EventLogger] Recording stopped', {
      events: this.events.length,
      duration: `${duration}ms`,
      ticks: totalTicks,
    });

    return log;
  }

  /**
   * Log a canvas event
   * @param type - Event type
   * @param payload - Event-specific data (minimal delta)
   * @param state - Current state (for timestamp/tick extraction)
   */
  logEvent(type: CanvasEventType, payload: any, state: ExtendedCanvasState): void {
    if (!this.recording) return;

    const event: CanvasEvent = {
      id: `event-${this.events.length + 1}`, // Deterministic ID
      type,
      timestamp: state.virtualTimeMs,
      tick: state.tick,
      payload,
    };

    this.events.push(event);

    // Log important events
    if (type === 'RUNTIME_TICK' || type === 'AGENT_POSITION_UPDATED') {
      // Don't spam console with frequent events
    } else {
      console.log(`[EventLogger] ${type}`, payload);
    }
  }

  /**
   * Clear all events (for reset)
   */
  clear(): void {
    this.events = [];
    this.recording = false;
    this.initialState = null;
    this.recordingStartTime = 0;
  }

  /**
   * Get all events (read-only)
   */
  getEvents(): readonly CanvasEvent[] {
    return this.events;
  }

  /**
   * Get event count
   */
  getEventCount(): number {
    return this.events.length;
  }
}

// Singleton instance
let globalEventLogger: EventLogger | null = null;

/**
 * Get global event logger instance (singleton)
 */
export function getEventLogger(): EventLogger {
  if (!globalEventLogger) {
    globalEventLogger = new EventLogger();
  }
  return globalEventLogger;
}

/**
 * Export event log to JSON string
 */
export function exportEventLog(log: EventLog): string {
  return JSON.stringify(log, null, 2);
}

/**
 * Import event log from JSON string
 */
export function importEventLog(json: string): EventLog {
  try {
    const log = JSON.parse(json) as EventLog;

    // Validate schema
    if (!log.version || !log.initialState || !Array.isArray(log.events)) {
      throw new Error('Invalid event log format');
    }

    return log;
  } catch (error) {
    throw new Error(`Failed to import event log: ${error}`);
  }
}
