# AGIRAILS Documentation Content Plan

**Goal**: Zero to first transaction in 15 minutes
**Audience**: Developers building AI agents that need to pay each other
**Tone**: Clear, confident, practical (like Stripe docs)

---

## Phase 1: Critical Path (Week 1)

These pages enable the "15-minute first transaction" goal.

### 1.1 Landing Page - What is AGIRAILS?
**File**: `docs/index.md`
**Purpose**: Hook developers in 30 seconds
**Structure**:
- Hero: One-liner value prop ("Payment rails for AI agents")
- Problem statement (3 bullets: why existing payment infra fails for agents)
- Solution overview (visual: how AGIRAILS solves it)
- Key benefits (trust, escrow, reputation - 3 cards)
- "Get Started" CTA button

**Word count**: ~500 words
**Visual assets**: 1 hero diagram, 3 icons

### 1.2 Quick Start
**File**: `docs/quick-start.md`
**Purpose**: First transaction in 15 minutes
**Structure**:
1. Prerequisites (2 min) - Node.js, wallet, testnet ETH
2. Install SDK (1 min) - `npm install @agirails/sdk`
3. Configure (2 min) - Environment setup, RPC config
4. Create transaction (5 min) - Code example with explanation
5. Check result (2 min) - Verify on explorer
6. What's next - Links to deeper docs

**Word count**: ~800 words
**Code samples**: 4-5 runnable examples

### 1.3 Installation
**File**: `docs/installation.md`
**Purpose**: Detailed installation for all environments
**Structure**:
- npm/yarn/pnpm tabs
- TypeScript configuration
- Framework integrations (Node.js, Next.js, React)
- Environment variables
- Network configuration (testnet vs mainnet)

**Word count**: ~600 words
**Code samples**: 8-10 snippets

### 1.4 First Transaction
**File**: `docs/first-transaction.md`
**Purpose**: Deep dive on transaction creation
**Structure**:
- Transaction anatomy (what each field means)
- Step-by-step walkthrough with explanations
- Complete code example (provider + consumer agents)
- State transitions explained
- Troubleshooting common errors

**Word count**: ~1200 words
**Code samples**: Full working example

---

## Phase 2: Core Concepts (Week 2)

Understanding the protocol deeply.

### 2.1 Concepts Overview
**File**: `docs/concepts/index.md`
**Content**: Map of all concepts, how they relate

### 2.2 ACTP Protocol
**File**: `docs/concepts/actp-protocol.md`
**Content**: What ACTP is, why it exists, design principles

### 2.3 Transaction Lifecycle
**File**: `docs/concepts/transaction-lifecycle.md`
**Content**: 8 states, transitions, visual state machine diagram

### 2.4 Escrow Mechanism
**File**: `docs/concepts/escrow-mechanism.md`
**Content**: How escrow works, fund locking, release conditions

### 2.5 Agent Identity
**File**: `docs/concepts/agent-identity.md`
**Content**: DID format, registration, on-chain identity

### 2.6 Trust & Reputation
**File**: `docs/concepts/trust-reputation.md`
**Content**: Reputation scoring, trust verification, discovery

### 2.7 Fee Model
**File**: `docs/concepts/fee-model.md`
**Content**: 1% fee, $0.05 minimum, fee distribution

---

## Phase 3: Guides (Week 3-4)

Practical how-to guides for common scenarios.

### 3.1 Building AI Agents

#### Provider Agent Guide
**File**: `docs/guides/agents/provider-agent.md`
**Content**: Build an agent that offers services

#### Consumer Agent Guide
**File**: `docs/guides/agents/consumer-agent.md`
**Content**: Build an agent that requests services

#### Autonomous Agent Guide
**File**: `docs/guides/agents/autonomous-agent.md`
**Content**: Fully autonomous agent patterns

### 3.2 Integrations

#### LangChain Integration
**File**: `docs/guides/integrations/langchain.md`
**Content**: AGIRAILS + LangChain tools

#### CrewAI Integration
**File**: `docs/guides/integrations/crewai.md`
**Content**: AGIRAILS + CrewAI agents

#### AutoGPT Integration
**File**: `docs/guides/integrations/autogpt.md`
**Content**: AGIRAILS + AutoGPT

#### n8n Integration
**File**: `docs/guides/integrations/n8n.md`
**Content**: AGIRAILS + n8n workflows

### 3.3 Advanced Topics

#### Dispute Handling
**File**: `docs/guides/advanced/dispute-handling.md`
**Content**: Raising disputes, resolution, penalties

#### Milestone Payments
**File**: `docs/guides/advanced/milestone-payments.md`
**Content**: Multi-milestone transactions

#### Batch Transactions
**File**: `docs/guides/advanced/batch-transactions.md`
**Content**: Efficient bulk operations

#### Gas Optimization
**File**: `docs/guides/advanced/gas-optimization.md`
**Content**: Reducing transaction costs

---

## Phase 4: Tutorials (Week 4-5)

End-to-end project tutorials.

### 4.1 AI Marketplace Tutorial
**File**: `docs/tutorials/ai-marketplace.md`
**Content**: Build a marketplace where AI agents trade services

### 4.2 Automated Payments Tutorial
**File**: `docs/tutorials/automated-payments.md`
**Content**: Recurring payments between agents

### 4.3 Reputation System Tutorial
**File**: `docs/tutorials/reputation-system.md`
**Content**: Building on the reputation layer

---

## Phase 5: SDK Reference (Week 5-6)

Complete API documentation.

### 5.1 SDK Overview
**File**: `docs/sdk/index.md`
**Content**: SDK architecture, module overview

### 5.2 Core Modules
- `docs/sdk/modules/client.md` - ACTPClient class
- `docs/sdk/modules/kernel.md` - Kernel module
- `docs/sdk/modules/escrow.md` - Escrow module
- `docs/sdk/modules/events.md` - Event handling
- `docs/sdk/modules/messages.md` - EIP-712 signing
- `docs/sdk/modules/proofs.md` - Content proofs

### 5.3 Types & Interfaces
- `docs/sdk/types/transaction.md`
- `docs/sdk/types/agent.md`
- `docs/sdk/types/escrow.md`
- `docs/sdk/types/events.md`

### 5.4 Examples
- `docs/sdk/examples/basic-transaction.md`
- `docs/sdk/examples/event-listening.md`
- `docs/sdk/examples/error-handling.md`

---

## Phase 6: Smart Contracts (Week 6-7)

Contract documentation for advanced users.

### 6.1 Contracts Overview
**File**: `docs/contracts/index.md`

### 6.2 Core Contracts
- `docs/contracts/actp-kernel.md`
- `docs/contracts/escrow-vault.md`
- `docs/contracts/agent-registry.md`

### 6.3 Interfaces
- `docs/contracts/interfaces/iactp-kernel.md`
- `docs/contracts/interfaces/iescrow-validator.md`
- `docs/contracts/interfaces/iagent-registry.md`

### 6.4 Security
- `docs/contracts/security/audits.md`
- `docs/contracts/security/invariants.md`
- `docs/contracts/security/access-control.md`

### 6.5 Deployment
- `docs/contracts/deployment/addresses.md`
- `docs/contracts/deployment/verification.md`
- `docs/contracts/deployment/upgrades.md`

---

## Phase 7: Protocol Specs / AIPs (Week 7-8)

Deep protocol specifications for builders.

### 7.1 AIPs Overview
**File**: `docs/aips/index.md`

### 7.2 Core Protocol AIPs
- `docs/aips/aip-0.md` - Protocol Overview
- `docs/aips/aip-1.md` - Transaction Schema
- `docs/aips/aip-2.md` - State Machine
- `docs/aips/aip-3.md` - Fee Economics

### 7.3 Extension AIPs
- `docs/aips/aip-4.md` - Escrow System
- `docs/aips/aip-5.md` - Reputation System
- `docs/aips/aip-6.md` - Agent Capabilities
- `docs/aips/aip-7.md` - Identity & Storage

### 7.4 AIP Template
**File**: `docs/aips/template.md`

---

## Content Quality Standards

### Writing Guidelines

1. **Active voice**: "Create a transaction" not "A transaction is created"
2. **Direct instructions**: "Run `npm install`" not "You should run..."
3. **Concrete examples**: Real code that runs, not pseudocode
4. **Visual hierarchy**: Headers, bullets, code blocks - scannable
5. **Error handling**: Show what can go wrong and how to fix it

### Code Sample Requirements

- All examples must be copy-paste runnable
- Include imports
- Use TypeScript with types
- Add comments for non-obvious lines
- Test before publishing

### Visual Assets Needed

| Asset | Page | Type |
|-------|------|------|
| ACTP Architecture | What is AGIRAILS | Diagram |
| Transaction Flow | Quick Start | Mermaid |
| State Machine | Transaction Lifecycle | Mermaid |
| Escrow Flow | Escrow Mechanism | Diagram |
| Agent Identity | Agent Identity | Diagram |
| Fee Distribution | Fee Model | Chart |

---

## Success Metrics

1. **Time to first transaction**: < 15 minutes
2. **Bounce rate on Quick Start**: < 30%
3. **Search success rate**: > 90%
4. **GitHub issues labeled "docs"**: < 10/month
5. **Community feedback score**: > 4.5/5

---

## Content Calendar

| Week | Focus | Pages |
|------|-------|-------|
| 1 | Critical Path | index, quick-start, installation, first-transaction |
| 2 | Core Concepts | 7 concept pages |
| 3 | Guides (Agents) | 3 agent guides |
| 4 | Guides (Integrations + Advanced) | 8 integration/advanced guides |
| 5 | Tutorials + SDK Start | 3 tutorials, SDK overview |
| 6 | SDK Reference | 10 SDK pages |
| 7 | Contracts | 10 contract pages |
| 8 | AIPs + Polish | 9 AIP pages, final review |

---

*Last updated: 2025-11-29*
*Status: Plan created, awaiting content writing*
