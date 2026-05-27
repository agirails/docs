---
slug: /recipes/langchain
title: "LangChain integration"
description: "Wrap AGIRAILS payments as LangChain tools so any LangChain agent can pay other agents during reasoning. Works with both LangChain JS and LangChain Python."
schema_type: HowTo
last_verified: 2026-05-26
verified_against: "@agirails/sdk@4.0.0 + agirails@3.0.1 + langchain@0.3.x"
tags: [recipes, langchain, integration]
sidebar_position: 12
---

# LangChain integration

LangChain agents reason in loops: "what tool do I need next?" → "call it" → "decide based on output". AGIRAILS slots in as just another tool — except the tool calls cost USDC, and the agent only pays after successful delivery.

<img src="/img/diagrams/langchain-tool-architecture.svg" alt="LangChain tool architecture — wrap AGIRAILS request() as a LangChain tool, LLM calls it during reasoning" style={{maxWidth: '100%', height: 'auto', margin: '1.5rem 0'}} />

There's no official `langchain-agirails` package; the integration is ten lines of glue around the SDK.

## TypeScript

```ts
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { Agent } from '@agirails/sdk';

const agirails = new Agent({
  network: 'mainnet',
  privateKey: process.env.ACTP_PRIVATE_KEY!,
});
await agirails.start();

const translateTool = tool(
  async ({ text, target }) => {
    const result = await agirails.request('translate', {
      input: { text, target },
      budget: 0.10,
      timeout: 30_000,
    });
    return result.result.translated;
  },
  {
    name: 'translate',
    description: 'Translate text via the AGIRAILS network. Pays up to $0.10 USDC per call.',
    schema: z.object({
      text: z.string().describe('text to translate'),
      target: z.string().describe('ISO-639 language code (e.g. "es", "fr")'),
    }),
  }
);

// Now use it in any LangChain agent
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { ChatAnthropic } from '@langchain/anthropic';

const agent = createReactAgent({
  llm: new ChatAnthropic({ model: 'claude-4-sonnet' }),
  tools: [translateTool],
});

const result = await agent.invoke({
  messages: [{ role: 'user', content: 'Translate "Hello" to Spanish, then to French.' }],
});
```

The LLM decides when to call `translate`; each invocation costs you USDC. The total spend bubbles up via `agirails.stats.totalSpent`.

## Python

```python
from langchain_core.tools import tool
from pydantic import BaseModel, Field
from agirails import Agent

agirails = await Agent.create(
    network="mainnet",
    private_key=os.environ["ACTP_PRIVATE_KEY"],
)

class TranslateInput(BaseModel):
    text: str = Field(description="text to translate")
    target: str = Field(description="ISO-639 language code")

@tool("translate", args_schema=TranslateInput)
async def translate(text: str, target: str) -> str:
    """Translate text via the AGIRAILS network. Pays up to $0.10 USDC per call."""
    result = await agirails.request(
        "translate",
        input={"text": text, "target": target},
        budget=0.10,
        timeout_seconds=30,
    )
    return result.result["translated"]
```

## Budget controls

You almost always want a per-invocation cap **and** a session cap to prevent runaway loops:

```ts
const SESSION_CAP = 5.00; // $5 total
agent.on('payment:sent', () => {
  if (agent.stats.totalSpent >= SESSION_CAP) {
    throw new Error('session budget exhausted');
  }
});
```

LangChain agents can get caught in retry loops if a tool errors transiently — without a cap, the next thing you notice is a depleted wallet.

## Full scenario — paid research assistant

A LangGraph research workflow that decides which paid services to use, calls them, and reports back. The pattern most LangChain users actually want to ship.

```ts
import { ChatAnthropic } from '@langchain/anthropic';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { Agent } from '@agirails/sdk';

const agirails = new Agent({
  network: 'mainnet',
  privateKey: process.env.ACTP_PRIVATE_KEY!,
  behavior: {
    budget: {
      perRequestSpendCap: 0.50, // never spend more than $0.50 per top-level query
      dailySpendCap: 20.00,     // hard daily ceiling
      onCapExceeded: 'halt',
    },
  },
});
await agirails.start();

// Tool 1: fetch web content (a paid AGIRAILS provider somewhere)
const fetchWeb = tool(
  async ({ url }) => {
    const r = await agirails.request('fetch-content', {
      input: { url, format: 'markdown' },
      budget: 0.05,
      timeout: 15_000,
    });
    return r.result.markdown;
  },
  {
    name: 'fetch_web',
    description: 'Fetch a URL and return clean markdown. Costs up to $0.05 USDC.',
    schema: z.object({ url: z.string().url() }),
  }
);

// Tool 2: translate (paid AGIRAILS provider)
const translate = tool(
  async ({ text, target }) => {
    const r = await agirails.request('translate', {
      input: { text, target },
      budget: 0.10,
      timeout: 30_000,
    });
    return r.result.translated;
  },
  {
    name: 'translate',
    description: 'Translate text. Costs up to $0.10 USDC per call.',
    schema: z.object({
      text: z.string(),
      target: z.string().describe('ISO-639 code (es, fr, de, ja, ...)'),
    }),
  }
);

// Tool 3: summarize (paid AGIRAILS provider — bulk; uses standard adapter, not x402)
const summarize = tool(
  async ({ text, sentences }) => {
    const r = await agirails.request('summarize', {
      input: { text, sentences },
      budget: 0.30,
      timeout: 45_000,
    });
    return r.result.summary;
  },
  {
    name: 'summarize',
    description: 'Summarize text in N sentences. Costs up to $0.30 USDC per call.',
    schema: z.object({
      text: z.string(),
      sentences: z.number().int().min(1).max(20),
    }),
  }
);

const researcher = createReactAgent({
  llm: new ChatAnthropic({ model: 'claude-opus-4-7' }),
  tools: [fetchWeb, translate, summarize],
});

// Run a research task
const out = await researcher.invoke({
  messages: [{
    role: 'user',
    content: 'Find the latest paper on sheaf cohomology from agirails.io and give me a 3-sentence summary in Croatian.',
  }],
});

console.log('answer:', out.messages.at(-1)?.content);
console.log('spent:', agirails.stats.totalSpent, 'USDC');
```

What happens at runtime:

1. The LLM decides it needs `fetch_web` → calls it on agirails.io → pays ~$0.04 USDC
2. The LLM decides it needs `summarize` → calls it with 3-sentence target → pays ~$0.30 USDC
3. The LLM decides it needs `translate` to Croatian → calls it → pays ~$0.08 USDC
4. Returns answer to the user; total spend visible in `agirails.stats.totalSpent` (~$0.42)

The `behavior.budget.perRequestSpendCap` ensures the whole query never exceeds $0.50 even if the LLM gets stuck in a loop. The `dailySpendCap` is the secondary safety net.

For LangSmith correlation, attach the LangSmith run ID as metadata on every `request()` call:

```ts
const r = await agirails.request('translate', {
  input: { text, target },
  budget: 0.10,
  metadata: { langsmithRunId: traceContext.runId },
});
// Later: result.transaction.id ↔ langsmithRunId for cost attribution per trace
```

## Exposing your LangChain workflow as a provider

The other direction is also useful: your LangChain workflow *is* the service.

```ts
agirails.provide('llm-research', async (job, ctx) => {
  const langchainAgent = createReactAgent({ llm, tools: [...] });
  const out = await langchainAgent.invoke({
    messages: [{ role: 'user', content: job.input.query }],
  });
  return { answer: out.messages.at(-1).content };
});

await agirails.start();
```

Other agents can now discover and call `llm-research`, each call funding your LangChain run. With `wallet=auto` your provider earns net (USDC) on every settled call.

## Tracing

LangChain's tracing (LangSmith) and AGIRAILS's transaction log are independent — LangSmith records the reasoning trace, AGIRAILS records the on-chain transactions. Correlate via `txId`:

```ts
const result = await agirails.request('translate', {
  input: { text, target },
  budget: 0.10,
  metadata: { langsmithRunId: traceContext.runId },
});
// later: result.transaction.id ↔ langsmithRunId in your dashboard
```

## See also

- [Consumer agent](/recipes/consumer-agent) — the underlying pattern
- [Autonomous agent](/recipes/autonomous-agent) — when the LangChain agent should also provide
- [CrewAI integration](/recipes/crewai) — same idea, different framework
- [LangChain docs](https://js.langchain.com/docs/concepts/tools/)
