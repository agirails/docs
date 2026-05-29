---
slug: /protocol/design-decisions
title: "Design decisions: why ACTP looks the way it does"
description: "First-principles rationale behind the load-bearing ACTP design choices: why USDC, why Base L2, why a DAG state machine, why ERC-4337 Smart Wallets, why on-chain escrow, why a 1% / $0.05 fee with a 5% kernel cap, why ERC-8004 for identity, why off-chain receipts with on-chain hashes."
schema_type: TechArticle
last_verified: 2026-05-29
stability: stable
last_breaking_change: 2026-05-19
tags: [protocol, design, rationale, first-principles]
sidebar_position: 11
---

# Design decisions: why ACTP looks the way it does

Each of the choices below is load-bearing: change it and the protocol stops doing the work it claims to do. None of them are obvious from looking at the kernel source. This page is the rationale a reader or agent needs when a judgment call hits the edge of what the recipes cover.

The structural test every choice has to pass: **if the AGIRAILS team disappeared tomorrow, would settlement still execute correctly?** See [walk-away runbook](/architecture/operate) for the auditable property; the choices below are how we earn it.

## Why on-chain escrow

The alternative is off-chain escrow (a custodial third party holds funds until both sides agree). Off-chain escrow is operationally simpler and was the default in pre-2024 agent-payment experiments. ACTP rejected it for three reasons:

1. **Custodial counterparty risk.** Whoever holds the USDC can freeze it. ACTP's whole pitch is "no one owns the rails"; an off-chain escrow service IS someone owning the rails.
2. **Auditability.** An on-chain escrow position is verifiable by anyone with an RPC endpoint. Off-chain positions are auditable only by people the operator chooses to show.
3. **Walk-away.** If the AGIRAILS team disappears, the on-chain [EscrowVault](/reference/glossary#escrowvault) keeps releasing funds correctly per the deployed bytecode. No human action required.

The cost is gas. We bound that separately via [ERC-4337](#why-erc-4337-smart-wallets) so the user never pays gas in ETH.

## Why USDC (not native ETH, not a stablecoin basket)

USDC was chosen as the **single** settlement currency at V1. Three reasons:

1. **Stable unit of account.** Agents quote prices and consumers budget in dollars; a $1 quote should still mean $1 between quote and settlement. ETH volatility makes price comparison across providers noisy.
2. **Existing rails.** Circle issues USDC natively on Base. Most stablecoin protocols ride on a single issuer they don't control; USDC's issuer is Circle, and Circle is the regulated party we'd rather depend on than DAI / FRAX governance.
3. **Conservatism wins at V1.** "Multi-currency at V1" is a feature an integrator can ask for once V1 lands. "Multi-currency at V1 that nobody actually uses" is a constraint we'd have to maintain forever. We opt for the smaller surface.

Adding a stablecoin later is additive; removing USDC support would be a hard break. We chose the conservative starting point.

## Why Base L2 (not Ethereum L1, not another L2)

Base is Coinbase's L2 on the OP Stack. ACTP needed:

- **Low gas, predictable.** Per-agent transactions are sub-dollar opex; L1 gas would burn the unit economics. OP-stack chains have predictable fees during normal load.
- **Native USDC.** Base has Circle-issued USDC natively, not a bridged wrapper. Bridged USDC creates failure modes (bridge compromise, peg drift) we don't want in the trust path.
- **Smart Wallet ecosystem.** Coinbase Smart Wallet, Pimlico bundlers, Stackup, ZeroDev all support Base as a first-class target. Paymaster sponsorship works out of the box. See [gasless payment](/recipes/gasless-payment).
- **Sourcify availability.** Our contract verification path (Sourcify EXACT_MATCH) works on Base. We could re-verify on any other L2 in principle; Base is where it works today.

We're not married to Base. ERC-8004 identity is explicitly cross-chain. If another L2 makes more sense for a specific deployment, the protocol design ports cleanly; the kernel doesn't depend on Base-specific opcodes. V1 ships on Base because Base is where the ecosystem already is.

## Why a DAG state machine (not events, not free-form transitions)

ACTP's 8-state DAG is enforced in the kernel: `INITIATED → {QUOTED, COMMITTED, CANCELLED}`, `COMMITTED → {IN_PROGRESS, CANCELLED}`, and so on. The alternative is an event log without enforced ordering ("provider claims delivery", "requester claims dispute"); state composes from interpretation.

We chose DAG-enforcement-in-kernel because:

1. **One reading per transaction.** Without DAG enforcement, two clients can disagree about whether a transaction is currently `DELIVERED` or `IN_PROGRESS`. With DAG enforcement, they can't: the kernel rejects any transition that doesn't fit the graph.
2. **Formal verifiability.** The state sheaf has been verified to have **[H¹ = 0](/reference/glossary#h-0)** (cellular sheaf cohomology), meaning every local state composes into one globally consistent picture with no hidden seam. This proof requires the DAG; an event log has no such property. See [formal verification](/security/formal-verification).
3. **Walk-away.** A new team rebuilding from the kernel source recovers the full protocol semantics from the state machine alone. An event log requires re-deriving the interpretation rules.

The cost is rigidity: adding a new state requires a contract upgrade. We treat that as a feature, not a bug. See [Vitalik's note on protocol simplicity](https://vitalik.ca/general/2024/05/17/decentralization.html) for the broader frame.

## Why ERC-4337 Smart Wallets (not EOAs)

ACTP uses Coinbase Smart Wallet (ERC-4337) as the default wallet shape, with EOA as a fallback. The reasons:

1. **Gasless.** [Paymaster](/reference/glossary#paymaster) sponsorship lets the user pay in USDC; no ETH balance required. This is the difference between "build an integration" and "have your CFO buy ETH first."
2. **Recovery.** Smart Wallet supports passkey-based recovery. EOAs need seed-phrase custody, which is a UX cliff for non-crypto users.
3. **Batched ops.** `acceptQuote + linkEscrow` are bundled into one UserOp; the gas savings are non-trivial and the atomicity matters (no half-committed state).

The fallback to EOA exists for environments where ERC-4337 infrastructure isn't available (early L2 deployments, custom rollups, contracts deployed before Smart Wallet support landed). See [gasless payment](/recipes/gasless-payment) for the dual-provider failover (Coinbase primary, Pimlico backup).

## Why 1% / $0.05 fee with a 5% kernel cap

The fee model is **1% platform fee** with a **$0.05 minimum** per transaction, **capped at 5% in the kernel**. Three layers:

- **1% is the rate.** Industry rates for payment processors sit at 2–3% (Stripe ~2.9% + $0.30, Visa 1.5–2.5%, PayPal 2.9%). Agent-to-agent has lower fraud risk than card-present, so 1% covers our cost structure with margin and leaves money on the table for agents.
- **$0.05 minimum.** Below ~$5 per transaction, 1% doesn't cover the gas we sponsor (paymaster cost on Base). $0.05 keeps small transactions sustainable for the protocol without breaking sub-cent x402 flows (which have zero protocol fee on mainnet).
- **5% kernel cap.** The fee is configurable by admin within bounds. The kernel hard-caps the configurable max at 5%, so no governance attack and no operator error can lift fees above that. With a 2-day timelock on fee changes, an integrator has time to react if fees move.

The kernel cap is the load-bearing piece. It's the invariant that lets us say "1% is bounded" rather than "1% is current policy". See [fees](/protocol/fees) and [INV-30](/reference/glossary#inv-30).

## Why ERC-8004 for identity (not DIDs alone, not just wallet addresses)

Agents need a portable identity that:

- Travels across L2s (reputation earned on Base shouldn't be stranded if the agent later operates on a different chain).
- Resolves to the same canonical entity from any chain.
- Doesn't depend on any single registry.

[ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) is the cross-chain agent identity standard. It gives an agent a single canonical ID resolvable across chains via deterministic registry contracts. AGIRAILS uses ERC-8004 IDs in transaction views to enable cross-chain reputation aggregation. See [identity](/protocol/identity).

DIDs (per the W3C standard) are a richer identity surface but require off-chain resolution infrastructure (DID resolvers) that varies in trust. We use DID-formatting helpers for wallet-based identifiers (the slug is essentially a `did:agirails:` prefix) but the load-bearing identity is the on-chain ERC-8004 record.

A plain wallet address would work too, but agents often want a stable identity that survives wallet rotation. ERC-8004's per-agent registry record decouples identity from any specific wallet.

## Why off-chain receipts with on-chain hashes

The transaction's deliverable (the actual output the provider produced for the requester) is published as a **Web Receipt** to IPFS via Filebase, with **only the hash anchored on-chain** in the [EAS](/reference/glossary#eas) attestation. The alternatives:

1. **Full payload on-chain.** Blockchains are bad at large payloads. Gas costs scale linearly; cheap L2 is still expensive for kilobytes. A 10 KB summary would cost more in gas than the agent earned.
2. **Off-chain only, no anchor.** Then the receipt is repudiable: the provider can later claim "that's not what I delivered". With a hash on-chain, the provider's delivery attestation pins what they signed for; tampering is detectable.

The on-chain hash is the load-bearing piece. The actual payload lives where storage is cheap (IPFS), but the chain has a tamper-evident pointer. See [Web Receipts](/protocol/web-receipts) and [receipts + discovery](/recipes/receipts-and-discovery).

## Why dispute bonds (not free-to-dispute, not arbitrary friction)

Either party can dispute a `DELIVERED` transaction, but disputing **costs a bond**: `max(amount × 5%, $1 USDC)`. The bond returns per fault attribution after the mediator resolves. See [AIP-14](/reference/glossary#aip-14).

Free disputes get spam-disputed (a buyer who didn't like the result disputes everything to extract refunds). Arbitrary friction (require a stake of 100 USDC) excludes small-value transactions where the dispute itself costs more than the transaction.

The 5%-or-$1 floor balances:
- **High-value transactions**: the 5% scales with stakes, so disputing a $1000 transaction costs $50, enough that you only do it when you mean it.
- **Low-value transactions**: the $1 minimum keeps disputes possible at micropayment scale while still requiring proportional skin in the game.

The bond is locked in the kernel at `createTransaction` time per [INV-30](/reference/glossary#inv-30); it can't be changed mid-flight, so a mediator can't be coerced to retroactively raise the bar.

## Why MCP for discovery (not SDK-first)

Service-name discovery is not exposed at the V1 Agent class level. The canonical path is the [MCP `discoverAgents` tool](/reference/mcp-tools); the SDK has fallback access to the underlying registry. See [discovering agents](/recipes/receipts-and-discovery#discovering-agents) for the full breakdown.

The reasoning: discovery is a search problem (on-chain query + freshness + ranking + reputation overlay). That work belongs in one place, not duplicated across every SDK consumer. The MCP server abstracts it; SDK consumers can fall back to the raw registry query when MCP isn't available. Agent-first design says the primary user is an LLM, and LLMs natively speak MCP.

A first-class `agent.discover()` is on the V2 roadmap once the ranking heuristics stabilize.

## Why "invariants > features"

A recurring choice across the kernel: when we could add a feature OR add an invariant, we add the invariant. Examples:

- We didn't add per-transaction-tier fee discounts (a feature). We added the 5% kernel cap (an invariant).
- We didn't add a richer dispute resolution UI (a feature). We added the per-transaction-locked dispute bond at creation time (an invariant: INV-30).
- We didn't add a built-in budget enforcer (a feature). We left budget enforcement at the application layer, where it can be expressive (an invariant: the SDK enforces transition correctness, not application policy).

Invariants are properties an auditor can verify without running the code. Features are surface area we have to maintain. We optimize for surface that has to stay correct for a hundred years; features come from the SDK + recipe layer, where iteration is cheap.

See [CLAUDE.md `.claude-docs/invariants.md`](https://github.com/agirails/agirails/blob/main/.claude-docs/invariants.md) for the full invariant catalog.

## See also

- [/why](/why): the paradigm framing (open trust rails, non-custodial settlement, service thesis)
- [/architecture/operate](/architecture/operate): the walk-away runbook (the property these choices earn)
- [/security/formal-verification](/security/formal-verification): H¹ = 0 proof on the state sheaf
- [/protocol/state-machine](/protocol/state-machine): the DAG these choices enforce
- [/protocol/escrow](/protocol/escrow): EscrowVault contract + INV-30
- [/protocol/fees](/protocol/fees): the 1% / $0.05 / 5%-cap model
- [/protocol/identity](/protocol/identity): ERC-8004 cross-chain ID
