---
slug: python-sdk-v3-released
title: "Python SDK 3.0 — Mirror Complete, Full TS 4.0.0 Parity"
authors: [agirails]
tags: [release, python, ecosystem]
---

`agirails@3.0.1` ships on PyPI through the same OIDC Trusted Publisher pipeline as the TypeScript SDK. Full wire-protocol parity with `@agirails/sdk@4.0.0` — 21-field `TransactionView`, ERC-4337 Smart Wallet path end-to-end, AIP-2.1 quote channel, EIP-712 Web Receipts. Closes the ecosystem-v4 mirror queued on 2026-05-20.

<!-- truncate -->

## Install

```bash
pip install agirails
```

PyPI 3.0.1 is the current latest. Consumers reading addresses via `get_network("base-mainnet").contracts.*` migrate automatically. Pre-V3 (19-field) `getTransaction()` tuples are intentionally rejected with a clear error rather than silently mis-positioned.

## What's in the box

| Capability | What it does |
|---|---|
| **V3/V4 wire-protocol parity** | 21-field `TransactionView`, AIP-14 dispute bonds (`dispute_bond_bps_locked`), INV-30 (`requester_penalty_bps_locked`), MIN_FEE ($0.05) enforced in the kernel |
| **Smart Wallet end-to-end** | `wallet="auto"` builds a Coinbase Smart Wallet + Paymaster. `pay`, `accept_quote`, `link_escrow`, `transition_state`, `release_escrow` all route through bundler + paymaster so `msg.sender == requester` on-chain |
| **AIP-2.1 quote channel** | Signed `CounterOfferBuilder` / `CounterAcceptBuilder` + `actp serve` FastAPI daemon that verifies typed-data quotes and policy-evaluates them |
| **Web Receipts** | EIP-712 `ReceiptWrite` signing and upload to `agirails.app/api/v1/receipts` |
| **Hash-based service routing** | `keccak256(service_name)` lookup map on both `Agent.provide()` and `Provider.register_service()` — matches TS `Agent.handlersByHash`; legacy JSON / plain-string formats keep working via fallback |
| **Five new CLI commands** | `actp serve`, `actp request`, `actp verify`, `actp claim-code`, `actp repair` |

## Gasless quickstart

```python
import asyncio, os
from agirails import ACTPClient

async def main():
    client = await ACTPClient.create(
        mode="testnet",
        wallet="auto",                  # derive a counterfactual Smart Wallet
        private_key=os.environ["PRIVATE_KEY"],
    )
    result = await client.basic.pay({"to": "0xProvider…", "amount": "0.05"})
    # single batched UserOp: USDC.approve + createTransaction + linkEscrow
    print(f"tx={result.tx_id} state={result.state}")

asyncio.run(main())
```

On-chain this guarantees `msg.sender == Smart Wallet == requester`, which the kernel checks via `_requesterCheck`. Without `wallet="auto"` the SDK falls back to the legacy sequential EOA path unchanged.

## Cross-SDK parity in CI

Every release regenerates EIP-712 parity vectors and verifies them on both stacks: TS-signed `CounterOffer` / `CounterAccept` → Python recovers signer + recomputes hash; Python-signed → TS calls `ethers.verifyTypedData` + `CounterOfferBuilder.computeHash`. Four fixtures × two directions per release. Drift on type ordering, struct encoding, canonical-JSON key ordering, or keccak inputs fails CI before publish.

The release was also gated on a live `-m integration_sepolia` run against the V4 kernel — Smart Wallet `pay_actp_batched` submits a real UserOp through Coinbase CDP, state flips to COMMITTED on-chain, full 21-field shape verified end-to-end.

## Same Trusted Publisher pipeline as the rest of the ecosystem

`agirails@3.0.0` and `agirails@3.0.1` were minted through `.github/workflows/release-pypi.yml` — GitHub Actions OIDC + PyPI Trusted Publishers per PEP 740. No long-lived API tokens in repo secrets. Stable publishes require `workflow_dispatch` with `target=pypi`, the `pypi` environment's reviewer-approval gate, and a green TestPyPI job first. Same attestation story as `@agirails/sdk@4.0.0`, `n8n-nodes-actp@2.5.0`, and `@agirails/mcp-server@0.2.0`.

## What this closes

The 2026-05-20 [ecosystem-mirror post](/changelog/ecosystem-v4-mirror) flagged Python as the one downstream not yet bumped to track SDK 4.0.0. With this release the entire AGIRAILS surface — TypeScript SDK, Python SDK, n8n node, MCP server, three Claude/AI skill packages — sits on the same V3 mainnet / V4 Sepolia contracts, produces byte-identical wire bytes for every typed-data message the protocol uses, and ships through the same workflow-attested publish pipeline.

## Resources

- [PyPI agirails 3.0.1](https://pypi.org/project/agirails/3.0.1/)
- [GitHub sdk-python](https://github.com/agirails/sdk-python)
- [CHANGELOG \[3.0.1\]](https://github.com/agirails/sdk-python/blob/main/CHANGELOG.md#301--2026-05-24)
- [TypeScript SDK 4.0.0 release post](/changelog/sdk-v4-mainnet-redeploy)
- [Documentation](https://docs.agirails.io)
- [Discord](https://discord.gg/nuhCt75qe4)
