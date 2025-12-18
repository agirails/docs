/**
 * SDK Browser Mock
 *
 * Pure browser implementation for DX Playground.
 * Simulates ACTP protocol behavior without actual blockchain or SDK dependency.
 *
 * @module lib/sdk
 */

// ============================================================================
// Types
// ============================================================================

export type TransactionState =
  | 'INITIATED'
  | 'QUOTED'
  | 'COMMITTED'
  | 'IN_PROGRESS'
  | 'DELIVERED'
  | 'SETTLED'
  | 'DISPUTED'
  | 'CANCELLED';

interface MockAccount {
  address: string;
  balance: string; // In wei (6 decimals for USDC)
}

interface MockTransaction {
  id: string;
  state: TransactionState;
  requester: string;
  provider: string;
  amount: string;
  deadline: number;
  createdAt: number;
  updatedAt: number;
  escrowId?: string;
  metadata?: string;
}

interface MockEscrow {
  id: string;
  txId: string;
  amount: string;
  locked: boolean;
}

interface MockEvent {
  id: string;
  blockNumber: number;
  timestamp: number;
  eventName: string;
  args: Record<string, unknown>;
}

interface MockState {
  version: string;
  accounts: Record<string, MockAccount>;
  transactions: Record<string, MockTransaction>;
  escrows: Record<string, MockEscrow>;
  events: MockEvent[];
  blockchain: {
    blockNumber: number;
    timestamp: number;
    paused: boolean;
  };
}

export interface SDKState {
  isInitialized: boolean;
  requesterAddress: string;
  providerAddress: string;
  mockState: MockState | null;
  events: SDKEvent[];
  currentBlockNumber: number;
  currentTimestamp: number;
}

export interface SDKEvent {
  id: string;
  timestamp: number;
  blockNumber: number;
  type: string;
  data: Record<string, unknown>;
}

export interface TransactionInfo {
  txId: string;
  state: TransactionState;
  requester: string;
  provider: string;
  amount: string;
  deadline: number;
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// Helpers
// ============================================================================

function generateAddress(): string {
  const hex = '0123456789abcdef';
  let address = '0x';
  for (let i = 0; i < 40; i++) {
    address += hex[Math.floor(Math.random() * 16)];
  }
  return address;
}

function generateTxId(): string {
  const hex = '0123456789abcdef';
  let id = '0x';
  for (let i = 0; i < 64; i++) {
    id += hex[Math.floor(Math.random() * 16)];
  }
  return id;
}

// Deterministic wallet generation (same addresses on refresh)
function generateDeterministicAddress(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  const hex = '0123456789abcdef';
  let address = '0x';
  for (let i = 0; i < 40; i++) {
    const index = Math.abs((hash * (i + 1)) % 16);
    address += hex[index];
  }
  return address;
}

// ============================================================================
// Browser Mock State Manager
// ============================================================================

class BrowserMockStateManager {
  private state: MockState;
  private listeners: ((state: MockState) => void)[] = [];

  constructor() {
    const saved = this.tryLoadFromStorage();
    this.state = saved || this.createInitialState();
  }

  private createInitialState(): MockState {
    return {
      version: '1.0.0',
      accounts: {},
      transactions: {},
      escrows: {},
      events: [],
      blockchain: {
        blockNumber: 1,
        timestamp: Math.floor(Date.now() / 1000),
        paused: false,
      },
    };
  }

  private tryLoadFromStorage(): MockState | null {
    try {
      const data = localStorage.getItem('agirails_mock_state');
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // Ignore storage errors
    }
    return null;
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('agirails_mock_state', JSON.stringify(this.state));
    } catch {
      // Ignore storage errors
    }
  }

  getState(): MockState {
    return { ...this.state };
  }

  updateState(updater: (state: MockState) => MockState): void {
    this.state = updater({ ...this.state });
    this.saveToStorage();
    this.notifyListeners();
  }

  subscribe(listener: (state: MockState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l(this.state));
  }

  reset(): void {
    this.state = this.createInitialState();
    localStorage.removeItem('agirails_mock_state');
    this.notifyListeners();
  }
}

// ============================================================================
// SDK Manager (Mock Implementation)
// ============================================================================

class SDKManager {
  private stateManager: BrowserMockStateManager;
  private requesterAddress: string;
  private providerAddress: string;
  private initialized: boolean = false;
  private eventListeners: ((event: SDKEvent) => void)[] = [];
  private stateListeners: ((state: SDKState) => void)[] = [];

  constructor() {
    this.stateManager = new BrowserMockStateManager();
    // Deterministic addresses for consistent UX
    this.requesterAddress = generateDeterministicAddress('requester-playground-v1');
    this.providerAddress = generateDeterministicAddress('provider-playground-v1');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize accounts with balance
    this.stateManager.updateState(state => ({
      ...state,
      accounts: {
        [this.requesterAddress]: {
          address: this.requesterAddress,
          balance: '10000000000', // 10,000 USDC
        },
        [this.providerAddress]: {
          address: this.providerAddress,
          balance: '10000000000', // 10,000 USDC
        },
      },
    }));

    this.initialized = true;
    this.notifyStateListeners();
  }

  getState(): SDKState {
    const mockState = this.stateManager.getState();
    return {
      isInitialized: this.initialized,
      requesterAddress: this.requesterAddress,
      providerAddress: this.providerAddress,
      mockState,
      events: mockState.events.map((e, i) => ({
        id: `${e.blockNumber}-${i}`,
        timestamp: e.timestamp * 1000,
        blockNumber: e.blockNumber,
        type: e.eventName,
        data: e.args,
      })),
      currentBlockNumber: mockState.blockchain.blockNumber,
      currentTimestamp: mockState.blockchain.timestamp,
    };
  }

  subscribeToState(listener: (state: SDKState) => void): () => void {
    this.stateListeners.push(listener);
    return () => {
      this.stateListeners = this.stateListeners.filter(l => l !== listener);
    };
  }

  subscribeToEvents(listener: (event: SDKEvent) => void): () => void {
    this.eventListeners.push(listener);
    return () => {
      this.eventListeners = this.eventListeners.filter(l => l !== listener);
    };
  }

  private notifyStateListeners(): void {
    const state = this.getState();
    this.stateListeners.forEach(l => l(state));
  }

  private emitEvent(eventName: string, args: Record<string, unknown>): void {
    const state = this.stateManager.getState();
    const event: MockEvent = {
      id: generateTxId(),
      blockNumber: state.blockchain.blockNumber,
      timestamp: state.blockchain.timestamp,
      eventName,
      args,
    };

    this.stateManager.updateState(s => ({
      ...s,
      events: [...s.events, event],
      blockchain: {
        ...s.blockchain,
        blockNumber: s.blockchain.blockNumber + 1,
      },
    }));

    const sdkEvent: SDKEvent = {
      id: event.id,
      timestamp: event.timestamp * 1000,
      blockNumber: event.blockNumber,
      type: eventName,
      data: args,
    };
    this.eventListeners.forEach(l => l(sdkEvent));
    this.notifyStateListeners();
  }

  // ============================================================================
  // SDK Methods
  // ============================================================================

  async mintTokens(address: string, amount: string): Promise<void> {
    this.stateManager.updateState(state => {
      const account = state.accounts[address] || { address, balance: '0' };
      const newBalance = (BigInt(account.balance) + BigInt(amount)).toString();
      return {
        ...state,
        accounts: {
          ...state.accounts,
          [address]: { ...account, balance: newBalance },
        },
      };
    });
    this.emitEvent('TokensMinted', { address, amount });
  }

  async getBalance(address: string): Promise<string> {
    const state = this.stateManager.getState();
    return state.accounts[address]?.balance || '0';
  }

  async createTransaction(params: {
    provider: string;
    amount: string;
    deadline?: number;
    metadata?: string;
  }): Promise<string> {
    const txId = generateTxId();
    const now = Math.floor(Date.now() / 1000);
    const deadline = params.deadline || now + 86400; // 24 hours default

    const tx: MockTransaction = {
      id: txId,
      state: 'INITIATED',
      requester: this.requesterAddress,
      provider: params.provider,
      amount: params.amount,
      deadline,
      createdAt: now,
      updatedAt: now,
      metadata: params.metadata,
    };

    this.stateManager.updateState(state => ({
      ...state,
      transactions: {
        ...state.transactions,
        [txId]: tx,
      },
    }));

    this.emitEvent('TransactionCreated', {
      txId,
      requester: this.requesterAddress,
      provider: params.provider,
      amount: params.amount,
    });

    return txId;
  }

  async linkEscrow(txId: string): Promise<void> {
    const state = this.stateManager.getState();
    const tx = state.transactions[txId];
    if (!tx) throw new Error(`Transaction not found: ${txId}`);
    if (tx.state !== 'INITIATED' && tx.state !== 'QUOTED') {
      throw new Error(`Cannot link escrow in state ${tx.state}`);
    }

    const escrowId = generateTxId();

    // Deduct from requester, create escrow
    const requesterAccount = state.accounts[this.requesterAddress];
    const newBalance = (BigInt(requesterAccount?.balance || '0') - BigInt(tx.amount)).toString();
    if (BigInt(newBalance) < 0) {
      throw new Error('Insufficient balance');
    }

    this.stateManager.updateState(s => ({
      ...s,
      accounts: {
        ...s.accounts,
        [this.requesterAddress]: {
          ...s.accounts[this.requesterAddress],
          balance: newBalance,
        },
      },
      transactions: {
        ...s.transactions,
        [txId]: {
          ...tx,
          state: 'COMMITTED',
          escrowId,
          updatedAt: Math.floor(Date.now() / 1000),
        },
      },
      escrows: {
        ...s.escrows,
        [escrowId]: {
          id: escrowId,
          txId,
          amount: tx.amount,
          locked: true,
        },
      },
    }));

    this.emitEvent('EscrowLinked', { txId, escrowId, amount: tx.amount });
  }

  async transitionState(txId: string, newState: TransactionState): Promise<void> {
    const state = this.stateManager.getState();
    const tx = state.transactions[txId];
    if (!tx) throw new Error(`Transaction not found: ${txId}`);

    const validTransitions: Record<TransactionState, TransactionState[]> = {
      INITIATED: ['QUOTED', 'COMMITTED', 'CANCELLED'],
      QUOTED: ['COMMITTED', 'CANCELLED'],
      COMMITTED: ['IN_PROGRESS', 'DELIVERED', 'CANCELLED'],
      IN_PROGRESS: ['DELIVERED', 'CANCELLED'],
      DELIVERED: ['SETTLED', 'DISPUTED'],
      DISPUTED: ['SETTLED'],
      SETTLED: [],
      CANCELLED: [],
    };

    if (!validTransitions[tx.state].includes(newState)) {
      throw new Error(`Invalid transition: ${tx.state} -> ${newState}`);
    }

    this.stateManager.updateState(s => ({
      ...s,
      transactions: {
        ...s.transactions,
        [txId]: {
          ...tx,
          state: newState,
          updatedAt: Math.floor(Date.now() / 1000),
        },
      },
    }));

    this.emitEvent('StateTransitioned', {
      txId,
      fromState: tx.state,
      toState: newState,
    });
  }

  async releaseEscrow(txId: string): Promise<void> {
    const state = this.stateManager.getState();
    const tx = state.transactions[txId];
    if (!tx) throw new Error(`Transaction not found: ${txId}`);
    if (tx.state !== 'DELIVERED') {
      throw new Error(`Cannot release escrow in state ${tx.state}`);
    }

    const escrow = tx.escrowId ? state.escrows[tx.escrowId] : null;
    if (!escrow) throw new Error('Escrow not found');

    // Transfer to provider
    const providerAccount = state.accounts[tx.provider] || { address: tx.provider, balance: '0' };
    const newProviderBalance = (BigInt(providerAccount.balance) + BigInt(escrow.amount)).toString();

    this.stateManager.updateState(s => ({
      ...s,
      accounts: {
        ...s.accounts,
        [tx.provider]: {
          ...providerAccount,
          balance: newProviderBalance,
        },
      },
      transactions: {
        ...s.transactions,
        [txId]: {
          ...tx,
          state: 'SETTLED',
          updatedAt: Math.floor(Date.now() / 1000),
        },
      },
      escrows: {
        ...s.escrows,
        [escrow.id]: {
          ...escrow,
          locked: false,
        },
      },
    }));

    this.emitEvent('EscrowReleased', { txId, recipient: tx.provider, amount: escrow.amount });
    this.emitEvent('TransactionSettled', { txId });
  }

  async getTransaction(txId: string): Promise<TransactionInfo | null> {
    const state = this.stateManager.getState();
    const tx = state.transactions[txId];
    if (!tx) return null;
    return {
      txId: tx.id,
      state: tx.state,
      requester: tx.requester,
      provider: tx.provider,
      amount: tx.amount,
      deadline: tx.deadline,
      createdAt: tx.createdAt,
      updatedAt: tx.updatedAt,
    };
  }

  async listTransactions(): Promise<TransactionInfo[]> {
    const state = this.stateManager.getState();
    return Object.values(state.transactions).map(tx => ({
      txId: tx.id,
      state: tx.state,
      requester: tx.requester,
      provider: tx.provider,
      amount: tx.amount,
      deadline: tx.deadline,
      createdAt: tx.createdAt,
      updatedAt: tx.updatedAt,
    }));
  }

  async advanceTime(seconds: number): Promise<void> {
    this.stateManager.updateState(state => ({
      ...state,
      blockchain: {
        ...state.blockchain,
        timestamp: state.blockchain.timestamp + seconds,
      },
    }));
    this.notifyStateListeners();
  }

  async advanceBlocks(blocks: number): Promise<void> {
    this.stateManager.updateState(state => ({
      ...state,
      blockchain: {
        ...state.blockchain,
        blockNumber: state.blockchain.blockNumber + blocks,
      },
    }));
    this.notifyStateListeners();
  }

  async reset(): Promise<void> {
    this.stateManager.reset();
    this.initialized = false;
    await this.initialize();
  }

  getRequesterAddress(): string {
    return this.requesterAddress;
  }

  getProviderAddress(): string {
    return this.providerAddress;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const sdk = new SDKManager();

let initPromise: Promise<void> | null = null;

export function initializeSDK(): Promise<void> {
  if (!initPromise) {
    initPromise = sdk.initialize().catch(error => {
      console.error('Failed to initialize SDK:', error);
      initPromise = null;
      throw error;
    });
  }
  return initPromise;
}

export default sdk;
