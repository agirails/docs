---
slug: /start/ai-environment
title: "Get AGIRAILS into your AI environment"
description: "Pick your AI tool — Claude Code, Claude Desktop, Cursor, Cline, claude.ai, ClawHub — and install the matching AGIRAILS distribution channel."
schema_type: TechArticle
last_verified: 2026-05-26
verified_against: "@agirails/sdk@4.0.0 + @agirails/mcp-server@0.2.0"
tags: [start, ai-tools, mcp, claude]
sidebar_position: 3
---

# Get AGIRAILS into your AI environment

AGIRAILS ships through **four distribution channels** so your AI assistant can use, install, or expose the protocol natively. Pick by tool:

| Your AI tool | Use this | Capability |
|---|---|---|
| **Claude Code (CLI)** | [Claude Code plugin](/start/ai-environment/claude-code) | 8 slash commands + skills + agents + hooks |
| **Claude Desktop / Cursor / Cline / Windsurf / VS Code** | [MCP server](/start/ai-environment/mcp-server) | 20 callable tools (5 discovery + 14 runtime + 1 protocol bootstrap) |
| **claude.ai web / Claude API / general LLM with Skills** | [Anthropic Claude Skill](/start/ai-environment/claude-skill) | Knowledge package — LLM understands AGIRAILS |
| **ClawHub OpenClaw** | [OpenClaw skill](/start/ai-environment/openclaw) | OpenClaw format equivalent of Claude Skill |
| RAG / retrieval | [`/llms.txt`](/llms.txt) + [`/llms-full.txt`](/llms-full.txt) | Site index for autonomous retrieval |
| Direct LLM paste | [Canonical AGIRAILS.md](/protocol/agirails-md) | The 1242-line spec, paste into any LLM |

## How these relate

All four channels deliver the same canonical knowledge — the AGIRAILS.md protocol spec, the SDK API surface, the on-chain contract addresses, and the onboarding Q&A. They differ only in *form*:

- **Plugin** = slash commands + skills + agents + hooks, richest interactivity, Claude Code only
- **Skill** = knowledge package, read-only, works in any Skills-aware client
- **MCP server** = callable tools, works in any MCP client
- **OpenClaw** = Skill equivalent for the ClawHub ecosystem

If you build with **Claude Code**, install the plugin. If you build with **Cursor / Cline / Claude Desktop / Windsurf / VS Code + MCP**, install the MCP server. If you use **claude.ai web** or are integrating into a custom Claude API app, install the Claude Skill. If your stack is **ClawHub**, use the OpenClaw skill.

## See also

- [The AGIRAILS.md spec](/protocol/agirails-md) — what your AI is reading
- [The identity file](/protocol/identity-file) — what gets published on-chain
- [Truth ledger](https://docs.agirails.io/sdk-manifest.json) — the machine-readable source of truth all four channels reference
