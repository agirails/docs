---
sidebar_position: 10
title: SDK Reference
description: Complete API reference for @agirails/sdk (TypeScript) and agirails-sdk (Python) for ACTP
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# SDK Reference

Complete API documentation for:
- `@agirails/sdk` (TypeScript/Node)
- `agirails-sdk` (Python)

:::info Before You Begin
Make sure you have:
- [ ] **Node.js 16+** (TS) or **Python 3.9+** (PY)
- [ ] **Private key** for Base Sepolia testnet wallet
- [ ] **~0.01 ETH** for gas fees ([get from faucet](https://portal.cdp.coinbase.com/products/faucet))
- [ ] **Mock USDC** tokens ([see Installation Guide](/installation#step-4-get-testnet-tokens))
- [ ] Basic understanding of **async/await** (TS) or Python coroutines if needed

**Estimated time to first transaction:** ~5 minutes

**Want to jump straight to code?** Clone our examples:
```bash
git clone https://github.com/agirails/sdk-examples
cd sdk-examples && npm install
npm run example:happy-path
```
:::

---

## Installation

<Tabs>
<TabItem value="ts" label="TypeScript">

```bash
npm install @agirails/sdk
# or
yarn add @agirails/sdk
# or
pnpm add @agirails/sdk
```

**Requirements:**
- Node.js >= 16.0.0
- TypeScript 5.2+ (for TypeScript users)
- ethers.js v6 (included as dependency)

</TabItem>
<TabItem value="py" label="Python">

```bash
pip install agirails-sdk
```

**Requirements:**
- Python 3.9+
- web3.py v6 (installed as dependency)

</TabItem>
</Tabs>

---

## Quick Reference

:::tip Most Used Methods
| Task | Method | Description |
|------|--------|-------------|
| **Start payment** | `client.kernel.createTransaction()` | Create new transaction |
| **Lock funds** | `client.fundTransaction()` | Approve USDC + link escrow |
| **Check status** | `client.kernel.getTransaction()` | Get transaction details |
| **Progress state** | `client.kernel.transitionState()` | Move to next state |
| **Settle payment** | `client.releaseEscrowWithVerification()` | Verify + release funds |

**Common Flow:** Create -> Fund -> (Provider delivers) -> Release

See [Common Patterns](#common-patterns) for complete workflows.
:::

---

## Architecture

![SDK Architecture](/img/diagrams/sdk-architecture.svg)

| Module | Purpose | Key Methods |
|--------|---------|-------------|
| `kernel` | Transaction lifecycle | `createTransaction`, `transitionState`, `releaseEscrow` |
| `escrow` | USDC management | `approveToken`, `getEscrowBalance` |
| `eas` | Attestations | `attestDeliveryProof`, `verifyDeliveryAttestation` |
| `events` | Real-time monitoring | `watchTransaction`, `waitForState` |
| `quote` | Price negotiation | `build`, `verify`, `computeHash` |
| `proofGenerator` | Delivery proofs | `generateDeliveryProof`, `hashContent` |
| `messageSigner` | EIP-712 signing | `signMessage`, `verifySignature` |

---

### Difficulty Levels

Throughout this reference, methods are marked with difficulty indicators:

| Icon | Level | Description |
|------|-------|-------------|
| 🟢 | **Basic** | Simple to use, minimal setup required |
| 🟡 | **Intermediate** | Requires understanding of the protocol flow |
| 🔴 | **Advanced** | Complex logic, use with caution |

---

## Gas Costs

Estimated gas costs on Base Sepolia (L2 fees are very low):

| Operation | Gas Units | Cost (USD)* |
|-----------|-----------|-------------|
| `createTransaction` | ~85,000 | ~$0.001 |
| `fundTransaction` | ~120,000 | ~$0.001 |
| `transitionState` | ~45,000 | ~$0.0005 |
| `anchorAttestation` | ~50,000 | ~$0.0005 |
| `releaseEscrow` | ~65,000 | ~$0.0007 |
| **Full Happy Path** | **~365,000** | **~$0.004** |

*Costs estimated at Base L2 gas prices (~0.001 gwei). Actual costs may vary.

:::note Why So Cheap?
Base is an Ethereum L2 with gas costs 100x cheaper than mainnet. A full transaction lifecycle costs less than $0.01.
:::

---

## ACTPClient

The main entry point for all SDK operations. Use the async factory method `ACTPClient.create()` to instantiate.

### create()

<span className="badge badge--success">🟢 Basic</span>

Creates and initializes an ACTPClient instance. This is the recommended way to create a client.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
static async create(config: ACTPClientConfig): Promise<ACTPClient>
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `config.network` | `'base-sepolia' \| 'base-mainnet'` | Yes | Network to connect to |
| `config.privateKey` | `string` | No* | Private key for signing transactions |
| `config.signer` | `Signer` | No* | ethers.js Signer instance |
| `config.provider` | `JsonRpcProvider` | No | Custom ethers.js provider |
| `config.rpcUrl` | `string` | No | Custom RPC URL (overrides network default) |
| `config.contracts` | `object` | No | Override contract addresses |
| `config.contracts.actpKernel` | `string` | No | Custom ACTPKernel address |
| `config.contracts.escrowVault` | `string` | No | Custom EscrowVault address |
| `config.contracts.usdc` | `string` | No | Custom USDC token address |
| `config.gasSettings` | `object` | No | Gas price settings |
| `config.gasSettings.maxFeePerGas` | `bigint` | No | Maximum fee per gas |
| `config.gasSettings.maxPriorityFeePerGas` | `bigint` | No | Maximum priority fee |
| `config.eas` | `EASConfig` | No | EAS configuration for attestations |

*Either `privateKey` or `signer` must be provided.

#### Returns

`Promise<ACTPClient>` - Initialized client ready for use

#### Throws

- `ValidationError` - If configuration is invalid
- `NetworkError` - If unable to connect to network

#### Example

```typescript
import { ACTPClient } from '@agirails/sdk';

// Basic setup with private key
const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY!
});

// With custom RPC and gas settings
const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY!,
  rpcUrl: 'https://base-sepolia.g.alchemy.com/v2/YOUR_KEY',
  gasSettings: {
    maxFeePerGas: 2000000000n, // 2 gwei
    maxPriorityFeePerGas: 1000000000n // 1 gwei
  }
});

// With EAS attestation support
const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY!,
  eas: {
    contractAddress: '0x4200000000000000000000000000000000000021',
    deliveryProofSchemaId: '0x1b0ebdf0...'
  }
});
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails_sdk import ACTPClient, Network

# Basic setup with private key
client = ACTPClient(
    network=Network.BASE_SEPOLIA,
    private_key=os.getenv("PRIVATE_KEY"),
)

# With custom RPC and gas settings (tx_overrides)
client = ACTPClient(
    network=Network.BASE_SEPOLIA,
    private_key=os.getenv("PRIVATE_KEY"),
    rpc_url="https://base-sepolia.g.alchemy.com/v2/YOUR_KEY",
    tx_overrides={
        "maxFeePerGas": 2_000_000_000,      # 2 gwei
        "maxPriorityFeePerGas": 1_000_000_000,  # 1 gwei
    },
)

# With EAS attestation support (delivery proofs)
client = ACTPClient(
    network=Network.BASE_SEPOLIA,
    private_key=os.getenv("PRIVATE_KEY"),
)
# EAS contract/schema are preconfigured for Base Sepolia; pass rpc_url if overriding network config.
```

#### Parameters (Python)

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `network` | `Network` | Yes | Network to connect to (`BASE_SEPOLIA`, `BASE`) |
| `private_key` | `str` | Yes | Private key for signing transactions |
| `rpc_url` | `str` | No | Custom RPC URL |
| `tx_overrides` | `dict` | No | Gas/nonce overrides (`maxFeePerGas`, `maxPriorityFeePerGas`, `nonce`) |
| `manual_nonce` | `bool` | No | Enable manual nonce management |

#### Returns

`ACTPClient` - Initialized client ready for use

#### Throws

- `ValidationError` - If configuration is invalid
- `RpcError` - If unable to connect or send transaction

</TabItem>
</Tabs>

---

### getAddress()

<span className="badge badge--success">🟢 Basic</span>

Returns the Ethereum address of the connected signer.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
async getAddress(): Promise<string>
```

#### Returns

`Promise<string>` - Ethereum address (checksummed)

#### Example

```typescript
const address = await client.getAddress();
console.log('Connected as:', address);
// Output: Connected as: 0x742d35Cc6634C0532925a3b844Bc454e4438f44e
```

</TabItem>
<TabItem value="py" label="Python">

```python
address = client.address
print("Connected as:", address)
# Output: Connected as: 0x742d35Cc6634C0532925a3b844Bc454e4438f44e
```

</TabItem>
</Tabs>

---

### getNetworkConfig() 🟢

Returns the current network configuration.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
getNetworkConfig(): NetworkConfig
```

#### Returns

`NetworkConfig` - Network configuration object

```typescript
interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  blockExplorer: string;
  contracts: {
    actpKernel: string;
    escrowVault: string;
    usdc: string;
    eas: string;
    easSchemaRegistry: string;
  };
  eas: {
    deliverySchemaUID: string;
  };
  gasSettings: {
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
  };
}
```

#### Example

```typescript
const config = client.getNetworkConfig();
console.log('Network:', config.name); // "Base Sepolia"
console.log('Chain ID:', config.chainId); // 84532
console.log('Kernel:', config.contracts.actpKernel);
```

</TabItem>
<TabItem value="py" label="Python">

```python
config = client.config
print("Network:", config.name.value)  # "base-sepolia"
print("Chain ID:", config.chain_id)   # 84532
print("Kernel:", config.actp_kernel)
```

#### Returns

`NetworkConfig` - Network configuration dataclass (`name`, `chain_id`, `rpc_url`, `actp_kernel`, `escrow_vault`, `usdc`, `eas`, `eas_schema_registry`, `delivery_schema_uid`, `agent_registry`)

</TabItem>
</Tabs>

---

### getProvider() 🟢

Returns the underlying ethers.js provider.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
getProvider(): JsonRpcProvider
```

#### Returns

`JsonRpcProvider` - ethers.js JSON-RPC provider

#### Example

```typescript
const provider = client.getProvider();
const blockNumber = await provider.getBlockNumber();
console.log('Current block:', blockNumber);
```

</TabItem>
<TabItem value="py" label="Python">

```python
provider = client.w3  # Web3 instance
block_number = provider.eth.block_number
print("Current block:", block_number)
```

#### Returns

`Web3` - web3.py HTTP provider configured for the selected network

</TabItem>
</Tabs>

---

### getBlockNumber() 🟢

Returns the current block number.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
async getBlockNumber(): Promise<number>
```

#### Returns

`Promise<number>` - Current block number

#### Throws

- `NetworkError` - If unable to fetch block number

#### Example

```typescript
const blockNumber = await client.getBlockNumber();
console.log('Block:', blockNumber);
```

</TabItem>
<TabItem value="py" label="Python">

```python
block_number = client.w3.eth.block_number
print("Block:", block_number)
```

#### Returns

`int` - Current block number

</TabItem>
</Tabs>

---

### getGasPrice()

Returns the current gas price.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
async getGasPrice(): Promise<bigint>
```

#### Returns

`Promise<bigint>` - Gas price in wei

#### Throws

- `NetworkError` - If unable to fetch gas price

#### Example

```typescript
const gasPrice = await client.getGasPrice();
console.log('Gas price:', gasPrice.toString(), 'wei');
```

</TabItem>
<TabItem value="py" label="Python">

```python
gas_price = client.w3.eth.gas_price
print("Gas price:", gas_price, "wei")
```

#### Returns

`int` - Gas price in wei

</TabItem>
</Tabs>

---

### fundTransaction()

<span className="badge badge--success">🟢 Basic</span>

Convenience method that approves USDC and links escrow in one call. This is the recommended way to fund a transaction.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
async fundTransaction(txId: string): Promise<string>
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `txId` | `string` | Yes | Transaction ID (bytes32 hex string) |

#### Returns

`Promise<string>` - Escrow ID created (bytes32 hex string)

#### Throws

- `ValidationError` - If transaction not found, already funded, or deadline passed
- `TransactionRevertedError` - If on-chain operation fails

#### Example

```typescript
import { parseUnits } from 'ethers';

// Create transaction first
const txId = await client.kernel.createTransaction({
  requester: await client.getAddress(),
  provider: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  amount: parseUnits('100', 6),
  deadline: Math.floor(Date.now() / 1000) + 86400,
  disputeWindow: 7200
});

// Fund the transaction (approves USDC + links escrow)
const escrowId = await client.fundTransaction(txId);
console.log('Escrow ID:', escrowId);

// Transaction is now COMMITTED and ready for provider to work
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Create transaction first
tx_id = client.create_transaction(
    requester=client.address,
    provider="0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    amount=100_000_000,  # 100 USDC
    deadline=client.now() + 86400,
    dispute_window=7200,
    service_hash="0x" + "00" * 32,
)

# Fund the transaction (approves USDC + links escrow)
escrow_id = client.fund_transaction(tx_id)
print("Escrow ID:", escrow_id)

# Transaction is now COMMITTED and ready for provider to work
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `tx_id` | `str` | Yes | Transaction ID (bytes32 hex string) |

#### Returns

`str` - Escrow ID created (bytes32 hex string)

#### Throws

- `ValidationError` - Invalid tx/state/deadline
- `TransactionError` / `RpcError` - On-chain failures

</TabItem>
</Tabs>

#### Notes

- Validates that transaction exists and is in INITIATED or QUOTED state
- Validates deadline has not passed
- Approves exact USDC amount (platform fee deducted on release)
- Auto-generates unique escrow ID
- Auto-transitions transaction to COMMITTED state

#### See Also

- [createTransaction()](#createtransaction) - Create transaction before funding
- [escrow.approveToken()](#approvetoken) - Manual USDC approval (if needed)
- [kernel.linkEscrow()](#linkescrow) - Manual escrow linking (advanced)

---

### releaseEscrowWithVerification()

<span className="badge badge--warning">🟡 Intermediate</span>

Releases escrow with EAS attestation verification. This is the secure way to settle transactions.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
async releaseEscrowWithVerification(
  txId: string,
  attestationUID: string
): Promise<void>
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `txId` | `string` | Yes | Transaction ID to settle |
| `attestationUID` | `string` | Yes | EAS attestation UID to verify |

#### Throws

- `Error` - If EAS is not configured
- `Error` - If attestation verification fails (revoked, expired, or txId mismatch)
- `TransactionRevertedError` - If escrow release fails

#### Example

```typescript
// Client must be initialized with EAS config
const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY!,
  eas: {
    contractAddress: '0x4200000000000000000000000000000000000021',
    deliveryProofSchemaId: '0x1b0ebdf0bd20c28ec9d5362571ce8715a55f46e81c3de2f9b0d8e1b95fb5ffce'
  }
});

// Get transaction to find attestation UID
const tx = await client.kernel.getTransaction(txId);

// Verify and release in one secure call
await client.releaseEscrowWithVerification(txId, tx.attestationUID);
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Client must be initialized with EAS config (preconfigured for Base Sepolia)
client = ACTPClient(
    network=Network.BASE_SEPOLIA,
    private_key=os.getenv("PRIVATE_KEY"),
)

# Verify and release in one secure call
client.release_escrow_with_verification(tx_id, attestation_uid)
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `tx_id` | `str` | Yes | Transaction ID to settle |
| `attestation_uid` | `str` | Yes | EAS attestation UID to verify |

#### Throws

- `ValidationError` / `TransactionError` - On invalid inputs or failed verification
- `RpcError` - If transaction fails on-chain

</TabItem>
</Tabs>

#### Security Notes

- Verifies attestation schema matches canonical delivery proof schema
- Verifies attestation is not revoked
- Verifies attestation is not expired
- Verifies attestation txId matches the transaction being settled
- Protects against malicious providers submitting attestations from other transactions

#### See Also

- [eas.verifyDeliveryAttestation()](#verifydeliveryattestation) - Manual verification
- [kernel.releaseEscrow()](#releaseescrow) - Release without verification (unsafe)
- [kernel.getTransaction()](#gettransaction) - Get attestation UID from transaction

---

## client.kernel

The kernel module handles ACTP transaction lifecycle management.

### createTransaction()

<span className="badge badge--success">🟢 Basic</span>

Creates a new ACTP transaction between a requester and provider.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
async createTransaction(params: CreateTransactionParams): Promise<string>
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `params.requester` | `string` | Yes | Address of the requester (payer) |
| `params.provider` | `string` | Yes | Address of the provider (payee) |
| `params.amount` | `bigint` | Yes | Amount in USDC (6 decimals). Use `parseUnits('10', 6)` for 10 USDC |
| `params.deadline` | `number` | Yes | Unix timestamp when transaction expires |
| `params.disputeWindow` | `number` | Yes | Seconds for dispute window after delivery |
| `params.metadata` | `string` | No | Optional bytes32 service hash/quote hash (stored as `serviceHash`) |

#### Returns

`Promise<string>` - Transaction ID (bytes32 hex string)

#### Throws

- `ValidationError` - If parameters are invalid (address format, amount ≤ 0, deadline in past)
- `TransactionRevertedError` - If on-chain transaction fails

#### Example

```typescript
import { ACTPClient } from '@agirails/sdk';
import { parseUnits } from 'ethers';

const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY!
});

const txId = await client.kernel.createTransaction({
  requester: await client.getAddress(),
  provider: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  amount: parseUnits('100', 6), // 100 USDC
  deadline: Math.floor(Date.now() / 1000) + 86400, // 24 hours
  disputeWindow: 7200 // 2 hours
});

console.log('Transaction ID:', txId);
// Output: Transaction ID: 0x1234...abcd
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails_sdk import ACTPClient, Network

client = ACTPClient(
    network=Network.BASE_SEPOLIA,
    private_key=os.getenv("PRIVATE_KEY"),
)

tx_id = client.create_transaction(
    requester=client.address,
    provider="0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    amount=100_000_000,  # 100 USDC (6 decimals)
    deadline=client.now() + 86400,  # 24 hours
    dispute_window=7200,  # 2 hours
    service_hash="0x" + "00" * 32,
)

print("Transaction ID:", tx_id)
# Output: Transaction ID: 0x1234...abcd
```

#### Parameters (Python)

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `requester` | `str` | Yes | Requester address (payer, must match signer) |
| `provider` | `str` | Yes | Provider address (payee) |
| `amount` | `int` | Yes | Amount in USDC base units (6 decimals) |
| `deadline` | `int` | Yes | Unix timestamp expiry |
| `dispute_window` | `int` | Yes | Seconds for dispute window |
| `service_hash` | `str` | No | Optional bytes32 hash |

#### Returns

`str` - Transaction ID (bytes32 hex)

#### Throws

- `ValidationError` - Invalid params (amount, deadline, addresses)
- `DeadlineError` - If deadline is not in future
- `TransactionError` / `RpcError` - On-chain failure

</TabItem>
</Tabs>

#### Notes

- Transaction starts in `INITIATED` state
- Requester must have sufficient USDC balance to fund later
- Platform minimum is $0.05 USDC (50000 base units)
- Waits for 2 block confirmations for Base L2 reorg safety

#### See Also

- [fundTransaction()](#fundtransaction) - Fund the transaction after creation
- [getTransaction()](#gettransaction) - Check transaction status
- [transitionState()](#transitionstate) - Progress the transaction state

---

### getTransaction()

<span className="badge badge--success">🟢 Basic</span>

Retrieves transaction details by ID.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
async getTransaction(txId: string): Promise<Transaction>
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `txId` | `string` | Yes | Transaction ID (bytes32 hex string) |

#### Returns

```typescript
interface Transaction {
  txId: string;           // Transaction ID
  requester: string;      // Requester address
  provider: string;       // Provider address
  amount: bigint;         // Amount in USDC (6 decimals)
  state: State;           // Current state (0-7)
  createdAt: number;      // Creation timestamp
  updatedAt: number;      // Last update timestamp
  deadline: number;       // Deadline timestamp
  disputeWindow: number;  // Dispute window in seconds
  escrowContract: string; // Linked escrow contract address
  escrowId: string;       // Escrow ID
  serviceHash: string;    // Service hash (quote hash if QUOTED)
  attestationUID: string; // EAS attestation UID (delivery proof)
  metadata: string;       // Optional metadata (quote hash for QUOTED)
  platformFeeBpsLocked: number; // Platform fee bps locked at creation
}
```

#### Throws

- `TransactionNotFoundError` - If transaction does not exist

#### Example

```typescript
const tx = await client.kernel.getTransaction(txId);

console.log('State:', State[tx.state]); // "COMMITTED"
console.log('Amount:', tx.amount.toString()); // "100000000"
console.log('Provider:', tx.provider);
console.log('Deadline:', new Date(tx.deadline * 1000));
```

</TabItem>
<TabItem value="py" label="Python">

```python
tx = client.get_transaction(tx_id)

print("State:", tx.state.name)          # "COMMITTED"
print("Amount:", tx.amount)             # 100000000
print("Provider:", tx.provider)
print("Deadline:", tx.deadline)         # Unix timestamp
```

#### Returns

`TransactionView` dataclass (`transaction_id`, `requester`, `provider`, `state`, `amount`, `created_at`, `updated_at`, `deadline`, `service_hash`, `escrow_contract`, `escrow_id`, `attestation_uid`, `dispute_window`, `metadata`, `platform_fee_bps_locked`)

#### Throws

- `TransactionError` / `RpcError` - If transaction not found or RPC fails

</TabItem>
</Tabs>

---

### transitionState()

<span className="badge badge--warning">🟡 Intermediate</span>

Transitions a transaction to a new state.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
async transitionState(
  txId: string,
  newState: State,
  proof?: BytesLike
): Promise<void>
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `txId` | `string` | Yes | Transaction ID |
| `newState` | `State` | Yes | Target state (from State enum) |
| `proof` | `BytesLike` | No | Optional proof data (for DELIVERED, DISPUTED states) |

#### Throws

- `InvalidStateTransitionError` - If transition is not allowed from current state
- `TransactionRevertedError` - If on-chain transaction fails

#### Example

```typescript
import { State } from '@agirails/sdk';

// Provider marks work as in progress
await client.kernel.transitionState(txId, State.IN_PROGRESS);

// Provider delivers result
await client.kernel.transitionState(txId, State.DELIVERED, proofData);
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails_sdk import State

# Provider marks work as in progress
client.transition_state(tx_id, State.IN_PROGRESS)

# Provider delivers result
client.transition_state(tx_id, State.DELIVERED, proof_bytes_or_hex)
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `tx_id` | `str` | Yes | Transaction ID |
| `new_state` | `State` | Yes | Target state |
| `proof` | `Union[str, bytes]` | No | Optional proof data for DELIVERED/DISPUTED |

#### Throws

- `InvalidStateTransitionError` - If transition not allowed
- `TransactionError` / `RpcError` - On-chain failure

</TabItem>
</Tabs>

#### State Machine

![State Machine](/img/diagrams/state-machine.svg)

#### See Also

- [State enum](#state) - All possible states
- [events.waitForState()](#waitforstate) - Wait for specific state
- [events.watchTransaction()](#watchtransaction) - Monitor state changes

---

### submitQuote()

:::danger Not Available in V1
This method is **not implemented** in the current V1 contract. The QUOTED state exists but quotes are submitted via `transitionState(txId, State.QUOTED, quoteProof)` by the provider. A dedicated `submitQuote()` helper is planned for V2.
:::

<span className="badge badge--secondary">🔮 Planned</span>

To transition to QUOTED state in V1, use:

```typescript
// V1: Use transitionState to move to QUOTED
const quoteProof = ethers.id('quote-details-hash');
await providerClient.kernel.transitionState(txId, State.QUOTED, quoteProof);
```

---

### linkEscrow()

<span className="badge badge--warning">🟡 Intermediate</span>

Links an escrow to a transaction, transitioning it to COMMITTED state.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
async linkEscrow(
  txId: string,
  escrowContract: string,
  escrowId: string
): Promise<void>
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `txId` | `string` | Yes | Transaction ID |
| `escrowContract` | `string` | Yes | EscrowVault contract address |
| `escrowId` | `string` | Yes | Unique escrow identifier (bytes32) |

#### Throws

- `ValidationError` - If parameters are invalid
- `TransactionRevertedError` - If insufficient USDC approval or other contract error

#### Example

```typescript
import { id } from 'ethers';

// First approve USDC
await client.escrow.approveToken(usdcAddress, amount);

// Generate unique escrow ID
const escrowId = id(`escrow-${txId}-${Date.now()}`);

// Link escrow (auto-transitions to COMMITTED)
await client.kernel.linkEscrow(txId, escrowVaultAddress, escrowId);
```

</TabItem>
<TabItem value="py" label="Python">

```python
import secrets

# First approve USDC
client.usdc.functions.approve(
    client.config.escrow_vault,
    100_000_000,  # amount in USDC (6 decimals)
).transact({"from": client.address})

# Generate unique escrow ID
escrow_id = secrets.token_hex(32)

# Link escrow (auto-transitions to COMMITTED)
client.link_escrow(tx_id, escrow_contract=client.config.escrow_vault, escrow_id=escrow_id)
```

#### Parameters (Python)

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `tx_id` | `str` | Yes | Transaction ID |
| `escrow_contract` | `str` | Yes | EscrowVault contract address |
| `escrow_id` | `str` | Yes | Unique escrow identifier (bytes32 hex) |

#### Throws

- `ValidationError` - If parameters invalid
- `TransactionError` / `RpcError` - If approval/link fails on-chain

</TabItem>
</Tabs>

#### Notes

- Consumer must approve USDC to EscrowVault BEFORE calling linkEscrow
- Auto-transitions transaction from INITIATED/QUOTED to COMMITTED
- Use `client.fundTransaction()` for a simpler one-call approach

---

### releaseMilestone()

Releases a partial milestone payment.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
async releaseMilestone(txId: string, amount: bigint): Promise<void>
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `txId` | `string` | Yes | Transaction ID |
| `amount` | `bigint` | Yes | Amount to release in USDC |

:::info V1 Contract Signature
The contract takes only `(transactionId, amount)` - there is no milestone ID parameter. Multiple partial releases are tracked by cumulative amount released, not by milestone index.
:::

#### Throws

- `ValidationError` - If amount invalid or exceeds remaining escrow
- `TransactionRevertedError` - If contract reverts

#### Example

```typescript
// Release partial payment of 25 USDC
await client.kernel.releaseMilestone(txId, parseUnits('25', 6));

// Release another 25 USDC later
await client.kernel.releaseMilestone(txId, parseUnits('25', 6));
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Release partial payment of 25 USDC
client.release_milestone(tx_id, 25_000_000)

# Release another 25 USDC later
client.release_milestone(tx_id, 25_000_000)
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `tx_id` | `str` | Yes | Transaction ID |
| `amount` | `int` | Yes | Amount to release in USDC base units (6 decimals) |

#### Throws

- `ValidationError` - If amount invalid or exceeds remaining escrow
- `TransactionError` / `RpcError` - If contract reverts

</TabItem>
</Tabs>

---

### releaseEscrow()

Releases full escrow to settle the transaction.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
async releaseEscrow(txId: string): Promise<void>
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `txId` | `string` | Yes | Transaction ID to settle |

#### Throws

- `ValidationError` - If txId is invalid
- `TransactionRevertedError` - If contract reverts

#### Example

```typescript
await client.kernel.releaseEscrow(txId);
```

</TabItem>
<TabItem value="py" label="Python">

```python
client.release_escrow(tx_id)
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `tx_id` | `str` | Yes | Transaction ID to settle |

#### Throws

- `ValidationError` - If tx_id is invalid or state not DELIVERED
- `TransactionError` / `RpcError` - If contract reverts

</TabItem>
</Tabs>

#### Security Warning

**V1 contracts do not validate attestation UIDs on-chain.** Use `client.releaseEscrowWithVerification()` instead for secure settlement with attestation verification.

---

### raiseDispute()

:::danger Not Available in V1
The contract does **not** have a dedicated `raiseDispute()` function. Disputes are raised via `transitionState()` to the DISPUTED state.
:::

<span className="badge badge--secondary">🔮 Planned</span>

**V1 Implementation:** Use `transitionState` to move to DISPUTED:

```typescript
// Requester raises dispute (must be in DELIVERED state, within dispute window)
await requesterClient.kernel.transitionState(txId, State.DISPUTED, '0x');
```

:::info Dispute Flow in V1
1. Transaction must be in DELIVERED state
2. Requester calls `transitionState(txId, DISPUTED, proof)` within dispute window
3. Admin resolves via `resolveDispute()` (admin-only function)
4. Funds distributed per admin decision
:::

---

### deliver() (Convenience)

Provider helper to mark work as delivered with optional dispute window override.

<Tabs>
<TabItem value="ts" label="TypeScript">

Not available as a convenience helper in TS; use `transitionState(txId, State.DELIVERED, proof)` directly.

</TabItem>
<TabItem value="py" label="Python">

```python
client.deliver(
    tx_id,
    dispute_window_seconds=3600,  # optional override
)
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `tx_id` | `str` | Yes | Transaction ID |
| `dispute_window_seconds` | `int` | No | Optional override |

#### Throws

- `InvalidStateTransitionError` - If not in IN_PROGRESS
- `TransactionError` / `RpcError` - On-chain failure

</TabItem>
</Tabs>

---

### dispute() (Convenience)

Raise a dispute on a transaction.

<Tabs>
<TabItem value="ts" label="TypeScript">

Not available as a convenience helper in TS; use `transitionState(txId, State.DISPUTED, proof)` during dispute window.

</TabItem>
<TabItem value="py" label="Python">

```python
client.dispute(tx_id)
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `tx_id` | `str` | Yes | Transaction ID |

#### Throws

- `InvalidStateTransitionError` - If not in DELIVERED during dispute window
- `TransactionError` / `RpcError` - On-chain failure

</TabItem>
</Tabs>

---

### cancel() (Convenience)

Cancel a transaction.

<Tabs>
<TabItem value="ts" label="TypeScript">

Not available as a convenience helper in TS; use `transitionState(txId, State.CANCELLED, proof)` respecting cancellation rules.

</TabItem>
<TabItem value="py" label="Python">

```python
client.cancel(tx_id, proof=b"timeout")
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `tx_id` | `str` | Yes | Transaction ID |
| `proof` | `Union[str, bytes]` | No | Optional cancellation proof |

#### Throws

- `InvalidStateTransitionError` - If cancellation not allowed from current state
- `TransactionError` / `RpcError` - On-chain failure

</TabItem>
</Tabs>

---

### resolveDispute()

:::danger Admin-Only in V1
This function exists in the contract but can **only be called by admin/pauser**, not by SDK users. It is used to resolve disputed transactions.
:::

<span className="badge badge--danger">🔴 Admin Only</span>

**V1 Contract Signature:**

```solidity
function resolveDispute(
    bytes32 transactionId,
    uint256 requesterAmount,
    uint256 providerAmount,
    uint256 mediatorAmount,
    address mediator
) external onlyRole(PAUSER_ROLE)
```

Regular users cannot call this method. Contact protocol admin to resolve disputes in V1.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Admin-only
await client.kernel.resolveDispute(txId, {
  requesterAmount: parseUnits('2.5', 6),
  providerAmount: parseUnits('7', 6),
  mediatorAmount: parseUnits('0.5', 6),
  mediator: await client.getAddress()
});
```

</TabItem>
<TabItem value="py" label="Python">

```python
client.resolve_dispute(
    tx_id,
    requester_amount=250_000,   # example split
    provider_amount=700_000,
    mediator_amount=50_000,
    mediator=client.address,
)
```

#### Throws

- `InvalidStateTransitionError` - If transaction not in DISPUTED
- `ValidationError` - Invalid amounts/mediator
- `TransactionError` / `RpcError` - On-chain failure

</TabItem>
</Tabs>

---

### anchorAttestation()

Anchors an EAS attestation UID to a transaction.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
async anchorAttestation(
  txId: string,
  attestationUID: string
): Promise<void>
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `txId` | `string` | Yes | Transaction ID |
| `attestationUID` | `string` | Yes | EAS attestation UID (bytes32) |

#### Throws

- `ValidationError` - If attestationUID format is invalid
- `TransactionRevertedError` - If contract reverts

#### Example

```typescript
// After creating EAS attestation
const attestation = await client.eas!.attestDeliveryProof(proof, recipient);
await client.kernel.anchorAttestation(txId, attestation.uid);
```

</TabItem>
<TabItem value="py" label="Python">

```python
# After creating EAS attestation (if using EAS client separately)
client.anchor_attestation(tx_id, attestation_uid)
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `tx_id` | `str` | Yes | Transaction ID |
| `attestation_uid` | `str` | Yes | EAS attestation UID (bytes32 hex) |

#### Throws

- `ValidationError` - If UID format invalid
- `TransactionError` / `RpcError` - If contract reverts

</TabItem>
</Tabs>

---

### getEconomicParams()

:::danger Not Available in V1
The contract does **not** have a `getEconomicParams()` function. Economic parameters are exposed as individual public variables.
:::

<span className="badge badge--secondary">🔮 Planned</span>

**V1 Alternative:** Query individual contract variables directly:

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// V1: Read individual public variables from contract
const kernel = client.kernel.getContract(); // Get ethers Contract instance

const platformFeeBps = await kernel.platformFeeBps();        // 100 = 1%
const feeRecipient = await kernel.feeRecipient();
const requesterPenaltyBps = await kernel.requesterPenaltyBps(); // 500 = 5%

// Calculate fee percentage
const feePercent = Number(platformFeeBps) / 100;
console.log('Platform fee:', feePercent + '%'); // "Platform fee: 1%"
```

</TabItem>
<TabItem value="py" label="Python">

```python
kernel = client.kernel  # web3.py Contract

platform_fee_bps = kernel.functions.platformFeeBps().call()
fee_recipient = kernel.functions.feeRecipient().call()
requester_penalty_bps = kernel.functions.requesterPenaltyBps().call()

fee_percent = platform_fee_bps / 100
print(f"Platform fee: {fee_percent}%")  # "Platform fee: 1%"
```

</TabItem>
</Tabs>

**Available public variables in V1:**
- `platformFeeBps` - Platform fee in basis points (100 = 1%)
- `feeRecipient` - Address receiving platform fees
- `requesterPenaltyBps` - Cancellation penalty (500 = 5%)
- `getPendingEconomicParams()` - View scheduled parameter changes

---

### estimateCreateTransaction()

Estimates gas for transaction creation.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
async estimateCreateTransaction(
  params: CreateTransactionParams
): Promise<bigint>
```

#### Returns

`Promise<bigint>` - Estimated gas units

#### Example

```typescript
const gas = await client.kernel.estimateCreateTransaction({
  requester: await client.getAddress(),
  provider: '0x742d35...',
  amount: parseUnits('100', 6),
  deadline: Math.floor(Date.now() / 1000) + 86400,
  disputeWindow: 7200
});

console.log('Estimated gas:', gas.toString());
```

</TabItem>
<TabItem value="py" label="Python">

```python
gas = client.estimate_create_transaction(
    requester=client.address,
    provider="0x742d35...",
    amount=100_000_000,
    deadline=client.now() + 86400,
    dispute_window=7200,
    service_hash="0x" + "00" * 32,
)
print("Estimated gas:", gas)
```

#### Returns

`int` - Estimated gas units

</TabItem>
</Tabs>

---

### getAddress()

Returns the ACTPKernel contract address.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
getAddress(): string
```

#### Returns

`string` - Contract address

</TabItem>
<TabItem value="py" label="Python">

```python
kernel_address = client.kernel.address
print(kernel_address)
```

#### Returns

`str` - Contract address

</TabItem>
</Tabs>

---

## client.escrow

The escrow module handles USDC token approvals and escrow state queries.

### approveToken()

Approves USDC tokens for escrow creation.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
async approveToken(tokenAddress: string, amount: bigint): Promise<void>
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `tokenAddress` | `string` | Yes | USDC contract address |
| `amount` | `bigint` | Yes | Amount to approve (6 decimals) |

#### Throws

- `ValidationError` - If address or amount invalid
- `TransactionRevertedError` - If approval fails

#### Example

```typescript
const config = client.getNetworkConfig();
const amount = parseUnits('100', 6);

await client.escrow.approveToken(config.contracts.usdc, amount);
```

</TabItem>
<TabItem value="py" label="Python">

```python
config = client.config
amount = 100_000_000  # 100 USDC

tx_hash = client.usdc.functions.approve(
    config.escrow_vault,
    amount,
).transact({"from": client.address})
client.w3.eth.wait_for_transaction_receipt(tx_hash)
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `token_address` | `str` | Yes | USDC contract address |
| `amount` | `int` | Yes | Amount to approve (6 decimals) |

#### Throws

- `ValidationError` - If address or amount invalid
- `RpcError` / `TransactionError` - If approval fails

</TabItem>
</Tabs>

#### Notes

- Must be called BEFORE `linkEscrow()`
- Handles USDC's approval reset pattern (sets to 0 first if residual allowance)
- Skips approval if current allowance is sufficient

---

### getEscrow()

Retrieves escrow details by ID.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
async getEscrow(escrowId: string): Promise<Escrow>
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `escrowId` | `string` | Yes | Escrow ID (bytes32) |

#### Returns

```typescript
interface Escrow {
  escrowId: string;    // Escrow identifier
  kernel: string;      // Linked kernel address
  txId: string;        // Linked transaction ID
  token: string;       // Token address (USDC)
  amount: bigint;      // Locked amount
  beneficiary: string; // Provider address
  createdAt: number;   // Creation timestamp
  released: boolean;   // Whether funds released
}
```

#### Example

```typescript
const escrow = await client.escrow.getEscrow(escrowId);
console.log('Amount locked:', escrow.amount.toString());
console.log('Released:', escrow.released);
```

</TabItem>
<TabItem value="py" label="Python">

```python
is_active, escrow_amount = client.get_escrow_status(
    None,
    escrow_id,
    expected_requester=None,
    expected_provider=None,
    expected_amount=None,
)
print("Is active:", is_active)
print("Amount locked:", escrow_amount)
```

#### Returns

`Tuple[bool, int]` - `(is_active, amount)`; detailed escrow struct is not exposed on-chain (mapping is private), use events for full details

</TabItem>
</Tabs>

---

### getEscrowBalance()

Gets the locked balance of an escrow.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
async getEscrowBalance(escrowId: string): Promise<bigint>
```

#### Returns

`Promise<bigint>` - Locked amount in USDC

</TabItem>
<TabItem value="py" label="Python">

```python
is_active, escrow_amount = client.get_escrow_status(
    None,
    escrow_id,
    expected_requester=None,
    expected_provider=None,
    expected_amount=None,
)
print("Escrow balance:", escrow_amount)
```

#### Returns

`int` - Locked amount in USDC base units (6 decimals)

</TabItem>
</Tabs>

---

### releaseEscrow()

Releases escrow to specified recipients (only callable by authorized kernel).

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
async releaseEscrow(
  escrowId: string,
  recipients: string[],
  amounts: bigint[]
): Promise<void>
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `escrowId` | `string` | Yes | Escrow ID |
| `recipients` | `string[]` | Yes | Array of recipient addresses |
| `amounts` | `bigint[]` | Yes | Array of amounts (must match recipients length) |

#### Throws

- `ValidationError` - If arrays length mismatch or invalid values
- `TransactionRevertedError` - If not authorized or other error

</TabItem>
<TabItem value="py" label="Python">

```python
client.escrow_release(
    escrow_id,
    recipients=["0xProvider", "0xPlatform"],
    amounts=[99_000_000, 1_000_000],
)
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `escrow_id` | `str` | Yes | Escrow ID |
| `recipients` | `list[str]` | Yes | Array of recipient addresses |
| `amounts` | `list[int]` | Yes | Amounts (6 decimals), length must match recipients |

#### Throws

- `ValidationError` - If arrays mismatch or invalid values
- `TransactionError` / `RpcError` - If not authorized or other error

</TabItem>
</Tabs>

---

### getTokenBalance()

Gets USDC balance of an address.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
async getTokenBalance(
  tokenAddress: string,
  account: string
): Promise<bigint>
```

#### Returns

`Promise<bigint>` - Token balance

#### Example

```typescript
const balance = await client.escrow.getTokenBalance(
  config.contracts.usdc,
  await client.getAddress()
);
console.log('USDC balance:', balance.toString());
```

</TabItem>
<TabItem value="py" label="Python">

```python
balance = client.usdc.functions.balanceOf(client.address).call()
print("USDC balance:", balance)
```

#### Returns

`int` - Token balance (base units, 6 decimals)

</TabItem>
</Tabs>

---

### getTokenAllowance()

Gets USDC allowance for a spender.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
async getTokenAllowance(
  tokenAddress: string,
  owner: string,
  spender: string
): Promise<bigint>
```

#### Returns

`Promise<bigint>` - Approved allowance

#### Example

```typescript
const allowance = await client.escrow.getTokenAllowance(
  config.contracts.usdc,
  await client.getAddress(),
  config.contracts.escrowVault
);
console.log('Approved:', allowance.toString());
```

</TabItem>
<TabItem value="py" label="Python">

```python
allowance = client.usdc.functions.allowance(
    client.address,
    client.config.escrow_vault,
).call()
print("Approved:", allowance)
```

#### Returns

`int` - Approved allowance

</TabItem>
</Tabs>

---

### getAddress()

Returns the EscrowVault contract address.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
getAddress(): string
```

</TabItem>
<TabItem value="py" label="Python">

```python
escrow_address = client.config.escrow_vault
print(escrow_address)
```

</TabItem>
</Tabs>

---

## client.eas

The EAS module handles Ethereum Attestation Service operations. Only available if configured during client creation.

### attestDeliveryProof()

<span className="badge badge--warning">🟡 Intermediate</span>

Creates an EAS attestation for a delivery proof.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
async attestDeliveryProof(
  proof: DeliveryProof,
  recipient: string,
  options?: { expirationTime?: number; revocable?: boolean }
): Promise<AttestationResponse>
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `proof` | `DeliveryProof` | Yes | Delivery proof object |
| `recipient` | `string` | Yes | Attestation recipient (usually provider) |
| `options.expirationTime` | `number` | No | Expiration timestamp (0 = never) |
| `options.revocable` | `boolean` | No | Whether attestation can be revoked (default: true) |

#### Returns

```typescript
interface AttestationResponse {
  uid: string;            // Attestation UID (bytes32)
  transactionHash: string; // On-chain transaction hash
}
```

#### Example

```typescript
const proof = client.proofGenerator.generateDeliveryProof({
  txId,
  deliverable: 'Completed analysis report...',
  deliveryUrl: 'ipfs://Qm...',
  metadata: { mimeType: 'application/json' }
});

const attestation = await client.eas!.attestDeliveryProof(
  proof,
  providerAddress,
  { revocable: true }
);

console.log('Attestation UID:', attestation.uid);
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Python SDK does not wrap EAS attestation creation.
# Use the EAS contract via web3.py if you need to create attestations,
# then anchor the UID on-chain with client.anchor_attestation(tx_id, uid).
```

</TabItem>
</Tabs>

---

### revokeAttestation()

Revokes a previously created attestation.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
async revokeAttestation(uid: string): Promise<string>
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uid` | `string` | Yes | Attestation UID to revoke |

#### Returns

`Promise<string>` - Revocation transaction hash

</TabItem>
<TabItem value="py" label="Python">

Python SDK does not provide `revoke_attestation`; use EAS directly via web3.py if needed.

</TabItem>
</Tabs>

---

### getAttestation()

Fetches attestation data from EAS contract.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
async getAttestation(uid: string): Promise<Attestation>
```

#### Returns

Attestation object with uid, schema, recipient, attester, time, expirationTime, revocable, refUID, data, bump fields.

</TabItem>
<TabItem value="py" label="Python">

Python SDK does not expose `get_attestation`; use EAS contracts directly if needed.

</TabItem>
</Tabs>

---

### verifyDeliveryAttestation()

Verifies that an attestation is valid for a specific transaction.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
async verifyDeliveryAttestation(
  txId: string,
  attestationUID: string
): Promise<boolean>
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `txId` | `string` | Yes | Expected transaction ID |
| `attestationUID` | `string` | Yes | Attestation UID to verify |

#### Returns

`Promise<boolean>` - true if valid

#### Throws

- `Error` - If attestation not found, revoked, expired, schema mismatch, or txId mismatch

#### Example

```typescript
try {
  await client.eas!.verifyDeliveryAttestation(txId, attestationUID);
  console.log('Attestation verified!');
} catch (error) {
  console.error('Verification failed:', error.message);
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
attestation = client.verify_delivery_attestation(tx_id, attestation_uid)
print("Attestation UID:", attestation[0].hex())  # tuple[uid, schema, refUID, time, ...]
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `tx_id` | `str` | Yes | Expected transaction ID |
| `attestation_uid` | `str` | Yes | Attestation UID to verify |

#### Returns

`tuple` - Attestation tuple from EAS (`uid, schema, refUID, time, expirationTime, revocationTime, recipient, attester, data`)

#### Throws

- `ValidationError` - If UID format invalid
- `TransactionError` / `RpcError` - If attestation not found, revoked, expired, schema mismatch, or txId mismatch

</TabItem>
</Tabs>

---

## client.agentRegistry

Agent Registry helpers (AIP-7) for registering and managing agent metadata.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Initialized automatically when network config includes agentRegistry
const registry = client.registry!;

const serviceType = 'text-generation';
const serviceTypeHash = registry.computeServiceTypeHash(serviceType);

await registry.registerAgent({
  endpoint: 'https://agent.example.com/webhook',
  serviceDescriptors: [{
    serviceType,
    serviceTypeHash,
    schemaURI: 'ipfs://QmSchema...',
    minPrice: 1_000_000n,    // 1 USDC
    maxPrice: 50_000_000n,   // 50 USDC
    avgCompletionTime: 120,  // seconds
    metadataCID: 'QmMetadata...'
  }]
});

// Pagination-aware query (AIP-7 signature)
const agents = await registry.queryAgentsByService({
  serviceTypeHash,
  minReputation: 5000,
  offset: 0,
  limit: 50
});

// DID helpers (chain-bound, lowercase)
const did = await registry.buildDID(await client.getAddress()); // did:ethr:<chainId>:<addr>
const profile = await registry.getAgentByDID(did);
```

#### Methods (TypeScript)
- `registerAgent(params: { endpoint, serviceDescriptors[] })`
- `updateEndpoint(newEndpoint: string)`
- `addServiceType(serviceType: string)`
- `removeServiceType(serviceTypeHash: string)`
- `setActiveStatus(isActive: boolean)`
- `getAgent(address: string)`
- `getAgentByDID(did: string)`
- `getServiceDescriptors(address: string)`
- `queryAgentsByService({ serviceTypeHash, minReputation, offset, limit })`
- `supportsService(address: string, serviceTypeHash: string)`
- `computeServiceTypeHash(serviceType: string)`
- `buildDID(address: string)`

</TabItem>
<TabItem value="py" label="Python">

```python
# Compute required hash (lowercase service type)
service_type = "text-generation"
service_type_hash = client.compute_service_type_hash(service_type)

# (Optional) validate descriptors client-side before sending on-chain
descriptors = [{
    "serviceType": service_type,
    "serviceTypeHash": service_type_hash,
    "schemaURI": "ipfs://QmSchema...",
    "minPrice": 1_000_000,       # 1 USDC
    "maxPrice": 50_000_000,      # 50 USDC
    "avgCompletionTime": 120,    # seconds
    "metadataCID": "QmMetadata..."
}]
client.validate_service_descriptors(descriptors)

# Register agent (AIP-7)
client.register_agent(
    endpoint="https://agent.example.com/webhook",
    service_descriptors=descriptors,
)

# Query with pagination (AIP-7 signature)
agents = client.query_agents_by_service(
    service_type_hash=service_type_hash,
    min_reputation=5000,
    offset=0,
    limit=50,
)

# DID helpers (chain-bound, lowercase)
did = client.build_did(client.address)               # did:ethr:<chainId>:<addr>
profile = client.get_agent_by_did(did)

# Other helpers
client.update_endpoint("https://agent.example.com/new-webhook")
client.add_service_type("compute")
client.remove_service_type("0x" + "ab"*32)
client.set_active_status(True)
services = client.get_service_descriptors("0xAgentAddress")
```

#### Methods (Python)

- `register_agent(endpoint: str, service_descriptors: list[dict])`
- `update_endpoint(new_endpoint: str)`
- `add_service_type(service_type: str)`
- `remove_service_type(service_type_hash: Union[str, bytes])`
- `set_active_status(is_active: bool)`
- `get_agent(agent_address: str)`
- `get_agent_by_did(did: str)`
- `get_service_descriptors(agent_address: str)`
- `query_agents_by_service(service_type_hash: str, min_reputation=0, offset=0, limit=100)`
- `supports_service(agent_address: str, service_type_hash: str)`
- `compute_service_type_hash(service_type: str)`
- `validate_service_descriptors(descriptors: list[dict])`
- `build_did(address: str)`

</TabItem>
</Tabs>

:::note DID validation (AIP-7)
Both SDKs enforce full `did:ethr:<chainId>:<lowercase-address>` format and reject mismatched chain IDs when calling `getAgentByDID`. Always include the chain ID and lowercase address.
:::

---

## client.events

The events module provides real-time blockchain event monitoring.

:::info Python SDK
Python SDK uses web3.py filters; polling examples are provided in PY tabs. There are no built-in async watchers yet.
:::
### watchTransaction()

<span className="badge badge--warning">🟡 Intermediate</span>

Watches for state changes on a specific transaction.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
watchTransaction(
  txId: string,
  callback: (state: State) => void
): () => void
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `txId` | `string` | Yes | Transaction ID to watch |
| `callback` | `(state: State) => void` | Yes | Callback for state changes |

#### Returns

`() => void` - Cleanup function to stop watching

#### Example

```typescript
const unsubscribe = client.events.watchTransaction(txId, (state) => {
  console.log('New state:', State[state]);

  if (state === State.DELIVERED) {
    console.log('Provider delivered!');
  }
});

// Later: stop watching
unsubscribe();
```

</TabItem>
<TabItem value="py" label="Python">

```python
event_filter = client.kernel.events.StateTransitioned.create_filter(
    argument_filters={"transactionId": tx_id},
    fromBlock="latest",
)

def poll():
    for evt in event_filter.get_new_entries():
        to_state = evt["args"]["toState"]
        print("New state:", to_state)
        if to_state == State.DELIVERED:
            print("Provider delivered!")

# Call poll() periodically; no built-in watcher helper in Python yet.
```

</TabItem>
</Tabs>

---

### waitForState()

<span className="badge badge--warning">🟡 Intermediate</span>

Waits for a transaction to reach a specific state.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
async waitForState(
  txId: string,
  targetState: State,
  timeoutMs?: number
): Promise<void>
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `txId` | `string` | Yes | Transaction ID |
| `targetState` | `State` | Yes | Target state to wait for |
| `timeoutMs` | `number` | No | Timeout in milliseconds (default: 60000) |

#### Throws

- `Error` - If timeout reached before state change

#### Example

```typescript
import { State } from '@agirails/sdk';

try {
  await client.events.waitForState(
    txId,
    State.DELIVERED,
    120000 // 2 minute timeout
  );
  console.log('Provider delivered!');
} catch (error) {
  console.error('Timeout waiting for delivery');
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
import time
from agirails_sdk import State

def wait_for_state(tx_id: str, target: State, timeout_seconds: int = 60):
    start = time.time()
    while True:
        tx = client.get_transaction(tx_id)
        if tx.state == target:
            return tx
        if time.time() - start > timeout_seconds:
            raise TimeoutError(f"Timed out waiting for state {target}")
        time.sleep(5)
```

</TabItem>
</Tabs>

---

### getTransactionHistory()

Gets all transactions for an address.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
async getTransactionHistory(
  address: string,
  role?: 'requester' | 'provider'
): Promise<Transaction[]>
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `address` | `string` | Yes | Address to query |
| `role` | `'requester' \| 'provider'` | No | Filter by role (default: 'requester') |

#### Returns

`Promise<Transaction[]>` - Array of transactions

#### Example

```typescript
// Get all transactions where I'm the requester
const myRequests = await client.events.getTransactionHistory(
  await client.getAddress(),
  'requester'
);

// Get all transactions where I'm the provider
const myJobs = await client.events.getTransactionHistory(
  await client.getAddress(),
  'provider'
);
```

</TabItem>
<TabItem value="py" label="Python">

```python
from web3 import Web3

# Build history via event filters on TransactionCreated
created_filter = client.kernel.events.TransactionCreated.create_filter(
    argument_filters={"requester": client.address},
    fromBlock="earliest",
)
tx_ids = [evt["args"]["transactionId"] for evt in created_filter.get_all_entries()]
txs = [client.get_transaction(tx_id) for tx_id in tx_ids]
```

</TabItem>
</Tabs>

---

### onTransactionCreated()

Subscribes to all new transaction creation events.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
onTransactionCreated(
  callback: (tx: { txId: string; provider: string; requester: string; amount: bigint }) => void
): () => void
```

#### Returns

`() => void` - Cleanup function to unsubscribe

#### Example

```typescript
const unsubscribe = client.events.onTransactionCreated((tx) => {
  console.log('New transaction:', tx.txId);
  console.log('Amount:', tx.amount.toString());
});

// Later: stop listening
unsubscribe();
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Python SDK: use event filter and poll
created_filter = client.kernel.events.TransactionCreated.create_filter(
    fromBlock="latest",
)

def poll_created():
    for evt in created_filter.get_new_entries():
        tx_id = evt["args"]["transactionId"]
        provider = evt["args"]["provider"]
        requester = evt["args"]["requester"]
        amount = evt["args"]["amount"]
        print("New transaction:", tx_id, provider, requester, amount)

# Call poll_created() periodically.
```

</TabItem>
</Tabs>

---

### onStateChanged()

Subscribes to all state change events.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
onStateChanged(
  callback: (txId: string, from: State, to: State) => void
): () => void
```

#### Returns

`() => void` - Cleanup function

#### Example

```typescript
const unsubscribe = client.events.onStateChanged((txId, from, to) => {
  console.log(`${txId}: ${State[from]} -> ${State[to]}`);
});
```

</TabItem>
<TabItem value="py" label="Python">

```python
state_filter = client.kernel.events.StateTransitioned.create_filter(
    fromBlock="latest",
)

def poll_state_changes():
    for evt in state_filter.get_new_entries():
        tx_id = evt["args"]["transactionId"]
        from_state = evt["args"]["fromState"]
        to_state = evt["args"]["toState"]
        print(f"{tx_id}: {from_state} -> {to_state}")
```

</TabItem>
</Tabs>

---

### onEscrowReleased()

Subscribes to escrow release events.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
onEscrowReleased(
  callback: (txId: string, amount: bigint) => void
): () => void
```

#### Returns

`() => void` - Cleanup function

#### Example

```typescript
const unsubscribe = client.events.onEscrowReleased((txId, amount) => {
  console.log(`Escrow released for ${txId}: ${amount.toString()}`);
});
```

</TabItem>
<TabItem value="py" label="Python">

```python
event_filter = client.kernel.events.EscrowReleased.create_filter(fromBlock="latest")

def poll_escrow_released():
    for evt in event_filter.get_new_entries():
        tx_id = evt["args"]["transactionId"]
        amount = evt["args"]["amount"]
        print(f"Escrow released for {tx_id}: {amount}")
```

#### Returns

Manual polling; implement your own loop/scheduler.

</TabItem>
</Tabs>

---

## client.quote

The quote builder module handles AIP-2 price quote construction.

:::info Python SDK
Python SDK exposes quote helpers via `MessageSigner` + `QuoteBuilder`. See Python tabs below.
:::

### build()

<span className="badge badge--warning">🟡 Intermediate</span>

Builds and signs a price quote message.

```typescript
async build(params: QuoteParams): Promise<QuoteMessage>
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `params.txId` | `string` | Yes | Transaction ID (bytes32) |
| `params.provider` | `string` | Yes | Provider DID (did:ethr:chainId:address) |
| `params.consumer` | `string` | Yes | Consumer DID |
| `params.quotedAmount` | `string` | Yes | Quoted price in base units (string) |
| `params.originalAmount` | `string` | Yes | Consumer's original offer |
| `params.maxPrice` | `string` | Yes | Consumer's maximum price |
| `params.currency` | `string` | No | Currency (default: 'USDC') |
| `params.decimals` | `number` | No | Token decimals (default: 6) |
| `params.expiresAt` | `number` | No | Expiration timestamp (default: +1 hour) |
| `params.justification` | `object` | No | Optional quote justification |
| `params.chainId` | `number` | Yes | Chain ID (84532 or 8453) |
| `params.kernelAddress` | `string` | Yes | ACTPKernel contract address |

#### Returns

```typescript
interface QuoteMessage {
  type: 'agirails.quote.v1';
  version: '1.0.0';
  txId: string;
  provider: string;
  consumer: string;
  quotedAmount: string;
  originalAmount: string;
  maxPrice: string;
  currency: string;
  decimals: number;
  quotedAt: number;
  expiresAt: number;
  justification?: object;
  chainId: number;
  nonce: number;
  signature: string;
}
```

#### Example

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
const quote = await client.quote.build({
  txId,
  provider: 'did:ethr:84532:0xProvider...',
  consumer: 'did:ethr:84532:0xConsumer...',
  quotedAmount: '7500000',  // $7.50 USDC
  originalAmount: '5000000', // $5.00 original offer
  maxPrice: '10000000',      // $10.00 maximum
  chainId: 84532,
  kernelAddress: config.contracts.actpKernel,
  justification: {
    reason: 'Additional compute resources required',
    estimatedTime: 300
  }
});

console.log('Quote signature:', quote.signature);
```

</TabItem>
<TabItem value="py" label="Python">

```python
import os, time
from agirails_sdk.message_signer import MessageSigner
from agirails_sdk.quote_builder import QuoteBuilder

signer = MessageSigner(private_key=os.getenv("PRIVATE_KEY"))
signer.init_domain(kernel_address=config.contracts.actpKernel, chain_id=84532)
builder = QuoteBuilder(signer)

quote = builder.build(
    tx_id=tx_id,
    provider="did:ethr:84532:0xProvider...",
    consumer="did:ethr:84532:0xConsumer...",
    quoted_amount="7500000",   # $7.50 USDC
    original_amount="5000000", # $5.00 original offer
    max_price="10000000",      # $10.00 maximum
    chain_id=84532,
    kernel_address=config.contracts.actpKernel,
    justification={
        "reason": "Additional compute resources required",
        "estimatedTime": 300,
    },
)

print("Quote signature:", quote["signature"])
```

</TabItem>
</Tabs>

---

### verify()

Verifies a quote's signature and business rules.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
async verify(
  quote: QuoteMessage,
  kernelAddress: string
): Promise<boolean>
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `quote` | `QuoteMessage` | Yes | Quote message to verify |
| `kernelAddress` | `string` | Yes | ACTPKernel contract address |

#### Returns

`Promise<boolean>` - true if valid

#### Throws

- `Error` - If signature invalid, amounts invalid, or quote expired

#### Example

```typescript
try {
  await client.quote.verify(quote, config.contracts.actpKernel);
  console.log('Quote is valid!');
} catch (error) {
  console.error('Invalid quote:', error.message);
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails_sdk.quote_builder import QuoteBuilder
from agirails_sdk.message_signer import MessageSigner

signer = MessageSigner(private_key=os.getenv("PRIVATE_KEY"))
signer.init_domain(kernel_address=config.contracts.actpKernel, chain_id=84532)
builder = QuoteBuilder(signer)

try:
    builder.verify(quote, config.contracts.actpKernel)
    print("Quote is valid!")
except Exception as error:
    print("Invalid quote:", error)
```

</TabItem>
</Tabs>

---

### computeHash()

Computes the keccak256 hash of a quote for on-chain storage.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
computeHash(quote: QuoteMessage): string
```

#### Returns

`string` - Keccak256 hash (0x-prefixed)

#### Example

```typescript
const quoteHash = client.quote.computeHash(quote);
await client.kernel.submitQuote(txId, quoteHash);
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails_sdk.quote_builder import canonical_json_stringify
from web3 import Web3

canonical = canonical_json_stringify(quote)
quote_hash = Web3.keccak(text=canonical).hex()
print("Quote hash:", quote_hash)
```

</TabItem>
</Tabs>

---

### uploadToIPFS()

Uploads a quote to IPFS (requires IPFS client configuration).

```typescript
async uploadToIPFS(quote: QuoteMessage): Promise<string>
```

#### Returns

`Promise<string>` - IPFS CID

#### Throws

- `Error` - If IPFS client not configured

---

## client.proofGenerator

The proof generator module creates content hashes and delivery proofs.

:::info Python SDK
Python SDK exposes proof helpers via `ProofGenerator` (hash, generate, encode/decode, verify, hash_from_url).
:::

### hashContent()

<span className="badge badge--success">🟢 Basic</span>

Hashes content using Keccak256.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
hashContent(content: string | Buffer): string
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `content` | `string \| Buffer` | Yes | Content to hash |

#### Returns

`string` - Keccak256 hash (0x-prefixed)

#### Example

```typescript
const hash = client.proofGenerator.hashContent('Hello, World!');
console.log('Content hash:', hash);
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails_sdk.proof_generator import ProofGenerator

hash_hex = ProofGenerator.hash_content("Hello, World!")
print("Content hash:", hash_hex)
```

</TabItem>
</Tabs>

---

### generateDeliveryProof()

<span className="badge badge--warning">🟡 Intermediate</span>

Generates a complete delivery proof object.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
generateDeliveryProof(params: {
  txId: string;
  deliverable: string | Buffer;
  deliveryUrl?: string;
  metadata?: Record<string, any>;
}): DeliveryProof
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `params.txId` | `string` | Yes | Transaction ID |
| `params.deliverable` | `string \| Buffer` | Yes | Deliverable content |
| `params.deliveryUrl` | `string` | No | IPFS/Arweave URL |
| `params.metadata` | `object` | No | Additional metadata |

#### Returns

```typescript
interface DeliveryProof {
  type: 'delivery.proof';
  txId: string;
  contentHash: string;
  timestamp: number;
  deliveryUrl?: string;
  metadata: {
    size: number;
    mimeType: string;
    [key: string]: any;
  };
}
```

#### Example

```typescript
const proof = client.proofGenerator.generateDeliveryProof({
  txId,
  deliverable: JSON.stringify({ result: 'Analysis complete', data: [...] }),
  deliveryUrl: 'ipfs://QmXxx...',
  metadata: { mimeType: 'application/json' }
});

console.log('Content hash:', proof.contentHash);
console.log('Size:', proof.metadata.size, 'bytes');
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails_sdk.proof_generator import ProofGenerator

proof = ProofGenerator.generate_delivery_proof(
    tx_id="0x123...",
    deliverable="Completed analysis report...",
    delivery_url="ipfs://Qm...",
    metadata={"mimeType": "application/json"},
)
print("Content hash:", proof["contentHash"])
print("Size:", proof["metadata"]["size"])
```

</TabItem>
</Tabs>

---

### encodeProof()

Encodes a proof for on-chain submission.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
encodeProof(proof: DeliveryProof): BytesLike
```

#### Returns

`BytesLike` - ABI-encoded proof data

```typescript
const encoded = client.proofGenerator.encodeProof(proof);
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails_sdk.proof_generator import ProofGenerator

encoded = ProofGenerator.encode_proof(proof)
```

</TabItem>
</Tabs>

---

### decodeProof()

Decodes proof data from on-chain.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
decodeProof(proofData: BytesLike): {
  txId: string;
  contentHash: string;
  timestamp: number;
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails_sdk.proof_generator import ProofGenerator

decoded = ProofGenerator.decode_proof(encoded_bytes)
print(decoded["txId"], decoded["contentHash"], decoded["timestamp"])
```

</TabItem>
</Tabs>

---

### verifyDeliverable()

Verifies deliverable content matches expected hash.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
verifyDeliverable(
  deliverable: string | Buffer,
  expectedHash: string
): boolean

const isValid = client.proofGenerator.verifyDeliverable(
  deliveredContent,
  proof.contentHash
);

if (!isValid) {
  throw new Error('Content does not match proof!');
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails_sdk.proof_generator import ProofGenerator

is_valid = ProofGenerator.verify_deliverable(delivered_content, proof["contentHash"])
if not is_valid:
    raise ValueError("Content does not match proof!")
```

</TabItem>
</Tabs>

---

### hashFromUrl()

Fetches content from URL and computes hash.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
async hashFromUrl(url: string): Promise<string>
```

</TabItem>
<TabItem value="py" label="Python">

```python
# requires aiohttp
import asyncio
from agirails_sdk.proof_generator import ProofGenerator

async def run():
    h = await ProofGenerator.hash_from_url("https://example.com/file.txt")
    print(h)

asyncio.run(run())
```

</TabItem>
</Tabs>

---

### toDeliveryProofTypedData()

Converts a generated `DeliveryProof` to EIP-712 typed data format for signing.

```typescript
toDeliveryProofTypedData(proof: DeliveryProof): DeliveryProofData
```

:::info Python SDK
Python SDK does not expose this helper; build typed data manually if needed when using `MessageSigner.sign_delivery_proof`.
:::

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `proof` | `DeliveryProof` | Yes | Delivery proof object from `generateDeliveryProof()` |

#### Returns

```typescript
interface DeliveryProofData {
  txId: string;
  contentHash: string;
  timestamp: number;
  deliveryUrl: string;
  size: number;
  mimeType: string;
}
```

#### Example

```typescript
const proof = client.proofGenerator.generateDeliveryProof({
  txId,
  deliverable: 'Result data...',
  deliveryUrl: 'ipfs://Qm...',
  metadata: { mimeType: 'text/plain' }
});

// Convert to EIP-712 typed data for signing
const typedData = client.proofGenerator.toDeliveryProofTypedData(proof);
console.log('Typed data:', typedData);
```

---

## client.messageSigner

The message signer module handles EIP-712 message signing for ACTP.

:::info Python SDK
Python SDK exposes `MessageSigner` helpers (init_domain, sign_quote, sign_delivery_proof, verify).
:::

### initDomain()

Initializes the EIP-712 domain (called automatically by ACTPClient.create()).

```typescript
async initDomain(kernelAddress: string, chainId?: number): Promise<void>
```

**Python usage (MessageSigner):**

```python
from agirails_sdk.message_signer import MessageSigner

signer = MessageSigner(private_key=os.getenv("PRIVATE_KEY"), chain_id=84532)
signer.init_domain(kernel_address="0xKernelAddress", name="ACTP", version="1.0")

# Sign quote (AIP-2)
signature = signer.sign_quote(message_dict)

# Sign delivery proof (AIP-4)
signature_dp = signer.sign_delivery_proof(proof_dict)
```

---

### signMessage()

Signs a generic ACTP message.

```typescript
async signMessage(message: ACTPMessage): Promise<string>
```

#### Returns

`Promise<string>` - EIP-712 signature

---

### signQuoteRequest()

Signs a typed quote request.

```typescript
async signQuoteRequest(data: QuoteRequestData): Promise<string>
```

---

### signQuoteResponse()

Signs a typed quote response.

```typescript
async signQuoteResponse(data: QuoteResponseData): Promise<string>
```

---

### signDeliveryProof()

Signs a typed delivery proof.

```typescript
async signDeliveryProof(data: DeliveryProofData): Promise<string>
```

---

### signGeneratedDeliveryProof()

Signs a delivery proof from ProofGenerator.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
async signGeneratedDeliveryProof(proof: DeliveryProof): Promise<string>
```

#### Example

```typescript
const proof = client.proofGenerator.generateDeliveryProof({...});
const signature = await client.messageSigner.signGeneratedDeliveryProof(proof);
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails_sdk.message_signer import MessageSigner

signer = MessageSigner(private_key=os.getenv("PRIVATE_KEY"))
signer.init_domain(kernel_address="0xKernelAddress", chain_id=84532)

# Sign quote or delivery proof typed data
quote_signature = signer.sign_quote(quote_message_dict)
delivery_signature = signer.sign_delivery_proof(delivery_proof_dict)
```

</TabItem>
</Tabs>

---

### verifySignature()

Verifies message signature.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
async verifySignature(
  message: ACTPMessage,
  signature: string
): Promise<boolean>
```

#### Returns

`Promise<boolean>` - true if signature is valid

```typescript
const isValid = await client.messageSigner.verifySignature(message, signature);
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails_sdk.message_signer import MessageSigner

is_valid = MessageSigner.verify_signature(
    typed_data,  # EIP-712 typed data dict
    signature,
    expected_signer,
)
print("Signature valid:", is_valid)
```

</TabItem>
</Tabs>

---

### verifySignatureOrThrow()

<span className="badge badge--danger">🔴 Advanced</span>

Verifies signature and throws if invalid.

```typescript
async verifySignatureOrThrow(
  message: ACTPMessage,
  signature: string
): Promise<void>
```

#### Throws

- `SignatureVerificationError` - If signature verification fails
- `Error` - If nonce replay detected (when tracker configured)

---

### addressToDID()

Converts Ethereum address to DID format.

```typescript
addressToDID(address: string): string
```

#### Example

```typescript
const did = client.messageSigner.addressToDID('0x742d35...');
// Returns: "did:ethr:0x742d35..."
```

---

## Types & Interfaces

### State

Enum representing transaction states.

```typescript
enum State {
  INITIATED = 0,    // Transaction created, awaiting escrow
  QUOTED = 1,       // Provider submitted quote (optional)
  COMMITTED = 2,    // Escrow linked, work can begin
  IN_PROGRESS = 3,  // Provider working (required)
  DELIVERED = 4,    // Provider delivered result
  SETTLED = 5,      // Funds released (terminal)
  DISPUTED = 6,     // Under dispute
  CANCELLED = 7    // Cancelled (terminal)
}
```

---

### Transaction

Interface for transaction data.

```typescript
interface Transaction {
  txId: string;           // Transaction ID (bytes32)
  requester: string;      // Requester address
  provider: string;       // Provider address
  amount: bigint;         // Amount in USDC (6 decimals)
  state: State;           // Current state
  createdAt: number;      // Creation timestamp
  deadline: number;       // Deadline timestamp
  disputeWindow: number;  // Dispute window (seconds)
  escrowContract: string; // Escrow contract address
  escrowId: string;       // Escrow ID
  metadata: string;       // Service hash/quote hash
}
```

---

### CreateTransactionParams

Parameters for creating a transaction.

```typescript
interface CreateTransactionParams {
  provider: string;     // Provider address
  requester: string;    // Requester address
  amount: bigint;       // Amount in USDC
  deadline: number;     // Unix timestamp
  disputeWindow: number; // Seconds
  metadata?: string;    // Optional bytes32
}
```

---

### DisputeResolution

Parameters for dispute resolution.

```typescript
interface DisputeResolution {
  requesterAmount: bigint;  // Refund to requester
  providerAmount: bigint;   // Payment to provider
  mediatorAmount: bigint;   // Mediator fee
  mediator?: string;        // Mediator address
}
```

---

### EconomicParams

Platform economic parameters.

```typescript
interface EconomicParams {
  baseFeeNumerator: number;    // Fee numerator (100 = 1%)
  baseFeeDenominator: number;  // Always 10000
  feeRecipient: string;        // Fee recipient address
  requesterPenaltyBps: number; // Penalty for false disputes
  providerPenaltyBps: number;  // Reserved
}
```

---

### NetworkConfig

Network configuration.

```typescript
interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  blockExplorer: string;
  contracts: {
    actpKernel: string;
    escrowVault: string;
    usdc: string;
    eas: string;
    easSchemaRegistry: string;
  };
  eas: {
    deliverySchemaUID: string;
  };
  gasSettings: {
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
  };
}
```

---

### Escrow

Escrow state.

```typescript
interface Escrow {
  escrowId: string;
  kernel: string;
  txId: string;
  token: string;
  amount: bigint;
  beneficiary: string;
  createdAt: number;
  released: boolean;
}
```

---

### DeliveryProof

Delivery proof object.

```typescript
interface DeliveryProof {
  type: 'delivery.proof';
  txId: string;
  contentHash: string;
  timestamp: number;
  deliveryUrl?: string;
  metadata: {
    size: number;
    mimeType: string;
    [key: string]: any;
  };
}
```

---

### QuoteMessage

AIP-2 price quote message.

```typescript
interface QuoteMessage {
  type: 'agirails.quote.v1';
  version: '1.0.0';
  txId: string;
  provider: string;
  consumer: string;
  quotedAmount: string;
  originalAmount: string;
  maxPrice: string;
  currency: string;
  decimals: number;
  quotedAt: number;
  expiresAt: number;
  justification?: {
    reason?: string;
    estimatedTime?: number;
    computeCost?: number;
    breakdown?: Record<string, any>;
  };
  chainId: number;
  nonce: number;
  signature: string;
}
```

---

### ACTPClientConfig

Client configuration.

```typescript
interface ACTPClientConfig {
  network: 'base-sepolia' | 'base-mainnet';
  privateKey?: string;
  signer?: Signer;
  provider?: JsonRpcProvider;
  rpcUrl?: string;
  contracts?: {
    actpKernel?: string;
    escrowVault?: string;
    usdc?: string;
  };
  gasSettings?: {
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
  };
  eas?: EASConfig;
}
```

---

### EASConfig

EAS configuration.

```typescript
interface EASConfig {
  contractAddress: string;
  deliveryProofSchemaId: string;
}
```

---

### DeliveryProofMessage

AIP-4 v1.1 delivery proof message format with EAS attestation support.

```typescript
interface DeliveryProofMessage {
  type: 'agirails.delivery.v1';
  version: string;              // Semantic version (e.g., "1.0.0")
  txId: string;                 // bytes32 (0x-prefixed)
  provider: string;             // DID (e.g., "did:ethr:84532:0x...")
  consumer: string;             // DID
  resultCID: string;            // IPFS CID (CIDv1, base32)
  resultHash: string;           // Keccak256 hash of canonical result JSON
  metadata?: {
    executionTime?: number;     // Seconds
    outputFormat?: string;      // MIME type
    outputSize?: number;        // Bytes
    notes?: string;             // Max 500 chars
  };
  easAttestationUID: string;    // bytes32 (0x-prefixed)
  deliveredAt: number;          // Unix timestamp (seconds)
  chainId: number;              // 84532 or 8453
  nonce: number;                // Monotonically increasing
  signature: string;            // EIP-712 signature
}
```

---

### EASAttestationData

EAS attestation data structure for delivery proofs.

```typescript
interface EASAttestationData {
  schema: string;           // EAS schema UID
  recipient: string;        // Provider address
  expirationTime: number;   // Unix timestamp (0 for no expiration)
  revocable: boolean;       // Whether attestation can be revoked
  refUID: string;           // Reference to transaction
  data: string;             // ABI-encoded attestation data
}
```

---

### QuoteMessageV2

AIP-2 v2 quote message format for price negotiations.

```typescript
interface QuoteMessageV2 {
  type: 'agirails.quote.v1';
  version: '1.0.0';
  txId: string;              // bytes32 (0x-prefixed)
  provider: string;          // DID
  consumer: string;          // DID
  quotedAmount: string;      // Provider's quoted price (base units)
  originalAmount: string;    // Consumer's original offer
  maxPrice: string;          // Consumer's maximum acceptable price
  currency: string;          // Currently "USDC" only
  decimals: number;          // Token decimals (6 for USDC)
  quotedAt: number;          // Unix timestamp (seconds)
  expiresAt: number;         // Unix timestamp (seconds)
  justification?: {
    reason?: string;
    estimatedTime?: number;
    computeCost?: number;
    breakdown?: Record<string, any>;
  };
  chainId: number;           // 84532 or 8453
  nonce: number;             // Monotonically increasing
  signature: string;         // EIP-712 signature
}
```

---

## Utility Functions

The SDK exports several utility functions for common operations.

### canonicalJsonStringify()

Deterministic JSON serialization with sorted keys and no whitespace. Uses `fast-json-stable-stringify` for cross-language compatibility.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { canonicalJsonStringify } from '@agirails/sdk';

canonicalJsonStringify(obj: any): string
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `obj` | `any` | Yes | Any JSON-serializable object |

#### Returns

`string` - Canonical JSON string with sorted keys

#### Example

```typescript
import { canonicalJsonStringify } from '@agirails/sdk';

const obj = { z: 1, a: 2, m: { b: 3, a: 4 } };
const canonical = canonicalJsonStringify(obj);
console.log(canonical);
// Output: {"a":2,"m":{"a":4,"b":3},"z":1}
```

</TabItem>
<TabItem value="py" label="Python">

```python
import json

def canonical_json_stringify(obj) -> str:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"))

obj = {"z": 1, "a": 2, "m": {"b": 3, "a": 4}}
canonical = canonical_json_stringify(obj)
print(canonical)
# Output: {"a":2,"m":{"a":4,"b":3},"z":1}
```

*Python SDK does not expose a helper; use sorted `json.dumps` as above.*

</TabItem>
</Tabs>

---

### computeCanonicalHash()

Computes Keccak256 hash of canonical JSON representation.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { computeCanonicalHash } from '@agirails/sdk';

computeCanonicalHash(obj: any): string
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `obj` | `any` | Yes | Any JSON-serializable object |

#### Returns

`string` - Keccak256 hash (0x-prefixed hex string)

#### Example

```typescript
import { computeCanonicalHash } from '@agirails/sdk';

const data = { result: 'success', value: 42 };
const hash = computeCanonicalHash(data);
console.log(hash);
// Output: 0x1234...abcd (64 hex chars)
```

</TabItem>
<TabItem value="py" label="Python">

```python
import json
from web3 import Web3

def compute_canonical_hash(obj) -> str:
    canonical = json.dumps(obj, sort_keys=True, separators=(",", ":"))
    return Web3.keccak(text=canonical).hex()

data = {"result": "success", "value": 42}
hash_hex = compute_canonical_hash(data)
print(hash_hex)
```

</TabItem>
</Tabs>

---

### computeResultHash()

Computes hash for delivery proof result data. Alias for `computeCanonicalHash()` with semantic naming for AIP-4.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { computeResultHash } from '@agirails/sdk';

computeResultHash(resultData: any): string
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `resultData` | `any` | Yes | Service result data |

#### Returns

`string` - Keccak256 hash of canonical result JSON

#### Example

```typescript
import { computeResultHash } from '@agirails/sdk';

const result = { analysis: 'Complete', score: 95 };
const hash = computeResultHash(result);
// Use in delivery proof
```

</TabItem>
<TabItem value="py" label="Python">

```python
# Alias of compute_canonical_hash in Python example above
result = {"analysis": "Complete", "score": 95}
hash_hex = compute_canonical_hash(result)
print("Result hash:", hash_hex)
```

</TabItem>
</Tabs>

---

### validateAddress()

Validates an Ethereum address format and checks for zero address.

```typescript
import { validateAddress } from '@agirails/sdk';

validateAddress(address: string, fieldName?: string): void
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `address` | `string` | Yes | Ethereum address to validate |
| `fieldName` | `string` | No | Field name for error messages (default: "address") |

#### Throws

- `InvalidAddressError` - If address format is invalid
- `ValidationError` - If address is zero address

#### Example

```typescript
import { validateAddress } from '@agirails/sdk';

try {
  validateAddress('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');
  console.log('Valid address');
} catch (error) {
  console.error('Invalid:', error.message);
}

// With custom field name
validateAddress(providerAddress, 'provider');
```

---

### validateAmount()

Validates that an amount is greater than zero.

```typescript
import { validateAmount } from '@agirails/sdk';

validateAmount(amount: bigint, fieldName?: string): void
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `amount` | `bigint` | Yes | Amount to validate |
| `fieldName` | `string` | No | Field name for error messages (default: "amount") |

#### Throws

- `InvalidAmountError` - If amount is null, undefined, or ≤ 0

#### Example

```typescript
import { validateAmount } from '@agirails/sdk';
import { parseUnits } from 'ethers';

const amount = parseUnits('100', 6);
validateAmount(amount); // Passes

validateAmount(0n); // Throws InvalidAmountError
validateAmount(-1n); // Throws InvalidAmountError
```

---

## EIP-712 Types

The SDK exports EIP-712 type definitions for advanced use cases such as custom signing or verification.

### EIP712Domain

Standard EIP-712 domain separator for ACTP messages.

```typescript
interface EIP712Domain {
  name: string;            // "AGIRAILS"
  version: string;         // "1"
  chainId: number;         // 84532 or 8453
  verifyingContract: string; // ACTPKernel address
}
```

:::info Python SDK
Python SDK does not expose EIP-712 domain helpers; construct manually when signing with eth_account/web3.py if needed.
:::

---

### AIP4DeliveryProofTypes

EIP-712 type definition for AIP-4 v1.1 delivery proofs.

```typescript
const AIP4DeliveryProofTypes = {
  DeliveryProof: [
    { name: 'txId', type: 'bytes32' },
    { name: 'provider', type: 'string' },
    { name: 'consumer', type: 'string' },
    { name: 'resultCID', type: 'string' },
    { name: 'resultHash', type: 'bytes32' },
    { name: 'easAttestationUID', type: 'bytes32' },
    { name: 'deliveredAt', type: 'uint256' },
    { name: 'chainId', type: 'uint256' },
    { name: 'nonce', type: 'uint256' }
  ]
};
```

---

### DeliveryProofTypes

EIP-712 type definition for legacy delivery proofs (deprecated, use AIP4DeliveryProofTypes).

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
const DeliveryProofTypes = {
  DeliveryProof: [
    { name: 'txId', type: 'bytes32' },
    { name: 'contentHash', type: 'bytes32' },
    { name: 'timestamp', type: 'uint256' },
    { name: 'deliveryUrl', type: 'string' },
    { name: 'size', type: 'uint256' },
    { name: 'mimeType', type: 'string' }
  ]
};
```

</TabItem>
<TabItem value="py" label="Python">

Python SDK does not expose EIP-712 type constants. For Python signing/verification, use `MessageSigner.sign_delivery_proof` and `ProofGenerator.encode_proof`; construct typed data manually if you need custom EIP-712 verification with `eth_account`.

</TabItem>
</Tabs>

#### Usage Example

```typescript
import {
  EIP712Domain,
  AIP4DeliveryProofTypes,
  AIP4DeliveryProofData
} from '@agirails/sdk';
import { verifyTypedData } from 'ethers';

// Verify a delivery proof signature
const domain: EIP712Domain = {
  name: 'AGIRAILS',
  version: '1',
  chainId: 84532,
  verifyingContract: kernelAddress
};

const message: AIP4DeliveryProofData = {
  txId: proof.txId,
  provider: proof.provider,
  consumer: proof.consumer,
  resultCID: proof.resultCID,
  resultHash: proof.resultHash,
  easAttestationUID: proof.easAttestationUID,
  deliveredAt: proof.deliveredAt,
  chainId: proof.chainId,
  nonce: proof.nonce
};

const recoveredAddress = verifyTypedData(
  domain,
  AIP4DeliveryProofTypes,
  message,
  proof.signature
);
```

---

## Errors

:::info Python SDK
Python SDK raises `ValidationError`, `TransactionError`, `RpcError`, `InvalidStateTransitionError`, `DeadlineError`, and generic `Exception` equivalents. Map TS errors roughly as:
- `TransactionRevertedError` → `TransactionError`
- `NetworkError` → `RpcError`
- `InsufficientFundsError` → `TransactionError` (with revert reason)
:::

### ACTPError

Base error class for all SDK errors.

```typescript
class ACTPError extends Error {
  code: string;        // Error code
  txHash?: string;     // Transaction hash (if applicable)
  details?: any;       // Additional details
}
```

---

### ValidationError

Thrown for invalid input parameters.

```typescript
class ValidationError extends ACTPError {
  constructor(field: string, message: string)
}
```

**Example:**

```typescript
try {
  await client.kernel.createTransaction({
    amount: -100n, // Invalid!
    // ...
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Field:', error.details.field); // "amount"
  }
}
```

---

### TransactionNotFoundError

Thrown when a transaction ID does not exist.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
class TransactionNotFoundError extends ACTPError {
  constructor(txId: string)
}
```

**Example:**

```typescript
try {
  await client.kernel.getTransaction('0xinvalid...');
} catch (error) {
  if (error instanceof TransactionNotFoundError) {
    console.error('Transaction not found:', error.details.txId);
  }
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails_sdk.errors import ACTPClientError

try:
    client.get_transaction("0xinvalid...")
except ACTPClientError as error:
    # Python SDK does not expose a specific TransactionNotFoundError;
    # it raises ACTPClientError from RPC; inspect message/code if needed.
    print("Transaction not found:", error)
```

</TabItem>
</Tabs>

---

### TransactionRevertedError

Thrown when an on-chain transaction reverts.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
class TransactionRevertedError extends ACTPError {
  constructor(txHash: string, reason?: string)
}
```

**Example:**

```typescript
try {
  await client.kernel.releaseEscrow(txId);
} catch (error) {
  if (error instanceof TransactionRevertedError) {
    console.error('Reverted:', error.details.reason);
    console.error('Tx hash:', error.txHash);
  }
}
```

---

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails_sdk.errors import TransactionError

try:
    client.release_escrow(tx_id)
except TransactionError as error:
    # Inspect error message / RPC revert reason
    print("Reverted:", error)
```

</TabItem>
</Tabs>


### InvalidStateTransitionError

Thrown for invalid state machine transitions.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
class InvalidStateTransitionError extends ACTPError {
  constructor(from: State, to: State, validTransitions: string[])
}
```

**Example:**

```typescript
try {
  // Can't go from INITIATED directly to DELIVERED
  await client.kernel.transitionState(txId, State.DELIVERED);
} catch (error) {
  if (error instanceof InvalidStateTransitionError) {
    console.error('From:', error.details.from);
    console.error('Valid transitions:', error.details.validTransitions);
  }
}
```

---

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails_sdk.errors import InvalidStateTransitionError
from agirails_sdk import State

try:
    client.transition_state(tx_id, State.DELIVERED)
except InvalidStateTransitionError as error:
    print("Invalid transition:", error)
```

</TabItem>
</Tabs>


### NetworkError

Thrown for network connectivity issues.

```typescript
class NetworkError extends ACTPError {
  constructor(network: string, message: string)
}
```

---

### SignatureVerificationError

Thrown when signature verification fails.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
class SignatureVerificationError extends ACTPError {
  constructor(expectedSigner: string, recoveredSigner: string)
}
```

---

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails_sdk.errors import ValidationError

# Python SDK surfaces signature validation issues as ValidationError
# or TransactionError depending on context.
```

</TabItem>
</Tabs>


### InsufficientFundsError

Thrown when account has insufficient balance.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
class InsufficientFundsError extends ACTPError {
  constructor(required: bigint, available: bigint)
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails_sdk.errors import TransactionError

try:
    client.fund_transaction("0x123...")
except TransactionError as error:
    # Inspect revert reason for insufficient funds / allowance
    print("Insufficient funds or allowance:", error)
```

</TabItem>
</Tabs>

---

### DeadlineExpiredError

Thrown when transaction deadline has passed.

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
class DeadlineExpiredError extends ACTPError {
  constructor(txId: string, deadline: number)
}
```

---

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails_sdk.errors import DeadlineError

try:
    client.transition_state(tx_id, State.IN_PROGRESS)
except DeadlineError as error:
    print("Deadline expired:", error)
```

</TabItem>
</Tabs>


## Error Recovery

Best practices for handling errors in production.

### Retry with Exponential Backoff

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { ACTPClient, TransactionRevertedError, NetworkError } from '@agirails/sdk';

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;

      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

// Usage
const txId = await withRetry(() =>
  client.kernel.createTransaction({...})
);
```

</TabItem>
<TabItem value="py" label="Python">

```python
import time
from agirails_sdk.errors import RpcError, TransactionError

def with_retry(fn, max_retries: int = 3, base_delay: float = 1.0):
    for attempt in range(max_retries):
        try:
            return fn()
        except (RpcError, TransactionError) as error:
            if attempt == max_retries - 1:
                raise
            delay = base_delay * (2 ** attempt)  # 1s, 2s, 4s
            print(f"Attempt {attempt + 1} failed, retrying in {delay}s...")
            time.sleep(delay)

# Usage
tx_id = with_retry(lambda: client.create_transaction(...))
```

</TabItem>
</Tabs>

### Handle Specific Errors

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import {
  ValidationError,
  TransactionRevertedError,
  NetworkError,
  InsufficientFundsError,
  DeadlineExpiredError
} from '@agirails/sdk';

async function safeCreateTransaction(params: CreateTransactionParams) {
  try {
    return await client.kernel.createTransaction(params);
  } catch (error) {
    if (error instanceof ValidationError) {
      // Bad input - fix parameters
      console.error('Invalid parameter:', error.details.field);
      throw error; // Don't retry validation errors
    }

    if (error instanceof InsufficientFundsError) {
      // Need more USDC
      console.error('Need', error.details.required.toString(), 'but have', error.details.available.toString());
      throw error;
    }

    if (error instanceof NetworkError) {
      // Network issue - safe to retry
      console.error('Network error:', error.message);
      return withRetry(() => client.kernel.createTransaction(params));
    }

    if (error instanceof TransactionRevertedError) {
      // Check revert reason
      if (error.details.reason?.includes('nonce')) {
        // Nonce issue - wait and retry
        await new Promise(r => setTimeout(r, 2000));
        return client.kernel.createTransaction(params);
      }
      throw error;
    }

    throw error;
  }
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails_sdk.errors import (
    ValidationError,
    TransactionError,
    RpcError,
    DeadlineError,
)

def safe_create_transaction(params: dict):
    try:
        return client.create_transaction(**params)
    except ValidationError as error:
        print("Invalid parameter:", error)
        raise
    except RpcError as error:
        print("Network/RPC error:", error)
        return with_retry(lambda: client.create_transaction(**params))
    except TransactionError as error:
        # Inspect error message; if nonce-related, wait and retry
        msg = str(error).lower()
        if "nonce" in msg:
            time.sleep(2)
            return client.create_transaction(**params)
        raise
```

</TabItem>
</Tabs>

### Graceful Degradation

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
async function getTransactionSafe(txId: string): Promise<Transaction | null> {
  try {
    return await client.kernel.getTransaction(txId);
  } catch (error) {
    if (error instanceof TransactionNotFoundError) {
      return null; // Expected case
    }
    if (error instanceof NetworkError) {
      console.warn('Network issue, using cached data');
      return getCachedTransaction(txId);
    }
    throw error;
  }
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails_sdk.errors import ACTPClientError

def get_transaction_safe(tx_id: str):
    try:
        return client.get_transaction(tx_id)
    except ACTPClientError as error:
        if "not found" in str(error).lower():
            return None
        print("Network issue or other error:", error)
        # fallback: return cached transaction if you maintain one
        return None
```

</TabItem>
</Tabs>

---

## Constants

### Contract Addresses

#### Base Sepolia (Testnet)

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { BASE_SEPOLIA } from '@agirails/sdk';

BASE_SEPOLIA.contracts.actpKernel   // "0x6aDB650e185b0ee77981AC5279271f0Fa6CFe7ba"
BASE_SEPOLIA.contracts.escrowVault  // "0x921edE340770db5DB6059B5B866be987d1b7311F"
BASE_SEPOLIA.contracts.usdc         // "0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb" (MockUSDC)
BASE_SEPOLIA.contracts.eas          // "0x4200000000000000000000000000000000000021"
BASE_SEPOLIA.chainId                // 84532
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails_sdk import Network

Network.BASE_SEPOLIA.value  # "base-sepolia"
Network.BASE_SEPOLIA.contracts.actp_kernel   # "0x6aDB650e185b0ee77981AC5279271f0Fa6CFe7ba"
Network.BASE_SEPOLIA.contracts.escrow_vault  # "0x921edE340770db5DB6059B5B866be987d1b7311F"
Network.BASE_SEPOLIA.contracts.usdc          # "0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb"
Network.BASE_SEPOLIA.contracts.eas           # "0x4200000000000000000000000000000000000021"
Network.BASE_SEPOLIA.chain_id                # 84532
```

</TabItem>
</Tabs>

#### Base Mainnet

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { BASE_MAINNET } from '@agirails/sdk';

BASE_MAINNET.contracts.usdc  // "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" (Official USDC)
BASE_MAINNET.chainId         // 8453
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails_sdk import Network

Network.BASE_MAINNET.contracts.usdc   # "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
Network.BASE_MAINNET.chain_id         # 8453
```

</TabItem>
</Tabs>

:::warning Mainnet Not Deployed
ACTPKernel and EscrowVault are not yet deployed to Base Mainnet. The addresses are currently zero addresses.
:::

---

### State Values

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { State } from '@agirails/sdk';

State.INITIATED    // 0
State.QUOTED       // 1
State.COMMITTED    // 2
State.IN_PROGRESS  // 3
State.DELIVERED    // 4
State.SETTLED      // 5
State.DISPUTED     // 6
State.CANCELLED   // 7
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails_sdk import State

State.INITIATED     # 0
State.QUOTED        # 1
State.COMMITTED     # 2
State.IN_PROGRESS   # 3
State.DELIVERED     # 4
State.SETTLED       # 5
State.DISPUTED      # 6
State.CANCELLED     # 7
```

</TabItem>
</Tabs>

---

### Network Functions

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { getNetwork, isValidNetwork, NETWORKS } from '@agirails/sdk';

// Get network config
const config = getNetwork('base-sepolia');

// Check if network is valid
isValidNetwork('base-sepolia'); // true
isValidNetwork('ethereum');     // false

// All supported networks
Object.keys(NETWORKS); // ['base-sepolia', 'base-mainnet']
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails_sdk import Network

# Validate / list networks (Python uses enum)
Network.BASE_SEPOLIA.name    # "BASE_SEPOLIA"
Network.BASE_MAINNET.name    # "BASE_MAINNET"
[n.value for n in Network]    # ['base-sepolia', 'base-mainnet']

# Access config
net = Network.BASE_SEPOLIA
net.chain_id                  # 84532
net.contracts.usdc            # Mock USDC on testnet
```

</TabItem>
</Tabs>

---

## Common Patterns

### Transaction Flow Diagram

![Transaction Flow](/img/diagrams/transaction-flow.svg)

---

### Pattern 1: Requester Happy Path

Complete flow for a requester creating and settling a payment:

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { ACTPClient, State } from '@agirails/sdk';
import { parseUnits } from 'ethers';

async function requesterHappyPath() {
  const client = await ACTPClient.create({
    network: 'base-sepolia',
    privateKey: process.env.PRIVATE_KEY!,
    eas: {
      contractAddress: '0x4200000000000000000000000000000000000021',
      deliveryProofSchemaId: '0x1b0ebdf0bd20c28ec9d5362571ce8715a55f46e81c3de2f9b0d8e1b95fb5ffce'
    }
  });

  // 1. Create transaction
  const txId = await client.kernel.createTransaction({
    requester: await client.getAddress(),
    provider: '0xProviderAddress...',
    amount: parseUnits('10', 6), // 10 USDC
    deadline: Math.floor(Date.now() / 1000) + 86400, // 24h
    disputeWindow: 7200 // 2h
  });
  console.log('1. Created:', txId);

  // 2. Fund (approve + escrow)
  const escrowId = await client.fundTransaction(txId);
  console.log('2. Funded:', escrowId);

  // 3. Wait for provider to deliver
  console.log('3. Waiting for delivery...');
  await client.events.waitForState(txId, State.DELIVERED, 3600000); // 1h timeout

  // 4. Get attestation and release
  const tx = await client.kernel.getTransaction(txId);
  await client.releaseEscrowWithVerification(txId, tx.attestationUID);
  console.log('4. Released! Payment complete.');
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails_sdk import ACTPClient, Network, State

def requester_happy_path():
    client = ACTPClient(
        network=Network.BASE_SEPOLIA,
        private_key=os.getenv("PRIVATE_KEY"),
    )

    # 1. Create transaction
    tx_id = client.create_transaction(
        requester=client.address,
        provider="0xProviderAddress...",
        amount=10_000_000,  # 10 USDC
        deadline=client.now() + 86400,
        dispute_window=7200,
        service_hash="0x" + "00" * 32,
    )
    print("1. Created:", tx_id)

    # 2. Fund (approve + escrow)
    escrow_id = client.fund_transaction(tx_id)
    print("2. Funded:", escrow_id)

    # 3. Poll for delivery (pseudo)
    print("3. Waiting for delivery...")
    # Implement event polling or polling get_transaction(tx_id).state until DELIVERED

    # 4. Release with verification (requires attestation UID)
    tx = client.get_transaction(tx_id)
    client.release_escrow_with_verification(tx_id, tx.attestation_uid)
    print("4. Released! Payment complete.")
```

#### Notes
- Python SDK does not have wait_for_state; poll events or transaction state.
- Pass the attestation UID when calling `release_escrow_with_verification`.

</TabItem>
</Tabs>

### Pattern 2: Provider Happy Path

Complete flow for a provider accepting and completing work:

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { ACTPClient, State } from '@agirails/sdk';

async function providerHappyPath(txId: string) {
  const client = await ACTPClient.create({
    network: 'base-sepolia',
    privateKey: process.env.PROVIDER_PRIVATE_KEY!,
    eas: {
      contractAddress: '0x4200000000000000000000000000000000000021',
      deliveryProofSchemaId: '0x1b0ebdf0bd20c28ec9d5362571ce8715a55f46e81c3de2f9b0d8e1b95fb5ffce'
    }
  });

  // 1. Check transaction details
  const tx = await client.kernel.getTransaction(txId);
  console.log('1. Job amount:', tx.amount.toString(), 'USDC');

  // 2. Signal work started (optional)
  await client.kernel.transitionState(txId, State.IN_PROGRESS);
  console.log('2. Started work');

  // 3. Do the actual work...
  const result = await doWork(tx);

  // 4. Generate delivery proof
  const proof = client.proofGenerator.generateDeliveryProof({
    txId,
    deliverable: JSON.stringify(result),
    deliveryUrl: 'ipfs://Qm...',
    metadata: { mimeType: 'application/json' }
  });

  // 5. Create EAS attestation
  const attestation = await client.eas!.attestDeliveryProof(
    proof,
    await client.getAddress()
  );
  console.log('4. Attested:', attestation.uid);

  // 6. Anchor attestation and deliver
  await client.kernel.anchorAttestation(txId, attestation.uid);
  await client.kernel.transitionState(txId, State.DELIVERED, client.proofGenerator.encodeProof(proof));
  console.log('5. Delivered! Waiting for payment...');
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
import os
from agirails_sdk import ACTPClient, Network, State
from agirails_sdk.proof_generator import ProofGenerator
import json

def provider_happy_path(tx_id: str):
    client = ACTPClient(
        network=Network.BASE_SEPOLIA,
        private_key=os.getenv("PROVIDER_PRIVATE_KEY"),
    )

    tx = client.get_transaction(tx_id)
    print("Job amount:", tx.amount)

    # 1. Signal work started
    client.transition_state(tx_id, State.IN_PROGRESS)
    print("Started work")

    # 2. Do the work...
    result = {"status": "done"}

    # 3. Generate delivery proof (optional URL + metadata)
    proof = ProofGenerator.generate_delivery_proof(
        tx_id=tx_id,
        deliverable=json.dumps(result),
        delivery_url="ipfs://Qm...",
        metadata={"mimeType": "application/json"},
    )

    # 4. Deliver (attestation optional in PY SDK; pass encoded proof if desired)
    client.transition_state(tx_id, State.DELIVERED, ProofGenerator.encode_proof(proof))
    print("Delivered work. Waiting for payment...")
```

</TabItem>
</Tabs>

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { ACTPClient, State } from '@agirails/sdk';

async function eventDrivenProvider() {
  const client = await ACTPClient.create({
    network: 'base-sepolia',
    privateKey: process.env.PROVIDER_PRIVATE_KEY!
  });

  const myAddress = await client.getAddress();

  // Watch for transactions where I'm the provider
  client.events.onTransactionCreated(async (tx) => {
    if (tx.provider.toLowerCase() === myAddress.toLowerCase()) {
      console.log('New job!', tx.txId, 'for', tx.amount.toString(), 'USDC');

      // Auto-accept jobs under 100 USDC
      if (tx.amount <= 100_000_000n) {
        await handleJob(client, tx.txId);
      }
    }
  });

  console.log('Listening for jobs...');
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
import os
from agirails_sdk import ACTPClient, Network

def event_driven_provider():
    client = ACTPClient(
        network=Network.BASE_SEPOLIA,
        private_key=os.getenv("PROVIDER_PRIVATE_KEY"),
    )
    my_address = client.address.lower()

    created_filter = client.kernel.events.TransactionCreated.create_filter(
        fromBlock="latest",
    )

    def poll_jobs():
        for evt in created_filter.get_new_entries():
            tx_id = evt["args"]["transactionId"]
            provider = evt["args"]["provider"].lower()
            amount = evt["args"]["amount"]
            if provider == my_address:
                print("New job!", tx_id, "for", amount, "USDC")
                # Auto-accept jobs under 100 USDC (example)
                if amount <= 100_000_000:
                    # handle_job(client, tx_id)  # implement your handler
                    pass

    print("Listening for jobs...")
    # Call poll_jobs() in a loop/scheduler
```

</TabItem>
</Tabs>

### Pattern 4: Dispute Handling

Handle disputes as a requester:

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { ACTPClient, State } from '@agirails/sdk';
import { parseUnits } from 'ethers';

async function handleDispute(txId: string) {
  const client = await ACTPClient.create({
    network: 'base-sepolia',
    privateKey: process.env.PRIVATE_KEY!
  });

  // Check if work was unsatisfactory
  const tx = await client.kernel.getTransaction(txId);

  if (tx.state === State.DELIVERED) {
    // Raise dispute with evidence
    await client.kernel.raiseDispute(
      txId,
      'Delivered content did not match specifications',
      'ipfs://QmEvidenceHash...'
    );
    console.log('Dispute raised. Awaiting mediation.');
  }
}

// As mediator (authorized address)
async function resolveAsMediator(txId: string) {
  const client = await ACTPClient.create({
    network: 'base-sepolia',
    privateKey: process.env.MEDIATOR_PRIVATE_KEY!
  });

  // Split 70/30 in provider's favor, 5% mediator fee
  await client.kernel.resolveDispute(txId, {
    requesterAmount: parseUnits('2.5', 6),  // 25%
    providerAmount: parseUnits('7', 6),     // 70%
    mediatorAmount: parseUnits('0.5', 6),   // 5%
    mediator: await client.getAddress()
  });
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
import os
from agirails_sdk import ACTPClient, Network, State

def handle_dispute(tx_id: str):
    client = ACTPClient(
        network=Network.BASE_SEPOLIA,
        private_key=os.getenv("PRIVATE_KEY"),
    )
    tx = client.get_transaction(tx_id)
    if tx.state == State.DELIVERED:
        client.raise_dispute(
            tx_id,
            "Delivered content did not match specifications",
            "ipfs://QmEvidenceHash...",
        )
        print("Dispute raised. Awaiting mediation.")

def resolve_as_mediator(tx_id: str):
    client = ACTPClient(
        network=Network.BASE_SEPOLIA,
        private_key=os.getenv("MEDIATOR_PRIVATE_KEY"),
    )
    # Example split: 70% provider, 25% requester, 5% mediator
    client.resolve_dispute(
        tx_id=tx_id,
        requester_amount=2_500_000,  # 25% of 10 USDC example
        provider_amount=7_000_000,    # 70%
        mediator_amount=500_000,      # 5%
        mediator=client.address,
    )
```

</TabItem>
</Tabs>

---

## Complete Example

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { ACTPClient, State } from '@agirails/sdk';
import { parseUnits } from 'ethers';

async function completeTransaction() {
  // 1. Create client
  const client = await ACTPClient.create({
    network: 'base-sepolia',
    privateKey: process.env.PRIVATE_KEY!,
    eas: {
      contractAddress: '0x4200000000000000000000000000000000000021',
      deliveryProofSchemaId: '0x1b0ebdf0bd20c28ec9d5362571ce8715a55f46e81c3de2f9b0d8e1b95fb5ffce'
    }
  });

  const myAddress = await client.getAddress();
  const providerAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

  // 2. Create transaction
  const txId = await client.kernel.createTransaction({
    requester: myAddress,
    provider: providerAddress,
    amount: parseUnits('10', 6), // 10 USDC
    deadline: Math.floor(Date.now() / 1000) + 86400,
    disputeWindow: 7200
  });
  console.log('Created transaction:', txId);

  // 3. Fund transaction (approve + link escrow)
  const escrowId = await client.fundTransaction(txId);
  console.log('Funded with escrow:', escrowId);

  // 4. Watch for provider delivery
  const unsubscribe = client.events.watchTransaction(txId, async (state) => {
    console.log('State changed to:', State[state]);

    if (state === State.DELIVERED) {
      // 5. Get transaction to find attestation
      const tx = await client.kernel.getTransaction(txId);

      // 6. Verify attestation and release escrow
      await client.releaseEscrowWithVerification(txId, tx.attestationUID);
      console.log('Payment released!');

      unsubscribe();
    }
  });
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
import os
from agirails_sdk import ACTPClient, Network, State

def complete_transaction():
    # 1. Create client
    client = ACTPClient(
        network=Network.BASE_SEPOLIA,
        private_key=os.getenv("PRIVATE_KEY"),
    )

    my_address = client.address
    provider_address = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"

    # 2. Create transaction
    tx_id = client.create_transaction(
        requester=my_address,
        provider=provider_address,
        amount=10_000_000,  # 10 USDC (6 decimals)
        deadline=client.now() + 86400,
        dispute_window=7200,
        service_hash="0x" + "00" * 32,
    )
    print("Created transaction:", tx_id)

    # 3. Fund transaction (approve + link escrow)
    escrow_id = client.fund_transaction(tx_id)
    print("Funded with escrow:", escrow_id)

    # 4. Poll for delivery (simple polling example)
    import time
    while True:
        tx = client.get_transaction(tx_id)
        print("State:", tx.state)
    if tx.state == State.DELIVERED:
        # 5. Release escrow with attestation verification if available
        client.release_escrow_with_verification(tx_id, tx.attestation_uid)
        print("Payment released!")
        break
        time.sleep(5)
```

</TabItem>
</Tabs>

---

## Migration from v0.x

If upgrading from an earlier version:

1. Use `ACTPClient.create()` instead of `new ACTPClient()` + `initialize()`
2. The `initialize()` method is deprecated
3. ethers.js v6 is now required (not v5)
4. Gas settings use `bigint` instead of `BigNumber`
5. Use `parseUnits` from ethers v6 for amounts

---

## Next Steps

Build production-ready agents with these step-by-step guides:

- **[Provider Agent Guide](/guides/agents/provider-agent)** - Build an agent that discovers jobs, executes services, and gets paid
- **[Consumer Agent Guide](/guides/agents/consumer-agent)** - Build an agent that requests services and manages payments
- **[Autonomous Agent Guide](/guides/agents/autonomous-agent)** - Build an agent that does both

For direct smart contract interaction, see the **[Contract Reference](/contract-reference)**.
