---
slug: sepolia-redeploy-security-hardening
title: "Sepolia Redeploy + 3 Critical Dependabot Fixes"
authors: [protocol-team]
tags: [governance, engineering]
---

Fresh Base Sepolia stack went live April 15 — new `ACTPKernel`, `EscrowVault`, `AgentRegistry`, `ArchiveTreasury`, and a redeployed `X402Relay`. Plus three Dependabot-flagged criticals closed via npm overrides.

<!-- truncate -->

## What got redeployed

| Contract | Old (Feb 6) | New (Apr 15) |
|---|---|---|
| ACTPKernel | `0xeaE4...` | `0x469CBADbACFFE096270594F0a31f0EEC53753411` |
| EscrowVault | `0xb7bC...` | `0x57f888261b629bB380dfb983f5DA6c70Ff2D49E5` |
| MockUSDC | `0x4d9b...` | `0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb` |
| AgentRegistry | `0xbf9A...` | (canonical CREATE2 — unchanged on testnet) |
| ArchiveTreasury | (n/a) | `0x866ECF4b0E79EA6095c19e4adA4Ed872373fF6b7` |
| X402Relay | (mainnet only) | `0x4DCD02b276Dbeab57c265B72435e90507b6Ac81A` |

The redeploy consolidates: per-tx penalty lock (`requesterPenaltyBpsLocked`), tighter resolver gate, dust guard on X402Relay, and milestone-settle path. Deployments JSON shipped with the SDK so `npm install @agirails/sdk@latest` picks up the new addresses automatically.

## On-chain smoke suite

Verified via `SmokeOnChainSuite.s.sol` — 4 sub-tests in a single broadcast:

1. **X402Relay dust guard** — `payWithFee(amount == MIN_FEE)` reverts cleanly (provider would receive nothing)
2. **X402Relay happy path** — $1 payment with 1% fee splits correctly between treasury and provider
3. **Per-tx penalty lock** — `requesterPenaltyBpsLocked` stored at create time, immune to global parameter changes mid-tx
4. **Milestone-drain → settle** — full release through milestone payments, then SETTLED transition

All four passed in one transaction. The kernel's monotonic state machine and `linkEscrow → COMMITTED` invariant held end-to-end.

## Dependabot — 3 critical security alerts closed

GitHub flagged three transitive critical-severity vulnerabilities:

```json
"overrides": {
  "axios": "^1.15.0",
  "fast-xml-parser": "^5.3.5"
}
```

Plus a manual bump of `@aws-sdk/client-s3` to `3.989+` to close the underlying transitive chain. Three CVEs cleared:

1. **CVE-2026-XXXX (axios)** — server-side request forgery via redirect handling. `axios <1.15.0` followed cross-origin redirects without re-validating the target URL, which the SDK uses for IPFS pinning to known providers.
2. **CVE-2026-YYYY (fast-xml-parser)** — prototype pollution via XML attribute parsing. Reachable through one EAS attestation parsing path.
3. **CVE-2026-ZZZZ (@aws-sdk/client-s3 transitive)** — TLS certificate validation bypass on certain Node versions. SDK's S3 path is opt-in (used for Filebase backup of AGIRAILS.md); not exploitable in default config but worth closing.

None of these were exploited against any deployed AGIRAILS infrastructure that we know of. Dependabot caught them before they had a chance to be.

## Sepolia smoke notes

The redeploy was non-destructive — old contracts still respond to reads (state preserved) but writes to old addresses revert with `whenNotPaused` on the now-paused old kernel. New writes go to the new addresses. Migration path for testnet integrators using pre-Apr-15 contracts:

```bash
npm install @agirails/sdk@latest        # picks up new addresses
actp pull --network base-sepolia        # verifies your published config still resolves
actp test --network base-sepolia        # full state machine smoke
```

If anything breaks reach out — the old stack stays up for two weeks of grace while everyone migrates.

## What's NOT in this deploy

Mainnet kernel `0x132B…2d29` (deployed Feb 9) was not touched. It remains the canonical mainnet contract through this Sepolia refresh. A mainnet redeploy is on the roadmap but gated on completing the AIP-2.1 multi-round work landing in 3.4.x.

## Links

- [Sepolia kernel](https://sepolia.basescan.org/address/0x469CBADbACFFE096270594F0a31f0EEC53753411)
- [Sepolia X402Relay](https://sepolia.basescan.org/address/0x4DCD02b276Dbeab57c265B72435e90507b6Ac81A)
- [SmokeOnChainSuite source](https://github.com/agirails/actp-kernel/blob/main/script/SmokeOnChainSuite.s.sol)
