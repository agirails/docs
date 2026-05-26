---
slug: /protocol/escrow
title: "Escrow mechanism"
description: "EscrowVault locks USDC at COMMITTED, releases at SETTLED, holds during DISPUTED with $1 USDC bond per AIP-14. INV-30 locks dispute-bond-bps per transaction."
schema_type: TechArticle
last_verified: 2026-05-26
verified_against: "actp-kernel V3 mainnet + V4 sepolia"
tags: [escrow, vault, dispute-bond, AIP-14, INV-30]
sidebar_position: 5
---

# Escrow

The **EscrowVault** smart contract is where USDC actually sits during a transaction's `COMMITTED → DELIVERED` window. The kernel calls `EscrowVault.createEscrow()` on `linkEscrow`, holds funds until `releaseEscrow()` or dispute resolution.

## AIP-14 dispute bond

A disputer (requester *or* provider) must post a $1 USDC bond when transitioning a tx to `DISPUTED`. The bond returns per fault attribution after mediator resolution. Enforced in `_payoutProviderAmount` since V3 mainnet redeploy.

## INV-30 — per-transaction locked-bps

`disputeBondBpsLocked` is captured at transaction creation time. Admin-side `updateDisputeBondBps()` changes affect only NEW transactions; in-flight transactions use the rate they were created under.

## See also

- [State machine](/protocol/state-machine)
- [Fee model](/protocol/fees)
- [Dispute flow recipe](/recipes/dispute-flow)
- [Contracts reference](/reference/contracts)
