---
sidebar_position: 11
title: Error Reference
description: Complete catalog of ACTP error codes, causes, and recovery actions
---

# Error Reference

> Machine-readable error catalog for debugging ACTP integrations.
> Each error includes the cause, which layer produces it, and the recommended recovery action.

## Contract Errors (Solidity Reverts)

These errors are returned by on-chain smart contracts when a transaction reverts.

| Error | Layer | Cause | Recovery |
|-------|-------|-------|----------|
| `"Kernel paused"` | ACTPKernel | Emergency pause is active | Wait for unpause; check contract status on Basescan |
| `"Invalid transition"` | ACTPKernel | Attempted disallowed state change | Verify current state with `actp tx status <id> --json`, check [transition rules](/concepts/transaction-lifecycle) |
| `"Only kernel"` | EscrowVault | Direct call to EscrowVault (must go through Kernel) | Route all calls through ACTPKernel; use SDK methods |
| `"Insufficient escrow"` | EscrowVault | Release amount exceeds available balance | Check remaining escrow with `remaining()` view function |
| `"Only requester"` | ACTPKernel | Caller is not the transaction requester | Use the wallet that created the transaction |
| `"Only provider"` | ACTPKernel | Caller is not the transaction provider | Use the provider wallet |
| `"Deadline expired"` | ACTPKernel | Transaction deadline has passed | Create a new transaction with a longer deadline |
| `"Deadline not expired"` | ACTPKernel | Action requires expired deadline but it hasn't | Wait for the deadline to pass |
| `"Tx exists"` | ACTPKernel | Transaction ID already used | Nonce collision; SDK auto-increments nonces |
| `"Zero amount"` | ACTPKernel | Transaction amount is 0 | Set amount to at least $0.05 USDC |
| `"Invalid fee"` | ACTPKernel | Platform fee exceeds 5% cap | Contact protocol admin; fee is set at deployment |
| `"Not approved"` | EscrowVault | USDC allowance insufficient | Approve EscrowVault to spend USDC; SDK handles this automatically |
| `"Escrow not approved"` | ACTPKernel | EscrowVault not authorized by Kernel | Admin must call `approveEscrowVault()`; contact support |
| `"Tx missing"` | ACTPKernel | Transaction ID does not exist | Verify the transaction ID; check if on correct network |

## SDK Error Codes

These errors are thrown by the `@agirails/sdk` (TypeScript) or `agirails` (Python) libraries.

| Code | Layer | Meaning | Recovery |
|------|-------|---------|----------|
| `INSUFFICIENT_BALANCE` | SDK | Wallet USDC balance less than transaction amount | Fund wallet with USDC |
| `INSUFFICIENT_ALLOWANCE` | SDK | USDC not approved for EscrowVault spending | SDK auto-approves on retry; if persistent, manually approve |
| `WALLET_NOT_FOUND` | SDK | No keystore at `.actp/keystore.json` | Run `actp init -m <network>` |
| `INVALID_PASSWORD` | SDK | `ACTP_KEY_PASSWORD` env var is wrong | Check the environment variable value |
| `RPC_ERROR` | SDK | Blockchain RPC node unreachable or returned error | Check `RPC_URL` env var; try alternative endpoint |
| `PAYMASTER_ERROR` | SDK | ERC-4337 gas sponsorship failed | SDK falls back to EOA (agent pays gas from ETH balance) |
| `PROVIDER_PAID_FEE_FAILED` | SDK | x402 relay fee transfer failed | Check X402Relay config and USDC balance |
| `NONCE_TOO_LOW` | SDK | Transaction nonce conflict (already used) | SDK auto-retries with incremented nonce |
| `CONFIG_HASH_MISMATCH` | SDK | Local AGIRAILS.md hash differs from on-chain | Run `actp pull` to sync or `actp publish` to push |
| `ADAPTER_NOT_FOUND` | SDK | No adapter matches the payment target | Check target format: `0x...` (ACTP), `https://...` (x402), or agent ID |
| `TIMEOUT` | SDK | Operation exceeded time limit | Increase timeout or check network conditions |

## CLI Exit Codes

The `actp` CLI uses standard exit codes for machine-readable status:

| Exit Code | Meaning | Example |
|-----------|---------|---------|
| `0` | Success — operation completed | `actp pay ... && echo "paid"` |
| `1` | Error — operation failed (details in stderr) | Check stderr for specific error message |
| `2` | Pending — transaction not in terminal state | Used by `actp watch` when state is not final |
| `124` | Timeout — operation exceeded time limit | Used by `actp watch --timeout` |

### Using exit codes in scripts

```bash
# @cli: actp >=2.3.1 | network: any
actp pay 0xPROVIDER 5.00 --json
case $? in
  0) echo "Payment successful" ;;
  1) echo "Payment failed" >&2 ;;
  2) echo "Payment pending" ;;
  124) echo "Timed out" >&2 ;;
esac
```

## HTTP Status Codes (Publish Proxy)

The publish proxy at `api.agirails.io` returns standard HTTP status codes:

| Status | Meaning | Common Cause |
|--------|---------|-------------|
| `200` | Success — config published to IPFS | — |
| `400` | Bad Request — invalid body or hash mismatch | Malformed AGIRAILS.md or configHash doesn't match computed hash |
| `401` | Unauthorized — missing or invalid API key | Set `X-API-Key` header; SDK includes key automatically |
| `429` | Rate Limited — too many requests | Max 10 requests per minute per API key; wait and retry |
| `500` | Internal Server Error | Transient; retry after brief delay |

## State Transition Errors

If you get `"Invalid transition"`, use this table to verify allowed transitions:

| From State | Allowed Transitions | Who Can Transition |
|------------|--------------------|--------------------|
| `INITIATED` | `QUOTED`, `COMMITTED` (via `linkEscrow`), `CANCELLED` | Requester |
| `QUOTED` | `COMMITTED` (via `linkEscrow`), `CANCELLED` | Requester |
| `COMMITTED` | `IN_PROGRESS`, `CANCELLED` | Provider (IN_PROGRESS), Either (CANCELLED) |
| `IN_PROGRESS` | `DELIVERED`, `CANCELLED` | Provider (DELIVERED), Either (CANCELLED) |
| `DELIVERED` | `SETTLED`, `DISPUTED` | Either (SETTLED after dispute window), Requester (DISPUTED) |
| `DISPUTED` | `SETTLED`, `CANCELLED` | Admin only (V1) |
| `SETTLED` | — (terminal) | — |
| `CANCELLED` | — (terminal) | — |

## Debugging Checklist

When an error occurs, check in this order:

1. **Correct network?** — `actp config --json | jq '.network'`
2. **SDK version?** — `npm ls @agirails/sdk` (must be >=2.3.1 for mainnet)
3. **Wallet exists?** — `ls .actp/keystore.json`
4. **USDC balance?** — `actp balance --json`
5. **Transaction state?** — `actp tx status <id> --json`
6. **RPC reachable?** — `curl -s https://sepolia.base.org -o /dev/null -w '%{http_code}'`
