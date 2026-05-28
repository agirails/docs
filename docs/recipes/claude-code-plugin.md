---
slug: /recipes/claude-code-plugin
title: "Claude Code plugin recipes"
description: "Use the `agirails` Claude Code plugin (slash commands, agents, and skills) to develop ACTP integrations from inside Claude Code, including a pre-wired AGIRAILS-specialized agent."
schema_type: HowTo
last_verified: 2026-05-26
verified_against: "agirails-claude-plugin@1.0.0 (Claude Code plugin marketplace)"
tags: [recipes, claude-code, plugin, ai-environment]
sidebar_position: 14
---

# Claude Code plugin recipes

<img src="/img/diagrams/claude-plugin-architecture.svg" alt="Claude Code plugin architecture: slash commands, skills, agents wrapping the SDK" style={{maxWidth: '100%', height: 'auto', margin: '1.5rem 0'}} />

The `agirails` Claude Code plugin gives Claude Code three things:

1. **Slash commands** for common [ACTP](/reference/glossary#actp) dev tasks (`/agirails:agent-new`, `/agirails:wallet-check`, `/agirails:audit`).
2. **Skills** that Claude auto-invokes when relevant (integration wizard, security auditor, testing assistant).
3. **Agents**: pre-configured sub-agents specialized for AGIRAILS work (integration wizard, security audit, test writing).

Install via the Claude Code marketplace: in your editor, `/plugin install agirails`.

## Verify install

```bash
# In a Claude Code session
> /agirails:wallet-check
# Plugin command runs your local agent's config check; if no keystore is present
# it walks you through generating one and funding it.
```

## Common usage patterns

### Scaffold a new agent

```
> /agirails:agent-new translation-service
```

This generates a working TS project (or Python with `--python` flag) with:

- `package.json` (or `pyproject.toml`) pinned to current SDK versions
- A `provide('translation-service', …)` skeleton with TODO markers
- `.actp/keystore.json` generation prompt
- A test harness that round-trips a mock job
- `actp deploy:check`-passing config out of the box

You can then ask Claude to fill in the LLM call inside the handler:

```
> The handler should call Anthropic's Claude API with a system prompt for translation.
```

### Specialized AGIRAILS agent

When working inside a project that imports `@agirails/sdk` or `agirails`, the plugin auto-suggests the **`agirails:integration-wizard`** agent for end-to-end integration work. Trigger it explicitly:

```
> Use the agirails:integration-wizard subagent to add USDC payments to this Express app.
```

The agent has internal knowledge of:

- Current SDK version surface (`@agirails/sdk@4.0.0`, `agirails@3.0.1`)
- The `wallet=auto` pattern, when to use it
- Best practices for keystores per [AIP-13](/reference/glossary#aip-13)
- [AIP-2.1](/reference/glossary#aip-21) quote-channel patterns
- Common error paths and fallback handling

### Security audit on commit

```
> Use the agirails:security-auditor subagent to review the staged changes.
```

The auditor looks for:

- Committed private keys (any 64-char hex matching `0x[a-f0-9]{64}`)
- Missing budget caps on `agent.request()` calls (V1: app-level enforcement)
- x402 server endpoints that accept the `X-Payment` header without on-server signature verification
- Hardcoded recipient addresses (should be config)
- `wallet: 'eoa'` in production code (warns; you might have a reason)
- Missing dispute handlers in long-running providers

### Test writing

```
> Use the agirails:testing-assistant subagent to write tests for src/handlers/translate.ts.
```

It generates tests using the SDK's built-in MockRuntime: your tests run without touching any chain, but verify the full state machine path.

## Skill auto-invocation

These skills fire automatically when Claude recognizes their triggers:

| Skill | Fires when |
|---|---|
| `agirails:integration-wizard` | User mentions "integrate AGIRAILS", "add payments", or imports the SDK |
| `agirails:security-auditor` | Plugin sees writes to `wallet`/`payment`/`config` files |
| `agirails:testing-assistant` | User asks for tests, or creates a test file referencing the SDK |

You can disable auto-invocation per skill via Claude Code settings.

## Composition with other plugins

The AGIRAILS plugin doesn't conflict with `vercel`, `claude-code-guide`, `feature-dev`, or framework-specific plugins. A typical full-stack flow:

```
> /feature-dev start  (plans the feature)
> Use the agirails:integration-wizard subagent to scaffold the payments piece.
> /feature-dev implement
> Use the agirails:security-auditor subagent to review.
> /feature-dev review
```

## Updating

The plugin pins SDK versions in its internal templates. When the SDK releases a major version, the plugin gets a corresponding bump. Update with `/plugin update agirails`.

If you're integrating against an older SDK (e.g. `@agirails/sdk@3.x`) explicitly pin in your scaffold:

```
> /agirails:agent-new my-service --sdk-version 3.5.0
```

## See also

- [Claude Code integration overview](/start/ai-environment/claude-code): broader Claude Code setup
- [Claude skill (Anthropic Skills)](/start/ai-environment/claude-skill): the other distribution channel
- [Consumer agent](/recipes/consumer-agent): what the wizard generates for the consumer side
- [Provider agent](/recipes/provider-agent): same for providers
- [Plugin source on GitHub](https://github.com/agirails/claude-code-plugin)

---

<!-- VERIFIED FOOTER -->

**Verified against**: `@agirails/sdk@4.0.0` + `agirails@3.0.1` + `actp-kernel` V3 mainnet / V4 sepolia · **Last cross-check**: 2026-05-27 (Wave A.10–A.12 verifier sweep). For drift between this recipe and the live SDK, see [`/sdk-manifest.json`](/sdk-manifest.json), regenerated daily by the truth-ledger workflow. To re-run the verifier locally: `npm run verify:recipes` (see [scripts/verify-recipes.ts](https://github.com/agirails/docs/blob/main/scripts/verify-recipes.ts)).
