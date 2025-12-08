import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { BattleState, BattleAction, STATE_COLORS, STATE_DESCRIPTIONS } from '@/types/battle';
import { Bot, Wallet, Play, Package, FileText, Clock } from 'lucide-react';

interface ProviderPanelProps {
  state: BattleState;
  dispatch: (action: BattleAction) => void;
  disabled: boolean;
}

export default function ProviderPanel({ state, dispatch, disabled }: ProviderPanelProps) {
  const { providerWallet, transaction } = state;
  const [formData, setFormData] = useState({
    quoteAmount: '50',
    deliveryProof: 'ipfs://QmX7b2J8k9H3z4L5M6N7P8Q9R0S1T2U3V4W5X6Y7Z8A9B0C',
  });

  const hasTransaction = !!transaction;
  const canQuote = transaction?.state === 'INITIATED';
  const canStartWork = transaction?.state === 'COMMITTED';
  const canDeliver = transaction && ['COMMITTED', 'IN_PROGRESS'].includes(transaction.state);
  const isWaiting = hasTransaction && ['INITIATED', 'QUOTED'].includes(transaction.state);
  const isTerminal = transaction && ['SETTLED', 'CANCELLED', 'DISPUTED'].includes(transaction.state);

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {/* Wallet Info */}
      <Card className="bg-purple-500/5 border-purple-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Bot className="h-4 w-4 text-purple-400" />
            <span className="text-purple-400">Provider Agent</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <Wallet className="h-3 w-3 text-muted-foreground" />
            <code className="text-muted-foreground">
              {providerWallet.address.slice(0, 6)}...{providerWallet.address.slice(-4)}
            </code>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-muted-foreground">{providerWallet.ethBalance}</span>
            <span className="font-medium text-primary">{providerWallet.usdcBalance}</span>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Status */}
      {transaction && (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Incoming Request</span>
              <Badge className={`${STATE_COLORS[transaction.state]} border`}>
                {transaction.state}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground text-xs">
              {STATE_DESCRIPTIONS[transaction.state]}
            </p>
            <div className="bg-muted/50 p-3 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <FileText className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">{transaction.description}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Offered:</span>
                  <span className="font-medium text-primary">{transaction.amount} USDC</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{Math.floor(transaction.deadline / 3600)}h deadline</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Transaction State */}
      {!hasTransaction && (
        <Card className="flex-1 flex items-center justify-center border-dashed">
          <CardContent className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Waiting for incoming transaction...
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              The requester needs to create a transaction first
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quote Form */}
      {canQuote && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Submit Quote (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="quoteAmount" className="text-xs">Your Price (USDC)</Label>
              <Input
                id="quoteAmount"
                type="number"
                value={formData.quoteAmount}
                onChange={(e) => setFormData({ ...formData, quoteAmount: e.target.value })}
                placeholder="Amount"
                className="h-8 text-sm"
              />
            </div>
            <Button
              onClick={() => dispatch({ type: 'QUOTE', payload: { amount: formData.quoteAmount } })}
              disabled={disabled}
              variant="outline"
              className="w-full h-8 text-sm"
            >
              Submit Quote
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 mt-auto">
        {canStartWork && (
          <Button
            onClick={() => dispatch({ type: 'START_WORK' })}
            disabled={disabled}
            variant="default"
            className="h-9 bg-yellow-600 hover:bg-yellow-700"
          >
            <Play className="h-4 w-4 mr-2" />
            Start Work
          </Button>
        )}

        {canDeliver && (
          <Card className="p-3">
            <div className="space-y-2">
              <Label htmlFor="proof" className="text-xs">Delivery Proof (IPFS hash)</Label>
              <Input
                id="proof"
                value={formData.deliveryProof}
                onChange={(e) => setFormData({ ...formData, deliveryProof: e.target.value })}
                placeholder="ipfs://..."
                className="h-8 text-sm font-mono"
              />
              <Button
                onClick={() => dispatch({ type: 'DELIVER', payload: { proof: formData.deliveryProof } })}
                disabled={disabled || !formData.deliveryProof}
                variant="default"
                className="w-full h-9 bg-green-600 hover:bg-green-700"
              >
                <Package className="h-4 w-4 mr-2" />
                Deliver Work
              </Button>
            </div>
          </Card>
        )}

        {isWaiting && transaction.state === 'QUOTED' && (
          <div className="bg-muted/50 p-3 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">
              Waiting for requester to accept your quote...
            </p>
          </div>
        )}

        {transaction?.state === 'DELIVERED' && (
          <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-lg text-center">
            <p className="text-xs text-green-400">
              Work delivered! Waiting for requester to release escrow or dispute window to expire.
            </p>
          </div>
        )}

        {transaction?.state === 'DISPUTED' && (
          <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center">
            <p className="text-xs text-red-400">
              Dispute raised: "{transaction.disputeReason}"
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting arbitration...
            </p>
          </div>
        )}

        {transaction?.state === 'SETTLED' && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-center">
            <p className="text-xs text-emerald-400 font-medium">
              Transaction Complete!
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Payment has been finalized.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
