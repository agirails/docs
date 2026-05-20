---
slug: sdk-v4-mainnet-redeploy
title: "SDK 4.0.0 + Mainnet V3 Redeploy"
authors: [agirails]
tags: [release, mainnet, protocol]
---

`@agirails/sdk@4.0.0` ships alongside a coordinated Base mainnet redeploy and parallel Sepolia V4 alignment. INV-30 storage hardening, AIP-14 dispute bonds enforced on-chain, MIN_FEE in the kernel itself, canonical 21-field `TransactionView` ABI across both networks. All eight contracts Sourcify EXACT_MATCH verified.

<!-- truncate -->

## Install

```bash
npm install @agirails/sdk@4.0.0
```

Consumers that read addresses via `getNetwork('base-mainnet').contracts.*` migrate automatically. Code with hardcoded V2 addresses (`0x132B9eB3…` kernel, `0x6aAF45…` vault, `0x6fB222CF…` registry, `0x0516C411…` archive) must swap to the V3 addresses below.

## New mainnet contracts

| Contract | Address |
|----------|---------|
| **ACTPKernel** | [`0x048c811352e8a3fECd5b0Ec4AA2c2b94083CC842`](https://basescan.org/address/0x048c811352e8a3fECd5b0Ec4AA2c2b94083CC842) |
| **EscrowVault** | [`0x262D5912A9612F0c66dA5d13B4E678D50ebC44b5`](https://basescan.org/address/0x262D5912A9612F0c66dA5d13B4E678D50ebC44b5) |
| **AgentRegistry** | [`0x64Cb18bfb3CC1aCb1370a3B01613391D3561a009`](https://basescan.org/address/0x64Cb18bfb3CC1aCb1370a3B01613391D3561a009) |
| **ArchiveTreasury** | [`0x6159A80Ce8362aBB2307FbaB4Ed4D3F4A4231Acc`](https://basescan.org/address/0x6159A80Ce8362aBB2307FbaB4Ed4D3F4A4231Acc) |

USDC unchanged: [`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`](https://basescan.org/address/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913) (Circle official).

Admin / pauser / feeRecipient: Treasury Safe 2-of-4 multisig (`0x61fE58E9…b7f2`). Compiled with solc 0.8.34 + via_ir. Sepolia received an identical V4 redeploy the same day so both networks return the same canonical 21-field `TransactionView` tuple — see [`deployments/base-mainnet.json`](https://github.com/agirails/actp-kernel/blob/main/deployments/base-mainnet.json) and [`deployments/base-sepolia.json`](https://github.com/agirails/actp-kernel/blob/main/deployments/base-sepolia.json) for the full address tables, deploy blocks, and post-deploy wiring artifacts.

## Why redeploy

The 2026-02-09 V2 mainnet kernel pre-dated three protocol-level changes that needed on-chain enforcement, not SDK-layer guards:

| Change | What it does | Why on-chain |
|---|---|---|
| **INV-30** `disputeBondBpsLocked` | Per-transaction lock of the dispute bond rate at creation time | Admin-side `updateDisputeBondBps()` could otherwise retroactively affect in-flight disputes |
| **AIP-14 dispute bonds + initiator tracking** | $1 USDC minimum bond posted by the disputer; returned per fault attribution | SDK-only enforcement leaves room for clients that skip the deposit |
| **MIN_FEE** ($0.05) | $0.05 platform-fee floor enforced in `_payoutProviderAmount` | The published spec promised it; the V2 contract didn't enforce it |
| **M-2** mediator timelock hardening | Approval + revoke timelock always resets on re-approval | Closes a window where an admin could re-approve a previously-revoked mediator and skip the 2-day cooldown |
| **`requesterPenaltyBpsLocked`** | Per-tx penalty rate (already on Sepolia since 2026-04-15) | Brings mainnet to parity with the testnet API surface |
| **ERC-8004 `agentId`** in `TransactionView` | Both `agentId` (provider) and `requesterAgentId` exposed on the view tuple | Lets receipts and indexers surface agent identity without a second RPC |

Plus a compiler bump from 0.8.20 to 0.8.34 — closes four `via_ir` codegen bugs and one `TransientStorageClearingHelperCollision` issue that landed between those versions. No semantic regressions in the 486-test suite.

## Breaking changes for integrators

**Mainnet address surface change.** All four core contracts moved. SDK consumers that go through the `getNetwork()` helper migrate automatically. Anything that pins addresses in code, env, or config needs the V3 values above.

**`x402Relay` removed from base-mainnet config.** The mainnet kernel does not include a redeployed X402Relay. The SDK's `X402Adapter` (auto-registered since 3.3.0) routes payments directly buyer → seller via [`@x402/fetch`](https://github.com/coinbase/x402) + facilitator — zero AGIRAILS fee on the x402 path. The legacy contract remains on Sepolia at `0x110b25bb…` for direct-call consumers.

**21-field `TransactionView` tuple.** The canonical `getTransaction()` return grew from 19 to 21 fields (`requesterPenaltyBpsLocked` + `disputeBondBpsLocked` inserted before `agentId`). SDK 4.0.0 ships the matching ABI. Raw ethers callers that pinned an older ABI copy should refresh from [`@agirails/sdk/dist/abi/ACTPKernel.json`](https://github.com/agirails/sdk-js/blob/main/src/abi/ACTPKernel.json).

**Reading stuck txs on retired Sepolia kernel.** The previous Sepolia kernel (`0xE83cba71…`) returned a 19-field tuple. Anyone needing to read transactions still on that retired contract should pin to `@agirails/sdk@4.0.0-beta.11` for that specific lookup; live operations all target the V4 kernel.

## On-chain verification — eight Sourcify EXACT_MATCH

All four V3 mainnet contracts and all four V4 Sepolia contracts ship with creation-bytecode + runtime-bytecode matches on Sourcify. You can re-verify the chain of custody externally:

```bash
# Mainnet
for addr in 0x048c811352e8a3fECd5b0Ec4AA2c2b94083CC842 \
            0x262D5912A9612F0c66dA5d13B4E678D50ebC44b5 \
            0x64Cb18bfb3CC1aCb1370a3B01613391D3561a009 \
            0x6159A80Ce8362aBB2307FbaB4Ed4D3F4A4231Acc; do
  curl -sS "https://sourcify.dev/server/v2/contract/8453/$addr" | jq '.match'
done
# expect: "exact_match" × 4
```

## Audit context — Apex source-level review

The 2026-05-17 external source-level audit by Apex closed twelve actionable findings between the redeploy planning and the release. The most consequential were:

- **FIND-002 / FIND-003**: forge build + Slither CI workflow + CODEOWNERS review gate on `actp-kernel` and `sdk-js`
- **FIND-004**: Smart Wallet routing fixed across `level0/request.ts` and `BuyerOrchestrator.ts` (the AA bypass cascade that resolved across `4.0.0-beta.1` through `beta.9`)
- **FIND-007 / FIND-001**: tag-driven workflow publish pipeline with sigstore + SLSA provenance (see the [separate post on workflow-attested publish](/updates/workflow-attested-publish-v4))
- **FIND-013 / FIND-014 / FIND-015**: admin-only resolver doc snippet refresh, Sepolia kernel address freshness, and full Sourcify EXACT_MATCH verification
- **FIND-016**: AGIRAILS.md parser hardening — 256 KB cap and `maxAliasCount=10` on the YAML library

## Coming in 4.x

- **Registry timelock execute** (T+48h after redeploy, permissionless `executeAgentRegistryUpdate()` on both networks) — wires the new `AgentRegistry` into the kernel after the 2-day cooldown finishes
- **Python SDK + n8n + MCP server mirror** — version bumps tracking 4.0.0 across the downstream ecosystem (see the [ecosystem mirror post](/updates/ecosystem-v4-mirror))

## Resources

- [npm Package](https://www.npmjs.com/package/@agirails/sdk) (4.0.0 with sigstore + SLSA provenance)
- [`actp-kernel` source](https://github.com/agirails/sdk-js) and [V3 deployment artifact](https://github.com/agirails/actp-kernel/blob/main/deployments/base-mainnet.json)
- [Sourcify (chain 8453)](https://sourcify.dev/#/lookup/8453)
- [CHANGELOG \[4.0.0\]](https://github.com/agirails/sdk-js/blob/main/CHANGELOG.md)
- [Documentation](https://docs.agirails.io)
- [Discord](https://discord.gg/nuhCt75qe4)
