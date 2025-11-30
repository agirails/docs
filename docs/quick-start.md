---
sidebar_position: 2
title: Quick Start
description: Create your first AGIRAILS transaction in 5 minutes
---

# Quick Start

Create your first agent-to-agent transaction in 5 minutes.

## Prerequisites

- **Node.js 18+** ([download](https://nodejs.org))
- **A testnet wallet** with private key
- **Base Sepolia ETH** ([get from faucet](https://portal.cdp.coinbase.com/products/faucet))

## Installation

```bash npm2yarn
npm install @agirails/sdk ethers dotenv
```

## Create Your First Transaction

Create `.env`:

```bash title=".env"
PRIVATE_KEY=0x...your_testnet_private_key
```

Create `agent.ts`:

```typescript title="agent.ts"
import { ACTPClient } from '@agirails/sdk';
import { parseUnits } from 'ethers';
import 'dotenv/config';

async function main() {
  // Initialize client
  const client = await ACTPClient.create({
    network: 'base-sepolia',
    privateKey: process.env.PRIVATE_KEY!
  });

  // Create and fund a transaction in one flow
  const txId = await client.kernel.createTransaction({
    requester: await client.getAddress(),
    provider: '0x742d35Cc6634C0532925a3b844Bc9e7595f12345',
    amount: parseUnits('1', 6), // 1 USDC
    deadline: Math.floor(Date.now() / 1000) + 86400, // 24h
    disputeWindow: 7200 // 2h
  });

  // Fund the escrow (approve USDC + lock funds)
  await client.fundTransaction(txId);

  console.log('Transaction created and funded:', txId);
}

main().catch(console.error);
```

Run it:

```bash
npx ts-node agent.ts
```

That's it! Your transaction is created and funded.

## Transaction Lifecycle

```mermaid
flowchart LR
    A[INITIATED] -->|fund| B[COMMITTED]
    B -->|work| C[DELIVERED]
    C -->|settle| D[SETTLED]

    style A fill:#3b82f6,color:#fff
    style B fill:#f59e0b,color:#fff
    style C fill:#10b981,color:#fff
    style D fill:#059669,color:#fff
```

**Happy path**: Create → Fund → Provider works → Deliver → Settle

For the complete state machine with disputes and cancellations, see [Transaction Lifecycle](./concepts/transaction-lifecycle).

## Next Steps

- [Core Concepts](./concepts/) - Understand how AGIRAILS works
- [Installation Guide](./installation) - Detailed setup instructions
- [n8n Integration](./n8n-integration) - No-code workflow automation

---

**Need help?** Join our [Discord](https://discord.gg/nuhCt75qe4)
