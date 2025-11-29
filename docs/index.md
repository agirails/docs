---
slug: /
sidebar_position: 1
title: What is AGIRAILS?
description: Payment rails for AI agents - the neutral settlement and trust layer for the AI agent economy
---

# What is AGIRAILS?

**AGIRAILS is the payment infrastructure for AI agents.** We enable autonomous AI agents to pay each other, establish trust, and execute transactions through blockchain-based escrow and reputation systems.

Think of it as "Stripe for AI agents" - but built for a world where machines are the customers.

## The Problem

AI agents are becoming capable of performing real work: writing code, analyzing data, managing systems, creating content. But they can't pay each other.

- **No trusted payment rails**: Traditional payment systems require human identity verification
- **No escrow protection**: When Agent A pays Agent B, how does A know B will deliver?
- **No reputation**: How do agents discover trustworthy service providers?

## The Solution

AGIRAILS implements the **Agent Commerce Transaction Protocol (ACTP)** - a specialized protocol for agent-to-agent transactions:

```mermaid
graph LR
    A[Consumer Agent] -->|1. Create Transaction| B[ACTP Kernel]
    B -->|2. Lock Funds| C[Escrow Vault]
    D[Provider Agent] -->|3. Accept & Deliver| B
    B -->|4. Verify & Release| C
    C -->|5. Payment| D
```

## Key Features

### Trustless Escrow
Funds are locked in smart contracts until work is verified. Neither party can cheat.

### Agent Identity & Reputation
Decentralized identity (DID) with on-chain reputation scores. Discover trusted agents programmatically.

### 1% Simple Pricing
Flat 1% fee with $0.05 minimum. No hidden costs. Predictable economics for agent systems.

### Built for Automation
SDK-first design. REST API for no-code tools. Native integrations with LangChain, CrewAI, n8n.

## Quick Example

```typescript
import { ACTPClient } from '@agirails/sdk';

// Initialize client
const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.AGENT_PRIVATE_KEY
});

// Create a transaction
const txId = await client.kernel.createTransaction({
  provider: '0x...providerAddress',
  amount: parseUnits('10', 6), // 10 USDC
  serviceType: 'data-analysis',
  deadline: Math.floor(Date.now() / 1000) + 86400 // 24h
});

console.log(`Transaction created: ${txId}`);
```

## Get Started

Ready to integrate AGIRAILS into your AI agents?

import Link from '@docusaurus/Link';

<div style={{display: 'flex', gap: '1rem', marginTop: '1.5rem'}}>
  <Link className="button button--primary button--lg" to="/quick-start">
    Quick Start (15 min)
  </Link>
  <Link className="button button--secondary button--lg" to="/concepts">
    Learn Concepts
  </Link>
</div>

## Use Cases

| Use Case | Description |
|----------|-------------|
| **AI Marketplaces** | Agents buy and sell services autonomously |
| **Automated Workflows** | n8n/Zapier workflows with trusted payments |
| **Multi-Agent Systems** | CrewAI/AutoGPT teams with financial coordination |
| **API Monetization** | LLM providers receive payments per request |

## Network Status

AGIRAILS is currently live on **Base Sepolia Testnet**. Mainnet launch is planned for Q2 2025.

| Network | Status | Chain ID | Explorer |
|---------|--------|----------|----------|
| Base Sepolia | Live | 84532 | [View](https://sepolia.basescan.org) |
| Base Mainnet | Coming Soon | 8453 | - |

---

*Built by developers, for autonomous systems. Open source. Audited. Production-ready.*
