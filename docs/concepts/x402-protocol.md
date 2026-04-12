---
sidebar_position: 8
title: x402 Protocol
description: HTTP-native instant payments via the x402 v2 standard
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# x402 Protocol

The **x402 protocol** enables HTTP-native instant payments. Instead of the full ACTP escrow lifecycle, x402 processes payments in a single HTTP request — ideal for micropayments and API monetization.

As of `@agirails/sdk@3.3.0`, the SDK speaks the **real x402 v2 wire protocol** (EIP-3009 / Permit2 signing, CAIP-2 networks) and is interoperable with any x402 v2 server (Coinbase, third-party, self-hosted).

---

## How It Works

```
1. Client sends request to HTTPS endpoint
2. Server responds with 402 + payment-required header (x402 v2 format)
3. Client signs EIP-3009 (EOA) or Permit2 (Smart Wallet) authorization off-chain
4. Facilitator submits on-chain settlement, server returns the response
```

The `X402Adapter` is **auto-registered** on `ACTPClient.create()` when a wallet provider is present. No manual setup needed.

---

## Zero Fee Layer

x402 payments go directly from buyer to seller via the facilitator. **No AGIRAILS fee** on x402 — `payTo` is the seller's address at 100%.

:::note X402Relay Deprecated
The `X402Relay` fee-splitting contract (Base Mainnet `0x81DF...`, Base Sepolia `0x4DCD...`) is **deprecated** as of SDK 3.3.0. It remains deployed for historical compatibility but is no longer used by the SDK.
:::

---

## SDK Integration

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript — Buyer">

```typescript
import { ACTPClient } from '@agirails/sdk';

const client = await ACTPClient.create({ mode: 'testnet' });

// X402Adapter auto-registered — pay any HTTPS URL
const result = await client.pay({
  to: 'https://api.example.com/translate',
  metadata: { paymentMethod: 'x402' },  // explicit opt-in
});

console.log(result.txId);     // on-chain settlement tx hash
console.log(result.success);  // true
// No release() needed — x402 is atomic
```

</TabItem>
<TabItem value="ts-seller" label="TypeScript — Seller">

```typescript
import { buildX402Server } from '@agirails/sdk/server';
import { paymentMiddleware } from '@x402/express';
import express from 'express';

const { httpServer, routes } = await buildX402Server({
  payTo: '0xYourAddress',
  network: 'eip155:84532',  // Base Sepolia
  routes: [
    { route: 'GET /api/translate', price: '$0.10', description: 'Translation' },
  ],
});

const app = express();
app.use(paymentMiddleware(routes, httpServer));
app.get('/api/translate', (req, res) => res.json({ result: '...' }));
app.listen(3000);
```

</TabItem>
<TabItem value="py" label="Python — Buyer">

```python
from agirails import ACTPClient

client = await ACTPClient.create(mode="testnet")

result = await client.pay({
    "to": "https://api.example.com/translate",
    "metadata": {"paymentMethod": "x402"},
})
```

</TabItem>
</Tabs>

---

## Smart Wallet Support

Smart Wallets (Tier 1, ERC-4337) work via the **Permit2 path**:

1. One-time `USDC.approve(PERMIT2_ADDRESS, MAX_UINT256)` — sponsored by paymaster, zero cost
2. Each payment: off-chain Permit2 witness signature → facilitator settles on-chain
3. ERC-1271 (deployed) and ERC-6492 (counterfactual) signatures both supported

EOA wallets (Tier 2) use the standard EIP-3009 `transferWithAuthorization` path.

---

## Security

- **Strict HTTPS only** — `http://` rejected to prevent MITM interception of signed payloads
- **Explicit opt-in** — `metadata.paymentMethod: 'x402'` or host in `allowedHosts` required
- **Per-tx safety cap** — Default $1 USDC (`maxAmountPerTx` configurable)
- **Asset allowlist** — Only canonical USDC per chain accepted by default
- **MEV hard cap** — 5 min authorization validity window

---

## When to Use x402 vs ACTP

| | x402 | ACTP (Standard) |
|--|------|-----------------|
| **Settlement** | Instant (atomic) | Escrow lifecycle |
| **Dispute protection** | None | Full dispute window |
| **Best for** | Micropayments, APIs | Large transactions, services |
| **Minimum viable** | Single HTTP call | 3+ on-chain calls |
| **AGIRAILS fee** | None (zero) | 1% ($0.05 min) |
| **Smart Wallet** | Yes (Permit2) | Yes (batched UserOp) |

**Rule of thumb:** Use x402 for synchronous API calls where instant settlement matters. Use ACTP for anything requiring dispute protection or service delivery verification.

---

**Next:** [Adapter Routing](./adapter-routing) · [ERC-8004 Identity](./erc8004-identity) · [Fee Model](./fee-model)
