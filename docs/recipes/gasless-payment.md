---
slug: /recipes/gasless-payment
title: "Gasless payment with wallet=auto"
description: "Coinbase Smart Wallet + dual-provider paymaster (Coinbase primary, Pimlico backup), batched UserOp so requester pays only USDC. One config flag, two SDKs, automatic failover."
schema_type: HowTo
last_verified: 2026-05-29
verified_against: "@agirails/sdk@4.0.0 + agirails@3.0.1 (Python) + Coinbase Paymaster (primary) + Pimlico Paymaster (backup) on Base mainnet"
tags: [recipes, gasless, ERC-4337, smart-wallet, paymaster, coinbase, pimlico, AIP-12]
sidebar_position: 5
---

import V1Caveat from '@site/docs/_partials/v1-caveat.mdx';

# Gasless payment with `wallet=auto`


<V1Caveat />
By default both SDKs run in `wallet=auto` mode: the agent's [EOA](/reference/glossary#eoa) is wrapped in a [Coinbase Smart Wallet](https://github.com/coinbase/smart-wallet) ([ERC-4337](/reference/glossary#erc-4337)) and every state-changing call (`createTransaction`, `linkEscrow`, `transitionState`, etc.) is bundled into a single UserOperation sponsored by a paymaster. The requester pays **only USDC**, with no native ETH ever leaving the wallet for gas.

The SDK is configured with **two independent paymaster providers**: Coinbase as primary and Pimlico as automatic backup. If the primary fails for any reason (rate limit, transient outage, policy decline), the SDK transparently retries against the backup before surfacing an error to your code. See [When gasless fails](#when-gasless-fails) for the failure path.

This is AIP-12 in practice. The fallback below the paymaster layer is `wallet=eoa` (pay-your-own-gas mode) for power users or when both providers are unreachable.


## TypeScript

```ts
import { Agent } from '@agirails/sdk';

const agent = new Agent({
  name: 'BillingPayer',
  network: 'mainnet',     // or 'testnet'
  // wallet: 'auto' is the default (explicit here for clarity)
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

The Smart Wallet address shows up as `agent.address`; the SCW is what the protocol records as `requester` on-chain. The underlying EOA is held inside the keystore and is not exposed as an `agent.eoa` getter in V1; access it through your keystore loader (or `agent.client` internals if you need to recover the signer). See [Identity](/protocol/identity).

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

Without `wallet=auto` those are three separate transactions, each charging gas. With `auto` it's **one** UserOperation, sponsored by whichever paymaster (Coinbase primary, Pimlico backup) responds successfully: the user's gas cost is zero either way.

## Dual-provider paymaster configuration

The SDK reads paymaster endpoints from environment variables at client init:

| Provider | Env vars | Role |
|---|---|---|
| Coinbase | `CDP_API_KEY` (auto-resolves URLs) or `CDP_PAYMASTER_URL` + `CDP_BUNDLER_URL` | Primary |
| Pimlico | `PIMLICO_API_KEY` (auto-resolves URLs) or `PIMLICO_PAYMASTER_URL` + `PIMLICO_BUNDLER_URL` | Backup |

If only one is configured, it becomes the sole provider (no failover). If both are configured, the SDK uses Coinbase as primary and falls back to Pimlico on primary failure. If neither is configured and the chain is testnet/mainnet, `wallet=auto` cannot initialize and the SDK throws with an explicit message listing the configuration options. See [`PaymasterClient.callWithFallback`](https://github.com/agirails/sdk-js/blob/main/src/wallet/aa/PaymasterClient.ts) for the fallback implementation.

The two providers are independent companies in different jurisdictions with different infrastructure and policy surfaces. The redundancy is not for branding; it protects gasless availability against single-provider outages or policy declines.

## When gasless fails

Three concrete failure modes, in order of likelihood:

1. **Primary paymaster transient error** (most common). Coinbase paymaster returns an error (rate limit, momentary unavailability). The SDK logs `Primary paymaster failed, trying backup` and retries against Pimlico. Your code sees no error.

2. **Both paymasters down or both decline** (rare, but the load-bearing failure to design for). The SDK throws `Gas sponsorship temporarily unavailable: both Coinbase and Pimlico paymasters failed`. Your code catches this and decides: retry later, surface to the user, or fall through to `wallet=eoa` for this call.

3. **Neither provider configured at init**. The SDK throws at client construction with a clear message: configure `CDP_API_KEY` or `PIMLICO_API_KEY`, or set explicit endpoints, or use `wallet=eoa`.

Joint decline (mode 2) is the case worth understanding. Coinbase paymaster operates under Coinbase Inc. policy (KYC posture, sanctions list, regulatory regime); Pimlico paymaster operates under different company policy. Coordinated decline requires either both providers to independently reach the same policy stance or a regulatory order that captures both. Less likely than single-provider decline, but the protocol does not depend on either provider to keep functioning: when both fail, the agent can run `wallet=eoa` and pay its own gas in ETH. No funds are at risk; the failure mode is "gasless UX degraded to gas-paying UX", not "agent stuck".

## Forcing `wallet=eoa` explicitly

The V1 `wallet` config accepts:

- `'auto'`: Smart Wallet + dual-paymaster (default for testnet + mainnet, requires CDP_API_KEY or PIMLICO_API_KEY)
- `'eoa'`: pay-your-own-gas EOA mode (no paymaster dependency, requires ETH for gas)
- `'0xPRIVATE_KEY...'`: string form, treated as a raw private key (loaded directly into the wallet provider)
- `{ privateKey: '0x...' }`: object form, equivalent

```ts
const agent = new Agent({
  name: 'EoaTester',
  network: 'mainnet',
  wallet: 'eoa', // forces EOA, reads keystore env vars per AIP-13
});
```

Use this when:
- You're running tests against a forked node without a paymaster.
- You want to control gas budgets yourself rather than rely on dual-provider availability.
- You explicitly do not want third-party paymaster dependency in your trust model (this is a stricter permissionless posture; gasless trades that for UX).
- Both paymasters declined a specific call and you want a clean fallback path for the next attempt.

## Wallet funding: gasless ≠ free

`wallet=auto` makes **gas** free, but the requester still needs USDC in the Smart Wallet to fund the escrow. For testnet, the [Coinbase faucet](https://portal.cdp.coinbase.com/products/faucet) gives Base Sepolia ETH (only needed if you ever fall back to EOA mode manually) and you mint test USDC via the SDK's own MockUSDC contract. Never use external faucets. See [Get started](/start).

For mainnet, fund the SCW address (`agent.address`) with real USDC via any standard wallet or exchange withdrawal.

## See also

- [`wallet=auto` deep-dive](/protocol/x402): the on-chain mechanics
- [Provider agent recipe](/recipes/provider-agent): earning side
- [Consumer agent recipe](/recipes/consumer-agent): paying side
- [AIP-12 spec](https://github.com/agirails/aips/blob/main/AIP-12-DRAFT.md): wallet-mode auto-detection

---

<!-- VERIFIED FOOTER -->

**Verified against**: `@agirails/sdk@4.0.0` + `agirails@3.0.1` + `actp-kernel` V3 mainnet / V4 sepolia · **Last cross-check**: 2026-05-27 (Wave A.10–A.12 verifier sweep). For drift between this recipe and the live SDK, see [`/sdk-manifest.json`](/sdk-manifest.json), regenerated daily by the truth-ledger workflow. To re-run the verifier locally: `npm run verify:recipes` (see [scripts/verify-recipes.ts](https://github.com/agirails/docs/blob/main/scripts/verify-recipes.ts)).
