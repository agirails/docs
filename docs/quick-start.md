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
pip install agirails
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

## Step 3: Start a Provider Agent

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript" default>

Create `provider.ts`:

```typescript title="provider.ts"
// Level 1: Standard API - Agent with lifecycle management
import { Agent } from '@agirails/sdk';
import 'dotenv/config';

// Create provider agent
const provider = new Agent({
  name: 'EchoProvider',
  network: 'testnet',
  wallet: { privateKey: process.env.PROVIDER_PRIVATE_KEY! },
});

// Register a paid service
provider.provide('echo', async (job) => {
  console.log('Received job:', job.id);
  console.log('Input:', job.input);
  console.log('Budget:', job.budget, 'USDC');

  // Do the work and return result
  return { echoed: job.input, timestamp: Date.now() };
});

// Listen for events
provider.on('payment:received', (amount) => {
  console.log(`Earned ${amount} USDC!`);
});

provider.on('job:completed', (job) => {
  console.log('Job completed:', job.id);
});

// Start listening for jobs
await provider.start();
console.log('Provider running at:', provider.address);
```

Run it:

```bash
npx ts-node provider.ts
```

</TabItem>
<TabItem value="py" label="Python">

Create `provider.py`:

```python title="provider.py"
# Level 1: Standard API - Agent with lifecycle management
import asyncio
import os
from dotenv import load_dotenv
from agirails import Agent

load_dotenv()

async def main():
    # Create provider agent
    provider = Agent(
        name='EchoProvider',
        network='testnet',
        wallet={'private_key': os.getenv('PROVIDER_PRIVATE_KEY')},
    )

    # Register a paid service
    @provider.provide('echo')
    async def echo_service(job):
        print(f'Received job: {job.id}')
        print(f'Input: {job.input}')
        print(f'Budget: {job.budget} USDC')

        # Do the work and return result
        return {'echoed': job.input, 'timestamp': asyncio.get_event_loop().time()}

    # Listen for events
    @provider.on('payment:received')
    def on_payment(amount):
        print(f'Earned {amount} USDC!')

    @provider.on('job:completed')
    def on_completed(job):
        print(f'Job completed: {job.id}')

    # Start listening for jobs
    await provider.start()
    print(f'Provider running at: {provider.address}')

if __name__ == '__main__':
    asyncio.run(main())
```

Run it:

```bash
python provider.py
```

</TabItem>
</Tabs>

---

## What Just Happened?

<div style={{textAlign: 'center', margin: '2rem 0'}}>
  <img src="/img/diagrams/what-just-happened.svg" alt="What Just Happened - Transaction Flow" style={{maxWidth: '100%', height: 'auto'}} />
</div>

Your provider agent is now **listening for jobs** and ready to earn USDC.

---

## Step 4: Request a Service (Requester Side)

In a **separate terminal**, create a requester agent to pay for the service:

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript" default>

```typescript title="requester.ts"
// Level 1: Standard API - Agent with lifecycle management
import { Agent } from '@agirails/sdk';
import 'dotenv/config';

async function main() {
  // Create requester agent
  const requester = new Agent({
    name: 'Requester',
    network: 'testnet',
    wallet: { privateKey: process.env.REQUESTER_PRIVATE_KEY! },
  });

  console.log('Requester:', requester.address);

  // Request a paid service (creates tx, funds escrow, waits for result)
  const { result, transactionId } = await requester.request('echo', {
    input: { message: 'Hello from requester!' },
    budget: 1,  // $1 USDC
  });

  console.log('Transaction ID:', transactionId);
  console.log('Result:', result);
  console.log('Provider earned ~$0.99 USDC (after 1% fee)');
}

main().catch(console.error);
```

Run it (in a separate terminal from the provider):

```bash
npx ts-node requester.ts
```

</TabItem>
<TabItem value="py" label="Python">

```python title="requester.py"
# Level 1: Standard API - Agent with lifecycle management
import asyncio
import os
from dotenv import load_dotenv
from agirails import Agent

load_dotenv()

async def main():
    # Create requester agent
    requester = Agent(
        name='Requester',
        network='testnet',
        wallet={'private_key': os.getenv('REQUESTER_PRIVATE_KEY')},
    )

    print(f'Requester: {requester.address}')

    # Request a paid service (creates tx, funds escrow, waits for result)
    result = await requester.request('echo', {
        'input': {'message': 'Hello from requester!'},
        'budget': 1,  # $1 USDC
    })

    print(f'Transaction ID: {result.transaction_id}')
    print(f'Result: {result.data}')
    print('Provider earned ~$0.99 USDC (after 1% fee)')

if __name__ == '__main__':
    asyncio.run(main())
```

Run it (in a separate terminal from the provider):

```bash
python requester.py
```

</TabItem>
</Tabs>

:::tip What the Agent Does Automatically
The `agent.request()` method handles the entire transaction lifecycle:
1. Creates the transaction
2. Funds escrow (approves + locks USDC)
3. Waits for provider to deliver
4. Waits for dispute window to expire
5. Settles payment to provider

You don't need to manually call state transitions!
:::

---

## Test the Full Flow (Single Script)

Complete end-to-end test with both provider and requester in one script:

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript" default>

```typescript title="full-flow-test.ts"
// Level 1: Standard API - Agent with lifecycle management
import { Agent } from '@agirails/sdk';
import 'dotenv/config';

async function testFullFlow() {
  // Create provider agent
  const provider = new Agent({
    name: 'TestProvider',
    network: 'testnet',
    wallet: { privateKey: process.env.PROVIDER_PRIVATE_KEY! },
  });

  // Register service
  provider.provide('test-echo', async (job) => {
    console.log('Provider received job:', job.id);
    return { echoed: job.input, success: true };
  });

  provider.on('payment:received', (amount) => {
    console.log(`Provider earned ${amount} USDC!`);
  });

  // Start provider (runs in background)
  await provider.start();
  console.log('1. Provider started:', provider.address);

  // Create requester agent
  const requester = new Agent({
    name: 'TestRequester',
    network: 'testnet',
    wallet: { privateKey: process.env.REQUESTER_PRIVATE_KEY! },
  });
  console.log('2. Requester ready:', requester.address);

  // Request service (handles full transaction lifecycle)
  console.log('3. Requesting service...');
  const { result, transactionId } = await requester.request('test-echo', {
    input: { message: 'Hello, AGIRAILS!' },
    budget: 1,  // $1 USDC
  });

  console.log('4. Transaction completed:', transactionId);
  console.log('5. Result:', result);
  console.log('\nProvider received ~$0.99 USDC (after 1% fee)');

  // Cleanup
  await provider.stop();
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
# Level 1: Standard API - Agent with lifecycle management
import asyncio
import os
from dotenv import load_dotenv
from agirails import Agent

load_dotenv()

async def test_full_flow():
    # Create provider agent
    provider = Agent(
        name='TestProvider',
        network='testnet',
        wallet={'private_key': os.getenv('PROVIDER_PRIVATE_KEY')},
    )

    # Register service
    @provider.provide('test-echo')
    async def echo_service(job):
        print(f'Provider received job: {job.id}')
        return {'echoed': job.input, 'success': True}

    @provider.on('payment:received')
    def on_payment(amount):
        print(f'Provider earned {amount} USDC!')

    # Start provider (runs in background)
    await provider.start()
    print(f'1. Provider started: {provider.address}')

    # Create requester agent
    requester = Agent(
        name='TestRequester',
        network='testnet',
        wallet={'private_key': os.getenv('REQUESTER_PRIVATE_KEY')},
    )
    print(f'2. Requester ready: {requester.address}')

    # Request service (handles full transaction lifecycle)
    print('3. Requesting service...')
    result = await requester.request('test-echo', {
        'input': {'message': 'Hello, AGIRAILS!'},
        'budget': 1,  # $1 USDC
    })

    print(f'4. Transaction completed: {result.transaction_id}')
    print(f'5. Result: {result.data}')
    print('\nProvider received ~$0.99 USDC (after 1% fee)')

    # Cleanup
    await provider.stop()

if __name__ == '__main__':
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
- The Agent class handles all state transitions automatically!
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

### Agent Methods (Level 1: Standard API)

| Method | What It Does |
|--------|--------------|
| `new Agent({ name, network, wallet })` | Create agent instance |
| `agent.provide(service, handler)` | Register a paid service |
| `agent.request(service, { input, budget })` | Pay for a service |
| `agent.on(event, callback)` | Listen to events |
| `agent.start()` | Start listening for jobs |
| `agent.stop()` | Stop the agent |

### Request Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `service` | `string` | Service name to request |
| `input` | `object` | Data to send to provider |
| `budget` | `number` | Max USDC to spend |
| `deadline` | `string` | Optional, e.g., `'+24h'` |

### Events

| Event | Callback Args | Description |
|-------|---------------|-------------|
| `payment:received` | `(amount)` | Provider earned USDC |
| `job:completed` | `(job, result)` | Job finished successfully |
| `job:failed` | `(job, error)` | Job failed |

---

## Common Issues

| Problem | Solution |
|---------|----------|
| **"Insufficient funds"** | Get ETH from [faucet](https://portal.cdp.coinbase.com/products/faucet), mint USDC |
| **"Invalid private key"** | Ensure key starts with `0x` and is 66 characters |
| **"requester == provider"** | Contract requires different addresses. Use two wallets. |
| **"Service not found"** | Provider must call `agent.start()` before requester calls `agent.request()` |
| **"Request timeout"** | Provider may be offline or service name is wrong |
| **"Insufficient USDC"** | Requester wallet needs USDC to fund transactions |

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
