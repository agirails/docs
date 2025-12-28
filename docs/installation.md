---
sidebar_position: 3
title: Installation
description: Install and configure the AGIRAILS SDK for your development environment
---

# Installation

Complete setup guide for the AGIRAILS SDK.

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<div style={{textAlign: 'center', margin: '1.5rem 0'}}>
  <img src="/img/diagrams/installation-overview.svg" alt="Installation Overview - 5 Steps to Ready" style={{maxWidth: '100%', height: 'auto'}} />
</div>

:::info What You'll Learn
By the end of this guide, you'll have:
- **Installed** the AGIRAILS SDK
- **Configured** your development environment
- **Obtained** testnet ETH and USDC
- **Verified** everything works

**Time required:** 10 minutes
:::

---

## Quick Reference

| Component | Requirement |
|-----------|-------------|
| **Node.js** | 16+ |
| **TypeScript** | 5.2+ (recommended) |
| **ethers.js** | v6 (auto-installed) |
| **Python** | 3.9+ (AGIRAILS Python SDK) |
| **Network** | Base Sepolia (testnet) |

---

## Step 1: Install SDK

:::info Beta Release
The AGIRAILS SDK is currently in beta (v2.0.x-beta). APIs may change before stable release.
:::

```bash npm2yarn
npm install @agirails/sdk
```

:::note Python?
Install AGIRAILS Python SDK from PyPI:
```bash
pip install agirails
```
See Quick Start for Python snippets.
:::

:::tip ethers.js v6
AGIRAILS SDK uses **ethers.js v6**. If migrating from v5:
- `ethers.utils.parseUnits()` → `ethers.parseUnits()` or `parseUnits()`
- `ethers.utils.formatUnits()` → `ethers.formatUnits()` or `formatUnits()`
- `new ethers.providers.JsonRpcProvider()` → `new ethers.JsonRpcProvider()`
- See [ethers v6 migration guide](https://docs.ethers.org/v6/migrating/)
:::

### From Source (Optional)

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript">

For development or latest features:

```bash
git clone https://github.com/agirails/sdk-js.git
cd sdk-js
npm install && npm run build && npm link
```

Then in your project:

```bash
npm link @agirails/sdk
```

</TabItem>
<TabItem value="py" label="Python">

For development or latest features:

```bash
git clone https://github.com/agirails/sdk-python.git
cd sdk-python
pip install -e .
```

</TabItem>
</Tabs>

---

## Step 2: Configure TypeScript

Add to `tsconfig.json`:

```json title="tsconfig.json"
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  }
}
```

---

## Step 3: Environment Setup

Create `.env`:

```bash title=".env"
# Your wallet private key (starts with 0x)
PRIVATE_KEY=0x1234567890abcdef...

# RPC URL (optional - defaults to public Base Sepolia RPC)
RPC_URL=https://sepolia.base.org
```

:::danger Security
Never commit private keys to version control.

```bash title=".gitignore"
.env
.env.local
```
:::

Load in your code:

```typescript
import 'dotenv/config';
```

---

## Step 4: Get Testnet Tokens

### Get Base Sepolia ETH

ETH is required for gas fees:

1. Visit [Coinbase Faucet](https://portal.cdp.coinbase.com/products/faucet)
2. Connect your wallet
3. Request Base Sepolia ETH
4. Wait ~30 seconds

### Get Mock USDC

Mint mock USDC tokens:

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript">

```typescript title="mint-usdc.ts"
import { ethers, parseUnits } from 'ethers';
import 'dotenv/config';

const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

const usdc = new ethers.Contract(
  '0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb',
  ['function mint(address to, uint256 amount) public'],
  wallet
);

// Mint 1000 USDC (6 decimals for USDC)
const tx = await usdc.mint(wallet.address, parseUnits('1000', 6));
await tx.wait();
console.log('Minted 1000 USDC');
```

</TabItem>
<TabItem value="py" label="Python">

```python title="mint_usdc.py"
import asyncio
import os
from dotenv import load_dotenv
from eth_account import Account
from web3 import Web3

load_dotenv()

async def mint_usdc():
    w3 = Web3(Web3.HTTPProvider("https://sepolia.base.org"))
    account = Account.from_key(os.environ["PRIVATE_KEY"])

    usdc = w3.eth.contract(
        address="0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb",
        abi=[{"name": "mint", "type": "function", "inputs": [
            {"name": "to", "type": "address"},
            {"name": "amount", "type": "uint256"}
        ]}]
    )

    tx = usdc.functions.mint(account.address, 1_000 * 1_000_000).build_transaction({
        "from": account.address,
        "nonce": w3.eth.get_transaction_count(account.address),
        "gas": 120_000,
        "gasPrice": w3.eth.gas_price,
    })
    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
    w3.eth.wait_for_transaction_receipt(tx_hash)
    print("Minted 1000 USDC:", tx_hash.hex())

if __name__ == "__main__":
    asyncio.run(mint_usdc())
```

</TabItem>
</Tabs>

:::tip No Public Mint?
If the Mock USDC contract doesn't have a public mint, contact us on [Discord](https://discord.gg/nuhCt75qe4).
:::

---

## Step 5: Verify Installation

Test your setup:

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript">

```typescript title="verify-setup.ts"
import { ACTPClient, getNetwork } from '@agirails/sdk';
import { ethers, formatEther, formatUnits, Wallet } from 'ethers';
import 'dotenv/config';

async function verify() {
  const wallet = new Wallet(process.env.PRIVATE_KEY!);
  const networkConfig = getNetwork('base-sepolia');
  const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);

  const client = await ACTPClient.create({
    mode: 'testnet',
    requesterAddress: wallet.address,
    privateKey: process.env.PRIVATE_KEY!,
  });

  const address = client.getAddress();

  // Check balances
  const ethBalance = await provider.getBalance(address);
  const usdcContract = new ethers.Contract(
    networkConfig.contracts.usdc,
    ['function balanceOf(address) view returns (uint256)'],
    provider
  );
  const usdcBalance = await usdcContract.balanceOf(address);

  console.log('✓ Wallet:', address);
  console.log('✓ Network: Base Sepolia');
  console.log('✓ ACTPKernel:', networkConfig.contracts.actpKernel);
  console.log('✓ EscrowVault:', networkConfig.contracts.escrowVault);
  console.log('✓ ETH balance:', formatEther(ethBalance), 'ETH');
  console.log('✓ USDC balance:', formatUnits(usdcBalance, 6), 'USDC');
  console.log('\n✅ Setup verified!');
}

verify().catch(e => {
  console.error('❌ Failed:', e.message);
  process.exit(1);
});
```

</TabItem>
<TabItem value="py" label="Python">

```python title="verify_setup.py"
import asyncio
import os
from dotenv import load_dotenv
from eth_account import Account
from web3 import Web3
from agirails import ACTPClient

load_dotenv()

async def verify():
    account = Account.from_key(os.environ["PRIVATE_KEY"])
    w3 = Web3(Web3.HTTPProvider("https://sepolia.base.org"))

    client = await ACTPClient.create(
        mode="testnet",
        requester_address=account.address,
        private_key=os.environ["PRIVATE_KEY"],
    )

    # Contract addresses for Base Sepolia
    actp_kernel = "0x6aDB650e185b0ee77981AC5279271f0Fa6CFe7ba"
    escrow_vault = "0x921edE340770db5DB6059B5B866be987d1b7311F"
    usdc_address = "0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb"

    usdc = w3.eth.contract(
        address=usdc_address,
        abi=[{"name": "balanceOf", "type": "function", "inputs": [{"name": "account", "type": "address"}], "outputs": [{"type": "uint256"}]}]
    )

    eth_balance = w3.eth.get_balance(client.address)
    usdc_balance = usdc.functions.balanceOf(client.address).call()

    print("✓ Wallet:", client.address)
    print("✓ Network: Base Sepolia")
    print("✓ ACTPKernel:", actp_kernel)
    print("✓ EscrowVault:", escrow_vault)
    print("✓ ETH balance:", w3.from_wei(eth_balance, "ether"), "ETH")
    print("✓ USDC balance:", usdc_balance / 1_000_000, "USDC")
    print("\n✅ Setup verified!")

if __name__ == "__main__":
    asyncio.run(verify())
```

</TabItem>
</Tabs>

Run:

```bash
npx ts-node verify-setup.ts
```

Expected output:

```
✓ Wallet: 0x742d35Cc6634C0532925a3b844Bc9e7595f12345
✓ Network: Base Sepolia
✓ ACTPKernel: 0x6aDB650e185b0ee77981AC5279271f0Fa6CFe7ba
✓ EscrowVault: 0x921edE340770db5DB6059B5B866be987d1b7311F
✓ ETH balance: 0.1 ETH
✓ USDC balance: 1000.0 USDC

✅ Setup verified!
```

---

## Network Configuration

<div style={{textAlign: 'center', margin: '1.5rem 0'}}>
  <img src="/img/diagrams/network-config.svg" alt="Network Configuration - Base Sepolia and Mainnet" style={{maxWidth: '100%', height: 'auto'}} />
</div>

### Base Sepolia (Testnet)

| Resource | Value |
|----------|-------|
| **Chain ID** | 84532 |
| **RPC URL** | `https://sepolia.base.org` |
| **Explorer** | [sepolia.basescan.org](https://sepolia.basescan.org) |
| **ACTPKernel** | `0x6aDB650e185b0ee77981AC5279271f0Fa6CFe7ba` |
| **EscrowVault** | `0x921edE340770db5DB6059B5B866be987d1b7311F` |
| **Mock USDC** | `0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb` |

### Base Mainnet (Production)

:::warning Not Yet Deployed
Base Mainnet contracts will be deployed after testnet validation. Use Base Sepolia for development.
:::

| Resource | Value |
|----------|-------|
| **Chain ID** | 8453 |
| **RPC URL** | `https://mainnet.base.org` |
| **Explorer** | [basescan.org](https://basescan.org) |
| **USDC** | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |

:::caution SDK Will Throw Error
Using `mode: 'mainnet'` will fail until contracts are deployed. Zero addresses are intentional to prevent accidental mainnet usage.
:::

---

## Troubleshooting

### "Cannot find module '@agirails/sdk'"

| Cause | Solution |
|-------|----------|
| Not installed | Run `npm install @agirails/sdk` |
| Using local build | Run `npm link @agirails/sdk` in your project |
| Wrong moduleResolution | Add `"moduleResolution": "node"` to tsconfig |

### "Invalid private key"

| Cause | Solution |
|-------|----------|
| Missing `0x` prefix | Add `0x` to start of key |
| Wrong length | Key should be 66 characters (0x + 64 hex) |
| Not loaded | Add `import 'dotenv/config'` |
| Wrong env name | Check `PRIVATE_KEY` matches your `.env` |

### "Network connection failed"

| Cause | Solution |
|-------|----------|
| RPC down | Try `https://base-sepolia.g.alchemy.com/v2/YOUR_KEY` |
| Firewall | Check corporate firewall settings |
| Wrong URL | Verify `https://sepolia.base.org` |

### "Insufficient funds for gas"

| Cause | Solution |
|-------|----------|
| No ETH | Get from [Coinbase Faucet](https://portal.cdp.coinbase.com/products/faucet) |
| Transaction pending | Wait for faucet confirmation (~30s) |

---

## SDK Initialization Options

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript">

```typescript
import { ACTPClient } from '@agirails/sdk';
import { Wallet } from 'ethers';

const wallet = new Wallet(process.env.PRIVATE_KEY!);

// Minimal (uses defaults)
const client = await ACTPClient.create({
  mode: 'testnet',
  requesterAddress: wallet.address,
  privateKey: process.env.PRIVATE_KEY!,
});

// With custom RPC
const clientWithRpc = await ACTPClient.create({
  mode: 'testnet',
  requesterAddress: wallet.address,
  privateKey: process.env.PRIVATE_KEY!,
  rpcUrl: 'https://base-sepolia.g.alchemy.com/v2/YOUR_KEY',
});

// Mock mode (local development, no blockchain needed)
const mockClient = await ACTPClient.create({
  mode: 'mock',
  requesterAddress: wallet.address,
});
```

</TabItem>
<TabItem value="py" label="Python">

```python
import asyncio
import os
from eth_account import Account
from agirails import ACTPClient

account = Account.from_key(os.environ["PRIVATE_KEY"])

async def init_clients():
    # Minimal (uses defaults)
    client = await ACTPClient.create(
        mode="testnet",
        requester_address=account.address,
        private_key=os.environ["PRIVATE_KEY"],
    )

    # With custom RPC
    client_with_rpc = await ACTPClient.create(
        mode="testnet",
        requester_address=account.address,
        private_key=os.environ["PRIVATE_KEY"],
        rpc_url="https://base-sepolia.g.alchemy.com/v2/YOUR_KEY",
    )

    # Mock mode (local development, no blockchain needed)
    mock_client = await ACTPClient.create(
        mode="mock",
        requester_address=account.address,
    )

    return client, client_with_rpc, mock_client
```

</TabItem>
</Tabs>

:::info Read-Only Mode Not Supported in V1
The SDK currently requires a signer for initialization. True read-only access (for querying transaction state without a private key) is planned for a future release. For now, use a throwaway private key if you only need to read data.
:::

---

## Next Steps

<div className="row" style={{marginTop: '1rem'}}>
  <div className="col col--6" style={{marginBottom: '1rem'}}>
    <div className="card" style={{height: '100%', padding: '1.5rem'}}>
      <h3>🚀 Start Building</h3>
      <ul>
        <li><a href="./quick-start">Quick Start</a> - First transaction</li>
        <li><a href="./guides/agents/provider-agent">Provider Agent</a> - Get paid</li>
        <li><a href="./guides/agents/consumer-agent">Consumer Agent</a> - Request services</li>
      </ul>
    </div>
  </div>
  <div className="col col--6" style={{marginBottom: '1rem'}}>
    <div className="card" style={{height: '100%', padding: '1.5rem'}}>
      <h3>📚 Learn More</h3>
      <ul>
        <li><a href="./concepts/">Core Concepts</a> - How AGIRAILS works</li>
        <li><a href="./sdk-reference">SDK Reference</a> - Full API docs</li>
        <li><a href="./contract-reference">Contract Reference</a> - On-chain API</li>
      </ul>
    </div>
  </div>
</div>

---

**Need help?** Join our [Discord](https://discord.gg/nuhCt75qe4)
