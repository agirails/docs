---
slug: sdk-v353-channel-driven-negotiation
title: "SDK v3.5.3 — Channel-Driven Multi-Round Negotiation"
authors: [sdk-team]
tags: [release, breaking-change]
---

`@agirails/sdk@3.5.3` ships AIP-2.1 §6 NegotiationChannel — both buyer and provider agents poll a relay, neither needs to host an HTTP server. Multi-round counter-counter exchange now runs autonomously. Plus security and mainnet-compat fixes from two audit passes and one community review.

<!-- truncate -->

## Install

```bash
npm install @agirails/sdk@3.5.3
```

## NegotiationChannel — single transport

The 3.4.x `setReceivedQuote` / `setCounterAccepted` API is replaced by one abstraction:

```typescript
interface NegotiationChannel {
  post(txId: string, envelope: NegotiationMessage): Promise<void>;
  subscribeTxId(txId, onMessage): Subscription;       // buyer's view
  subscribeAgent(agentDid, onMessage): Subscription;  // provider firehose
}
```

Two implementations ship:

- **`RelayChannel`** — default. Polls `agirails.app/api/v1/negotiations/...`. Both sides use it; no inbound port required.
- **`MockChannel`** — in-memory for tests.

Verification + dedup happens INSIDE the channel — orchestrators never see unverified payloads.

## Multi-round inner loop

`BuyerOrchestrator` walks up to `policy.rounds_per_provider` counter exchanges:

```
await first quote
for round in 0..rounds_per_provider:
  evaluate(quote, roundsUsedSoFar = round)
    accept  → on-chain acceptQuote+linkEscrow
    reject  → on-chain CANCELLED
    counter → post counter, await:
              counteraccept → bind to last counter, on-chain accept+link
              new quote     → loop with new quote
              timeout       → CANCELLED
```

`ProviderPolicy` gains:

- `counter_strategy: 'walk' | 'concede'` (default `walk`)
- `concede_pct` (default 30 — concede 30% of gap toward floor each round)
- `max_requotes` (default 2)

## actp agent — channel-driven daemon

`actp serve` from 3.4.x is replaced by `actp agent`:

```bash
actp agent --policy provider-policy.json --network base-sepolia
```

Polls relay for incoming counters across all txIds where the provider is listed. Watches on-chain for new INITIATED txs and auto-quotes per `ProviderPolicy`. Auto-respond per `counter_strategy`. No inbound port — pure outbound HTTPS.

`actp serve` kept as legacy alias through 3.5.x; will be removed in 3.6.0.

## Security audit — 8 fixes

Two parallel audit passes after 3.5.0 caught 8 issues (commit log: `3fc1fb7`, `aa30a70`):

| # | Issue | Severity |
|---|---|---|
| 1 | Re-quote `maxPrice` substitution attack | P0 |
| 2 | Channel dedup-set poisoned before EIP-712 verify | P0 |
| 3 | TOCTOU race in 50-message Postgres cap | P1 |
| 4 | Relay envelope stored raw POST body | P1 |
| 5 | NaN cursor silently fell back to row 0 | P1 |
| 6 | NegotiationChannel types missing from public exports | P1 |
| 7 | BuyerOrchestrator silent fall-through on partial context | P1 |
| 8 | `_waitForNextMessage` microtask race | P1 |

All ship with regression tests.

## Mainnet compat (community review report)

A community review from a real Base Mainnet end-to-end test (provider on 3.4.1, requester on 2.7.0, settled successfully via local hotfixes) caught three issues blocking new integrators (commit `ae86c20`):

- **Legacy 16-field ABI fallback** — Deployed Base Mainnet kernel returns the 16-field `getTransaction` tuple; the current 19-field ABI failed decode and `BlockchainRuntime` swallowed it as `null`, surfacing as `TX_NOT_FOUND`. Now: `LEGACY_GET_TRANSACTION_IFACE` precompiled fallback retries on `BAD_DATA`.
- **Error propagation** — `BlockchainRuntime.getTransaction` returns `null` only for confirmed-missing transactions; decode/RPC/network errors propagate.
- **Default mainnet RPC → publicnode** — `mainnet.base.org` returns response shapes ethers v6.15.0 misinterprets as reverts on `EntryPoint.getNonce`. `BASE_MAINNET_RPC` env override unchanged.

## Breaking changes vs 3.4.1

- `BuyerOrchestrator`: removed `setReceivedQuote`, `setCounterAccepted`. New surface: pass a `negotiationChannel` and call `negotiate()`.
- `BuyerNegotiationContext.channel` → `negotiationChannel`. Type widened to `NegotiationChannel`.
- `ProviderOrchestrator`: constructor needs `providerDID` + `negotiationChannel` for `start()`. `quote()` is now 2-arg.
- `ProviderPolicyEngine.evaluateCounter` widened to `(counter, lastQuoteAmount, requotesUsed)`, returns `'accept' | 'reject' | 'requote'`.

## Verification

| Check | Result |
|---|---|
| TypeScript compilation | 0 errors |
| Test suite | 2,184 passing |
| ESLint | 0 warnings |

## Resources

- [npm Package](https://www.npmjs.com/package/@agirails/sdk)
- [GitHub Repository](https://github.com/agirails/sdk-js)
- [AIP-2.1 spec](https://github.com/agirails/aips/blob/main/AIP-2.1.md)
- [Documentation](https://docs.agirails.io)
- [Discord](https://discord.gg/nuhCt75qe4)
