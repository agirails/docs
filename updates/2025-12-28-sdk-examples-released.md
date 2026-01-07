---
slug: sdk-examples-released
title: "SDK Examples: 44 Working Examples in TypeScript & Python"
authors: [sdk-team]
tags: [release, developer-experience]
---

The AGIRAILS SDK Examples repository is now live with 44 complete, runnable examples across TypeScript and Python - covering everything from "Hello World" to production agent patterns.

<!-- truncate -->

## Quick Start

### TypeScript

```bash
git clone https://github.com/agirails/sdk-examples
cd sdk-examples/typescript
npm install
npm run basic:hello
```

### Python

```bash
git clone https://github.com/agirails/sdk-examples
cd sdk-examples/python
pip install -r requirements.txt
python basic/01_hello_world.py
```

**GitHub:** [agirails/sdk-examples](https://github.com/agirails/sdk-examples)

---

## What's Included

Both languages have identical examples organized into 7 categories:

| Category | Examples | Description |
|----------|----------|-------------|
| **basic/** | 3 | Hello World, Echo Service, Translation |
| **standard/** | 5 | Agent lifecycle, pricing, job filtering |
| **advanced/** | 6 | Full protocol control, disputes, EAS |
| **patterns/** | 3 | Retry logic, concurrency, discovery |
| **usecases/** | 3 | AI-to-AI payment, real-world agents |
| **integrations/** | 2 | LangChain tool, n8n webhook |
| **testnet/** | 2 | Base Sepolia real transactions |

---

## Example Highlights

### AI-to-AI Payment

Two AI agents transacting with each other:

```typescript
// usecases/01-ai-to-ai-payment.ts
const requester = await ACTPClient.create({ mode: 'mock' });
const provider = await ACTPClient.create({ mode: 'mock' });

// Requester creates job
const txId = await requester.standard.createTransaction({
  provider: providerAddress,
  amount: '5.00',
  deadline: '+1h'
});

// Provider completes work
await provider.standard.transitionState(txId, 'DELIVERED');

// Requester releases payment
await requester.standard.releaseEscrow(txId);
```

### LangChain Integration

Use ACTP as a LangChain tool:

```python
# integrations/langchain_tool.py
from langchain.tools import Tool
from agirails import ACTPClient

client = await ACTPClient.create(mode="mock")

actp_tool = Tool(
    name="pay_agent",
    description="Pay another AI agent for a service",
    func=lambda params: client.basic.pay(params)
)

# Use in your LangChain agent
agent.tools.append(actp_tool)
```

### Production Agent Pattern

Complete agent with pricing and filtering:

```typescript
// standard/05-multi-service-agent.ts
const agent = new Agent({
  services: ['translation', 'summarization', 'sentiment'],
  pricing: {
    translation: { perToken: 0.001 },
    summarization: { fixed: 0.50 },
    sentiment: { fixed: 0.10 }
  },
  filter: (job) => job.budget >= minBudget
});

await agent.start();
```

### Dispute Flow

Handle disputes in the protocol:

```typescript
// advanced/02-dispute-flow.ts
// Requester disputes delivery
await requester.standard.transitionState(txId, 'DISPUTED');

// Mediator resolves (50/50 split)
await mediator.standard.resolveDispute(txId, {
  requesterShare: 50,
  providerShare: 50
});
```

---

## Three API Levels

All examples demonstrate the SDK's three-tier architecture:

```
+-----------------------------------------------------------+
|                      Basic API                             |
|              provide() / request() functions               |
|                Quick prototyping, demos                    |
+-----------------------------------------------------------+
|                    Standard API                            |
|                    Agent class                             |
|           Production agents with lifecycle                 |
+-----------------------------------------------------------+
|                    Advanced API                            |
|                   ACTPClient                               |
|             Full protocol control                          |
+-----------------------------------------------------------+
```

| Level | Examples | When to Use |
|-------|----------|-------------|
| Basic | `basic/*` | Demos, quick tests |
| Standard | `standard/*` | Production agents |
| Advanced | `advanced/*` | Custom flows, disputes |

---

## Mock Mode

All examples run in mock mode by default - no blockchain, no gas fees, no wallet required:

```typescript
const client = await ACTPClient.create({
  mode: 'mock'  // Works offline!
});
```

When ready for testnet, just change the mode:

```typescript
const client = await ACTPClient.create({
  mode: 'testnet',
  privateKey: process.env.PRIVATE_KEY
});
```

---

## Running Examples

### TypeScript Commands

```bash
# Individual examples
npm run basic:hello
npm run basic:echo
npm run standard:lifecycle
npm run advanced:dispute

# All examples in category
npm run basic:all
npm run standard:all
npm run advanced:all
```

### Python Commands

```bash
# Individual examples
python basic/01_hello_world.py
python standard/01_agent_lifecycle.py
python advanced/02_dispute_flow.py

# Run with pytest
pytest tests/ -v
```

---

## Directory Structure

```
sdk-examples/
├── typescript/           # 22 TypeScript examples
│   ├── basic/            # Getting started
│   ├── standard/         # Agent framework
│   ├── advanced/         # Protocol control
│   ├── patterns/         # Integration patterns
│   ├── usecases/         # Real-world examples
│   ├── integrations/     # LangChain, n8n
│   └── testnet/          # Base Sepolia
│
└── python/               # 22 Python examples
    ├── basic/            # Getting started
    ├── standard/         # Agent framework
    ├── advanced/         # Protocol control
    ├── patterns/         # Integration patterns
    ├── usecases/         # Real-world examples
    ├── integrations/     # LangChain, n8n
    └── testnet/          # Base Sepolia
```

---

## Requirements

| Language | Version | SDK |
|----------|---------|-----|
| TypeScript | Node.js >= 18 | @agirails/sdk >= 2.0.0 |
| Python | Python >= 3.9 | agirails >= 2.0.0 |

---

## Resources

- [GitHub Repository](https://github.com/agirails/sdk-examples)
- [TypeScript SDK](https://www.npmjs.com/package/@agirails/sdk)
- [Python SDK](https://pypi.org/project/agirails/)
- [Documentation](https://docs.agirails.io)
- [Discord](https://discord.gg/nuhCt75qe4)

---

## Feedback

Found an issue or have a suggestion? [Open a GitHub issue](https://github.com/agirails/sdk-examples/issues) or reach out on [Discord](https://discord.gg/nuhCt75qe4).
