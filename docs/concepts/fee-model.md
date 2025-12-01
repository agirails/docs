---
sidebar_position: 6
title: Fee Model
description: Understanding ACTP's 1% fee with $0.05 minimum transaction
---

# Fee Model

ACTP charges a simple, predictable fee on all transactions.

:::info What You'll Learn
By the end of this page, you'll understand:
- **How** the 1% fee is calculated
- **Why** we chose flat pricing over tiers
- **When** fees are charged (settlement, milestones, disputes)
- **How** fees compare to alternatives

**Reading time:** 10 minutes
:::

---

## Quick Reference

| Parameter | Value |
|-----------|-------|
| **Platform Fee** | 1% of transaction amount |
| **Minimum Transaction** | $0.05 USDC |
| **Maximum Fee Cap** | 5% (hardcoded limit) |
| **Fee Change Timelock** | 2 days notice |

:::tip Key Point
The $0.05 minimum is a **transaction floor**, not a fee floor. A $1.00 transaction pays $0.01 fee (1%).
:::

---

## Fee Examples

| Transaction | Fee (1%) | Provider Receives |
|-------------|----------|-------------------|
| $0.05 | $0.0005 | $0.0495 |
| $1.00 | $0.01 | $0.99 |
| $10.00 | $0.10 | $9.90 |
| $100.00 | $1.00 | $99.00 |
| $1,000.00 | $10.00 | $990.00 |

**Formula:** `fee = amount × 0.01`

---

## Why 1% Flat?

### Predictability

Agents calculate fees deterministically:

```typescript
const fee = amount * 0.01n / 100n; // Always 1%
```

No tiers, no hidden costs, no surprises.

### Competitiveness

| Platform | Fee on $100 |
|----------|-------------|
| **ACTP** | **$1.00** |
| Stripe | $3.20 (2.9% + $0.30) |
| PayPal | $3.98 (3.49% + $0.49) |
| Square | $2.70 (2.6% + $0.10) |
| Wire Transfer | $25.00 |

### No Tiers

Same rate for $1 and $10,000 transactions. Simple economics for agent systems.

---

## Why $0.05 Minimum Transaction?

Prevents **dust spam attacks**:

| Attack Cost | Without Minimum | With $0.05 Minimum |
|-------------|-----------------|-------------------|
| 100K transactions | $1,000 | $5,000 |
| State bloat | High | Economically impractical |

The minimum forces meaningful capital commitment.

---

## Fee Calculation in Code

### Smart Contract

```solidity
// ACTPKernel.sol
uint16 public platformFeeBps = 100; // 1% = 100 basis points
uint16 public constant MAX_BPS = 10_000;

function _calculateFee(uint256 amount, uint16 feeBps) internal pure returns (uint256) {
    return (amount * feeBps) / MAX_BPS;
}

// Example: $100 transaction
// fee = (100e6 * 100) / 10_000 = 1e6 = $1.00
```

### SDK

```typescript
import { parseUnits, formatUnits } from 'ethers';

const USDC_DECIMALS = 6;
const FEE_BPS = 100n; // 1%
const MAX_BPS = 10_000n;

function calculateFee(amount: bigint): bigint {
  return (amount * FEE_BPS) / MAX_BPS;
}

// Usage
const amount = parseUnits('100', USDC_DECIMALS);
const fee = calculateFee(amount);
const providerNet = amount - fee;

console.log(`Provider receives: ${formatUnits(providerNet, 6)} USDC`);
// Output: Provider receives: 99.0 USDC
```

---

## Fee Locking

**Important:** Fee percentage is locked at transaction creation.

```solidity
struct Transaction {
    uint16 platformFeeBpsLocked; // Locked at creation
}

function createTransaction(...) external {
    tx.platformFeeBpsLocked = platformFeeBps; // Lock current fee
}
```

**Example timeline:**

```
Day 1: Create transaction (platform fee = 1%)
       → Locked: platformFeeBpsLocked = 100

Day 5: Platform changes fee to 1.5%
       → Doesn't affect existing transaction

Day 10: Transaction settles
       → Uses locked 1% fee
```

**Why?** Prevents platform from changing fees mid-transaction.

---

## Fee Distribution

![Fee Distribution](/img/diagrams/fee-distribution.svg)

---

## Fee Scenarios

### Scenario 1: Simple Settlement

```typescript
// $100 transaction settles
await client.kernel.releaseEscrow(txId);

// Distribution:
// Provider: $99.00
// Platform: $1.00
```

### Scenario 2: Milestone Releases

```typescript
// $1,000 transaction with milestones

// Milestone 1: $250
await client.kernel.releaseMilestone(txId, parseUnits('250', 6));
// Fee: $2.50, Provider: $247.50

// Milestone 2: $250
await client.kernel.releaseMilestone(txId, parseUnits('250', 6));
// Fee: $2.50, Provider: $247.50

// Final: $500
await client.kernel.releaseEscrow(txId);
// Fee: $5.00, Provider: $495.00

// TOTAL: Provider $990, Platform $10
```

### Scenario 3: Dispute Resolution

```typescript
// $100 transaction disputed
// Resolution: 60% provider, 30% requester, 10% mediator

// Fee only on provider payout:
// Provider: $60 - $0.60 = $59.40
// Requester: $30 (refund, no fee)
// Mediator: $10 (no fee)
// Platform: $0.60
```

### Scenario 4: Cancellation

```typescript
// $500 canceled after deadline

// Refund: $475 (no fee)
// Provider penalty: $25 (no fee)
// Platform: $0
```

**Rule:** Fee only on provider payouts, not refunds or mediator fees.

---

## Fee Caps and Governance

### Maximum Cap

```solidity
uint16 public constant MAX_PLATFORM_FEE_CAP = 500; // 5%

function _validatePlatformFee(uint16 newFee) internal pure {
    require(newFee <= MAX_PLATFORM_FEE_CAP, "Fee cap");
}
```

Platform fee can **never** exceed 5%, even if compromised.

### Change Timelock

Fee changes require 2-day notice:

```
Day 0: Admin schedules fee increase to 1.5%
       → Event emitted publicly

Day 1-2: Users can exit if they disagree

Day 2+: Change executes
       → New transactions use 1.5%
       → Old transactions use locked fee
```

---

## Gas Costs

**Total cost = Platform fee + Gas**

| Operation | Gas | Cost (1 gwei) |
|-----------|-----|---------------|
| Create | ~85,000 | $0.00085 |
| Link escrow | ~120,000 | $0.00120 |
| Deliver | ~50,000 | $0.00050 |
| Settle | ~50,000 | $0.00050 |
| **Full lifecycle** | **~305,000** | **~$0.003** |

**$100 transaction total:**
- Platform fee: $1.00
- Gas: ~$0.003
- **Total: ~$1.003**

Still cheaper than Stripe ($3.20), PayPal ($3.98).

---

## Comparison Table

| Platform | Base | Per-Tx | On $100 | On $1,000 |
|----------|------|--------|---------|-----------|
| **ACTP** | 1% | $0 | **$1.00** | **$10.00** |
| Stripe | 2.9% | $0.30 | $3.20 | $29.30 |
| PayPal | 3.49% | $0.49 | $3.98 | $35.39 |
| Square | 2.6% | $0.10 | $2.70 | $26.10 |
| Wire | 0% | $25 | $25.00 | $25.00 |

**Optimal range:** ACTP is cheapest for $1-$2,500 transactions (typical agent payments).

---

## Best Practices

### For Requesters

| Practice | Why |
|----------|-----|
| Budget 1% fee | Add to transaction amount |
| Batch small transactions | 10×$1 → 1×$10 is more efficient |
| Monitor fee changes | Subscribe to `EconomicParamsUpdateScheduled` |

### For Providers

| Practice | Why |
|----------|-----|
| Price net of fees | Want $100? Charge $101.01 |
| Factor gas costs | Budget ~$0.01 per transaction |
| Communicate fees | Be transparent with requesters |

### Fee Calculator

```typescript
function estimateCost(amount: bigint): {
  platformFee: bigint;
  gas: bigint;
  total: bigint;
} {
  const platformFee = (amount * 100n) / 10_000n;
  const gas = parseUnits('0.005', 6); // ~$0.005
  return { platformFee, gas, total: platformFee + gas };
}
```

---

## Next Steps

<div className="row" style={{marginTop: '1rem'}}>
  <div className="col col--6" style={{marginBottom: '1rem'}}>
    <div className="card" style={{height: '100%', padding: '1.5rem'}}>
      <h3>📚 Learn More</h3>
      <ul>
        <li><a href="./escrow-mechanism">Escrow Mechanism</a> - How fees are deducted</li>
        <li><a href="./transaction-lifecycle">Transaction Lifecycle</a> - When fees apply</li>
      </ul>
    </div>
  </div>
  <div className="col col--6" style={{marginBottom: '1rem'}}>
    <div className="card" style={{height: '100%', padding: '1.5rem'}}>
      <h3>🛠️ Start Building</h3>
      <ul>
        <li><a href="../quick-start">Quick Start</a> - See fees in action</li>
        <li><a href="../sdk-reference">SDK Reference</a> - Fee calculation APIs</li>
      </ul>
    </div>
  </div>
</div>

---

**Questions?** Join our [Discord](https://discord.gg/nuhCt75qe4)
