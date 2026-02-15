---
sidebar_position: 8
title: x402 Protocol
description: HTTP-native instant payments with optional relay fee splitting
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# x402 Protocol

The **x402 protocol** enables HTTP-native instant payments. Instead of the full ACTP escrow lifecycle, x402 processes payments in a single HTTP request — ideal for micropayments and API monetization.

---

## How It Works

x402 payments use the HTTP `402 Payment Required` status code as a payment negotiation mechanism:

```
1. Client sends request to API endpoint
2. Server responds with 402 + payment details (amount, address, token)
3. Client signs payment authorization
4. Server verifies payment and returns the response
```

In AGIRAILS, the `X402Adapter` handles this flow transparently through `client.pay()`.

---

## X402Relay Contract

For fee splitting, AGIRAILS deploys an on-chain `X402Relay` contract that calculates and distributes fees:

```
grossAmount → X402Relay → provider gets (amount - fee)
                       → treasury gets fee
```

**Fee formula:** `max(grossAmount * bps / 10000, MIN_FEE)`

| Parameter | Value |
|-----------|-------|
| **Default BPS** | 100 (1%) |
| **MIN_FEE** | 50,000 ($0.05 USDC) |
| **MAX_FEE_CAP** | 500 (5%) |

### Deployed Addresses

| Network | Address |
|---------|---------|
| **Base Sepolia** | `0x4DCD02b276Dbeab57c265B72435e90507b6Ac81A` |
| **Base Mainnet** | `0x81DFb954A3D58FEc24Fc9c946aC2C71a911609F8` |

---

## SDK Integration

The `X402Adapter` registers at **priority 70** (highest) and handles any `to` target starting with `https://`:

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript">

```typescript
import { ACTPClient } from '@agirails/sdk';

const client = await ACTPClient.create({ mode: 'testnet' });

// X402Adapter auto-selected for HTTPS URLs
const result = await client.pay({
  to: 'https://api.example.com/translate',
  amount: '0.50',  // $0.50 USDC
});
```

**With relay config:**

```typescript
import { X402Adapter, X402AdapterConfig } from '@agirails/sdk';

const x402 = new X402Adapter({
  relayAddress: '0x4DCD02b276Dbeab57c265B72435e90507b6Ac81A',
  treasuryAddress: '0x866E...',
  feeBps: 100,
  transferFn: async (to, amount) => { /* USDC transfer */ },
});

client.adapterRouter.register(x402);
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails import ACTPClient

client = await ACTPClient.create(mode="testnet")

# X402Adapter auto-selected for HTTPS URLs
result = await client.pay({
    "to": "https://api.example.com/translate",
    "amount": "0.50",
})
```

**With relay config:**

```python
from agirails.adapters.x402_adapter import X402Adapter, X402AdapterConfig

x402 = X402Adapter(X402AdapterConfig(
    relay_address="0x4DCD02b276Dbeab57c265B72435e90507b6Ac81A",
    treasury_address="0x866E...",
    fee_bps=100,
    transfer_fn=my_transfer_function,
))

client.adapter_router.register(x402)
```

</TabItem>
</Tabs>

---

## When to Use x402 vs ACTP

| | x402 | ACTP (Standard) |
|--|------|-----------------|
| **Settlement** | Instant | Escrow lifecycle |
| **Dispute protection** | None | Full dispute window |
| **Best for** | Micropayments, APIs | Large transactions, services |
| **Minimum viable** | Single HTTP call | 3+ on-chain calls |
| **Fee** | 1% (relay) | 1% (platform) |

**Rule of thumb:** Use x402 for payments under $10 where instant settlement matters. Use ACTP for anything requiring dispute protection or service delivery verification.

---

**Next:** [Adapter Routing](./adapter-routing) · [ERC-8004 Identity](./erc8004-identity) · [Fee Model](./fee-model)
