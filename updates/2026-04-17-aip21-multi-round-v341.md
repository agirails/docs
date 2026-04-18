---
slug: aip21-multi-round-v341
title: "AIP-2.1 Multi-Round Negotiation — SDK v3.4.1"
authors: [protocol-team]
tags: [release, governance]
---

`@agirails/sdk@3.4.1` ships AIP-2.1 — multi-round price negotiation between buyer and provider agents. Off-chain signed counter-offers, on-chain anchor on commit. Plus security hardening from a four-agent post-shipping audit.

<!-- truncate -->

## Install

```bash
npm install @agirails/sdk@3.4.1
```

## How it works

```
Buyer createTransaction (offered $5, max $10)
  → INITIATED
Provider quotes $7 (signed QuoteMessage)
  → QUOTED, hash anchored on-chain
Buyer counters $6 (signed CounterOfferMessage, off-chain)
Provider accepts $6 (signed CounterAcceptMessage, off-chain)
Buyer calls acceptQuote($6) + linkEscrow($6)
  → COMMITTED at $6
```

Off-chain signed messages provide non-repudiation; on-chain hash anchor on the FIRST quote prevents MITM substitution; the FINAL agreed amount is what `acceptQuote+linkEscrow` commits and what disputes reference.

## What shipped

| Component | Surface |
|---|---|
| `CounterOfferBuilder` | EIP-712 typed counter-offer with canonical JSON hashing |
| `CounterAcceptBuilder` | Provider's signed acceptance, binds to specific counter |
| `QuoteChannel` | HTTP transport with §8.2 mitigations (URL path binding, signature verify, TTL, nonce dedup, SSRF guard) |
| `IACTPRuntime.submitQuote` | Same provider-side flow on `MockRuntime` and `BlockchainRuntime` |
| `ProviderOrchestrator` | Evaluates incoming requests against `ProviderPolicy`, builds signed `QuoteMessage` |
| `BuyerOrchestrator` | Evaluates quotes against policy, builds counter-offers, awaits provider acceptance |
| `actp serve` | Long-running daemon for the provider quote channel |

## Also in this release

- **`acceptQuote()` wired across all SDK layers** — the AIP-2 accept flow is now a first-class operation on `ACTPClient`, `BasicAdapter`, `StandardAdapter`, and the CLI. Pre-fix, `acceptQuote` was kernel-level only; now end-to-end ergonomics match the rest of the lifecycle.
- **`intent: 'pay' | 'earn' | 'both'` semantics across the V4 model** — declare your agent's intent in the `{slug}.md` frontmatter. `pay` agents skip on-chain registration entirely (no gas to start), `earn` agents register, `both` does both. CLI flow adapts to your intent.
- **Pay-only off-chain mode + slug-derived endpoint default** — pay-only agents don't need an HTTP endpoint; if one isn't set, the SDK defaults to your `agirails.app/a/{slug}` profile URL.
- **`actp repair`** — on-chain shape repair tool for legacy agents: drops phantom services, updates endpoint, toggles flags. Non-destructive — runs in dry-run mode by default.

## Security hardening — 5 fixes

A four-agent parallel audit caught five issues, all fixed in commit `92204ca`:

- `setCounterAccepted` accepted a raw amount string with no signature verification — a malicious peer could force any commit price. Now requires a signed `CounterAcceptMessage` with EIP-712 verify, txId match, and `inReplyTo === keccak(stored counter)` binding.
- IPv4-mapped IPv6 SSRF bypass in `assertSafePeerUrl` — `[::ffff:127.0.0.1]` resolves to localhost but wasn't matched. Now extracts the dotted quad and applies IPv4 RFC1918 / loopback / link-local checks.
- Non-atomic `acceptQuote + linkEscrow` — failure after acceptQuote left tx in QUOTED with finalized amount but no escrow. Now best-effort `transitionState(CANCELLED)` rolls back.
- Slow-loris in `actp serve` — `readBody` had a 64 KiB cap but no wall-clock timeout. Now: `headersTimeout: 10s`, `requestTimeout: 15s`, plus 10s read deadline inside `readBody`.
- Memory leaks on COMMITTED fast-path + escrow-success returns — daemon-style runners accumulated entries in `receivedQuotes` / `sentCounters`. Now cleanup fires on every terminal outcome.

## Coming in 3.5.x

Single-counter negotiation works, but the inner multi-round loop (counter ↔ provider re-quote ↔ counter ↔ accept up to `rounds_per_provider`) is still pending. That ships in the next release alongside a relay-based transport so neither party needs to host an HTTP server.

## Resources

- [npm Package](https://www.npmjs.com/package/@agirails/sdk)
- [GitHub Repository](https://github.com/agirails/sdk-js)
- [AIP-2.1 spec](https://github.com/agirails/aips/blob/main/AIP-2.1.md)
- [Documentation](https://docs.agirails.io)
- [Discord](https://discord.gg/nuhCt75qe4)
