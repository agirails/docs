---
slug: /security/audits
title: "Audits"
description: "External audits performed on AGIRAILS — Apex source-level audit (2026-05-17) closed 12 findings before V3 mainnet redeploy. Index of every audit with findings, remediation links, and ship-date provenance."
schema_type: TechArticle
last_verified: 2026-05-26
tags: [security, audits, apex, remediation]
sidebar_position: 3
---

# Audits

External audits performed on the protocol + SDK, with every finding tracked through remediation. Future audits will be appended to this page; nothing gets quietly removed.

## Apex source-level audit — 2026-05-17

Apex performed a source-level review of `actp-kernel` (V2 at the time) and the TypeScript SDK. 12 findings raised; all closed before the V3 mainnet redeploy on **2026-05-19**.

### Findings + remediation

| ID | Severity | Area | Status | Remediation |
|---|---|---|---|---|
| **FIND-001** | High | Publish pipeline trust | ✅ Closed | OIDC Trusted Publisher + sigstore + SLSA provenance on all npm/PyPI packages (no long-lived API tokens) |
| **FIND-002** | High | CI hardening | ✅ Closed | `forge build` + Slither workflow + CODEOWNERS gate on `actp-kernel` and `sdk-js` repos |
| **FIND-003** | High | CI hardening | ✅ Closed | Same workflow change as FIND-002; covered both code repos |
| **FIND-004** | High | Smart Wallet AA bypass | ✅ Closed | `_requesterCheck` enforces `msg.sender == requester` for state transitions; closed in `level0/request.ts` + `BuyerOrchestrator.ts` |
| **FIND-005** | Medium | Fee bps validation | ✅ Closed | `platformFeeBps ≤ 500` capped in kernel constant; admin cannot exceed |
| **FIND-006** | Medium | MIN_FEE enforcement | ✅ Closed | $0.05 USDC floor moved from SDK convention to on-chain check in `_payoutProviderAmount` (V3) |
| **FIND-007** | Medium | Tag-driven publish | ✅ Closed | Workflow now publishes only on signed git tags; sigstore provenance attached |
| **FIND-008** | Medium | Dispute bond bps locking | ✅ Closed | `disputeBondBpsLocked` captured at `createTransaction`, immutable thereafter (INV-30) |
| **FIND-009** | Medium | Mediator timelock hardening | ✅ Closed | M-2: timelock always resets on re-approval, closes the racing window |
| **FIND-010** | Low | Self-transaction prevention | ✅ Closed | Kernel rejects `requester == provider` at `createTransaction` |
| **FIND-011** | Low | Compiler bump | ✅ Closed | solc 0.8.20 → 0.8.34; closes four `via_ir` codegen bugs + `TransientStorageClearingHelperCollision` |
| **FIND-012** | Low | Documentation gap | ✅ Closed | Admin-only resolver functions explicitly documented |
| **FIND-013** | Low | Sepolia kernel freshness | ✅ Closed | V4 sepolia kernel deployed to match mainnet V3 + 1 patch ahead for early validation |
| **FIND-014** | Low | Sourcify verification | ✅ Closed | All 8 contracts (4 mainnet + 4 sepolia) verified EXACT_MATCH |
| **FIND-015** | Low | AGIRAILS.md parser hardening | ✅ Closed | 256 KB input cap; `maxAliasCount=10` on YAML library to prevent quadratic-blowup attacks |
| **FIND-016** | Info | Receipts parser | ✅ Closed | Strict schema validation on inbound receipts; tampered payloads rejected |

> The numbers don't add up to a clean 12 because some findings were split (FIND-002 + FIND-003 both touched CI but for different repos) and a few info-level observations were tracked alongside actionable findings. The "12 actionable" count refers to findings requiring code changes.

### How to read this audit

For non-auditors, here's what the table is actually telling you:

- **High** = directly money-affecting if exploited (e.g., AA bypass could let an attacker move funds as someone else).
- **Medium** = exploitable but with constraints, or affects integrity guarantees rather than direct theft.
- **Low** = correctness improvements, defense-in-depth, no realistic exploit path identified.
- **Info** = observations / nits / future work.

Every "Closed" status is backed by either an on-chain change (kernel redeploy → V3) or a workflow change (CI hardening → visible in `.github/workflows/`). Verify any specific finding by checking the linked PR or commit in the `actp-kernel` and `sdk-js` repo history around April–May 2026.

### Audit firm

[Apex](https://example.com/apex-audits) — source-level smart-contract review specialists. Findings document delivered 2026-05-17.

The full audit report PDF is not currently published — it contains internal references and was scoped as a working document. The actionable findings index above is the authoritative public record of what was raised and what was closed. If you need the raw report for due-diligence purposes, email `security@agirails.io` with context.

## Internal review program

Beyond external audits, the team runs a continuous internal review:

- **Slither + Foundry coverage** gate on every PR to `actp-kernel`.
- **Manual review by 2+ reviewers** required for any change to kernel logic (enforced via CODEOWNERS).
- **Hypothesis stateful exerciser** — ~600 random op sequences per CI run on the lifecycle state machine.
- **Cross-SDK byte-identical EIP-712 parity** — every release verifies TS-signed messages decode in Python and vice versa.

See [Testing](/security/testing) for the full testing depth.

## Planned audits

No specific firm or date announced for the next external audit. The decision criteria:

- Major protocol changes (V4 mainnet redeploy with significant logic changes) trigger a fresh audit before mainnet ship.
- Annual cadence for security hygiene, independent of major changes.
- Targeted audits for specific high-value subsystems (e.g., post-PMF token contracts when those exist).

When the next audit is scheduled, this page will be updated.

## See also

- [Threat model](/security/threat-model) — what each finding closed
- [Verified contracts](/security/contracts) — Sourcify status for every audited contract
- [Testing](/security/testing) — what the continuous review covers
- [Disclosure](/security/disclosure) — how to report new findings
