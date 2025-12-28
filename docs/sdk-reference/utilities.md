---
sidebar_position: 8
title: Utilities
description: Helper functions and utilities
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Utilities

The SDK provides various utility functions for common operations.

---

## NonceManager

Manages monotonic nonces for replay attack prevention.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { NonceManager } from '@agirails/sdk';

// Create with persistence directory
const nonceManager = new NonceManager('.actp/nonces');

// Get next nonce for a message type
const nonce = await nonceManager.getNext('quote');
console.log('Nonce:', nonce); // 1, 2, 3, ...

// Get current nonce (without incrementing)
const current = await nonceManager.getCurrent('quote');

// Reset nonce (use carefully!)
await nonceManager.reset('quote');
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails import NonceManager

nonce_manager = NonceManager('.actp/nonces')

# Get next nonce
nonce = await nonce_manager.get_next('quote')
print(f'Nonce: {nonce}')

# Get current without incrementing
current = await nonce_manager.get_current('quote')
```

</TabItem>
</Tabs>

---

## ReceivedNonceTracker

Track received nonces to prevent replay attacks.

```typescript
import { ReceivedNonceTracker } from '@agirails/sdk';

const tracker = new ReceivedNonceTracker('.actp/received-nonces');

// Mark nonce as used
await tracker.markUsed('0xSender...', 'quote', 5);

// Check if nonce was already used
const isUsed = await tracker.isUsed('0xSender...', 'quote', 5);
if (isUsed) {
  throw new Error('Replay attack detected!');
}

// Validate nonce (throws if already used)
await tracker.validate('0xSender...', 'quote', 6);
```

---

## RateLimiter

Control request rates.

```typescript
import { RateLimiter } from '@agirails/sdk';

// 10 requests per minute
const limiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60000,
});

// Check if can proceed
if (limiter.canProceed()) {
  await makeRequest();
  limiter.recordRequest();
} else {
  const waitTime = limiter.getWaitTime();
  console.log(`Rate limited. Wait ${waitTime}ms`);
}

// Or use with automatic waiting
await limiter.waitForSlot();
await makeRequest();
```

---

## Semaphore

Limit concurrent operations.

```typescript
import { Semaphore } from '@agirails/sdk';

// Max 5 concurrent operations
const semaphore = new Semaphore(5);

async function processWithLimit(items: string[]) {
  await Promise.all(
    items.map(async (item) => {
      await semaphore.acquire();
      try {
        await processItem(item);
      } finally {
        semaphore.release();
      }
    })
  );
}
```

---

## Validation Functions

Input validation utilities.

```typescript
import {
  validateAddress,
  validateAmount,
  validateTxId,
  validateDeadline,
  validateDisputeWindow,
} from '@agirails/sdk';

// Validate Ethereum address
validateAddress('0x1234...');  // throws if invalid

// Validate amount (positive, proper format)
validateAmount('100000000');   // throws if invalid

// Validate transaction ID (bytes32)
validateTxId('0xabc123...');   // throws if invalid

// Validate deadline (future timestamp)
validateDeadline(Math.floor(Date.now() / 1000) + 86400);

// Validate dispute window (reasonable range)
validateDisputeWindow(172800); // 48 hours
```

---

## Helpers

Common helper functions.

```typescript
import { parseUnits, formatUnits, Helpers } from '@agirails/sdk';

// Parse USDC amount (6 decimals)
const wei = parseUnits('100', 6);  // 100000000n

// Format USDC amount
const usdc = formatUnits(100000000n, 6);  // "100.0"

// Parse deadline string
const deadline = Helpers.parseDeadline('+24h');
console.log('Deadline:', new Date(deadline * 1000));

// Supported formats: '+1h', '+24h', '+7d', '+30d', Unix timestamp

// Generate unique ID
const id = Helpers.generateId();
console.log('ID:', id);

// Sleep utility
await Helpers.sleep(1000);  // Wait 1 second
```

---

## Logger

SDK logging utility.

```typescript
import { Logger } from '@agirails/sdk';

// Set log level
Logger.setLevel('debug');  // 'debug' | 'info' | 'warn' | 'error' | 'none'

// Log messages
Logger.debug('Debug message');
Logger.info('Info message');
Logger.warn('Warning message');
Logger.error('Error message');

// With context
Logger.info('Transaction created', { txId, amount });
```

---

## IPFS Client

Upload and fetch from IPFS.

```typescript
import { IPFSClient } from '@agirails/sdk';

const ipfs = new IPFSClient({
  gateway: 'https://ipfs.io',
  pinningService: 'https://api.pinata.cloud',
  apiKey: process.env.PINATA_API_KEY,
});

// Upload content
const cid = await ipfs.upload('Content to store');
console.log('CID:', cid);
console.log('URL:', ipfs.getUrl(cid));

// Fetch content
const content = await ipfs.fetch(cid);
console.log('Content:', content);
```

---

## Canonical JSON

Deterministic JSON serialization for signing.

```typescript
import { canonicalJsonStringify } from '@agirails/sdk';

const obj = {
  z: 3,
  a: 1,
  m: 2,
};

// Standard JSON (order not guaranteed)
console.log(JSON.stringify(obj));
// {"z":3,"a":1,"m":2}

// Canonical JSON (keys sorted)
console.log(canonicalJsonStringify(obj));
// {"a":1,"m":2,"z":3}
```

---

## Error Recovery Guide

Get actionable recovery steps for errors.

```typescript
import { ErrorRecoveryGuide, InsufficientFundsError } from '@agirails/sdk';

try {
  await client.basic.pay({ ... });
} catch (error) {
  if (error instanceof InsufficientFundsError) {
    const guide = ErrorRecoveryGuide.get(error);

    console.log('Problem:', guide.problem);
    console.log('Solution:', guide.solution);
    console.log('Steps:', guide.steps);
    console.log('Docs:', guide.docsUrl);
  }
}
```

**Output:**
```
Problem: Not enough USDC to complete payment
Solution: Add more USDC to your wallet
Steps:
  1. Check current balance with client.getBalance()
  2. Get testnet USDC from faucet
  3. Retry the payment
Docs: https://docs.agirails.io/sdk-reference/errors#insufficientfundserror
```

---

## Security Utilities

Security-focused utilities.

```typescript
import { SecureNonce, computeTypeHash } from '@agirails/sdk';

// Cryptographically secure random nonce
const secureNonce = SecureNonce.generate();
console.log('Secure nonce:', secureNonce);

// Compute EIP-712 type hash
const typeHash = computeTypeHash(
  'PriceQuote',
  [
    { name: 'txId', type: 'bytes32' },
    { name: 'amount', type: 'uint256' },
  ]
);
console.log('Type hash:', typeHash);
```

---

## SDK Lifecycle

Manage SDK initialization and cleanup.

```typescript
import { SDKLifecycle } from '@agirails/sdk';

// Initialize SDK resources
await SDKLifecycle.initialize({
  stateDirectory: '.actp',
  logLevel: 'info',
});

// ... use SDK ...

// Cleanup on shutdown
await SDKLifecycle.cleanup();
```

---

## Next Steps

- [Basic API](./basic-api) - High-level functions
- [Standard API](./standard-api) - Agent class
- [Errors](./errors) - Error handling
