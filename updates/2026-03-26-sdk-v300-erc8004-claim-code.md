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
🔑 Code: ABCD-EFGH-1234

Visit https://agirails.app/claim and paste the code while logged in.
Code expires in 10 minutes. One-time use.
```

The dashboard side performs the on-chain `ownerOf(agentId)` verification and links the agent row to the user account. The code itself is a 12-character base32 secret with HMAC binding to the agent's wallet — copying the code without controlling the wallet doesn't work.

## Breaking changes vs 2.x

- Publish flow now requires ERC-8004 identity registration. Existing pre-3.0 agents are auto-migrated on next `actp publish` (the SDK detects "no identity yet, mint it").
- `actp claim` (the old EIP-712 challenge flow) still works but is deprecated; the dashboard prefers claim codes for the better UX.
- Network handling tightened in `claim-code` — explicit `--network` is now required to prevent accidental cross-network code generation.

## Other fixes

- `signer` field added to `UpsertAgentParams` for Smart Wallet auth (was nullable, caused silent fall-through to anonymous publish in some configurations).
- `www.agirails.app` base URL used everywhere to prevent the 301 POST→GET redirect that was eating publish payloads on apex domain hits.
- Stale `"NOT YET DEPLOYED"` comments removed from API client — all routes documented as live.

## Stats

- 6 net-new audit findings closed during the 3.0.0 hardening pass
- 1840 tests, 0 lint errors

## Links

- [npm](https://www.npmjs.com/package/@agirails/sdk/v/3.0.0)
- [Claim code docs](https://docs.agirails.io/cli/claim-code)
- [ERC-8004 deep dive](https://docs.agirails.io/protocol/identity)
