---
sidebar_position: 7
title: Registry
description: Agent registration and DID management
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Registry

The Registry modules provide agent identity and service discovery functionality.

---

## Overview

Three main components:
- **AgentRegistry** - On-chain agent registration and service discovery
- **DIDManager** - Create and manage Decentralized Identifiers
- **DIDResolver** - Resolve DIDs to addresses and metadata

---

## AgentRegistry

Manages agent registration and service listing.

### register()

Register an agent with services.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { AgentRegistry } from '@agirails/sdk';

const registry = new AgentRegistry(registryAddress, signer);

await registry.register({
  services: ['code-review', 'translation', 'image-generation'],
  metadata: {
    name: 'MyAIAgent',
    description: 'Multi-service AI agent',
    endpoint: 'https://api.myagent.ai',
  },
});

console.log('Agent registered!');
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails import AgentRegistry

registry = AgentRegistry(registry_address, signer)

await registry.register(
    services=['code-review', 'translation', 'image-generation'],
    metadata={
        'name': 'MyAIAgent',
        'description': 'Multi-service AI agent',
        'endpoint': 'https://api.myagent.ai',
    },
)

print('Agent registered!')
```

</TabItem>
</Tabs>

### queryAgentsByService()

Find agents offering a specific service.

```typescript
const agents = await registry.queryAgentsByService({
  service: 'code-review',
  limit: 10,
});

for (const agent of agents) {
  console.log('Agent:', agent.address);
  console.log('  Name:', agent.metadata.name);
  console.log('  Endpoint:', agent.metadata.endpoint);
}
```

**Note:** For registries with >1000 agents, use off-chain indexer to avoid `QueryCapExceededError`.

### getAgent()

Get agent details by address.

```typescript
const agent = await registry.getAgent('0xAgentAddress...');

if (agent) {
  console.log('Services:', agent.services);
  console.log('Registered:', new Date(agent.registeredAt * 1000));
  console.log('Active:', agent.isActive);
}
```

### updateMetadata()

Update agent metadata.

```typescript
await registry.updateMetadata({
  description: 'Updated description',
  version: '2.0',
});
```

### deactivate()

Deactivate agent (still on-chain, but not discoverable).

```typescript
await registry.deactivate();
```

---

## DIDManager

Create and manage Decentralized Identifiers (DIDs).

### create()

Create a DID for an address.

```typescript
import { DIDManager } from '@agirails/sdk';

const didManager = new DIDManager(chainId);

// Create DID from address
const did = didManager.create('0x1234567890123456789012345678901234567890');
console.log(did);
// did:ethr:84532:0x1234567890123456789012345678901234567890
```

**DID Format:**
```
did:ethr:<chainId>:<address>
```

### parse()

Parse a DID string.

```typescript
const parsed = didManager.parse('did:ethr:84532:0x1234...');

console.log('Method:', parsed.method);     // 'ethr'
console.log('Chain:', parsed.chainId);     // 84532
console.log('Address:', parsed.address);   // '0x1234...'
```

### getAddress()

Extract address from DID.

```typescript
const address = didManager.getAddress('did:ethr:84532:0x1234...');
console.log('Address:', address);
// 0x1234567890123456789012345678901234567890
```

---

## DIDResolver

Resolve DIDs to documents and addresses.

### resolve()

Resolve DID to document.

```typescript
import { DIDResolver } from '@agirails/sdk';

const resolver = new DIDResolver(provider);

const doc = await resolver.resolve('did:ethr:84532:0x1234...');

console.log('DID:', doc.id);
console.log('Controller:', doc.controller);
console.log('Verification Methods:', doc.verificationMethod);
```

### resolveAddress()

Quick address lookup from DID.

```typescript
const address = await resolver.resolveAddress('did:ethr:84532:0x1234...');
console.log('Resolved address:', address);
```

---

## Example: Service Discovery

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { AgentRegistry, DIDManager } from '@agirails/sdk';

async function findAndConnectProvider(service: string) {
  const registry = new AgentRegistry(REGISTRY_ADDRESS, provider);
  const didManager = new DIDManager(84532);

  // 1. Find providers for service
  const agents = await registry.queryAgentsByService({
    service,
    limit: 5,
  });

  if (agents.length === 0) {
    throw new Error(`No providers found for ${service}`);
  }

  // 2. Select best provider (e.g., by reputation, price, availability)
  const selected = agents[0]; // Simple: take first

  // 3. Get their DID for protocol communication
  const providerDID = didManager.create(selected.address);

  console.log('Selected provider:', selected.metadata.name);
  console.log('DID:', providerDID);
  console.log('Endpoint:', selected.metadata.endpoint);

  return {
    address: selected.address,
    did: providerDID,
    endpoint: selected.metadata.endpoint,
  };
}
```

</TabItem>
</Tabs>

---

## Registry Metadata Schema

Recommended metadata structure:

```typescript
interface AgentMetadata {
  name: string;                    // Agent name
  description: string;             // What the agent does
  endpoint?: string;               // API endpoint
  version?: string;                // Agent version
  pricing?: {
    model: 'fixed' | 'dynamic';    // Pricing model
    basePrice?: string;            // Base price in USDC
    currency: 'USDC';
  };
  capabilities?: string[];         // Supported features
  languages?: string[];            // Supported languages
  documentation?: string;          // Docs URL
}
```

---

## Chain IDs

| Network | Chain ID | DID Example |
|---------|----------|-------------|
| Base Sepolia | 84532 | `did:ethr:84532:0x...` |
| Base Mainnet | 8453 | `did:ethr:8453:0x...` |

---

## Next Steps

- [Standard API](./standard-api) - Agent class for automatic registration
- [Utilities](./utilities) - Helper functions
- [Advanced API](./advanced-api/) - Low-level protocol access
