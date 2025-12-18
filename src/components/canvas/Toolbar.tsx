import React, { useState, useRef, useEffect } from 'react';
import { getAllTemplates } from '../../lib/canvas/templates';
import { createAgentFromTemplate } from '../../lib/canvas/templates';
import { Agent, SPEED_PRESETS, SpeedPreset } from '../../lib/canvas/types';

interface ToolbarProps {
  isRunning: boolean;
  tickIntervalMs: number;
  agentCount: number;
  currentTick: number;
  canStepBack: boolean;
  onAddAgent: (agent: Agent, position: { x: number; y: number }) => void;
  onRun: () => void;
  onStop: () => void;
  onStepForward: () => void;
  onStepBack: () => void;
  onReset: () => void;
  onShare: () => void;
  onSetTickInterval: (ms: number) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onOpenGallery: () => void;
}

export function Toolbar({
  isRunning,
  tickIntervalMs,
  agentCount,
  currentTick,
  canStepBack,
  onAddAgent,
  onRun,
  onStop,
  onStepForward,
  onStepBack,
  onReset,
  onShare,
  onSetTickInterval,
  onExport,
  onImport,
  onOpenGallery,
}: ToolbarProps) {
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const templates = getAllTemplates();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAgentDropdown(false);
      }
    }

    if (showAgentDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showAgentDropdown]);

  const handleAddAgent = (templateId: string) => {
    const GRID_START_X = 100;
    const GRID_START_Y = 100;
    const GRID_OFFSET_X = 350;
    const GRID_OFFSET_Y = 150;
    const AGENTS_PER_ROW = 3;

    const col = agentCount % AGENTS_PER_ROW;
    const row = Math.floor(agentCount / AGENTS_PER_ROW);
    const verticalJitter = col * 40;
    const x = GRID_START_X + col * GRID_OFFSET_X;
    const y = GRID_START_Y + row * GRID_OFFSET_Y + verticalJitter;

    const agent = createAgentFromTemplate(templateId, { x, y });
    onAddAgent(agent, { x, y });
    setShowAgentDropdown(false);
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImport(file);
      event.target.value = '';
    }
  };

  const getCurrentSpeedLabel = (): SpeedPreset => {
    const entry = Object.entries(SPEED_PRESETS).find(([_, ms]) => ms === tickIntervalMs);
    return entry ? (entry[0] as SpeedPreset) : '1x';
  };

  const handleSpeedChange = (preset: SpeedPreset) => {
    onSetTickInterval(SPEED_PRESETS[preset]);
  };

  return (
    <div className="cv-toolbar">
      <div className="cv-toolbar__left">
        {/* Scenarios Gallery Button */}
        <button
          className="cv-btn cv-btn--secondary cv-btn--small"
          onClick={onOpenGallery}
          disabled={isRunning}
          title="Browse pre-built scenarios"
        >
          <span>🎯</span>
          Scenarios
        </button>

        {/* Add Agent Dropdown */}
        <div className="cv-toolbar__dropdown" ref={dropdownRef}>
          <button
            className="cv-btn cv-btn--secondary cv-btn--small"
            onClick={() => setShowAgentDropdown(!showAgentDropdown)}
            disabled={isRunning}
          >
            <span>+</span>
            Add Agent
          </button>

          {showAgentDropdown && (
            <div className="cv-dropdown__menu">
              {templates.map((template) => (
                <button
                  key={template.id}
                  className="cv-dropdown__item"
                  onClick={() => handleAddAgent(template.id)}
                >
                  <span className="cv-dropdown__icon">{template.icon}</span>
                  <div className="cv-dropdown__text">
                    <div className="cv-dropdown__title">{template.name}</div>
                    <div className="cv-dropdown__description">{template.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tick Counter */}
        <div className="cv-toolbar__tick-counter">
          Tick: {currentTick}
        </div>
      </div>

      <div className="cv-toolbar__center">
        {/* Main Controls: Run, Back, Step, Reset */}
        <div className="cv-toolbar__controls">
          {/* Run/Stop Button */}
          {!isRunning ? (
            <button
              className="cv-btn cv-btn--primary cv-btn--small"
              onClick={onRun}
              title="Run to completion"
            >
              <span>▶</span>
              Run
            </button>
          ) : (
            <button
              className="cv-btn cv-btn--warning cv-btn--small"
              onClick={onStop}
              title="Stop execution"
            >
              <span>⏸</span>
              Stop
            </button>
          )}

          {/* Step Back */}
          <button
            className="cv-btn cv-btn--secondary cv-btn--small"
            onClick={onStepBack}
            disabled={isRunning || !canStepBack}
            title="Step back one tick"
          >
            <span>⏮</span>
            Back
          </button>

          {/* Step Forward */}
          <button
            className="cv-btn cv-btn--secondary cv-btn--small"
            onClick={onStepForward}
            disabled={isRunning}
            title="Step forward one tick"
          >
            <span>⏭</span>
            Step
          </button>

          {/* Reset */}
          <button
            className="cv-btn cv-btn--secondary cv-btn--small"
            onClick={onReset}
            disabled={isRunning}
            title="Reset to initial state"
          >
            <span>↻</span>
            Reset
          </button>

          {/* Speed Control */}
          <select
            className="cv-btn cv-btn--secondary cv-btn--small cv-toolbar__speed"
            value={getCurrentSpeedLabel()}
            onChange={(e) => handleSpeedChange(e.target.value as SpeedPreset)}
            disabled={isRunning}
            title="Execution speed"
          >
            <option value="0.5x">0.5x</option>
            <option value="1x">1x</option>
            <option value="2x">2x</option>
            <option value="4x">4x</option>
          </select>
        </div>
      </div>

      <div className="cv-toolbar__right">
        {/* Share Button */}
        <button
          className="cv-btn cv-btn--secondary cv-btn--small"
          onClick={onShare}
          title="Copy share link"
        >
          <span>↗</span>
          Share
        </button>

        {/* Export Button */}
        <button
          className="cv-btn cv-btn--secondary cv-btn--small"
          onClick={onExport}
          disabled={isRunning}
          title="Export canvas to JSON"
        >
          <span>📥</span>
          Export
        </button>

        {/* Import Button */}
        <label
          className={`cv-btn cv-btn--secondary cv-btn--small ${isRunning ? 'cv-btn--disabled' : ''}`}
          title="Import canvas from JSON"
        >
          <span>📤</span>
          Import
          <input
            type="file"
            accept=".json"
            onChange={handleFileImport}
            disabled={isRunning}
            style={{ display: 'none' }}
          />
        </label>
      </div>
    </div>
  );
}
