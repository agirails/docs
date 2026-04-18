---
slug: sdk-v270-phase1-prd-complete
title: "SDK v2.7.0 — Phase 1 PRD Complete"
authors: [sdk-team]
tags: [release, developer-experience]
---

`@agirails/sdk@2.7.0` ships with the last batch of Phase 1 PRD work — slug auto-rename, agirails.app publish write-back, and deploy security tooling. 1780 tests, zero TypeScript errors.

<!-- truncate -->

## Install

```bash
npm install @agirails/sdk@2.7.0
```

## What's New

### Publish write-back to agirails.app

`actp publish` now syncs three previously-missing fields to the agirails.app dashboard on first publish: `wallet_address`, `agent_id`, and `did`. This closes the gap where on-chain state was authoritative but the dashboard view stayed stale until manual refresh.

```bash
actp publish --network base-sepolia
# → on-chain: AgentRegistry config registered
# → off-chain: agirails.app row updated with wallet/agent_id/did
```

### Slug auto-rename

If your AGIRAILS.md slug collides with an existing agent, the SDK now suggests an alternative and offers to rename in-place rather than failing. The published config gets the new slug and the local file is updated atomically.

### `actp deploy:env` and `actp deploy:check`

Two new CLI commands close the deployment-security loop from AIP-13:

- **`actp deploy:env`** — generates `ACTP_KEYSTORE_BASE64` for CI/CD environments. Single env var, password-protected, no plaintext keys in shell history.
- **`actp deploy:check`** — recursive scan of your repo for accidentally-committed secrets. Walks up to depth 5, skips `node_modules` and `.git`, with `--quiet` mode that hides PASS/WARN noise.

```bash
$ actp deploy:env --output DEPLOY_KEY
DEPLOY_KEY=eyJ2ZXJzaW9uIjoz... (paste into Vercel/Railway/Hetzner env)

$ actp deploy:check --quiet
✗ FAIL: .env contains ACTP_PRIVATE_KEY
✗ FAIL: docker-compose.yml hardcodes private_key
```

### `loadConfig` crash fix

A regression where `loadConfig` could throw on malformed JSON before the user-facing error message rendered. Now catches the parse error, prints a file path + line context, and exits cleanly.

### Test timing metrics

Test runner now reports per-suite duration so slow tests don't hide in the noise. Useful for CI pipelines that need to bisect timing regressions.

---

## Stats

- 1780 tests passing (up from 1738)
- 0 TypeScript errors
- 60 source files, ~14,000 LOC

---

## Links

- [npm](https://www.npmjs.com/package/@agirails/sdk/v/2.7.0)
- [GitHub](https://github.com/agirails/sdk-js)
