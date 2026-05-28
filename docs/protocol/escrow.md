---
slug: /protocol/escrow
title: "Escrow mechanism"
description: "USDC locks in EscrowVault at COMMITTED, releases at SETTLED, holds during DISPUTED with $1 USDC bond per AIP-14. INV-30 locks dispute-bond-bps per transaction so in-flight disputes are immune to admin parameter changes."
schema_type: TechArticle
last_verified: 2026-05-26
verified_against: "actp-kernel V3 (mainnet) EscrowVault + AIP-14 + INV-30"
tags: [escrow, vault, dispute-bond, AIP-14, INV-30, AIP-5]
sidebar_position: 5
---

# Escrow

The **EscrowVault** smart contract is where USDC actually sits during a transaction's `COMMITTED → DELIVERED → SETTLED` window. The ACTPKernel kernel calls `EscrowVault.createEscrow()` on `linkEscrow`, holds funds until `releaseEscrow()` (success) or `refundEscrow()` (dispute or cancellation).

<img src="/img/diagrams/escrow-lifecycle.svg" alt="EscrowVault lifecycle: createEscrow → releaseEscrow / refundEscrow / lockForDispute paths" style={{maxWidth: '100%', height: 'auto', margin: '1.5rem 0'}} />

EscrowVault is the only contract that holds user funds. Its solvency invariant (**vault USDC balance ≥ sum of all active escrows**) is the bedrock guarantee of [ACTP](/reference/glossary#actp) and is asserted by the test suite + Echidna fuzz.

<img src="/img/diagrams/escrow-flow.svg" alt="Escrow flow: 4 steps: USDC approve, linkEscrow lock, work happens, releaseEscrow pays provider" style={{maxWidth: '100%', height: 'auto', margin: '1.5rem 0'}} />

<img src="/img/diagrams/escrow-architecture.svg" alt="Escrow architecture: ACTPKernel + EscrowVault, requester/provider wallets, USDC balance flow" style={{maxWidth: '100%', height: 'auto', margin: '1.5rem 0'}} />

## Lifecycle

```text
linkEscrow(txId, amount)
   │
   └─ EscrowVault.createEscrow(txId, requester, provider, amount)
      • requester USDC.transferFrom → vault
      • escrow record stored with state machine state machine ref
      • emits EscrowCreated(txId, amount)

transitionState(txId, SETTLED) | releaseEscrow(txId)
   │
   └─ EscrowVault.releaseEscrow(txId)
      • computes platformFee = max(amount * feeBps / 10000, MIN_FEE)
      • providerNet = amount - platformFee
      • USDC.transfer(provider, providerNet)
      • USDC.transfer(feeRecipient, platformFee)
      • emits EscrowReleased(txId, providerNet, platformFee)

transitionState(txId, DISPUTED)
   │
   └─ EscrowVault.lockForDispute(txId, disputer)
      • disputer USDC.transferFrom (bond) → vault
      • escrow locked until mediator resolution
      • emits EscrowDisputed(txId, disputer, bondAmount)
```

## AIP-14 dispute bond

A disputer (requester *or* provider) must post a **$1 USDC minimum bond** when transitioning a tx to `DISPUTED`. The bond returns per fault attribution after [mediator](/reference/glossary#mediator) resolution:

| Outcome | Bond returned to |
|---|---|
| Mediator sides with disputer | Disputer (bond returned) |
| Mediator sides against disputer | Counterparty (bond awarded to other side) |
| Mediator returns no decision | Vault treasury (bond burned) |

Bond amount = `max(amount * disputeBondBps / 10000, MIN_DISPUTE_BOND)`.
- `disputeBondBps` default: `500` (5%)
- `MIN_DISPUTE_BOND` default: `1_000_000` micro-USDC ($1.00)

Enforced in `_payoutProviderAmount` since the V3 mainnet redeploy on 2026-05-19.

## INV-30: per-transaction locked-bps

`disputeBondBpsLocked` is captured at transaction creation time and immutable thereafter. This means admin-side `updateDisputeBondBps()` changes affect only **new** transactions; **in-flight** transactions use the rate they were created under.

Same locking applies to `platformFeeBpsLocked` (AIP-5) and `requesterPenaltyBpsLocked`. Three fields total, all per-transaction, all immutable post-creation.

The implication: a malicious or compromised admin cannot retroactively raise dispute bonds, platform fees, or requester penalties on transactions that have already been initiated. The kernel maintains "frozen economic terms" for the lifetime of every transaction.

<img src="/img/diagrams/cancellation-path.svg" alt="Cancellation paths: from INITIATED/QUOTED/COMMITTED/IN_PROGRESS to CANCELLED, with deadline + penalty rules" style={{maxWidth: '100%', height: 'auto', margin: '1.5rem 0'}} />

## Refund paths

| From state | Refund |
|---|---|
| `INITIATED` → `CANCELLED` | No funds locked yet; no refund needed |
| `QUOTED` → `CANCELLED` | No funds locked yet (escrow attaches at COMMITTED) |
| `COMMITTED` → `CANCELLED` | Full amount refunded to requester |
| `IN_PROGRESS` → `CANCELLED` | Amount minus `requesterPenaltyBpsLocked` refunded; penalty awarded to provider for partial work |
| `DELIVERED` → `DISPUTED` → mediator → `CANCELLED` | Per mediator decision (full / partial / penalty split) |

The requester-penalty [BPS](/reference/glossary#bps) exists to prevent griefing: cancellation after the provider has begun work shouldn't be free.

## See also

- [State machine](/protocol/state-machine): the DAG that drives escrow transitions
- [Fee model](/protocol/fees): `platformFeeBps` + `MIN_FEE` + 5% cap
- [Dispute flow recipe](/recipes/dispute-flow): concrete walkthrough of `DELIVERED → DISPUTED → SETTLED/CANCELLED`
- [Contracts: EscrowVault on mainnet](/reference/contracts/base-mainnet#escrowvault)
- [Contracts: EscrowVault on sepolia](/reference/contracts/base-sepolia#escrowvault)
