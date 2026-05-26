# ARCH A3 — Truth-Ledger Pipeline: Pragmatic Balance

**Optimization target**: Ship in 1 week. Correct manifest shape day 1. Content completeness extends in v0.6. Debt is named, dated, and explicit.

**Date**: 2026-05-26
**Based on**: PHASE3_DECISIONS.md Q1-Q8 (locked), FINAL_PLAN.md pre-week deliverable
**Status**: Ready for implementation

## Architecture Decision

**Single orchestrator + 6 thin extractor modules.** The orchestrator (`build-truth-ledger.ts`) owns the manifest shape, runs extractors in parallel, computes cross-SDK divergences, applies tier map, and writes output. Each extractor is a pure function `() => Promise<SurfaceResult>` with no side effects. Modularization is justified here because each extractor has distinct error handling (Sourcify can fail, source can be missing, YAML can throw) that must be isolated.

Single script is NOT chosen because 6 distinct failure modes need isolation. If contracts.ts throws a parse error it must not prevent mcp-tools.ts from succeeding. But all 6 live under `scripts/truth-ledger/` as a single npm-runnable unit — no package boundary, no separate build step.

**No new runtime npm dependencies.** `js-yaml` is already a Docusaurus transitive dependency. `fetch` is available natively in Node 18+. The script uses `tsx` (already present).

## File Layout

```
docs-site/
  scripts/
    truth-ledger/
      build-truth-ledger.ts     ← Entry point, orchestrator (~250 lines)
      tier-map.ts               ← Q6: hand-curated {symbol: tier} mapping (~120 lines)
      extractors/
        contracts.ts            ← Surface 1: deployment JSON + Sourcify live query (~120 lines)
        mcp-tools.ts            ← Surface 2: TOOLS array from mcp-server/src/index.ts (~80 lines)
        errors.ts               ← Surface 3: TS + Python error class scan (~100 lines)
        cli.ts                  ← Surface 4: v0.5 pass-through from existing manifest cli section (~60 lines)
        sdk-api.ts              ← Surface 5: v0.5 barrel symbol extraction (~100 lines)
        agirails-md.ts          ← Surface 6: v0.5 AGIRAILS.md frontmatter parse (~80 lines)
  static/
    sdk-manifest.json           ← REPLACED in place (Q2 locked)
  package.json                  ← ADD prebuild hook
.github/
  workflows/
    truth-ledger-on-release.yml ← CI trigger on sdk-js + python-sdk-v2 release tags
```

**Total**: 7 new files + 2 modified (`package.json` prebuild, `static/sdk-manifest.json` replaced).

## What ships in week 1 (full quality)

1. **Contracts section**: All 8 contracts from both networks with live Sourcify verification. Addresses, deploy blocks, explorer URLs, per-contract `verified_status`. Fail-hard on mismatch.
2. **MCP tools section**: All 21 tools with name, description, layer attribution, read_only/destructive flags. Extracted from source.
3. **Errors section**: All error classes from both SDKs with machine-readable codes. Per-entry `ts_only`, `python_only`, `name_diff` flags. Cross-SDK symbol diff computed automatically.
4. **Divergences section**: `ts_only`, `python_only` auto-computed from symbol sets. `name_diffs` and `behavioral_diffs` hand-curated constants (correct starting point, refined in v0.6).
5. **Build pipeline**: prebuild hook wired, CI workflow for release tags, compat test, fail-soft/fail-hard behaviors.

## What ships as v0.5 (manifest shape correct, content extends in v0.6)

1. **CLI section** (`_extraction_method: 'pass-through-v0.5'`): Correct shape, content piped from existing hand-maintained manifest. v0.6: Commander walk extracts live flag defaults and validates command existence against built binary.
2. **SDK API surface** (`_extraction_method: 'barrel-parse-v0.5'`): Symbol names and tier assignments only. No signatures, no parameter types. v0.6: Parse `dist/index.d.ts` barrel for full signatures, or use TypeDoc JSON output.
3. **AGIRAILS.md V4** (`_extraction_method: 'yaml-parse-v0.5'`): Frontmatter fields, states[], capabilities[], onboarding question IDs. No hint text extraction, no validation constraints. v0.6: Full onboarding schema with range constraints, default values, and conditional logic mapped.
4. **Behavioral diffs in divergences**: `behavioral_diffs` array is a hardcoded constant with 1 known entry (actp pay --service). v0.6: Systematic behavioral audit of all CLI flags and SDK method behaviors between the two SDKs.

## Debt Log

| # | Debt | Why accepted | Fix in |
|---|---|---|---|
| D1 | CLI section is pass-through from hand-maintained data | Commander walk requires executing built binary or importing program; uncertain payoff when existing data is accurate | v0.6, Week 3 (recipe sprint) |
| D2 | SDK API signatures not extracted (symbol names only) | TypeDoc adds full SDK build step to prebuild; too slow for day-1 | v0.6, post-flip; parse `.d.ts` |
| D3 | AGIRAILS.md V4 hint text and validation constraints not extracted | YAML parsing of multi-line hint strings with conditional expressions fragile in v0.5; shape is more important than hint content | v0.6, when `/reference/agirails-md` doc page is being written |
| D4 | Behavioral divergences are hand-curated constants | Automated behavioral diff requires running both SDKs against test harness; out of scope for 1-week sprint | v0.6, post-flip; cross-SDK parity test suite |
| D5 | Python SDK version read from pyproject.toml with regex | `toml` parser cleaner but adds dep; regex on `version = "x.y.z"` reliable enough | Never — keep regex |
| D6 | MCP tools parsed with regex, not AST | AST parse (TS Compiler API) more robust but adds 20 min setup; TOOLS array structure stable | v0.6 IF TOOLS array changes |
| D7 | `KNOWN_BEHAVIORAL_DIFFS` requires manual update on SDK releases | No automated way without running both SDKs | On-demand; SDK release checklist |
| D8 | Sourcify timeout is 4000ms per call; worst case 4s build addition | Parallel fetch mitigates to ~4s wall time; acceptable | Cache verified_at in sidecar if builds slow |

## Failure Modes

| Scenario | Behavior | Build continues? |
|---|---|---|
| Sourcify 5xx / timeout | `verified_status: 'deployment_claim_only'`, warning | Yes |
| Sourcify `no_match` + deployment `verified: true` | error + `process.exit(1)` | No (hard fail) |
| Deployment JSON missing | error + `process.exit(1)` | No (contracts required) |
| MCP server source missing | Warning, `mcp_tools: null` | Yes |
| SDK barrel missing | Warning, `sdk_surface.ts: []` | Yes |
| Python `__init__.py` missing | Warning, `sdk_surface.python: []` | Yes |
| AGIRAILS.md V4 missing | Warning, `agirails_md: null` | Yes |
| `js-yaml` parse error | Warning + raw frontmatter fallback | Yes |
| Old manifest missing (first run, cli pass-through) | Warning + minimal cli stub | Yes |
| Output not writable | error + `process.exit(1)` | No |

## Week-1 Day-by-Day Plan

**Day 1 (Monday)**: Scaffold + contracts extractor + prebuild wire
- Morning: directory structure, `tier-map.ts`, orchestrator skeleton
- Afternoon: `extractors/contracts.ts` (Promise.allSettled Sourcify)
- End of day: `npm run build-truth-ledger` writes valid JSON with contracts section

**Day 2 (Tuesday)**: MCP tools + errors extractors
- Morning: `extractors/mcp-tools.ts` (regex TOOLS array parse)
- Afternoon: `extractors/errors.ts` (TS + Python class scan, cross-SDK mapping)
- End of day: 3 solid sections in manifest

**Day 3 (Wednesday)**: CLI pass-through + SDK surface v0.5
- Morning: `extractors/cli.ts` (read-old-manifest, re-emit)
- Afternoon: `extractors/sdk-api.ts` (barrel regex + Python `__all__` + tier map)
- End of day: All 6 sections populated; divergences auto-computed

**Day 4 (Thursday)**: AGIRAILS.md V4 + divergences + full integration
- Morning: `extractors/agirails-md.ts` (YAML parse)
- Afternoon: wire full divergences; full end-to-end `npm run build` on redesign-v4
- End of day: Manifest complete, Docusaurus build passes

**Day 5 (Friday)**: CI workflow + compat test + handoff
- Morning: `.github/workflows/truth-ledger-on-release.yml`; `truth-ledger-compat.test.ts`
- Afternoon: final smoke; review with Damir
- End of day: Truth ledger shipped; content writing unblocked

## Operating Cost

| Item | Cost |
|---|---|
| Build time delta | +4-5s on `npm run build` (Sourcify dominates) |
| New npm dependencies | 0 |
| File count | +7 new, 2 modified |
| Manifest size | ~50-80KB (up from current ~45KB) |
| CI cost | One extra workflow job per SDK release tag (<2 min) |
| Sourcify API cost | Free; 8 calls per build; rate limit 10 req/s |

## Critical Details

- **Dependency on `js-yaml`**: Docusaurus transitive dep, no explicit package.json entry needed unless hoisting changes.
- **`_local_path` exposure risk**: `agirails_md._local_path` is internal build metadata. Add `STRIP_FROM_PUBLIC` constant alongside `PUBLISH_METADATA_KEYS` to strip from written output (per memory "No local paths in shareable docs").
- **`canonicalize()` rule**: sort primitive arrays before diffing in `computeDivergences()`. Object arrays preserve insertion order.
- **`DiffResult` vocab reuse**: CLI section `statusValues` already uses `['in-sync', 'local-ahead', 'remote-ahead', 'diverged']`. Truth ledger reuses, doesn't add parallel vocab.
- **Safe read-before-overwrite**: `cli.ts` reads `static/sdk-manifest.json` BEFORE orchestrator overwrites it. Implemented by synchronous read in extractor before Promise.all fan-out.
- **Vercel deploy compatibility**: prebuild runs on every deploy; Sourcify HTTPS works from Vercel build runners; +4-5s well within 45-min build limit.

## Strengths

- **Ships in 1 focused week.** Day-by-day plan with concrete deliverables.
- **Pragmatic split**: 5 surfaces ship full quality, 3 ship as v0.5 pass-through with manifest shape correct.
- **Sourcify is full quality from day 1**. The one non-negotiable trust signal isn't compromised.
- **0 new dependencies.** Uses native `fetch`, transitive `js-yaml`, existing `tsx`.
- **Debt is named, dated, and tracked**. 8 explicit debt items with "fix in v0.6" markers. No hidden corners.

## Tradeoffs

- **CLI section is pass-through** from existing hand-maintained `sdk-manifest.json` cli data. Accepted because the existing CLI data is accurate (per FINAL_PLAN.md audit findings on `actp time`). v0.6 promotes to Commander walk.
- **SDK API surface is symbol names only**, no signatures. Cross-SDK divergences computed at symbol-name level. v0.6 adds full signature extraction.
- **AGIRAILS.md hint text and validation constraints not extracted** in v0.5. Frontmatter fields + states + capabilities + onboarding IDs only. v0.6 adds richer schema.
- **Behavioral diffs hand-curated** (1 entry seed). v0.6 systematic audit.
- **Regex parsing for MCP tools** (not AST). Stable now; refactor if TOOLS array structure changes.
- **No deep abstraction layer** like A2. If n8n/claude-plugin later need to import extractors, requires refactor not file copy. A3 trades long-term factor-out cost for short-term ship speed.

## Biggest Pragmatic Win

Sourcify verification is truly live (not hand-waving) at build time with correct fail-hard/fail-soft split — the one non-negotiable trust signal ships at full quality on Day 1 alongside the easiest surface (contracts JSON pipe), making it the foundation the rest of the manifest builds on.
