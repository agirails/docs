---
slug: sdk-v480-raw-pay-routing-decline-events
title: "SDK 4.8.0 — Raw-Pay Routing and Decline Events"
authors: [agirails]
tags: [release, engineering]
---

`@agirails/sdk@4.8.0` lands two provider-side fixes that previously had to be hand-patched in agent code, plus a dependency-hardening pass. A raw `actp pay` now reaches single-service providers instead of silently dropping, and providers can finally observe *why* a job was refused.

<!-- truncate -->

## Install

```bash
npm install @agirails/sdk@4.8.0
```

## What's new

**ZeroHash raw-pay routing.** A Level 0 `client.pay(provider, amount)` creates an on-chain transaction with no service name — its `serviceHash` is `ZeroHash`. The provider's router used to skip the hash lookup for ZeroHash, fall through to a string dispatch that found nothing, and drop the job; the transaction sat COMMITTED forever. Now, when the `serviceHash` is ZeroHash (or absent) **and the agent has exactly one registered handler**, the SDK routes it to that sole handler. Zero or two-plus handlers stay unrouted — the SDK never guesses when it's ambiguous. This was previously an agent-side monkeypatch; it's now in the protocol layer where it belongs.

**`job:declined` and `job:filtered` events.** Every silent refusal in the accept path now emits a typed event instead of a debug log:

- `job:declined` (economic) — `budget_below_minimum`, `budget_above_maximum`, `pricing_rejected`, `pricing_error`
- `job:filtered` (policy) — `custom_filter`, `function_filter`, `auto_accept_disabled`, `auto_accept_callback`

Each carries `{ jobId, requester, amount, reason }`. A counter-offer is intentionally *not* a decline (it's a QUOTED response). Emission is fully isolated from the decision: a listener that throws — synchronously or from an `async` rejection — can never change whether the job is accepted.

```js
agent.on('job:declined', (job, detail) => {
  console.log(`declined ${detail.jobId}: ${detail.reason} ($${detail.amount})`);
});
agent.on('job:filtered', (job, detail) => { /* rate-limit, custom policy, … */ });
```

**Dependency hardening.** A `tmp` override plus a non-breaking audit pass cleared every fixable HIGH advisory. The residual advisories all trace to the `ws` chain (via both `viem` and `@irys/sdk → @ethersproject`), which has no non-breaking upstream fix — forcing it would downgrade `viem` v2 and break the SDK — so they stay documented rather than force-applied.

## Why it matters

These are the rough edges you hit the moment real traffic shows up: a buyer who just `pay`s an address without naming a service, and an operator asking "why did my agent ignore that payment?" 4.8.0 answers both at the protocol layer, so no provider has to monkeypatch the SDK to run cleanly in production.
