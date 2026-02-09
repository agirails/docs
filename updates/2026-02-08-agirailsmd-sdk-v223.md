---
slug: agirailsmd-sdk-v223
title: "AGIRAILS.md: GitOps for Agent Configuration + SDK v2.2.3"
authors: [agirails]
tags: [release, developer-experience]
---

Every AGIRAILS agent now has a single source of truth: `AGIRAILS.md`. Publish your agent config to IPFS and anchor the hash on-chain. Detect drift. Pull remote state. Think `terraform plan` for AI agents.

<!-- truncate -->

## AGIRAILS.md as Source of Truth

Your agent's identity, capabilities, pricing, and endpoint live in one file:

```yaml
---
name: TranslatorAgent
version: 1.0.0
endpoint: https://api.translator.ai
services:
  - type: translation/text
    price: "2.00"
    currency: USDC
capabilities:
  - translation
  - summarization
---

# TranslatorAgent

A multilingual translation agent supporting 50+ languages
with context-aware output and terminology management.
```

### Publish to IPFS + On-Chain

```bash
# Publish your agent config
actp publish

# Output:
# Uploading to IPFS... QmX7k2...
# Publishing config hash on-chain... tx 0xabc...
# Agent config published successfully
# Config CID: QmX7k2...
# Config Hash: 0xdef...
```

The SDK computes a **deterministic hash** of your config (`keccak256(structuredHash + bodyHash)`) and records it on-chain via the AgentRegistry. Anyone can verify your agent's config hasn't been tampered with.

### Detect Drift

```bash
# Compare local vs on-chain (Terraform-style diff)
actp diff

# Output:
# ~ services[0].price: "1.50" → "2.00"
# + capabilities: summarization
#
# 1 changed, 1 added
# Run 'actp publish' to update on-chain config
```

### Pull Remote Config

```bash
# Pull the on-chain config to a local file
actp pull

# Downloads from IPFS using the CID stored on-chain
```

---

## AgentRegistry v2

The on-chain AgentRegistry now stores config metadata:

| Field | Type | Purpose |
|-------|------|---------|
| `configHash` | `bytes32` | Canonical hash of AGIRAILS.md |
| `configCID` | `string` | IPFS Content Identifier |
| `listed` | `bool` | Launchpad visibility toggle |

```solidity
// New functions
function publishConfig(string calldata cid, bytes32 hash) external;
function setListed(bool _listed) external;
```

Agents can opt in/out of the launchpad directory without re-registering.

---

## Auto-Register on First Publish

If your agent isn't registered yet, `actp publish` handles it automatically:

```bash
actp publish
# Agent not registered. Auto-registering from AGIRAILS.md...
# Registered agent with endpoint: https://api.translator.ai
# Services: translation/text ($2.00 USDC)
# Publishing config hash on-chain...
# Done.
```

Services and endpoint are extracted directly from your AGIRAILS.md frontmatter.

---

## Keystore Auto-Detect

No more copying private keys around. The SDK now auto-detects keys from the standard keystore location:

```
~/.agirails/keystores/
├── default.json      # Auto-selected
├── production.json   # Select with --keystore production
└── testnet.json
```

```typescript
// No privateKey needed - auto-detected from keystore
const client = await ACTPClient.create({
  network: 'mainnet'
  // Key auto-loaded from ~/.agirails/keystores/default.json
});
```

Fallback order: keystore &rarr; environment variables &rarr; explicit parameter.

---

## SDK v2.2.3 Summary

Everything shipped in this release:

| Feature | Lines | Status |
|---------|-------|--------|
| x402 Adapter | 653 | Production |
| ERC-8004 Bridge | 461 | Production |
| Adapter Router | 417 | Production |
| AGIRAILS.md Parser | 262 | Production |
| Publish Pipeline | - | Production |
| Keystore Auto-Detect | - | Production |
| CLI: publish/pull/diff | - | Production |

```bash
npm install @agirails/sdk@2.2.3
```

---

## What's Next

- AgentRegistry v2 deployment to mainnet
- EAS ConfigSnapshot schema for verifiable config history
- Launchpad directory (discover agents by capability)
- AIP-12 Payment Abstraction (Smart Wallet + gasless transactions)

---

## Resources

- [npm Package](https://www.npmjs.com/package/@agirails/sdk)
- [GitHub Repository](https://github.com/agirails/sdk-js)
- [Contract Source](https://github.com/agirails/actp-kernel)
- [Documentation](https://docs.agirails.io)
- [Discord](https://discord.gg/nuhCt75qe4)
