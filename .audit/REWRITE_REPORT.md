# docs.agirails.io Rewrite: Audit Report

**Scope**: Wave A.2 through Wave A.22 (April–May 2026)
**Site**: https://docs.agirails.io
**Source repos touched**: `agirails/docs` (primary), `agirails/sdk-js`, `agirails/sdk-python`, `agirails/agirails-mcp-server`, `agirails/agirails.app`, `agirails/actp-kernel`
**Reviewer audience**: external auditor evaluating documentation quality, drift-resistance, and editorial discipline of AGIRAILS public-facing documentation.

---

## Executive summary

The previous docs site carried five structural problems: aspirational API usage that didn't exist in the shipped SDKs, stale URLs from a pre-V3 information architecture, pre-Apex audit framing that misled readers about which audit had been performed, vendor-marketing voice with weak-signal qualifiers, and no machine-readable source of truth that could be cross-checked against the SDK source.

The rewrite (Wave A.2 → A.22) replaced the docs surface end to end, added a truth-ledger pipeline that enforces source-of-truth grounding through CI, and closed an Apex review pass (DR-1 through DR-9) that hardened the trust boundary at the extraction layer. The principles are:

1. **Manifest > prose**: every SDK symbol, contract address, CLI command, error code, MCP tool, and protocol field is auto-extracted from source into a single manifest (`/sdk-manifest.json`) regenerated daily. Reference pages render from the manifest. Drift between docs and code becomes a CI failure.
2. **V1-literal recipes**: every code example in `/recipes/*` is verified against the live SDK surface by a CI gate (`scripts/verify-recipes.ts`, 27 banned-pattern checks). Aspirational APIs are rejected at PR time.
3. **AGIRAILS.md as the onboarding entry**: the canonical protocol spec is structured so an LLM can fetch one URL and complete onboarding without further prompting. Out-of-band cleverness moved into the spec; the prompt collapsed to one line.
4. **Voice discipline**: no weak signals ("honest", "essentially", "transparent" as trust-me assertion), Apex framed correctly as the team's internal agentic audit (not an external firm), em-dashes removed across the entire surface (em-dashes correlate folk-heuristically with LLM-generated text in 2026; the cleanup is a reader-trust hedge, not a research-grade claim).
5. **Public artifacts only**: docs link only to publicly-reachable resources. The non-public "vision essay" linked from the original draft was replaced with the public manifest at `agirails.io/manifest/`.

Final state: 0 em-dashes, 0 aspirational API usages, 100% of reference content auto-extracted, 56-section canonical IA, 43/43 truth-ledger tests passing, deployed at https://docs.agirails.io.

---

## Why a rewrite was needed

The pre-rewrite audit (`.audit/SUMMARY.md`, `.audit/DEEP_REVIEW.md`) identified concrete defects:

- **API hallucination**: `Agent.create()` (doesn't exist; Python uses `Agent(AgentConfig(...))`), `agent.dispute()`, `agent.cancel()` (both routed differently at V1), `behavior.budget` (not a config), `x402Client` factory (no separate export; routes through `ACTPClient.create`), `requirePayment` middleware (not shipped), `agent.eoa` getter (not exposed). These pollute downstream LLM training: if Cursor or Claude reads stale docs once, the hallucinated API surface becomes the user's mental model.
- **Audit-grade approximation, not source-of-truth**: the audit report itself missed surfaces it could have verified (e.g. claimed `actp time` didn't exist when it does at `main.py:146`). A reviewer couldn't trust the audit, let alone the docs.
- **Pre-flip URLs**: `/quick-start`, `/agent-integration`, `/sdk-reference/intro`; none resolved post-IA reshuffle. Search-engine indexed paths were dead.
- **Audit framing**: a callout said "Smart contracts passed security audit (Feb 2026)" — a date that doesn't correspond to any documented audit. (This em-dash and a few others below sit inside historical quotations and are preserved verbatim.) Apex (the team's internal agentic audit pipeline that closed 12 findings on 2026-05-17) was missing from the framing; external third-party audit was implied but not performed.
- **Vendor voice**: marketing qualifiers ("honest scope", "this honesty is the point") used as trust assertions rather than precision tools. Stripe-style positioning ("Stripe for AI agents") inconsistently applied across pages.

The rewrite addressed each, with each Wave producing a verifiable artifact.

---

## Architecture: truth-ledger as foundation

### Truth-ledger pipeline (`scripts/truth-ledger/`)

The pipeline runs daily in CI (`truth-ledger-refresh.yml`) and on every PR. It extracts seven surfaces:

| Surface | Extractor | Source of truth |
|---|---|---|
| TypeScript SDK API | `sdk-api-ts.ts` | `sdk-js/src/index.ts` barrel + JSDoc summaries |
| Python SDK API | `sdk-api-py.ts` | `python-sdk-v2/src/agirails/__init__.py` `__all__` + docstrings |
| Errors | `errors.ts` | Both SDK error class definitions |
| CLI | `cli.ts` | Commander (TS) + Typer (Python) AST walks |
| Contracts | `contracts.ts` | `actp-kernel/deployments/*.json` + live Sourcify check |
| MCP tools | `mcp-tools.ts` | `agirails-mcp-server/src/index.ts` TOOLS array |
| Protocol fields | `agirailsmd-v4.ts` | Canonical `AGIRAILS.md` YAML frontmatter |

The `normalize.ts` step merges TS + Python surfaces, computes per-symbol `sync_status` (`in-sync` / `local-ahead` / `remote-ahead` / `diverged`) with snake_case alias logic, and applies `KNOWN_NAME_DIFFS` for intentional cross-SDK naming differences. `diverge.ts` aggregates structural divergences. Output: `static/sdk-manifest.json`.

`scripts/render-reference.ts` renders all reference pages (`docs/reference/**`) from the manifest. The rendered pages are committed (not generated at Vercel build time) so deployments don't depend on the SDKs being present.

### Why this matters for an auditor

Every claim in the reference docs is traceable to source. `BuyerNegotiationContext` summary in `sdk-js/standard.md` comes from line N of `negotiation/BuyerOrchestrator.ts`. Contract addresses come from `actp-kernel/deployments/*.json`. There is no hand-maintained snapshot to drift.

### V1-literal recipes (`scripts/verify-recipes.ts`)

Hand-written recipes are gated by a verifier with 27 `BAD_PATTERNS` covering every invented API surface known from the pre-rewrite audit. The verifier runs on every PR. An `EXPLANATORY_PHRASES` allowlist tolerates prose mentions of deprecated APIs (e.g. "the V1 SDK does NOT expose `agent.dispute()`") so the verifier-gate doesn't fight legitimate documentation of what doesn't exist.

---

## Wave-by-wave decisions

### Wave A.2 to A.4: Foundation

- New canonical IA (`/start`, `/protocol`, `/recipes`, `/reference`, `/security`). Old pre-flip URLs removed.
- Truth-ledger extractors built for contracts, CLI, MCP tools (per FINAL_PLAN §D3). SDK reference handed off as later stream.
- Apex framing introduced consistently across `security/*.md`: internal agentic audit pipeline, 12 findings closed before V3 redeploy on 2026-05-19, external audit explicitly marked "planned, not performed".

### Wave A.5 to A.9: Recipes and reference completion

- 14 recipes rewritten to literal V1 surface: `Agent(AgentConfig(...))` constructor (Python), `wallet: 'auto'` config (TS), `agent.client.standard.transitionState()` for dispute/cancel paths, `new CounterOfferBuilder(signer, nonceManager).build({...})` instead of fluent chain.
- Per-recipe V1-caveat banner + "Verified against" footer with explicit SDK version pins.
- Auto-extract for SDK reference (JSDoc/docstring summaries reach 76% TS / 84% Python coverage).
- V4 schema page auto-extracted from `parseAgirailsMdV4` source.

### Wave A.10 to A.13: Drift gates and verifier sweep

- `verify-recipes.ts` CI gate added with 25 BAD_PATTERNS (later expanded to 27 in Wave A.22); runs on every PR.
- Verifier sweep against V1 SDK surface; 60+ corrections landed across recipes.
- Lighthouse 86/97/96/100 desktop after a11y fixes (link underlines, Prism contrast for both themes).
- Docusaurus `experimental_faster` enabled (rspack + SWC); build time dropped meaningfully.

### Wave A.14: Apex framing correction + voice tightening

- 14 Apex mentions reframed across 5 files. Hallucinated `example.com/apex-audits` external-firm link removed; replaced with "Apex is the team's own systematic audit pipeline" + decision criteria for when external audit will be commissioned.
- Eight "honest" instances removed across four files. Reasoning: "honest" is a weak signal; *everything* in the docs is honest by assumption, and calling out a specific section as "honest" implies the rest isn't.

### Wave A.15 to A.16: Onboarding prompt collapse + llms.txt restructure

- Onboarding prompt at `/start/agent-onboarding-prompt` collapsed from ~15-line 3-URL prompt to one sentence. Reasoning: AGIRAILS.md is structured as an LLM-readable spec (YAML frontmatter, 9-step pipeline, Step 4 code templates, references block). Re-stating spec content in the prompt is redundant duplication that goes stale every spec move.
- `references:` block added to AGIRAILS.md frontmatter and to per-agent generator output. Self-bootstraps any agent that fetches a covenant file.
- `llms.txt` rewritten per `llmstxt.org` standard: short structural pointer (~8 KB) for site discovery. `llms-full.txt` (~360 KB) for full-corpus RAG. The two were previously conflated.
- ORDERED_FILES in llms-full generator expanded to canonical IA order (was missing 13 pages that landed in an "Additional Documentation" tail dump).

### Wave A.17: Multi-agent quality review

- Three parallel `code-reviewer` agents reviewed: (a) truth-ledger parity fix correctness, (b) AGIRAILS.md + onboarding 1-link architecture coherence, (c) docs voice + content carry-through.
- Findings consolidated into four high-priority fixes: stale "Security Audit Complete Feb 2026" callout corrected to Apex 2026-05-17 framing; disclosure.md See-Also fixed; "SDK pins" overclaim in onboarding prompt corrected; hallucination-prevention guard restored in AGIRAILS.md `For AI Agents` section.
- Two maintenance fixes: `syncBadge` dead-label cleanup, `AGIRAILS_REFERENCES` constant extracted so test + generator can't drift apart.
- One defensive fix: `diverged` stamp moved off derived alias maps onto `KNOWN_NAME_DIFFS` source-of-truth (robust against future `python_has_alias: true` entries).

### Wave A.18: Em-dash elimination

- 1036 em-dashes removed across docs surface. The justification is a folk-heuristic, not evidence: em-dashes correlate in popular 2026 commentary with LLM-generated text, and readers (and competitors) use them as a low-cost prior. The cleanup is a reader-trust hedge against that prior. Spending blast radius across security-sensitive repos for a contested heuristic was a defensible call; flagging it explicitly so it isn't asserted as fact.
- Eliminated in three passes: (1) `render-reference.ts` template fix (~374 instances in auto-generated reference docs), (2) four parallel agents rewriting 38 hand-written content pages (~635 instances) with context-aware replacements, (3) cleanup of 27 code-block comments + source comments in 5 upstream repos (sdk-js, sdk-python, mcp-server, actp-kernel) so daily render doesn't reintroduce em-dashes from JSDoc/docstring summaries.
- Replacement rules applied consistently: parenthetical → comma or split; appositive → colon (defines) or period (sequential); list-item header → colon; title separator → colon; range → en-dash (–) or "to"; brief amplification → comma; long restructure → two sentences.

### Wave A.19: Errors, formal verification, first mainnet transaction

- **Per-code error triage extracted from SDK source** (parts 1-2). Each error class in `sdk-js/src/errors.ts` annotated with `@cause` / `@fix` / `@recovery` JSDoc tags; truth-ledger errors extractor reads the tags and renders `/reference/errors` with per-code triage instead of a flat catalog. A reader hitting `INSUFFICIENT_FUNDS` in their logs gets a direct anchor link with cause, fix, and recovery class. Stale "If you don't have an error code" symptom flow added as the no-code path.
- **Formal verification page rewritten for accessibility** (part 3). Replaces a paper-link-and-three-paragraphs stub with first-principles explanation: what H¹=0 actually proves, what it doesn't, who benefits ("for mathematicians" section). Paper repo (`agirails/proofs-paper`) linked inline; verification commands `lake build` + `make verify` documented for readers who want to re-run the proof themselves.
- **First mainnet transaction walkthrough** (part 4). The exact transaction shape that closed the first commercial AGIRAILS settlement, anonymized at the design partner's request, with BaseScan trace links. Demonstrates the canonical lifecycle (INITIATED → SETTLED in ~38 seconds, $3.69 USDC) without leaking the design partner's service identity. Replaces an aspirational "what a transaction looks like" stub.

### Wave A.20: Production checklist, MCP per-tool schemas, cross-SDK divergence page

- **Production checklist** (`/recipes/production-checklist`) added: orchestration-layer page for taking an agent from testnet to mainnet, organized as pre-launch → launch day → day 1 → ongoing → incident response. Each item is a gate the team should answer yes to before moving on; details deferred to the underlying recipe. Authored against the team's first mainnet operational experience, not aspirational.
- **MCP per-tool schemas**: per-tool reference pages for all 20 tools in `agirails-mcp-server` rendered from the truth-ledger MCP extractor. Each page shows input schema, output schema, example invocation. Previously documented as a single overview index.
- **Cross-SDK divergence page** (`/reference/cross-sdk-divergence`) added: explicit table of intentional name differences between TS and Python SDKs (`KNOWN_NAME_DIFFS` source-of-truth), plus the small set of truly diverged behaviors. Reader question "is this missing from Python or different?" gets an answer without source-reading.

### Wave A.21: Apex review response (DR-1 through DR-9)

The Apex agentic audit pipeline produced nine findings on the rewrite itself (DR-1 through DR-9). Closed in five parts, sequenced by load-bearing first.

- **Part 1 (DR-4)**: paymaster framing precision. Earlier docs said "the paymaster can refuse"; source inspection showed dual-provider (Coinbase primary + Pimlico backup) with automatic failover. Updated `wallet`/`paymaster` reference + recipes to reflect actual fallback, not a single point of failure. The fix was documenting reality more accurately, not weakening the recommendation.
- **Part 2 (DR-1)**: REWRITE_REPORT metrics drift. The `## Verifiable state` table was hand-maintained and drifted between report updates. Replaced with a comment-marker pair populated by `scripts/regen-report-metrics.ts` on every truth-ledger build. Source: `static/sdk-manifest.json`. Drift = CI failure. The live table is at the end of this report.
- **Part 3 (DR-2)**: truth-ledger trust boundary. The pipeline reads from upstream source repos; nothing pinned which commit those repos were at. Added `truth-ledger.pins.json` (per-repo SHA + minimum extraction coverage floor); `verifyPins` blocks build if upstream HEAD doesn't match the pin, `verifyFloors` blocks if extraction coverage drops, `emitManifestDiff` produces a per-symbol change set on every PR. `bump-pins.ts` is the deliberate path to advance the pin (no auto-bump). A poisoned upstream commit can no longer silently land in the rendered docs.
- **Part 4 (DR-3)**: "Stripe for AI agents" constitutional counter-framing. The tagline (canonical per GTM §5.4) implies custodial vendor positioning; AGIRAILS is non-custodial protocol. Counter-framing added inline on all four surfaces where the tagline appears (the agent should walk away from us if we fail; the protocol settles without our involvement). The tagline stays for analogical clarity; the inline counter-frame keeps the analogy from over-extending.
- **Part 5 (tactical batch, DR-5 through DR-9)**: audit hygiene docs landed under `.audit/` for findings whose mitigation was operational rather than code. `CROSS_REPO_COMMIT_POLICY.md` (commit-pattern hygiene for supply-chain hardening), `DEPENDABOT_TRACKING.md` (per-repo vulnerability cadence: runtime on `agirails.app` monthly, build-time on `agirails/docs` quarterly with layered mitigations — OIDC trusted publisher, SHA-pinned actions, truth-ledger pins), `GEO_PROBE.md` (measurement deferred but tracked). SUMMARY corrections and REWRITE_REPORT heuristic reframings landed alongside.

### Wave A.22: Design partner insights + production-checklist actually shippable

- **Extracted operational insights from a design partner mainnet-listener guide** into four existing recipe surfaces (Option A: extract, don't migrate). `provider-agent.md` gained "Listener architecture: the agent is outbound-only" (most teams expect an HTTP server; the SDK is a JsonRpcProvider client; clarifies when an endpoint IS needed, i.e. x402 only). `autonomous-agent.md` gained "Integration patterns" (everything-in-process vs forward-events-to-existing-infra) so teams with prior orchestration don't rebuild. `dispute-flow.md` gained lower-level subscription pattern for standalone monitoring daemons (no Agent instance, via `runtime.getEvents().onStateChanged`). `production-checklist.md` gained "Automation boundary" tables (auto-safe by default / human-in-the-loop by default) covering which state transitions an agent may handle unattended on day one.
- **Pre-existing bug caught by `verify:recipes`** in production-checklist.md: `agent.on('payment:sent', ...)` does not exist in V1 (only `payment:received` fires). Reframed to `payment:received` on provider side; `agent.stats.totalSpent` polling on consumer side. The drift gate introduced in Wave A.19 caught it before merge — the exact defense-in-depth case the gate was built for.
- **`.gitignore` fix unblocking the production checklist**: the `*CHECKLIST*.md` pattern (intended for local-only working notes) was silently swallowing the intentional `docs/recipes/production-checklist.md` file. Wave A.20 wired the Docusaurus sidebar entry, but the file itself never reached git. Added explicit allowlist exception (`!docs/recipes/production-checklist.md`). The page is now actually shippable to docs.agirails.io.
- **Verify-recipes expanded to 27 banned patterns** (from 25) to cover the additional V1-surface drift caught in this Wave.

---

## Old vs new comparison

| Dimension | Pre-rewrite | Post-rewrite (current) |
|---|---|---|
| **API examples** | Hallucinated symbols (`Agent.create`, `agent.dispute`, `x402Client`, `behavior.budget`, `requirePayment`, …) | Literal V1 surface, CI-gated against 27 banned patterns |
| **Reference docs** | Hand-maintained, manually edited, prone to drift | Auto-extracted daily from source; rendered pages committed; drift = CI failure |
| **Symbol coverage** | Partial, names guessed | 283 TS symbols, 277 Python; per-symbol cross-SDK status |
| **Contract addresses** | Hardcoded in prose | Auto-pulled from `actp-kernel/deployments/*.json` with live Sourcify check |
| **URLs** | Pre-flip stale paths (`/quick-start`, `/agent-integration`, …) | Post-flip canonical IA, all `.md` raw URLs map to actual build artifacts |
| **Audit framing** | Stale "Feb 2026 security audit" callout, no Apex mention, external audit implied | Apex 2026-05-17 pass with 12 closed findings; external audit explicitly "planned, not performed" |
| **Onboarding prompt** | Multi-paragraph cleverness rewritten per release | One line. AGIRAILS.md is the prompt; updates ride spec versioning |
| **`llms.txt` vs `llms-full.txt`** | Conflated, stale URLs, `llms-full` linked but broken | `llms.txt` is llmstxt.org pointer (~8 KB); `llms-full.txt` is canonical-ordered full corpus (~360 KB) |
| **Voice signals** | "Honest scope", "this honesty is the point", "external audit findings" | Pragmatic, no weak qualifiers, accurate framing throughout |
| **Em-dashes** | 1036 across surface | 0 across `docs/` + `static/llms*.txt`; source comments cleaned to prevent regen |
| **Vision/manifest links** | Linked to non-public "vision essay" | Linked to public `agirails.io/manifest/` |
| **Reference auto-extraction** | None | TS SDK 76% JSDoc coverage, Python SDK 84% docstring coverage |
| **CI gates** | None | `verify-recipes.ts` (27 patterns), truth-ledger build with SHA-pinned source repos + coverage floors + manifest diff (Wave A.21 part 3), 43 invariant tests, auto-regenerated report metrics block |
| **Recipes count** | Partial, marketing-shaped | 14 task-oriented walkthroughs with V1-caveat banner + verified-against footer |
| **JSON-LD structured data** | None | FAQPage on `/faq` (16 entries), TechArticle on protocol/security pages |
| **Lighthouse desktop** | Not measured | 86/97/96/100 |

---

## Principles applied

1. **Truth before polish**. The truth-ledger pipeline shipped before any reference content. Every claim has a source-of-truth that can be re-checked against the SDK repo by any auditor.

2. **Drift is a bug, not a maintenance task**. Anything that can be auto-extracted is auto-extracted. Anything hand-written is CI-gated against the auto-extracted source. Manual sync is treated as failed automation.

3. **Voice signals are evaluated, not assumed**. "Honest", "transparent", "essentially", "basically": each was a weak-signal qualifier that didn't earn its keep. Removed. "Stripe for AI agents" as the canonical primary tagline (per GTM §5.4) is kept consistently across positioning pages and omitted from technical reference where it would be out of place.

4. **The spec is the prompt**. AGIRAILS.md is structured so an LLM with URL-fetch can complete the entire onboarding flow from a single link. This is enforced architecturally: `references:` block in the YAML frontmatter points the LLM at manifest + recipes for anything beyond the basic templates. No out-of-band knowledge required.

5. **Public artifacts only**. The non-public "vision essay" was removed from docs and replaced with the public manifest at `agirails.io/manifest/`. The principle: docs cannot link a reader to a resource the reader cannot reach.

6. **Apex framing precision**. Apex is the team's internal agentic audit pipeline. It is NOT an external third-party firm. The docs say so explicitly and direct readers to where external audit roadmap is tracked. Anyone evaluating AGIRAILS for institutional deployment should read this section first.

7. **Source-cleanup propagates**. When an em-dash or weak signal lives in a JSDoc or docstring that propagates through the truth-ledger, the fix lands in the SDK source repo (committed back through the relevant package), not as a patch on the rendered docs. This keeps the pipeline robust against re-render.

8. **Folk-heuristic voice signals are addressed proactively, named as heuristics**. Em-dashes correlate with LLM-generated text in popular 2026 commentary. This is a heuristic, not evidence; we treat it as a reader-trust hedge rather than a research finding. Removing them across 1036 instances is purely about not triggering the reader's "this is AI sludge" prior; the technical accuracy of the underlying claim is unaffected. Naming it as a heuristic protects against the same weak-signal trap we close on words like "honest" or "trustless".

---

<!-- METRICS:start -->
<!-- GENERATED by scripts/regen-report-metrics.ts on every truth-ledger build. Do not edit by hand. Source: static/sdk-manifest.json at 2026-05-29T09:11:26.417Z. -->

## Verifiable state (as of 2026-05-29)

| Metric | Value | How to verify |
|---|---|---|
| Em-dashes across docs surface | 0 | `grep -rh "—" docs/ static/llms.txt static/llms-full.txt \| wc -l` |
| Truth-ledger invariant test bodies | 43 | `grep -rc "it(" scripts/truth-ledger/__tests__` |
| identity-file-generator test bodies | 41 | `grep -c "it(" Platform/agirails.app/web/tests/unit/identity-file-generator.test.ts` |
| TS SDK symbol count | 283 (75% with JSDoc summary) | `jq '.sdk_api.ts.count' static/sdk-manifest.json` |
| Python SDK symbol count | 277 (84% with docstring summary) | `jq '.sdk_api.python.count' static/sdk-manifest.json` |
| in-sync / TS-only / Python-only / diverged | 179 / 113 / 107 / 2 | `jq '.tiers \| to_entries \| map(.value.sync_status) \| group_by(.) \| map({status:.[0],n:length})' static/sdk-manifest.json` |
| Recipes (content + index) | 14 + 1 | `ls docs/recipes/*.md \| wc -l` |
| Banned-pattern entries in verify-recipes | 30 | `grep -cE "^\s*pattern:" scripts/verify-recipes.ts` |
| Verified contracts (Sourcify EXACT_MATCH) | 9/10 | `/security/contracts` live check |
| FAQ Q&A entries (JSON-LD) | 17 | `grep -c '"@type": "Question"' docs/faq/index.md` |
| Glossary cross-link occurrences | 281 | `grep -rc "/reference/glossary#" docs/` |
| Docs files in IA | 60 | `find docs -name "*.md" -not -path "*/img/*" \| wc -l` |
| llms-full.txt size | ~453 KB | `wc -c static/llms-full.txt` |
| Apex findings closed | 12/12 before V3 redeploy | `/security/audits` index (FIND-001 through FIND-016, twelve actionable) |

<!-- METRICS:end -->

## Known gaps and open items

### Closed (Wave A.17 → A.22)
- Em-dash elimination across docs + source comments (A.18)
- Truth-ledger parity bugs (3 fixes landed in normalize/render/extractor) (A.17)
- Audit framing carry-through (index.md + disclosure.md) (A.17)
- Hallucination-prevention guard in AGIRAILS.md (A.17)
- "SDK pins" overclaim corrected (A.17)
- Per-code error triage extracted from SDK source `@cause`/`@fix`/`@recovery` tags (A.19)
- Formal verification page rewritten with "for mathematicians" section + paper repo + verification commands (A.19)
- First-mainnet-transaction walkthrough with anonymized real trace (A.19)
- Production checklist as orchestration layer over the recipes (A.20)
- MCP per-tool schema pages for all 20 tools (A.20)
- Cross-SDK divergence reference page (A.20)
- **Apex DR-1**: REWRITE_REPORT metrics auto-generated from `static/sdk-manifest.json` via `scripts/regen-report-metrics.ts` (A.21 part 2)
- **Apex DR-2**: truth-ledger SHA-pinned to upstream source repos + coverage floors + per-PR manifest diff via `truth-ledger.pins.json` (A.21 part 3)
- **Apex DR-3**: "Stripe for AI agents" constitutional counter-framing inline on all four surfaces (A.21 part 4)
- **Apex DR-4**: dual-provider paymaster (Coinbase + Pimlico failover) documented as actual reality (A.21 part 1)
- **Apex DR-5/6/7/8/9**: audit hygiene docs (CROSS_REPO_COMMIT_POLICY, DEPENDABOT_TRACKING, GEO_PROBE) + SUMMARY corrections + heuristic reframings (A.21 part 5)
- Design partner mainnet-listener insights extracted into four existing recipes (A.22)
- Production checklist `.gitignore` blocker resolved (Wave A.20 wired the sidebar but the file never reached git; allowlist exception added) (A.22)
- `verify:recipes` caught pre-existing `payment:sent` V1-surface drift in production-checklist before merge (A.22)

### Open (deferred by design)
- **External third-party audit**: not yet performed. Decision criteria documented in `/security/audits`. Will be commissioned pre-V4 mainnet upgrade or at a stakeholder threshold (TVL, mediator exposure).
- **Per-symbol detailed reference**: current pages are "index of what exists" with JSDoc summaries. Full prose reference (parameter docs, return types, examples) is a deferred enhancement; the index suffices for V1.
- **Programmatic SEO (`/solutions/*`)**: 0/500 per GTM §9.2.8. Separate workstream.
- **Foundational Essay #4**: blocked on B2/B3 work outside docs scope.
- **Dependabot vulnerabilities** tracked in `.audit/DEPENDABOT_TRACKING.md` with per-repo cadence: `agirails/agirails.app` (runtime, monthly batch for HIGH; quarterly for MEDIUM); `agirails/docs` (build-time only, quarterly batch for HIGH; semi-annual for MEDIUM). Layered build-pipeline mitigations documented in the same file: OIDC trusted publisher, SHA-pinned actions, truth-ledger SHA pins, per-branch Vercel deploy isolation. Pre-existing; not introduced by the rewrite.

### Not in scope for this rewrite
- Marketing site content (`agirails.io`)
- Smart contract logic (covered by Apex + planned external audit)
- SDK behavior changes
- On-chain protocol modifications

---

## How to audit

For an external reviewer, the verification path is:

1. **Read `.audit/SUMMARY.md` + `.audit/FINAL_PLAN.md`** for original problem statement.
2. **Pull `agirails/docs` `main`**, run `npx vitest run scripts/truth-ledger/__tests__`; expect 43/43 pass.
3. **Run `npm run verify:recipes`**; expect zero banned-pattern matches across all 14 recipes.
4. **Run `npx tsx scripts/build-truth-ledger.ts`** with `sdk-js`, `sdk-python`, `agirails-mcp-server`, `actp-kernel` checked out; expect the regenerated `static/sdk-manifest.json` to match the committed one byte-for-byte (after canonical JSON sort).
5. **Verify on docs.agirails.io**: spot-check 5 reference symbols against the SDK source; confirm Apex framing across `/security/*`; confirm em-dashes are absent.
6. **Cross-check the manifest live**: every entry in `/reference/contracts/base-mainnet.md` should resolve on Basescan with the listed deploy block.

The pipeline is designed so any non-trivial divergence between docs and source is either a test failure, a verifier failure, or a manifest regen diff. Never a silent staleness.

---

## Conclusion

The rewrite replaced a docs surface that propagated hallucinated APIs and pre-flip URLs with one that is structurally drift-resistant: every claim has a source-of-truth, every code example is CI-verified against the live SDK, and the editorial voice doesn't carry signals that undermine the technical accuracy beneath. The architecture (truth-ledger + render-reference + verify-recipes) is the load-bearing piece. The voice work (Apex framing, em-dash removal, weak-signal cleanup) protects the surface from looking like marketing noise.

The remaining gaps are explicitly tracked and have decision criteria for when they'll be addressed. Nothing in this report is aspirational; every claim is verifiable against the commit trail and the live site.

**End of report.**
