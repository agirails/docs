import { useState, useEffect, useRef, useMemo } from 'react';
import { useBattleState } from '../../hooks/useBattleState';
import { STATE_COLORS, STATE_DESCRIPTIONS, TransactionState } from '../../types/battle';
import { usePlaygroundContext, PlaygroundContext } from '../../hooks/usePlaygroundContext';
import FlipCard from './FlipCard';
import BattleCodeDisplay from './BattleCodeDisplay';
import './battle.css';

// Icons as SVG components
const SwordsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14.5 17.5L3 6V3h3l11.5 11.5"/>
    <path d="M13 19l6-6"/>
    <path d="M16 16l4 4"/>
    <path d="M19 21l2-2"/>
    <path d="M14.5 6.5L18 3h3v3l-3.5 3.5"/>
    <path d="m5 14 4 4"/>
    <path d="m7 17-2 2"/>
    <path d="m3 21 2-2"/>
  </svg>
);

const ZapIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);

const RotateCcwIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/>
  </svg>
);

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const BotIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect width="18" height="10" x="3" y="11" rx="2"/>
    <circle cx="12" cy="5" r="2"/>
    <path d="M12 7v4"/>
    <line x1="8" x2="8" y1="16" y2="16"/>
    <line x1="16" x2="16" y1="16" y2="16"/>
  </svg>
);

const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
  </svg>
);

const WalletIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
  </svg>
);

const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14"/>
    <path d="m12 5 7 7-7 7"/>
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" x2="21" y1="14" y2="3"/>
  </svg>
);

const SendIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" x2="11" y1="2" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const AlertTriangleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
    <line x1="12" x2="12" y1="9" y2="13"/>
    <line x1="12" x2="12.01" y1="17" y2="17"/>
  </svg>
);

const XCircleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" x2="9" y1="9" y2="15"/>
    <line x1="9" x2="15" y1="9" y2="15"/>
  </svg>
);

const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
);

const PackageIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16.5 9.4 7.55 4.24"/>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.29 7 12 12 20.71 7"/>
    <line x1="12" x2="12" y1="22" y2="12"/>
  </svg>
);

const FileTextIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" x2="8" y1="13" y2="13"/>
    <line x1="16" x2="8" y1="17" y2="17"/>
    <line x1="10" x2="8" y1="9" y2="9"/>
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m12 19-7-7 7-7"/>
    <path d="M19 12H5"/>
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
  if (!hash) return '';
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

interface AgentBattleProps {
  hideHeader?: boolean;
}

export default function AgentBattle({ hideHeader = false }: AgentBattleProps) {
  const { state, dispatch, canPerformAction } = useBattleState();
  const { requesterWallet, providerWallet, transaction, timeline, isSimulating } = state;
  const timelineRef = useRef<HTMLDivElement>(null);

  // Form states
  const [formData, setFormData] = useState({
    providerAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f8fE21',
    amount: '50',
    description: 'Translate 500 words EN→DE',
    deadlineHours: '24',
    disputeWindowHours: '2',
    disputeReason: '',
    disputeEvidence: '',
    quoteAmount: '50',
    deliveryProof: 'ipfs://QmX7b2J8k9H3z4L5M6N7P8Q9R0S1T2U3V4W5X6Y7Z8A9B0C',
  });

  // Resizable panel states
  const [leftWidth, setLeftWidth] = useState(30);
  const [rightWidth, setRightWidth] = useState(30);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);

  // Flip card states
  const [createTxFlipped, setCreateTxFlipped] = useState(false);
  const [linkEscrowFlipped, setLinkEscrowFlipped] = useState(false);
  const [acceptQuoteFlipped, setAcceptQuoteFlipped] = useState(false);
  const [releaseEscrowFlipped, setReleaseEscrowFlipped] = useState(false);
  const [raiseDisputeFlipped, setRaiseDisputeFlipped] = useState(false);
  const [cancelFlipped, setCancelFlipped] = useState(false);

  // USDC approval state for Link Escrow
  const [usdcApproved, setUsdcApproved] = useState(false);

  // Build playground context for AI Assistant
  const playgroundContext = useMemo((): PlaygroundContext => {
    const stateDescription = transaction
      ? STATE_DESCRIPTIONS[transaction.state] || transaction.state
      : 'No transaction created yet';

    const recentEvents = timeline.slice(-5).map(e => e.description);

    return {
      type: 'advanced-api',
      title: 'Advanced API Playground (Level 2)',
      description: 'Full ACTP protocol control - create transactions, manage escrow, handle state transitions',
      summary: transaction
        ? `Transaction in ${transaction.state} state - ${stateDescription}`
        : 'Ready to create a new transaction - shows full ACTP lifecycle',
      data: {
        transaction: transaction ? {
          id: transaction.id,
          state: transaction.state,
          stateDescription,
          amount: `$${transaction.amount} USDC`,
          escrowLinked: transaction.escrowLinked,
          createdAt: transaction.createdAt ? new Date(transaction.createdAt).toLocaleTimeString() : null,
        } : null,
        requesterWallet: {
          address: requesterWallet.address.slice(0, 10) + '...',
          balance: requesterWallet.usdcBalance,
        },
        providerWallet: {
          address: providerWallet.address.slice(0, 10) + '...',
          balance: providerWallet.usdcBalance,
        },
        formData: {
          amount: formData.amount,
          description: formData.description,
          deadlineHours: formData.deadlineHours,
          disputeWindowHours: formData.disputeWindowHours,
        },
        recentEvents,
        isSimulating,
      },
    };
  }, [transaction, requesterWallet, providerWallet, formData, timeline, isSimulating]);

  // Emit context for AI Assistant
  usePlaygroundContext(playgroundContext);

  // Auto-scroll timeline
  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
    }
  }, [timeline]);

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        const container = document.querySelector('.battle-main') as HTMLElement;
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
          setLeftWidth(Math.min(40, Math.max(20, newWidth)));
        }
      }
      if (isResizingRight) {
        const container = document.querySelector('.battle-main') as HTMLElement;
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const newWidth = ((containerRect.right - e.clientX) / containerRect.width) * 100;
          setRightWidth(Math.min(40, Math.max(20, newWidth)));
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
    };

    if (isResizingLeft || isResizingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingLeft, isResizingRight]);

  const canCreateTransaction = !transaction;
  const canLinkEscrow = transaction?.state === 'INITIATED' && !transaction.escrowLinked;
  const canAcceptQuote = transaction?.state === 'QUOTED';
  const canReleaseEscrow = transaction?.state === 'DELIVERED';
  const canRaiseDispute = transaction?.state === 'DELIVERED';
  const canCancel = transaction && ['INITIATED', 'QUOTED', 'COMMITTED'].includes(transaction.state);
  const canQuote = transaction?.state === 'INITIATED';
  const canStartWork = transaction?.state === 'COMMITTED';
  const canDeliver = transaction && ['COMMITTED', 'IN_PROGRESS'].includes(transaction.state);

  // Determine which panel is active (whose turn it is)
  type ActivePanel = 'requester' | 'provider' | 'system' | null;
  const getActivePanel = (): ActivePanel => {
    if (!transaction) return 'requester'; // Requester creates first
    switch (transaction.state) {
      case 'INITIATED':
        return 'provider'; // Provider should quote or requester links escrow
      case 'QUOTED':
        return 'requester'; // Requester accepts quote
      case 'COMMITTED':
        return 'provider'; // Provider starts work
      case 'IN_PROGRESS':
        return 'provider'; // Provider delivers
      case 'DELIVERED':
        return 'requester'; // Requester releases or disputes
      case 'DISPUTED':
        return 'system'; // System resolves
      case 'SETTLED':
      case 'CANCELLED':
        return null; // No action needed
      default:
        return null;
    }
  };
  const activePanel = getActivePanel();

  // For alternating pulse effect on choice buttons (Release/Dispute, Accept/Cancel)
  const [alternatePulse, setAlternatePulse] = useState(true);
  useEffect(() => {
    if (transaction?.state === 'DELIVERED' || transaction?.state === 'QUOTED') {
      const interval = setInterval(() => {
        setAlternatePulse(prev => !prev);
      }, 2000); // Switch every 2 seconds
      return () => clearInterval(interval);
    }
  }, [transaction?.state]);

  const handleCreateTransaction = () => {
    dispatch({
      type: 'CREATE_TRANSACTION',
      payload: {
        amount: formData.amount,
        description: formData.description,
        deadline: parseInt(formData.deadlineHours) * 3600,
        disputeWindow: parseInt(formData.disputeWindowHours) * 3600,
      },
    });
  };

  const centerWidth = 100 - leftWidth - rightWidth;

  return (
    <div className="battle-container pg-container">
      {/* Header */}
      {!hideHeader && (
        <header className="battle-header">
          <div className="battle-header-left">
            <a href="/playground" className="battle-back-btn">
              <ArrowLeftIcon />
              Back to Playground
            </a>
            <div className="battle-header-divider" />
            <div className="battle-header-title">
              <div className="battle-icon">
                <SwordsIcon />
              </div>
              <div>
                <h1>Agent Battle</h1>
                <p>Dual-agent transaction simulator</p>
              </div>
            </div>
          </div>

          <div className="battle-header-right">
            <div className="battle-network">
              <ZapIcon />
              <span>Base Sepolia (Simulation)</span>
            </div>
            <button
              className="battle-reset-btn"
              onClick={() => dispatch({ type: 'RESET' })}
            >
              <RotateCcwIcon />
              Reset
            </button>
          </div>
        </header>
      )}

      {/* Dispute Resolver */}
      {transaction?.state === 'DISPUTED' && (
        <div className="battle-dispute-bar">
          <div className="battle-dispute-info">
            <AlertTriangleIcon />
            <span>Dispute Resolution Required</span>
            <span className="battle-dispute-reason">"{transaction.disputeReason}"</span>
          </div>
          <div className="battle-dispute-actions">
            <button
              className="battle-resolve-btn refund"
              onClick={() => dispatch({ type: 'RESOLVE_DISPUTE', payload: { resolution: 'refund' } })}
              disabled={!canPerformAction}
            >
              Refund Requester
            </button>
            <button
              className="battle-resolve-btn split"
              onClick={() => dispatch({ type: 'RESOLVE_DISPUTE', payload: { resolution: 'split' } })}
              disabled={!canPerformAction}
            >
              50/50 Split
            </button>
            <button
              className="battle-resolve-btn release"
              onClick={() => dispatch({ type: 'RESOLVE_DISPUTE', payload: { resolution: 'release' } })}
              disabled={!canPerformAction}
            >
              Release to Provider
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="battle-main">
        {/* Requester Panel */}
        <div className="battle-panel requester" style={{ width: `${leftWidth}%` }}>
          <div className="battle-panel-scroll">
            {/* Transaction Status (only shown after creation) */}
            {transaction && (
              <div className="battle-card dashed">
                <div className="battle-card-header">
                  <span>Transaction Status</span>
                  <span className={`battle-badge ${STATE_COLORS[transaction.state]}`}>
                    {transaction.state}
                  </span>
                </div>
                <div className="battle-card-body">
                  <p className="battle-status-desc">{STATE_DESCRIPTIONS[transaction.state]}</p>
                  <div className="battle-status-grid">
                    <div>
                      <span className="muted">Amount:</span>
                      <span className="value">{transaction.amount} USDC</span>
                    </div>
                    <div>
                      <span className="muted">Escrow:</span>
                      <span className="value">{transaction.escrowLinked ? 'Linked' : 'Pending'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Create Transaction - Flippable Card */}
            {canCreateTransaction && (
              <FlipCard
                isFlipped={createTxFlipped}
                onFlip={() => setCreateTxFlipped(!createTxFlipped)}
                variant="requester"
                title="Requester Agent"
                step="Step 1"
                frontContent={
                  <>
                    {/* Wallet Info */}
                    <div className="battle-wallet-info">
                      <div className="battle-wallet-address-full">
                        <WalletIcon />
                        <code>{requesterWallet.address}</code>
                      </div>
                      <div className="battle-balances">
                        <span className="eth-balance">{requesterWallet.ethBalance}</span>
                        <span className="usdc-balance">{requesterWallet.usdcBalance}</span>
                      </div>
                    </div>

                    <div className="battle-form-divider" />

                    {/* Form Fields */}
                    <div className="battle-form-group">
                      <label>Provider Address</label>
                      <input
                        type="text"
                        className="pg-input"
                        value={formData.providerAddress}
                        onChange={(e) => setFormData({ ...formData, providerAddress: e.target.value })}
                        placeholder="0x..."
                      />
                    </div>
                    <div className="battle-form-group">
                      <label>Amount (USDC)</label>
                      <input
                        type="number"
                        className="pg-input"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="100"
                      />
                    </div>
                    <div className="battle-form-group">
                      <label>Description</label>
                      <textarea
                        className="pg-input pg-textarea"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Describe the work..."
                      />
                    </div>
                    <div className="battle-form-row">
                      <div className="battle-form-group">
                        <label>Deadline (hours)</label>
                        <input
                          type="number"
                          className="pg-input"
                          value={formData.deadlineHours}
                          onChange={(e) => setFormData({ ...formData, deadlineHours: e.target.value })}
                        />
                      </div>
                      <div className="battle-form-group">
                        <label>Dispute Window (hours)</label>
                        <input
                          type="number"
                          className="pg-input"
                          value={formData.disputeWindowHours}
                          onChange={(e) => setFormData({ ...formData, disputeWindowHours: e.target.value })}
                        />
                      </div>
                    </div>
                    <button
                      className={`battle-btn primary full-width ${activePanel === 'requester' ? 'pulsing' : 'dimmed'}`}
                      onClick={handleCreateTransaction}
                      disabled={!canPerformAction || !formData.amount}
                    >
                      <SendIcon />
                      Create Transaction
                    </button>
                  </>
                }
                backContent={
                  <>
                    <BattleCodeDisplay
                      language="typescript"
                      comment="// Create a new ACTP transaction"
                      code={`import { ACTPClient } from '@agirails/sdk';
import { parseUnits } from 'ethers';

const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY,
});

const txId = await client.kernel.createTransaction({
  provider: '${formData.providerAddress}',
  amount: parseUnits('${formData.amount}', 6),
  deadline: Math.floor(Date.now() / 1000) + ${Number(formData.deadlineHours) * 3600},
  disputeWindow: ${Number(formData.disputeWindowHours) * 3600},
  metadata: '${formData.description}',
});

console.log('Transaction created:', txId);
// State: INITIATED`}
                    />
                    <button
                      className={`battle-btn primary full-width ${activePanel === 'requester' ? 'pulsing' : 'dimmed'}`}
                      onClick={handleCreateTransaction}
                      disabled={!canPerformAction || !formData.amount}
                    >
                      <SendIcon />
                      Create Transaction
                    </button>
                  </>
                }
              />
            )}

            {/* Link Escrow - Requester Step 2 */}
            {canLinkEscrow && (
              <FlipCard
                isFlipped={linkEscrowFlipped}
                onFlip={() => setLinkEscrowFlipped(!linkEscrowFlipped)}
                variant="requester"
                title="Requester Agent"
                step="Step 2"
                frontContent={
                  <>
                    <div className="battle-form-group">
                      <label>Transaction Amount</label>
                      <div className="battle-info-value">{transaction?.amount} USDC</div>
                    </div>
                    <div className="battle-form-group">
                      <label className="battle-checkbox-label">
                        <input
                          type="checkbox"
                          checked={usdcApproved}
                          onChange={(e) => setUsdcApproved(e.target.checked)}
                          className="battle-checkbox"
                        />
                        <span>USDC Token Approved</span>
                      </label>
                      <span className="battle-form-hint">Approve the kernel contract to spend your USDC</span>
                    </div>
                    <button
                      className={`battle-btn primary full-width ${activePanel === 'requester' ? 'pulsing' : 'dimmed'}`}
                      onClick={() => dispatch({ type: 'LINK_ESCROW' })}
                      disabled={!canPerformAction || !usdcApproved}
                    >
                      <CheckCircleIcon />
                      Link Escrow & Commit
                    </button>
                  </>
                }
                backContent={
                  <>
                    <BattleCodeDisplay
                      language="typescript"
                      comment="// Approve USDC and link escrow to transaction"
                      code={`import { ACTPClient } from '@agirails/sdk';
import { parseUnits } from 'ethers';

const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY,
});

// Step 1: Approve USDC spending
await client.escrow.approveToken(
  parseUnits('${transaction?.amount || '0'}', 6)
);

// Step 2: Link escrow to transaction
await client.escrow.linkEscrow('${formatTxHash(transaction?.id)}');

console.log('Escrow linked successfully');
// State: INITIATED → COMMITTED`}
                    />
                    <button
                      className={`battle-btn primary full-width ${activePanel === 'requester' ? 'pulsing' : 'dimmed'}`}
                      onClick={() => dispatch({ type: 'LINK_ESCROW' })}
                      disabled={!canPerformAction || !usdcApproved}
                    >
                      <CheckCircleIcon />
                      Link Escrow & Commit
                    </button>
                  </>
                }
              />
            )}

            {/* Accept Quote - Requester Step 2 (alternative) */}
            {canAcceptQuote && (
              <FlipCard
                isFlipped={acceptQuoteFlipped}
                onFlip={() => setAcceptQuoteFlipped(!acceptQuoteFlipped)}
                variant="requester"
                title="Requester Agent"
                step="Step 2"
                frontContent={
                  <>
                    <div className="battle-form-group">
                      <label>Provider's Quote</label>
                      <div className="battle-info-value highlight">{transaction?.amount} USDC</div>
                    </div>
                    <div className="battle-form-group">
                      <label className="battle-checkbox-label">
                        <input
                          type="checkbox"
                          checked={usdcApproved}
                          onChange={(e) => setUsdcApproved(e.target.checked)}
                          className="battle-checkbox"
                        />
                        <span>USDC Token Approved</span>
                      </label>
                      <span className="battle-form-hint">Accept quote and fund escrow</span>
                    </div>
                    <button
                      className={`battle-btn primary full-width ${alternatePulse ? 'pulsing' : 'dimmed'}`}
                      onClick={() => dispatch({ type: 'ACCEPT_QUOTE' })}
                      disabled={!canPerformAction}
                    >
                      <CheckCircleIcon />
                      Accept Quote ({transaction?.amount} USDC)
                    </button>
                  </>
                }
                backContent={
                  <>
                    <BattleCodeDisplay
                      language="typescript"
                      comment="// Accept provider's quote and fund escrow"
                      code={`import { ACTPClient } from '@agirails/sdk';
import { parseUnits } from 'ethers';

const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY,
});

// Step 1: Approve USDC spending
await client.escrow.approveToken(
  parseUnits('${transaction?.amount || '0'}', 6)
);

// Step 2: Accept quote and link escrow
await client.escrow.linkEscrow('${formatTxHash(transaction?.id)}');

console.log('Quote accepted, escrow funded');
// State: QUOTED → COMMITTED`}
                    />
                    <button
                      className={`battle-btn primary full-width ${alternatePulse ? 'pulsing' : 'dimmed'}`}
                      onClick={() => dispatch({ type: 'ACCEPT_QUOTE' })}
                      disabled={!canPerformAction}
                    >
                      <CheckCircleIcon />
                      Accept Quote ({transaction?.amount} USDC)
                    </button>
                  </>
                }
              />
            )}

            {/* Release Escrow - Requester Step 4 */}
            {canReleaseEscrow && (
              <FlipCard
                isFlipped={releaseEscrowFlipped}
                onFlip={() => setReleaseEscrowFlipped(!releaseEscrowFlipped)}
                variant="requester"
                title="Requester Agent"
                step="Step 4"
                frontContent={
                  <>
                    <div className="battle-form-group">
                      <label>Delivery Status</label>
                      <div className="battle-info-value success">Work Delivered ✓</div>
                    </div>
                    <div className="battle-form-group">
                      <label>Amount to Release</label>
                      <div className="battle-info-value">{transaction?.amount} USDC</div>
                    </div>
                    <button
                      className={`battle-btn success full-width ${alternatePulse ? 'pulsing' : 'dimmed'}`}
                      onClick={() => dispatch({ type: 'RELEASE_ESCROW' })}
                      disabled={!canPerformAction}
                    >
                      <CheckCircleIcon />
                      Release Escrow
                    </button>
                  </>
                }
                backContent={
                  <>
                    <BattleCodeDisplay
                      language="typescript"
                      comment="// Release escrowed funds to provider"
                      code={`import { ACTPClient } from '@agirails/sdk';

const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY,
});

// Release escrow to provider
await client.escrow.releaseEscrow(
  '${formatTxHash(transaction?.id)}'
);

console.log('Escrow released to provider');
// State: DELIVERED → SETTLED`}
                    />
                    <button
                      className={`battle-btn success full-width ${alternatePulse ? 'pulsing' : 'dimmed'}`}
                      onClick={() => dispatch({ type: 'RELEASE_ESCROW' })}
                      disabled={!canPerformAction}
                    >
                      <CheckCircleIcon />
                      Release Escrow
                    </button>
                  </>
                }
              />
            )}

            {/* Raise Dispute - Requester Step 4 (alternative) */}
            {canRaiseDispute && (
              <FlipCard
                isFlipped={raiseDisputeFlipped}
                onFlip={() => setRaiseDisputeFlipped(!raiseDisputeFlipped)}
                variant="requester"
                title="Requester Agent"
                step="Step 4"
                frontContent={
                  <>
                    <div className="battle-form-group">
                      <label>Dispute Reason</label>
                      <input
                        type="text"
                        className="pg-input"
                        placeholder="e.g., Work not as described"
                        value={formData.disputeReason}
                        onChange={(e) => setFormData({ ...formData, disputeReason: e.target.value })}
                      />
                    </div>
                    <div className="battle-form-group">
                      <label>Evidence (optional)</label>
                      <input
                        type="text"
                        className="pg-input"
                        placeholder="ipfs://... or description"
                        value={formData.disputeEvidence}
                        onChange={(e) => setFormData({ ...formData, disputeEvidence: e.target.value })}
                      />
                    </div>
                    <button
                      className={`battle-btn danger full-width ${!alternatePulse ? 'pulsing' : 'dimmed'}`}
                      onClick={() => dispatch({ type: 'RAISE_DISPUTE', payload: { reason: formData.disputeReason || 'Work not as described' } })}
                      disabled={!canPerformAction}
                    >
                      <AlertTriangleIcon />
                      Raise Dispute
                    </button>
                  </>
                }
                backContent={
                  <>
                    <BattleCodeDisplay
                      language="typescript"
                      comment="// Raise a dispute against delivery"
                      code={`import { ACTPClient } from '@agirails/sdk';

const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY,
});

// Raise dispute with reason and evidence
await client.kernel.raiseDispute(
  '${formatTxHash(transaction?.id)}',
  '${formData.disputeReason || 'Work not as described'}',
  '${formData.disputeEvidence || ''}'
);

console.log('Dispute raised, awaiting resolution');
// State: DELIVERED → DISPUTED`}
                    />
                    <button
                      className={`battle-btn danger full-width ${!alternatePulse ? 'pulsing' : 'dimmed'}`}
                      onClick={() => dispatch({ type: 'RAISE_DISPUTE', payload: { reason: formData.disputeReason || 'Work not as described' } })}
                      disabled={!canPerformAction}
                    >
                      <AlertTriangleIcon />
                      Raise Dispute
                    </button>
                  </>
                }
              />
            )}

            {/* Cancel Transaction - Requester */}
            {canCancel && (
              <FlipCard
                isFlipped={cancelFlipped}
                onFlip={() => setCancelFlipped(!cancelFlipped)}
                variant="requester"
                title="Requester Agent"
                step={transaction?.state === 'INITIATED' ? 'Step 2' : transaction?.state === 'QUOTED' ? 'Step 2' : 'Step 3'}
                frontContent={
                  <>
                    <div className="battle-form-group">
                      <label>Current State</label>
                      <div className="battle-info-value">{transaction?.state}</div>
                    </div>
                    <div className="battle-form-group">
                      <label>Refund Amount</label>
                      <div className="battle-info-value">{transaction?.escrowLinked ? transaction?.amount : '0'} USDC</div>
                      <span className="battle-form-hint">
                        {transaction?.escrowLinked ? 'Escrowed funds will be returned' : 'No funds locked yet'}
                      </span>
                    </div>
                    <button
                      className={`battle-btn outline-danger full-width ${transaction?.state === 'QUOTED' ? (!alternatePulse ? 'pulsing' : 'dimmed') : 'dimmed'}`}
                      onClick={() => dispatch({ type: 'CANCEL' })}
                      disabled={!canPerformAction}
                    >
                      <XCircleIcon />
                      Cancel Transaction
                    </button>
                  </>
                }
                backContent={
                  <>
                    <BattleCodeDisplay
                      language="typescript"
                      comment="// Cancel the transaction"
                      code={`import { ACTPClient, State } from '@agirails/sdk';

const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY,
});

// Cancel transaction (before DELIVERED state)
await client.kernel.transitionState(
  '${formatTxHash(transaction?.id)}',
  State.CANCELLED
);

console.log('Transaction cancelled');
// State: ${transaction?.state} → CANCELLED`}
                    />
                    <button
                      className={`battle-btn outline-danger full-width ${transaction?.state === 'QUOTED' ? (!alternatePulse ? 'pulsing' : 'dimmed') : 'dimmed'}`}
                      onClick={() => dispatch({ type: 'CANCEL' })}
                      disabled={!canPerformAction}
                    >
                      <XCircleIcon />
                      Cancel Transaction
                    </button>
                  </>
                }
              />
            )}
          </div>
        </div>

        {/* Left Resize Handle */}
        <div
          className="battle-resize-handle"
          onMouseDown={() => setIsResizingLeft(true)}
        >
          <div className="battle-resize-grip" />
        </div>

        {/* Timeline Panel */}
        <div className="battle-timeline" style={{ width: `${centerWidth}%` }}>
          <div className="battle-timeline-header">
            <ZapIcon />
            <span>Transaction Flow</span>
            <span className={`battle-badge ${STATE_COLORS[transaction?.state || 'NONE']}`}>
              {transaction?.state || 'NONE'}
            </span>
          </div>

          <div className="battle-timeline-content" ref={timelineRef}>
            {timeline.length === 0 ? (
              <div className="battle-timeline-empty">
                <div className="battle-timeline-empty-icon">
                  <ClockIcon />
                </div>
                <p>Transaction timeline will appear here</p>
                <span>Create a transaction to start the flow</span>
              </div>
            ) : (
              <div className="battle-timeline-events">
                <div className="battle-timeline-line" />
                {timeline.map((event, index) => (
                  <div
                    key={event.id}
                    className={`battle-event ${event.actor}`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className={`battle-event-icon ${event.actor}`}>
                      {event.actor === 'requester' && <UserIcon />}
                      {event.actor === 'provider' && <BotIcon />}
                      {event.actor === 'system' && <ShieldIcon />}
                    </div>
                    <div className="battle-event-content">
                      <div className="battle-event-header">
                        <span className="battle-event-title">{event.title}</span>
                        {event.fromState && event.toState && (
                          <div className="battle-event-states">
                            <span className="battle-state-from">{event.fromState}</span>
                            <ArrowRightIcon />
                            <span className={`battle-state-to ${STATE_COLORS[event.toState]}`}>
                              {event.toState}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="battle-event-desc">{event.description}</p>
                      <div className="battle-event-meta">
                        <span className="battle-event-time">{formatTime(event.timestamp)}</span>
                        {event.txHash && (
                          <a
                            href={`https://sepolia.basescan.org/tx/${event.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="battle-event-tx"
                          >
                            <code>{formatTxHash(event.txHash)}</code>
                            <ExternalLinkIcon />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {isSimulating && (
                  <div className="battle-event simulating">
                    <div className="battle-event-icon simulating">
                      <div className="battle-spinner" />
                    </div>
                    <div className="battle-event-content">
                      <span className="battle-event-title">Processing transaction...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Resize Handle */}
        <div
          className="battle-resize-handle"
          onMouseDown={() => setIsResizingRight(true)}
        >
          <div className="battle-resize-grip" />
        </div>

        {/* Provider Panel */}
        <div className="battle-panel provider" style={{ width: `${rightWidth}%` }}>
          <div className="battle-panel-scroll">
            {/* Wallet Card */}
            <div className="battle-card provider-card">
              <div className="battle-card-header">
                <BotIcon />
                <span className="provider-text">Provider Agent</span>
              </div>
              <div className="battle-card-body">
                <div className="battle-wallet-address">
                  <WalletIcon />
                  <code>{providerWallet.address.slice(0, 6)}...{providerWallet.address.slice(-4)}</code>
                </div>
                <div className="battle-balances">
                  <span className="eth-balance">{providerWallet.ethBalance}</span>
                  <span className="usdc-balance">{providerWallet.usdcBalance}</span>
                </div>
              </div>
            </div>

            {/* Incoming Request */}
            {transaction && (
              <div className="battle-card dashed">
                <div className="battle-card-header">
                  <span>Incoming Request</span>
                  <span className={`battle-badge ${STATE_COLORS[transaction.state]}`}>
                    {transaction.state}
                  </span>
                </div>
                <div className="battle-card-body">
                  <p className="battle-status-desc">{STATE_DESCRIPTIONS[transaction.state]}</p>
                  <div className="battle-request-details">
                    <div className="battle-request-desc">
                      <FileTextIcon />
                      <span>{transaction.description}</span>
                    </div>
                    <div className="battle-request-meta">
                      <div className="battle-request-amount">
                        <span className="muted">Offered:</span>
                        <span className="primary">{transaction.amount} USDC</span>
                      </div>
                      <div className="battle-request-deadline">
                        <ClockIcon />
                        <span>{Math.floor(transaction.deadline / 3600)}h deadline</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* No Transaction */}
            {!transaction && (
              <div className="battle-card dashed flex-center">
                <div className="battle-waiting">
                  <div className="battle-waiting-icon">
                    <ClockIcon />
                  </div>
                  <p>Waiting for incoming transaction...</p>
                  <span>The requester needs to create a transaction first</span>
                </div>
              </div>
            )}

            {/* Quote Form */}
            {canQuote && (
              <div className="battle-card">
                <div className="battle-card-header">
                  <span>Submit Quote (Optional)</span>
                </div>
                <div className="battle-card-body">
                  <div className="battle-form-group">
                    <label>Your Price (USDC)</label>
                    <input
                      type="number"
                      className="pg-input"
                      value={formData.quoteAmount}
                      onChange={(e) => setFormData({ ...formData, quoteAmount: e.target.value })}
                      placeholder="Amount"
                    />
                  </div>
                  <button
                    className={`battle-btn outline full-width ${activePanel === 'provider' ? 'pulsing' : 'dimmed'}`}
                    onClick={() => dispatch({ type: 'QUOTE', payload: { amount: formData.quoteAmount } })}
                    disabled={!canPerformAction}
                  >
                    Submit Quote
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="battle-actions">
              {canStartWork && (
                <button
                  className={`battle-btn warning ${transaction?.state === 'COMMITTED' ? 'pulsing' : 'dimmed'}`}
                  onClick={() => dispatch({ type: 'START_WORK' })}
                  disabled={!canPerformAction}
                >
                  <PlayIcon />
                  Start Work
                </button>
              )}

              {canDeliver && (
                <div className="battle-card">
                  <div className="battle-card-body">
                    <div className="battle-form-group">
                      <label>Delivery Proof (IPFS hash)</label>
                      <input
                        type="text"
                        className="pg-input mono"
                        value={formData.deliveryProof}
                        onChange={(e) => setFormData({ ...formData, deliveryProof: e.target.value })}
                        placeholder="ipfs://..."
                      />
                    </div>
                    <button
                      className={`battle-btn success full-width ${transaction?.state === 'IN_PROGRESS' ? 'pulsing' : 'dimmed'}`}
                      onClick={() => dispatch({ type: 'DELIVER', payload: { proof: formData.deliveryProof } })}
                      disabled={!canPerformAction || !formData.deliveryProof}
                    >
                      <PackageIcon />
                      Deliver Work
                    </button>
                  </div>
                </div>
              )}

              {transaction?.state === 'QUOTED' && (
                <div className="battle-status-box muted">
                  <p>Waiting for requester to accept your quote...</p>
                </div>
              )}

              {transaction?.state === 'DELIVERED' && (
                <div className="battle-status-box success">
                  <p>Work delivered! Waiting for requester to release escrow or dispute window to expire.</p>
                </div>
              )}

              {transaction?.state === 'DISPUTED' && (
                <div className="battle-status-box danger">
                  <p>Dispute raised: "{transaction.disputeReason}"</p>
                  <span>Awaiting arbitration...</span>
                </div>
              )}

              {transaction?.state === 'SETTLED' && (
                <div className="battle-status-box success">
                  <p className="bold">Transaction Complete!</p>
                  <span>Payment has been finalized.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="battle-footer">
        <div className="battle-footer-legend">
          <span><span className="requester-text">Requester</span> creates transactions and releases funds</span>
          <span className="divider">|</span>
          <span><span className="provider-text">Provider</span> quotes, works, and delivers</span>
          <span className="divider">|</span>
          <span><span className="system-text">System</span> resolves disputes</span>
        </div>
        <div className="battle-footer-info">
          Learn the full ACTP protocol flow by simulating both sides
        </div>
      </footer>
    </div>
  );
}
