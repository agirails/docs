# Information Architecture Proposal — docs.agirails.io

**Status**: draft v1, 2026-05-26
**Author**: drafted post-audit; awaiting Damir's review
**Decision gate**: this proposal must be approved before Wave A rewrite begins.

---

## Part 1 — First principles, before any sidebar

The audit found 26 P0 pages out of 48. Before proposing a new structure, the right question is: **why did 26 pages drift in the first place?** If we just rebuild on the same model, drift comes back the next redeploy.

Throwing out received practice and asking what docs actually have to do:

### Q1 — Who are the readers?

Conventional answer: developers integrating an SDK.

First-principles: in 2026, the reader is a **set of agents**, not a singular type.

| Reader | Primary need | What they actually do |
|---|---|---|
| Human evaluator (browsing) | "What is this in 30 sec?" | Reads top of homepage, decides yes/no |
| Human integrator | "Get me to a working agent in 5 min" | Copy-pastes, breaks things, recovers |
| Human auditor / researcher | "Verify protocol claims independently" | Cross-references docs ↔ chain ↔ source |
| **LLM consumer (RAG)** | "Retrieve a citable fact" | Indexed by similarity; per-chunk relevance |
| **LLM agent (Claude/Cursor/Cline)** | "Onboard my user from AGIRAILS.md" | Fetches canonical spec, executes commands |
| **Code-gen LLM** | "Generate working integration code" | Reads function signatures + examples |
| **Bot/crawler (SEO/GEO)** | "Index for discoverability" | Crawls structure, schema, headings |
| **Future maintainer** | "Walk away test — rebuild in days" | Reads `concepts/` + `architecture/` |

**Implication**: docs are not for humans-with-LLMs-as-secondary. They're **agent-first** with humans co-equal. This inverts how most docs are written today.

### Q2 — What does "agent-first" actually mean?

It is **not** "add llms.txt and call it done". The existing `llms-full.txt` is 25 121 lines auto-concat of stale source — adding a robot-readable index doesn't fix what's wrong with the source.

Agent-first means three structural commitments:

1. **One thesis per page, top-loaded.** First paragraph IS the answer. No throat-clearing, no metaphors before the fact. LLMs grade chunks by similarity to the query; if the headline isn't the answer, the chunk loses to a worse page that is.
2. **Atomic facts as first-class URLs.** "The mainnet kernel address is 0x048c…" deserves its own URL with a schema-tagged answer, citable from any LLM context. Not buried in `contract-reference.md#section-5`.
3. **Schema markup everywhere.** `TechArticle`, `APIReference`, `HowTo`, `FAQPage`, `SoftwareSourceCode` — JSON-LD blocks on every page. RAG and crawlers extract structured answers, not paragraphs.

### Q3 — Why does conventional docs structure exist? Does it serve us?

Standard Docusaurus/MkDocs/Sphinx shape is **Home → Getting Started → Concepts → Guides → API Reference**. This shape comes from the 2010s "developer relations" template (Stripe, Twilio, AWS, …). It assumes:

- One human reader, linearly funneling from curious → integrating
- Hand-maintained reference is OK because changes are infrequent
- Marketing fluff on homepage is OK
- Concepts and reference are conceptually separate

**Each assumption is now wrong**:

| Assumption | 2026 reality | Implication |
|---|---|---|
| One reader, linear funnel | Many readers, multiple entry surfaces | Multiple entry points on home, not one CTA |
| Hand-maintained reference | Codebase moves weekly; manual ref drifts | **Reference must auto-generate from source** |
| Fluff on homepage is OK | LLMs cite first paragraph; fluff = bad cite | Top of every page is a citable thesis |
| Concepts ≠ reference | LLM retrieval mixes them; users context-switch | Concept + reference are cross-linked, not separated by sidebar miles |
| English-only | Croatian/multilingual + agent translations | URL slugs must be schema-friendly, content modular |

### Q4 — Where does AGIRAILS.md sit in the IA?

Audit found AGIRAILS.md treated as "another config file" in docs. Per the canonical spec, **AGIRAILS.md IS the protocol** — 1242-line spec with embedded LLM onboarding block. It's not a docs page; it's a peer.

This means the docs structure should have **two roots**:

- `docs.agirails.io/protocol/` — points at canonical AGIRAILS.md, hosted from `agirails.app/protocol/AGIRAILS.md`. Docs explain it; the spec itself lives elsewhere as SOT.
- `docs.agirails.io/learn/` and friends — human + LLM onboarding paths, recipes, concepts that wrap the protocol.

### Q5 — What's the line between "docs" and "code"?

Audit's deep finding: 8 stale addresses, 6 fictitious CLI commands, ~30 SDK mismatches, all from **manual maintenance of facts**. The protocol layer (SDK + contracts) is the ground truth. Docs duplicate it. Drift is mathematically inevitable in a manually-maintained duplication.

**The rule**: hand-write the **WHY**, auto-extract the **WHAT**.

| Page type | Hand-written | Auto-extracted |
|---|---|---|
| Concept ("what is escrow") | All prose | Cross-linked to ref |
| Recipe ("how to make a payment") | Walkthrough | Code blocks pulled from runnable examples |
| Reference ("kernel.acceptQuote signature") | Description only | Signature + types from SDK source |
| Contract addresses | Page exists, prose around it | Table auto-rendered from `deployments/base-mainnet.json` |
| CLI surface | Per-command prose | Help text + signatures from `actp --help` |
| Error codes | Prose context | Code + message + recovery from errors module |
| Glossary | Prose | Cross-links resolved at build |

If a fact lives in source code, the docs page reads from source code. Build fails if source disappears (catches removed APIs); build regenerates if source changes (impossible to be stale).

---

## Part 2 — Proposed IA

### Top-level structure (the sidebar a reader sees)

```
docs.agirails.io
│
├── /                          [home — multi-entry hero, not a doc page]
│
├── /start                     [LEARN — narrative path, hand-written]
│   ├── /start                 (5-minute LLM onboarding — paste AGIRAILS.md to Claude)
│   ├── /start/manual          (full manual walkthrough for power users)
│   ├── /start/concepts        (overview)
│   └── /start/ai-environment  ["Get AGIRAILS into my AI tool" — channel matrix]
│       ├── /start/ai-environment              (overview matrix: pick by client)
│       ├── /start/ai-environment/claude-code  (Claude Code plugin — slash commands + skills + agents + hooks)
│       ├── /start/ai-environment/claude-skill (Anthropic Skills — claude.ai + Claude API)
│       ├── /start/ai-environment/mcp-server   (MCP protocol — Claude Desktop, Cursor, Cline, Windsurf, VS Code)
│       └── /start/ai-environment/openclaw     (ClawHub OpenClaw skill)
│
├── /protocol                  [PROTOCOL — canonical spec wrapper]
│   ├── /protocol              (what is ACTP, single page)
│   ├── /protocol/agirails-md  (AGIRAILS.md explained, link to canonical)
│   ├── /protocol/identity-file ({slug}.md schema, V4 parser surface)
│   ├── /protocol/state-machine (8 states, transitions, gas paths)
│   ├── /protocol/escrow       (vault, lifecycle, dispute bond)
│   ├── /protocol/fees         (1% + $0.05 floor, on-chain MIN_FEE)
│   ├── /protocol/quote-channel (AIP-2.1: offer / counter / accept)
│   ├── /protocol/identity     (ERC-8004 + AGIRAILS identity registry)
│   ├── /protocol/adapters     (Standard, Basic, X402 — routing rules)
│   ├── /protocol/web-receipts (EIP-712 ReceiptWrite + agirails.app)
│   └── /protocol/x402         (x402 v2 direct buyer→seller, mainnet zero-fee)
│
├── /recipes                   [RECIPES — task-oriented, both human + LLM]
│   ├── /recipes               (index, filterable by tag/difficulty)
│   ├── /recipes/provider-agent
│   ├── /recipes/consumer-agent
│   ├── /recipes/autonomous-agent
│   ├── /recipes/gasless-payment   ← uses wallet="auto"
│   ├── /recipes/per-call-api      ← x402 v2 (NOT escrow)
│   ├── /recipes/quote-negotiation ← AIP-2.1 actp serve
│   ├── /recipes/dispute-flow
│   ├── /recipes/receipts-and-discovery
│   ├── /recipes/keystore-and-deployment
│   ├── /recipes/n8n
│   ├── /recipes/langchain
│   ├── /recipes/crewai
│   └── /recipes/claude-code-plugin
│
├── /reference                 [REFERENCE — auto-extracted, schema-tagged]
│   ├── /reference                 (index — explains what's auto vs hand)
│   ├── /reference/cli             (auto from actp --help)
│   │   └── /reference/cli/{command}  (one URL per command — actp/pay, actp/serve, …)
│   ├── /reference/contracts       (table auto from deployments manifest)
│   │   ├── /reference/contracts/base-mainnet
│   │   └── /reference/contracts/base-sepolia
│   ├── /reference/sdk-js          (auto from dts-bundle / typedoc)
│   │   └── /reference/sdk-js/{namespace}
│   ├── /reference/sdk-python      (auto from inspect / sphinx-autodoc)
│   ├── /reference/mcp-server      (auto from MCP tool registry — 20 tools)
│   │   └── /reference/mcp-server/{tool}
│   ├── /reference/errors          (auto from errors module enum)
│   └── /reference/agirails-md-v4  (auto from parseAgirailsMdV4 type)
│
├── /architecture              [ARCHITECTURE — hand-written, deep dive]
│   ├── /architecture/why-on-chain
│   ├── /architecture/smart-wallet-gasless
│   ├── /architecture/security-model
│   ├── /architecture/walkaway-test  (how to rebuild without us)
│   └── /architecture/decisions      (AIP index)
│
├── /updates                   [WHAT SHIPPED WHEN — current changelog feed]
│
├── /faq                       [FAQ — schema FAQPage, one Q per atomic URL]
│   └── /faq/{question-slug}      (each Q is a citable answer)
│
└── /llms.txt + /llms-full.txt + /sitemap.xml + /robots.txt
                              [machine surface — auto-regenerated]
```

**What's gone vs current:**
- `Getting Started` (was conflated with marketing) → split into `/start` (narrative) and home (entry router).
- `Concepts/` (was hand-mixed with reference) → moved into `/protocol/` as wrappers around canonical AGIRAILS.md.
- `Guides/` vs `Cookbook/` (artificial split) → merged into `/recipes/` with tags.
- `Examples/` (one e2e script) → merged into `/recipes/`.
- `Developer Responsibilities` (current top-level doc) → split between `/protocol/security` and `/recipes/keystore`.
- `SDK Reference` (hand-maintained, 30+ mismatches) → `/reference/sdk-{js,python}/` auto-generated.
- `CLI Reference` (manual, 18 mismatches) → `/reference/cli/{command}/` auto-generated per command.
- `Contract Reference` (manual, 8 stale addresses) → `/reference/contracts/{network}/` auto from deployments.
- `Error Reference` (manual, phantom codes) → `/reference/errors/` auto from errors module.

**What's new vs current:**
- `/protocol/agirails-md` + `/protocol/identity-file` — the missing protocol layer.
- `/protocol/quote-channel` (AIP-2.1), `/protocol/web-receipts`, `/protocol/x402` (v2 direct) — currently missing.
- `/recipes/gasless-payment`, `/recipes/quote-negotiation`, `/recipes/receipts-and-discovery` — currently missing.
- `/start/ai-environment/*` — **first-class subtree for the four LLM distribution channels** (Claude Code plugin, Claude Skill, MCP server, OpenClaw). Currently scattered (one buried in `guides/integrations/`, three not in docs at all).
- `/reference/mcp-server/*` — auto-generated reference for the 20 MCP tools (5 discovery + 14 runtime + 1 protocol bootstrap). Currently no MCP docs anywhere on the site.
- `/architecture/walkaway-test` — Vitalik's "rebuild in days" principle made explicit.
- `/faq/` — every common LLM-grade question gets its own URL with schema markup.
- `/reference/cli/{command}/` granularity — one URL per `actp` subcommand. Each is a citable atom.

### Why `/start/ai-environment/` is a first-class subtree, not a recipe

The audit's biggest structural finding: AGIRAILS is purple-cow precisely because it's "no code, ask your LLM." Burying the LLM distribution channels three levels deep under `recipes/integrations/` denies the entire positioning. Two questions a fresh reader asks define this subtree:

| Q | A | Goes to |
|---|---|---|
| "How do I onboard an agent?" | "Tell your LLM to use AGIRAILS.md" | `/start` |
| "How do I make AGIRAILS available IN my LLM tool?" | "Pick your client below" | `/start/ai-environment` |

Both are "start" — different starting positions. The channel matrix lives at the same depth.

**Channel selection table** (will live on `/start/ai-environment` overview page):

| Your AI tool | Use this | Capability |
|---|---|---|
| Claude Code (CLI) | claude-code plugin | Slash commands (`/agirails:pay`, `/agirails:debug`, …) + skills + agents + hooks |
| Claude Desktop / Cursor / Cline / Windsurf / VS Code | MCP server | 20 tools (5 discovery + 14 runtime + 1 bootstrap) |
| claude.ai web / Claude API / general LLM with Skills | claude-skill | Knowledge package — LLM understands AGIRAILS |
| ClawHub OpenClaw | openclaw-skill | OpenClaw skill format equivalent |
| Any LLM via API (RAG/retrieval) | `/llms.txt` + `/llms-full.txt` | Site index for autonomous retrieval |
| Canonical onboarding spec (any LLM) | `/protocol/agirails-md` | The 1242-line spec, paste into any LLM |

### Per-page template (every page, every type)

Standard structure that all pages MUST follow:

```markdown
---
title: "Direct answer (the citable headline)"
description: "One-sentence answer (rendered into JSON-LD)"
schema_type: TechArticle | HowTo | APIReference | FAQPage | …
canonical_url: …
last_verified: 2026-05-24
verified_against: "@agirails/sdk@4.0.0 + agirails@3.0.1"
tags: [protocol, escrow, mainnet, …]
---

# [The thesis as H1 — same as title]

[**One-paragraph direct answer**. Cite-worthy. State conclusion before justification.]

[Optional: visual or table that conveys the answer at a glance.]

## How it works

[Mechanism / detail. ≤300 words ideal.]

## Code

[Tabs: TypeScript / Python, side by side. Pulled from `examples/` directory at build.]

## Common pitfalls

[FAQ-style sub-answers. Each Q has an id for deep-linking.]

## See also

[Cross-references — concept ↔ recipe ↔ reference linked liberally.]

<!-- JSON-LD embedded at end of body, build-time -->
```

**Key constraints**:
- Word count per page caps at ~1500. If longer, split. LLM chunks lose precision past that.
- Every concept page has a "Code" section (or explicit "no code, just concept" disclaimer). Mechanical bridge to reference.
- Every recipe has a "Why this approach" section linking back to the relevant concept page.

### Cross-linking model (the knowledge graph)

Pages don't live in a tree, they live in a graph. Sidebar is one slice; cross-links are the structure.

Required cross-link edges:
- Concept → reference (every concept names APIs that link to their auto-extracted ref page)
- Recipe → concept (every recipe links to the concepts it depends on)
- Recipe → reference (specific function names link to ref)
- Reference → concept (every API link backs to the concept that explains why it exists)
- Reference → recipe (every API link forward to recipes that use it)
- FAQ → all three (an answer cites concept + recipe + ref)

Build verification: a page that doesn't have inbound + outbound links to at least 2 other axes fails build (orphan check).

---

## Part 3 — Auto-extracted reference pipeline

The auto-extraction is what makes the new IA structurally drift-proof. Concrete plan:

### Source-of-truth registry

| Doc surface | Source | Tool |
|---|---|---|
| Contract addresses | `actp-kernel/deployments/{base-mainnet,base-sepolia}.json` | Custom render at build (Node script reads JSON → Markdown table) |
| Contract ABIs | `actp-kernel/abi/*.json` (Sourcify EXACT_MATCH) | Same render script; includes Sourcify + Basescan links |
| CLI commands | `python-sdk-v2/src/agirails/cli/main.py` + `sdk-js/src/cli/main.ts` | `actp --help` walk + Typer/Commander introspection → markdown per command |
| TS SDK API | `sdk-js/dist/*.d.ts` | `typedoc` or custom dts walker → markdown |
| Python SDK API | `python-sdk-v2/src/agirails/**/*.py` | `pdoc` or `sphinx-autodoc` (Markdown output mode) |
| Error codes | `python-sdk-v2/src/agirails/errors/*.py` + `sdk-js/src/errors/*.ts` | Custom script: walk error classes, emit page per code |
| AGIRAILS.md V4 schema | `sdk-js/src/config/agirailsmdV4.ts` (`AgirailsMdV4Config` type) | TypeScript AST walker → field-by-field table |

### Code-block sourcing

Every code block on every page should be either:
1. **Pulled from a runnable file** in `docs-site/examples/`, with a `<!-- pull: examples/path/to/file.ts#L10-L25 -->` marker. Build fails if the file or line range no longer exists.
2. **Inline literal**, marked `<!-- inline: ok -->`. Allowed only for trivial usage hints (≤5 lines).
3. **Generated** from API source (e.g. function signatures).

This means every "how to make a payment" code block in any doc is the SAME file under the hood, verified to run.

### Verification pipeline (Faza 4 gates, restated)

CI runs on every PR:

1. **Build all auto-extracted refs** — fails if SDK / chain source missing.
2. **Address sanity check** — every `0x[A-Fa-f0-9]{40}` in docs verified with `cast call <chain>` to claimed address; fail if dead or wrong code-hash.
3. **CLI signature diff** — running `actp --help` cross-referenced with `/reference/cli/*` content; fail on diff.
4. **Code-block runner** — extracted code blocks executed in sandbox (mock mode + ephemeral sepolia env); fail on runtime error or wrong output.
5. **Link checker** — internal + external; allow-list for stable third-party (Basescan).
6. **Orphan check** — every page has ≥2 inbound and ≥2 outbound links.
7. **Schema validator** — every page's JSON-LD valid against schema.org; required `last_verified` ≤ 30 days old or build warns.

---

## Part 4 — Migration map: current 49 pages → new tree

Per-file disposition. Audit severity in `[brackets]`.

### From root

| Current | → | Action |
|---|---|---|
| `docs/index.md` [P0] | → `/` | Replace homepage with multi-entry hero; old long-form moves to `/start/concepts`. |
| `docs/installation.md` [P0] | → `/start/manual` | Manual integrator path; LLM path becomes `/start`. |
| `docs/quick-start.md` [P0] | → `/start` | AGIRAILS.md-first onboarding flow. |
| `docs/agent-integration.md` [P0] | → `/recipes/provider-agent` + `/recipes/consumer-agent` | Split by intent. |
| `docs/developer-responsibilities.md` [P1] | → `/protocol/security` + `/recipes/keystore` | Split: protocol-side guarantees vs integrator-side responsibilities. |
| `docs/cli-reference.md` [P0] | → `/reference/cli/*` | Auto-extracted per command. Old page deleted. |
| `docs/contract-reference.md` [P0] | → `/reference/contracts/{network}` | Auto-extracted from deployments. Old page deleted. |
| `docs/error-reference.md` [P1] | → `/reference/errors/*` | Auto-extracted. One page per error code. |

### From `concepts/`

| Current | → | Action |
|---|---|---|
| `concepts/index.md` [P1] | → `/protocol` | Renamed, content updated for V4. |
| `concepts/actp-protocol.md` [P0] | → `/protocol/state-machine` + `/protocol/agirails-md` | Split: state-machine logic vs protocol-spec wrapper. |
| `concepts/adapter-routing.md` [P1] | → `/protocol/adapters` | Update for x402 v2 + Smart Wallet routing. |
| `concepts/agent-identity.md` [P0] | → `/protocol/identity` + new `/protocol/identity-file` | Split identity-concept vs identity-file-format. |
| `concepts/erc8004-identity.md` [P2] | → folded into `/protocol/identity` | Single canonical identity page. |
| `concepts/escrow-mechanism.md` [P1] | → `/protocol/escrow` | Update for AIP-14 dispute bonds. |
| `concepts/fee-model.md` [P0] | → `/protocol/fees` | Critical: MIN_FEE now on-chain. |
| `concepts/transaction-lifecycle.md` [P0] | → `/protocol/state-machine` (merged) | V3 21-field tx view; AIP-14; INV-30. |
| `concepts/x402-protocol.md` [P2] | → `/protocol/x402` | x402 v2 mainnet direct + sepolia relay. |

### From `guides/`

| Current | → | Action |
|---|---|---|
| `guides/index.md` [P1] | → `/recipes` index | Filterable by tag, difficulty, intent. |
| `guides/agirailsmd-config.md` [P0] | → DELETED | Replaced by `/protocol/agirails-md` + `/reference/agirails-md-v4`. The wrong-frontmatter page is dangerous; full rewrite necessary. |
| `guides/agents/provider-agent.md` [P0] | → `/recipes/provider-agent` | Rewrite with `wallet="auto"`, AGIRAILS.md-first. |
| `guides/agents/consumer-agent.md` [P0] | → `/recipes/consumer-agent` | Same. |
| `guides/agents/autonomous-agent.md` [P0] | → `/recipes/autonomous-agent` | Same. |
| `guides/integrations/claude-plugin.md` [P1] | → `/start/ai-environment/claude-code` | Move from recipe-buried position to first-class start subtree; rewrite for current plugin surface (8 slash commands + skills + agents). |
| `guides/integrations/crewai.md` [P0] | → `/recipes/crewai` | Fix unparseable code; switch to async Python; verify methods exist. |
| `guides/integrations/langchain.md` [P0] | → `/recipes/langchain` | Remove non-existent methods; verify against current SDK. |
| `guides/integrations/n8n.md` [P0] | → `/recipes/n8n` | Update addresses; bump versions. |
| `guides/integrations/openclaw.md` [P0] | → `/start/ai-environment/openclaw` | Move from recipes to first-class start subtree; update addresses; clarify it's the ClawHub distribution of an AGIRAILS skill (sibling to claude-skill, not a generic LLM skill). |

### From `cookbook/`

| Current | → | Action |
|---|---|---|
| `cookbook/index.md` [P1] | → folded into `/recipes` | Merge index. |
| `cookbook/api-pay-per-call.md` [P0] | → `/recipes/per-call-api` | Rewrite as x402 v2 (NOT escrow — current docs recommend wrong tool). |
| `cookbook/automated-provider-agent.md` [P0] | → folded into `/recipes/provider-agent` (advanced section) | Merge with provider recipe. |
| `cookbook/multi-agent-budget.md` [P1] | → `/recipes/multi-agent-budget` | Update for current API. |
| `cookbook/n8n-workflow.md` [P0] | → folded into `/recipes/n8n` | One canonical n8n page. |
| `cookbook/secure-key-management.md` [P0] | → `/recipes/keystore-and-deployment` | Add AIP-13 (current docs have 0 mentions). |

### From `examples/`

| Current | → | Action |
|---|---|---|
| `examples/index.md` [P1] | → DELETED | "Examples" was vestigial; recipes serve this. |
| `examples/e2e-single-script.md` [P1] | → `/recipes/e2e-quickstart` | Move into recipes; verify end-to-end. |

### From `sdk-reference/`

ALL pages → `/reference/sdk-{js,python}/*` auto-extracted. Hand-maintained sdk-reference is the largest single source of drift in the audit (30+ mismatches). Auto-extraction removes the failure mode entirely.

### From `updates/`

Unchanged structure — `updates/` is already well-shaped, just needs the docs hero to surface the latest 3 updates inline. Per CHANGELOG-vs-updates concern: keep `updates/` as PRODUCT/EVENT narrative; auto-aggregate per-SDK CHANGELOG technical detail INTO each updates post via a build-time include.

### New pages (zero today)

**Protocol layer:**
- `/protocol/agirails-md` — canonical 1242-line spec explained, links to AGIRAILS.md SOT
- `/protocol/identity-file` — `{slug}.md` schema, V4 parser surface
- `/protocol/quote-channel` (AIP-2.1)
- `/protocol/web-receipts`
- `/protocol/x402` (v2 direct buyer→seller, mainnet zero-fee)

**Onboarding paths:**
- `/start` — LLM onboarding hero ("ask your AI to onboard you")
- `/start/ai-environment` — channel matrix overview
- `/start/ai-environment/claude-skill` — Anthropic Skills format setup (currently zero docs)
- `/start/ai-environment/mcp-server` — MCP server install + capability overview (currently zero docs)

**Recipes:**
- `/recipes/gasless-payment` (`wallet="auto"`)
- `/recipes/quote-negotiation` (`actp serve`)
- `/recipes/receipts-and-discovery`

**Reference (auto-generated):**
- `/reference/mcp-server/*` — 20 tools, one URL per tool (currently zero MCP docs anywhere)
- `/reference/agirails-md-v4` — V4 frontmatter schema from `parseAgirailsMdV4` type
- `/reference/cli/{command}` — 11 new commands currently undocumented (`serve`, `request`, `verify`, `claim-code`, `repair`, `find`, `negotiate`, `register`, `claim`, `autopublish`, `health`)

**Architecture:**
- `/architecture/walkaway-test` — Vitalik's "rebuild in days" principle made explicit
- `/architecture/decisions` — AIP index

**Discoverability:**
- `/faq/*` — one URL per common Q with FAQPage schema

---

## Part 5 — Homepage rethink ("purple cow")

Current homepage = "What is AGIRAILS?" headline + paragraph + buttons.

Proposed: **three concurrent entry points + a runnable hero**.

```
┌─────────────────────────────────────────────────────────────┐
│  AGIRAILS                                                    │
│  Payment rails for AI agents.                                │
│                                                              │
│  ┌─ Try it ─────────┐  ┌─ Build it ──────┐  ┌─ Verify it ─┐ │
│  │  [Embedded chat]  │  │ Recipe library  │  │ Contract    │ │
│  │  "Onboard me as   │  │ → provider      │  │ explorer    │ │
│  │   an agent" →     │  │ → consumer      │  │ → Basescan  │ │
│  │  [Live LLM Q&A]   │  │ → integration   │  │ → Sourcify  │ │
│  └───────────────────┘  └─────────────────┘  └─────────────┘ │
│                                                              │
│  3 recent updates · CHANGELOG · GitHub · Discord            │
└─────────────────────────────────────────────────────────────┘
```

The "Try it" panel is the **wow**. An embedded chat (e.g. claude.ai widget pre-prompted with canonical AGIRAILS.md, or a custom widget hitting our agirails.app/api). User says "onboard me" and the LLM walks them through the onboarding Q&A live, on the homepage. **No install required to see it work.**

This is the AGIRAILS.md model made physical. It is the differentiator that no other "payment rails" docs have.

Tactically: this panel is Wave E (purple cow), not Wave A. But Wave A homepage MUST be designed with the three-panel skeleton so we can drop the embedded chat in later without redesign.

---

## Part 6 — Open decisions for Damir

Before Wave A starts, three decisions need to be locked. None of them I can decide alone — they're product/positioning calls.

### D1 — How aggressive is the homepage rewrite for Wave A?

| Option | Effort | Wow |
|---|---|---|
| **A1** Three-panel skeleton, no embedded chat yet (placeholder card) | 1 day | 3/10 |
| **A2** Three-panel + embedded claude.ai widget pre-prompted (no custom code) | 2 days | 7/10 |
| **A3** Three-panel + custom agirails.app/onboarding widget served from docs domain | 4-5 days | 10/10 (full purple cow) |

Recommendation: **A1 for Wave A, A3 for Wave E**. Don't block Wave A on widget engineering; design the slot.

### D2 — Auto-extraction tooling: build now or after Wave C?

| Option | Risk |
|---|---|
| **B1** Build auto-extraction in Wave A, ALL reference pages stay placeholder until tools ready | High up-front cost, but Wave D becomes trivial |
| **B2** Hand-write reference in Wave D, build auto-extraction afterward as separate stream | Faster to ship; risk = reference drifts immediately after publish |
| **B3** Hybrid — auto-extract contract addresses + CLI in Wave 0; hand-write SDK reference in Wave D; build SDK auto-extract in parallel for Wave D+1 | Pragmatic; lowest delivery risk |

Recommendation: **B3**. Addresses + CLI are the audit's worst surfaces and easiest to auto-extract (single JSON/--help walk). Defer SDK auto-extract — it's harder (Typedoc + pdoc tooling) and SDK ref drifts slowest.

### D3 — Multilingual / Croatian docs scope?

Not raised explicitly in Damir's prompt, but worth flagging given the team's bilingual context and the "purple cow" framing. If yes, structural choice is whether to:

| Option | Approach |
|---|---|
| **C1** English-only docs, Croatian community posts/blog separate | Conventional |
| **C2** English docs with Croatian translation of `/start` + `/protocol` only (recipes/ref English) | Strategic |
| **C3** Full multilingual — Docusaurus i18n with translation memory | Heavy |

Recommendation: **defer this decision**, but make Wave A page templates i18n-compatible (front-matter has `locale` field, URL slugs are language-neutral). Don't paint into a corner.

---

## Part 7 — Sequencing summary

If all three decisions go (A1, B3, C-defer), the wave plan is:

| Wave | What | Effort | Gates before next wave |
|---|---|---|---|
| **0 — Address sweep** | Replace 8 stale addresses across current docs in current IA, even though we'll delete those pages later. Reason: docs.agirails.io is LIVE; we can't leave wrong addresses public for the days the rewrite takes. | 2-4h | Address scan passes (Faza 4 gate #3) |
| **A — Hero funnel + IA scaffold** | New homepage + `/start` + `/protocol/agirails-md` + `/protocol/identity-file` + `/reference/contracts/*` (auto-extract). Sidebar rewired. Old pages still exist behind feature flag. | 8-12h | Fresh-eyes pass on `/start` (Faza 4 gate #6) |
| **B — Protocol layer** | All `/protocol/*` pages, hand-written. Cross-link concept ↔ ref. | 12-16h | Schema validation (Faza 4 gate #7); orphan check |
| **C — Recipes** | All `/recipes/*` pages. Code blocks pulled from runnable `examples/`. | 16-24h | Code-block runner (Faza 4 gate #4) |
| **D — Reference** | `/reference/cli/*` auto-extracted (mechanical). `/reference/sdk-{js,python}/*` hand-written for v1, auto-extract tool built in parallel. `/reference/errors/*` auto-extracted. | 12-16h | CLI signature diff (Faza 4 gate #3); SDK API surface diff |
| **E — Purple cow** | Visual diagrams, embedded onboarding widget, narrative polish, "Iva test" passes | 12-20h, parallel to D | Iva test (qualitative gate) |

**Total: ~62-92h of focused work + 12-20h purple cow stream.** ~2 weeks of focused effort if dedicated; 3-4 weeks if part-time.

---

## Part 8 — What this proposal explicitly rejects

- **"Add llms.txt and move on"** — already exists, already stale. Symptomatic fix.
- **"Just fix the addresses"** — fixes one drift class, ignores the structural cause.
- **"Keep current IA, do surgical update"** — concept/reference mix means continuous drift; new IA enables auto-extraction.
- **"Write a single canonical doc that's the SOT"** — that's what AGIRAILS.md is; docs is the wrapper that makes humans + LLMs discover and use it.
- **"More marketing fluff on homepage"** — fluff is bad LLM cite; first paragraph must be the answer.
- **"Translate everything to Croatian"** — deferred decision; build templates i18n-ready, don't paint into a corner.

---

## Decision request

Damir to confirm or amend:
1. **IA shape (Part 2 sidebar tree)** — accept / modify
2. **Auto-extracted vs hand-written line (Part 1 Q5)** — accept / modify
3. **D1 / D2 / D3** — pick options
4. **Wave 0 first action: address sweep against CURRENT IA** — accept / defer

Once these are decided, Wave 0 starts immediately and Wave A scaffolding can be staged.
