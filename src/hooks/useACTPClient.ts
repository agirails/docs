/**
 * useACTPClient - React hook for AGIRAILS SDK integration
 *
 * Provides reactive access to SDK state and methods.
 *
 * @module hooks/useACTPClient
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { sdk, initializeSDK, type SDKState, type SDKEvent, type TransactionInfo, type TransactionState } from '../lib/sdk';

// ============================================================================
// Types
// ============================================================================

export interface UseACTPClientReturn {
  // State
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
  requesterAddress: string;
  providerAddress: string;
  currentBlockNumber: number;
  currentTimestamp: number;
  events: SDKEvent[];
  transactions: TransactionInfo[];

  // Actions
  createTransaction: (params: CreateTransactionParams) => Promise<string>;
  linkEscrow: (txId: string) => Promise<void>;
  transitionState: (txId: string, newState: TransactionState) => Promise<void>;
  releaseEscrow: (txId: string) => Promise<void>;
  getTransaction: (txId: string) => Promise<TransactionInfo | null>;
  getBalance: (address: string) => Promise<string>;
  mintTokens: (address: string, amount: string) => Promise<void>;

  // Time manipulation (mock only)
  advanceTime: (seconds: number) => Promise<void>;
  advanceBlocks: (blocks: number) => Promise<void>;

  // Control
  reset: () => Promise<void>;
  refresh: () => void;
}

export interface CreateTransactionParams {
  provider: string;
  amount: string;
  deadline?: number;
  metadata?: string;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useACTPClient(): UseACTPClientReturn {
  const [state, setState] = useState<SDKState | null>(null);
  const [transactions, setTransactions] = useState<TransactionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const initRef = useRef(false);

  // Initialize SDK on mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      try {
        setIsLoading(true);
        await initializeSDK();
        setState(sdk.getState());
        const txList = await sdk.listTransactions();
        setTransactions(txList);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize SDK'));
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = sdk.subscribeToState((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  // Subscribe to events
  useEffect(() => {
    const unsubscribe = sdk.subscribeToEvents(async () => {
      // Refresh transactions list when events occur
      try {
        const txList = await sdk.listTransactions();
        setTransactions(txList);
      } catch {
        // Ignore errors during refresh
      }
    });
    return unsubscribe;
  }, []);

  // ============================================================================
  // Actions
  // ============================================================================

  const createTransaction = useCallback(async (params: CreateTransactionParams): Promise<string> => {
    setIsLoading(true);
    try {
      const txId = await sdk.createTransaction(params);
      const txList = await sdk.listTransactions();
      setTransactions(txList);
      return txId;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const linkEscrow = useCallback(async (txId: string): Promise<void> => {
    setIsLoading(true);
    try {
      await sdk.linkEscrow(txId);
      const txList = await sdk.listTransactions();
      setTransactions(txList);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const transitionState = useCallback(async (txId: string, newState: TransactionState): Promise<void> => {
    setIsLoading(true);
    try {
      await sdk.transitionState(txId, newState);
      const txList = await sdk.listTransactions();
      setTransactions(txList);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const releaseEscrow = useCallback(async (txId: string): Promise<void> => {
    setIsLoading(true);
    try {
      await sdk.releaseEscrow(txId);
      const txList = await sdk.listTransactions();
      setTransactions(txList);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getTransaction = useCallback(async (txId: string): Promise<TransactionInfo | null> => {
    return sdk.getTransaction(txId);
  }, []);

  const getBalance = useCallback(async (address: string): Promise<string> => {
    return sdk.getBalance(address);
  }, []);

  const mintTokens = useCallback(async (address: string, amount: string): Promise<void> => {
    await sdk.mintTokens(address, amount);
  }, []);

  const advanceTime = useCallback(async (seconds: number): Promise<void> => {
    await sdk.advanceTime(seconds);
  }, []);

  const advanceBlocks = useCallback(async (blocks: number): Promise<void> => {
    await sdk.advanceBlocks(blocks);
  }, []);

  const reset = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await sdk.reset();
      const txList = await sdk.listTransactions();
      setTransactions(txList);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    setState(sdk.getState());
    sdk.listTransactions().then(setTransactions).catch(() => {});
  }, []);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    isInitialized: state?.isInitialized ?? false,
    isLoading,
    error,
    requesterAddress: state?.requesterAddress ?? '',
    providerAddress: state?.providerAddress ?? '',
    currentBlockNumber: state?.currentBlockNumber ?? 0,
    currentTimestamp: state?.currentTimestamp ?? 0,
    events: state?.events ?? [],
    transactions,

    // Actions
    createTransaction,
    linkEscrow,
    transitionState,
    releaseEscrow,
    getTransaction,
    getBalance,
    mintTokens,

    // Time manipulation
    advanceTime,
    advanceBlocks,

    // Control
    reset,
    refresh,
  };
}

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Hook for watching a specific transaction.
 */
export function useTransaction(txId: string | null): {
  transaction: TransactionInfo | null;
  isLoading: boolean;
  refresh: () => void;
} {
  const [transaction, setTransaction] = useState<TransactionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!txId) {
      setTransaction(null);
      return;
    }
    setIsLoading(true);
    try {
      const tx = await sdk.getTransaction(txId);
      setTransaction(tx);
    } finally {
      setIsLoading(false);
    }
  }, [txId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh on state changes
  useEffect(() => {
    const unsubscribe = sdk.subscribeToState(() => {
      if (txId) refresh();
    });
    return unsubscribe;
  }, [txId, refresh]);

  return { transaction, isLoading, refresh };
}

/**
 * Hook for watching wallet balances.
 */
export function useWalletBalance(address: string): {
  balance: string;
  isLoading: boolean;
  refresh: () => void;
} {
  const [balance, setBalance] = useState('0');
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!address) {
      setBalance('0');
      return;
    }
    setIsLoading(true);
    try {
      const bal = await sdk.getBalance(address);
      setBalance(bal);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh on state changes
  useEffect(() => {
    const unsubscribe = sdk.subscribeToState(() => {
      if (address) refresh();
    });
    return unsubscribe;
  }, [address, refresh]);

  return { balance, isLoading, refresh };
}

export default useACTPClient;
