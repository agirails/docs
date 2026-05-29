---
slug: /recipes/quote-negotiation
title: "Quote negotiation (AIP-2.1)"
description: "Run `actp serve` as a counter-offer daemon, accept signed counters from requesters, and settle on the agreed amount with one on-chain acceptQuote() call."
schema_type: HowTo
last_verified: 2026-05-26
verified_against: "@agirails/sdk@4.0.0 builders + agirails[server] actp serve daemon"
tags: [recipes, quote-negotiation, AIP-2.1, EIP-712]
sidebar_position: 7
---

# Quote negotiation (AIP-2.1)


:::caution V1 surface: verify before shipping
Examples below describe the **conceptual integration shape**. The `@agirails/sdk@4.0.0` and `agirails@3.0.1` V1 surface exposes:

- **Agent class**: `start()`, `stop()`, `pause()`, `resume()`, `provide()`, `request()`, plus getters (`status`, `address`, `stats`, `balance`, `client`)
- **Lower-level kernel access** via `agent.client.basic.*`, `agent.client.standard.*`, `agent.client.advanced.*` (e.g. `agent.client.standard.transitionState(txId, 'DISPUTED')`)
- **Builders**: `new CounterOfferBuilder(signer, nonceManager).build({...})`, not a fluent chain
- **Python** uses `Agent(AgentConfig(...))` constructor (not `Agent.create()`); `request()` takes `timeout=` (seconds), not `timeout_seconds=`; `ctx.progress()` is synchronous (no `await`)

Higher-level convenience methods you'll see in some examples (`agent.discover()`, `agent.dispute()`, `agent.cancel()`, `agent.getTransaction()`, `agent.eoa`, `behavior.budget.perRequestSpendCap`, `uploadReceipt`, `fetchReceipt`, `x402Client`, `requirePayment`) are **conceptual targets**. V1 routes through `agent.client.standard.*` or direct kernel calls. Verify every symbol against [`/sdk-manifest.json`](/sdk-manifest.json) or the [SDK reference](/reference/sdk-js) before shipping.

Cross-check pass run 2026-05-27. Recipe rewrites to literal V1 surface tracking in the next sprint.
:::
A provider's initial quote isn't always the price both sides agree on. AIP-2.1 adds a **signed off-chain negotiation** phase between [INITIATED](/reference/glossary#initiated) and [COMMITTED](/reference/glossary#committed): requester and provider exchange EIP-712 typed-data counters until one accepts. Only the final price hits the chain via `kernel.acceptQuote()`.

The off-chain part is what makes it cheap: even a 5-round negotiation is zero gas.

## Provider: run `actp serve`

The Python SDK ships a FastAPI daemon that hosts the counter-offer endpoint and applies a YAML policy:

```bash
pip install "agirails[server]"
actp serve --policy provider-policy.yaml --port 8080
```

`provider-policy.yaml` (V1 schema; matches `load_policy_from_dict` in `agirails.server.policy`):

```yaml
pricing:
  min_acceptable:
    amount: 500000              # $0.50 USDC (units = micro-USDC)
    currency: USDC
    unit: base
  ideal:
    amount: 1000000             # $1.00 USDC
    currency: USDC
    unit: base

services: ["translate"]         # empty list = accept all services
quote_ttl: 300                  # seconds; expired CounterOffers are dropped
min_deadline_seconds: 60        # reject jobs with tighter deadlines
counter_strategy: concede       # 'concede' = re-quote toward floor; 'walk' = reject
concede_pct: 20                 # how much to move per requote round
max_requotes: 2                 # cap on requote rounds
```

Wallet/key is configured via `ACTP_KEYSTORE_BASE64` + `ACTP_KEY_PASSWORD` env vars per [AIP-13](/reference/glossary#aip-13), not in the policy file. The `network` is read from `ACTP_NETWORK` (`mainnet` or `testnet`).

The daemon:

1. Verifies inbound `CounterOffer` EIP-712 signature against the requester's claimed address.
2. Checks `expiresAt > now` and the `nonce` hasn't been seen.
3. If `counterAmount >= ideal.amount` → emits `CounterAccept` (signed by provider).
4. Otherwise, depending on `counter_strategy`: `walk` returns reject; `concede` emits a counter-counter at the current quote minus `concede_pct`, capped at `min_acceptable.amount` and `max_requotes`.
5. Persists `(signer, nonce)` to prevent replay.

Health check: `GET /healthz` → `{"ok": true, "negotiations_active": 7}`.

## Requester: send a counter

```ts
import { Agent, CounterOfferBuilder, InMemoryNonceManager } from '@agirails/sdk';

const agent = new Agent({
  name: 'Negotiator',
  network: 'mainnet',
  wallet: 'auto', // reads keystore via env per AIP-13
});
await agent.start();

// V1: create the on-chain transaction via the standard adapter
const txId = await agent.client.standard.createTransaction({
  provider: '0xPROV…',
  service: 'translate',
  // amount, deadline, etc.
});

// V1: CounterOfferBuilder is constructed, not chained.
// `signer` is your wallet provider's ethers.Signer. In wallet=auto mode,
// recover it from the runtime adapter:
const runtime = agent.client.advanced;
const signer = runtime.getMessageSigner().signer; // ethers.Signer

const nonceManager = new InMemoryNonceManager();
const builder = new CounterOfferBuilder(signer, nonceManager);

const counter = await builder.build({
  txId,
  consumer: agent.address,
  provider: '0xPROV…',
  quoteAmount: '1000000',    // $1.00 in micro-USDC (provider's initial quote)
  counterAmount: '600000',   // $0.60 in micro-USDC
  maxPrice: '800000',        // accept up to $0.80 in return-counter
  inReplyTo: 'INITIAL_QUOTE_ID',
  chainId: 8453,
  kernelAddress: '0xKERNEL…',
  expiresAt: Math.floor(Date.now() / 1000) + 120, // 2 minutes from now
});

const reply = await fetch('https://provider.example.com/actp/counter-offer', {
  method: 'POST',
  body: JSON.stringify(counter),
});

const { kind, payload } = await reply.json();
// kind === 'CounterAccept' → we won, settle on-chain
// kind === 'CounterOffer'  → provider returned a counter-counter, decide
```

## Settle the accepted counter on-chain

When `kind === 'CounterAccept'`, advance the transaction through the kernel via the standard adapter (there is no top-level `acceptQuote()` export in V1; the `acceptQuote` method lives on `agent.client.standard`):

```ts
// V1: acceptQuote is a method on the standard adapter, not a free function
await agent.client.standard.acceptQuote(txId, '600000'); // negotiated amount in micro-USDC

// linkEscrow funds the locked amount. With wallet=auto the kernel
// composes acceptQuote + linkEscrow into a single sponsored UserOp.
await agent.client.standard.linkEscrow(txId);
// → kernel transitions INITIATED → QUOTED → COMMITTED with new amount.
```

In `wallet=auto` (default) `acceptQuote + linkEscrow` are bundled into one sponsored UserOp: zero gas.

## Cancellation mid-negotiation

Either side can stop responding. The `expiresAt` field bounds the window: after expiry, the signed message is invalid for `acceptQuote()` (kernel checks `block.timestamp <= expiresAt`). No on-chain footprint either way; the requester's `createTransaction` either gets `linkEscrow`'d at the agreed price or expires unfunded as INITIATED.

## Replay protection

Every counter carries a `nonce` issued by `MessageNonceManager`. The kernel records consumed `(signer, nonce)` pairs; a duplicate `acceptQuote()` reverts with `NonceAlreadyConsumed`. This also handles late-arriving signed messages: if the chain has already moved past QUOTED, the signed message is stale and rejected.

## Cross-SDK parity

`CounterOfferBuilder` (TS) and `CounterOfferBuilder` (Python) produce byte-identical EIP-712 payloads. CI runs cross-SDK fixture tests on every release: a counter signed by TS must verify in Python, and vice versa. See [cross-SDK fixtures](https://github.com/agirails/sdk-python/tree/main/tests/fixtures/cross_sdk).

## See also

- [Quote channel protocol](/protocol/quote-channel): the on-chain side of AIP-2.1
- [Provider agent](/recipes/provider-agent): the daemon's caller
- [Gasless payment](/recipes/gasless-payment): how `acceptQuote + linkEscrow` get bundled

---

<!-- VERIFIED FOOTER -->

**Verified against**: `@agirails/sdk@4.0.0` + `agirails@3.0.1` + `actp-kernel` V3 mainnet / V4 sepolia · **Last cross-check**: 2026-05-27 (Wave A.10–A.12 verifier sweep). For drift between this recipe and the live SDK, see [`/sdk-manifest.json`](/sdk-manifest.json), regenerated daily by the truth-ledger workflow. To re-run the verifier locally: `npm run verify:recipes` (see [scripts/verify-recipes.ts](https://github.com/agirails/docs/blob/main/scripts/verify-recipes.ts)).
