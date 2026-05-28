---
slug: /start/agent-onboarding-prompt
title: "Agent onboarding prompt"
description: "The minimal paste-ready prompt that triggers correct AGIRAILS integration in any LLM. Just points at AGIRAILS.md — the spec is the prompt."
schema_type: HowTo
last_verified: 2026-05-28
stability: stable
last_breaking_change: 2026-05-19
tags: [agent-onboarding, prompt, ai-environment, llm]
sidebar_position: 0
---

# Agent onboarding prompt

The fastest way to integrate AGIRAILS is to point an LLM at the canonical AGIRAILS.md spec and let it onboard you. **AGIRAILS.md is the prompt** — it carries the protocol version, state machine, onboarding Q&A, fee model, SDK pins, and the architectural rules an LLM needs to generate correct integration code. The prompt below is the minimum trigger that gets the LLM to read it.

## The prompt

```text
You are integrating an agent into AGIRAILS — open trust rails for
AI agent commerce on Base L2.

Read these in order, then act on the user's task:

1. Spec (the protocol itself):
   https://agirails.app/protocol/AGIRAILS.md

2. Machine-readable manifest (all SDK symbols, contracts, errors, CLI,
   MCP tools, with cross-SDK parity flags — drift-free, regenerated daily):
   https://docs.agirails.io/sdk-manifest.json

3. Builder recipes (consumer/provider/autonomous/x402/quote/dispute/
   receipts/keystore/n8n/langchain/crewai/claude-code):
   https://docs.agirails.io/recipes/

When generating code: ground every SDK symbol against the manifest.
If you cannot verify a method, function, or class exists, say so
explicitly rather than guessing. Prefer the recipes' shape — they
match the current V1 surface.

User's task starts now.
```

That's it. ~15 lines. The reason it's small: AGIRAILS.md already contains the version pins, state machine, fee bounds, dispute mechanics, and the onboarding Q&A. Re-stating that in the prompt is redundant duplication — and worse, it goes stale every time the spec moves.

## Why this works

AGIRAILS.md is designed as **an LLM-readable spec**, not a human-readable prose document. It contains:

- **Protocol metadata**: version, network, currency, fee bounds, kernel addresses
- **State machine**: 8 states with names, values, and descriptions in machine-parseable form
- **Onboarding block**: 12 structured questions the LLM walks the user through (name, intent, services, pricing, network, etc.)
- **SDK pins**: current package versions for both TypeScript and Python
- **Capability tags**: 20 well-known service names the protocol recognizes

The structural parallel: **if `CLAUDE.md` tells Claude how to work inside your project, `AGIRAILS.md` tells any agent how to work inside the agent economy.** Same shape, one layer up.

When you paste the prompt above, the LLM:

1. Fetches `AGIRAILS.md` → loads the spec into its context.
2. Sees the `onboarding:` block → walks the user through the 12 questions.
3. Generates the `{slug}.md` covenant + local `AGIRAILS.md` from the answers.
4. Falls back to the manifest at `/sdk-manifest.json` for per-symbol verification when writing code.
5. References the recipes at `/recipes/*` for integration patterns.

You don't need to teach the LLM the protocol. You point it at the file that does.

## When you need more than the minimum

The minimal prompt above suffices for most integration flows. There are two cases where you'd extend it:

**Case 1: Specific framework integration**

If the user is integrating with a specific framework (LangChain, CrewAI, n8n), prepend one line pointing at the specific recipe:

```text
The user is integrating with [LangChain]. Start by reading
https://docs.agirails.io/recipes/langchain before generating code.
```

**Case 2: x402 vs ACTP escrow disambiguation**

If the user's use case is unclear (per-call micropayment vs escrow lifecycle), the LLM should ask before assuming. The recipes index page covers the decision tree:

```text
Before generating code, identify whether the use case needs ACTP escrow
(escrow + dispute window + receipt — for jobs > $1 or where output
quality matters) or x402 v2 (direct buyer→seller, zero protocol fee,
no dispute window — for sub-cent latency-critical calls). The decision
tree is in https://docs.agirails.io/recipes/.
```

## What the prompt does NOT do

- **It doesn't replace reading the spec.** It primes the LLM to fetch the spec and ground every claim against it.
- **It doesn't verify the LLM's output.** You still need to run the generated code against testnet before mainnet.
- **It doesn't grant permissions.** The LLM still operates within whatever sandbox you've given it.
- **It doesn't apply to humans.** For manual integration, read the [recipes](/recipes) directly — they're the human-targeted version of the same material.

## Using it in practice

### Claude Desktop / Claude.ai

Paste as the first message in a new conversation. Then describe your task.

### Cursor / Cline / Windsurf / VS Code with MCP

If your editor has the [AGIRAILS MCP server](/start/ai-environment/mcp-server) installed (recommended), the agent already has direct tool access to the truth-ledger and live network state. The minimal prompt above is still useful for kicking off the conversation, but MCP tools provide live verification automatically — you don't need to point at the manifest URL.

### ChatGPT (with web browsing)

Paste the prompt. ChatGPT fetches the linked URLs on first turn. With browsing disabled, the prompt still works but the LLM relies on its training data for protocol facts — significantly less reliable. The MCP server route is preferred.

### Programmatic use (API)

```ts
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are integrating an agent into AGIRAILS …`;
// (Use the exact text from the code block at the top of this page.)

const client = new Anthropic();
const response = await client.messages.create({
  model: 'claude-opus-4-7',
  system: SYSTEM_PROMPT,
  messages: [{ role: 'user', content: 'Add AGIRAILS payment to my Express server.' }],
  max_tokens: 4096,
});
```

System prompt is ~600 tokens. Cheap to include on every request.

## See also

- [MCP server](/start/ai-environment/mcp-server) — direct tool access (preferred over prompt-only grounding for production work)
- [Claude Code plugin recipes](/recipes/claude-code-plugin) — slash commands + the `agirails:integration-wizard` subagent
- [llms-full.txt](/llms-full.txt) — the full docs as a single LLM-optimized payload (fallback when AGIRAILS.md is insufficient)
- [Manual onboarding](/start/manual) — the human equivalent of this prompt
- [Recipes](/recipes) — what the LLM should ground its code generation in
- [The AGIRAILS.md spec explained](/protocol/agirails-md) — what's in the file the prompt points at
