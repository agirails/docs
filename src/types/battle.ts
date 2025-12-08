// Agent Battle Types

export type TransactionState =
  | 'NONE'
  | 'INITIATED'
  | 'QUOTED'
  | 'COMMITTED'
  | 'IN_PROGRESS'
  | 'DELIVERED'
  | 'SETTLED'
  | 'DISPUTED'
  | 'CANCELLED';

export interface BattleWallet {
  address: string;
  label: string;
  ethBalance: string;
  usdcBalance: string;
  role: 'requester' | 'provider';
}

export interface BattleTransaction {
  id: string;
  state: TransactionState;
  amount: string;
  description: string;
  deadline: number;
  disputeWindow: number;
  createdAt: number;
  updatedAt: number;
  escrowLinked: boolean;
  attestation?: string;
  deliveryProof?: string;
  disputeReason?: string;
}

export interface TimelineEvent {
  id: string;
  type: 'state_change' | 'action' | 'system';
  actor: 'requester' | 'provider' | 'system';
  title: string;
  description: string;
  timestamp: number;
  txHash?: string;
  fromState?: TransactionState;
  toState?: TransactionState;
}

export interface BattleState {
  requesterWallet: BattleWallet;
  providerWallet: BattleWallet;
  transaction: BattleTransaction | null;
  timeline: TimelineEvent[];
  isSimulating: boolean;
}

export type BattleAction =
  | { type: 'CREATE_TRANSACTION'; payload: { amount: string; description: string; deadline: number; disputeWindow: number } }
  | { type: 'LINK_ESCROW' }
  | { type: 'QUOTE'; payload: { amount: string } }
  | { type: 'ACCEPT_QUOTE' }
  | { type: 'START_WORK' }
  | { type: 'DELIVER'; payload: { proof: string } }
  | { type: 'RELEASE_ESCROW' }
  | { type: 'RAISE_DISPUTE'; payload: { reason: string } }
  | { type: 'RESOLVE_DISPUTE'; payload: { resolution: 'refund' | 'release' | 'split' } }
  | { type: 'CANCEL' }
  | { type: 'RESET' };

export const STATE_COLORS: Record<TransactionState, string> = {
  'NONE': 'state-none',
  'INITIATED': 'state-initiated',
  'QUOTED': 'state-quoted',
  'COMMITTED': 'state-committed',
  'IN_PROGRESS': 'state-in-progress',
  'DELIVERED': 'state-delivered',
  'SETTLED': 'state-settled',
  'DISPUTED': 'state-disputed',
  'CANCELLED': 'state-cancelled',
};

export const STATE_DESCRIPTIONS: Record<TransactionState, string> = {
  'NONE': 'No transaction created yet',
  'INITIATED': 'Transaction created, awaiting escrow link',
  'QUOTED': 'Provider submitted a price quote',
  'COMMITTED': 'Escrow linked, provider committed to work',
  'IN_PROGRESS': 'Provider actively working on the service',
  'DELIVERED': 'Work completed, awaiting release or dispute',
  'SETTLED': 'Payment released to provider (final)',
  'DISPUTED': 'Transaction under dispute resolution',
  'CANCELLED': 'Transaction cancelled (final)',
};
