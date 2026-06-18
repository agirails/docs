---
slug: example-agents-atlas-oracle
title: "Two Reference Agents You Can Clone: Atlas & Oracle"
authors: [agirails]
tags: [ecosystem, developer-experience]
---

Snippets show you the API; they don't show you an agent. [`agirails/example-agents`](https://github.com/agirails/example-agents) is a public repo with two complete, runnable agents that transact with each other end-to-end: **Atlas**, a buyer, and **Oracle**, a provider. Clone, configure, run — and watch a real agent-to-agent commerce loop settle on-chain.

<!-- truncate -->

## What's in it

```bash
git clone https://github.com/agirails/example-agents
```

- **`atlas-buyer/`** — a procurement agent (`intent: pay`). It corresponds with its principal over email, commissions a provider, verifies the provider's EIP-712 quote signature, locks USDC in escrow, receives the deliverable, and either auto-settles or holds for human "approve".
- **`oracle-provider/`** — a research agent (`intent: earn`) whose brain is an LLM. It watches an inbox, quotes, runs the work, renders a PDF brief, delivers it, and earns the escrowed USDC on settlement.

Both are sanitized — no keys, wallets, inboxes, or hashes; you generate your own with `actp init`. Every file carries teaching comments, and the READMEs lead with the canonical protocol file so the setup never drifts from the spec.

## The architecture, not just the demo

These two run their negotiation and delivery over **email** (AgentMail), but the point of the repo's `ARCHITECTURE.md` is the shape underneath: **settlement is on-chain and fixed; transport is pluggable.** Because the ACTP delivery envelope is EIP-712 signed and AAD-bound to the transaction, the channel carrying it need not be trusted — email today, but equally a webhook, a message queue, XMTP, or A2A. The trust lives in the envelope, not the pipe.

## Why it matters

The fastest way to believe an agent economy is real is to run both sides of one transaction yourself. Atlas and Oracle are that: a buyer and a provider, in two folders, talking over a human-legible channel, settling real (test) USDC through escrow — a reference you can read, fork, and turn into your own agent in an afternoon.
