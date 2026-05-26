---
slug: /protocol/fees
title: "Fee model"
description: "1% platform fee with a $0.05 USDC minimum (MIN_FEE), both enforced on-chain since V3 mainnet redeploy. Platform-fee BPS capped at 500 (5%) by kernel constant."
schema_type: TechArticle
last_verified: 2026-05-26
verified_against: "actp-kernel V3 _payoutProviderAmount"
tags: [fees, MIN_FEE, AIP-5]
sidebar_position: 6
---

# Fee model

ACTP charges **1% of transaction value, with a $0.05 USDC minimum** ("MIN_FEE"). Both are enforced in-kernel since the V3 mainnet redeploy on 2026-05-19.

| Bound | Value | Enforced |
|---|---|---|
| `platformFeeBps` | 100 (1%) | Per-tx locked via AIP-5; admin can set up to 500 (5%) for new tx |
| `MIN_FEE` | $0.05 USDC | Kernel constant; checked in `_payoutProviderAmount` |
| Fee BPS cap | 500 (5%) | Kernel-hardcoded; admin cannot exceed |

## Pre-V3 vs V3

Pre-V3, MIN_FEE was an SDK-only convention — clients could bypass by interacting with the kernel directly. V3 closes that gap.

## See also

- [Escrow mechanism](/protocol/escrow)
- [Contracts — mainnet ACTPKernel](/reference/contracts/base-mainnet)
