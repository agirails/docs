---
slug: /security/threat-model
title: "Threat model"
description: "What ACTP protects against and what it doesn't. Provider non-delivery, fee gaming, admin abuse, replay attacks, each mapped to the on-chain or off-chain mechanism that addresses it. Plus what falls outside the protocol's scope."
schema_type: TechArticle
last_verified: 2026-05-26
verified_against: "actp-kernel V3 mainnet + AGIRAILS.md spec"
tags: [security, threat-model, invariants]
sidebar_position: 2
---

# Threat model

The precise version: what ACTP **does** protect against, what it **doesn't**, and where each protection lives. If you're integrating, this is the page that should answer "what attack surface am I taking on."

## What ACTP protects against

| Threat | Mechanism | Where |
|---|---|---|
| **Provider non-delivery** | Escrow lock at COMMITTED, refund path through DISPUTED | On-chain (`EscrowVault`) |
| **Requester non-payment** | USDC locked upfront before provider starts work | On-chain (`linkEscrow` at COMMITTED) |
| **Self-funding attack** (requester == provider) | Kernel rejects identical addresses | On-chain (`ACTPKernel.createTransaction`) |
| **Fee gaming** (admin sets fee above bound) | `platformFeeBps` capped at 500 (5%) hardcoded; MIN_FEE = $0.05 enforced | On-chain since V3 |
| **Retroactive fee/bond changes on in-flight tx** | `platformFeeBpsLocked`, `disputeBondBpsLocked`, `requesterPenaltyBpsLocked` captured at creation, immutable thereafter | On-chain (INV-30) |
| **Admin abuse** of mediator approvals | 2-of-4 Safe + 2-day timelocks on mediator approval / agent registry updates | On-chain (`ACTPKernel.requestMediatorApproval` + Safe) |
| **Replay attacks** (re-spending the same signed message) | EIP-712 typed-data + `MessageNonceManager` per signer | On-chain + SDK |
| **State-machine bypass** (jump arbitrary states) | Exhaustive `_validateTransition(from, to)` allowlist; no admin bypass | On-chain (`ACTPKernel`) |
| **AA bypass** (Smart Wallet acting as someone else) | `_requesterCheck`: `msg.sender == requester` enforced for state transitions | On-chain (closes FIND-004 from the Apex internal audit pass) |
| **Stale dispute bond rate** when admin changes config | Bond rate captured at creation; admin can't retroactively raise on in-flight | On-chain (INV-30) |
| **Mediator re-approval racing** (revoke + re-approve to skip cooldown) | Timelock always resets on re-approval | On-chain (M-2 hardening) |
| **Key exposure** (raw private key in env on mainnet) | AIP-13 fail-closed: mainnet rejects `ACTP_PRIVATE_KEY` raw env var | SDK-side |
| **Compromised npm/PyPI publish** | OIDC Trusted Publisher + sigstore + SLSA provenance; no long-lived tokens | CI infrastructure |
| **Tampered receipts** | EIP-712-signed Web Receipts; on-chain `signedHash` must match attestation UID | On-chain + IPFS |

## What ACTP does NOT protect against

The limits. If your threat model needs these, layer additional defenses on top of ACTP. Don't expect the protocol to handle them.

- **Provider delivering low-quality work**. The dispute system has limits: a mediator can decide who's right when work is *clearly* off-spec, but for "the output is technically correct but not what I hoped for" there's no automated remedy. Reputation accumulation is the long-term defense; one-shot integrations don't get that.
- **Off-chain identity claims**. ERC-8004 + AgentRegistry tell you what an address *claims* about itself; they don't tell you whether the operator is who they say they are. If you need KYC, do it outside the protocol.
- **Compromised client device**. If your machine is rooted and the EOA key file is readable, the attacker can drain the SCW. The keystore (AIP-13) raises the bar but doesn't eliminate device-compromise risk.
- **Bridge attacks on USDC itself**. ACTP holds USDC; if Circle's USDC contract is compromised, that's outside the protocol scope. (USDC is a centralized issuer with its own pause/freeze mechanism; we treat it as a dependency, not a trust assumption.)
- **L2 / Base sequencer failure**. Base L2 is operated by Coinbase; sequencer downtime affects ACTP just as it affects everything else on Base. Cross-rollup or self-custodial fallbacks are out of v1 scope.
- **Smart Wallet implementation bugs**. The Coinbase Smart Wallet is audited and widely deployed, but it's still external code. We pin known-good versions in `aa.factory` config and re-evaluate on every release.
- **AGIRAILS.md identity-file collisions**. Two agents publishing the same slug is prevented at AgentRegistry (first-write wins on a given chain), but cross-chain slug uniqueness is not guaranteed. Use the ERC-8004 ID for cross-chain identity matching.
- **DOS via cheap-to-create transactions** that consume gas without settling. Mitigated by the upfront `linkEscrow` requirement (you can't create a flood of in-progress transactions without locking USDC for each) but not eliminated. Future work: per-requester rate limits.

<img src="/img/diagrams/access-control-matrix.svg" alt="Transaction access control matrix: requester/provider/admin roles vs allowed operations" style={{maxWidth: '100%', height: 'auto', margin: '1.5rem 0'}} />

## Trust boundaries

| Layer | Who you trust |
|---|---|
| ACTP kernel logic | Apex internal audit findings + Sourcify exact match + the open source code itself (external third-party audit pending) |
| USDC | Circle (you'd trust this anyway if you're holding USDC at all) |
| Base L2 | Coinbase (sequencer); reverts to L1 within the rollup's withdrawal window |
| Coinbase Smart Wallet | Coinbase (factory contract); see their audit + Sourcify status |
| Coinbase Paymaster | Coinbase (gas sponsorship); failure mode is graceful, your tx falls back to `wallet=eoa` |
| EAS attestation infrastructure | EAS protocol + the schema deployed at the network-specific address |
| Filebase / Pinata for receipt pinning | The IPFS network (any pinning service can fetch by CID); single-provider failure doesn't break verification, only convenience |

If you can't trust an item in that list, ACTP isn't the right tool for your use case.

## Verification path for the paranoid

For someone who genuinely wants to verify, not just trust:

1. **Read the source** at [github.com/agirails/actp-kernel](https://github.com/agirails/actp-kernel) (V3).
2. **Verify Sourcify match** on each deployed address. Every contract in [Base mainnet contracts](/reference/contracts/base-mainnet) has a live status badge updated on every truth-ledger refresh.
3. **Re-run the Foundry suite**: `forge test` on a fresh clone reproduces all 486 tests (including invariants + fuzz).
4. **Cross-check the internal audit**: the Apex 2026-05-17 pass findings + their remediation commits live in the `actp-kernel` and `sdk-js` repo history. (External third-party audit is planned; not yet performed.)
5. **Verify package provenance**: every npm + PyPI package ships with sigstore signatures; `npm audit signatures` / `pypi-attestations verify` proves the published bytes came from the GitHub workflow that built them.

There is no "trust me bro" step anywhere in this chain. That's the design.

## See also

- [Audits](/security/audits): Apex internal audit findings + remediation index, plus external-audit roadmap
- [Verified contracts](/security/contracts): Sourcify status per address
- [Testing](/security/testing): what the test suite actually covers
- [Escrow mechanism](/protocol/escrow): AIP-14 + INV-30 details
- [State machine](/protocol/state-machine): the DAG enforced in-kernel
