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
// Level 2: Advanced API - Direct protocol control
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
# Level 2: Advanced API - Direct protocol control
from agirails import NonceManager

nonce_manager = NonceManager('.actp/nonces')

# Get next nonce
nonce = await nonce_manager.get_next('quote')
print(f'Nonce: {nonce}')

# Get current without incrementing
current = await nonce_manager.get_current('quote')

# Reset nonce (use carefully!)
await nonce_manager.reset('quote')
```

</TabItem>
</Tabs>

---

## ReceivedNonceTracker

Track received nonces to prevent replay attacks.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
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

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
from agirails import ReceivedNonceTracker

tracker = ReceivedNonceTracker('.actp/received-nonces')

# Mark nonce as used
await tracker.mark_used('0xSender...', 'quote', 5)

# Check if nonce was already used
is_used = await tracker.is_used('0xSender...', 'quote', 5)
if is_used:
    raise Exception('Replay attack detected!')

# Validate nonce (throws if already used)
await tracker.validate('0xSender...', 'quote', 6)
```

</TabItem>
</Tabs>

---

## RateLimiter

Control request rates.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
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

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
from agirails import RateLimiter

# 10 requests per minute
limiter = RateLimiter(max_requests=10, window_ms=60000)

# Check if can proceed
if limiter.can_proceed():
    await make_request()
    limiter.record_request()
else:
    wait_time = limiter.get_wait_time()
    print(f'Rate limited. Wait {wait_time}ms')

# Or use with automatic waiting
await limiter.wait_for_slot()
await make_request()
```

</TabItem>
</Tabs>

---

## Semaphore

Limit concurrent operations.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
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

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
from agirails import Semaphore
import asyncio

# Max 5 concurrent operations
semaphore = Semaphore(5)

async def process_with_limit(items: list[str]):
    async def process_one(item):
        await semaphore.acquire()
        try:
            await process_item(item)
        finally:
            semaphore.release()

    await asyncio.gather(*[process_one(item) for item in items])
```

</TabItem>
</Tabs>

---

## Validation Functions

Input validation utilities.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
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

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
from agirails import (
    validate_address,
    validate_amount,
    validate_tx_id,
    validate_deadline,
    validate_dispute_window,
)
import time

# Validate Ethereum address
validate_address('0x1234...')  # raises if invalid

# Validate amount (positive, proper format)
validate_amount('100000000')   # raises if invalid

# Validate transaction ID (bytes32)
validate_tx_id('0xabc123...')  # raises if invalid

# Validate deadline (future timestamp)
validate_deadline(int(time.time()) + 86400)

# Validate dispute window (reasonable range)
validate_dispute_window(172800)  # 48 hours
```

</TabItem>
</Tabs>

---

## Helpers

Common helper functions.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
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

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
from agirails import parse_units, format_units, Helpers
from datetime import datetime

# Parse USDC amount (6 decimals)
wei = parse_units('100', 6)  # 100000000

# Format USDC amount
usdc = format_units(100000000, 6)  # "100.0"

# Parse deadline string
deadline = Helpers.parse_deadline('+24h')
print(f'Deadline: {datetime.fromtimestamp(deadline)}')

# Supported formats: '+1h', '+24h', '+7d', '+30d', Unix timestamp

# Generate unique ID
id = Helpers.generate_id()
print(f'ID: {id}')

# Sleep utility
await Helpers.sleep(1000)  # Wait 1 second
```

</TabItem>
</Tabs>

---

## Logger

SDK logging utility.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
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

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
from agirails import Logger

# Set log level
Logger.set_level('debug')  # 'debug' | 'info' | 'warn' | 'error' | 'none'

# Log messages
Logger.debug('Debug message')
Logger.info('Info message')
Logger.warn('Warning message')
Logger.error('Error message')

# With context
Logger.info('Transaction created', {'tx_id': tx_id, 'amount': amount})
```

</TabItem>
</Tabs>

---

## IPFS Client

Upload and fetch from IPFS.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
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

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
from agirails import IPFSClient
import os

ipfs = IPFSClient(
    gateway='https://ipfs.io',
    pinning_service='https://api.pinata.cloud',
    api_key=os.getenv('PINATA_API_KEY'),
)

# Upload content
cid = await ipfs.upload('Content to store')
print(f'CID: {cid}')
print(f'URL: {ipfs.get_url(cid)}')

# Fetch content
content = await ipfs.fetch(cid)
print(f'Content: {content}')
```

</TabItem>
</Tabs>

---

## Canonical JSON

Deterministic JSON serialization for signing.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
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

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
from agirails import canonical_json_stringify
import json

obj = {
    'z': 3,
    'a': 1,
    'm': 2,
}

# Standard JSON (order not guaranteed in older Python)
print(json.dumps(obj))
# {"z": 3, "a": 1, "m": 2}

# Canonical JSON (keys sorted)
print(canonical_json_stringify(obj))
# {"a":1,"m":2,"z":3}
```

</TabItem>
</Tabs>

---

## Error Recovery Guide

Get actionable recovery steps for errors.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
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

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
from agirails import ErrorRecoveryGuide, InsufficientFundsError

try:
    await client.basic.pay(...)
except InsufficientFundsError as error:
    guide = ErrorRecoveryGuide.get(error)

    print(f'Problem: {guide.problem}')
    print(f'Solution: {guide.solution}')
    print(f'Steps: {guide.steps}')
    print(f'Docs: {guide.docs_url}')
```

</TabItem>
</Tabs>

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

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
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

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
from agirails import SecureNonce, compute_type_hash

# Cryptographically secure random nonce
secure_nonce = SecureNonce.generate()
print(f'Secure nonce: {secure_nonce}')

# Compute EIP-712 type hash
type_hash = compute_type_hash(
    'PriceQuote',
    [
        {'name': 'txId', 'type': 'bytes32'},
        {'name': 'amount', 'type': 'uint256'},
    ]
)
print(f'Type hash: {type_hash}')
```

</TabItem>
</Tabs>

---

## SDK Lifecycle

Manage SDK initialization and cleanup.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
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

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
from agirails import SDKLifecycle

# Initialize SDK resources
await SDKLifecycle.initialize(
    state_directory='.actp',
    log_level='info',
)

# ... use SDK ...

# Cleanup on shutdown
await SDKLifecycle.cleanup()
```

</TabItem>
</Tabs>

---

## Next Steps

- [Basic API](./basic-api) - High-level functions
- [Standard API](./standard-api) - Agent class
- [Errors](./errors) - Error handling
