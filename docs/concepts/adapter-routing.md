---
sidebar_position: 7
title: Adapter Routing
description: How AGIRAILS routes payments through the right adapter based on target format and priority
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Adapter Routing

AGIRAILS uses a **priority-based adapter system** to route payments to the correct protocol based on the payment target. This means `client.pay()` works with EVM addresses, HTTP URLs, and agent IDs — the router figures out the rest.

---

## How It Works

When you call `client.pay()`, the `AdapterRouter` evaluates registered adapters in **descending priority order**. The first adapter whose `canHandle()` guard returns `true` processes the payment.

```
client.pay({ to: "...", amount: "10.00" })
       │
       ▼
  AdapterRouter
       │
       ├── X402Adapter (priority 70)  → handles https:// URLs
       ├── StandardAdapter (priority 60) → handles 0x... addresses (full escrow)
       └── BasicAdapter (priority 50)  → handles 0x... addresses (simple transfer)
```

---

## Adapters

### X402Adapter (Priority 70)

HTTP-native instant payments via the [x402 protocol](./x402-protocol). Triggered when the `to` field is an `https://` URL.

- Instant settlement (no escrow lifecycle)
- Optional relay fee splitting via X402Relay contract
- Requires `transfer_fn` configuration

### StandardAdapter (Priority 60)

Full ACTP escrow lifecycle. Triggered for `0x...` EVM addresses.

- `createTransaction` → `linkEscrow` → state transitions → `releaseEscrow`
- Dispute window protection
- On-chain settlement with EAS attestations

### BasicAdapter (Priority 50)

Simple pay-and-forget. Also handles `0x...` addresses but at lower priority.

- Single `payACTPBatched` call via Smart Wallet (ERC-4337)
- Used when `walletProvider` supports batched transactions
- Falls through to StandardAdapter if no Smart Wallet

---

## ERC-8004 Resolution

When the `to` field is a numeric agent ID (e.g., `"12345"`), the router resolves it to an EVM address via the [ERC-8004 Identity Bridge](./erc8004-identity) before selecting an adapter:

```
"12345" → ERC8004Bridge.getAgentWallet("12345") → "0x21fd..." → StandardAdapter
```

This resolution is transparent — you can pass agent IDs directly to `client.pay()`.

---

## Smart Wallet Routing Fix

When a `walletProvider` with `payACTPBatched` support is active, `client.pay()` bypasses the AdapterRouter and routes directly to `BasicAdapter`. This prevents the "Requester mismatch" error that occurs when `StandardAdapter` (priority 60) wins over `BasicAdapter` (priority 50) but lacks batched transaction support.

---

## Examples

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript">

```typescript
import { ACTPClient } from '@agirails/sdk';

const client = await ACTPClient.create({ mode: 'testnet' });

// EVM address → StandardAdapter (priority 60)
await client.pay({ to: '0xProvider...', amount: '10.00' });

// HTTP URL → X402Adapter (priority 70)
await client.pay({ to: 'https://api.example.com/pay', amount: '5.00' });

// Agent ID → ERC-8004 resolve → StandardAdapter
await client.pay({ to: '12345', amount: '10.00' });
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails import ACTPClient

client = await ACTPClient.create(mode="testnet")

# EVM address → StandardAdapter (priority 60)
await client.pay({"to": "0xProvider...", "amount": "10.00"})

# HTTP URL → X402Adapter (priority 70)
await client.pay({"to": "https://api.example.com/pay", "amount": "5.00"})

# Agent ID → ERC-8004 resolve → StandardAdapter
await client.pay({"to": "12345", "amount": "10.00"})
```

</TabItem>
</Tabs>

---

## Custom Adapters

You can register custom adapters by implementing the `IAdapter` interface:

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript">

```typescript
import { IAdapter, AdapterMetadata, UnifiedPayParams } from '@agirails/sdk';

class MyAdapter implements IAdapter {
  metadata: AdapterMetadata = {
    name: 'my-adapter',
    priority: 55,  // Between Basic and Standard
    protocols: ['custom'],
  };

  canHandle(params: UnifiedPayParams): boolean {
    return params.to.startsWith('custom://');
  }

  async pay(params: UnifiedPayParams) {
    // Custom payment logic
  }
}

// Register with router
client.adapterRouter.register(new MyAdapter());
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails.adapters.i_adapter import IAdapter
from agirails.adapters.types import AdapterMetadata, UnifiedPayParams

class MyAdapter(IAdapter):
    metadata = AdapterMetadata(
        name="my-adapter",
        priority=55,
        protocols=["custom"],
    )

    def can_handle(self, params: UnifiedPayParams) -> bool:
        return params.to.startswith("custom://")

    async def pay(self, params: UnifiedPayParams):
        # Custom payment logic
        pass
```

</TabItem>
</Tabs>

---

**Next:** [x402 Protocol](./x402-protocol) · [ERC-8004 Identity](./erc8004-identity) · [Transaction Lifecycle](./transaction-lifecycle)
