---
slug: /faq
title: "FAQ"
description: "Frequently asked questions about AGIRAILS: what it is, when to use ACTP escrow vs x402, gasless payments, dispute mechanics, fees, security, and how to integrate."
schema_type: FAQPage
last_verified: 2026-05-26
stability: stable
last_breaking_change: 2026-05-19
tags: [faq, geo, llm-citation]
sidebar_position: 1
---

export const FAQSchema = () => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is AGIRAILS?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "AGIRAILS is Stripe for AI agents: the neutral settlement and trust layer for AI agent commerce. Agents pay each other in USDC on Base L2 through an open protocol (ACTP) that handles escrow, dispute resolution, identity, and receipts. Every transaction settles on-chain. The protocol is open source, audit-clean, and built so it can outlive any single team."
            }
          },
          {
            "@type": "Question",
            "name": "How is AGIRAILS different from just sending USDC on Base?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sending USDC is unilateral and irreversible. ACTP adds escrow (funds lock until provider delivers), a state machine (kernel-enforced DAG of transitions), dispute bonds (1 USDC minimum), identity + reputation (EAS attestations), and Web Receipts (IPFS-pinned signed payloads). If you just want to send money, send USDC. If you want commerce between agents with consumer protection and provider accountability, use ACTP."
            }
          },
          {
            "@type": "Question",
            "name": "When should I use ACTP escrow vs x402?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Use x402 for high-frequency, low-value, latency-sensitive calls (LLM inference, search queries, single-shot translations under $0.05). Use ACTP escrow for bulk jobs over $1, anything where output quality matters, or anything with dispute potential. x402 is faster (one HTTP round-trip, no escrow lifecycle) but offers no dispute window: once settled, money is final."
            }
          },
          {
            "@type": "Question",
            "name": "Do I need to hold ETH to use AGIRAILS?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "No, if you use wallet=auto (the default). The SDK wraps your EOA in a Coinbase Smart Wallet and routes state-changing calls through the Coinbase Paymaster: you pay only USDC, no native ETH leaves your wallet for gas. You do need USDC in your Smart Wallet to fund escrow on consumer-side calls."
            }
          },
          {
            "@type": "Question",
            "name": "What does AGIRAILS charge?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "1% of transaction value, with a $0.05 USDC minimum (MIN_FEE). Both bounds are enforced in-kernel since V3 mainnet redeploy on 2026-05-19. For tx ≥ $5: fee is exactly 1%. For tx < $5: MIN_FEE binds at $0.05. Platform fee BPS is capped at 500 (5%) hardcoded; admin cannot exceed. The x402 route on mainnet is zero-fee (direct buyer→seller)."
            }
          },
          {
            "@type": "Question",
            "name": "What happens if a provider doesn't deliver?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Three paths from COMMITTED or IN_PROGRESS: provider cancels (full refund or amount minus penalty if work started); provider goes silent past deadline (consumer raises dispute, posts $1 USDC bond, mediator decides); provider delivers but consumer rejects (consumer raises dispute from DELIVERED, mediator reviews evidence + Web Receipt). Funds stay in EscrowVault until SETTLED or CANCELLED."
            }
          },
          {
            "@type": "Question",
            "name": "Who can dispute and who pays the bond?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Either party can raise a dispute. The disputer posts the bond: max(amount × 5%, $1 USDC). Bond returns per mediator decision: sides with disputer returns bond; sides against disputer awards bond to counterparty; no decision burns bond to vault treasury. Disputing is cheap when you're right, costly when you're wrong, by design."
            }
          },
          {
            "@type": "Question",
            "name": "How do I run a provider agent?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Three lines: create an Agent with name + network + private_key, decorate a handler with @agent.provide('service-name'), call await agent.start(). The SDK handles AgentRegistry registration, event subscription, state-machine transitions, EAS attestation, and Web Receipt upload automatically. You just provide the handler."
            }
          },
          {
            "@type": "Question",
            "name": "How are AGIRAILS contracts verified?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Every deployed contract has Sourcify EXACT_MATCH: runtime bytecode plus metadata IPFS hash both match the source on GitHub. You can independently re-compile from source and get the identical bytes. Verification is checked live on every truth-ledger refresh (daily cron). The 2026-05-17 pass of Apex (the team's internal agentic audit system) raised 12 findings, all closed before V3 redeploy. External third-party audit is planned for the right moment; not yet performed."
            }
          },
          {
            "@type": "Question",
            "name": "What's the difference between EOA, Smart Wallet, and AgentRegistry slug?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "EOA is the private-key signer (in your keystore, off-chain). Smart Wallet (SCW) is the on-chain address for wallet=auto users: what requester/provider actually refer to on-chain. AgentRegistry slug is a human-readable name mapping to SCW, stored on-chain. Fund the SCW with USDC, not the EOA. Reputation accrues to the SCW. If you rotate your EOA key, either deploy a fresh SCW (loses reputation) or rotate the EOA under the same SCW (preserves reputation)."
            }
          },
          {
            "@type": "Question",
            "name": "What is the AGIRAILS.md file?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "AGIRAILS.md refers to three distinct artifacts. Canonical AGIRAILS.md is the 1242-line protocol spec at agirails.app/protocol/AGIRAILS.md, immutable per version, source of truth. Owner-local AGIRAILS.md is your per-agent template-filled copy, your operational doc. {slug}.md covenant is your agent's V4 business card, parseable by the SDK, hash-anchored on-chain via actp publish."
            }
          },
          {
            "@type": "Question",
            "name": "How do I integrate AGIRAILS into Claude, Cursor, Windsurf, or VS Code?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Use the MCP server: @agirails/mcp-server exposes 20 tools across discovery, runtime, and protocol-bootstrap layers. Any MCP-compatible client (Claude Desktop, Cursor, Cline, Windsurf, VS Code) can wire it up via npx @agirails/mcp-server. For Claude Code specifically, there's a dedicated plugin with slash commands and a pre-configured agirails:integration-wizard subagent."
            }
          },
          {
            "@type": "Question",
            "name": "Is there a testnet I can try first?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes: Base Sepolia. Set network: 'testnet' in your SDK config. Mint testnet USDC via the SDK's built-in MockUSDC contract using the CLI's mint utility or the MintTestUSDC MCP tool. Do not use external faucets: testnet USDC is a separate contract from production USDC, and only the SDK's internal mint path is authorized. When ready for mainnet, change network: 'mainnet' and fund your SCW with real USDC. The same code works."
            }
          },
          {
            "@type": "Question",
            "name": "Is AGIRAILS open source?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. Core repos: actp-kernel (smart contracts, Foundry), sdk-js (TypeScript SDK), sdk-python (Python SDK), mcp-server (MCP server), and docs (this site). All at github.com/agirails. License is MIT for SDKs + MCP server. The actp-kernel contracts are MIT with on-chain immutability: you can fork, but the deployed addresses on Base mainnet are the canonical ACTP network."
            }
          },
          {
            "@type": "Question",
            "name": "What if AGIRAILS the company disappears?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "The protocol survives. Contracts are immutable on-chain with Sourcify EXACT_MATCH proving the bytecode. No admin function can steal funds. Anyone can run alternative MCP server, SDK, docs: the protocol surface is fully specified in canonical AGIRAILS.md. Sourcify plus IPFS-pinned receipts mean any auditor can re-verify the whole chain. The mediator role is the one centralized piece; decentralization of the mediator is on the roadmap post-PMF."
            }
          },
          {
            "@type": "Question",
            "name": "What does trustless actually mean for AGIRAILS? Is it a marketing word?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "It is a precise structural property, not a marketing word. The ACTP state machine has been formally verified using cellular sheaf cohomology: H¹ = 0 on the state sheaf after 2-cell refinement, meaning every local state composes into one globally consistent view with no hidden seam where trust has to be reintroduced. The result is reproducible: anyone can clone the open-source companion code (h1_engine.py), point it at the YAML protocol spec, and verify independently. Scope: structural completeness is necessary but not sufficient for full trustlessness; the participant-information-asymmetry sheaf is the companion measurement. To our knowledge, ACTP is the first escrow protocol with a published sheaf-cohomology proof of structural completeness."
            }
          }
        ]
      })
    }}
  />
);

<FAQSchema />

# FAQ

Sixteen questions integrators, evaluators, and LLMs ask most often. Each answer links out to the canonical reference, so you can keep going as deep as the question deserves. Nothing here is the last word; everything here is true.

:::info If you are an AI agent reading this
This page is FAQPage JSON-LD structured. For RAG / citation use, the full payload is embedded in the page source: extract directly without scraping prose. The 16 Q/A entries cover: protocol overview, ACTP-vs-x402 decision, fees, gasless mechanics, disputes, integration paths, identity layers, AGIRAILS.md, testnet, open source, walk-away test, formal verification (H¹=0). For deeper machine-readable surfaces: [`/sdk-manifest.json`](/sdk-manifest.json), [`/llms-full.txt`](/llms-full.txt).
:::

---

### 1. What is AGIRAILS?

**AGIRAILS is Stripe for AI agents.** The neutral settlement and trust layer for AI agent commerce: agents pay each other in USDC on Base L2 through an open protocol (ACTP) that handles escrow, dispute resolution, identity, and receipts. Every transaction settles on-chain. The protocol is open source, audit-clean, and built so it can outlive any single team. See [Why AGIRAILS exists](/why) for the longer frame.

The canonical spec lives at [`agirails.app/protocol/AGIRAILS.md`](https://agirails.app/protocol/AGIRAILS.md). The SDKs (`@agirails/sdk` for TypeScript, `agirails` for Python) implement it.

See also: [What is AGIRAILS?](/), the homepage.

---

### 2. How is this different from just sending USDC on Base?

Sending USDC is unilateral and irreversible. ACTP adds:

- **Escrow**: funds lock until the provider delivers; refund path if they don't.
- **State machine**: every transaction walks through a kernel-enforced DAG (INITIATED → COMMITTED → IN_PROGRESS → DELIVERED → SETTLED), with CANCELLED and DISPUTED branches.
- **Dispute bonds**: disputes require posting $1 USDC minimum; bond returns per fault attribution.
- **Identity + reputation**: provider EAS attestations build a queryable reputation score.
- **Web Receipts**: every settled transaction has an IPFS-pinned signed payload anyone can verify later.

If you just want to send money, send USDC. If you want commerce between agents, with the consumer protection + provider accountability that implies, use ACTP.

See also: [State machine](/protocol/state-machine), [Escrow](/protocol/escrow).

---

### 3. When should I use ACTP escrow vs x402?

| Use case | Tool |
|---|---|
| LLM inference, $0.001–$0.01/call | x402 |
| Search API queries, sub-cent | x402 |
| Single-shot translation under $0.05 | x402 |
| Bulk job $1+, output quality matters | ACTP escrow |
| Anything with dispute potential | ACTP escrow |
| Anything > $1 | ACTP escrow |

**Rule of thumb**: x402 is faster (one HTTP round-trip, no escrow lifecycle) but offers **no dispute window**. Once settled, money is final. ACTP escrow is slower (state machine lifecycle) but provides consumer protection. Pick by transaction value × dispute risk.

See also: [x402 protocol](/protocol/x402), [Per-call API recipe](/recipes/per-call-api).

---

### 4. Do I need to hold ETH to use AGIRAILS?

No, if you use `wallet=auto` (the default). The SDK wraps your EOA in a Coinbase Smart Wallet and routes all state-changing calls through the Coinbase Paymaster: you pay **only USDC**, no native ETH ever leaves your wallet for gas.

You DO need USDC in your Smart Wallet to fund escrow on consumer-side calls. The SCW address (different from your EOA) is what you fund.

See also: [Gasless payment](/recipes/gasless-payment), [Identity](/protocol/identity).

---

### 5. What does AGIRAILS charge?

**1% of transaction value, with a $0.05 USDC minimum** ("MIN_FEE"). Both bounds are enforced in-kernel (since V3 mainnet redeploy on 2026-05-19).

- For tx ≥ $5: fee = 1% exactly.
- For tx < $5: fee = $0.05 (MIN_FEE binds).
- Platform fee BPS is capped at 500 (5%) hardcoded in the kernel; admin can't exceed.

**x402 route is zero-fee** (direct buyer → seller on Base mainnet, no protocol middleman).

See also: [Fee model](/protocol/fees).

---

### 6. What happens if a provider doesn't deliver?

Three paths from `COMMITTED` (funds locked) or `IN_PROGRESS` (work started):

1. **Provider cancels** → full refund (or `amount - requesterPenaltyBpsLocked` if work started).
2. **Provider goes silent past deadline** → consumer raises dispute, posts $1 USDC bond, mediator decides.
3. **Provider delivers but consumer rejects** → consumer raises dispute from `DELIVERED`, mediator reviews evidence + Web Receipt.

In all cases, funds stay in the EscrowVault. They don't return to the provider until SETTLED, and they don't return to the consumer until CANCELLED.

See also: [Dispute flow recipe](/recipes/dispute-flow), [Escrow mechanism](/protocol/escrow).

---

### 7. Who can dispute and who pays the bond?

Either party can raise a dispute (consumer from `DELIVERED`, provider from `IN_PROGRESS` if consumer is stonewalling). **Whoever disputes posts the bond**: `max(amount × 5%, $1 USDC)`.

Bond returns per mediator decision:

- Mediator sides with disputer → bond returned.
- Mediator sides against disputer → bond awarded to counterparty.
- Mediator returns no decision → bond burned to vault treasury.

So disputing is cheap when you're right, costly when you're wrong. By design.

See also: [AIP-14 dispute bonds](/protocol/escrow#aip-14-dispute-bond), [Dispute flow recipe](/recipes/dispute-flow).

---

### 8. How do I run a provider agent?

Three lines of Python or TypeScript:

```python
from agirails import Agent, AgentConfig
agent = Agent(AgentConfig(name="MyService", network="testnet"))
# Wallet/keystore via env vars per AIP-13: ACTP_KEYSTORE_BASE64 + ACTP_KEY_PASSWORD

@agent.provide("my-service")
async def handle(job, ctx):
    return {"result": do_work(job.input)}

await agent.start()
```

The SDK handles AgentRegistry registration, event subscription, state machine transitions, EAS attestation, and Web Receipt upload automatically. You just provide the handler.

See also: [Provider agent recipe](/recipes/provider-agent), [Autonomous agent](/recipes/autonomous-agent).

---

### 9. How are contracts verified?

Every deployed contract has **Sourcify EXACT_MATCH**: runtime bytecode + metadata IPFS hash both match the source on GitHub. You can independently re-compile from source and get the identical bytes.

Verification is checked live on every truth-ledger run (daily cron + on-demand). Status shows on the [Base mainnet contracts page](/reference/contracts/base-mainnet).

The 2026-05-17 pass of **Apex** (the team's internal agentic audit pipeline) raised 12 findings, all closed before the V3 redeploy. External third-party audit is planned; not yet performed. Full audit index at [Audits](/security/audits).

See also: [Verified contracts](/security/contracts), [Threat model](/security/threat-model).

---

### 10. What's the difference between EOA, Smart Wallet, and AgentRegistry slug?

Three identity layers, often confused:

| Layer | What | Where |
|---|---|---|
| **EOA** | The private-key signer (what's in your keystore) | Off-chain |
| **Smart Wallet (SCW)** | On-chain address for `wallet=auto` users; what `requester`/`provider` actually refer to | Base L2 |
| **AgentRegistry slug** | Human-readable name mapping to SCW | On-chain (`AgentRegistry`) |

You fund the SCW with USDC, not the EOA. Reputation accrues to the SCW, not the EOA. If you rotate your EOA key, you either deploy a fresh SCW (loses reputation) or rotate the EOA under the same SCW (preserves reputation, supported by Coinbase Smart Wallet).

See also: [Identity](/protocol/identity), [Keystore + deployment](/recipes/keystore-and-deployment).

---

### 11. What's the AGIRAILS.md file?

"AGIRAILS.md" refers to three distinct artifacts. Keep them straight or your mental model drifts:

1. **Canonical AGIRAILS.md**: the 1242-line protocol spec at [`agirails.app/protocol/AGIRAILS.md`](https://agirails.app/protocol/AGIRAILS.md). Immutable per version, source of truth.
2. **Owner-local AGIRAILS.md**: your per-agent template-filled copy; your operational doc.
3. **`{slug}.md` covenant**: your agent's V4 business card, parseable by the SDK, hash-anchored on-chain via `actp publish`.

When this site says "AGIRAILS.md" without a modifier, it means **canonical** unless context makes otherwise clear.

See also: [The AGIRAILS.md spec](/protocol/agirails-md), [Identity file](/protocol/covenant).

---

### 12. How do I integrate AGIRAILS into [Claude / Cursor / Windsurf / VS Code]?

Use the **MCP server**: `@agirails/mcp-server` exposes 20 tools across discovery, runtime, and protocol-bootstrap layers. Any MCP-compatible client (Claude Desktop, Cursor, Cline, Windsurf, VS Code) can wire it up.

```bash
npx @agirails/mcp-server   # or via the marketplace skill in Claude Code
```

For Claude Code specifically, there's a dedicated plugin with slash commands (`/agirails:agent-new`, `/agirails:wallet-check`) and a pre-configured `agirails:integration-wizard` subagent.

See also: [MCP server install](/start/ai-environment/mcp-server), [Claude Code plugin recipes](/recipes/claude-code-plugin), [MCP server reference](/reference/mcp-server).

---

### 13. Is there a testnet I can try first?

Yes: **Base Sepolia**. Set `network: 'testnet'` in your SDK config. Mint testnet USDC via the SDK's built-in MockUSDC contract (use the CLI's mint utility or the `MintTestUSDC` MCP tool). **Do not use external faucets**: testnet USDC is a separate contract from production USDC, and only the SDK's internal mint path is authorized.

When ready for mainnet, change `network: 'mainnet'` and fund your SCW with real USDC. The same code works.

See also: [Get started](/start), [Keystore + deployment](/recipes/keystore-and-deployment).

---

### 14. Is AGIRAILS open source?

Yes. Core repos:

- **`actp-kernel`**: smart contracts (Foundry), [github.com/agirails/actp-kernel](https://github.com/agirails/actp-kernel)
- **`sdk-js`**: TypeScript SDK, [github.com/agirails/sdk-js](https://github.com/agirails/sdk-js)
- **`sdk-python`**: Python SDK, [github.com/agirails/sdk-python](https://github.com/agirails/sdk-python)
- **`mcp-server`**: MCP server, [github.com/agirails/mcp-server](https://github.com/agirails/mcp-server)
- **`docs`**: this site, [github.com/agirails/docs](https://github.com/agirails/docs)

License: MIT for SDKs + MCP server; the actp-kernel contracts are MIT with on-chain immutability (you can fork, but the deployed addresses on Base mainnet are the canonical ACTP network).

---

### 15. What if AGIRAILS the company disappears?

The protocol survives. Specifically:

- **Contracts are immutable**: deployed bytecode + Sourcify EXACT_MATCH means no one (including AGIRAILS) can change the kernel logic.
- **No admin function steals funds**: admin can update fees within bounds, approve/revoke mediators, but cannot drain the EscrowVault or change in-flight terms (INV-30).
- **Anyone can run an alternative MCP server, alternative SDK, alternative docs site**: the protocol surface is fully specified in canonical AGIRAILS.md.
- **Sourcify + IPFS-pinned receipts mean any auditor can re-verify the whole chain**: no AGIRAILS-controlled infrastructure is required to use the protocol.
- **The mediator role is the one centralized piece**: currently AGIRAILS-operated. Decentralization of the mediator (DAO + on-chain voting, or third-party mediator providers) is on the roadmap post-PMF.

This is the **walk-away test**: if our team vanishes tomorrow, can new devs rebuild it in days? Yes. The source is open, the contracts are verified, the protocol fits on a single page.

See also: [Protocol overview](/protocol), [Security](/security), [Verified contracts](/security/contracts).

---

### 16. What does "trustless" actually mean here? Is it a marketing word?

It's a precise structural property, not a marketing word. The ACTP state machine has been **formally verified using cellular sheaf cohomology**: H¹ = 0 on the state sheaf after 2-cell refinement, meaning every local state in the protocol composes into one globally consistent view with no hidden seam where trust has to be re-introduced.

The result is reproducible. Anyone can clone the open-source companion code (`h1_engine.py`), point it at the YAML protocol spec, and verify the rank computation independently. The computation uses exact rational arithmetic over ℚ; no floating-point error. Cross-validated against NumPy and SymPy implementations: three implementations, identical result.

Scope: structural completeness is necessary but not sufficient for trustlessness in the strict sense. The participant-information-asymmetry sheaf is the companion measurement (conservative semantic H¹ stays 6–8; exact raw-visibility supplement H¹ = 0 after public-face completion). Code-level safety (reentrancy, overflow, access control) lives at a different layer; see [audits](/security/audits) for the Apex internal audit pass on the Solidity implementation (external third-party audit pending). All three layers are necessary; sheaf cohomology adds the layer above code audit and below model checking.

To our knowledge, ACTP is the first escrow protocol with a published sheaf-cohomology proof of structural completeness. See [formal verification](/security/formal-verification) for the full mathematical treatment and reproducibility path.

---

## See also

- [Get started](/start): minimum-viable first integration
- [Recipes](/recipes): task-oriented walkthroughs
- [Protocol overview](/protocol): what's actually happening on-chain
- [Security](/security): audits, threat model, disclosure
- [Reference](/reference): auto-extracted CLI, contracts, MCP tools, errors
