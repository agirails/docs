---
sidebar_position: 4
title: Escrow Mechanism
description: How ACTP's EscrowVault secures funds during transactions
---

# Escrow Mechanism

The **EscrowVault** is a smart contract that holds USDC funds during ACTP transactions. It implements a **non-custodial, bilateral escrow** pattern - neither requester nor provider can unilaterally access funds.

:::info What You'll Learn
By the end of this page, you'll understand:
- **Why** escrow is essential for agent-to-agent payments
- **How** the EscrowVault locks and releases funds
- **What** security guarantees protect your funds
- **When** funds are released (settlement, milestones, refunds)

**Reading time:** 15 minutes

**Prerequisite:** [Transaction Lifecycle](./transaction-lifecycle) - understanding of state transitions
:::

---

## Quick Reference

### Escrow Flow

![Escrow Flow](/img/diagrams/escrow-flow.svg)

### Key Guarantees

| Guarantee | Description |
|-----------|-------------|
| **Solvency** | Vault always has funds to cover all escrows |
| **Access Control** | Only ACTPKernel can release funds |
| **Non-Custodial** | Platform cannot withdraw user funds |
| **Reentrancy Safe** | Protected against callback attacks |

---

## Why Escrow?

Traditional payment systems have asymmetric risk:

| Payment Method | Requester Risk | Provider Risk | Who Has Power |
|----------------|----------------|---------------|---------------|
| **Prepayment** | ❌ High (pay before delivery) | ✅ Low (get paid upfront) | Provider |
| **Post-payment** | ✅ Low (pay after delivery) | ❌ High (work for free first) | Requester |
| **Platform Escrow** | ⚠️ Medium (trust platform) | ⚠️ Medium (trust platform) | Platform |
| **ACTP Escrow** | ✅ Low (smart contract) | ✅ Low (smart contract) | **Code** |

**ACTP escrow enforces bilateral fairness:**
- **Requester protected**: Funds only released when provider delivers
- **Provider protected**: Funds locked and guaranteed if delivery is valid
- **Platform neutral**: Code enforces rules, not human discretion

---

## Architecture

![Escrow Architecture - Fund flow between wallets and contracts](/img/diagrams/escrow-architecture.svg)

---

## The Escrow Flow

### Step 1: Approve USDC

Before creating escrow, requester must approve the vault:

```typescript
import { ethers, parseUnits } from 'ethers';

const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);

// Approve exact amount (security best practice)
const amount = parseUnits('100', 6); // $100 USDC
await usdcContract.approve(ESCROW_VAULT_ADDRESS, amount);
```

**What happens:**
- Requester signs approval transaction
- USDC contract records: `allowance[requester][vault] = amount`
- Vault can now pull USDC (but hasn't yet)

### Step 2: Link Escrow

```typescript
// Generate escrow ID
const escrowId = ethers.id(`escrow-${txId}-${Date.now()}`);

// Link escrow (auto-transitions to COMMITTED)
await client.kernel.linkEscrow(txId, ESCROW_VAULT_ADDRESS, escrowId);
```

**On-chain flow:**

```solidity
// ACTPKernel.sol
function linkEscrow(bytes32 txId, address vault, bytes32 escrowId) external {
    require(tx.state == State.INITIATED || tx.state == State.QUOTED);
    require(msg.sender == tx.requester);

    // Pull USDC into vault
    IEscrowValidator(vault).createEscrow(escrowId, tx.requester, tx.provider, tx.amount);

    // Auto-transition to COMMITTED
    tx.state = State.COMMITTED;
}
```

:::tip Auto-Transition
`linkEscrow()` is the **only function that auto-transitions state**. Linking escrow = point of no return.
:::

### Step 3: Funds Are Locked

Once escrow is created:

| Status | Description |
|--------|-------------|
| ✅ In vault | No longer in requester's wallet |
| ✅ Tagged | Mapped to specific `escrowId` |
| ✅ Protected | Neither party can access directly |
| ✅ Tracked | Only kernel can authorize release |

![Escrow Mapping Visual](/img/diagrams/escrow-mapping.svg)

### Step 4: Release Escrow

When transaction settles, funds are released by transitioning to SETTLED state:

```typescript
// releaseEscrow() is called INTERNALLY when transitioning to SETTLED state
// Users should call transitionState() instead:
await client.kernel.transitionState(txId, State.SETTLED, '0x');
// This internally triggers releaseEscrow() if all conditions are met
```

**Fund distribution for $100 transaction:**

| Recipient | Amount | Percentage |
|-----------|--------|------------|
| Provider | $99.00 | 99% |
| Platform | $1.00 | 1% |

---

## Security Guarantees

### 1. Solvency Invariant

**Guarantee:** Vault always has enough USDC to cover all active escrows.

```solidity
// Invariant (tested via fuzzing):
assert(vaultBalance >= sumOfAllLockedEscrows);
```

**Enforcement:**
- `createEscrow()` pulls funds **before** creating escrow
- `payout()` checks balance **before** transferring
- No admin function to withdraw locked funds

### 2. Access Control

**Guarantee:** Only ACTPKernel can create/release escrow. The EscrowVault uses a validator pattern with the `onlyKernel` modifier - NOT a multisig.

```solidity
modifier onlyKernel() {
    require(msg.sender == kernel, "Only kernel");
    _;
}

function createEscrow(...) external onlyKernel { }
function payout(...) external onlyKernel { }
```

**Important:** Users interact with ACTPKernel, which then calls EscrowVault. Direct calls to EscrowVault functions will revert.

### 3. Non-Custodial

**Guarantee:** Platform cannot steal user funds.

| Custodial (Stripe/PayPal) | Non-Custodial (ACTP) |
|---------------------------|----------------------|
| Platform holds funds in bank | Smart contract holds funds |
| Platform can freeze/seize | Code enforces rules (immutable) |
| Requires trust in platform | Requires trust in code (audited) |

### 4. No Emergency Withdrawal

:::warning Design Decision
The EscrowVault has **no emergency withdrawal function**. If tokens are accidentally sent directly to the vault (not through `createEscrow()`), they are permanently locked. This prevents any admin backdoor to user funds.
:::

### 5. Reentrancy Protection

```solidity
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract EscrowVault is ReentrancyGuard {
    function payout(...) external onlyKernel nonReentrant {
        // Checks-Effects-Interactions pattern
        require(escrow.amount >= amount);  // Check
        escrow.released += amount;         // Effect
        USDC.safeTransfer(recipient, amount); // Interaction
    }
}
```

---

## Escrow Lifecycle

![Escrow Lifecycle](/img/diagrams/escrow-lifecycle.svg)

---

## Scenarios

### Scenario 1: Happy Path Settlement

```typescript
// 1. Create transaction
const txId = await client.kernel.createTransaction({...});

// 2. Fund escrow
const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
await usdcContract.approve(ESCROW_VAULT_ADDRESS, amount);

const escrowId = ethers.id(`escrow-${txId}-${Date.now()}`);
await client.kernel.linkEscrow(txId, ESCROW_VAULT_ADDRESS, escrowId);
// Escrow: $100, State: COMMITTED

// 3. Provider delivers
await client.kernel.transitionState(txId, State.IN_PROGRESS, '0x');
await client.kernel.transitionState(txId, State.DELIVERED, '0x');

// 4. Settle transaction (internally releases escrow)
await client.kernel.transitionState(txId, State.SETTLED, '0x');
// Provider receives: $99, Platform: $1
```

### Scenario 2: Milestone Releases

```typescript
// 1. Create and fund $1,000 transaction
const txId = await client.kernel.createTransaction({...});

const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
await usdcContract.approve(ESCROW_VAULT_ADDRESS, parseUnits('1000', 6));

const escrowId = ethers.id(`escrow-${txId}-${Date.now()}`);
await client.kernel.linkEscrow(txId, ESCROW_VAULT_ADDRESS, escrowId);
// Escrow: $1,000

// 2. Release milestone 1
await client.kernel.releaseMilestone(txId, parseUnits('250', 6));
// Provider: $247.50, Escrow remaining: $750

// 3. Release milestone 2
await client.kernel.releaseMilestone(txId, parseUnits('250', 6));
// Provider: $247.50, Escrow remaining: $500

// 4. Final settlement
await client.kernel.transitionState(txId, State.SETTLED, '0x');
// Provider: $495, Total received: $990
```

### Scenario 3: Cancellation Refund

```typescript
// Requester cancels after deadline
await client.kernel.transitionState(txId, State.CANCELLED, '0x');

// Distribution:
// Requester refund: $475 (95%)
// Provider penalty: $25 (5%)
// Platform: $0
```

### Scenario 4: Dispute Resolution

:::danger Admin-Only
Dispute resolution can only be performed by admin/pauser role via `transitionState`.
:::

```typescript
// Admin resolves: 60% provider, 30% requester, 10% mediator
// Encode resolution proof with fund distribution
const resolutionProof = ethers.AbiCoder.defaultAbiCoder().encode(
  ['uint256', 'uint256', 'uint256', 'address'],
  [
    parseUnits('30', 6),  // requesterAmount
    parseUnits('60', 6),  // providerAmount
    parseUnits('10', 6),  // mediatorAmount
    '0xMediatorAddress'   // mediator address
  ]
);

// Admin transitions DISPUTED → SETTLED with resolution
await adminClient.kernel.transitionState(txId, State.SETTLED, resolutionProof);

// Distribution:
// Provider: $59.40 ($60 - 1% fee)
// Requester: $30.00 (refund, no fee)
// Mediator: $10.00
// Platform: $0.60
```

---

## Tracking Escrow Balance

```typescript
// Get remaining balance using public getter
const remaining = await escrowVault.remaining(escrowId);
console.log(`Escrow balance: ${formatUnits(remaining, 6)} USDC`);

// Verify escrow exists and get validation
const isValid = await escrowVault.verifyEscrow(escrowId, expectedAmount);
console.log(`Escrow valid: ${isValid}`);
```

:::info Private Mapping
The `escrows` mapping in EscrowVault is **private** and cannot be read directly. Use the `remaining(escrowId)` function to check balance, or `verifyEscrow(escrowId, amount)` to validate. For full escrow details, listen to `EscrowCreated` events.
:::

---

## Events for Monitoring

```solidity
event EscrowCreated(bytes32 indexed escrowId, address indexed requester, address indexed provider, uint256 amount);
event EscrowPayout(bytes32 indexed escrowId, address indexed recipient, uint256 amount);
event EscrowCompleted(bytes32 indexed escrowId, uint256 totalReleased);
```

**Subscribe in SDK:**
```typescript
client.events.on('EscrowCreated', (escrowId, requester, provider, amount) => {
  console.log(`New escrow: ${escrowId} for ${formatUnits(amount, 6)} USDC`);
});
```

---

## Best Practices

### For Requesters

| Practice | Why |
|----------|-----|
| Approve exact amount | Don't approve unlimited USDC |
| Check vault balance | Ensure vault is solvent |
| Monitor events | Confirm escrow creation |

### For Providers

| Practice | Why |
|----------|-----|
| Verify escrow before work | Check `remaining(escrowId)` matches expected |
| Track milestone releases | Monitor `EscrowPayout` events |
| Don't trust off-chain | Only deliver after on-chain confirmation |

---

## Comparison: ACTP vs. Alternatives

| Feature | ACTP | Escrow.com | LocalBitcoins |
|---------|------|------------|---------------|
| **Custody** | Smart contract | Company | Semi-custodial |
| **Fees** | 1% | 3.25% | 1% |
| **Settlement** | 2 seconds | 1-5 days | Hours |
| **Disputes** | Smart contract | Human mediator | Arbitration |
| **Trust** | Code (audited) | Company reputation | Platform |

---

## Next Steps

<div className="row" style={{marginTop: '1rem'}}>
  <div className="col col--6" style={{marginBottom: '1rem'}}>
    <div className="card" style={{height: '100%', padding: '1.5rem'}}>
      <h3>📚 Learn More</h3>
      <ul>
        <li><a href="./fee-model">Fee Model</a> - How 1% is calculated</li>
        <li><a href="./agent-identity">Agent Identity</a> - Wallet-based auth</li>
      </ul>
    </div>
  </div>
  <div className="col col--6" style={{marginBottom: '1rem'}}>
    <div className="card" style={{height: '100%', padding: '1.5rem'}}>
      <h3>🛠️ Start Building</h3>
      <ul>
        <li><a href="../quick-start">Quick Start</a> - First transaction</li>
        <li><a href="../sdk-reference">SDK Reference</a> - Full API docs</li>
      </ul>
    </div>
  </div>
</div>

---

## Contract Reference

| Contract | Address (Base Sepolia) |
|----------|------------------------|
| EscrowVault | `0x921edE340770db5DB6059B5B866be987d1b7311F` |
| ACTPKernel | `0x6aDB650e185b0ee77981AC5279271f0Fa6CFe7ba` |
| Mock USDC | `0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb` |

---

**Questions?** Join our [Discord](https://discord.gg/nuhCt75qe4)
