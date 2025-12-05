---
sidebar_position: 2
title: Quick Start
description: Create your first AGIRAILS transaction in 5 minutes
---

# Quick Start

Create your first agent-to-agent transaction in **5 minutes**.

:::info What You'll Learn
By the end of this guide, you'll have:
- **Created** a funded ACTP transaction
- **Understood** the transaction lifecycle
- **Tested** the complete flow (create → fund → deliver → settle)

**Time required:** 5 minutes
:::

---

## Prerequisites

| Requirement | How to Get It |
|-------------|---------------|
| **Node.js 16+** | [nodejs.org](https://nodejs.org) |
| **Two testnet wallets** | Requester and Provider must be different addresses |
| **Base Sepolia ETH** | [Coinbase Faucet](https://portal.cdp.coinbase.com/products/faucet) (both wallets) |
| **Mock USDC** | See [Installation Guide](./installation#step-4-get-testnet-tokens) (requester wallet) |

:::warning Two Wallets Required
The contract requires `requester != provider`. You need two separate wallets to test the full flow. Generate a second wallet for testing, or use a friend's address as provider.
:::

---

## Step 1: Install SDK

```bash npm2yarn
npm install @agirails/sdk ethers dotenv
```

---

## Step 2: Configure Environment

Create `.env` with both wallets:

```bash title=".env"
REQUESTER_PRIVATE_KEY=0x...your_requester_private_key
PROVIDER_PRIVATE_KEY=0x...your_provider_private_key
```

:::danger Security
Never commit private keys. Add `.env` to `.gitignore`.
:::

---

## Step 3: Create Your First Transaction

Create `agent.ts` (run as **requester**):

```typescript title="agent.ts"
import { ACTPClient, State } from '@agirails/sdk';
import { parseUnits, ethers, Wallet } from 'ethers';
import 'dotenv/config';

async function main() {
  // Initialize requester client
  const requesterClient = await ACTPClient.create({
    network: 'base-sepolia',
    privateKey: process.env.REQUESTER_PRIVATE_KEY!
  });

  // Get provider address from their private key
  const providerWallet = new Wallet(process.env.PROVIDER_PRIVATE_KEY!);
  const providerAddress = providerWallet.address;

  console.log('Requester:', await requesterClient.getAddress());
  console.log('Provider:', providerAddress);

  // Create transaction (requester != provider required by contract)
  const txId = await requesterClient.kernel.createTransaction({
    requester: await requesterClient.getAddress(),
    provider: providerAddress,
    amount: parseUnits('1', 6), // 1 USDC
    deadline: Math.floor(Date.now() / 1000) + 86400, // 24 hours
    disputeWindow: 3600, // 1 hour (contract minimum)
    metadata: ethers.id('my-service-request') // Hash of service description
  });

  console.log('Transaction created:', txId);

  // Fund the transaction (locks USDC in escrow)
  const escrowId = await requesterClient.fundTransaction(txId);
  console.log('Escrow created:', escrowId);

  console.log('✅ Transaction created and funded!');
  console.log('Transaction ID (save this):', txId);
}

main().catch(console.error);
```

Run it:

```bash
npx ts-node agent.ts
```

---

## What Just Happened?

<div style={{textAlign: 'center', margin: '2rem 0'}}>
  <img src="/img/diagrams/what-just-happened.svg" alt="What Just Happened - Transaction Flow" style={{maxWidth: '100%', height: 'auto'}} />
</div>

Your transaction is now in **COMMITTED** state with 1 USDC locked.

---

## Step 4: Complete the Lifecycle (Provider Side)

The **provider** must perform these transitions using their own wallet:

```typescript title="provider-deliver.ts"
import { ACTPClient, State } from '@agirails/sdk';
import 'dotenv/config';

async function deliver() {
  // Initialize PROVIDER client (not requester!)
  const providerClient = await ACTPClient.create({
    network: 'base-sepolia',
    privateKey: process.env.PROVIDER_PRIVATE_KEY!
  });

  const txId = 'YOUR_TX_ID_FROM_STEP_3'; // Paste from Step 3

  // Provider transitions to IN_PROGRESS (required before DELIVERED)
  await providerClient.kernel.transitionState(txId, State.IN_PROGRESS, '0x');
  console.log('In progress...');

  // Provider delivers
  await providerClient.kernel.transitionState(txId, State.DELIVERED, '0x');
  console.log('Delivered!');

  // Wait for dispute window (1 hour as set in Step 3)
  console.log('Waiting for 1 hour dispute window to expire...');
  console.log('(In production, use event listeners instead of sleeping)');
  await new Promise(r => setTimeout(r, 3660000)); // 61 minutes

  // Provider transitions to SETTLED (required before releaseEscrow)
  await providerClient.kernel.transitionState(txId, State.SETTLED, '0x');
  console.log('Settled state reached!');

  // Release escrow (either party can call after SETTLED)
  await providerClient.kernel.releaseEscrow(txId);
  console.log('✅ Funds released! Provider received ~0.99 USDC');
}

deliver().catch(console.error);
```

:::warning Provider-Only Transitions
Only the **provider** can call `transitionState` for IN_PROGRESS, DELIVERED, and SETTLED. Using the requester's wallet will revert.
:::

:::warning State Transition Rules
You **cannot** skip states. Required path:
`COMMITTED → IN_PROGRESS → DELIVERED → (wait) → SETTLED → releaseEscrow()`
:::

---

## Test the Full Flow (Two Wallets)

Complete end-to-end test with both requester and provider:

```typescript title="full-flow-test.ts"
import { ACTPClient, State } from '@agirails/sdk';
import { parseUnits, ethers } from 'ethers';
import 'dotenv/config';

async function testFullFlow() {
  // Initialize BOTH clients
  const requesterClient = await ACTPClient.create({
    network: 'base-sepolia',
    privateKey: process.env.REQUESTER_PRIVATE_KEY!
  });

  const providerClient = await ACTPClient.create({
    network: 'base-sepolia',
    privateKey: process.env.PROVIDER_PRIVATE_KEY!
  });

  const requesterAddress = await requesterClient.getAddress();
  const providerAddress = await providerClient.getAddress();

  console.log('Requester:', requesterAddress);
  console.log('Provider:', providerAddress);

  // 1. REQUESTER creates transaction
  const txId = await requesterClient.kernel.createTransaction({
    requester: requesterAddress,
    provider: providerAddress,
    amount: parseUnits('1', 6),
    deadline: Math.floor(Date.now() / 1000) + 86400,
    disputeWindow: 3600, // 1 hour (contract minimum)
    metadata: ethers.id('test-service')
  });
  console.log('1. Created:', txId);

  // 2. REQUESTER funds
  const escrowId = await requesterClient.fundTransaction(txId);
  console.log('2. Funded:', escrowId);

  // 3. PROVIDER starts work
  await providerClient.kernel.transitionState(txId, State.IN_PROGRESS, '0x');
  console.log('3. In progress (provider)');

  // 4. PROVIDER delivers
  await providerClient.kernel.transitionState(txId, State.DELIVERED, '0x');
  console.log('4. Delivered (provider)');

  // 5. Wait for dispute window (1 hour minimum)
  console.log('5. Waiting for 1 hour dispute window...');
  await new Promise(r => setTimeout(r, 3660000)); // 61 minutes

  // 6. PROVIDER transitions to SETTLED
  await providerClient.kernel.transitionState(txId, State.SETTLED, '0x');
  console.log('6. Settled state (provider)');

  // 7. Release escrow (either party can call)
  await providerClient.kernel.releaseEscrow(txId);
  console.log('7. Funds released! ✅');

  console.log(`\nProvider received ~0.99 USDC`);
}

testFullFlow().catch(console.error);
```

Run it:

```bash
npx ts-node full-flow-test.ts
```

:::tip Expected Result
- Requester spends: 1 USDC + gas (~$0.002)
- Provider receives: ~0.99 USDC (after 1% protocol fee)
- Total time: ~65 minutes (1 hour dispute window + execution)
:::

:::info Dispute Window Minimum
The contract enforces a **minimum 1-hour dispute window** (`MIN_DISPUTE_WINDOW = 3600`). For faster testing during development, you would need to deploy a modified contract with a lower minimum.
:::

---

## Transaction Lifecycle

<div style={{textAlign: 'center', margin: '2rem 0'}}>
  <img src="/img/diagrams/happy-path.svg" alt="Transaction Lifecycle - Happy Path" style={{maxWidth: '100%', height: 'auto'}} />
</div>

| State | Meaning |
|-------|---------|
| **INITIATED** | Transaction created, awaiting escrow |
| **QUOTED** | Provider submitted price quote (optional) |
| **COMMITTED** | USDC locked, provider can start work |
| **IN_PROGRESS** | Provider working (required before DELIVERED) |
| **DELIVERED** | Provider submitted proof |
| **SETTLED** | Payment released ✅ |
| **DISPUTED** | Requester disputed delivery, needs mediation |
| **CANCELLED** | Transaction cancelled before completion |

See [Transaction Lifecycle](./concepts/transaction-lifecycle) for full state machine details.

---

## Quick Reference

### Key Functions

| Function | What It Does |
|----------|--------------|
| `createTransaction()` | Create new transaction |
| `fundTransaction()` | Lock USDC in escrow |
| `transitionState()` | Move to next state |
| `releaseEscrow()` | Settle and pay provider |

### Transaction Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `requester` | `address` | Who pays |
| `provider` | `address` | Who delivers |
| `amount` | `uint256` | USDC amount (6 decimals) |
| `deadline` | `uint256` | Unix timestamp |
| `disputeWindow` | `uint256` | Seconds to dispute after delivery |
| `metadata` | `bytes32` | Hash of service description (optional) |

---

## Common Issues

| Problem | Solution |
|---------|----------|
| **"Insufficient funds"** | Get ETH from [faucet](https://portal.cdp.coinbase.com/products/faucet), mint USDC |
| **"Invalid private key"** | Ensure key starts with `0x` and is 66 characters |
| **"requester == provider"** | Contract requires different addresses. Use two wallets. |
| **"Only provider can call"** | IN_PROGRESS, DELIVERED, SETTLED require provider's wallet |
| **"Invalid state transition"** | Can't skip states. Follow: COMMITTED → IN_PROGRESS → DELIVERED → SETTLED |
| **"releaseEscrow failed"** | Must be in SETTLED state first. Call `transitionState(SETTLED)` before release. |
| **"Dispute window active"** | Wait for dispute window to expire before transitioning to SETTLED |

---

## Next Steps

<div className="row" style={{marginTop: '1rem'}}>
  <div className="col col--6" style={{marginBottom: '1rem'}}>
    <div className="card" style={{height: '100%', padding: '1.5rem'}}>
      <h3>📚 Learn More</h3>
      <ul>
        <li><a href="./installation">Installation Guide</a> - Full setup</li>
        <li><a href="./concepts/">Core Concepts</a> - How AGIRAILS works</li>
        <li><a href="./concepts/transaction-lifecycle">Transaction Lifecycle</a> - All states</li>
      </ul>
    </div>
  </div>
  <div className="col col--6" style={{marginBottom: '1rem'}}>
    <div className="card" style={{height: '100%', padding: '1.5rem'}}>
      <h3>🛠️ Build Agents</h3>
      <ul>
        <li><a href="./guides/agents/provider-agent">Provider Agent</a> - Get paid for services</li>
        <li><a href="./guides/agents/consumer-agent">Consumer Agent</a> - Request services</li>
        <li><a href="./guides/agents/autonomous-agent">Autonomous Agent</a> - Do both</li>
      </ul>
    </div>
  </div>
</div>

---

**Need help?** Join our [Discord](https://discord.gg/nuhCt75qe4)
