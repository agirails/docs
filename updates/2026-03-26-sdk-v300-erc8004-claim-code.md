---
slug: sdk-v300-erc8004-claim-code
title: "SDK v3.0.0 — ERC-8004 Identity + Claim Code"
authors: [sdk-team]
tags: [release, breaking-change, governance, engineering]
---

`@agirails/sdk@3.0.0` makes the publish flow ERC-8004-native and ships claim codes — a one-time secret that bridges a CLI-registered agent to a dashboard account without sharing keys.

<!-- truncate -->

## Install

```bash
npm install @agirails/sdk@3.0.0
```

## ERC-8004 identity, end-to-end

`actp publish` now mints (or reuses) the agent's ERC-8004 identity NFT as part of the same flow that uploads AGIRAILS.md to IPFS and registers config on AgentRegistry. Three layers, one command:

```
actp publish
  ├── 1. Hash + upload AGIRAILS.md → IPFS CID
  ├── 2. Mint ERC-8004 identity NFT (Identity Registry, canonical CREATE2 address)
  │      → tokenId = your stable on-chain agent ID
  └── 3. Register config on AgentRegistry → activates gas sponsorship
```

The ERC-8004 mint is **idempotent** — re-running `publish` against an already-minted identity reuses the existing tokenId rather than spending gas to mint again. The Identity Registry enforces `ownerOf(tokenId)` semantics, so transferring the NFT transfers the agent.

### Why ERC-8004 over a custom Passport

Earlier proposals (AIP-9) defined an AGIRAILS-specific Passport NFT. ERC-8004 — ratified during the same period — provides exactly the same shape: ERC-721 + URIStorage + per-token metadata, with canonical CREATE2-deployed registries on both Sepolia and Mainnet that AGIRAILS doesn't have to maintain. AIP-9 is now a strategic alignment doc rather than a contract; the AGIRAILS-side value is in the layers above (AIP-8 builder/partner revenue, AIP-10 reputation badges via ERC-6551 token-bound accounts).

One fewer contract to deploy. One fewer thing to audit. Exact same UX.

## Claim Code — bridge CLI ↔ dashboard

The pattern: a developer registers an agent from the CLI (gas-sponsored, smart wallet auto-derived). The agent is owned by the smart wallet's address, which the developer doesn't necessarily have a keystore for in their browser. Linking that agent to a dashboard account previously required signing a SIWE-style challenge with the same EOA — friction, especially on mobile.

Claim codes shortcut this:

```bash
$ actp claim-code generate --network base-sepolia
# → prints a one-time code + the URL to paste it into the dashboard
```

The dashboard side performs the on-chain `ownerOf(agentId)` verification and links the agent row to the user account. The code is short-lived and one-time use; copying it without controlling the agent wallet doesn't work.

## Breaking changes vs 2.x

- Publish flow now requires ERC-8004 identity registration. Existing pre-3.0 agents are auto-migrated on next `actp publish` (the SDK detects "no identity yet, mint it").
- `actp claim` (the old EIP-712 challenge flow) still works but is deprecated; the dashboard prefers claim codes for the better UX.
- Network handling tightened in `claim-code` — explicit `--network` is now required to prevent accidental cross-network code generation.

## Phase 1 PRD gaps closed (rolled into this release)

The post-2.7.0 March work consolidated several Phase 1 PRD gaps that didn't justify their own release. All ship as part of 3.0.0:

- **`actp publish` write-back** — `wallet_address`, `agent_id`, and `did` now sync from the on-chain register call into the agirails.app dashboard row, closing the gap where on-chain was authoritative but the dashboard view stayed stale.
- **Slug auto-rename** — collision handling that suggests an alternative and renames in-place atomically rather than failing the publish.
- **`loadConfig` crash fix** — malformed JSON now surfaces with file path + line context rather than throwing before the user-facing error renders.
- **Test timing metrics** — per-suite duration in the test runner output, useful for CI bisecting.

## Other fixes

- `signer` field added to `UpsertAgentParams` for Smart Wallet auth (was nullable, caused silent fall-through to anonymous publish in some configurations).
- `www.agirails.app` base URL used everywhere to prevent the 301 POST→GET redirect that was eating publish payloads on apex domain hits.
- Stale `"NOT YET DEPLOYED"` comments removed from API client — all routes documented as live.

## Stats

- Audit findings closed during the 3.0.0 hardening pass (commit `b470da0`)
- All tests green, 0 lint errors

## Links

- [npm v3.0.0](https://www.npmjs.com/package/@agirails/sdk/v/3.0.0)
- [GitHub](https://github.com/agirails/sdk-js)
