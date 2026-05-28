---
slug: /security/disclosure
title: "Disclosure"
description: "How to report a vulnerability in AGIRAILS: security@agirails.io, response time commitments, coordinated disclosure norms, and current bug bounty status (planned, not yet live)."
schema_type: TechArticle
last_verified: 2026-05-26
tags: [security, disclosure, vulnerability-report]
sidebar_position: 6
---

# Vulnerability disclosure

If you've found a security issue in AGIRAILS, here's how to report it responsibly.

## Channel

**Email**: `security@agirails.io`

For sensitive issues (active exploits, key-material findings), encrypt with the AGIRAILS PGP key. The current public key fingerprint will be published here when the PGP infrastructure is finalized. Until then, treat the address as plaintext-but-monitored.

## What to include

Useful reports contain:

1. **Affected component**: contract address, package + version, or specific file path.
2. **Impact**: what an attacker could achieve (theft, denial-of-service, integrity violation).
3. **Reproduction steps**: even rough is fine; bonus points for a runnable PoC.
4. **Suggested remediation** if you have one (not required).

If you're not sure whether something is in scope or severity, send it anyway. Better to triage one extra report than miss something real.

## Response time

| Stage | Target |
|---|---|
| **Acknowledgement** | 72 hours from receipt |
| **Triage + initial assessment** | 7 days |
| **Patch + remediation** | varies by severity. High: target 30 days, Medium: target 60 days |
| **Public disclosure** | coordinated, typically after patch ships + reasonable upgrade window |

These are targets, not contracts. Severe issues affecting deployed funds get worked on immediately, weekends included. Low-severity defense-in-depth observations may take longer to schedule.

## Coordinated disclosure

We follow standard coordinated-disclosure norms:

- Don't publish details before remediation ships and integrators have had time to update.
- Don't exploit in the wild on mainnet (testnet exploration is fine if it doesn't burn somebody else's testnet funds).
- After remediation, you can publish the finding however you want. We'd prefer attribution but won't demand silence.

If you need to escalate (e.g., we're not responding within the acknowledgement window), reach out via:
- Damir Mujic: `damir@agirails.io`
- Twitter/X: `@damir_mujic`

## What's in scope

| In scope | Out of scope |
|---|---|
| ACTP kernel logic (V3 mainnet, V4 sepolia) | Issues in upstream USDC contract (report to Circle) |
| EscrowVault, AgentRegistry, ArchiveTreasury, ACTPKernel | Coinbase Smart Wallet / Paymaster bugs (report to Coinbase) |
| `@agirails/sdk` (TypeScript) | Base L2 sequencer / network-level issues (report to Coinbase) |
| `agirails` (Python) | Third-party MCP clients (Claude Desktop, Cursor, etc.) |
| `@agirails/mcp-server` | Browser extensions / wallets not built by AGIRAILS |
| `n8n-nodes-actp` | DNS / CDN / cloud-provider attacks against agirails.io infra (report via `security@agirails.io` but tracked separately) |
| Web Receipts publishing/verification path | Anything on agirails.app that isn't directly involved in transaction settlement |
| `actp` CLI | Documentation typos (use GitHub issues for those) |

## Current bug bounty status

**No formal bug bounty program is live as of 2026-05-26.**

This page exists deliberately ahead of a public bounty so the disclosure channel is open even without a financial incentive. A bounty program is on the roadmap for post-v1 docs ship; when it's live, scope + payout schedule will be published here.

Until then: good-faith reports are appreciated and may be acknowledged publicly (with the reporter's permission) on the [audits page](/security/audits). For findings of significant impact, ad-hoc rewards have been paid historically; the team will reach out if your report warrants one.

## What we will NOT do

- We won't ask for proof of identity beyond what's needed to coordinate disclosure.
- We won't sue or threaten legal action against good-faith researchers.
- We won't sit on a finding indefinitely. If we can't fix it for some reason (e.g., requires a major redeploy beyond our timeline), we'll communicate that openly.

## Public security archive

Findings that have been resolved + publicly disclosed are tracked at:

- [Audits](/security/audits): Apex internal audit findings + remediation index, external-audit roadmap
- The `actp-kernel` git history: every PR addressing a security finding has a clear commit message
- The `updates/` changelog feed on this site: major security-affecting releases are announced

## See also

- [Threat model](/security/threat-model): what's in scope conceptually
- [Audits](/security/audits): historical findings index
- [Testing](/security/testing): what's already covered by automated suites (less interesting to a reporter)
