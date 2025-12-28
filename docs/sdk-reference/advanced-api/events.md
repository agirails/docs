---
sidebar_position: 4
title: Events
description: Real-time blockchain event monitoring
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Events

The `EventMonitor` module provides real-time monitoring of blockchain events.

---

## Overview

EventMonitor enables:
- Watching transaction state changes
- Waiting for specific states
- Querying transaction history
- Subscribing to new transactions

---

## Methods

### watchTransaction()

Watch for state changes on a specific transaction.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Start watching
const cleanup = client.events.watchTransaction(txId, (newState) => {
  console.log('State changed to:', State[newState]);

  if (newState === State.DELIVERED) {
    console.log('Provider has delivered!');
  }

  if (newState === State.SETTLED) {
    console.log('Transaction complete!');
    cleanup(); // Stop watching
  }
});

// Later: Stop watching manually
cleanup();
```

</TabItem>
<TabItem value="py" label="Python">

```python
def on_state_change(new_state):
    print(f'State changed to: {new_state}')

    if new_state == State.DELIVERED:
        print('Provider has delivered!')

# Start watching
cleanup = client.events.watch_transaction(tx_id, on_state_change)

# Later: Stop watching
cleanup()
```

</TabItem>
</Tabs>

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `txId` | `string` | Transaction ID to watch |
| `callback` | `(state: State) => void` | Called on each state change |

**Returns:** `() => void` - Cleanup function to stop watching

---

### waitForState()

Wait for a transaction to reach a specific state.

```typescript
try {
  // Wait up to 60 seconds for DELIVERED state
  await client.events.waitForState(txId, State.DELIVERED, 60000);
  console.log('Transaction delivered!');
} catch (error) {
  console.log('Timeout waiting for delivery');
}
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `txId` | `string` | - | Transaction ID |
| `targetState` | `State` | - | State to wait for |
| `timeoutMs` | `number` | `60000` | Timeout in milliseconds |

---

### getTransactionHistory()

Get all transactions for an address.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Get transactions where address is requester
const asRequester = await client.events.getTransactionHistory(
  myAddress,
  'requester'
);

// Get transactions where address is provider
const asProvider = await client.events.getTransactionHistory(
  myAddress,
  'provider'
);

console.log(`${asRequester.length} transactions as requester`);
console.log(`${asProvider.length} transactions as provider`);

// Display each transaction
for (const tx of asRequester) {
  console.log(`${tx.txId}: ${State[tx.state]} - $${tx.amount / 1000000n}`);
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Get transactions where address is requester
as_requester = await client.events.get_transaction_history(
    my_address,
    'requester'
)

# Get transactions where address is provider
as_provider = await client.events.get_transaction_history(
    my_address,
    'provider'
)

print(f'{len(as_requester)} transactions as requester')
print(f'{len(as_provider)} transactions as provider')
```

</TabItem>
</Tabs>

**Returns:** `Promise<Transaction[]>`

---

### onTransactionCreated()

Subscribe to new transaction creation events.

```typescript
// Subscribe to all new transactions
const cleanup = client.events.onTransactionCreated((event) => {
  console.log('New transaction!');
  console.log('  ID:', event.txId);
  console.log('  Requester:', event.requester);
  console.log('  Provider:', event.provider);
  console.log('  Amount:', event.amount);
});

// Later: Unsubscribe
cleanup();
```

---

### onEscrowCreated()

Subscribe to escrow creation events.

```typescript
const cleanup = client.events.onEscrowCreated((event) => {
  console.log('Escrow created!');
  console.log('  Escrow ID:', event.escrowId);
  console.log('  Amount:', event.amount);
});
```

---

### onStateTransitioned()

Subscribe to all state transitions.

```typescript
const cleanup = client.events.onStateTransitioned((event) => {
  console.log(`${event.txId}: ${State[event.from]} → ${State[event.to]}`);
});
```

---

## Event Types

### TransactionCreated

Emitted when a new transaction is created.

```typescript
interface TransactionCreatedEvent {
  txId: string;
  requester: string;
  provider: string;
  amount: bigint;
  serviceHash?: string;
}
```

### StateTransitioned

Emitted when transaction state changes.

```typescript
interface StateTransitionedEvent {
  txId: string;
  from: State;
  to: State;
}
```

### EscrowCreated

Emitted when escrow is linked.

```typescript
interface EscrowCreatedEvent {
  escrowId: string;
  txId: string;
  amount: bigint;
  requester: string;
  provider: string;
}
```

### EscrowReleased

Emitted when escrow funds are released.

```typescript
interface EscrowReleasedEvent {
  escrowId: string;
  txId: string;
  providerAmount: bigint;
  feeAmount: bigint;
}
```

---

## Example: Provider Listener

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { ACTPClient, State } from '@agirails/sdk';

async function runProviderListener() {
  const client = await ACTPClient.create({
    mode: 'testnet',
    privateKey: process.env.PRIVATE_KEY!,
  });

  const myAddress = await client.getAddress();
  console.log('Listening for jobs as:', myAddress);

  // Listen for new transactions addressed to me
  client.events.onTransactionCreated(async (event) => {
    if (event.provider.toLowerCase() !== myAddress.toLowerCase()) {
      return; // Not for me
    }

    console.log('New job received!');
    console.log('  From:', event.requester);
    console.log('  Amount:', event.amount / 1000000n, 'USDC');

    // Watch this transaction for state changes
    client.events.watchTransaction(event.txId, (state) => {
      if (state === State.COMMITTED) {
        console.log('Escrow locked - start working!');
        // Trigger your AI agent work here
      }
    });
  });

  console.log('Provider listener running...');
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails import ACTPClient, State

async def run_provider_listener():
    client = await ACTPClient.create(
        mode='testnet',
        private_key=os.environ['PRIVATE_KEY'],
    )

    my_address = await client.get_address()
    print(f'Listening for jobs as: {my_address}')

    def on_new_transaction(event):
        if event.provider.lower() != my_address.lower():
            return  # Not for me

        print('New job received!')
        print(f'  From: {event.requester}')
        print(f'  Amount: {event.amount / 10**6} USDC')

        def on_state_change(state):
            if state == State.COMMITTED:
                print('Escrow locked - start working!')
                # Trigger your AI agent work here

        client.events.watch_transaction(event.tx_id, on_state_change)

    client.events.on_transaction_created(on_new_transaction)
    print('Provider listener running...')
```

</TabItem>
</Tabs>

---

## Performance Notes

- **Testnet/Mainnet**: Uses blockchain event subscriptions (WebSocket)
- **Mock Mode**: Uses in-memory event emitter (instant)
- **History queries**: May be slow for large transaction volumes
- **Recommendation**: Use off-chain indexer for production queries

---

## Next Steps

- [Kernel](./kernel) - Trigger state transitions
- [Escrow](./escrow) - Monitor fund movements
- [EAS](./eas) - Create delivery attestations
