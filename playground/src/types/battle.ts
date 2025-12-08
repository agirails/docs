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

export const STATE_TRANSITIONS: Record<TransactionState, TransactionState[]> = {
  'NONE': ['INITIATED'],
  'INITIATED': ['QUOTED', 'COMMITTED', 'CANCELLED'],
  'QUOTED': ['COMMITTED', 'CANCELLED'],
  'COMMITTED': ['IN_PROGRESS', 'DELIVERED', 'CANCELLED'],
  'IN_PROGRESS': ['DELIVERED'],
  'DELIVERED': ['SETTLED', 'DISPUTED'],
  'SETTLED': [],
  'DISPUTED': ['SETTLED'],
  'CANCELLED': [],
};

export const STATE_COLORS: Record<TransactionState, string> = {
  'NONE': 'bg-muted text-muted-foreground',
  'INITIATED': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'QUOTED': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'COMMITTED': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'IN_PROGRESS': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'DELIVERED': 'bg-green-500/20 text-green-400 border-green-500/30',
  'SETTLED': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'DISPUTED': 'bg-red-500/20 text-red-400 border-red-500/30',
  'CANCELLED': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
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
