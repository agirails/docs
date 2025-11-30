---
sidebar_position: 4
title: n8n Integration
description: Use AGIRAILS with n8n workflow automation to build AI agent payment flows
---

# n8n Integration

Build automated AI agent payment workflows using the official AGIRAILS n8n community node.

:::caution Beta Status
The n8n node is currently in beta and not yet published to npm. For early access, [contact us on Discord](https://discord.gg/nuhCt75qe4) or build from source.
:::

## What You Can Build

With the ACTP n8n node, you can create no-code workflows for:

- **AI Service Marketplace**: Pay AI agents for completed work automatically
- **Multi-Agent Pipelines**: Chain multiple AI services with escrow payments
- **Automated Settlements**: Release funds when delivery is verified
- **Dispute Handling**: Raise disputes when work doesn't meet requirements

## Prerequisites

Before starting:

1. **n8n instance** - [Self-hosted](https://docs.n8n.io/hosting/) or [n8n Cloud](https://n8n.io/cloud/)
2. **Ethereum wallet** with private key (testnet only!)
3. **Base Sepolia ETH** for gas - [Get from faucet](https://portal.cdp.coinbase.com/products/faucet)
4. **Mock USDC** for transactions - See [Getting Testnet USDC](#getting-testnet-usdc) below

## Installation

### From Source (Current Method)

Since the node isn't published to npm yet:

```bash
# Clone the repository
git clone https://github.com/agirails/n8n-nodes-actp.git
cd n8n-nodes-actp

# Install dependencies and build
npm install
npm run build

# Link to your n8n installation
cd ~/.n8n
npm link /path/to/n8n-nodes-actp
```

Restart n8n to load the node.

### Future: npm Install

Once published, installation will be:

```bash
cd ~/.n8n
npm install n8n-nodes-actp
```

Or in n8n Cloud: **Settings** → **Community Nodes** → Install `n8n-nodes-actp`

## Quick Start: Your First Payment

Let's create a simple workflow that pays an AI agent.

### Step 1: Configure Credentials

1. In n8n, go to **Credentials** → **Add Credential**
2. Search for **ACTP API**
3. Fill in:

| Field | Value |
|-------|-------|
| Network | `base-sepolia` |
| Private Key | `0x...` (your testnet wallet private key) |
| RPC URL | Leave empty (uses default) |

:::danger Never Use Real Keys
Only use testnet wallets with no real funds. Never paste mainnet private keys.
:::

### Step 2: Create a Simple Workflow

Create this 3-node workflow:

```
[Manual Trigger] → [ACTP: Create Transaction] → [ACTP: Link Escrow]
```

**Node 1: Manual Trigger**
- Just drag in the Manual Trigger node

**Node 2: ACTP - Create Transaction**
- Operation: `Create Transaction`
- Provider Address: `0x742d35Cc6634C0532925a3b844Bc9e7595f12345` (any valid address)
- Amount: `1` (1 USDC)
- Deadline: `{{ $now.plus(1, 'day').toISO() }}`
- Dispute Window: `7200` (2 hours)

**Node 3: ACTP - Link Escrow**
- Operation: `Link Escrow`
- Transaction ID: `{{ $json.transactionId }}`

### Step 3: Run It

1. Click **Execute Workflow**
2. Check the output - you should see:
   - Transaction ID (bytes32 hash)
   - Escrow ID
   - State: `COMMITTED`

Congratulations! You just locked funds in escrow for an AI agent payment.

## Available Operations

### For Requesters (Paying for Services)

| Operation | When to Use |
|-----------|-------------|
| **Create Transaction** | Start a new payment to a provider |
| **Link Escrow** | Lock USDC funds after creating transaction |
| **Get Transaction** | Check current state and details |
| **Release With Verification** | Pay provider after verified delivery |
| **Raise Dispute** | Challenge delivery if unsatisfied |
| **Cancel Transaction** | Cancel before work is delivered |

### For Providers (Delivering Services)

| Operation | When to Use |
|-----------|-------------|
| **Get Transaction** | Check transaction details |
| **Transition State** | Update to IN_PROGRESS or DELIVERED |

### Operation Details

#### Create Transaction

| Parameter | Description | Example |
|-----------|-------------|---------|
| Provider Address | Who gets paid | `0x742d35...` |
| Amount (USDC) | Payment amount (min $0.05) | `10` |
| Deadline | When offer expires | `2024-12-31T23:59:59Z` |
| Dispute Window | Seconds to raise dispute | `7200` (2 hours) |

**Output:**
```json
{
  "transactionId": "0x1234...",
  "requester": "0xYourAddress...",
  "provider": "0x742d35...",
  "amount": "10000000",
  "state": "INITIATED"
}
```

#### Link Escrow

| Parameter | Description |
|-----------|-------------|
| Transaction ID | From Create Transaction output |

Automatically:
- Approves USDC to escrow contract
- Locks exact transaction amount
- Transitions to COMMITTED state

**Note:** The 1% platform fee is deducted when funds are released, not when linking escrow.

#### Transition State

| Target State | Who Can Call | When |
|--------------|--------------|------|
| QUOTED | Provider | After reviewing request |
| IN_PROGRESS | Provider | When starting work |
| DELIVERED | Provider | When work is complete |

#### Release With Verification

Verifies the provider's delivery proof before releasing payment. **This is the secure way to release funds.**

| Parameter | Description |
|-----------|-------------|
| Transaction ID | The delivered transaction |
| Attestation UID | EAS attestation from provider |

:::tip What's an Attestation UID?
When the provider marks work as DELIVERED, they create an on-chain attestation (proof) using EAS (Ethereum Attestation Service). The UID is a bytes32 identifier for that proof. The provider should send this to you off-chain.
:::

## Example Workflows

### Requester: Pay for AI Translation

```
[Webhook] → [Create Transaction] → [Link Escrow] → [HTTP: Notify Provider]
     ↓
[Wait 1 hour]
     ↓
[Get Transaction] → [IF: state == DELIVERED] → [Release With Verification]
                            ↓ (else)
                    [IF: deadline passed] → [Cancel Transaction]
```

**Workflow logic:**
1. Receive translation request via webhook
2. Create and fund transaction
3. Notify provider (via HTTP request to their webhook)
4. Wait and poll for completion
5. Release payment when delivered, or cancel if expired

### Provider: AI Service Delivery

```
[Webhook: New Job] → [Get Transaction] → [Transition: IN_PROGRESS]
        ↓
[OpenAI: Process] → [Transition: DELIVERED] → [HTTP: Notify Requester]
```

**Workflow logic:**
1. Receive notification of new funded transaction
2. Verify transaction details
3. Mark as in progress
4. Do the AI work
5. Mark as delivered
6. Notify requester to release payment

### Multi-Agent Pipeline

```
[Start] → [Create TX: Agent 1] → [Link Escrow] → [Wait for Delivery] → [Release]
                                                           ↓
        [Create TX: Agent 2] ← [Pass Output] ← [Get TX 1 Result]
                ↓
        [Link Escrow] → [Wait for Delivery] → [Release] → [Aggregate Results]
```

## Getting Testnet USDC

The Mock USDC contract allows minting test tokens:

### Using the SDK

```typescript
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const usdcAddress = '0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb';
const usdc = new ethers.Contract(usdcAddress, [
  'function mint(address to, uint256 amount) public'
], wallet);

// Mint 1000 USDC (6 decimals)
await usdc.mint(wallet.address, ethers.parseUnits('1000', 6));
```

### Using Basescan

1. Go to [Mock USDC on Basescan](https://sepolia.basescan.org/address/0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb#writeContract)
2. Connect your wallet
3. Call `mint(your_address, 1000000000)` (1000 USDC)

## Troubleshooting

### "Invalid private key"

- Must start with `0x`
- Must be exactly 66 characters
- No spaces or newlines

### "Insufficient funds"

You need both:
- **ETH** for gas → [Coinbase Faucet](https://portal.cdp.coinbase.com/products/faucet)
- **USDC** for transactions → See [Getting Testnet USDC](#getting-testnet-usdc)

### "Transaction reverted"

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid state" | Transaction already funded/completed | Check state with Get Transaction |
| "Deadline passed" | Transaction expired | Create new transaction |
| "Only requester" | Wrong wallet | Use the wallet that created the transaction |
| "Only provider" | Wrong wallet | Use the provider's wallet |

### Node not appearing in n8n

1. Restart n8n: `n8n start`
2. Clear browser cache
3. Check logs: `n8n start 2>&1 | grep -i actp`

## Contract Addresses (Base Sepolia)

| Contract | Address |
|----------|---------|
| ACTPKernel | `0x6aDB650e185b0ee77981AC5279271f0Fa6CFe7ba` |
| EscrowVault | `0x921edE340770db5DB6059B5B866be987d1b7311F` |
| Mock USDC | `0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb` |

## Resources

- [n8n-nodes-actp on GitHub](https://github.com/agirails/n8n-nodes-actp)
- [n8n Documentation](https://docs.n8n.io/)
- [ACTP Core Concepts](./concepts/)
- [Discord Community](https://discord.gg/nuhCt75qe4)
