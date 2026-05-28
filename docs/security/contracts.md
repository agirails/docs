---
slug: /security/contracts
title: "Verified contracts"
description: "All 8 deployed ACTP contracts (4 Base mainnet + 4 Base sepolia) with live Sourcify EXACT_MATCH status, deploy provenance, and the on-chain invariants enforced per contract."
schema_type: TechArticle
last_verified: 2026-05-26
verified_against: "actp-kernel V3 (mainnet) + V4 (sepolia) + truth-ledger sdk-manifest.json"
tags: [security, contracts, sourcify, verification]
sidebar_position: 4
---

# Verified contracts

Every contract AGIRAILS deploys is Sourcify-verified `EXACT_MATCH`. That means: the deployed runtime bytecode at the address matches a compilation of the source published on GitHub, byte-for-byte. No proxy upgrade can change that without re-verifying.

Live verification status is refreshed on every [truth-ledger manifest](/reference/glossary#truth-ledger-manifest) run (daily cron at 06:00 UTC, plus on-demand via `gh workflow run truth-ledger-refresh.yml`). The reference pages below show the actual current status as of the most recent manifest refresh.

## Why Sourcify EXACT_MATCH matters

Two verification levels exist in the Ethereum ecosystem:

- **Partial match**: runtime bytecode matches, but metadata (compiler version, settings) might differ. Still a strong signal but allows minor reproducibility gaps.
- **Exact match**: runtime bytecode AND metadata IPFS hash both match. Bit-perfect reproducibility. Anyone can re-compile from source and get the identical bytes.

AGIRAILS targets EXACT_MATCH on every contract. Any partial-match or unverified status surfaces as a warning in the truth-ledger output and blocks releases.

<img src="/img/diagrams/contract-architecture.svg" alt="Contract architecture: ACTPKernel as coordinator orchestrating createTransaction/linkEscrow/transitionState across EscrowVault + AgentRegistry + EAS" style={{maxWidth: '100%', height: 'auto', margin: '1.5rem 0'}} />

## Contract registry

Both registries are auto-rendered from the truth-ledger manifest. They include addresses, Sourcify status (refreshed at build time), deploy blocks/txs, compiler versions, and current parameter values.

- [Base mainnet contracts](/reference/contracts/base-mainnet): production
- [Base sepolia contracts](/reference/contracts/base-sepolia): testnet

## What each contract enforces

| Contract | Invariants enforced |
|---|---|
| **ACTPKernel** | [State machine](/reference/glossary#actp) integrity (DAG-only transitions, no admin bypass), `requester ≠ provider`, `_requesterCheck` (closes [AA](/reference/glossary#account-abstraction-erc-4337) bypass), per-tx locked bps ([INV-30](/reference/glossary#inv-30)), fee [BPS](/reference/glossary#bps) cap ≤ 500 |
| **[EscrowVault](/reference/glossary#escrowvault)** | Vault USDC balance ≥ sum of active escrows (bedrock solvency invariant, asserted by test + [Echidna](/reference/glossary#echidna) fuzz), [MIN_FEE](/reference/glossary#min_fee) floor in `_payoutProviderAmount`, [AIP-14](/reference/glossary#aip-14) [dispute bond](/reference/glossary#dispute-bond) mechanics |
| **[AgentRegistry](/reference/glossary#agentregistry)** | First-write wins on slug, 48h timelock on agent registry updates (permissionless execute after timelock) |
| **ArchiveTreasury** | Receives confiscated bonds (from "no decision" dispute resolutions), admin-only withdrawals via Safe |

Smart Wallet (Coinbase) + [Paymaster](/reference/glossary#paymaster) (Coinbase) + USDC (Circle) are external dependencies. See [threat model](/security/threat-model#trust-boundaries) for what we trust about each.

## Deploy provenance

Every contract address has on-chain proof of when and how it was deployed:

- **Deploy block + tx hash**: the exact L2 block and transaction where the contract was created. Visible via Basescan and Sourcify; both are linked from the reference pages.
- **Deployer address**: the [EOA](/reference/glossary#eoa) that submitted the CREATE2 transaction. For V3 mainnet, this is the AGIRAILS mainnet deployer (kept in a separate hardware-secured keystore, never used for any other purpose).
- **Compiler version + settings**: solc 0.8.34 with optimizer runs as specified in the Sourcify metadata; reproducible from the GitHub source.

## How to verify yourself

For someone who wants to verify rather than trust the auto-rendered status:

1. Pick any contract address from [Base mainnet](/reference/contracts/base-mainnet).
2. Visit `https://sourcify.dev/#/lookup/{address}`. Confirms EXACT_MATCH status with bytecode + metadata.
3. Clone [github.com/agirails/actp-kernel](https://github.com/agirails/actp-kernel), check out the V3 tag, run `forge build`, compare the produced bytecode to what's on-chain.
4. Cross-check on Basescan via `https://basescan.org/address/{address}#code`.

Any discrepancy is a security incident. Please report immediately to `security@agirails.io`.

## What if a contract becomes unverified?

A contract can lose Sourcify verification status only if Sourcify's index is rebuilt and the metadata IPFS link goes stale. The runtime bytecode is immutable on-chain.

If you see anything other than `✅ Sourcify exact match` on a mainnet contract row, that's a CI warning. The truth-ledger run in strict mode (`CI_STRICT=true`) hard-fails when Sourcify reports anything below `exact_match` on production contracts. So a non-exact status in the rendered table means either:

1. The manifest is older than the most recent Sourcify re-index (rare; daily refresh catches this within 24h).
2. Sourcify itself was unreachable at refresh time (status falls back to `deployment_claim_only`).
3. Something actually broke and we haven't redeployed/re-verified yet (this is what `security@agirails.io` is for).

## See also

- [Audits](/security/audits): FIND-014 specifically tracks Sourcify verification
- [Threat model](/security/threat-model): what these contracts protect against
- [Escrow mechanism](/protocol/escrow): what EscrowVault enforces
- [State machine](/protocol/state-machine): what ACTPKernel enforces
- [Truth-ledger manifest (raw JSON)](/sdk-manifest.json): machine-readable contract registry
