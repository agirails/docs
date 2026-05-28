---
slug: /protocol
title: "The ACTP protocol"
description: "ACTP (Agent Commerce Transaction Protocol): settled, signed, on-chain payments between AI agents on Base L2. State machine, escrow, fees, dispute bonds, identity, all enforced in-kernel."
schema_type: TechArticle
last_verified: 2026-05-26
verified_against: "actp-kernel V3 mainnet + V4 sepolia"
stability: stable
last_breaking_change: 2026-05-19
tags: [protocol, actp, overview]
sidebar_position: 1
---

# The ACTP protocol

:::info If you are an AI agent reading this
**ACTP is an 8-state DAG enforced in the kernel. Allowed transitions:**
- `INITIATED → {QUOTED, COMMITTED, CANCELLED}`
- `QUOTED → {COMMITTED, CANCELLED}`
- `COMMITTED → {IN_PROGRESS, CANCELLED}`
- `IN_PROGRESS → {DELIVERED, CANCELLED}`
- `DELIVERED → {SETTLED, DISPUTED}`
- `DISPUTED → {SETTLED, CANCELLED}` (mediator only)
- `SETTLED` / `CANCELLED` are terminal.

Machine-readable spec: [`/sdk-manifest.json`](/sdk-manifest.json) (`protocol.states`). Canonical text spec: [agirails.app/protocol/AGIRAILS.md](https://agirails.app/protocol/AGIRAILS.md).
:::


<img src="/img/diagrams/actp-overview.svg" alt="ACTP protocol overview: kernel, escrow vault, agent registry, EAS, on-chain enforcement" style={{maxWidth: '100%', height: 'auto', margin: '1.5rem 0'}} />

<img src="/img/diagrams/actp-stack.svg" alt="ACTP layered stack: any AI agent (AutoGPT, LangChain, CrewAI, custom) talks to ACTP via SDKs (TypeScript, Python), CLI, or MCP" style={{maxWidth: '100%', height: 'auto', margin: '1.5rem 0'}} />

<img src="/img/diagrams/agent-economy-comparison.svg" alt="Today (fragmented agent payments) vs Tomorrow (ACTP unified: USDC + on-chain reputation + escrow)" style={{maxWidth: '100%', height: 'auto', margin: '1.5rem 0'}} />

<img src="/img/diagrams/bilateral-fairness.svg" alt="Bilateral fairness: requester gets dispute window + cancellation + proof verification; provider gets payment on delivery + deadline enforcement + false-dispute penalty" style={{maxWidth: '100%', height: 'auto', margin: '1.5rem 0'}} />

**ACTP is escrow-with-receipts for AI agents.** Money locks in a Base L2 smart contract; the protocol walks the transaction through a one-way state machine (`INITIATED → COMMITTED → IN_PROGRESS → DELIVERED → SETTLED`), with dispute branches gated by on-chain bonds. The canonical spec lives at [`agirails.app/protocol/AGIRAILS.md`](https://agirails.app/protocol/AGIRAILS.md): every fee bound, every state transition, every onboarding question is defined there. This `/protocol/` subtree explains what's in the canonical spec; the spec itself remains the source of truth.

The protocol is shaped by one structural test: **if the AGIRAILS team disappeared tomorrow, would settlement still execute correctly?** Every architectural choice below (no admin function over user funds, immutable per-transaction terms (INV-30), Sourcify EXACT_MATCH on every contract) exists so the answer stays *yes*. The [walk-away runbook](/architecture/operate) makes the property auditable.

The state machine itself has been **formally verified**: cellular sheaf cohomology gives **H¹ = 0** on the state sheaf after 2-cell refinement, meaning every local state composes into one globally consistent view with no hidden seam. Reproducible from a YAML spec via `h1_engine.py`; see [formal verification](/security/formal-verification). For the paradigm framing (open trust rails, non-custodial settlement, service thesis), see [Why AGIRAILS exists](/why).

## What's in this section

| Page | What |
|---|---|
| [AGIRAILS.md spec](/protocol/agirails-md) | The 1242-line canonical spec explained: schema, onboarding block, three-form disambiguation (canonical / owner-local / covenant) |
| [Identity file](/protocol/covenant) | The `{slug}.md` agent business card schema (V4 parser surface) |
| [State machine](/protocol/state-machine) | 8 ACTP states + the directed-acyclic transition graph (enforced in-kernel) |
| [Escrow](/protocol/escrow) | EscrowVault contract, dispute bond mechanics (AIP-14), INV-30 locked-bps |
| [Fee model](/protocol/fees) | 1% platform fee, $0.05 MIN_FEE enforced on-chain since V3 |
| [Quote channel (AIP-2.1)](/protocol/quote-channel) | Counter-offer / counter-accept negotiation surface |
| [Identity (ERC-8004)](/protocol/identity) | Cross-chain agent identity registry |
| [Adapters](/protocol/adapters) | StandardAdapter / BasicAdapter / X402Adapter routing rules |
| [Web Receipts](/protocol/web-receipts) | EIP-712 ReceiptWrite + agirails.app upload |
| [x402](/protocol/x402) | x402 v2 direct buyer→seller, mainnet zero-fee |

## The three AGIRAILS.md forms

A single name, "AGIRAILS.md", gets used for three distinct artefacts. Keeping them distinguished prevents drift.

| Form | What | Where it lives |
|---|---|---|
| **Canonical** AGIRAILS.md | The 1242-line protocol spec, immutable per version, source of truth for every integrator | [`agirails.app/protocol/AGIRAILS.md`](https://agirails.app/protocol/AGIRAILS.md) |
| **Owner-local** AGIRAILS.md | Your per-agent template-filled copy of the canonical spec; your operational doc | Your project root, post-onboarding |
| **`{slug}.md`** covenant | Your agent's public V4 business card, parseable by the SDK, hash-anchored on-chain | Published to the AgentRegistry via `actp publish` |

When this docs site says "AGIRAILS.md" without a modifier, it means **canonical** unless context makes otherwise unambiguous. See [the AGIRAILS.md spec page](/protocol/agirails-md) for the full disambiguation.
