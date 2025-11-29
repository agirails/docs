---
sidebar_position: 4
title: n8n Integration
description: Use AGIRAILS with n8n workflow automation to build AI agent payment flows
---

# n8n Integration

Build automated AI agent payment workflows using the official AGIRAILS n8n community node.

## Overview

The `n8n-nodes-actp` package provides native n8n nodes for interacting with the ACTP protocol, enabling you to:

- Create and manage escrow transactions
- Monitor transaction state changes
- Automate payment releases
- Build complex multi-agent workflows

## Installation

### In n8n Cloud

1. Go to **Settings** > **Community Nodes**
2. Click **Install a community node**
3. Enter: `n8n-nodes-actp`
4. Click **Install**

### In Self-Hosted n8n

```bash
# Navigate to your n8n installation
cd ~/.n8n

# Install the ACTP node
npm install n8n-nodes-actp
```

Then restart n8n to load the new node.

### Verify Installation

After installation, you should see the **ACTP** node available in the n8n node palette under the "Action" category.

## Configuration

### Credentials Setup

1. In n8n, go to **Credentials** > **Add Credential**
2. Search for **ACTP API**
3. Configure the following:

| Field | Description | Example |
|-------|-------------|---------|
| **Private Key** | Your wallet's private key (with 0x prefix) | `0x1234...` |
| **RPC URL** | Base Sepolia or Mainnet RPC | `https://sepolia.base.org` |
| **Network** | Target network | `base-sepolia` or `base` |

:::danger Security
Never expose your private key. Use n8n's credential encryption and environment variables in production.
:::

## Available Nodes

### ACTP Transaction Node

The main node for creating and managing ACTP transactions.

#### Operations

| Operation | Description |
|-----------|-------------|
| **Create Transaction** | Initialize a new escrow transaction |
| **Get Transaction** | Retrieve transaction details by ID |
| **Link Escrow** | Link escrow funds to a transaction |
| **Transition State** | Move transaction to next state |
| **Release Escrow** | Release funds to provider |

#### Create Transaction Example

```json
{
  "operation": "createTransaction",
  "provider": "0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
  "amount": "100000000",
  "deadline": 1735689600,
  "serviceRef": "ai-image-generation-job-001"
}
```

### ACTP Trigger Node

Listen for on-chain events and trigger workflows automatically.

#### Supported Events

| Event | Description |
|-------|-------------|
| **TransactionCreated** | New transaction initiated |
| **EscrowLinked** | Funds locked in escrow |
| **StateTransitioned** | Transaction state changed |
| **EscrowReleased** | Funds released to provider |
| **DisputeRaised** | Consumer disputed delivery |

## Example Workflows

### Basic Payment Flow

This workflow creates a transaction when a webhook is received and releases payment upon completion:

```
[Webhook] → [ACTP: Create Transaction] → [Wait for Delivery] → [ACTP: Release Escrow]
```

1. **Webhook Node**: Receives job request from AI agent
2. **ACTP Create**: Creates escrow transaction with provider address
3. **Wait Node**: Polls for DELIVERED state
4. **ACTP Release**: Releases funds to provider

### Automated Service Provider

Build an AI agent that automatically accepts jobs and delivers results:

```
[ACTP Trigger: TransactionCreated] → [Filter: My Address] → [AI Service] → [ACTP: Deliver] → [Notify]
```

1. **ACTP Trigger**: Listens for new transactions targeting your address
2. **Filter**: Only process transactions where you're the provider
3. **AI Service**: Execute your AI service (e.g., call OpenAI, run local model)
4. **ACTP Deliver**: Submit delivery proof and transition to DELIVERED
5. **Notify**: Send confirmation via Slack/Email

### Multi-Agent Orchestration

Coordinate multiple AI agents with sequential payments:

```
[Start] → [ACTP: Pay Agent 1] → [Wait] → [ACTP: Pay Agent 2] → [Wait] → [Aggregate Results]
```

## Troubleshooting

### "Invalid private key"

Ensure your private key:
- Starts with `0x`
- Is exactly 66 characters (0x + 64 hex chars)
- Has no whitespace

### "Insufficient funds"

Check that your wallet has:
- ETH for gas fees (get from [Coinbase Faucet](https://portal.cdp.coinbase.com/products/faucet))
- USDC for transaction amounts

### "Transaction reverted"

Common causes:
- Transaction already in terminal state
- Deadline has passed
- Insufficient escrow balance
- Wrong caller (only requester/provider can perform certain actions)

### Node not appearing

1. Restart n8n after installation
2. Clear browser cache
3. Check n8n logs for loading errors:
   ```bash
   n8n start --tunnel 2>&1 | grep -i actp
   ```

## Contract Addresses

The n8n node uses these deployed contracts:

### Base Sepolia (Testnet)

| Contract | Address |
|----------|---------|
| ACTPKernel | `0x6aDB650e185b0ee77981AC5279271f0Fa6CFe7ba` |
| EscrowVault | `0x921edE340770db5DB6059B5B866be987d1b7311F` |
| Mock USDC | `0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb` |

## Resources

- [n8n-nodes-actp on npm](https://www.npmjs.com/package/n8n-nodes-actp)
- [GitHub Repository](https://github.com/agirails/n8n-nodes-actp)
- [n8n Documentation](https://docs.n8n.io/)
- [Core Concepts](./concepts/) - Understand the ACTP protocol

## Next Steps

- [Quick Start](./quick-start) - Create your first transaction
- [Installation Guide](./installation) - Set up the ACTP SDK
- [Discord](https://discord.gg/nuhCt75qe4) - Get help from the community
