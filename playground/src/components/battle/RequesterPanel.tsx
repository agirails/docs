import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BattleState, BattleAction, STATE_COLORS, STATE_DESCRIPTIONS } from '@/types/battle';
import { User, Wallet, Send, XCircle, AlertTriangle, CheckCircle } from 'lucide-react';

interface RequesterPanelProps {
  state: BattleState;
  dispatch: (action: BattleAction) => void;
  disabled: boolean;
}

export default function RequesterPanel({ state, dispatch, disabled }: RequesterPanelProps) {
  const { requesterWallet, transaction } = state;
  const [formData, setFormData] = useState({
    amount: '50',
    description: 'Translate 500 words EN→DE',
    deadlineHours: '24',
    disputeWindowHours: '2',
    disputeReason: '',
  });

  const canCreateTransaction = !transaction;
  const canLinkEscrow = transaction?.state === 'INITIATED' && !transaction.escrowLinked;
  const canAcceptQuote = transaction?.state === 'QUOTED';
  const canReleaseEscrow = transaction?.state === 'DELIVERED';
  const canRaiseDispute = transaction?.state === 'DELIVERED';
  const canCancel = transaction && ['INITIATED', 'QUOTED', 'COMMITTED'].includes(transaction.state);

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

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {/* Wallet Info */}
      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <User className="h-4 w-4 text-blue-400" />
            <span className="text-blue-400">Requester Agent</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <Wallet className="h-3 w-3 text-muted-foreground" />
            <code className="text-muted-foreground">
              {requesterWallet.address.slice(0, 6)}...{requesterWallet.address.slice(-4)}
            </code>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-muted-foreground">{requesterWallet.ethBalance}</span>
            <span className="font-medium text-primary">{requesterWallet.usdcBalance}</span>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Status */}
      {transaction && (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Transaction Status</span>
              <Badge className={`${STATE_COLORS[transaction.state]} border`}>
                {transaction.state}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground text-xs">
              {STATE_DESCRIPTIONS[transaction.state]}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Amount:</span>
                <span className="ml-2 font-medium">{transaction.amount} USDC</span>
              </div>
              <div>
                <span className="text-muted-foreground">Escrow:</span>
                <span className="ml-2">{transaction.escrowLinked ? 'Linked' : 'Pending'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Transaction Form */}
      {canCreateTransaction && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Create Transaction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="amount" className="text-xs">Amount (USDC)</Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="100"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="description" className="text-xs">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the work..."
                className="text-sm min-h-[60px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="deadline" className="text-xs">Deadline (hours)</Label>
                <Input
                  id="deadline"
                  type="number"
                  value={formData.deadlineHours}
                  onChange={(e) => setFormData({ ...formData, deadlineHours: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="disputeWindow" className="text-xs">Dispute Window (hours)</Label>
                <Input
                  id="disputeWindow"
                  type="number"
                  value={formData.disputeWindowHours}
                  onChange={(e) => setFormData({ ...formData, disputeWindowHours: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <Button
              onClick={handleCreateTransaction}
              disabled={disabled || !formData.amount}
              className="w-full h-8 text-sm"
            >
              <Send className="h-3 w-3 mr-2" />
              Create Transaction
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 mt-auto">
        {canLinkEscrow && (
          <Button
            onClick={() => dispatch({ type: 'LINK_ESCROW' })}
            disabled={disabled}
            variant="default"
            className="h-9"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Link Escrow & Commit
          </Button>
        )}

        {canAcceptQuote && (
          <Button
            onClick={() => dispatch({ type: 'ACCEPT_QUOTE' })}
            disabled={disabled}
            variant="default"
            className="h-9"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Accept Quote ({transaction?.amount} USDC)
          </Button>
        )}

        {canReleaseEscrow && (
          <Button
            onClick={() => dispatch({ type: 'RELEASE_ESCROW' })}
            disabled={disabled}
            variant="default"
            className="h-9 bg-emerald-600 hover:bg-emerald-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Release Escrow
          </Button>
        )}

        {canRaiseDispute && (
          <div className="space-y-2">
            <Input
              placeholder="Reason for dispute..."
              value={formData.disputeReason}
              onChange={(e) => setFormData({ ...formData, disputeReason: e.target.value })}
              className="h-8 text-sm"
            />
            <Button
              onClick={() => dispatch({ type: 'RAISE_DISPUTE', payload: { reason: formData.disputeReason || 'Work not as described' } })}
              disabled={disabled}
              variant="destructive"
              className="w-full h-9"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Raise Dispute
            </Button>
          </div>
        )}

        {canCancel && (
          <Button
            onClick={() => dispatch({ type: 'CANCEL' })}
            disabled={disabled}
            variant="outline"
            className="h-9 border-destructive text-destructive hover:bg-destructive/10"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Cancel Transaction
          </Button>
        )}
      </div>
    </div>
  );
}
