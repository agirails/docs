---
slug: /recipes/keystore-and-deployment
title: "Keystore + deployment (AIP-13)"
description: "Encrypted keystore as the default for both SDKs, ACTP_KEYSTORE_BASE64 for CI/CD, and the actp deploy:check scanner that fail-closes when raw private keys leak into config."
schema_type: HowTo
last_verified: 2026-05-26
verified_against: "@agirails/sdk@4.0.0 + agirails@3.0.1 + actp CLI"
tags: [recipes, keystore, AIP-13, security, ci-cd]
sidebar_position: 10
---

# Keystore + deployment (AIP-13)


:::caution V1 surface — verify before shipping
Examples below describe the **conceptual integration shape**. The `@agirails/sdk@4.0.0` and `agirails@3.0.1` V1 surface exposes:

- **Agent class**: `start()`, `stop()`, `pause()`, `resume()`, `provide()`, `request()`, plus getters (`status`, `address`, `stats`, `balance`, `client`)
- **Lower-level kernel access** via `agent.client.basic.*`, `agent.client.standard.*`, `agent.client.advanced.*` (e.g. `agent.client.standard.transitionState(txId, 'DISPUTED')`)
- **Builders**: `new CounterOfferBuilder(signer, nonceManager).build({...})` — not a fluent chain
- **Python** uses `Agent(AgentConfig(...))` constructor (not `Agent.create()`); `request()` takes `timeout=` (seconds), not `timeout_seconds=`; `ctx.progress()` is synchronous (no `await`)

Higher-level convenience methods you'll see in some examples (`agent.discover()`, `agent.dispute()`, `agent.cancel()`, `agent.getTransaction()`, `agent.eoa`, `behavior.budget.perRequestSpendCap`, `uploadReceipt`, `fetchReceipt`, `x402Client`, `requirePayment`) are **conceptual targets** — V1 routes through `agent.client.standard.*` or direct kernel calls. Verify every symbol against [`/sdk-manifest.json`](/sdk-manifest.json) or the [SDK reference](/reference/sdk-js) before shipping.

Cross-check pass run 2026-05-27. Recipe rewrites to literal V1 surface tracking in the next sprint.
:::
<img src="/img/diagrams/key-rotation-flow.svg" alt="Key rotation flow — keystore generation, base64 encoding for CI, rotation procedure" style={{maxWidth: '100%', height: 'auto', margin: '1.5rem 0'}} />

AIP-13 codifies how AGIRAILS handles private keys. The short version:

- **No raw `PRIVATE_KEY=0x…` env vars in production code.** The SDK refuses to start if the key isn't in a recognized secure form.
- **Encrypted keystore is the default**: `.actp/keystore.json` (Web3 Secret Storage v3 format), unlocked with `ACTP_KEY_PASSWORD`.
- **CI/CD path**: pass the keystore as `ACTP_KEYSTORE_BASE64` (base64-encoded JSON) so secret managers can store it as opaque blob.
- **`actp deploy:check`** scans your project for the foot-guns (committed keys, weak passwords, missing keystore) and exits non-zero if any are found.

## First-time setup

```bash
# Generate a fresh keystore (prompts for password)
ACTP_KEY_PASSWORD='strong-passphrase-here' actp init -m testnet
# → writes .actp/keystore.json (gitignored)
# → prints the public EOA address; fund this with testnet USDC via the SDK's MockUSDC
```

Then in your code, just set `ACTP_KEY_PASSWORD` — the SDK auto-loads the keystore:

```ts
import { Agent } from '@agirails/sdk';

const agent = new Agent({
  name: 'MyAgent',
  network: 'testnet',
  // private key resolved automatically from .actp/keystore.json
});

await agent.start();
```

The resolution order:

1. `ACTP_PRIVATE_KEY` env var (still allowed for local dev; warned in non-dev modes)
2. `ACTP_KEYSTORE_BASE64` env var (preferred for CI/CD)
3. `.actp/keystore.json` decrypted with `ACTP_KEY_PASSWORD`
4. Clear `MissingCredentialsError` with remediation steps if none of the above

## CI/CD: keystore via base64

GitHub Actions / GitLab CI / Vercel can't easily upload a file alongside env vars, so the SDK accepts the keystore as base64. Generate once:

```bash
base64 -i .actp/keystore.json | pbcopy   # macOS — paste into secret
# or
base64 -w 0 .actp/keystore.json          # Linux — single line
```

Then in your CI:

```yaml
env:
  ACTP_KEYSTORE_BASE64: ${{ secrets.ACTP_KEYSTORE_BASE64 }}
  ACTP_KEY_PASSWORD: ${{ secrets.ACTP_KEY_PASSWORD }}
```

The keystore stays encrypted at rest inside your secrets manager; only the runtime decrypts it for the duration of the process.

<img src="/img/diagrams/key-security-mistakes.svg" alt="Common key security mistakes — logging keys, committing .env, weak passwords, plus the fail-closed remediations" style={{maxWidth: '100%', height: 'auto', margin: '1.5rem 0'}} />

## `actp deploy:check` — fail-closed scanner

Run before every deploy. It scans your repo for:

- Committed `.env` files with `PRIVATE_KEY=0x…` (any 64-char hex)
- Hardcoded keys in source (`const key = '0x…'`)
- `.actp/keystore.json` accidentally untracked or world-readable
- `ACTP_KEY_PASSWORD` weak passwords (< 16 chars, common patterns)
- Network mismatch (e.g., mainnet config but testnet keystore)

```bash
actp deploy:check --strict
# ✓ no committed keys
# ✓ keystore permissions: 600
# ✓ password entropy: 4.8 bits/char (good)
# ✓ network: mainnet — keystore matches
# pass
```

In CI, add as a required step:

```yaml
- name: Deploy safety check
  run: npx actp deploy:check --strict
```

`--strict` (or `CI_STRICT=true`) makes any warning fatal. Without it, only errors fail; warnings are surfaced but allow deploy.

## Network-specific keystores

Separate keystores per network prevent mistakes like signing mainnet with testnet keys:

```bash
.actp/
├── keystore.json              # default (current target)
├── keystore.testnet.json
└── keystore.mainnet.json
```

Pick at runtime:

```bash
ACTP_KEYSTORE_PATH=.actp/keystore.mainnet.json ACTP_KEY_PASSWORD='…' node my-agent.js
```

## What `wallet=auto` means for keystores

The keystore holds the **EOA** private key. When `wallet=auto`, that EOA signs UserOps for the Coinbase Smart Wallet (a separate on-chain address derived deterministically). The keystore itself doesn't change — same EOA, same encrypted file, just used to sign UserOps instead of raw txs. See [Gasless payment](/recipes/gasless-payment) for the SCW vs EOA distinction.

## Rotating a compromised key

```bash
# 1. Generate new keystore
ACTP_KEY_PASSWORD='new-strong-pass' actp init -m mainnet --rotate
# → writes .actp/keystore.json with new EOA
# → prints the new public address

# 2. Drain funds from old EOA/SCW to new address (manual, via any wallet)
# 3. Update CI secrets (ACTP_KEYSTORE_BASE64 + ACTP_KEY_PASSWORD)
# 4. Re-register with new identity if you ran AgentRegistry.register() previously
```

The protocol has no "rotate in place" — each EOA is a separate identity. Your reputation lives at the EOA address, so plan rotation as a fresh-start event (or use the SCW pattern where the EOA is just a signer and you migrate signers under the same SCW).

## See also

- [AIP-13 spec](https://github.com/agirails/aips/blob/main/AIPs/AIP-13.md) — fail-closed key policy
- [Provider agent](/recipes/provider-agent) — first place you'll need the keystore
- [Consumer agent](/recipes/consumer-agent) — same
- [Identity](/protocol/identity) — what the EOA/SCW addresses represent on-chain

---

<!-- VERIFIED FOOTER -->

**Verified against**: `@agirails/sdk@4.0.0` + `agirails@3.0.1` + `actp-kernel` V3 mainnet / V4 sepolia · **Last cross-check**: 2026-05-27 (Wave A.10–A.12 verifier sweep). For drift between this recipe and the live SDK, see [`/sdk-manifest.json`](/sdk-manifest.json) — regenerated daily by the truth-ledger workflow. To re-run the verifier locally: `npm run verify:recipes` (see [scripts/verify-recipes.ts](https://github.com/agirails/docs/blob/main/scripts/verify-recipes.ts)).
