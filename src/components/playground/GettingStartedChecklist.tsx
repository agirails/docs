import { useState } from 'react';
import { WalletState } from '../../types/playground';

interface GettingStartedChecklistProps {
  wallet: WalletState;
  hasSimulated: boolean;
  hasExecuted: boolean;
  onReset?: () => void;
}

interface Step {
  id: string;
  title: string;
  description: string;
  time: string;
  completed: boolean;
  warning?: boolean;
  autoDetect?: boolean;
}

export default function GettingStartedChecklist({
  wallet,
  hasSimulated,
  hasExecuted,
}: GettingStartedChecklistProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const steps: Step[] = [
    {
      id: 'install',
      title: 'Install SDK',
      description: 'npm install @agirails/sdk · pip install agirails',
      time: '~30 sec',
      completed: true,
    },
    {
      id: 'env',
      title: 'Configure Environment',
      description: 'Create .env with PRIVATE_KEY',
      time: '~1 min',
      completed: true,
    },
    {
      id: 'wallet',
      title: 'Connect Wallet',
      description: wallet.connected
        ? `Connected: ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
        : 'Connect your wallet',
      time: '~30 sec',
      completed: wallet.connected,
      warning: !wallet.connected,
      autoDetect: true,
    },
    {
      id: 'tokens',
      title: 'Get Testnet Tokens',
      description: wallet.connected ? '✓ Simulated in Playground' : 'Simulated in Playground',
      time: '~2 min',
      completed: wallet.connected,
      warning: !wallet.connected,
    },
    {
      id: 'simulate',
      title: 'Run First Simulation',
      description: hasSimulated ? '✓ Simulation completed' : 'Test your transaction',
      time: '~1 min',
      completed: hasSimulated,
      autoDetect: true,
    },
    {
      id: 'execute',
      title: 'Execute First Transaction',
      description: hasExecuted ? '✓ Transaction executed' : 'Send to testnet',
      time: '~2 min',
      completed: hasExecuted,
      autoDetect: true,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercentage = (completedCount / steps.length) * 100;

  const CheckIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  const WarningIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );

  const ChevronIcon = () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{
        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.2s ease',
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );

  return (
    <div className="pg-checklist">
      <div
        className="pg-checklist-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="pg-checklist-header-left">
          <span className="pg-checklist-title">Getting Started Checklist</span>
          <div className="pg-checklist-progress">
            <div className="pg-checklist-progress-bar">
              <div
                className="pg-checklist-progress-fill"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <span className="pg-checklist-progress-text">
              {completedCount}/{steps.length} Complete
            </span>
          </div>
        </div>
        <div className="pg-checklist-header-right">
          <ChevronIcon />
        </div>
      </div>

      {isExpanded && (
        <div className="pg-checklist-steps">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`pg-checklist-step ${step.completed ? 'completed' : ''} ${step.warning && !step.completed ? 'warning' : ''}`}
            >
              <div className="pg-checklist-step-left">
                <div
                  className={`pg-checklist-step-icon ${
                    step.completed ? 'completed' : step.warning ? 'warning' : ''
                  }`}
                >
                  {step.completed ? (
                    <CheckIcon />
                  ) : step.warning ? (
                    <WarningIcon />
                  ) : (
                    <div className="pg-checklist-step-dot" />
                  )}
                </div>
                <div className="pg-checklist-step-content">
                  <div className="pg-checklist-step-title-row">
                    <span className={`pg-checklist-step-title ${step.completed ? 'completed' : ''}`}>
                      {step.title}
                    </span>
                    {step.autoDetect && !step.completed && (
                      <span className="pg-checklist-step-badge">Auto-detect</span>
                    )}
                  </div>
                  <span className="pg-checklist-step-desc">{step.description}</span>
                </div>
              </div>
              <span className="pg-checklist-step-time">{step.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
