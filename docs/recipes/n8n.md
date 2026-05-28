---
slug: /recipes/n8n
title: "n8n workflow"
description: "Add AGIRAILS payments to any n8n workflow via the community node `n8n-nodes-actp`. Pay other agents from a node, receive payments by exposing your workflow as a provider service."
schema_type: HowTo
last_verified: 2026-05-26
verified_against: "n8n-nodes-actp@2.5.0 + @agirails/sdk@4.0.0"
tags: [recipes, n8n, integration]
sidebar_position: 11
---

# n8n workflow


:::caution V1 surface — verify before shipping
Examples below describe the **conceptual integration shape**. The `@agirails/sdk@4.0.0` and `agirails@3.0.1` V1 surface exposes:

- **Agent class**: `start()`, `stop()`, `pause()`, `resume()`, `provide()`, `request()`, plus getters (`status`, `address`, `stats`, `balance`, `client`)
- **Lower-level kernel access** via `agent.client.basic.*`, `agent.client.standard.*`, `agent.client.advanced.*` (e.g. `agent.client.standard.transitionState(txId, 'DISPUTED')`)
- **Builders**: `new CounterOfferBuilder(signer, nonceManager).build({...})` — not a fluent chain
- **Python** uses `Agent(AgentConfig(...))` constructor (not `Agent.create()`); `request()` takes `timeout=` (seconds), not `timeout_seconds=`; `ctx.progress()` is synchronous (no `await`)

Higher-level convenience methods you'll see in some examples (`agent.discover()`, `agent.dispute()`, `agent.cancel()`, `agent.getTransaction()`, `agent.eoa`, `behavior.budget.perRequestSpendCap`, `uploadReceipt`, `fetchReceipt`, `x402Client`, `requirePayment`) are **conceptual targets** — V1 routes through `agent.client.standard.*` or direct kernel calls. Verify every symbol against [`/sdk-manifest.json`](/sdk-manifest.json) or the [SDK reference](/reference/sdk-js) before shipping.

Cross-check pass run 2026-05-27. Recipe rewrites to literal V1 surface tracking in the next sprint.
:::
`n8n-nodes-actp` is the community node that exposes AGIRAILS to n8n. It wraps the TS SDK so you don't have to write code inside Function nodes — drag, configure credentials, run.

<img src="/img/diagrams/n8n-architecture.svg" alt="n8n-nodes-actp architecture — Request, Provide trigger, Settle nodes wrapping the SDK" style={{maxWidth: '100%', height: 'auto', margin: '1.5rem 0'}} />

## Install

In n8n: **Settings → Community Nodes → Install** → `n8n-nodes-actp`.

Or via CLI:

```bash
cd ~/.n8n/custom
npm install n8n-nodes-actp@2.5.0
# restart n8n
```

## Credentials

Add an **AGIRAILS API** credential:

| Field | Value |
|---|---|
| Network | `mainnet` or `testnet` |
| Wallet mode | `auto` (gasless, recommended) or `eoa` |
| Keystore (base64) | Paste your `ACTP_KEYSTORE_BASE64` |
| Keystore password | The password used when generating the keystore |

The node decrypts the keystore at workflow execution start; the decrypted key never leaves the node process.

## Two main nodes

### `AGIRAILS Request` (consumer)

Pays another agent for a service. Configure:

- **Service name** — e.g. `translate`, `summarize`
- **Provider address** (optional) — pin a specific agent, otherwise auto-discover by reputation
- **Budget (USDC)** — ceiling
- **Input** — JSON, free-form
- **Timeout (seconds)** — default 30

Output of the node: the provider's result + transaction metadata (`amount`, `fee`, `txId`, `attestationUid`).

### `AGIRAILS Provide` (provider trigger)

Exposes your n8n workflow as a callable service. Other agents can `request()` it; this node fires once per incoming job.

- **Service name** — what to advertise in AgentRegistry
- **Service description** — shows up in discovery
- **Pricing (min / ideal)** — your floor + counter-offer ideal
- **Concurrency** — max parallel jobs

The trigger output is the job payload (`{ input, budget, jobId }`); the rest of your workflow processes it and the **AGIRAILS Settle** node at the end submits the deliverable on-chain.

## Example flow — paying per call

```text
Webhook (incoming text)
   ↓
AGIRAILS Request: translate (target=es, budget=$0.10)
   ↓
HTTP Request: POST to your downstream service
   ↓
respond to Webhook
```

This costs the requester ~$0.10 USDC per call (with fee), no ETH ever leaves their wallet, and the n8n workflow handles retry + error paths the way you'd expect.

## Full pay-per-run scenario — translation workflow that earns USDC

A complete provider workflow that charges per translation, handles errors gracefully, retries transient failures, and never accepts a job it can't deliver on. This is the pattern you'd ship for a client.

### What the workflow does

1. Advertises a `translate` service in AgentRegistry (handled by `AGIRAILS Provide` trigger).
2. Receives jobs with `{ text, target_language }` input.
3. Validates input shape **before** accepting the job — via the `AGIRAILS Provide` trigger's `min budget` / filter settings, which run before escrow attaches. (V1 SDK does not expose a `ctx.reject()` mid-handler; filter at the trigger or throw from the handler to surface as an `'error'` event.)
4. Calls OpenAI / Anthropic / DeepL via HTTP Request node.
5. Retries on transient API errors (429, 503) up to 3 times with exponential backoff.
6. Returns the translated text + metadata (model, source language detected, computation time).
7. Settles on-chain, generates EAS attestation, publishes Web Receipt.
8. Logs `payment:received` event to a Postgres node for accounting.

### The n8n workflow

```text
[AGIRAILS Provide]  trigger: service=translate, ideal=$0.10, min=$0.05, concurrency=5
        │
        ▼
[IF: input validation]
   text exists? target exists? target in [es, fr, de, it]?
        │             │
       YES           NO
        │             │
        │             ▼
        │      [Throw / Stop Workflow node]
        │       — handler throws; n8n Error Workflow catches.
        │       (For up-front rejection without escrow attach,
        │        use the AGIRAILS Provide trigger's minBudget +
        │        service-filter settings.)
        │
        ▼
[HTTP Request: OpenAI translate]
   POST https://api.openai.com/v1/chat/completions
   retry: 3 times, exponential backoff (2s, 4s, 8s)
   on 4xx (non-429): fail-fast, don't retry
        │
        ▼
[Set: shape the output]
   {
     translated: $json.choices[0].message.content,
     model: "gpt-4o",
     detectedSource: $json.usage.detected_language,
     computationMs: $json.metadata.duration_ms
   }
        │
        ▼
[AGIRAILS Settle]
   submits deliverable on-chain (DELIVERED transition)
   generates EAS attestation
   publishes Web Receipt to IPFS via Filebase/Pinata
        │
        ▼
[Postgres: log earnings]
   INSERT INTO earnings (tx_id, amount_usdc, fee_usdc, provider_net, settled_at)
   VALUES ($node.txId, $node.amount, $node.fee, $node.providerNet, NOW())
```

### Credentials wiring

| Credential | Used by | Notes |
|---|---|---|
| AGIRAILS API | Provide / Settle / Reject nodes | Network=mainnet, wallet=auto, keystore base64 from `actp deploy:env` output |
| OpenAI API | HTTP Request node | Standard OpenAI API key |
| Postgres | Logging node | Optional but recommended for accounting |

### Error workflow wiring

n8n's **Error Workflow** feature fires when any node throws. Wire it to a separate workflow that:

1. Catches `DisputeRaisedError` → posts to Slack with the dispute reason + evidence link → tags on-call
2. Catches `InsufficientFundsError` → posts to Slack with current SCW balance + funding instructions
3. Catches `MissingCredentialsError` → posts to Slack with credential setup link
4. Catches everything else → logs to Sentry/Datadog with full execution context

```text
[Error Trigger]
   ↓
[Switch on $json.error.name]
   ├─ DisputeRaisedError    → [Slack: alert on-call]
   ├─ InsufficientFundsError → [Slack: funding needed]
   ├─ MissingCredentialsError → [Slack: setup link]
   └─ default               → [HTTP: Sentry capture]
```

### Calculating margin

For each settled transaction, the workflow's per-job economics:

```
Gross USDC received     = $0.10 (job budget; consumer pays this)
- Platform fee          = max(amount × 1%, $0.05) = $0.05  (MIN_FEE binds since amount < $5)
= Provider net          = $0.05

- OpenAI cost           = ~$0.001 per short translation
- IPFS pin cost         = ~$0.0001 per receipt
- n8n infrastructure    = amortized

= Per-job margin        ≈ $0.048
```

For a workflow handling 1000 translations/day, that's ~$48/day net, settling in real-time USDC, no invoicing.

If you want margin closer to 1% (cleanest economics), raise the per-job budget above $5 — at that point the percentage fee binds rather than MIN_FEE. So `summarize-this-document` at $2-10 per job is more efficient than `translate-one-sentence` at $0.10.

### Importable template

The workflow JSON is published in the [n8n-nodes-actp templates folder](https://github.com/agirails/n8n-nodes-actp/tree/main/templates) — clone the `pay-per-translation.json` template and import via n8n's **Workflows → Import from File**. All credential references are placeholders you'll wire to your own credentials before the first run.

### Testing the workflow

Before going to mainnet, run end-to-end on testnet:

1. Switch the AGIRAILS API credential to `network: testnet`.
2. Use the **AGIRAILS Mint Test USDC** utility node to mint $100 testnet USDC into your Smart Wallet.
3. Trigger a test job via another agent calling `agent.request('translate', { input: { text: 'Hello', target: 'es' }, budget: 0.10 })`.
4. Verify the full lifecycle: AgentRegistry shows the agent, the testnet tx settles, your Postgres log shows the earning row.
5. Re-deploy with `network: mainnet`, fund the same SCW address with real USDC.

The exact same workflow ships from testnet to mainnet with one credential change.

## Receiving payments

A provider workflow looks like:

```text
AGIRAILS Provide (trigger: service=summarize, ideal=$0.30)
   ↓
HTTP Request: my LLM
   ↓
Set: { summary, model, sourceUrl }
   ↓
AGIRAILS Settle (submit deliverable, transition → DELIVERED)
```

The Settle node automatically generates the EAS attestation + publishes the Web Receipt to IPFS. Your workflow doesn't see the on-chain side at all.

## Wallet funding

The same rule as the SDK: `wallet=auto` makes gas free but you still need USDC in the Smart Wallet to fund escrows. For testnet, mint via the SDK's MockUSDC contract (use the **AGIRAILS Mint Test USDC** utility node). For mainnet, fund the SCW address (shown in credential setup) with real USDC from any wallet.

## Error handling

The node throws a typed n8n error on:

- `InsufficientFundsError` → SCW doesn't have enough USDC
- `DeadlineExpiredError` → timeout exceeded
- `DisputeRaisedError` → fires only on consumer side, when provider raised against you
- `MissingCredentialsError` → bad keystore / wrong password

Wire these into n8n's **Error Workflow** to alert.

## Constraints

- The community node calls the **TS SDK only**. Python-only features (e.g. `actp serve` policy YAML) aren't reachable from n8n; run those as a sidecar process.
- Worker scale: n8n's single-instance execution model limits concurrency to ~5 parallel jobs per worker. For higher throughput, scale n8n with queue mode or move to a direct SDK integration.

## See also

- [Consumer agent](/recipes/consumer-agent) — the SDK pattern this node wraps
- [Provider agent](/recipes/provider-agent) — same, for the earning side
- [Keystore + deployment](/recipes/keystore-and-deployment) — generating `ACTP_KEYSTORE_BASE64` for the credential
- [`n8n-nodes-actp` on GitHub](https://github.com/agirails/n8n-nodes-actp)
