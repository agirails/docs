/**
 * Time Control Component
 * Allows manipulation of mock blockchain time
 */

import { useState, useCallback } from 'react';

interface TimeControlProps {
  currentTimestamp: number;
  currentBlockNumber: number;
  onAdvanceTime: (seconds: number) => void;
  onAdvanceBlocks: (blocks: number) => void;
  onReset: () => void;
}

export default function TimeControl({
  currentTimestamp,
  currentBlockNumber,
  onAdvanceTime,
  onAdvanceBlocks,
  onReset,
}: TimeControlProps) {
  const [customTime, setCustomTime] = useState('');
  const [speed, setSpeed] = useState(1);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleAdvance = useCallback((baseSeconds: number) => {
    onAdvanceTime(baseSeconds * speed);
  }, [onAdvanceTime, speed]);

  const handleCustomAdvance = useCallback(() => {
    const seconds = parseInt(customTime);
    if (!isNaN(seconds) && seconds > 0) {
      onAdvanceTime(seconds);
      setCustomTime('');
    }
  }, [customTime, onAdvanceTime]);

  return (
    <div className="pg-time-control">
      <div className="pg-time-display">
        <div className="pg-time-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <div className="pg-time-info">
            <span className="pg-time-label">Mock Time</span>
            <span className="pg-time-value">{formatTime(currentTimestamp)}</span>
          </div>
        </div>

        <div className="pg-time-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="3" y1="9" x2="21" y2="9"/>
            <line x1="9" y1="21" x2="9" y2="9"/>
          </svg>
          <div className="pg-time-info">
            <span className="pg-time-label">Block</span>
            <span className="pg-time-value">#{currentBlockNumber.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="pg-time-controls">
        <div className="pg-time-speed">
          <label className="pg-time-speed-label">Speed:</label>
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="pg-time-speed-select"
          >
            <option value={1}>1x</option>
            <option value={10}>10x</option>
            <option value={100}>100x</option>
            <option value={1000}>1000x</option>
          </select>
        </div>

        <div className="pg-time-buttons">
          <button
            onClick={() => handleAdvance(60)}
            className="pg-time-btn"
            title="Advance 1 minute"
          >
            +1m
          </button>
          <button
            onClick={() => handleAdvance(3600)}
            className="pg-time-btn"
            title="Advance 1 hour"
          >
            +1h
          </button>
          <button
            onClick={() => handleAdvance(86400)}
            className="pg-time-btn"
            title="Advance 1 day"
          >
            +1d
          </button>
          <button
            onClick={() => onAdvanceBlocks(10)}
            className="pg-time-btn"
            title="Advance 10 blocks"
          >
            +10 blk
          </button>
        </div>

        <div className="pg-time-custom">
          <input
            type="number"
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            placeholder="Custom (sec)"
            className="pg-time-input"
          />
          <button
            onClick={handleCustomAdvance}
            disabled={!customTime}
            className="pg-time-btn pg-time-btn-go"
          >
            Go
          </button>
        </div>

        <button
          onClick={onReset}
          className="pg-time-btn pg-time-btn-reset"
          title="Reset to current time"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
          Reset
        </button>
      </div>
    </div>
  );
}
