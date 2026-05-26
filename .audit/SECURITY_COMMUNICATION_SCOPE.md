# Public security communication — scope + content inventory

**Status**: scope document, supports FINAL_PLAN D5 (split public/private)
**Date**: 2026-05-26
**Decision context**: Damir asked "je li to potrebno, ako jeste, optimiziraj za pragmatičan javni prikaz" — yes, it's worth communicating, here's the pragmatic public scope.

---

## Why this matters now

Five concrete reasons to invest in public security communication before distribution:

1. **Trust signal for integrators** — they're moving USDC; first question is "is this safe?"
2. **GEO / citation value** — LLMs asked "is AGIRAILS safe to integrate" cite the security page; if it doesn't exist, they cite Twitter posts (uncontrolled)
3. **Audit work is invisible** — Apex 2026-05-17 closed 12 findings; not publicly surfaced = wasted credibility
4. **Walk-away / trustless verifiability** — auditors must independently verify claims; the page is the entry to that
5. **Distribution moment** — about to scale; one-shot to set the security narrative now or have it set for us later

---

## What we have actually shipped (security inventory)

Comprehensive inventory of real security work — this is the source material for the public pages.

### On-chain enforced (protocol-level — V3 mainnet, V4 sepolia)

| Mechanism | What it does | Why on-chain |
|---|---|---|
| **MIN_FEE** ($0.05 floor) | Enforced in `_payoutProviderAmount` | Was SDK-only; integrators could skip. V3 closes that. |
| **INV-30** (`disputeBondBpsLocked`) | Per-transaction lock of dispute bond rate at creation | Admin can't retroactively change in-flight disputes |
| **AIP-14** (dispute bonds) | $1 USDC minimum bond posted by disputer; returned per fault attribution | SDK-only enforcement left room for non-conforming clients |
| **M-2** (mediator timelock hardening) | Approval + revoke timelock always resets on re-approval | Closes window where admin re-approves a previously-revoked mediator without cooldown |
| **T+48h registry timelock** | `executeAgentRegistryUpdate()` is permissionless after 48h | Admin can't skip; community can execute |
| **State machine integrity** | Transitions are one-way only, gated in kernel | Off-chain enforcement was insufficient |
| **Fee bounds** | `platformFeeBps ≤ 500` (5% cap), hardcoded in kernel | Caps admin abuse of fee surface |
| **Self-transaction blocked** | Kernel rejects `requester == provider` | Closes self-funding attack |
| **Smart Wallet `_requesterCheck`** | `msg.sender == requester` enforced for state transitions | Closes AA-bypass attack discovered in FIND-004 |

### SDK-side fail-closed (AIP-13)

- **Network-aware key policy**: `ACTP_PRIVATE_KEY` raw env var:
  - mock → allowed silent
  - testnet (base-sepolia) → allowed, warn once
  - mainnet (base-mainnet) → **blocked, hard fail**
- **Resolution order**: `ACTP_PRIVATE_KEY` → `ACTP_KEYSTORE_BASE64` + `ACTP_KEY_PASSWORD` → `.actp/keystore.json` → None
- **30-min TTL keystore cache**, thread-safe
- **CLI scanners**: `actp deploy:env` generates base64 keystore for CI; `actp deploy:check` scans repo for exposed raw keys

### Verification + provenance

- **Sourcify EXACT_MATCH** on all 8 contracts (4 mainnet + 4 sepolia) — bytecode + runtime match
- **Workflow-attested publish** (sigstore + SLSA provenance) on all npm/PyPI packages (per FIND-007/001)
- **OIDC Trusted Publisher** for `@agirails/sdk`, `agirails`, `n8n-nodes-actp`, `@agirails/mcp-server` — no long-lived API tokens stored anywhere

### Testing depth

- **Foundry 486-test suite** on contracts (unit + fuzz)
- **Cross-SDK byte-identical EIP-712 parity** — TS-signed messages verified by Python and vice versa; CI gate before publish
- **Hypothesis stateful exerciser** — ~600 random op sequences per run on lifecycle state machine, terminal-state-sticky invariant enforced
- **Live Base Sepolia integration suite** — full lifecycle, Smart Wallet UserOp, Web Receipts upload all gated before release
- **Installed-wheel smoke harness** — catches packaging regressions (caught `create_app` missing surface gap in 3.0 cycle)

### Audit + remediation

- **Apex source-level audit 2026-05-17** — 12 actionable findings, all closed before V3 redeploy. Highlights:
  - FIND-002 / FIND-003: forge build + Slither CI workflow + CODEOWNERS gate on `actp-kernel` and `sdk-js`
  - FIND-004: Smart Wallet routing AA bypass — closed across `level0/request.ts` + `BuyerOrchestrator.ts`
  - FIND-007 / FIND-001: tag-driven workflow publish with sigstore + SLSA
  - FIND-013-015: admin-only resolver doc, Sepolia kernel freshness, Sourcify verification
  - FIND-016: AGIRAILS.md parser hardening — 256 KB cap, `maxAliasCount=10` on YAML library

### Operational

- **2-of-4 Safe** (Base mainnet) for admin/pauser/feeRecipient (`0x61fE58E9…b7f2`)
- **Timelocked admin actions** — 2-day cooldowns on mediator approval, agent registry updates
- **Compiler bump** solc 0.8.20 → 0.8.34 — closes four `via_ir` codegen bugs + `TransientStorageClearingHelperCollision` issue

### Disclosure channel

- **security@agirails.io** for vulnerability reports
- Currently no formal bug bounty (planned post-v1 docs)

---

## Pragmatic public IA — what to ship and what to defer

### Public pages — these go into Wave 3 of FINAL_PLAN

**`/security`** (overview + entry)
- One-page summary: "How AGIRAILS handles security"
- 3 sub-cards: on-chain invariants / audits / disclosure
- Citable thesis: "Money-moving logic enforced on-chain; off-chain processes attested; vulnerabilities reported to security@agirails.io with PGP."

**`/security/threat-model`**
- What ACTP protects against:
  - Provider non-delivery → escrow + dispute bond
  - Requester non-payment → upfront lock
  - Self-funding → kernel rejects requester == provider
  - Fee gaming → MIN_FEE + cap enforced on-chain
  - Admin abuse → 2-of-4 Safe + 2-day timelocks
  - Replay attacks → EIP-712 + nonce manager
  - Key exposure → AIP-13 fail-closed policy
- What ACTP does NOT protect against (the honest limit):
  - Provider delivering low-quality work → dispute system has limits
  - Off-chain identity claims → ERC-8004 helps but not absolute
  - Compromised client device → not in protocol scope

**`/security/audits`**
- Index of audits performed; link to PDF or markdown copy of each
- Apex 2026-05-17: 12 findings, all closed, ship date V3 redeploy
- "How to read this audit" — quick guide for non-auditors
- Future audits append here

**`/security/contracts`**
- All 8 contracts, per network, with:
  - Sourcify EXACT_MATCH link
  - Basescan verified-source link
  - Deploy block, deploy tx, compiler version
  - List of enforced invariants on this contract
- Auto-generated from `Protocol/actp-kernel/deployments/*.json` (truth ledger)

**`/security/testing`**
- Testing depth narrative: 486 Foundry tests, Hypothesis stateful, cross-SDK parity, live Sepolia gate
- Link to test files on GitHub for verification
- Coverage numbers (auto-extracted)

**`/security/disclosure`**
- `security@agirails.io` (PGP key block)
- Response time commitment (e.g., 72h acknowledgement)
- Coordinated disclosure norms
- Bug bounty status (currently "not yet, planned")

### Private (internal, NOT in public docs)

**`.internal/operate-runbook.md`** (lives in private repo or `.gitignore`-d sub-folder, accessible to AGIRAILS team only)
- Safe signer slot ownership + recovery procedure (per memory: 4th signer slot is currently undocumented internally — fix that here)
- Mainnet deployer keystore handling (`/Users/damir/.actp/mainnet-deployer/deployer`)
- Domain ownership transfer procedure
- Build / deploy pipeline operational details
- Incident response runbook (paging, escalation)
- Key rotation procedures

---

## What to do if a security incident happens during docs rewrite

Codex implicitly raised this: docs rewrite is a 3-week window; a security incident in that window needs a response that doesn't depend on the new docs being live.

- security@agirails.io remains active throughout
- Existing public security mentions (any) stay live
- Incident comms goes via `updates/` changelog feed, not via the in-progress security pages
- Post-incident docs update happens via separate PR, not folded into the rewrite branch

---

## Effort estimate

| Page | Effort | Auto-extracted vs hand-written |
|---|---|---|
| `/security` overview | 2h | Hand-written |
| `/security/threat-model` | 3h | Hand-written (this is the most-cited LLM page) |
| `/security/audits` | 1.5h + future audits embedded as added | Hand-written + linked PDFs |
| `/security/contracts` | 1h (relies on truth-ledger contract registry) | Auto-extracted shell + hand-written invariants list |
| `/security/testing` | 2h | Hand-written + auto-link to test counts |
| `/security/disclosure` | 0.5h + PGP key generation if not extant | Hand-written |

**Total: ~10h** for the public security surface. Add ~3h for the private operate runbook draft.

This fits in Wave 3 of FINAL_PLAN. No scope expansion.

---

## Verification gate (security-specific)

In addition to FINAL_PLAN's general gates:

- **Audit links work** — every audit PDF/markdown reachable
- **Sourcify EXACT_MATCH actually verifies** at build time — cross-check `Protocol/actp-kernel/deployments/*.json` `sourcify_status` field
- **PGP key valid** — `gpg --verify` against current key
- **No internal infra leaks** — page-by-page review for accidental signer slot / private repo / staging URL leaks before flip
- **External audit firm sign-off** — Apex review of `/security/audits/apex-2026-05` page (optional but high-credibility)

---

## What this wins

- **Trust** at first integration glance — "this isn't moonshot; here's the audit + invariants + testing"
- **LLM citation quality** — when Claude/ChatGPT/Perplexity are asked "is AGIRAILS safe", they cite our threat model page, not random Reddit threads
- **Walk-away test** — auditors can independently verify every claim (Sourcify links, GitHub commits, on-chain invariants)
- **Future incident response** — public security surface means incident comms has a home; we don't scramble during an event
- **Operational rigor signal** — distinguishes AGIRAILS from "yet another crypto project"

---

## Recommended decision

**Yes, include `/security` in v1 scope (Wave 3, FINAL_PLAN).** Split public/private per D5 v2. ~10h investment, very high leverage given the distribution moment.
