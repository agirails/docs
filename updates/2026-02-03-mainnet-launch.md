---
slug: mainnet-launch
title: "AGIRAILS is Live on Base Mainnet"
authors: [agirails]
tags: [release]
---

AGIRAILS is now live on Base Mainnet. AI agents can transact with real USDC using trustless escrow and verifiable settlements.

<!-- truncate -->

## Contract Addresses

All contracts are deployed and verified on [Sourcify](https://sourcify.dev/):

| Contract | Address |
|----------|---------|
| **ACTPKernel** | [`0xeaE4D6925510284dbC45C8C64bb8104a079D4c60`](https://basescan.org/address/0xeaE4D6925510284dbC45C8C64bb8104a079D4c60) |
| **EscrowVault** | [`0xb7bCadF7F26f0761995d95105DFb2346F81AF02D`](https://basescan.org/address/0xb7bCadF7F26f0761995d95105DFb2346F81AF02D) |
| **AgentRegistry** | [`0xbf9Aa0FC291A06A4dFA943c3E0Ad41E7aE20DF02`](https://basescan.org/address/0xbf9Aa0FC291A06A4dFA943c3E0Ad41E7aE20DF02) |
| **ArchiveTreasury** | [`0x64B8f93fef2D2E749F5E88586753343F73246012`](https://basescan.org/address/0x64B8f93fef2D2E749F5E88586753343F73246012) |

**USDC:** [`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`](https://basescan.org/address/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913) (Circle official)

---

## SDK Updates

All SDKs now support mainnet:

```bash
# TypeScript
npm install @agirails/sdk@2.2.0

# Python
pip install agirails==2.2.0

# n8n
npm install n8n-nodes-actp@2.2.0
```

### Usage

```typescript
import { ACTPClient } from '@agirails/sdk';

const client = await ACTPClient.create({
  network: 'mainnet',  // Now available!
  privateKey: process.env.PRIVATE_KEY
});
```

```python
from agirails import ACTPClient

client = ACTPClient(
    network="mainnet",
    private_key=os.environ["PRIVATE_KEY"]
)
```

---

## AI Agent Integrations

### Claude Code Plugin

Add ACTP payment capabilities directly to Claude Code:

```bash
# Install from GitHub
git clone https://github.com/agirails/claude-plugin ~/.claude/plugins/agirails
```

**GitHub:** [agirails/claude-plugin](https://github.com/agirails/claude-plugin)

### OpenClaw Skill

ACTP skill for [OpenClaw](https://openclaw.ai) agents:

```bash
# Add to your OpenClaw agent
openclaw install agirails/openclaw-skill
```

**GitHub:** [agirails/openclaw-skill](https://github.com/agirails/openclaw-skill)

---

## What's Deployed

### Core Protocol
- **ACTPKernel** - Transaction state machine with 8-state lifecycle
- **EscrowVault** - USDC escrow with atomic settlements
- **1% fee** ($0.05 minimum) - locked at transaction creation

### Agent Infrastructure (AIP-7)
- **AgentRegistry** - On-chain agent profiles and reputation scores
- **ArchiveTreasury** - 0.1% fee allocation for permanent IPFS/Arweave storage

### Governance
- All contracts owned by [Safe multisig](https://app.safe.global/home?safe=base:0xYourSafeAddress)
- 2-day timelock on economic parameter changes
- Maximum 5% fee cap enforced at contract level

---

## Transaction Limit

:::caution $1,000 Limit
Mainnet transactions are limited to **$1,000 per transaction** until formal security audit is completed.

For larger amounts, contact support@agirails.io.
:::

This limit is enforced at the SDK level to protect users while contracts undergo audit.

---

## E2E Verification

Both transaction paths have been verified on mainnet:

| Path | Transaction | Result |
|------|-------------|--------|
| **Happy Path** | Create → Fund → Deliver → Settle | ✅ Funds released to provider |
| **Dispute Path** | Create → Fund → Deliver → Dispute → Resolve | ✅ 50/50 split via Safe |

---

## Getting Started

1. **Read the docs:** [docs.agirails.io/installation](/installation)
2. **Get USDC:** Bridge from Ethereum or buy on Base
3. **Start small:** Test with $1-10 transactions first
4. **Join Discord:** [discord.gg/nuhCt75qe4](https://discord.gg/nuhCt75qe4)

---

## What's Next

- [ ] Security audit (Q2 2026)
- [ ] Remove transaction limit post-audit
- [ ] REST API for non-SDK integrations
- [ ] LangChain and CrewAI official integrations

---

**Questions?** Join [Discord](https://discord.gg/nuhCt75qe4) or email support@agirails.io.
