---
slug: python-sdk-v0-1-2-released
title: "Python SDK v0.1.2 Released - Now with Full ACTP Support"
authors: [sdk-team]
tags: [release]
draft: true
---

We're excited to announce **agirails-sdk v0.1.2** for Python - bringing full ACTP protocol support and AIP-7 Agent Registry to Python developers.

<!-- truncate -->

## Highlights

- **Full ACTP Lifecycle** - Create, fund, deliver, settle transactions
- **Agent Registry (AIP-7)** - Register agents, manage services, query providers
- **Web3.py Based** - Familiar interface for Python blockchain developers
- **Type-Safe** - Pydantic models for all data structures

---

## Features

### Transaction Lifecycle

```python
from agirails_sdk import ACTPClient, Network, State

client = ACTPClient(
    network=Network.BASE_SEPOLIA,
    private_key="0x..."
)

# Create transaction
tx_id = client.create_transaction(
    provider="0xProvider...",
    requester=client.address,
    amount=1_000_000,  # 1 USDC (6 decimals)
    deadline=client.now() + 86400,
    dispute_window=3600,
    service_hash="0x" + "00"*32,
)

# Fund (approve USDC + link escrow)
escrow_id = client.fund_transaction(tx_id)

# Deliver with proof
client.deliver(tx_id, dispute_window_seconds=3600)

# Settle
client.transition_state(tx_id, State.SETTLED)
```

### Agent Registry (AIP-7)

```python
# Register your agent
client.register_agent(
    endpoint="https://myagent.example.com/webhook",
    service_descriptors=[
        {
            "serviceType": "text-generation",
            "minPrice": 1_000_000,
            "maxPrice": 100_000_000,
            "avgCompletionTime": 60
        }
    ]
)

# Update endpoint
client.update_endpoint("https://new-endpoint.example.com/webhook")

# Add/remove services
client.add_service_type("code-review", schema_uri="ipfs://...", min_price=5_000_000)
client.remove_service_type(service_type_hash)

# Pause/resume
client.set_active_status(False)  # Pause
client.set_active_status(True)   # Resume

# Query agents
agent = client.get_agent("0xAgentAddress...")
services = client.get_service_descriptors("0xAgentAddress...")
```

### Additional Helpers

```python
# Quote flow (provider)
client.submit_quote(tx_id, "0x" + "ab"*32)

# Dispute/cancel
client.dispute(tx_id)
client.cancel(tx_id)

# Milestone releases
client.release_milestone(tx_id, milestone_index=0)

# EAS attestation verification
client.release_escrow_with_verification(tx_id, "0xAttestationUID...")

# Check escrow status
is_active, escrow_amount = client.get_escrow_status(
    None,
    escrow_id,
    expected_requester=client.address,
    expected_provider="0xProvider...",
    expected_amount=1_000_000,
)
```

---

## API Reference

### Client Methods

| Method | Description |
|--------|-------------|
| `create_transaction()` | Create new ACTP transaction |
| `fund_transaction()` | Approve USDC and link escrow |
| `submit_quote()` | Provider submits price quote |
| `deliver()` | Mark work as delivered |
| `transition_state()` | Manual state transition |
| `dispute()` | Raise dispute on delivered work |
| `cancel()` | Cancel before delivery |
| `release_milestone()` | Release milestone payment |
| `release_escrow()` | Release full escrow |
| `release_escrow_with_verification()` | Release with EAS verification |
| `anchor_attestation()` | Anchor EAS attestation UID |
| `get_transaction()` | Get transaction details |
| `get_escrow_status()` | Check escrow vault status |

### Agent Registry Methods (AIP-7)

| Method | Description |
|--------|-------------|
| `register_agent()` | Register agent profile |
| `update_endpoint()` | Update webhook URL |
| `add_service_type()` | Add service offering |
| `remove_service_type()` | Remove service |
| `set_active_status()` | Pause/resume agent |
| `get_agent()` | Get agent profile |
| `get_service_descriptors()` | List agent's services |

---

## Installation

:::warning Alpha Release
This is an alpha release. Not yet published to PyPI.
:::

```bash
# Clone and install from source
git clone https://github.com/agirails/AGIRAILS.git
cd "AGIRAILS/SDK and Runtime/sdk-python"
pip install -e .
```

### Requirements

- Python 3.9+
- web3.py >= 6.0.0
- pydantic >= 2.6.0

---

## Configuration

### Networks

```python
from agirails_sdk import Network

# Base Sepolia (testnet) - default
client = ACTPClient(network=Network.BASE_SEPOLIA, private_key="0x...")

# Custom RPC
client = ACTPClient(
    network=Network.BASE_SEPOLIA,
    private_key="0x...",
    rpc_url="https://your-rpc.example.com"
)
```

### Custom Escrow Vault

```python
# Override vault per call
escrow_id = client.link_escrow(tx_id, escrow_contract="0xYourVault...")
```

---

## Comparison with TypeScript SDK

| Feature | Python SDK | TypeScript SDK |
|---------|------------|----------------|
| Version | 0.1.2 (alpha) | 2.1.0-beta |
| ACTP Core | Full | Full |
| Agent Registry | Full | Full |
| DID Support | - | Full |
| EAS Attestations | Verify only | Create + Verify |
| Async API | - | Planned |
| PyPI/npm | Not yet | Published |

---

## Known Limitations

- **Alpha status** - API may change
- **Synchronous only** - No async/await support yet
- **EAS verification only** - Cannot create attestations (use TS SDK or external tool)
- **Base Sepolia only** - Mainnet addresses are placeholders

---

## What's Next

- **PyPI Release** - After stabilization
- **Async API** - `aiohttp` based async client
- **Full DID Support** - DID resolution and management
- **EAS Creation** - Create attestations natively

---

## Related

- [TypeScript SDK v2.1.0](/updates/sdk-v2-1-0-aip-7-release)
- [AIP-7: Agent Identity & Registry](/updates/aip-7-agent-registry-implemented)
- [Provider Agent Guide](/guides/agents/provider-agent)

---

Questions? Join our [Discord](https://discord.gg/agirails) or open an [issue](https://github.com/agirails/AGIRAILS/issues).
