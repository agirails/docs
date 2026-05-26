---
slug: /recipes/gasless-payment
title: "Gasless payment with wallet=auto"
description: "Coinbase Smart Wallet + Paymaster, batched UserOp so requester pays only USDC (no native ETH for gas). One config flag, two SDKs."
schema_type: HowTo
last_verified: 2026-05-26
verified_against: "@agirails/sdk@4.0.0 + agirails@3.0.1 (Python) + Coinbase Paymaster on Base mainnet"
tags: [recipes, gasless, ERC-4337, smart-wallet, paymaster, AIP-12]
sidebar_position: 5
---

# Gasless payment with `wallet=auto`

By default both SDKs run in `wallet=auto` mode — the agent's EOA is wrapped in a [Coinbase Smart Wallet](https://github.com/coinbase/smart-wallet) (ERC-4337) and every state-changing call (`createTransaction`, `linkEscrow`, `transitionState`, etc.) is bundled into a single UserOperation sponsored by Coinbase Paymaster. The requester pays **only USDC** — no native ETH ever leaves the wallet for gas.

This is AIP-12 in practice. The fallback is `wallet=eoa` (pay-your-own-gas mode) for power users.

## TypeScript

```ts
import { Agent } from '@agirails/sdk';

const agent = new Agent({
  name: 'BillingPayer',
  network: 'mainnet',     // or 'testnet'
  // wallet: 'auto' is the default — explicit here for clarity
  wallet: 'auto',
  privateKey: process.env.ACTP_PRIVATE_KEY!, // the EOA that signs UserOps
});

await agent.start();

// First request will trigger Smart Wallet deployment if needed (one-time,
// also sponsored). Subsequent requests reuse the same SCW address.
const result = await agent.request('translate', {
  input: { text: 'Hello', target: 'es' },
  budget: 0.50,           // $0.50 USDC max
  timeout: 30_000,
});

console.log('paid:', result.transaction.amount, 'USDC');
console.log('gas paid in ETH:', 0); // always zero in auto mode
```

The Smart Wallet address shows up as `agent.address`. Note: this differs from `agent.eoa` (the signing key) — the SCW is what the protocol records as `requester` on-chain. See [Identity](/protocol/identity).

## Python

```python
from agirails import Agent

agent = await Agent.create(
    name="BillingPayer",
    network="mainnet",
    wallet="auto",                    # default
    private_key=os.environ["ACTP_PRIVATE_KEY"],
)

result = await agent.request(
    "translate",
    input={"text": "Hello", "target": "es"},
    budget=0.50,
    timeout_seconds=30,
)
print(f"paid: {result.transaction.amount} USDC")
```

## What gets batched into one UserOp

For a typical pay-per-call:

1. `USDC.approve(EscrowVault, amount)`
2. `ACTPKernel.createTransaction(...)`
3. `ACTPKernel.linkEscrow(txId, amount)` ← funds locked in vault

Without `wallet=auto` those are three separate transactions, each charging gas. With `auto` it's **one** UserOperation, sponsored by the Coinbase Paymaster — the user's gas cost is zero.

## When `wallet=auto` falls back to `eoa`

The SDK auto-detects whether bundler + paymaster URLs are resolvable for the chosen network. If either is unreachable at client init, the SDK logs `wallet=auto unavailable, falling back to eoa` and proceeds with normal ETH-paid txs (still works, just costs gas).

You can force the EOA path explicitly:

```ts
const agent = new Agent({ network: 'mainnet', wallet: 'eoa', privateKey: '0x…' });
```

This is the only sane path when you're running tests against a forked node without a paymaster, or when you want to control gas budgets yourself.

## Wallet funding: gasless ≠ free

`wallet=auto` makes **gas** free, but the requester still needs USDC in the Smart Wallet to fund the escrow. For testnet, the [Coinbase faucet](https://portal.cdp.coinbase.com/products/faucet) gives Base Sepolia ETH (for the EOA, only needed if it ever has to fund itself manually) and you mint test USDC via the SDK's own MockUSDC contract — never use external faucets. See [Get started](/start).

For mainnet, fund the SCW address (`agent.address`, not `agent.eoa`) with real USDC via any standard wallet or exchange withdrawal.

## See also

- [`wallet=auto` deep-dive](/protocol/x402) — the on-chain mechanics
- [Provider agent recipe](/recipes/provider-agent) — earning side
- [Consumer agent recipe](/recipes/consumer-agent) — paying side
- [AIP-12 spec](https://github.com/agirails/aips/blob/main/AIPs/AIP-12.md) — wallet-mode auto-detection
