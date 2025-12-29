import { useEffect, useCallback } from 'react';

interface CanvasWelcomeProps {
  onBrowseScenarios: () => void;
  onStartEmpty: () => void;
}

export function CanvasWelcome({ onBrowseScenarios, onStartEmpty }: CanvasWelcomeProps) {
  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onStartEmpty();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartEmpty]);

  // Handle click outside
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onStartEmpty();
    }
  }, [onStartEmpty]);

  return (
    <div className="pg-welcome-overlay" onClick={handleOverlayClick}>
      <div className="pg-welcome pg-welcome--canvas">
        <div className="pg-welcome__badge">Visual Agent Builder</div>
        <h1 className="pg-welcome__title">Canvas Playground</h1>
        <p className="pg-welcome__subtitle">
          Design and simulate multi-agent transaction networks
        </p>

        {/* Visual: Agent network */}
        <div className="pg-welcome__canvas-visual">
          <div className="pg-welcome__canvas-node pg-welcome__canvas-node--left">
            <span>🤖</span>
            <span>Agent A</span>
          </div>
          <div className="pg-welcome__canvas-edge">
            <span className="pg-welcome__canvas-edge-line"></span>
            <span className="pg-welcome__canvas-edge-label">$50 USDC</span>
          </div>
          <div className="pg-welcome__canvas-node pg-welcome__canvas-node--right">
            <span>🤖</span>
            <span>Agent B</span>
          </div>
        </div>

        {/* State flow */}
        <div className="pg-welcome__state-flow pg-welcome__state-flow--compact">
          <span className="pg-welcome__state-mini">INITIATED</span>
          <span className="pg-welcome__state-arrow">→</span>
          <span className="pg-welcome__state-mini">COMMITTED</span>
          <span className="pg-welcome__state-arrow">→</span>
          <span className="pg-welcome__state-mini">DELIVERED</span>
          <span className="pg-welcome__state-arrow">→</span>
          <span className="pg-welcome__state-mini pg-welcome__state-mini--success">SETTLED</span>
        </div>

        {/* Key features */}
        <div className="pg-welcome__points">
          <div className="pg-welcome__point">
            <span className="pg-welcome__point-icon">🎯</span>
            <span><strong>Fork scenarios</strong> - learn from pre-built examples</span>
          </div>
          <div className="pg-welcome__point">
            <span className="pg-welcome__point-icon">🖱️</span>
            <span><strong>Drag & drop</strong> - build custom agent networks</span>
          </div>
          <div className="pg-welcome__point">
            <span className="pg-welcome__point-icon">▶️</span>
            <span><strong>Run simulation</strong> - watch transactions flow in real-time</span>
          </div>
          <div className="pg-welcome__point">
            <span className="pg-welcome__point-icon">💻</span>
            <span><strong>Edit code</strong> - double-click agents to customize behavior</span>
          </div>
        </div>

        {/* Mock mode notice */}
        <div className="pg-welcome__notice">
          <span className="pg-welcome__notice-icon">🎭</span>
          <span>All simulated - experiment freely without real funds</span>
        </div>

        {/* Two CTAs */}
        <div className="pg-welcome__cta-group">
          <button className="pg-btn pg-btn-primary pg-welcome__cta" onClick={onBrowseScenarios}>
            Browse Scenarios
          </button>
          <button className="pg-btn pg-btn-secondary pg-welcome__cta" onClick={onStartEmpty}>
            Start Empty
          </button>
        </div>

        <p className="pg-welcome__hint">
          Press ESC or click outside to start empty
        </p>
      </div>
    </div>
  );
}
