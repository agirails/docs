---
slug: testnet-refresh-n8n-v23
title: "Testnet Redeployment & n8n Node v2.3 with x402 and ERC-8004"
authors: [agirails]
tags: [release, developer-experience]
---

Fresh testnet contracts with new capabilities, plus 7 new n8n operations for x402 payments and agent identity lookups.

<!-- truncate -->

## Testnet Redeployment (Base Sepolia)

ACTPKernel has been redeployed with two key improvements:

### 1. Public Nonces

`requesterNonces` is now a **public** mapping, enabling clients to pre-compute transaction IDs before submitting on-chain:

```typescript
// Pre-compute the transaction ID
const nonce = await kernel.requesterNonces(requesterAddress);
const txId = ethers.keccak256(
  ethers.solidityPacked(
    ['address', 'address', 'uint256', 'bytes32', 'uint256'],
    [requester, provider, amount, serviceHash, nonce]
  )
);

// Now create the transaction (ID matches prediction)
await kernel.createTransaction(provider, amount, serviceHash, deadline, disputeWindow);
```

This enables optimistic UIs, parallel processing, and batch planning without waiting for on-chain confirmation.

### 2. Agent ID Tracking

`createTransaction()` now accepts an optional `agentId` parameter for ERC-8004 integration. Transactions are linked to verifiable agent identities from creation.

### Updated Addresses

| Contract | Address |
|----------|---------|
| **ACTPKernel** | [`0x469CBADbACFFE096270594F0a31f0EEC53753411`](https://sepolia.basescan.org/address/0x469CBADbACFFE096270594F0a31f0EEC53753411) |
| **EscrowVault** | [`0x57f888261b629bB380dfb983f5DA6c70Ff2D49E5`](https://sepolia.basescan.org/address/0x57f888261b629bB380dfb983f5DA6c70Ff2D49E5) |
| **MockUSDC** | [`0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb`](https://sepolia.basescan.org/address/0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb) |

SDK v2.2.3 auto-resolves these addresses. No config changes needed.

---

## n8n Node v2.3.0

The AGIRAILS n8n community node now includes x402 and ERC-8004 operations alongside the existing ACTP workflow.

### New Operations

#### Simple Mode

| Operation | Description |
|-----------|-------------|
| **Paid HTTP Request** | x402 atomic payment + HTTP call in one step |
| **Lookup Agent** | Resolve ERC-8004 agent identity |

#### Advanced Mode

| Operation | Description |
|-----------|-------------|
| **x402 Pay** | Full HTTP method/headers/body control for x402 |
| **Resolve Agent** | Fetch agent identity + metadata |
| **Verify Agent** | Check on-chain agent existence |
| **Report Reputation** | Submit post-settlement feedback |
| **Get Reputation** | Query agent reputation score |

### Total Operations: 19

The node now supports the full AGIRAILS stack:

```
ACTP (12 ops)  +  x402 (2 ops)  +  ERC-8004 (5 ops)  =  19 operations
```

### Installation

```bash
# n8n community nodes
npm install n8n-nodes-actp@2.3.0
```

**npm:** [n8n-nodes-actp](https://www.npmjs.com/package/n8n-nodes-actp)

---

## Test Results

All 403 contract tests passing across the full suite:

```
ACTPKernel     ✅  All tests passing
EscrowVault    ✅  All tests passing
AgentRegistry  ✅  76 tests (14 new)
```

---

## Resources

- [SDK on npm](https://www.npmjs.com/package/@agirails/sdk)
- [n8n Node on npm](https://www.npmjs.com/package/n8n-nodes-actp)
- [Contract Source](https://github.com/agirails/actp-kernel)
- [Discord](https://discord.gg/nuhCt75qe4)
