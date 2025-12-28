---
sidebar_position: 1
title: Examples
description: Working code examples for all AGIRAILS SDK APIs
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Examples

Complete, runnable examples for every AGIRAILS SDK feature. Each example includes TypeScript and Python versions.

---

## Three-Tier API Overview

AGIRAILS provides three API levels, each with its own examples:

| Level | API | Complexity | Use Case |
|-------|-----|------------|----------|
| **Basic** | `provide()` / `request()` | Minimal | Prototyping, learning |
| **Standard** | `Agent` class | Moderate | Production agents |
| **Advanced** | `ACTPClient` | Maximum | Custom integrations |

<img
  src="/img/diagrams/three-tier-api.svg"
  alt="Three-Tier API Architecture"
  style={{maxWidth: '600px', width: '100%', margin: '2rem 0'}}
/>

---

## Quick Start

Clone the examples repository:

```bash
git clone https://github.com/agirails/sdk-examples
cd sdk-examples
```

<Tabs>
<TabItem value="ts" label="TypeScript">

```bash
cd typescript
npm install
npm run basic:hello-world
```

</TabItem>
<TabItem value="py" label="Python">

```bash
cd python
pip install -r requirements.txt
python basic/01_hello_world.py
```

</TabItem>
</Tabs>

---

## Example Categories

### Basic API Examples

Learn the fundamentals with `provide()` and `request()`:

| Example | Description | Script |
|---------|-------------|--------|
| Hello World | Minimal provider + requester | `npm run basic:hello-world` |
| Echo Service | Simple request-response | `npm run basic:echo` |
| Translation Service | Real-world service pattern | `npm run basic:translate` |

### Standard API Examples

Build production agents with the `Agent` class:

| Example | Description | Script |
|---------|-------------|--------|
| Agent Lifecycle | start, pause, resume, stop | `npm run standard:lifecycle` |
| Pricing Strategy | Cost + margin pricing | `npm run standard:pricing` |
| Job Filtering | Budget and custom filters | `npm run standard:filtering` |
| Events and Stats | Event handling & metrics | `npm run standard:events` |
| Multi-Service Agent | Multiple services per agent | `npm run standard:multi` |

### Advanced API Examples

Full protocol control with `ACTPClient`:

| Example | Description | Script |
|---------|-------------|--------|
| Transaction Lifecycle | Complete 8-state flow | `npm run advanced:lifecycle` |
| Dispute Flow | Dispute resolution | `npm run advanced:dispute` |
| Batch Operations | Parallel transactions | `npm run advanced:batch` |
| Event Monitoring | Real-time blockchain events | `npm run advanced:events` |
| EAS Attestations | Delivery proof attestations | `npm run advanced:eas` |
| Direct Protocol | Raw protocol access | `npm run advanced:protocol` |

### Pattern Examples

Production-ready patterns for robust systems:

| Example | Description | Script |
|---------|-------------|--------|
| Retry Logic | Exponential backoff + circuit breaker | `npm run patterns:retry` |
| Concurrent Requests | Semaphore + rate limiting | `npm run patterns:concurrent` |
| Provider Discovery | Find and select providers | `npm run patterns:discovery` |

### Use Case Examples

Complete business scenarios:

| Example | Description | Script |
|---------|-------------|--------|
| AI-to-AI Payment | Autonomous agent payments | `npm run usecases:ai-payment` |
| Code Review Agent | Monetized code review service | `npm run usecases:code-review` |

---

## Running Examples

### Mock Mode (Default)

All examples run in mock mode by default - no blockchain setup required:

<Tabs>
<TabItem value="ts" label="TypeScript">

```bash
npm run basic:hello-world
```

</TabItem>
<TabItem value="py" label="Python">

```bash
python basic/01_hello_world.py
```

</TabItem>
</Tabs>

Mock mode features:
- Local state in `.actp/` directory
- Unlimited test USDC (auto-minted)
- Time control for testing
- Instant transactions

### Testnet Mode

Run on Base Sepolia testnet:

```bash
# Set environment
export PRIVATE_KEY=0x...
export RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY

# Run with testnet flag
npm run testnet:hello-world
```

Testnet requirements:
- Private key with testnet ETH for gas
- Mock USDC from faucet
- RPC endpoint (Alchemy, Infura, etc.)

---

## Example Structure

Each example follows this pattern:

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
/**
 * Example Title
 *
 * Description of what this example demonstrates.
 *
 * Run: npm run basic:hello-world
 */

// 1. Imports
import { provide, request } from '@agirails/sdk';

// 2. Setup (if needed)
// ...

// 3. Main logic
async function main() {
  // Provider setup
  const provider = provide('service', handler);

  // Requester logic
  const result = await request('service', options);

  // Cleanup
  await provider.stop();
}

main().catch(console.error);
```

</TabItem>
<TabItem value="py" label="Python">

```python
"""
Example Title

Description of what this example demonstrates.

Run: python basic/01_hello_world.py
"""

import asyncio
from agirails import provide, request

async def main():
    # Provider setup
    provider = provide('service', handler)

    # Requester logic
    result = await request('service', options)

    # Cleanup
    await provider.stop()

asyncio.run(main())
```

</TabItem>
</Tabs>

---

## Hello World Example

The simplest possible AGIRAILS integration:

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { provide, request } from '@agirails/sdk';

// Provider: offer an echo service
const provider = provide('echo', async (job) => {
  return { echoed: job.input };
});

console.log('Provider running at:', provider.address);

// Wait for registration
await new Promise(r => setTimeout(r, 100));

// Requester: call the service
const { result, transaction } = await request('echo', {
  input: 'Hello, AGIRAILS!',
  budget: 1,
});

console.log('Result:', result.echoed);      // 'Hello, AGIRAILS!'
console.log('Paid:', transaction.amount);    // 1 USDC
console.log('Fee:', transaction.fee);        // 0.05 USDC (minimum)

await provider.stop();
```

</TabItem>
<TabItem value="py" label="Python">

```python
import asyncio
from agirails import provide, request

async def main():
    # Provider: offer an echo service
    provider = provide('echo', lambda job: {'echoed': job.input})

    print(f'Provider running at: {provider.address}')

    # Wait for registration
    await asyncio.sleep(0.1)

    # Requester: call the service
    response = await request('echo', {
        'input': 'Hello, AGIRAILS!',
        'budget': 1,
    })

    print(f"Result: {response['result']['echoed']}")      # 'Hello, AGIRAILS!'
    print(f"Paid: {response['transaction']['amount']}")   # 1 USDC
    print(f"Fee: {response['transaction']['fee']}")       # 0.05 USDC

    await provider.stop()

asyncio.run(main())
```

</TabItem>
</Tabs>

---

## Contributing

Found an issue or want to add an example?

1. Fork [github.com/agirails/sdk-examples](https://github.com/agirails/sdk-examples)
2. Add your example following the structure above
3. Include both TypeScript and Python versions
4. Submit a pull request

---

## Next Steps

- [SDK Reference](/sdk-reference) - Detailed API documentation
- [Basic API](/sdk-reference/basic-api) - `provide()` and `request()` reference
- [Standard API](/sdk-reference/standard-api) - `Agent` class reference
- [Advanced API](/sdk-reference/advanced-api/) - `ACTPClient` reference
