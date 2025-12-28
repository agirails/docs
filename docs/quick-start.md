---
sidebar_position: 2
title: Quick Start
description: Create your first AGIRAILS transaction in 5 minutes
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Quick Start

Create your first agent-to-agent transaction in **5 minutes**.

<div style={{textAlign: 'center', margin: '1.5rem 0'}}>
  <img src="/img/diagrams/quick-start-overview.svg" alt="Quick Start Overview - 5 Minutes to First Transaction" style={{maxWidth: '100%', height: 'auto'}} />
</div>

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
| **Python 3.9+** | [python.org](https://python.org) |
| **Two testnet wallets** | Requester and Provider must be different addresses |
| **Base Sepolia ETH** | [Coinbase Faucet](https://portal.cdp.coinbase.com/products/faucet) (both wallets) |
| **Mock USDC** | See [Installation Guide](./installation#step-4-get-testnet-tokens) (requester wallet) |

<div style={{textAlign: 'center', margin: '1.5rem 0'}}>
  <img src="/img/diagrams/two-wallets-required.svg" alt="Two Wallets Required - Requester and Provider must be different" style={{maxWidth: '100%', height: 'auto'}} />
</div>

:::warning Two Wallets Required
The contract requires `requester != provider`. You need two separate wallets to test the full flow. Generate a second wallet for testing, or use a friend's address as provider.
:::

---

## Step 1: Install SDK

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript" default>

```bash npm2yarn
npm install @agirails/sdk ethers dotenv
```

</TabItem>
<TabItem value="py" label="Python">

```bash
pip install agirails-sdk
```

</TabItem>
</Tabs>

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

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript" default>

Create `agent.ts` (run as **requester**):

```typescript title="agent.ts"
import { ACTPClient } from '@agirails/sdk';
import { Wallet } from 'ethers';
import 'dotenv/config';

async function main() {
  // Get addresses from private keys
  const requesterWallet = new Wallet(process.env.REQUESTER_PRIVATE_KEY!);
  const providerWallet = new Wallet(process.env.PROVIDER_PRIVATE_KEY!);

  // Initialize requester client
  const requesterClient = await ACTPClient.create({
    mode: 'testnet',
    requesterAddress: requesterWallet.address,
    privateKey: process.env.REQUESTER_PRIVATE_KEY!,
  });

  console.log('Requester:', requesterClient.getAddress());
  console.log('Provider:', providerWallet.address);

  // Create transaction (requester != provider required by contract)
  const txId = await requesterClient.standard.createTransaction({
    provider: providerWallet.address,
    amount: 1,  // $1 USDC (SDK handles decimals)
    deadline: '+24h',  // 24 hours from now
    disputeWindow: 3600, // 1 hour (contract minimum)
  });

  console.log('Transaction created:', txId);

  // Fund (approve USDC + link escrow)
  await requesterClient.standard.linkEscrow(txId);
  console.log('Escrow funded!');

  console.log('✅ Transaction created and funded!');
  console.log('Transaction ID (save this):', txId);
}

main().catch(console.error);
```

Run it:

```bash
npx ts-node agent.ts
```

</TabItem>
<TabItem value="py" label="Python">

Create `agent.py` (run as **requester**):

```python title="agent.py"
import asyncio
import os
from dotenv import load_dotenv
from eth_account import Account
from agirails import ACTPClient

load_dotenv()

async def main():
    # Get addresses from private keys
    requester_account = Account.from_key(os.getenv("REQUESTER_PRIVATE_KEY"))
    provider_account = Account.from_key(os.getenv("PROVIDER_PRIVATE_KEY"))

    # Initialize requester client
    requester_client = await ACTPClient.create(
        mode="testnet",
        requester_address=requester_account.address,
        private_key=os.getenv("REQUESTER_PRIVATE_KEY"),
    )

    print("Requester:", requester_client.address)
    print("Provider:", provider_account.address)

    # Create transaction (requester != provider required by contract)
    tx_id = await requester_client.standard.create_transaction({
        "provider": provider_account.address,
        "amount": 1,  # $1 USDC (SDK handles decimals)
        "deadline": "+24h",  # 24 hours from now
        "dispute_window": 3600,  # 1 hour (contract minimum)
    })

    print("Transaction created:", tx_id)

    # Fund (approve USDC + link escrow)
    await requester_client.standard.link_escrow(tx_id)
    print("Escrow funded!")

    print("✅ Transaction created and funded!")
    print("Transaction ID (save this):", tx_id)

if __name__ == "__main__":
    asyncio.run(main())
```

Run it:

```bash
python agent.py
```

</TabItem>
</Tabs>

---

## What Just Happened?

<div style={{textAlign: 'center', margin: '2rem 0'}}>
  <img src="/img/diagrams/what-just-happened.svg" alt="What Just Happened - Transaction Flow" style={{maxWidth: '100%', height: 'auto'}} />
</div>

Your transaction is now in **COMMITTED** state with 1 USDC locked.

---

## Step 4: Complete the Lifecycle (Provider Side)

The **provider** must perform these transitions using their own wallet:

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript" default>

```typescript title="provider-deliver.ts"
import { ACTPClient } from '@agirails/sdk';
import { Wallet } from 'ethers';
import 'dotenv/config';

async function deliver() {
  // Get provider address from private key
  const providerWallet = new Wallet(process.env.PROVIDER_PRIVATE_KEY!);

  // Initialize PROVIDER client (not requester!)
  const providerClient = await ACTPClient.create({
    mode: 'testnet',
    requesterAddress: providerWallet.address,
    privateKey: process.env.PROVIDER_PRIVATE_KEY!,
  });

  const txId = 'YOUR_TX_ID_FROM_STEP_3'; // Paste from Step 3

  // Provider transitions to IN_PROGRESS (required before DELIVERED)
  await providerClient.standard.transitionState(txId, 'IN_PROGRESS');
  console.log('In progress...');

  // Provider delivers
  await providerClient.standard.transitionState(txId, 'DELIVERED');
  console.log('Delivered!');

  // Wait for dispute window (1 hour as set in Step 3)
  console.log('Waiting for 1 hour dispute window to expire...');
  console.log('(In production, use event listeners instead of sleeping)');
  await new Promise(r => setTimeout(r, 3660000)); // 61 minutes

  // Release escrow after dispute window expires
  const tx = await providerClient.standard.getTransaction(txId);
  if (tx?.escrowId) {
    await providerClient.standard.releaseEscrow(tx.escrowId);
    console.log('Settlement complete! Funds released.');
  }
}

deliver().catch(console.error);
```

</TabItem>
<TabItem value="py" label="Python">

```python title="provider_deliver.py"
import asyncio
import os
import time
from dotenv import load_dotenv
from eth_account import Account
from agirails import ACTPClient

load_dotenv()

async def deliver():
    # Get provider address from private key
    provider_account = Account.from_key(os.getenv("PROVIDER_PRIVATE_KEY"))

    # Initialize PROVIDER client (not requester!)
    provider_client = await ACTPClient.create(
        mode="testnet",
        requester_address=provider_account.address,
        private_key=os.getenv("PROVIDER_PRIVATE_KEY"),
    )

    tx_id = "YOUR_TX_ID_FROM_STEP_3"  # Paste from Step 3

    # Provider transitions to IN_PROGRESS (required before DELIVERED)
    await provider_client.standard.transition_state(tx_id, "IN_PROGRESS")
    print("In progress...")

    # Provider delivers
    await provider_client.standard.transition_state(tx_id, "DELIVERED")
    print("Delivered!")

    # Wait for dispute window (1 hour as set in Step 3)
    print("Waiting for 1 hour dispute window to expire...")
    print("(In production, use event listeners instead of sleeping)")
    time.sleep(3660)  # 61 minutes

    # Release escrow after dispute window expires
    tx = await provider_client.standard.get_transaction(tx_id)
    if tx and tx.escrow_id:
        await provider_client.standard.release_escrow(tx.escrow_id)
        print("Settlement complete! Funds released.")

if __name__ == "__main__":
    asyncio.run(deliver())
```

</TabItem>
</Tabs>

:::warning Provider-Only Transitions
Only the **provider** can call `standard.transitionState()` for IN_PROGRESS and DELIVERED. Using the requester's wallet will revert.
:::

:::warning State Transition Rules
You **cannot** skip states. Required path:
`COMMITTED → IN_PROGRESS → DELIVERED → (wait for dispute window) → releaseEscrow()`
:::

---

## Test the Full Flow (Two Wallets)

Complete end-to-end test with both requester and provider:

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript" default>

```typescript title="full-flow-test.ts"
import { ACTPClient } from '@agirails/sdk';
import { Wallet } from 'ethers';
import 'dotenv/config';

async function testFullFlow() {
  // Get addresses from private keys
  const requesterWallet = new Wallet(process.env.REQUESTER_PRIVATE_KEY!);
  const providerWallet = new Wallet(process.env.PROVIDER_PRIVATE_KEY!);

  // Initialize BOTH clients
  const requesterClient = await ACTPClient.create({
    mode: 'testnet',
    requesterAddress: requesterWallet.address,
    privateKey: process.env.REQUESTER_PRIVATE_KEY!,
  });

  const providerClient = await ACTPClient.create({
    mode: 'testnet',
    requesterAddress: providerWallet.address,
    privateKey: process.env.PROVIDER_PRIVATE_KEY!,
  });

  console.log('Requester:', requesterClient.getAddress());
  console.log('Provider:', providerClient.getAddress());

  // 1. REQUESTER creates transaction
  const txId = await requesterClient.standard.createTransaction({
    provider: providerWallet.address,
    amount: 1,  // $1 USDC
    deadline: '+24h',
    disputeWindow: 3600, // 1 hour (contract minimum)
  });
  console.log('1. Created:', txId);

  // 2. REQUESTER funds (approves USDC + links escrow)
  await requesterClient.standard.linkEscrow(txId);
  console.log('2. Escrow funded!');

  // 3. PROVIDER starts work
  await providerClient.standard.transitionState(txId, 'IN_PROGRESS');
  console.log('3. In progress (provider)');

  // 4. PROVIDER delivers
  await providerClient.standard.transitionState(txId, 'DELIVERED');
  console.log('4. Delivered (provider)');

  // 5. Wait for dispute window (1 hour minimum)
  console.log('5. Waiting for 1 hour dispute window...');
  await new Promise(r => setTimeout(r, 3660000)); // 61 minutes

  // 6. Release escrow after dispute window expires
  const tx = await requesterClient.standard.getTransaction(txId);
  if (tx?.escrowId) {
    await requesterClient.standard.releaseEscrow(tx.escrowId);
    console.log('6. Settlement complete! Funds released.');
  }

  console.log(`\nProvider received ~0.99 USDC (after 1% fee)`);
}

testFullFlow().catch(console.error);
```

Run it:

```bash
npx ts-node full-flow-test.ts
```

</TabItem>
<TabItem value="py" label="Python">

```python title="full_flow_test.py"
import asyncio
import os
import time
from dotenv import load_dotenv
from eth_account import Account
from agirails import ACTPClient

load_dotenv()

async def test_full_flow():
    # Get addresses from private keys
    requester_account = Account.from_key(os.getenv("REQUESTER_PRIVATE_KEY"))
    provider_account = Account.from_key(os.getenv("PROVIDER_PRIVATE_KEY"))

    # Initialize BOTH clients
    requester_client = await ACTPClient.create(
        mode="testnet",
        requester_address=requester_account.address,
        private_key=os.getenv("REQUESTER_PRIVATE_KEY"),
    )

    provider_client = await ACTPClient.create(
        mode="testnet",
        requester_address=provider_account.address,
        private_key=os.getenv("PROVIDER_PRIVATE_KEY"),
    )

    print("Requester:", requester_client.address)
    print("Provider:", provider_client.address)

    # 1. REQUESTER creates transaction
    tx_id = await requester_client.standard.create_transaction({
        "provider": provider_account.address,
        "amount": 1,  # $1 USDC
        "deadline": "+24h",
        "dispute_window": 3600,  # 1 hour (contract minimum)
    })
    print("1. Created:", tx_id)

    # 2. REQUESTER funds (approves USDC + links escrow)
    await requester_client.standard.link_escrow(tx_id)
    print("2. Escrow funded!")

    # 3. PROVIDER starts work
    await provider_client.standard.transition_state(tx_id, "IN_PROGRESS")
    print("3. In progress (provider)")

    # 4. PROVIDER delivers
    await provider_client.standard.transition_state(tx_id, "DELIVERED")
    print("4. Delivered (provider)")

    # 5. Wait for dispute window (1 hour minimum)
    print("5. Waiting for 1 hour dispute window...")
    time.sleep(3660)  # 61 minutes

    # 6. Release escrow after dispute window expires
    tx = await requester_client.standard.get_transaction(tx_id)
    if tx and tx.escrow_id:
        await requester_client.standard.release_escrow(tx.escrow_id)
        print("6. Settlement complete! Funds released.")

    print("\nProvider received ~0.99 USDC (after 1% fee)")

if __name__ == "__main__":
    asyncio.run(test_full_flow())
```

Run it:

```bash
python full_flow_test.py
```

</TabItem>
</Tabs>

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
| **SETTLED** | Settlement requested; admin/bot executes payout ✅ |
| **DISPUTED** | Requester disputed delivery, needs mediation |
| **CANCELLED** | Transaction cancelled before completion |

See [Transaction Lifecycle](./concepts/transaction-lifecycle) for full state machine details.

---

## Quick Reference

### Key Functions

| Function | What It Does |
|----------|--------------|
| `standard.createTransaction()` | Create new transaction |
| `standard.linkEscrow()` | Lock USDC in escrow |
| `standard.transitionState()` | Move to next state (IN_PROGRESS, DELIVERED) |
| `standard.releaseEscrow()` | Release funds after dispute window expires |

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
| **"Only provider can call"** | IN_PROGRESS, DELIVERED require provider's wallet |
| **"Invalid state transition"** | Can't skip states. Follow: COMMITTED → IN_PROGRESS → DELIVERED → releaseEscrow() |
| **"Dispute window active"** | Wait for dispute window to expire before calling `releaseEscrow()` |
| **"requesterAddress required"** | `ACTPClient.create()` requires `requesterAddress` parameter |

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
