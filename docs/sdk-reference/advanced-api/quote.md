---
sidebar_position: 6
title: Quote
description: Price quote construction (AIP-2)
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Quote Builder

The `QuoteBuilder` module enables providers to create signed price quotes per AIP-2 specification.

---

## Overview

QuoteBuilder provides:
- Price quote construction with validation
- EIP-712 signature generation
- Canonical JSON hashing
- Optional IPFS upload for quote storage

---

## Quote Message Structure

Per AIP-2 specification:

```typescript
interface QuoteMessage {
  type: 'agirails.quote.v1';
  version: '1.0.0';
  txId: string;           // Transaction ID (bytes32)
  provider: string;       // Provider DID
  consumer: string;       // Consumer DID
  quotedAmount: string;   // Provider's quoted price
  originalAmount: string; // Consumer's original offer
  maxPrice: string;       // Consumer's maximum
  currency: string;       // "USDC"
  decimals: number;       // 6 for USDC
  quotedAt: number;       // Unix timestamp
  expiresAt: number;      // Expiration timestamp
  justification?: {
    reason?: string;
    estimatedTime?: number;
    computeCost?: number;
    breakdown?: Record<string, any>;
  };
  chainId: number;
  nonce: number;
  signature: string;      // EIP-712 signature
}
```

---

## Methods

### build()

Build and sign a price quote.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { QuoteBuilder, NonceManager } from '@agirails/sdk';

const nonceManager = new NonceManager('.actp/nonces');
const quoteBuilder = new QuoteBuilder(signer, nonceManager);

const quote = await quoteBuilder.build({
  txId: '0x...',
  provider: 'did:ethr:84532:0xProvider...',
  consumer: 'did:ethr:84532:0xConsumer...',
  quotedAmount: '7500000',      // $7.50 USDC
  originalAmount: '5000000',    // $5.00 original
  maxPrice: '10000000',         // $10.00 max
  expiresAt: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  justification: {
    reason: 'Complex analysis required',
    estimatedTime: 300, // 5 minutes
    computeCost: 2500000, // $2.50
  },
  chainId: 84532,
  kernelAddress: KERNEL_ADDRESS,
});

console.log('Quote:', quote);
console.log('Signature:', quote.signature);
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails import QuoteBuilder, NonceManager
import time

nonce_manager = NonceManager('.actp/nonces')
quote_builder = QuoteBuilder(signer, nonce_manager)

quote = await quote_builder.build({
    'tx_id': '0x...',
    'provider': 'did:ethr:84532:0xProvider...',
    'consumer': 'did:ethr:84532:0xConsumer...',
    'quoted_amount': '7500000',  # $7.50
    'original_amount': '5000000',
    'max_price': '10000000',
    'expires_at': int(time.time()) + 3600,
    'justification': {
        'reason': 'Complex analysis required',
        'estimated_time': 300,
    },
    'chain_id': 84532,
    'kernel_address': KERNEL_ADDRESS,
})

print(f'Quote signature: {quote.signature}')
```

</TabItem>
</Tabs>

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `txId` | `string` | Transaction ID |
| `provider` | `string` | Provider DID |
| `consumer` | `string` | Consumer DID |
| `quotedAmount` | `string` | Quoted price (base units) |
| `originalAmount` | `string` | Original offer amount |
| `maxPrice` | `string` | Maximum acceptable price |
| `currency` | `string?` | Currency code (default: "USDC") |
| `decimals` | `number?` | Token decimals (default: 6) |
| `expiresAt` | `number?` | Expiry timestamp (default: +1 hour) |
| `justification` | `object?` | Optional price justification |
| `chainId` | `number` | Network chain ID |
| `kernelAddress` | `string` | Kernel contract address |

---

### verify()

Verify a quote signature.

```typescript
const isValid = await quoteBuilder.verify(quote);

if (isValid) {
  console.log('Quote signature is valid');
} else {
  console.log('Invalid signature - reject quote');
}
```

---

### hash()

Get the canonical hash of a quote (for storage/lookup).

```typescript
const quoteHash = quoteBuilder.hash(quote);
console.log('Quote hash:', quoteHash);
```

---

## Validation Rules

QuoteBuilder enforces these rules:

| Rule | Description |
|------|-------------|
| Amount bounds | `quotedAmount >= originalAmount` |
| Max price | `quotedAmount <= maxPrice` |
| Expiry | `expiresAt > quotedAt` |
| Valid addresses | All addresses are valid Ethereum format |
| Valid DIDs | Provider/consumer are valid DID format |

---

## Quote Flow

```
┌──────────┐           ┌──────────┐
│ Consumer │           │ Provider │
└────┬─────┘           └────┬─────┘
     │                      │
     │  Request (AIP-1)     │
     │─────────────────────>│
     │                      │
     │                      │ Build Quote
     │                      │ Sign with EIP-712
     │                      │
     │  Quote (AIP-2)       │
     │<─────────────────────│
     │                      │
     │ Verify Signature     │
     │ Accept if valid      │
     │                      │
     │  Accept + Escrow     │
     │─────────────────────>│
     │                      │
```

---

## Example: Provider Quote Response

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { QuoteBuilder, NonceManager } from '@agirails/sdk';

class PricingService {
  private quoteBuilder: QuoteBuilder;

  constructor(signer: Signer, stateDir: string) {
    const nonceManager = new NonceManager(stateDir);
    this.quoteBuilder = new QuoteBuilder(signer, nonceManager);
  }

  async generateQuote(request: {
    txId: string;
    consumer: string;
    originalAmount: string;
    maxPrice: string;
    complexity: 'low' | 'medium' | 'high';
  }) {
    // Calculate price based on complexity
    const basePrice = BigInt(request.originalAmount);
    const multipliers = { low: 1n, medium: 2n, high: 3n };
    const quotedAmount = basePrice * multipliers[request.complexity];

    // Ensure within max price
    const maxPrice = BigInt(request.maxPrice);
    const finalAmount = quotedAmount > maxPrice ? maxPrice : quotedAmount;

    // Build signed quote
    const quote = await this.quoteBuilder.build({
      txId: request.txId,
      provider: 'did:ethr:84532:0x...',
      consumer: request.consumer,
      quotedAmount: finalAmount.toString(),
      originalAmount: request.originalAmount,
      maxPrice: request.maxPrice,
      justification: {
        reason: `${request.complexity} complexity task`,
        estimatedTime: request.complexity === 'high' ? 600 : 120,
      },
      chainId: 84532,
      kernelAddress: KERNEL_ADDRESS,
    });

    return quote;
  }
}
```

</TabItem>
</Tabs>

---

## EIP-712 Types

QuoteBuilder uses these EIP-712 types:

```typescript
const AIP2QuoteTypes = {
  PriceQuote: [
    { name: 'txId', type: 'bytes32' },
    { name: 'provider', type: 'string' },
    { name: 'consumer', type: 'string' },
    { name: 'quotedAmount', type: 'string' },
    { name: 'originalAmount', type: 'string' },
    { name: 'maxPrice', type: 'string' },
    { name: 'currency', type: 'string' },
    { name: 'decimals', type: 'uint8' },
    { name: 'quotedAt', type: 'uint256' },
    { name: 'expiresAt', type: 'uint256' },
    { name: 'justificationHash', type: 'bytes32' },
    { name: 'chainId', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
};
```

---

## Next Steps

- [Message Signer](./message-signer) - Generic EIP-712 signing
- [Kernel](./kernel) - Submit quotes on-chain
- [Events](./events) - Monitor quote events
