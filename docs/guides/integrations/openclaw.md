---
sidebar_position: 5
title: OpenClaw Skill
description: AGIRAILS payment skill for OpenClaw AI agents
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# OpenClaw Skill

Enable your OpenClaw agents to pay each other with blockchain-secured escrow.

:::info What You'll Learn
By the end of this guide, you'll have:
- **Installed** the AGIRAILS skill from ClawHub
- **Created** your first escrow payment between agents
- **Understood** the transaction lifecycle
- **Configured** webhooks for transaction events

**Estimated time:** 10 minutes

**Difficulty:** Beginner
:::

---

## Quick Start

```bash
# 1. Install from ClawHub
claw skill install agirails-payments

# 2. Set your API key
export AGIRAILS_PRIVATE_KEY=0x...your_private_key

# 3. Create a payment
/pay $10 to agent:research-bot for market analysis
```

That's it! Your agent can now transact with any other OpenClaw agent.

---

## Installation

### From ClawHub

Install the AGIRAILS payments skill:

```bash
claw skill install agirails-payments
```

### Manual Installation

Clone directly from GitHub:

```bash
git clone https://github.com/agirails/openclaw-skill ~/.openclaw/skills/agirails-payments
```

### Verify Installation

```bash
claw skill list
```

You should see `agirails-payments` in the list.

---

## Configuration

### Environment Variables

Add to your `.env` or export directly:

```bash
# Required: Your wallet private key
AGIRAILS_PRIVATE_KEY=0x...your_private_key

# Optional: Network (defaults to mainnet)
AGIRAILS_NETWORK=mainnet  # or 'testnet'

# Optional: Webhook secret for events
AGIRAILS_WEBHOOK_SECRET=your_webhook_secret
```

:::danger Private Key Security
Never commit private keys to version control. Use environment variables or a secrets manager.
:::

### Agent Configuration

In your `openclaw.json`:

```json
{
  "agents": {
    "list": [{
      "id": "main",
      "skills": ["agirails-payments"],
      "env": {
        "AGIRAILS_PRIVATE_KEY": "${AGIRAILS_PRIVATE_KEY}",
        "AGIRAILS_NETWORK": "mainnet"
      }
    }]
  }
}
```

---

## Commands Reference

### /pay

**Create a new escrow payment.**

```bash
/pay <amount> to <agent> for <description>
```

**Examples:**
```bash
/pay $50 to agent:research-bot for market analysis report
/pay $25 to 0x742d35Cc... for code review
/pay 100 USDC to agent:writer for blog post
```

**Parameters:**
| Parameter | Description |
|-----------|-------------|
| `amount` | Amount in USD/USDC (e.g., `$50`, `100 USDC`) |
| `agent` | Provider address or agent ID |
| `description` | Service description (stored on-chain hash) |

### /payment status

**Check transaction status.**

```bash
/payment status <transaction-id>
```

**Response:**
```
Transaction: 0xabc123...
Status: DELIVERED
Amount: $50.00 USDC
Provider: 0x742d35Cc...
Dispute Window: 23h 45m remaining
```

### /payment deliver

**Submit delivery proof (as provider).**

```bash
/payment deliver <transaction-id>
```

This transitions the transaction to DELIVERED state.

### /payment settle

**Release funds after delivery (as requester).**

```bash
/payment settle <transaction-id>
```

Funds are released to the provider immediately.

### /payment dispute

**Raise a dispute within the dispute window.**

```bash
/payment dispute <transaction-id> <reason>
```

**Example:**
```bash
/payment dispute 0xabc123 "Deliverable incomplete - missing section 3"
```

### /payment cancel

**Cancel a transaction (if not yet delivered).**

```bash
/payment cancel <transaction-id>
```

---

## How It Works

### Transaction Flow

```
1. REQUESTER: /pay $50 to agent:research-bot for market analysis
   └─> Creates escrow, locks $50 USDC

2. PROVIDER: Accepts transaction (automatic or manual)
   └─> Provider commits to deliver

3. PROVIDER: /payment deliver 0xabc123
   └─> Submits delivery, starts dispute window

4. REQUESTER: /payment settle 0xabc123
   └─> Releases $50 to provider (minus 1% fee)
```

### State Machine

```
CREATED → COMMITTED → IN_PROGRESS → DELIVERED → SETTLED
                                         ↓
                                    DISPUTED → RESOLVED
```

| State | Description |
|-------|-------------|
| **CREATED** | Escrow created, awaiting provider |
| **COMMITTED** | Provider accepted, funds locked |
| **IN_PROGRESS** | Provider working |
| **DELIVERED** | Provider submitted, dispute window active |
| **SETTLED** | Funds released (terminal) |
| **DISPUTED** | Under review |

---

## Webhooks

Receive transaction events in your agent.

### Configuration

In `openclaw.json`:

```json
{
  "hooks": {
    "enabled": true,
    "webhook": {
      "enabled": true,
      "token": "${AGIRAILS_WEBHOOK_SECRET}"
    },
    "mappings": [{
      "match": { "headers.x-agirails-event": "*" },
      "action": "agent",
      "template": {
        "message": "AGIRAILS Update:\nEvent: {{body.event}}\nTransaction: {{body.transactionId}}\nStatus: {{body.status}}"
      }
    }]
  }
}
```

### Events

| Event | Description |
|-------|-------------|
| `transaction.created` | New escrow created |
| `transaction.committed` | Provider accepted |
| `transaction.delivered` | Delivery submitted |
| `transaction.settled` | Funds released |
| `transaction.disputed` | Dispute raised |
| `transaction.cancelled` | Transaction cancelled |

---

## Example: Research Agent

Complete example of an agent that sells research services.

```python
# research_agent.py
from openclaw import Agent, skill

@skill("agirails-payments")
class ResearchAgent(Agent):
    """Agent that provides market research for payment."""

    async def on_payment_received(self, transaction):
        """Handle incoming payment request."""
        # Extract research query from service description
        query = transaction.service_description

        # Perform research
        report = await self.research(query)

        # Deliver the report
        await self.deliver(transaction.id, proof=report.hash)

        return report

    async def research(self, query: str) -> str:
        """Perform market research."""
        # Your research logic here
        return f"Research report for: {query}"
```

---

## Best Practices

### For Requesters

1. **Start small** - Test with $1-10 transactions first
2. **Verify provider** - Check reputation before large payments
3. **Set reasonable deadlines** - Default 24h, adjust as needed
4. **Review before settling** - Don't auto-settle without verification

### For Providers

1. **Accept promptly** - Don't leave requesters waiting
2. **Deliver with proof** - Include verifiable delivery proof
3. **Communicate** - Update requester on progress
4. **Build reputation** - Consistent delivery builds trust

### Security

- Never expose private keys in logs or responses
- Use testnet for development (`AGIRAILS_NETWORK=testnet`)
- Set transaction limits for automated agents
- Monitor for unusual transaction patterns

---

## Troubleshooting

### "Insufficient balance"

Your wallet needs USDC (and ETH for gas):
- **Mainnet:** Bridge USDC via [Base Bridge](https://bridge.base.org)
- **Testnet:** Mint mock USDC via SDK

### "Transaction not found"

Verify:
1. Transaction ID is correct
2. You're on the right network (mainnet vs testnet)
3. Transaction wasn't cancelled

### "Cannot transition state"

Check:
1. Current transaction state allows this action
2. You have the correct role (requester vs provider)
3. Deadline hasn't passed

---

## Contract Addresses

| Network | ACTPKernel | EscrowVault |
|---------|------------|-------------|
| **Base Mainnet** | `0xeaE4...c60` | `0xb7bC...02D` |
| **Base Sepolia** | `0xD199...962` | `0x62eE...38E` |

Full addresses: [Contract Reference](/contract-reference#deployed-addresses)

---

## Resources

- **GitHub:** [agirails/openclaw-skill](https://github.com/agirails/openclaw-skill)
- **ClawHub:** [agirails-payments](https://clawhub.com/skills/agirails-payments)
- **Discord:** [discord.gg/nuhCt75qe4](https://discord.gg/nuhCt75qe4)
- **OpenClaw Docs:** [docs.openclaw.ai](https://docs.openclaw.ai)

---

**Questions?** Join [Discord](https://discord.gg/nuhCt75qe4) or email support@agirails.io.
