---
slug: sdk-v2-released
title: "@agirails/sdk v2.0 Released: New API Layers, DID Support & Mock Mode"
authors: [sdk-team]
tags: [release]
---

The AGIRAILS TypeScript SDK v2.0 is now live on npm with a completely redesigned API, full DID support, and a new mock mode for offline development.

<!-- truncate -->

## Installation

```bash
npm install @agirails/sdk
```

**npm:** [@agirails/sdk](https://www.npmjs.com/package/@agirails/sdk)
**GitHub:** [agirails/sdk-js](https://github.com/agirails/sdk-js)

---

## What's New in v2.0

### Three API Layers

The SDK now offers three levels of abstraction to match your needs:

| Layer | Use Case | Complexity |
|-------|----------|------------|
| **Beginner** | Quick integrations, demos | Minimal |
| **Intermediate** | Production applications | Standard |
| **Runtime** | Custom implementations | Full control |

```typescript
import { ACTPClient } from '@agirails/sdk';

const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY
});

// Beginner: One-liner payment
const result = await client.beginner.pay({
  provider: '0x...',
  amount: '10.00',
  service: 'echo'
});

// Intermediate: Full control
const txId = await client.intermediate.createTransaction({
  provider: '0x...',
  amount: '10.00',
  deadline: '+1h',
  disputeWindow: 3600
});
await client.intermediate.linkEscrow(txId);
```

### Mock Mode

Develop and test without blockchain access:

```typescript
const client = await ACTPClient.create({
  mode: 'mock'  // No private key needed!
});

// Full ACTP flow works identically
const result = await client.beginner.pay({
  provider: '0x1234...',
  amount: '5.00',
  service: 'test'
});
```

Mock mode features:
- No gas fees
- Instant transactions
- Persistent state (survives restarts)
- Perfect for CI/CD pipelines

### DID Support (AIP-7)

Full Decentralized Identifier support with ERC-1056 compatibility:

```typescript
import { DIDResolver, DIDManager } from '@agirails/sdk';

// Resolve DID to document
const resolver = await DIDResolver.create({ network: 'base-sepolia' });
const doc = await resolver.resolve('did:ethr:84532:0x742d35cc...');

// Manage identity (delegates, attributes)
const manager = new DIDManager(registryAddress, signer);
await manager.addDelegate(identity, DelegateType.SIGNING, delegate, validity);
await manager.setAttribute(identity, 'serviceEndpoint', 'https://api.example.com', validity);
```

### Delivery Proofs with EAS

Create verifiable delivery proofs using Ethereum Attestation Service:

```typescript
import { DeliveryProofBuilder } from '@agirails/sdk';

const builder = new DeliveryProofBuilder(signer, { network: 'base-sepolia' });

const proof = await builder.build({
  txId: '0x...',
  resultCID: 'ipfs://Qm...',
  resultHash: '0x...'
});

// Creates on-chain attestation
const attestationUID = await builder.attest(proof);
```

### CLI Tool

New command-line interface for quick operations:

```bash
# Install globally
npm install -g @agirails/sdk

# Initialize config
actp init

# Create transaction
actp tx create --provider 0x... --amount 10

# Check status
actp tx status <txId>

# Simulate full flow
actp simulate --amount 5
```

---

## Breaking Changes from v1.x

| v1.x | v2.x |
|------|------|
| `client.kernel.createTransaction()` | `client.intermediate.createTransaction()` |
| `client.kernel.transitionState()` | `client.intermediate.transitionState()` |
| `client.fundTransaction()` | `client.intermediate.linkEscrow()` |
| `client.releaseEscrowWithVerification()` | `client.intermediate.releaseEscrow()` |

The v2 API is more intuitive with clear separation between beginner and intermediate use cases.

---

## Network Support

| Network | Chain ID | Status |
|---------|----------|--------|
| Base Sepolia | 84532 | Active (Testnet) |
| Base Mainnet | 8453 | Not Deployed |

Contract addresses are automatically resolved from network config - no manual configuration needed.

---

## What's Next

- **Python SDK**: 1:1 feature parity (coming soon)
- **n8n Node v2**: Already released ([n8n-nodes-actp](https://www.npmjs.com/package/n8n-nodes-actp))
- **Documentation**: Updated guides for v2 API

---

## Resources

- [npm Package](https://www.npmjs.com/package/@agirails/sdk)
- [GitHub Repository](https://github.com/agirails/sdk-js)
- [SDK Examples](https://github.com/agirails/sdk-examples)
- [Documentation](https://docs.agirails.io)
- [Discord](https://discord.gg/nuhCt75qe4)

---

## Feedback

Found an issue? [Open a GitHub issue](https://github.com/agirails/sdk-js/issues) or reach out on [Discord](https://discord.gg/nuhCt75qe4).
