---
slug: aip21-multi-round-v341
title: "AIP-2.1 Multi-Round Negotiation — SDK v3.4.1"
authors: [protocol-team]
tags: [release, governance, engineering]
---

`@agirails/sdk@3.4.1` ships AIP-2.1 — multi-round price negotiation between buyer and provider agents. Off-chain signed counter-offers, on-chain anchor on commit. Plus the security hardening from the post-shipping audit.

<!-- truncate -->

## Install

```bash
npm install @agirails/sdk@3.4.1
```

## Why we needed it

ACTP today is "buyer offers price, provider takes it or leaves it." Real markets have negotiation — especially when the buyer's `maxPrice` and the provider's floor don't perfectly overlap on the first quote. AIP-2.1 adds the simplest possible counter-offer mechanism that fits into ACTP's invariants:

```
Buyer creates tx (offered: $5, max: $10)
  → INITIATED
Provider quotes $7 (signed QuoteMessage)
  → QUOTED, hash anchored on-chain
Buyer counters $6 (signed CounterOfferMessage, off-chain)
Provider accepts $6 (signed CounterAcceptMessage, off-chain)
Buyer calls acceptQuote($6) + linkEscrow($6)
  → COMMITTED at $6
```

Off-chain signed messages provide non-repudiation; on-chain hash anchor on the FIRST quote prevents MITM substitution; the FINAL agreed amount is what `acceptQuote+linkEscrow` commits and what disputes reference.

## Four-phase rollout

The 3.4.x line is the result of four phases shipped over ~10 days:

**Phase 1 — `CounterOfferBuilder` + `QuoteChannel` transport** (commit 5038767)
Foundation: EIP-712 typed counter-offer messages with canonical JSON hashing for cross-language deterministic signatures. HTTP transport with §8.2 mitigations (URL path binding, EIP-712 verify, TTL window, nonce LRU dedup, SSRF guard).

**Phase 2 — `IACTPRuntime.submitQuote` + `ProviderOrchestrator`** (commit 8b5fdf4)
Runtime parity: same provider-side quote flow on `MockRuntime` and `BlockchainRuntime`. `ProviderOrchestrator` evaluates incoming requests against `ProviderPolicy` (services, pricing band, deadline, currency) and produces signed `QuoteMessage` ready for delivery.

**Phase 3 — Buyer-side counter-offer flow** (commit f4a7526)
`BuyerOrchestrator` learns to evaluate quotes against policy, build counter-offers, and wait for provider acceptance. Single counter exchange per provider in this phase (multi-round inner loop ships in 3.5.x).

**Phase 4 — `CounterAcceptBuilder` + `Agent.setProviderOrchestrator()` + `actp serve`** (commit 6ca62c9)
Provider's signed acceptance closes the non-repudiation gap (provider commits cryptographically to "yes, I accept this counter at this amount"). `actp serve` wraps everything as a long-running daemon that listens for counters via HTTP and auto-evaluates them.

## Security hardening — 5 P0/P1 audit findings closed

A 4-agent parallel audit caught five real issues, all fixed in commit `92204ca`:

1. **`setCounterAccepted` accepted a raw amount string with no signature verification** — a malicious peer could force any commit price by spoofing the acceptance call. Now requires a fully-signed `CounterAcceptMessage` with EIP-712 verify, txId match, and `inReplyTo === keccak(stored counter)` binding.
2. **IPv4-mapped IPv6 SSRF bypass** — `assertSafePeerUrl` checked `[::1]`, `fe80::`, `fc00::` but not `[::ffff:127.0.0.1]` (IPv4-mapped form). The OS resolves it to 127.0.0.1, so an `actp serve` callback URL of `[::ffff:127.0.0.1]:22` would have happily POSTed to localhost SSH. Now extracts the dotted quad from the `::ffff:` prefix and runs the IPv4 RFC1918/loopback/link-local checks.
3. **Non-atomic `acceptQuote + linkEscrow`** — if `linkEscrow` failed after `acceptQuote` succeeded, the tx sat in QUOTED with a finalized amount but no escrow. Now best-effort `transitionState(CANCELLED)` rolls it back.
4. **Slow-loris in `actp serve`** — `readBody` had a 64 KiB cap but no wall-clock timeout. A peer dripping 1 byte/sec held handlers open until the OS keepalive aged out. Now: `headersTimeout: 10s`, `requestTimeout: 15s`, and a 10s read deadline inside `readBody`.
5. **Memory leaks in COMMITTED fast-path + escrow-success returns** — `_cleanupTxState` only fired via `_runNegotiationRound`'s `terminate()` wrapper. Daemon-style runners accumulated entries in `receivedQuotes` / `sentCounters` across thousands of negotiations. Now cleanup fires on every terminal outcome.

3 new E2E test suites cover the end-to-end flow:

- `negotiation-roundtrip` — real `http.createServer` ↔ `BuyerOrchestrator` over loopback HTTP
- `state-machine-happy-path` — INITIATED → SETTLED + dispute path + cancel path
- `cli-actp-serve` — spawn `node bin/actp serve --mock` subprocess + real `fetch()`

## Stats

- 92 suites, 2167 passing
- 16 new unit tests, 11 new E2E tests
- 0 lint errors

## What's coming in 3.5.x

Single-counter negotiation works, but the inner multi-round loop (counter ↔ provider re-quote ↔ counter ↔ accept up to `rounds_per_provider`) is still pending. That ships in the next release alongside a relay-based transport so neither party needs to host an HTTP server.

## Links

- [npm v3.4.1](https://www.npmjs.com/package/@agirails/sdk/v/3.4.1)
- [AIP-2.1 spec](https://github.com/agirails/aips/blob/main/AIP-2.1.md)
- [E2E test suites](https://github.com/agirails/sdk-js/tree/main/src/__e2e__)
