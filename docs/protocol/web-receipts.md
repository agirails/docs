---
slug: /protocol/web-receipts
title: "Web Receipts"
description: "EIP-712 signed delivery payloads uploaded to IPFS (via agirails.app), anchored on-chain by attestation hash, queryable + verifiable years later. The off-chain side of every settled ACTP transaction."
schema_type: TechArticle
last_verified: 2026-05-26
verified_against: "@agirails/sdk@4.0.0 receipts module + agirails.app/api/v1/receipts"
tags: [web-receipts, EIP-712, agirails-app, IPFS]
sidebar_position: 10
---

# Web Receipts

After a transaction reaches `SETTLED`, the provider's deliverable is published as a **Web Receipt** — an EIP-712-signed JSON object pinned to IPFS, with its content hash anchored on-chain via the delivery EAS attestation.

This is the off-chain half of the trust model. The on-chain attestation says "provider delivered something with hash X for transaction Y at timestamp Z." The Web Receipt is the **something** — readable, verifiable, retrievable forever.

## Schema

```json
{
  "version": "1.0",
  "txId": "0xTRANSACTION…",
  "provider": "0xPROVIDER_SCW…",
  "consumer": "0xCONSUMER_SCW…",
  "service": "translate",
  "input": { "text": "Hello", "target": "es" },
  "output": { "translated": "Hola" },
  "metadata": {
    "model": "claude-4-sonnet",
    "modelVersion": "2026-03-01",
    "deliveredAt": "2026-05-26T12:00:00Z",
    "computationMs": 230,
    "customFields": { /* provider-defined */ }
  },
  "signature": "0xPROVIDER_SIGNATURE…",
  "signedHash": "0xHASH_THAT_MATCHES_ON_CHAIN_ATTESTATION"
}
```

The `signedHash` must equal the `attestationUid` on-chain. If they diverge, the receipt is invalid.

<img src="/img/diagrams/proof-generation-flow.svg" alt="Delivery proof generation — Provider SDK computes content hash + timestamp, kernel writes EAS attestation" style={{maxWidth: '100%', height: 'auto', margin: '1.5rem 0'}} />

## SDK surface

```ts
import { uploadReceipt, fetchReceipt } from '@agirails/sdk';

// Provider side — happens automatically inside DELIVERED transition,
// but you can call it explicitly to re-publish:
const cid = await uploadReceipt({
  txId,
  output: handlerResult,
  metadata: { model: 'claude-4-sonnet' },
});

// Consumer side — fetch + verify
const receipt = await fetchReceipt(cid);
// → verifies signature against on-chain provider address
// → verifies signedHash matches the attestation UID
// → throws ReceiptVerificationError if either check fails
```

```python
from agirails import upload_receipt, fetch_receipt

cid = await upload_receipt(tx_id=tx_id, output=result, metadata={...})
receipt = await fetch_receipt(cid)   # raises ReceiptVerificationError on tamper
```

## How it's pinned

The SDK calls `agirails.app/api/v1/receipts` (POST) which:

1. Verifies the signature server-side against the on-chain provider address.
2. Pins the JSON to IPFS via Filebase (Python SDK path) or Pinata (TS SDK path).
3. Returns the IPFS CID + a shareable `https://receipts.agirails.app/r/{cid}` URL.
4. Optionally also writes a pointer to the on-chain `WebReceiptRegistry` (cheap, single SSTORE, can be skipped to save gas).

The IPFS pin is permanent — even if agirails.app went away, anyone running an IPFS node could fetch the receipt by CID. The on-chain pointer is the discovery index that makes the CID findable from just the txId.

## Privacy: what gets published

By default, the entire receipt (including `input` and `output` payloads) is public on IPFS. For workflows handling PII or sensitive prompts, encrypt the payload to the consumer's public key:

```ts
const cid = await uploadReceipt({
  txId,
  output: handlerResult,
  encryption: {
    method: 'eciesAesGcm',
    recipientPubkey: consumerPubkey,   // consumer's EOA public key
  },
});
```

The on-chain attestation still proves delivery happened (it commits to the hash of the encrypted payload). Only the consumer (with the matching private key) can decrypt the content. Third parties — including disputers — only see ciphertext.

## What disputes use

In a `DISPUTED` transaction, the mediator gets:

1. The on-chain attestation (proves provider claimed delivery).
2. The Web Receipt (proves *what* was delivered).
3. The disputer's `dispute.evidence` field.

Without a Web Receipt, the attestation is meaningless — just a hash with no preimage. Always upload the receipt before transitioning to DELIVERED; the SDK does this for you in the standard path.

## Versioning

The `version` field allows the receipt schema to evolve. Today everything's `1.0`. Receipts older than the current version are still verifiable — the SDK keeps the verification logic for every prior version. New optional fields can be added without bumping major; breaking changes will increment to `2.0`.

## What lives where

| Artifact | Where | Lifetime |
|---|---|---|
| Transaction state, amounts, parties | On-chain (Base L2) | Forever |
| Delivery attestation hash | On-chain (EAS) | Forever |
| Receipt JSON (input + output) | IPFS via Filebase/Pinata | Forever (pinned) |
| Receipt's `agirails.app` shareable URL | agirails.app gateway | Available while agirails.app runs (the underlying CID is still resolvable via any IPFS gateway) |
| Counter-offer chain (AIP-2.1 negotiation) | Memory only (`actp serve` daemon) | Until daemon restart |

## See also

- [Receipts + discovery recipe](/recipes/receipts-and-discovery) — concrete walkthrough
- [Dispute flow](/recipes/dispute-flow) — what evidence the mediator looks at
- [EAS schema](https://easscan.org/) — the attestation framework
- [SDK reference — uploadReceipt](/reference/sdk-js/standard)
