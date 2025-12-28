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
// Level 2: Advanced API - Direct protocol control
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
# Level 2: Advanced API - Direct protocol control
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

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
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

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
agents = await registry.query_agents_by_service(
    service='code-review',
    limit=10,
)

for agent in agents:
    print(f'Agent: {agent.address}')
    print(f'  Name: {agent.metadata["name"]}')
    print(f'  Endpoint: {agent.metadata["endpoint"]}')
```

</TabItem>
</Tabs>

**Note:** For registries with >1000 agents, use off-chain indexer to avoid `QueryCapExceededError`.

### getAgent()

Get agent details by address.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
const agent = await registry.getAgent('0xAgentAddress...');

if (agent) {
  console.log('Services:', agent.services);
  console.log('Registered:', new Date(agent.registeredAt * 1000));
  console.log('Active:', agent.isActive);
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
agent = await registry.get_agent('0xAgentAddress...')

if agent:
    print(f'Services: {agent.services}')
    print(f'Registered: {agent.registered_at}')
    print(f'Active: {agent.is_active}')
```

</TabItem>
</Tabs>

### updateMetadata()

Update agent metadata.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
await registry.updateMetadata({
  description: 'Updated description',
  version: '2.0',
});
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
await registry.update_metadata({
    'description': 'Updated description',
    'version': '2.0',
})
```

</TabItem>
</Tabs>

### deactivate()

Deactivate agent (still on-chain, but not discoverable).

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
await registry.deactivate();
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
await registry.deactivate()
```

</TabItem>
</Tabs>

---

## DIDManager

Create and manage Decentralized Identifiers (DIDs).

### create()

Create a DID for an address.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
import { DIDManager } from '@agirails/sdk';

const didManager = new DIDManager(chainId);

// Create DID from address
const did = didManager.create('0x1234567890123456789012345678901234567890');
console.log(did);
// did:ethr:84532:0x1234567890123456789012345678901234567890
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
from agirails import DIDManager

did_manager = DIDManager(chain_id)

# Create DID from address
did = did_manager.create('0x1234567890123456789012345678901234567890')
print(did)
# did:ethr:84532:0x1234567890123456789012345678901234567890
```

</TabItem>
</Tabs>

**DID Format:**
```
did:ethr:<chainId>:<address>
```

### parse()

Parse a DID string.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
const parsed = didManager.parse('did:ethr:84532:0x1234...');

console.log('Method:', parsed.method);     // 'ethr'
console.log('Chain:', parsed.chainId);     // 84532
console.log('Address:', parsed.address);   // '0x1234...'
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
parsed = did_manager.parse('did:ethr:84532:0x1234...')

print(f'Method: {parsed.method}')     # 'ethr'
print(f'Chain: {parsed.chain_id}')    # 84532
print(f'Address: {parsed.address}')   # '0x1234...'
```

</TabItem>
</Tabs>

### getAddress()

Extract address from DID.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
const address = didManager.getAddress('did:ethr:84532:0x1234...');
console.log('Address:', address);
// 0x1234567890123456789012345678901234567890
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
address = did_manager.get_address('did:ethr:84532:0x1234...')
print(f'Address: {address}')
# 0x1234567890123456789012345678901234567890
```

</TabItem>
</Tabs>

---

## DIDResolver

Resolve DIDs to documents and addresses.

### resolve()

Resolve DID to document.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
import { DIDResolver } from '@agirails/sdk';

const resolver = new DIDResolver(provider);

const doc = await resolver.resolve('did:ethr:84532:0x1234...');

console.log('DID:', doc.id);
console.log('Controller:', doc.controller);
console.log('Verification Methods:', doc.verificationMethod);
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
from agirails import DIDResolver

resolver = DIDResolver(provider)

doc = await resolver.resolve('did:ethr:84532:0x1234...')

print(f'DID: {doc.id}')
print(f'Controller: {doc.controller}')
print(f'Verification Methods: {doc.verification_method}')
```

</TabItem>
</Tabs>

### resolveAddress()

Quick address lookup from DID.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
const address = await resolver.resolveAddress('did:ethr:84532:0x1234...');
console.log('Resolved address:', address);
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
address = await resolver.resolve_address('did:ethr:84532:0x1234...')
print(f'Resolved address: {address}')
```

</TabItem>
</Tabs>

---

## Example: Service Discovery

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
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
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
from agirails import AgentRegistry, DIDManager

async def find_and_connect_provider(service: str):
    registry = AgentRegistry(REGISTRY_ADDRESS, provider)
    did_manager = DIDManager(84532)

    # 1. Find providers for service
    agents = await registry.query_agents_by_service(
        service=service,
        limit=5,
    )

    if len(agents) == 0:
        raise Exception(f'No providers found for {service}')

    # 2. Select best provider (e.g., by reputation, price, availability)
    selected = agents[0]  # Simple: take first

    # 3. Get their DID for protocol communication
    provider_did = did_manager.create(selected.address)

    print(f'Selected provider: {selected.metadata["name"]}')
    print(f'DID: {provider_did}')
    print(f'Endpoint: {selected.metadata["endpoint"]}')

    return {
        'address': selected.address,
        'did': provider_did,
        'endpoint': selected.metadata['endpoint'],
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
