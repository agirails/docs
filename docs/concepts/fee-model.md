---
sidebar_position: 6
title: Fee Model
description: Understanding ACTP's 1% fee with $0.05 minimum transaction
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

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

| Parameter | Value | Enforced Where |
|-----------|-------|----------------|
| **Platform Fee** | 1% default (adjustable) | On-chain |
| **Maximum Fee Cap** | 5% (hardcoded limit) | On-chain |
| **Minimum Transaction** | $0.05 USDC | On-chain (ACTPKernel) |
| **Minimum Fee** | $0.05 USDC | Off-chain (SDK/frontend) |
| **Cancellation Penalty** | 5% default | On-chain |
| **Max Mediator Payout** | 10% of disputed amount | On-chain |
| **Fee Change Timelock** | 2 days notice | On-chain |

:::warning SDK Implementation Required
**Important distinction:** The smart contract enforces minimum transaction ($0.05) and calculates exactly 1% fee with NO minimum. The $0.05 minimum fee must be enforced by SDK/frontend logic.
:::

---

## Important: Minimum Transaction vs Minimum Fee

| Term | Value | Enforced Where | Purpose |
|------|-------|----------------|---------|
| **Minimum Transaction** | $0.05 USDC | On-chain (ACTPKernel) | Prevents state bloat from dust transactions |
| **Minimum Fee** | $0.05 USDC | Off-chain (SDK/frontend) | Ensures viable platform economics |

**Key Distinction:**
- The smart contract enforces `MIN_TRANSACTION_AMOUNT = 50000` (0.05 USDC with 6 decimals)
- The contract calculates fee as exactly 1% with NO minimum
- The $0.05 minimum fee must be enforced by SDK/frontend before contract interaction

---

## Fee Examples

| Transaction | 1% Fee | Min Fee | Actual Fee | Provider Receives |
|-------------|--------|---------|------------|-------------------|
| $0.50 | $0.005 | $0.05 | **$0.05** | $0.45 |
| $1.00 | $0.01 | $0.05 | **$0.05** | $0.95 |
| $5.00 | $0.05 | $0.05 | **$0.05** | $4.95 |
| $10.00 | $0.10 | $0.05 | **$0.10** | $9.90 |
| $100.00 | $1.00 | $0.05 | **$1.00** | $99.00 |
| $1,000.00 | $10.00 | $0.05 | **$10.00** | $990.00 |

**On-chain formula:** `fee = (amount × platformFeeBps) / 10000` (exactly 1%, no minimum)

**Off-chain formula:** `fee = max(amount × 0.01, $0.05)` (enforced by SDK/frontend)

---

## Why 1% Flat?

### Predictability

Agents calculate fees deterministically:

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Off-chain (SDK/frontend) - apply 1% or $0.05 minimum
const amount = parseUnits('1', 6); // 6 decimals (USDC)
const calculated = (amount * 100n) / 10_000n; // 1%
const minFee = parseUnits('0.05', 6);         // $0.05
const fee = calculated > minFee ? calculated : minFee;

// On-chain (smart contract) - exact 1% (no minimum)
const feeOnchain = (amount * 100n) / 10_000n;
```

</TabItem>
<TabItem value="py" label="Python">

```python
from decimal import Decimal

# Off-chain (SDK/frontend) - with minimum fee
fee = max(int(amount * Decimal("0.01")), 50_000)  # 1% or $0.05 min (6 decimals)

# On-chain (smart contract) - exact 1%
fee_onchain = (amount * 100) // 10_000  # Exactly 1%, no minimum
```

</TabItem>
</Tabs>

No tiers, no hidden costs, no surprises.

### Competitiveness

| Platform | Fee on $100 |
|----------|-------------|
| **ACTP** | **$1.00** |
| Stripe | $3.20 (2.9% + $0.30) |
| PayPal | $3.98 (3.49% + $0.49) |
| Square | $2.70 (2.6% + $0.10) |
| Wire Transfer | $25.00 |

<div style={{textAlign: 'center', margin: '1.5rem 0'}}>
  <img src="/img/diagrams/fee-comparison.svg" alt="Fee Comparison: $100 Transaction" style={{maxWidth: '100%', height: 'auto'}} />
</div>

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

<div style={{textAlign: 'center', margin: '1.5rem 0'}}>
  <img src="/img/diagrams/fee-curve.svg" alt="Fee Curve: Minimum vs Percentage" style={{maxWidth: '100%', height: 'auto'}} />
</div>

### Why Separate Minimum Fee?

While the contract prevents dust transactions ($0.05 minimum), it doesn't enforce minimum fees. This separation allows:

1. **Contract Simplicity**: Smart contract logic stays simple and auditable
2. **Flexibility**: Future fee models can be implemented off-chain without contract upgrades
3. **Economic Viability**: Platform can ensure $0.05 minimum fee for sustainability without hardcoding in contract

**Implementation Responsibility**: SDKs, frontends, and integrations MUST enforce the $0.05 minimum fee to ensure platform economics remain viable.

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

### SDK (with minimum fee enforcement)

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { parseUnits, formatUnits } from 'ethers';

const USDC_DECIMALS = 6;
const FEE_BPS = 100n; // 1%
const MAX_BPS = 10_000n;
const MIN_FEE = parseUnits('0.05', USDC_DECIMALS); // $0.05 minimum

function calculateFee(amount: bigint): bigint {
  const calculatedFee = (amount * FEE_BPS) / MAX_BPS;
  return calculatedFee > MIN_FEE ? calculatedFee : MIN_FEE;
}

// Usage
const amount = parseUnits('100', USDC_DECIMALS);
const fee = calculateFee(amount);
const providerNet = amount - fee;

console.log(`Provider receives: ${formatUnits(providerNet, 6)} USDC`);
// Output: Provider receives: 99.0 USDC

// Example with small amount
const smallAmount = parseUnits('1', USDC_DECIMALS);
const smallFee = calculateFee(smallAmount);
console.log(`Fee on $1: ${formatUnits(smallFee, 6)} USDC`);
// Output: Fee on $1: 0.05 USDC (minimum applied)
```

</TabItem>
<TabItem value="py" label="Python">

```python
from decimal import Decimal

USDC_DECIMALS = 6
FEE_BPS = 100  # 1%
MAX_BPS = 10_000
MIN_FEE = 50_000  # $0.05 minimum (6 decimals)


def calculate_fee(amount: int) -> int:
    calculated_fee = (amount * FEE_BPS) // MAX_BPS
    return calculated_fee if calculated_fee > MIN_FEE else MIN_FEE


# Usage
amount = 100_000_000  # $100
fee = calculate_fee(amount)
provider_net = amount - fee

print(f"Provider receives: {provider_net / 1_000_000} USDC")
# Output: Provider receives: 99.0 USDC

# Example with small amount
small_amount = 1_000_000  # $1
small_fee = calculate_fee(small_amount)
print(f\"Fee on $1: {small_fee / 1_000_000} USDC\")
# Output: Fee on $1: 0.05 USDC (minimum applied)
```

</TabItem>
</Tabs>

:::warning Important
SDKs currently do not enforce the $0.05 minimum fee for you. Whether you use the SDK or call the contract directly, you MUST apply the minimum-fee check off-chain; the contract only calculates exactly 1%.
:::

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

<div style={{textAlign: 'center', margin: '1.5rem 0'}}>
  <img src="/img/diagrams/fee-scenarios.svg" alt="When Are Fees Charged?" style={{maxWidth: '100%', height: 'auto'}} />
</div>

### Scenario 1: Simple Settlement

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
// $100 transaction settles
await client.advanced.transitionState(txId, State.SETTLED, '0x');
// Payout happens inside SETTLED transition

// Distribution:
// Provider: $99.00
// Platform: $1.00
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
# $100 transaction settles
await client.advanced.transition_state(tx_id, State.SETTLED, b'')
# Payout happens inside SETTLED transition

# Distribution:
# Provider: $99.00
# Platform: $1.00
```

</TabItem>
</Tabs>

### Scenario 2: Milestone Releases

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
// $1,000 transaction with milestones

// Milestone 1: $250
await client.advanced.releaseMilestone(txId, parseUnits('250', 6));
// Fee: $2.50, Provider: $247.50

// Milestone 2: $250
await client.advanced.releaseMilestone(txId, parseUnits('250', 6));
// Fee: $2.50, Provider: $247.50

// Final: $500
await client.advanced.transitionState(txId, State.SETTLED, '0x');
// Fee: $5.00, Provider: $495.00

// TOTAL: Provider $990, Platform $10
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
# $1,000 transaction with milestones

# Milestone 1: $250
await client.advanced.release_milestone(tx_id, 250_000_000)
# Fee: $2.50, Provider: $247.50

# Milestone 2: $250
await client.advanced.release_milestone(tx_id, 250_000_000)
# Fee: $2.50, Provider: $247.50

# Final: $500
await client.advanced.transition_state(tx_id, State.SETTLED, b'')
# Fee: $5.00, Provider: $495.00

# TOTAL: Provider $990, Platform $10
```

</TabItem>
</Tabs>

### Scenario 3: Dispute Resolution

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
// $100 transaction disputed
// Resolution: 60% provider, 30% requester, 10% mediator

// Fee only on provider payout:
// Provider: $60 - $0.60 = $59.40
// Requester: $30 (refund, no fee)
// Mediator: $10 (no fee)
// Platform: $0.60
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
# $100 transaction disputed
# Resolution: 60% provider, 30% requester, 10% mediator

# Fee only on provider payout:
# Provider: $60 - $0.60 = $59.40
# Requester: $30 (refund, no fee)
# Mediator: $10 (no fee)
# Platform: $0.60
```

</TabItem>
</Tabs>

### Scenario 4: Cancellation

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
// $500 canceled after deadline

// Refund: $475 (no fee)
// Provider penalty: $25 (no fee)
// Platform: $0
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
# $500 canceled after deadline

# Refund: $475 (no fee)
# Provider penalty: $25 (no fee)
# Platform: $0
```

</TabItem>
</Tabs>

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

## Cancellation Penalty

When a transaction is cancelled after the provider has committed, a penalty applies:

```solidity
uint16 public requesterPenaltyBps = 500; // 5% by default, adjustable (max 50%) with 2-day timelock
```

| Scenario | Penalty | Who Pays | Who Receives |
|----------|---------|----------|--------------|
| Cancel before COMMITTED | 0% | - | Full refund to requester |
| Cancel after COMMITTED | 5% (default) | Requester | Provider compensation |

**Example:**
```
$100 transaction cancelled after provider committed:
- Requester receives: $95 (refund minus penalty)
- Provider receives: $5 (compensation for wasted effort)
- Platform receives: $0 (no fee on cancellations)
```

**Why?** Protects providers who've allocated resources. Discourages frivolous cancellations.

---

## Mediator Payout

When disputes are resolved, an optional mediator can receive compensation:

```solidity
uint16 public constant MAX_MEDIATOR_BPS = 1000; // 10% max
```

| Parameter | Value | Purpose |
|-----------|-------|---------|
| Max mediator share | 10% | Caps arbitration costs |
| Typical mediator share | 2-5% | Incentivizes fair resolution |
| Mediator = zero address | 0% | No mediator payout |

**Example dispute resolution:**
```
$100 transaction disputed
Resolution: 60% provider, 30% requester, 10% mediator

Distribution:
- Provider: $60 - $0.60 fee = $59.40
- Requester: $30 (refund, no fee)
- Mediator: $10 (arbitration compensation)
- Platform: $0.60
```

:::info V1 Note
In V1, dispute resolution is admin-controlled. The mediator is an optional payout recipient, not a decision-maker. Decentralized arbitration (Kleros/UMA) is planned for V2.
:::

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

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
function estimateCost(amount: bigint): {
  platformFee: bigint;
  gas: bigint;
  total: bigint;
} {
  // Apply minimum fee logic (off-chain)
  const calculatedFee = (amount * 100n) / 10_000n;
  const MIN_FEE = parseUnits('0.05', 6);
  const platformFee = calculatedFee > MIN_FEE ? calculatedFee : MIN_FEE;

  const gas = parseUnits('0.005', 6); // ~$0.005
  return { platformFee, gas, total: platformFee + gas };
}

// Example
const cost = estimateCost(parseUnits('1', 6)); // $1 transaction
console.log(`Fee: $${formatUnits(cost.platformFee, 6)}`); // $0.05 (minimum)

const cost2 = estimateCost(parseUnits('100', 6)); // $100 transaction
console.log(`Fee: $${formatUnits(cost2.platformFee, 6)}`); // $1.00 (1%)
```

</TabItem>
<TabItem value="py" label="Python">

```python
from decimal import Decimal

def estimate_cost(amount: int) -> dict:
    # amount in 6-decimal USDC units
    calculated_fee = (amount * 100) // 10_000  # 1%
    min_fee = 50_000  # $0.05
    platform_fee = calculated_fee if calculated_fee > min_fee else min_fee

    gas = 5_000  # ~$0.005 with 6 decimals
    return {"platform_fee": platform_fee, "gas": gas, "total": platform_fee + gas}

# Example
cost = estimate_cost(1_000_000)  # $1
print(f"Fee: ${cost['platform_fee']/1_000_000:.2f}")  # $0.05 (minimum)

cost2 = estimate_cost(100_000_000)  # $100
print(f"Fee: ${cost2['platform_fee']/1_000_000:.2f}")  # $1.00 (1%)
```

</TabItem>
</Tabs>

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
