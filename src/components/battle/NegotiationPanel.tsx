import React, { useState } from 'react';
import { NegotiationState, NegotiationOffer } from '../../types/battle';
import BattleCodeDisplay from './BattleCodeDisplay';

interface NegotiationPanelProps {
  negotiation: NegotiationState;
  variant: 'requester' | 'provider';
  onCounterOffer: (amount: string) => void;
  onAccept: () => void;
  disabled?: boolean;
  currentAmount: string;
  txId?: string;
}

// Icons
const MessageCircleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 2v6h-6" />
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M3 22v-6h6" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
  </svg>
);

const UserIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const BotIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect width="18" height="10" x="3" y="11" rx="2" />
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7v4" />
  </svg>
);

const CodeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

const FormIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18" />
    <path d="M9 21V9" />
  </svg>
);

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatTxHash(hash?: string): string {
  if (!hash) return '0x56e8...6b79';
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

export default function NegotiationPanel({
  negotiation,
  variant,
  onCounterOffer,
  onAccept,
  disabled = false,
  currentAmount,
  txId,
}: NegotiationPanelProps) {
  const [counterAmount, setCounterAmount] = useState('');
  const [showCode, setShowCode] = useState(false);
  const { currentRound, maxRounds, history, whoseTurn, isActive } = negotiation;

  if (!isActive || history.length === 0) {
    return null;
  }

  const isMyTurn = whoseTurn === variant;
  const canCounter = isMyTurn && currentRound < maxRounds && !disabled;
  const canAccept = isMyTurn && !disabled;
  const isMaxRoundsReached = currentRound >= maxRounds;

  const handleCounter = () => {
    if (counterAmount && canCounter) {
      onCounterOffer(counterAmount);
      setCounterAmount('');
    }
  };

  const getCode = () => {
    if (variant === 'requester') {
      return `import { ACTPClient } from '@agirails/sdk';
import { parseUnits } from 'ethers';

const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY,
});

// Negotiation is UI-only simulation
// Counter-offers are tracked in application state
// No on-chain transaction until acceptance

// When accepting the negotiated amount:
await client.escrow.approveToken(
  parseUnits('${currentAmount}', 6)
);
await client.escrow.linkEscrow('${formatTxHash(txId)}');

console.log('Accepted offer: ${currentAmount} USDC');
// State: QUOTED → COMMITTED`;
    } else {
      return `import { ACTPClient, State } from '@agirails/sdk';
import { parseUnits, AbiCoder } from 'ethers';

const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY,
});

// Negotiation is UI-only simulation
// Provider can submit new quote to counter

// To counter with a new quote:
const abiCoder = new AbiCoder();
const encodedQuote = abiCoder.encode(
  ['uint256'],
  [parseUnits('${counterAmount || currentAmount}', 6)]
);

await client.kernel.transitionState(
  '${formatTxHash(txId)}',
  State.QUOTED,
  encodedQuote
);

console.log('Counter-quote submitted');
// State remains: QUOTED`;
    }
  };

  return (
    <div className={`negotiation-panel ${showCode ? 'show-code' : ''}`} data-variant={variant}>
      {/* Header with Round Indicator and Code Toggle */}
      <div className="negotiation-header">
        <div className="negotiation-round">
          <RefreshIcon />
          <span>Round {currentRound} / {maxRounds}</span>
        </div>
        <div className="negotiation-header-right">
          {isMaxRoundsReached && (
            <span className="negotiation-warning">Max rounds reached</span>
          )}
          <button
            className="battle-flip-toggle"
            onClick={() => setShowCode(!showCode)}
            title={showCode ? 'Show form' : 'Show code'}
          >
            {showCode ? <FormIcon /> : <CodeIcon />}
          </button>
        </div>
      </div>

      {/* Content - either form or code */}
      {!showCode ? (
        <>
          {/* Quote History */}
          <div className="negotiation-history">
            {history.map((offer: NegotiationOffer) => (
              <div
                key={offer.id}
                className={`negotiation-offer ${offer.from}`}
                data-type={offer.type}
              >
                <div className="negotiation-offer-icon">
                  {offer.from === 'requester' ? <UserIcon /> : <BotIcon />}
                </div>
                <div className="negotiation-offer-content">
                  <div className="negotiation-offer-header">
                    <span className="negotiation-offer-from">
                      {offer.from === 'requester' ? 'Requester' : 'Provider'}
                    </span>
                    <span className="negotiation-offer-type">
                      {offer.type === 'initial' ? 'Initial Quote' : `Counter #${offer.round - 1}`}
                    </span>
                  </div>
                  <div className="negotiation-offer-amount">
                    {offer.amount} USDC
                  </div>
                  <div className="negotiation-offer-time">
                    {formatTime(offer.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          {isMyTurn && (
            <div className="negotiation-actions">
              <div className="negotiation-current">
                <span>Current offer:</span>
                <strong>{currentAmount} USDC</strong>
              </div>

              {/* Counter Offer Input */}
              {canCounter && (
                <div className="negotiation-counter-form">
                  <input
                    type="number"
                    className="pg-input negotiation-input"
                    placeholder="Your counter amount"
                    value={counterAmount}
                    onChange={(e) => setCounterAmount(e.target.value)}
                    disabled={disabled}
                  />
                  <button
                    className={`battle-btn outline-secondary ${canCounter ? '' : 'disabled'}`}
                    onClick={handleCounter}
                    disabled={!counterAmount || disabled}
                  >
                    <MessageCircleIcon />
                    Counter
                  </button>
                </div>
              )}

              {/* Accept Button */}
              <button
                className={`battle-btn ${variant === 'requester' ? 'primary' : 'outline'} full-width ${canAccept ? 'pulsing' : ''}`}
                onClick={onAccept}
                disabled={disabled}
              >
                <CheckIcon />
                Accept {currentAmount} USDC
              </button>

              {isMaxRoundsReached && (
                <p className="negotiation-hint">
                  Maximum rounds reached. You must accept or cancel.
                </p>
              )}
            </div>
          )}

          {/* Waiting state */}
          {!isMyTurn && (
            <div className="negotiation-waiting">
              <span>Waiting for {whoseTurn === 'requester' ? 'requester' : 'provider'} to respond...</span>
            </div>
          )}
        </>
      ) : (
        /* Code View */
        <div className="negotiation-code-view">
          <BattleCodeDisplay
            language="typescript"
            comment={variant === 'requester'
              ? '// Accept negotiated offer and fund escrow'
              : '// Counter with a new quote'}
            code={getCode()}
          />
          {isMyTurn && (
            <button
              className={`battle-btn ${variant === 'requester' ? 'primary' : 'outline'} full-width ${canAccept ? 'pulsing' : ''}`}
              onClick={onAccept}
              disabled={disabled}
            >
              <CheckIcon />
              Accept {currentAmount} USDC
            </button>
          )}
        </div>
      )}
    </div>
  );
}
