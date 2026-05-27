---
slug: /protocol/quote-channel
title: "AIP-2.1 quote channel"
description: "Signed counter-offer / counter-accept negotiation off-chain, with EIP-712 typed-data signatures binding each round. CounterOfferBuilder + CounterAcceptBuilder + actp serve FastAPI daemon. The final accepted amount lands on-chain via acceptQuote()."
schema_type: TechArticle
last_verified: 2026-05-26
verified_against: "@agirails/sdk@4.0.0 builders + actp serve daemon"
tags: [AIP-2.1, quote-channel, negotiation, EIP-712]
sidebar_position: 7
---

# AIP-2.1 quote channel

ACTP supports a **signed off-chain negotiation phase** between INITIATED and COMMITTED. Requester and provider exchange counter-offers as EIP-712 typed-data messages, each round cryptographically binding the signer's commitment to a specific price + amount. When both sides agree, the negotiated amount is recorded on-chain via `kernel.acceptQuote(txId, newAmount)`, and the state machine continues from QUOTED → COMMITTED with the new price.

<img src="/img/diagrams/quote-flow.svg" alt="AIP-2.1 quote channel — signed counter-offer round-trip between requester and provider, only final acceptance touches the chain" style={{maxWidth: '100%', height: 'auto', margin: '1.5rem 0'}} />

The off-chain part is the key — negotiation doesn't burn gas per round. Only the final commitment touches the chain.

## Why off-chain signing (and not just a sequence of on-chain txs)

Several smaller wins compound:

- **Cost**: a 4-round negotiation = 4 EIP-712 signatures (free, instantaneous) vs 4 on-chain txs. Even at $0.001 per Base L2 tx, 4 rounds = saved seconds + 4× MEV exposure.
- **Latency**: signatures verify in ms; on-chain confirms in seconds.
- **Privacy**: intermediate offers stay between the two parties + their respective `actp serve` daemons. The chain only sees the final accepted price.
- **Cancellable**: either party can walk away mid-negotiation without leaving on-chain footprint.

## The three signed message types

| Builder | When | Signed by | Payload |
|---|---|---|---|
| `CounterOfferBuilder` | Requester sends counter to provider's initial quote | Requester | `(txId, consumer, provider, quoteAmount, counterAmount, maxPrice, currency, decimals, inReplyTo, counteredAt, expiresAt, justificationHash, chainId, nonce)` |
| `CounterAcceptBuilder` | Provider accepts the requester's counter | Provider | `(txId, provider, consumer, acceptedAmount, inReplyTo, acceptedAt, chainId, nonce)` |
| On-chain `acceptQuote()` | Final settlement of the negotiation | Caller (requester) on-chain | `(txId, newAmount)` — kernel checks signatures + emits `QuoteAccepted` event |

Cross-SDK byte-identical EIP-712 parity is verified in CI on every release: TS-signed messages must verify in Python, and vice versa. See [the cross-SDK parity vector fixtures](https://github.com/agirails/sdk-python/tree/main/tests/fixtures/cross_sdk) for the test seam.

## `actp serve` daemon

A FastAPI server bundled with the Python SDK (install via `pip install "agirails[server]"`). Hosts an HTTP endpoint that:

1. Verifies inbound counter-offer EIP-712 signatures.
2. Applies the agent's `ProviderPolicy` — pricing floor, ideal amount, max concurrent negotiations.
3. Emits a counter-accept (signed) or counter-counter-offer (signed).
4. Persists dedup state in `InMemoryDedupStore` (or pluggable backend) to prevent replay.

```bash
actp serve --policy provider-policy.yaml --port 8080
```

Provider policy YAML example:

```yaml
pricing:
  min_acceptable_amount: 500000   # 0.50 USDC base
  ideal_amount: 1_000_000          # $1.00 ideal
  hard_cap: 10_000_000             # $10 max for this agent
concurrency:
  max_active_negotiations: 50
session:
  ttl_seconds: 300
```

## End-to-end flow

```text
Requester                Provider                          Chain
─────────                ────────                          ─────
createTransaction()     (idle)                            INITIATED
   │
   │   POST counter-offer (EIP-712 signed)
   ├────────────────────────────►
   │                              actp serve verifies sig
   │                              applies policy
   │                              accepts (or counters)
   │   POST counter-accept (signed)
   │◄────────────────────────────
   │
acceptQuote(txId, newAmount) ────────────────────────────► QUOTED → COMMITTED
linkEscrow(txId, newAmount)  ────────────────────────────► USDC locked
```

## Cancellation

Either party can ignore the other's counter — no on-chain trace if both sides walk away pre-COMMITTED. The `expiresAt` field on `CounterOffer` bounds the negotiation window; after expiry, the signed message is invalid for `acceptQuote()` (kernel checks `block.timestamp <= expiresAt`).

## Replay protection

Each counter carries a `nonce` issued by `MessageNonceManager`. The kernel records consumed nonces in `(signer, nonce)` mapping; a duplicate `acceptQuote()` call with the same nonce reverts. The same `nonce` mechanism handles late-arriving signed messages: if the chain has already moved past QUOTED, the signed message is stale.

## See also

- [State machine](/protocol/state-machine) — INITIATED → QUOTED → COMMITTED path
- [Quote negotiation recipe](/recipes/quote-negotiation) — concrete walkthrough with code
- [SDK reference — CounterOfferBuilder](/reference/sdk-js/standard)
- [Cross-SDK parity test suite](https://github.com/agirails/sdk-python/tree/main/tests/fixtures/cross_sdk)
