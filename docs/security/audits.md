---
slug: /security/audits
title: "Audits"
description: "Two layers of audit. Apex (AGIRAILS' internal agentic audit system) surfaced 12 findings against actp-kernel + sdk-js, all closed before the V3 mainnet redeploy. External third-party audits are planned for the right moment; this page tracks both."
schema_type: TechArticle
last_verified: 2026-05-28
stability: stable
last_breaking_change: 2026-05-19
tags: [security, audits, apex, remediation]
sidebar_position: 3
---

# Audits

Two distinct review layers run against AGIRAILS:

1. **Apex**: our **internal agentic audit system**. Built by the team to systematically review `actp-kernel` and `sdk-js` against known smart-contract vulnerability classes + protocol-design risks. Runs continuously; each substantial pass surfaces a numbered findings index that goes through remediation before a release ships.
2. **External third-party audit**: planned for the right moment (post-PMF, before major upgrades, or when an external firm's review materially de-risks a specific class of stakeholder). **Not yet performed.** This page will be updated when one is scheduled.

This page is the public record of both layers. Every finding tracked through remediation, nothing quietly removed.

## Apex internal agentic audit: pass dated 2026-05-17

Apex performed a source-level pass over `actp-kernel` (V2 at the time) and the TypeScript SDK. **12 actionable findings raised; all closed before the V3 mainnet redeploy on 2026-05-19.**

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
| **FIND-011** | Low | Compiler bump | ✅ Closed | solc 0.8.20 to 0.8.34; closes four `via_ir` codegen bugs + `TransientStorageClearingHelperCollision` |
| **FIND-012** | Low | Documentation gap | ✅ Closed | Admin-only resolver functions explicitly documented |
| **FIND-013** | Low | Sepolia kernel freshness | ✅ Closed | V4 sepolia kernel deployed to match mainnet V3 + 1 patch ahead for early validation |
| **FIND-014** | Low | Sourcify verification | ✅ Closed | All 8 contracts (4 mainnet + 4 sepolia) verified EXACT_MATCH |
| **FIND-015** | Low | AGIRAILS.md parser hardening | ✅ Closed | 256 KB input cap; `maxAliasCount=10` on YAML library to prevent quadratic-blowup attacks |
| **FIND-016** | Info | Receipts parser | ✅ Closed | Strict schema validation on inbound receipts; tampered payloads rejected |

> The numbers don't add up to a clean 12 because some findings were split (FIND-002 + FIND-003 both touched CI but for different repos) and a few info-level observations were tracked alongside actionable findings. The "12 actionable" count refers to findings requiring code changes.

### How to read this index

For non-auditors, here's what the table is actually telling you:

- **High** = directly money-affecting if exploited (e.g., AA bypass could let an attacker move funds as someone else).
- **Medium** = exploitable but with constraints, or affects integrity guarantees rather than direct theft.
- **Low** = correctness improvements, defense-in-depth, no realistic exploit path identified.
- **Info** = observations / nits / future work.

Every "Closed" status is backed by either an on-chain change (kernel redeploy to V3) or a workflow change (CI hardening, visible in `.github/workflows/`). Verify any specific finding by checking the linked PR or commit in the `actp-kernel` and `sdk-js` repo history around April–May 2026.

### What Apex is (and isn't)

**Apex is the team's own systematic audit pipeline.** It uses a combination of agentic review, pattern-based static analysis, and structured per-finding remediation tracking. Findings come from machine-augmented internal review, not a third-party human team. The trade-offs:

- ✅ **Continuous**: runs against every substantive change, not once-a-year.
- ✅ **Reproducible**: each finding cites the exact source location + remediation commit.
- ✅ **Public**: the index above is the authoritative record.
- 🟡 **Not third-party**: an internal audit pipeline shares blind spots with the team that built it. That gap is what an external audit closes.
- 🟡 **No external sign-off**: the index has no third-party-firm letterhead. Anyone evaluating AGIRAILS for institutional deployment should treat the Apex index as one input, not the only input.

We publish this index because the work is real and the remediation is verifiable, but we don't claim third-party audit until we've actually run one.

## External audit: planned, not performed

**Status**: no third-party external audit has been performed on AGIRAILS as of the date above.

Decision criteria for when we'll commission one:

- **Pre-major-upgrade**: before a V4 mainnet redeploy with substantive kernel logic changes, an external audit is the right gate.
- **Stakeholder threshold**: when the protocol's economic stake (TVL, transaction volume, mediator exposure) crosses a threshold where one external firm's review materially de-risks the next class of users.
- **Adjacent system audits**: if/when a token contract or governance system gets added post-PMF, that gets its own external audit independent of the kernel.

When an external audit is scheduled, the firm, scope, and timeline will be published here. The Apex findings index will remain alongside as the internal record.

## Internal review beyond Apex

Apex is the named, systematic layer. The continuous discipline beneath it:

- **Slither + Foundry coverage** gate on every PR to `actp-kernel`.
- **Manual review by 2+ reviewers** required for any change to kernel logic (enforced via CODEOWNERS).
- **Hypothesis stateful exerciser**: ~600 random op sequences per CI run on the lifecycle state machine.
- **Cross-SDK byte-identical EIP-712 parity**: every release verifies TS-signed messages decode in Python and vice versa.

See [Testing](/security/testing) for the full testing depth.

## See also

- [Threat model](/security/threat-model): what each finding closed
- [Verified contracts](/security/contracts): Sourcify status for every reviewed contract
- [Formal verification (H¹=0)](/security/formal-verification): sheaf cohomology layer above code audit
- [Testing](/security/testing): what the continuous review covers
- [Disclosure](/security/disclosure): how to report new findings
