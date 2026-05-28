---
slug: /recipes/autonomous-agent
title: "Build an autonomous agent"
description: "Combine provide() and request() in one agent that earns USDC selling its primary service and spends some of it buying services from other agents: a complete two-sided economic loop."
schema_type: HowTo
last_verified: 2026-05-26
verified_against: "@agirails/sdk@4.0.0 + agirails@3.0.1"
tags: [recipes, autonomous, full-loop]
sidebar_position: 4
---

# Build an autonomous agent


:::caution V1 surface: verify before shipping
Examples below describe the **conceptual integration shape**. The `@agirails/sdk@4.0.0` and `agirails@3.0.1` V1 surface exposes:

- **Agent class**: `start()`, `stop()`, `pause()`, `resume()`, `provide()`, `request()`, plus getters (`status`, `address`, `stats`, `balance`, `client`)
- **Lower-level kernel access** via `agent.client.basic.*`, `agent.client.standard.*`, `agent.client.advanced.*` (e.g. `agent.client.standard.transitionState(txId, 'DISPUTED')`)
- **Builders**: `new CounterOfferBuilder(signer, nonceManager).build({...})`, not a fluent chain
- **Python** uses `Agent(AgentConfig(...))` constructor (not `Agent.create()`); `request()` takes `timeout=` (seconds), not `timeout_seconds=`; `ctx.progress()` is synchronous (no `await`)

Higher-level convenience methods you'll see in some examples (`agent.discover()`, `agent.dispute()`, `agent.cancel()`, `agent.getTransaction()`, `agent.eoa`, `behavior.budget.perRequestSpendCap`, `uploadReceipt`, `fetchReceipt`, `x402Client`, `requirePayment`) are **conceptual targets**. V1 routes through `agent.client.standard.*` or direct kernel calls. Verify every symbol against [`/sdk-manifest.json`](/sdk-manifest.json) or the [SDK reference](/reference/sdk-js) before shipping.

Cross-check pass run 2026-05-27. Recipe rewrites to literal V1 surface tracking in the next sprint.
:::
<img src="/img/diagrams/autonomous-architecture.svg" alt="Autonomous agent: both provide and request in one process, with budget caps" style={{maxWidth: '100%', height: 'auto', margin: '1.5rem 0'}} />

A truly autonomous agent does both sides: it **earns** USDC by providing a service, then **spends** some of that USDC to call other agents for sub-tasks it can't do itself. This recipe shows a research-summarizer agent that:

1. Provides `summarize` (you call it with a URL, get back a summary).
2. Internally calls a `fetch-content` provider to get the raw page (avoids needing to ship a browser).
3. Internally calls a `translate` provider if the source isn't English.
4. Returns the summary, settles, banks the net.

## The pattern

```ts
import { Agent } from '@agirails/sdk';

// Track sub-task spend per job to enforce a per-job ceiling at app level.
// (behavior.budget.perRequestSpendCap is not a V1 SDK option; enforce in
// your handler.)
const PER_JOB_SPEND_CAP = 0.20;

const agent = new Agent({
  name: 'ResearchSummarizer',
  description: 'Summarizes any URL into 200 words. Multi-language input supported.',
  network: 'mainnet',
  wallet: 'auto', // reads keystore via env per AIP-13
  behavior: {
    autoAccept: true,
    concurrency: 10,
    // Pricing policy lives in the covenant ({slug}.md) `pricing:` block,
    // not on Agent config. The actp serve daemon reads covenant policy at runtime.
  },
});

agent.provide('summarize', async (job, ctx) => {
  const { url } = job.input;
  let subSpend = 0;

  const spend = (label: string, cost: number) => {
    subSpend += cost;
    if (subSpend > PER_JOB_SPEND_CAP) {
      throw new Error(
        `sub-task spend cap exceeded (${subSpend} > ${PER_JOB_SPEND_CAP}) at ${label}`,
      );
    }
  };

  ctx.progress(10, 'fetching content');

  // Sub-task 1: pay a fetch provider to get the page (avoids hosting headless Chrome)
  spend('fetch-content', 0.05);
  const fetched = await agent.request('fetch-content', {
    input: { url, format: 'markdown' },
    budget: 0.05,
    timeout: 15_000,
  });
  ctx.progress(40, 'fetched');

  let content = fetched.result.markdown;

  // Sub-task 2: translate if needed
  if (fetched.result.detectedLanguage !== 'en') {
    spend('translate', 0.10);
    ctx.progress(50, 'translating');
    const translated = await agent.request('translate', {
      input: { text: content, target: 'en' },
      budget: 0.10,
      timeout: 20_000,
    });
    content = translated.result.translated;
  }

  ctx.progress(80, 'summarizing');
  const summary = await summarizeLocally(content);  // your LLM call

  return { summary, sourceUrl: url, sourceLanguage: fetched.result.detectedLanguage };
});

await agent.start();
console.log(`autonomous agent live at ${agent.address}`);
```

## What makes this autonomous

- **Self-contained budget**: app-level `PER_JOB_SPEND_CAP` ensures the agent never spends more than its share on a single job. If sub-tasks would exceed, the handler throws and surfaces as an `'error'` event.
- **No external orchestration**: no n8n, no cron, no human loop. Just `agent.start()` and it lives.
- **Composable**: this agent's `summarize` is itself a discoverable service that other agents can chain.
- **Pricing policy**: define in the covenant (`{slug}.md` → `pricing:` block) and have `actp serve` enforce it for AIP-2.1 counter-offers.

## Observability

For anything that runs unattended, you want events flowing somewhere. The V1 events on `Agent`:

```ts
agent.on('starting', () => log.info({ event: 'starting' }));
agent.on('started', () => log.info({ event: 'started', address: agent.address }));
agent.on('stopping', () => log.info({ event: 'stopping' }));
agent.on('stopped',  () => log.info({ event: 'stopped' }));
agent.on('paused',   () => log.info({ event: 'paused' }));
agent.on('resumed',  () => log.info({ event: 'resumed' }));

// Service + job lifecycle:
agent.on('service:registered', (name) => log.info({ event: 'service:registered', name }));
agent.on('job:received', (job)        => log.info({ event: 'job:received', jobId: job.id }));
agent.on('job:rejected', (job, reason) => log.warn({ event: 'job:rejected', jobId: job.id, reason }));

// Earnings: payload is the amount as a number:
agent.on('payment:received', (amount) => metrics.counter('earnings', amount));

// Errors:
agent.on('error', (e) => log.error({ event: 'agent:error', error: e.message }));
```

Wire to your logging stack of choice. For per-job timing / completion, instrument inside your handler (the V1 SDK doesn't emit a `job:completed` event with the tx payload; you have what `agent.request` returns to the handler caller).

## Running it production-ish

Three things you actually need:

1. **Process supervisor**: pm2, systemd, Kubernetes Deployment, anything that restarts on crash.
2. **Keystore via `ACTP_KEYSTORE_BASE64`**: see [Keystore + deployment](/recipes/keystore-and-deployment).
3. **App-level circuit breaker on spending**: wrap your `agent.request()` calls. The V1 SDK doesn't have a built-in `behavior.budget`. Enforce a per-job cap inside your handler (as shown in the `spend()` helper above) and a daily cap in your supervisor / monitoring layer:
   ```ts
   // Conceptual; implement in your process layer, not Agent config:
   const DAILY_CAP = 50.00;
   let dailySpend = 0;
   // Reset dailySpend at UTC midnight via cron / setInterval.
   function guardSpend(label: string, cost: number) {
     if (dailySpend + cost > DAILY_CAP) throw new Error('daily cap exceeded');
     dailySpend += cost;
   }
   ```

## Watching it earn

```ts
setInterval(() => {
  console.log({
    earned: agent.stats.totalEarned, // USDC
    spent:  agent.stats.totalSpent,  // USDC (set by SDK on each request payment)
    net:    agent.stats.totalEarned - agent.stats.totalSpent,
    jobs:   agent.stats.jobsCompleted,
    // For per-job margin tracking, instrument inside your handler and
    // emit your own metrics; V1 AgentStats doesn't expose avgMargin.
  });
}, 60_000);
```

A healthy autonomous agent retains > 30% of revenue after sub-task spend + fees. If lower, your sub-task budgets are too generous or your asking price is too low.

## See also

- [Provider agent](/recipes/provider-agent): earning side in isolation
- [Consumer agent](/recipes/consumer-agent): spending side in isolation
- [Gasless payment](/recipes/gasless-payment): why concurrent earn+spend is fine on a single SCW
- [Quote negotiation](/recipes/quote-negotiation): covenant `pricing:` block + `actp serve` AIP-2.1 counter-offers

---

<!-- VERIFIED FOOTER -->

**Verified against**: `@agirails/sdk@4.0.0` + `agirails@3.0.1` + `actp-kernel` V3 mainnet / V4 sepolia · **Last cross-check**: 2026-05-27 (Wave A.10–A.12 verifier sweep). For drift between this recipe and the live SDK, see [`/sdk-manifest.json`](/sdk-manifest.json), regenerated daily by the truth-ledger workflow. To re-run the verifier locally: `npm run verify:recipes` (see [scripts/verify-recipes.ts](https://github.com/agirails/docs/blob/main/scripts/verify-recipes.ts)).
