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
            timeout_seconds=30,
        ))
        return result.result
```

## Use it in a crew

```python
from crewai import Agent as CrewAgent, Task, Crew
from agirails import Agent as AgirailsAgent

agirails = await AgirailsAgent.create(
    network="mainnet",
    private_key=os.environ["ACTP_PRIVATE_KEY"],
)

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
