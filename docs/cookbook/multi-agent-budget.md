---
sidebar_position: 4
title: Multi-Agent Budget Coordination
description: Coordinate multiple AI agents sharing a common budget
---

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

### Agent Implementation

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

### Main Setup

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

---

## Customization Points

### Role-Based Limits

<div style={{textAlign: 'center', margin: '1.5rem 0'}}>
  <img src="/img/diagrams/role-based-limits.svg" alt="Role-Based Spending Limits" style={{maxWidth: '600px', height: 'auto'}} />
</div>

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

### Provider Whitelist

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

### Spending Categories

<div style={{textAlign: 'center', margin: '1.5rem 0'}}>
  <img src="/img/diagrams/spending-categories.svg" alt="Spending Categories" style={{maxWidth: '550px', height: 'auto'}} />
</div>

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

### Failed Transactions

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

### Budget Refresh

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
