---
sidebar_position: 5
title: Secure Key Management
description: Production-grade private key handling for AI agents
---

# Secure Key Management

Protect your private keys in production. Because one leaked key = total loss.

<div style={{textAlign: 'center', margin: '2rem 0'}}>
  <img src="/img/diagrams/secure-key-management.svg" alt="Secure Key Management Tiers" style={{maxWidth: '100%', height: 'auto'}} />
</div>

| | |
|---|---|
| **Difficulty** | Intermediate |
| **Time** | 25 minutes |
| **Prerequisites** | Basic understanding of environment variables and cloud services |

---

## Problem

Your AI agent needs a private key to sign transactions, but:
- Hardcoded keys get leaked in git commits
- Environment variables can be exposed in logs
- Single keys are single points of failure
- Keys in memory can be dumped

:::danger One Leaked Key = Total Loss
Unlike passwords, you can't reset a private key. If someone gets it, they can drain your wallet instantly. No recovery.
:::

---

## Solution

:::tip TL;DR
Start with env vars (Tier 1) → Graduate to secret managers (Tier 2) → Use HSMs for high-value ops (Tier 3).
:::

### Solution Tiers

| Tier | Security | Complexity | Best For |
|------|----------|------------|----------|
| **Tier 1**: Environment Variables | Basic | Low | Development, small projects |
| **Tier 2**: Secret Managers | High | Medium | Production, single cloud |
| **Tier 3**: Hardware Security Modules | Very High | High | Enterprise, high-value |

---

## Tier 1: Environment Variables (Minimum)

The baseline. Better than hardcoding, but just barely.

### Setup

```bash
# .env file (NEVER commit this)
PRIVATE_KEY=0x...your_private_key...

# .gitignore (ALWAYS include)
.env
.env.*
*.pem
*.key
```

### Code

```typescript title="src/env-key-loader.ts"
import { ACTPClient } from '@agirails/sdk';
import 'dotenv/config';

async function main() {
  // ❌ Never do this
  // const privateKey = '0x1234...';

  // ✅ Load from environment
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable not set');
  }

  // Validate format before use
  if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
    throw new Error('Invalid private key format');
  }

  const client = await ACTPClient.create({
    network: 'base-sepolia',
    privateKey: privateKey
  });

  // Clear from memory when done (doesn't guarantee security, but helps)
  // Note: JavaScript doesn't have secure memory clearing
}
```

### Gotchas

1. **Docker**: Pass via `-e` flag, not in Dockerfile
   ```bash
   docker run -e PRIVATE_KEY=$PRIVATE_KEY myagent
   ```

2. **Logs**: Never log the key
   ```typescript
   // ❌ This will leak your key
   console.log('Starting with config:', process.env);

   // ✅ Redact sensitive values
   console.log('Starting with config:', {
     ...process.env,
     PRIVATE_KEY: process.env.PRIVATE_KEY ? '[REDACTED]' : 'NOT SET'
   });
   ```

3. **Error messages**: Don't include key in errors
   ```typescript
   // ❌ Bad
   throw new Error(`Failed with key ${privateKey}`);

   // ✅ Good
   throw new Error('Transaction signing failed');
   ```

---

## Tier 2: Cloud Secret Managers (Recommended)

Use your cloud provider's secret management service.

:::info Why Secret Managers?
- **Audit logs** - See who accessed what, when
- **Rotation** - Change keys without redeploying
- **Access control** - Fine-grained IAM permissions
- **Encryption at rest** - Keys encrypted when stored
- **No keys in code** - Fetched at runtime only
:::

### AWS Secrets Manager

```typescript title="src/aws-key-loader.ts"
import {
  SecretsManagerClient,
  GetSecretValueCommand
} from '@aws-sdk/client-secrets-manager';
import { ACTPClient } from '@agirails/sdk';

async function getPrivateKey(): Promise<string> {
  const client = new SecretsManagerClient({ region: 'us-east-1' });

  const response = await client.send(
    new GetSecretValueCommand({
      SecretId: 'agirails/production/private-key'
    })
  );

  if (!response.SecretString) {
    throw new Error('Secret not found');
  }

  const secret = JSON.parse(response.SecretString);
  return secret.privateKey;
}

async function main() {
  const privateKey = await getPrivateKey();

  const client = await ACTPClient.create({
    network: 'base-sepolia',
    privateKey: privateKey
  });

  // Use client...
}
```

**Setup:**
```bash
# Create secret
aws secretsmanager create-secret \
  --name agirails/production/private-key \
  --secret-string '{"privateKey":"0x..."}'

# IAM policy for your service
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "secretsmanager:GetSecretValue",
    "Resource": "arn:aws:secretsmanager:*:*:secret:agirails/*"
  }]
}
```

### Google Cloud Secret Manager

```typescript title="src/gcp-key-loader.ts"
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { ACTPClient } from '@agirails/sdk';

async function getPrivateKey(): Promise<string> {
  const client = new SecretManagerServiceClient();

  const [version] = await client.accessSecretVersion({
    name: 'projects/my-project/secrets/agirails-private-key/versions/latest'
  });

  const payload = version.payload?.data?.toString();
  if (!payload) {
    throw new Error('Secret not found');
  }

  return payload;
}
```

### HashiCorp Vault

```typescript title="src/vault-key-loader.ts"
import Vault from 'node-vault';
import { ACTPClient } from '@agirails/sdk';

async function getPrivateKey(): Promise<string> {
  const vault = Vault({
    apiVersion: 'v1',
    endpoint: process.env.VAULT_ADDR,
    token: process.env.VAULT_TOKEN
  });

  const result = await vault.read('secret/data/agirails/private-key');
  return result.data.data.privateKey;
}
```

### Benefits

- **Audit logs**: See who accessed what, when
- **Rotation**: Change keys without redeploying
- **Access control**: Fine-grained IAM permissions
- **Encryption at rest**: Keys encrypted when stored
- **No keys in code or config**: Fetched at runtime

---

## Tier 3: Hardware Security Modules (Enterprise)

For high-value operations where keys should never exist outside secure hardware.

:::warning Enterprise Only
HSMs are expensive (~$1-5/hour) and complex. Only use if you're handling significant value or have compliance requirements (FIPS 140-2, PCI-DSS).
:::

### AWS CloudHSM / KMS

The private key never leaves the HSM. You send data to sign, get signature back.

```typescript title="src/kms-signer.ts"
import { KMSClient, SignCommand } from '@aws-sdk/client-kms';
import { ethers } from 'ethers';

class KMSSigner extends ethers.AbstractSigner {
  private kmsClient: KMSClient;
  private keyId: string;
  private _address: string;

  constructor(provider: ethers.Provider, keyId: string) {
    super(provider);
    this.kmsClient = new KMSClient({ region: 'us-east-1' });
    this.keyId = keyId;
  }

  async getAddress(): Promise<string> {
    if (!this._address) {
      // Derive address from KMS public key
      this._address = await this.deriveAddress();
    }
    return this._address;
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    const hash = ethers.hashMessage(message);
    return this.signDigest(hash);
  }

  async signTransaction(tx: ethers.TransactionRequest): Promise<string> {
    const serialized = ethers.Transaction.from(tx).unsignedSerialized;
    const hash = ethers.keccak256(serialized);
    const signature = await this.signDigest(hash);
    return ethers.Transaction.from({ ...tx, signature }).serialized;
  }

  private async signDigest(digest: string): Promise<string> {
    const response = await this.kmsClient.send(
      new SignCommand({
        KeyId: this.keyId,
        Message: Buffer.from(digest.slice(2), 'hex'),
        MessageType: 'DIGEST',
        SigningAlgorithm: 'ECDSA_SHA_256'
      })
    );

    // Convert KMS signature to Ethereum format
    return this.kmsSignatureToEth(response.Signature!);
  }

  private kmsSignatureToEth(signature: Uint8Array): string {
    // KMS returns DER-encoded signature, convert to r,s,v format
    // Implementation details omitted for brevity
    // See: https://github.com/aws-samples/aws-kms-ethereum-accounts
  }
}

// Usage with AGIRAILS
async function main() {
  const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
  const signer = new KMSSigner(provider, 'alias/agirails-signing-key');

  // ACTPClient would need to accept a Signer instead of privateKey
  // This requires SDK modification or direct contract interaction
}
```

### Benefits

- **Key never exposed**: Private key exists only in tamper-proof hardware
- **FIPS 140-2 compliance**: Required for some regulatory environments
- **Audit everything**: HSM logs all signing operations
- **Multi-party control**: Require multiple approvals for key use

### Drawbacks

- **Cost**: HSMs are expensive (~$1-5 per hour)
- **Latency**: Each signature requires HSM call (~50-100ms)
- **Complexity**: Significant integration work
- **Vendor lock-in**: Tied to specific cloud provider

---

## Key Rotation Strategy

<div style={{textAlign: 'center', margin: '1.5rem 0'}}>
  <img src="/img/diagrams/key-rotation-flow.svg" alt="Key Rotation Process" style={{maxWidth: '100%', height: 'auto'}} />
</div>

### Why Rotate?

- Limit exposure window if key is compromised
- Compliance requirements (PCI-DSS, SOC2)
- Employee offboarding

### Rotation Process

```typescript
interface KeyRotationConfig {
  currentKeyId: string;
  newKeyId: string;
  rotationTimestamp: number;
}

class RotatingKeyManager {
  private config: KeyRotationConfig;

  async getActiveKey(): Promise<string> {
    const now = Date.now();

    // Use new key after rotation timestamp
    if (now >= this.config.rotationTimestamp) {
      return await this.fetchKey(this.config.newKeyId);
    }

    return await this.fetchKey(this.config.currentKeyId);
  }

  async rotateKey(newKeyId: string, effectiveIn: number): Promise<void> {
    this.config = {
      currentKeyId: this.config.currentKeyId,
      newKeyId: newKeyId,
      rotationTimestamp: Date.now() + effectiveIn
    };

    console.log(`Key rotation scheduled for ${new Date(this.config.rotationTimestamp)}`);
  }
}
```

### Rotation Checklist

1. [ ] Generate new key in secure environment
2. [ ] Fund new address with ETH for gas
3. [ ] Update provider registrations to new address
4. [ ] Schedule rotation timestamp
5. [ ] Deploy with new key configuration
6. [ ] Monitor for any issues
7. [ ] Drain old wallet after grace period
8. [ ] Revoke/destroy old key

---

## Multi-Signature Setup

<div style={{textAlign: 'center', margin: '1.5rem 0'}}>
  <img src="/img/diagrams/multisig-setup.svg" alt="Multi-Signature Setup" style={{maxWidth: '550px', height: 'auto'}} />
</div>

For high-value operations, require multiple keys.

```typescript
import { ethers } from 'ethers';

interface MultiSigConfig {
  threshold: number;      // Required signatures (e.g., 2)
  signers: string[];      // All possible signers (e.g., 3)
}

class MultiSigCoordinator {
  private config: MultiSigConfig;
  private pendingSignatures: Map<string, string[]> = new Map();

  async proposeTransaction(tx: any): Promise<string> {
    const txHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(tx)));
    this.pendingSignatures.set(txHash, []);
    return txHash;
  }

  async addSignature(txHash: string, signature: string, signer: string): Promise<boolean> {
    // Verify signer is authorized
    if (!this.config.signers.includes(signer)) {
      throw new Error('Unauthorized signer');
    }

    // Verify signature
    const recoveredSigner = ethers.verifyMessage(txHash, signature);
    if (recoveredSigner.toLowerCase() !== signer.toLowerCase()) {
      throw new Error('Invalid signature');
    }

    // Add signature
    const signatures = this.pendingSignatures.get(txHash) || [];
    signatures.push(signature);
    this.pendingSignatures.set(txHash, signatures);

    // Check if threshold reached
    return signatures.length >= this.config.threshold;
  }

  async executeIfReady(txHash: string): Promise<boolean> {
    const signatures = this.pendingSignatures.get(txHash);
    if (!signatures || signatures.length < this.config.threshold) {
      return false;
    }

    // Execute with collected signatures
    // Implementation depends on your multi-sig contract
    return true;
  }
}
```

---

## Security Checklist

### Development

- [ ] Never commit `.env` files
- [ ] Use separate keys for dev/staging/production
- [ ] Rotate keys when team members leave
- [ ] Use test networks with worthless tokens

### Production

- [ ] Use secret manager (not env vars)
- [ ] Enable audit logging
- [ ] Set up alerts for unusual activity
- [ ] Document key recovery procedures
- [ ] Regular security audits

### Emergency Response

- [ ] Know how to revoke keys quickly
- [ ] Have backup keys pre-generated (stored securely)
- [ ] Document incident response procedure
- [ ] Test recovery process annually

---

## Common Mistakes

<div style={{textAlign: 'center', margin: '1.5rem 0'}}>
  <img src="/img/diagrams/key-security-mistakes.svg" alt="Common Security Mistakes" style={{maxWidth: '100%', height: 'auto'}} />
</div>

### 1. Logging Sensitive Data

```typescript
// ❌ Leaks in log aggregators
logger.info('Transaction params:', { privateKey, amount });

// ✅ Explicit redaction
logger.info('Transaction params:', { privateKey: '[REDACTED]', amount });
```

### 2. Keys in Error Stack Traces

```typescript
// ❌ Error might include sensitive vars in scope
async function sign(privateKey: string) {
  throw new Error('Failed'); // Stack trace might expose privateKey
}

// ✅ Clear sensitive vars before throwing
async function sign(privateKey: string) {
  let key = privateKey;
  privateKey = ''; // Clear original
  try {
    // Use key...
  } finally {
    key = ''; // Clear copy
  }
}
```

### 3. Keys in URLs

```typescript
// ❌ Keys in URL params (logged by proxies, browsers)
const url = `https://api.example.com?key=${privateKey}`;

// ✅ Keys in headers or body
const response = await fetch(url, {
  headers: { 'X-Private-Key': privateKey }
});
```

### 4. Keys in Browser localStorage

```typescript
// ❌ Accessible to any JavaScript on the page
localStorage.setItem('privateKey', key);

// ✅ Use secure storage or don't store at all
// For browser wallets: use MetaMask/WalletConnect
```

---

## Next Steps

<div className="row" style={{marginTop: '1rem'}}>
  <div className="col col--4" style={{marginBottom: '1rem'}}>
    <div className="card" style={{height: '100%', padding: '1.5rem'}}>
      <h4>👥 Budget Coordination</h4>
      <p>Use secure keys with team budgets.</p>
      <a href="./multi-agent-budget">Multi-Agent Budget →</a>
    </div>
  </div>
  <div className="col col--4" style={{marginBottom: '1rem'}}>
    <div className="card" style={{height: '100%', padding: '1.5rem'}}>
      <h4>🤖 Production Agent</h4>
      <p>Deploy with secure key handling.</p>
      <a href="./automated-provider-agent">Provider Agent →</a>
    </div>
  </div>
  <div className="col col--4" style={{marginBottom: '1rem'}}>
    <div className="card" style={{height: '100%', padding: '1.5rem'}}>
      <h4>📚 SDK Reference</h4>
      <p>Full configuration options.</p>
      <a href="/sdk-reference">SDK Reference →</a>
    </div>
  </div>
</div>
