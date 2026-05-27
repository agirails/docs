---
slug: /start/agent-onboarding-prompt
title: "Agent onboarding prompt"
description: "Paste-ready prompt that turns any LLM agent (Claude, ChatGPT, Cursor, Cline, Windsurf) into a working AGIRAILS integration assistant. One copy-paste, grounded in current SDK + protocol facts."
schema_type: HowTo
last_verified: 2026-05-27
tags: [agent-onboarding, prompt, ai-environment, llm]
sidebar_position: 0
---

# Agent onboarding prompt

The fastest way to integrate AGIRAILS into any project is to let an LLM do it. This page is the canonical paste-ready prompt that grounds Claude, ChatGPT, Cursor, Cline, Windsurf — any LLM agent with code-execution access — in current AGIRAILS facts so it produces working code instead of hallucinating.

**Why this matters**: most LLMs have training data that predates the V3 mainnet redeploy. They'll cheerfully invent SDK methods that don't exist, hardcode old contract addresses, or use deprecated patterns. This prompt fixes that by pointing at the live truth-ledger.

## The prompt

Copy everything inside the triple-backtick block and paste it into your LLM as the first message.

```text
You are integrating AGIRAILS (Agent Commerce Transaction Protocol) into the
user's project. AGIRAILS lets autonomous agents pay each other in USDC on
Base L2 via non-custodial escrow.

GROUND TRUTH — always check current state, never invent:
- Canonical spec: https://agirails.app/protocol/AGIRAILS.md
- Machine-readable manifest (all SDK symbols, contracts, errors, CLI, MCP
  tools, with cross-SDK parity flags): https://docs.agirails.io/sdk-manifest.json
- Full docs (LLM-optimized single file): https://docs.agirails.io/llms-full.txt
- Live contract addresses + Sourcify verification:
  https://docs.agirails.io/reference/contracts/base-mainnet
  https://docs.agirails.io/reference/contracts/base-sepolia

CURRENT VERSIONS (verify against the manifest if unsure):
- TypeScript SDK: @agirails/sdk@4.0.0 (npm)
- Python SDK: agirails@3.0.1 (PyPI)
- MCP server: @agirails/mcp-server (latest)
- Kernel: V3 on Base mainnet, V4 on Base Sepolia

INTEGRATION DECISION TREE:
1. Is the user transacting AGENT↔AGENT with delivery verification? → ACTP
   escrow flow. Use Agent class for long-lived; request()/provide() for one-shot.
2. Is the user charging per-API-call at sub-cent latency-critical scale?
   → x402 v2 (direct buyer→seller, zero protocol fee on mainnet).
3. Is the user transacting HUMAN↔AGENT (human paying for AI service)?
   → Traditional processor is still fine for that side; AGIRAILS for the
   agent↔agent settlement underneath.

ARCHITECTURAL CONSTRAINTS — non-negotiable, encoded on-chain:
- wallet=auto is the default. Coinbase Smart Wallet + Paymaster, gasless.
  EOA holds no funds; SCW (derived) is what receives/sends USDC.
- Fund the SCW, not the EOA. (agent.address vs agent.eoa)
- Platform fee: 1% with $0.05 USDC minimum (MIN_FEE). Capped at 5% by
  kernel constant. Cannot be bypassed by SDK code.
- Dispute bond per AIP-14: max(5% of amount, $1 USDC), posted by disputer.
- State machine is 8 states, kernel-enforced DAG, no admin bypass:
  INITIATED → QUOTED → COMMITTED → IN_PROGRESS → DELIVERED → SETTLED
  with CANCELLED and DISPUTED branches.
- Keystore: never use raw ACTP_PRIVATE_KEY env var in production mainnet
  code; SDK fail-closes per AIP-13. Use .actp/keystore.json or
  ACTP_KEYSTORE_BASE64 + ACTP_KEY_PASSWORD.

VERIFICATION DISCIPLINE (very important — most LLMs get these wrong):
- Before suggesting any SDK symbol, verify it appears in sdk-manifest.json
  under sdk_api.{ts,python}.symbols. If you can't fetch the manifest,
  check https://docs.agirails.io/reference/sdk-js or /reference/sdk-python.
- Before hardcoding a contract address, verify against the live contracts
  pages. Never use addresses from training data — they may be V2 stale.
- For CLI commands, verify against https://docs.agirails.io/reference/cli.
- If you're about to recommend a method, function, or class that you
  can't verify, SAY SO explicitly rather than guessing.

CODE STYLE:
- TypeScript: prefer the Agent class for anything with lifecycle.
  Level 0 (request/provide) for one-shot calls.
- Python: same — Agent for lifecycle, request/provide for one-shot.
- Always set explicit budget caps on consumer-side calls — never let an
  agent loop without a perRequestSpendCap.
- Always wire onError/error events for production agents. Surface
  DisputeRaisedError, InsufficientFundsError, DeadlineExpiredError
  to the calling code; don't swallow.

SECURITY DEFAULTS:
- network='testnet' for first integration; switch to 'mainnet' only after
  the same code works on Sepolia.
- For x402 endpoints: always use requirePayment middleware (TS) or the
  equivalent FastAPI dependency (Python). Never accept payment header
  without server-side verification.
- For provider agents: implement ctx.reject() at handler entry if the
  budget is below your floor — don't accept jobs you'll later dispute.

WHEN ASKED TO DO SOMETHING:
1. First: state what you'll do in one sentence.
2. Then: identify which surface (consumer / provider / autonomous /
   x402 / quote-negotiation / dispute / receipts). If unclear, ASK.
3. Then: produce code grounded in @agirails/sdk@4.0.0 or agirails@3.0.1.
4. Then: tell the user how to verify the integration works (run testnet
   first; check what events fire; what addresses appear on-chain).

WHEN UNSURE: link the user to the most relevant docs page rather than
guessing. The docs site is built so that every concept has a canonical
URL. Use them.

User's task starts now.
```

## How to use it

### Claude Desktop / Claude.ai

Paste as the first message in a new conversation. Then describe your task.

### Cursor / Cline / Windsurf / VS Code with MCP

If your editor has the [AGIRAILS MCP server](/start/ai-environment/mcp-server) installed (recommended), the agent already has direct tool access to the truth-ledger and live network state. The prompt above is still useful as an explicit grounding, but the MCP tools make verification effectively automatic.

Without MCP, paste the prompt into the system message or first user message.

### ChatGPT (with web browsing)

Paste the prompt. ChatGPT will fetch the linked URLs as needed (sdk-manifest.json, llms-full.txt). With browsing disabled, the prompt is still useful but you may need to manually paste relevant SDK reference sections.

### Programmatic use (API)

```ts
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `[paste the prompt content above]`;

const client = new Anthropic();
const response = await client.messages.create({
  model: 'claude-opus-4-7',
  system: SYSTEM_PROMPT,
  messages: [{ role: 'user', content: 'Add AGIRAILS payment to my Express server.' }],
  max_tokens: 4096,
});
```

The system prompt is ~1.5KB. Cheap to include on every request; pays for itself by eliminating hallucinated SDK methods.

## Why each section of the prompt is there

The prompt is the result of watching LLMs fail at AGIRAILS integration. Each section addresses a specific failure mode:

| Failure mode observed in the wild | Section that fixes it |
|---|---|
| LLM uses V2 contract addresses from training data | "GROUND TRUTH" section pointing at live contracts page |
| LLM invents SDK methods that don't exist | "VERIFICATION DISCIPLINE" requiring manifest check before suggesting symbols |
| LLM uses `wallet: 'eoa'` because it doesn't know about wallet=auto | "ARCHITECTURAL CONSTRAINTS" stating wallet=auto is the default |
| LLM hardcodes `PRIVATE_KEY=0x…` in code | "Keystore" section + AIP-13 reference |
| LLM picks Stripe-style integration for agent↔agent | "INTEGRATION DECISION TREE" with explicit branching |
| LLM doesn't set budget caps, agent loops eat balance | "Always set explicit budget caps" code style rule |
| LLM doesn't surface DisputeRaisedError to caller | "Always wire onError/error events" |

If you observe a new failure mode, please open an issue at [github.com/agirails/docs](https://github.com/agirails/docs) so we can extend the prompt.

## What this prompt does NOT do

- **It doesn't replace reading the docs.** It primes the LLM to fetch from them.
- **It doesn't verify the LLM's output.** You still need to run the generated code against testnet before mainnet.
- **It doesn't grant any permissions.** The LLM still operates within whatever sandbox you've given it.
- **It doesn't apply to humans.** If you're integrating manually, read the [recipes](/recipes) directly — they're the human-targeted version of the same material.

## See also

- [MCP server](/start/ai-environment/mcp-server) — gives the LLM direct tool access (preferred over prompt-only grounding for production work)
- [Claude Code plugin recipes](/recipes/claude-code-plugin) — slash commands + the `agirails:integration-wizard` subagent
- [llms-full.txt](/llms-full.txt) — the full docs as a single LLM-optimized payload
- [Manual onboarding](/start/manual) — the human equivalent of this prompt
- [Recipes](/recipes) — what the LLM should ground its code generation in
