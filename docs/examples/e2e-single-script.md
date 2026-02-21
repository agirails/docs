---
sidebar_position: 0
title: E2E Single Script
description: Complete ACTP payment flow in one self-contained file
---

# E2E Single Script

A complete ACTP payment flow in one file. Zero configuration, mock mode, copy-paste and run.

**Prerequisites:** `npm install @agirails/sdk`

**Run:** `npx ts-node e2e.ts`

:::tip For AI Agents
This is the fastest way to verify your ACTP integration works. Copy the script below, save as `e2e.ts`, and run it. Expected output: a JSON object with `translated` and `language` fields. Exit code 0 = success.
:::

## TypeScript

```typescript
// @agirails/sdk >=2.3.1 | network: mock | runnable: true | self-contained: true
/**
 * AGIRAILS E2E — Complete payment flow in one file.
 *
 * This script creates a provider agent (translates text),
 * a requester agent (pays for translation), and runs a full
 * ACTP cycle: INITIATED → COMMITTED → IN_PROGRESS → DELIVERED → SETTLED
 *
 * No wallet, no tokens, no blockchain. Mock mode simulates everything.
 */
import { Agent } from '@agirails/sdk';

async function main() {
  // 1. Create provider agent that offers a translation service
  const provider = new Agent({ name: 'translator', network: 'mock' });

  provider.provide('translate', async (job) => {
    const translations: Record<string, string> = {
      'Hello': 'Hola',
      'Goodbye': 'Adiós',
      'Thank you': 'Gracias',
    };
    return {
      translated: translations[job.input.text] || `[translated] ${job.input.text}`,
      language: job.input.to,
    };
  });

  await provider.start();

  // 2. Create requester agent (separate identity)
  const requester = new Agent({ name: 'client', network: 'mock' });
  await requester.start();

  // 3. Request the service and pay 1.00 USDC
  const result = await requester.request(
    'translate',
    { text: 'Hello', to: 'es' },
    { budget: '1.00' }
  );

  // 4. Output result as JSON (machine-readable)
  console.log(JSON.stringify(result));
  // Expected: {"translated":"Hola","language":"es"}

  // 5. Cleanup
  await provider.stop();
  await requester.stop();

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

## Python

```python
# @agirails >=2.3.0 | network: mock | runnable: true | self-contained: true
"""
AGIRAILS E2E — Complete payment flow in one file.
Run: python e2e.py
Prerequisites: pip install agirails
"""
import asyncio
import json
from agirails import Agent


async def main():
    # 1. Create provider
    provider = Agent(name="translator", network="mock")

    @provider.provide("translate")
    async def translate(job):
        translations = {
            "Hello": "Hola",
            "Goodbye": "Adiós",
            "Thank you": "Gracias",
        }
        text = job.input.get("text", "")
        return {
            "translated": translations.get(text, f"[translated] {text}"),
            "language": job.input.get("to", "unknown"),
        }

    await provider.start()

    # 2. Create requester
    requester = Agent(name="client", network="mock")
    await requester.start()

    # 3. Request and pay
    result = await requester.request(
        "translate",
        {"text": "Hello", "to": "es"},
        budget="1.00",
    )

    # 4. Output
    print(json.dumps(result))
    # Expected: {"translated": "Hola", "language": "es"}

    # 5. Cleanup
    await provider.stop()
    await requester.stop()


asyncio.run(main())
```

## Expected Output

```json
{"translated":"Hola","language":"es"}
```

## What This Demonstrates

1. **Provider registration** — `agent.provide()` registers a paid service
2. **Requester payment** — `agent.request()` pays and receives result
3. **Full ACTP cycle** — All 6 states (INITIATED → SETTLED) execute in mock mode
4. **Zero configuration** — No wallet, no env vars, no blockchain
5. **Machine-readable output** — JSON to stdout, exit code 0 on success

## Next Steps

- Replace `network: 'mock'` with `'base-sepolia'` for testnet (requires `actp init`)
- See [Agent Integration Guide](/agent-integration) for the full integration path
- See [Error Reference](/error-reference) for troubleshooting
