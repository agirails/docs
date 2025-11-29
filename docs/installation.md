---
sidebar_position: 2
title: Installation
description: Install and configure the AGIRAILS SDK for your development environment
---

# Installation

Get the AGIRAILS SDK set up in your project and configure it to connect to the ACTP protocol.

## Prerequisites

Before installing, ensure you have:

- **Node.js 16+** installed ([download](https://nodejs.org))
- **npm, yarn, or pnpm** package manager
- **TypeScript 5.2+** (recommended for type safety)
- **A wallet** with a private key for signing transactions

## Install the SDK

:::info Beta Release
The AGIRAILS SDK is currently in beta (v2.0.0-beta). APIs may change before the stable 1.0 release.
:::

Install via your preferred package manager:

```bash npm2yarn
npm install @agirails/sdk
```

### Alternative: From Source

For development or to use the latest unreleased features:

```bash
# Clone the repository
git clone https://github.com/agirails/sdk-js.git
cd sdk-js

# Install dependencies
npm install

# Build the SDK
npm run build

# Link for local development
npm link
```

Then in your project:

```bash
npm link @agirails/sdk
```

## TypeScript Configuration

Add these settings to your `tsconfig.json`:

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

## Environment Setup

Create a `.env` file in your project root:

```bash title=".env"
# Your wallet private key (starts with 0x)
PRIVATE_KEY=0x1234567890abcdef...

# RPC URL (optional - defaults to public Base Sepolia RPC)
RPC_URL=https://sepolia.base.org

# For custom RPC provider (e.g., Alchemy)
# RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

:::danger Security
Never commit private keys to version control. Add `.env` to your `.gitignore`:

```bash title=".gitignore"
.env
.env.local
```
:::

Load environment variables in your code:

```typescript title="agent.ts"
import dotenv from 'dotenv';
dotenv.config();
```

## Network Configuration

AGIRAILS currently supports Base Sepolia (testnet) and Base Mainnet.

### Base Sepolia (Testnet)

| Resource | Details |
|----------|---------|
| **Chain ID** | 84532 |
| **RPC URL** | `https://sepolia.base.org` |
| **Block Explorer** | [sepolia.basescan.org](https://sepolia.basescan.org) |
| **ACTPKernel** | `0x6aDB650e185b0ee77981AC5279271f0Fa6CFe7ba` |
| **EscrowVault** | `0x921edE340770db5DB6059B5B866be987d1b7311F` |
| **Mock USDC** | `0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb` |

### Base Mainnet (Production)

:::warning Not Yet Deployed
Base Mainnet contracts will be deployed after testnet validation. Use Base Sepolia for development.
:::

| Resource | Details |
|----------|---------|
| **Chain ID** | 8453 |
| **RPC URL** | `https://mainnet.base.org` |
| **Block Explorer** | [basescan.org](https://basescan.org) |
| **USDC** | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |

## Get Testnet Tokens

To use Base Sepolia, you need testnet ETH and USDC:

### 1. Get Testnet ETH

ETH is required for gas fees on Base Sepolia:

1. Visit the [Coinbase Faucet](https://portal.cdp.coinbase.com/products/faucet)
2. Connect your wallet
3. Request Base Sepolia ETH
4. Wait ~30 seconds for confirmation

### 2. Get Mock USDC

Once you have ETH, mint mock USDC tokens:

```typescript title="mint-usdc.ts"
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

// Mock USDC contract address
const usdcAddress = '0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb';

// ERC20 ABI for mint function (if available)
const usdcAbi = [
  'function mint(address to, uint256 amount) public',
  'function balanceOf(address account) view returns (uint256)'
];

const usdc = new ethers.Contract(usdcAddress, usdcAbi, wallet);

// Mint 1000 USDC (6 decimals)
const amount = ethers.parseUnits('1000', 6);
const tx = await usdc.mint(await wallet.getAddress(), amount);
await tx.wait();

console.log('Minted 1000 USDC');
```

:::info
If the Mock USDC contract doesn't have a public mint function, contact the AGIRAILS team on [Discord](https://discord.gg/agirails) to request testnet tokens.
:::

## Verify Installation

Test your setup with this verification script:

```typescript title="verify-setup.ts"
import { ACTPClient } from '@agirails/sdk';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

async function verifySetup() {
  try {
    // Initialize client
    const client = await ACTPClient.create({
      network: 'base-sepolia',
      privateKey: process.env.PRIVATE_KEY!
    });

    // Get wallet address
    const address = await client.getAddress();
    console.log('✓ Wallet address:', address);

    // Check network connection
    const blockNumber = await client.getBlockNumber();
    console.log('✓ Connected to Base Sepolia, block:', blockNumber);

    // Get network config
    const config = client.getNetworkConfig();
    console.log('✓ ACTPKernel contract:', config.contracts.actpKernel);
    console.log('✓ EscrowVault contract:', config.contracts.escrowVault);
    console.log('✓ USDC contract:', config.contracts.usdc);

    // Check ETH balance (for gas)
    const ethBalance = await client.getProvider().getBalance(address);
    console.log('✓ ETH balance:', ethers.formatEther(ethBalance), 'ETH');

    // Check USDC balance
    const usdcContract = new ethers.Contract(
      config.contracts.usdc,
      ['function balanceOf(address) view returns (uint256)'],
      client.getProvider()
    );
    const usdcBalance = await usdcContract.balanceOf(address);
    console.log('✓ USDC balance:', ethers.formatUnits(usdcBalance, 6), 'USDC');

    console.log('\n✅ Setup verified! You\'re ready to use AGIRAILS.');
  } catch (error) {
    console.error('❌ Setup verification failed:', error.message);
    process.exit(1);
  }
}

verifySetup();
```

Run the verification:

```bash
npx ts-node verify-setup.ts
```

Expected output:
```
✓ Wallet address: 0x742d35Cc6634C0532925a3b844Bc9e7595f12345
✓ Connected to Base Sepolia, block: 8123456
✓ ACTPKernel contract: 0x6aDB650e185b0ee77981AC5279271f0Fa6CFe7ba
✓ EscrowVault contract: 0x921edE340770db5DB6059B5B866be987d1b7311F
✓ USDC contract: 0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb
✓ ETH balance: 0.1 ETH
✓ USDC balance: 1000.0 USDC

✅ Setup verified! You're ready to use AGIRAILS.
```

## Troubleshooting

### "Cannot find module '@agirails/sdk'"

**Symptom**: Import error when running TypeScript

**Solutions**:
- If using local build: Ensure you ran `npm link @agirails/sdk` in your project
- Verify `node_modules/@agirails` directory exists
- Try `npm install` again
- Check `tsconfig.json` has `"moduleResolution": "node"`

### "Invalid private key"

**Symptom**: Error when creating ACTPClient

**Solutions**:
- Ensure private key starts with `0x`
- Verify private key is 64 hex characters (66 with `0x` prefix)
- Check `.env` file is loaded (add `dotenv.config()`)
- Verify environment variable name matches (e.g., `PRIVATE_KEY` not `AGENT_PRIVATE_KEY`)

### "Network connection failed"

**Symptom**: Cannot connect to Base Sepolia RPC

**Solutions**:
- Check internet connection
- Verify RPC URL is correct: `https://sepolia.base.org`
- Try alternative RPC: Use Alchemy or Infura
- Check firewall settings

### "Insufficient funds for gas"

**Symptom**: Transaction fails with "insufficient funds"

**Solutions**:
- Get testnet ETH from [Coinbase Faucet](https://portal.cdp.coinbase.com/products/faucet)
- Wait ~30 seconds for faucet transaction to confirm
- Verify ETH balance: `await provider.getBalance(address)`

## Next Steps

Now that you have the SDK installed, continue with:

- [Quick Start](./quick-start) - Create your first transaction in 5 minutes
- [Core Concepts](./concepts/) - Understand the ACTP protocol
