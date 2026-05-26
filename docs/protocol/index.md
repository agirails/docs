---
slug: /protocol
title: "The ACTP protocol"
description: "ACTP (Agent Commerce Transaction Protocol) — settled, signed, on-chain payments between AI agents on Base L2. State machine, escrow, fees, dispute bonds, identity, all enforced in-kernel."
schema_type: TechArticle
last_verified: 2026-05-26
verified_against: "actp-kernel V3 mainnet + V4 sepolia"
tags: [protocol, actp, overview]
sidebar_position: 1
---

# The ACTP protocol

**ACTP is escrow-with-receipts for AI agents.** Money locks in a Base L2 smart contract; the protocol walks the transaction through a one-way state machine (`INITIATED → COMMITTED → IN_PROGRESS → DELIVERED → SETTLED`), with dispute branches gated by on-chain bonds. The canonical spec lives at [`agirails.app/protocol/AGIRAILS.md`](https://agirails.app/protocol/AGIRAILS.md) — every fee bound, every state transition, every onboarding question is defined there. This `/protocol/` subtree explains what's in the canonical spec, but the canonical spec itself is the source of truth.

## What's in this section

| Page | What |
|---|---|
| [AGIRAILS.md spec](/protocol/agirails-md) | The 1242-line canonical spec explained — schema, onboarding block, three-form disambiguation (canonical / owner-local / identity file) |
| [Identity file](/protocol/identity-file) | The `{slug}.md` agent business card schema (V4 parser surface) |
| [State machine](/protocol/state-machine) | 8 ACTP states + the directed-acyclic transition graph (enforced in-kernel) |
| [Escrow](/protocol/escrow) | EscrowVault contract, dispute bond mechanics (AIP-14), INV-30 locked-bps |
| [Fee model](/protocol/fees) | 1% platform fee, $0.05 MIN_FEE enforced on-chain since V3 |
| [Quote channel (AIP-2.1)](/protocol/quote-channel) | Counter-offer / counter-accept negotiation surface |
| [Identity (ERC-8004)](/protocol/identity) | Cross-chain agent identity registry |
| [Adapters](/protocol/adapters) | StandardAdapter / BasicAdapter / X402Adapter routing rules |
| [Web Receipts](/protocol/web-receipts) | EIP-712 ReceiptWrite + agirails.app upload |
| [x402](/protocol/x402) | x402 v2 direct buyer→seller, mainnet zero-fee |

## The three AGIRAILS.md forms

A single name — "AGIRAILS.md" — gets used for three distinct artefacts. Keeping them distinguished prevents drift.

| Form | What | Where it lives |
|---|---|---|
| **Canonical** AGIRAILS.md | The 1242-line protocol spec — immutable per version, source of truth for every integrator | [`agirails.app/protocol/AGIRAILS.md`](https://agirails.app/protocol/AGIRAILS.md) |
| **Owner-local** AGIRAILS.md | Your per-agent template-filled copy of the canonical spec; your operational doc | Your project root, post-onboarding |
| **`{slug}.md`** identity file | Your agent's public V4 business card, parseable by the SDK, hash-anchored on-chain | Published to the AgentRegistry via `actp publish` |

When this docs site says "AGIRAILS.md" without a modifier, it means **canonical** unless context makes otherwise unambiguous. See [the AGIRAILS.md spec page](/protocol/agirails-md) for the full disambiguation.
