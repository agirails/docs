import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TimelineEvent, TransactionState, STATE_COLORS } from '@/types/battle';
import {
  ArrowRight,
  User,
  Bot,
  Shield,
  Clock,
  ExternalLink,
  Zap
} from 'lucide-react';

interface TransactionTimelineProps {
  events: TimelineEvent[];
  currentState: TransactionState;
  isSimulating: boolean;
}

const ACTOR_ICONS = {
  requester: User,
  provider: Bot,
  system: Shield,
};

const ACTOR_COLORS = {
  requester: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  provider: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  system: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

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

export default function TransactionTimeline({
  events,
  currentState,
  isSimulating
}: TransactionTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span>Transaction Flow</span>
          </div>
          <Badge className={`${STATE_COLORS[currentState]} border`}>
            {currentState}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 p-0 min-h-0">
        <ScrollArea className="h-full" ref={scrollRef}>
          <div className="p-4 space-y-4">
            {events.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-muted-foreground animate-pulse" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Transaction timeline will appear here
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create a transaction to start the flow
                </p>
              </div>
            ) : (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border" />

                {/* Events */}
                <div className="space-y-4">
                  {events.map((event, index) => {
                    const ActorIcon = ACTOR_ICONS[event.actor];
                    const actorColor = ACTOR_COLORS[event.actor];

                    return (
                      <div
                        key={event.id}
                        className="relative flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {/* Icon */}
                        <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full border flex items-center justify-center ${actorColor}`}>
                          <ActorIcon className="h-4 w-4" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{event.title}</span>
                            {event.fromState && event.toState && (
                              <div className="flex items-center gap-1 text-xs">
                                <Badge variant="outline" className="py-0 px-1 text-[10px]">
                                  {event.fromState}
                                </Badge>
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                <Badge className={`${STATE_COLORS[event.toState]} border py-0 px-1 text-[10px]`}>
                                  {event.toState}
                                </Badge>
                              </div>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground mt-0.5">
                            {event.description}
                          </p>

                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[10px] text-muted-foreground">
                              {formatTime(event.timestamp)}
                            </span>
                            {event.txHash && (
                              <a
                                href={`https://sepolia.basescan.org/tx/${event.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                              >
                                <code>{formatTxHash(event.txHash)}</code>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Simulating indicator */}
                  {isSimulating && (
                    <div className="relative flex gap-3 animate-pulse">
                      <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center">
                        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                      <div className="flex-1 flex items-center">
                        <span className="text-sm text-muted-foreground">Processing transaction...</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
