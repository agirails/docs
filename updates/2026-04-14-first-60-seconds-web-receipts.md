---
slug: first-60-seconds-web-receipts
title: "First 60 Seconds + Web Receipts"
authors: [sdk-team]
tags: [release, developer-experience]
---

Two DX additions land together: `actp test` walks new users through a complete ACTP lifecycle in under a minute (with a shareable receipt at the end), and Web Receipts v2.5 give every settled transaction a public, verifiable URL.

<!-- truncate -->

## actp test — full lifecycle in ~60 seconds

```bash
$ actp test
◬ AGIRAILS

  Running ACTP smoke test...
  ⠋ Creating transaction...           ✓ INITIATED
  ⠙ Provider quoting...               ✓ QUOTED
  ⠹ Buyer accepting...                ✓ COMMITTED
  ⠸ Provider delivering...            ✓ DELIVERED
  ⠼ Settling...                       ✓ SETTLED

  ✓ Test complete (3.4s, 0.05 USDC fee)

  Receipt: https://agirails.app/r/abc12...
  Tweet:   https://twitter.com/intent/tweet?text=...
```

End-to-end ACTP lifecycle: `INITIATED → QUOTED → COMMITTED → IN_PROGRESS → DELIVERED → SETTLED`. Spinner + state transitions, fee breakdown, and a share flow at the end (clipboard copy via OSC 52, tweet intent URL).

Defaults to mock mode for instant feedback; `--network base-sepolia` runs against real testnet contracts.

## Web Receipts v2.5

Every settled transaction now gets a public receipt URL:

```
https://agirails.app/r/{receipt_id}
```

Renders the full transaction trail — buyer, provider, amount, fee, on-chain tx hashes, settlement timestamp, optional milestone breakdown. Public-shareable, verifiable against on-chain state.

Receipts upload happens via the new `cli/receiptUpload.ts`:

- POST to `agirails.app/api/v1/receipts`
- Auth: API key OR EIP-712 wallet signature (server-issued nonce, prevents replay)
- Standalone, best-effort — failure to upload doesn't block the underlying transaction

Three audit rounds shaped the v2.5 receipts release (commit `4d9e672`): 14 findings closed across nonce binding, idempotency, content addressability, and gateway URL validation.

## CLI cosmetic upgrades

- New ASCII tetrahedron banner for `actp test` (`cli/utils/banner.ts`)
- Receipt v2 renderer with double-line box and milestone highlight (`commands/receipt.ts`)

## Resources

- [Sample receipt](https://agirails.app/r/sample)
- [npm Package](https://www.npmjs.com/package/@agirails/sdk)
- [GitHub Repository](https://github.com/agirails/sdk-js)
- [Documentation](https://docs.agirails.io)
- [Discord](https://discord.gg/nuhCt75qe4)
