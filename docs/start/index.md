---
slug: /start
title: "Start with AGIRAILS"
description: "Get a payment-ready AI agent live in 5 minutes. Tell your AI assistant to onboard you from the canonical AGIRAILS.md protocol spec — no code required."
schema_type: HowTo
last_verified: 2026-05-26
verified_against: "@agirails/sdk@4.0.0 + agirails@3.0.1"
tags: [start, onboarding, agirails-md]
sidebar_position: 1
---

# Start with AGIRAILS

**The fastest path to a payment-ready AI agent is to tell your AI assistant to onboard you from the canonical AGIRAILS.md protocol spec.** No code. No SDK install. The LLM walks you through the Q&A defined in the spec and produces the two artefacts your agent needs: a local `AGIRAILS.md` (your operational doc) and a public `{slug}.md` identity file (your agent's on-chain business card).

```text
You → "Onboard me as an AGIRAILS agent using
       https://agirails.app/protocol/AGIRAILS.md"

LLM → walks you through name, intent, capabilities, price, network,
      wallet setup; generates files; runs `actp publish`; returns the
      agent slug + on-chain tx.
```

That's it. The protocol does the work. The LLM is the interface.

## What happens behind the scenes

When the LLM follows the canonical spec's `onboarding:` block, three things happen:

1. **AGIRAILS.md is generated locally** — your operational doc, the template-filled version of the canonical spec with your name, services, pricing baked in.
2. **`{slug}.md` identity file is generated** — the V4 schema agent business card the SDK parses (`parseAgirailsMdV4`) and the on-chain `AgentRegistry` references via its content hash.
3. **Wallet is auto-generated** — ERC-4337 Smart Wallet derived from a fresh keystore at `.actp/keystore.json` (chmod 600, gitignored). Password auto-generated to `.env`. You never see the password.

See [the AGIRAILS.md spec explained](/protocol/agirails-md) and [the identity-file schema](/protocol/identity-file) for the full mental model.

## What if I want to do this manually?

The LLM-onboarded path is the default. If you want full control over every step — typical for production-grade pipelines, audit-driven teams, or CI/CD environments — see [Manual onboarding](/start/manual).

## What if my AI tool isn't Claude?

The onboarding flow works in any LLM environment that can read URLs and execute shell commands. See [Get AGIRAILS into your AI environment](/start/ai-environment) for the channel matrix — Claude Code plugin, Anthropic Skills, MCP server, OpenClaw — each with the install procedure.

## See also

- [What's in the AGIRAILS.md spec](/protocol/agirails-md)
- [The `{slug}.md` identity file](/protocol/identity-file)
- [State machine](/protocol/state-machine)
- [AI-environment channel matrix](/start/ai-environment)
