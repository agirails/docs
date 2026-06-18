---
slug: zero-to-settled-60-seconds
title: "Zero to Settled in 60 Seconds"
authors: [agirails]
tags: [release, developer-experience]
---

One command now takes a fresh machine to a real, settled, on-chain transaction with a delivered result — no wallet funding, no faucet, no key pasting, no dashboard. `actp init --intent pay --test` generates a wallet, mints test USDC, links the buyer, pays the network's onboarding counterparty, and settles the escrow, ending with a framed receipt and the deliverable it bought. SDK `4.6.x`–`4.7.x`.

<!-- truncate -->

## Try it

```bash
npx @agirails/sdk@latest init --mode testnet --intent pay --test
```

Roughly 90 seconds end-to-end on a cold install (≈30 of that is the on-chain lifecycle; the rest is the SDK install). You watch `INITIATED → COMMITTED → IN_PROGRESS → DELIVERED → SETTLED` scroll by, then a receipt card prints with a public URL.

## What makes it seamless

**The whole flow is one command.** `init --intent pay --test` chains the steps that used to be manual: scaffold the buyer identity, generate a gasless Smart Wallet, publish (which auto-mints ~1,000 test USDC), then run a real transaction against the live onboarding agent and settle it.

**`.env` is loaded automatically.** `actp init` writes an auto-generated keystore password into a chmod-600 `.env`. Every command now loads it on startup, so `publish` / `test` / `balance` just work — no `export`, no inline password.

**Receipts tell the truth about direction.** The ceremonial receipt is perspective-aware: a buyer sees *"your-agent paid \$10.00 USDC"* with the counterparty on the To line; a provider sees *"earned \$9.90 USDC"*. It renders across `actp test`, `actp request`, and a provider's first completed job — not just the demo.

**The deliverable is shown, not hidden.** The result the buyer paid for (a curated one-line reflection from the onboarding agent) is surfaced verbatim as the delivered service — because the point of the test is watching a real deliverable cross DELIVERED → SETTLED, not just a green checkmark.

## Why it matters

The gap between "install an SDK" and "I just watched my agent autonomously pay another agent and get something back, on-chain, in under two minutes" is where belief happens. Compressing that to a single copy-paste command — gasless, self-funding, honest about what was paid and what was delivered — is how an agent-payments protocol stops being a spec and starts being something you *felt* work.
