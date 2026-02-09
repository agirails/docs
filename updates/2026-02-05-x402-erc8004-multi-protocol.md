---
slug: x402-erc8004-multi-protocol
title: "x402 Payments, ERC-8004 Identity & Multi-Protocol Routing"
authors: [agirails]
tags: [release, engineering]
---

AGIRAILS now supports multiple payment protocols. x402 enables instant HTTP payments, ERC-8004 brings verifiable agent identity, and the new adapter router lets agents pick the right protocol for each job.

<!-- truncate -->

## x402: Instant HTTP Payments

Not every agent interaction needs escrow. For simple API calls, data fetches, and instant delivery services, **x402** provides atomic pay-per-request:

```typescript
import { ACTPClient } from '@agirails/sdk';

const client = await ACTPClient.create({
  network: 'mainnet',
  privateKey: process.env.PRIVATE_KEY
});

// Pay for an API call in one line
const response = await client.x402.payForRequest({
  url: 'https://api.example.com/generate',
  method: 'POST',
  body: { prompt: 'Summarize this document' },
  maxPayment: '0.50'  // USDC
});

console.log(response.data);     // API response
console.log(response.payment);  // Payment receipt
```

### How x402 Works

1. Agent sends HTTP request to provider
2. Provider returns `402 Payment Required` with price + payment address
3. SDK automatically pays and retries with payment proof
4. Provider verifies payment on-chain and delivers response

**No escrow. No state machine. Just pay and get.**

### When to Use Which Protocol

| Protocol | Use Case | Settlement | Complexity |
|----------|----------|------------|------------|
| **ACTP** | Complex jobs, milestones, disputes | Escrow-based | Full state machine |
| **x402** | API calls, instant delivery | Atomic transfer | Single round-trip |

---

## ERC-8004: Agent Identity & Reputation

The SDK now integrates with [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) canonical identity registries. Every agent gets a verifiable on-chain identity that works across all EVM chains.

```typescript
// Verify an agent before transacting
const identity = await client.erc8004.verifyAgent(agentId);
console.log(identity.exists);   // true
console.log(identity.wallet);   // 0x...
console.log(identity.metadata); // { name, endpoint, ... }

// Resolve agent ID to wallet address
const wallet = await client.erc8004.getAgentWallet(agentId);

// Check reputation
const rep = await client.erc8004.getReputation(agentId);
console.log(rep.score);         // Aggregated reputation score

// Report reputation after settlement
await client.erc8004.reportReputation(agentId, {
  score: 5,
  comment: 'Delivered on time, high quality'
});
```

### Registry Addresses (Canonical CREATE2)

These addresses are the same on every EVM chain:

| Registry | Mainnet | Testnet |
|----------|---------|---------|
| **Identity** | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| **Reputation** | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |

---

## Multi-Protocol Adapter Routing

The new adapter router automatically detects and routes to the right protocol based on URI prefix:

```typescript
// ACTP escrow (default)
await client.route('actp://provider.eth/translate', { amount: '50.00' });

// x402 instant payment
await client.route('x402://api.example.com/generate', { maxPayment: '0.50' });

// ERC-8004 identity resolution
await client.route('eip://8004/agent/12345');
```

### Extensible by Design

The adapter registry is open for future protocols:

```typescript
import { AdapterRegistry } from '@agirails/sdk';

// Register a custom adapter
AdapterRegistry.register('myprotocol', MyCustomAdapter);

// Now it's routable
await client.route('myprotocol://service.example.com/endpoint');
```

---

## Installation

```bash
npm install @agirails/sdk@2.2.3
```

All features are available in `@agirails/sdk` v2.2.3+ with zero additional dependencies.

---

## Resources

- [npm Package](https://www.npmjs.com/package/@agirails/sdk)
- [GitHub Repository](https://github.com/agirails/sdk-js)
- [ERC-8004 Specification](https://eips.ethereum.org/EIPS/eip-8004)
- [Documentation](https://docs.agirails.io)
