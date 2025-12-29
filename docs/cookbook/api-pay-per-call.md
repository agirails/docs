---
sidebar_position: 3
title: API Pay-Per-Call
description: Monetize your API with per-call payments using AGIRAILS
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# API Pay-Per-Call

Monetize your API by charging per call. No subscriptions, no invoices - just instant micropayments.

<div style={{textAlign: 'center', margin: '2rem 0'}}>
  <img src="../img/diagrams/api-pay-per-call-flow.svg" alt="API Pay-Per-Call Flow" style={{maxWidth: '100%', height: 'auto'}} />
</div>

| | |
|---|---|
| **Difficulty** | Basic |
| **Time** | 20 minutes |
| **Prerequisites** | [Quick Start](/quick-start) |

---

## Problem

You have an API (AI model, data feed, computation service) and want to:
- Charge per API call, not monthly subscriptions
- Accept payments from AI agents automatically
- Get paid instantly, not net-30
- No payment disputes or chargebacks

:::info Traditional vs AGIRAILS
| Provider | Fee | Micropayment Viable? |
|----------|-----|---------------------|
| Stripe | 2.9% + $0.30 | ❌ $0.10 call → $0.33 fee (330%) |
| PayPal | 3.5% + $0.30 | ❌ $0.10 call → $0.33 fee (330%) |
| **AGIRAILS** | 1% ($0.05 min) | ✅ $0.10 call → $0.05 fee (50%) |
:::

---

## Solution

Wrap your API with AGIRAILS payment verification. Each call requires a valid, funded transaction.

:::tip TL;DR
Consumer pre-funds → Middleware verifies → API serves → Mark DELIVERED → Admin/bot settles.
:::

:::info Understanding Settlement
**Who settles?** Either party can trigger settlement:
- **Consumer**: Can call `releaseEscrow()` anytime after delivery
- **Provider**: Can call after the dispute window expires (default: 2 days)
- **Automated**: Platform bots monitor and settle eligible transactions

**Timeline**: Typically 2-5 minutes after dispute window closes on testnet. Mainnet may vary based on gas conditions.

**V1 Note**: In the current version, most settlements are triggered by the consumer accepting delivery or automatically after the dispute window.
:::

:::info AIP-7: Agent Discovery
Providers can register their APIs in the **Agent Registry** (AIP-7) with service tags, making them discoverable to consumers. Use `client.registry.registerAgent()` (with null check) to advertise your API service.
:::

---

## Complete Code

### Provider Side (Your API)

<Tabs>
<TabItem value="ts" label="TypeScript" default>

```typescript title="src/api-server.ts"
// Level 2: Advanced API - Direct protocol control
import express from 'express';
import { ACTPClient, State } from '@agirails/sdk';
import { formatUnits } from 'ethers';

const app = express();
app.use(express.json());

// Initialize AGIRAILS client
const client = await ACTPClient.create({
  mode: 'testnet',
  requesterAddress: process.env.ADDRESS!,
  privateKey: process.env.PROVIDER_PRIVATE_KEY!
});

const PROVIDER_ADDRESS = await client.getAddress();
const PRICE_PER_CALL = 100000n; // $0.10 in USDC (6 decimals)

// ===========================================
// PAYMENT VERIFICATION MIDDLEWARE
// ===========================================

async function verifyPayment(req: any, res: any, next: any) {
  const txId = req.headers['x-agirails-tx-id'];

  if (!txId) {
    return res.status(402).json({
      error: 'Payment Required',
      message: 'Include X-AGIRAILS-TX-ID header with funded transaction'
    });
  }

  try {
    // Fetch transaction details
    const tx = await client.advanced.getTransaction(txId);

    // Verify we're the provider
    if (tx.provider.toLowerCase() !== PROVIDER_ADDRESS.toLowerCase()) {
      return res.status(403).json({
        error: 'Invalid Transaction',
        message: 'Transaction provider does not match this API'
      });
    }

    // Verify transaction is in correct state (COMMITTED or IN_PROGRESS)
    if (tx.state !== State.COMMITTED && tx.state !== State.IN_PROGRESS) {
      return res.status(402).json({
        error: 'Invalid Transaction State',
        message: `Transaction is ${State[tx.state]}, expected COMMITTED or IN_PROGRESS`,
        currentState: State[tx.state]
      });
    }

    // Verify amount is sufficient
    if (tx.amount < PRICE_PER_CALL) {
      return res.status(402).json({
        error: 'Insufficient Payment',
        message: `Minimum payment is ${formatUnits(PRICE_PER_CALL, 6)} USDC`,
        provided: formatUnits(tx.amount, 6),
        required: formatUnits(PRICE_PER_CALL, 6)
      });
    }

    // Verify deadline hasn't passed
    const now = Math.floor(Date.now() / 1000);
    if (tx.deadline < now) {
      return res.status(402).json({
        error: 'Transaction Expired',
        message: 'Transaction deadline has passed'
      });
    }

    // Attach transaction to request for later use
    req.agiTransaction = { txId, tx };
    next();

  } catch (error) {
    return res.status(500).json({
      error: 'Payment Verification Failed',
      message: error.message
    });
  }
}

// ===========================================
// YOUR API ENDPOINT
// ===========================================

app.post('/api/generate', verifyPayment, async (req, res) => {
  const { txId, tx } = req.agiTransaction;
  const { prompt } = req.body;

  try {
    // Mark as IN_PROGRESS if not already
    if (tx.state === State.COMMITTED) {
      await client.advanced.transitionState(txId, State.IN_PROGRESS, '0x');
    }

    // ===========================================
    // 🔧 YOUR ACTUAL API LOGIC HERE
    // ===========================================
    const result = await generateContent(prompt);

    // Create proof of delivery (AIP-4)
    const proof = client.proofGenerator.generateDeliveryProof({
      txId,
      deliverable: JSON.stringify({ prompt, result, timestamp: Date.now() }),
      metadata: { mimeType: 'application/json' }
    });

    // Deliver with encoded proof
    await client.advanced.transitionState(txId, State.DELIVERED, client.proofGenerator.encodeProof(proof));

    // Return result to consumer
    res.json({
      success: true,
      result: result,
      payment: {
        txId: txId,
        amount: formatUnits(tx.amount, 6) + ' USDC',
        status: 'DELIVERED',
        proofHash: proof.contentHash
      }
    });

  } catch (error) {
    // Don't deliver if service failed - consumer can dispute or cancel
    res.status(500).json({
      error: 'Service Failed',
      message: error.message,
      txId: txId,
      status: 'Transaction not delivered - funds still in escrow'
    });
  }
});

// ===========================================
// PRICING ENDPOINT (PUBLIC)
// ===========================================

app.get('/api/pricing', (req, res) => {
  res.json({
    provider: PROVIDER_ADDRESS,
    mode: 'testnet',
  requesterAddress: process.env.ADDRESS!,
    pricing: {
      perCall: formatUnits(PRICE_PER_CALL, 6) + ' USDC',
      currency: 'USDC',
      decimals: 6
    },
    payment: {
      protocol: 'AGIRAILS/ACTP',
      header: 'X-AGIRAILS-TX-ID',
      instructions: [
        '1. Create transaction with this provider address',
        '2. Fund the transaction (amount >= perCall price)',
        '3. Call API with X-AGIRAILS-TX-ID header',
        '4. Payment auto-settles on successful response'
      ]
    }
  });
});

// Your actual service implementation
async function generateContent(prompt: string): Promise<string> {
  // ⚠️ ================================
  // ⚠️ REPLACE WITH YOUR ACTUAL SERVICE
  // ⚠️ ================================
  // Replace with your actual AI model, data fetch, etc.
  await new Promise(resolve => setTimeout(resolve, 1000));
  return `Generated response for: ${prompt}`;
}

app.listen(3000, () => {
  console.log('🚀 Pay-per-call API running on port 3000');
  console.log(`💰 Price: ${formatUnits(PRICE_PER_CALL, 6)} USDC per call`);
  console.log(`📍 Provider: ${PROVIDER_ADDRESS}`);
});
```

</TabItem>
<TabItem value="python" label="Python">

```python title="api_server.py"
# Level 2: Advanced API - Direct protocol control
import os, json, time
from flask import Flask, request, jsonify
from agirails import ACTPClient, ProofGenerator, State

app = Flask(__name__)

# Initialize AGIRAILS client
client = ACTPClient(
    mode='testnet',
    requester_address=os.environ["PROVIDER_ADDRESS"],
    private_key=os.environ["PROVIDER_PRIVATE_KEY"]
)

PROVIDER_ADDRESS = client.address
proof_gen = ProofGenerator()
PRICE_PER_CALL = 100_000  # $0.10 in USDC (6 decimals)

# ===========================================
# PAYMENT VERIFICATION MIDDLEWARE
# ===========================================

def verify_payment():
    tx_id = request.headers.get("X-AGIRAILS-TX-ID")

    if not tx_id:
        return jsonify({
            "error": "Payment Required",
            "message": "Include X-AGIRAILS-TX-ID header with funded transaction"
        }), 402

    try:
        tx = client.advanced.get_transaction(tx_id)

        # Verify we're the provider
        if tx.provider.lower() != PROVIDER_ADDRESS.lower():
            return jsonify({
                "error": "Invalid Transaction",
                "message": "Transaction provider does not match this API"
            }), 403

        # Verify transaction state
        if tx.state not in [State.COMMITTED, State.IN_PROGRESS]:
            return jsonify({
                "error": "Invalid Transaction State",
                "message": f"Transaction is {tx.state.name}, expected COMMITTED or IN_PROGRESS"
            }), 402

        # Verify amount
        if tx.amount < PRICE_PER_CALL:
            return jsonify({
                "error": "Insufficient Payment",
                "message": f"Minimum payment is {PRICE_PER_CALL / 1e6} USDC"
            }), 402

        # Verify deadline
        if tx.deadline < int(time.time()):
            return jsonify({"error": "Transaction Expired"}), 402

        return None, tx_id, tx

    except Exception as e:
        return jsonify({
            "error": "Payment Verification Failed",
            "message": str(e)
        }), 500

# ===========================================
# API ENDPOINT
# ===========================================

@app.route("/api/generate", methods=["POST"])
def generate():
    error, tx_id, tx = verify_payment()
    if error:
        return error

    data = request.get_json()
    prompt = data.get("prompt")

    try:
        # Mark as IN_PROGRESS
        if tx.state == State.COMMITTED:
            client.advanced.transition_state(tx_id, State.IN_PROGRESS)

        # YOUR SERVICE LOGIC HERE
        result = generate_content(prompt)

        # Create delivery proof
        proof = proof_gen.generate_delivery_proof(
            tx_id=tx_id,
            deliverable=json.dumps({"prompt": prompt, "result": result, "timestamp": time.time()})
        )

        # Deliver with proof
        client.advanced.transition_state(tx_id, State.DELIVERED, proof=proof_gen.encode_proof(proof))

        return jsonify({
            "success": True,
            "result": result,
            "payment": {
                "txId": tx_id,
                "amount": f"{tx.amount / 1e6} USDC",
                "status": "DELIVERED",
                "proofHash": proof["contentHash"]
            }
        })

    except Exception as e:
        return jsonify({
            "error": "Service Failed",
            "message": str(e),
            "txId": tx_id
        }), 500

@app.route("/api/pricing", methods=["GET"])
def pricing():
    return jsonify({
        "provider": PROVIDER_ADDRESS,
        "network": "base-sepolia",
        "pricing": {
            "perCall": f"{PRICE_PER_CALL / 1e6} USDC",
            "currency": "USDC",
            "decimals": 6
        },
        "payment": {
            "protocol": "AGIRAILS/ACTP",
            "header": "X-AGIRAILS-TX-ID"
        }
    })

def generate_content(prompt: str) -> str:
    # Replace with your actual service
    time.sleep(1)
    return f"Generated response for: {prompt}"

if __name__ == "__main__":
    print(f"🚀 Pay-per-call API running on port 3000")
    print(f"💰 Price: {PRICE_PER_CALL / 1e6} USDC per call")
    print(f"📍 Provider: {PROVIDER_ADDRESS}")
    app.run(port=3000)
```

</TabItem>
</Tabs>

### Consumer Side (Calling the API)

<div style={{textAlign: 'center', margin: '1.5rem 0'}}>
  <img src="../img/diagrams/api-consumer-flow.svg" alt="Consumer Flow" style={{maxWidth: '100%', height: 'auto'}} />
</div>

:::tip Agent Discovery (AIP-7)
Instead of hardcoding provider addresses, use the Agent Registry to discover services:
```typescript
if (client.registry) {
  const providers = await client.registry.getAgentsByService("ai-completion");
  const apiProvider = providers[0].agentAddress;
}
```
:::

<Tabs>
<TabItem value="ts" label="TypeScript" default>

```typescript title="src/api-consumer.ts"
// Level 2: Advanced API - Direct protocol control
import { ACTPClient, State } from '@agirails/sdk';
import { parseUnits } from 'ethers';

async function callPaidAPI(prompt: string): Promise<string> {
  // Initialize client
  const client = await ACTPClient.create({
    mode: 'testnet',
  requesterAddress: process.env.ADDRESS!,
    privateKey: process.env.CONSUMER_PRIVATE_KEY!
  });

  const myAddress = await client.getAddress();
  const API_PROVIDER = '0x...'; // Get from /api/pricing
  const API_URL = 'https://api.example.com';

  // Step 1: Create transaction
  console.log('Creating payment transaction...');
  const txId = await client.advanced.createTransaction({
    requester: myAddress,
    provider: API_PROVIDER,
    amount: parseUnits('0.10', 6), // $0.10
    deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    disputeWindow: 3600, // 1 hour dispute window
    metadata: '0x' // Optional: hash of request details
  });
  console.log(`Transaction created: ${txId}`);

  // Step 2: Fund escrow (approve + link in one call)
  console.log('Funding transaction via linkEscrow...');
  const escrowId = await client.advanced.linkEscrow(txId);
  console.log(`Transaction funded - USDC locked in escrow (escrowId ${escrowId})`);

  // Step 3: Call the API with transaction ID
  console.log('Calling API...');
  const response = await fetch(`${API_URL}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-AGIRAILS-TX-ID': txId
    },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`API call failed: ${error.message}`);
  }

  const data = await response.json();
  console.log(`API call successful! Payment: ${data.payment.amount}`);

  // Step 4: Settlement
  // In V1 settlement is executed by admin/bot via transitionState(SETTLED).
  // Requester can request settlement anytime; provider can be settled after the dispute window.

  return data.result;
}

// Usage
const result = await callPaidAPI('Write a haiku about AI agents');
console.log('Result:', result);
```

</TabItem>
<TabItem value="python" label="Python">

```python title="api_consumer.py"
# Level 2: Advanced API - Direct protocol control
import os, time
from agirails import ACTPClient, State

async def call_paid_api(prompt: str) -> str:
    # Initialize client
    client = ACTPClient(
        mode='testnet',
        requester_address=os.environ["CONSUMER_ADDRESS"],
        private_key=os.environ["CONSUMER_PRIVATE_KEY"]
    )

    my_address = client.address
    API_PROVIDER = "0x..."  # Get from /api/pricing
    API_URL = "https://api.example.com"

    # Step 1: Create transaction
    print("Creating payment transaction...")
    tx_id = client.advanced.create_transaction(
        requester=my_address,
        provider=API_PROVIDER,
        amount=100_000,  # $0.10 USDC
        deadline=int(time.time()) + 3600,  # 1 hour
        dispute_window=3600,  # 1 hour
        metadata="0x"
    )
    print(f"Transaction created: {tx_id}")

    # Step 2: Fund escrow (approve + link in one call)
    print("Funding transaction via link_escrow...")
    escrow_id = client.advanced.link_escrow(tx_id)
    print(f"Transaction funded - USDC locked in escrow (escrowId {escrow_id})")

    # Step 3: Call the API with transaction ID
    print("Calling API...")
    import requests
    response = requests.post(
        f"{API_URL}/api/generate",
        json={"prompt": prompt},
        headers={"X-AGIRAILS-TX-ID": tx_id}
    )

    if not response.ok:
        error = response.json()
        raise Exception(f"API call failed: {error['message']}")

    data = response.json()
    print(f"API call successful! Payment: {data['payment']['amount']}")

    # Settlement executed by admin/bot via SETTLED
    # (requester anytime; provider after dispute window)

    return data["result"]

# Usage
if __name__ == "__main__":
    result = call_paid_api("Write a haiku about AI agents")
    print("Result:", result)
```

</TabItem>
</Tabs>

---

## How It Works

| Step | Consumer | Provider | SDK Method |
|------|----------|----------|-----------|
| **1. Discover** | GET `/api/pricing` | Serve pricing info | None |
| **2. Pre-fund** | Create + fund escrow | - | `createTransaction()`, `linkEscrow()` |
| **3. Call** | POST with `X-AGIRAILS-TX-ID` | Verify middleware | `kernel.getTransaction()` |
| **4. Serve** | - | Process request | Your logic |
| **5. Deliver** | - | Mark delivered (optional proof hash) | `transitionState(DELIVERED)` |
| **6. Settle** | Admin/bot executes `SETTLED` (requester anytime, provider after window) | Receive payment | Admin path |

### Discovery

Consumer fetches `/api/pricing` to discover:
- Provider address (where to send payment)
- Price per call
- Payment instructions

### Pre-Payment

:::warning Payment BEFORE API Call
Consumer creates and funds transaction BEFORE calling API. USDC is locked in escrow - neither party can touch it until delivery or cancellation.
:::

### Verification

<div style={{textAlign: 'center', margin: '1.5rem 0'}}>
  <img src="../img/diagrams/api-verification-middleware.svg" alt="Verification Middleware Flow" style={{maxWidth: '100%', height: 'auto'}} />
</div>

API middleware verifies:
- Transaction exists and is funded
- You're the designated provider
- Amount meets minimum price
- Deadline hasn't passed

### Delivery & Settlement

On successful API response:
- Provider marks DELIVERED with optional proof hash (SDK/off-chain verified)
- Consumer can verify result matches proof
- Admin/bot executes settlement to pay provider (requester can be settled anytime; provider after dispute window)

---

## Pricing Strategies

<div style={{textAlign: 'center', margin: '1.5rem 0'}}>
  <img src="../img/diagrams/api-pricing-strategies.svg" alt="Pricing Strategies" style={{maxWidth: '100%', height: 'auto'}} />
</div>

### Flat Rate

<Tabs>
<TabItem value="ts" label="TypeScript" default>

```typescript
const PRICE_PER_CALL = parseUnits('0.10', 6); // $0.10 per call
```

</TabItem>
<TabItem value="python" label="Python">

```python
PRICE_PER_CALL = 100_000  # $0.10 per call (6 decimals)
```

</TabItem>
</Tabs>

### Tiered by Input Size

<Tabs>
<TabItem value="ts" label="TypeScript" default>

```typescript
function calculatePrice(inputTokens: number): bigint {
  const basePrice = parseUnits('0.01', 6);
  const perToken = parseUnits('0.0001', 6);
  return basePrice + (BigInt(inputTokens) * perToken);
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
def calculate_price(input_tokens: int) -> int:
    base_price = 10_000      # $0.01 (6 decimals)
    per_token = 100          # $0.0001 (6 decimals)
    return base_price + (input_tokens * per_token)
```

</TabItem>
</Tabs>

### Dynamic (Market-Based)

<Tabs>
<TabItem value="ts" label="TypeScript" default>

```typescript
async function calculatePrice(): Promise<bigint> {
  const demand = await getCurrentDemand();
  const basePrice = parseUnits('0.10', 6);

  // Surge pricing during high demand
  if (demand > 0.8) {
    return basePrice * 2n;
  }
  return basePrice;
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
async def calculate_price() -> int:
    demand = await get_current_demand()
    base_price = 100_000  # $0.10 (6 decimals)

    # Surge pricing during high demand
    if demand > 0.8:
        return base_price * 2
    return base_price
```

</TabItem>
</Tabs>

---

## Gotchas

:::danger Common Pitfalls
These are mistakes we made so you don't have to.
:::

| Gotcha | Problem | Solution |
|--------|---------|----------|
| **Transaction reuse** | Each txId works only once | New transaction per API call |
| **Partial failures** | Service fails, but marked DELIVERED | Only deliver on success |
| **Timeouts** | Consumer waits forever | Use AbortController with timeout |
| **Minimum fee** | $0.05 min kills $0.01 calls | Batch calls or use credit system |
| **HTTP exposure** | txId leaked over HTTP | HTTPS only, always |

### Transaction Reuse

<Tabs>
<TabItem value="ts" label="TypeScript" default>

```typescript
// ❌ Bad - reusing transaction
await callAPI(txId);
await callAPI(txId); // Will fail - already DELIVERED

// ✅ Good - new transaction per call
const txId1 = await createTransaction();
await callAPI(txId1);
const txId2 = await createTransaction();
await callAPI(txId2);
```

</TabItem>
<TabItem value="python" label="Python">

```python
# ❌ Bad - reusing transaction
await call_api(tx_id)
await call_api(tx_id)  # Will fail - already DELIVERED

# ✅ Good - new transaction per call
tx_id1 = await create_transaction()
await call_api(tx_id1)
tx_id2 = await create_transaction()
await call_api(tx_id2)
```

</TabItem>
</Tabs>

### Handle Partial Failures

<Tabs>
<TabItem value="ts" label="TypeScript" default>

```typescript
try {
  const result = await yourService(input);
  await client.advanced.transitionState(txId, State.DELIVERED, proof);
  return result;
} catch (error) {
  // DON'T deliver - let consumer cancel or retry
  throw error;
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
try:
    result = await your_service(input)
    await client.advanced.transition_state(tx_id, State.DELIVERED, proof)
    return result
except Exception as error:
    # DON'T deliver - let consumer cancel or retry
    raise error
```

</TabItem>
</Tabs>

### Timeout Handling

<Tabs>
<TabItem value="ts" label="TypeScript" default>

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30000);

try {
  const response = await fetch(url, {
    signal: controller.signal,
    headers: { 'X-AGIRAILS-TX-ID': txId }
  });
} catch (error) {
  if (error.name === 'AbortError') {
    // Timeout - transaction still in escrow
    // Can retry with same txId if still COMMITTED/IN_PROGRESS
  }
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
import requests
from requests.exceptions import Timeout

try:
    response = requests.post(
        url,
        headers={"X-AGIRAILS-TX-ID": tx_id},
        timeout=30  # 30 second timeout
    )
except Timeout:
    # Timeout - transaction still in escrow
    # Can retry with same tx_id if still COMMITTED/IN_PROGRESS
    pass
```

</TabItem>
</Tabs>

---

## Production Checklist

### Security
- [ ] HTTPS only (never send txId over HTTP)
- [ ] Rate limiting (even with payments, prevent abuse)
- [ ] Error responses don't leak sensitive info

### Reliability
- [ ] Request logging (for dispute resolution)
- [ ] Proof hash includes full request + response
- [ ] Health check endpoint (no payment required)

### Observability
- [ ] Monitoring for failed payments / disputes
- [ ] Latency tracking per endpoint
- [ ] Revenue metrics dashboard

:::tip Start Simple
Don't build the billing dashboard before you have paying customers. HTTPS + rate limiting + logging is enough for launch.
:::

---

## Advanced: Batch Payments

For high-frequency, low-value calls, use a credit system:

<Tabs>
<TabItem value="ts" label="TypeScript" default>

```typescript
// Consumer: Prepay for 100 calls
const txId = await client.advanced.createTransaction({
  amount: parseUnits('10', 6), // $10 for 100 calls at $0.10
  // ...
});

// Provider: Track calls against balance
let remainingCalls = 100;

app.post('/api/generate', async (req, res) => {
  if (remainingCalls <= 0) {
    return res.status(402).json({ error: 'Credit exhausted' });
  }

  remainingCalls--;
  // Process request...

  if (remainingCalls === 0) {
    // Final call - settle the transaction
    await client.advanced.transitionState(txId, State.DELIVERED, proof);
  }
});
```

</TabItem>
<TabItem value="python" label="Python">

```python
# Consumer: Prepay for 100 calls
tx_id = client.advanced.create_transaction(
    amount=10_000_000,  # $10 for 100 calls at $0.10
    # ...
)

# Provider: Track calls against balance (Flask example)
remaining_calls = 100

@app.route('/api/generate', methods=['POST'])
def generate():
    global remaining_calls

    if remaining_calls <= 0:
        return jsonify({"error": "Credit exhausted"}), 402

    remaining_calls -= 1
    # Process request...

    if remaining_calls == 0:
        # Final call - settle the transaction
        client.advanced.transition_state(tx_id, State.DELIVERED, proof)

    return jsonify({"result": result})
```

</TabItem>
</Tabs>

---

## Next Steps

<div className="row" style={{marginTop: '1rem'}}>
  <div className="col col--4" style={{marginBottom: '1rem'}}>
    <div className="card" style={{height: '100%', padding: '1.5rem'}}>
      <h4>🤖 Run 24/7</h4>
      <p>Automated agent that never sleeps.</p>
      <a href="./automated-provider-agent">Provider Agent →</a>
    </div>
  </div>
  <div className="col col--4" style={{marginBottom: '1rem'}}>
    <div className="card" style={{height: '100%', padding: '1.5rem'}}>
      <h4>👥 Multiple Agents</h4>
      <p>Budget coordination for teams.</p>
      <a href="./multi-agent-budget">Multi-Agent Budget →</a>
    </div>
  </div>
  <div className="col col--4" style={{marginBottom: '1rem'}}>
    <div className="card" style={{height: '100%', padding: '1.5rem'}}>
      <h4>📚 Full API</h4>
      <p>Complete SDK documentation.</p>
      <a href="/sdk-reference">SDK Reference →</a>
    </div>
  </div>
</div>
