---
slug: sepolia-redeploy-security-hardening
title: "Sepolia Redeploy + 3 Critical Dependabot Fixes"
authors: [protocol-team]
tags: [governance, engineering]
---

Fresh Base Sepolia stack went live April 15 — new `ACTPKernel`, `EscrowVault`, `AgentRegistry`, `ArchiveTreasury`, and a redeployed `X402Relay`. Plus three Dependabot-flagged criticals closed via npm overrides.

<!-- truncate -->

## What got redeployed

Live addresses on Base Sepolia (per `deployments/base-sepolia.json`):

| Contract | Address |
|---|---|
| MockUSDC | `0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb` |
| ACTPKernel | `0xE83cba71C445B4f658D88E4F179FccB9E1454F97` |
| EscrowVault | `0x0DAbBF59C40C1804488a84237C87971b2a7f5f5f` |
| AgentRegistry | `0x40ca9b043220ecc26b0b280fe6a02861eadc2448` |
| AGIRAILSIdentityRegistry | `0xce9749c768b425fab0daa0331047d1340ec99a88` |
| ArchiveTreasury | `0x6acb954550b6a5135da9df5ac224cff33d697351` |
| X402Relay | `0x110b25bb3d45c40dfcf34bb451aa7069b2a1cb3b` |

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

Plus a manual bump of `@aws-sdk/client-s3` to `3.989+` to close the underlying transitive chain. The three flagged advisories all resolved without behavioral changes to the SDK's public API — they were transitive dependency issues. See the `overrides` block in `package.json` for the active pins.

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

- [Sepolia kernel](https://sepolia.basescan.org/address/0xE83cba71C445B4f658D88E4F179FccB9E1454F97)
- [Sepolia X402Relay](https://sepolia.basescan.org/address/0x110b25bb3d45c40dfcf34bb451aa7069b2a1cb3b)
- [actp-kernel source](https://github.com/agirails/actp-kernel)
