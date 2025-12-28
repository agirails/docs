---
slug: python-sdk-v2-released
title: "agirails v2.0 for Python: Full Feature Parity with TypeScript SDK"
authors: [sdk-team]
tags: [release]
---

The AGIRAILS Python SDK v2.0 is now live on PyPI with full feature parity to the TypeScript SDK, including mock mode, three API layers, and comprehensive error handling.

<!-- truncate -->

## Installation

```bash
pip install agirails
```

**PyPI:** [agirails](https://pypi.org/project/agirails/)
**GitHub:** [agirails/sdk-python](https://github.com/agirails/sdk-python)

---

## What's New in v2.0

### Three API Layers

The SDK offers three levels of abstraction to match your needs:

| Layer | Use Case | Complexity |
|-------|----------|------------|
| **Basic** | Quick integrations, demos | Minimal |
| **Standard** | Production applications | Balanced |
| **Runtime** | Custom implementations | Full control |

```python
from agirails import ACTPClient

client = await ACTPClient.create(
    mode="testnet",
    requester_address="0x...",
    private_key="0x..."
)

# Basic: One-liner payment
result = await client.basic.pay({
    "to": "0x...",
    "amount": 10.00,
    "deadline": "+1h"
})

# Standard: Full lifecycle control
tx_id = await client.standard.create_transaction({
    "provider": "0x...",
    "amount": 10.00,
    "deadline": "+1h",
    "dispute_window": 3600
})
await client.standard.link_escrow(tx_id)
```

### Mock Mode

Develop and test without blockchain access:

```python
client = await ACTPClient.create(
    mode="mock",
    requester_address="0x1234..."  # No private key needed!
)

# Full ACTP flow works identically
result = await client.basic.pay({
    "to": "0x5678...",
    "amount": 5.00
})

print(result.tx_id)     # "0x..."
print(result.state)     # "COMMITTED"
print(result.amount)    # "5.00 USDC"
```

Mock mode features:
- No gas fees or blockchain connection
- Instant transactions
- Persistent state (survives restarts)
- Perfect for CI/CD pipelines
- Test USDC minting

### Comprehensive Error Handling

30+ typed exceptions with structured details:

```python
from agirails import (
    ACTPError,
    InsufficientBalanceError,
    InvalidStateTransitionError,
    NetworkError,
    TransactionNotFoundError
)

try:
    await client.basic.pay({"to": "0x...", "amount": 1000})
except InsufficientBalanceError as e:
    print(f"Need more USDC!")
    print(f"Required: {e.details['required']}")
    print(f"Available: {e.details['available']}")
except InvalidStateTransitionError as e:
    print(f"Invalid transition: {e.details['from']} -> {e.details['to']}")
    print(f"Valid transitions: {e.details['valid_transitions']}")
except NetworkError as e:
    # Implement retry logic
    pass
except ACTPError as e:
    print(f"ACTP Error [{e.code}]: {e.message}")
```

Error categories:
- **Transaction**: `InsufficientBalanceError`, `TransactionNotFoundError`, `DeadlineExpiredError`
- **State**: `InvalidStateTransitionError`, `DisputeWindowActiveError`
- **Validation**: `InvalidAddressError`, `InvalidAmountError`
- **Network**: `NetworkError`, `TransactionRevertedError`
- **Storage**: `StorageError`, `UploadTimeoutError`, `ContentNotFoundError`
- **Agent/Job**: `NoProviderFoundError`, `ProviderRejectedError`

### Fully Async

Native Python async/await throughout:

```python
import asyncio
from agirails import ACTPClient

async def main():
    client = await ACTPClient.create(mode="mock", requester_address="0x...")

    # Concurrent operations
    results = await asyncio.gather(
        client.basic.pay({"to": "0xA...", "amount": 10}),
        client.basic.pay({"to": "0xB...", "amount": 20}),
        client.basic.pay({"to": "0xC...", "amount": 30}),
    )

    for r in results:
        print(f"Tx {r.tx_id}: {r.state}")

asyncio.run(main())
```

### Dataclass Results

All results are typed dataclasses with IDE autocomplete:

```python
from agirails import BasicPayResult, CheckStatusResult

result: BasicPayResult = await client.basic.pay({...})

# IDE autocomplete works
result.tx_id      # str
result.state      # str
result.amount     # str
result.deadline   # str (ISO 8601)
```

---

## Quick Start

### 1. Install

```bash
pip install agirails
```

### 2. Create Client

```python
from agirails import ACTPClient

# Mock mode for development
client = await ACTPClient.create(
    mode="mock",
    requester_address="0xYourAddress..."
)

# Testnet for integration testing
client = await ACTPClient.create(
    mode="testnet",
    requester_address="0xYourAddress...",
    private_key="0xYourPrivateKey..."
)
```

### 3. Make a Payment

```python
result = await client.basic.pay({
    "to": "0xProviderAddress...",
    "amount": 25.00,
    "deadline": "+24h"
})

print(f"Transaction: {result.tx_id}")
print(f"State: {result.state}")
```

### 4. Check Status

```python
status = await client.basic.check_status(result.tx_id)

print(f"Can accept: {status.can_accept}")
print(f"Can complete: {status.can_complete}")
print(f"Can dispute: {status.can_dispute}")
```

---

## Feature Parity with TypeScript

| Feature | TypeScript | Python |
|---------|------------|--------|
| Basic API | `client.basic.pay()` | `client.basic.pay()` |
| Standard API | `client.standard.*` | `client.standard.*` |
| Mock Mode | `mode: 'mock'` | `mode="mock"` |
| Error Hierarchy | 30+ typed errors | 30+ typed errors |
| Async Support | Promises | async/await |
| State Machine | 8 states | 8 states |
| Test USDC Minting | `client.mintTokens()` | `client.mint_tokens()` |

---

## Network Support

| Network | Chain ID | Status |
|---------|----------|--------|
| Base Sepolia | 84532 | Active (Testnet) |
| Base Mainnet | 8453 | Not Deployed |

---

## What's Next

- **Claude Code Plugin**: AI-assisted AGIRAILS development
- **LangChain Integration**: Native tools for AI agents
- **Documentation**: Comprehensive Python guides

---

## Resources

- [PyPI Package](https://pypi.org/project/agirails/)
- [GitHub Repository](https://github.com/agirails/sdk-python)
- [Documentation](https://docs.agirails.io)
- [Discord](https://discord.gg/nuhCt75qe4)

---

## Feedback

Found an issue? [Open a GitHub issue](https://github.com/agirails/sdk-python/issues) or reach out on [Discord](https://discord.gg/nuhCt75qe4).
