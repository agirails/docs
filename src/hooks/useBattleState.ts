import { useState, useCallback, useRef } from 'react';
import {
  BattleState,
  BattleAction,
  BattleTransaction,
  TimelineEvent,
  BattleWallet,
  NegotiationState,
  NegotiationOffer,
} from '../types/battle';

function generateWalletAddress(): string {
  const hex = '0123456789abcdef';
  let address = '0x';
  for (let i = 0; i < 40; i++) {
    address += hex[Math.floor(Math.random() * 16)];
  }
  return address;
}

function generateTxHash(): string {
  const hex = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += hex[Math.floor(Math.random() * 16)];
  }
  return hash;
}

function createInitialWallets(): { requester: BattleWallet; provider: BattleWallet } {
  return {
    requester: {
      address: generateWalletAddress(),
      label: 'Requester Agent',
      ethBalance: '0.5 ETH',
      usdcBalance: '1,000.00 USDC',
      role: 'requester',
    },
    provider: {
      address: generateWalletAddress(),
      label: 'Provider Agent',
      ethBalance: '0.25 ETH',
      usdcBalance: '500.00 USDC',
      role: 'provider',
    },
  };
}

const initialWallets = createInitialWallets();

const initialNegotiation: NegotiationState = {
  currentRound: 0,
  maxRounds: 3,
  history: [],
  currentOffer: null,
  whoseTurn: 'provider',
  isActive: false,
};

const initialState: BattleState = {
  requesterWallet: initialWallets.requester,
  providerWallet: initialWallets.provider,
  transaction: null,
  timeline: [],
  isSimulating: false,
  negotiation: initialNegotiation,
};

export function useBattleState() {
  const [state, setState] = useState<BattleState>(initialState);
  const eventIdCounter = useRef(0);

  const addTimelineEvent = useCallback((
    event: Omit<TimelineEvent, 'id' | 'timestamp'>
  ) => {
    eventIdCounter.current += 1;
    const newEvent: TimelineEvent = {
      ...event,
      id: `event-${eventIdCounter.current}`,
      timestamp: Date.now(),
    };
    setState(prev => ({
      ...prev,
      timeline: [...prev.timeline, newEvent],
    }));
    return newEvent;
  }, []);

  const updateTransaction = useCallback((
    updates: Partial<BattleTransaction>
  ) => {
    setState(prev => ({
      ...prev,
      transaction: prev.transaction
        ? { ...prev.transaction, ...updates, updatedAt: Date.now() }
        : null,
    }));
  }, []);

  const updateWallet = useCallback((
    role: 'requester' | 'provider',
    updates: Partial<BattleWallet>
  ) => {
    setState(prev => ({
      ...prev,
      [role === 'requester' ? 'requesterWallet' : 'providerWallet']: {
        ...(role === 'requester' ? prev.requesterWallet : prev.providerWallet),
        ...updates,
      },
    }));
  }, []);

  const simulateDelay = useCallback(async (ms: number = 1500) => {
    setState(prev => ({ ...prev, isSimulating: true }));
    await new Promise(resolve => setTimeout(resolve, ms));
    setState(prev => ({ ...prev, isSimulating: false }));
  }, []);

  const dispatch = useCallback(async (action: BattleAction) => {
    const txHash = generateTxHash();

    switch (action.type) {
      case 'CREATE_TRANSACTION': {
        await simulateDelay(1000);

        const newTx: BattleTransaction = {
          id: generateTxHash(),
          state: 'INITIATED',
          amount: action.payload.amount,
          description: action.payload.description,
          deadline: action.payload.deadline,
          disputeWindow: action.payload.disputeWindow,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          escrowLinked: false,
        };

        setState(prev => ({ ...prev, transaction: newTx }));

        const currentBalance = parseFloat(state.requesterWallet.usdcBalance.replace(/,/g, ''));
        const newBalance = currentBalance - parseFloat(action.payload.amount);
        updateWallet('requester', {
          usdcBalance: `${newBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC`
        });

        addTimelineEvent({
          type: 'action',
          actor: 'requester',
          title: 'Transaction Created',
          description: `Created transaction for ${action.payload.amount} USDC`,
          txHash,
          fromState: 'NONE',
          toState: 'INITIATED',
        });
        break;
      }

      case 'LINK_ESCROW': {
        await simulateDelay(800);

        updateTransaction({
          escrowLinked: true,
          state: 'COMMITTED',
        });

        addTimelineEvent({
          type: 'state_change',
          actor: 'requester',
          title: 'Escrow Linked',
          description: 'Funds locked in escrow, provider committed',
          txHash,
          fromState: 'INITIATED',
          toState: 'COMMITTED',
        });
        break;
      }

      case 'QUOTE': {
        await simulateDelay(600);

        const maxRounds = action.payload.maxRounds || 3;
        const initialOffer: NegotiationOffer = {
          id: `offer-1`,
          amount: action.payload.amount,
          from: 'provider',
          timestamp: Date.now(),
          round: 1,
          type: 'initial',
        };

        updateTransaction({
          state: 'QUOTED',
          amount: action.payload.amount,
        });

        setState(prev => ({
          ...prev,
          negotiation: {
            currentRound: 1,
            maxRounds,
            history: [initialOffer],
            currentOffer: initialOffer,
            whoseTurn: 'requester',
            isActive: true,
          },
        }));

        addTimelineEvent({
          type: 'action',
          actor: 'provider',
          title: 'Quote Submitted',
          description: `Provider quoted ${action.payload.amount} USDC (max ${maxRounds} rounds)`,
          txHash,
          fromState: state.transaction?.state,
          toState: 'QUOTED',
        });
        break;
      }

      case 'ACCEPT_QUOTE': {
        await simulateDelay(800);

        updateTransaction({
          escrowLinked: true,
          state: 'COMMITTED',
        });

        // End negotiation
        setState(prev => ({
          ...prev,
          negotiation: {
            ...prev.negotiation,
            isActive: false,
          },
        }));

        addTimelineEvent({
          type: 'state_change',
          actor: 'requester',
          title: 'Quote Accepted',
          description: `Requester accepted ${state.transaction?.amount} USDC after ${state.negotiation.currentRound} round(s)`,
          txHash,
          fromState: 'QUOTED',
          toState: 'COMMITTED',
        });
        break;
      }

      case 'COUNTER_OFFER': {
        await simulateDelay(400);

        const newRound = state.negotiation.currentRound + 1;
        const counterOffer: NegotiationOffer = {
          id: `offer-${state.negotiation.history.length + 1}`,
          amount: action.payload.amount,
          from: 'requester',
          timestamp: Date.now(),
          round: newRound,
          type: 'counter',
        };

        updateTransaction({
          amount: action.payload.amount,
        });

        setState(prev => ({
          ...prev,
          negotiation: {
            ...prev.negotiation,
            currentRound: newRound,
            history: [...prev.negotiation.history, counterOffer],
            currentOffer: counterOffer,
            whoseTurn: 'provider',
          },
        }));

        addTimelineEvent({
          type: 'action',
          actor: 'requester',
          title: 'Counter Offer',
          description: `Requester countered with ${action.payload.amount} USDC (round ${newRound}/${state.negotiation.maxRounds})`,
          txHash,
        });
        break;
      }

      case 'PROVIDER_COUNTER': {
        await simulateDelay(400);

        const newRound = state.negotiation.currentRound + 1;
        const providerCounter: NegotiationOffer = {
          id: `offer-${state.negotiation.history.length + 1}`,
          amount: action.payload.amount,
          from: 'provider',
          timestamp: Date.now(),
          round: newRound,
          type: 'counter',
        };

        updateTransaction({
          amount: action.payload.amount,
        });

        setState(prev => ({
          ...prev,
          negotiation: {
            ...prev.negotiation,
            currentRound: newRound,
            history: [...prev.negotiation.history, providerCounter],
            currentOffer: providerCounter,
            whoseTurn: 'requester',
          },
        }));

        addTimelineEvent({
          type: 'action',
          actor: 'provider',
          title: 'Counter Offer',
          description: `Provider countered with ${action.payload.amount} USDC (round ${newRound}/${state.negotiation.maxRounds})`,
          txHash,
        });
        break;
      }

      case 'START_WORK': {
        await simulateDelay(500);

        updateTransaction({ state: 'IN_PROGRESS' });

        addTimelineEvent({
          type: 'state_change',
          actor: 'provider',
          title: 'Work Started',
          description: 'Provider began working on the service',
          txHash,
          fromState: 'COMMITTED',
          toState: 'IN_PROGRESS',
        });
        break;
      }

      case 'DELIVER': {
        await simulateDelay(1200);

        updateTransaction({
          state: 'DELIVERED',
          deliveryProof: action.payload.proof,
        });

        addTimelineEvent({
          type: 'state_change',
          actor: 'provider',
          title: 'Work Delivered',
          description: 'Provider delivered the completed work with proof',
          txHash,
          fromState: state.transaction?.state,
          toState: 'DELIVERED',
        });
        break;
      }

      case 'RELEASE_ESCROW': {
        await simulateDelay(1000);

        const amount = parseFloat(state.transaction?.amount || '0');
        const currentProviderBalance = parseFloat(state.providerWallet.usdcBalance.replace(/,/g, ''));
        const newProviderBalance = currentProviderBalance + amount;

        updateWallet('provider', {
          usdcBalance: `${newProviderBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC`
        });

        updateTransaction({ state: 'SETTLED' });

        addTimelineEvent({
          type: 'state_change',
          actor: 'requester',
          title: 'Escrow Released',
          description: `${amount} USDC released to provider`,
          txHash,
          fromState: 'DELIVERED',
          toState: 'SETTLED',
        });
        break;
      }

      case 'RAISE_DISPUTE': {
        await simulateDelay(800);

        updateTransaction({
          state: 'DISPUTED',
          disputeReason: action.payload.reason,
        });

        addTimelineEvent({
          type: 'action',
          actor: 'requester',
          title: 'Dispute Raised',
          description: `Dispute: "${action.payload.reason}"`,
          txHash,
          fromState: 'DELIVERED',
          toState: 'DISPUTED',
        });
        break;
      }

      case 'RESOLVE_DISPUTE': {
        await simulateDelay(1500);

        const amount = parseFloat(state.transaction?.amount || '0');
        const currentRequesterBalance = parseFloat(state.requesterWallet.usdcBalance.replace(/,/g, ''));
        const currentProviderBalance = parseFloat(state.providerWallet.usdcBalance.replace(/,/g, ''));

        let resolution = '';
        switch (action.payload.resolution) {
          case 'refund':
            updateWallet('requester', {
              usdcBalance: `${(currentRequesterBalance + amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC`
            });
            resolution = 'Full refund to requester';
            break;
          case 'release':
            updateWallet('provider', {
              usdcBalance: `${(currentProviderBalance + amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC`
            });
            resolution = 'Full release to provider';
            break;
          case 'split':
            const half = amount / 2;
            updateWallet('requester', {
              usdcBalance: `${(currentRequesterBalance + half).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC`
            });
            updateWallet('provider', {
              usdcBalance: `${(currentProviderBalance + half).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC`
            });
            resolution = '50/50 split between parties';
            break;
        }

        updateTransaction({ state: 'SETTLED' });

        addTimelineEvent({
          type: 'system',
          actor: 'system',
          title: 'Dispute Resolved',
          description: resolution,
          txHash,
          fromState: 'DISPUTED',
          toState: 'SETTLED',
        });
        break;
      }

      case 'CANCEL': {
        await simulateDelay(800);

        if (state.transaction?.escrowLinked) {
          const amount = parseFloat(state.transaction.amount || '0');
          const currentBalance = parseFloat(state.requesterWallet.usdcBalance.replace(/,/g, ''));
          updateWallet('requester', {
            usdcBalance: `${(currentBalance + amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC`
          });
        }

        updateTransaction({ state: 'CANCELLED' });

        addTimelineEvent({
          type: 'state_change',
          actor: 'requester',
          title: 'Transaction Cancelled',
          description: 'Transaction cancelled, funds returned',
          txHash,
          fromState: state.transaction?.state,
          toState: 'CANCELLED',
        });
        break;
      }

      case 'RESET': {
        const newWallets = createInitialWallets();
        eventIdCounter.current = 0;
        setState({
          requesterWallet: newWallets.requester,
          providerWallet: newWallets.provider,
          transaction: null,
          timeline: [],
          isSimulating: false,
          negotiation: initialNegotiation,
        });
        break;
      }
    }
  }, [state, addTimelineEvent, updateTransaction, updateWallet, simulateDelay]);

  return {
    state,
    dispatch,
    canPerformAction: !state.isSimulating,
  };
}
