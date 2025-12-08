import { SimulationResult, FormValues } from '@/types/playground';

export function getSimulationResult(methodId: string, formValues: FormValues): SimulationResult {
  const amount = formValues.amount || '100';
  const provider = formValues.provider ? `${formValues.provider.slice(0, 6)}...${formValues.provider.slice(-4)}` : '0x8a4c...6A8C';
  const halfAmount = (parseFloat(amount) / 2).toFixed(2);

  const results: Record<string, SimulationResult> = {
    createTransaction: {
      status: 'success',
      stateChanges: [
        { field: 'Transaction State', from: 'null', to: 'INITIATED' },
        { field: 'Escrow Balance', from: '0 USDC', to: `${amount} USDC` },
        { field: 'Provider', from: 'null', to: provider },
      ],
      events: [
        { 
          name: 'TransactionCreated',
          args: {
            txId: '0x7a3b...4f2e',
            requester: '0x742d...5f12',
            provider: provider,
            amount: `${amount} USDC`,
          }
        },
        {
          name: 'EscrowFunded',
          args: {
            escrowId: '0x9c2d...8e1f',
            amount: `${amount} USDC`,
          }
        }
      ],
      gasEstimate: 85000,
      gasCostUsd: '~$0.02',
    },
    linkEscrow: {
      status: 'success',
      stateChanges: [
        { field: 'Escrow Linked', from: 'false', to: 'true' },
        { field: 'Escrow Address', from: 'null', to: formValues.escrowAddress ? `${formValues.escrowAddress.slice(0, 6)}...${formValues.escrowAddress.slice(-4)}` : '0x6aDB...e7ba' },
      ],
      events: [
        { 
          name: 'EscrowLinked',
          args: {
            txId: '0x7a3b...4f2e',
            escrowAddress: formValues.escrowAddress ? `${formValues.escrowAddress.slice(0, 6)}...${formValues.escrowAddress.slice(-4)}` : '0x6aDB...e7ba',
          }
        }
      ],
      gasEstimate: 45000,
      gasCostUsd: '~$0.01',
    },
    transitionState: {
      status: 'success',
      stateChanges: [
        { field: 'Transaction State', from: 'INITIATED', to: formValues.newState || 'IN_PROGRESS' },
        { field: 'Updated At', from: '-', to: 'now' },
      ],
      events: [
        { 
          name: 'StateTransitioned',
          args: {
            txId: '0x7a3b...4f2e',
            fromState: 'INITIATED',
            toState: formValues.newState || 'IN_PROGRESS',
          }
        }
      ],
      gasEstimate: 35000,
      gasCostUsd: '~$0.008',
    },
    anchorAttestation: {
      status: 'success',
      stateChanges: [
        { field: 'Attestation', from: 'null', to: formValues.attestation ? `${formValues.attestation.slice(0, 10)}...` : '0x1234...abcd' },
        { field: 'Attested', from: 'false', to: 'true' },
      ],
      events: [
        { 
          name: 'AttestationAnchored',
          args: {
            txId: '0x7a3b...4f2e',
            attestationUID: formValues.attestation ? `${formValues.attestation.slice(0, 10)}...` : '0x1234...abcd',
          }
        }
      ],
      gasEstimate: 55000,
      gasCostUsd: '~$0.012',
    },
    releaseEscrow: {
      status: 'success',
      stateChanges: [
        { field: 'Transaction State', from: 'DELIVERED', to: 'SETTLED' },
        { field: 'Escrow Balance', from: `${amount} USDC`, to: '0 USDC' },
        { field: 'Provider Balance', from: '0 USDC', to: `+${amount} USDC` },
      ],
      events: [
        { 
          name: 'EscrowReleased',
          args: {
            txId: '0x7a3b...4f2e',
            recipient: provider,
            amount: `${amount} USDC`,
          }
        },
        { 
          name: 'TransactionSettled',
          args: {
            txId: '0x7a3b...4f2e',
            finalState: 'SETTLED',
          }
        }
      ],
      gasEstimate: 65000,
      gasCostUsd: '~$0.015',
    },
    getTransaction: {
      status: 'success',
      stateChanges: [
        { field: 'Transaction ID', from: '-', to: formValues.txId ? `${formValues.txId.slice(0, 10)}...${formValues.txId.slice(-8)}` : '0x7a3b...4f2e' },
        { field: 'Status', from: '-', to: 'IN_PROGRESS' },
        { field: 'Amount', from: '-', to: `${amount} USDC` },
        { field: 'Provider', from: '-', to: provider },
        { field: 'Requester', from: '-', to: '0x742d...5f12' },
        { field: 'Created At', from: '-', to: '2025-12-06 10:30:00' },
      ],
      events: [],
      gasEstimate: 0,
      gasCostUsd: 'Free (view)',
    },
    getEscrowBalance: {
      status: 'success',
      stateChanges: [
        { field: 'Escrow Address', from: '-', to: formValues.escrowAddress ? `${formValues.escrowAddress.slice(0, 6)}...${formValues.escrowAddress.slice(-4)}` : '0x6aDB...e7ba' },
        { field: 'Current Balance', from: '-', to: `${amount} USDC` },
        { field: 'Locked', from: '-', to: 'true' },
        { field: 'Linked Transaction', from: '-', to: '0x7a3b...4f2e' },
      ],
      events: [],
      gasEstimate: 0,
      gasCostUsd: 'Free (view)',
    },
    initiateDispute: {
      status: 'success',
      stateChanges: [
        { field: 'Transaction State', from: 'DELIVERED', to: 'DISPUTED' },
        { field: 'Dispute Reason', from: 'null', to: formValues.reason || 'Service not delivered as agreed' },
        { field: 'Dispute Window', from: '-', to: '72 hours' },
      ],
      events: [
        { 
          name: 'DisputeInitiated',
          args: {
            txId: '0x7a3b...4f2e',
            initiator: '0x742d...5f12',
            reason: formValues.reason || 'Service not delivered as agreed',
          }
        }
      ],
      gasEstimate: 75000,
      gasCostUsd: '~$0.018',
    },
    resolveDispute: {
      status: 'success',
      stateChanges: getDisputeResolutionStateChanges(formValues.resolution, amount, halfAmount, provider),
      events: getDisputeResolutionEvents(formValues.resolution, amount, halfAmount, provider),
      gasEstimate: 95000,
      gasCostUsd: '~$0.022',
    },
  };

  return results[methodId] || results.createTransaction;
}

function getDisputeResolutionStateChanges(
  resolution: string | undefined, 
  amount: string, 
  halfAmount: string,
  provider: string
): { field: string; from: string; to: string }[] {
  switch (resolution) {
    case 'REFUND':
      return [
        { field: 'Transaction State', from: 'DISPUTED', to: 'REFUNDED' },
        { field: 'Escrow Balance', from: `${amount} USDC`, to: '0 USDC' },
        { field: 'Requester Balance', from: '0 USDC', to: `+${amount} USDC` },
      ];
    case 'RELEASE':
      return [
        { field: 'Transaction State', from: 'DISPUTED', to: 'SETTLED' },
        { field: 'Escrow Balance', from: `${amount} USDC`, to: '0 USDC' },
        { field: 'Provider Balance', from: '0 USDC', to: `+${amount} USDC` },
      ];
    case 'SPLIT':
      return [
        { field: 'Transaction State', from: 'DISPUTED', to: 'SETTLED (Split)' },
        { field: 'Escrow Balance', from: `${amount} USDC`, to: '0 USDC' },
        { field: 'Requester Balance', from: '0 USDC', to: `+${halfAmount} USDC` },
        { field: 'Provider Balance', from: '0 USDC', to: `+${halfAmount} USDC` },
      ];
    default:
      return [
        { field: 'Transaction State', from: 'DISPUTED', to: 'SETTLED' },
      ];
  }
}

function getDisputeResolutionEvents(
  resolution: string | undefined, 
  amount: string, 
  halfAmount: string,
  provider: string
): { name: string; args: Record<string, string> }[] {
  switch (resolution) {
    case 'REFUND':
      return [
        { 
          name: 'DisputeResolved',
          args: {
            txId: '0x7a3b...4f2e',
            resolution: 'REFUND',
            winner: 'Requester',
          }
        },
        { 
          name: 'FundsRefunded',
          args: {
            recipient: '0x742d...5f12',
            amount: `${amount} USDC`,
          }
        }
      ];
    case 'RELEASE':
      return [
        { 
          name: 'DisputeResolved',
          args: {
            txId: '0x7a3b...4f2e',
            resolution: 'RELEASE',
            winner: 'Provider',
          }
        },
        { 
          name: 'FundsReleased',
          args: {
            recipient: provider,
            amount: `${amount} USDC`,
          }
        }
      ];
    case 'SPLIT':
      return [
        { 
          name: 'DisputeResolved',
          args: {
            txId: '0x7a3b...4f2e',
            resolution: 'SPLIT',
            splitRatio: '50/50',
          }
        },
        { 
          name: 'FundsSplit',
          args: {
            requesterAmount: `${halfAmount} USDC`,
            providerAmount: `${halfAmount} USDC`,
          }
        }
      ];
    default:
      return [
        { 
          name: 'DisputeResolved',
          args: {
            txId: '0x7a3b...4f2e',
            resolution: resolution || 'UNKNOWN',
          }
        }
      ];
  }
}
