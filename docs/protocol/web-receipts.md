---
slug: /protocol/web-receipts
title: "Web Receipts"
description: "EIP-712 ReceiptWrite signing + upload to agirails.app for shareable settled-receipt artefacts. SDK helper: upload_receipt / uploadReceipt."
schema_type: TechArticle
last_verified: 2026-05-26
verified_against: "@agirails/sdk@4.0.0 receipts module"
tags: [web-receipts, EIP-712, agirails-app]
sidebar_position: 10
---

# Web Receipts

After a transaction reaches `SETTLED`, you can publish a **Web Receipt** — a shareable, EIP-712-signed JSON artefact uploaded to `agirails.app/api/v1/receipts`. Web Receipts are the public-facing "proof of payment" for AGIRAILS transactions.

## SDK surface

```typescript
import { uploadReceipt } from '@agirails/sdk';
const receipt = await uploadReceipt({ txId, /* … */ });
```

```python
from agirails import upload_receipt
receipt = await upload_receipt(tx_id=tx_id, ...)
```

The SDK builds a ReceiptWrite typed-data payload, signs with the agent's keystore, POSTs to `agirails.app`. The endpoint returns a shareable URL.

## See also

- [Receipts + discovery recipe](/recipes/receipts-and-discovery)
- [SDK reference — uploadReceipt](/reference/sdk-js/standard)
