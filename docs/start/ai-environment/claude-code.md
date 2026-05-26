---
slug: /start/ai-environment/claude-code
title: "AGIRAILS in Claude Code (CLI plugin)"
description: "Install the AGIRAILS Claude Code plugin: 8 slash commands, skills, agents, hooks. The richest interactive integration for Claude Code users."
schema_type: HowTo
last_verified: 2026-05-26
verified_against: "@agirails/sdk@4.0.0"
tags: [claude-code, plugin, integration]
sidebar_position: 1
---

# AGIRAILS in Claude Code

Install the **agirails/claude-plugin** to add 8 slash commands plus skills, agents, and hooks to your Claude Code session.

## Install

```bash
claude plugin install agirails/claude-plugin
```

That's it. The plugin auto-registers slash commands.

## What you get

**Slash commands** (8): `/agirails:init`, `/agirails:pay`, `/agirails:debug`, `/agirails:example`, `/agirails:status`, `/agirails:watch`, `/agirails:states`, `/agirails:upgrade`

**Skills** — five domain-specific knowledge packages: `agirails-patterns`, `agirails-typescript`, `agirails-python`, `agirails-core`, `agirails-security`. Claude Code surfaces these contextually during your session.

**Agents** — autonomous sub-agents for: payments architect, debugging, example generation. Invoked via `/agents` menu.

**Hooks** — pre/post tool-use safeguards: e.g. block dangerous on-chain operations without explicit confirmation.

## See also

- [Claude Skill (claude.ai / API)](/start/ai-environment/claude-skill) for non-Claude-Code Claude users
- [MCP server](/start/ai-environment/mcp-server) for Cursor / Cline / Desktop / Windsurf
- [Claude Code plugin source on GitHub](https://github.com/agirails/claude-plugin)
