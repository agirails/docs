---
slug: sdk-v270-x402-fee-enforcement
title: "SDK v2.7.0 — x402 Platform Fee Enforcement"
authors: [sdk-team]
tags: [release, breaking-change, engineering]
---

`@agirails/sdk@2.7.0` enforces the platform fee on x402 payments fail-closed, prevents double-pay on fee-failure, and bumps the Sepolia `archiveTreasury` to the V2 contract. Breaking change for x402 buyers — fee handling is no longer optional.

<!-- truncate -->

## Install

```bash
npm install @agirails/sdk@2.7.0
```

## What changed

### Fee enforcement is fail-closed (breaking)

Previously, the x402 buyer flow would attempt the fee transfer alongside the principal but treat fee failure as recoverable — provider got paid, fee got dropped. Two-week of analysis showed providers occasionally seeing successful payment receipts but no corresponding fee on-chain.

2.7.0 reverses the policy: if the platform fee can't be transferred, the entire payment reverts. Provider doesn't get paid; buyer gets a clear error. The protocol is whole or nothing.

```typescript
// 2.7.0 — fee failure aborts the whole pay
try {
  await client.pay({ to: 'https://api.example.com/...', amount: '1.00' });
} catch (err) {
  // PROVIDER_PAID_FEE_FAILED: provider received funds but fee wasn't paid
  //   → already-paid path detection, prevents replay double-pay
  // FEE_TRANSFER_FAILED: fee TX itself reverted (insufficient allowance, etc.)
  //   → entire pay rolled back
}
```

The new `PROVIDER_PAID_FEE_FAILED` error code (commit `14a0a0e`) handles the rare race where the provider transfer succeeded but the fee transfer reverted — the SDK treats the tx as already-paid and refuses to retry the principal, preventing double-pay.

### Sepolia archive treasury moved to V2

The old `archiveTreasury` contract on Sepolia held escrow remainders from settled transactions. V2 fixes a corner case in the `releaseToBeneficiary` path that could leave dust unclaimable. SDK 2.7.0 ships the new V2 address; existing 2.5.x users on Sepolia should `npm install @agirails/sdk@latest`.

### Cumulative x402 hardening since 2.5.x

This release rolls up several months of incremental x402 work tracked through 2.5.6 → 2.5.7 → 2.5.8 → 2.7.0:

- `transferFn` hardening — wallet receipt success vs failure now distinguished (commit `33b3cd8`)
- x402 URL routing fixed when entry comes through `BasicAdapter.pay()` instead of direct `X402Adapter` (commit `acd8a45`)
- Wallet auto-detect + coverage realigned (commit `fb6837f`)

## Migration

Buyers using `client.pay()` against HTTPS endpoints (x402) need to ensure their wallet has approval headroom for `principal + fee`. The fee defaults to 1% with a $0.05 minimum on AGIRAILS-relayed payments. If you were relying on fee-failure being silent, your code now needs a try/catch — but you wanted the error anyway.

Direct `BasicAdapter` users (ACTP escrow against `0x...` addresses) are unaffected.

## Links

- [npm v2.7.0](https://www.npmjs.com/package/@agirails/sdk/v/2.7.0)
- [GitHub](https://github.com/agirails/sdk-js)
