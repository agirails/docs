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
| **Network** | Target network (currently testnet only) | `base-sepolia` |
| **Private Key** | Your wallet's private key (with 0x prefix) | `0x1234...` |
| **RPC URL** | Optional custom RPC endpoint (leave empty for default) | `https://sepolia.base.org` |

:::danger Security
Never expose your private key. Use n8n's credential encryption and environment variables in production.
:::

## Available Operations

The ACTP node provides these operations:

| Operation | Description | Role |
|-----------|-------------|------|
| **Create Transaction** | Initialize a new escrow transaction | Requester |
| **Link Escrow** | Lock funds in escrow (auto-calculates amount + 1% fee) | Requester |
| **Get Transaction** | Retrieve transaction details and current state | Any |
| **Transition State** | Move to QUOTED, IN_PROGRESS, DELIVERED (provider) or SETTLED (requester) | Provider/Requester |
| **Release With Verification** | Verify attestation and release escrow atomically (recommended) | Requester |
| **Verify Attestation** | Verify delivery attestation before releasing | Requester |
| **Release Escrow (Legacy)** | Release funds without verification (not recommended) | Requester |
| **Raise Dispute** | Raise a dispute on delivered transaction | Requester |
| **Cancel Transaction** | Cancel transaction before delivery | Requester |

### Create Transaction

Creates a new ACTP transaction with escrow.

**Parameters:**
- **Provider Address**: Ethereum address of the service provider
- **Amount (USDC)**: Transaction amount (minimum $0.05)
- **Deadline**: ISO date string or Unix timestamp
- **Dispute Window**: Duration in seconds (default: 172800 = 2 days)

### Link Escrow

Locks funds in the escrow vault. If amount is not specified, automatically calculates transaction amount + 1% fee.

**Parameters:**
- **Transaction ID**: The transaction to link escrow to
- **Escrow Amount**: Optional - auto-calculated if not provided

### Transition State

Moves the transaction through states. Typically used by provider, but SETTLED can be triggered by requester.

**Target States:**
- **Quoted**: Provider submitted price quote (optional)
- **In Progress**: Provider actively working (optional)
- **Delivered**: Provider completed work
- **Settled**: Release escrow to provider and finalize (requester)

### Release With Verification

Atomically verifies the EAS attestation and releases escrow. This is the **recommended** way to release funds.

**Parameters:**
- **Transaction ID**: The delivered transaction
- **Attestation UID**: EAS attestation UID (bytes32) from provider's delivery

### Verify Attestation

Verifies a delivery attestation without releasing escrow. Use this to check attestation validity before deciding to release.

**Parameters:**
- **Transaction ID**: The transaction to verify
- **Attestation UID**: EAS attestation UID (bytes32) to verify

**Returns:** `verified: true/false`

### Release Escrow (Legacy)

:::warning Not Recommended
This operation releases escrow **without** verifying the delivery attestation. Use "Release With Verification" instead for secure payments.
:::

**Parameters:**
- **Transaction ID**: The transaction to release

### Raise Dispute

Raises a dispute on a delivered transaction. Only available when transaction is in DELIVERED state.

**Parameters:**
- **Transaction ID**: The delivered transaction
- **Dispute Reason**: Text explanation of why you're disputing (required)
- **Evidence**: Optional supporting evidence (IPFS hash, URLs, etc.)

### Cancel Transaction

Cancels a transaction before delivery. Uses `transitionState` internally to move to CANCELLED state.

**Parameters:**
- **Transaction ID**: The transaction to cancel

:::info
Cancellation is only possible before the transaction reaches DELIVERED state.
:::

## Example Workflows

### Requester Flow (Pay for AI Service)

This workflow creates a transaction, waits for delivery, and releases payment:

```
[Webhook] → [ACTP: Create Transaction] → [ACTP: Link Escrow] → [Wait] → [ACTP: Get Transaction] → [IF: DELIVERED] → [ACTP: Release With Verification]
```

1. **Webhook**: Receives job request
2. **Create Transaction**: Initializes transaction with provider address
3. **Link Escrow**: Locks USDC funds
4. **Wait**: Polls periodically (use n8n's Wait node)
5. **Get Transaction**: Check current state
6. **IF Node**: Check if state is DELIVERED
7. **Release With Verification**: Verify attestation and release funds

### Provider Flow (Deliver AI Service)

Build an AI agent that delivers results when notified:

```
[Webhook: Job Notification] → [AI Service] → [ACTP: Transition State (DELIVERED)] → [Notify]
```

1. **Webhook**: Receives notification that work is needed (off-chain)
2. **AI Service**: Execute your AI service (OpenAI, local model, etc.)
3. **Transition State**: Move transaction to DELIVERED
4. **Notify**: Send confirmation via Slack/Email

:::tip Polling for New Transactions
Since there's no trigger node yet, providers can poll for new transactions using a Schedule Trigger + Get Transaction flow, or receive off-chain notifications via webhooks.
:::

### Multi-Agent Orchestration

Coordinate multiple AI agents with sequential payments:

```
[Start] → [ACTP: Create + Link (Agent 1)] → [Wait for Delivery] → [Release] → [ACTP: Create + Link (Agent 2)] → [Wait] → [Release] → [Aggregate Results]
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
