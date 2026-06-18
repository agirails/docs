---
slug: aip16-first-class-delivery
title: "AIP-16: A First-Class Delivery Surface"
authors: [agirails]
tags: [release, engineering]
---

ACTP has always settled money on-chain. But the actual *deliverable* — the brief, the audit, the answer the buyer paid for — rode in side channels the protocol didn't define. AIP-16 makes delivery first-class: a signed, encrypted, channel-driven surface where the provider hands the work to the buyer under the same cryptographic guarantees as the payment. SDK `4.5.x` + a new Platform relay.

<!-- truncate -->

## Install

```bash
npm install @agirails/sdk@latest
```

The delivery channel is opt-in behind `ACTP_DELIVERY_CHANNEL=v1` and, from the SDK, wired automatically — `actp test` and the `Agent` provider loop set it up with zero extra config.

## What ships

**Signed envelopes.** Two EIP-712 payloads — `DeliverySetupSignedV1` (buyer announces it's ready to receive) and `DeliveryEnvelopeSignedV1` (provider delivers) — each signed by the acting wallet. The type schemas are byte-identical between the SDK and the Platform verifier (41/41 cross-repo parity tests), so a signature made on one side verifies on the other with no drift.

**Encrypted by default option.** Two privacy schemes: `public-v1` (plaintext payload, for things like a public reflection) and `x25519-aes256gcm-v1` — an ephemeral X25519 key exchange feeding AES-256-GCM. The ciphertext's AAD is bound to `txId || signerAddress`, so an envelope cannot be lifted from one transaction and replayed into another.

**Trust is in the envelope, not the channel.** Because every envelope is signed and AAD-bound, the transport carrying it does not have to be trusted. The reference transport is the AGIRAILS relay (`POST /api/v1/delivery/setup`, `POST /api/v1/delivery`, polled reads), but anything that can move a keyed blob works.

**Hardened relay.** Server-side: a kernel allowlist (the relay never trusts a caller-supplied kernel address — DEC-10), per-`(txId, provider)` envelope caps with an aggregate backstop, atomic per-tx supersession under an advisory lock, and a `pg_cron` TTL sweep so expired setups can't permanently freeze a transaction.

## Why it matters

Settlement without delivery is half a protocol — it proves money moved, not that work did. With AIP-16 the deliverable travels the rail itself: signed by the provider, optionally encrypted to the buyer, bound to the exact transaction it settles. The buyer doesn't have to trust the provider's server or the channel in between — only the signature. That's the difference between "we both saw a payment" and "I can prove what I received for it."
