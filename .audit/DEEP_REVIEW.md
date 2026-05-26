# Deep first-principles review of the IA proposal

**Status**: reasoning archive — supports [`FINAL_PLAN.md`](./FINAL_PLAN.md)
**Date**: 2026-05-26
**Triggered by**: Damir's `/ultra-think` request — "deep dive sa first principles da provjerimo jesmo li sve najpametnije isplanirali ili nam je nešto promaklo"

This file captures the 13 blind spots surfaced in deep review and the four solution options weighed before landing on the FINAL_PLAN. Preserved so future maintainers can see *why* the chosen plan, not just *what* it is.

---

## Premise challenges considered (and rejected)

### Premise A — Delete most of docs

What if AGIRAILS.md is the SOT, and docs.agirails.io is a thin marketing shell + redirects? Eth-wiki, Bitcoin BIPs model.

**Rejected**: specs are a different shape than docs. No room for recipes, narrative, "what is this in 30 seconds". Auditors and integrators need both.

### Premise B — Render canonical AGIRAILS.md AS docs

The 1242-line spec rendered with each H2 as a page. Spec IS the docs.

**Rejected**: spec is hostile to "just learning what this is". Hard split better — docs are narrative wrapper, AGIRAILS.md is the precision SOT they reference.

### Premise C — Build the AGIRAILS Brain

Single domain: spec + recipes + reference + live network state + agent directory + community + bounty. Massively differentiating.

**Rejected by Damir**: overlaps with agirails.app product surface. agirails.app owns live state; docs owns developer/AI cognition layer.

---

## 13 blind spots surfaced

### 1. `/security` is missing entirely
A protocol handling escrow USDC has no vulnerability disclosure path, no audit archive (Apex 2026-05-17 not in docs), no bug bounty page. For money-handling system, **the** miss.
→ **Addressed**: `/security` top-level in FINAL_PLAN.

### 2. Walk-away test is one page, not infrastructure
CLAUDE.md says "rebuild in days". My original plan had `/architecture/walkaway-test` — gesture, not passing test. Actually needs: build pipeline doc, auto-extraction tooling doc, deployment config, domain ownership transition, contract upgrade keys documented (per memory: 4th Safe signer slot is undocumented).
→ **Addressed**: `/architecture/operate/` runbook in FINAL_PLAN Week 3.

### 3. No community / contribution paths
Docs were planned as one-vendor production. No "edit this page", no contributor surface, no path for users to fix their own pain. And we have a payment protocol made for paying contributors.
→ **Deferred**: premature pre-distribution. Add post-MVP when audience exists. Dogfooding via USDC bounty for doc PRs is the long-term play.

### 4. Versioning policy not addressed
SDK 2.0 → 3.0 → 4.0 in 6 months. Each major is breaking. Without Docusaurus versioning, next breaking release loses old docs again.
→ **Addressed**: D4 — enable Docusaurus versioning at flip; no v3 backfill but lock the path.

### 5. Release coordination is workflow, not page
Docs drift because shipping the SDK doesn't trigger doc updates. No process change = drift returns in 3 months.
→ **Addressed (partial)**: Phase 4 includes PR templates + release checklist; full automation is post-MVP stream.

### 6. Auto-extraction has real risks I waved away
Tooling rot, generated UX quality, bus factor, chicken-and-egg, build complexity.
→ **Addressed**: D3 — scope auto-extract to contracts + CLI + MCP only for v1 (lowest tooling risk); SDK ref hand-written v1; auto-extract SDK tool as separate stream post-flip.

### 7. Accessibility and mobile not addressed
Zero a11y plan. No mobile-first responsive plan.
→ **Addressed**: Phase 4 QA includes Lighthouse a11y, mobile responsive check, WCAG floor.

### 8. Multilingual scope was casually deferred
30+ languages on Stripe; bilingual founders; "global agent economy" framing implies global docs.
→ **Reaffirmed defer**: templates i18n-ready (frontmatter `locale`, slug-neutral URLs) but no translation work v1. Post-MVP top 5 languages targeting `/start`, `/reference/cli`, `/faq` only.

### 9. Iva's involvement was gated to Wave E (polish)
Wrong. Iva's voice/narrative IS the differentiator from "yet-another-SDK-docs". Pushing her to polish phase means we ship in my technical voice and retrofit personality later.
→ **Addressed**: D2 — Iva pairs Week 1 on hero copy + `/start` narrative.

### 10. "AGIRAILS Brain" alternative framing
Bigger reframing: docs.agirails.io as live-protocol-as-docs (registry queries, agent directory, network state, bounty system).
→ **Rejected by Damir** — overlaps with agirails.app. Clean separation: agirails.app = product, docs.agirails.io = cognition layer.

### 11. Wave sequencing was too coarse
Wave A as proposed was 8-12h for homepage + `/start/*` + 2 protocol + `/reference/contracts/*`. Too much in one wave.
→ **Superseded**: zero traffic enables branch-and-flip; no wave splits needed because no incremental shipping required.

### 12. Cheapest viable intervention not benchmarked
"Stop the Bleeding" (6h address sweep + stub broken pages) could remove active harm without full rewrite.
→ **Eliminated by Damir's answer**: no current support volume = no bleeding. Branch-and-flip dominates.

### 13. We didn't ask if the docs domain is right
docs.agirails.io vs agirails.app/distribute. Could the AI-environment subtree live with the product?
→ **Confirmed**: docs.agirails.io is developer/AI cognition; agirails.app is product. Clean separation kept.

---

## Four solution options weighed

### Option A — Ship rewrite as proposed + addenda for 13 gaps
Comprehensive, one coherent shipped artifact.
**Cons**: scope creep risk; long time to first ship; reviewer fatigue.
**Verdict**: too monolithic without the right time horizon.

### Option B — Stop the Bleeding + Strategic Rewrite
6h emergency fix, then 3-week rewrite at leisure.
**Cons**: two parallel narratives; momentum loss between phases.
**Verdict**: solves a problem we don't have (zero current readers).

### Option C — Stop the Bleeding + Brain model
Same as B, but rewrite is bigger toward AGIRAILS Brain (live state, directory, bounty).
**Cons**: months of engineering; never-ships risk.
**Verdict**: rejected by Damir (Brain overlaps with agirails.app).

### Option D — Outsource via the protocol
Post bounty for an AGIRAILS agent to write the docs, paid in USDC. Ultimate dogfooding.
**Cons**: quality control; coordination overhead; timeline uncertainty; no bidders risk.
**Verdict**: brilliant long-term, premature for v1. Bookmarked for post-MVP community stream.

---

## What got chosen — branch-and-flip in 3 weeks

The chosen plan is closest to **Option A without addenda creep**, enabled by:
- Damir's zero-support-volume fact → no incremental ship pressure
- Damir's Brain rejection → no scope explosion
- Branch-and-flip → eliminates "is this site half-rewritten" middle period
- GEO-first templates → SEO/citation gains baked into foundation, not retrofitted

Five of the 13 gaps are addressed in v1 scope (security, walk-away runbook, accessibility, versioning, Iva voice). Six are deferred to post-MVP streams (community, bounty, multilingual, full SDK auto-extract, network state, release workflow automation). Two are obviated by the strategy choice (cheapest-viable intervention, wave splits).

The trade-off accepted: docs ship in 3 weeks at "very good" quality, not "perfect". Iteration after flip handles the long tail. The bet: getting LLM crawlers to index a high-quality state in week 4 compounds faster than a perfectly polished state in week 8.

---

## Meta-disclosures

Biases I held going in:
- **Toward complexity** — Brain framing was attractive to me; Damir's rejection was the right corrective.
- **Toward tooling** — auto-extraction is a build-pipeline rabbit hole; scoped down to lowest-risk surfaces (D3).
- **Toward future-proofing** — community/bounty/multilingual all want a place at the table; deferred because premature.

Confidence levels at time of writing:
- High: branch-and-flip beats wave-by-wave given zero traffic
- High: GEO foundation in templates pays multipliers
- Medium: 3-week estimate (could be 4 with 13 gaps included)
- Medium: SDK reference hand-written v1 won't drift fast enough to hurt before full auto-extract ships
- Low: anticipated FAQ questions will match real Discord questions when they arrive (needs iteration)
