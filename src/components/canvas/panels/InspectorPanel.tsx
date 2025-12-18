import React, { useState } from 'react';
import { Connection, RuntimeEvent, formatUSDC, Agent, TransactionState } from '../../../lib/canvas/types';
import { getNextState, getAgentState } from '../../../lib/canvas/runtime';

interface InspectorPanelProps {
  connections: Connection[];
  events: RuntimeEvent[];
  selectedAgent: Agent | null;
  expanded: boolean;
  onToggle: () => void;
  onCancelTransaction: (connectionId: string) => void;
  onDisputeTransaction: (connectionId: string) => void;
  onAdvanceState: (connectionId: string) => void;
}

type TabType = 'transactions' | 'console' | 'agent';

export function InspectorPanel({
  connections,
  events,
  selectedAgent,
  expanded,
  onToggle,
  onCancelTransaction,
  onDisputeTransaction,
  onAdvanceState,
}: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('transactions');

  // Auto-switch to agent tab when an agent is selected
  React.useEffect(() => {
    if (selectedAgent && expanded) {
      setActiveTab('agent');
    }
  }, [selectedAgent, expanded]);

  const getEventColor = (type: RuntimeEvent['type']) => {
    switch (type) {
      case 'info': return 'var(--cv-text-muted)';
      case 'success': return 'var(--cv-success)';
      case 'warning': return 'var(--cv-warning)';
      case 'error': return 'var(--cv-error)';
      default: return 'var(--cv-text-muted)';
    }
  };

  return (
    <div className={`cv-inspector ${expanded ? '' : 'cv-inspector--collapsed'}`}>
      <button
        type="button"
        className="cv-inspector__header"
        onMouseDown={(e) => {
          // Prevent focus-steal/scroll-jump behavior in some layouts/browsers
          e.preventDefault();
        }}
        onClick={(e) => {
          // Defensive: ensure no default button behavior can trigger navigation/scroll
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }}
      >
        <span className="cv-inspector__title">
          INSPECTOR
        </span>
        <span className="cv-inspector__toggle">
          {expanded ? '↓ Collapse' : '↑ Expand'}
        </span>
      </button>

      {expanded && (
        <>
          {/* Tabs */}
          <div className="cv-inspector__tabs">
            <button
              className={`cv-inspector__tab ${activeTab === 'transactions' ? 'cv-inspector__tab--active' : ''}`}
              onClick={() => setActiveTab('transactions')}
            >
              Transactions ({connections.length})
            </button>
            <button
              className={`cv-inspector__tab ${activeTab === 'console' ? 'cv-inspector__tab--active' : ''}`}
              onClick={() => setActiveTab('console')}
            >
              Console ({events.length})
            </button>
            <button
              className={`cv-inspector__tab ${activeTab === 'agent' ? 'cv-inspector__tab--active' : ''}`}
              onClick={() => setActiveTab('agent')}
              disabled={!selectedAgent}
            >
              {selectedAgent ? `${selectedAgent.name}` : 'No Selection'}
            </button>
          </div>

          {/* Tab Content */}
          <div className="cv-inspector__content">
            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <div className="cv-inspector__panel">
                {connections.length === 0 ? (
                  <div className="cv-inspector__empty">
                    <p>No transactions yet</p>
                    <p className="cv-inspector__hint">
                      Connect agents to create transactions
                    </p>
                  </div>
                ) : (
                  <div className="cv-inspector__list">
                    {connections.map((conn) => (
                      <div key={conn.id} className="cv-transaction-item">
                        <span className="cv-transaction-item__id">{conn.id.slice(0, 8)}</span>
                        <span className="cv-transaction-item__flow">
                          {conn.sourceId.slice(0, 8)} → {conn.targetId.slice(0, 8)}
                        </span>
                        <span className="cv-transaction-item__amount">
                          {formatUSDC(conn.amountMicro)}
                        </span>
                        <span
                          className="cv-state-badge"
                          data-state={conn.state.toLowerCase()}
                        >
                          {conn.state}
                        </span>

                        {/* Display deliverable hash for DELIVERED/SETTLED transactions */}
                        {conn.deliverableHash && (
                          <div className="cv-transaction-item__hash" style={{
                            marginTop: '0.5rem',
                            fontSize: '0.7rem',
                            color: 'var(--cv-text-muted)',
                            fontFamily: 'monospace',
                            wordBreak: 'break-all'
                          }}>
                            <span style={{ fontWeight: 'bold' }}>🔐 Proof:</span> {conn.deliverableHash.substring(0, 16)}...
                            <span title={conn.deliverableHash} style={{ cursor: 'help', marginLeft: '0.25rem' }}>ℹ️</span>
                          </div>
                        )}

                        {/* Action buttons - only show for non-terminal states */}
                        {conn.state !== 'SETTLED' && conn.state !== 'CANCELLED' && (
                          <div className="cv-transaction-item__actions">
                            {/* Cancel button - available before delivery */}
                            {(conn.state === 'INITIATED' ||
                              conn.state === 'QUOTED' ||
                              conn.state === 'COMMITTED' ||
                              conn.state === 'IN_PROGRESS') && (
                              <button
                                className="cv-btn cv-btn--small cv-btn--danger"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCancelTransaction(conn.id);
                                }}
                                title="Cancel this transaction"
                              >
                                Cancel
                              </button>
                            )}

                            {/* Dispute button - only available when DELIVERED */}
                            {conn.state === 'DELIVERED' && (
                              <button
                                className="cv-btn cv-btn--small cv-btn--warning"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDisputeTransaction(conn.id);
                                }}
                                title="Raise a dispute"
                              >
                                Dispute
                              </button>
                            )}

                            {/* Advance button - available for all non-terminal states */}
                            <button
                              className="cv-btn cv-btn--small cv-btn--secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAdvanceState(conn.id);
                              }}
                              disabled={!getNextState(conn.state)}
                              title={getNextState(conn.state) ? `Advance to ${getNextState(conn.state)}` : 'Terminal state'}
                            >
                              Advance →
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Console Tab */}
            {activeTab === 'console' && (
              <div className="cv-inspector__panel">
                <div className="cv-console">
                  <div className="cv-console__content">
                    {events.length === 0 ? (
                      <div className="cv-console__empty">
                        Waiting for events...
                      </div>
                    ) : (
                      events.slice().reverse().map((event) => (
                        <div
                          key={event.id}
                          className="cv-console__entry"
                          style={{ color: getEventColor(event.type) }}
                        >
                          <span className="cv-console__time">
                            [{new Date(event.timestamp).toLocaleTimeString()}]
                          </span>
                          {event.agentId && (
                            <span className="cv-console__agent">
                              [{event.agentId.slice(0, 8)}]
                            </span>
                          )}
                          <span className="cv-console__message">
                            {event.payload.message || JSON.stringify(event.payload)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Selected Agent Tab */}
            {activeTab === 'agent' && (
              <div className="cv-inspector__panel">
                {!selectedAgent ? (
                  <div className="cv-inspector__empty">
                    <p>No agent selected</p>
                    <p className="cv-inspector__hint">
                      Click on an agent to view details
                    </p>
                  </div>
                ) : (
                  <div className="cv-agent-details">
                    <div className="cv-agent-details__header">
                      <span className="cv-agent-details__icon">{selectedAgent.icon}</span>
                      <div className="cv-agent-details__info">
                        <h3 className="cv-agent-details__name">{selectedAgent.name}</h3>
                        <div className="cv-agent-details__type">{selectedAgent.type}</div>
                      </div>
                    </div>

                    <div className="cv-agent-details__section">
                      <div className="cv-agent-details__label">Balance</div>
                      <div className="cv-agent-details__value cv-agent-details__value--balance">
                        {formatUSDC(selectedAgent.balanceMicro)}
                      </div>
                    </div>

                    <div className="cv-agent-details__section">
                      <div className="cv-agent-details__label">Status</div>
                      <div className="cv-agent-details__value">
                        <span className={`cv-status-dot cv-status-dot--${selectedAgent.status}`}></span>
                        {selectedAgent.status}
                      </div>
                    </div>

                    <div className="cv-agent-details__section">
                      <div className="cv-agent-details__label">Template</div>
                      <div className="cv-agent-details__value">{selectedAgent.templateId}</div>
                    </div>

                    <div className="cv-agent-details__section">
                      <div className="cv-agent-details__label">Agent ID</div>
                      <div className="cv-agent-details__value cv-agent-details__value--mono">
                        {selectedAgent.id}
                      </div>
                    </div>

                    {/* Agent State (deliverables, jobs, etc.) */}
                    {(() => {
                      const agentState = getAgentState(selectedAgent.id) ?? {};

                      return (
                        <div className="cv-agent-details__section">
                          <div className="cv-agent-details__label">ctx.state (Persistent Memory)</div>
                          <div className="cv-inspector__hint" style={{ marginTop: '0.25rem' }}>
                            This is the agent’s persisted state between ticks. Use it to debug logic, store deliverables,
                            and poll service jobs. Must be JSON-serializable.
                          </div>

                          {/* Show deliverable if present */}
                          {(agentState as any).deliverable && (
                            <div className="cv-agent-details__subsection">
                              <div className="cv-agent-details__sublabel">📦 Deliverable</div>
                              <div className="cv-agent-details__value cv-agent-details__value--deliverable">
                                {(agentState as any).deliverable}
                              </div>
                              {(() => {
                                // Find connection with deliverable hash for this agent
                                const deliveredConn = connections.find(
                                  c => c.targetId === selectedAgent.id && c.deliverableHash
                                );
                                if (deliveredConn?.deliverableHash) {
                                  return (
                                    <>
                                      <div className="cv-agent-details__sublabel" style={{ marginTop: '0.5rem' }}>
                                        🔐 SHA-256 Hash (Verifiable Proof)
                                      </div>
                                      <div className="cv-agent-details__value cv-agent-details__value--mono" style={{ fontSize: '0.7rem', wordBreak: 'break-all' }}>
                                        {deliveredConn.deliverableHash}
                                      </div>
                                    </>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          )}

                          {/* Show active jobs if present */}
                          {(agentState as any).jobs && Object.keys((agentState as any).jobs).length > 0 && (
                            <div className="cv-agent-details__subsection">
                              <div className="cv-agent-details__sublabel">⚙️ Service Jobs</div>
                              {Object.entries((agentState as any).jobs).map(([jobId, job]: [string, any]) => (
                                <div key={jobId} style={{
                                  marginBottom: '0.5rem',
                                  padding: '0.5rem',
                                  background: 'rgba(0,0,0,0.1)',
                                  borderRadius: '4px',
                                  fontSize: '0.85rem'
                                }}>
                                  <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--cv-text-muted)' }}>
                                    {jobId}
                                  </div>
                                  <div style={{
                                    color: job.status === 'completed' ? 'var(--cv-success)' :
                                           job.status === 'failed' ? 'var(--cv-error)' :
                                           'var(--cv-warning)',
                                    fontWeight: 'bold'
                                  }}>
                                    Status: {job.status}
                                  </div>
                                  {job.result && (
                                    <div style={{ marginTop: '0.25rem' }}>
                                      <div style={{ fontSize: '0.75rem', color: 'var(--cv-text-muted)' }}>
                                        Result: {job.result.text?.substring(0, 100)}{job.result.text?.length > 100 ? '...' : ''}
                                      </div>
                                      <div style={{ fontSize: '0.75rem', color: 'var(--cv-text-muted)' }}>
                                        Backend: {job.result.backend}
                                      </div>
                                    </div>
                                  )}
                                  {job.error && (
                                    <div style={{ color: 'var(--cv-error)', fontSize: '0.75rem' }}>
                                      Error: {job.error}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Show full state as JSON (collapsible) */}
                          <details style={{ marginTop: '0.5rem' }}>
                            <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--cv-text-muted)' }}>
                              View ctx.state (JSON)
                            </summary>
                            <div className="cv-agent-details__code" style={{ maxHeight: '200px', overflow: 'auto' }}>
                              <pre style={{ fontSize: '0.75rem' }}>{JSON.stringify(agentState, null, 2)}</pre>
                            </div>
                          </details>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
