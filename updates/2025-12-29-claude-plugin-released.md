---
slug: claude-plugin-released
title: "AGIRAILS Claude Plugin: AI-Assisted Payment Integration"
authors: [sdk-team]
tags: [release, ecosystem]
---

The AGIRAILS Claude Plugin brings AI-assisted development to ACTP integration. Install it in Claude Code to get contextual help, guided workflows, and proactive security reviews.

<!-- truncate -->

## Installation

```bash
/plugin install agirails
```

**GitHub:** [agirails/claude-plugin](https://github.com/agirails/claude-plugin)

---

## What's Included

The plugin provides three types of assistance:

| Component | Count | Purpose |
|-----------|-------|---------|
| **Commands** | 8 | Guided workflows for common tasks |
| **Skills** | 6 | Protocol knowledge in Claude's context |
| **Agents** | 3 | Autonomous helpers for complex tasks |

---

## Commands

Interactive workflows that guide you through common tasks:

| Command | Description |
|---------|-------------|
| `/agirails:init` | Set up SDK in your project |
| `/agirails:pay` | Create a payment interactively |
| `/agirails:status` | Check transaction status |
| `/agirails:watch` | Monitor transaction in real-time |
| `/agirails:debug` | Diagnose integration issues |
| `/agirails:states` | Visualize ACTP state machine |
| `/agirails:upgrade` | Upgrade SDK version |
| `/agirails:example` | Generate working code examples |

### Example: Creating a Payment

```
> /agirails:pay

Payment Summary:
+-------------------------------------+
| To:       0xAbc...123               |
| Amount:   $100.00 USDC              |
| Fee:      $1.00 (1%)                |
| Total:    $101.00 USDC              |
| Deadline: 2025-12-30 15:30 UTC      |
| Mode:     mock (no real funds)      |
+-------------------------------------+

Proceed?
Options: [Create Payment] [Edit Details] [Cancel]
```

The command validates inputs, calculates fees, and generates ready-to-use code in your project's language.

---

## Skills

Skills provide contextual knowledge when you discuss AGIRAILS topics:

| Skill | Triggers When Discussing |
|-------|--------------------------|
| **agirails-core** | ACTP protocol, state machine, invariants |
| **agirails-patterns** | API tiers, mode selection |
| **agirails-security** | Production readiness, key management |
| **agirails-typescript** | TypeScript SDK patterns |
| **agirails-python** | Python SDK patterns |

Skills activate automatically. Ask "How does the ACTP state machine work?" and Claude will have the full 8-state specification in context.

---

## Agents

Agents handle complex, multi-step tasks autonomously:

### Integration Wizard

Guides you through end-to-end SDK integration:

```
> "I'm building a LangChain agent and want to add payment functionality"

Claude: "I'll use the integration-wizard agent to guide you through
integrating AGIRAILS with your LangChain agent."
```

The wizard:
1. Analyzes your project structure
2. Detects your framework (LangChain, Express, FastAPI, etc.)
3. Creates a tailored integration plan
4. Generates framework-specific code
5. Sets up testing patterns

### Testing Assistant

Generates comprehensive tests for your ACTP integration:
- Happy path tests
- Edge cases (deadlines, disputes, cancellations)
- Mock mode tests for CI/CD
- Testnet integration tests

### Security Auditor

Proactively reviews code for vulnerabilities:

```
SECURITY AUDIT REPORT
=====================

CRITICAL: 0
HIGH: 1
MEDIUM: 2

[H1] Missing rate limiting on /api/payments
     File: src/routes/payments.ts:15
     Fix: Add express-rate-limit middleware

PRODUCTION READINESS: CONDITIONAL
Address HIGH severity issues before deploying.
```

The auditor scans for:
- Hardcoded private keys
- Missing input validation
- Verbose error messages
- Missing rate limiting
- Outdated SDK versions

---

## Proactive Hooks

The plugin includes hooks that activate automatically:

| Hook | Trigger | Action |
|------|---------|--------|
| **Project Detection** | Session start | Detects AGIRAILS SDK, shows available commands |
| **Security Review** | Writing payment code | Scans for hardcoded keys, validation issues |
| **Testnet Reminder** | Setting `mode: 'mainnet'` | Reminds to test on testnet first |

---

## Quick Start

### 1. Install Plugin

```bash
/plugin install agirails
```

### 2. Initialize SDK

```bash
/agirails:init
```

This detects your language (TypeScript or Python), installs the SDK, and creates configuration files.

### 3. Create Your First Payment

```bash
/agirails:pay
```

Follow the interactive prompts to generate payment code.

### 4. Understand the State Machine

```bash
/agirails:states
```

Visualizes the 8-state ACTP transaction lifecycle.

---

## Language Support

| Feature | TypeScript | Python |
|---------|------------|--------|
| SDK Installation | `npm install @agirails/sdk` | `pip install agirails` |
| Code Generation | Full support | Full support |
| Examples | Included | Included |
| Framework Detection | Node.js, Express, LangChain | FastAPI, Django, CrewAI |

---

## Mock Mode by Default

All generated code uses mock mode:

```typescript
const client = await ACTPClient.create({
  mode: 'mock', // No blockchain needed
  requesterAddress: '0x...',
});
```

Mock mode features:
- No gas fees or wallet required
- Instant transactions
- Persistent state in `.actp/` directory
- Mint unlimited test USDC

---

## Requirements

- Claude Code CLI
- Node.js 18+ (TypeScript) or Python 3.9+ (Python)
- No blockchain wallet needed for development

---

## Resources

- [Plugin Repository](https://github.com/agirails/claude-plugin)
- [Documentation](https://docs.agirails.io)
- [SDK Reference](https://docs.agirails.io/sdk)
- [Discord](https://discord.gg/nuhCt75qe4)

---

## Feedback

Found an issue? [Open a GitHub issue](https://github.com/agirails/claude-plugin/issues) or reach out on [Discord](https://discord.gg/nuhCt75qe4).
