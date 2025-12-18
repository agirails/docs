import React, { useState, useEffect } from 'react';
import { Agent, Connection, generateId, parseUSDC } from '../../../lib/canvas/types';

interface ConnectionModalProps {
  isOpen: boolean;
  sourceAgent: Agent | null;
  targetAgent: Agent | null;
  virtualTimeMs: number;
  onClose: () => void;
  onCreateConnection: (connection: Connection) => void;
}

export function ConnectionModal({
  isOpen,
  sourceAgent,
  targetAgent,
  virtualTimeMs,
  onClose,
  onCreateConnection,
}: ConnectionModalProps) {
  const [amount, setAmount] = useState('10.00');
  const [service, setService] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmount('10.00');
      setService('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !sourceAgent || !targetAgent) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate amount using parseUSDC for consistency
    // parseUSDC handles "$1.50" → 1500000 micro-USDC
    const amountMicro = parseUSDC(amount);

    if (isNaN(amountMicro) || amountMicro <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    // Minimum $0.05 = 50,000 micro-USDC
    const MIN_AMOUNT_MICRO = 50_000;
    if (amountMicro < MIN_AMOUNT_MICRO) {
      setError('Minimum amount is $0.05');
      return;
    }

    // Validate service description
    if (!service.trim()) {
      setError('Service description is required');
      return;
    }

    // Create connection
    const connection: Connection = {
      id: generateId('tx'),
      sourceId: sourceAgent.id,
      targetId: targetAgent.id,
      state: 'INITIATED',
      amountMicro,
      service: service.trim(),
      createdAt: virtualTimeMs,
      updatedAt: virtualTimeMs,
    };

    onCreateConnection(connection);
    onClose();
  };

  return (
    <div className="cv-modal-overlay" onClick={onClose}>
      <div className="cv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cv-modal__header">
          <h2 className="cv-modal__title">Create Transaction</h2>
          <button className="cv-modal__close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="cv-modal__body">
          {/* Agent Flow */}
          <div className="cv-modal__section">
            <div className="cv-modal__flow">
              <div className="cv-modal__agent">
                <span className="cv-modal__agent-icon">{sourceAgent.icon}</span>
                <div className="cv-modal__agent-info">
                  <div className="cv-modal__agent-name">{sourceAgent.name}</div>
                  <div className="cv-modal__agent-type">Requester</div>
                </div>
              </div>

              <div className="cv-modal__arrow">→</div>

              <div className="cv-modal__agent">
                <span className="cv-modal__agent-icon">{targetAgent.icon}</span>
                <div className="cv-modal__agent-info">
                  <div className="cv-modal__agent-name">{targetAgent.name}</div>
                  <div className="cv-modal__agent-type">Provider</div>
                </div>
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div className="cv-modal__section">
            <label className="cv-modal__label">
              Amount (USDC)
              <input
                type="text"
                className="cv-modal__input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="10.00"
                autoFocus
              />
            </label>
            <div className="cv-modal__hint">Minimum: $0.05</div>
          </div>

          {/* Service Description */}
          <div className="cv-modal__section">
            <label className="cv-modal__label">
              Service Description
              <input
                type="text"
                className="cv-modal__input"
                value={service}
                onChange={(e) => setService(e.target.value)}
                placeholder="e.g., Data Analysis, Content Generation, etc."
              />
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="cv-modal__error">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="cv-modal__actions">
            <button
              type="button"
              className="cv-btn cv-btn--secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="cv-btn cv-btn--primary"
            >
              Create Transaction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
