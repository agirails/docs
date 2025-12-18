/**
 * Method Executor - Maps playground methods to SDK calls
 *
 * @module lib/methodExecutor
 */

import { sdk, initializeSDK, type TransactionState } from './sdk';
import { SimulationResult, FormValues } from '../types/playground';

export interface ExecutionResult {
  success: boolean;
  txId?: string;
  data?: Record<string, unknown>;
  error?: string;
  stateChanges: { field: string; from: string; to: string }[];
  events: { name: string; args: Record<string, string> }[];
}

// Store last created txId for methods that need it
let lastCreatedTxId: string | null = null;

export async function executeMethod(
  methodId: string,
  formValues: FormValues
): Promise<ExecutionResult> {
  // Ensure SDK is initialized
  await initializeSDK();

  const amount = formValues.amount || '100';
  const amountWei = (parseFloat(amount) * 1_000_000).toString(); // USDC has 6 decimals
  const provider = formValues.provider || sdk.getProviderAddress();
  const providerShort = `${provider.slice(0, 6)}...${provider.slice(-4)}`;
  const requesterShort = `${sdk.getRequesterAddress().slice(0, 6)}...${sdk.getRequesterAddress().slice(-4)}`;

  try {
    switch (methodId) {
      case 'createTransaction': {
        const txId = await sdk.createTransaction({
          provider,
          amount: amountWei,
          metadata: formValues.description,
        });
        lastCreatedTxId = txId;
        const txIdShort = `${txId.slice(0, 10)}...${txId.slice(-8)}`;

        return {
          success: true,
          txId,
          stateChanges: [
            { field: 'Transaction State', from: 'null', to: 'INITIATED' },
            { field: 'Transaction ID', from: 'null', to: txIdShort },
            { field: 'Provider', from: 'null', to: providerShort },
            { field: 'Amount', from: '0', to: `${amount} USDC` },
          ],
          events: [
            {
              name: 'TransactionCreated',
              args: {
                txId: txIdShort,
                requester: requesterShort,
                provider: providerShort,
                amount: `${amount} USDC`,
              },
            },
          ],
        };
      }

      case 'linkEscrow': {
        const txId = lastCreatedTxId || formValues.txId;
        if (!txId) {
          return {
            success: false,
            error: 'No transaction ID. Create a transaction first.',
            stateChanges: [],
            events: [],
          };
        }

        await sdk.linkEscrow(txId);
        const txIdShort = `${txId.slice(0, 10)}...${txId.slice(-8)}`;

        return {
          success: true,
          txId,
          stateChanges: [
            { field: 'Transaction State', from: 'INITIATED', to: 'COMMITTED' },
            { field: 'Escrow Linked', from: 'false', to: 'true' },
            { field: 'Funds Locked', from: '0 USDC', to: `${amount} USDC` },
          ],
          events: [
            {
              name: 'EscrowLinked',
              args: {
                txId: txIdShort,
                amount: `${amount} USDC`,
              },
            },
          ],
        };
      }

      case 'transitionState': {
        const txId = lastCreatedTxId || formValues.txId;
        if (!txId) {
          return {
            success: false,
            error: 'No transaction ID. Create a transaction first.',
            stateChanges: [],
            events: [],
          };
        }

        const tx = await sdk.getTransaction(txId);
        const fromState = tx?.state || 'UNKNOWN';
        const newState = (formValues.newState || 'IN_PROGRESS') as TransactionState;

        await sdk.transitionState(txId, newState);
        const txIdShort = `${txId.slice(0, 10)}...${txId.slice(-8)}`;

        return {
          success: true,
          txId,
          stateChanges: [
            { field: 'Transaction State', from: fromState, to: newState },
            { field: 'Updated At', from: '-', to: new Date().toLocaleTimeString() },
          ],
          events: [
            {
              name: 'StateTransitioned',
              args: {
                txId: txIdShort,
                fromState,
                toState: newState,
              },
            },
          ],
        };
      }

      case 'releaseEscrow': {
        const txId = lastCreatedTxId || formValues.txId;
        if (!txId) {
          return {
            success: false,
            error: 'No transaction ID. Create a transaction first.',
            stateChanges: [],
            events: [],
          };
        }

        const tx = await sdk.getTransaction(txId);
        if (tx?.state !== 'DELIVERED') {
          // First transition to DELIVERED if not already
          if (tx?.state === 'COMMITTED' || tx?.state === 'IN_PROGRESS') {
            await sdk.transitionState(txId, 'DELIVERED');
          }
        }

        await sdk.releaseEscrow(txId);
        const txIdShort = `${txId.slice(0, 10)}...${txId.slice(-8)}`;

        return {
          success: true,
          txId,
          stateChanges: [
            { field: 'Transaction State', from: 'DELIVERED', to: 'SETTLED' },
            { field: 'Escrow Balance', from: `${amount} USDC`, to: '0 USDC' },
            { field: 'Provider Balance', from: '-', to: `+${amount} USDC` },
          ],
          events: [
            {
              name: 'EscrowReleased',
              args: {
                txId: txIdShort,
                recipient: providerShort,
                amount: `${amount} USDC`,
              },
            },
            {
              name: 'TransactionSettled',
              args: {
                txId: txIdShort,
                finalState: 'SETTLED',
              },
            },
          ],
        };
      }

      case 'getTransaction': {
        const txId = formValues.txId || lastCreatedTxId;
        if (!txId) {
          return {
            success: false,
            error: 'No transaction ID provided.',
            stateChanges: [],
            events: [],
          };
        }

        const tx = await sdk.getTransaction(txId);
        if (!tx) {
          return {
            success: false,
            error: `Transaction not found: ${txId.slice(0, 16)}...`,
            stateChanges: [],
            events: [],
          };
        }

        const txIdShort = `${tx.txId.slice(0, 10)}...${tx.txId.slice(-8)}`;
        const txProviderShort = `${tx.provider.slice(0, 6)}...${tx.provider.slice(-4)}`;
        const txRequesterShort = `${tx.requester.slice(0, 6)}...${tx.requester.slice(-4)}`;
        const txAmount = (parseInt(tx.amount) / 1_000_000).toFixed(2);

        return {
          success: true,
          txId: tx.txId,
          data: tx as unknown as Record<string, unknown>,
          stateChanges: [
            { field: 'Transaction ID', from: '-', to: txIdShort },
            { field: 'Status', from: '-', to: tx.state },
            { field: 'Amount', from: '-', to: `${txAmount} USDC` },
            { field: 'Provider', from: '-', to: txProviderShort },
            { field: 'Requester', from: '-', to: txRequesterShort },
            { field: 'Created At', from: '-', to: new Date(tx.createdAt * 1000).toLocaleString() },
          ],
          events: [],
        };
      }

      case 'getEscrowBalance': {
        const balance = await sdk.getBalance(sdk.getRequesterAddress());
        const balanceUsdc = (parseInt(balance) / 1_000_000).toFixed(2);

        return {
          success: true,
          stateChanges: [
            { field: 'Requester Balance', from: '-', to: `${balanceUsdc} USDC` },
          ],
          events: [],
        };
      }

      case 'initiateDispute': {
        const txId = lastCreatedTxId || formValues.txId;
        if (!txId) {
          return {
            success: false,
            error: 'No transaction ID. Create a transaction first.',
            stateChanges: [],
            events: [],
          };
        }

        const tx = await sdk.getTransaction(txId);
        const fromState = tx?.state || 'DELIVERED';

        // Ensure we're in DELIVERED state first
        if (tx?.state !== 'DELIVERED' && tx?.state !== 'DISPUTED') {
          if (tx?.state === 'COMMITTED' || tx?.state === 'IN_PROGRESS') {
            await sdk.transitionState(txId, 'DELIVERED');
          }
        }

        await sdk.transitionState(txId, 'DISPUTED');
        const txIdShort = `${txId.slice(0, 10)}...${txId.slice(-8)}`;

        return {
          success: true,
          txId,
          stateChanges: [
            { field: 'Transaction State', from: fromState, to: 'DISPUTED' },
            { field: 'Dispute Reason', from: 'null', to: formValues.reason || 'Service issue' },
          ],
          events: [
            {
              name: 'DisputeInitiated',
              args: {
                txId: txIdShort,
                initiator: requesterShort,
                reason: formValues.reason || 'Service issue',
              },
            },
          ],
        };
      }

      case 'resolveDispute': {
        const txId = lastCreatedTxId || formValues.txId;
        if (!txId) {
          return {
            success: false,
            error: 'No transaction ID. Create a transaction first.',
            stateChanges: [],
            events: [],
          };
        }

        // Resolve by transitioning to SETTLED
        await sdk.transitionState(txId, 'SETTLED');
        const txIdShort = `${txId.slice(0, 10)}...${txId.slice(-8)}`;
        const resolution = formValues.resolution || 'RELEASE';
        const halfAmount = (parseFloat(amount) / 2).toFixed(2);

        let stateChanges: { field: string; from: string; to: string }[];
        let events: { name: string; args: Record<string, string> }[];

        switch (resolution) {
          case 'REFUND':
            stateChanges = [
              { field: 'Transaction State', from: 'DISPUTED', to: 'SETTLED (Refund)' },
              { field: 'Requester Balance', from: '-', to: `+${amount} USDC` },
            ];
            events = [
              { name: 'DisputeResolved', args: { txId: txIdShort, resolution: 'REFUND', winner: 'Requester' } },
            ];
            break;
          case 'SPLIT':
            stateChanges = [
              { field: 'Transaction State', from: 'DISPUTED', to: 'SETTLED (Split)' },
              { field: 'Requester Balance', from: '-', to: `+${halfAmount} USDC` },
              { field: 'Provider Balance', from: '-', to: `+${halfAmount} USDC` },
            ];
            events = [
              { name: 'DisputeResolved', args: { txId: txIdShort, resolution: 'SPLIT', ratio: '50/50' } },
            ];
            break;
          default: // RELEASE
            stateChanges = [
              { field: 'Transaction State', from: 'DISPUTED', to: 'SETTLED' },
              { field: 'Provider Balance', from: '-', to: `+${amount} USDC` },
            ];
            events = [
              { name: 'DisputeResolved', args: { txId: txIdShort, resolution: 'RELEASE', winner: 'Provider' } },
            ];
        }

        return {
          success: true,
          txId,
          stateChanges,
          events,
        };
      }

      case 'anchorAttestation': {
        // Mock attestation anchoring
        const txId = lastCreatedTxId || formValues.txId;
        const attestation = formValues.attestation || '0x' + 'a'.repeat(64);
        const attestationShort = `${attestation.slice(0, 10)}...${attestation.slice(-8)}`;
        const txIdShort = txId ? `${txId.slice(0, 10)}...${txId.slice(-8)}` : 'N/A';

        return {
          success: true,
          txId: txId || undefined,
          stateChanges: [
            { field: 'Attestation', from: 'null', to: attestationShort },
            { field: 'Attested', from: 'false', to: 'true' },
          ],
          events: [
            {
              name: 'AttestationAnchored',
              args: {
                txId: txIdShort,
                attestationUID: attestationShort,
              },
            },
          ],
        };
      }

      default:
        return {
          success: false,
          error: `Unknown method: ${methodId}`,
          stateChanges: [],
          events: [],
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Execution failed',
      stateChanges: [],
      events: [],
    };
  }
}

/**
 * Convert ExecutionResult to SimulationResult for UI compatibility
 */
export function toSimulationResult(result: ExecutionResult): SimulationResult {
  if (!result.success) {
    return {
      status: 'error',
      error: result.error,
    };
  }

  return {
    status: 'success',
    stateChanges: result.stateChanges,
    events: result.events,
    gasEstimate: Math.floor(Math.random() * 50000) + 30000, // Mock gas
    gasCostUsd: '~$0.01',
  };
}

/**
 * Get the last created transaction ID
 */
export function getLastTxId(): string | null {
  return lastCreatedTxId;
}

/**
 * Reset the executor state
 */
export async function resetExecutor(): Promise<void> {
  lastCreatedTxId = null;
  await sdk.reset();
}
