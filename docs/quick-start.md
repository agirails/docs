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

  // Fund (approve USDC + link escrow)
  const escrowId = await requesterClient.fundTransaction(txId);
  console.log('Escrow funded:', escrowId);

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
import os, time
from dotenv import load_dotenv
from agirails_sdk import ACTPClient, Network

load_dotenv()

requester_client = ACTPClient(network=Network.BASE_SEPOLIA, private_key=os.getenv("REQUESTER_PRIVATE_KEY"))
provider_address = os.getenv("PROVIDER_ADDRESS")  # derive from provider PK if needed

print("Requester:", requester_client.address)
print("Provider:", provider_address)

amount = 1_000_000  # 1 USDC (6 decimals)
deadline = int(time.time()) + 86400  # 24 hours
dispute_window = 3600  # 1 hour

tx_id = requester_client.create_transaction(
    provider=provider_address,
    requester=requester_client.address,
    amount=amount,
    deadline=deadline,
    dispute_window=dispute_window,
    service_hash="0x" + "00"*32,
)
escrow_id = requester_client.fund_transaction(tx_id)

print("✅ Transaction created! txId:", tx_id)
print("✅ Escrow funded! Escrow ID:", escrow_id)
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

  // Provider requests settlement (admin/bot executes payout after dispute window)
  await providerClient.kernel.transitionState(txId, State.SETTLED, '0x');
  console.log('Settled state reached! (admin/bot will execute payout)');
}

deliver().catch(console.error);
```

</TabItem>
<TabItem value="py" label="Python">

```python title="provider_deliver.py"
import os
import time
from dotenv import load_dotenv
from web3 import Web3
from eth_account import Account

load_dotenv()

# Network configuration
RPC_URL = "https://sepolia.base.org"
KERNEL_ADDRESS = "0x6aDB650e185b0ee77981AC5279271f0Fa6CFe7ba"

# State enum values (from contract)
STATE_IN_PROGRESS = 3
STATE_DELIVERED = 4
STATE_SETTLED = 5

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(RPC_URL))

# Load provider account
provider = Account.from_key(os.getenv("PROVIDER_PRIVATE_KEY"))

# Transaction ID from Step 3
TX_ID = "YOUR_TX_ID_FROM_STEP_3"  # bytes32

# Simplified ABI
KERNEL_ABI = [
    {
        "name": "transitionState",
        "type": "function",
        "inputs": [
            {"name": "txId", "type": "bytes32"},
            {"name": "newState", "type": "uint8"},
            {"name": "proof", "type": "bytes32"}
        ]
    }
]

kernel = w3.eth.contract(address=KERNEL_ADDRESS, abi=KERNEL_ABI)

def transition_state(tx_id: str, new_state: int, proof: bytes = b'\x00' * 32):
    """Transition transaction to new state."""
    tx = kernel.functions.transitionState(
        bytes.fromhex(tx_id[2:]) if tx_id.startswith('0x') else bytes.fromhex(tx_id),
        new_state,
        proof
    ).build_transaction({
        'from': provider.address,
        'nonce': w3.eth.get_transaction_count(provider.address),
        'gas': 100000,
        'gasPrice': w3.eth.gas_price
    })

    signed = provider.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
    w3.eth.wait_for_transaction_receipt(tx_hash)
    return tx_hash.hex()

# Transition to IN_PROGRESS
print("Transitioning to IN_PROGRESS...")
transition_state(TX_ID, STATE_IN_PROGRESS)
print("In progress!")

# Transition to DELIVERED
print("Transitioning to DELIVERED...")
transition_state(TX_ID, STATE_DELIVERED)
print("Delivered!")

# Wait for dispute window
print("Waiting for 1 hour dispute window...")
print("(In production, use event listeners instead)")
time.sleep(3660)  # 61 minutes

# Transition to SETTLED (admin/bot executes payout)
print("Transitioning to SETTLED...")
transition_state(TX_ID, STATE_SETTLED)
print("Settled requested. Payout occurs after admin/bot execution.")
```

</TabItem>
</Tabs>

:::warning Provider-Only Transitions
Only the **provider** can call `transitionState` for IN_PROGRESS, DELIVERED, and SETTLED. Using the requester's wallet will revert.
:::

:::warning State Transition Rules
You **cannot** skip states. Required path:
`COMMITTED → IN_PROGRESS → DELIVERED → (wait) → SETTLED (admin/bot executes payout)`
:::

---

## Test the Full Flow (Two Wallets)

Complete end-to-end test with both requester and provider:

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript" default>

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

  // 2. REQUESTER funds (approves USDC + links escrow)
  const escrowId = await requesterClient.fundTransaction(txId);
  console.log('2. Escrow funded:', escrowId);

  // 3. PROVIDER starts work
  await providerClient.kernel.transitionState(txId, State.IN_PROGRESS, '0x');
  console.log('3. In progress (provider)');

  // 4. PROVIDER delivers
  await providerClient.kernel.transitionState(txId, State.DELIVERED, '0x');
  console.log('4. Delivered (provider)');

  // 5. Wait for dispute window (1 hour minimum)
  console.log('5. Waiting for 1 hour dispute window...');
  await new Promise(r => setTimeout(r, 3660000)); // 61 minutes

  // 6. PROVIDER requests SETTLED (admin/bot executes payout)
  await providerClient.kernel.transitionState(txId, State.SETTLED, '0x');
  console.log('6. Settled state requested (admin/bot executes payout)');

  console.log(`\nProvider received ~0.99 USDC`);
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
import os, time
from dotenv import load_dotenv
from agirails_sdk import ACTPClient, Network, State
from agirails_sdk.errors import ValidationError, TransactionError, RpcError

load_dotenv()

def main():
    requester = ACTPClient(network=Network.BASE_SEPOLIA, private_key=os.getenv("REQUESTER_PRIVATE_KEY"))
    provider = ACTPClient(network=Network.BASE_SEPOLIA, private_key=os.getenv("PROVIDER_PRIVATE_KEY"))

    print("Requester:", requester.address)
    print("Provider:", provider.address)

    # 1. Create
    tx_id = requester.create_transaction(
        requester=requester.address,
        provider=provider.address,
        amount=1_000_000,  # 1 USDC (6 decimals)
        deadline=requester.now() + 86400,
        dispute_window=3600,
        service_hash="0x" + "00" * 32,
    )
    print("1. Created:", tx_id)

    # 2. Fund (approve + link escrow)
    escrow_id = requester.fund_transaction(tx_id)
    print("2. Funded:", escrow_id)

    # 3. Provider starts work
    provider.transition_state(tx_id, State.IN_PROGRESS)
    print("3. In progress (provider)")

    # 4. Provider delivers
    provider.transition_state(tx_id, State.DELIVERED)
    print("4. Delivered (provider)")

    # 5. Wait dispute window (short sleep for demo)
    print("5. Waiting dispute window...")
    time.sleep(5)

    # 6. Requester settles (with optional attestation UID if used)
    try:
        requester.release_escrow(tx_id)
        print("6. Settled (payment released)")
    except (ValidationError, TransactionError, RpcError) as e:
        print("Settlement failed:", e)

if __name__ == "__main__":
    main()
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
| `createTransaction()` | Create new transaction |
| `linkEscrow()` | Lock USDC in escrow |
| `transitionState()` | Move to next state |
| `transitionState(SETTLED)` | Trigger payout (admin/bot executes) |

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
| **"Only provider can call"** | IN_PROGRESS, DELIVERED, SETTLED require provider's wallet (or admin/bot for settlement) |
| **"Invalid state transition"** | Can't skip states. Follow: COMMITTED → IN_PROGRESS → DELIVERED → SETTLED (admin/bot executes payout) |
| **"Payout not received"** | Ensure SETTLED was requested and admin/bot executed payout; wait until dispute window expires. |
| **"Dispute window active"** | Wait for dispute window to expire before settlement executes |

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
