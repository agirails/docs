---
sidebar_position: 2
title: Building a Consumer Agent
description: Production-ready consumer agents with TS + PY SDK parity, linkEscrow flow, and attestation-verified settlement
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Building a Consumer Agent

Consumer agents that create transactions, fund escrow, monitor delivery, verify proofs/attestations, and settle safely. Examples are provided in both **TypeScript and Python**.

:::info What You'll Learn
- Create and fund transactions (escrow) with `linkEscrow`
- Monitor provider progress and delivery
- Verify delivery via EAS attestation (`tx.attestationUID`)
- Release payment or dispute within the window
:::

---

## Prerequisites

- Node.js 18+, Python 3.10+
- Base Sepolia wallet with ETH (gas) + ~50 USDC
- `.env` with `PRIVATE_KEY` (consumer) and optional `PROVIDER_ADDRESS` for testing

Install SDKs:

```bash title="TypeScript"
npm install @agirails/sdk
```

```bash title="Python"
pip install agirails python-dotenv
```

---

## Step 1: Initialize the consumer client

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript">

```typescript title="src/consumer.ts"
import { ACTPClient, State } from '@agirails/sdk';
import { parseUnits, formatUnits } from 'ethers';
import 'dotenv/config';

const CONFIG = {
  maxAmountPerTx: parseUnits('500', 6),
  defaultDisputeWindow: 7200,
  defaultDeadlineBuffer: 86400,
  consumerAddress: ''
};

export const client = await ACTPClient.create({
  mode: 'testnet',
  requesterAddress: process.env.CONSUMER_ADDRESS!,
  privateKey: process.env.PRIVATE_KEY!,
  eas: {
    contractAddress: '0x4200000000000000000000000000000000000021',
    deliveryProofSchemaId: '0x1b0ebdf0bd20c28ec9d5362571ce8715a55f46e81c3de2f9b0d8e1b95fb5ffce'
  }
});

CONFIG.consumerAddress = await client.getAddress();
console.log(`Consumer: ${CONFIG.consumerAddress}`);
```

</TabItem>
<TabItem value="py" label="Python">

```python title="consumer.py"
import os, time
from agirails_sdk import ACTPClient, Network, State
from dotenv import load_dotenv

load_dotenv()

CONFIG = {
    "max_amount_per_tx": 500_000_000,   # $500 (6 decimals)
    "default_dispute_window": 7200,     # 2h
    "default_deadline_buffer": 86400,   # 24h
}

client = ACTPClient(
    network=Network.BASE_SEPOLIA,
    private_key=os.getenv("PRIVATE_KEY"),
)
print("Consumer:", client.address)
```

</TabItem>
</Tabs>

---

## Step 2: Request a service (create transaction)

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript">

```typescript title="src/consumer.ts"
interface ServiceRequest {
  provider: string;
  amount: bigint;
  description?: string;
  deadline?: number;
  disputeWindow?: number;
}

export async function requestService(req: ServiceRequest): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const deadline = req.deadline ?? now + CONFIG.defaultDeadlineBuffer;
  const disputeWindow = req.disputeWindow ?? CONFIG.defaultDisputeWindow;

  const txId = await client.runtime.createTransaction({
    requester: CONFIG.consumerAddress,
    provider: req.provider,
    amount: req.amount,
    deadline,
    disputeWindow,
    metadata: req.description ? ethers.id(req.description) : undefined
  });

  console.log(`Created tx: ${txId} | $${formatUnits(req.amount, 6)}`);
  return txId;
}
```

</TabItem>
<TabItem value="py" label="Python">

```python title="consumer.py"
def request_service(provider: str, amount: int, description: str | None = None) -> str:
    now = int(time.time())
    deadline = now + CONFIG["default_deadline_buffer"]
    dispute_window = CONFIG["default_dispute_window"]

    tx_id = client.create_transaction(
        requester=client.address,
        provider=provider,
        amount=amount,
        deadline=deadline,
        dispute_window=dispute_window,
        service_hash=description or None,
    )
    print(f"Created tx: {tx_id} | amount={amount}")
    return tx_id
```

</TabItem>
</Tabs>

---

## Step 3: Fund escrow (approve + link)

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript">

```typescript title="src/consumer.ts"
export async function linkEscrowSafe(txId: string): Promise<void> {
  const escrowId = await client.standard.linkEscrow(txId);
  const tx = await client.runtime.getTransaction(txId);
  console.log(`Escrow ${escrowId} funded; state=${State[tx.state]}`);
}
```

</TabItem>
<TabItem value="py" label="Python">

```python title="consumer.py"
def fund_transaction_safe(tx_id: str) -> str:
    escrow_id = client.fund_transaction(tx_id)
    tx = client.get_transaction(tx_id)
    print(f"Escrow {escrow_id} funded; state={tx.state.name}")
    return escrow_id
```

</TabItem>
</Tabs>

---

## Step 4: Monitor delivery and fetch attestation UID

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript">

```typescript title="src/consumer.ts"
export function watchDelivery(txId: string) {
  return client.events.watchTransaction(txId, async (state) => {
    console.log(`[${txId.substring(0, 8)}] -> ${State[state]}`);
    if (state === State.DELIVERED) {
      const tx = await client.runtime.getTransaction(txId);
      await handleDelivery(tx);
    }
  });
}

async function handleDelivery(tx: any) {
  const attUid = tx.attestationUID;
  if (!attUid || attUid === '0x' + '0'.repeat(64)) {
    console.warn('No attestation UID anchored; review manually or dispute.');
    return;
  }
  const isValid = await client.eas?.verifyDeliveryAttestation(tx.txId, attUid);
  if (isValid) {
    await acceptDelivery(tx.txId, attUid);
  } else {
    console.warn('Attestation failed verification; consider dispute.');
  }
}
```

</TabItem>
<TabItem value="py" label="Python">

```python title="consumer.py"
from web3 import Web3

def watch_delivery(tx_id: str, poll_interval=5):
    filt = client.runtime.events.StateTransitioned.create_filter(
        fromBlock="latest", argument_filters={"txId": Web3.to_bytes(hexstr=tx_id)}
    )
    while True:
        for ev in filt.get_new_entries():
            if ev["args"]["toState"] == State.DELIVERED.value:
                tx = client.get_transaction(tx_id)
                handle_delivery(tx)
                return
        time.sleep(poll_interval)

def handle_delivery(tx):
    att_uid = tx.attestation_uid
    if att_uid is None or att_uid == b"\x00" * 32:
        print("No attestation UID anchored; review manually or dispute.")
        return
    try:
        client.verify_delivery_attestation(tx.tx_id, att_uid)
        accept_delivery(tx.tx_id, att_uid)
    except Exception as e:
        print("Verification failed:", e)
```

</TabItem>
</Tabs>

---

## Step 5: Accept (settle) or dispute

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript">

```typescript title="src/consumer.ts"
async function acceptDelivery(txId: string, attestationUid: string) {
  await client.releaseEscrowWithVerification(txId, attestationUid);
  console.log(`Payment released for ${txId}`);
}

async function dispute(txId: string, reason: string) {
  // Encode reason off-chain; simple bytes placeholder here
  await client.runtime.transitionState(txId, State.DISPUTED, '0x');
  console.log(`Dispute raised for ${txId}: ${reason}`);
}
```

</TabItem>
<TabItem value="py" label="Python">

```python title="consumer.py"
def accept_delivery(tx_id: str, attestation_uid: str | bytes):
    client.release_escrow_with_verification(tx_id, attestation_uid)
    print(f"Payment released for {tx_id}")

def dispute(tx_id: str, reason: str):
    client.transition_state(tx_id, State.DISPUTED)
    print(f"Dispute raised for {tx_id}: {reason}")
```

</TabItem>
</Tabs>

---

## Minimal runnable loop (copy/paste)

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript">

```typescript title="src/run-consumer.ts"
import { parseUnits } from 'ethers';
import { client, requestService, linkEscrowSafe, watchDelivery } from './consumer';

const provider = process.env.PROVIDER_ADDRESS!;

const txId = await requestService({
  provider,
  amount: parseUnits('1', 6),
  description: 'demo job'
});

await linkEscrowSafe(txId);
watchDelivery(txId);
console.log('Consumer running... (Ctrl+C to exit)');
await new Promise(() => {});
```

</TabItem>
<TabItem value="py" label="Python">

```python title="run_consumer.py"
import os, time
from consumer import client, request_service, fund_transaction_safe, watch_delivery

provider = os.getenv("PROVIDER_ADDRESS", client.address)  # demo/self
tx_id = request_service(provider=provider, amount=1_000_000, description="demo job")
fund_transaction_safe(tx_id)
print("Consumer running... (Ctrl+C to exit)")
watch_delivery(tx_id)
```

</TabItem>
</Tabs>

---

## Checklist (production)

- Use `linkEscrow` (escrow funded = State.COMMITTED)
- Verify attestation UID from `tx.attestationUID` (TS) / `tx.attestation_uid` (PY)
- Use `releaseEscrowWithVerification` (TS) or `release_escrow_with_verification` (PY) for payout
- Dispute within `disputeWindow` if verification fails
- Log states and keep timeouts near deadline
