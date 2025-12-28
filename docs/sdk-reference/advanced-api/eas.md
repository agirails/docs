---
sidebar_position: 5
title: EAS
description: Ethereum Attestation Service integration
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# EAS (Ethereum Attestation Service)

The `EASHelper` module provides integration with Ethereum Attestation Service for delivery proof attestations.

---

## Overview

EASHelper enables:
- Creating on-chain attestations for delivery proofs
- Verifying attestation authenticity
- Revoking attestations if needed
- Replay attack prevention

---

## Configuration

```typescript
interface EASConfig {
  contractAddress: string;        // EAS contract address
  deliveryProofSchemaId: string;  // Schema UID for delivery proofs
}
```

**Network Addresses:**

| Network | EAS Contract | Schema Registry |
|---------|--------------|-----------------|
| Base Sepolia | `0x4200000000000000000000000000000000000021` | `0x4200000000000000000000000000000000000020` |
| Base Mainnet | `0x4200000000000000000000000000000000000021` | `0x4200000000000000000000000000000000000020` |

---

## Methods

### attestDeliveryProof()

Create an on-chain attestation for a delivery proof.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { ProofGenerator, EASHelper } from '@agirails/sdk';

// Generate delivery proof
const proofGenerator = new ProofGenerator();
const proof = proofGenerator.generateDeliveryProof({
  txId,
  deliverable: 'Result content here',
  deliveryUrl: 'ipfs://Qm...',
});

// Create attestation
const eas = new EASHelper(signer, {
  contractAddress: EAS_ADDRESS,
  deliveryProofSchemaId: SCHEMA_ID,
});

const attestation = await eas.attestDeliveryProof(
  proof,
  requesterAddress, // Recipient of attestation
  {
    expirationTime: 0, // No expiration (0 = forever)
    revocable: true,
  }
);

console.log('Attestation UID:', attestation.uid);
console.log('Transaction hash:', attestation.transactionHash);

// Anchor to kernel
await kernel.anchorAttestation(txId, attestation.uid);
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails import ProofGenerator, EASHelper

# Generate delivery proof
proof_generator = ProofGenerator()
proof = proof_generator.generate_delivery_proof(
    tx_id=tx_id,
    deliverable='Result content here',
    delivery_url='ipfs://Qm...',
)

# Create attestation
eas = EASHelper(
    signer=signer,
    config={
        'contract_address': EAS_ADDRESS,
        'delivery_proof_schema_id': SCHEMA_ID,
    }
)

attestation = await eas.attest_delivery_proof(
    proof,
    requester_address,
    expiration_time=0,
    revocable=True,
)

print(f'Attestation UID: {attestation.uid}')
```

</TabItem>
</Tabs>

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `proof` | `DeliveryProof` | Proof from ProofGenerator |
| `recipient` | `string` | Who receives the attestation |
| `options.expirationTime` | `number?` | Expiry timestamp (0 = never) |
| `options.revocable` | `boolean?` | Can be revoked (default: true) |

**Returns:**

```typescript
interface AttestationResponse {
  uid: string;           // Attestation UID (bytes32)
  transactionHash: string;  // Blockchain tx hash
}
```

---

### verifyAttestation()

Verify an attestation's validity.

```typescript
const isValid = await eas.verifyAttestation(attestationUID, {
  expectedTxId: txId,
  expectedProvider: providerAddress,
});

if (isValid) {
  console.log('Attestation verified!');
} else {
  console.log('Invalid attestation');
}
```

**Verification checks:**
- Attestation exists on-chain
- Not revoked
- Not expired
- Schema matches delivery proof schema
- Content matches expected values

---

### revokeAttestation()

Revoke a previously issued attestation.

```typescript
const txHash = await eas.revokeAttestation(attestationUID);
console.log('Revocation tx:', txHash);
```

**Use cases:**
- Dispute resolution (invalidate delivery)
- Error correction
- Provider requested revocation

---

### getAttestation()

Fetch attestation details from chain.

```typescript
const attestation = await eas.getAttestation(attestationUID);

console.log('Schema:', attestation.schema);
console.log('Recipient:', attestation.recipient);
console.log('Attester:', attestation.attester);
console.log('Revoked:', attestation.revoked);
console.log('Time:', new Date(attestation.time * 1000));
```

---

## Delivery Proof Schema

The AGIRAILS delivery proof schema:

```
bytes32 txId          // Transaction ID
bytes32 contentHash   // Keccak256 of deliverable
uint256 timestamp     // Delivery timestamp
string deliveryUrl    // IPFS/Arweave URL (optional)
uint256 size          // Content size in bytes
string mimeType       // Content MIME type
```

---

## Security Features

### Replay Attack Prevention

EASHelper tracks used attestations to prevent replay:

```typescript
import { FileBasedUsedAttestationTracker } from '@agirails/sdk';

// Use file-based tracker for persistence
const tracker = new FileBasedUsedAttestationTracker('.actp/attestations');

const eas = new EASHelper(signer, config, tracker);
```

**Warning:** Default in-memory tracker loses state on restart. Use file-based tracker in production.

### Schema Validation

Constructor validates schema UID format:
- Must be bytes32 hex string (0x + 64 chars)
- Cannot be zero bytes32

---

## Example: Complete Delivery Flow

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import {
  ACTPClient,
  ProofGenerator,
  EASHelper,
  State,
} from '@agirails/sdk';

async function deliverWithAttestation(txId: string, result: string) {
  const client = await ACTPClient.create({
    mode: 'testnet',
    privateKey: process.env.PRIVATE_KEY!,
  });

  // 1. Generate proof
  const proofGen = new ProofGenerator();
  const proof = proofGen.generateDeliveryProof({
    txId,
    deliverable: result,
    metadata: {
      mimeType: 'application/json',
    },
  });

  // 2. Create EAS attestation
  const eas = new EASHelper(client.signer, {
    contractAddress: EAS_ADDRESS,
    deliveryProofSchemaId: SCHEMA_ID,
  });

  const tx = await client.runtime.getTransaction(txId);
  const attestation = await eas.attestDeliveryProof(proof, tx.requester);

  console.log('Created attestation:', attestation.uid);

  // 3. Anchor attestation to transaction
  await client.runtime.anchorAttestation(txId, attestation.uid);

  // 4. Transition to DELIVERED
  await client.runtime.transitionState(txId, State.DELIVERED);

  console.log('Delivery complete with on-chain proof!');
}
```

</TabItem>
</Tabs>

---

## Next Steps

- [Proof Generator](./proof-generator) - Generate delivery proofs
- [Kernel](./kernel) - Anchor attestations
- [Events](./events) - Monitor attestation events
