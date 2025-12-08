import { Method } from '../types/playground';

export const methods: Method[] = [
  {
    id: 'createTransaction',
    name: 'createTransaction',
    category: 'Transaction Lifecycle',
    description: 'Create a new ACTP transaction with escrow',
    params: [
      { name: 'provider', type: 'address', label: 'Provider Address', placeholder: '0x...', required: true },
      { name: 'amount', type: 'number', label: 'Amount USDC', placeholder: '100', required: true },
      { name: 'deadline', type: 'deadline', label: 'Deadline', required: true },
      { name: 'description', type: 'text', label: 'Description (optional)', placeholder: 'Transaction description...' },
    ],
  },
  {
    id: 'linkEscrow',
    name: 'linkEscrow',
    category: 'Transaction Lifecycle',
    description: 'Link an escrow contract to a transaction',
    params: [
      { name: 'escrowAddress', type: 'address', label: 'Escrow Address', placeholder: '0x...', required: true },
    ],
  },
  {
    id: 'transitionState',
    name: 'transitionState',
    category: 'Transaction Lifecycle',
    description: 'Transition transaction to a new state',
    params: [
      { name: 'newState', type: 'select', label: 'New State', required: true, options: [
        { value: 'INITIATED', label: 'INITIATED' },
        { value: 'IN_PROGRESS', label: 'IN_PROGRESS' },
        { value: 'COMPLETED', label: 'COMPLETED' },
        { value: 'DISPUTED', label: 'DISPUTED' },
      ]},
    ],
  },
  {
    id: 'anchorAttestation',
    name: 'anchorAttestation',
    category: 'Transaction Lifecycle',
    description: 'Anchor an attestation to the transaction',
    params: [
      { name: 'attestation', type: 'text', label: 'Attestation Hash', placeholder: '0x...', required: true },
    ],
  },
  {
    id: 'releaseEscrow',
    name: 'releaseEscrow',
    category: 'Transaction Lifecycle',
    description: 'Release escrowed funds to the provider',
    params: [],
  },
  {
    id: 'getTransaction',
    name: 'getTransaction',
    category: 'Query Methods',
    description: 'Get transaction details by ID',
    params: [
      { name: 'txId', type: 'text', label: 'Transaction ID', placeholder: '0x...', required: true },
    ],
  },
  {
    id: 'getEscrowBalance',
    name: 'getEscrowBalance',
    category: 'Query Methods',
    description: 'Get current escrow balance',
    params: [
      { name: 'escrowAddress', type: 'address', label: 'Escrow Address', placeholder: '0x...', required: true },
    ],
  },
  {
    id: 'initiateDispute',
    name: 'initiateDispute',
    category: 'Disputes',
    description: 'Initiate a dispute for a transaction',
    params: [
      { name: 'reason', type: 'text', label: 'Dispute Reason', placeholder: 'Describe the issue...', required: true },
    ],
  },
  {
    id: 'resolveDispute',
    name: 'resolveDispute',
    category: 'Disputes',
    description: 'Resolve an ongoing dispute',
    params: [
      { name: 'resolution', type: 'select', label: 'Resolution', required: true, options: [
        { value: 'REFUND', label: 'Refund Requester' },
        { value: 'RELEASE', label: 'Release to Provider' },
        { value: 'SPLIT', label: 'Split 50/50' },
      ]},
    ],
  },
];

export const methodCategories = ['Transaction Lifecycle', 'Query Methods', 'Disputes'];
