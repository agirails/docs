/* ============================================
   AGIRAILS Canvas - Scenario Gallery Component
   ============================================

   "Aha moment in 5 minutes" - forkable scenario templates
   ============================================ */

import React, { useState, useCallback } from 'react';
import { Scenario, getAllScenarios, getScenario } from '../../lib/canvas/scenarios';

interface ScenarioGalleryProps {
  /** Called when user selects a scenario to fork */
  onForkScenario: (scenario: Scenario) => void;

  /** Called when user dismisses the gallery */
  onDismiss: () => void;

  /** Whether to show the gallery */
  isOpen: boolean;
}

/**
 * Scenario Gallery - Browse and fork pre-built scenarios
 */
export function ScenarioGallery({
  onForkScenario,
  onDismiss,
  isOpen,
}: ScenarioGalleryProps) {
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [filter, setFilter] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');

  const scenarios = getAllScenarios();

  const filteredScenarios = filter === 'all'
    ? scenarios
    : scenarios.filter(s => s.difficulty === filter);

  const handleSelectScenario = useCallback((scenario: Scenario) => {
    setSelectedScenario(scenario);
  }, []);

  const handleFork = useCallback(() => {
    if (selectedScenario) {
      onForkScenario(selectedScenario);
    }
  }, [selectedScenario, onForkScenario]);

  const handleBack = useCallback(() => {
    setSelectedScenario(null);
  }, []);

  if (!isOpen) return null;

  // Detail view for selected scenario
  if (selectedScenario) {
    return (
      <div className="cv-modal-overlay" onClick={onDismiss}>
        <div className="cv-scenario-gallery cv-scenario-gallery--detail" onClick={e => e.stopPropagation()}>
          <div className="cv-scenario-gallery__header">
            <button className="cv-scenario-gallery__back" onClick={handleBack}>
              Back
            </button>
            <h2 className="cv-scenario-gallery__title">
              {selectedScenario.icon} {selectedScenario.name}
            </h2>
            <button className="cv-modal__close" onClick={onDismiss}>
              ×
            </button>
          </div>

          <div className="cv-scenario-gallery__detail-content">
            <div className="cv-scenario-gallery__meta">
              <span className={`cv-scenario-gallery__difficulty cv-scenario-gallery__difficulty--${selectedScenario.difficulty}`}>
                {selectedScenario.difficulty}
              </span>
              <span className="cv-scenario-gallery__duration">
                {selectedScenario.durationMinutes} min
              </span>
              <span className="cv-scenario-gallery__agents">
                {selectedScenario.canvasState.agents.length} agents
              </span>
            </div>

            <p className="cv-scenario-gallery__detail-description">
              {selectedScenario.details}
            </p>

            <div className="cv-scenario-gallery__learnings">
              <h3>What you'll learn:</h3>
              <ul>
                {selectedScenario.learnings.map((learning, i) => (
                  <li key={i}>{learning}</li>
                ))}
              </ul>
            </div>

            <div className="cv-scenario-gallery__preview">
              <h3>Agents in this scenario:</h3>
              <div className="cv-scenario-gallery__agents-list">
                {selectedScenario.canvasState.agents.map(agent => (
                  <div key={agent.id} className="cv-scenario-gallery__agent-preview">
                    <span className="cv-scenario-gallery__agent-icon">{agent.icon}</span>
                    <div className="cv-scenario-gallery__agent-info">
                      <span className="cv-scenario-gallery__agent-name">{agent.name}</span>
                      <span className="cv-scenario-gallery__agent-type">{agent.type}</span>
                    </div>
                    <span className="cv-scenario-gallery__agent-balance">
                      ${(agent.balanceMicro / 1_000_000).toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="cv-scenario-gallery__tags">
              {selectedScenario.tags.map(tag => (
                <span key={tag} className="cv-scenario-gallery__tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="cv-scenario-gallery__actions">
            <button className="cv-btn cv-btn--secondary" onClick={onDismiss}>
              Cancel
            </button>
            <button className="cv-btn cv-btn--primary" onClick={handleFork}>
              Fork this Scenario
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Gallery grid view
  return (
    <div className="cv-modal-overlay" onClick={onDismiss}>
      <div className="cv-scenario-gallery" onClick={e => e.stopPropagation()}>
        <div className="cv-scenario-gallery__header">
          <div className="cv-scenario-gallery__header-left">
            <h2 className="cv-scenario-gallery__title">Scenario Gallery</h2>
            <p className="cv-scenario-gallery__subtitle">
              Fork a scenario to see how agents pay each other
            </p>
          </div>
          <button className="cv-modal__close" onClick={onDismiss}>
            ×
          </button>
        </div>

        <div className="cv-scenario-gallery__filters">
          <button
            className={`cv-scenario-gallery__filter ${filter === 'all' ? 'cv-scenario-gallery__filter--active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`cv-scenario-gallery__filter ${filter === 'beginner' ? 'cv-scenario-gallery__filter--active' : ''}`}
            onClick={() => setFilter('beginner')}
          >
            Beginner
          </button>
          <button
            className={`cv-scenario-gallery__filter ${filter === 'intermediate' ? 'cv-scenario-gallery__filter--active' : ''}`}
            onClick={() => setFilter('intermediate')}
          >
            Intermediate
          </button>
          <button
            className={`cv-scenario-gallery__filter ${filter === 'advanced' ? 'cv-scenario-gallery__filter--active' : ''}`}
            onClick={() => setFilter('advanced')}
          >
            Advanced
          </button>
        </div>

        <div className="cv-scenario-gallery__grid">
          {filteredScenarios.map(scenario => (
            <div
              key={scenario.id}
              className="cv-scenario-gallery__card"
              onClick={() => handleSelectScenario(scenario)}
            >
              <div className="cv-scenario-gallery__card-icon">
                {scenario.icon}
              </div>
              <div className="cv-scenario-gallery__card-content">
                <h3 className="cv-scenario-gallery__card-title">
                  {scenario.name}
                </h3>
                <p className="cv-scenario-gallery__card-description">
                  {scenario.description}
                </p>
                <div className="cv-scenario-gallery__card-meta">
                  <span className={`cv-scenario-gallery__difficulty cv-scenario-gallery__difficulty--${scenario.difficulty}`}>
                    {scenario.difficulty}
                  </span>
                  <span className="cv-scenario-gallery__duration">
                    {scenario.durationMinutes} min
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="cv-scenario-gallery__footer">
          <p className="cv-scenario-gallery__footer-text">
            Or start with a blank canvas
          </p>
          <button className="cv-btn cv-btn--secondary" onClick={onDismiss}>
            Start Empty
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Welcome Screen - Shows on first load
 */
interface WelcomeScreenProps {
  onOpenGallery: () => void;
  onStartEmpty: () => void;
}

export function WelcomeScreen({ onOpenGallery, onStartEmpty }: WelcomeScreenProps) {
  return (
    <div className="cv-welcome">
      <div className="cv-welcome__content">
        <h1 className="cv-welcome__title">AGIRAILS Canvas</h1>
        <p className="cv-welcome__subtitle">
          See how AI agents pay each other
        </p>

        <div className="cv-welcome__options">
          <button className="cv-welcome__option cv-welcome__option--primary" onClick={onOpenGallery}>
            <span className="cv-welcome__option-icon">🎯</span>
            <span className="cv-welcome__option-title">Browse Scenarios</span>
            <span className="cv-welcome__option-description">
              Start with a pre-built scenario and learn by example
            </span>
          </button>

          <button className="cv-welcome__option" onClick={onStartEmpty}>
            <span className="cv-welcome__option-icon">+</span>
            <span className="cv-welcome__option-title">Start Empty</span>
            <span className="cv-welcome__option-description">
              Build your own agent network from scratch
            </span>
          </button>
        </div>

        <div className="cv-welcome__quick-start">
          <h3>Quick Start Scenarios:</h3>
          <div className="cv-welcome__quick-scenarios">
            <QuickScenarioButton
              id="basic-escrow"
              onSelect={onOpenGallery}
            />
            <QuickScenarioButton
              id="marketplace"
              onSelect={onOpenGallery}
            />
            <QuickScenarioButton
              id="dispute-resolution"
              onSelect={onOpenGallery}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickScenarioButton({
  id,
  onSelect,
}: {
  id: string;
  onSelect: () => void;
}) {
  const scenario = getScenario(id);
  if (!scenario) return null;

  return (
    <button className="cv-welcome__quick-scenario" onClick={onSelect}>
      <span className="cv-welcome__quick-scenario-icon">{scenario.icon}</span>
      <span className="cv-welcome__quick-scenario-name">{scenario.name}</span>
      <span className="cv-welcome__quick-scenario-time">{scenario.durationMinutes} min</span>
    </button>
  );
}
