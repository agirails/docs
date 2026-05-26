# Phase 3 — Truth-ledger clarifying decisions (LOCKED)

**Status**: locked 2026-05-26 by Damir's "kreni redom sve" instruction (all defaults accepted).
**Source**: synthesis of 3 codebase explorers (source structure, docs-site build, similar-pattern precedents).
**Next**: Phase 4 — architecture design with 3 parallel architect agents.

---

## Locked decisions

### Q1 — Truth-ledger location → `docs-site/scripts/`

Extends existing pattern (`generate-llms-full.ts`, `lint-addresses.sh`). Lowest risk; if n8n/claude-plugin need consumption later, factor to top-level `tools/truth-ledger/` package post-MVP.

### Q2 — Output file → REPLACE `static/sdk-manifest.json` in place

- Same path (no `index-docs.ts` breakage)
- Auto-generated, replaces hand-maintained 2026-02-21 snapshot pinned at SDK 2.7.0
- Add header fields:
  ```json
  {
    "_generated": true,
    "_doNotEdit": true,
    "_generator": "scripts/build-truth-ledger.ts",
    "_generatedAt": "2026-MM-DDTHH:MM:SSZ",
    "_sourceVersions": {
      "sdk-js": "4.0.0",
      "agirails": "3.0.1",
      "mcp-server": "0.2.0"
    }
    // ... rest of manifest
  }
  ```

### Q3 — Build trigger → BOTH prebuild + CI

- **`prebuild` hook** in `docs-site/package.json` — runs on every `npm run build` (local dev, Vercel deploy)
- **CI workflow on SDK release tag** — opens PR against docs-site updating manifest + diff annotation. Triggers on `sdk-js` and `python-sdk-v2` release tags
- Defense in depth: prebuild catches local drift; CI catches release-driven drift

### Q4 — Cross-SDK divergence → BOTH `divergences` section AND per-entry flags

```json
{
  "divergences": {
    "ts_only": ["agent", "X402Error", "X402ConfigError", "..."],
    "python_only": ["TransientRPCError"],
    "name_diffs": [
      {"concept": "deadline_expired", "ts": "DeadlineExpiredError", "python": "DeadlinePassedError", "python_has_alias": true}
    ],
    "behavioral_diffs": [
      {"command": "actp pay --service", "ts": "rejected with PAY_SERVICE_REJECTION_MESSAGE", "python": "silently ignored"}
    ]
  },
  "errors": {
    "DeadlineExpiredError": {
      "code": "DEADLINE_EXPIRED",
      "ts_class": "DeadlineExpiredError",
      "python_class": "DeadlinePassedError",
      "python_alias": "DeadlineExpiredError",
      "...": "..."
    }
  }
}
```

### Q5 — Sourcify verification → LIVE QUERY AT BUILD, FAIL SOFT

- Build script calls `https://sourcify.dev/server/v2/contract/{chain}/{address}` for each contract in deployment JSON
- If 200 + match → record `verified_status: "exact_match"` + `verified_at: <build time>`
- If 200 + no_match → fail hard (something is wrong)
- If 5xx or timeout → fall back to deployment JSON, record `verified_status: "deployment_claim_only"` + warning emitted
- CI gate hard-fails on mismatch between deployment JSON `verified: true` and live `no_match`
- Build cost: ~3s, 8 HTTP calls (4 mainnet + 4 sepolia)

### Q6 — Tier tagging → HAND-CURATED for v1

- Truth-ledger script imports a mapping table: `{export_name: tier}` for both SDKs
- Tiers: `level0` | `basic` | `standard` | `advanced` | `internal`
- Lives at: `docs-site/scripts/truth-ledger/tier-map.ts`
- Reviewed/updated when SDK adds exports (one PR per major release)
- **Post-v1**: introduce `@tier` JSDoc tag in sdk-js + `__tier__ = "level0"` docstring convention in python-sdk-v2; truth-ledger reads from source. One migration PR per SDK.

### Q7 — Shared hashing utility → IGNORE FOR V1

- Truth-ledger does NOT compute `config_hash` (it references pre-computed values from `{slug}.md` identity files)
- If we later need to compute hashes, factor out `@agirails/protocol-utils` package
- Drift risk between `agirailsmd.ts` and `web/lib/ipfs/config-hash.ts` is a SEPARATE refactor item (not blocking truth-ledger)

### Q8 — Day -1 quarantine scope → FULL (including optional banners)

All of:
- `static/llms-full.txt` regenerate with V3 mainnet + V4 sepolia addresses
- `static/llms.txt` regenerate
- `docs/contract-reference.md` sweep — 8 addresses to current
- `robots.txt` — create with AI-crawler allowlist (`GPTBot`, `ClaudeBot`, `Google-Extended`, `PerplexityBot`, `CCBot`)
- `sitemap.xml` — verify Docusaurus-generated content is current
- Stub 3 most-broken pages (`agirailsmd-config.md`, `crewai.md`, `api-pay-per-call.md`) with "rewrite in progress" banner

Total Day -1 effort: ~3-4h. Single direct commit to main. Not part of branch-and-flip.

---

## Design constraints carrying into Phase 4

From Explorer 3 precedents + anti-patterns:

**MUST follow** (proven patterns):
1. Use `yaml.stringify({lineWidth: 120, singleQuote: false})` for any YAML output — never hand-roll
2. Use named comment markers (e.g., `# OWNER:ONBOARDING_START`) when templating — never regex
3. Build-time embed (bake template into bundle) OR explicit mtime-based cache invalidation — never module-level uninvalidated cache
4. Single `PUBLISH_METADATA_KEYS`-equivalent constant for "do not include in hash" fields
5. Cross-boundary compat test pattern: `{generator}-sdk-compat.test.ts` mirrors consumer parser without importing consumer package
6. `canonicalize()` rule: primitive arrays sort, object arrays preserve order
7. Reuse `DiffResult` enum vocab: `'in-sync' | 'local-ahead' | 'remote-ahead' | 'diverged'`

**MUST avoid** (anti-patterns):
1. Hand-rolled YAML serialization (T-1 bug class)
2. Duplicate hash algorithm copies (already drifted in `web/lib/ipfs/config-hash.ts`)
3. Module-level string cache without invalidation
4. Regex-based frontmatter section detection (silent failure mode)
5. Conditional body sections via repeated `if (isProvider)` checks — extract context object once

---

## Phase 4 brief for architect agents

Each architect agent designs a truth-ledger pipeline meeting all 8 locked decisions above. Three different optimization targets:

**A1 — Minimal changes**: smallest delta to existing build, maximum reuse of `generate-llms-full.ts` pattern.
**A2 — Clean architecture**: best long-term abstractions, factor-out friendly, opinionated.
**A3 — Pragmatic balance**: ship-in-1-week, debt-aware.

All three must answer:
- File layout: which files exist, what they own
- Build sequence: which script runs when, with what inputs/outputs
- Failure modes: what happens when Sourcify is down, source is malformed, output diffs unexpectedly
- Testability: how is correctness verified per extraction surface
- Operating cost: build time, dependency footprint

Output saved to `docs-site/.audit/ARCH_A1.md`, `ARCH_A2.md`, `ARCH_A3.md` respectively.
