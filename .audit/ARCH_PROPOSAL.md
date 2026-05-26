# Truth-ledger architecture — synthesis + recommendation

**Status**: Phase 4 synthesis, awaiting Damir's pick (A1 / A2 / A3 / hybrid)
**Date**: 2026-05-26
**Inputs**: [`ARCH_A1.md`](./ARCH_A1.md) (minimal change), [`ARCH_A2.md`](./ARCH_A2.md) (clean architecture), [`ARCH_A3.md`](./ARCH_A3.md) (pragmatic balance)

---

## At-a-glance comparison

| Dimension | A1 (minimal) | A2 (clean) | A3 (pragmatic) |
|---|---|---|---|
| **New files** | 13 (10 + 3 tests) | 14 (12 + 2 tests + fixtures) | 7 (1 orch + 1 tier-map + 5 extractors) |
| **New npm deps** | 0 | 0 (uses existing typescript dep) | 0 |
| **Build time delta** | +2-3s | +5-8s | +4-5s |
| **Quality on day 1** | All 6 surfaces full quality | All 7 surfaces full quality, AST-based | 5 full + 3 v0.5 pass-through |
| **TS parsing** | Text regex on barrel | `ts.createProgram` AST walk | Barrel regex |
| **Python parsing** | `__all__` line scan | State machine + `__tier__` scan | `__all__` scan |
| **CLI extraction** | Glob `commands/*.ts` + parse | Recursive `execFile actp --help` | Pass-through from old manifest (v0.5) |
| **MCP tools** | Balanced-bracket counting in source | AST walk | Regex on TOOLS array |
| **Errors** | Class + super() arg regex | AST walk both SDKs | Class + super() regex |
| **AGIRAILS.md V4** | Interface field extraction | `parseAgirailsMd` imported from SDK | YAML frontmatter parse |
| **Cross-SDK divergences** | Set diff with hand-curated aliases | Cross-SDK join in `normalize.ts` (isolated) | Set diff inline in orchestrator |
| **Sourcify** | Live query, fail-soft, hard-CI | Live query, fail-soft, hard-CI (CI_STRICT env) | Live query, fail-soft, hard-CI |
| **Atomic write** | Direct `writeFileSync` | `.tmp` + `rename` atomic | Direct `writeFileSync` |
| **Tier source** | Hand-curated map + `KNOWN_NAME_ALIASES` | Hand-curated map + `tier_from_source` flag pre-wired for `@tier` migration | Hand-curated map |
| **Test pattern** | Unit + cross-boundary compat | Unit + snapshots + cross-boundary compat | Compat test on output JSON shape |
| **Effort estimate** | ~10-14h | ~13-18h | ~13-15h (1 week, 5 days × 3h) |
| **Migration to `tools/`** | Refactor required | File copy + 4 lines in package.json | Refactor required |
| **Footprint of complexity** | Flat, legible at first glance | 3 named layers, 9 abstractions | Flat, intentional debt log |

---

## Honest comparison along the locked constraints

All three meet Q1-Q8 of [PHASE3_DECISIONS.md](./PHASE3_DECISIONS.md). The differences are in **how** they meet them and **what tradeoffs** they make outside the constraints.

### Parsing robustness

A1 uses regex on the SDK barrel files. The barrel files are currently formatted in a way that supports this (single-line `export { ... } from '...'` blocks confirmed by Explorer 1). But: a future refactor to multi-line exports, a re-export with `* as namespace`, or a TypeScript-only `export type` would silently break the regex. The failure mode is *invisible* — wrong symbol list in the manifest, no exception thrown.

A2 uses `ts.createProgram` which already exists as a devDep (Docusaurus uses `tsc` for type checks). AST is robust to formatting changes, type-only exports, namespace exports, re-exports. The failure mode is *visible* — parser throws on broken syntax, build fails cleanly.

A3 uses regex (like A1) but admits the debt explicitly in D6: "MCP tools parsed with regex, not AST".

**Verdict**: A2's AST-based parsing is the right choice for production-grade extraction. It's free (no new dep), it's robust, and it future-proofs against formatting changes. A1 and A3 both carry a quiet-failure risk.

### Cross-SDK comparison location

A1 computes divergences inline in `extract-sdk-api.ts`. Functional but couples the comparison to one extractor.

A2 isolates comparison in `normalize.ts`. Extractors stay pure (single-surface), comparison logic lives in one auditable place. Adding a new SDK (say, Rust SDK) is one extractor + extending `normalize.ts` — extractors don't need to know about each other.

A3 computes divergences inline in the orchestrator. Pragmatic but mixes orchestration with logic.

**Verdict**: A2's isolation is cleaner. A1 and A3 are workable but make future cross-SDK changes harder.

### CLI extraction quality

A1: globs `commands/*.ts`, parses Commander registrations. Real source extraction.

A2: spawns `actp --help` recursively. Source-of-truth is the **runtime** CLI binary, not the source. Catches divergences between source and shipped binary (the kind of failure that produced the `actp time` false-negative in the manual audit).

A3: pass-through from existing hand-maintained manifest. Debt acknowledged, fix planned for v0.6. Works because current CLI data is accurate.

**Verdict**: A2's runtime `--help` walk is the most reliable. A1's source parse is reasonable. A3 has explicit debt here.

### File count and cognitive load

A1: 13 files in flat layout. Each file is a focused single-responsibility module.
A2: 14 files in 3-layer structure. More abstractions to learn but each is justified.
A3: 7 files. Lowest cognitive cost.

**Verdict**: For a v1 ship that one person maintains, A3 is most legible. For a system meant to outlive its author, A2's structure pays back in maintainability.

### Migration to `tools/truth-ledger/`

A1: refactor required if/when n8n/claude-plugin consume.
A2: file copy + barrel export + 4 package.json lines.
A3: refactor required.

**Verdict**: Only A2 designs for post-v1 reuse. A1 and A3 both build for docs-site-only consumption. If we expect n8n/claude-plugin to integrate within 6 months, A2's preparation pays. If not, it's overhead.

---

## Recommendation

**Pragmatic blend: A1 baseline + A2 borrowings.**

The three options are not exclusive — they share constraints, differ in degrees. A1's flat layout is the right baseline (legible, fast to ship). But two of A2's choices are clearly better and add zero cost:

### Borrow from A2 into A1

1. **`ts.createProgram` for `sdk-api-ts.ts`** — replace A1's text regex. Zero new dep (typescript is already devDep). Robust to formatting changes. ~30 min of additional implementation.

2. **`tier_from_source` flag pre-wiring** — A1 currently has hand-curated tier map only. Adding the flag to `NormalizedSymbol` (even if `normalize.ts` ignores it in v1) makes the `@tier` JSDoc migration zero-friction post-v1. ~5 min change.

### Reject from A2

3. **Skip 3-layer formal abstraction** (`NormalizationPipeline`, `DivergenceComputer`, `ManifestEmitter`). A1's flat structure is more legible for a 7-extractor system that won't grow. The abstractions buy "factor-out to tools/" optionality at the cost of cognitive load now.

4. **Skip recursive `actp --help` walk** for v1. A1's source-parse approach is fine for now; runtime walk is a v1.5 improvement if we hit a source/binary divergence.

### Reject from A3

5. **Don't accept the CLI pass-through debt**. A3's biggest pragmatic compromise is reading from the existing hand-maintained `sdk-manifest.json` cli section. That same hand-maintained data produced false negatives in the audit. Better to actually extract from source on day 1, even if it's the simpler glob-based A1 approach.

6. **Don't accept SDK signatures deferred to v0.6**. A3 ships symbol names only. Content writers will want to reference signatures in `/reference/sdk-{js,python}/*` pages. v1 should include at least *some* type info even if not full signatures.

### Borrow from A3

7. **Day-by-day implementation plan**. A3's structured 5-day breakdown is the most actionable. Even if we pick A1 baseline, schedule it day-by-day per A3's template.

8. **Explicit debt log**. A3's named debt items with "fix in v0.6" markers are valuable practice. Adopt for whatever items remain after the blend.

---

## Final recommended architecture: "A1+"

The hybrid above produces an architecture I'll call **A1+**:

- **File layout**: A1's flat 13-file structure
- **TS parsing**: A2's `ts.createProgram` (single substitution into A1)
- **Python parsing**: A1's `__all__` line scan + A2's `__tier__` attribute scan added
- **CLI**: A1's glob + Commander parse (NOT A3 pass-through, NOT A2 runtime walk for v1)
- **MCP**: A1's balanced-bracket counter
- **Errors**: A1's class regex + super() arg extract
- **AGIRAILS.md V4**: A2's `parseAgirailsMd` import from SDK (avoids drift; PHASE3 constraint 2)
- **Cross-SDK comparison**: A1's location (inline in sdk-api extractor) — accept the coupling
- **Sourcify**: All three agree, A1's `Promise.all` with `AbortController` 5s
- **Atomic write**: Add A2's `.tmp` + rename (one-liner)
- **`tier_from_source` flag**: Pre-wire per A2 design

**Effort**: ~12-14h (A1's estimate + 1-2h for A2 borrowings).
**Files**: 14 (A1's 13 + A2-style atomic write helper).
**Build time**: +3-4s (between A1 and A3).
**Cognitive load**: A1-level legibility (no 3-layer formalism).
**Future-proofing**: Robust parsing, `@tier` migration pre-wired.
**Debt**: One acknowledged item — `KNOWN_BEHAVIORAL_DIFFS` hand-curated table. Per A3's pattern.

---

## Decision request to Damir

Pick one:

| Option | Pick if |
|---|---|
| **A1 as-is** | Want simplest path, accept text-regex fragility |
| **A2 as-is** | Want production-grade architecture, accept higher initial effort + 14 files |
| **A3 as-is** | Want fastest ship (1 week), accept CLI pass-through debt + SDK signatures deferred |
| **A1+ (recommended)** | Want A1's legibility with A2's AST robustness + atomic write + pre-wired tier migration |

Default: **A1+**.

Once picked, Phase 5 (implementation) begins. Per FINAL_PLAN, implementation is gated on Damir's explicit go. Per /loop mode, will wake on architect notification (done) and request your call before kicking off Phase 5.

---

## What's saved alongside this

- [`ARCH_A1.md`](./ARCH_A1.md) — full A1 design (minimal change)
- [`ARCH_A2.md`](./ARCH_A2.md) — full A2 design (clean architecture)
- [`ARCH_A3.md`](./ARCH_A3.md) — full A3 design (pragmatic balance)
- [`PHASE3_DECISIONS.md`](./PHASE3_DECISIONS.md) — locked Q1-Q8 constraints
- [`FINAL_PLAN.md`](./FINAL_PLAN.md) — 3-week branch-and-flip execution plan
- [`CODEX_REVIEW.md`](./CODEX_REVIEW.md) — Codex external review corrections
- [`SUMMARY.md`](./SUMMARY.md) — audit rollup (26 P0 / 17 P1 / 5 P2)
- This file is the synthesis layer.
