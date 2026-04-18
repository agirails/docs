---
slug: sepolia-redeploy-security-hardening
title: "Sepolia Redeploy + Dependabot Critical Fixes"
authors: [protocol-team]
tags: [release, engineering]
---

Fresh Base Sepolia stack went live April 15 — new `ACTPKernel`, `EscrowVault`, `AgentRegistry`, `ArchiveTreasury`, and a redeployed `X402Relay`. Plus three Dependabot critical advisories closed via npm overrides.

<!-- truncate -->

## Live addresses

Per `deployments/base-sepolia.json` (bundled with the SDK from this release on):

| Contract | Address |
|---|---|
| ACTPKernel | `0xE83cba71C445B4f658D88E4F179FccB9E1454F97` |
| EscrowVault | `0x0DAbBF59C40C1804488a84237C87971b2a7f5f5f` |
| AgentRegistry | `0x40ca9b043220ecc26b0b280fe6a02861eadc2448` |
| AGIRAILSIdentityRegistry | `0xce9749c768b425fab0daa0331047d1340ec99a88` |
| ArchiveTreasury | `0x6acb954550b6a5135da9df5ac224cff33d697351` |
| X402Relay | `0x110b25bb3d45c40dfcf34bb451aa7069b2a1cb3b` |
| MockUSDC | `0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb` |

The redeploy consolidates per-tx penalty lock (`requesterPenaltyBpsLocked`), tighter resolver gate, dust guard on X402Relay, and the milestone-settle path. Existing 3.0.x users on Sepolia should `npm install @agirails/sdk@latest` to pick up the new addresses.

## On-chain smoke suite

Verified via `SmokeOnChainSuite.s.sol` — four sub-tests in a single broadcast:

- X402Relay dust guard — `payWithFee(amount == MIN_FEE)` reverts cleanly
- X402Relay happy path — $1 payment with 1% fee splits correctly between treasury and provider
- Per-tx penalty lock — `requesterPenaltyBpsLocked` stored at create time, immune to global parameter changes mid-tx
- Milestone-drain → settle — full release through milestone payments, then SETTLED transition

All four passed in one transaction.

## Dependabot — 3 critical advisories closed

Three transitive critical-severity vulnerabilities closed via npm `overrides` in `package.json`:

```json
"overrides": {
  "axios": "^1.15.0",
  "fast-xml-parser": "^5.3.5"
}
```

Plus a manual bump of `@aws-sdk/client-s3` to `3.989+` to close the underlying transitive chain. All three resolved without behavioral changes to the SDK's public API.

## Migration

The redeploy is non-destructive — old contracts still respond to reads (state preserved) but writes to old addresses revert. Migration for Sepolia integrators:

```bash
npm install @agirails/sdk@latest        # picks up new addresses
actp pull --network base-sepolia        # verifies your published config still resolves
```

The old stack stays up for two weeks of grace.

## Mainnet

Mainnet kernel `0x132B9eB321dBB57c828B083844287171BDC92d29` (deployed Feb 9) was not touched. A mainnet redeploy is gated on completing the AIP-2.1 multi-round work landing in 3.4.x.

## Resources

- [Sepolia kernel on Basescan](https://sepolia.basescan.org/address/0xE83cba71C445B4f658D88E4F179FccB9E1454F97)
- [npm Package](https://www.npmjs.com/package/@agirails/sdk)
- [GitHub Repository](https://github.com/agirails/sdk-js)
- [Contract Source](https://github.com/agirails/actp-kernel)
- [Documentation](https://docs.agirails.io)
- [Discord](https://discord.gg/nuhCt75qe4)
