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
// Level 2: Advanced API - Direct protocol control
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
# Level 2: Advanced API - Direct protocol control
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

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
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

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
message = {
    'type': 'actp.quote.request',
    'from': '0xRequester...',
    'to': '0xProvider...',
    'data': {
        'service': 'code-review',
        'maxPrice': '10000000',
    },
    'timestamp': int(time.time() * 1000),
    'nonce': await nonce_manager.get_next('quote'),
}

signature = await message_signer.sign_message(message)
print(f'Signature: {signature}')
```

</TabItem>
</Tabs>

---

### signQuoteRequest()

Sign a quote request (AIP-1).

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
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

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
signed_request = await message_signer.sign_quote_request({
    'tx_id': '0x...',
    'requester': 'did:ethr:84532:0xRequester...',
    'provider': 'did:ethr:84532:0xProvider...',
    'service': 'code-review',
    'max_price': '10000000',
    'chain_id': 84532,
    'nonce': 1,
})
```

</TabItem>
</Tabs>

---

### signQuoteResponse()

Sign a quote response (AIP-2).

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
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

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
signed_quote = await message_signer.sign_quote_response({
    'tx_id': '0x...',
    'provider': 'did:ethr:84532:0xProvider...',
    'consumer': 'did:ethr:84532:0xConsumer...',
    'quoted_amount': '7500000',
    'original_amount': '5000000',
    'max_price': '10000000',
    'chain_id': 84532,
    'nonce': 1,
})
```

</TabItem>
</Tabs>

---

### signDeliveryProof()

Sign a delivery proof (AIP-4).

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
import { ProofGenerator } from '@agirails/sdk';

const proofGen = new ProofGenerator();
const proof = proofGen.generateDeliveryProof({
  txId,
  deliverable: 'Result content',
});

const signedProof = await messageSigner.signDeliveryProof(proof);
console.log('Signed proof:', signedProof);
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
from agirails import ProofGenerator

proof_gen = ProofGenerator()
proof = proof_gen.generate_delivery_proof(
    tx_id=tx_id,
    deliverable='Result content',
)

signed_proof = await message_signer.sign_delivery_proof(proof)
print(f'Signed proof: {signed_proof}')
```

</TabItem>
</Tabs>

---

### verifySignature()

Verify a message signature.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
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

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
is_valid = await message_signer.verify_signature(
    message,
    signature,
    expected_signer_address
)

if is_valid:
    print('Signature verified!')
else:
    raise Exception('Invalid signature')
```

</TabItem>
</Tabs>

---

### recoverSigner()

Recover signer address from signature.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
const recoveredAddress = await messageSigner.recoverSigner(
  message,
  signature
);

console.log('Signed by:', recoveredAddress);
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
recovered_address = await message_signer.recover_signer(
    message,
    signature
)

print(f'Signed by: {recovered_address}')
```

</TabItem>
</Tabs>

---

## EIP-712 Domain

MessageSigner uses this domain structure:

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
interface EIP712Domain {
  name: 'AGIRAILS';
  version: '1.0';
  chainId: number;           // 84532 (Base Sepolia) or 8453 (Base Mainnet)
  verifyingContract: string; // ACTPKernel address
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
# EIP712Domain TypedDict
class EIP712Domain(TypedDict):
    name: str           # 'AGIRAILS'
    version: str        # '1.0'
    chain_id: int       # 84532 (Base Sepolia) or 8453 (Base Mainnet)
    verifying_contract: str  # ACTPKernel address
```

</TabItem>
</Tabs>

---

## Nonce Tracking

For replay attack prevention, use with `ReceivedNonceTracker`:

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
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

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
from agirails import MessageSigner, ReceivedNonceTracker

# Create nonce tracker
nonce_tracker = ReceivedNonceTracker('.actp/nonces')

# Create signer with tracker
message_signer = await MessageSigner.create(
    signer,
    KERNEL_ADDRESS,
    chain_id=84532,
    nonce_tracker=nonce_tracker,
)

# Tracker automatically validates nonces on verification
is_valid = await message_signer.verify_signature(message, signature, address)
# Raises if nonce already used
```

</TabItem>
</Tabs>

---

## Message Types

### Generic ACTP Message

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
interface ACTPMessage {
  type: string;           // Message type identifier
  from: string;           // Sender address
  to: string;             // Recipient address
  data: any;              // Message payload
  timestamp: number;      // Unix timestamp
  nonce: number;          // Monotonic nonce
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
class ACTPMessage(TypedDict):
    type: str           # Message type identifier
    from_: str          # Sender address (from_ due to Python keyword)
    to: str             # Recipient address
    data: Any           # Message payload
    timestamp: int      # Unix timestamp
    nonce: int          # Monotonic nonce
```

</TabItem>
</Tabs>

### Quote Request (AIP-1)

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
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

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
class QuoteRequestData(TypedDict):
    tx_id: str           # bytes32
    requester: str       # DID
    provider: str        # DID
    service: str         # Service identifier
    max_price: str       # Maximum acceptable price
    chain_id: int
    nonce: int
```

</TabItem>
</Tabs>

### Delivery Proof (AIP-4)

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
interface DeliveryProofData {
  txId: string;           // bytes32
  contentHash: string;    // bytes32
  timestamp: number;      // uint256
  deliveryUrl: string;    // Optional URL
  size: number;           // uint256
  mimeType: string;
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
class DeliveryProofData(TypedDict):
    tx_id: str            # bytes32
    content_hash: str     # bytes32
    timestamp: int        # uint256
    delivery_url: str     # Optional URL
    size: int             # uint256
    mime_type: str
```

</TabItem>
</Tabs>

---

## Example: Signed Message Flow

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
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
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
from agirails import MessageSigner, NonceManager
import time

class SecureMessaging:
    def __init__(self):
        self.message_signer: MessageSigner = None
        self.nonce_manager: NonceManager = None

    async def initialize(self, signer, kernel_address: str):
        self.nonce_manager = NonceManager('.actp/nonces')
        self.message_signer = await MessageSigner.create(
            signer,
            kernel_address,
            chain_id=84532,
        )

    async def send_secure_message(self, to: str, data: dict):
        message = {
            'type': 'actp.message.v1',
            'from': await self.message_signer.get_address(),
            'to': to,
            'data': data,
            'timestamp': int(time.time() * 1000),
            'nonce': await self.nonce_manager.get_next('message'),
        }

        signature = await self.message_signer.sign_message(message)

        return {
            'message': message,
            'signature': signature,
        }

    async def verify_received_message(
        self,
        message: dict,
        signature: str,
        expected_sender: str
    ) -> bool:
        # Verify signature
        is_valid = await self.message_signer.verify_signature(
            message,
            signature,
            expected_sender
        )

        if not is_valid:
            raise Exception('Invalid signature')

        # Verify timestamp is recent (prevent replay)
        max_age = 5 * 60 * 1000  # 5 minutes
        if int(time.time() * 1000) - message['timestamp'] > max_age:
            raise Exception('Message too old')

        return True
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
