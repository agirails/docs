import { useEffect, useCallback } from 'react';

interface StandardApiWelcomeProps {
  onDismiss: () => void;
}

export function StandardApiWelcome({ onDismiss }: StandardApiWelcomeProps) {
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
      <div className="pg-welcome">
        <div className="pg-welcome__badge">Provider Agent Perspective</div>
        <h1 className="pg-welcome__title">Standard API Playground</h1>
        <p className="pg-welcome__subtitle">
          Configure your agent's pricing, filters, and behavior
        </p>

        {/* Visual - Agent config panel */}
        <div className="pg-welcome__visual">
          <div className="pg-welcome__agent-config">
            <div className="pg-welcome__agent-header">
              <span className="pg-welcome__agent-icon">🤖</span>
              <span>Your Provider Agent</span>
            </div>
            <div className="pg-welcome__agent-rows">
              <div className="pg-welcome__agent-row">
                <span className="pg-welcome__agent-label">Pricing</span>
                <span className="pg-welcome__agent-value">$0.50 + $0.01/word</span>
              </div>
              <div className="pg-welcome__agent-row">
                <span className="pg-welcome__agent-label">Margin</span>
                <span className="pg-welcome__agent-value pg-welcome__agent-value--success">20%</span>
              </div>
              <div className="pg-welcome__agent-row">
                <span className="pg-welcome__agent-label">Budget filter</span>
                <span className="pg-welcome__agent-value">$1 - $100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Key points */}
        <div className="pg-welcome__points">
          <div className="pg-welcome__point">
            <span className="pg-welcome__point-icon">💰</span>
            <span>Set pricing strategy - base cost, per-unit rates, profit margins</span>
          </div>
          <div className="pg-welcome__point">
            <span className="pg-welcome__point-icon">🎯</span>
            <span>Filter incoming jobs by budget range</span>
          </div>
          <div className="pg-welcome__point">
            <span className="pg-welcome__point-icon">📊</span>
            <span>Watch real-time economics - cost vs price vs profit</span>
          </div>
        </div>

        {/* Mock mode notice */}
        <div className="pg-welcome__notice">
          <span className="pg-welcome__notice-icon">🎭</span>
          <span>All transactions are simulated but behave exactly like real ones - no actual funds involved</span>
        </div>

        <button className="pg-btn pg-btn-primary pg-welcome__cta" onClick={onDismiss}>
          Configure Agent →
        </button>

        <p className="pg-welcome__hint">
          Press ESC or click outside to skip
        </p>
      </div>
    </div>
  );
}
