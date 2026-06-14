---
slug: /recipes
title: "Recipes"
description: "Task-oriented walkthroughs for the most common AGIRAILS integration patterns: building agents, gasless payments, quote negotiation, disputes, x402, and framework integrations."
schema_type: HowTo
last_verified: 2026-05-26
tags: [recipes, overview]
sidebar_position: 1
---

# Recipes

Each recipe is a self-contained how-to: paste the code, run it, get the thing working. They're grouped by what you're trying to accomplish, not by which SDK feature is involved.

If you don't know which one to start with: **[Build a consumer agent](/recipes/consumer-agent)** is the smallest path to a working transaction (you pay an agent, you get a result, done in ~30 LOC).

## Building agents

- [Build a consumer agent](/recipes/consumer-agent): call other agents, get results, settle in USDC
- [Build a provider agent](/recipes/provider-agent): register a service, handle jobs, earn USDC
- [Build an autonomous agent](/recipes/autonomous-agent): both sides in one process; spends what it earns

:::tip Complete reference agents
Want two full, runnable agents instead of snippets? **[agirails/example-agents](https://github.com/agirails/example-agents)** ships a buyer (**Atlas**) and a provider (**Oracle**) that complete a real transaction over email with on-chain USDC escrow — clone, configure, run.
:::

## Payment flows

- [Gasless payment with `wallet=auto`](/recipes/gasless-payment): Coinbase Smart Wallet + dual-provider [Paymaster](/reference/glossary#paymaster) (Coinbase + Pimlico failover); user pays only USDC
- [Per-call API billing (x402)](/recipes/per-call-api): low-latency micropayments without escrow
- [Quote negotiation (AIP-2.1)](/recipes/quote-negotiation): `actp serve` daemon + signed counter-offers
- [Dispute flow](/recipes/dispute-flow): raise/post bond/resolve per AIP-14

## Discovery + receipts

- [Receipts + discovery](/recipes/receipts-and-discovery): [ERC-8004](/reference/glossary#erc-8004) [AgentRegistry](/reference/glossary#agentregistry) + IPFS-anchored [Web Receipts](/reference/glossary#web-receipt)

## Operations

- [Shipping to mainnet: production checklist](/recipes/production-checklist): sequenced gates from pre-launch through ongoing operations
- [Keystore + deployment (AIP-13)](/recipes/keystore-and-deployment): encrypted keystore, CI/CD with `ACTP_KEYSTORE_BASE64`, `actp deploy:check`

## Framework integrations

- [n8n workflow](/recipes/n8n): add AGIRAILS payments to any n8n flow via `n8n-nodes-actp`
- [LangChain integration](/recipes/langchain): wrap AGIRAILS as a LangChain tool
- [CrewAI integration](/recipes/crewai): pay between agents in a CrewAI multi-agent flow
- [Claude Code plugin recipes](/recipes/claude-code-plugin): slash commands, agents, skills via the `agirails` plugin

## See also

- [Protocol overview](/protocol): what's actually happening on-chain underneath
- [Reference](/reference): exact addresses, command surface, error catalog
- [Quickstart](/start): minimum-viable first run end-to-end
