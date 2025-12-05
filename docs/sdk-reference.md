---
sidebar_position: 10
title: SDK Reference
description: Complete API reference for @agirails/sdk - the official TypeScript SDK for ACTP
---

# SDK Reference

Complete API documentation for `@agirails/sdk`, the official TypeScript SDK for the Agent Commerce Transaction Protocol (ACTP).

:::info Before You Begin
Make sure you have:
- [ ] **Node.js 16+** installed ([download](https://nodejs.org))
- [ ] **Private key** for Base Sepolia testnet wallet
- [ ] **~0.01 ETH** for gas fees ([get from faucet](https://portal.cdp.coinbase.com/products/faucet))
- [ ] **Mock USDC** tokens ([see Installation Guide](/installation#step-4-get-testnet-tokens))
- [ ] Basic understanding of **async/await** and **TypeScript**

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

---

### getAddress()

<span className="badge badge--success">🟢 Basic</span>

Returns the Ethereum address of the connected signer.

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

---

### getNetworkConfig() 🟢

Returns the current network configuration.

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

---

### getProvider() 🟢

Returns the underlying ethers.js provider.

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

---

### getBlockNumber() 🟢

Returns the current block number.

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

---

### getGasPrice()

Returns the current gas price.

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

---

### fundTransaction()

<span className="badge badge--success">🟢 Basic</span>

Convenience method that approves USDC and links escrow in one call. This is the recommended way to fund a transaction.

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
await client.releaseEscrowWithVerification(txId, attestationUID);
```

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
| `params.metadata` | `string` | No | Optional bytes32 service hash/metadata |

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
  deadline: number;       // Deadline timestamp
  disputeWindow: number;  // Dispute window in seconds
  escrowContract: string; // Linked escrow contract address
  escrowId: string;       // Escrow ID
  metadata: string;       // Service hash/quote hash
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

#### See Also

- [Transaction interface](#transaction) - Full type definition
- [State enum](#state) - State values
- [events.getTransactionHistory()](#gettransactionhistory) - Get all transactions

---

### transitionState()

<span className="badge badge--warning">🟡 Intermediate</span>

Transitions a transaction to a new state.

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

#### Notes

- Consumer must approve USDC to EscrowVault BEFORE calling linkEscrow
- Auto-transitions transaction from INITIATED/QUOTED to COMMITTED
- Use `client.fundTransaction()` for a simpler one-call approach

---

### releaseMilestone()

Releases a partial milestone payment.

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

---

### releaseEscrow()

Releases full escrow to settle the transaction.

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

---

### anchorAttestation()

Anchors an EAS attestation UID to a transaction.

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

---

### getEconomicParams()

:::danger Not Available in V1
The contract does **not** have a `getEconomicParams()` function. Economic parameters are exposed as individual public variables.
:::

<span className="badge badge--secondary">🔮 Planned</span>

**V1 Alternative:** Query individual contract variables directly:

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

**Available public variables in V1:**
- `platformFeeBps` - Platform fee in basis points (100 = 1%)
- `feeRecipient` - Address receiving platform fees
- `requesterPenaltyBps` - Cancellation penalty (500 = 5%)
- `getPendingEconomicParams()` - View scheduled parameter changes

---

### estimateCreateTransaction()

Estimates gas for transaction creation.

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

---

### getAddress()

Returns the ACTPKernel contract address.

```typescript
getAddress(): string
```

#### Returns

`string` - Contract address

---

## client.escrow

The escrow module handles USDC token approvals and escrow state queries.

### approveToken()

Approves USDC tokens for escrow creation.

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

#### Notes

- Must be called BEFORE `linkEscrow()`
- Handles USDC's approval reset pattern (sets to 0 first if residual allowance)
- Skips approval if current allowance is sufficient

---

### getEscrow()

Retrieves escrow details by ID.

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

---

### getEscrowBalance()

Gets the locked balance of an escrow.

```typescript
async getEscrowBalance(escrowId: string): Promise<bigint>
```

#### Returns

`Promise<bigint>` - Locked amount in USDC

---

### releaseEscrow()

Releases escrow to specified recipients (only callable by authorized kernel).

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

---

### getTokenBalance()

Gets USDC balance of an address.

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

---

### getTokenAllowance()

Gets USDC allowance for a spender.

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

---

### getAddress()

Returns the EscrowVault contract address.

```typescript
getAddress(): string
```

---

## client.eas

The EAS module handles Ethereum Attestation Service operations. Only available if configured during client creation.

### attestDeliveryProof()

<span className="badge badge--warning">🟡 Intermediate</span>

Creates an EAS attestation for a delivery proof.

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

---

### revokeAttestation()

Revokes a previously created attestation.

```typescript
async revokeAttestation(uid: string): Promise<string>
```

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uid` | `string` | Yes | Attestation UID to revoke |

#### Returns

`Promise<string>` - Revocation transaction hash

---

### getAttestation()

Fetches attestation data from EAS contract.

```typescript
async getAttestation(uid: string): Promise<Attestation>
```

#### Returns

Attestation object with uid, schema, recipient, attester, time, expirationTime, revocable, refUID, data, bump fields.

---

### verifyDeliveryAttestation()

Verifies that an attestation is valid for a specific transaction.

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

---

## client.events

The events module provides real-time blockchain event monitoring.

### watchTransaction()

<span className="badge badge--warning">🟡 Intermediate</span>

Watches for state changes on a specific transaction.

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

---

### waitForState()

<span className="badge badge--warning">🟡 Intermediate</span>

Waits for a transaction to reach a specific state.

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

---

### getTransactionHistory()

Gets all transactions for an address.

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

---

### onTransactionCreated()

Subscribes to all new transaction creation events.

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

---

### onStateChanged()

Subscribes to all state change events.

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

---

### onEscrowReleased()

Subscribes to escrow release events.

```typescript
onEscrowReleased(
  callback: (txId: string, amount: bigint) => void
): () => void
```

#### Returns

`() => void` - Cleanup function

---

## client.quote

The quote builder module handles AIP-2 price quote construction.

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

---

### verify()

Verifies a quote's signature and business rules.

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

---

### computeHash()

Computes the keccak256 hash of a quote for on-chain storage.

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

### hashContent()

<span className="badge badge--success">🟢 Basic</span>

Hashes content using Keccak256.

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

---

### generateDeliveryProof()

<span className="badge badge--warning">🟡 Intermediate</span>

Generates a complete delivery proof object.

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

---

### encodeProof()

Encodes a proof for on-chain submission.

```typescript
encodeProof(proof: DeliveryProof): BytesLike
```

#### Returns

`BytesLike` - ABI-encoded proof data

---

### decodeProof()

Decodes proof data from on-chain.

```typescript
decodeProof(proofData: BytesLike): {
  txId: string;
  contentHash: string;
  timestamp: number;
}
```

---

### verifyDeliverable()

Verifies deliverable content matches expected hash.

```typescript
verifyDeliverable(
  deliverable: string | Buffer,
  expectedHash: string
): boolean
```

#### Example

```typescript
const isValid = client.proofGenerator.verifyDeliverable(
  deliveredContent,
  proof.contentHash
);

if (!isValid) {
  throw new Error('Content does not match proof!');
}
```

---

### hashFromUrl()

Fetches content from URL and computes hash.

```typescript
async hashFromUrl(url: string): Promise<string>
```

#### Returns

`Promise<string>` - Keccak256 hash of fetched content

---

### toDeliveryProofTypedData()

Converts a generated `DeliveryProof` to EIP-712 typed data format for signing.

```typescript
toDeliveryProofTypedData(proof: DeliveryProof): DeliveryProofData
```

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

### initDomain()

Initializes the EIP-712 domain (called automatically by ACTPClient.create()).

```typescript
async initDomain(kernelAddress: string, chainId?: number): Promise<void>
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

```typescript
async signGeneratedDeliveryProof(proof: DeliveryProof): Promise<string>
```

#### Example

```typescript
const proof = client.proofGenerator.generateDeliveryProof({...});
const signature = await client.messageSigner.signGeneratedDeliveryProof(proof);
```

---

### verifySignature()

Verifies message signature.

```typescript
async verifySignature(
  message: ACTPMessage,
  signature: string
): Promise<boolean>
```

#### Returns

`Promise<boolean>` - true if signature is valid

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

---

### computeCanonicalHash()

Computes Keccak256 hash of canonical JSON representation.

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

---

### computeResultHash()

Computes hash for delivery proof result data. Alias for `computeCanonicalHash()` with semantic naming for AIP-4.

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

---

### TransactionRevertedError

Thrown when an on-chain transaction reverts.

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

### InvalidStateTransitionError

Thrown for invalid state machine transitions.

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

```typescript
class SignatureVerificationError extends ACTPError {
  constructor(expectedSigner: string, recoveredSigner: string)
}
```

---

### InsufficientFundsError

Thrown when account has insufficient balance.

```typescript
class InsufficientFundsError extends ACTPError {
  constructor(required: bigint, available: bigint)
}
```

---

### DeadlineExpiredError

Thrown when transaction deadline has passed.

```typescript
class DeadlineExpiredError extends ACTPError {
  constructor(txId: string, deadline: number)
}
```

---

## Error Recovery

Best practices for handling errors in production.

### Retry with Exponential Backoff

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

### Handle Specific Errors

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

### Graceful Degradation

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

---

## Constants

### Contract Addresses

#### Base Sepolia (Testnet)

```typescript
import { BASE_SEPOLIA } from '@agirails/sdk';

BASE_SEPOLIA.contracts.actpKernel   // "0x6aDB650e185b0ee77981AC5279271f0Fa6CFe7ba"
BASE_SEPOLIA.contracts.escrowVault  // "0x921edE340770db5DB6059B5B866be987d1b7311F"
BASE_SEPOLIA.contracts.usdc         // "0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb" (MockUSDC)
BASE_SEPOLIA.contracts.eas          // "0x4200000000000000000000000000000000000021"
BASE_SEPOLIA.chainId                // 84532
```

#### Base Mainnet

```typescript
import { BASE_MAINNET } from '@agirails/sdk';

BASE_MAINNET.contracts.usdc  // "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" (Official USDC)
BASE_MAINNET.chainId         // 8453
```

:::warning Mainnet Not Deployed
ACTPKernel and EscrowVault are not yet deployed to Base Mainnet. The addresses are currently zero addresses.
:::

---

### State Values

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

---

### Network Functions

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

---

## Common Patterns

### Transaction Flow Diagram

![Transaction Flow](/img/diagrams/transaction-flow.svg)

---

### Pattern 1: Requester Happy Path

Complete flow for a requester creating and settling a payment:

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
  await client.releaseEscrowWithVerification(txId, tx.metadata);
  console.log('4. Released! Payment complete.');
}
```

### Pattern 2: Provider Happy Path

Complete flow for a provider accepting and completing work:

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

### Pattern 3: Event-Driven Provider

Watch for new jobs matching your capabilities:

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

### Pattern 4: Dispute Handling

Handle disputes as a requester:

```typescript
import { ACTPClient, State } from '@agirails/sdk';

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

---

## Complete Example

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
      await client.releaseEscrowWithVerification(txId, tx.metadata);
      console.log('Payment released!');

      unsubscribe();
    }
  });
}
```

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
