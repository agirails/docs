---
slug: /security/testing
title: "Testing depth"
description: "486 Foundry tests (unit + fuzz) on contracts, Hypothesis stateful exerciser on the SDK lifecycle state machine, cross-SDK byte-identical EIP-712 parity, live Base Sepolia integration suite gated before every release."
schema_type: TechArticle
last_verified: 2026-05-26
verified_against: "actp-kernel V3 + @agirails/sdk@4.0.0 + agirails@3.0.1"
tags: [security, testing, foundry, hypothesis, ci]
sidebar_position: 5
---

# Testing depth

Defensive testing is what catches bugs **before** they're deployed. Here's what the test suite actually covers — at every layer from formal proof down to packaging smoke.

## Formal verification — sheaf cohomology

The structural layer. ACTP's state machine is modeled as a **cellular sheaf**, and the first cohomology group **H¹ = 0** on the state sheaf after 2-cell refinement — reproducible from a YAML spec via `h1_engine.py`.

| Tool | What it does |
|---|---|
| `h1_engine.py` | Computes H⁰, H¹, H² over ℚ (exact rational arithmetic, no floating-point) from a YAML protocol spec |
| `h1_lint.py` | CI gate — fails the build if a kernel change regresses H¹ |

This catches a class of issue that no audit, test suite, or model checker addresses: **whether the protocol's local state at each step composes into one globally consistent picture**. Audits check code-level safety. Tests check behavior. Sheaf cohomology checks the **shape of the state space itself**.

To our knowledge, ACTP is the first agent-commerce protocol to apply sheaf cohomology to settlement verification. See [formal verification](/security/formal-verification) for the full mathematical treatment + reproducibility path.

## Smart contracts — Foundry

[github.com/agirails/actp-kernel](https://github.com/agirails/actp-kernel)

| Test type | Count | What it covers |
|---|---|---|
| Unit tests | ~400 | Every public function, every revert path, every event emission |
| Fuzz tests | ~50 | Property-based inputs across bounded ranges (fees, amounts, addresses) |
| Invariant tests | ~30 | Sequence-of-calls scenarios that must hold across any random op order |
| Echidna fuzz | continuous | Vault solvency invariant (`vault balance ≥ sum(active escrows)`) under random adversarial sequences |

Total: **486 tests** passing on V3 mainnet code. CI runs the full suite on every PR; merges are blocked on red.

### What the invariant tests assert

- **Escrow solvency** — `EscrowVault.usdc.balanceOf(vault) >= sum(escrows[t].amount for t in active)` after any reachable sequence of kernel calls.
- **State-machine integrity** — terminal states (SETTLED, CANCELLED) are sticky; once reached, no further transition.
- **Fee bound** — `platformFeeBps ≤ 500` always; admin updates revert above the cap.
- **Bond locking** — `disputeBondBpsLocked` for any tx never changes after its `INITIATED` transition.
- **Mediator authority** — only the active mediator (post-timelock, post-approval) can resolve disputes.

These are the **three critical invariants** (escrow solvency, state-machine integrity, fee bounds) referenced from [CLAUDE.md](/protocol) — checked continuously, not just at release time.

## SDK — Hypothesis stateful + cross-boundary parity

### Hypothesis stateful exerciser (Python SDK)

`hypothesis` runs random sequences of agent operations against the SDK's mock runtime to catch state-machine edge cases the unit tests miss:

- **~600 random op sequences per CI run** — combinations of create, accept, link, transition, cancel, dispute, settle.
- **Terminal-state-sticky invariant** — once SETTLED or CANCELLED, no operation succeeds against that txId.
- **Shrinking on failure** — Hypothesis automatically minimizes any failing sequence to the smallest reproducer.

When the stateful suite finds a bug, it produces a deterministic minimal sequence that's added as a regression test.

### Cross-SDK byte-identical EIP-712 parity

Both SDKs sign EIP-712 typed data for AIP-2.1 counter-offers, Web Receipts, and x402 payment authorizations. The CI gate before every release verifies:

- A `CounterOffer` signed by the TS SDK verifies in the Python SDK with the same recovered signer.
- A `CounterAccept` signed by Python verifies in TS.
- Same for Web Receipt signatures.
- Same for x402 payment authorizations.

Test fixtures: [tests/fixtures/cross_sdk](https://github.com/agirails/sdk-python/tree/main/tests/fixtures/cross_sdk).

A byte-level divergence in EIP-712 encoding would be silent (signatures still verify but produce different recovered addresses) — without this gate, one SDK could quietly produce messages the other can't verify, breaking inter-agent commerce.

## Live network integration

The SDK CI runs a **live Base Sepolia integration suite** before any release:

| Test scenario | What it proves |
|---|---|
| Full lifecycle (create → quote → commit → in-progress → delivered → settled) | Every state transition works against the real kernel |
| Smart Wallet UserOp via Coinbase Paymaster | `wallet=auto` actually settles gasless against the production paymaster |
| Web Receipt upload + fetch | IPFS round-trip via Filebase/Pinata works |
| EAS attestation publish | Real attestation appears on-chain |
| Dispute flow with bond posting | AIP-14 bond mechanics work end-to-end |

This suite gates publication. Releases fail-closed if Sepolia integration breaks for any reason — including upstream Sepolia outages — because we can't ship a release we couldn't actually verify.

## Installed-wheel smoke harness

After packaging (`pip install`, `npm install`), the wheel-installed entry points are smoke-tested:

- `import agirails; from agirails import Agent` — covers re-exports
- `npx actp --help` — covers CLI binary registration
- `from agirails import create_app` — caught the missing-surface gap during the 3.0 release cycle

This is cheap (~5s per package) and catches a class of bugs unit tests miss entirely.

## What the test suite does NOT cover

- **Mainnet-only edge cases** — anything that only manifests on production traffic patterns (e.g., specific gas-price scenarios on Base mainnet during congestion). Mitigated by careful staged rollouts, not full coverage.
- **Long-time-horizon attacks** — e.g., griefing strategies that take days/weeks to manifest. Out of scope for unit testing; addressed at the threat-model level.
- **Coordinated multi-party attacks** — adversarial scenarios involving N>2 parties acting in concert. Some are covered by Hypothesis stateful, but exhaustive coverage of N-party scenarios isn't tractable.
- **External-dependency drift** — if Coinbase's Smart Wallet factory changes behavior between audits, our tests pinned to a known-good factory might not catch it. Mitigated by checking the factory address + version on every release.

## How to re-run the suite yourself

For verification:

```bash
# Smart contracts (assumes Foundry installed)
git clone https://github.com/agirails/actp-kernel
cd actp-kernel
forge test -vvv
# Expected: 486 tests passing

# TypeScript SDK
git clone https://github.com/agirails/sdk-js
cd sdk-js
npm install && npm test

# Python SDK
git clone https://github.com/agirails/sdk-python
cd sdk-python
pip install -e ".[dev]"
pytest
```

Any failure is either a bug in your local environment or a regression — either way, please report.

## See also

- [Audits](/security/audits) — what external review covered beyond automated tests
- [Verified contracts](/security/contracts) — Sourcify EXACT_MATCH proof
- [Threat model](/security/threat-model) — what these tests are designed to prove
- [Disclosure](/security/disclosure) — how to report a bug the suite missed
