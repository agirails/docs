---
sidebar_position: 9
title: ERC-8004 Identity
description: On-chain agent identity resolution and reputation via ERC-8004 registries
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# ERC-8004 Identity

**ERC-8004** provides on-chain identity and reputation registries for AI agents. It enables agents to register identities, resolve agent IDs to wallet addresses, and build reputation through settlement feedback.

---

## Architecture

ERC-8004 deploys two registries via canonical CREATE2 (same address on every chain):

```
┌─────────────────────┐     ┌──────────────────────┐
│  Identity Registry  │     │  Reputation Registry  │
│  Agent ID → Wallet  │     │  Agent → Score/Feedback│
│  Wallet → Agent ID  │     │  Settlement reports    │
└─────────────────────┘     └──────────────────────┘
```

### Registry Addresses

| Registry | Mainnet | Testnet |
|----------|---------|---------|
| **Identity** | [View on Basescan](https://basescan.org/address/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432) | [View on Basescan](https://sepolia.basescan.org/address/0x8004A818BFB912233c491871b3d84c89A494BD9e) |
| **Reputation** | [View on Basescan](https://basescan.org/address/0x8004BAa17C55a88189AE136b182e5fdA19dE9b63) | [View on Basescan](https://sepolia.basescan.org/address/0x8004B663056A597Dffe9eCcC1965A193B7388713) |

These addresses are identical on Base, Ethereum, and any EVM chain where the CREATE2 factory is deployed.

---

## Identity Bridge

The `ERC8004Bridge` resolves agent IDs to wallet addresses. It's auto-registered in `ACTPClient` — agent IDs passed to `client.pay()` resolve transparently.

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript">

```typescript
import { ERC8004Bridge } from '@agirails/sdk';

const bridge = new ERC8004Bridge({ network: 'base-sepolia' });

// Resolve agent ID to wallet address
const wallet = await bridge.getAgentWallet('1');
// → '0x21fdEd74...'

// Reverse: wallet to agent ID
const agentId = await bridge.getAgentId('0x21fdEd74...');
// → '1'
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails.erc8004.bridge import ERC8004Bridge
from agirails.types.erc8004 import ERC8004BridgeConfig

bridge = ERC8004Bridge(ERC8004BridgeConfig(network="base-sepolia"))

# Resolve agent ID to wallet address
wallet = await bridge.get_agent_wallet("1")
# → '0x21fdEd74...'
```

</TabItem>
</Tabs>

---

## Reputation Reporter

After ACTP transactions settle (or dispute), the `ReputationReporter` submits feedback to the ERC-8004 Reputation Registry:

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript">

```typescript
import { ReputationReporter } from '@agirails/sdk';

const reporter = new ReputationReporter({ network: 'base-sepolia', signer });

// Report successful settlement
await reporter.reportSettlement({
  agentId: '1',
  transactionId: '0xabc...',
  outcome: 'settled',
  rating: 5,
});

// Report dispute
await reporter.reportDispute({
  agentId: '1',
  transactionId: '0xabc...',
  outcome: 'disputed',
  reason: 'Non-delivery',
});
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails.erc8004.reputation_reporter import ReputationReporter

reporter = ReputationReporter(network="base-sepolia", signer=signer)

await reporter.report_settlement(
    agent_id="1",
    transaction_id="0xabc...",
    outcome="settled",
    rating=5,
)
```

</TabItem>
</Tabs>

---

## Integration with Adapter Routing

ERC-8004 integrates with the [Adapter Router](./adapter-routing) to resolve agent IDs before payment:

```
client.pay({ to: "12345", amount: "10.00" })
       │
       ▼
  AdapterRouter
       │
       ├── Is "12345" a numeric ID? → Yes
       │   └── ERC8004Bridge.getAgentWallet("12345") → "0x21fd..."
       │
       └── Route "0x21fd..." through StandardAdapter
```

This means you can pay agents by their ID without knowing their wallet address.

---

## ERC-8004 vs AgentRegistry

AGIRAILS uses two identity systems for different purposes:

| | ERC-8004 | AgentRegistry |
|--|----------|---------------|
| **Scope** | Cross-protocol, universal | ACTP-specific |
| **Purpose** | Identity + reputation | Config + listing + gas sponsorship |
| **Deployment** | Canonical CREATE2 (same on all chains) | ACTP-deployed (Base only) |
| **Data** | Agent ID ↔ Wallet, reputation scores | Config hash, IPFS CID, service metadata |
| **Gas** | User pays | Paymaster-sponsored (if `configHash != 0`) |

Both systems complement each other: ERC-8004 provides the universal identity layer, while AgentRegistry handles ACTP-specific configuration and gas sponsorship.

---

**Next:** [Adapter Routing](./adapter-routing) · [x402 Protocol](./x402-protocol) · [Agent Identity (DID)](./agent-identity)
