/* ============================================
   AGIRAILS Canvas - Export/Import System
   ============================================ */

import type { Dispatch } from 'react';
import { ExtendedCanvasState } from './useCanvasState';
import { Agent, Connection, SPEED_PRESETS, syncDeterministicIdsFromIds } from './types';
import { agentPositions } from './useCanvasState';

/**
 * Exportable State Format (includes agent code, unlike URL shares)
 */
export interface ExportableState {
  version: 2;
  exportedAt: number;
  agents: Array<{
    id: string;
    name: string;
    type: 'requester' | 'provider' | 'validator';
    templateId: string;
    icon: string;
    balanceMicro: number;
    code: string; // INCLUDED (unlike URL shares)
  }>;
  connections: Array<{
    id: string;
    sourceId: string;
    targetId: string;
    state: string;
    amountMicro: number;
    service: string;
    deliverableHash?: string;
  }>;
  positions: Array<{
    id: string;
    x: number;
    y: number;
  }>;
}

/**
 * Export canvas state to JSON string
 */
export function exportCanvasToJSON(state: ExtendedCanvasState): string {
  // Include agent code (unlike URL sharing)
  const agents = state.agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    type: agent.type,
    templateId: agent.templateId,
    icon: agent.icon,
    balanceMicro: agent.balanceMicro,
    code: agent.code, // INCLUDED
  }));

  // Strip timestamps from connections
  const connections = state.connections.map((c) => ({
    id: c.id,
    sourceId: c.sourceId,
    targetId: c.targetId,
    state: c.state,
    amountMicro: c.amountMicro,
    service: c.service,
    deliverableHash: c.deliverableHash,
  }));

  // Get positions from agentPositions Map
  const positions = Array.from(agentPositions.entries()).map(([id, pos]) => ({
    id,
    x: pos.x,
    y: pos.y,
  }));

  const exportable: ExportableState = {
    version: 2,
    exportedAt: Date.now(),
    agents,
    connections,
    positions,
  };

  return JSON.stringify(exportable, null, 2);
}

/**
 * Download JSON string as file
 */
export function downloadAsJSON(state: ExtendedCanvasState, filename?: string): void {
  const json = exportCanvasToJSON(state);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().slice(0, 10);
  const name = filename || `canvas-export-${timestamp}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import canvas state from JSON string
 */
export function importCanvasFromJSON(
  json: string,
  dispatch: Dispatch<any>
): { success: boolean; error?: string } {
  try {
    const data = JSON.parse(json) as ExportableState;

    // Validate version
    if (data.version !== 2) {
      return {
        success: false,
        error: `Unsupported export version: ${data.version}. Expected version 2.`,
      };
    }

    // Validate required fields
    if (!data.agents || !Array.isArray(data.agents)) {
      return { success: false, error: 'Invalid export format: missing agents array' };
    }

    if (!data.connections || !Array.isArray(data.connections)) {
      return { success: false, error: 'Invalid export format: missing connections array' };
    }

    // Phase D0: prime deterministic ID counters from imported IDs to prevent collisions.
    syncDeterministicIdsFromIds([
      ...data.agents.map((a) => a.id),
      ...data.connections.map((c) => c.id),
    ]);

    // Restore positions
    agentPositions.clear();
    if (data.positions && Array.isArray(data.positions)) {
      data.positions.forEach((pos) => {
        agentPositions.set(pos.id, { x: pos.x, y: pos.y });
      });
    }

    // Restore agents (with code)
    const baseTime = 0;
    const agents: Agent[] = data.agents.map((exportedAgent) => ({
      ...exportedAgent,
      status: 'idle' as const,
      createdAt: baseTime,
    }));

    // Restore connections
    const connections: Connection[] = data.connections.map((c) => ({
      ...c,
      state: c.state as any,
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
          tickIntervalMs: SPEED_PRESETS['1x'],
          virtualTimeMs: baseTime,
          idCounter: 1,
          rngSeed: 42,
        },
      },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
