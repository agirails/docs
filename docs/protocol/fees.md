---
slug: /protocol/fees
title: "Fee model"
description: "1% platform fee with a $0.05 USDC minimum (MIN_FEE), both enforced on-chain since V3 mainnet redeploy. Platform-fee BPS capped at 500 (5%) by kernel constant. AIP-5 locks per-transaction rates."
schema_type: TechArticle
last_verified: 2026-05-26
verified_against: "actp-kernel V3 _payoutProviderAmount + AIP-5"
tags: [fees, MIN_FEE, AIP-5, INV-30]
sidebar_position: 6
---

# Fee model

ACTP charges **1% of transaction value, with a $0.05 USDC minimum** ("MIN_FEE"). Both bounds are enforced in-kernel since the V3 mainnet redeploy on 2026-05-19.

| Bound | Value | Where enforced |
|---|---|---|
| `platformFeeBps` | 100 (1%) | Per-tx locked via AIP-5; admin can update for **new** tx up to the BPS cap |
| `MIN_FEE` | $0.05 USDC | Kernel constant; checked in `_payoutProviderAmount` |
| Fee BPS cap | 500 (5%) | Kernel-hardcoded; admin cannot exceed |

## How the fee is computed

For a transaction with `amount = 5_000_000` micro-USDC ($5.00) and `platformFeeBpsLocked = 100` (1%):

```text
percentFee = amount * platformFeeBpsLocked / 10000
           = 5_000_000 * 100 / 10000
           = 50_000   ($0.05)

platformFee = max(percentFee, MIN_FEE)
            = max(50_000, 50_000)
            = 50_000   ($0.05)

providerNet = amount - platformFee
            = 5_000_000 - 50_000
            = 4_950_000  ($4.95)
```

For a smaller transaction with `amount = 2_000_000` ($2.00):

```text
percentFee = 2_000_000 * 100 / 10000 = 20_000  ($0.02)
platformFee = max(20_000, 50_000) = 50_000     ← MIN_FEE wins
providerNet = 2_000_000 - 50_000 = 1_950_000   ($1.95)
```

The MIN_FEE pulls the effective rate above 1% for small transactions. Below $5.00 the consumer pays > 1%; at $5.00 exactly the two converge; above $5.00 it's always 1%.

## Why MIN_FEE exists

Sub-cent transactions on Base L2 are essentially free for the requester but still cost the protocol fixed gas to settle. MIN_FEE makes sure each transaction contributes meaningfully to the platform; without it, micropayments would be subsidized by larger transactions. For workflows where MIN_FEE is too expensive, use [x402](/protocol/x402) — different settlement path, **no protocol fee**.

## Pre-V3 vs V3

Pre-V3, MIN_FEE was an SDK-only convention — clients could bypass by interacting with the kernel directly. V3 closes that gap: every settlement path inside the kernel enforces the floor. Web app and SDK paths were always correct; raw-kernel callers (rare in practice) sometimes weren't.

## AIP-5 — per-transaction locked rate

When a transaction is created, the current `platformFeeBps` value is captured into `platformFeeBpsLocked` and stored alongside the tx. This per-tx value is **immutable** for the transaction's lifetime.

The implication: if admin lowers the fee from 100 → 50 bps later, **in-flight transactions** continue settling at 100. New transactions get 50. A malicious or compromised admin can't retroactively skim fees from already-locked escrows.

This is one of the **three fields** locked per-transaction at creation, the others being `disputeBondBpsLocked` (AIP-14) and `requesterPenaltyBpsLocked`. Collectively they form INV-30 — "frozen economic terms" for every transaction. See [INV-30 explainer](/protocol/escrow#inv-30--per-transaction-locked-bps).

## Fee recipient

The fee accumulates in `feeRecipient` (initially the AGIRAILS Treasury Safe; rotatable by admin via `updateFeeRecipient` with timelock). Withdrawals from the recipient are public on-chain events — you can audit them.

## x402 zero-fee path

The `X402Adapter` route on Base mainnet goes **direct buyer → seller**, no ACTP protocol fee. The buyer pays the seller's stated amount; settlement is via EIP-3009 / Permit2; no AGIRAILS kernel touch. This is by design — x402 is for use cases where the protocol overhead doesn't add value (e.g., $0.001/call inference).

On sepolia, the deprecated `X402Relay` contract takes a configurable small bps cut for fee-splitting test scenarios. Not used in production.

## See also

- [Escrow mechanism](/protocol/escrow) — where the fee actually gets paid out
- [INV-30](/protocol/escrow#inv-30--per-transaction-locked-bps) — fee locking guarantees
- [x402 v2](/protocol/x402) — the zero-fee alternative path
- [Contracts — mainnet ACTPKernel](/reference/contracts/base-mainnet) — `platformFeeBps` current value
- [AIP-5 spec](https://github.com/agirails/aips/blob/main/AIPs/AIP-5.md) — fee locking
