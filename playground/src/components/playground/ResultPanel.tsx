import { useState } from 'react';
import { Check, X, RotateCcw, Rocket, Clock, FileText, Zap, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SimulationResult } from '@/types/playground';
import { cn } from '@/lib/utils';

interface ResultPanelProps {
  result: SimulationResult;
  onRetry: () => void;
  formAmount?: string;
}

type Tab = 'stateChanges' | 'events' | 'gasAndFees';

export default function ResultPanel({ result, onRetry, formAmount }: ResultPanelProps) {
  const platformFee = formAmount ? (parseFloat(formAmount) * 0.01).toFixed(2) : '1.00';
  const [activeTab, setActiveTab] = useState<Tab>('stateChanges');

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'stateChanges', label: 'State Changes', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'events', label: 'Events', icon: <Zap className="w-3.5 h-3.5" /> },
    { id: 'gasAndFees', label: 'Gas & Fees', icon: <DollarSign className="w-3.5 h-3.5" /> },
  ];

  const renderEmptyState = (type: string, isQueryMethod?: boolean) => (
    <div className="py-8 text-center">
      <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-3">
        {type === 'stateChanges' && <FileText className="w-5 h-5 text-muted-foreground" />}
        {type === 'events' && <Zap className="w-5 h-5 text-muted-foreground" />}
      </div>
      <p className="text-sm text-muted-foreground mb-1">
        {type === 'stateChanges' && 'No state changes'}
        {type === 'events' && (isQueryMethod ? 'Query methods don\'t emit events' : 'No events emitted')}
      </p>
      {!isQueryMethod && (
        <p className="text-xs text-muted-foreground">
          Run a simulation to see {type === 'stateChanges' ? 'state transitions' : 'emitted events'}
        </p>
      )}
    </div>
  );

  // Check if this is a query method (no events but has gas cost of 0)
  const isQueryMethod = result.status === 'success' && result.gasEstimate === 0;

  return (
    <div className="card-surface">
      <div className="flex items-center border-b border-secondary">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "tab-button flex items-center gap-1.5",
              activeTab === tab.id && "active"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {result.status === 'idle' && (
          <div className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
              <Rocket className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-2">
              Run a simulation to see results
            </p>
            <p className="text-xs text-muted-foreground">
              Fill in the parameters and click "Simulate Transaction"
            </p>
          </div>
        )}

        {result.status === 'loading' && (
          <div className="space-y-3 py-4">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-4 w-2/3" />
          </div>
        )}

        {result.status === 'success' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 text-success">
              <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center">
                <Check className="w-4 h-4" />
              </div>
              <span className="font-semibold">Simulation Successful</span>
            </div>

            {activeTab === 'stateChanges' && (
              result.stateChanges && result.stateChanges.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-3">
                    The following state changes will occur:
                  </p>
                  {result.stateChanges.map((change, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg transition-colors duration-200 hover:bg-secondary/40">
                      <span className="text-sm text-muted-foreground w-36 shrink-0">{change.field}</span>
                      <code className="font-mono text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                        {change.from}
                      </code>
                      <span className="text-primary">→</span>
                      <code className="font-mono text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                        {change.to}
                      </code>
                    </div>
                  ))}
                </div>
              ) : renderEmptyState('stateChanges')
            )}

            {activeTab === 'events' && (
              result.events && result.events.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground mb-3">
                    The following events will be emitted:
                  </p>
                  {result.events.map((event, i) => (
                    <div key={i} className="p-4 bg-secondary/30 rounded-lg transition-colors duration-200 hover:bg-secondary/40">
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="w-4 h-4 text-warning" />
                        <p className="font-mono text-sm text-foreground font-medium">{event.name}</p>
                        <span className="text-xs text-muted-foreground">(indexed)</span>
                      </div>
                      <div className="space-y-2 pl-6 border-l-2 border-secondary">
                        {Object.entries(event.args).map(([key, value]) => (
                          <div key={key} className="flex gap-2 text-xs">
                            <span className="text-muted-foreground font-medium min-w-[80px]">{key}:</span>
                            <code className="font-mono text-foreground bg-secondary/50 px-1.5 py-0.5 rounded">
                              {value}
                            </code>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : renderEmptyState('events', isQueryMethod)
            )}

            {activeTab === 'gasAndFees' && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground mb-3">
                  Estimated costs for this transaction:
                </p>
                <div className="flex justify-between p-3 bg-secondary/30 rounded-lg">
                  <span className="text-muted-foreground">Gas Estimate</span>
                  <span className="font-mono text-foreground">
                    ~{result.gasEstimate?.toLocaleString()} ({result.gasCostUsd})
                  </span>
                </div>
                <div className="flex justify-between p-3 bg-secondary/30 rounded-lg">
                  <span className="text-muted-foreground">Platform Fee</span>
                  <span className="font-mono text-foreground">${platformFee} USDC (1%)</span>
                </div>
                <div className="flex justify-between p-3 bg-secondary/30 rounded-lg">
                  <span className="text-muted-foreground">Network</span>
                  <span className="font-mono text-foreground">Base Sepolia</span>
                </div>
                <div className="flex justify-between p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Est. Confirmation</span>
                  </div>
                  <span className="font-mono text-foreground">~2-4 seconds</span>
                </div>
              </div>
            )}
          </div>
        )}

        {result.status === 'error' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 text-destructive">
              <div className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center">
                <X className="w-4 h-4" />
              </div>
              <span className="font-semibold">Transaction Failed</span>
            </div>
            
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-sm text-foreground">{result.error}</p>
            </div>

            <Button variant="outline" onClick={onRetry} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Try Again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
