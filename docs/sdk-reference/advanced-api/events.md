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
// Level 2: Advanced API - Direct protocol control
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
# Level 2: Advanced API - Direct protocol control
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

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
try {
  // Wait up to 60 seconds for DELIVERED state
  await client.events.waitForState(txId, State.DELIVERED, 60000);
  console.log('Transaction delivered!');
} catch (error) {
  console.log('Timeout waiting for delivery');
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
try:
    # Wait up to 60 seconds for DELIVERED state
    await client.events.wait_for_state(tx_id, State.DELIVERED, 60000)
    print('Transaction delivered!')
except TimeoutError:
    print('Timeout waiting for delivery')
```

</TabItem>
</Tabs>

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
// Level 2: Advanced API - Direct protocol control
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
# Level 2: Advanced API - Direct protocol control
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

# Display each transaction
for tx in as_requester:
    print(f'{tx.tx_id}: {tx.state} - ${tx.amount / 10**6}')
```

</TabItem>
</Tabs>

**Returns:** `Promise<Transaction[]>`

---

### onTransactionCreated()

Subscribe to new transaction creation events.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
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

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
# Subscribe to all new transactions
def on_transaction(event):
    print('New transaction!')
    print(f'  ID: {event.tx_id}')
    print(f'  Requester: {event.requester}')
    print(f'  Provider: {event.provider}')
    print(f'  Amount: {event.amount}')

cleanup = client.events.on_transaction_created(on_transaction)

# Later: Unsubscribe
cleanup()
```

</TabItem>
</Tabs>

---

### onEscrowCreated()

Subscribe to escrow creation events.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
const cleanup = client.events.onEscrowCreated((event) => {
  console.log('Escrow created!');
  console.log('  Escrow ID:', event.escrowId);
  console.log('  Amount:', event.amount);
});
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
def on_escrow(event):
    print('Escrow created!')
    print(f'  Escrow ID: {event.escrow_id}')
    print(f'  Amount: {event.amount}')

cleanup = client.events.on_escrow_created(on_escrow)
```

</TabItem>
</Tabs>

---

### onStateTransitioned()

Subscribe to all state transitions.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
const cleanup = client.events.onStateTransitioned((event) => {
  console.log(`${event.txId}: ${State[event.from]} → ${State[event.to]}`);
});
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
def on_transition(event):
    print(f'{event.tx_id}: {event.from_state} → {event.to_state}')

cleanup = client.events.on_state_transitioned(on_transition)
```

</TabItem>
</Tabs>

---

## Event Types

### TransactionCreated

Emitted when a new transaction is created.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
interface TransactionCreatedEvent {
  txId: string;
  requester: string;
  provider: string;
  amount: bigint;
  serviceHash?: string;
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
class TransactionCreatedEvent(TypedDict):
    tx_id: str
    requester: str
    provider: str
    amount: int
    service_hash: Optional[str]
```

</TabItem>
</Tabs>

### StateTransitioned

Emitted when transaction state changes.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
interface StateTransitionedEvent {
  txId: string;
  from: State;
  to: State;
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
class StateTransitionedEvent(TypedDict):
    tx_id: str
    from_state: State
    to_state: State
```

</TabItem>
</Tabs>

### EscrowCreated

Emitted when escrow is linked.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
interface EscrowCreatedEvent {
  escrowId: string;
  txId: string;
  amount: bigint;
  requester: string;
  provider: string;
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
class EscrowCreatedEvent(TypedDict):
    escrow_id: str
    tx_id: str
    amount: int
    requester: str
    provider: str
```

</TabItem>
</Tabs>

### EscrowReleased

Emitted when escrow funds are released.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
interface EscrowReleasedEvent {
  escrowId: string;
  txId: string;
  providerAmount: bigint;
  feeAmount: bigint;
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
class EscrowReleasedEvent(TypedDict):
    escrow_id: str
    tx_id: str
    provider_amount: int
    fee_amount: int
```

</TabItem>
</Tabs>

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
