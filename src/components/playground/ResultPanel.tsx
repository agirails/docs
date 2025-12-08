import { useState } from 'react';
import { SimulationResult } from '../../types/playground';

interface ResultPanelProps {
  result: SimulationResult;
  onRetry: () => void;
  formAmount?: string;
}

type Tab = 'stateChanges' | 'events' | 'gasAndFees';

export default function ResultPanel({ result, onRetry, formAmount }: ResultPanelProps) {
  const platformFee = formAmount ? (parseFloat(formAmount) * 0.01).toFixed(2) : '1.00';
  const [activeTab, setActiveTab] = useState<Tab>('stateChanges');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'stateChanges', label: 'State Changes' },
    { id: 'events', label: 'Events' },
    { id: 'gasAndFees', label: 'Gas & Fees' },
  ];

  const isQueryMethod = result.status === 'success' && result.gasEstimate === 0;

  return (
    <div className="pg-result">
      <div className="pg-result-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pg-result-tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.id === 'stateChanges' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            )}
            {tab.id === 'events' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            )}
            {tab.id === 'gasAndFees' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            )}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="pg-result-content">
        {result.status === 'idle' && (
          <div className="pg-result-idle">
            <div className="pg-result-idle-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" />
                <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" />
                <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
                <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
              </svg>
            </div>
            <p className="pg-result-idle-title">Run a simulation to see results</p>
            <p className="pg-result-idle-desc">Fill in the parameters and click "Simulate Transaction"</p>
          </div>
        )}

        {result.status === 'loading' && (
          <div className="pg-loading">
            <div className="pg-loading-bar" />
            <div className="pg-loading-bar" />
            <div className="pg-loading-bar" />
          </div>
        )}

        {result.status === 'success' && (
          <div className="pg-result-success">
            <div className="pg-success-header">
              <div className="pg-success-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="pg-success-title">Simulation Successful</span>
            </div>

            {activeTab === 'stateChanges' && (
              result.stateChanges && result.stateChanges.length > 0 ? (
                <div className="pg-state-changes">
                  <p className="pg-section-desc">The following state changes will occur:</p>
                  {result.stateChanges.map((change, i) => (
                    <div key={i} className="pg-state-change">
                      <span className="pg-state-field">{change.field}</span>
                      <code className="pg-state-value pg-state-from">{change.from}</code>
                      <span className="pg-state-arrow">→</span>
                      <code className="pg-state-value pg-state-to">{change.to}</code>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="pg-empty-state">
                  <div className="pg-empty-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <p className="pg-empty-title">No state changes</p>
                  <p className="pg-empty-desc">Run a simulation to see state transitions</p>
                </div>
              )
            )}

            {activeTab === 'events' && (
              result.events && result.events.length > 0 ? (
                <div className="pg-events">
                  <p className="pg-section-desc">The following events will be emitted:</p>
                  {result.events.map((event, i) => (
                    <div key={i} className="pg-event">
                      <div className="pg-event-header">
                        <svg className="pg-event-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                        </svg>
                        <p className="pg-event-name">{event.name}</p>
                        <span className="pg-event-tag">(indexed)</span>
                      </div>
                      <div className="pg-event-args">
                        {Object.entries(event.args).map(([key, value]) => (
                          <div key={key} className="pg-event-arg">
                            <span className="pg-event-arg-key">{key}:</span>
                            <code className="pg-event-arg-value">{value}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="pg-empty-state">
                  <div className="pg-empty-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  </div>
                  <p className="pg-empty-title">{isQueryMethod ? "Query methods don't emit events" : 'No events emitted'}</p>
                  {!isQueryMethod && <p className="pg-empty-desc">Run a simulation to see emitted events</p>}
                </div>
              )
            )}

            {activeTab === 'gasAndFees' && (
              <div className="pg-gas-fees">
                <p className="pg-section-desc">Estimated costs for this transaction:</p>
                <div className="pg-gas-row">
                  <span className="pg-gas-label">Gas Estimate</span>
                  <span className="pg-gas-value">
                    ~{result.gasEstimate?.toLocaleString()} ({result.gasCostUsd})
                  </span>
                </div>
                <div className="pg-gas-row">
                  <span className="pg-gas-label">Platform Fee</span>
                  <span className="pg-gas-value">${platformFee} USDC (1%)</span>
                </div>
                <div className="pg-gas-row">
                  <span className="pg-gas-label">Network</span>
                  <span className="pg-gas-value">Base Sepolia</span>
                </div>
                <div className="pg-gas-row">
                  <span className="pg-gas-label">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.5rem' }}>
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    Est. Confirmation
                  </span>
                  <span className="pg-gas-value">~2-4 seconds</span>
                </div>
              </div>
            )}
          </div>
        )}

        {result.status === 'error' && (
          <div className="pg-result-error">
            <div className="pg-error-header">
              <div className="pg-error-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <span className="pg-error-title">Transaction Failed</span>
            </div>

            <div className="pg-error-box">
              <p>{result.error}</p>
            </div>

            <button onClick={onRetry} className="pg-btn pg-btn-secondary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
              </svg>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
