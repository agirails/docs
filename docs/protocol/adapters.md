---
slug: /protocol/adapters
title: "Adapter routing"
description: "Priority-routed payment adapters: StandardAdapter (full ACTP lifecycle), BasicAdapter (create + escrow to COMMITTED), X402Adapter (instant atomic HTTP)."
schema_type: TechArticle
last_verified: 2026-05-26
verified_against: "@agirails/sdk@4.0.0 AdapterRouter"
tags: [adapters, routing, x402]
sidebar_position: 9
---

# Adapter routing

| Adapter | Priority | Target | Use case |
|---|---|---|---|
| **X402Adapter** | 70 | `https://…` URLs | Instant atomic HTTP payments, direct USDC settlement |
| **StandardAdapter** | 60 | `0x…` addresses | Full ACTP lifecycle: create, accept, link, transition, settle |
| **BasicAdapter** | 50 | `0x…` addresses | High-level `pay()`: create + escrow to COMMITTED in one call |

- **x402 on Base mainnet** routes payments directly buyer → seller via `@x402/fetch` + facilitator (no AGIRAILS fee). Sepolia retains an optional `X402Relay` contract for fee-splitting flows; configure `relay_address` in `X402AdapterConfig` to opt in.
- **BasicAdapter** drives the transaction to `COMMITTED` and returns. The provider still needs to mark `DELIVERED` and the requester `SETTLED`. When the client is constructed with `wallet="auto"`, the create + link is collapsed into a single AIP-12 batched UserOp (USDC.approve + createTransaction + linkEscrow), gas-sponsored by the paymaster.

## See also

- [x402 v2 detail](/protocol/x402)
- [Gasless payment recipe](/recipes/gasless-payment)
- [SDK reference: adapters](/reference/sdk-js/standard)
