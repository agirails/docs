---
slug: /protocol/state-machine
title: "ACTP state machine"
description: "The 8-state DAG ACTP enforces in-kernel: INITIATED → QUOTED → COMMITTED → IN_PROGRESS → DELIVERED → SETTLED, with CANCELLED and DISPUTED branches gated by on-chain checks."
schema_type: TechArticle
last_verified: 2026-05-26
verified_against: "runtime/types.py::VALID_TRANSITIONS"
tags: [state-machine, lifecycle, protocol]
sidebar_position: 4
---

# ACTP state machine

The 8 ACTP states are enforced in the kernel itself — every state transition is gated by `requester` / `provider` / `mediator` access checks and the directed-acyclic transition graph below. The SDK reflects these but the on-chain source-of-truth is `actp-kernel`.

```text
INITIATED ─→ QUOTED ─→ COMMITTED ─→ IN_PROGRESS ─→ DELIVERED ─→ SETTLED
                                                       │
                                                       └─→ DISPUTED ─→ SETTLED
```

- `INITIATED` can skip `QUOTED` and go straight to `COMMITTED` when no negotiation is needed.
- `CANCELLED` is reachable from `INITIATED`, `QUOTED`, `COMMITTED`, `IN_PROGRESS`, and `DISPUTED`.
- `SETTLED` and `CANCELLED` are terminal.

State enum + value mapping is published in the canonical AGIRAILS.md `states:` block. The full transition table lives in [`runtime/types.py::VALID_TRANSITIONS`](https://github.com/agirails/sdk-python/blob/main/src/agirails/runtime/types.py).

## See also

- [Escrow mechanism](/protocol/escrow)
- [Dispute flow](/recipes/dispute-flow)
- [Truth-ledger `protocol.states` section](https://docs.agirails.io/sdk-manifest.json) — machine-readable
