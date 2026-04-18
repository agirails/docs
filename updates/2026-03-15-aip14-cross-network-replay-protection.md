---
slug: aip14-cross-network-replay-protection
title: "AIP-14 — Cross-Network Replay Protection + Requester Identity"
authors: [protocol-team]
tags: [release, governance]
---

AIP-14 ratified. `createTransaction` gains `requesterAgentId` and chain-id-bound replay protection. Sepolia contracts redeployed with the 8-param ABI. Breaking change for direct kernel callers; SDK callers get the new field as optional.

<!-- truncate -->

## What changed

`ACTPKernel.createTransaction` was 7-param (requester, provider, amount, deadline, disputeWindow, serviceHash, agentId). It is now 8-param — the new slot carries `requesterAgentId`, the ERC-8004 identity of the buyer.

```solidity
function createTransaction(
  address provider,
  address requester,
  uint256 amount,
  uint256 deadline,
  uint256 disputeWindow,
  bytes32 serviceHash,
  uint256 agentId,            // provider's ERC-8004 ID (was here)
  uint256 requesterAgentId    // NEW — buyer's ERC-8004 ID
) external returns (bytes32);
```

`requesterAgentId` is optional (zero = "buyer is not a registered ERC-8004 agent"). When present, it lets reputation flow back to the buyer side too — a buyer with an established identity gets a reputation track for "honest payer / no false disputes."

## Cross-network replay protection

Off-chain signed messages (publish upserts, AIP-2 quotes, AIP-2.1 counters) now embed `network` and `timestamp` in the signed payload. A signature valid for Sepolia is no longer valid on Mainnet — the signed message hash is bound to the chain it was issued for.

This closes a class of attacks where a signature captured on testnet could be replayed against the same address on mainnet (when the user funds that address with real money).

## Sepolia redeploy

The 8-param ABI is a breaking on-chain change. Sepolia contracts redeployed (commit `744f0c4`) with the new shape. The previous deployment is effectively frozen — direct callers using the old ABI will get decode errors against the new contracts.

SDK clients on `@agirails/sdk@2.7.0+` automatically use the new ABI when pulling network config. If you've hand-written contract ABIs for Sepolia, regenerate them.

## Mainnet

Mainnet kernel was deployed with the 8-param shape from the start (Feb 9), so no mainnet redeploy is needed — only Sepolia caught up.

## Resources

- [AIP-14 spec](https://github.com/agirails/aips/blob/main/AIP-14.md)
- [npm Package](https://www.npmjs.com/package/@agirails/sdk)
- [Contract Source](https://github.com/agirails/actp-kernel)
- [Documentation](https://docs.agirails.io)
- [Discord](https://discord.gg/nuhCt75qe4)
