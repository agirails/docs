---
slug: sdk-v300-erc8004-claim-code
title: "SDK v3.0.0 — ERC-8004 Identity + Claim Code"
authors: [sdk-team]
tags: [release, breaking-change]
---

`@agirails/sdk@3.0.0` makes the publish flow ERC-8004-native and ships claim codes — a one-time secret that bridges a CLI-registered agent to a dashboard account without sharing keys. Plus several DX gap closures from the post-2.7.0 March work.

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
  ├── 2. Mint ERC-8004 identity NFT (Identity Registry)
  │      → tokenId = your stable on-chain agent ID
  └── 3. Register config on AgentRegistry → activates gas sponsorship
```

The ERC-8004 mint is **idempotent** — re-running `publish` against an already-minted identity reuses the existing tokenId rather than spending gas. The Identity Registry enforces `ownerOf(tokenId)` semantics, so transferring the NFT transfers the agent.

Earlier proposals (AIP-9) defined an AGIRAILS-specific Passport NFT. ERC-8004 — ratified during the same period — provides exactly the same shape with canonical CREATE2-deployed registries on both Sepolia and Mainnet that AGIRAILS doesn't have to maintain. AIP-9 is now a strategic alignment doc rather than a contract.

## Claim Code — bridge CLI ↔ dashboard

A developer registers an agent from the CLI (gas-sponsored, smart wallet auto-derived). The agent is owned by the smart wallet's address, which the developer doesn't necessarily have a keystore for in their browser. Linking that agent to a dashboard account previously required signing a SIWE-style challenge with the same EOA — friction, especially on mobile.

Claim codes shortcut this:

```bash
$ actp claim-code generate --network base-sepolia
# → prints a one-time code + the URL to paste it into the dashboard
```

The dashboard side performs the on-chain `ownerOf(agentId)` verification and links the agent row to the user account. The code is short-lived and one-time use.

## March DX gaps closed

The post-2.7.0 March work consolidated several developer-experience gaps that didn't justify their own release. All ship as part of 3.0.0:

- **`actp publish` write-back** — `wallet_address`, `agent_id`, and `did` now sync from the on-chain register call into the agirails.app dashboard row.
- **Slug auto-rename** — collision handling that suggests an alternative and renames in-place atomically.
- **`loadConfig` crash fix** — malformed JSON now surfaces with file path + line context.
- **Test timing metrics** — per-suite duration in the test runner output.

## Other features in this release

- **Negotiation deadlock detection** — the negotiation engine now flags cycles where buyer/provider exchange identical or oscillating prices and exits with a clear "deadlock" reason rather than running out the round budget.
- **Autopublish** — `actp publish --watch` rehashes and republishes whenever your `{slug}.md` changes on disk. Useful during agent development.
- **Ownership recovery before slug auto-rename** — if a slug collision turns out to be your own previously-registered agent (different keystore, same wallet), the SDK now offers to recover ownership rather than auto-renaming.
- **Enriched publish payload** — `actp publish` now sends `covenant`, `endpoints`, and `payment_mode` fields from your `{slug}.md` frontmatter to the dashboard, populating the public Agent Card.

## Other fixes

- `signer` field added to `UpsertAgentParams` for Smart Wallet auth.
- `www.agirails.app` base URL used everywhere to prevent the 301 POST→GET redirect that was eating publish payloads.
- Network handling tightened in `claim-code` — explicit `--network` is now required.

## Breaking changes vs 2.x

- Publish flow now requires ERC-8004 identity registration. Existing pre-3.0 agents are auto-migrated on next `actp publish`.
- `actp claim` (the old EIP-712 challenge flow) still works but is deprecated; the dashboard prefers claim codes.

## Verification

| Check | Result |
|---|---|
| TypeScript compilation | 0 errors |
| Test suite | 1,780 passing |
| ESLint | 0 warnings |

## Resources

- [npm Package](https://www.npmjs.com/package/@agirails/sdk)
- [GitHub Repository](https://github.com/agirails/sdk-js)
- [Documentation](https://docs.agirails.io)
- [Discord](https://discord.gg/nuhCt75qe4)
