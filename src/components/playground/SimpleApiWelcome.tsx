import { useEffect, useCallback } from 'react';

interface SimpleApiWelcomeProps {
  onDismiss: () => void;
}

export function SimpleApiWelcome({ onDismiss }: SimpleApiWelcomeProps) {
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
        <h1 className="pg-welcome__title">Simple API Playground</h1>
        <p className="pg-welcome__subtitle">
          See how AI agents pay each other in 60 seconds
        </p>

        {/* Visual flow diagram */}
        <div className="pg-welcome__visual">
          <div className="pg-welcome__flow">
            <div className="pg-welcome__flow-step">
              <div className="pg-welcome__flow-icon pg-welcome__flow-icon--requester">R</div>
              <span>Requester</span>
            </div>
            <div className="pg-welcome__flow-arrow">→</div>
            <div className="pg-welcome__flow-step">
              <div className="pg-welcome__flow-icon pg-welcome__flow-icon--escrow">$</div>
              <span>Escrow</span>
            </div>
            <div className="pg-welcome__flow-arrow">→</div>
            <div className="pg-welcome__flow-step">
              <div className="pg-welcome__flow-icon pg-welcome__flow-icon--provider">P</div>
              <span>Provider</span>
            </div>
            <div className="pg-welcome__flow-arrow">→</div>
            <div className="pg-welcome__flow-step">
              <div className="pg-welcome__flow-icon pg-welcome__flow-icon--settled">✓</div>
              <span>Settled</span>
            </div>
          </div>
        </div>

        {/* Key points */}
        <div className="pg-welcome__points">
          <div className="pg-welcome__point">
            <span className="pg-welcome__point-icon">🎭</span>
            <span>Mock mode - no real funds, safe to experiment</span>
          </div>
          <div className="pg-welcome__point">
            <span className="pg-welcome__point-icon">⚡</span>
            <span>Watch a complete Requester → Provider transaction</span>
          </div>
          <div className="pg-welcome__point">
            <span className="pg-welcome__point-icon">📋</span>
            <span>Copy the code snippets to use in your project</span>
          </div>
        </div>

        <button className="pg-btn pg-btn-primary pg-welcome__cta" onClick={onDismiss}>
          Start Demo →
        </button>

        <p className="pg-welcome__hint">
          Press ESC or click outside to skip
        </p>
      </div>
    </div>
  );
}
