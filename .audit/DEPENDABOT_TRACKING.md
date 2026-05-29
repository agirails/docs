# Dependabot vulnerability tracking

**Purpose**: Apex DR-5 split the report's single Dependabot footnote into two repos with very different risk profiles. The runtime trio on `agirails/agirails.app` belongs on a remediation schedule now; `agirails/docs` is build-time risk only (lower priority) but not zero because preview builds and deploy hooks execute dependency code at build time, which is the OIDC-token-from-runner-memory surface in our supply-chain doctrine.

**Last updated**: 2026-05-29. Stats here are point-in-time and drift; check GitHub Security tab for current state.

## agirails/agirails.app: runtime exposure (schedule remediation)

Live Next.js app at `agirails.app`. Vulnerable deps execute on every request.

| Package | Severity | Risk class | Action |
|---|---|---|---|
| `fast-uri` | HIGH | URL parsing edge cases | Patch to current latest in next dep PR |
| `picomatch` | HIGH | ReDoS on user-controlled glob patterns | Patch to current latest; audit any caller path where user input reaches picomatch |
| `flatted` | HIGH | Prototype pollution in JSON serialization | Patch to current latest; audit any caller path where user input is flatted-serialized |
| Other 4 HIGH (rotates) | varies | varies | Patch per Dependabot PR |
| Other 7 MEDIUM | varies | varies | Patch in next dep batch |

**Cadence**: monthly batch patch PR for any HIGH; quarterly batch for MEDIUM. Out-of-band patch for any HIGH with confirmed exploit in the wild (track via OSV-DB and GitHub Security advisories).

**Owner**: same human/team that pushes `agirails.app` deploys.

## agirails/docs: build-time exposure (lower priority, still patch)

Static docs site. No runtime dep execution on docs.agirails.io; deps execute during the Docusaurus build only.

| Package | Severity | Risk class | Action |
|---|---|---|---|
| `vite` | HIGH | build-time only; deploy-token surface on the runner | Patch at hygiene cadence (quarterly) |
| `babel` | HIGH | build-time only | Patch at hygiene cadence |
| `lodash` | HIGH | build-time and may ship to a few bundled pages | Patch at hygiene cadence |
| `path-to-regexp` | HIGH | build-time only | Patch at hygiene cadence |
| `fast-uri` | HIGH | build-time only | Patch at hygiene cadence |
| Other 3 HIGH + 22 MEDIUM | varies | build-time only | Quarterly batch |

**Why "still patch" not "ignore"**: build-pipeline OIDC tokens, deploy hooks, GitHub Actions workflows execute dependency code at build time. A vulnerable build-time dep can leak the deploy token from runner memory; that token publishes to npm or pushes to GitHub. This is the [Shai-Hulud / TanStack pattern](https://github.com/agirails/sdk-js/blob/main/CLAUDE.md) we already model as supply-chain attack surface. Don't ignore build-time vulns just because they aren't runtime.

**Cadence**: quarterly batch patch PR for all HIGH; semi-annual for MEDIUM. Out-of-band for any confirmed RCE in the build path.

**Owner**: docs team (Damir, Apex).

## Process

1. Dependabot opens per-package PRs into both repos automatically.
2. Per the cadences above, batch the PRs into one consolidated dep-update PR.
3. Run full test suite + manual smoke on the build / deploy.
4. Merge as a single commit so the dep-bump batch is itself reviewable and revertable.
5. After merge, verify the GitHub Security tab no longer flags the patched CVEs.

## Build-pipeline isolation strategy

For `agirails/docs` build-time vulns specifically, the mitigation strategy is layered:

1. **OIDC trusted publisher** is configured on all npm + PyPI packages this repo can affect; no long-lived tokens to steal.
2. **GitHub Actions workflows are SHA-pinned** for any third-party action (Codecov, Anthropic, etc.). A compromised tag of an action cannot replay against our pipeline.
3. **Truth-ledger SHA pins** (added Wave A.21 part 3) gate any propagation from upstream SDK sources; even a compromised dep that altered extracted output requires a pin bump to land.
4. **Vercel deploys are isolated per-branch**; a poisoned build of one branch can not directly affect production deploys.

These don't excuse leaving build-time CVEs unpatched; they reduce the blast radius if a patch lands late.

## Historical record

This file replaces the single "Dependabot vulnerabilities" footnote in REWRITE_REPORT.md that was overstated (the report cited 23H/34M/1L for docs and 15H/9M for app; Apex verification found 8H/22M and 7H/7M respectively). The actual current counts drift continuously; treat the table above as a snapshot of structure (which packages, which risk classes), not as a live count. The live count is in the GitHub Security tab.

## Related

- [REWRITE_REPORT.md](./REWRITE_REPORT.md): the rewrite that flagged Dependabot but did not schedule it.
- [CROSS_REPO_COMMIT_POLICY.md](./CROSS_REPO_COMMIT_POLICY.md): related supply-chain hardening (commit pattern, not dep counts).
- [GEO_PROBE.md](./GEO_PROBE.md): the other deferred-but-tracked measurement.
