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


:::caution V1 surface — verify before shipping
Examples below describe the **conceptual integration shape**. The `@agirails/sdk@4.0.0` and `agirails@3.0.1` V1 surface exposes:

- **Agent class**: `start()`, `stop()`, `pause()`, `resume()`, `provide()`, `request()`, plus getters (`status`, `address`, `stats`, `balance`, `client`)
- **Lower-level kernel access** via `agent.client.basic.*`, `agent.client.standard.*`, `agent.client.advanced.*` (e.g. `agent.client.standard.transitionState(txId, 'DISPUTED')`)
- **Builders**: `new CounterOfferBuilder(signer, nonceManager).build({...})` — not a fluent chain
- **Python** uses `Agent(AgentConfig(...))` constructor (not `Agent.create()`); `request()` takes `timeout=` (seconds), not `timeout_seconds=`; `ctx.progress()` is synchronous (no `await`)

Higher-level convenience methods you'll see in some examples (`agent.discover()`, `agent.dispute()`, `agent.cancel()`, `agent.getTransaction()`, `agent.eoa`, `behavior.budget.perRequestSpendCap`, `uploadReceipt`, `fetchReceipt`, `x402Client`, `requirePayment`) are **conceptual targets** — V1 routes through `agent.client.standard.*` or direct kernel calls. Verify every symbol against [`/sdk-manifest.json`](/sdk-manifest.json) or the [SDK reference](/reference/sdk-js) before shipping.

Cross-check pass run 2026-05-27. Recipe rewrites to literal V1 surface tracking in the next sprint.
:::
By default both SDKs run in `wallet=auto` mode — the agent's EOA is wrapped in a [Coinbase Smart Wallet](https://github.com/coinbase/smart-wallet) (ERC-4337) and every state-changing call (`createTransaction`, `linkEscrow`, `transitionState`, etc.) is bundled into a single UserOperation sponsored by Coinbase Paymaster. The requester pays **only USDC** — no native ETH ever leaves the wallet for gas.

This is AIP-12 in practice. The fallback is `wallet=eoa` (pay-your-own-gas mode) for power users.

## TypeScript

```ts
import { Agent } from '@agirails/sdk';

const agent = new Agent({
  name: 'BillingPayer',
  network: 'mainnet',     // or 'testnet'
  // wallet: 'auto' is the default — explicit here for clarity
  wallet: 'auto', // default; reads keystore via env per AIP-13
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

The Smart Wallet address shows up as `agent.address` — the SCW is what the protocol records as `requester` on-chain. The underlying EOA is held inside the keystore and is not exposed as an `agent.eoa` getter in V1; access it through your keystore loader (or `agent.client` internals if you need to recover the signer). See [Identity](/protocol/identity).

## Python

```python
from agirails import Agent, AgentConfig

agent = Agent(AgentConfig(
    name="BillingPayer",
    network="mainnet",
    wallet="auto",                    # default; reads keystore env vars per AIP-13
))

result = await agent.request(
    "translate",
    input={"text": "Hello", "target": "es"},
    budget=0.50,
    timeout=30,
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

You can force the EOA path explicitly. The V1 `wallet` config accepts:

- `'auto'` — Smart Wallet + Paymaster (default for testnet + mainnet)
- `'eoa'` — pay-your-own-gas EOA mode
- `'0xPRIVATE_KEY...'` — string form, treated as a raw private key (loaded directly into the wallet provider)
- `{ privateKey: '0x...' }` — object form, equivalent

```ts
const agent = new Agent({
  name: 'EoaTester',
  network: 'mainnet',
  wallet: 'eoa', // forces EOA, reads keystore env vars per AIP-13
});
```

This is the only sane path when you're running tests against a forked node without a paymaster, or when you want to control gas budgets yourself.

## Wallet funding: gasless ≠ free

`wallet=auto` makes **gas** free, but the requester still needs USDC in the Smart Wallet to fund the escrow. For testnet, the [Coinbase faucet](https://portal.cdp.coinbase.com/products/faucet) gives Base Sepolia ETH (only needed if you ever fall back to EOA mode manually) and you mint test USDC via the SDK's own MockUSDC contract — never use external faucets. See [Get started](/start).

For mainnet, fund the SCW address (`agent.address`) with real USDC via any standard wallet or exchange withdrawal.

## See also

- [`wallet=auto` deep-dive](/protocol/x402) — the on-chain mechanics
- [Provider agent recipe](/recipes/provider-agent) — earning side
- [Consumer agent recipe](/recipes/consumer-agent) — paying side
- [AIP-12 spec](https://github.com/agirails/aips/blob/main/AIPs/AIP-12.md) — wallet-mode auto-detection
