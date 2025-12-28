---
sidebar_position: 3
title: Escrow
description: Fund management and USDC operations
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Escrow

The `EscrowVault` module manages USDC funds during the transaction lifecycle.

---

## Overview

EscrowVault provides:
- USDC approval helpers
- Escrow balance queries
- Fund status tracking

**Important:** Escrow creation happens atomically inside `ACTPKernel.linkEscrow()`. This module provides helper methods for approvals and read-only access to escrow state.

---

## Workflow

Per AIP-3, the escrow workflow is:

1. **Approve**: Consumer approves USDC to EscrowVault address
2. **Link**: Consumer calls `ACTPKernel.linkEscrow()`
3. **Lock**: Kernel creates escrow, pulls USDC from consumer
4. **Release**: After delivery + dispute window, funds release to provider

---

## Methods

### approveToken()

Approve USDC for escrow creation. **Must be called before `linkEscrow()`**.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
import { parseUnits } from 'ethers';

// Approve 100 USDC for escrow
const amount = parseUnits('100', 6); // USDC has 6 decimals
await client.escrow.approveToken(USDC_ADDRESS, amount);

// Now link escrow via advanced API
await client.advanced.linkEscrow(txId);
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
# Approve 100 USDC for escrow
amount = 100 * 10**6  # USDC has 6 decimals
await client.escrow.approve_token(USDC_ADDRESS, amount)

# Now link escrow via advanced API
await client.advanced.link_escrow(tx_id)
```

</TabItem>
</Tabs>

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `tokenAddress` | `string` | USDC contract address |
| `amount` | `bigint` | Amount to approve (wei) |

---

### getEscrow()

Get escrow details by ID.

```typescript
const escrow = await client.escrow.getEscrow(escrowId);

console.log('Requester:', escrow.requester);
console.log('Provider:', escrow.provider);
console.log('Amount:', escrow.amount);
console.log('Remaining:', escrow.remaining);
console.log('Released:', escrow.released);
```

**Returns:**

```typescript
interface Escrow {
  escrowId: string;
  requester: string;
  provider: string;
  amount: bigint;
  remaining: bigint;
  released: boolean;
  createdAt: number;
}
```

---

### getRemaining()

Get remaining balance in escrow.

```typescript
const remaining = await client.escrow.getRemaining(escrowId);
console.log('Remaining in escrow:', remaining, 'wei');
```

---

### getAddress()

Get the EscrowVault contract address.

```typescript
const vaultAddress = client.escrow.getAddress();
console.log('EscrowVault:', vaultAddress);
```

---

## USDC Addresses

| Network | USDC Address |
|---------|--------------|
| Base Sepolia | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| Base Mainnet | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Mock Mode | Auto-deployed mock token |

---

## Example: Complete Escrow Flow

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
import { ACTPClient, parseUnits } from '@agirails/sdk';
import { BASE_SEPOLIA } from '@agirails/sdk/config';

async function completeEscrowFlow() {
  const client = await ACTPClient.create({
    mode: 'mock',
    requesterAddress: '0x1111111111111111111111111111111111111111',
  });

  // 1. Create transaction
  const txId = await client.advanced.createTransaction({
    provider: '0x2222222222222222222222222222222222222222',
    requester: '0x1111111111111111111111111111111111111111',
    amount: parseUnits('100', 6), // $100 USDC
    deadline: Math.floor(Date.now() / 1000) + 86400,
    disputeWindow: 172800,
  });

  // 2. Approve USDC
  const amount = parseUnits('100', 6);
  await client.escrow.approveToken(BASE_SEPOLIA.contracts.usdc, amount);

  // 3. Link escrow (auto-transitions to COMMITTED)
  const escrowId = await client.advanced.linkEscrow(txId);
  console.log('Escrow linked:', escrowId);

  // 4. Check escrow balance
  const remaining = await client.escrow.getRemaining(escrowId);
  console.log('Funds locked:', remaining);

  // 5. After delivery and dispute window...
  await client.advanced.releaseEscrow(escrowId);
  console.log('Funds released to provider');
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
import time
from agirails import ACTPClient

async def complete_escrow_flow():
    client = await ACTPClient.create(
        mode='mock',
        requester_address='0x1111111111111111111111111111111111111111',
    )

    # 1. Create transaction
    tx_id = await client.advanced.create_transaction({
        'provider': '0x2222222222222222222222222222222222222222',
        'requester': '0x1111111111111111111111111111111111111111',
        'amount': '100000000',  # $100 USDC in wei
        'deadline': int(time.time()) + 86400,
        'dispute_window': 172800,
    })

    # 2. Approve USDC
    amount = 100 * 10**6
    await client.escrow.approve_token(USDC_ADDRESS, amount)

    # 3. Link escrow
    escrow_id = await client.advanced.link_escrow(tx_id)
    print(f'Escrow linked: {escrow_id}')

    # 4. Check balance
    remaining = await client.escrow.get_remaining(escrow_id)
    print(f'Funds locked: {remaining}')

    # 5. Release after dispute window
    await client.advanced.release_escrow(escrow_id)
    print('Funds released to provider')
```

</TabItem>
</Tabs>

---

## Security Notes

- **Non-custodial**: Funds are held by smart contract, not by AGIRAILS
- **2-of-3 pattern**: Release requires either:
  - Requester approval (explicit release)
  - Dispute window expiry (automatic release)
  - Mediator decision (dispute resolution)
- **Emergency withdrawal**: 7-day timelock for admin access

---

## Next Steps

- [Kernel](./kernel) - Transaction lifecycle
- [Events](./events) - Monitor escrow events
- [EAS](./eas) - Delivery attestations
