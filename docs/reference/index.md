---
slug: /reference
title: "Reference"
description: "Auto-extracted reference: CLI commands, contract addresses, SDK API, error codes, MCP tools, AGIRAILS.md V4 schema. Every fact in this section comes from source via the truth-ledger pipeline."
schema_type: TechArticle
last_verified: 2026-05-26
tags: [reference, truth-ledger]
sidebar_position: 1
---

# Reference

Everything in this section is **auto-extracted from source** by the [truth-ledger manifest](/reference/glossary#truth-ledger-manifest) pipeline ([`scripts/build-truth-ledger.ts`](https://github.com/agirails/docs/blob/main/scripts/build-truth-ledger.ts)). The full machine-readable manifest is at [`/sdk-manifest.json`](/sdk-manifest.json).

| Surface | Source | Page |
|---|---|---|
| [actp CLI](/reference/glossary#actp-cli) commands | `actp --help` walk + Commander/Typer introspection | [/reference/cli](/reference/cli) |
| Contract addresses | `actp-kernel/deployments/*.json` + live [Sourcify EXACT_MATCH](/reference/glossary#sourcify-exact_match) | [/reference/contracts](/reference/contracts) |
| TS SDK API | `sdk-js/src/index.ts` barrel | [/reference/sdk-js](/reference/sdk-js) |
| Python SDK API | `agirails/__init__.py` `__all__` | [/reference/sdk-python](/reference/sdk-python) |
| Error codes | Both SDKs' error modules | [/reference/errors](/reference/errors) |
| [MCP](/reference/glossary#mcp) tools | `agirails-mcp-server/src/index.ts` TOOLS array | [/reference/mcp-server](/reference/mcp-server) |
| AGIRAILS.md V4 schema | `parseAgirailsMdV4` interface | [/reference/agirails-md-v4](/reference/agirails-md-v4) |

## How current is this?

Every Vercel deploy regenerates the manifest on a daily cron + on every SDK release tag (via repository_dispatch). The `_generatedAt` field in the manifest reports last refresh. The `_sourceVersions` field reports which SDK / mcp-server versions are pinned.
