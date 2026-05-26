# Final Execution Plan — docs.agirails.io rewrite

**Status**: v2 — corrected after Codex external review
**Date**: 2026-05-26 (initial), 2026-05-26 (v2 after Codex)
**Supersedes**: IA_PROPOSAL.md (which informs this; preserved as design artifact)
**Reasoning archive**: see [`DEEP_REVIEW.md`](./DEEP_REVIEW.md)
**External review**: see [`CODEX_REVIEW.md`](./CODEX_REVIEW.md) — five corrections integrated into v2

---

## Frame

Two facts from Damir reshape the calculus:

1. **Zero current human support volume** — no humans complaining. **But machine surfaces ARE being ingested NOW** (this is Codex's correction): `static/llms-full.txt` currently exposes the V2 mainnet kernel at line 214; LLM crawlers index continuously and cite later. Human-bleeding = zero, **machine-bleeding ≠ zero**. Frame is BOTH: stop the machine bleed *and* set the right impression before distribution arrives.
2. **Brain framing rejected** — agirails.app already does live agent directory + transactions. Docs ≠ Brain. Docs are the developer/AI cognition layer.

**LLM crawlers index continuously. What they see now, they cite later.** That's the GEO bet — and the reason for the Day -1 quarantine step below.

---

## Strategy: branch-and-flip in 3 weeks

Branch `redesign-v4`, build clean offline, flip once, set 301 redirects. Zero current readers = no parallel-shipping cost. LLMs index only the final state.

| Wave-by-wave (rejected) | Branch-and-flip (chosen) |
|---|---|
| Visible progress | Single quality gate |
| Mixed-quality middle period | One clean state |
| LLM crawls partial states | LLM crawls only the final state |
| Iva retrofits voice | Iva writes consistent voice once |
| Redirect strategy is gradual | Single 301 sweep at flip |

---

## SEO/GEO architectural commitments (foundation, not polish)

Twelve commitments baked into Phase 1 page templates, BEFORE any content is written. These are the GEO multipliers — each compounds with the others.

1. **One thesis per page, top-loaded.** First paragraph IS the citable answer. No throat-clearing. LLMs grade chunks by similarity; if headline isn't answer, we lose cite to weaker page that gets it right.

2. **JSON-LD schema.org on every page** — auto-generated from frontmatter `schema_type`:
   - `TechArticle` (concepts)
   - `APIReference` (reference pages)
   - `HowTo` (recipes)
   - `FAQPage` (FAQ — first-class GEO target)
   - `SoftwareSourceCode` (code-heavy)
   - `DefinedTerm` (glossary)
   - Always `dateModified` + `dateVerified`

3. **AI crawler allowlist** — `robots.txt` explicitly allows GPTBot, ClaudeBot, Google-Extended, PerplexityBot, CCBot. Most sites block these by default; we invert.

4. **`llms.txt` + `llms-full.txt` build-regenerated** — not hand-maintained (current versions are stale). Build pipeline regen from primary source pages.

5. **OpenGraph + Twitter cards per-page** — auto-generated thumbnails via Vercel OG-image API. Every cite on X/LinkedIn/Slack gets a real preview.

6. **Sitemap.xml with priority hints** — hero 1.0, protocol 0.9, recipes 0.7, reference 0.5. `lastmod` auto from git.

7. **One canonical URL per fact.** Granular slugs like `/reference/contracts/base-mainnet#actp-kernel` for atomic citing. Facts never duplicated; cross-references link.

8. **Internal linking density floor** — every page ≥2 outbound + ≥2 inbound. Build-gate on orphan check. LLM knowledge graph emerges from structure.

9. **FAQ as first-class** — `/faq/{question-slug}`, one URL per Q with `FAQPage` schema. Direct RAG target. Seed with: (a) anticipated first-time confusion, (b) Discord questions as they arrive, (c) LLM-asked-about-us questions.

10. **Code blocks language-tagged + intent-labeled**:
    ````markdown
    ```python
    # Provider agent: register a code-review service for 10 USDC
    ```
    ````
    Tagging + intent comments help code-gen LLMs pull relevant examples.

11. **Stable semantic slugs, no version-bound URLs** — `/protocol/quote-channel` not `/v4/protocol/quote-channel`. Versioning via Docusaurus sub-path (`/v3/`, `/v4/`) for older content; default is current. URLs LLMs see now stay stable through v5.

12. **Cross-cite the canonical AGIRAILS.md** — every protocol page links to specific line ranges of `Platform/agirails.app/web/public/protocol/AGIRAILS.md` on GitHub raw. Gives LLMs explicit "this page is about THAT part of the spec" signal.

---

## Roadmap

### Day -1 — Machine-surface quarantine — ✅ COMPLETED 2026-05-26

Pushed as commit `5ea8f0df` on docs-site `main`. Machine-bleed Codex flagged is stopped.

What landed:
- ✅ **8-address sweep** (V2 mainnet kernel/vault/registry/archive + pre-V4 sepolia equivalents) → V3/V4 across 12 doc files via `sed`. `lint-addresses.sh` passes; V2 addresses verified absent.
- ✅ **`static/robots.txt`** created with explicit AI-crawler allowlist: GPTBot, ClaudeBot, anthropic-ai, Google-Extended, PerplexityBot, CCBot, Bytespider, Applebot, Applebot-Extended. Sitemap reference + llms.txt/llms-full.txt references included.
- ✅ **`static/llms-full.txt`** regenerated via `npx tsx scripts/generate-llms-full.ts` — 49 files, 78380 words, 0 V2 occurrences, 27 V3/V4 occurrences, 2 stub-banner occurrences. Vercel rebuild auto-deploys.
- ✅ **Stub banners** on 3 most-broken pages: `guides/agirailsmd-config.md`, `guides/integrations/crewai.md`, `cookbook/api-pay-per-call.md`. Each banner names current SDK versions + points at GitHub CHANGELOGs + canonical AGIRAILS.md. Renders as `:::danger` admonition.
- ✅ **`.audit/` planning artifacts** force-committed (gitignore `*_PLAN*.md` pattern matched FINAL_PLAN.md; bypassed for walk-away test).
- ✅ **sitemap.xml** verified (Docusaurus generates at build, no custom step needed).

Time spent: ~1.5h. Estimate was 2-3h.

### Pre-Week — Decisions & branch setup (1-2 days elapsed time)

- **D1-D5 lock-in** (see below)
- **Iva brief** — voice/positioning session (2h), draft hero copy for `/start` + `/`
- **Branch setup** — `redesign-v4` from main; deploy preview on `redesign.docs.agirails.io` (or Vercel preview URL)
- **Truth-ledger spike** (NEW per Codex review) — see `TRUTH_LEDGER_DESIGN.md` once feature-dev finishes Phase 4. The truth ledger is the **first deliverable**; all content waits for it. Manual audit produced false negatives (`actp time` mismarked as non-existent though it ships at `main.py:146`). Truth ledger replaces human-audit-grade approximation with source-of-truth extraction.

### Week 1 — Foundations (~24h)

- IA shell — new sidebar tree committed; all pages stubbed with frontmatter (`schema_type`, `last_verified`, `tags`)
- Page templates with auto JSON-LD generation, OG image, schema validation
- SEO infrastructure — `robots.txt`, `sitemap.xml` generator, `llms.txt` regen pipeline, build-time linkcheck
- Hero copy (Iva pairs) — homepage three-entry, `/start` narrative voice, `/start/ai-environment` overview matrix
- Auto-extract contracts — `/reference/contracts/base-mainnet` + `base-sepolia` from `actp-kernel/deployments/*.json`

### Week 2 — Protocol + AI Distribution + Reference scaffold (~28h)

- **`/protocol/*`** full set (10 pages): state-machine, escrow, fees, quote-channel (AIP-2.1), web-receipts, x402, identity, adapters, agirails-md, identity-file
- **`/start/ai-environment/*`** — channel matrix overview + 4 channel pages (claude-code, claude-skill, mcp-server, openclaw)
- **`/reference/cli/*`** auto-extracted from `actp --help` walk, one URL per command
- **`/reference/mcp-server/*`** auto-extracted from MCP tool registry
- Cross-linking pass — concept ↔ recipe ↔ reference edges

### Week 3 — Recipes + Polish + Flip (~24h)

- **`/recipes/*`** top 8: provider-agent, consumer-agent, gasless-payment, quote-negotiation, per-call-api (x402), n8n, langchain, keystore-and-deployment
- Code blocks pulled from runnable `examples/*` directory (build fails if source file missing)
- `/faq/` seed with 15 anticipated questions
- `/security/` — disclosure path + audit archive (Apex 2026-05-17) + bug-bounty stub
- `/architecture/operate/` — walk-away runbook
- `/reference/sdk-{js,python}/*` — hybrid: hand-written for v1, full auto-extract tool deferred post-flip
- `/reference/errors/*` — auto-extracted from errors module
- **Final QA gates**:
  - Linkcheck (build gate)
  - Schema validation (build gate)
  - **Manual GEO test**: ask Claude / ChatGPT / Perplexity 20 anticipated questions, see what they cite, fix gaps
  - Lighthouse a11y + perf
  - Mobile responsive check
- **Flip day** — PR `redesign-v4` → main; deploy; regen llms.txt + sitemap; set 301 redirects from old URLs; verify in production; manual LLM citation re-test

**Total: 72-80h focused + 6-10h Iva voice work.**

---

## Decisions to lock in (5 — revised after Codex review)

| ID | Question | Default (v2) | Codex correction |
|---|---|---|---|
| **D1** | Branch-and-flip vs wave-by-wave? | **Branch-and-flip** + **Day -1 machine-surface quarantine** | "zero bleeding" wrong for LLM crawlers; machine surfaces fixed Day -1 separately from human-facing flip |
| **D2** | Iva involved Week 1? | **Yes**, 6-10h on hero voice + start narrative | unchanged |
| **D3** | Auto-extract scope in v1: contracts + CLI + MCP? | **Yes** — and **truth-ledger spike is FIRST deliverable**, before content | manual audit false negatives (`actp time` mismarked) prove source-of-truth extraction must precede content writing; see TRUTH_LEDGER_DESIGN.md |
| **D4** | Docusaurus versioning enabled at flip? | **Structure prepared, NOT publicly exposed** until backfill done | "versioning theater" risk if v3/v4 paths show empty; defer the public toggle |
| **D5** | `/security` + `/architecture/operate` in scope? | **Yes, but split public/private** | public `/security` (audit, disclosure, threat model, verified contracts, on-chain invariants); operate runbook with signer slots, key handling, domain config stays internal (`.internal/operate-runbook.md` in private repo) |

**New constraint from Codex (applies across all D's)**: docs must NOT document "everything that exists" — they document the **shortest path to a successful, safe transaction**, then reference. Hierarchy:
- **Level 0 onboarding** (your first agent) — `/start`
- **Level 1 recipes** (common tasks) — `/recipes`
- **Advanced reference** (everything else) — `/reference`, `/protocol`
- **Internal** (not in public docs) — operate runbook

**Three-AGIRAILS.md disambiguation must be brutally explicit** on every page that touches it:
1. **canonical AGIRAILS.md** — protocol spec at `agirails.app/protocol/AGIRAILS.md`, immutable per version
2. **owner-local AGIRAILS.md** — per-agent template-filled output kept locally
3. **public `{slug}.md`** identity file — V4 parser format, registered on-chain via `actp publish`

If this trichotomy is unclear, the entire mental model drifts again.

**JSON-LD reframe**: treated as **LLM/understanding signal**, NOT guaranteed SEO uplift. Google rich-result support is a narrow subset; we use schema.org for RAG retrieval quality, not Search Console rich cards.

All defaults are recommendations. Damir says only where to override.

---

## Out of scope (explicitly)

What was considered in DEEP_REVIEW.md and rejected for v1:

- **Brain framing** (`/network`, `/agents`, live state) — overlap with agirails.app
- **Community + bounty mechanic** — premature pre-distribution; add post-MVP when audience exists
- **Multilingual** — defer (templates i18n-ready, no translation v1)
- **"Stop the Bleeding" Day 0** — no bleeding
- **Wave-by-wave incremental** — superseded by branch-and-flip given zero traffic
- **Live network state on docs** — agirails.app owns that surface
- **`/community/contribute` bounty payouts in USDC** — interesting, on-brand, but premature

---

## What this wins

- **GEO** — docs.agirails.io becomes first-class structured-data source for AI agent payments. When devs ask LLMs "how do I build an AI agent that earns USDC", we get cited before competitors exist.
- **Onboarding wow** — first LLM-native onboarding flow ("tell Claude: 'use AGIRAILS.md, onboard me'" — 5 min, no code).
- **Walk-away resistance** — auto-extracted reference + documented operate runbook + Justin/Iva in process = bus factor >1.
- **Drift-proof structure** — facts in code, prose in docs. Next SDK release = `npm run build` regenerates; no doc PR.
- **Citation chain stability** — stable semantic slugs + canonical-fact-per-URL means LLM cites built now survive v5, v6.

---

## Next concrete action

Damir locks D1-D5 (or amends). I start pre-week activities (branch setup + Iva brief + auto-extract spike) immediately on green light.
