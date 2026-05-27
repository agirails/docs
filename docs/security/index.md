---
slug: /security
title: "Security"
description: "How AGIRAILS handles security — money-moving logic enforced on-chain, off-chain processes attested, vulnerabilities reported to security@agirails.io. Audits, threat model, verified contracts, and disclosure path."
schema_type: TechArticle
last_verified: 2026-05-26
tags: [security, overview, audits, disclosure]
sidebar_position: 1
---

# Security

AGIRAILS moves USDC between agents. The first reasonable question an integrator asks is "is this safe?" — this section answers that with the actual evidence, not just claims.

The short version:

- **Money-moving logic is enforced on-chain.** Fee floors, dispute bonds, state-machine integrity, admin caps, self-transaction rejection — all in `actp-kernel` smart contracts, not SDK code that integrators could bypass.
- **External audit closed every finding.** Apex source-level audit (2026-05-17) raised 12 actionable findings; all closed before the V3 mainnet redeploy on 2026-05-19.
- **Every shipped contract is Sourcify-verified.** Live `EXACT_MATCH` checks run on every truth-ledger refresh (see [contracts reference](/reference/contracts/base-mainnet)).
- **No long-lived publish credentials.** All npm + PyPI packages publish via OIDC Trusted Publisher with sigstore + SLSA provenance.
- **Disclosure path is open.** `security@agirails.io` for vulnerability reports, see [disclosure](/security/disclosure) for the protocol.

## What lives here

| Page | What |
|---|---|
| [Threat model](/security/threat-model) | What ACTP protects against, and the honest limits of what it doesn't |
| [Audits](/security/audits) | External audits performed, findings closed, future audits appended |
| [Verified contracts](/security/contracts) | All 8 contracts with live Sourcify status + invariants enforced per contract |
| [Testing](/security/testing) | 486 Foundry tests + Hypothesis stateful + cross-SDK byte parity + live Sepolia gate |
| [Disclosure](/security/disclosure) | How to report a vulnerability — channel, response time, coordinated disclosure norms |

## Three pillars, in one sentence each

1. **On-chain integrity** — the protocol enforces its own rules in the kernel; admin can't retroactively change in-flight transactions, can't exceed bps caps, can't bypass the state machine.
2. **Off-chain attestation** — every transition has a signed EIP-712 receipt or EAS attestation; cross-SDK parity (TS ↔ Python) is CI-gated on every release.
3. **Walk-away verifiability** — Sourcify EXACT_MATCH means anyone can verify the deployed bytecode against the source on GitHub. No trust required.

## What this section does NOT contain

- **Internal operational runbooks** — signer slot ownership, key handling procedures, incident response paging. Those live in the AGIRAILS team's private repo by design (security through compartmentalization, not obscurity).
- **Speculative future security plans** — bug bounty program details, formal-verification roadmaps, etc. Stated only when delivered.
- **Marketing claims** — every assertion here links to either an on-chain contract address, a GitHub commit, or a published audit. If a claim has no evidence link, it shouldn't be here.

## See also

- [Protocol overview](/protocol) — what's actually being protected
- [Contracts reference](/reference/contracts/base-mainnet) — live Sourcify verification status
- [AIP-13 (keystore policy)](/recipes/keystore-and-deployment) — SDK-side fail-closed key handling
- [AIP-14 (dispute bonds)](/protocol/escrow#aip-14-dispute-bond) — on-chain enforced
- [INV-30 (locked bps)](/protocol/escrow#inv-30--per-transaction-locked-bps) — in-flight transactions immune to admin changes
