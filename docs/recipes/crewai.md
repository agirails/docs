---
slug: /recipes/crewai
title: "CrewAI integration"
description: "Add ACTP payments between CrewAI agents — turn the implicit internal call graph into explicit USDC-settled transactions, with attestations + receipts per inter-agent call."
schema_type: HowTo
last_verified: 2026-05-26
verified_against: "agirails@3.0.1 + crewai@0.130.x"
tags: [recipes, crewai, integration, multi-agent]
sidebar_position: 13
---

# CrewAI integration


:::caution V1 surface — verify before shipping
Examples below describe the **conceptual integration shape**. The `@agirails/sdk@4.0.0` and `agirails@3.0.1` V1 surface exposes:

- **Agent class**: `start()`, `stop()`, `pause()`, `resume()`, `provide()`, `request()`, plus getters (`status`, `address`, `stats`, `balance`, `client`)
- **Lower-level kernel access** via `agent.client.basic.*`, `agent.client.standard.*`, `agent.client.advanced.*` (e.g. `agent.client.standard.transitionState(txId, 'DISPUTED')`)
- **Builders**: `new CounterOfferBuilder(signer, nonceManager).build({...})` — not a fluent chain
- **Python** uses `Agent(AgentConfig(...))` constructor (not `Agent.create()`); `request()` takes `timeout=` (seconds), not `timeout_seconds=`; `ctx.progress()` is synchronous (no `await`)

Higher-level convenience methods you'll see in some examples (`agent.discover()`, `agent.dispute()`, `agent.cancel()`, `agent.getTransaction()`, `agent.eoa`, `behavior.budget.perRequestSpendCap`, `uploadReceipt`, `fetchReceipt`, `x402Client`, `requirePayment`) are **conceptual targets** — V1 routes through `agent.client.standard.*` or direct kernel calls. Verify every symbol against [`/sdk-manifest.json`](/sdk-manifest.json) or the [SDK reference](/reference/sdk-js) before shipping.

Cross-check pass run 2026-05-27. Recipe rewrites to literal V1 surface tracking in the next sprint.
:::
CrewAI lets you compose multiple LLM agents into a crew with hand-offs. By default, internal agent calls are free (same process, same wallet). With AGIRAILS, you can make any inter-agent call go through ACTP — useful when:

<img src="/img/diagrams/crewai-integration.svg" alt="CrewAI integration — paid tools between crew agents via AGIRAILS" style={{maxWidth: '100%', height: 'auto', margin: '1.5rem 0'}} />

- The agents belong to **different owners** sharing a workflow.
- You want per-call accountability (cost, attestation, audit trail).
- You're decomposing a crew into deployable microservices each charging for itself.

## Wrap a tool

CrewAI tools are just Python callables. Make one that calls AGIRAILS:

```python
from crewai_tools import BaseTool
from agirails import Agent

class AgirailsServiceTool(BaseTool):
    name: str = "agirails_call"
    description: str = "Call a remote AGIRAILS provider and pay in USDC."

    def __init__(self, agent: Agent, service: str, budget: float):
        super().__init__()
        self._agent = agent
        self._service = service
        self._budget = budget

    def _run(self, **kwargs) -> str:
        result = asyncio.run(self._agent.request(
            self._service,
            input=kwargs,
            budget=self._budget,
            timeout=30,
        ))
        return result.result
```

## Use it in a crew

```python
from crewai import Agent as CrewAgent, Task, Crew
from agirails import Agent as AgirailsAgent, AgentConfig

agirails = AgirailsAgent(AgentConfig(
    name="CrewWallet",
    network="mainnet",
    # Wallet/keystore via env vars per AIP-13.
))

translate_tool = AgirailsServiceTool(agirails, "translate", budget=0.10)
summarize_tool = AgirailsServiceTool(agirails, "summarize", budget=0.30)

researcher = CrewAgent(
    role="researcher",
    goal="answer user questions with research",
    tools=[translate_tool, summarize_tool],
    llm="claude-4-sonnet",
)

task = Task(
    description="Summarize the latest news on AI from a French source.",
    expected_output="3-sentence summary in English.",
    agent=researcher,
)

crew = Crew(agents=[researcher], tasks=[task])
result = crew.kickoff()
```

When the researcher decides it needs to translate French → English, it calls `translate` which costs $0.10 USDC. Summary call costs $0.30. Total visible in `agirails.stats.totalSpent`.

## Exposing a CrewAI workflow as a provider

The whole crew can be a single AGIRAILS service:

```python
@agirails.provide("research-summary")
async def research_summary(job, ctx):
    crew = build_crew(query=job.input["query"])  # constructs your CrewAI graph
    result = crew.kickoff()
    return {"answer": str(result), "model": "crew-v2"}

await agirails.start()
```

Now other agents discover and pay for `research-summary`. Each call funds one crew execution. The crew internally might **also** call paid sub-services — full economic chain.

## Full scenario — research crew with budgeted hand-offs

A four-agent crew where each agent owns its own AGIRAILS wallet, transacts with the others, and respects per-agent + per-crew budget caps. Production-shape, not toy.

```python
import asyncio
import os
from crewai import Agent as CrewAgent, Crew, Task
from crewai_tools import BaseTool
from agirails import Agent as AgirailsAgent

# Each crew agent owns a separate AGIRAILS wallet — different EOAs, separate budgets,
# separate reputations. This is the pattern when crew members may belong to different
# owners or need distinct accounting.

# Note: budget caps shown below are conceptual V2 patterns; the V1 AgentBehavior
# dataclass exposes only auto_accept, concurrency, timeout, retry. For V1, enforce
# spending caps in your own crew wrapper (see callback in AgirailsServiceTool below).

researcher_wallet = AgirailsAgent(AgentConfig(
    name="Researcher",
    network="mainnet",
    # Keystore via env: ACTP_KEYSTORE_BASE64 + ACTP_KEY_PASSWORD (per AIP-13).
    # Use distinct keystores per crew member to keep wallets separate.
))
analyst_wallet = AgirailsAgent(AgentConfig(
    name="Analyst",
    network="mainnet",
))
writer_wallet = AgirailsAgent(AgentConfig(
    name="Writer",
    network="mainnet",
))

class AgirailsServiceTool(BaseTool):
    name: str = "agirails_call"
    description: str = "Call a remote AGIRAILS provider and pay in USDC."

    def __init__(self, agent, service, budget, daily_cap=10.00):
        super().__init__()
        self._agent = agent
        self._service = service
        self._budget = budget
        self._daily_cap = daily_cap

    def _run(self, **kwargs):
        # V1 has no behavior.budget on Agent — enforce caps in the wrapper.
        # agent.stats.total_spent is the running total since agent.start().
        if self._agent.stats.total_spent >= self._daily_cap:
            return {"error": f"daily cap ${self._daily_cap} exhausted for {self._agent.config.name}"}
        try:
            result = asyncio.run(self._agent.request(
                self._service,
                input=kwargs,
                budget=self._budget,
                timeout=60,
            ))
            return result.result
        except DisputeRaisedError as e:
            return {"error": f"provider raised dispute: {e.reason}"}

# Crew agents
researcher = CrewAgent(
    role="researcher",
    goal="gather raw information on the user's topic from the open web",
    tools=[AgirailsServiceTool(researcher_wallet, "fetch-content", budget=0.05)],
    llm="claude-opus-4-7",
)

analyst = CrewAgent(
    role="analyst",
    goal="extract key insights from the researcher's findings",
    tools=[AgirailsServiceTool(analyst_wallet, "extract-insights", budget=0.50)],
    llm="claude-opus-4-7",
)

writer = CrewAgent(
    role="writer",
    goal="produce the final report in the user's language",
    tools=[AgirailsServiceTool(writer_wallet, "translate", budget=0.20)],
    llm="claude-opus-4-7",
)

# Sequential tasks with hand-offs
research_task = Task(
    description="Research the latest AI agent payment protocols. Focus on AGIRAILS, x402, Skyfire, Nevermined.",
    expected_output="A list of 5-10 raw findings with sources.",
    agent=researcher,
)

analysis_task = Task(
    description="Compare the protocols on: trust model, fee structure, decentralization, dispute handling.",
    expected_output="A structured analysis with one paragraph per dimension.",
    agent=analyst,
    context=[research_task],
)

writing_task = Task(
    description="Write a 500-word summary in Croatian for a technical audience.",
    expected_output="The final report in Croatian, markdown-formatted.",
    agent=writer,
    context=[analysis_task],
)

crew = Crew(
    agents=[researcher, analyst, writer],
    tasks=[research_task, analysis_task, writing_task],
)

result = crew.kickoff()
print("final:", result)
print(f"researcher spent: ${researcher_wallet.stats.total_spent:.2f}")
print(f"analyst spent: ${analyst_wallet.stats.total_spent:.2f}")
print(f"writer spent: ${writer_wallet.stats.total_spent:.2f}")
```

What this gives you in production:

- **Three independent wallets, three independent budgets.** A runaway researcher can't drain the writer's wallet. The per-tool `daily_cap` is the hard ceiling, enforced in `AgirailsServiceTool._run` before each call.
- **Three independent reputation tracks.** Each crew agent builds its own AgentRegistry reputation, useful when crew members get reused across projects.
- **Per-agent observability.** `agent.stats.total_spent` and `payment:received` events surface per-wallet, correlate by `crew_kickoff_id` in your logger.
- **Graceful budget exhaustion.** When an agent hits its cap, its tool returns `{"error": "..."}` instead of crashing the crew. The next agent in the chain decides how to handle the partial result.

For a 50-call research crew at typical prices, total spend lands around $5-8 USDC. With per-wallet `daily_cap` enforced in the wrapper, you can never overspend a Friday afternoon's curiosity.

## Per-call vs per-crew billing

| Pattern | When |
|---|---|
| Per-call paid tools | Different owners share the crew; each tool is a deployable service |
| Per-crew provider | One owner, exposes the whole crew as a single composable service |
| Hybrid | Crew is owned, but uses outside paid services (translation, fetching) |

The hybrid is most common: you own the research workflow, but the LLM gateway, translation, and content-fetching are each paid AGIRAILS services. Margin = your asking price − sub-task costs − ACTP fee.

## Cost discipline

CrewAI workflows can be unpredictable — agents reasoning loops can balloon. Always cap:

```python
agirails.config.behavior = {
    "budget": {
        "per_request_spend_cap": 1.00,  # $1 per kickoff
        "daily_spend_cap": 50.00,
    }
}
```

When the cap trips, the `request()` raises `BudgetExceededError` — catch at the crew boundary and return a graceful "budget exhausted" to whoever invoked the workflow.

## See also

- [LangChain integration](/recipes/langchain) — same pattern, different framework
- [Autonomous agent](/recipes/autonomous-agent) — single-process version of the same idea
- [Provider agent](/recipes/provider-agent) — how the underlying provide() works
- [CrewAI docs](https://docs.crewai.com/)
