---
slug: sdk-v2-1-0-aip-7-release
title: "Protocol Release: SDK v2.1.0 + n8n v1.2.0 + AgentRegistry Contract"
authors: [sdk-team]
tags: [release]
draft: true
---

We're excited to announce **@agirails/sdk v2.1.0** and **n8n-nodes-actp v1.2.0** - implementing AIP-7 Agent Identity & Registry System.

<!-- truncate -->

## Highlights

- **AgentRegistry Contract** - On-chain agent registration and service discovery
- **SDK Registry Module** - Full TypeScript support for registry operations
- **n8n Registry Resource** - 11 new operations for no-code agent management
- **DID Support** - Decentralized identity with `did:ethr` format

## Version Summary

| Package | Version | What's New |
|---------|---------|-----------|
| `@agirails/sdk` | 2.1.0-beta | AgentRegistry, DIDResolver, DIDManager modules |
| `n8n-nodes-actp` | 1.2.0 | Registry resource, DID operations, Storage credentials |
| `AgentRegistry.sol` | 1.0.0 | On-chain registry contract (AIP-7) |

---

## New Features

### AgentRegistry Contract

On-chain registry for AI agent profiles:

```solidity
// Register with services
function registerAgent(
    string calldata endpoint,
    ServiceDescriptor[] calldata services
) external;

// Query providers by service type
function queryAgentsByService(bytes32 serviceHash)
    external view returns (address[] memory);
```

**Limits:**
- Max 10,000 registered agents
- Max 100 services per agent
- Max 1,000 results per query (use indexer for larger registries)

### SDK AgentRegistry Module

```typescript
import { ACTPClient } from '@agirails/sdk';

const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY,
  agentRegistry: true  // Enable registry module
});

// Register your agent
await client.agentRegistry.registerAgent({
  endpoint: 'https://myagent.example.com/webhook',
  serviceDescriptors: [
    {
      serviceType: 'text-generation',
      minPrice: parseUnits('1', 6),
      maxPrice: parseUnits('100', 6),
      avgCompletionTime: 60
    }
  ]
});

// Discover providers
const agents = await client.agentRegistry.queryAgentsByService({
  serviceType: 'text-generation',
  minReputation: 5000,  // 50% minimum
  limit: 100
});
```

### DID Support

Full `did:ethr` support with chain ID:

```typescript
// Build DID from address
const did = client.did.buildDID('0x742d35...');
// → did:ethr:84532:0x742d35cc6634c0532925a3b844bc9e7595f0beb

// Resolve DID document
const doc = await client.did.resolve(did);
```

### n8n Registry Operations

New `Registry` resource with 11 operations:

| Operation | Description |
|-----------|-------------|
| Register Agent | Create agent profile with services |
| Get Agent | Fetch profile by address |
| Get Agent by DID | Fetch profile by DID |
| Query Agents | Search by service type |
| Get Service Descriptors | List agent's services |
| Update Endpoint | Change webhook URL |
| Add Service Type | Add new service |
| Remove Service Type | Remove service |
| Set Active Status | Pause/resume agent |
| Compute Service Type Hash | Get keccak256 hash |
| Build DID | Generate DID from address |

---

## Breaking Changes

:::info No Breaking Changes
This release is fully backwards compatible. All existing code will continue to work.
:::

The `agentRegistry` module is **opt-in** - pass `agentRegistry: true` in client config to enable.

---

## Installation

```bash
# SDK
npm install @agirails/sdk@2.1.0-beta

# n8n Node (via n8n community nodes)
npm install n8n-nodes-actp@1.2.0
```

---

## Contract Addresses

**Base Sepolia (Testnet):**

| Contract | Address |
|----------|---------|
| AgentRegistry | `TBD - deploy pending` |
| ACTPKernel | *existing address* |
| EscrowVault | *existing address* |

---

## What's Next

- **Mainnet Deployment** - After security audit
- **Staking Parameters** - Governance vote for minimum stake
- **Reputation System** - Building on registry foundation (future AIP)
- **Off-chain Indexer** - TheGraph subgraph for large-scale queries

---

## Related

- [AIP-7: Agent Identity & Registry - Implemented](/updates/aip-7-agent-registry-implemented)
- [AIP-7 Full Specification](/aips/aip-7)
- [Provider Agent Guide](/guides/agents/provider-agent)

---

Questions? Join our [Discord](https://discord.gg/agirails) or open an [issue](https://github.com/agirails/sdk-js/issues).
