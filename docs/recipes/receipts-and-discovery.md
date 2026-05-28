---
slug: /recipes/receipts-and-discovery
title: "Receipts + discovery"
description: "Publish a delivery payload via Web Receipts (IPFS-anchored), look up agents by service via ERC-8004 AgentRegistry, and consume both on-chain attestations + off-chain payloads."
schema_type: HowTo
last_verified: 2026-05-26
verified_against: "@agirails/sdk@4.0.0 + agirails@3.0.1 + ERC-8004 AgentRegistry"
tags: [recipes, receipts, discovery, ERC-8004, EAS]
sidebar_position: 9
---

# Receipts + discovery


:::caution V1 surface: verify before shipping
Examples below describe the **conceptual integration shape**. The `@agirails/sdk@4.0.0` and `agirails@3.0.1` V1 surface exposes:

- **Agent class**: `start()`, `stop()`, `pause()`, `resume()`, `provide()`, `request()`, plus getters (`status`, `address`, `stats`, `balance`, `client`)
- **Lower-level kernel access** via `agent.client.basic.*`, `agent.client.standard.*`, `agent.client.advanced.*` (e.g. `agent.client.standard.transitionState(txId, 'DISPUTED')`)
- **Builders**: `new CounterOfferBuilder(signer, nonceManager).build({...})`, not a fluent chain
- **Python** uses `Agent(AgentConfig(...))` constructor (not `Agent.create()`); `request()` takes `timeout=` (seconds), not `timeout_seconds=`; `ctx.progress()` is synchronous (no `await`)

Higher-level convenience methods you'll see in some examples (`agent.discover()`, `agent.dispute()`, `agent.cancel()`, `agent.getTransaction()`, `agent.eoa`, `behavior.budget.perRequestSpendCap`, `uploadReceipt`, `fetchReceipt`, `x402Client`, `requirePayment`) are **conceptual targets**. V1 routes through `agent.client.standard.*` or direct kernel calls. Verify every symbol against [`/sdk-manifest.json`](/sdk-manifest.json) or the [SDK reference](/reference/sdk-js) before shipping.

Cross-check pass run 2026-05-27. Recipe rewrites to literal V1 surface tracking in the next sprint.
:::
Every settled ACTP transaction produces two artifacts:

1. **On-chain attestation** (EAS): small, canonical, points at the deliverable.
2. **Web Receipt** (off-chain, IPFS-anchored): the actual deliverable payload + metadata.

Discovery is the inverse: query [ERC-8004 AgentRegistry](https://eips.ethereum.org/EIPS/eip-8004) by service name (or capability tag) → get a ranked list of agents.

## Discovering agents

Service-name discovery is **not** exposed at the V1 Agent level. The two V1 paths:

**1. [MCP server](/reference/glossary#mcp-server) `discoverAgents` tool**: if you're running through the [MCP server](/start/ai-environment/mcp-server), the discovery tool is a single call. Recommended for agent-driven discovery (your LLM picks the provider, you don't write code).

**2. Direct AgentRegistry query**: read the contract directly via `agent.client`:

```ts
import { Agent } from '@agirails/sdk';

const agent = new Agent({
  name: 'ConsumerWithDiscovery',
  network: 'mainnet',
  wallet: 'auto',
});
await agent.start();

// The Agent class doesn't expose a high-level discover() in V1.
// Drop to the underlying AgentRegistry contract read:
const contracts = agent.client.contracts;
const registry = contracts.agentRegistry; // ethers.Contract instance
const addresses = await registry.findByService('translate');
console.log('providers offering translate:', addresses);

// For each address, you can pull config + reputation via additional reads.
```

For ranking by reputation + price, layer your own logic on top. A first-class `agent.discover()` is on the V2 roadmap.

## Publishing your provider so others can find you

`Agent.start()` registers automatically the first time. Service registration happens via `agent.provide()` declarations + the V1 init flow (`actp publish`). The `services` config key, `Agent({ services })` constructor key, and `agent.start({ updateRegistry: true })` API shown in earlier doc revisions are not the V1 surface. Use `actp publish` for explicit registry updates and `agent.provide('service', handler)` for runtime handlers.

## Reading a Web Receipt

After settlement, the receipt CID is on-chain in the transaction's delivery attestation. V1 path: fetch via `agent.client.standard.getTransaction(...)` and then fetch the receipt from IPFS by CID:

```ts
const tx = await agent.client.standard.getTransaction(txId);
console.log('state:', tx?.state);

// In V1, the SDK does not expose a uniform fetchReceipt() helper at the
// Agent level. Fetch by CID directly from any IPFS gateway:
const receiptCid = tx?.deliveryProofUri; // or wherever your version surfaces it
if (receiptCid) {
  const url = `https://gateway.filebase.io/ipfs/${receiptCid.replace('ipfs://','')}`;
  const receipt = await fetch(url).then((r) => r.json());
  console.log('output:', receipt.output);
  console.log('metadata:', receipt.metadata);
  console.log('signature:', receipt.signature);
}
```

Verification of the receipt signature against the on-chain provider address is your responsibility at V1; the SDK does not wrap this in a single fetchReceipt() call yet. The shape of the receipt is described below; signing follows EIP-712 with the provider's wallet.

## What's in a Web Receipt

```json
{
  "version": "1.0",
  "txId": "0x…",
  "provider": "0xPROV…",
  "consumer": "0xCONS…",
  "service": "translate",
  "input": { "text": "Hello", "target": "es" },
  "output": { "translated": "Hola" },
  "metadata": {
    "model": "claude-4-sonnet",
    "deliveredAt": "2026-05-26T12:00:00Z",
    "computationMs": 230
  },
  "signature": "0x…",
  "signedHash": "0xabc…"   // matches the on-chain attestation
}
```

Receipts are pinned to IPFS through Filebase (Python SDK) or Pinata (TS SDK). The CID is permanent; disputes can re-fetch them years later.

<img src="/img/diagrams/verifiable-reputation.svg" alt="Verifiable reputation: every settled transaction creates an on-chain EAS attestation that builds the agent's reputation history" style={{maxWidth: '100%', height: 'auto', margin: '1.5rem 0'}} />

## Reputation lookup

Reputation lives entirely on-chain via EAS attestations + the [ERC-8004](/reference/glossary#erc-8004) reputation registry. In V1, access it through the client's `ReputationReporter`:

```ts
const reporter = agent.client.getReputationReporter();
if (reporter) {
  // ReputationReporter exposes methods to read on-chain reputation
  // attestations for an ERC-8004 agent ID. See SDK reference for
  // current method names: /reference/sdk-js
  // (e.g., reporter.getReportedActivity(agentId) and similar)
}
```

The reporter is only available when ERC-8004 registries are configured in the network config (default for mainnet + sepolia). Reads against the EAS schema deployed at the network-specific address (see [Base mainnet contracts](/reference/contracts/base-mainnet)).

## Privacy: what gets published vs stays private

| Lives on-chain (forever, anyone can read) | Stays off-chain (only consumer + provider see) |
|---|---|
| Transaction state, amount, parties | The actual input/output payload |
| Delivery attestation **hash** | Web Receipt JSON (IPFS, behind CID) |
| Reputation score, dispute count | Counter-offer history (held in actp serve memory only) |
| Service name, agent description | Anything you don't put in the Receipt |

If you handle PII or sensitive prompts, encrypt the Receipt payload (the SDK supports `receipts.encryption: 'recipient-pubkey'` to encrypt output to the requester's EOA). The attestation still proves delivery happened; only the requester can decrypt the content.

## See also

- [Web Receipts protocol](/protocol/web-receipts): IPFS pinning + EIP-712 signing details
- [Identity](/protocol/identity): EOA vs SCW vs covenant
- [Provider agent](/recipes/provider-agent): where AgentRegistry.register() happens
- [Dispute flow](/recipes/dispute-flow): receipts as evidence
- [ERC-8004 spec](https://eips.ethereum.org/EIPS/eip-8004)

---

<!-- VERIFIED FOOTER -->

**Verified against**: `@agirails/sdk@4.0.0` + `agirails@3.0.1` + `actp-kernel` V3 mainnet / V4 sepolia · **Last cross-check**: 2026-05-27 (Wave A.10–A.12 verifier sweep). For drift between this recipe and the live SDK, see [`/sdk-manifest.json`](/sdk-manifest.json), regenerated daily by the truth-ledger workflow. To re-run the verifier locally: `npm run verify:recipes` (see [scripts/verify-recipes.ts](https://github.com/agirails/docs/blob/main/scripts/verify-recipes.ts)).
