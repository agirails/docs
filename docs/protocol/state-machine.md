---
slug: /protocol/state-machine
title: "ACTP state machine"
description: "The 8-state DAG ACTP enforces in-kernel — INITIATED → QUOTED → COMMITTED → IN_PROGRESS → DELIVERED → SETTLED, with CANCELLED and DISPUTED branches gated by on-chain access checks. State machine integrity is the protocol's bedrock invariant."
schema_type: TechArticle
last_verified: 2026-05-26
verified_against: "actp-kernel V3 (mainnet) + V4 (sepolia); runtime/types.py::VALID_TRANSITIONS"
tags: [state-machine, lifecycle, protocol, invariants]
sidebar_position: 4
---

# ACTP state machine

The 8 ACTP states are **enforced in the kernel itself** — every state transition is gated by `requester` / `provider` / `mediator` access checks and the directed-acyclic transition graph below. The SDK reflects these states, but the on-chain `actp-kernel` is the source of truth.

<img src="/img/diagrams/state-machine.svg" alt="ACTP state machine — 8 states with terminal SETTLED + CANCELLED, dispute branch from DELIVERED" style={{maxWidth: '100%', height: 'auto', margin: '1.5rem 0'}} />

```text
INITIATED ─→ QUOTED ─→ COMMITTED ─→ IN_PROGRESS ─→ DELIVERED ─→ SETTLED
                                                        │
                                                        └─→ DISPUTED ─→ SETTLED
```

- `INITIATED` can **skip** `QUOTED` and go straight to `COMMITTED` when no negotiation is needed (most direct-pay flows).
- `CANCELLED` is reachable from `INITIATED`, `QUOTED`, `COMMITTED`, `IN_PROGRESS`, and `DISPUTED`.
- `SETTLED` and `CANCELLED` are **terminal** — no transitions out.

## The 8 states

| Value | State | Trigger | Who can transition |
|---:|---|---|---|
| 0 | `INITIATED` | Requester calls `createTransaction()` | Requester (→ QUOTED, COMMITTED, CANCELLED) |
| 1 | `QUOTED` | Provider counter-offers via `acceptQuote()` after AIP-2.1 negotiation | Requester (→ COMMITTED, CANCELLED) |
| 2 | `COMMITTED` | Requester locks USDC in escrow via `linkEscrow()` | Provider (→ IN_PROGRESS, CANCELLED) |
| 3 | `IN_PROGRESS` | Provider has started work | Provider (→ DELIVERED, CANCELLED) |
| 4 | `DELIVERED` | Provider submits deliverable + EAS attestation proof | Requester (→ SETTLED, DISPUTED) |
| 5 | `SETTLED` | Requester accepts delivery → USDC released to provider | — (terminal) |
| 6 | `DISPUTED` | Either party calls `transitionState(DISPUTED)` + posts $1 USDC bond | Mediator (→ SETTLED, CANCELLED) |
| 7 | `CANCELLED` | Various paths; refund to requester (minus penalty if applicable) | — (terminal) |

## Why DAG-only on-chain

State machine integrity is one of the three [critical invariants](https://github.com/agirails/actp-kernel/blob/main/.claude-docs/invariants.md) of ACTP. If a transaction could move backwards or jump arbitrarily, escrow becomes uncomposable: anyone could re-trigger a refund after settlement, or skip the delivery check entirely.

The kernel enforces this via a single `_validateTransition(from, to)` function that exhaustively lists the allowed `(from → to)` pairs. There is no admin function that bypasses it. Even the mediator can only resolve `DISPUTED` to `SETTLED` or `CANCELLED`, never back to `IN_PROGRESS`.

## SDK surface

The same 8-state enum is exposed in both SDKs:

```typescript
import { State } from '@agirails/sdk';
// State.INITIATED, State.QUOTED, …, State.CANCELLED
```

```python
from agirails import State
# State.INITIATED, State.QUOTED, …, State.CANCELLED
```

State transitions on the SDK side mirror the on-chain DAG; calling `client.standard.transitionState(txId, State.DELIVERED, proof)` from `COMMITTED` will revert at chain-level with `InvalidStateTransition`. The SDK pre-validates locally to fail-fast, but the on-chain check is the real guard.

## See also

- [Escrow mechanism](/protocol/escrow) — where the USDC sits between COMMITTED and SETTLED
- [Quote channel (AIP-2.1)](/protocol/quote-channel) — how INITIATED → QUOTED works
- [Dispute flow](/recipes/dispute-flow) — how DELIVERED → DISPUTED → SETTLED/CANCELLED unfolds
- [SDK errors](/reference/errors) — including `InvalidStateTransitionError`
- [Truth-ledger `protocol.states`](/sdk-manifest.json) — machine-readable, extracted from canonical AGIRAILS.md
