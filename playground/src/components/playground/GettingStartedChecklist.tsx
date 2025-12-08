import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Check, AlertTriangle, ExternalLink, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WalletState } from '@/types/playground';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'agirails-checklist-progress';

interface ChecklistStep {
  id: string;
  title: string;
  description: string;
  time: string;
  completed: boolean;
  warning?: boolean;
  link?: string;
  autoDetect?: boolean;
  preConfigured?: boolean;
}

interface StoredProgress {
  installCompleted: boolean;
  envCompleted: boolean;
  tokensCompleted: boolean;
  firstVisitAt?: number;
}

interface GettingStartedChecklistProps {
  wallet: WalletState;
  hasSimulated: boolean;
  hasExecuted: boolean;
  onReset?: () => void;
}

function getStoredProgress(): StoredProgress {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore localStorage errors
  }
  return {
    installCompleted: false,
    envCompleted: false,
    tokensCompleted: false,
  };
}

function saveProgress(progress: StoredProgress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore localStorage errors
  }
}

export default function GettingStartedChecklist({ 
  wallet, 
  hasSimulated, 
  hasExecuted,
  onReset 
}: GettingStartedChecklistProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [progress, setProgress] = useState<StoredProgress>(getStoredProgress);

  // Auto-mark first two steps on first visit (simulating SDK already installed in playground)
  useEffect(() => {
    if (!progress.firstVisitAt) {
      const newProgress = {
        ...progress,
        installCompleted: true,
        envCompleted: true,
        firstVisitAt: Date.now(),
      };
      setProgress(newProgress);
      saveProgress(newProgress);
    }
  }, []);

  // Auto-detect wallet connection and persist
  useEffect(() => {
    if (wallet.connected && !progress.tokensCompleted) {
      // Mark tokens as completed when wallet is connected (assumes they have tokens)
      const newProgress = { ...progress, tokensCompleted: true };
      setProgress(newProgress);
      saveProgress(newProgress);
    }
  }, [wallet.connected]);

  // Persist simulation and execution status
  useEffect(() => {
    if (hasSimulated || hasExecuted) {
      saveProgress(progress);
    }
  }, [hasSimulated, hasExecuted, progress]);

  const handleReset = () => {
    const resetProgress: StoredProgress = {
      installCompleted: true,
      envCompleted: true,
      tokensCompleted: false,
    };
    setProgress(resetProgress);
    saveProgress(resetProgress);
    onReset?.();
  };

  const steps: ChecklistStep[] = [
    { 
      id: 'install', 
      title: 'Install SDK', 
      description: 'npm install @agirails/sdk · pip install agirails', 
      time: '~30 sec',
      completed: progress.installCompleted,
      preConfigured: true,
    },
    { 
      id: 'env', 
      title: 'Configure Environment', 
      description: 'Create .env with PRIVATE_KEY', 
      time: '~1 min',
      completed: progress.envCompleted,
      preConfigured: true,
    },
    { 
      id: 'wallet', 
      title: 'Connect Wallet', 
      description: wallet.connected 
        ? `🟢 Connected: ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` 
        : 'Connect your wallet',
      time: '~30 sec',
      completed: wallet.connected,
      autoDetect: true,
    },
    { 
      id: 'tokens', 
      title: 'Get Testnet Tokens', 
      description: 'Simulated in Playground',
      time: '~2 min',
      completed: progress.tokensCompleted,
      warning: !progress.tokensCompleted,
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

  const completedCount = steps.filter(s => s.completed).length;
  const progress_percentage = (completedCount / steps.length) * 100;
  const allComplete = completedCount === steps.length;

  return (
    <div className="card-surface overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors duration-200"
      >
        <div className="flex items-center gap-4">
          <h3 className="font-semibold text-foreground">Getting Started Checklist</h3>
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  allComplete ? "bg-success" : "bg-primary"
                )}
                style={{ width: `${progress_percentage}%` }}
              />
            </div>
            <span className={cn(
              "text-sm",
              allComplete ? "text-success" : "text-muted-foreground"
            )}>
              {completedCount}/{steps.length} Complete
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {allComplete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-2 animate-fade-in">
          {steps.map((step) => (
            <div 
              key={step.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg transition-colors duration-200",
                step.completed ? "bg-success/5" : "bg-secondary/30"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-5 h-5 rounded flex items-center justify-center transition-colors duration-200",
                  step.completed ? "bg-success" : step.warning ? "bg-warning" : "bg-secondary"
                )}>
                  {step.completed ? (
                    <Check className="w-3 h-3 text-success-foreground" />
                  ) : step.warning ? (
                    <AlertTriangle className="w-3 h-3 text-warning-foreground" />
                  ) : (
                    <div className="w-2 h-2 rounded-sm bg-muted-foreground" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className={cn(
                      "text-sm font-medium",
                      step.completed ? "line-through text-muted-foreground" : "text-muted-foreground"
                    )}>
                      {step.title}
                    </p>
                    {step.autoDetect && !step.completed && !step.preConfigured && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                        Auto-detect
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    {step.description}
                    {step.link && (
                      <a 
                        href={step.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline ml-1 inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{step.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
