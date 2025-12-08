import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BattleState, BattleAction } from '@/types/battle';
import { Scale, UserCheck, RefreshCw, Split } from 'lucide-react';

interface DisputeResolverProps {
  state: BattleState;
  dispatch: (action: BattleAction) => void;
  disabled: boolean;
}

export default function DisputeResolver({ state, dispatch, disabled }: DisputeResolverProps) {
  const { transaction } = state;

  if (!transaction || transaction.state !== 'DISPUTED') {
    return null;
  }

  return (
    <Card className="border-red-500/30 bg-red-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Scale className="h-4 w-4 text-red-400" />
          <span className="text-red-400">Dispute Resolution</span>
          <Badge variant="outline" className="ml-auto text-red-400 border-red-500/30">
            Arbitration Required
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-card/50 p-3 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Dispute Reason:</p>
          <p className="text-sm font-medium">"{transaction.disputeReason}"</p>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>As the arbitrator, you can resolve this dispute in one of three ways:</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            onClick={() => dispatch({ type: 'RESOLVE_DISPUTE', payload: { resolution: 'refund' } })}
            disabled={disabled}
            variant="outline"
            className="h-auto py-3 flex-col gap-1 border-blue-500/30 hover:bg-blue-500/10"
          >
            <UserCheck className="h-5 w-5 text-blue-400" />
            <span className="text-xs font-medium">Refund</span>
            <span className="text-[10px] text-muted-foreground">100% to Requester</span>
          </Button>

          <Button
            onClick={() => dispatch({ type: 'RESOLVE_DISPUTE', payload: { resolution: 'split' } })}
            disabled={disabled}
            variant="outline"
            className="h-auto py-3 flex-col gap-1 border-yellow-500/30 hover:bg-yellow-500/10"
          >
            <Split className="h-5 w-5 text-yellow-400" />
            <span className="text-xs font-medium">Split</span>
            <span className="text-[10px] text-muted-foreground">50/50 Both</span>
          </Button>

          <Button
            onClick={() => dispatch({ type: 'RESOLVE_DISPUTE', payload: { resolution: 'release' } })}
            disabled={disabled}
            variant="outline"
            className="h-auto py-3 flex-col gap-1 border-purple-500/30 hover:bg-purple-500/10"
          >
            <RefreshCw className="h-5 w-5 text-purple-400" />
            <span className="text-xs font-medium">Release</span>
            <span className="text-[10px] text-muted-foreground">100% to Provider</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
