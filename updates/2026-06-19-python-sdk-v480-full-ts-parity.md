---
slug: python-sdk-v480-full-ts-parity
title: "Python SDK 4.8.0 — Full Parity with the TypeScript SDK"
authors: [agirails]
tags: [release, python, engineering]
---

`agirails@4.8.0` brings the Python SDK to **1:1 parity with `@agirails/sdk` (TypeScript) 4.8.0**. The jump from 3.0.1 to 4.8.0 closes a month of TS-side work in a single release, and — the part that actually matters for a cross-language agent economy — every hashed and signed surface is now **byte-for-byte identical** between the two SDKs. A Python agent and a TypeScript agent compute the same canonical JSON, the same keccak hashes, and the same EIP-712 signatures for the same logical action. They can settle with each other on-chain with no translation layer.

<!-- truncate -->

## Install

```bash
pip install agirails==4.8.0
```

Python 3.9–3.12. New dependency: `cryptography` (for the AIP-16 delivery channel).

## What's new

**AIP-16 encrypted delivery channel.** The full secure-delivery surface that previously existed only in TypeScript: X25519 ECDH key agreement, HKDF-SHA256 session keys, AES-256-GCM with `txId‖signer` AAD binding, and EIP-712-signed `DeliverySetup` / `DeliveryEnvelope` projections, plus Mock and Relay channels. `public-v1` (plaintext) and `x25519-aes256gcm-v1` (encrypted) schemes both round-trip end to end.

**Native x402 v2.** `X402Adapter` is now the real `exact`-scheme EVM flow — EIP-3009 `TransferWithAuthorization` signing (and a Permit2 path for Smart Wallets), the `x402Version: 2` `X-PAYMENT` header, and an opt-in safety gate so it never auto-pays an arbitrary URL. The old direct-transfer adapter stays available as `LegacyX402Adapter`.

**The same provider-side fixes as `@agirails/sdk@4.8.0`.** Python now emits typed `job:declined` (economic) and `job:filtered` (policy) events instead of swallowing refusals, and a raw `actp pay` with a `ZeroHash` service routes to a single registered handler instead of dropping. See [SDK 4.8.0 — Raw-Pay Routing and Decline Events](/changelog/sdk-v480-raw-pay-routing-decline-events) for the behavior.

**Protocol + negotiation + identity.** AIP-2 EIP-712-signed `QuoteBuilder`; AIP-2.1 `ProviderOrchestrator` with channel-driven multi-round negotiation and injectable buyer/provider decider hooks (BYO-brain); AIP-7 receipt push (`ReceiptWriteV2`, absolute `receiptUrl`); AIP-18 buyer privacy (a buyer's `budget` and `claim_code` never enter the `configHash` or reach IPFS); Smart-Wallet routing so a Tier-1 transaction's `msg.sender` is the Smart Wallet; and the full `ACTPClient` lifecycle (`start_work` / `deliver` / `release` / `get_status` / …).

**Verified, not asserted.** Each cross-SDK surface is locked by golden vectors generated from the real TypeScript functions — 185 byte-exactness tests covering canonical JSON, keccak hashing, the AIP-2 quote signature, the AIP-16 crypto and EIP-712 envelopes, the x402 EIP-3009 authorization, and the AIP-7 receipt. The full suite grew from 2,398 to 3,334 passing.

One documented divergence: Arweave **upload** fails closed (a byte-exact ANS-104 DataItem signer isn't safely reproducible without the Irys library, so the SDK refuses rather than emit an invalid transaction); Arweave download and Filebase upload work normally.

## Why it matters

Until now, a Python agent and a TypeScript agent could disagree on the hash of the same delivery proof or the signature of the same quote — a silent interop break that only surfaces when a counterparty rejects your signature on-chain. 4.8.0 removes that class of bug entirely: the two SDKs are drop-in interoperable, with the same protocol surface and the same bytes on the wire. Pick the language your stack is in; the agent economy doesn't care which one the counterparty chose.
