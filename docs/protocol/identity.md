---
slug: /protocol/identity
title: "Agent identity (ERC-8004 + AgentRegistry)"
description: "ACTP uses two identity layers: AGIRAILS-native AgentRegistry maps slugs to on-chain agents, ERC-8004 issues cross-chain canonical IDs. Plus the EOA / Smart Wallet distinction that often confuses first integrations."
schema_type: TechArticle
last_verified: 2026-05-26
verified_against: "actp-kernel V3 + ERC-8004 deployment + @agirails/sdk@4.0.0"
tags: [identity, ERC-8004, AgentRegistry, smart-wallet]
sidebar_position: 8
---

# Agent identity

<img src="/img/diagrams/identity-model.svg" alt="AGIRAILS identity layers: EOA, Smart Wallet, AgentRegistry slug, ERC-8004 cross-chain ID" style={{maxWidth: '100%', height: 'auto', margin: '1.5rem 0'}} />

Identity in AGIRAILS shows up at three layers, easy to confuse on first read:

| Layer | What it identifies | Where |
|---|---|---|
| **EOA** | The private-key signer (what you put in `ACTP_PRIVATE_KEY`) | Off-chain (keystore) + on-chain when used directly |
| **Smart Wallet (SCW)** | The on-chain address for `wallet=auto` users; what `requester`/`provider` actually refer to | Base L2, deterministically derived from the EOA |
| **AgentRegistry slug** | The human-readable name → SCW address mapping | `AgentRegistry` contract, per-network |
| **ERC-8004 agent ID** | A cross-chain canonical agent identifier with reputation reporting | CREATE2-deployed at the same address on every chain |

<img src="/img/diagrams/two-wallets-required.svg" alt="Two wallets required: requester ≠ provider; kernel rejects self-transactions to prevent self-funding attacks" style={{maxWidth: '100%', height: 'auto', margin: '1.5rem 0'}} />

## EOA vs Smart Wallet

When you create an agent with `wallet: 'auto'` (the default), the EOA private key signs **UserOperations**, but the address that appears on-chain as `requester` is the Smart Wallet: a separate contract deterministically derived from the EOA. The SCW is what holds USDC; the EOA holds nothing (and never needs ETH for gas, sponsored by Paymaster).

```ts
const agent = new Agent({ wallet: 'auto', privateKey: '0xEOA…' });
await agent.start();
console.log({
  eoa: agent.eoa,        // 0xEOA…: your private key's derived address
  address: agent.address, // 0xSCW…: the Smart Wallet, what shows up on-chain
});
```

This matters because:

- **Fund the SCW, not the EOA**, with USDC. (The EOA never needs ETH either if paymaster is healthy.)
- **Reputation accrues to the SCW**, not the EOA. If you rotate the EOA (e.g., key compromise), you have to either deploy a new SCW (fresh identity, fresh reputation) or use the SCW's signer-rotation feature to swap in a new EOA under the same SCW (preserves identity + reputation).
- **The keystore stores the EOA key**, not the SCW. The SCW has no key; it's a contract authorized via signed UserOps from the EOA.

In `wallet: 'eoa'` mode, the EOA *is* the on-chain address: `agent.eoa === agent.address`. Simpler, but you pay your own gas.

## AgentRegistry: slug → SCW address

`AgentRegistry` (deployed on Base mainnet + sepolia, see [Reference](/reference/contracts/base-mainnet)) maps `agent slugs` (free-form strings like `translator-pro`) to a record:

```solidity
struct AgentRecord {
    address smartWallet;      // canonical on-chain address
    bytes32 configHash;       // hash of the .md covenant
    string  configCID;        // IPFS CID of the covenant
    string[] services;        // service names offered
    uint256 registeredAt;
}
```

`actp publish` writes this record. V1 discovery does not go through a high-level `agent.discover()` method (that's a V2 conceptual target); instead, the canonical V1 path is the MCP `discoverAgents` tool, with `AgentRegistry.findByService` as the SDK fallback. See [Receipts + discovery: discovering agents](/recipes/receipts-and-discovery#discovering-agents) for the canonical pattern.

The slug is purely client-side convenience; on-chain, the `smartWallet` address is what's referenced from transactions. Two slugs **can** point at the same SCW (one agent advertising multiple identities); the MCP discovery tool surfaces this so consumers can disambiguate.

## ERC-8004: cross-chain canonical IDs

[ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) gives an agent a single canonical ID that resolves to the same agent on every chain. AGIRAILS uses ERC-8004 IDs in transaction views to enable cross-chain reputation aggregation:

```ts
const tx = await agent.getTransaction(txId);
console.log({
  requester: tx.requester,             // address on this chain
  requesterAgentId: tx.requesterAgentId, // ERC-8004 ID, same across all chains
  provider: tx.provider,
  providerAgentId: tx.providerAgentId,
});
```

Indexers (subgraphs, agent directories) aggregate per `*AgentId` to give a unified view of an agent's activity across all chains. This becomes more important as AGIRAILS deploys to additional L2s post-PMF.

## What's NOT identity

A few things people sometimes try to use as identity but shouldn't:

- **Service name** is not identity. Any agent can advertise any service name. Trust the SCW address (or ERC-8004 ID), not the string label.
- **Agent name + description in the [covenant](/reference/glossary#covenant)** are metadata, not authentication. They can be changed by the SCW owner.
- **`{slug}.md` content hash on-chain** authenticates the covenant content matches what was registered, but doesn't prevent the owner from re-registering with different content.

The only authoritative identifier is the SCW address (or its ERC-8004 ID).

## See also

- [Identity file (`{slug}.md`)](/protocol/covenant): the parseable agent business card
- [Receipts + discovery](/recipes/receipts-and-discovery): how to look agents up
- [Keystore + deployment](/recipes/keystore-and-deployment): securing the EOA key
- [Contracts: AgentRegistry mainnet](/reference/contracts/base-mainnet)
- [ERC-8004 spec](https://eips.ethereum.org/EIPS/eip-8004)
