import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { useBattleState } from '@/hooks/useBattleState';
import RequesterPanel from '@/components/battle/RequesterPanel';
import ProviderPanel from '@/components/battle/ProviderPanel';
import TransactionTimeline from '@/components/battle/TransactionTimeline';
import DisputeResolver from '@/components/battle/DisputeResolver';
import { ArrowLeft, RotateCcw, Swords, Zap } from 'lucide-react';

export default function Battle() {
  const { state, dispatch, canPerformAction } = useBattleState();

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-secondary flex items-center justify-between px-6 bg-card flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Playground
            </Button>
          </Link>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
              <Swords className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Agent Battle</h1>
              <p className="text-xs text-muted-foreground">Dual-agent transaction simulator</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
            <Zap className="h-3 w-3 text-primary" />
            <span>Base Sepolia (Simulation)</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => dispatch({ type: 'RESET' })}
            className="gap-2"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Dispute Resolver (shows when in DISPUTED state) */}
        {state.transaction?.state === 'DISPUTED' && (
          <div className="p-4 border-b border-secondary bg-card/50">
            <DisputeResolver
              state={state}
              dispatch={dispatch}
              disabled={!canPerformAction}
            />
          </div>
        )}

        {/* Three-panel layout */}
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Requester Panel (Left) */}
          <ResizablePanel defaultSize={30} minSize={25} maxSize={40}>
            <div className="h-full border-r border-secondary bg-gradient-to-br from-blue-500/5 to-transparent overflow-y-auto">
              <RequesterPanel
                state={state}
                dispatch={dispatch}
                disabled={!canPerformAction}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Timeline (Center) */}
          <ResizablePanel defaultSize={40} minSize={30}>
            <div className="h-full p-4 overflow-hidden">
              <TransactionTimeline
                events={state.timeline}
                currentState={state.transaction?.state || 'NONE'}
                isSimulating={state.isSimulating}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Provider Panel (Right) */}
          <ResizablePanel defaultSize={30} minSize={25} maxSize={40}>
            <div className="h-full border-l border-secondary bg-gradient-to-bl from-purple-500/5 to-transparent overflow-y-auto">
              <ProviderPanel
                state={state}
                dispatch={dispatch}
                disabled={!canPerformAction}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Footer */}
      <footer className="h-12 border-t border-secondary flex items-center justify-between px-6 bg-card/50 flex-shrink-0">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>
            <span className="text-blue-400 font-medium">Requester</span>
            {' '}creates transactions and releases funds
          </span>
          <span className="text-muted-foreground/30">|</span>
          <span>
            <span className="text-purple-400 font-medium">Provider</span>
            {' '}quotes, works, and delivers
          </span>
          <span className="text-muted-foreground/30">|</span>
          <span>
            <span className="text-emerald-400 font-medium">System</span>
            {' '}resolves disputes
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          Learn the full ACTP protocol flow by simulating both sides
        </div>
      </footer>
    </div>
  );
}
