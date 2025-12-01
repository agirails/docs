---
slug: devlog-1-building-payment-rails
title: "Dev Log #1: Building the Payment Rails for AI Agents"
authors: [agirails]
tags: [devlog]
date: 2025-11-29
---

Welcome to the first AGIRAILS dev log. We're building the payment infrastructure for the AI agent economy - think Stripe, but for autonomous agents paying each other. This week, we laid the foundation.

<!-- truncate -->

## This Week's Highlights

- Documentation site launched at docs.agirails.io
- SDK architecture complete with ACTPClient, Kernel, and Escrow modules
- Smart contracts implementing the 8-state transaction lifecycle
- Documentation automation system with specialized agents

## What We Shipped

### Documentation Site

Built with Docusaurus, fully branded with AGIRAILS styling (cyan #00E4E4 on dark). The site includes:

- **Quick Start**: Get from zero to first transaction in 15 minutes
- **Core Concepts**: Understanding ACTP protocol and the 8-state lifecycle
- **SDK Reference**: TypeScript SDK documentation (in progress)
- **Updates Section**: Where you're reading this!

Live at [docs.agirails.io](https://docs.agirails.io)

### SDK Structure

The `@agirails/sdk` package is architecturally complete:

```typescript
import { ACTPClient } from '@agirails/sdk';

// Factory pattern initialization
const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY
});

// Protocol modules
client.kernel   // Transaction creation, state transitions
client.escrow   // Fund management
client.events   // Blockchain event monitoring
client.messages // EIP-712 message signing
client.proofs   // Content hashing and delivery proofs
```

### Smart Contracts (Live on Testnet!)

`ACTPKernel.sol` and `EscrowVault.sol` are deployed and verified on Base Sepolia:

- **ACTPKernel**: [0x6aDB650e185b0ee77981AC5279271f0Fa6CFe7ba](https://sepolia.basescan.org/address/0x6aDB650e185b0ee77981AC5279271f0Fa6CFe7ba)
- **EscrowVault**: [0x921edE340770db5DB6059B5B866be987d1b7311F](https://sepolia.basescan.org/address/0x921edE340770db5DB6059B5B866be987d1b7311F)
- **MockUSDC**: [0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb](https://sepolia.basescan.org/address/0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb)

The contracts implement:

**8-State Transaction Lifecycle**:
1. INITIATED → Transaction created
2. QUOTED → Provider submits price (optional)
3. COMMITTED → Escrow linked, work begins
4. IN_PROGRESS → Provider signals active work (optional)
5. DELIVERED → Work complete with proof
6. SETTLED → Payment released (terminal)
7. DISPUTED → Conflict requires resolution
8. CANCELED → Transaction aborted (terminal)

**Key Features**:
- 1% platform fee with $0.05 minimum
- Non-custodial escrow with 2-of-3 multisig pattern
- Pausable for emergency controls
- Time-delayed economic parameter changes

### Documentation Automation

Created specialized agents for maintaining docs:

- **Docs Writer Agent**: Creates and updates documentation pages
- **Updates Writer Agent**: Writes blog posts, release notes (this post!)
- **Hook System**: Automatic doc generation on SDK/contract changes

This dev log was written by an agent from a template. Meta.

## What We Learned

**Gas optimization is harder than expected**. Our initial `createTransaction` implementation cost 95k gas. After struct packing and storage optimization, we're down to 85k. Target is 70k.

The lesson: Every storage slot matters on L2. Even with cheap gas, 15k gas savings × 1M transactions = meaningful cost reduction.

**Testing surface area is massive**. With 8 states and multiple transition paths, the edge cases multiply fast:
- Time-based edge cases (deadline exactly at block.timestamp)
- Amount edge cases (minimum $0.05, fee rounding)
- Access control (who can call what state transition)
- Escrow solvency invariants

Fuzz testing is not optional - it's the only way to catch these.

## Challenges

**Current blockers**:

1. **Gas optimization**: 85k → 70k requires deeper struct packing or removing redundant state variables
2. **Test coverage**: At 87%, need 90%+ before audit-ready
3. **EAS integration**: Proof anchoring to Ethereum Attestation Service still in design phase

**Technical debt**:
- Need comprehensive error message standardization
- SDK needs retry logic for RPC failures
- Documentation needs more code examples

## Coming Up

Next week's roadmap:

- [ ] Write first tutorial: "Build a Provider Agent in 30 Minutes"
- [ ] Complete core documentation pages (concepts, guides)
- [ ] Add more SDK code examples to docs
- [ ] Publish SDK to npm registry
- [ ] Create testnet faucet for mUSDC

## Numbers

| Metric | Value |
|--------|-------|
| Smart contract tests | 176 passing |
| Test suites | 10 |
| Gas per transaction | ~85,000 |
| Docs pages | 2 (more coming!) |
| SDK protocol modules | 7 |

## Why This Matters

AI agents are already starting to transact with each other - paying for API access, compute resources, data. But they're using human payment systems (Stripe APIs, PayPal) that weren't designed for autonomous, high-frequency microtransactions.

AGIRAILS is building the native payment layer for this new economy:
- **Neutral**: Works with any agent framework (AutoGPT, LangChain, custom)
- **Trustless**: Blockchain escrow, no intermediary custody
- **Fast**: 2-second L2 blocks, 2-day dispute windows (not 180 days like PayPal)
- **Cheap**: 1% fee vs 2.9% Stripe

We're still early, but the foundation is solid.

## Community

Join us as we build in public:

- **Discord**: [https://discord.gg/nuhCt75qe4](https://discord.gg/nuhCt75qe4) - Daily updates, technical discussions
- **X/Twitter**: [@agirails](https://x.com/agirails) - Announcements and milestones
- **GitHub**: [github.com/agirails](https://github.com/agirails) - Code, issues, contributions

Questions? Feedback? Drop by Discord. We'd love to hear what you're building.

---

See you next week. LFG.
