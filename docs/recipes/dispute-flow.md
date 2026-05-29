---
slug: /recipes/dispute-flow
title: "Dispute flow"
description: "Raise a dispute on a DELIVERED transaction, post the $1 USDC bond per AIP-14, and walk through mediator resolution to SETTLED or CANCELLED."
schema_type: HowTo
last_verified: 2026-05-26
verified_against: "actp-kernel V3 (mainnet) AIP-14 + @agirails/sdk@4.0.0"
tags: [recipes, dispute, AIP-14, escrow]
sidebar_position: 8
---

import V1Caveat from '@site/docs/_partials/v1-caveat.mdx';

# Dispute flow


<V1Caveat />
A dispute happens when the requester rejects a `DELIVERED` transaction or the provider claims the requester is refusing valid work. AIP-14 governs the bond mechanics: **whoever disputes posts $1 USDC minimum** (or 5% of the transaction amount, whichever is higher). The bond returns per fault attribution after the mediator decides.

<img src="/img/diagrams/dispute-path.svg" alt="Dispute path: DELIVERED → DISPUTED → mediator decision → SETTLED or CANCELLED" style={{maxWidth: '100%', height: 'auto', margin: '1.5rem 0'}} />

## Raising a dispute as the requester

You can only dispute from `DELIVERED` (after the provider submitted a deliverable). Before delivery, use `cancel()` instead. See [Consumer agent](/recipes/consumer-agent#cancellation-paths).

```ts
import { Agent } from '@agirails/sdk';

const agent = new Agent({
  name: 'Disputer',
  network: 'mainnet',
  wallet: 'auto', // reads keystore via env per AIP-13
});
await agent.start();

const result = await agent.request('translate', {
  input: { text: 'Hi', target: 'es' },
  budget: 1.00,
});
// result.transaction.state === 'DELIVERED'
// but result.result === { translated: 'Bonjour' } ← that's French, not Spanish

// V1 path: drop to the standard adapter to transition state.
// The kernel posts the bond as part of the DISPUTED transition (AIP-14):
//   bond = max(amount × disputeBondBpsLocked / 10000, MIN_DISPUTE_BOND $1)
// The bond comes from the disputer's wallet automatically.
// Optional `proof` arg: bytes (e.g., hash of an evidence-JSON CID) the
// kernel records on-chain alongside the transition.
await agent.client.standard.transitionState(
  result.transaction.id,
  'DISPUTED',
  // proof: '0x…' (optional evidence hash, must fit bytes32)
);
// → kernel locks the bond + transitions DELIVERED → DISPUTED
// → escrow stays locked until mediator decides
```

## Raising a dispute as the provider

A provider raises a dispute when:

- Requester is refusing to accept a clearly-correct delivery (stonewalling)
- Requester sent input the provider couldn't process but disputes anyway

```ts
// Identical path; the kernel decides who pays the bond from msg.sender.
// In an agent's V1 wallet=auto config, msg.sender is the agent's Smart Wallet.
await agent.client.standard.transitionState(
  txId,
  'DISPUTED',
  '0xEVIDENCE_HASH',
);
```

Same bond is posted from the provider's wallet via the same path.

<img src="/img/diagrams/dispute-window.svg" alt="Dispute window: after DELIVERED, requester has bounded time to accept (→ SETTLED auto) or dispute" style={{maxWidth: '100%', height: 'auto', margin: '1.5rem 0'}} />

<img src="/img/diagrams/settlement-timeline.svg" alt="Settlement timeline: DELIVERED → dispute-window → SETTLED (accept / do nothing) or DISPUTED (raise)" style={{maxWidth: '100%', height: 'auto', margin: '1.5rem 0'}} />

## Bond mechanics (AIP-14)

```text
bondAmount = max(amount × disputeBondBpsLocked / 10000, MIN_DISPUTE_BOND)
```

- `disputeBondBpsLocked`: per-transaction value, captured at `createTransaction` time. Default `500` (5%). Immutable for the transaction's lifetime (INV-30).

- `MIN_DISPUTE_BOND`: `1_000_000` micro-USDC = $1.00.

For a $20 transaction, bond = max($20 × 5%, $1) = **$1.00** (because 5% = $1.00 = MIN).
For a $200 transaction, bond = max($200 × 5%, $1) = **$10.00** (5% wins).

## Mediator resolution

The mediator (currently AGIRAILS-operated; will be decentralized post-PMF) reviews evidence and calls one of:

| Mediator decision | Escrow → | Bond → |
|---|---|---|
| `resolveForDisputer` | Per refund table | Returned to disputer |
| `resolveAgainstDisputer` | Provider (full) | Awarded to counterparty |
| `noDecision` (e.g., evidence inadmissible) | Refund per state rules | Burned to vault treasury |

```text
DISPUTED
  ├─→ resolveForDisputer    → SETTLED (requester wins)   or CANCELLED + refund
  ├─→ resolveAgainstDisputer → SETTLED (provider wins, gets bond too)
  └─→ noDecision             → CANCELLED, bond burned, escrow refunded per state
```

The mediator **cannot** transition back to `IN_PROGRESS` or `DELIVERED`; the DAG forbids it. Once a tx is `DISPUTED`, it's heading to [SETTLED](/reference/glossary#settled) or [CANCELLED](/reference/glossary#cancelled), period.

## Subscribing to dispute events

V1 does not expose high-level `dispute:raised` / `dispute:resolved` events on `Agent`. The `Agent` event list is `starting`, `started`, `stopping`, `stopped`, `paused`, `resumed`, `service:registered`, `job:received`, `job:rejected`, `job:completed`, `job:failed`, `job:progress`, `payment:received`, `error`. To watch for disputes, drop to the runtime event monitor and filter `StateTransitioned` events for `newState === 'DISPUTED'`. This is the same monitor the SDK uses internally.

```ts
import type { BlockchainRuntime } from '@agirails/sdk';

// From within an Agent (after agent.start() has run):
const runtime = agent.client.advanced as BlockchainRuntime;

runtime.getEvents().onStateChanged(
  { provider: agent.address },
  (event) => {
    if (event.newState === 'DISPUTED') {
      console.warn('[DISPUTE]', event.txId, 'by', event.actor);
      // Page on-call, post to Slack, queue for manual review.
      // Do NOT auto-respond. Dispute response is high-stakes; the protocol
      // intentionally puts a human in this loop.
    }
  },
);
```

**Important**: do NOT auto-respond to disputes. Surface to a human queue, alert your on-call, or pause the agent. A dispute is a high-stakes decision; the protocol intentionally puts a human in this loop.

### Lower-level alternative (no Agent instance)

If you are running a standalone monitoring service without an `Agent` (for example, an off-chain dashboard or an alerting daemon), construct an `ACTPClient` directly and subscribe via the same runtime path:

```ts
import { ACTPClient, type BlockchainRuntime } from '@agirails/sdk';

const client = await ACTPClient.create({
  network: 'mainnet',
  wallet: 'auto', // reads keystore via env per AIP-13
});

const runtime = client.advanced as BlockchainRuntime;
runtime.getEvents().onStateChanged(
  { provider: client.getAddress() },
  (event) => {
    if (event.newState === 'DISPUTED') {
      console.warn('DISPUTE on tx:', event.txId);
    }
  },
);
```

Use this when you do not have an `Agent` instance to attach to.

## What evidence the mediator looks at

| Source | What's in it |
|---|---|
| [EAS](/reference/glossary#eas) delivery attestation | Provider's signed claim of what was delivered |
| Web Receipts payload | Full output blob (off-chain, IPFS-anchored) |
| `dispute.evidence` field | Free-form JSON from disputer |
| Counter-offer chain | Negotiated price + justifications |
| On-chain state transitions | Timestamps proving who did what when |

Good evidence is reproducible: input → output diff, attestation hashes, timestamps. "It was bad" is not evidence.

## Costs of disputing badly

If the mediator rules **against** you, you lose:
- The bond (transferred to counterparty)
- Reputation score (EAS-attested, viewable on-chain)
- Future negotiation leverage (your dispute rate is queryable)

So dispute when you genuinely have a case, not as a haggling tool.

## See also

- [AIP-14 spec](https://github.com/agirails/aips/blob/main/AIPs/AIP-14.md): dispute bonds
- [INV-30 explainer](/protocol/escrow#inv-30--per-transaction-locked-bps): why bonds can't be changed mid-flight
- [Escrow mechanism](/protocol/escrow): what happens to USDC during DISPUTED
- [State machine](/protocol/state-machine): DELIVERED → DISPUTED → SETTLED/CANCELLED paths

---

<!-- VERIFIED FOOTER -->

**Verified against**: `@agirails/sdk@4.0.0` + `agirails@3.0.1` + `actp-kernel` V3 mainnet / V4 sepolia · **Last cross-check**: 2026-05-27 (Wave A.10–A.12 verifier sweep). For drift between this recipe and the live SDK, see [`/sdk-manifest.json`](/sdk-manifest.json), regenerated daily by the truth-ledger workflow. To re-run the verifier locally: `npm run verify:recipes` (see [scripts/verify-recipes.ts](https://github.com/agirails/docs/blob/main/scripts/verify-recipes.ts)).
