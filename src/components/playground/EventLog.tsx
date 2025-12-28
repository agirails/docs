/**
 * Real-time Event Log Component
 * Shows SDK events as they happen
 */

import { useEffect, useRef } from 'react';
import { SDKEvent } from '../../lib/sdk';

interface EventLogProps {
  events: SDKEvent[];
  maxHeight?: string;
}

const eventColors: Record<string, string> = {
  TransactionCreated: 'var(--pg-primary)',
  EscrowLinked: 'var(--pg-accent)',
  StateTransitioned: 'var(--pg-warning)',
  EscrowReleased: 'var(--pg-success)',
  DisputeInitiated: 'var(--pg-error)',
  DisputeResolved: 'var(--pg-warning)',
  TokensMinted: 'var(--pg-success)',
  BalanceChanged: 'var(--pg-text-muted)',
};

const eventIcons: Record<string, JSX.Element> = {
  TransactionCreated: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="16"/>
      <line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  ),
  EscrowLinked: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  ),
  StateTransitioned: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  EscrowReleased: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  DisputeInitiated: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  DisputeResolved: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="16 12 12 8 8 12"/>
      <line x1="12" y1="16" x2="12" y2="8"/>
    </svg>
  ),
};

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatEventData(data: Record<string, unknown>): string {
  const entries = Object.entries(data);
  if (entries.length === 0) return '';

  return entries
    .map(([key, value]) => {
      if (typeof value === 'string' && value.startsWith('0x') && value.length > 20) {
        return `${key}: ${value.slice(0, 10)}...${value.slice(-8)}`;
      }
      return `${key}: ${value}`;
    })
    .join(' | ');
}

export default function EventLog({ events, maxHeight = '250px' }: EventLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div className="pg-event-log">
      <div className="pg-event-log-header">
        <div className="pg-event-log-title">
          <span className="pg-event-log-indicator" />
          Event Log
        </div>
        <span className="pg-event-log-count">{events.length} events</span>
      </div>

      <div
        className="pg-event-log-content"
        ref={scrollRef}
        style={{ maxHeight }}
      >
        {events.length === 0 ? (
          <div className="pg-event-log-empty">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <line x1="10" y1="9" x2="8" y2="9"/>
            </svg>
            <p>No events yet</p>
            <span>Execute a method to see events</span>
          </div>
        ) : (
          <div className="pg-event-log-list">
            {events.map((event, index) => (
              <div
                key={`${event.type}-${event.timestamp}-${index}`}
                className="pg-event-item"
                style={{
                  borderLeftColor: eventColors[event.type] || 'var(--pg-border)'
                }}
              >
                <div className="pg-event-icon" style={{ color: eventColors[event.type] || 'var(--pg-text-muted)' }}>
                  {eventIcons[event.type] || (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="4"/>
                    </svg>
                  )}
                </div>
                <div className="pg-event-content">
                  <div className="pg-event-header">
                    <span className="pg-event-name">{event.type}</span>
                    <span className="pg-event-time">{formatTimestamp(event.timestamp)}</span>
                  </div>
                  {event.data && Object.keys(event.data).length > 0 && (
                    <div className="pg-event-data">
                      {formatEventData(event.data)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
