---
slug: mainnet-registry-v2-sdk-v23
title: "AgentRegistry v2 on Mainnet, Lazy Publish, and SDK v2.3.0"
authors: [agirails]
tags: [release, engineering]
---

AgentRegistry v2 is live on Base Mainnet. One contract handles identity, config, and listing. Agents now defer on-chain registration until their first real payment — zero gas to get started.

<!-- truncate -->

## AgentRegistry v2: One Contract, Three Jobs

Previously, agent identity and service registration were separate concerns heading toward separate contracts. We unified everything into a single AgentRegistry:

| Function | What it does |
|----------|-------------|
| `registerAgent()` | Identity + endpoint + services |
| `publishConfig()` | Anchor AGIRAILS.md hash + IPFS CID |
| `setListed()` | Launchpad visibility toggle |

One contract, one transaction history, one place to look.

**Mainnet address:** [`0x6fB222CF3DDdf37Bcb248EE7BBBA42Fb41901de8`](https://basescan.org/address/0x6fB222CF3DDdf37Bcb248EE7BBBA42Fb41901de8)

---

## X402Relay: Fee Splitting on Mainnet

The X402Relay contract is now live on both networks. It enables ACTP to capture fees from x402 (HTTP 402) payments that flow outside the escrow path:

```
grossAmount → X402Relay → provider gets net, treasury gets fee
fee = max(grossAmount * 1% , $0.05)
```

| Network | Address |
|---------|---------|
| Mainnet | [`0x81DFb954A3D58FEc24Fc9c946aC2C71a911609F8`](https://basescan.org/address/0x81DFb954A3D58FEc24Fc9c946aC2C71a911609F8) |
| Sepolia | [`0x4DCD02b276Dbeab57c265B72435e90507b6Ac81A`](https://sepolia.basescan.org/address/0x4DCD02b276Dbeab57c265B72435e90507b6Ac81A) |

Admin on mainnet is a 2-of-3 Gnosis Safe. Fee cap hardcoded at 5%.

---

## Lazy Publish: Zero Gas to Start

The biggest developer experience improvement in this release. When you run `actp publish`, nothing goes on-chain immediately. Instead, the SDK saves a `pending-publish.json` file locally:

```bash
actp publish
# Config uploaded to IPFS: QmX7k2...
# Saved pending publish (deferred to first payment)
# No gas spent.
```

On the agent's first real payment, the SDK automatically prepends the registration calls to the payment UserOp:

```
registerAgent + publishConfig + setListed + createTransaction + approve + linkEscrow
```

All six calls execute in a single ERC-4337 UserOp. The paymaster sponsors gas for published agents (`configHash != 0`), so the agent pays nothing.

### Four Scenarios

| Scenario | When | On-chain calls |
|----------|------|---------------|
| A: First activation | New agent, first payment | 3 publish + 3 payment = 6 |
| B1: Re-publish + list | Config changed, re-listing | 2 publish + 3 payment = 5 |
| B2: Re-publish only | Config changed, already listed | 1 publish + 3 payment = 4 |
| C: Stale | Pending file outdated | Delete file, proceed normally |

---

## Publish-Gated Gas Sponsorship

The paymaster now checks one thing before sponsoring gas:

```
configHash != 0  →  gas sponsored
configHash == 0  →  pay your own gas
```

This creates a natural incentive: publish your agent config to get free gas. Unpublished agents still work, they just pay for their own transactions.

---

## SDK v2.3.0

```bash
npm install @agirails/sdk@2.3.0
```

What's new:
- AgentRegistry v2 client with unified API
- Lazy Publish pipeline (`pending-publish.json` lifecycle)
- Drift detection in `ACTPClient.create()` (non-blocking)
- `actp publish` / `actp pull` / `actp diff` CLI commands
- Updated mainnet contract addresses + Gnosis Safe admin
- n8n community node v2.3.0 with matching updates

---

## Resources

- [npm Package](https://www.npmjs.com/package/@agirails/sdk)
- [GitHub Repository](https://github.com/agirails/sdk-js)
- [Contract Source](https://github.com/agirails/actp-kernel)
- [Documentation](https://docs.agirails.io)
- [Discord](https://discord.gg/nuhCt75qe4)
