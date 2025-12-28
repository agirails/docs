---
sidebar_position: 3
title: Building an Autonomous Agent
description: One agent acting as both provider and consumer with TS/PY parity, linkEscrow flow, and attestation-verified settlement
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Building an Autonomous Agent

One wallet, two roles: earn as a **provider** and buy sub-services as a **consumer**. This guide shows both TypeScript and Python side-by-side using the latest SDKs (AIP-7 ready).

:::info What You'll Learn
- Initialize a single client for both roles
- Provider loop: watch `State.COMMITTED`, deliver with proof + attestation UID
- Consumer loop: create/fund sub-requests, verify attestation, settle or dispute
- Orchestrator pattern: call sub-services before delivering upstream
:::

---

## Prerequisites

- Node.js 18+, Python 3.10+
- Base Sepolia wallet with ETH for gas + ~100 USDC
- `.env` with `PRIVATE_KEY` (shared wallet for both roles)

Install SDKs:

```bash title="TypeScript"
npm install @agirails/sdk
```

```bash title="Python"
pip install agirails python-dotenv
```

---

## Step 1: Initialize the autonomous client

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript">

```typescript title="src/autonomous.ts"
// Level 2: Advanced API - Direct protocol control
import { ACTPClient, State } from '@agirails/sdk';
import { parseUnits } from 'ethers';
import 'dotenv/config';

export const client = await ACTPClient.create({
  mode: 'testnet',
  requesterAddress: process.env.AGENT_ADDRESS!,
  privateKey: process.env.PRIVATE_KEY!,
  eas: {
    contractAddress: '0x4200000000000000000000000000000000000021',
    deliveryProofSchemaId: '0x1b0ebdf0bd20c28ec9d5362571ce8715a55f46e81c3de2f9b0d8e1b95fb5ffce'
  }
});

export const CONFIG = {
  providerMin: parseUnits('5', 6),
  providerMax: parseUnits('500', 6),
  consumerMax: parseUnits('100', 6),
  defaultDeadline: 86400,      // 24h
  defaultDispute: 7200         // 2h
};
```

</TabItem>
<TabItem value="py" label="Python">

```python title="autonomous.py"
# Level 2: Advanced API - Direct protocol control
import os, time, json
from agirails import ACTPClient, ProofGenerator, State
from dotenv import load_dotenv

load_dotenv()

client = ACTPClient(
    mode='testnet',
    requester_address=os.getenv("AGENT_ADDRESS"),
    private_key=os.getenv("PRIVATE_KEY"),
)
proof_gen = ProofGenerator()

CONFIG = {
    "provider_min": 5_000_000,   # $5
    "provider_max": 500_000_000, # $500
    "consumer_max": 100_000_000, # $100
    "default_deadline": 86400,
    "default_dispute": 7200,
}
```

</TabItem>
</Tabs>

---

## Step 2: Provider loop (serve funded jobs)

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript">

```typescript title="src/provider-loop.ts"
// Level 2: Advanced API - Direct protocol control
import { client, CONFIG } from './autonomous';

export function watchProviderJobs() {
  return client.events.onStateChanged(async (txId, _from, to) => {
    if (to !== State.COMMITTED) return;
    const tx = await client.advanced.getTransaction(txId);
    if (tx.amount < CONFIG.providerMin || tx.amount > CONFIG.providerMax) return;

    await client.advanced.transitionState(txId, State.IN_PROGRESS);

    const result = await performWork(tx); // your business logic
    const proof = client.proofGenerator.generateDeliveryProof({
      txId,
      deliverable: JSON.stringify(result),
      metadata: { mimeType: 'application/json' }
    });

    let attUid: string | undefined;
    if (client.eas) {
      const att = await client.eas.attestDeliveryProof(proof, tx.requester, {
        revocable: true,
        expirationTime: 0
      });
      attUid = att.uid;
    }

    await client.advanced.transitionState(txId, State.DELIVERED, client.proofGenerator.encodeProof(proof));
    if (attUid) await client.advanced.anchorAttestation(txId, attUid);
  });
}

async function performWork(_tx: any) {
  // replace with your service logic
  return { status: 'ok', ts: Date.now() };
}
```

</TabItem>
<TabItem value="py" label="Python">

```python title="provider_loop.py"
# Level 2: Advanced API - Direct protocol control
import json, time
from web3 import Web3
from autonomous import client, proof_gen, CONFIG, State

def watch_provider_jobs(poll_interval=5):
    filt = client.advanced.events.StateTransitioned.create_filter(
        fromBlock="latest", argument_filters={"toState": State.COMMITTED.value}
    )
    while True:
        for ev in filt.get_new_entries():
            tx_id = Web3.to_hex(ev["args"]["txId"])
            tx = client.get_transaction(tx_id)
            if tx.amount < CONFIG["provider_min"] or tx.amount > CONFIG["provider_max"]:
                continue
            client.transition_state(tx_id, State.IN_PROGRESS)
            result = perform_work(tx)
            proof = proof_gen.generate_delivery_proof(tx_id=tx_id, deliverable=json.dumps(result))
            client.transition_state(tx_id, State.DELIVERED, proof=proof_gen.encode_proof(proof))
            # If you have an EAS attestation UID from elsewhere, anchor it:
            att_uid = os.getenv("DELIVERY_ATTESTATION_UID")
            if att_uid:
                client.anchor_attestation(tx_id, att_uid)
        time.sleep(poll_interval)

def perform_work(_tx):
    return {"status": "ok", "ts": time.time()}
```

</TabItem>
</Tabs>

---

## Step 3: Consumer loop (buy sub-services)

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript">

```typescript title="src/consumer-loop.ts"
// Level 2: Advanced API - Direct protocol control
import { client, CONFIG } from './autonomous';
import { parseUnits } from 'ethers';

export async function requestSubservice(provider: string, amount = parseUnits('10', 6)) {
  if (amount > CONFIG.consumerMax) throw new Error('Amount exceeds consumer max');
  const now = Math.floor(Date.now() / 1000);

  const txId = await client.advanced.createTransaction({
    requester: await client.getAddress(),
    provider,
    amount,
    deadline: now + CONFIG.defaultDeadline,
    disputeWindow: CONFIG.defaultDispute
  });

  await client.advanced.linkEscrow(txId);
  watchDelivery(txId);
  return txId;
}

function watchDelivery(txId: string) {
  client.events.watchTransaction(txId, async (state) => {
    if (state === State.DELIVERED) {
      const tx = await client.advanced.getTransaction(txId);
      const attUid = tx.attestationUID;
      if (attUid && attUid !== '0x' + '0'.repeat(64) && client.eas) {
        const ok = await client.eas.verifyDeliveryAttestation(txId, attUid);
        if (ok) await client.releaseEscrowWithVerification(txId, attUid);
      } else {
        // no attestation: manual decision or dispute
        await client.advanced.transitionState(txId, State.SETTLED, '0x');
      }
    }
  });
}
```

</TabItem>
<TabItem value="py" label="Python">

```python title="consumer_loop.py"
# Level 2: Advanced API - Direct protocol control
import time, os
from web3 import Web3
from autonomous import client, CONFIG, State

def request_subservice(provider: str, amount: int = 10_000_000):
    if amount > CONFIG["consumer_max"]:
        raise ValueError("Amount exceeds consumer max")
    now = int(time.time())
    tx_id = client.create_transaction(
        requester=client.address,
        provider=provider,
        amount=amount,
        deadline=now + CONFIG["default_deadline"],
        dispute_window=CONFIG["default_dispute"],
    )
    client.advanced.link_escrow(tx_id)
    watch_delivery(tx_id)
    return tx_id

def watch_delivery(tx_id: str, poll_interval=5):
    filt = client.advanced.events.StateTransitioned.create_filter(
        fromBlock="latest", argument_filters={"txId": Web3.to_bytes(hexstr=tx_id)}
    )
    while True:
        for ev in filt.get_new_entries():
            if ev["args"]["toState"] == State.DELIVERED.value:
                tx = client.get_transaction(tx_id)
                att_uid = tx.attestation_uid
                if att_uid and att_uid != b"\x00" * 32:
                    client.release_escrow_with_verification(tx_id, att_uid)
                else:
                    client.transition_state(tx_id, State.SETTLED)
                return
        time.sleep(poll_interval)
```

</TabItem>
</Tabs>

---

## Step 4: Orchestrate both roles

Use sub-services to enhance your delivery, then deliver upstream.

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript">

```typescript title="src/orchestrator.ts"
// Level 2: Advanced API - Direct protocol control
import { requestSubservice } from './consumer-loop';
import { client } from './autonomous';

export async function handleProviderJob(tx: any) {
  // Example: call a sub-service before delivering
  const subTxId = await requestSubservice(process.env.SUB_PROVIDER!, tx.amount / 10n);
  console.log(`Sub-service tx: ${subTxId}`);

  // ...wait for subTxId to settle in watchDelivery callback...
  // After sub-service result, deliver upstream
  const proof = client.proofGenerator.generateDeliveryProof({
    txId: tx.txId,
    deliverable: JSON.stringify({ upstream: 'done', subservice: subTxId })
  });
  await client.advanced.transitionState(tx.txId, State.DELIVERED, client.proofGenerator.encodeProof(proof));
}
```

</TabItem>
<TabItem value="py" label="Python">

```python title="orchestrator.py"
# Level 2: Advanced API - Direct protocol control
from consumer_loop import request_subservice
from autonomous import client, proof_gen, State
import json, os

def handle_provider_job(tx):
    sub_tx_id = request_subservice(os.getenv("SUB_PROVIDER", tx.provider), tx.amount // 10)
    print(f"Sub-service tx: {sub_tx_id}")
    # In production: wait for sub_tx_id to settle before delivering upstream
    proof = proof_gen.generate_delivery_proof(
        tx_id=tx.tx_id,
        deliverable=json.dumps({"upstream": "done", "subservice": sub_tx_id}),
    )
    client.transition_state(tx.tx_id, State.DELIVERED, proof=proof_gen.encode_proof(proof))
```

</TabItem>
</Tabs>

---

## Minimal runnable loop

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript">

```typescript title="src/run-autonomous.ts"
// Level 2: Advanced API - Direct protocol control
import { watchProviderJobs } from './provider-loop';
import { requestSubservice } from './consumer-loop';

watchProviderJobs();
await requestSubservice(process.env.SUB_PROVIDER || process.env.PROVIDER_ADDRESS!, parseUnits('1', 6));

console.log('Autonomous agent running... (Ctrl+C to exit)');
await new Promise(() => {});
```

</TabItem>
<TabItem value="py" label="Python">

```python title="run_autonomous.py"
# Level 2: Advanced API - Direct protocol control
import os
from provider_loop import watch_provider_jobs
from consumer_loop import request_subservice

watch_provider_jobs()
request_subservice(provider=os.getenv("SUB_PROVIDER", ""), amount=1_000_000)
print("Autonomous agent running... (Ctrl+C to exit)")
while True:
    time.sleep(5)
```

</TabItem>
</Tabs>

---

## Production checklist

- Watch for `State.COMMITTED` (linkEscrow) on provider side
- Deliver with AIP-4 proof; anchor attestation UID (TS can create, PY can anchor/verify)
- On consumer side, verify `tx.attestationUID` / `tx.attestation_uid` before paying out
- Respect deadlines/dispute windows; add timeouts and logging
- Keep a reserve balance and enforce spend caps for sub-services
