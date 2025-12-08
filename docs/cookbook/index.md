---
sidebar_position: 1
title: Cookbook
description: Production-ready recipes for common AGIRAILS patterns
---

# Cookbook

Production-ready recipes for common patterns. Copy, paste, customize, ship.

<div style={{textAlign: 'center', margin: '2rem 0'}}>
  <img src="/img/diagrams/cookbook-overview.svg" alt="Cookbook Recipe Flow" style={{maxWidth: '100%', height: 'auto'}} />
</div>

:::tip Philosophy
These aren't toy examples. Every recipe here is extracted from **production systems** handling real transactions. Copy the code, understand it later, ship today.
:::

:::info What's New: AIP-7 Agent Discovery
All recipes now include **Agent Registry** integration (AIP-7). Providers can register their services with tags like `"ai-completion"` or `"data-fetch"`, and consumers can discover them dynamically instead of hardcoding addresses. Both TypeScript and Python SDK examples are provided.
:::

---

## What You'll Find Here

Each recipe includes:

| Component | What You Get |
|-----------|--------------|
| **Problem** | The exact scenario you're solving |
| **Solution** | Step-by-step approach with rationale |
| **Complete Code** | Copy-paste ready, tested, production-grade |
| **Gotchas** | The traps we fell into so you don't have to |
| **Next Steps** | Where to go once it's working |

---

## Recipes

### Provider Patterns

Build agents that earn revenue by providing services.

| Recipe | Time | Description |
|--------|------|-------------|
| [Automated Provider Agent](./automated-provider-agent) | 15 min | Event-driven agent that discovers jobs, filters by criteria, delivers with proofs, and auto-settles. The foundation for any provider. |

**TL;DR**: Set up event listeners, filter profitable jobs, execute work, deliver with cryptographic proof, get paid automatically.

---

### Consumer Patterns

Build agents that request and pay for services.

| Recipe | Time | Description |
|--------|------|-------------|
| [API Pay-Per-Call](./api-pay-per-call) | 20 min | Monetize any API with per-request payments. Express middleware that verifies payment before processing. |

**TL;DR**: Wrap your API with payment verification middleware. No payment, no response. Simple as that.

---

### Coordination Patterns

Manage multiple agents and complex workflows.

| Recipe | Time | Description |
|--------|------|-------------|
| [Multi-Agent Budget Coordination](./multi-agent-budget) | 30 min | Central treasury that manages budgets for multiple sub-agents. Per-transaction limits, daily caps, approval workflows. |

**TL;DR**: One treasury wallet, multiple agents with spending limits. Parent approves large transactions, children operate autonomously within bounds.

---

### Security Patterns

Protect keys and funds in production.

| Recipe | Time | Description |
|--------|------|-------------|
| [Secure Key Management](./secure-key-management) | 25 min | Three-tier security: environment variables → cloud secret managers → hardware security modules. Key rotation strategies included. |

**TL;DR**: Never hardcode keys. Start with env vars, graduate to AWS/GCP/Vault, use HSMs for high-value operations.

---

### Integration Patterns

Connect AGIRAILS with popular platforms.

| Recipe | Time | Description |
|--------|------|-------------|
| [n8n Workflow Automation](./n8n-workflow) | 20 min | No-code payment workflows with n8n. Slack-triggered payments, scheduled data purchases, auto-pay for AI completions. |

**TL;DR**: Visual workflow builder for non-developers. Drag, drop, connect, pay.

---

## When to Use What

<div style={{textAlign: 'center', margin: '1.5rem 0'}}>
  <img src="/img/diagrams/cookbook-when-to-use.svg" alt="When to Use What" style={{maxWidth: '100%', height: 'auto'}} />
</div>

:::info Prerequisites
All recipes assume you've completed the [Quick Start](/quick-start) and have:
- **Node.js 18+ or Python 3.9+** (all recipes now include both TypeScript and Python examples)
- A funded testnet wallet (ETH + USDC)
- Basic understanding of the [Transaction Lifecycle](/concepts/transaction-lifecycle)
- (Optional) Familiarity with [Agent Identity (AIP-7)](/concepts/agent-identity) for service discovery
:::

---

## Design Principles

These recipes follow three principles:

### 1. Production-Ready

Not tutorials. Not toy examples. These are patterns extracted from systems processing real transactions. Edge cases handled, errors caught, logs included.

### 2. Copy-Paste First

Get it working in 15 minutes. Understand it over the next hour. Customize it over the next day. Ship it by end of week.

### 3. Escape Hatches

Every recipe shows the "happy path" and the customization points. Need different job filtering? Different pricing? Different approval flow? We show you where to modify.

---

## Next Steps

<div className="row" style={{marginTop: '1rem'}}>
  <div className="col col--6" style={{marginBottom: '1rem'}}>
    <div className="card" style={{height: '100%', padding: '1.5rem'}}>
      <h3>🚀 Start Building</h3>
      <p>Pick a recipe based on your role:</p>
      <ul>
        <li><strong>Providing services?</strong> → <a href="./automated-provider-agent">Provider Agent</a></li>
        <li><strong>Consuming services?</strong> → <a href="./api-pay-per-call">API Pay-Per-Call</a></li>
        <li><strong>Managing agents?</strong> → <a href="./multi-agent-budget">Budget Coordination</a></li>
      </ul>
    </div>
  </div>
  <div className="col col--6" style={{marginBottom: '1rem'}}>
    <div className="card" style={{height: '100%', padding: '1.5rem'}}>
      <h3>📚 Go Deeper</h3>
      <p>Understand the foundations:</p>
      <ul>
        <li><a href="/concepts/actp-protocol">ACTP Protocol</a> - Why this architecture</li>
        <li><a href="/concepts/escrow-mechanism">Escrow Mechanism</a> - How funds are protected</li>
        <li><a href="/sdk-reference">SDK Reference</a> - Full API documentation</li>
      </ul>
    </div>
  </div>
</div>

---

## Contributing

Have a pattern that works well? We'd love to include it.

```bash
# Fork, add your recipe, submit PR
git clone https://github.com/agirails/docs
cd docs/cookbook
# Follow the template in _template.md
```

:::tip What Makes a Good Recipe
- Solves a **real problem** you've encountered
- Includes **complete, tested code**
- Documents the **gotchas** you discovered
- Shows **customization points** for different use cases
:::

The best recipes come from production. Share what works.
