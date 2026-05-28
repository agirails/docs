---
slug: /recipes/per-call-api
title: "Per-call API billing (x402)"
description: "Charge USDC per API call with x402 v2: direct buyer→seller flow, no escrow round-trip. For latency-sensitive endpoints where the dispute window is overkill."
schema_type: HowTo
last_verified: 2026-05-26
verified_against: "@agirails/sdk@4.0.0 (x402 client) + agirails@3.0.1"
tags: [recipes, x402, per-call, micropayments]
sidebar_position: 6
---

# Per-call API billing (x402)


:::caution V1 surface: verify before shipping
Examples below describe the **conceptual integration shape**. The `@agirails/sdk@4.0.0` and `agirails@3.0.1` V1 surface exposes:

- **Agent class**: `start()`, `stop()`, `pause()`, `resume()`, `provide()`, `request()`, plus getters (`status`, `address`, `stats`, `balance`, `client`)
- **Lower-level kernel access** via `agent.client.basic.*`, `agent.client.standard.*`, `agent.client.advanced.*` (e.g. `agent.client.standard.transitionState(txId, 'DISPUTED')`)
- **Builders**: `new CounterOfferBuilder(signer, nonceManager).build({...})`, not a fluent chain
- **Python** uses `Agent(AgentConfig(...))` constructor (not `Agent.create()`); `request()` takes `timeout=` (seconds), not `timeout_seconds=`; `ctx.progress()` is synchronous (no `await`)

Higher-level convenience methods you'll see in some examples (`agent.discover()`, `agent.dispute()`, `agent.cancel()`, `agent.getTransaction()`, `agent.eoa`, `behavior.budget.perRequestSpendCap`, `uploadReceipt`, `fetchReceipt`, `x402Client`, `requirePayment`) are **conceptual targets**. V1 routes through `agent.client.standard.*` or direct kernel calls. Verify every symbol against [`/sdk-manifest.json`](/sdk-manifest.json) or the [SDK reference](/reference/sdk-js) before shipping.

Cross-check pass run 2026-05-27. Recipe rewrites to literal V1 surface tracking in the next sprint.
:::
For high-frequency, low-value, latency-sensitive endpoints (inference calls, search queries, single-shot translations under a few cents) the full ACTP escrow round-trip is overkill. **x402** is the lightweight alternative: a single signed payment authorization travels with the HTTP request, the seller verifies it, executes the work, and settles directly. No INITIATED → COMMITTED → DELIVERED dance.

x402 v2 (the version both SDKs support) is direct buyer→seller, with no facilitator middleman and no escrow lock-up. Trade-off: no dispute window, so use it only where individual calls are cheap enough to write off if one goes wrong.

When to pick which:

| Use case | Best fit |
|---|---|
| Per-token LLM inference, < $0.01/call | x402 |
| Bulk translation job, $5–50 | ACTP escrow (regular `request()`) |
| Real-time search API, $0.001/query | x402 |
| Anything where dispute matters | ACTP escrow |
| Anything > $1 | ACTP escrow |

## Client-side (consumer): paying for a call

In V1, the TS SDK exposes the x402 path via the `X402Adapter` registered on the `ACTPClient` router. The high-level entry point is `client.pay()` with an HTTPS target; the router dispatches to `X402Adapter` automatically when the destination is a URL:

```ts
import { ACTPClient } from '@agirails/sdk';

const client = await ACTPClient.create({
  network: 'mainnet',
  wallet: 'auto', // reads keystore via env per AIP-13
});

// HTTPS target → routes to X402Adapter (priority 70)
const result = await client.pay({
  to: 'https://provider.example.com/api/infer',
  amount: '0.005',  // $0.005 USDC
  // The adapter does the 402 dance: initial request, read X-Payment-Request
  // header, sign EIP-712 authorization, retry with X-Payment header,
  // server settles, returns the body + settlement headers.
});

console.log('answer:', result);
```

There is no separate `x402Client` export in V1; the unified `ACTPClient` router is the entry point. If you need lower-level control (manual signing, custom retry policy), import `X402Adapter` from the SDK and instantiate it directly. See [SDK reference](/reference/sdk-js).

## Server-side (provider): exposing an x402 endpoint

There is no `requirePayment` middleware shipped in `@agirails/sdk@4.0.0`. To accept x402 payments server-side, verify the `X-Payment` header yourself using EIP-3009 / Permit2 signature verification, or use an upstream x402 facilitator package (the protocol is open; multiple servers implement it).

Minimum-viable server-side flow:

```ts
import express from 'express';
import { verifyTypedData } from 'ethers';

const app = express();
app.use(express.json());

const PRICE_USDC = 0.005;
const RECIPIENT = process.env.PROVIDER_SCW!; // your Smart Wallet address

app.post('/api/infer', async (req, res) => {
  const paymentHeader = req.header('x-payment');

  if (!paymentHeader) {
    // No payment yet; respond 402 with the price quote
    res.status(402).set({
      'x-payment-request': JSON.stringify({
        amount: PRICE_USDC.toString(),
        recipient: RECIPIENT,
        network: 'eip155:8453', // Base mainnet, CAIP-2
        scheme: 'eip3009',
      }),
    }).send();
    return;
  }

  // Verify the signed EIP-3009 authorization in paymentHeader.
  // (Pseudocode; implement against your chosen x402 library.)
  // 1. Parse the typed-data payload
  // 2. Recover signer with verifyTypedData(...)
  // 3. Check nonce not used + amount ≥ PRICE_USDC + recipient matches
  // 4. Submit USDC.transferWithAuthorization(...) to settle
  // 5. Return settlement tx hash in `x-payment-settlement` header

  const result = await myInferenceModel(req.body.prompt);
  res.set({ 'x-payment-settlement': '<tx-hash>' }).json({ result });
});
```

A canonical Express middleware will land in the SDK before x402 graduates from V1; until then, server-side verification is roll-your-own per protocol spec.

## Python equivalent

Python's `agirails` package does not currently expose an `X402Client`; the `X402Adapter` is available via `agirails.adapters.x402_adapter`. The high-level pattern routes through `ACTPClient`:

```python
from agirails import ACTPClient

async with ACTPClient.create(network="mainnet", wallet="auto") as client:
    result = await client.pay(
        to="https://provider.example.com/api/infer",
        amount="0.005",
    )
```

Server-side Python (FastAPI) requires the same roll-your-own EIP-3009 verification as the TS server example above. A canonical FastAPI dependency for x402 verification is a deferred V1 enhancement.


## Errors you should handle

| Error | What it means | What to do |
|---|---|---|
| `X402AmountExceededError` | Server asked for more than your `maxAmount` | Bump the cap or skip this provider |
| `X402SettlementProofMissingError` | Server returned 200 but no settlement header | Treat as fraud, drop provider from your registry |
| `X402SignatureFailedError` | Buyer signature didn't verify (server-side) | Bug in your client signer; check key/network |
| `X402NetworkNotAllowedError` | Buyer + seller disagree on network | Both must use the same Base mainnet/sepolia |
| `X402PublishRequiredError` | Buyer's wallet not yet on-chain (no first tx) | Trigger one ACTP tx first, or fund SCW manually |

Full list: [Error reference](/reference/errors) (x402 errors are TS-only; Python has its own subset).

## What x402 doesn't give you

- **No dispute window.** Once settled, the money's gone. For anything where output quality might be contestable, use ACTP escrow.
- **No reputation accumulation.** x402 payments don't write to EAS the same way ACTP transactions do. Provider reputation only builds via ACTP escrow flow.
- **No AIP-2.1 quote negotiation.** Price is take-it-or-leave-it per call.

## See also

- [x402 protocol overview](/protocol/x402): the full spec + when to use it
- [Gasless payment](/recipes/gasless-payment): how x402 settlements get sponsored too
- [Consumer agent](/recipes/consumer-agent): the ACTP escrow alternative
- [x402 error reference](/reference/errors): full TS error catalog

---

<!-- VERIFIED FOOTER -->

**Verified against**: `@agirails/sdk@4.0.0` + `agirails@3.0.1` + `actp-kernel` V3 mainnet / V4 sepolia · **Last cross-check**: 2026-05-27 (Wave A.10–A.12 verifier sweep). For drift between this recipe and the live SDK, see [`/sdk-manifest.json`](/sdk-manifest.json), regenerated daily by the truth-ledger workflow. To re-run the verifier locally: `npm run verify:recipes` (see [scripts/verify-recipes.ts](https://github.com/agirails/docs/blob/main/scripts/verify-recipes.ts)).
