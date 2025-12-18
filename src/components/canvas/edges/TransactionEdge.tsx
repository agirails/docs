import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
} from '@xyflow/react';
import { Connection, TransactionState, formatUSDC, getStateColor } from '../../../lib/canvas/types';

export interface TransactionEdgeData {
  // Preferred shape (used by Canvas.tsx): full connection model
  connection?: Connection;

  // Back-compat: allow direct fields (older shape)
  state?: TransactionState;
  amountMicro?: number;
  service?: string;
}

export function TransactionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeData = data as TransactionEdgeData | undefined;
  const conn = edgeData?.connection;
  const state = conn?.state ?? edgeData?.state ?? 'INITIATED';
  const amountMicro = conn?.amountMicro ?? edgeData?.amountMicro ?? 0;
  const stateColor = getStateColor(state);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: stateColor,
          strokeWidth: selected ? 3 : 2,
          strokeDasharray: state === 'INITIATED' || state === 'QUOTED' ? '5,5' : 'none',
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="cv-edge__label"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
        >
          {amountMicro > 0 && (
            <span className="cv-edge__amount">{formatUSDC(amountMicro)}</span>
          )}
          <span
            className="cv-edge__state-badge"
            style={{
              backgroundColor: `${stateColor}20`,
              color: stateColor,
            }}
          >
            {state}
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
