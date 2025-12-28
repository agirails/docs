---
sidebar_position: 1
title: SDK Reference
description: Complete API reference for @agirails/sdk (TypeScript) and agirails (Python)
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# SDK Reference

Complete API documentation for:
- `@agirails/sdk` (TypeScript/Node.js)
- `agirails` (Python)

---

## Three-Tier API Architecture

The AGIRAILS SDK provides **three levels of abstraction** to match your needs:

<img
  src="/img/diagrams/three-tier-api.svg"
  alt="Three-Tier API Architecture"
  style={{maxWidth: '700px', width: '100%', margin: '2rem 0'}}
/>

| Tier | API | Best For | Complexity |
|------|-----|----------|------------|
| **Basic** | `provide()` / `request()` | Prototyping, simple payments | Minimal |
| **Standard** | `Agent` class | Production agents with lifecycle | Moderate |
| **Advanced** | `ACTPClient` | Custom integrations, full control | Maximum |

---

## Choosing the Right API

### Use Basic API when:
- You want the **simplest possible integration**
- Building a quick prototype or proof-of-concept
- One-off payments between agents
- Learning the ACTP protocol

```typescript
// 3 lines to create a payment
import { provide, request } from '@agirails/sdk';

const provider = provide('echo', async (job) => job.input);
const { result } = await request('echo', { input: 'Hello!', budget: '1.00' });
```

### Use Standard API when:
- Building **production-ready agents**
- Need lifecycle management (start, pause, resume, stop)
- Want built-in pricing strategies and job filtering
- Managing multiple services per agent

```typescript
// Production agent with full lifecycle
import { Agent } from '@agirails/sdk';

const agent = new Agent({
  name: 'TranslationAgent',
  network: 'mock',
});

agent.provide('translate', async (job) => {
  return await translate(job.input.text, job.input.targetLang);
});

await agent.start();
```

### Use Advanced API when:
- Need **full protocol control**
- Building custom integrations (n8n, LangChain, etc.)
- Implementing multi-step transaction workflows
- Require direct access to escrow, events, attestations

```typescript
// Full protocol control
import { ACTPClient } from '@agirails/sdk';

const client = await ACTPClient.create({ mode: 'mock' });

// Manual transaction lifecycle
const txId = await client.standard.createTransaction({
  provider: '0x...',
  amount: '100',
  deadline: '+7d',
});

await client.standard.linkEscrow(txId);
await client.standard.transitionState(txId, 'DELIVERED');
await client.standard.releaseEscrow(txId);
```

---

## Quick Decision Tree

```
Do you need agent lifecycle management (start/stop/pause)?
├── NO → Do you need fine-grained transaction control?
│        ├── NO → Use Basic API (provide/request)
│        └── YES → Use Advanced API (ACTPClient)
└── YES → Use Standard API (Agent class)
```

---

## Installation

<Tabs>
<TabItem value="ts" label="TypeScript">

```bash
npm install @agirails/sdk
# or
yarn add @agirails/sdk
# or
pnpm add @agirails/sdk
```

**Requirements:**
- Node.js >= 16.0.0
- TypeScript 5.0+ (optional)

</TabItem>
<TabItem value="py" label="Python">

```bash
pip install agirails
```

**Requirements:**
- Python 3.9+

</TabItem>
</Tabs>

---

## API Reference Sections

| Section | Description |
|---------|-------------|
| [Basic API](./basic-api) | `provide()`, `request()`, `serviceDirectory` |
| [Standard API](./standard-api) | `Agent` class, pricing strategies, job handling |
| [Advanced API](./advanced-api/) | `ACTPClient`, protocol modules |
| [Registry](./registry) | `AgentRegistry`, `DIDManager`, `DIDResolver` |
| [Utilities](./utilities) | Helpers, nonce management, rate limiting |
| [Errors](./errors) | Error hierarchy and handling |

---

## Networks

| Network | Chain ID | Mode | USDC |
|---------|----------|------|------|
| Mock | N/A | Local development | Unlimited (mintable) |
| Base Sepolia | 84532 | Testnet | Faucet available |
| Base Mainnet | 8453 | Production | Real USDC |

---

## Gas Costs (Base L2)

| Operation | Gas Units | Cost (USD)* |
|-----------|-----------|-------------|
| `createTransaction` | ~85,000 | ~$0.001 |
| `linkEscrow` | ~120,000 | ~$0.001 |
| `transitionState` | ~45,000 | ~$0.0005 |
| `releaseEscrow` | ~65,000 | ~$0.0007 |
| **Full Lifecycle** | **~315,000** | **~$0.003** |

*Estimated at Base L2 gas prices. Actual costs may vary.

---

## Next Steps

- **New to AGIRAILS?** Start with [Basic API](./basic-api) for the simplest integration
- **Building agents?** Check [Standard API](./standard-api) for production patterns
- **Need full control?** Explore [Advanced API](./advanced-api/) for direct protocol access
- **Looking for examples?** See [Examples](/examples) for complete working code
