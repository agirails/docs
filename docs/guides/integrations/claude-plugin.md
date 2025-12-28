---
sidebar_position: 2
title: Claude Code Plugin
description: AI-powered AGIRAILS integration for Claude Code CLI
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Claude Code Plugin

Enable your AI agents to pay each other directly from Claude Code with the official AGIRAILS plugin.

:::info What You'll Learn
By the end of this guide, you'll have:
- **Installed** the AGIRAILS plugin from the Claude Code marketplace
- **Created** your first payment using the interactive `/agirails:pay` command
- **Explored** skills that provide protocol knowledge to Claude
- **Used** agents for complex integration tasks

**Estimated time:** 15 minutes to first payment

**Difficulty:** Beginner (no coding required for basic usage)
:::

---

## Quick Start

```bash
# 1. Install from marketplace
/plugin install agirails

# 2. Initialize SDK in your project
/agirails:init

# 3. Create your first payment
/agirails:pay
```

That's it! The plugin handles language detection, SDK installation, and generates ready-to-use code.

---

## Installation

### From Plugin Marketplace (Recommended)

Install directly from the Claude Code plugin marketplace:

```bash
/plugin install agirails
```

The plugin will be automatically downloaded and activated.

### Verify Installation

After installation, verify the plugin is loaded:

```bash
/plugin list
```

You should see `agirails` in the list with its skills and commands.

---

## Plugin Overview

The AGIRAILS plugin provides three types of capabilities:

| Component | Count | Purpose |
|-----------|-------|---------|
| **Commands** | 8 | Guided workflows for common tasks |
| **Skills** | 6 | Protocol knowledge loaded into context |
| **Agents** | 4 | Autonomous helpers for complex integrations |

---

## Commands Reference

Commands are interactive workflows invoked with `/agirails:<command>`:

### /agirails:init

**Initialize SDK in your project.**

```bash
/agirails:init [--lang ts|py] [--version x.x.x]
```

What it does:
1. Detects project language (TypeScript or Python)
2. Detects package manager (npm, yarn, pnpm, pip, poetry, uv)
3. Installs the appropriate SDK
4. Creates `.actp/` configuration directory
5. Sets up `.env.example` with configuration template
6. Updates `.gitignore` to protect sensitive files
7. Shows quickstart code example

**Example:**
```bash
# Auto-detect language
/agirails:init

# Force TypeScript
/agirails:init --lang ts

# Specific version
/agirails:init --lang py --version 2.0.0
```

---

### /agirails:pay

**Create a payment interactively.**

```bash
/agirails:pay [provider_address] [amount]
```

What it does:
1. Validates SDK installation
2. Collects payment details interactively
3. Shows fee calculation
4. Generates ready-to-use code

**Example output:**

```
Payment Summary:
┌─────────────────────────────────────┐
│ To:       0xAbc...123               │
│ Amount:   $100.00 USDC              │
│ Fee:      $1.00 (1%)                │
│ Total:    $101.00 USDC              │
│ Deadline: 2025-12-28 15:30 UTC      │
│ Mode:     mock (no real funds)      │
└─────────────────────────────────────┘
```

---

### /agirails:status

**Check transaction status.**

```bash
/agirails:status <transaction_id>
```

Shows:
- Current state with visual progress
- Available actions based on state
- Timing information (deadline, dispute window)
- Code snippets for next steps

---

### /agirails:watch

**Monitor transaction in real-time.**

```bash
/agirails:watch <transaction_id>
```

Continuously monitors transaction state changes and notifies you of transitions.

---

### /agirails:states

**Visualize the ACTP state machine.**

```bash
/agirails:states
```

Displays the 8-state transaction lifecycle with valid transitions and terminal states.

---

### /agirails:debug

**Diagnose integration issues.**

```bash
/agirails:debug
```

Checks:
- SDK installation and version
- Configuration files
- Network connectivity
- Balance and allowances

---

### /agirails:example

**Generate working code examples.**

```bash
/agirails:example [type]
```

Types: `requester`, `provider`, `full-cycle`, `dispute`, `batch`

---

### /agirails:upgrade

**Upgrade SDK to latest version.**

```bash
/agirails:upgrade [--version x.x.x]
```

---

## Skills Reference

Skills are protocol knowledge that Claude loads automatically when you discuss related topics.

### agirails-core

**ACTP protocol fundamentals.**

Loaded when discussing: protocol, state machine, escrow, disputes, invariants

Provides:
- 8-state machine details
- Fee calculation rules
- Core invariants
- Access control rules

---

### agirails-agent-building

**Building AI agents that buy/sell services.**

Loaded when discussing: agent development, provider patterns, requester patterns

Provides:
- Provider template code
- Requester template code
- Lifecycle management
- Event handling

---

### agirails-patterns

**Three-tier API and mode selection.**

Loaded when discussing: API tiers, mock mode, testnet mode, which API to use

Provides:
- Basic vs Standard vs Advanced API comparison
- Mode selection guide
- Migration patterns

---

### agirails-security

**Production security checklist.**

Loaded when discussing: security, key management, production deployment

Provides:
- Private key security
- Production checklist
- Common vulnerabilities
- Audit recommendations

---

### agirails-typescript

**TypeScript SDK reference.**

Loaded when discussing: TypeScript implementation, SDK methods, type definitions

Provides:
- API reference
- Error handling patterns
- Type definitions

---

### agirails-python

**Python SDK reference.**

Loaded when discussing: Python implementation, SDK methods, async patterns

Provides:
- API reference
- Async/await patterns
- Error handling

---

## Agents Reference

Agents handle complex, multi-step tasks autonomously.

### integration-wizard

**Full integration walkthrough.**

Use when: "integrate AGIRAILS", "add payments to my agent", "set up ACTP"

What it does:
1. Analyzes your project structure and frameworks
2. Determines if you're a requester, provider, or both
3. Creates tailored integration plan
4. Generates framework-specific code (LangChain, Express, FastAPI, etc.)
5. Guides through testing

---

### testing-assistant

**Generate comprehensive tests.**

Use when: "test my ACTP integration", "write tests for payments"

What it does:
- Generates unit tests for payment flows
- Creates mock mode test scenarios
- Tests edge cases (disputes, cancellations, timeouts)

---

### migration-helper

**SDK version upgrades.**

Use when: "upgrade to v2", "migrate from old SDK"

What it does:
- Identifies breaking changes
- Updates imports and method calls
- Tests after migration

---

### security-auditor

**Proactive security review.**

Use when: "review my integration security", "check for vulnerabilities"

What it does:
- Reviews private key handling
- Checks for common vulnerabilities
- Validates production readiness

---

## Mock Mode

All plugin examples use mock mode by default for safe development:

**Benefits:**
- No real funds or blockchain needed
- State persists locally in `.actp/` directory
- Mint unlimited test USDC
- Instant transactions (no waiting for blocks)

**Switching to Testnet:**

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
const client = await ACTPClient.create({
  mode: 'testnet',  // Change from 'mock'
  requesterAddress: process.env.REQUESTER_ADDRESS,
  privateKey: process.env.PRIVATE_KEY,
});
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
client = await ACTPClient.create(
    mode="testnet",  # Change from 'mock'
    requester_address=os.environ["REQUESTER_ADDRESS"],
    private_key=os.environ["PRIVATE_KEY"],
)
```

</TabItem>
</Tabs>

---

## Workflow Examples

### Example 1: Quick Payment

```bash
# 1. Start payment flow
/agirails:pay

# 2. Enter provider address when prompted
# 3. Enter amount (e.g., 100)
# 4. Select deadline (24 hours recommended)
# 5. Copy generated code and run it
```

### Example 2: Full Integration

```bash
# 1. Ask for integration help
"I'm building a LangChain agent that needs to pay for external services"

# Claude will invoke integration-wizard agent
# 2. Follow the step-by-step guidance
# 3. Review generated code
# 4. Test with /agirails:debug
```

### Example 3: Check Transaction

```bash
# After creating a payment, check its status
/agirails:status 0x1234567890abcdef...

# Monitor for state changes
/agirails:watch 0x1234567890abcdef...
```

---

## Troubleshooting

### Plugin Not Found

```bash
# Verify plugin is installed
/plugin list

# Reinstall if needed
/plugin install agirails
```

### SDK Installation Fails

```bash
# Run debug to identify issues
/agirails:debug

# Common fixes:
# - Check internet connection
# - Verify Node.js 18+ or Python 3.9+
# - Check permissions
```

### Transaction Stuck

```bash
# Check current state and available actions
/agirails:status <txId>

# In mock mode, you can advance time
# In testnet, wait for block confirmation
```

---

## Requirements

- **Claude Code CLI** - Latest version
- **Node.js 18+** (for TypeScript) or **Python 3.9+** (for Python)
- **No blockchain wallet** needed for mock mode
- **Testnet wallet** needed only for Base Sepolia testing

---

## Next Steps

- [SDK Reference](/sdk-reference) - Complete API documentation
- [Examples](/examples) - Working code examples
- [n8n Integration](./n8n) - Visual workflow automation
- [LangChain Integration](./langchain) - Agent framework integration

