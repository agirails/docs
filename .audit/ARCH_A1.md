# ARCH A1 — Minimal Change

## Optimization target

Smallest delta to the existing docs-site build. Zero new top-level directories. Zero new npm packages. One new orchestrator script that mirrors `generate-llms-full.ts` in structure: `#!/usr/bin/env tsx`, `import * as fs from 'fs'`, `import * as path from 'path'`, `function main()`. All extraction logic lives in `scripts/truth-ledger/` as plain TypeScript modules imported by the orchestrator. The existing `prebuild` hook gains a chained `&&` call. Tests use the existing vitest setup with a two-line config change (include pattern + environment override per file).

---

## File layout

### New files (10)

| File | Purpose |
|------|---------|
| `docs-site/scripts/build-truth-ledger.ts` | Orchestrator. Calls all 6 extractors, assembles manifest, writes `static/sdk-manifest.json`. Mirrors `generate-llms-full.ts` structure exactly. |
| `docs-site/scripts/truth-ledger/types.ts` | Shared TypeScript interfaces: `ManifestContract`, `ManifestSdkExport`, `ManifestMcpTool`, `ManifestError`, `ManifestCliCommand`, `ManifestAgirailsMdField`, `Divergences`, `SourcifyStatus`. |
| `docs-site/scripts/truth-ledger/tier-map.ts` | Hand-curated `TIER_MAP: Record<string, 'level0' \| 'basic' \| 'standard' \| 'advanced' \| 'internal'>`. Seeds from current `static/sdk-manifest.json` tier sections. Reviewed once per SDK major release. |
| `docs-site/scripts/truth-ledger/known-behavioral-diffs.ts` | Hand-curated `KNOWN_BEHAVIORAL_DIFFS` array (type `BehavioralDiff[]`). Seeds with the confirmed `actp pay --service` TS-vs-Python divergence. Updated manually when new behavioral diffs are found. |
| `docs-site/scripts/truth-ledger/extract-contracts.ts` | Reads both deployment JSONs, reads Foundry `out/` artifacts for ABI shape, runs Sourcify live queries for all contracts where `verifiedOn === 'sourcify'`. Exports `buildContractsSection(): Promise<ManifestContracts>`. |
| `docs-site/scripts/truth-ledger/extract-sdk-api.ts` | Parses `sdk-js/src/index.ts` export lines (text regex) and Python `__init__.py` `__all__` block. Applies tier map. Computes `divergences.ts_only`, `divergences.python_only`, `divergences.name_diffs`. Exports `buildSdkApiSection(): ManifestSdkApi`. |
| `docs-site/scripts/truth-ledger/extract-mcp-tools.ts` | Reads `Platform/agirails-mcp-server/src/index.ts`. Extracts 20-tool `TOOLS` array using the `// ─── Tool definitions` comment marker as anchor. Exports `buildMcpToolsSection(): ManifestMcpTools`. |
| `docs-site/scripts/truth-ledger/extract-errors.ts` | Parses `sdk-js/src/errors/index.ts` for `export class.*extends.*Error` + `super(...)` code string. Parses Python `__init__.py` errors section by comment anchors. Detects name divergences (e.g., `DeadlineExpiredError` TS vs `DeadlinePassedError` Python primary). Exports `buildErrorsSection(): ManifestErrors`. |
| `docs-site/scripts/truth-ledger/extract-cli.ts` | Reads Commander registrations from `sdk-js/src/cli/index.ts` (follows `import` to `commands/` files). Reads Typer `@app.command()` and `app.add_typer()` from `python-sdk-v2/src/agirails/cli/main.py`. Exports `buildCliSection(): ManifestCli`. |
| `docs-site/scripts/truth-ledger/extract-agirailsmd.ts` | Reads `sdk-js/src/config/agirailsmdV4.ts` as text, extracts `AgirailsMdV4Config` interface fields. Cross-references `OWNER:ONBOARDING_START` section in `Platform/agirails.app/web/public/protocol/AGIRAILS.md`. Exports `buildAgirailsMdSection(): ManifestAgirailsMdSchema`. |
| `.github/workflows/truth-ledger-sdk-release.yml` | CI workflow. Triggers on release tags `sdk-js/v*` and `python-sdk/v*`. Runs `npm run build` (which runs prebuild → truth-ledger) in `docs-site/`. Hard-fails if Sourcify returns `no_match` for any contract that deployment JSON marks `verified: true`. Opens a PR updating `static/sdk-manifest.json` with diff annotation. |

### Modified files (2)

| File | Change |
|------|--------|
| `docs-site/package.json` | `prebuild` value: `"tsx scripts/generate-llms-full.ts"` → `"tsx scripts/generate-llms-full.ts && tsx scripts/build-truth-ledger.ts"` |
| `docs-site/vitest.config.ts` | `include` array: add `'scripts/**/*.test.ts'` entry alongside existing `'src/**/*.{test,spec}.{ts,tsx}'`. The test files themselves carry `// @vitest-environment node` pragma to override the default `jsdom` environment. |

### Test files (3 additional)

| File | Purpose |
|------|---------|
| `docs-site/scripts/truth-ledger/extract-contracts.test.ts` | Unit tests for contract extractor: verifies deployment JSON parsing, Foundry artifact ABI extraction, Sourcify response handling (mock fetch). |
| `docs-site/scripts/truth-ledger/extract-sdk-api.test.ts` | Unit tests: verifies TS export parsing, Python `__all__` parsing, divergence calculation. |
| `docs-site/scripts/truth-ledger/build-truth-ledger.test.ts` | Integration smoke test: runs `buildTruthLedger()` against actual monorepo sources (no network), checks output shape matches `ManifestRoot` type, checks `_generated` header fields present. |

**Total new files: 13** (10 implementation + 3 test). 2 files modified.

---

## Build sequence

```
npm run build
  │
  └─→ prebuild hook
        │
        ├─1─ tsx scripts/generate-llms-full.ts
        │      reads:  docs/*.md (29 ordered files + extras)
        │      writes: static/llms-full.txt
        │      ~0.3s
        │
        └─2─ tsx scripts/build-truth-ledger.ts          [NEW]
               │
               ├─ extract-contracts.ts
               │    reads:  deployments/base-{mainnet,sepolia}.json
               │            out/{ContractName}.sol/{ContractName}.json (Foundry artifacts)
               │    fetches: https://sourcify.dev/server/v2/contract/{chainId}/{address}
               │             (9 calls via Promise.all: 4 mainnet + 5 sepolia)
               │    ~1.5–2s (dominated by Sourcify)
               │
               ├─ extract-sdk-api.ts (sync, ~0.1s)
               ├─ extract-mcp-tools.ts (sync, ~0.05s)
               ├─ extract-errors.ts (sync, ~0.05s)
               ├─ extract-cli.ts (sync, ~0.1s)
               ├─ extract-agirailsmd.ts (sync, ~0.05s)
               │
               └─ assembles manifest, writes static/sdk-manifest.json
```

**Total prebuild wall time delta: +2–3s** (Sourcify HTTP dominates).

**CI workflow** triggers separately on SDK release tags: checkouts monorepo, sets `CI=true`, runs `npm run build` (prebuild runs truth-ledger with hard-fail mode), diffs the manifest, opens PR to `redesign-v4` branch.

---

## Module breakdown

### `scripts/build-truth-ledger.ts`

Owns top-level orchestration only. No extraction logic. Calls `buildAll()` which runs extractors and assembles manifest with `_generated` header.

Header fields:
```json
{
  "_generated": true,
  "_doNotEdit": true,
  "_generator": "scripts/build-truth-ledger.ts",
  "_generatedAt": "ISO-8601 string at build time",
  "_sourceVersions": {
    "sdk-js": "from sdk-js/package.json .version",
    "agirails-python": "from python-sdk-v2/pyproject.toml [project].version",
    "mcp-server": "from agirails-mcp-server/package.json .version"
  }
}
```

CI hard-fail: if `process.env.CI === 'true'`, contract with `deployment_claimed_verified: true` but Sourcify `no_match` → `process.exit(1)`.

`MANIFEST_METADATA_KEYS` constant excludes header fields from content equality (PUBLISH_METADATA_KEYS pattern).

No module-level cache — all reads inside `main()` invocation.

### `scripts/truth-ledger/extract-contracts.ts`

Source files read: deployment JSONs (both networks), Foundry `out/` artifacts (5 contract types), Sourcify API.

Key functions: `readDeploymentJson()`, `readFoundryAbi()`, `querySourcify()` (5s AbortController timeout), `buildContractsSection()`.

Sourcify soft-fail logic:
- 200 `exact_match` → `verified_status: "exact_match"`
- 200 `partial_match` → warning, but recorded
- 200 `no_match` → soft locally; hard-fail in CI if deployment JSON says `verified: true`
- 4xx/5xx/timeout → `verified_status: "deployment_claim_only"`, warning, build continues
- X402Relay deprecated status preserved

### `scripts/truth-ledger/extract-sdk-api.ts`

Reads `sdk-js/src/index.ts` and `python-sdk-v2/src/agirails/__init__.py`.

`parseTsExports()` — text regex for `export { ... } from`, `export class/function/interface/type/enum`. Pure text, no eval or `tsc`.

`parsePythonAll()` — finds `__all__ = [` block, extracts quoted strings.

`applyTierMap()` — tiers default to `'standard'` if not in TIER_MAP.

`buildDivergences()` — set difference minus `KNOWN_NAME_ALIASES`, plus hand-curated `KNOWN_BEHAVIORAL_DIFFS`.

### `scripts/truth-ledger/extract-mcp-tools.ts`

Reads `Platform/agirails-mcp-server/src/index.ts`. Locates `const TOOLS = [` (confirmed at ~line 70), uses balanced-bracket counting to find array close. Extracts `name`, `description`, `annotations` per tool.

Guard: if count !== 20, emit `_extraction_warning: true` field.

20 tools confirmed: 5 discovery + 14 runtime + 1 protocol bootstrap.

### `scripts/truth-ledger/extract-errors.ts`

Reads `sdk-js/src/errors/index.ts` for `export class ... extends Error` + `super('CODE_STRING', ...)`.

Reads Python `__init__.py` errors section by comment anchors `# Errors - Base` to `# Utilities - Security`.

Detects TS-only X402 errors (10 classes), Python-only `TransientRPCError`, and `DeadlineExpiredError`/`DeadlinePassedError` name divergence.

### `scripts/truth-ledger/extract-cli.ts`

Reads `sdk-js/src/cli/index.ts` (Commander) + `commands/*.ts` glob.

Reads `python-sdk-v2/src/agirails/cli/main.py` (Typer): `@app.command()` decorators + `app.add_typer(sub, name='X')` sub-apps.

**Critical correctness check**: `actp time` MUST appear in output. This was the false negative from the manual audit at `main.py:146`.

### `scripts/truth-ledger/extract-agirailsmd.ts`

`parseInterfaceFields(file, 'AgirailsMdV4Config')` — balanced-brace counting for interface body. Extracts field name, type, optional/required, JSDoc.

`parseAgirailsMdOnboardingQuestions()` — uses `# OWNER:ONBOARDING_START` comment marker (PHASE3 constraint: markers not regex).

### `scripts/truth-ledger/tier-map.ts`

Hand-curated. Seeds ~80 entries from current `static/sdk-manifest.json` tier sections.

`KNOWN_NAME_ALIASES` exports the cross-SDK name asymmetries (e.g. DeadlineExpiredError↔DeadlinePassedError).

### `scripts/truth-ledger/known-behavioral-diffs.ts`

Hand-curated `BehavioralDiff[]`. Seeds with `actp pay --service` divergence (TS rejects, Python silently ignores).

---

## Failure modes

| Failure | Behavior |
|---|---|
| Sourcify down (5xx/timeout/DNS) | Per-contract: record `verified_status: "deployment_claim_only"`, stderr warning. Build succeeds locally. In CI: still succeeds (locked Q5 decision = soft-fail on network). |
| Source file deleted/renamed | `fs.existsSync()` check before each read. Throws with clear message → `process.exit(1)`. Build fails with explicit path reference. |
| Cross-SDK type mismatch (new TS export not in Python) | Computed automatically into `divergences.ts_only`. Build succeeds. PR diff in CI shows delta. |
| Build runs offline (Vercel cold start, air-gapped CI) | All Sourcify calls timeout at 5s. All contracts get `deployment_claim_only`. Manifest written. Build succeeds. Strict gate only in dedicated CI workflow with network. |
| MCP tool count drift (added/removed without ledger update) | Count mismatch → `_extraction_warning: true` in `mcp_tools` section, stderr warning. Build continues. Self-documenting in manifest. |
| Foundry `out/` absent (no `forge build`) | `readFoundryAbi()` checks existence. Missing → contract entry written without `abi` field, warning. Soft-fail. |

---

## Testability

| Surface | Test approach |
|---|---|
| Contracts | Unit: parse real deployment JSONs, assert addresses + count. Mock `fetch` with vitest `vi.stubGlobal` for Sourcify response variants (exact_match / no_match / network_error). Test soft-fail vs hard-fail paths. |
| SDK API | Unit: run `parseTsExports()` against real `index.ts`, assert known exports present + count in expected range. Run `parsePythonAll()` against real `__init__.py`. Test divergence with fixture arrays. Test tier application (`provide` → `level0`, `MockStateCorruptedError` → `internal`). |
| Cross-boundary compat | `build-truth-ledger-sdk-compat.test.ts`: reads output `static/sdk-manifest.json` post-build, validates with local re-implementation of consumer parser from `index-docs.ts:40`. Per PHASE3 pattern: NO import of consumer package. |
| MCP tools | Assert count === 20, all 20 names present (hardcoded list in test), Layer 1/2/3 counts (5/14/1). |
| Errors | Assert `InsufficientFundsError` has code `'INSUFFICIENT_FUNDS'`, `DeadlineExpiredError` has code `'DEADLINE_EXPIRED'`, X402 family count ≥ 9, name divergence detected. |
| CLI | **`actp time` MUST be in output** (the audit false-negative). Assert all known commands from current manifest baseline. |
| AGIRAILS.md V4 | Assert `name`, `slug`, `intent`, `services`, `pricing`, `network`, `sla`, `covenant` fields present. Assert `intent` type union includes `'earn' \| 'pay' \| 'both'`. Assert onboarding question IDs present. |

---

## Operating cost

| Metric | Value |
|---|---|
| Build time delta | +2–3s per `npm run build` (Sourcify 9 calls dominate, ~1.5–2s; parsing ~0.5s) |
| New npm deps | **0** (native `fetch` on Node ≥ 20, confirmed by docs-site `engines.node: ">=20.0"`) |
| New Python deps | **0** (Python source read as text, interpreter not invoked) |
| Bundle size impact | **0** (build-time only; not in Docusaurus output) |
| Maintenance surface | ~400 lines `tier-map.ts` (reviewed once per SDK major); ~10 lines `known-behavioral-diffs.ts` growing slowly |
| Vercel build minutes | +2–3s per deployment — negligible |

---

## Migration sequence

| When | What |
|---|---|
| Day -1 (already shipped) | LLM machine-surface quarantine; not part of truth-ledger pipeline |
| Week 1 Day 1–2 | Scaffold `scripts/truth-ledger/` dir; write `types.ts`, `extract-contracts.ts` + test; stub orchestrator with contracts only |
| Week 1 Day 3–4 | Write `tier-map.ts`, `known-behavioral-diffs.ts`, `extract-sdk-api.ts` + test, `extract-errors.ts`; extend orchestrator |
| Week 1 Day 5 | Write `extract-mcp-tools.ts`, `extract-cli.ts` (verify `actp time` appears), `extract-agirailsmd.ts`; complete orchestrator |
| Week 2 Day 1 | Wire `package.json` prebuild + `vitest.config.ts` include; verify full chain; verify `index-docs.ts:40` still resolves |
| Week 2 Day 2 | Write `.github/workflows/truth-ledger-sdk-release.yml`; test with `act` |
| Week 2 Day 3 | Retire hand-maintained 2026-02-21 `sdk-manifest.json` snapshot |
| Week 3+ | Truth-ledger runs every deploy; updates `tier-map.ts` per SDK major; `divergences.ts_only` shrinks as Python parity sprint completes |

---

## Strengths

- **Zero new dependencies.** Uses `fetch` (Node ≥ 20), `fs`, `path`. No supply chain surface, no lockfile churn.
- **Follows established pattern exactly.** `build-truth-ledger.ts` is structurally identical to `generate-llms-full.ts`. Any developer who understands the existing script understands the new one in 60 seconds.
- **Replaces hand-maintained file in place.** `static/sdk-manifest.json` path unchanged. `index-docs.ts:40` requires no modification. Manifest grows a header; rest is superset of existing shape.
- **Soft-fail by default, hard-fail only in CI.** Local + Vercel deploys always succeed even with Sourcify down. Dedicated CI workflow applies strict gate.
- **Self-documenting divergence tracking.** `divergences` section in manifest is always current — no manual tracking document. During Python parity sprint, manifest shows real-time progress.

---

## Weaknesses

- **Sourcify adds 1.5–2s to every local build.** 9 HTTP calls every `npm run build`. AbortController bounds worst case at 5s × 9 = 45s degenerate, but normal latency is sub-2s. Future improvement: local cache with mtime-based invalidation (PHASE3 allows explicit-mtime invalidation, not module-level cache).
- **Text-regex parsing is fragile to formatting changes.** If barrel files switch to multi-line export blocks, parsers need updating. Currently both use single-line per block (confirmed).
- **CLI extraction depth-limited.** Globs `commands/*.ts` only. If CLI gains sub-command directories (`commands/tx/*.ts`), glob needs updating. Current flat layout fits.
- **`tier-map.ts` is manually maintained.** ~400 entries reviewed per SDK major. Unmapped exports silently default to `'standard'`. No build-gate for tier coverage completeness. Post-v1 mitigation: `@tier` JSDoc tags + `__tier__` docstring (per PHASE3 Q6 post-v1 plan).
- **`known-behavioral-diffs.ts` cannot be machine-verified.** Entries can become stale (documenting a fixed divergence). Each entry should carry `reported_at` date + tracking issue reference.
