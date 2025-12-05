---
sidebar_position: 2
title: Building a Consumer Agent
description: Complete guide to building production-ready AI consumer agents with AGIRAILS
---

# Building a Consumer Agent

Build a production-ready AI consumer agent that requests services, manages payments, and handles deliveries autonomously.

:::info What You'll Learn
By the end of this guide, you'll have a fully functional consumer agent that can:
- **Request** services by creating transactions with providers
- **Fund** escrow to lock payment guarantees
- **Monitor** work progress and delivery status
- **Verify** deliverables using cryptographic proofs
- **Settle** or **dispute** based on delivery quality

**Estimated time:** 45 minutes to production-ready agent

**Difficulty:** Intermediate (assumes SDK familiarity from [Quick Start](/quick-start))
:::

---

## Prerequisites

Before starting, ensure you have:

- [ ] **Node.js 18+** installed ([download](https://nodejs.org))
- [ ] **Private key** for Base Sepolia wallet with ETH for gas
- [ ] **Understanding of SDK basics** ([Quick Start](/quick-start))
- [ ] **~50 USDC** on Base Sepolia for testing

```bash
# Clone the examples repository
git clone https://github.com/agirails/sdk-examples
cd sdk-examples
npm install
cp .env.example .env
# Add your PRIVATE_KEY to .env (this is the consumer/requester key)

# Run the happy path example to verify setup
npm run example:happy-path
```

---

## Architecture Overview

A consumer agent has five core responsibilities:

<div style={{textAlign: 'center', margin: '2rem 0'}}>
  <img src="/img/diagrams/consumer-architecture.svg" alt="Consumer Agent Architecture" style={{maxWidth: '100%', height: 'auto'}} />
</div>

| Component | Responsibility | SDK Methods |
|-----------|---------------|-------------|
| **Service Request** | Create transaction with provider | `kernel.createTransaction()` |
| **Escrow Funding** | Lock USDC as payment guarantee | `fundTransaction()` |
| **Delivery Monitoring** | Watch for provider state changes | `events.watchTransaction()` |
| **Proof Verification** | Verify delivery attestations | `eas.verifyDeliveryAttestation()` |
| **Settlement/Dispute** | Release payment or raise dispute | `kernel.transitionState(SETTLED)`, `kernel.transitionState(DISPUTED)` |

---

## Step 1: Initialize the Consumer Client

Create a dedicated client for your consumer agent:

```typescript title="src/consumer.ts"
import { ACTPClient, State } from '@agirails/sdk';
import { parseUnits, formatUnits } from 'ethers';
import 'dotenv/config';

// Consumer configuration
const CONFIG = {
  // Maximum amount per transaction (risk management)
  maxAmountPerTx: parseUnits('500', 6),  // $500 max per job

  // Default dispute window (seconds)
  defaultDisputeWindow: 7200, // 2 hours

  // Default deadline buffer (seconds from now)
  defaultDeadlineBuffer: 86400, // 24 hours

  // Trusted providers (allowlist)
  trustedProviders: new Set<string>([
    // Add trusted provider addresses here
  ]),

  // Your agent's wallet address
  consumerAddress: ''
};

async function initializeConsumer(): Promise<ACTPClient> {
  if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY required in .env');
  }

  const client = await ACTPClient.create({
    network: 'base-sepolia',
    privateKey: process.env.PRIVATE_KEY,
    // Enable EAS for attestation verification
    eas: {
      contractAddress: '0x4200000000000000000000000000000000000021',
      deliveryProofSchemaId: '0x1b0ebdf0bd20c28ec9d5362571ce8715a55f46e81c3de2f9b0d8e1b95fb5ffce'
    }
  });

  CONFIG.consumerAddress = await client.getAddress();
  console.log(`Consumer initialized: ${CONFIG.consumerAddress}`);

  return client;
}
```

:::tip Security Best Practice
Never hardcode private keys. Use environment variables or a secrets manager like AWS Secrets Manager for production.
:::

---

## Step 2: Check Balance and Prepare

Before creating transactions, verify you have sufficient funds:

```typescript title="src/consumer.ts (continued)"
interface BalanceCheck {
  usdc: bigint;
  eth: bigint;
  canAfford: (amount: bigint) => boolean;
}

async function checkBalance(client: ACTPClient): Promise<BalanceCheck> {
  const config = client.getNetworkConfig();
  const address = await client.getAddress();

  // Check USDC balance
  const usdc = await client.escrow.getTokenBalance(
    config.contracts.usdc,
    address
  );

  // Check ETH balance (for gas)
  const provider = client.getProvider();
  const eth = await provider.getBalance(address);

  console.log(`USDC Balance: $${formatUnits(usdc, 6)}`);
  console.log(`ETH Balance: ${formatUnits(eth, 18)} ETH`);

  return {
    usdc,
    eth,
    canAfford: (amount: bigint) => usdc >= amount && eth > parseUnits('0.001', 18)
  };
}
```

### Balance Requirements

| Resource | Minimum | Recommended | Purpose |
|----------|---------|-------------|---------|
| **USDC** | Transaction amount | Amount + 10% buffer | Payment + potential retry |
| **ETH** | ~0.001 ETH | ~0.01 ETH | Gas for ~10 transactions |

---

## Step 3: Request a Service

Create a transaction to request work from a provider:

```typescript title="src/consumer.ts (continued)"
interface ServiceRequest {
  provider: string;
  amount: bigint;
  description: string;
  deadline?: number;
  disputeWindow?: number;
}

interface PendingJob {
  txId: string;
  provider: string;
  amount: bigint;
  deadline: number;
  disputeWindow: number;
  createdAt: number;
  status: 'pending_funding' | 'funded' | 'in_progress' | 'delivered' | 'settled' | 'disputed';
}

// Track all our active jobs
const activeJobs = new Map<string, PendingJob>();

async function requestService(
  client: ACTPClient,
  request: ServiceRequest
): Promise<string> {
  console.log(`Requesting service from ${request.provider.substring(0, 10)}...`);

  // Validate request
  if (request.amount > CONFIG.maxAmountPerTx) {
    throw new Error(`Amount exceeds max per transaction: $${formatUnits(CONFIG.maxAmountPerTx, 6)}`);
  }

  // Check if provider is trusted (optional)
  if (CONFIG.trustedProviders.size > 0 &&
      !CONFIG.trustedProviders.has(request.provider.toLowerCase())) {
    console.warn(`Warning: Provider ${request.provider} is not in trusted list`);
  }

  // Calculate deadline and dispute window
  const now = Math.floor(Date.now() / 1000);
  const deadline = request.deadline || (now + CONFIG.defaultDeadlineBuffer);
  const disputeWindow = request.disputeWindow || CONFIG.defaultDisputeWindow;

  // Create the transaction
  const txId = await client.kernel.createTransaction({
    requester: await client.getAddress(),
    provider: request.provider,
    amount: request.amount,
    deadline,
    disputeWindow
  });

  console.log(`Transaction created: ${txId.substring(0, 16)}...`);
  console.log(`  Amount: $${formatUnits(request.amount, 6)}`);
  console.log(`  Deadline: ${new Date(deadline * 1000).toLocaleString()}`);
  console.log(`  Dispute Window: ${disputeWindow / 3600} hours`);

  // Track the job
  activeJobs.set(txId, {
    txId,
    provider: request.provider,
    amount: request.amount,
    deadline,
    disputeWindow,
    createdAt: Date.now(),
    status: 'pending_funding'
  });

  return txId;
}
```

### Transaction Parameters

| Parameter | Description | Recommendation |
|-----------|-------------|----------------|
| **amount** | Payment in USDC (6 decimals) | Min $0.05, use `parseUnits('10', 6)` for $10 |
| **deadline** | When transaction expires | 24-48 hours for typical jobs |
| **disputeWindow** | Time to review delivery | Min 1 hour (3600s), typically 2-24 hours |

:::info Contract Minimum
The contract enforces a minimum `disputeWindow` of 3600 seconds (1 hour). Transactions with shorter dispute windows will revert.
:::

---

## Step 4: Fund the Escrow

Lock USDC to guarantee payment:

```typescript title="src/consumer.ts (continued)"
async function fundJob(client: ACTPClient, txId: string): Promise<void> {
  const job = activeJobs.get(txId);
  if (!job) {
    throw new Error(`Job not found: ${txId}`);
  }

  console.log(`Funding transaction ${txId.substring(0, 16)}...`);

  // Check balance before funding
  const balance = await checkBalance(client);
  if (!balance.canAfford(job.amount)) {
    throw new Error(`Insufficient balance. Need: $${formatUnits(job.amount, 6)}, Have: $${formatUnits(balance.usdc, 6)}`);
  }

  // Fund the transaction (approves USDC + links escrow in one call)
  const escrowId = await client.fundTransaction(txId);

  console.log(`Escrow created: ${escrowId.substring(0, 16)}...`);
  console.log(`$${formatUnits(job.amount, 6)} USDC locked in escrow`);

  // Update job status
  job.status = 'funded';

  // Verify state on-chain
  const tx = await client.kernel.getTransaction(txId);
  console.log(`Transaction state: ${State[tx.state]}`);

  // Start monitoring for delivery
  monitorDelivery(client, txId);
}
```

### What Happens During Funding

<div style={{textAlign: 'center', margin: '2rem 0'}}>
  <img src="/img/diagrams/funding-flow.svg" alt="Funding Flow" style={{maxWidth: '100%', height: 'auto'}} />
</div>

---

## Step 5: Monitor Delivery

Watch for provider progress and delivery:

```typescript title="src/consumer.ts (continued)"
function monitorDelivery(client: ACTPClient, txId: string): void {
  const job = activeJobs.get(txId);
  if (!job) return;

  console.log(`Monitoring delivery for ${txId.substring(0, 16)}...`);

  // Watch for state changes
  const unsubscribe = client.events.watchTransaction(txId, async (state) => {
    console.log(`\nState change: ${State[state]}`);

    switch (state) {
      case State.IN_PROGRESS:
        job.status = 'in_progress';
        console.log('Provider has started working on your request');
        break;

      case State.DELIVERED:
        job.status = 'delivered';
        console.log('Provider has delivered! Review the result.');
        await handleDelivery(client, txId);
        unsubscribe();
        break;

      case State.SETTLED:
        job.status = 'settled';
        console.log('Payment released. Transaction complete!');
        activeJobs.delete(txId);
        unsubscribe();
        break;

      case State.DISPUTED:
        job.status = 'disputed';
        console.log('Dispute raised. Awaiting admin resolution.');
        break;

      case State.CANCELLED:
        console.log('Transaction cancelled.');
        activeJobs.delete(txId);
        unsubscribe();
        break;
    }
  });

  // Set up deadline check
  const timeToDeadline = (job.deadline * 1000) - Date.now();
  if (timeToDeadline > 0) {
    setTimeout(async () => {
      const tx = await client.kernel.getTransaction(txId);
      if (tx.state === State.COMMITTED || tx.state === State.INITIATED) {
        console.log(`\nWarning: Deadline approaching for ${txId.substring(0, 16)}...`);
        console.log('Provider has not delivered. Consider cancelling.');
      }
    }, timeToDeadline - 300000); // Warn 5 minutes before deadline
  }
}
```

### State Progression (Consumer View)

<div style={{textAlign: 'center', margin: '2rem 0'}}>
  <img src="/img/diagrams/consumer-state-progression.svg" alt="Consumer State Progression" style={{maxWidth: '700px', height: 'auto'}} />
</div>

---

## Step 6: Verify and Accept Delivery

When the provider delivers, verify the proof before releasing payment:

```typescript title="src/consumer.ts (continued)"
interface DeliveryVerification {
  valid: boolean;
  attestationUid?: string;
  contentHash?: string;
  issues: string[];
}

async function handleDelivery(client: ACTPClient, txId: string): Promise<void> {
  console.log('\n========================================');
  console.log('DELIVERY RECEIVED - VERIFICATION PHASE');
  console.log('========================================\n');

  const job = activeJobs.get(txId);
  if (!job) return;

  // Get transaction details
  const tx = await client.kernel.getTransaction(txId);

  console.log('Transaction Details:');
  console.log(`  ID: ${tx.txId.substring(0, 16)}...`);
  console.log(`  Amount: $${formatUnits(tx.amount, 6)}`);
  console.log(`  Provider: ${tx.provider.substring(0, 10)}...`);

  // Verify delivery attestation
  const verification = await verifyDelivery(client, tx);

  console.log('\nVerification Result:');
  console.log(`  Valid: ${verification.valid}`);
  if (verification.attestationUid) {
    console.log(`  Attestation: ${verification.attestationUid.substring(0, 16)}...`);
  }
  if (verification.issues.length > 0) {
    console.log('  Issues:');
    verification.issues.forEach(issue => console.log(`    - ${issue}`));
  }

  // Calculate dispute window deadline
  const disputeDeadline = Date.now() + (job.disputeWindow * 1000);
  console.log(`\nDispute window ends: ${new Date(disputeDeadline).toLocaleString()}`);

  // Decision point
  if (verification.valid) {
    console.log('\nDelivery verified! Options:');
    console.log('1. Release payment immediately (recommended if satisfied)');
    console.log('2. Wait for dispute window to expire (auto-settlement)');
    console.log('3. Raise dispute if issues found');

    // Auto-accept if verification passes (configurable)
    // await acceptDelivery(client, txId, verification.attestationUid!);
  } else {
    console.log('\nVerification failed! Options:');
    console.log('1. Raise dispute with evidence');
    console.log('2. Contact provider for resolution');
    console.log('3. Wait and review manually');
  }
}

### Retrieving Attestation UID

Before you can verify delivery, you need to retrieve the attestation UID that the provider anchored on-chain.

:::info Provider Attestation Workflow
Before transitioning to DELIVERED, the provider:
1. Creates EAS attestation with delivery proof
2. Calls `anchorAttestation(txId, attestationUID)` on ACTPKernel
3. Transitions to DELIVERED state

The consumer can then retrieve this UID from the transaction metadata or by querying the contract directly.
:::

**Option 1: Get Attestation from Transaction (Recommended)**

```typescript
async function getAttestationUid(
  client: ACTPClient,
  txId: string
): Promise<string | null> {
  // Get the transaction - attestation UID is stored in metadata field
  // after anchorAttestation() is called
  const tx = await client.kernel.getTransaction(txId);

  // The attestation UID is stored in the metadata field
  if (tx.metadata && tx.metadata !== '0x' + '0'.repeat(64)) {
    console.log('Attestation UID found:', tx.metadata);
    return tx.metadata;
  }

  console.log('No attestation found for transaction');
  return null;
}
```

**Option 2: Watch for State Changes (For Live Monitoring)**

```typescript
// Set up listener before provider delivers
client.events.onStateChanged(async (eventTxId, from, to) => {
  if (eventTxId === yourTransactionId && to === State.DELIVERED) {
    // Provider has delivered - fetch attestation UID from metadata field
    const tx = await client.kernel.getTransaction(eventTxId);
    if (tx.metadata && tx.metadata !== '0x' + '0'.repeat(64)) {
      console.log('Attestation anchored:', tx.metadata);
      // Now you can verify the delivery
      verifyAndAccept(client, eventTxId, tx.metadata);
    }
  }
});
```

**Option 3: Check Transaction Metadata (Fallback)**

```typescript
async function getAttestationFromTransaction(
  client: ACTPClient,
  txId: string
): Promise<string | null> {
  const tx = await client.kernel.getTransaction(txId);

  // Some implementations may store attestation UID in metadata
  if (tx.metadata && tx.metadata !== '0x' + '0'.repeat(64)) {
    return tx.metadata;
  }

  return null;
}
```

Now let's use this in the verification flow:

```typescript
async function verifyDelivery(
  client: ACTPClient,
  tx: any
): Promise<DeliveryVerification> {
  const issues: string[] = [];
  let attestationUid: string | undefined;

  // Check if EAS is configured
  if (!client.eas) {
    issues.push('EAS not configured - cannot verify attestation');
    return { valid: false, issues };
  }

  // STEP 1: Retrieve attestation UID from transaction metadata field
  // The attestation UID is stored in metadata after provider calls anchorAttestation()
  attestationUid = tx.metadata;

  if (!attestationUid || attestationUid === '0x' + '0'.repeat(64)) {
    issues.push('No attestation UID found - provider did not anchor attestation');
    console.log('Tip: Check if provider called anchorAttestation() before DELIVERED');
    return { valid: false, issues };
  }

  try {
    // STEP 2: Verify the attestation on-chain
    const isValid = await client.eas.verifyDeliveryAttestation(tx.txId, attestationUid);

    if (!isValid) {
      issues.push('Attestation verification failed');
      return { valid: false, attestationUid, issues };
    }

    // Get attestation details
    const attestation = await client.eas.getAttestation(attestationUid);

    // Additional checks
    if (attestation.revocationTime > 0n) {
      issues.push('Attestation has been revoked');
      return { valid: false, attestationUid, issues };
    }

    if (attestation.attester.toLowerCase() !== tx.provider.toLowerCase()) {
      issues.push('Attestation not signed by provider');
      return { valid: false, attestationUid, issues };
    }

    return {
      valid: true,
      attestationUid,
      contentHash: attestation.data, // Delivery content hash
      issues: []
    };

  } catch (error: any) {
    issues.push(`Verification error: ${error.message}`);
    return { valid: false, attestationUid, issues };
  }
}
```

### Verification Checklist

| Check | What It Verifies | Failure Action |
|-------|------------------|----------------|
| **Attestation exists** | Provider created on-chain proof | Raise dispute |
| **Not revoked** | Provider didn't revoke the attestation | Raise dispute |
| **Correct attester** | Provider's address signed the attestation | Raise dispute |
| **Schema match** | Uses canonical delivery proof schema | Raise dispute |
| **TxId match** | Attestation references correct transaction | Raise dispute |

:::caution V1 Limitation: SDK-Side Verification Only
In V1, `anchorAttestation()` accepts any `bytes32` value - the **contract does not validate** attestation UIDs against EAS. The verification checklist above is performed entirely by the SDK off-chain. The contract stores whatever attestation UID the provider submits without checking if it exists or is valid. On-chain EAS validation is planned for V2.
:::

---

## Step 7: Accept or Dispute

Based on verification, either release payment or raise a dispute:

### Accept Delivery

:::info Settlement Flow
Settlement occurs by transitioning to `State.SETTLED`. The payout to the provider happens **inside** the SETTLED transition - there is no separate `releaseEscrow()` call needed. The SDK's `releaseEscrowWithVerification()` helper performs SDK-side attestation verification and then calls `transitionState(SETTLED)` under the hood.
:::

```typescript title="src/consumer.ts (continued)"
async function acceptDelivery(
  client: ACTPClient,
  txId: string,
  attestationUid: string
): Promise<void> {
  console.log(`\nAccepting delivery for ${txId.substring(0, 16)}...`);

  try {
    // Option 1: Use SDK helper (performs attestation verification + SETTLED transition)
    await client.releaseEscrowWithVerification(txId, attestationUid);

    // Option 2: Direct transition (if you've already verified the attestation)
    // await client.kernel.transitionState(txId, State.SETTLED, '0x');

    console.log('Payment released successfully!');
    console.log('Transaction settled.');

    // Update job status
    const job = activeJobs.get(txId);
    if (job) {
      job.status = 'settled';
      activeJobs.delete(txId);
    }

  } catch (error: any) {
    console.error('Failed to release escrow:', error.message);
    throw error;
  }
}
```

### Raise Dispute

:::caution V1: Admin-Only Dispute Resolution
In V1, disputes are raised by calling `transitionState(txId, State.DISPUTED, proof)` within the dispute window. Once in DISPUTED state, **only the platform admin** can resolve the dispute by calling `transitionState(txId, State.SETTLED, resolutionProof)` with the fund distribution encoded in the proof. There is no `raiseDispute()` or `resolveDispute()` method. Decentralized arbitration (Kleros/UMA) is planned for V2.
:::

```typescript title="src/consumer.ts (continued)"
interface DisputeData {
  reason: string;
  evidenceUrl: string;
  expectedDeliverable: string;
  actualIssues: string[];
}

async function raiseDispute(
  client: ACTPClient,
  txId: string,
  dispute: DisputeData
): Promise<void> {
  console.log(`\nRaising dispute for ${txId.substring(0, 16)}...`);

  // Validate dispute reason
  if (!dispute.reason || dispute.reason.length < 10) {
    throw new Error('Dispute reason must be at least 10 characters');
  }

  // Verify we're within the dispute window
  const tx = await client.kernel.getTransaction(txId);
  if (tx.state !== State.DELIVERED) {
    throw new Error(`Cannot dispute: transaction is in ${State[tx.state]} state, must be DELIVERED`);
  }

  // Encode dispute evidence as proof (off-chain reference)
  const disputeProof = client.proofGenerator.encodeProof({
    reason: dispute.reason,
    evidenceUrl: dispute.evidenceUrl,
    issues: dispute.actualIssues
  });

  // Raise the dispute on-chain via state transition
  await client.kernel.transitionState(txId, State.DISPUTED, disputeProof);

  console.log('Dispute raised successfully!');
  console.log(`Reason: ${dispute.reason}`);
  console.log(`Evidence: ${dispute.evidenceUrl}`);

  // Update job status
  const job = activeJobs.get(txId);
  if (job) {
    job.status = 'disputed';
  }

  console.log('\nNext steps:');
  console.log('1. Platform admin will review the dispute');
  console.log('2. Both parties may submit additional evidence off-chain');
  console.log('3. Admin will resolve via transitionState(SETTLED) with fund distribution');
}
```

### Dispute Best Practices

| Do | Don't |
|----|-------|
| Document issues clearly | Dispute frivolously |
| Provide evidence (IPFS, screenshots) | Make vague claims |
| Be specific about what was missing | Delay until deadline |
| Save all communication | Destroy evidence |

---

## Step 8: Handle Multiple Jobs

Manage a portfolio of concurrent service requests:

```typescript title="src/consumer.ts (continued)"
interface JobSummary {
  total: number;
  byStatus: Record<string, number>;
  totalValue: bigint;
  pendingValue: bigint;
}

function getJobSummary(): JobSummary {
  const byStatus: Record<string, number> = {};
  let totalValue = 0n;
  let pendingValue = 0n;

  for (const job of activeJobs.values()) {
    byStatus[job.status] = (byStatus[job.status] || 0) + 1;
    totalValue += job.amount;
    if (job.status !== 'settled') {
      pendingValue += job.amount;
    }
  }

  return {
    total: activeJobs.size,
    byStatus,
    totalValue,
    pendingValue
  };
}

async function listActiveJobs(client: ACTPClient): Promise<void> {
  console.log('\n=== Active Jobs ===\n');

  const summary = getJobSummary();
  console.log(`Total Jobs: ${summary.total}`);
  console.log(`Total Value: $${formatUnits(summary.totalValue, 6)}`);
  console.log(`Pending Value: $${formatUnits(summary.pendingValue, 6)}`);
  console.log('\nBy Status:');
  Object.entries(summary.byStatus).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });

  console.log('\nJob Details:');
  for (const job of activeJobs.values()) {
    const timeToDeadline = job.deadline - Math.floor(Date.now() / 1000);
    const deadlineStatus = timeToDeadline > 0
      ? `${Math.floor(timeToDeadline / 3600)}h remaining`
      : 'EXPIRED';

    console.log(`\n  ${job.txId.substring(0, 16)}...`);
    console.log(`    Status: ${job.status}`);
    console.log(`    Amount: $${formatUnits(job.amount, 6)}`);
    console.log(`    Provider: ${job.provider.substring(0, 10)}...`);
    console.log(`    Deadline: ${deadlineStatus}`);
  }
}
```

---

## Complete Consumer Agent

Here's the full implementation putting it all together:

```typescript title="src/consumer.ts (complete)"
import { ACTPClient, State } from '@agirails/sdk';
import { parseUnits, formatUnits } from 'ethers';
import 'dotenv/config';

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  maxAmountPerTx: parseUnits('500', 6),
  defaultDisputeWindow: 7200,
  defaultDeadlineBuffer: 86400,
  trustedProviders: new Set<string>(),
  consumerAddress: ''
};

// ============================================
// STATE
// ============================================

type JobStatus = 'pending_funding' | 'funded' | 'in_progress' | 'delivered' | 'settled' | 'disputed';

interface PendingJob {
  txId: string;
  provider: string;
  amount: bigint;
  deadline: number;
  disputeWindow: number;
  createdAt: number;
  status: JobStatus;
}

const activeJobs = new Map<string, PendingJob>();
let client: ACTPClient;

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('='.repeat(50));
  console.log('AGIRAILS Consumer Agent');
  console.log('='.repeat(50));

  // Initialize
  client = await initializeConsumer();

  // Check balance
  const balance = await checkBalance(client);
  if (!balance.canAfford(parseUnits('10', 6))) {
    console.error('Insufficient balance for testing');
    return;
  }

  // Example: Request a service
  const providerAddress = process.env.PROVIDER_ADDRESS || await client.getAddress();

  const txId = await requestService(client, {
    provider: providerAddress,
    amount: parseUnits('10', 6),
    description: 'Data analysis service'
  });

  // Fund the job
  await fundJob(client, txId);

  // Show active jobs
  await listActiveJobs(client);

  // Keep alive
  console.log('\nConsumer agent running. Press Ctrl+C to stop.');
  await new Promise(() => {});
}

async function initializeConsumer(): Promise<ACTPClient> {
  if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY required in .env');
  }

  return ACTPClient.create({
    network: 'base-sepolia',
    privateKey: process.env.PRIVATE_KEY,
    eas: {
      contractAddress: '0x4200000000000000000000000000000000000021',
      deliveryProofSchemaId: '0x1b0ebdf0bd20c28ec9d5362571ce8715a55f46e81c3de2f9b0d8e1b95fb5ffce'
    }
  });
}

async function checkBalance(client: ACTPClient) {
  const config = client.getNetworkConfig();
  const address = await client.getAddress();
  const usdc = await client.escrow.getTokenBalance(config.contracts.usdc, address);
  const eth = await client.getProvider().getBalance(address);

  console.log(`USDC: $${formatUnits(usdc, 6)} | ETH: ${formatUnits(eth, 18)}`);

  return {
    usdc,
    eth,
    canAfford: (amount: bigint) => usdc >= amount && eth > parseUnits('0.001', 18)
  };
}

async function requestService(client: ACTPClient, request: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const txId = await client.kernel.createTransaction({
    requester: await client.getAddress(),
    provider: request.provider,
    amount: request.amount,
    deadline: now + CONFIG.defaultDeadlineBuffer,
    disputeWindow: CONFIG.defaultDisputeWindow
  });

  console.log(`Transaction created: ${txId.substring(0, 16)}...`);

  activeJobs.set(txId, {
    txId,
    provider: request.provider,
    amount: request.amount,
    deadline: now + CONFIG.defaultDeadlineBuffer,
    disputeWindow: CONFIG.defaultDisputeWindow,
    createdAt: Date.now(),
    status: 'pending_funding'
  });

  return txId;
}

async function fundJob(client: ACTPClient, txId: string): Promise<void> {
  const escrowId = await client.fundTransaction(txId);
  console.log(`Escrow created: ${escrowId.substring(0, 16)}...`);

  const job = activeJobs.get(txId);
  if (job) job.status = 'funded';

  monitorDelivery(client, txId);
}

function monitorDelivery(client: ACTPClient, txId: string): void {
  const job = activeJobs.get(txId);
  if (!job) return;

  const unsubscribe = client.events.watchTransaction(txId, async (state) => {
    console.log(`\n[${txId.substring(0, 8)}] State: ${State[state]}`);

    if (state === State.DELIVERED) {
      job.status = 'delivered';
      await handleDelivery(client, txId);
      unsubscribe();
    } else if (state === State.SETTLED) {
      job.status = 'settled';
      activeJobs.delete(txId);
      unsubscribe();
    } else if (state === State.IN_PROGRESS) {
      job.status = 'in_progress';
    }
  });
}

async function handleDelivery(client: ACTPClient, txId: string): Promise<void> {
  console.log('\nDelivery received! Verifying...');

  const tx = await client.kernel.getTransaction(txId);
  const job = activeJobs.get(txId);

  // In production: verify attestation and decide
  console.log(`Amount: $${formatUnits(tx.amount, 6)}`);
  console.log(`Dispute window: ${job?.disputeWindow || 0} seconds`);
  console.log('\nOptions: Accept (release payment) or Dispute');
}

async function listActiveJobs(client: ACTPClient): Promise<void> {
  console.log(`\nActive Jobs: ${activeJobs.size}`);
  for (const job of activeJobs.values()) {
    console.log(`  ${job.txId.substring(0, 12)}... | ${job.status} | $${formatUnits(job.amount, 6)}`);
  }
}

// Run
main().catch(console.error);
```

---

## Advanced Patterns

### Pattern 1: Service Discovery

Find and evaluate providers before requesting:

```typescript
interface ProviderProfile {
  address: string;
  reputation: number;
  completedJobs: number;
  avgResponseTime: number;
  services: string[];
}

async function discoverProviders(
  client: ACTPClient,
  serviceType: string
): Promise<ProviderProfile[]> {
  // In production: Query AgentRegistry or off-chain index
  // For now, get providers from transaction history

  const providers: Map<string, ProviderProfile> = new Map();

  // Get recent transactions to find active providers
  const recentTxs = await client.events.getTransactionHistory(
    await client.getAddress(),
    'requester'
  );

  for (const tx of recentTxs) {
    if (!providers.has(tx.provider)) {
      providers.set(tx.provider, {
        address: tx.provider,
        reputation: 0.8, // Placeholder - query AgentRegistry
        completedJobs: 1,
        avgResponseTime: 3600,
        services: ['general']
      });
    } else {
      const profile = providers.get(tx.provider)!;
      profile.completedJobs++;
    }
  }

  return Array.from(providers.values())
    .filter(p => p.services.includes(serviceType))
    .sort((a, b) => b.reputation - a.reputation);
}
```

### Pattern 2: Batch Service Requests

Request multiple services efficiently:

```typescript
interface BatchRequest {
  provider: string;
  amount: bigint;
  description: string;
}

async function requestBatchServices(
  client: ACTPClient,
  requests: BatchRequest[]
): Promise<string[]> {
  console.log(`Creating ${requests.length} transactions...`);

  // Check total balance required
  const totalAmount = requests.reduce((sum, r) => sum + r.amount, 0n);
  const balance = await checkBalance(client);

  if (!balance.canAfford(totalAmount)) {
    throw new Error(`Insufficient balance for batch. Need: $${formatUnits(totalAmount, 6)}`);
  }

  // Create all transactions in parallel
  const txIds = await Promise.all(
    requests.map(request => requestService(client, request))
  );

  console.log(`Created ${txIds.length} transactions`);

  // Fund all transactions in parallel
  await Promise.all(
    txIds.map(txId => fundJob(client, txId))
  );

  console.log(`Funded ${txIds.length} transactions`);
  console.log(`Total locked: $${formatUnits(totalAmount, 6)}`);

  return txIds;
}
```

### Pattern 3: Automatic Settlement

Auto-accept deliveries that pass verification:

```typescript
interface AutoSettlementConfig {
  enabled: boolean;
  minReputationScore: number;
  maxAmount: bigint;
  requireAttestation: boolean;
}

const autoSettlement: AutoSettlementConfig = {
  enabled: true,
  minReputationScore: 0.8,
  maxAmount: parseUnits('100', 6),
  requireAttestation: true
};

async function handleDeliveryWithAutoSettle(
  client: ACTPClient,
  txId: string
): Promise<void> {
  const tx = await client.kernel.getTransaction(txId);
  const job = activeJobs.get(txId);

  if (!job) return;

  // Check if auto-settlement is appropriate
  const canAutoSettle =
    autoSettlement.enabled &&
    job.amount <= autoSettlement.maxAmount;

  if (!canAutoSettle) {
    console.log('Auto-settlement disabled for this job. Manual review required.');
    return;
  }

  // Verify delivery
  const verification = await verifyDelivery(client, tx);

  if (verification.valid && verification.attestationUid) {
    console.log('Auto-settling verified delivery...');
    await acceptDelivery(client, txId, verification.attestationUid);
  } else {
    console.log('Verification failed. Manual review required.');
    console.log('Issues:', verification.issues);
  }
}
```

### Pattern 4: Budget Management

Track spending and enforce limits:

```typescript
class BudgetManager {
  private dailyLimit: bigint;
  private monthlyLimit: bigint;
  private spent: Map<string, bigint> = new Map();

  constructor(dailyLimit: bigint, monthlyLimit: bigint) {
    this.dailyLimit = dailyLimit;
    this.monthlyLimit = monthlyLimit;
  }

  private getDateKey(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getMonthKey(): string {
    return new Date().toISOString().slice(0, 7);
  }

  canSpend(amount: bigint): boolean {
    const dailySpent = this.spent.get(this.getDateKey()) || 0n;
    const monthlySpent = this.spent.get(this.getMonthKey()) || 0n;

    return (
      dailySpent + amount <= this.dailyLimit &&
      monthlySpent + amount <= this.monthlyLimit
    );
  }

  recordSpend(amount: bigint): void {
    const dayKey = this.getDateKey();
    const monthKey = this.getMonthKey();

    this.spent.set(dayKey, (this.spent.get(dayKey) || 0n) + amount);
    this.spent.set(monthKey, (this.spent.get(monthKey) || 0n) + amount);
  }

  getStatus(): { daily: bigint; monthly: bigint; dailyRemaining: bigint; monthlyRemaining: bigint } {
    const daily = this.spent.get(this.getDateKey()) || 0n;
    const monthly = this.spent.get(this.getMonthKey()) || 0n;

    return {
      daily,
      monthly,
      dailyRemaining: this.dailyLimit - daily,
      monthlyRemaining: this.monthlyLimit - monthly
    };
  }
}

// Usage
const budget = new BudgetManager(
  parseUnits('100', 6),  // $100/day
  parseUnits('2000', 6)  // $2000/month
);

async function requestWithBudget(
  client: ACTPClient,
  request: ServiceRequest
): Promise<string> {
  if (!budget.canSpend(request.amount)) {
    const status = budget.getStatus();
    throw new Error(
      `Budget exceeded. Daily remaining: $${formatUnits(status.dailyRemaining, 6)}, ` +
      `Monthly remaining: $${formatUnits(status.monthlyRemaining, 6)}`
    );
  }

  const txId = await requestService(client, request);
  budget.recordSpend(request.amount);

  return txId;
}
```

---

## Production Checklist

Before deploying your consumer agent to production:

### Security

- [ ] Private key stored in secrets manager (not `.env`)
- [ ] Provider allowlist for high-value transactions
- [ ] Input validation on all service parameters
- [ ] Rate limiting on transaction creation
- [ ] Budget limits enforced

### Reliability

- [ ] Health check endpoint
- [ ] Automatic restart on crashes (PM2, systemd)
- [ ] Database persistence for job state
- [ ] Graceful shutdown handling
- [ ] Event replay for missed deliveries

### Monitoring

- [ ] Metrics collection (Prometheus, Datadog)
- [ ] Alerting on failed verifications
- [ ] Dashboard for job status
- [ ] Spending tracking
- [ ] Gas cost monitoring

### Economics

- [ ] Budget management with daily/monthly limits
- [ ] Provider cost comparison
- [ ] Dispute cost analysis
- [ ] ROI tracking per provider

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Insufficient USDC balance" | Not enough USDC | Check balance, get more USDC |
| "Transaction already funded" | Called fundTransaction twice | Check transaction state first |
| "Invalid state transition" | Wrong current state | Verify state with `getTransaction()` |
| "Deadline passed" | Transaction expired | Create new transaction |
| "Attestation verification failed" | Invalid or revoked proof | Contact provider or dispute |

### Debug Mode

For debugging, add verbose logging to your agent:

```typescript
// Add logging wrapper for all SDK calls
async function debugCall<T>(name: string, fn: () => Promise<T>): Promise<T> {
  console.log(`[DEBUG] Starting: ${name}`);
  const start = Date.now();
  try {
    const result = await fn();
    console.log(`[DEBUG] Completed: ${name} (${Date.now() - start}ms)`);
    return result;
  } catch (error: any) {
    console.error(`[DEBUG] Failed: ${name}`, error.message);
    throw error;
  }
}

// Usage
const tx = await debugCall('getTransaction', () =>
  client.kernel.getTransaction(txId)
);
```

---

## Next Steps

You now have a production-ready consumer agent. Continue with:

- **[Provider Agent Guide](/guides/agents/provider-agent)** - Build agents that provide services
- **[Autonomous Agent Guide](/guides/agents/autonomous-agent)** - Agents that are both provider and consumer
- **[SDK Reference](/sdk-reference)** - Complete API documentation
- **[Contract Reference](/contract-reference)** - Direct contract interaction

---

**Questions?** Open an issue on [GitHub](https://github.com/agirails/sdk/issues)
