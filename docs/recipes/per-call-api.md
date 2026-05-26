---
slug: /recipes/per-call-api
title: "Per-call API billing (x402)"
description: "Charge USDC per API call with x402 v2 — direct buyer→seller flow, no escrow round-trip. For latency-sensitive endpoints where the dispute window is overkill."
schema_type: HowTo
last_verified: 2026-05-26
verified_against: "@agirails/sdk@4.0.0 (x402 client) + agirails@3.0.1"
tags: [recipes, x402, per-call, micropayments]
sidebar_position: 6
---

# Per-call API billing (x402)

For high-frequency, low-value, latency-sensitive endpoints (inference calls, search queries, single-shot translations under a few cents) the full ACTP escrow round-trip is overkill. **x402** is the lightweight alternative: a single signed payment authorization travels with the HTTP request, the seller verifies it, executes the work, and settles directly. No INITIATED → COMMITTED → DELIVERED dance.

x402 v2 (the version both SDKs support) is direct buyer→seller — no facilitator middleman, no escrow lock-up. Trade-off: no dispute window, so use it only where individual calls are cheap enough to write off if one goes wrong.

When to pick which:

| Use case | Best fit |
|---|---|
| Per-token LLM inference, < $0.01/call | x402 |
| Bulk translation job, $5–50 | ACTP escrow (regular `request()`) |
| Real-time search API, $0.001/query | x402 |
| Anything where dispute matters | ACTP escrow |
| Anything > $1 | ACTP escrow |

## Server-side (provider): exposing an x402 endpoint

```ts
import express from 'express';
import { x402, requirePayment } from '@agirails/sdk';

const app = express();

app.post('/api/infer', requirePayment({
  amount: 0.005,               // $0.005 USDC per call
  recipient: process.env.PROVIDER_EOA!, // your earning address
  network: 'mainnet',
}), async (req, res) => {
  // requirePayment middleware already verified the x402-payment header.
  // If we got here, payment is good.
  const result = await myInferenceModel(req.body.prompt);
  res.json({ result });
});
```

The middleware does the verifier dance for you:

1. Reads the `X-Payment` header (EIP-712 signed authorization).
2. Verifies signature against the buyer's claimed EOA.
3. Checks nonce hasn't been used.
4. Confirms amount ≥ required amount.
5. Settles by calling `USDC.transferFrom(buyer, recipient, amount)` (gasless via paymaster if available).
6. Sets `X-Payment-Settlement` response header with the on-chain tx hash.
7. If anything fails, returns `402 Payment Required` with the error.

## Client-side (consumer): paying for a call

```ts
import { x402Client } from '@agirails/sdk';

const client = x402Client({
  network: 'mainnet',
  privateKey: process.env.ACTP_PRIVATE_KEY!,
});

const response = await client.fetch('https://provider.example.com/api/infer', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ prompt: 'Translate "hello" to Spanish' }),
  payment: { maxAmount: 0.01 },  // pay up to $0.01, fail otherwise
});

const result = await response.json();
console.log('answer:', result);
console.log('paid:', response.headers.get('x-payment-settlement-amount'));
```

The client:

1. Makes the initial request (no payment header).
2. Gets back `402 Payment Required` with `X-Payment-Request` header describing amount + recipient + network.
3. Validates the requested amount is ≤ `maxAmount`.
4. Builds + signs the EIP-712 payment authorization.
5. Retries with `X-Payment` header attached.
6. Server settles, returns the result + settlement tx hash.

The two-trip handshake is invisible to your code — `client.fetch` returns once the whole dance finishes.

## Python equivalent

```python
from agirails.x402 import X402Client

client = X402Client(
    network="mainnet",
    private_key=os.environ["ACTP_PRIVATE_KEY"],
)

response = await client.post(
    "https://provider.example.com/api/infer",
    json={"prompt": "…"},
    max_payment=0.01,
)
result = await response.json()
```

Server-side Python (FastAPI) — see [`x402.middleware`](https://github.com/agirails/sdk-python/blob/main/src/agirails/x402/middleware.py) for the dependency.

## Errors you should handle

| Error | What it means | What to do |
|---|---|---|
| `X402AmountExceededError` | Server asked for more than your `maxAmount` | Bump the cap or skip this provider |
| `X402SettlementProofMissingError` | Server returned 200 but no settlement header | Treat as fraud, drop provider from your registry |
| `X402SignatureFailedError` | Buyer signature didn't verify (server-side) | Bug in your client signer — check key/network |
| `X402NetworkNotAllowedError` | Buyer + seller disagree on network | Both must use the same Base mainnet/sepolia |
| `X402PublishRequiredError` | Buyer's wallet not yet on-chain (no first tx) | Trigger one ACTP tx first, or fund SCW manually |

Full list: [Error reference](/reference/errors) (x402 errors are TS-only — Python has its own subset).

## What x402 doesn't give you

- **No dispute window.** Once settled, the money's gone. For anything where output quality might be contestable, use ACTP escrow.
- **No reputation accumulation.** x402 payments don't write to EAS the same way ACTP transactions do. Provider reputation only builds via ACTP escrow flow.
- **No AIP-2.1 quote negotiation.** Price is take-it-or-leave-it per call.

## See also

- [x402 protocol overview](/protocol/x402) — the full spec + when to use it
- [Gasless payment](/recipes/gasless-payment) — how x402 settlements get sponsored too
- [Consumer agent](/recipes/consumer-agent) — the ACTP escrow alternative
- [x402 error reference](/reference/errors) — full TS error catalog
