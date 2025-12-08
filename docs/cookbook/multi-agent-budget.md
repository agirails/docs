---
sidebar_position: 4
title: Multi-Agent Budget Coordination
description: Coordinate multiple AI agents sharing a common budget
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Multi-Agent Budget Coordination

Coordinate multiple AI agents that share a common budget pool with spending limits and approval workflows.

<div style={{textAlign: 'center', margin: '2rem 0'}}>
  <img src="/img/diagrams/multi-agent-budget.svg" alt="Multi-Agent Budget Architecture" style={{maxWidth: '100%', height: 'auto'}} />
</div>

| | |
|---|---|
| **Difficulty** | Intermediate |
| **Time** | 30 minutes |
| **Prerequisites** | [Quick Start](/quick-start), [Autonomous Agent Guide](/guides/agents/autonomous-agent) |

---

## Problem

You have a team of AI agents that need to:
- Share a common budget pool
- Each agent has individual spending limits
- Large purchases need approval
- Track spending across all agents
- Prevent overspending

Think: A research crew where each agent can buy data/compute, but the total budget is shared.

---

## Solution

Create a Budget Coordinator that manages funds and authorizes spending for sub-agents.

:::tip TL;DR
Central treasury wallet → Agents request spending → Coordinator checks limits → Auto-approve small, flag large → Track everything.
:::

---

## Complete Code

### Budget Coordinator

<Tabs>
<TabItem value="ts" label="TypeScript" default>

```typescript title="src/budget-coordinator.ts"
import { ACTPClient, State } from '@agirails/sdk';
import { parseUnits, formatUnits } from 'ethers';

interface AgentConfig {
  id: string;
  name: string;
  address: string;
  spendingLimit: bigint;      // Per-transaction limit
  dailyLimit: bigint;         // Daily spending cap
  requiresApproval: bigint;   // Threshold for manual approval
}

interface SpendingRecord {
  agentId: string;
  amount: bigint;
  txId: string;
  timestamp: number;
  provider: string;
  purpose: string;
}

class BudgetCoordinator {
  private client: ACTPClient;
  private agents: Map<string, AgentConfig> = new Map();
  private spending: SpendingRecord[] = [];
  private totalBudget: bigint;
  private pendingApprovals: Map<string, SpendingRequest> = new Map();

  constructor(client: ACTPClient, totalBudget: bigint) {
    this.client = client;
    this.totalBudget = totalBudget;
  }

  // Register an agent with spending limits
  registerAgent(config: AgentConfig): void {
    this.agents.set(config.id, config);
    console.log(`✅ Registered agent: ${config.name}`);
    console.log(`   Per-tx limit: ${formatUnits(config.spendingLimit, 6)} USDC`);
    console.log(`   Daily limit: ${formatUnits(config.dailyLimit, 6)} USDC`);
  }

  // Request spending authorization
  async requestSpending(request: SpendingRequest): Promise<SpendingResponse> {
    const agent = this.agents.get(request.agentId);

    if (!agent) {
      return {
        approved: false,
        reason: 'Agent not registered'
      };
    }

    // Check 1: Per-transaction limit
    if (request.amount > agent.spendingLimit) {
      return {
        approved: false,
        reason: `Amount ${formatUnits(request.amount, 6)} exceeds per-tx limit ${formatUnits(agent.spendingLimit, 6)}`
      };
    }

    // Check 2: Daily limit
    const dailySpent = this.getDailySpending(request.agentId);
    if (dailySpent + request.amount > agent.dailyLimit) {
      return {
        approved: false,
        reason: `Would exceed daily limit. Spent: ${formatUnits(dailySpent, 6)}, Limit: ${formatUnits(agent.dailyLimit, 6)}`
      };
    }

    // Check 3: Total budget
    const totalSpent = this.getTotalSpending();
    if (totalSpent + request.amount > this.totalBudget) {
      return {
        approved: false,
        reason: `Would exceed total budget. Spent: ${formatUnits(totalSpent, 6)}, Budget: ${formatUnits(this.totalBudget, 6)}`
      };
    }

    // Check 4: Requires approval?
    if (request.amount > agent.requiresApproval) {
      const approvalId = this.createApprovalRequest(request);
      return {
        approved: false,
        requiresApproval: true,
        approvalId: approvalId,
        reason: `Amount exceeds auto-approval threshold. Approval ID: ${approvalId}`
      };
    }

    // All checks passed - execute spending
    return await this.executeSpending(request, agent);
  }

  private async executeSpending(
    request: SpendingRequest,
    agent: AgentConfig
  ): Promise<SpendingResponse> {
    try {
      // Create transaction on behalf of requester
      const txId = await this.client.kernel.createTransaction({
        requester: await this.client.getAddress(), // Coordinator pays
        provider: request.provider,
        amount: request.amount,
        deadline: Math.floor(Date.now() / 1000) + 3600,
        disputeWindow: 3600,
        metadata: '0x'
      });

      // Fund escrow (approve + link)
      await this.client.fundTransaction(txId);

      // Record spending
      this.spending.push({
        agentId: request.agentId,
        amount: request.amount,
        txId: txId,
        timestamp: Date.now(),
        provider: request.provider,
        purpose: request.purpose
      });

      console.log(`💸 Spending approved for ${agent.name}`);
      console.log(`   Amount: ${formatUnits(request.amount, 6)} USDC`);
      console.log(`   Provider: ${request.provider}`);
      console.log(`   Transaction: ${txId}`);
      console.log(`   Settlement: Admin/bot will execute SETTLED (requester anytime; provider after dispute window)`);

      return {
        approved: true,
        txId: txId,
        remainingDaily: agent.dailyLimit - this.getDailySpending(agent.id),
        remainingTotal: this.totalBudget - this.getTotalSpending()
      };

    } catch (error) {
      return {
        approved: false,
        reason: `Execution failed: ${error.message}`
      };
    }
  }

  // Get agent's spending for today
  private getDailySpending(agentId: string): bigint {
    const today = new Date().setHours(0, 0, 0, 0);

    return this.spending
      .filter(s => s.agentId === agentId && s.timestamp >= today)
      .reduce((sum, s) => sum + s.amount, 0n);
  }

  // Get total spending across all agents
  private getTotalSpending(): bigint {
    return this.spending.reduce((sum, s) => sum + s.amount, 0n);
  }

  // Create pending approval request
  private createApprovalRequest(request: SpendingRequest): string {
    const approvalId = `approval-${Date.now()}`;
    this.pendingApprovals.set(approvalId, request);
    return approvalId;
  }

  // Manual approval (called by human or senior agent)
  async approveSpending(approvalId: string): Promise<SpendingResponse> {
    const request = this.pendingApprovals.get(approvalId);
    if (!request) {
      return { approved: false, reason: 'Approval not found' };
    }

    const agent = this.agents.get(request.agentId)!;
    this.pendingApprovals.delete(approvalId);

    return await this.executeSpending(request, agent);
  }

  // Reject pending approval
  rejectSpending(approvalId: string, reason: string): void {
    this.pendingApprovals.delete(approvalId);
    console.log(`❌ Spending rejected: ${reason}`);
  }

  // Get spending report
  getReport(): BudgetReport {
    const byAgent = new Map<string, bigint>();

    for (const record of this.spending) {
      const current = byAgent.get(record.agentId) || 0n;
      byAgent.set(record.agentId, current + record.amount);
    }

    return {
      totalBudget: this.totalBudget,
      totalSpent: this.getTotalSpending(),
      remaining: this.totalBudget - this.getTotalSpending(),
      byAgent: Object.fromEntries(
        Array.from(byAgent.entries()).map(([id, amount]) => [
          id,
          formatUnits(amount, 6)
        ])
      ),
      pendingApprovals: Array.from(this.pendingApprovals.keys())
    };
  }
}

interface SpendingRequest {
  agentId: string;
  amount: bigint;
  provider: string;
  purpose: string;
}

interface SpendingResponse {
  approved: boolean;
  txId?: string;
  reason?: string;
  requiresApproval?: boolean;
  approvalId?: string;
  remainingDaily?: bigint;
  remainingTotal?: bigint;
}

interface BudgetReport {
  totalBudget: bigint;
  totalSpent: bigint;
  remaining: bigint;
  byAgent: Record<string, string>;
  pendingApprovals: string[];
}
```

</TabItem>
<TabItem value="python" label="Python">

```python title="budget_coordinator.py"
import os, time
from typing import Dict, List, Optional
from dataclasses import dataclass
from agirails import ACTPClient, Network, State

@dataclass
class AgentConfig:
    id: str
    name: str
    address: str
    spending_limit: int  # Per-transaction limit
    daily_limit: int     # Daily spending cap
    requires_approval: int  # Threshold for manual approval

@dataclass
class SpendingRecord:
    agent_id: str
    amount: int
    tx_id: str
    timestamp: int
    provider: str
    purpose: str

@dataclass
class SpendingRequest:
    agent_id: str
    amount: int
    provider: str
    purpose: str

@dataclass
class SpendingResponse:
    approved: bool
    tx_id: Optional[str] = None
    reason: Optional[str] = None
    requires_approval: bool = False
    approval_id: Optional[str] = None
    remaining_daily: Optional[int] = None
    remaining_total: Optional[int] = None

class BudgetCoordinator:
    def __init__(self, client: ACTPClient, total_budget: int):
        self.client = client
        self.total_budget = total_budget
        self.agents: Dict[str, AgentConfig] = {}
        self.spending: List[SpendingRecord] = []
        self.pending_approvals: Dict[str, SpendingRequest] = {}

    def register_agent(self, config: AgentConfig):
        self.agents[config.id] = config
        print(f"✅ Registered agent: {config.name}")
        print(f"   Per-tx limit: {config.spending_limit / 1e6} USDC")
        print(f"   Daily limit: {config.daily_limit / 1e6} USDC")

    def request_spending(self, request: SpendingRequest) -> SpendingResponse:
        agent = self.agents.get(request.agent_id)
        if not agent:
            return SpendingResponse(approved=False, reason="Agent not registered")

        # Check per-transaction limit
        if request.amount > agent.spending_limit:
            return SpendingResponse(
                approved=False,
                reason=f"Amount {request.amount / 1e6} exceeds per-tx limit {agent.spending_limit / 1e6}"
            )

        # Check daily limit
        daily_spent = self._get_daily_spending(request.agent_id)
        if daily_spent + request.amount > agent.daily_limit:
            return SpendingResponse(
                approved=False,
                reason=f"Would exceed daily limit. Spent: {daily_spent / 1e6}, Limit: {agent.daily_limit / 1e6}"
            )

        # Check total budget
        total_spent = self._get_total_spending()
        if total_spent + request.amount > self.total_budget:
            return SpendingResponse(
                approved=False,
                reason=f"Would exceed total budget. Spent: {total_spent / 1e6}, Budget: {self.total_budget / 1e6}"
            )

        # Check if requires approval
        if request.amount > agent.requires_approval:
            approval_id = self._create_approval_request(request)
            return SpendingResponse(
                approved=False,
                requires_approval=True,
                approval_id=approval_id,
                reason=f"Amount exceeds auto-approval threshold. Approval ID: {approval_id}"
            )

        # Execute spending
        return self._execute_spending(request, agent)

    def _execute_spending(self, request: SpendingRequest, agent: AgentConfig) -> SpendingResponse:
        try:
            # Create transaction
            tx_id = self.client.kernel.create_transaction(
                requester=self.client.address,
                provider=request.provider,
                amount=request.amount,
                deadline=int(time.time()) + 3600,
                dispute_window=3600,
                metadata="0x"
            )

            # Fund escrow
            self.client.fund_transaction(tx_id)

            # Record spending
            self.spending.append(SpendingRecord(
                agent_id=request.agent_id,
                amount=request.amount,
                tx_id=tx_id,
                timestamp=int(time.time()),
                provider=request.provider,
                purpose=request.purpose
            ))

            print(f"💸 Spending approved for {agent.name}")
            print(f"   Amount: {request.amount / 1e6} USDC")
            print(f"   Transaction: {tx_id}")

            return SpendingResponse(
                approved=True,
                tx_id=tx_id,
                remaining_daily=agent.daily_limit - self._get_daily_spending(agent.id),
                remaining_total=self.total_budget - self._get_total_spending()
            )

        except Exception as e:
            return SpendingResponse(approved=False, reason=f"Execution failed: {str(e)}")

    def _get_daily_spending(self, agent_id: str) -> int:
        today_start = time.time() - (time.time() % 86400)  # Start of today
        return sum(
            s.amount for s in self.spending
            if s.agent_id == agent_id and s.timestamp >= today_start
        )

    def _get_total_spending(self) -> int:
        return sum(s.amount for s in self.spending)

    def _create_approval_request(self, request: SpendingRequest) -> str:
        approval_id = f"approval-{int(time.time())}"
        self.pending_approvals[approval_id] = request
        return approval_id

    def approve_spending(self, approval_id: str) -> SpendingResponse:
        request = self.pending_approvals.get(approval_id)
        if not request:
            return SpendingResponse(approved=False, reason="Approval not found")

        agent = self.agents[request.agent_id]
        del self.pending_approvals[approval_id]
        return self._execute_spending(request, agent)

    def get_report(self) -> dict:
        by_agent = {}
        for record in self.spending:
            by_agent[record.agent_id] = by_agent.get(record.agent_id, 0) + record.amount

        return {
            "total_budget": self.total_budget,
            "total_spent": self._get_total_spending(),
            "remaining": self.total_budget - self._get_total_spending(),
            "by_agent": {k: v / 1e6 for k, v in by_agent.items()},
            "pending_approvals": list(self.pending_approvals.keys())
        }
```

</TabItem>
</Tabs>

### Agent Implementation

<Tabs>
<TabItem value="ts" label="TypeScript" default>

```typescript title="src/budgeted-agent.ts"
class BudgetedAgent {
  private agentId: string;
  private coordinator: BudgetCoordinator;
  private client: ACTPClient;

  constructor(
    agentId: string,
    coordinator: BudgetCoordinator,
    client: ACTPClient
  ) {
    this.agentId = agentId;
    this.coordinator = coordinator;
    this.client = client;
  }

  // Request to spend from shared budget
  async purchaseService(
    provider: string,
    amount: bigint,
    purpose: string
  ): Promise<{ success: boolean; txId?: string; error?: string }> {
    console.log(`🤖 Agent ${this.agentId} requesting spend...`);

    const response = await this.coordinator.requestSpending({
      agentId: this.agentId,
      amount: amount,
      provider: provider,
      purpose: purpose
    });

    if (response.approved) {
      console.log(`✅ Approved! Transaction: ${response.txId}`);
      return { success: true, txId: response.txId };
    }

    if (response.requiresApproval) {
      console.log(`⏳ Requires approval: ${response.approvalId}`);
      return {
        success: false,
        error: `Pending approval: ${response.approvalId}`
      };
    }

    console.log(`❌ Denied: ${response.reason}`);
    return { success: false, error: response.reason };
  }
}
```

</TabItem>
<TabItem value="python" label="Python">

```python title="budgeted_agent.py"
from dataclasses import dataclass
from typing import Optional

@dataclass
class PurchaseResult:
    success: bool
    tx_id: Optional[str] = None
    error: Optional[str] = None

class BudgetedAgent:
    def __init__(self, agent_id: str, coordinator: BudgetCoordinator, client: ACTPClient):
        self.agent_id = agent_id
        self.coordinator = coordinator
        self.client = client

    def purchase_service(self, provider: str, amount: int, purpose: str) -> PurchaseResult:
        """Request to spend from shared budget"""
        print(f"🤖 Agent {self.agent_id} requesting spend...")

        response = self.coordinator.request_spending(SpendingRequest(
            agent_id=self.agent_id,
            amount=amount,
            provider=provider,
            purpose=purpose
        ))

        if response.approved:
            print(f"✅ Approved! Transaction: {response.tx_id}")
            return PurchaseResult(success=True, tx_id=response.tx_id)

        if response.requires_approval:
            print(f"⏳ Requires approval: {response.approval_id}")
            return PurchaseResult(success=False, error=f"Pending approval: {response.approval_id}")

        print(f"❌ Denied: {response.reason}")
        return PurchaseResult(success=False, error=response.reason)
```

</TabItem>
</Tabs>

### Main Setup

<Tabs>
<TabItem value="ts" label="TypeScript" default>

```typescript title="src/main.ts"
async function main() {
  // Initialize coordinator with treasury wallet
  const coordinatorClient = await ACTPClient.create({
    network: 'base-sepolia',
    privateKey: process.env.TREASURY_PRIVATE_KEY!
  });

  // Create coordinator with $1000 budget
  const coordinator = new BudgetCoordinator(
    coordinatorClient,
    parseUnits('1000', 6)
  );

  // Register agents with their limits
  coordinator.registerAgent({
    id: 'research-agent',
    name: 'Research Agent',
    address: '0x1111...', // Agent's wallet (for tracking)
    spendingLimit: parseUnits('100', 6),    // Max $100 per transaction
    dailyLimit: parseUnits('300', 6),       // Max $300 per day
    requiresApproval: parseUnits('50', 6)   // Auto-approve under $50
  });

  coordinator.registerAgent({
    id: 'data-agent',
    name: 'Data Acquisition Agent',
    address: '0x2222...',
    spendingLimit: parseUnits('200', 6),
    dailyLimit: parseUnits('500', 6),
    requiresApproval: parseUnits('100', 6)
  });

  coordinator.registerAgent({
    id: 'compute-agent',
    name: 'Compute Agent',
    address: '0x3333...',
    spendingLimit: parseUnits('500', 6),
    dailyLimit: parseUnits('1000', 6),
    requiresApproval: parseUnits('200', 6)
  });

  // Create budgeted agents
  const researchAgent = new BudgetedAgent(
    'research-agent',
    coordinator,
    coordinatorClient
  );

  const dataAgent = new BudgetedAgent(
    'data-agent',
    coordinator,
    coordinatorClient
  );

  // Simulate agent activities
  console.log('\n--- Research Agent purchasing API access ---');
  await researchAgent.purchaseService(
    '0xAPIProvider...',
    parseUnits('25', 6),  // $25 - auto-approved
    'Academic paper API access'
  );

  console.log('\n--- Data Agent purchasing dataset ---');
  await dataAgent.purchaseService(
    '0xDataProvider...',
    parseUnits('150', 6), // $150 - requires approval
    'Training dataset purchase'
  );

  // Print spending report
  console.log('\n--- Budget Report ---');
  const report = coordinator.getReport();
  console.log(`Total Budget: ${formatUnits(report.totalBudget, 6)} USDC`);
  console.log(`Total Spent: ${formatUnits(report.totalSpent, 6)} USDC`);
  console.log(`Remaining: ${formatUnits(report.remaining, 6)} USDC`);
  console.log('By Agent:', report.byAgent);
  console.log('Pending Approvals:', report.pendingApprovals);
}

main().catch(console.error);
```

</TabItem>
<TabItem value="python" label="Python">

```python title="main.py"
import os
from agirails import ACTPClient, Network

def main():
    # Initialize coordinator with treasury wallet
    coordinator_client = ACTPClient.create(
        network=Network.BASE_SEPOLIA,
        private_key=os.environ["TREASURY_PRIVATE_KEY"]
    )

    # Create coordinator with $1000 budget
    coordinator = BudgetCoordinator(
        client=coordinator_client,
        total_budget=1_000_000_000  # $1000 in USDC (6 decimals)
    )

    # Register agents with their limits
    coordinator.register_agent(AgentConfig(
        id="research-agent",
        name="Research Agent",
        address="0x1111...",
        spending_limit=100_000_000,    # $100 per transaction
        daily_limit=300_000_000,       # $300 per day
        requires_approval=50_000_000   # Auto-approve under $50
    ))

    coordinator.register_agent(AgentConfig(
        id="data-agent",
        name="Data Acquisition Agent",
        address="0x2222...",
        spending_limit=200_000_000,
        daily_limit=500_000_000,
        requires_approval=100_000_000
    ))

    coordinator.register_agent(AgentConfig(
        id="compute-agent",
        name="Compute Agent",
        address="0x3333...",
        spending_limit=500_000_000,
        daily_limit=1_000_000_000,
        requires_approval=200_000_000
    ))

    # Create budgeted agents
    research_agent = BudgetedAgent("research-agent", coordinator, coordinator_client)
    data_agent = BudgetedAgent("data-agent", coordinator, coordinator_client)

    # Simulate agent activities
    print("\n--- Research Agent purchasing API access ---")
    research_agent.purchase_service(
        provider="0xAPIProvider...",
        amount=25_000_000,  # $25 - auto-approved
        purpose="Academic paper API access"
    )

    print("\n--- Data Agent purchasing dataset ---")
    data_agent.purchase_service(
        provider="0xDataProvider...",
        amount=150_000_000,  # $150 - requires approval
        purpose="Training dataset purchase"
    )

    # Print spending report
    print("\n--- Budget Report ---")
    report = coordinator.get_report()
    print(f"Total Budget: {report['total_budget'] / 1e6} USDC")
    print(f"Total Spent: {report['total_spent'] / 1e6} USDC")
    print(f"Remaining: {report['remaining'] / 1e6} USDC")
    print(f"By Agent: {report['by_agent']}")
    print(f"Pending Approvals: {report['pending_approvals']}")

if __name__ == "__main__":
    main()
```

</TabItem>
</Tabs>

---

## How It Works

| Component | Purpose | Example |
|-----------|---------|---------|
| **Treasury Wallet** | Single source of funds | Coordinator holds $1000 |
| **Per-Transaction Limit** | Hard cap per spend | Max $100 per transaction |
| **Daily Limit** | Prevents runaway spending | Max $300 per day |
| **Approval Threshold** | Human/senior review | Flag purchases > $50 |
| **Spending Records** | Audit trail | Who, what, when, why |

### Centralized Treasury

:::info Why One Wallet?
All funds live in the coordinator's wallet:
- **Single source of truth** - No fragmented balances
- **Easy auditing** - All spending in one place
- **Simple recovery** - One key to secure
:::

### Four-Level Authorization

<div style={{textAlign: 'center', margin: '1.5rem 0'}}>
  <img src="/img/diagrams/authorization-flow.svg" alt="Authorization Flow" style={{maxWidth: '100%', height: 'auto'}} />
</div>

### Spending Records

Every transaction is recorded for auditing:

<Tabs>
<TabItem value="ts" label="TypeScript" default>

```typescript
{
  agentId: 'research-agent',
  amount: 25000000n,  // $25 USDC
  txId: '0xabc...',
  timestamp: 1699876543,
  provider: '0xAPIProvider...',
  purpose: 'Academic paper API access'
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
{
    "agent_id": "research-agent",
    "amount": 25_000_000,  # $25 USDC
    "tx_id": "0xabc...",
    "timestamp": 1699876543,
    "provider": "0xAPIProvider...",
    "purpose": "Academic paper API access"
}
```

</TabItem>
</Tabs>

---

## Customization Points

### Role-Based Limits

<div style={{textAlign: 'center', margin: '1.5rem 0'}}>
  <img src="/img/diagrams/role-based-limits.svg" alt="Role-Based Spending Limits" style={{maxWidth: '600px', height: 'auto'}} />
</div>

<Tabs>
<TabItem value="ts" label="TypeScript" default>

```typescript
type AgentRole = 'junior' | 'senior' | 'admin';

function getLimitsForRole(role: AgentRole): AgentLimits {
  switch (role) {
    case 'junior':
      return {
        spendingLimit: parseUnits('50', 6),
        dailyLimit: parseUnits('100', 6),
        requiresApproval: parseUnits('25', 6)
      };
    case 'senior':
      return {
        spendingLimit: parseUnits('500', 6),
        dailyLimit: parseUnits('1000', 6),
        requiresApproval: parseUnits('200', 6)
      };
    case 'admin':
      return {
        spendingLimit: parseUnits('10000', 6),
        dailyLimit: parseUnits('50000', 6),
        requiresApproval: parseUnits('5000', 6)
      };
  }
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
from typing import Literal
from dataclasses import dataclass

AgentRole = Literal["junior", "senior", "admin"]

@dataclass
class AgentLimits:
    spending_limit: int
    daily_limit: int
    requires_approval: int

def get_limits_for_role(role: AgentRole) -> AgentLimits:
    limits = {
        "junior": AgentLimits(
            spending_limit=50_000_000,      # $50
            daily_limit=100_000_000,        # $100
            requires_approval=25_000_000    # $25
        ),
        "senior": AgentLimits(
            spending_limit=500_000_000,     # $500
            daily_limit=1_000_000_000,      # $1000
            requires_approval=200_000_000   # $200
        ),
        "admin": AgentLimits(
            spending_limit=10_000_000_000,  # $10000
            daily_limit=50_000_000_000,     # $50000
            requires_approval=5_000_000_000 # $5000
        ),
    }
    return limits[role]
```

</TabItem>
</Tabs>

### Provider Whitelist

<Tabs>
<TabItem value="ts" label="TypeScript" default>

```typescript
private providerWhitelist: Set<string> = new Set([
  '0xTrustedProvider1...',
  '0xTrustedProvider2...'
]);

async requestSpending(request: SpendingRequest): Promise<SpendingResponse> {
  // Check provider is whitelisted
  if (!this.providerWhitelist.has(request.provider.toLowerCase())) {
    return {
      approved: false,
      reason: 'Provider not whitelisted'
    };
  }
  // ... rest of checks
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
class BudgetCoordinator:
    def __init__(self):
        self.provider_whitelist = {
            "0xTrustedProvider1...".lower(),
            "0xTrustedProvider2...".lower()
        }

    def request_spending(self, request: SpendingRequest) -> SpendingResponse:
        # Check provider is whitelisted
        if request.provider.lower() not in self.provider_whitelist:
            return SpendingResponse(
                approved=False,
                reason="Provider not whitelisted"
            )
        # ... rest of checks
```

</TabItem>
</Tabs>

### Spending Categories

<div style={{textAlign: 'center', margin: '1.5rem 0'}}>
  <img src="/img/diagrams/spending-categories.svg" alt="Spending Categories" style={{maxWidth: '550px', height: 'auto'}} />
</div>

<Tabs>
<TabItem value="ts" label="TypeScript" default>

```typescript
interface SpendingRequest {
  agentId: string;
  amount: bigint;
  provider: string;
  purpose: string;
  category: 'data' | 'compute' | 'api' | 'other';
}

// Category-specific budgets
private categoryBudgets = {
  data: parseUnits('300', 6),
  compute: parseUnits('500', 6),
  api: parseUnits('200', 6),
  other: parseUnits('100', 6)
};

private getCategorySpending(category: string): bigint {
  return this.spending
    .filter(s => s.category === category)
    .reduce((sum, s) => sum + s.amount, 0n);
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
from typing import Literal
from dataclasses import dataclass

Category = Literal["data", "compute", "api", "other"]

@dataclass
class SpendingRequest:
    agent_id: str
    amount: int
    provider: str
    purpose: str
    category: Category

class BudgetCoordinator:
    def __init__(self):
        # Category-specific budgets
        self.category_budgets = {
            "data": 300_000_000,     # $300
            "compute": 500_000_000,  # $500
            "api": 200_000_000,      # $200
            "other": 100_000_000,    # $100
        }

    def get_category_spending(self, category: str) -> int:
        return sum(
            s.amount for s in self.spending
            if s.category == category
        )
```

</TabItem>
</Tabs>

---

## Gotchas

:::danger Common Pitfalls
These are mistakes we made so you don't have to.
:::

| Gotcha | Problem | Solution |
|--------|---------|----------|
| **Race conditions** | Two agents approve same $500 when only $600 left | Use mutex/lock for spending decisions |
| **Partial failures** | Transaction created but funding fails | Cancel tx if funding fails, don't record spend |
| **In-memory state** | Server restarts lose all spending records | Persist to database |
| **Stale daily limits** | Daily limit never resets | Implement budget refresh cycle |
| **Treasury key exposure** | Coordinator key leaked = all funds gone | Use HSM or multisig |

### Race Conditions

<Tabs>
<TabItem value="ts" label="TypeScript" default>

```typescript
// Use a mutex/lock for spending decisions
import { Mutex } from 'async-mutex';

private spendingMutex = new Mutex();

async requestSpending(request: SpendingRequest): Promise<SpendingResponse> {
  return await this.spendingMutex.runExclusive(async () => {
    // All spending checks and execution here
  });
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
import asyncio

class BudgetCoordinator:
    def __init__(self):
        self._spending_lock = asyncio.Lock()

    async def request_spending(self, request: SpendingRequest) -> SpendingResponse:
        async with self._spending_lock:
            # All spending checks and execution here
            pass
```

</TabItem>
</Tabs>

### Failed Transactions

<Tabs>
<TabItem value="ts" label="TypeScript" default>

```typescript
try {
  const txId = await this.client.kernel.createTransaction({...});

  try {
    await this.client.escrow.fund(txId);
  } catch (fundError) {
    // Transaction created but not funded - CANCEL IT
    console.error('Funding failed, cancelling transaction');
    await this.client.kernel.transitionState(txId, State.CANCELLED, '0x');
    throw fundError;
  }

  // Only record if fully successful
  this.spending.push({...});

} catch (error) {
  // Handle appropriately
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
try:
    tx_id = self.client.kernel.create_transaction(...)

    try:
        self.client.escrow.fund(tx_id)
    except Exception as fund_error:
        # Transaction created but not funded - CANCEL IT
        print("Funding failed, cancelling transaction")
        self.client.kernel.transition_state(tx_id, State.CANCELLED, "0x")
        raise fund_error

    # Only record if fully successful
    self.spending.append(...)

except Exception as error:
    # Handle appropriately
    pass
```

</TabItem>
</Tabs>

### Budget Refresh

<Tabs>
<TabItem value="ts" label="TypeScript" default>

```typescript
private lastReset: number = Date.now();
private resetInterval: number = 24 * 60 * 60 * 1000; // Daily

private checkBudgetReset(): void {
  if (Date.now() - this.lastReset > this.resetInterval) {
    this.archivedSpending.push(...this.spending);
    this.spending = [];
    this.lastReset = Date.now();
    console.log('Budget reset for new period');
  }
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
import time

class BudgetCoordinator:
    def __init__(self):
        self.last_reset = time.time() * 1000  # milliseconds
        self.reset_interval = 24 * 60 * 60 * 1000  # Daily
        self.archived_spending = []

    def check_budget_reset(self):
        now = time.time() * 1000
        if now - self.last_reset > self.reset_interval:
            self.archived_spending.extend(self.spending)
            self.spending = []
            self.last_reset = now
            print("Budget reset for new period")
```

</TabItem>
</Tabs>

---

## Production Checklist

### Data Persistence
- [ ] Spending records in database (PostgreSQL, MongoDB)
- [ ] Recovery mechanism for failed transactions
- [ ] Audit log for all spending decisions

### Concurrency
- [ ] Mutex/lock for spending decisions
- [ ] Idempotency keys for retry safety

### Monitoring
- [ ] Alerting at 80%, 90%, 100% budget thresholds
- [ ] Dashboard for real-time spending
- [ ] Slack/Discord notifications for approvals

### Security
- [ ] Treasury key in HSM or secrets manager
- [ ] Emergency stop capability
- [ ] Multi-sig for large approvals

:::tip Start With Memory
For testing, in-memory is fine. Persist to database when you're handling real money.
:::

---

## Next Steps

<div className="row" style={{marginTop: '1rem'}}>
  <div className="col col--4" style={{marginBottom: '1rem'}}>
    <div className="card" style={{height: '100%', padding: '1.5rem'}}>
      <h4>🔐 Secure Keys</h4>
      <p>Protect that treasury wallet.</p>
      <a href="./secure-key-management">Key Management →</a>
    </div>
  </div>
  <div className="col col--4" style={{marginBottom: '1rem'}}>
    <div className="card" style={{height: '100%', padding: '1.5rem'}}>
      <h4>🤖 Provider Agent</h4>
      <p>Build the other side of the market.</p>
      <a href="./automated-provider-agent">Provider Agent →</a>
    </div>
  </div>
  <div className="col col--4" style={{marginBottom: '1rem'}}>
    <div className="card" style={{height: '100%', padding: '1.5rem'}}>
      <h4>📚 Consumer Guide</h4>
      <p>Deep dive on consuming services.</p>
      <a href="/guides/agents/consumer-agent">Consumer Agent →</a>
    </div>
  </div>
</div>
