---
slug: workflow-attested-publish-v4
title: "Workflow-Attested npm Publish — Apex FIND-001 Closed"
authors: [agirails]
tags: [release, engineering, governance]
---

Starting with `@agirails/sdk@4.0.0`, every release of the SDK ships with a cryptographic chain of custody that ties the tarball on npm back to a specific commit + workflow run on GitHub. No long-lived NPM token, no laptop in the loop — just OIDC, sigstore, and SLSA provenance. This is the first attested release in the AGIRAILS org and closes Apex audit finding FIND-001.

<!-- truncate -->

## What changed

Every prior release of `@agirails/sdk` (1.x, 2.x, 3.x, and the 4.0.0-beta series) was published by typing `npm publish` from a laptop. That works, but the supply-chain audit story is "trust the maintainer's machine and their npm token." If either is compromised, an attacker can publish anything as `@agirails/sdk`.

Starting with 4.0.0:

1. Push a `v*.*.*` git tag to `agirails/sdk-js`.
2. GitHub Actions checks out, installs, builds, tests, lints, then calls `npm publish --provenance`.
3. The workflow requests a short-lived OIDC token from GitHub identifying the run (repo + workflow filename + commit SHA).
4. The npm registry verifies that OIDC token against a Trusted Publisher configured on `@agirails/sdk` — no NPM token, no shared secret.
5. sigstore signs the published tarball; an SLSA v1 provenance attestation records what was built and from where.

Two attestations end up attached to the npm record:

- `npm/attestation/specs/publish/v0.1` — the publish attestation
- `slsa.dev/provenance/v1` — the SLSA build provenance

Anyone can verify the chain externally:

```bash
npm audit signatures @agirails/sdk@4.0.0
# 1 package have verified registry signatures

curl -sS https://registry.npmjs.org/-/npm/v1/attestations/@agirails/sdk@4.0.0 \
  | jq '.attestations | length, [.[].predicateType]'
# 2
# ["https://github.com/npm/attestation/tree/main/specs/publish/v0.1",
#  "https://slsa.dev/provenance/v1"]
```

The attestations point back at the workflow run, the workflow's filename, and the commit it published from. Tampering with any of those would invalidate the sigstore signature.

## Why this matters

Apex's 2026-05-17 source-level audit flagged FIND-001 with this framing: "the SDK's supply chain is currently as strong as the maintainer's laptop and npm token." That's a fair summary of how most npm packages still operate, and it's the failure mode behind a long tail of recent ecosystem incidents (event-stream, ua-parser-js, `tj-actions/changed-files`).

Workflow attestation cuts the trust surface in three ways:

- **No long-lived token.** There is no `NPM_TOKEN` secret in the GitHub repo for `sdk-js`. The OIDC handshake is per-run, scoped to the workflow that triggered it. A compromised laptop can no longer publish.
- **Build provenance is verifiable post-hoc.** Months from now a consumer auditing `4.0.0` can re-derive which commit, which workflow file, and which CI run produced the artifact. If the answer doesn't match what's on GitHub, something is wrong.
- **Tag → workflow is the only path.** Local `npm publish` is gone for `@agirails/sdk`. The publish flow now requires (a) push access to `sdk-js`, (b) the workflow on `main` actually running, (c) the Trusted Publisher config on npmjs.com matching the run. Three independent gates instead of one.

## Workflow internals

The workflow at [`.github/workflows/publish.yml`](https://github.com/agirails/sdk-js/blob/main/.github/workflows/publish.yml) fires on annotated tags matching `v*.*.*`. Pinning notes:

- **Action SHAs pinned, not tags.** Every third-party action (`actions/checkout`, `actions/setup-node`) is pinned by full-length commit SHA, never `@vN`, per the Apex audit's reference to the `tj-actions/changed-files` class of compromise (CVE-2025-30066). Tags on actions are mutable; SHAs aren't.
- **npm 11 explicit.** Node 20 LTS ships npm 10.x. Trusted Publisher OIDC (tokenless publish + sigstore provenance) needs npm 11.5.1+, so the workflow runs `npm install -g npm@11` before publish.
- **No `NODE_AUTH_TOKEN` env.** An empty value for that env var actually blocks npm from falling through to the OIDC path — so the step deliberately sets no token env at all.
- **dist-tag auto-detection from version.** Stable versions (no `-` in the version string) publish to `@latest`; `-beta.X` to `@next`; `-alpha.X` to `@alpha`; `-rc.X` to `@rc`. Removes the manual `npm dist-tag` follow-up step.
- **Tag-version mismatch fails loud.** A pre-publish check rejects mistagged commits where `package.json#version` doesn't match the tag — keeps an accidentally-tagged commit from clobbering `@latest`.

## Same pattern across the ecosystem

The same workflow shipped to two more packages on 2026-05-19 / 2026-05-20:

- [`n8n-nodes-actp@2.5.0`](https://www.npmjs.com/package/n8n-nodes-actp) — workflow-attested
- [`@agirails/mcp-server@0.2.0`](https://www.npmjs.com/package/@agirails/mcp-server) — workflow-attested

Same OIDC + sigstore + SLSA flow. Verify them the same way (`npm audit signatures`, attestations endpoint).

## What still uses local publish

- **`agirails` on PyPI** (Python SDK) — separate `poetry publish` path. Adding equivalent attestation is queued.
- **Internal-only repos** (`agirails-market`, `publish-proxy`, etc.) — not published.

## Resources

- [Apex audit summary](https://github.com/agirails/sdk-js/security) (FIND-001 closure)
- [Trusted Publishers on npm Docs](https://docs.npmjs.com/trusted-publishers)
- [sigstore](https://sigstore.dev/)
- [SLSA v1 spec](https://slsa.dev/spec/v1.0/)
- [Workflow source](https://github.com/agirails/sdk-js/blob/main/.github/workflows/publish.yml)
- [Discord](https://discord.gg/nuhCt75qe4)
