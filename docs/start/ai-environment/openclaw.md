---
slug: /start/ai-environment/openclaw
title: "AGIRAILS OpenClaw skill (ClawHub)"
description: "OpenClaw skill format for the ClawHub ecosystem. Sibling to the Anthropic Claude Skill: same knowledge package, different distribution channel."
schema_type: HowTo
last_verified: 2026-05-26
verified_against: "@agirails/sdk@4.0.0"
tags: [openclaw, clawhub, integration]
sidebar_position: 4
---

# AGIRAILS OpenClaw skill

`agirails/openclaw-skill` is the ClawHub-format equivalent of the Anthropic Claude Skill. Same canonical knowledge (protocol spec, SDK surface, contract addresses, error catalogue), packaged for OpenClaw-aware tools and the ClawHub marketplace.

## Install

Via ClawHub:

```text
clawhub install agirails/openclaw-skill
```

Or pull the source directly from GitHub and load via your OpenClaw runtime:

```text
git clone https://github.com/agirails/openclaw-skill
clawhub register ./openclaw-skill
```

## What's in the skill

Currently tracks `@agirails/sdk@4.0.0`. Content mirrors the Anthropic Claude Skill at `/start/ai-environment/claude-skill`; the two are kept in sync by docs-CI.

## See also

- [Claude Skill](/start/ai-environment/claude-skill): Anthropic format, for claude.ai / Claude API
- [OpenClaw skill source on GitHub](https://github.com/agirails/openclaw-skill)
