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

AGIRAILS moves USDC between agents. The first reasonable question an integrator asks is *"is this safe?"* — and the right answer is to show you the evidence, not just to claim it.

The short version:

- **Mathematically proven structural completeness.** ACTP's state sheaf has **H¹ = 0** after 2-cell refinement — independently reproducible from a YAML protocol spec via [`h1_engine.py`](/security/formal-verification). To our knowledge this is the first application of sheaf cohomology to smart-contract escrow protocol verification.
- **Money-moving logic is enforced on-chain.** Fee floors, dispute bonds, state-machine integrity, admin caps, self-transaction rejection — all live in `actp-kernel` smart contracts, not in SDK code that an integrator could route around.
- **External audit closed every finding.** Apex's source-level audit (2026-05-17) raised 12 actionable findings; all of them closed before the V3 mainnet redeploy on 2026-05-19.
- **Every shipped contract is Sourcify-verified.** Live `EXACT_MATCH` checks run on every truth-ledger refresh, with a daily cron as the safety net (see [contracts reference](/reference/contracts/base-mainnet)).
- **No long-lived publish credentials.** All npm + PyPI packages publish via OIDC Trusted Publisher with sigstore + SLSA provenance — nothing the team holds that an attacker could steal.
- **The disclosure path is open.** `security@agirails.io` for vulnerability reports; see [disclosure](/security/disclosure) for response times and scope.

## What lives here

| Page | What |
|---|---|
| [Threat model](/security/threat-model) | What ACTP protects against, and the honest limits of what it doesn't |
| [Audits](/security/audits) | External audits performed, findings closed, future audits appended |
| [Verified contracts](/security/contracts) | All 8 contracts with live Sourcify status + invariants enforced per contract |
| [Formal verification (H¹=0)](/security/formal-verification) | Sheaf-cohomology proof of structural completeness; reproducible from the YAML spec |
| [Testing](/security/testing) | 486 Foundry tests + Hypothesis stateful + cross-SDK byte parity + live Sepolia gate |
| [Disclosure](/security/disclosure) | How to report a vulnerability — channel, response time, coordinated disclosure norms |

## Four pillars, in one sentence each

1. **Structural completeness, proven.** ACTP's state sheaf has H¹ = 0 — every local state in the protocol composes into one consistent global view, with no hidden seam where trust has to be re-introduced. See [formal verification](/security/formal-verification).
2. **On-chain integrity.** The protocol enforces its own rules in the kernel — admin can't retroactively change in-flight transactions, can't exceed BPS caps, can't bypass the state machine. The rules are visible. The rules are binding.
3. **Off-chain attestation.** Every transition has a signed EIP-712 receipt or EAS attestation; cross-SDK parity between TypeScript and Python is gated by CI on every release. Two SDKs, one truth.
4. **Walk-away verifiability.** Sourcify EXACT_MATCH means anyone can recompile from source and check the bytecode against what's deployed. The trust isn't in us. It's in math you can run yourself.

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
