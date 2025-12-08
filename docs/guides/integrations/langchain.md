---
sidebar_position: 2
title: LangChain Integration
description: Add payment capabilities to your LangChain agents
---

# LangChain Integration

Add payment capabilities to your LangChain agents. Enable AI chains to pay for services, data, and compute.

<div style={{textAlign: 'center', margin: '2rem 0'}}>
  <img src="/img/diagrams/langchain-integration.svg" alt="LangChain + AGIRAILS Integration" style={{maxWidth: '100%', height: 'auto'}} />
</div>

| | |
|---|---|
| **Difficulty** | Intermediate |
| **Time** | 30 minutes |
| **Prerequisites** | [Quick Start](/quick-start), Python 3.9+, LangChain basics |

---

## Problem

You want to:
- Build LangChain agents that can pay for external services
- Monetize your AI chains by accepting payments
- Create multi-agent workflows with financial transactions
- Purchase data, API access, or compute on-demand

---

## Solution

Create a custom LangChain `BaseTool` that wraps the AGIRAILS **Python SDK** (`agirails_sdk`). Use the SDK for funded transactions, attestation-verified release, and (optionally) AIP-7 Agent Registry operations.

:::tip TL;DR
Create `AGIRAILSPaymentTool` → Add to agent → Agent can now create, fund, check status, and release with attestation verification. Optional: add registry helpers for AIP-7 discovery/registration.
:::

---

## Installation

```bash
pip install langchain langchain-openai agirails-sdk python-dotenv
```

---

## Tool Architecture

<div style={{textAlign: 'center', margin: '1.5rem 0'}}>
  <img src="/img/diagrams/langchain-tool-architecture.svg" alt="AGIRAILS Payment Tool Architecture" style={{maxWidth: '600px', height: 'auto'}} />
</div>

The `AGIRAILSPaymentTool` extends LangChain's `BaseTool` and provides core actions:

| Action | Description | State Transition |
|--------|-------------|------------------|
| `create_transaction` | Create new payment | → INITIATED |
| `fund_transaction` | Approve USDC + link escrow | → COMMITTED |
| `check_status` | Get transaction state | (read-only) |
| `release_with_verification` | Verify attestation + release funds | → SETTLED |
| `register_agent` *(optional)* | Register provider profile (AIP-7) | registry write |
| `query_agents_by_service` *(optional)* | Discover providers (AIP-7) | read |

---

## Basic Implementation (Python SDK)

### Step 1: Create the Payment Tool

```python
import os, time
from typing import Optional, Literal
from langchain.tools import BaseTool
from agirails_sdk import ACTPClient, Network, State
from agirails_sdk.errors import ValidationError, TransactionError, RpcError

Action = Literal["create_transaction", "fund_transaction", "check_status", "release_with_verification"]

class AGIRAILSPaymentTool(BaseTool):
    """Tool for creating and managing AGIRAILS payments via SDK."""

    name = "agirails_payment"
    description = "create_transaction, fund_transaction, check_status, release_with_verification"

    def __init__(self, private_key: str, network: Network = Network.BASE_SEPOLIA):
        super().__init__()
        self.client = ACTPClient(network=network, private_key=private_key)

    def _run(self, action: Action, **kwargs) -> str:
        try:
            if action == "create_transaction":
                return self._create_transaction(**kwargs)
            if action == "fund_transaction":
                return self._fund_transaction(**kwargs)
            if action == "check_status":
                return self._check_status(**kwargs)
            if action == "release_with_verification":
                return self._release_with_verification(**kwargs)
            return f"Unknown action: {action}"
        except (ValidationError, TransactionError, RpcError) as e:
            return f"Error: {e}"

    # --- Actions ---
    def _create_transaction(
        self,
        provider: str,
        amount: int,
        deadline_seconds: int = 86400,
        dispute_window: int = 7200,
        service_hash: Optional[str] = None,
    ) -> str:
        deadline = self.client.now() + deadline_seconds
        tx_id = self.client.create_transaction(
            requester=self.client.address,
            provider=provider,
            amount=amount,
            deadline=deadline,
            dispute_window=dispute_window,
            service_hash=service_hash or "0x" + "00"*32,
        )
        return f"Created tx: {tx_id}"

    def _fund_transaction(self, tx_id: str, amount: Optional[int] = None) -> str:
        escrow_id = self.client.fund_transaction(tx_id, amount=amount)
        return f"Funded tx {tx_id} with escrow {escrow_id}"

    def _check_status(self, tx_id: str) -> str:
        tx = self.client.get_transaction(tx_id)
        return f"tx {tx_id} state={tx.state.name}, amount={tx.amount}, provider={tx.provider}"

    def _release_with_verification(self, tx_id: str, attestation_uid: str) -> str:
        self.client.release_escrow_with_verification(tx_id, attestation_uid)
        return f"Released tx {tx_id}"
```

### Step 2: Add to LangChain Agent

```python
from langchain.agents import initialize_agent, AgentType
from langchain_openai import ChatOpenAI

# Initialize LLM
llm = ChatOpenAI(model="gpt-4", temperature=0)

# Initialize payment tool
payment_tool = AGIRAILSPaymentTool(
    private_key=os.getenv("PRIVATE_KEY")
)

# Create agent with payment capability
agent = initialize_agent(
    tools=[payment_tool],
    llm=llm,
    agent=AgentType.STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION,
    verbose=True
)

# Use the agent
response = agent.run("""
I need to pay 0x742d35Cc6634C0532925a3b844Bc454e4438f44e
$5 USDC for API access. Create and fund the transaction.
""")

print(response)
```

---

## Optional: AIP-7 Agent Discovery / Registration

If your agent should self-publish or discover providers, wrap Agent Registry helpers:

```python
from typing import Literal
from langchain.tools import BaseTool
from agirails_sdk import ACTPClient, Network

RegistryAction = Literal["register_agent", "query_agents"]

class AGIRAILSRegistryTool(BaseTool):
    name = "agirails_registry"
    description = "register_agent, query_agents"

    def __init__(self, private_key: str, network: Network = Network.BASE_SEPOLIA):
        super().__init__()
        self.client = ACTPClient(network=network, private_key=private_key)

    def _run(self, action: RegistryAction, **kwargs) -> str:
        if not self.client.agent_registry:
            return "Agent registry not configured on this network"
        if action == "register_agent":
            descriptors = kwargs.get("service_descriptors", [])
            self.client.validate_service_descriptors(descriptors)
            self.client.register_agent(endpoint=kwargs["endpoint"], service_descriptors=descriptors)
            return "Agent registered"
        if action == "query_agents":
            hash_ = self.client.compute_service_type_hash(kwargs["service_type"])
            agents = self.client.query_agents_by_service(
                service_type_hash=hash_,
                min_reputation=kwargs.get("min_reputation", 0),
                offset=kwargs.get("offset", 0),
                limit=kwargs.get("limit", 50),
            )
            return f"Agents: {agents}"
        return "Unknown registry action"
```

---

## Recipe: Paid Research Chain (SDK)

A complete example that pays for research data and synthesizes it using the SDK-based tool.

<div style={{textAlign: 'center', margin: '1.5rem 0'}}>
  <img src="/img/diagrams/langchain-paid-research.svg" alt="Paid Research Chain Flow" style={{maxWidth: '100%', height: 'auto'}} />
</div>

```python
from langchain.chains import LLMChain
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
import os

class PaidResearchChain:
    """Chain that pays for and synthesizes research data."""

    def __init__(self, private_key: str):
        self.llm = ChatOpenAI(model="gpt-4")
        self.payment_tool = AGIRAILSPaymentTool(private_key)
        self.data_providers = {
            "academic": "0x1111111111111111111111111111111111111111",
            "market": "0x2222222222222222222222222222222222222222",
            "news": "0x3333333333333333333333333333333333333333"
        }

    def research(self, topic: str, budget_usdc: int = 5_000_000) -> str:
        """
        budget_usdc: int with 6 decimals (e.g., 5_000_000 = $5)
        """
        plan_prompt = PromptTemplate(
            input_variables=["topic", "budget", "providers"],
            template="""
Plan research for: {topic}
Budget (USDC 6dp): {budget}
Available providers: {providers}

Return a JSON plan with providers and allocations.
"""
        )

        plan_chain = LLMChain(llm=self.llm, prompt=plan_prompt)
        plan = plan_chain.run(
            topic=topic,
            budget=budget_usdc / 1_000_000,
            providers=list(self.data_providers.keys())
        )

        # Execute a single payment (demo) to academic provider
        tx_resp = self.payment_tool._create_transaction(
            provider=self.data_providers["academic"],
            amount=budget_usdc // 2,
        )
        tx_id = tx_resp.replace("Created tx: ", "")
        self.payment_tool._fund_transaction(tx_id)

        synthesis_prompt = PromptTemplate(
            input_variables=["topic", "plan", "tx_id"],
            template="""
Topic: {topic}
Plan: {plan}
Payment tx: {tx_id}

Synthesize a concise research report.
"""
        )

        synthesis_chain = LLMChain(llm=self.llm, prompt=synthesis_prompt)
        return synthesis_chain.run(topic=topic, plan=plan, tx_id=tx_id)

# Usage
researcher = PaidResearchChain(os.getenv("PRIVATE_KEY"))
report = researcher.research(topic="Impact of AI agents on financial markets", budget_usdc=5_000_000)
print(report)
```

---
## Best Practices

### 1. Budget Limits

Prevent runaway spending with per-transaction and daily limits:

```python
class BudgetedPaymentTool(AGIRAILSPaymentTool):
    """Payment tool with budget limits."""

    def __init__(self, private_key: str, max_per_tx: float, daily_limit: float):
        super().__init__(private_key)
        self.max_per_tx = max_per_tx
        self.daily_limit = daily_limit
        self.daily_spent = 0.0

    def _create_and_fund(self, **kwargs) -> str:
        amount = kwargs.get("amount_usdc", 0)

        if amount > self.max_per_tx:
            return f"Error: ${amount} exceeds per-tx limit ${self.max_per_tx}"

        if self.daily_spent + amount > self.daily_limit:
            return f"Error: Would exceed daily limit ${self.daily_limit}"

        result = super()._create_and_fund(**kwargs)
        self.daily_spent += amount
        return result
```

### 2. Error Handling

```python
def _run(self, action: str, **kwargs) -> str:
    try:
        result = self._execute_action(action, **kwargs)
        return result
    except InsufficientFundsError:
        return "Error: Insufficient USDC. Fund your wallet."
    except TransactionFailedError as e:
        return f"Error: Transaction failed - {e.message}"
    except Exception as e:
        logger.error(f"Payment failed: {e}", exc_info=True)
        return f"Error: {str(e)}"
```

### 3. Transaction Logging

```python
import logging

logger = logging.getLogger("agirails")

def _create_and_fund(self, **kwargs) -> str:
    logger.info(f"Creating transaction: {kwargs}")
    result = super()._create_and_fund(**kwargs)
    logger.info(f"Transaction result: {result}")
    return result
```

---

## Troubleshooting

### "Insufficient funds"

Check both USDC and ETH balances:

```python
usdc_balance = payment_tool._get_balance()
eth_balance = payment_tool.w3.eth.get_balance(payment_tool.account.address)
print(f"USDC: {usdc_balance}, ETH: {eth_balance / 1e18}")
```

### "Transaction reverted"

Common causes:
1. Insufficient USDC approval
2. Provider address same as requester
3. Amount below minimum ($0.05)
4. Deadline in the past

### "Gas estimation failed"

Check:
1. Contract addresses are correct
2. Network is Base Sepolia
3. Account has ETH for gas

---

## Next Steps

<div className="row" style={{marginTop: '1rem'}}>
  <div className="col col--4" style={{marginBottom: '1rem'}}>
    <div className="card" style={{height: '100%', padding: '1.5rem'}}>
      <h4>🤖 CrewAI</h4>
      <p>Multi-agent teams with payments.</p>
      <a href="./crewai">CrewAI Integration →</a>
    </div>
  </div>
  <div className="col col--4" style={{marginBottom: '1rem'}}>
    <div className="card" style={{height: '100%', padding: '1.5rem'}}>
      <h4>💰 API Monetization</h4>
      <p>Charge for your AI services.</p>
      <a href="/cookbook/api-pay-per-call">Pay-Per-Call →</a>
    </div>
  </div>
  <div className="col col--4" style={{marginBottom: '1rem'}}>
    <div className="card" style={{height: '100%', padding: '1.5rem'}}>
      <h4>📚 SDK Reference</h4>
      <p>Full API documentation.</p>
      <a href="/sdk-reference">SDK Reference →</a>
    </div>
  </div>
</div>
