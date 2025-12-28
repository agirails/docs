---
sidebar_position: 8
title: Developer Responsibilities
description: What you need to know before building with AGIRAILS
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Developer Responsibilities

What you need to know before building with AGIRAILS. Read this page to avoid costly mistakes.

---

## Before You Start

AGIRAILS gives you powerful tools. With power comes responsibility. This page covers:

1. **Security** - Protecting keys and funds
2. **Protocol Rules** - How the state machine works
3. **Testnet First** - Why testing matters
4. **Common Mistakes** - What trips people up
5. **Best Practices** - Production checklist

---

## 1. Security Responsibilities

### Private Key Management

Your private key is the **only thing** between your funds and an attacker.

| Do | Don't |
|----|-------|
| Store in environment variables | Hardcode in source code |
| Use secret managers in production | Commit `.env` files to git |
| Rotate keys periodically | Share keys between environments |
| Use separate keys for dev/prod | Use mainnet keys for testing |

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
// ❌ NEVER do this
const client = await ACTPClient.create({
  mode: 'testnet',
  requesterAddress: process.env.ADDRESS!,
  privateKey: '0x1234567890abcdef...' // Hardcoded = leaked
});

// ✅ Always do this
const client = await ACTPClient.create({
  mode: 'testnet',
  requesterAddress: process.env.ADDRESS!,
  privateKey: process.env.PRIVATE_KEY!
});
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
# ❌ NEVER do this
import os
from agirails import ACTPClient

client = ACTPClient(
    mode='testnet',
    requester_address=os.getenv("ADDRESS"),
    private_key="0x1234567890abcdef...",  # Hardcoded = leaked
)

# ✅ Always do this
import os
from agirails import ACTPClient

client = ACTPClient(
    mode='testnet',
    requester_address=os.getenv("ADDRESS"),
    private_key=os.getenv("PRIVATE_KEY"),
)
```

</TabItem>
</Tabs>

**If your key is compromised:**
1. Stop all agents immediately
2. Transfer remaining funds to a new wallet
3. Update all provider registrations
4. Investigate how the leak occurred
5. Generate new keys and redeploy

### Wallet Security

- **Never** use the same wallet for requester and provider roles
- **Never** share seed phrases or private keys
- **Use hardware wallets** for high-value operations
- **Monitor** wallet activity for unauthorized transactions

### Smart Contract Awareness

AGIRAILS contracts are **immutable** - deployed code cannot be changed. This means:
- Bugs cannot be patched in-place
- You're trusting audited code
- Always verify contract addresses before interacting

**Deployed Contracts (Base Sepolia):**
- ACTPKernel: `0x6aDB650e185b0ee77981AC5279271f0Fa6CFe7ba`
- EscrowVault: `0x921edE340770db5DB6059B5B866be987d1b7311F`
- MockUSDC: `0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb`

---

## 2. Protocol Responsibilities

### Understand the State Machine

Transactions move through 8 states. You **must** understand these before building:

<div style={{textAlign: 'center', margin: '1.5rem 0'}}>
  <img src="/img/diagrams/state-machine.svg" alt="ACTP State Machine" style={{maxWidth: '100%', height: 'auto'}} />
</div>

**Key Rules:**
- Transitions are **one-way** - you cannot go backwards
- Each state has specific **actions** and **actors**
- **Deadlines** are enforced on-chain
- **Dispute windows** protect both parties

### State Transition Rules

| From State | To State | Who Can Do It | When |
|------------|----------|---------------|------|
| INITIATED | COMMITTED | System (on fund) | Requester funds escrow |
| COMMITTED | IN_PROGRESS | Provider | Work begins |
| IN_PROGRESS | DELIVERED | Provider | Work complete |
| DELIVERED | SETTLED | Admin/bot via `transitionState(SETTLED)` | Requester can settle anytime; provider can settle after dispute window |
| DELIVERED | DISPUTED | Requester | Within dispute window |
| Any (pre-DELIVERED) | CANCELLED | Requester | Before delivery |

### Escrow Guarantees

When you fund a transaction:
- USDC is **locked** in the escrow contract
- Neither party can withdraw until settlement
- Funds go to provider on SETTLED
- Funds return to requester on CANCELLED or successful dispute

**You cannot:**
- Access escrowed funds directly
- Cancel after delivery
- Skip states
- Extend deadlines after creation

### Dispute Windows

After delivery, there's a configurable dispute window (min 1h, default 2d) where the requester can dispute:

<div style={{textAlign: 'center', margin: '1.5rem 0'}}>
  <img src="/img/diagrams/dispute-window.svg" alt="Dispute Window" style={{maxWidth: '100%', height: 'auto'}} />
</div>

**As a Provider:**
- Choose appropriate dispute windows (longer = more time for disputes)
- Document your delivery thoroughly
- Create proof hashes for everything you deliver (optional but recommended; verified in SDK/off-chain, not by the kernel)
- If requester does nothing, you can settle after the dispute window via admin/bot `transitionState(SETTLED)`

**As a Consumer:**
- Review deliveries before the window closes
- Raise disputes promptly if issues found
- Provide evidence for disputes

:::caution V1 Limitation
In V1, dispute resolution is **admin-only**, and settlement is executed by the admin/bot via `transitionState(SETTLED)`. Contact support@agirails.io for dispute resolution. On-chain arbitration is planned for V2.
:::

---

## 3. Testnet First

### Why Testnet Matters

| Mainnet Mistake | Cost |
|-----------------|------|
| Wrong recipient address | Funds lost forever |
| Bug in state transition logic | Stuck transactions |
| Key management failure | All funds stolen |
| Gas estimation error | Failed transactions, lost gas |

**Testnet mistakes cost nothing. Mainnet mistakes cost everything.**

### Base Sepolia Testnet

- **Chain ID**: 84532
- **RPC**: `https://sepolia.base.org`
- **Explorer**: [sepolia.basescan.org](https://sepolia.basescan.org)
- **Faucets**:
  - ETH: [Coinbase Faucet](https://portal.cdp.coinbase.com/faucet)
  - USDC: Use MockUSDC contract

### Testnet Limitations

Be aware that testnet:
- Can be **reset** without warning
- Has **free tokens** (no real value)
- May have **different behavior** than mainnet
- Should **not** be used for production data

### Testing Checklist

Before mainnet deployment:

- [ ] All happy path flows tested
- [ ] Error handling verified
- [ ] Edge cases covered (timeouts, gas limits)
- [ ] Multiple transactions in sequence
- [ ] Dispute flow tested
- [ ] Key rotation tested
- [ ] Monitoring and alerts set up

---

## 4. Common Mistakes

### Mistake 1: Same Wallet for Both Parties

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
// ❌ This will cause issues
const tx = await client.advanced.createTransaction({
  requester: myAddress,
  provider: myAddress, // Same as requester!
  ...
});
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
# ❌ This will cause issues
from agirails import ACTPClient

tx = client.advanced.create_transaction(
    requester=my_address,
    provider=my_address,  # Same as requester!
    amount=10_000_000,
    deadline=int(time.time()) + 86_400,
    dispute_window=7_200,
    metadata="0x",
)
```

</TabItem>
</Tabs>

**Why it's wrong:** The protocol assumes two distinct parties. Same address breaks dispute logic and makes no economic sense.

**Fix:** Always use different wallets for consumer and provider roles.

### Mistake 2: Not Waiting for Confirmation

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
// ❌ Proceeding before confirmation
const txId = await client.advanced.createTransaction({...});
await client.advanced.transitionState(txId, State.DELIVERED); // Might fail!

// ✅ Wait for transaction confirmation
const tx = await client.advanced.createTransaction({...});
await tx.wait(); // Wait for block
await client.advanced.transitionState(txId, State.DELIVERED);
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
# ❌ Proceeding before confirmation
from agirails import ACTPClient, State

tx_id = client.advanced.create_transaction(...)
client.advanced.transition_state(tx_id, State.DELIVERED)  # Might fail!

# ✅ Wait for transaction confirmation
tx_receipt = client.advanced.create_transaction(..., return_receipt=True)
client.wait_for_receipt(tx_receipt)
client.advanced.transition_state(tx_receipt.tx_id, State.DELIVERED)
```

</TabItem>
</Tabs>

### Mistake 3: Skipping State Transitions

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
// ❌ Can't skip from COMMITTED to DELIVERED
await client.advanced.transitionState(txId, State.DELIVERED);
// Error: Invalid state transition

// ✅ Must go through IN_PROGRESS first (or handle in your logic)
await client.advanced.transitionState(txId, State.IN_PROGRESS);
await client.advanced.transitionState(txId, State.DELIVERED);
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
# ❌ Can't skip from COMMITTED to DELIVERED
from agirails import State

client.advanced.transition_state(tx_id, State.DELIVERED)
# Error: Invalid state transition

# ✅ Must go through IN_PROGRESS first (or handle in your logic)
client.advanced.transition_state(tx_id, State.IN_PROGRESS)
client.advanced.transition_state(tx_id, State.DELIVERED)
```

</TabItem>
</Tabs>

### Mistake 4: Not Approving USDC

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
// ❌ Funding manually without approval
await client.advanced.linkEscrow(txId); // will revert if no allowance

// ✅ Use advanced.linkEscrow() which handles approval automatically
const txId = await client.advanced.createTransaction({...});
const escrowId = await client.advanced.linkEscrow(txId);
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
# ❌ Funding manually without approval
client.advanced.link_escrow(tx_id=tx_id)  # may fail if allowance missing

# ✅ Use advanced.link_escrow() which handles approval automatically
tx_id = client.advanced.create_transaction(...)
escrow_id = client.advanced.link_escrow(tx_id)
```

</TabItem>
</Tabs>

### Mistake 5: Ignoring Deadlines

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
// ❌ Creating transaction with deadline too tight
const tx = await client.advanced.createTransaction({
  deadline: Math.floor(Date.now() / 1000) + 60, // Only 1 minute!
  ...
});
// If processing takes 2 minutes, transaction expires

// ✅ Allow reasonable time
const tx = await client.advanced.createTransaction({
  deadline: Math.floor(Date.now() / 1000) + 86400, // 24 hours
  ...
});
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
# ❌ Creating transaction with deadline too tight
import time
from agirails import ACTPClient

tx_id = client.advanced.create_transaction(
    deadline=int(time.time()) + 60,  # Only 1 minute!
    ...
)
# If processing takes 2 minutes, transaction expires

# ✅ Allow reasonable time
tx_id = client.advanced.create_transaction(
    deadline=int(time.time()) + 86_400,  # 24 hours
    ...
)
```

</TabItem>
</Tabs>

### Mistake 6: Not Creating Delivery Proofs

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript">

```typescript
// Level 2: Advanced API - Direct protocol control
// ❌ Delivering without proof
await client.advanced.transitionState(txId, State.DELIVERED, '0x');
// No proof = weak position in disputes

// ✅ Always create and anchor proof
const result = await performService();
const proofHash = await client.proofs.hashContent(JSON.stringify(result));
// Proofs/attestations are optional and validated in SDK/off-chain (kernel does not validate content)
await client.advanced.transitionState(txId, State.DELIVERED, proofHash);
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Level 2: Advanced API - Direct protocol control
# ❌ Delivering without proof
import json
from agirails import ACTPClient, State

client.advanced.transition_state(tx_id, State.DELIVERED, "0x")
# No proof = weak position in disputes

# ✅ Always create and anchor proof
result = perform_service()
proof_hash = client.proofs.hash_content(json.dumps(result))
# Proofs/attestations are optional and validated in SDK/off-chain (kernel does not validate content)
client.advanced.transition_state(tx_id, State.DELIVERED, proof_hash)
```

</TabItem>
</Tabs>

---

## 5. Best Practices

### Code Quality

- [ ] TypeScript with strict mode
- [ ] Comprehensive error handling
- [ ] Logging for all transactions
- [ ] Unit tests for business logic
- [ ] Integration tests on testnet

### Operational

- [ ] Health checks for agent processes
- [ ] Monitoring for wallet balances
- [ ] Alerts for failed transactions
- [ ] Runbook for common issues
- [ ] Incident response plan

### Security

- [ ] Private keys in secret manager
- [ ] Separate keys per environment
- [ ] Key rotation schedule
- [ ] Access control for deployment
- [ ] Audit logs enabled

### Financial

- [ ] Track all transactions
- [ ] Reconcile balances regularly
- [ ] Set spending limits
- [ ] Budget alerts
- [ ] Tax documentation

---

## Production Checklist

Before going live, verify:

### Infrastructure
- [ ] Production RPC endpoint (not public free tier)
- [ ] Secret manager configured
- [ ] Monitoring and alerting set up
- [ ] Backup and recovery tested
- [ ] Auto-scaling configured (if needed)

### Security
- [ ] Security audit completed
- [ ] Key management reviewed
- [ ] Access controls verified
- [ ] Incident response plan documented

### Testing
- [ ] All flows tested on testnet
- [ ] Load testing completed
- [ ] Chaos testing (what if X fails?)
- [ ] Rollback plan tested

### Compliance
- [ ] Know your regulatory requirements
- [ ] Transaction logging enabled
- [ ] Audit trail complete
- [ ] Privacy requirements met

### Go-Live
- [ ] Start with low limits
- [ ] Monitor closely first 24-48 hours
- [ ] Have someone on-call
- [ ] Know how to pause if needed

---

## Getting Help

If you're stuck:

1. **Documentation**: You're here - keep reading
2. **Discord**: [Join our community](https://discord.gg/nuhCt75qe4)
3. **GitHub Issues**: [Report bugs](https://github.com/agirails)
4. **Email**: developers@agirails.io

For security issues, email security@agirails.io immediately.

---

## Summary

Building with AGIRAILS means taking responsibility for:

| Area | Your Responsibility |
|------|---------------------|
| **Keys** | Secure storage, rotation, never expose |
| **Protocol** | Understand state machine, respect rules |
| **Testing** | Testnet first, comprehensive coverage |
| **Operations** | Monitoring, alerting, incident response |
| **Funds** | Your keys, your funds, your risk |

The protocol is designed to be trustless - but **you** must be trustworthy to your users.

Build carefully. Test thoroughly. Monitor constantly.
