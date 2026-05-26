# Codex external review — integrated corrections

**Status**: reasoning archive; corrections rolled into FINAL_PLAN v2
**Date**: 2026-05-26
**Source**: Damir's relay of Codex's spot-check against docs-site + SDKs + Python CLI + contracts + canonical spec
**Overall grade given**: 8/10 with two material corrections required before green light

## Verified facts (we spot-checked Codex's spot-check)

Two specific claims fact-checked directly against source:

1. **`actp time` exists.** Codex: "audit tvrdi da `actp time` ne postoji, ali Python CLI ga registrira u main.py (line 146)."
   - Verified: `python-sdk-v2/src/agirails/cli/main.py:146` has `app.add_typer(time_cmd.time_app, name="time")`
   - Subcommands `show`, `advance`, `set` at `commands/time.py:45/96/167`
   - **Agent C audit gave a false negative.** This is the strongest evidence that human audit ≠ execution-grade SOT.

2. **`static/llms-full.txt` still exposes V2 mainnet kernel.** Codex: "line 214 izlaže stare kernel adrese, baš površina za LLM ingest."
   - Verified at lines 213-218: V2 mainnet kernel `0x132B9eB321dBB57c828B083844287171BDC92d29`, V2 vault `0x6aAF45…`, V2 registry `0x6fB222CF…`, V2 archive `0x0516C411…` all still rendered
   - LLM crawlers ingest this surface continuously — "zero bleeding" frame was wrong for machine readers

## Five corrections accepted

### C1 — "Zero bleeding" is wrong for machine surfaces

**Original frame**: zero human support volume → no time pressure → branch-and-flip at leisure.
**Codex correction**: LLM crawlers index continuously. Whatever they see now, they cite later. `static/llms-full.txt` line 214 is actively poisoning the LLM index right now.
**Integrated as**: Day -1 machine-surface quarantine before branch-and-flip work. Single direct commit fixing `static/llms-full.txt`, `static/llms.txt`, `docs/contract-reference.md` (the 8 addresses), `robots.txt`, `sitemap.xml`. Not part of branch-and-flip — small targeted fix to stop the machine bleed.

### C2 — Audit is not execution-grade SOT

**Original assumption**: Agent A/B/C findings are sufficient input for content rewrite.
**Codex correction**: at least one false negative confirmed (`actp time`). Without source-of-truth extraction, we'll rewrite content based on partial human audit and re-introduce drift from the start.
**Integrated as**: truth-ledger spike is FIRST pre-week deliverable. No content writing begins until ledger output is checked in. Auto-extracted facts replace human-audit-grade approximations.

### C3 — D4 (Docusaurus versioning) — public exposure deferred

**Original recommendation**: enable Docusaurus versioning at flip; no v3 backfill.
**Codex correction**: enabling versioning publicly without backfill is "versioning theater" — v3/v4 paths exist but show empty/stale content. Hurts trust.
**Integrated as**: prepare versioning structure (frontmatter, URL slugs version-neutral, capability ready); do NOT expose v3/v4 in nav publicly until backfill done. Default URLs are unversioned (current); versioning toggle becomes a post-flip iteration once we have v5-vs-v4 to compare.

### C4 — D5 (security + operate) — split public/private

**Original recommendation**: `/security` + `/architecture/operate` both in v1 scope.
**Codex correction**: operate runbook with admin Safe signer slots, key handling, domain transition config, infrastructure passwords — NOT for public docs.
**Integrated as**:
- **Public**: `/security` page with audit history, disclosure path, threat model, on-chain enforced invariants, Sourcify verification, testing depth
- **Private**: `.internal/operate-runbook.md` (or in a separate private repo accessible to AGIRAILS team only) — domain transfer, Safe signer details, key recovery procedures
- Both serve the walk-away test, but to different audiences: public satisfies "trustless verifiability"; private satisfies "actually rebuild operations in 3 days"

### C5 — Hierarchy: shortest-path-first, not document-everything

**Original tendency**: my IA proposal had a "document every exported thing" lean (a sin of completeness).
**Codex correction**: docs should document the **shortest path to a successful, safe transaction**, then reference. Internal / advanced / obscure surfaces should be de-emphasized.
**Integrated as**: explicit hierarchy in IA navigation:
- **Level 0 onboarding** (`/start`) — the LLM-onboarded happy path. 5 minutes to first agent.
- **Level 1 recipes** (`/recipes`) — common tasks, 8 hand-picked.
- **Advanced reference** (`/reference`, `/protocol`) — comprehensive but secondary navigation tier.
- **Internal** — never in public docs.

## One pivot from Codex (already accepted in v1)

Codex emphasized the **three-AGIRAILS.md disambiguation** must be brutally explicit. We already had this in IA_PROPOSAL but it was easy to lose. Re-stated as a v2 constraint:

1. **canonical AGIRAILS.md** — protocol spec at `agirails.app/protocol/AGIRAILS.md`, immutable per version
2. **owner-local AGIRAILS.md** — per-agent template-filled, kept locally
3. **public `{slug}.md`** — V4 identity file, registered on-chain

Every page touching this must use the **distinguishing modifier** (canonical / owner / identity) — never bare "AGIRAILS.md" unless context makes it unambiguous.

## One reframe Codex provided (now central to v2)

**JSON-LD ≠ guaranteed SEO uplift.** Google rich-result support is a narrow subset of schema.org. The win from JSON-LD is **LLM/RAG retrieval quality**, not Search Console rich cards. Frame it as understanding signal, not SEO bet. (Reference: Google Search docs on supported structured data — many schema.org types are accepted but not surfaced as rich results.)

This shifts the GEO commitment from "for traffic ranking" to "for LLM citation quality." Both matter, different mechanisms.

## What this changes operationally

| Area | v1 | v2 (post-Codex) |
|---|---|---|
| First action | Pre-week setup | **Day -1 quarantine** then pre-week setup |
| First deliverable in pre-week | Branch + Iva brief + auto-extract spike | Branch + Iva brief + **truth-ledger spike (gates content)** |
| Versioning enabled at flip | Yes, public toggle | Structure ready, public toggle deferred |
| `/architecture/operate` in v1 scope | One page in public docs | **Split**: public `/security` v1, private `.internal/operate-runbook.md` separate |
| IA navigation hierarchy | Concept/Recipe/Reference flat | **Level 0 → 1 → Advanced → Internal** explicit tier |
| AGIRAILS.md references in copy | "AGIRAILS.md" | always **canonical / owner / identity** modifier |
| JSON-LD framing | "GEO uplift" | "LLM understanding signal" |

Net effect: same destination, sharper execution model, fewer hidden assumptions.

## What we did NOT accept from Codex

Nothing — all five corrections plus the two clarifications (3-AGIRAILS distinction, JSON-LD reframe) are integrated as written. Codex's review is the highest-leverage external input we've gotten on this plan.
