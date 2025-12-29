import { useEffect, useCallback } from 'react';

interface AdvancedApiWelcomeProps {
  onDismiss: () => void;
}

const STEPS = [
  { id: 1, actor: 'requester', state: 'INITIATED', label: 'Create' },
  { id: 2, actor: 'provider', state: 'QUOTED', label: 'Quote', optional: true },
  { id: 3, actor: 'requester', state: 'COMMITTED', label: 'Escrow' },
  { id: 4, actor: 'provider', state: 'IN_PROGRESS', label: 'Work', optional: true },
  { id: 5, actor: 'provider', state: 'DELIVERED', label: 'Deliver' },
  { id: 6, actor: 'requester', state: 'SETTLED', label: 'Release' },
];

export function AdvancedApiWelcome({ onDismiss }: AdvancedApiWelcomeProps) {
  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDismiss]);

  // Handle click outside
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onDismiss();
    }
  }, [onDismiss]);

  return (
    <div className="pg-welcome-overlay" onClick={handleOverlayClick}>
      <div className="pg-welcome pg-welcome--advanced">
        <div className="pg-welcome__badge">Full Protocol Control</div>
        <h1 className="pg-welcome__title">Advanced API Playground</h1>
        <p className="pg-welcome__subtitle">
          Control both sides of an ACTP transaction, step by step
        </p>

        {/* Visual: Dual panels */}
        <div className="pg-welcome__dual-visual">
          <div className="pg-welcome__panel-preview pg-welcome__panel-preview--requester">
            <div className="pg-welcome__panel-icon">👤</div>
            <div className="pg-welcome__panel-label">Requester</div>
            <div className="pg-welcome__panel-actions">Create • Escrow • Release</div>
          </div>
          <div className="pg-welcome__panel-vs">⚔️</div>
          <div className="pg-welcome__panel-preview pg-welcome__panel-preview--provider">
            <div className="pg-welcome__panel-icon">🤖</div>
            <div className="pg-welcome__panel-label">Provider</div>
            <div className="pg-welcome__panel-actions">Quote • Work • Deliver</div>
          </div>
        </div>

        {/* State flow */}
        <div className="pg-welcome__state-flow">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="pg-welcome__state-step">
              <div className={`pg-welcome__state-badge ${step.actor} ${step.optional ? 'optional' : ''}`}>
                {step.state}
              </div>
              {idx < STEPS.length - 1 && <span className="pg-welcome__state-arrow">→</span>}
            </div>
          ))}
        </div>

        {/* Key features */}
        <div className="pg-welcome__points">
          <div className="pg-welcome__point">
            <span className="pg-welcome__point-icon">🔄</span>
            <span><strong>Flip cards</strong> to see the SDK code for each action</span>
          </div>
          <div className="pg-welcome__point">
            <span className="pg-welcome__point-icon">💬</span>
            <span><strong>Negotiation</strong> - Both sides can quote and counter-offer before committing</span>
          </div>
          <div className="pg-welcome__point">
            <span className="pg-welcome__point-icon">⚖️</span>
            <span><strong>Disputes</strong> - See how conflicts get resolved by arbitration</span>
          </div>
        </div>

        {/* Mock mode notice */}
        <div className="pg-welcome__notice">
          <span className="pg-welcome__notice-icon">🎭</span>
          <span>All transactions are simulated but follow the exact same state machine as production</span>
        </div>

        <button className="pg-btn pg-btn-primary pg-welcome__cta" onClick={onDismiss}>
          Start Exploring →
        </button>

        <p className="pg-welcome__hint">
          Press ESC or click outside to skip
        </p>
      </div>
    </div>
  );
}
