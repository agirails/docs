---
sidebar_position: 1
title: Advanced API Overview
description: Full protocol control with ACTPClient
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Advanced API

The **Advanced API** provides full control over the ACTP protocol through `ACTPClient`. This is the foundation that Basic and Standard APIs are built upon.

Use Advanced API when you need:
- Direct transaction lifecycle control
- Custom escrow handling
- Attestation management
- Integration with external systems (n8n, LangChain, etc.)

---

## ACTPClient

The main entry point for all Advanced API operations.

### create()

Factory method to create an ACTPClient instance.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { ACTPClient } from '@agirails/sdk';

const client = await ACTPClient.create(config: ACTPClientConfig);
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails import ACTPClient

client = await ACTPClient.create(config)
```

</TabItem>
</Tabs>

### ACTPClientConfig

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `mode` | `'mock' \| 'testnet' \| 'mainnet'` | Yes | Operating mode |
| `requesterAddress` | `string` | Yes | Your wallet address |
| `privateKey` | `string` | Testnet/Mainnet | Signing key (0x-prefixed) |
| `stateDirectory` | `string` | No | State path (mock only) |
| `rpcUrl` | `string` | No | Custom RPC URL |
| `eas` | `EASConfig` | No | Attestation configuration |

### Modes

| Mode | Description | Requirements |
|------|-------------|--------------|
| `mock` | Local development | None - state stored in `.actp/` |
| `testnet` | Base Sepolia | `privateKey`, ETH for gas, Mock USDC |
| `mainnet` | Base Mainnet | `privateKey`, ETH for gas, Real USDC |

### Example

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
import { ACTPClient } from '@agirails/sdk';

// Mock mode (development)
const mockClient = await ACTPClient.create({
  mode: 'mock',
  requesterAddress: '0x1234567890123456789012345678901234567890',
});

// Testnet mode (testing)
const testnetClient = await ACTPClient.create({
  mode: 'testnet',
  requesterAddress: '0x...', // Will be derived from privateKey
  privateKey: process.env.PRIVATE_KEY!,
  rpcUrl: 'https://base-sepolia.g.alchemy.com/v2/YOUR_KEY', // Optional
});

// Mainnet mode (production)
const mainnetClient = await ACTPClient.create({
  mode: 'mainnet',
  requesterAddress: '0x...',
  privateKey: process.env.PRIVATE_KEY!,
  rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/YOUR_KEY',
});
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
from agirails import ACTPClient
import os

# Mock mode (development)
mock_client = await ACTPClient.create({
    'mode': 'mock',
    'requester_address': '0x1234567890123456789012345678901234567890',
})

# Testnet mode (testing)
testnet_client = await ACTPClient.create({
    'mode': 'testnet',
    'requesterAddress': '0x...',
    'privateKey': os.environ['PRIVATE_KEY'],
    'rpcUrl': 'https://base-sepolia.g.alchemy.com/v2/YOUR_KEY',
})
```

</TabItem>
</Tabs>

---

## Client Properties

| Property | Type | Description |
|----------|------|-------------|
| `basic` | `BasicAdapter` | Basic API adapter (pay, checkStatus) |
| `standard` | `StandardAdapter` | Standard API adapter (createTransaction, etc.) |
| `advanced` | `IACTPRuntime` | Direct protocol access (Level 2) |
| `mode` | `ACTPClientMode` | Current operating mode |

---

## API Adapters

ACTPClient provides three access levels:

### client.basic

High-level, opinionated API for simple use cases.

```typescript
// Create and fund a payment in one call
const result = await client.basic.pay({
  to: '0xProvider...',
  amount: '100',
  deadline: '+24h',
});

// Check status with action hints
const status = await client.basic.checkStatus(result.txId);
if (status.canComplete) {
  console.log('Provider can deliver now');
}
```

See [Basic API](../basic-api) for full documentation.

### client.standard

Balanced API with explicit lifecycle control.

```typescript
// Create transaction (INITIATED state)
const txId = await client.standard.createTransaction({
  provider: '0xProvider...',
  amount: '100',
  deadline: '+7d',
});

// Link escrow (auto-transitions to COMMITTED)
const escrowId = await client.standard.linkEscrow(txId);

// Transition state
await client.standard.transitionState(txId, 'DELIVERED');

// Release escrow after dispute window
await client.standard.releaseEscrow(escrowId, {
  txId,
  attestationUID: '0x...',
});

// Get transaction details
const tx = await client.standard.getTransaction(txId);
console.log('State:', tx?.state);
```

### client.advanced

Direct protocol access for full control with protocol-level types (wei strings, unix timestamps).

```typescript
// Level 2: Advanced API - Direct protocol control
import { ACTPClient, State } from '@agirails/sdk';
import { parseUnits } from 'ethers';

const client = await ACTPClient.create({
  mode: 'mock',
  requesterAddress: '0x...',
  privateKey: process.env.PRIVATE_KEY,
});

// Create transaction with protocol-level types
const txId = await client.advanced.createTransaction({
  provider: '0x...',
  requester: '0x...',
  amount: parseUnits('100', 6),  // Wei (6 decimals for USDC)
  deadline: Math.floor(Date.now() / 1000) + 86400,
  disputeWindow: 172800,
});

// Get transaction
const tx = await client.advanced.getTransaction(txId);

// State transitions
await client.advanced.linkEscrow(txId);
await client.advanced.transitionState(txId, State.DELIVERED, '0x');

// Time control (mock only)
if ('time' in client.advanced) {
  client.advanced.time.advance(3600); // Advance 1 hour
}

// Token minting (mock only)
if ('mintTokens' in client.advanced) {
  await client.advanced.mintTokens('0x...', '1000000000'); // 1000 USDC
}
```

---

## Protocol Modules

The Advanced API exposes protocol modules for direct access:

| Module | Description | Documentation |
|--------|-------------|---------------|
| **Kernel** | Transaction lifecycle | [kernel.md](./kernel) |
| **Escrow** | Fund management | [escrow.md](./escrow) |
| **Events** | Real-time monitoring | [events.md](./events) |
| **EAS** | Attestations | [eas.md](./eas) |
| **Quote** | Price negotiation | [quote.md](./quote) |
| **ProofGenerator** | Delivery proofs | [proof-generator.md](./proof-generator) |
| **MessageSigner** | EIP-712 signing | [message-signer.md](./message-signer) |

---

## Transaction States

The ACTP protocol implements an 8-state machine:

```
INITIATED → QUOTED → COMMITTED → IN_PROGRESS → DELIVERED → SETTLED
    ↓          ↓          ↓           ↓              ↓
CANCELLED  CANCELLED  CANCELLED   CANCELLED      DISPUTED → SETTLED
```

| State | Description | Terminal |
|-------|-------------|----------|
| `INITIATED` | Created, no escrow | No |
| `QUOTED` | Provider quote (optional) | No |
| `COMMITTED` | Escrow linked, funds locked | No |
| `IN_PROGRESS` | Provider working (optional) | No |
| `DELIVERED` | Work delivered with proof | No |
| `SETTLED` | Payment released | Yes |
| `DISPUTED` | Under dispute resolution | No |
| `CANCELLED` | Cancelled before completion | Yes |

---

## Helper Methods

### getAddress()

Get the client's wallet address.

```typescript
const address = client.getAddress();
console.log('My address:', address);
```

### mintTokens() (Mock only)

Mint test USDC tokens.

```typescript
// Mint 1000 USDC to yourself
await client.mintTokens(client.getAddress(), '1000000000');

// Mint to another address
await client.mintTokens('0x...', '500000000');
```

### getBalance()

Get USDC balance.

```typescript
const balance = await client.getBalance(client.getAddress());
console.log('Balance:', balance); // Wei (6 decimals)
```

### reset() (Mock only)

Reset mock state to initial values.

```typescript
await client.reset();
console.log('State reset to defaults');
```

---

## Error Handling

The SDK provides typed errors for precise handling:

```typescript
import {
  ACTPError,
  InsufficientFundsError,
  TransactionNotFoundError,
  InvalidStateTransitionError,
  DeadlineExpiredError,
  ValidationError,
} from '@agirails/sdk';

try {
  await client.standard.createTransaction({ ... });
} catch (error) {
  if (error instanceof InsufficientFundsError) {
    console.log('Need more USDC:', error.required, 'have:', error.available);
  } else if (error instanceof ValidationError) {
    console.log('Invalid input:', error.field, error.message);
  } else if (error instanceof DeadlineExpiredError) {
    console.log('Transaction expired at:', error.deadline);
  } else if (error instanceof ACTPError) {
    console.log('ACTP error:', error.code, error.message);
  } else {
    throw error; // Unknown error
  }
}
```

See [Errors](../errors) for complete error hierarchy.

---

## Complete Example

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
import { ACTPClient, State } from '@agirails/sdk';
import { parseUnits } from 'ethers';

async function main() {
  // Create client
  const client = await ACTPClient.create({
    mode: 'mock',
    requesterAddress: '0x1111111111111111111111111111111111111111',
  });

  // Setup: Mint tokens
  const requester = client.getAddress();
  const provider = '0x2222222222222222222222222222222222222222';

  await client.mintTokens(requester, '1000000000'); // 1000 USDC
  await client.mintTokens(provider, '100000000');   // 100 USDC

  console.log('Requester balance:', await client.getBalance(requester));

  // Create transaction with protocol-level types
  const txId = await client.advanced.createTransaction({
    provider,
    requester,
    amount: parseUnits('50', 6),
    deadline: Math.floor(Date.now() / 1000) + 86400,
    disputeWindow: 172800,
  });
  console.log('Created transaction:', txId);

  // Link escrow (locks funds, auto-transitions to COMMITTED)
  await client.advanced.linkEscrow(txId);
  console.log('Escrow linked');

  // Check transaction state
  let tx = await client.advanced.getTransaction(txId);
  console.log('State after escrow:', tx?.state); // COMMITTED

  // Provider delivers
  await client.advanced.transitionState(txId, State.IN_PROGRESS, '0x');
  await client.advanced.transitionState(txId, State.DELIVERED, '0x');

  tx = await client.advanced.getTransaction(txId);
  console.log('State after delivery:', tx?.state); // DELIVERED

  // Wait for dispute window (mock: advance time)
  if ('time' in client.advanced) {
    client.advanced.time.advance(172801); // 2 days + 1 second
  }

  // Settle transaction
  await client.advanced.transitionState(txId, State.SETTLED, '0x');

  tx = await client.advanced.getTransaction(txId);
  console.log('Final state:', tx?.state); // SETTLED

  console.log('Provider balance:', await client.getBalance(provider));
}

main().catch(console.error);
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
import asyncio
import time
from agirails import ACTPClient, State

async def main():
    # Create client
    client = await ACTPClient.create({
        'mode': 'mock',
        'requester_address': '0x1111111111111111111111111111111111111111',
    })

    # Setup: Mint tokens
    requester = client.get_address()
    provider = '0x2222222222222222222222222222222222222222'

    await client.mint_tokens(requester, '1000000000')  # 1000 USDC
    await client.mint_tokens(provider, '100000000')    # 100 USDC

    print(f'Requester balance: {await client.get_balance(requester)}')

    # Create transaction with protocol-level types
    tx_id = await client.advanced.create_transaction({
        'provider': provider,
        'requester': requester,
        'amount': '50000000',  # $50 in wei (6 decimals)
        'deadline': int(time.time()) + 86400,
        'dispute_window': 172800,
    })
    print(f'Created transaction: {tx_id}')

    # Link escrow (auto-transitions to COMMITTED)
    await client.advanced.link_escrow(tx_id)
    print('Escrow linked')

    # Provider delivers
    await client.advanced.transition_state(tx_id, State.IN_PROGRESS, b'')
    await client.advanced.transition_state(tx_id, State.DELIVERED, b'')

    # Wait for dispute window (mock: advance time)
    client.advanced.time.advance(172801)

    # Settle transaction
    await client.advanced.transition_state(tx_id, State.SETTLED, b'')

    tx = await client.advanced.get_transaction(tx_id)
    print(f'Final state: {tx["state"]}')

asyncio.run(main())
```

</TabItem>
</Tabs>

---

## Next Steps

- [Kernel](./kernel) - Transaction lifecycle methods
- [Escrow](./escrow) - Fund management
- [Events](./events) - Real-time monitoring
- [Examples](/examples) - Complete examples
