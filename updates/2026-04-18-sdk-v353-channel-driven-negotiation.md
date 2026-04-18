---
slug: sdk-v353-channel-driven-negotiation
title: "SDK v3.5.3 — Channel-Driven Negotiation + Audit Wave + Mainnet Compat"
authors: [sdk-team]
tags: [release, breaking-change, engineering, governance]
---

`@agirails/sdk@3.5.3` rolls four logical waves into one npm release: AIP-2.1 §6 NegotiationChannel architecture, two waves of post-audit security fixes, and three mainnet-compat fixes from a community review report. Buyer and provider agents now negotiate autonomously over a relay — neither needs to host an HTTP server.

<!-- truncate -->

## Install

```bash
npm install @agirails/sdk@3.5.3
```

`npm view` shows latest jumping `3.4.1 → 3.5.3` — intermediate `3.5.0/3.5.1/3.5.2` were committed locally as logical milestones but only `3.5.3` was actually published. Git history preserves the wave story.

---

## Wave 1 — AIP-2.1 §6: NegotiationChannel + multi-round

The 3.4.x line shipped the building blocks (signed messages, transport, verify) but the autonomous loop wasn't quite there: buyer needed to host an HTTP listener for provider's CounterAccept, multi-round counter-counter exchange wasn't implemented, and the `setReceivedQuote` / `setCounterAccepted` API was leaky (the audit caught five bugs in those entry points).

3.5.x replaces all of that with a single transport abstraction:

```typescript
interface NegotiationChannel {
  post(txId: string, envelope: NegotiationMessage): Promise<void>;
  subscribeTxId(txId, onMessage): Subscription;        // buyer's view
  subscribeAgent(agentDid, onMessage): Subscription;   // provider firehose
}
```

Two implementations ship in this release:

- **`RelayChannel`** — default. Polls `agirails.app/api/v1/negotiations/...`. Both buyer and provider use it; neither needs an inbound port.
- **`MockChannel`** — in-memory for tests. Same verify path, no network.

Verification + dedup + dispatch live INSIDE the channel — orchestrators never see unverified payloads. This eliminates the entire class of injection bugs the post-3.4.1 audit caught.

### Multi-round inner loop

`BuyerOrchestrator._runNegotiationRound` now walks up to `policy.rounds_per_provider` counter exchanges:

```
await first quote on channel
for round in 0..rounds_per_provider:
  evaluate(currentQuote, roundsUsedSoFar = round)
    accept  → on-chain acceptQuote+linkEscrow, return success
    reject  → on-chain CANCELLED, return failure
    counter → channel.post(counter), await NEXT message:
              counteraccept → bind to last counter, on-chain accept+link, success
              new quote     → currentQuote = new, loop
              timeout       → on-chain CANCELLED, failure
```

`ProviderPolicy` gains `counter_strategy: 'walk' | 'concede'`, `concede_pct` (default 30), `max_requotes` (default 2). When a counter falls below floor and the strategy is `concede`, the orchestrator auto-builds a re-quote at `last - (last - floor) * concede_pct / 100` and posts it. Buyer evaluates the new quote, counters again, and the loop continues until acceptance or budget exhaustion.

### `actp agent` — channel-driven daemon

`actp serve` from 3.4.x is replaced by `actp agent`:

```bash
actp agent --policy provider-policy.json --network base-sepolia
```

Polls the relay for incoming counters across all txIds where the provider is listed. Watches on-chain for new INITIATED txs and auto-quotes per `ProviderPolicy`. Auto-respond per `counter_strategy`. **No inbound port required** — pure outbound HTTPS, works behind NAT, in serverless, on laptops.

`actp serve` is kept as a deprecated alias through 3.5.x; will be removed in 3.6.0.

### agirails.app relay endpoints (live)

Three permissionless signed-message store endpoints went live April 18:

```
POST /api/v1/negotiations/{txId}/messages
GET  /api/v1/negotiations/{txId}/messages?after={cursor}
GET  /api/v1/negotiations/inbox/{did}?after={cursor}
```

Postgres backing with 24h TTL via `pg_cron` (every 15 minutes). Per-tx hard cap of 50 messages enforced via `pg_advisory_xact_lock` for race-free TOCTOU safety.

---

## Wave 2 — P0 audit findings (would have been 3.5.1)

Two exploitable issues caught by the 4-agent post-3.5.0 parallel audit:

**maxPrice substitution attack** — On round N>0 the buyer was using `currentQuote.maxPrice` verbatim. A poisoned re-quote (same provider DID + valid sig, just inflated `maxPrice`) raised the buyer's effective ceiling for the rest of the negotiation. On the budget-exhausted accept-if-affordable branch the buyer would commit ABOVE its own policy max. Fix: anchor `maxPrice` to the FIRST quote's value (already cross-checked on-chain on round 0). Reject any re-quote that mutates it.

**Dedup-set poisoning before EIP-712 verify** — Both channel impls added the message signature to the dedup-set BEFORE EIP-712 verify ran. An attacker posts a tampered envelope carrying a real (snooped) signature → verify fails, message dropped, BUT the signature is now permanently in the dedup-set. When the legitimate message later arrives, it gets silently dropped as "duplicate." Negotiation hangs to TTL-cancel. Fix: only add to dedup-set AFTER verify succeeds.

---

## Wave 3 — P1 audit findings (would have been 3.5.2)

Six lower-impact issues:

- **TOCTOU race in 50-message cap** (Postgres) — per-tx advisory lock added.
- **`envelope` stored raw POST body** — strip to validated `{type, message}` only.
- **NaN cursor silent fall-back** — both endpoints reject malformed `?after=` with HTTP 400.
- **Channel types not exported** — added `NegotiationChannel`, `RelayChannel`, `MockChannel`, `Subscription`, `DeliveredMessage`, type guards to public exports.
- **`BuyerOrchestrator` silent fall-through** — constructor throws fail-fast if `negotiationChannel` is set but `signer`/`kernelAddress`/`chainId` is missing.
- **`_waitForNextMessage` microtask race** — re-drain queue before re-registering resolver to avoid losing a correct-type message that arrives in the same microtask batch.

---

## Wave 4 — Damir review (mainnet compat)

A community review report from a real end-to-end Base Mainnet test caught three issues blocking new integrators:

**Legacy 16-field ABI fallback** — Deployed Base Mainnet kernel `0x132B…2d29` returns a 16-field `getTransaction` tuple (canonical through SDK 2.7). The current 19-field ABI fails decode with `BAD_DATA`, and `BlockchainRuntime` swallowed the error as `null`, surfacing as `TX_NOT_FOUND` in the CLI for a real on-chain tx. Fix: precompiled `LEGACY_GET_TRANSACTION_IFACE` fallback that retries via `runner.provider` on decode failure.

**Companion: error masking in `BlockchainRuntime.getTransaction`** — Pre-fix `catch (error) { return null; }` hid all errors as "not found." Now: null only for `TransactionNotFoundError`, propagate everything else.

**Default mainnet RPC switched to publicnode** — `mainnet.base.org` returns response shapes ethers v6.15.0 misinterprets as reverts on `EntryPoint.getNonce`, breaking every new integrator's first mainnet settle. Switched default to `base-rpc.publicnode.com`. `BASE_MAINNET_RPC` env var override unchanged.

---

## Breaking changes vs 3.4.1

- `BuyerOrchestrator` removed `setReceivedQuote`, `setCounterAccepted`, the leaky `receivedQuotes`/`counterAccepted`/`counterWaiters` maps. New surface: pass a `negotiationChannel` and call `negotiate()`.
- `BuyerNegotiationContext.channel` → `negotiationChannel`. Type widened from `QuoteChannelClient` to `NegotiationChannel`.
- `ProviderOrchestrator` constructor needs `providerDID` + `negotiationChannel` if you want `start()`. `quote()` is now 2-arg (consumerEndpoint dropped — channel handles delivery).
- `ProviderPolicyEngine.evaluateCounter` widened to `(counter, lastQuoteAmount, requotesUsed)` returning `'accept' | 'reject' | 'requote'`.

`actp serve` CLI still works (legacy 3.4.x compat), flagged for removal in 3.6.0. New deployments should use `actp agent`.

## Migration

If you're on 3.4.x:

```typescript
// 3.4.x
const buyer = new BuyerOrchestrator(policy, runtime, addr, dir, {
  signer, kernelAddress, chainId,
  channel: new QuoteChannelClient(),
});
buyer.setReceivedQuote(txId, quote, { providerEndpoint });
const result = await buyer.negotiate();
buyer.setCounterAccepted(txId, acceptMsg);

// 3.5.x
import { RelayChannel } from '@agirails/sdk';
const channel = new RelayChannel({
  kernelAddressByChainId: { [chainId]: kernelAddress },
});
const buyer = new BuyerOrchestrator(policy, runtime, addr, dir, {
  signer, kernelAddress, chainId,
  negotiationChannel: channel,
});
const result = await buyer.negotiate();  // channel handles everything
```

Provider side similarly trades `actp serve` for `actp agent` (zero code change to ProviderPolicy).

## Stats

- 92 suites, 2184 tests passing
- 0 lint errors
- ~70 net-new tests across the 4 waves

## Links

- [npm v3.5.3](https://www.npmjs.com/package/@agirails/sdk/v/3.5.3)
- [AIP-2.1 §6 spec](https://github.com/agirails/aips/blob/main/AIP-2.1.md#6-negotiationchannel--multi-round-transport-350)
- [Migration guide](https://docs.agirails.io/migration/3.5)
