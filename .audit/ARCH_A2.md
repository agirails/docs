# Architecture A2 — Truth-ledger: Clean Architecture

**Optimization target**: Best long-term abstractions, factor-out friendly, opinionated.
**Status**: Draft, 2026-05-26
**Decisions met**: Q1–Q8 (all locked)
**Comparable to**: A1 (minimal), A3 (pragmatic)

## Overview

The truth-ledger pipeline answers one question at build time: "What does AGIRAILS actually export, deploy, and expose — right now, from source?" The answer replaces `static/sdk-manifest.json`. Downstream consumers (`index-docs.ts`, CI diff annotations, post-v1 n8n/claude-plugin) read only the output file.

A2 introduces **three named layers** with hard interface boundaries:

1. **Extraction layer** — seven `Extractor` plugins, one per surface, all implementing `interface Extractor`
2. **Normalization layer** — maps `RawSurface[]` to a canonical `NormalizedManifest`; cross-SDK comparison lives here exclusively
3. **Emit layer** — serializes `NormalizedManifest` + `DivergenceReport` to `static/sdk-manifest.json` atomically

Each layer has a single responsibility. The extraction layer is independently importable per-extractor — the n8n/claude-plugin migration path (Q1 post-v1 note) is zero-friction because each extractor module has no coupling to the other six.

## Architecture Decision

**Extractor plugin composition — not inheritance, not a monolith.**

Seven extractors, each a module implementing `interface Extractor`. The orchestrator `build-truth-ledger.ts` is a thin runner: import all seven, run in parallel via `Promise.allSettled`, collect `RawSurface[]`, pass through `NormalizationPipeline`, then `DivergenceComputer`, then `ManifestEmitter`. 50 lines of orchestration, zero logic.

**Why plugin composition**: Proven precedents (`identity-file-generator.ts`, `agirailsmd.ts`, `generate-llms-full.ts`) all use exported functions, not class hierarchies.

**Why not monolith (A1 approach)**: The 7 surfaces have radically different extraction mechanisms (TypeScript compiler API, Python source scan, CLI subprocess spawn, HTTP query, filesystem glob). Monolith creates "conditional body sections via repeated `if` checks" anti-pattern. Also makes tools/ extraction a refactor rather than file copy.

## File Layout

```
docs-site/
  scripts/
    build-truth-ledger.ts              ← orchestrator: 50 lines max, pure wiring
    truth-ledger/
      types.ts                         ← ALL shared types + MANIFEST_GENERATED_KEYS
      tier-map.ts                      ← TIER_MAP + BEHAVIORAL_OVERRIDES
      normalize.ts                     ← NormalizationPipeline
      diverge.ts                       ← DivergenceComputer
      emit.ts                          ← ManifestEmitter: atomic write
      extractors/
        cli.ts                         ← Surface 1: spawn actp --help, recursive walk
        contracts.ts                   ← Surface 2: deployment JSON + Sourcify live
        sdk-api-ts.ts                  ← Surface 3: ts.createProgram barrel walk
        sdk-api-py.ts                  ← Surface 4: __all__ + __tier__ scan
        mcp-tools.ts                   ← Surface 5: MCP tool registry
        errors.ts                      ← Surface 6: Error classes (both SDKs)
        agirailsmd-v4.ts               ← Surface 7: canonical AGIRAILS.md (parseAgirailsMd from SDK)
      __tests__/
        {extractor}.test.ts × 7
        normalize.test.ts
        diverge.test.ts
        truth-ledger-sdk-compat.test.ts  ← cross-boundary, no internal imports
        fixtures/
```

**Note on surface count**: locked decisions specify 6 surfaces (CLI, contracts, SDK API, MCP tools, errors, AGIRAILS.md V4). A2 counts agirailsmd-v4 as surface 7 separate from contracts. If strictly 6 wanted, merge agirailsmd-v4 into contracts; interface design identical.

## Key Abstractions

| Abstraction | Justification | Precedent |
|---|---|---|
| `interface Extractor` | Single-surface = single module = independently importable for n8n/claude-plugin | `identity-file-generator.ts:51` `buildFrontmatter` / `:229` `buildBody` |
| `interface ExtractorConfig` | Config/data separation; prevents `process.env` in extractors; testable without env setup | `identity-file-generator.ts:31` `(config, meta)` parameter pair |
| `MANIFEST_GENERATED_KEYS as const` | Strips build-time metadata before downstream diff/hash | `agirailsmd.ts:58–67` `PUBLISH_METADATA_KEYS` |
| `type SyncStatus` (`'in-sync' \| 'local-ahead' \| 'remote-ahead' \| 'diverged'`) | Re-uses proven DiffResult vocabulary; no parallel enum drift | PHASE3_DECISIONS.md:115 |
| `NormalizationPipeline` | Cross-SDK comparison requires all surfaces simultaneously; separate step keeps extractors pure | PHASE3_DECISIONS.md:122 anti-pattern: extract context object once |
| `DivergenceComputer` | Structural divergences (computed) vs behavioral (curated) have different cadences; separating makes boundary explicit | `owner-agirails-generator.ts:90–93` named marker constants |
| `ManifestEmitter` | Atomic write via tmp + rename is distinct concern from data transformation | `generate-llms-full.ts:146` `writeFileSync` upgraded with atomicity |
| `tier_from_source` flag | `@tier`-tag readable-source migration pre-wired from day 1; one-line activation post-v1 | Q6 post-v1 note in PHASE3_DECISIONS.md |
| `BEHAVIORAL_OVERRIDES` table | Behavioral divergences cannot be inferred from shape (CLI flag silent-ignore vs reject); co-located with TIER_MAP because same update cadence | `PUBLISH_METADATA_KEYS` named-table pattern |

## Data Flow

```
build-truth-ledger.ts
  │
  ├─ [parallel, Promise.allSettled — all 7 extractors]
  │   ├─ cli.ts          → RawSurface(execFile actp --help, recursive walk)
  │   ├─ contracts.ts    → RawSurface(deployments JSON + Sourcify HTTP fail-soft)
  │   ├─ sdk-api-ts.ts   → RawSurface(ts.createProgram barrel walk + @tier detect)
  │   ├─ sdk-api-py.ts   → RawSurface(__all__ state machine + __tier__ scan)
  │   ├─ mcp-tools.ts    → RawSurface(tool registry parse)
  │   ├─ errors.ts       → RawSurface(TS AST + Python class scan)
  │   └─ agirailsmd-v4.ts → RawSurface(parseAgirailsMd from SDK)
  ▼
normalize.ts  [RawSurface[] + TierMap → NormalizedManifest]
  │  cross-SDK comparison; canonicalize() applied
  ▼
diverge.ts  [NormalizedManifest + BehavioralOverrides → DivergenceReport]
  │  ts_only/python_only/name_diffs: computed; behavioral: curated
  ▼
emit.ts  [.tmp → rename atomic write]
  │  static/sdk-manifest.json (replaces in place)
```

## Critical Design Choices

**TypeScript AST via `ts.createProgram`** instead of regex (A1) or barrel string parse (A3). `typescript` is already a devDep; no new dependency cost. AST handling is robust to multi-line export blocks, type-only exports, re-exports, namespace exports — all of which would break regex parsing. AST also exposes JSDoc tag info needed for `@tier` migration path.

**`parseAgirailsMd` imported directly from `sdk-js/src/config/agirailsmd.ts`**. The canonical parser is audited (Apex FIND-016). Duplicating would violate PHASE3_DECISIONS.md constraint 2 (no duplicate hash/parser copies). One extractor importing SDK code — intentional and scoped.

**Atomic write via tmp + rename**. CI diffs against committed manifest; a partial write during build interruption would create false-positive diff. `fs.renameSync(tmp, output)` is atomic on POSIX.

**`tier_from_source` field on `NormalizedSymbol`**. Extractor sets it when `@tier` JSDoc tag or `__tier__` docstring attribute found. `normalize.ts` v1 ignores this flag (uses TIER_MAP); post-v1 enables source-based override by changing one line in normalize. Pre-wired the reader, deferred the policy change.

## CI Workflow

`.github/workflows/truth-ledger-release.yml` triggers on push of `sdk-js@*.*.*` and `python-sdk-v2@*.*.*` tags. Runs `tsx scripts/build-truth-ledger.ts` with `CI_STRICT: 'true'` env. Only behavioral difference: Sourcify `no_match` becomes hard fail. Opens PR if manifest changed.

## Failure Modes

| Scenario | Local | CI |
|---|---|---|
| Sourcify 5xx/timeout | warning, `verified_status: deployment_claim_only` | same (soft fail) |
| Sourcify no_match when deployment claims verified | warning + hard fail | hard fail (CI_STRICT) |
| `actp` binary not found | CLI surface skipped, warning | previous snapshot used |
| Single extractor fails | section omitted from output, warning | same |
| All 7 extractors fail | exit 1 | exit 1 |
| Output write fails (disk/permissions) | exit 1 | exit 1 |

## Test Seam

- **Extractor-level unit tests** with fixtures under `__tests__/fixtures/`. `contracts.ts` HTTP mocked with `vi.mock`. `sdk-api-ts.ts` runs `ts.createProgram` against `sample-sdk-barrel.ts` fixture.
- **Snapshot tests** for `normalize()` and `computeDivergences()` (pure functions); snapshot updates are the PR review artifact showing what changed.
- **Cross-boundary compat test** `truth-ledger-sdk-compat.test.ts` reads output JSON, validates against `index-docs.ts` consumer shape, does NOT import internal modules.

## Phases (13–18h focused work)

| Phase | Effort | Output |
|---|---|---|
| 1. Scaffold | 2-3h | `types.ts`, `tier-map.ts` stub, orchestrator stub, prebuild chain |
| 2. Contracts + AGIRAILS.md | 2-3h | Most-stakes surfaces ship first |
| 3. Errors + CLI | 2-3h | Both error catalogs + recursive `actp --help` walk |
| 4. SDK API + MCP | 3-4h | AST extractors for TS + Python + tool registry |
| 5. Normalize + Diverge | 2-3h | Full cross-SDK join + divergence computation |
| 6. Emit + compat test | 1-2h | Atomic write + compat test against output |
| 7. CI workflow | 1h | Release-tag-triggered manifest update PR |

Phases 3 and 4 parallelizable.

## Post-v1 Migration to `tools/truth-ledger/`

**Additive only** — no truth-ledger internal changes.

1. Copy `docs-site/scripts/truth-ledger/` to `tools/truth-ledger/src/`
2. Add `package.json` (`name: "@agirails/truth-ledger"`)
3. Add `"@agirails/truth-ledger": "workspace:*"` to docs-site
4. Change import paths from `./truth-ledger/` to `@agirails/truth-ledger`
5. n8n/claude-plugin import extractors directly: `import { ContractsExtractor } from '@agirails/truth-ledger'`

Individual extractors independently importable by design. n8n importing only `ContractsExtractor` doesn't trigger TypeScript compiler load (only happens when `sdk-api-ts.ts` is imported).

## Operating Cost

| Metric | Value |
|---|---|
| Build time addition | 5-8s wall time (Sourcify + AST work) |
| New npm deps | 0 (typescript/tsx/vitest already devDeps) |
| Files created | ~14 |
| Orchestrator lines | ~50 (thin by design) |
| Tests | 7 extractor unit + 2 snapshot + 1 compat |
| Sourcify HTTP | 8 calls per build |
| Migration to tools/ | File copy + 4 package.json lines |

## Strengths

- **AST-based parsing**, not text regex. Robust to formatting changes, multi-line exports, type-only exports.
- **Independent extractor modules**. n8n/claude-plugin can import one extractor without pulling in all 7's dependencies.
- **`@tier`-tag readable migration pre-wired**. Post-v1 change is one line in `normalize.ts`.
- **Cross-SDK comparison isolated** to `normalize.ts`. Extractors stay pure; comparison logic auditable in one place.
- **Atomic writes** prevent CI false-positive diffs during interrupted builds.
- **Single source of types** in `types.ts`. All modules import from here; no parallel type definitions.

## Tradeoffs

- **14 files vs 13 (A1) / 7 (A3)**. Abstraction investment pays off at post-v1 consumption; pure overhead if truth-ledger stays docs-only forever.
- **5-8s build time** vs A1's 2-3s. AST work + atomic write add ~3s.
- **9 abstractions** require learning. A1's flat orchestrator is more legible at first glance.
- **`parseAgirailsMd` SDK import** creates one explicit dependency between truth-ledger and SDK. Intentional but worth noting.
