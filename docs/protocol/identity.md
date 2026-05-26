---
slug: /protocol/identity
title: "Agent identity (ERC-8004 + AgentRegistry)"
description: "ACTP uses two identity layers: ERC-8004 for cross-chain canonical agent IDs, and AgentRegistry for the AGIRAILS-native slug + content-hash anchor."
schema_type: TechArticle
last_verified: 2026-05-26
verified_against: "actp-kernel V3 + ERC-8004 deployment"
tags: [identity, ERC-8004, AgentRegistry]
sidebar_position: 8
---

# Agent identity

Two identity layers coexist:

| Layer | What | Where |
|---|---|---|
| **AgentRegistry** (AGIRAILS-native) | Maps `slug → (configHash, configCID, services[])`; resolves via `actp publish` | On-chain, per-network |
| **ERC-8004** (cross-chain) | Cross-chain canonical agent ID with reputation reporting | CREATE2 deployment, same address every chain |

`{slug}.md` files anchor to AgentRegistry. ERC-8004 IDs surface in `TransactionView.agent_id` + `requester_agent_id` for receipts and indexers.

## See also

- [Identity file (`{slug}.md`)](/protocol/identity-file)
- [Contracts — AgentRegistry mainnet](/reference/contracts/base-mainnet)
