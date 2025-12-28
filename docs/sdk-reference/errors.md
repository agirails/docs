---
sidebar_position: 10
title: Errors
description: Complete error hierarchy and handling patterns
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Errors

The AGIRAILS SDK provides a typed error hierarchy for precise error handling.

---

## Error Hierarchy

```
ACTPError (base)
├── InsufficientFundsError
├── TransactionNotFoundError
├── DeadlineExpiredError
├── InvalidStateTransitionError
├── SignatureVerificationError
├── TransactionRevertedError
├── NetworkError
├── QueryCapExceededError
├── ValidationError
│   ├── InvalidAddressError
│   ├── InvalidAmountError
│   ├── InvalidCIDError
│   └── InvalidArweaveTxIdError
├── StorageError
│   ├── UploadTimeoutError
│   ├── DownloadTimeoutError
│   ├── ContentNotFoundError
│   ├── FileSizeLimitExceededError
│   ├── StorageAuthenticationError
│   ├── StorageRateLimitError
│   └── ...more storage errors
├── NoProviderFoundError
├── TimeoutError
├── ProviderRejectedError
├── DeliveryFailedError
├── DisputeRaisedError
├── ServiceConfigError
└── AgentLifecycleError
```

---

## Base Error: ACTPError

All SDK errors extend `ACTPError`.

```typescript
class ACTPError extends Error {
  code: string;      // Machine-readable error code
  txHash?: string;   // Transaction hash (if applicable)
  details?: any;     // Additional error context
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Error class name |
| `message` | `string` | Human-readable message |
| `code` | `string` | Machine-readable code |
| `txHash` | `string?` | Blockchain transaction hash |
| `details` | `any?` | Additional context |

---

## Transaction Errors

### InsufficientFundsError

Thrown when account doesn't have enough USDC.

```typescript
try {
  await client.standard.createTransaction({ ... });
} catch (error) {
  if (error instanceof InsufficientFundsError) {
    console.log('Required:', error.details.required);
    console.log('Available:', error.details.available);
  }
}
```

| Property | Description |
|----------|-------------|
| `code` | `'INSUFFICIENT_FUNDS'` |
| `details.required` | Amount needed (wei) |
| `details.available` | Amount available (wei) |

### TransactionNotFoundError

Thrown when transaction ID doesn't exist.

```typescript
try {
  await client.standard.getTransaction(txId);
} catch (error) {
  if (error instanceof TransactionNotFoundError) {
    console.log('Transaction not found:', error.details.txId);
  }
}
```

| Property | Description |
|----------|-------------|
| `code` | `'TRANSACTION_NOT_FOUND'` |
| `details.txId` | Missing transaction ID |

### DeadlineExpiredError

Thrown when trying to act on an expired transaction.

| Property | Description |
|----------|-------------|
| `code` | `'DEADLINE_EXPIRED'` |
| `details.txId` | Transaction ID |
| `details.deadline` | Deadline timestamp |

### InvalidStateTransitionError

Thrown when attempting an invalid state transition.

```typescript
try {
  await client.runtime.transitionState(txId, 'SETTLED');
} catch (error) {
  if (error instanceof InvalidStateTransitionError) {
    console.log('From:', error.details.from);
    console.log('To:', error.details.to);
    console.log('Valid:', error.details.validTransitions);
  }
}
```

| Property | Description |
|----------|-------------|
| `code` | `'INVALID_STATE_TRANSITION'` |
| `details.from` | Current state |
| `details.to` | Attempted state |
| `details.validTransitions` | Valid target states |

---

## Blockchain Errors

### TransactionRevertedError

Thrown when blockchain transaction reverts.

| Property | Description |
|----------|-------------|
| `code` | `'TRANSACTION_REVERTED'` |
| `txHash` | Transaction hash |
| `details.reason` | Revert reason |

### NetworkError

Thrown on network/RPC failures.

| Property | Description |
|----------|-------------|
| `code` | `'NETWORK_ERROR'` |
| `details.network` | Network name |

### SignatureVerificationError

Thrown when signature doesn't match expected signer.

| Property | Description |
|----------|-------------|
| `code` | `'SIGNATURE_VERIFICATION_FAILED'` |
| `details.expectedSigner` | Expected address |
| `details.recoveredSigner` | Actual recovered address |

---

## Validation Errors

### ValidationError (base)

Base class for input validation errors.

| Property | Description |
|----------|-------------|
| `code` | `'VALIDATION_ERROR'` |
| `details.field` | Invalid field name |

### InvalidAddressError

Thrown for invalid Ethereum addresses.

```typescript
import { InvalidAddressError } from '@agirails/sdk';

try {
  await client.standard.createTransaction({
    provider: 'not-an-address',
    amount: '100',
  });
} catch (error) {
  if (error instanceof InvalidAddressError) {
    console.log('Invalid address provided');
  }
}
```

### InvalidAmountError

Thrown when amount is invalid (zero, negative, wrong format).

### InvalidCIDError

Thrown for invalid IPFS Content IDs.

---

## Agent/Job Errors

### NoProviderFoundError

Thrown when no provider offers the requested service.

```typescript
import { request, NoProviderFoundError } from '@agirails/sdk';

try {
  await request('unknown-service', { input: 'test', budget: 1 });
} catch (error) {
  if (error instanceof NoProviderFoundError) {
    console.log('Service not found:', error.details.service);
    console.log('Available:', error.details.availableProviders);
  }
}
```

| Property | Description |
|----------|-------------|
| `code` | `'NO_PROVIDER_FOUND'` |
| `details.service` | Requested service name |
| `details.availableProviders` | List of available providers |

### TimeoutError

Thrown when operation times out.

| Property | Description |
|----------|-------------|
| `code` | `'TIMEOUT'` |
| `details.timeoutMs` | Timeout duration |
| `details.operation` | Operation description |

### ProviderRejectedError

Thrown when provider explicitly rejects a job.

| Property | Description |
|----------|-------------|
| `code` | `'PROVIDER_REJECTED'` |
| `details.provider` | Provider address |
| `details.reason` | Rejection reason |

### DeliveryFailedError

Thrown when provider fails to deliver result.

| Property | Description |
|----------|-------------|
| `code` | `'DELIVERY_FAILED'` |
| `details.txId` | Transaction ID |
| `details.reason` | Failure reason |

### DisputeRaisedError

Thrown when a dispute is raised.

| Property | Description |
|----------|-------------|
| `code` | `'DISPUTE_RAISED'` |
| `details.txId` | Transaction ID |
| `details.reason` | Dispute reason |

### ServiceConfigError

Thrown for invalid service configuration.

| Property | Description |
|----------|-------------|
| `code` | `'SERVICE_CONFIG_ERROR'` |
| `details.field` | Invalid config field |

### AgentLifecycleError

Thrown for invalid agent lifecycle operations.

| Property | Description |
|----------|-------------|
| `code` | `'AGENT_LIFECYCLE_ERROR'` |
| `details.currentState` | Current agent state |
| `details.attemptedAction` | Attempted action |

---

## Storage Errors

### StorageError (base)

Base class for storage-related errors.

| Property | Description |
|----------|-------------|
| `code` | `'STORAGE_ERROR'` |
| `details.operation` | Storage operation |

### Common Storage Errors

| Error | Description |
|-------|-------------|
| `UploadTimeoutError` | Upload timed out |
| `DownloadTimeoutError` | Download timed out |
| `ContentNotFoundError` | CID not found on network |
| `FileSizeLimitExceededError` | File too large |
| `StorageAuthenticationError` | Auth failed |
| `StorageRateLimitError` | Rate limit hit |

---

## Registry Errors

### QueryCapExceededError

Thrown when registry is too large for on-chain queries.

```typescript
import { QueryCapExceededError } from '@agirails/sdk';

try {
  const agents = await registry.queryAgentsByService({ ... });
} catch (error) {
  if (error instanceof QueryCapExceededError) {
    console.log('Registry size:', error.details.registrySize);
    console.log('Max allowed:', error.details.maxQueryAgents);
    console.log('Solution:', error.details.solution);
    // Switch to off-chain indexer
  }
}
```

| Property | Description |
|----------|-------------|
| `code` | `'QUERY_CAP_EXCEEDED'` |
| `details.registrySize` | Current registry size |
| `details.maxQueryAgents` | Query limit (1000) |
| `details.solution` | Migration guidance |

---

## Error Handling Patterns

### Comprehensive Handler

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import {
  ACTPError,
  InsufficientFundsError,
  TransactionNotFoundError,
  InvalidStateTransitionError,
  DeadlineExpiredError,
  ValidationError,
  NetworkError,
  NoProviderFoundError,
  TimeoutError,
} from '@agirails/sdk';

async function handleTransaction() {
  try {
    const result = await client.basic.pay({
      to: provider,
      amount: '100',
    });
    return result;
  } catch (error) {
    // Insufficient funds
    if (error instanceof InsufficientFundsError) {
      const needed = BigInt(error.details.required);
      const have = BigInt(error.details.available);
      const shortfall = needed - have;
      throw new Error(`Need ${shortfall} more wei`);
    }

    // Transaction not found
    if (error instanceof TransactionNotFoundError) {
      throw new Error(`Transaction ${error.details.txId} does not exist`);
    }

    // Invalid state transition
    if (error instanceof InvalidStateTransitionError) {
      throw new Error(
        `Cannot go from ${error.details.from} to ${error.details.to}. ` +
        `Try: ${error.details.validTransitions.join(' or ')}`
      );
    }

    // Deadline expired
    if (error instanceof DeadlineExpiredError) {
      throw new Error(`Transaction expired at ${new Date(error.details.deadline * 1000)}`);
    }

    // Validation error
    if (error instanceof ValidationError) {
      throw new Error(`Invalid ${error.details.field}: ${error.message}`);
    }

    // Network error
    if (error instanceof NetworkError) {
      throw new Error(`Network issue on ${error.details.network}: ${error.message}`);
    }

    // No provider
    if (error instanceof NoProviderFoundError) {
      throw new Error(`No provider for "${error.details.service}"`);
    }

    // Timeout
    if (error instanceof TimeoutError) {
      throw new Error(`Timed out after ${error.details.timeoutMs}ms`);
    }

    // Generic ACTP error
    if (error instanceof ACTPError) {
      throw new Error(`ACTP error [${error.code}]: ${error.message}`);
    }

    // Unknown error
    throw error;
  }
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails import (
    ACTPError,
    InsufficientFundsError,
    TransactionNotFoundError,
    InvalidStateTransitionError,
    ValidationError,
    NoProviderFoundError,
    TimeoutError,
)

async def handle_transaction():
    try:
        result = await client.basic.pay({
            'to': provider,
            'amount': '100',
        })
        return result
    except InsufficientFundsError as e:
        needed = int(e.details['required'])
        have = int(e.details['available'])
        raise Exception(f'Need {needed - have} more wei')
    except TransactionNotFoundError as e:
        raise Exception(f"Transaction {e.details['txId']} does not exist")
    except InvalidStateTransitionError as e:
        raise Exception(
            f"Cannot go from {e.details['from']} to {e.details['to']}. "
            f"Try: {' or '.join(e.details['validTransitions'])}"
        )
    except ValidationError as e:
        raise Exception(f"Invalid {e.details['field']}: {e.message}")
    except NoProviderFoundError as e:
        raise Exception(f"No provider for '{e.details['service']}'")
    except TimeoutError as e:
        raise Exception(f"Timed out after {e.details['timeoutMs']}ms")
    except ACTPError as e:
        raise Exception(f"ACTP error [{e.code}]: {e.message}")
```

</TabItem>
</Tabs>

### Retry with Error Classification

```typescript
import { NetworkError, TimeoutError, ACTPError } from '@agirails/sdk';

async function retryableOperation<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Retryable errors
      if (error instanceof NetworkError || error instanceof TimeoutError) {
        console.log(`Attempt ${attempt} failed, retrying...`);
        await new Promise(r => setTimeout(r, 1000 * attempt)); // Exponential backoff
        continue;
      }

      // Non-retryable errors - fail immediately
      throw error;
    }
  }

  throw lastError;
}
```

---

## Error Codes Reference

| Code | Error Class | Description |
|------|-------------|-------------|
| `INSUFFICIENT_FUNDS` | InsufficientFundsError | Not enough USDC |
| `TRANSACTION_NOT_FOUND` | TransactionNotFoundError | Transaction ID doesn't exist |
| `DEADLINE_EXPIRED` | DeadlineExpiredError | Transaction deadline passed |
| `INVALID_STATE_TRANSITION` | InvalidStateTransitionError | Invalid state machine transition |
| `SIGNATURE_VERIFICATION_FAILED` | SignatureVerificationError | Signature mismatch |
| `TRANSACTION_REVERTED` | TransactionRevertedError | Blockchain tx reverted |
| `NETWORK_ERROR` | NetworkError | RPC/network failure |
| `VALIDATION_ERROR` | ValidationError | Input validation failed |
| `STORAGE_ERROR` | StorageError | Storage operation failed |
| `QUERY_CAP_EXCEEDED` | QueryCapExceededError | Registry too large |
| `NO_PROVIDER_FOUND` | NoProviderFoundError | Service not available |
| `TIMEOUT` | TimeoutError | Operation timed out |
| `PROVIDER_REJECTED` | ProviderRejectedError | Provider rejected job |
| `DELIVERY_FAILED` | DeliveryFailedError | Provider failed to deliver |
| `DISPUTE_RAISED` | DisputeRaisedError | Dispute on transaction |
| `SERVICE_CONFIG_ERROR` | ServiceConfigError | Invalid service config |
| `AGENT_LIFECYCLE_ERROR` | AgentLifecycleError | Invalid agent operation |

---

## Next Steps

- [SDK Reference](./) - API overview
- [Advanced API](./advanced-api/) - Protocol control
- [Utilities](./utilities) - Helper functions
