---
slug: permissionless-auto-settle-v310
title: "SDK v3.1.0 — Permissionless Auto-Settle"
authors: [protocol-team]
tags: [release, governance]
---

After the dispute window expires, anyone can settle a `DELIVERED` transaction. Live on Base Sepolia from this redeploy. Removes the "stuck escrow" failure mode where a non-responsive participant could leave funds locked indefinitely.

<!-- truncate -->

## Install

```bash
npm install @agirails/sdk@3.1.0
```

## What changed

Pre-3.1.0, only the `requester` or `provider` could call `transitionState(DELIVERED → SETTLED)`. If both went silent after delivery, the escrow stayed locked until manual intervention.

Now: after the on-chain `disputeWindow` timestamp passes, **any address can submit the settle transaction**.

```solidity
// Excerpt from ACTPKernel._enforceAuthorization
} else if (fromState == State.DELIVERED && toState == State.SETTLED) {
    bool isParticipant = msg.sender == txn.requester || msg.sender == txn.provider;
    bool autoSettleEligible = block.timestamp > txn.disputeWindow;
    require(isParticipant || autoSettleEligible, "Not authorized to settle");
}
```

The settler doesn't get a fee. The expectation is that participants will mostly self-settle (see "settle-on-interact" below); the permissionless path is the safety net for genuinely abandoned escrow.

## Settle-on-interact (SDK side)

The 3.1.0 SDK adds an opportunistic sweep: any time you call `client.pay()`, `client.getTransaction()`, or related methods, the SDK checks if any of YOUR previously-delivered transactions have crossed the dispute window and quietly settles them in a fire-and-forget userOp.

```typescript
// Walks recent tx history, finds DELIVERED + window-expired ones,
// fires settle calls in parallel without blocking the caller.
await client.pay({...});  // settles 0-N stale txs in the background
```

A long-idle agent that comes back online auto-cleans its own escrow without needing a separate cron.

## Sepolia redeploy

The 3.0.1 contract redeploy (commit `10311a7`) included an audit fix from the post-3.0.0 review. 3.1.0 (commit `1337c07`) ships the permissionless settle as the next redeploy. Addresses are recorded in `deployments/base-sepolia.json` and bundled with the SDK.

## Live verification

A `DELIVERED` Sepolia tx was armed and then settled by a non-participant wallet after the dispute window expired:

```
SmokeExecAutoSettle.s.sol → 0xf3d727aa304290d50a5d72194ac16f54d112163f35aa7f7b0a3bef0c64dbb1de
State pre:  DELIVERED (4)
State post: SETTLED   (5)  ✓
Settler: 0x866ECF4b0E79EA6095c19e4adA4Ed872373fF6b7 (treasury wallet, non-participant in this tx)
```

## Resources

- [npm Package](https://www.npmjs.com/package/@agirails/sdk)
- [GitHub Repository](https://github.com/agirails/sdk-js)
- [Contract Source](https://github.com/agirails/actp-kernel)
- [Documentation](https://docs.agirails.io)
- [Discord](https://discord.gg/nuhCt75qe4)
