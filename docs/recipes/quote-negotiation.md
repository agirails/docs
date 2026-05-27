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


:::caution V1 surface — verify before shipping
Examples below describe the **conceptual integration shape**. The `@agirails/sdk@4.0.0` and `agirails@3.0.1` V1 surface exposes:

- **Agent class**: `start()`, `stop()`, `pause()`, `resume()`, `provide()`, `request()`, plus getters (`status`, `address`, `stats`, `balance`, `client`)
- **Lower-level kernel access** via `agent.client.basic.*`, `agent.client.standard.*`, `agent.client.advanced.*` (e.g. `agent.client.standard.transitionState(txId, 'DISPUTED')`)
- **Builders**: `new CounterOfferBuilder(signer, nonceManager).build({...})` — not a fluent chain
- **Python** uses `Agent(AgentConfig(...))` constructor (not `Agent.create()`); `request()` takes `timeout=` (seconds), not `timeout_seconds=`; `ctx.progress()` is synchronous (no `await`)

Higher-level convenience methods you'll see in some examples (`agent.discover()`, `agent.dispute()`, `agent.cancel()`, `agent.getTransaction()`, `agent.eoa`, `behavior.budget.perRequestSpendCap`, `uploadReceipt`, `fetchReceipt`, `x402Client`, `requirePayment`) are **conceptual targets** — V1 routes through `agent.client.standard.*` or direct kernel calls. Verify every symbol against [`/sdk-manifest.json`](/sdk-manifest.json) or the [SDK reference](/reference/sdk-js) before shipping.

Cross-check pass run 2026-05-27. Recipe rewrites to literal V1 surface tracking in the next sprint.
:::
A provider's initial quote isn't always the price both sides agree on. AIP-2.1 adds a **signed off-chain negotiation** phase between INITIATED and COMMITTED: requester and provider exchange EIP-712 typed-data counters until one accepts. Only the final price hits the chain via `kernel.acceptQuote()`.

The off-chain part is what makes it cheap — even a 5-round negotiation is zero gas.

## Provider: run `actp serve`

The Python SDK ships a FastAPI daemon that hosts the counter-offer endpoint and applies a YAML policy:

```bash
pip install "agirails[server]"
actp serve --policy provider-policy.yaml --port 8080
```

`provider-policy.yaml`:

```yaml
agent:
  private_key_env: ACTP_PRIVATE_KEY
  network: mainnet           # or testnet

pricing:
  min_acceptable_amount: 500000   # $0.50 USDC (units = micro-USDC)
  ideal_amount: 1_000_000          # $1.00 USDC
  hard_cap: 10_000_000             # $10.00 USDC

concurrency:
  max_active_negotiations: 50

session:
  ttl_seconds: 300                 # 5 min before expired CounterOffers are dropped

storage:
  backend: memory                  # or redis://… for multi-instance
```

The daemon:

1. Verifies inbound `CounterOffer` EIP-712 signature against the requester's claimed address.
2. Checks `expiresAt > now` and the `nonce` hasn't been seen.
3. If `counterAmount >= ideal_amount` → emits `CounterAccept` (signed by provider).
4. Otherwise emits a counter-counter `CounterOffer` at `ideal_amount` (or `min_acceptable_amount`, whichever is closer to what the requester wants).
5. Persists `(signer, nonce)` to prevent replay.

Health check: `GET /healthz` → `{"ok": true, "negotiations_active": 7}`.

## Requester: send a counter

```ts
import { CounterOfferBuilder, Agent } from '@agirails/sdk';

const agent = new Agent({ network: 'mainnet', privateKey: process.env.ACTP_PRIVATE_KEY! });
await agent.start();

const tx = await agent.createTransaction({ provider: '0xPROV…', service: 'translate' });
// tx.state === 'INITIATED'; quote was 1.00 USDC, we want 0.60

const counter = await CounterOfferBuilder
  .for(tx)
  .counterAmount(600_000)   // $0.60 in micro-USDC
  .maxPrice(800_000)        // we'll accept up to $0.80 in return-counter
  .expiresInSeconds(120)
  .justification('cheaper provider quoted $0.55 elsewhere')
  .sign(agent.signer);

const reply = await fetch('https://provider.example.com/actp/counter-offer', {
  method: 'POST',
  body: JSON.stringify(counter),
});

const { kind, payload } = await reply.json();
// kind === 'CounterAccept' → we won, settle on-chain
// kind === 'CounterOffer'  → provider returned a counter-counter, decide
```

## Settle the accepted counter on-chain

When `kind === 'CounterAccept'`:

```ts
import { acceptQuote } from '@agirails/sdk';

await acceptQuote(agent, {
  txId: tx.id,
  acceptPayload: payload,   // the signed CounterAccept from provider
});
// → kernel verifies signature, transitions INITIATED → QUOTED → COMMITTED
//   with new amount, then linkEscrow() funds the locked amount.
```

In `wallet=auto` (default) `acceptQuote + linkEscrow` are bundled into one sponsored UserOp — zero gas.

## Cancellation mid-negotiation

Either side can simply stop responding. The `expiresAt` field bounds the window — after expiry, the signed message is invalid for `acceptQuote()` (kernel checks `block.timestamp <= expiresAt`). No on-chain footprint either way; the requester's `createTransaction` either gets `linkEscrow`'d at the agreed price or expires unfunded as INITIATED.

## Replay protection

Every counter carries a `nonce` issued by `MessageNonceManager`. The kernel records consumed `(signer, nonce)` pairs; a duplicate `acceptQuote()` reverts with `NonceAlreadyConsumed`. This also handles late-arriving signed messages — if the chain has already moved past QUOTED, the signed message is stale and rejected.

## Cross-SDK parity

`CounterOfferBuilder` (TS) and `CounterOfferBuilder` (Python) produce byte-identical EIP-712 payloads. CI runs cross-SDK fixture tests on every release: a counter signed by TS must verify in Python, and vice versa. See [cross-SDK fixtures](https://github.com/agirails/sdk-python/tree/main/tests/fixtures/cross_sdk).

## See also

- [Quote channel protocol](/protocol/quote-channel) — the on-chain side of AIP-2.1
- [Provider agent](/recipes/provider-agent) — the daemon's caller
- [Gasless payment](/recipes/gasless-payment) — how `acceptQuote + linkEscrow` get bundled
