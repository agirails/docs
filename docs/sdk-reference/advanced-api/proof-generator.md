---
sidebar_position: 7
title: Proof Generator
description: Content hashing and delivery proof creation
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Proof Generator

The `ProofGenerator` module creates cryptographic proofs for delivered content.

---

## Overview

ProofGenerator provides:
- Content hashing (Keccak256)
- Delivery proof generation (AIP-4)
- URL content fetching with SSRF protection
- Proof verification

---

## Methods

### hashContent()

Hash deliverable content using Keccak256.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
import { ProofGenerator } from '@agirails/sdk';

const proofGen = new ProofGenerator();

// Hash string content
const hash1 = proofGen.hashContent('Hello, World!');
console.log('String hash:', hash1);

// Hash buffer content
const buffer = Buffer.from([0x01, 0x02, 0x03]);
const hash2 = proofGen.hashContent(buffer);
console.log('Buffer hash:', hash2);
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
from agirails import ProofGenerator

proof_gen = ProofGenerator()

# Hash string content
hash1 = proof_gen.hash_content('Hello, World!')
print(f'String hash: {hash1}')

# Hash bytes content
buffer = bytes([0x01, 0x02, 0x03])
hash2 = proof_gen.hash_content(buffer)
print(f'Buffer hash: {hash2}')
```

</TabItem>
</Tabs>

**Returns:** `string` - Keccak256 hash (bytes32, 0x-prefixed)

---

### generateDeliveryProof()

Generate a complete delivery proof per AIP-4.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
const proof = proofGen.generateDeliveryProof({
  txId: '0x1234...', // Transaction ID
  deliverable: 'Your AI-generated content here',
  deliveryUrl: 'ipfs://QmHash...', // Optional: permanent storage URL
  metadata: {
    mimeType: 'application/json',
    // Note: size is computed automatically
  },
});

console.log('Proof:', proof);
// {
//   type: 'delivery.proof',
//   txId: '0x1234...',
//   contentHash: '0xabc...',
//   timestamp: 1703779200000,
//   deliveryUrl: 'ipfs://QmHash...',
//   metadata: {
//     size: 35,
//     mimeType: 'application/json'
//   }
// }
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
proof = proof_gen.generate_delivery_proof(
    tx_id='0x1234...',  # Transaction ID
    deliverable='Your AI-generated content here',
    delivery_url='ipfs://QmHash...',  # Optional: permanent storage URL
    metadata={
        'mimeType': 'application/json',
        # Note: size is computed automatically
    },
)

print(f'Proof: {proof}')
# {
#   'type': 'delivery.proof',
#   'tx_id': '0x1234...',
#   'content_hash': '0xabc...',
#   'timestamp': 1703779200000,
#   'delivery_url': 'ipfs://QmHash...',
#   'metadata': {
#     'size': 35,
#     'mimeType': 'application/json'
#   }
# }
```

</TabItem>
</Tabs>

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `txId` | `string` | Transaction ID |
| `deliverable` | `string \| Buffer` | Content to hash |
| `deliveryUrl` | `string?` | IPFS/Arweave URL |
| `metadata` | `object?` | Additional metadata |

**Returns:**

```typescript
interface DeliveryProof {
  type: 'delivery.proof';
  txId: string;
  contentHash: string;     // Keccak256 of deliverable
  timestamp: number;       // Unix timestamp (ms)
  deliveryUrl?: string;    // Permanent storage URL
  metadata: {
    size: number;          // Computed content size
    mimeType: string;      // Content type
    [key: string]: any;    // User metadata
  };
}
```

---

### verifyDeliverable()

Verify deliverable content matches expected hash.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
const deliverable = 'Content from provider';
const expectedHash = '0xabc123...';

const isValid = proofGen.verifyDeliverable(deliverable, expectedHash);

if (isValid) {
  console.log('Content matches proof!');
} else {
  console.log('Content tampered or wrong!');
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
deliverable = 'Content from provider'
expected_hash = '0xabc123...'

is_valid = proof_gen.verify_deliverable(deliverable, expected_hash)

if is_valid:
    print('Content matches proof!')
else:
    print('Content tampered or wrong!')
```

</TabItem>
</Tabs>

---

### hashFromUrl()

Fetch content from URL and generate hash. Includes SSRF protection.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
// Hash content from IPFS
const hash = await proofGen.hashFromUrl('https://ipfs.io/ipfs/QmHash...');

// Hash content from Arweave
const hash2 = await proofGen.hashFromUrl('https://arweave.net/TxId...');
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
# Hash content from IPFS
hash = await proof_gen.hash_from_url('https://ipfs.io/ipfs/QmHash...')

# Hash content from Arweave
hash2 = await proof_gen.hash_from_url('https://arweave.net/TxId...')
```

</TabItem>
</Tabs>

**Security features:**
- HTTPS-only by default
- Hostname blocklist (metadata services, private IPs)
- Size limits (10MB default)
- Request timeout (30 seconds)

---

### encodeProof()

Encode proof for on-chain submission.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
const encoded = proofGen.encodeProof(proof);
// Returns ABI-encoded bytes for smart contract
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
encoded = proof_gen.encode_proof(proof)
# Returns ABI-encoded bytes for smart contract
```

</TabItem>
</Tabs>

---

### decodeProof()

Decode proof from on-chain data.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
const decoded = proofGen.decodeProof(encodedData);
console.log('Decoded txId:', decoded.txId);
console.log('Decoded hash:', decoded.contentHash);
console.log('Decoded time:', decoded.timestamp);
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
decoded = proof_gen.decode_proof(encoded_data)
print(f'Decoded txId: {decoded.tx_id}')
print(f'Decoded hash: {decoded.content_hash}')
print(f'Decoded time: {decoded.timestamp}')
```

</TabItem>
</Tabs>

---

## URL Validation Config

Configure URL fetching security:

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
const proofGen = new ProofGenerator({
  allowedProtocols: ['https:'],      // HTTPS only (default)
  allowLocalhost: false,             // Block localhost
  maxSize: 10 * 1024 * 1024,        // 10MB limit
  timeout: 30000,                    // 30 second timeout
  blockedHosts: [
    'metadata.google.internal',      // Cloud metadata
    '169.254.169.254',              // AWS/GCP metadata
  ],
});
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
proof_gen = ProofGenerator(
    allowed_protocols=['https:'],      # HTTPS only (default)
    allow_localhost=False,             # Block localhost
    max_size=10 * 1024 * 1024,         # 10MB limit
    timeout=30000,                     # 30 second timeout
    blocked_hosts=[
        'metadata.google.internal',    # Cloud metadata
        '169.254.169.254',             # AWS/GCP metadata
    ],
)
```

</TabItem>
</Tabs>

**Development mode:**

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
// For local testing, allow HTTP and localhost
const devProofGen = new ProofGenerator({
  allowedProtocols: ['https:', 'http:'],
  allowLocalhost: true,
});
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
# For local testing, allow HTTP and localhost
dev_proof_gen = ProofGenerator(
    allowed_protocols=['https:', 'http:'],
    allow_localhost=True,
)
```

</TabItem>
</Tabs>

---

## Example: Complete Delivery

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
import {
  ACTPClient,
  ProofGenerator,
  EASHelper,
  State,
} from '@agirails/sdk';

async function deliver(txId: string, result: string) {
  const client = await ACTPClient.create({
    mode: 'testnet',
    privateKey: process.env.PRIVATE_KEY!,
  });

  const proofGen = new ProofGenerator();

  // 1. Upload to IPFS (optional, for permanent storage)
  const ipfsUrl = await uploadToIPFS(result);

  // 2. Generate delivery proof
  const proof = proofGen.generateDeliveryProof({
    txId,
    deliverable: result,
    deliveryUrl: ipfsUrl,
    metadata: {
      mimeType: 'application/json',
      version: '1.0',
    },
  });

  console.log('Content hash:', proof.contentHash);
  console.log('Size:', proof.metadata.size, 'bytes');

  // 3. Create EAS attestation (optional, for on-chain proof)
  const eas = new EASHelper(client.signer, EAS_CONFIG);
  const tx = await client.advanced.getTransaction(txId);
  const attestation = await eas.attestDeliveryProof(proof, tx.requester);

  // 4. Anchor and transition
  await client.advanced.anchorAttestation(txId, attestation.uid);
  await client.advanced.transitionState(txId, State.DELIVERED);

  console.log('Delivered with proof!');
  return proof;
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
from agirails import ACTPClient, ProofGenerator, State
import os

async def deliver(tx_id: str, result: str):
    client = await ACTPClient.create(
        mode='testnet',
        private_key=os.environ['PRIVATE_KEY'],
    )

    proof_gen = ProofGenerator()

    # Generate delivery proof
    proof = proof_gen.generate_delivery_proof(
        tx_id=tx_id,
        deliverable=result,
        metadata={
            'mimeType': 'application/json',
            'version': '1.0',
        },
    )

    print(f'Content hash: {proof.content_hash}')
    print(f'Size: {proof.metadata["size"]} bytes')

    # Transition to DELIVERED
    await client.advanced.transition_state(tx_id, State.DELIVERED)

    print('Delivered with proof!')
    return proof
```

</TabItem>
</Tabs>

---

## Best Practices

1. **Always hash the actual deliverable** - Don't hash summaries or descriptions
2. **Use IPFS/Arweave for permanence** - Decentralized storage ensures availability
3. **Include mimeType** - Helps consumers process the content correctly
4. **Verify before accepting** - Consumers should verify hash matches content

---

## Next Steps

- [EAS](./eas) - Create on-chain attestations
- [Kernel](./kernel) - Submit delivery proofs
- [Message Signer](./message-signer) - Sign proofs
