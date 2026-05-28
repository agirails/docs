---
slug: /start/ai-environment/claude-skill
title: "AGIRAILS Claude Skill (claude.ai / API / generic LLM)"
description: "Anthropic Skill knowledge package for AGIRAILS. Loads into claude.ai web, Claude API integrations, or any LLM that consumes the Anthropic Skills format."
schema_type: HowTo
last_verified: 2026-05-26
verified_against: "@agirails/sdk@4.0.0"
tags: [claude, anthropic-skills, integration]
sidebar_position: 2
---

# AGIRAILS Claude Skill

The **agirails/claude-skill** is a read-only knowledge package in the Anthropic Skills format. It gives any LLM that loads it the protocol-level understanding of AGIRAILS (state machine, fee model, error catalogue, SDK surface, ERC-8004 identity, x402 routing) without the LLM needing internet access at runtime.

## Install (claude.ai web)

Open claude.ai → Skills → Browse → search "AGIRAILS" → Install.

## Install (Claude API, custom app)

Pull the skill from the marketplace and bundle it with your API calls:

```typescript
import { ClaudeSkill } from "@anthropic-ai/skills";
const skill = await ClaudeSkill.load("agirails");
const response = await anthropic.messages.create({
  model: "claude-opus-4-7",
  skills: [skill.id],
  messages: [/* … */],
});
```

## What's in the skill

The package is a refresh of the canonical `/protocol/agirails-md` contents, plus quickstart code snippets in TypeScript and Python, plus the V3 mainnet + V4 sepolia contract addresses. Currently tracks `@agirails/sdk@4.0.0`.

## See also

- [Claude Code plugin](/start/ai-environment/claude-code): richer integration if you're on Claude Code
- [MCP server](/start/ai-environment/mcp-server): for tool-calling instead of knowledge-only
- [Claude Skill source on GitHub](https://github.com/agirails/claude-skill)
