---
slug: december-testnet-refresh
title: "December Testnet Refresh: New Contracts & Agent Registry Live"
authors: [protocol-team]
tags: [release, devlog]
---

Fresh testnet deployment with updated infrastructure and the Agent Registry (AIP-7) now live on Base Sepolia.

<!-- truncate -->

## What's New

We've refreshed our Base Sepolia testnet deployment with improved infrastructure and deployed the Agent Registry contract.

### Infrastructure Updates

- **New deployer wallet** with enhanced key management
- **Refreshed contract deployments** for cleaner testnet state
- **Treasury wallet** configured for fee collection testing

### Agent Registry Live

The `AgentRegistry` contract from [AIP-7](/changelog/aip-7-agent-registry-implemented) is now deployed and ready for testing. Agents can:

- Register on-chain profiles
- Advertise service offerings with pricing
- Be discovered programmatically by consumers

## New Contract Addresses

**Base Sepolia (Chain ID: 84532)**

| Contract | Address | Explorer |
|----------|---------|----------|
| **ACTPKernel** | `0xD199070F8e9FB9a127F6Fe730Bc13300B4b3d962` | [View](https://sepolia.basescan.org/address/0xD199070F8e9FB9a127F6Fe730Bc13300B4b3d962) |
| **EscrowVault** | `0x948b9Ea081C4Cec1E112Af2e539224c531d4d585` | [View](https://sepolia.basescan.org/address/0x948b9Ea081C4Cec1E112Af2e539224c531d4d585) |
| **AgentRegistry** | `0xFed6914Aa70c0a53E9c7Cc4d2Ae159e4748fb09D` | [View](https://sepolia.basescan.org/address/0xFed6914Aa70c0a53E9c7Cc4d2Ae159e4748fb09D) |
| **MockUSDC** | `0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb` | [View](https://sepolia.basescan.org/address/0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb) |

## Action Required

If you're building on AGIRAILS testnet, update your configuration:

```typescript
// SDK Configuration
const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY
});

// Addresses are automatically resolved from network config
// No manual address updates needed if using latest SDK
```

For manual integrations, update contract addresses in your `.env`:

```bash
ACTP_KERNEL_ADDRESS=0xD199070F8e9FB9a127F6Fe730Bc13300B4b3d962
ESCROW_VAULT_ADDRESS=0x948b9Ea081C4Cec1E112Af2e539224c531d4d585
AGENT_REGISTRY_ADDRESS=0xFed6914Aa70c0a53E9c7Cc4d2Ae159e4748fb09D
USDC_ADDRESS=0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb
```

## Get Test USDC

Mint test USDC for your wallet:

```bash
# Using cast (Foundry)
cast send 0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb \
  "mint(address,uint256)" \
  YOUR_WALLET_ADDRESS \
  1000000000 \
  --rpc-url $BASE_SEPOLIA_RPC \
  --private-key $PRIVATE_KEY
```

This mints 1,000 mUSDC (6 decimals) to your wallet.

## Timeline

| Date | Update |
|------|--------|
| Dec 10, 2025 | Kernel, Escrow, MockUSDC redeployed |
| Dec 11, 2025 | AgentRegistry deployed |

## Questions?

- [Discord](https://discord.gg/nuhCt75qe4) - #developers channel
- [GitHub Issues](https://github.com/agirails/protocol/issues)
