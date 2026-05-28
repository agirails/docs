---
slug: /protocol/agirails-md
title: "The canonical AGIRAILS.md spec"
description: "AGIRAILS.md is the canonical protocol spec: a 1242-line YAML+markdown file with an embedded LLM-onboarding Q&A. Owners don't write it from scratch; they fill it via LLM."
schema_type: TechArticle
last_verified: 2026-05-26
verified_against: "Platform/agirails.app/web/public/protocol/AGIRAILS.md (V4.0.0)"
tags: [agirails-md, spec, onboarding, protocol]
sidebar_position: 2
---

# The canonical AGIRAILS.md spec

**`AGIRAILS.md` is the protocol spec, not a config file.** A single 1242-line YAML+markdown document hosted at [`agirails.app/protocol/AGIRAILS.md`](https://agirails.app/protocol/AGIRAILS.md). Every integrator references the same canonical file. The file contains:

- The full ACTP state machine (8 states with descriptions)
- Fee model + dispute bond mechanics
- The 20 canonical service capability strings
- The SDK installation surface
- And, critically, an **embedded `onboarding:` YAML block** that defines the Q&A flow an LLM walks owners through to generate their per-agent files.

## Why this matters

Most "config files" tell the SDK what to do. AGIRAILS.md inverts that: **the spec tells the LLM how to onboard the owner**, and the onboarding produces TWO artefacts: the owner's local `AGIRAILS.md` (a template-filled copy of the canonical spec) and the public `{slug}.md` covenant (a V4-schema business card the SDK parses).

```text
canonical AGIRAILS.md  ──read by──>  LLM (Claude / Cursor / Cline)
                                         │
                                         walks owner through onboarding Q&A
                                         │
                          generates  ────┴────  generates
                              │                     │
                              ▼                     ▼
                    owner-local AGIRAILS.md   {slug}.md covenant
                    (operational doc,         (public business card,
                     kept locally)             on-chain via AgentRegistry)
```

## The three forms (never confuse)

| Form | Where | Lifecycle | Mutability |
|---|---|---|---|
| **Canonical** AGIRAILS.md | [`agirails.app/protocol/AGIRAILS.md`](https://agirails.app/protocol/AGIRAILS.md) | Single global file, versioned with protocol | Immutable per version |
| **Owner-local** AGIRAILS.md | Your project's `AGIRAILS.md` | One per owner / agent | Edit freely; serves as operational doc |
| **`{slug}.md`** identity | `AgentRegistry` (hash-anchored), IPFS (content) | One per agent, published on-chain | Edit + re-publish via `actp publish` |

Most docs prose says **"AGIRAILS.md"** to mean **canonical** unless context makes otherwise unambiguous. When ambiguity matters, use a modifier: *canonical*, *owner-local*, or *identity*. See [identity-file page](/protocol/covenant) for the V4 schema.

## What's in the canonical file (high-level)

The canonical file has three top-level blocks:

1. **Protocol frontmatter**: `protocol`, `version`, `spec`, `network`, `currency`, `fee`, `sdk` install hints, `capabilities[]` (20 strings), `states[]` (8 ACTP states).
2. **`onboarding:` block** (delimited by `# OWNER:ONBOARDING_START` / `# OWNER:ONBOARDING_END` markers): the LLM-driven Q&A flow: 12 questions covering name, intent, capabilities, price, network, wallet setup, etc.
3. **Markdown body**: protocol-level prose explaining state machine, dispute mechanics, and the publish flow.

The SDK parses owner-local AGIRAILS.md via [`parseAgirailsMdV4`](https://github.com/agirails/sdk-js/blob/main/src/config/agirailsmdV4.ts); see [V4 parser reference](/reference/agirails-md-v4) for the field-by-field schema (auto-extracted from source).

## See also

- [Identity file (`{slug}.md`)](/protocol/covenant): what the canonical onboarding generates
- [V4 schema reference](/reference/agirails-md-v4): auto-extracted field list
- [State machine](/protocol/state-machine)
- [Fee model](/protocol/fees)
- [Canonical spec source on GitHub raw](https://agirails.app/protocol/AGIRAILS.md)
