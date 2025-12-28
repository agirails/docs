---
sidebar_position: 8
title: Message Signer
description: EIP-712 typed data signing
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Message Signer

The `MessageSigner` module provides EIP-712 typed data signing for ACTP messages.

---

## Overview

MessageSigner enables:
- EIP-712 domain-separated signing
- Quote and delivery proof signatures
- Signature verification
- Replay attack prevention via nonce tracking

---

## Factory Method

**Important:** Always use the `create()` factory method, not the constructor directly.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { MessageSigner } from '@agirails/sdk';

// Create with guaranteed domain initialization
const messageSigner = await MessageSigner.create(
  signer,           // ethers.js Signer
  KERNEL_ADDRESS,   // ACTPKernel contract address
  {
    chainId: 84532, // Optional: defaults to signer's network
  }
);

// Now safe to sign messages
const signature = await messageSigner.signMessage(message);
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails import MessageSigner

# Create with guaranteed domain initialization
message_signer = await MessageSigner.create(
    signer,
    KERNEL_ADDRESS,
    chain_id=84532,
)

# Now safe to sign messages
signature = await message_signer.sign_message(message)
```

</TabItem>
</Tabs>

---

## Methods

### signMessage()

Sign a generic ACTP message.

```typescript
const message = {
  type: 'actp.quote.request',
  from: '0xRequester...',
  to: '0xProvider...',
  data: {
    service: 'code-review',
    maxPrice: '10000000',
  },
  timestamp: Date.now(),
  nonce: await nonceManager.getNext('quote'),
};

const signature = await messageSigner.signMessage(message);
console.log('Signature:', signature);
```

---

### signQuoteRequest()

Sign a quote request (AIP-1).

```typescript
const signedRequest = await messageSigner.signQuoteRequest({
  txId: '0x...',
  requester: 'did:ethr:84532:0xRequester...',
  provider: 'did:ethr:84532:0xProvider...',
  service: 'code-review',
  maxPrice: '10000000',
  chainId: 84532,
  nonce: 1,
});
```

---

### signQuoteResponse()

Sign a quote response (AIP-2).

```typescript
const signedQuote = await messageSigner.signQuoteResponse({
  txId: '0x...',
  provider: 'did:ethr:84532:0xProvider...',
  consumer: 'did:ethr:84532:0xConsumer...',
  quotedAmount: '7500000',
  originalAmount: '5000000',
  maxPrice: '10000000',
  chainId: 84532,
  nonce: 1,
});
```

---

### signDeliveryProof()

Sign a delivery proof (AIP-4).

```typescript
import { ProofGenerator } from '@agirails/sdk';

const proofGen = new ProofGenerator();
const proof = proofGen.generateDeliveryProof({
  txId,
  deliverable: 'Result content',
});

const signedProof = await messageSigner.signDeliveryProof(proof);
console.log('Signed proof:', signedProof);
```

---

### verifySignature()

Verify a message signature.

```typescript
const isValid = await messageSigner.verifySignature(
  message,
  signature,
  expectedSignerAddress
);

if (isValid) {
  console.log('Signature verified!');
} else {
  throw new Error('Invalid signature');
}
```

---

### recoverSigner()

Recover signer address from signature.

```typescript
const recoveredAddress = await messageSigner.recoverSigner(
  message,
  signature
);

console.log('Signed by:', recoveredAddress);
```

---

## EIP-712 Domain

MessageSigner uses this domain structure:

```typescript
interface EIP712Domain {
  name: 'AGIRAILS';
  version: '1.0';
  chainId: number;           // 84532 (Base Sepolia) or 8453 (Base Mainnet)
  verifyingContract: string; // ACTPKernel address
}
```

---

## Nonce Tracking

For replay attack prevention, use with `ReceivedNonceTracker`:

```typescript
import { MessageSigner, ReceivedNonceTracker } from '@agirails/sdk';

// Create nonce tracker
const nonceTracker = new ReceivedNonceTracker('.actp/nonces');

// Create signer with tracker
const messageSigner = await MessageSigner.create(
  signer,
  KERNEL_ADDRESS,
  {
    chainId: 84532,
    nonceTracker,
  }
);

// Tracker automatically validates nonces on verification
const isValid = await messageSigner.verifySignature(message, signature, address);
// Throws if nonce already used
```

---

## Message Types

### Generic ACTP Message

```typescript
interface ACTPMessage {
  type: string;           // Message type identifier
  from: string;           // Sender address
  to: string;             // Recipient address
  data: any;              // Message payload
  timestamp: number;      // Unix timestamp
  nonce: number;          // Monotonic nonce
}
```

### Quote Request (AIP-1)

```typescript
interface QuoteRequestData {
  txId: string;           // bytes32
  requester: string;      // DID
  provider: string;       // DID
  service: string;        // Service identifier
  maxPrice: string;       // Maximum acceptable price
  chainId: number;
  nonce: number;
}
```

### Delivery Proof (AIP-4)

```typescript
interface DeliveryProofData {
  txId: string;           // bytes32
  contentHash: string;    // bytes32
  timestamp: number;      // uint256
  deliveryUrl: string;    // Optional URL
  size: number;           // uint256
  mimeType: string;
}
```

---

## Example: Signed Message Flow

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { MessageSigner, NonceManager } from '@agirails/sdk';

class SecureMessaging {
  private messageSigner: MessageSigner;
  private nonceManager: NonceManager;

  async initialize(signer: Signer, kernelAddress: string) {
    this.nonceManager = new NonceManager('.actp/nonces');
    this.messageSigner = await MessageSigner.create(
      signer,
      kernelAddress,
      { chainId: 84532 }
    );
  }

  async sendSecureMessage(to: string, data: any) {
    const message = {
      type: 'actp.message.v1',
      from: await this.messageSigner.getAddress(),
      to,
      data,
      timestamp: Date.now(),
      nonce: await this.nonceManager.getNext('message'),
    };

    const signature = await this.messageSigner.signMessage(message);

    return {
      message,
      signature,
    };
  }

  async verifyReceivedMessage(
    message: any,
    signature: string,
    expectedSender: string
  ) {
    // Verify signature
    const isValid = await this.messageSigner.verifySignature(
      message,
      signature,
      expectedSender
    );

    if (!isValid) {
      throw new Error('Invalid signature');
    }

    // Verify timestamp is recent (prevent replay)
    const maxAge = 5 * 60 * 1000; // 5 minutes
    if (Date.now() - message.timestamp > maxAge) {
      throw new Error('Message too old');
    }

    return true;
  }
}
```

</TabItem>
</Tabs>

---

## Security Notes

1. **Always use factory method** - `MessageSigner.create()` ensures domain is initialized
2. **Validate nonces** - Prevent replay attacks with `ReceivedNonceTracker`
3. **Check timestamps** - Reject old messages to limit replay window
4. **Verify signer** - Always confirm signature matches expected sender
5. **Domain separation** - Chain ID and contract address prevent cross-chain/contract replay

---

## Next Steps

- [Quote](./quote) - Build signed quotes
- [Proof Generator](./proof-generator) - Create delivery proofs
- [EAS](./eas) - On-chain attestations
