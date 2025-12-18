import React, { memo, useEffect, useRef, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Agent, formatUSDC } from '../../../lib/canvas/types';

export interface AgentNodeData {
  agent: Agent;
  isSelected?: boolean;
  enabled?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleEnabled?: () => void;
  canDelete?: boolean;
}

function AgentNodeComponent({ data, selected }: NodeProps) {
  const { agent, onEdit, onDelete, onToggleEnabled, enabled = true, canDelete = true } =
    data as unknown as AgentNodeData;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const statusClass = `cv-agent-node--${agent.status}`;
  const selectedClass = selected ? 'cv-agent-node--selected' : '';
  const disabledClass = !enabled ? 'cv-agent-node--disabled' : '';

  // Close menu when clicking outside the node menu
  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!menuRef.current || !t) return;
      if (!menuRef.current.contains(t)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menuOpen]);

  return (
    <div className={`cv-agent-node ${statusClass} ${selectedClass} ${disabledClass}`}>
      {/* Source handle (output) */}
      <Handle
        type="source"
        position={Position.Right}
        className="cv-handle cv-handle--source"
      />

      {/* Target handle (input) */}
      <Handle
        type="target"
        position={Position.Left}
        className="cv-handle cv-handle--target"
      />

      {/* Header */}
      <div className="cv-agent-node__header">
        <span className="cv-agent-node__icon">{agent.icon}</span>
        <span className="cv-agent-node__name">{agent.name}</span>
        <div className="cv-agent-node__menu-wrap" ref={menuRef}>
          <button
            className="cv-agent-node__menu"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            aria-label="Agent actions"
            title="Agent actions"
          >
            ⋮
          </button>

          {menuOpen && (
            <div className="cv-agent-node__menu-dropdown" onClick={(e) => e.stopPropagation()}>
              <button
                className="cv-agent-node__menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit?.();
                }}
              >
                ✎ Edit code
              </button>
              <button
                className="cv-agent-node__menu-item cv-agent-node__menu-item--danger"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete?.();
                }}
                disabled={!canDelete}
                title={!canDelete ? 'Stop runtime before deleting agents' : 'Delete this agent'}
              >
                🗑 Delete agent
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Enable Toggle */}
      <div
        className="cv-agent-node__toggle"
        onClick={(e) => {
          e.stopPropagation();
          onToggleEnabled?.();
        }}
      >
        <label className="cv-toggle" onClick={(e) => e.preventDefault()}>
          <input
            type="checkbox"
            checked={enabled}
            readOnly
          />
          <span className="cv-toggle__slider"></span>
          <span className="cv-toggle__label">{enabled ? 'Enabled' : 'Disabled'}</span>
        </label>
      </div>

      {/* Balance */}
      <div className="cv-agent-node__balance-section">
        <label className="cv-agent-node__label">Balance</label>
        <div className={`cv-agent-node__balance ${agent.balanceMicro > 0 ? 'cv-agent-node__balance--positive' : ''}`}>
          {formatUSDC(agent.balanceMicro)}
        </div>
      </div>

      {/* Status */}
      <div className="cv-agent-node__status">
        <span className={`cv-status-dot cv-status-dot--${agent.status}`} />
        <span className="cv-agent-node__status-text">
          {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
        </span>
      </div>

      {/* Code Preview */}
      <div className="cv-agent-node__code-preview">
        <code>{agent.code.split('\n').slice(0, 3).join('\n')}</code>
      </div>

      {/* Actions - just Edit button now */}
      <div className="cv-agent-node__actions">
        <button
          className="cv-btn cv-btn--small cv-btn--secondary cv-btn--full"
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.();
          }}
          aria-label="Open code editor"
        >
          ✎ Edit Code
        </button>
      </div>
    </div>
  );
}

export const AgentNode = memo(AgentNodeComponent);
