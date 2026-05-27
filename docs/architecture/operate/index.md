---
slug: /architecture/operate
title: "Walk-away runbook"
description: "How to keep ACTP running if the AGIRAILS team disappears tomorrow. The public-facing operational dependencies, where the source of truth lives, and how to verify everything yourself."
schema_type: TechArticle
last_verified: 2026-05-26
tags: [architecture, operate, walk-away, bus-factor]
sidebar_position: 1
---

# Walk-away runbook

**Premise**: if the AGIRAILS team disappears tomorrow — got hit by a bus, decided to retire to a farm, lost interest — what survives, what breaks, and how can the existing protocol continue serving users?

This runbook is the public answer. The private operational details (signer slot ownership, deploy keys, domain transfer procedures) live in the AGIRAILS team's internal docs. What's here is everything an outsider needs to **independently verify** that ACTP keeps working without us.

## The Vitalik test

Vitalik Buterin's framing: *"An ideal protocol fits onto a single page."* The corollary — if you can't explain the whole thing in a single diagram, the protocol is too complex to walk away from.

ACTP passes this test:

```text
INITIATED ─→ QUOTED ─→ COMMITTED ─→ IN_PROGRESS ─→ DELIVERED ─→ SETTLED
                                          │              │
                                          └─→ CANCELLED  └─→ DISPUTED ─→ SETTLED / CANCELLED
```

Everything else — fees, dispute bonds, identity, receipts — is layered on top of those 8 states. Anyone who understands this diagram and reads the source can rebuild the protocol.

## What survives without AGIRAILS

| Asset | How it survives | What it needs |
|---|---|---|
| **`actp-kernel` contracts** on Base mainnet | Immutable on-chain; admin changes are bounded by hardcoded caps | Base L2 continues operating |
| **EscrowVault** USDC custody | Solvency invariant enforced by contract; no admin drain function | Base L2 + USDC contract |
| **Sourcify verification** of all contracts | Sourcify is a public service; metadata pinned to IPFS | Sourcify + IPFS |
| **Open-source SDKs** (`@agirails/sdk`, `agirails`) | npm + PyPI + GitHub | npm/PyPI registries continue serving |
| **AGIRAILS.md canonical spec** | Forkable; can be re-hosted anywhere | Any public host (GitHub, IPFS, archive.org) |
| **Web Receipts** of past transactions | Pinned to IPFS via Filebase/Pinata | Any IPFS gateway can resolve by CID |
| **EAS attestations** of reputation + deliveries | Live on EAS infrastructure; chain-native | EAS contract on Base |
| **Agent registrations** in AgentRegistry | On-chain mapping survives independently | Base L2 |

## What breaks (gracefully) without AGIRAILS

| Asset | Failure mode | Recovery path |
|---|---|---|
| **Mediator role** | Disputes pile up unresolved | Anyone running an alternative ACTP fork can stand up a community mediator; or migrate to a decentralized mediator implementation. Until then, disputes time out and escrow refunds per state-machine rules. |
| **docs.agirails.io site** | Vercel hosting could lapse | Source is open on `github.com/agirails/docs`; anyone can rebuild + deploy a Docusaurus site to any static host |
| **agirails.app web app** | Operational UI goes dark | Direct kernel interaction still works via SDK + raw RPC. The web app is a convenience, not a dependency. |
| **MCP server** | If AGIRAILS-published version isn't updated, gets stale | Anyone can fork + publish their own (npm + open source) |
| **`actp serve` policy daemon** (AIP-2.1) | Counter-offer routing breaks | Counter-offers can still be exchanged manually via EIP-712 signing; daemon is for convenience |
| **Filebase/Pinata pinning** for new receipts | New receipts wouldn't auto-pin | Anyone can pin via any IPFS pinning service; the protocol doesn't depend on a specific pinner |
| **Daily truth-ledger refresh** in CI | Reference pages go stale | Manual refresh via `npm run truth-ledger`; or stale data, since contract addresses don't change |

## What an inheriting team needs to do

For someone (or some DAO) inheriting ACTP and wanting to keep it running:

1. **Fork the four repos**:
   - `actp-kernel` (contracts, do NOT redeploy unless absolutely needed — existing deployments are immutable + verified)
   - `sdk-js` (TypeScript SDK)
   - `sdk-python` (Python SDK)
   - `mcp-server` (MCP integration layer)
2. **Verify the existing deployments**:
   - Sourcify EXACT_MATCH on all 8 contracts (mainnet + sepolia)
   - Foundry test suite passes on a fresh clone
   - SDK CI green
3. **Set up the mediator role**:
   - Mediator address on mainnet kernel is configurable via the admin Safe
   - Without a mediator, disputes never resolve (escrow stays locked) — this is the most urgent operational continuity item
   - Options: community DAO votes per-dispute, third-party mediator service, automated heuristics
4. **Publish updates via your own npm/PyPI scope** — don't try to take over `@agirails/*` packages; just fork and rename if necessary
5. **Rehost the docs** — clone `agirails/docs`, deploy to any static host, update DNS or just publish a new URL
6. **Operate the canonical AGIRAILS.md** — fork it, version it, keep it updated as you ship changes. The spec doesn't need to live at `agirails.app`; it just needs to live somewhere stable

The protocol doesn't need any one party — including the original AGIRAILS team — to keep running. That's the design.

## Verifying without us

If you don't trust the assertions here and want to verify independently:

1. **Read the spec** — [`agirails.app/protocol/AGIRAILS.md`](https://agirails.app/protocol/AGIRAILS.md) (or mirror it to IPFS via `ipfs add`).
2. **Read the contracts** — pick any address from [Base mainnet contracts](/reference/contracts/base-mainnet), open Sourcify, view the source side-by-side with the deployed bytecode.
3. **Re-compile the contracts** — `git clone github.com/agirails/actp-kernel && forge build && diff <(forge inspect ACTPKernel deployedBytecode) <on-chain bytecode>`. They match.
4. **Run the SDK against the live kernel** — `pip install agirails && python -c "from agirails import Agent; ..."` against Base Sepolia. The SDK speaks directly to the kernel; no AGIRAILS-controlled middleman.
5. **Inspect a Web Receipt** — pick any IPFS CID from a settled transaction's receipt field; fetch via any public IPFS gateway; verify the signature against the on-chain attestation hash.

None of these steps require any AGIRAILS-controlled infrastructure. The trust is in the **chain + open source code + public IPFS**, not in us.

## What this section does NOT cover

- **Internal operational details** — Safe signer ownership, deploy keystore handling, internal CI/CD, domain ownership — those are in the AGIRAILS team's private repo. Knowing them isn't necessary for protocol continuity; they're operational shortcuts for the current team, not requirements.
- **Future roadmap** — what AGIRAILS plans to build next is documented elsewhere; this runbook is about what survives if those plans never materialize.
- **Token economics / governance** — no governance token exists. Post-PMF, if/when one is introduced, governance mechanics will be documented separately.

## See also

- [Security](/security) — the trust model this runbook builds on
- [Verified contracts](/security/contracts) — the immutability claim verified live
- [Protocol overview](/protocol) — the single-page protocol mental model
- [Truth-ledger manifest (raw JSON)](/sdk-manifest.json) — machine-readable reference of everything deployed
