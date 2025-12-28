---
sidebar_position: 2
title: Kernel
description: Transaction lifecycle and state management
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Kernel

The `ACTPKernel` module provides direct control over transaction lifecycle and state management.

---

## Overview

ACTPKernel is the core smart contract wrapper that manages:
- Transaction creation and state transitions
- State machine enforcement (8-state lifecycle)
- Access control validation
- Gas optimization with operation-specific buffers

---

## Constructor

The Kernel is accessed through ACTPClient:

```typescript
const client = await ACTPClient.create({ mode: 'mock', requesterAddress: '0x...' });
const kernel = client.advanced;
```

---

## Methods

### createTransaction()

Create a new ACTP transaction.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
const txId = await kernel.createTransaction({
  provider: '0x2222222222222222222222222222222222222222',
  requester: '0x1111111111111111111111111111111111111111',
  amount: '100000000', // 100 USDC (6 decimals)
  deadline: Math.floor(Date.now() / 1000) + 86400, // 24 hours
  disputeWindow: 172800, // 48 hours
  serviceHash: '0x...', // Optional: hash of service description
});

console.log('Created transaction:', txId);
```

</TabItem>
<TabItem value="py" label="Python">

```python
import time

tx_id = await kernel.create_transaction({
    'provider': '0x2222222222222222222222222222222222222222',
    'requester': '0x1111111111111111111111111111111111111111',
    'amount': '100000000',  # 100 USDC
    'deadline': int(time.time()) + 86400,  # 24 hours
    'dispute_window': 172800,  # 48 hours
})

print(f'Created transaction: {tx_id}')
```

</TabItem>
</Tabs>

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `provider` | `string` | Provider's Ethereum address |
| `requester` | `string` | Requester's Ethereum address |
| `amount` | `string` | Amount in wei (USDC has 6 decimals) |
| `deadline` | `number` | Unix timestamp for acceptance deadline |
| `disputeWindow` | `number` | Seconds for dispute window after delivery |
| `serviceHash` | `string?` | Optional hash of service description |

**Returns:** `Promise<string>` - Transaction ID (bytes32)

---

### getTransaction()

Get transaction details by ID.

```typescript
const tx = await kernel.getTransaction(txId);

console.log('State:', tx.state);
console.log('Amount:', tx.amount);
console.log('Provider:', tx.provider);
console.log('Requester:', tx.requester);
console.log('Created:', new Date(tx.createdAt * 1000));
console.log('Deadline:', new Date(tx.deadline * 1000));
```

**Returns:** `Promise<Transaction | null>`

```typescript
interface Transaction {
  txId: string;
  requester: string;
  provider: string;
  amount: bigint;
  state: State;
  createdAt: number;
  updatedAt: number;
  deadline: number;
  disputeWindow: number;
  escrowContract: string;
  escrowId: string;
  serviceHash: string;
  attestationUID: string;
  metadata: string;
  platformFeeBpsLocked: number;
}
```

---

### transitionState()

Transition transaction to a new state.

```typescript
// Provider signals work started
await kernel.transitionState(txId, State.IN_PROGRESS);

// Provider delivers work
await kernel.transitionState(txId, State.DELIVERED);
```

**Valid Transitions:**

| From | To | Who |
|------|----|----|
| INITIATED | QUOTED | Provider |
| INITIATED/QUOTED | COMMITTED | System (via linkEscrow) |
| COMMITTED | IN_PROGRESS | Provider |
| COMMITTED/IN_PROGRESS | DELIVERED | Provider |
| Any (before DELIVERED) | CANCELLED | Requester |
| DELIVERED | DISPUTED | Either |
| DELIVERED/DISPUTED | SETTLED | System |

---

### linkEscrow()

Link escrow to transaction (automatically transitions to COMMITTED).

```typescript
// Approve USDC first
await client.escrow.approveToken(USDC_ADDRESS, amount);

// Link escrow - auto-transitions to COMMITTED
await kernel.linkEscrow(txId, escrowVaultAddress, escrowId);
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `txId` | `string` | Transaction ID |
| `escrowVault` | `string` | EscrowVault contract address |
| `escrowId` | `string` | Unique escrow identifier |

---

### anchorAttestation()

Anchor EAS attestation UID to transaction.

```typescript
// After creating attestation via EASHelper
await kernel.anchorAttestation(txId, attestationUID);
```

---

### releaseEscrow()

Release escrowed funds to provider (after dispute window).

```typescript
await kernel.releaseEscrow(txId);
```

**Requirements:**
- Transaction must be in DELIVERED state
- Dispute window must have expired
- Called by requester or automatically

---

### raiseDispute()

Raise a dispute on a delivered transaction.

```typescript
await kernel.raiseDispute(txId, disputeProof);
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `txId` | `string` | Transaction ID |
| `proof` | `bytes` | ABI-encoded dispute proof |

---

### resolveDispute()

Resolve a dispute (mediator only).

```typescript
await kernel.resolveDispute(txId, {
  decision: DisputeResolution.PROVIDER_WINS,
  requesterAmount: '0',
  providerAmount: '100000000',
});
```

**Resolution Options:**

| Decision | Description |
|----------|-------------|
| `PROVIDER_WINS` | Full amount to provider |
| `REQUESTER_WINS` | Full refund to requester |
| `SPLIT` | Custom split between parties |

---

### cancelTransaction()

Cancel transaction before delivery.

```typescript
// Requester cancels (refunds escrow if linked)
await kernel.cancelTransaction(txId);
```

**Requirements:**
- Must be before DELIVERED state
- Only requester can cancel
- Refunds escrowed funds automatically

---

## Gas Optimization

ACTPKernel uses operation-specific gas buffers:

| Operation | Gas Buffer | Min Floor |
|-----------|------------|-----------|
| createTransaction | 15% | 120k |
| transitionState | 20% | 80k |
| releaseEscrow | 30% | 220k |
| raiseDispute | 25% | 100k |
| resolveDispute | 30% | 250k |
| cancelTransaction | 15% | 60k |

---

## Error Handling

```typescript
import {
  TransactionNotFoundError,
  InvalidStateTransitionError,
  DeadlineExpiredError,
} from '@agirails/sdk';

try {
  await kernel.transitionState(txId, State.DELIVERED);
} catch (error) {
  if (error instanceof InvalidStateTransitionError) {
    console.log('From:', error.details.from);
    console.log('To:', error.details.to);
    console.log('Valid:', error.details.validTransitions);
  }
}
```

---

## Next Steps

- [Escrow](./escrow) - Fund management
- [Events](./events) - Real-time monitoring
- [EAS](./eas) - Attestation creation
