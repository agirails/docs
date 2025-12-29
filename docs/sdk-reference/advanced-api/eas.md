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

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
interface EASConfig {
  contractAddress: string;        // EAS contract address
  deliveryProofSchemaId: string;  // Schema UID for delivery proofs
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
class EASConfig(TypedDict):
    contract_address: str          # EAS contract address
    delivery_proof_schema_id: str  # Schema UID for delivery proofs
```

</TabItem>
</Tabs>

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
// Level 2: Advanced API - Direct protocol control
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
# Level 2: Advanced API - Direct protocol control
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

# Anchor to kernel
await kernel.anchor_attestation(tx_id, attestation.uid)
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

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
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

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
is_valid = await eas.verify_attestation(
    attestation_uid,
    expected_tx_id=tx_id,
    expected_provider=provider_address,
)

if is_valid:
    print('Attestation verified!')
else:
    print('Invalid attestation')
```

</TabItem>
</Tabs>

**Verification checks:**
- Attestation exists on-chain
- Not revoked
- Not expired
- Schema matches delivery proof schema
- Content matches expected values

---

### revokeAttestation()

Revoke a previously issued attestation.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
const txHash = await eas.revokeAttestation(attestationUID);
console.log('Revocation tx:', txHash);
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
tx_hash = await eas.revoke_attestation(attestation_uid)
print(f'Revocation tx: {tx_hash}')
```

</TabItem>
</Tabs>

**Use cases:**
- Dispute resolution (invalidate delivery)
- Error correction
- Provider requested revocation

---

### getAttestation()

Fetch attestation details from chain.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
const attestation = await eas.getAttestation(attestationUID);

console.log('Schema:', attestation.schema);
console.log('Recipient:', attestation.recipient);
console.log('Attester:', attestation.attester);
console.log('Revoked:', attestation.revoked);
console.log('Time:', new Date(attestation.time * 1000));
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
attestation = await eas.get_attestation(attestation_uid)

print(f'Schema: {attestation.schema}')
print(f'Recipient: {attestation.recipient}')
print(f'Attester: {attestation.attester}')
print(f'Revoked: {attestation.revoked}')
print(f'Time: {attestation.time}')
```

</TabItem>
</Tabs>

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

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
import { FileBasedUsedAttestationTracker } from '@agirails/sdk';

// Use file-based tracker for persistence
const tracker = new FileBasedUsedAttestationTracker('.actp/attestations');

const eas = new EASHelper(signer, config, tracker);
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
from agirails import FileBasedUsedAttestationTracker

# Use file-based tracker for persistence
tracker = FileBasedUsedAttestationTracker('.actp/attestations')

eas = EASHelper(signer, config, tracker)
```

</TabItem>
</Tabs>

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
// Level 2: Advanced API - Direct protocol control
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

  const tx = await client.advanced.getTransaction(txId);
  const attestation = await eas.attestDeliveryProof(proof, tx.requester);

  console.log('Created attestation:', attestation.uid);

  // 3. Anchor attestation to transaction
  await client.advanced.anchorAttestation(txId, attestation.uid);

  // 4. Transition to DELIVERED
  await client.advanced.transitionState(txId, State.DELIVERED);

  console.log('Delivery complete with on-chain proof!');
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
from agirails import ACTPClient, ProofGenerator, EASHelper, State
import os

async def deliver_with_attestation(tx_id: str, result: str):
    client = await ACTPClient.create(
        mode='testnet',
        private_key=os.environ['PRIVATE_KEY'],
    )

    # 1. Generate proof
    proof_gen = ProofGenerator()
    proof = proof_gen.generate_delivery_proof(
        tx_id=tx_id,
        deliverable=result,
        metadata={
            'mimeType': 'application/json',
        },
    )

    # 2. Create EAS attestation
    eas = EASHelper(
        client.signer,
        config={
            'contract_address': EAS_ADDRESS,
            'delivery_proof_schema_id': SCHEMA_ID,
        }
    )

    tx = await client.advanced.get_transaction(tx_id)
    attestation = await eas.attest_delivery_proof(proof, tx.requester)

    print(f'Created attestation: {attestation.uid}')

    # 3. Anchor attestation to transaction
    await client.advanced.anchor_attestation(tx_id, attestation.uid)

    # 4. Transition to DELIVERED
    await client.advanced.transition_state(tx_id, State.DELIVERED)

    print('Delivery complete with on-chain proof!')
```

</TabItem>
</Tabs>

---

## Next Steps

- [Proof Generator](./proof-generator) - Generate delivery proofs
- [Kernel](./kernel) - Anchor attestations
- [Events](./events) - Monitor attestation events
