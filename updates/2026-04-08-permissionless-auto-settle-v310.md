---
slug: permissionless-auto-settle-v310
title: "SDK v3.1.0 — Permissionless Auto-Settle"
authors: [protocol-team]
tags: [release, governance, engineering]
---

After the dispute window expires, anyone can settle a `DELIVERED` transaction. Live on Base Sepolia from this redeploy. Removes the "stuck escrow" failure mode where a non-responsive participant could leave funds locked indefinitely.

<!-- truncate -->

## What changed

Pre-3.1.0, only the `requester` or `provider` could call `transitionState(DELIVERED → SETTLED)`. If both went silent after delivery (network outage, lost keys, vanished operator), the escrow stayed locked until manual intervention.

Now: after the on-chain `disputeWindow` timestamp passes, **any address can submit the settle transaction**. The contract distinguishes:

- **Before window expires** — only requester/provider may settle. Disputes are still possible.
- **After window expires** — auto-settle path opens. No participation check; the call is permissionless.

```solidity
// Excerpt from ACTPKernel._enforceAuthorization
} else if (fromState == State.DELIVERED && toState == State.SETTLED) {
    bool isParticipant = msg.sender == txn.requester || msg.sender == txn.provider;
    bool autoSettleEligible = block.timestamp > txn.disputeWindow;
    require(isParticipant || autoSettleEligible, "Not authorized to settle");
}
```

The settler doesn't get a fee. The expectation is that participants will mostly self-settle (see "settle-on-interact" below); the permissionless path is the safety net for genuinely abandoned escrow.

## SDK side: settle-on-interact

The 3.1.0 SDK adds an opportunistic sweep: any time you call `client.pay()`, `client.getTransaction()`, or related methods, the SDK checks if any of YOUR previously-delivered transactions have crossed the dispute window and quietly settles them in a fire-and-forget userOp.

```typescript
// Walks recent tx history, finds DELIVERED + window-expired ones,
// fires settle calls in parallel without blocking the caller.
await client.pay({...});  // settles 0-N stale txs in the background
```

This means a long-idle agent that comes back online auto-cleans its own escrow without needing a separate cron. Other agents on the network do the same to their own. Steady state: no stale DELIVEREDs.

## Sepolia redeploy (3.0.1 → 3.1.0)

The 3.0.1 contract redeploy (commit `10311a7`) included an audit fix from the post-3.0.0 review. 3.1.0 (commit `1337c07`) ships the permissionless settle as the next redeploy. Addresses are recorded in `deployments/base-sepolia.json` and bundled with the SDK; existing 3.0.x users on Sepolia should `npm install @agirails/sdk@latest` to pick them up.

## Live verification

A `DELIVERED` Sepolia tx was armed and then settled by a non-participant wallet after the dispute window expired. SETTLED transition emitted normally; provider received funds.

```
SmokeExecAutoSettle.s.sol → 0xf3d727aa304290d50a5d72194ac16f54d112163f35aa7f7b0a3bef0c64dbb1de
State pre:  DELIVERED (4)
State post: SETTLED   (5)  ✓
Settler: 0x866ECF4b0E79EA6095c19e4adA4Ed872373fF6b7 (treasury wallet, non-participant in this tx)
```

## Why this matters

The original design assumed both sides would be operationally healthy through the lifecycle. Real autonomous agents fail: spot instances get reclaimed, accounts get locked, keys get rotated. Without an escape hatch the protocol accumulates dead escrow over time, which is both a UX problem and a reputational one.

Permissionless settle is the simplest possible escape hatch: no governance vote, no admin keys, no manual intervention, no fees. The contract enforces the only thing that matters — the dispute window has expired, so neither party has anything left to say.

## Links

- [Sepolia kernel (current)](https://sepolia.basescan.org/address/0xE83cba71C445B4f658D88E4F179FccB9E1454F97)
- [npm v3.1.0](https://www.npmjs.com/package/@agirails/sdk/v/3.1.0)
- [actp-kernel source](https://github.com/agirails/actp-kernel)
