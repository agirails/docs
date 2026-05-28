import React from 'react';

/**
 * Schema.org DefinedTermSet for the AGIRAILS glossary.
 *
 * Lets Google, ChatGPT Search, Perplexity, and other AEO consumers surface
 * individual term definitions directly from search. Each DefinedTerm carries
 * its own URL fragment so the search result deep-links to the exact entry.
 *
 * Keep this in sync with docs/reference/glossary.md headings. If a term is
 * renamed or removed in the markdown, update this list. (Future enhancement:
 * auto-extract from the rendered HTML to remove the drift surface.)
 */

const GLOSSARY_URL = 'https://docs.agirails.io/reference/glossary';

interface Term {
  name: string;
  anchor: string;
  description: string;
}

const TERMS: Term[] = [
  // Protocol
  { name: 'ACTP', anchor: 'actp', description: 'Agent Commerce Transaction Protocol. The open protocol AGIRAILS implements: an 8-state machine governing quote, escrow, delivery, dispute, and settlement for agent-to-agent transactions on Base L2.' },
  { name: 'ACTP kernel', anchor: 'actp-kernel', description: 'The on-chain implementation of ACTP. A Solidity contract set deployed at fixed addresses on Base mainnet (V3) and Base Sepolia (V4).' },
  { name: 'AGIRAILS.md', anchor: 'agirailsmd', description: 'The canonical protocol spec. A 1242-line LLM-readable file that any AI agent can fetch to onboard end-to-end.' },
  { name: 'AIP', anchor: 'aip', description: 'Agent Improvement Proposal. Versioned design proposals for ACTP.' },
  { name: 'AIP-2.1', anchor: 'aip-21', description: 'Quote channel. The off-chain negotiation protocol for signed quote and counter-offer messages.' },
  { name: 'AIP-7', anchor: 'aip-7', description: 'Agent registry plus receipts. Defines on-chain AgentRegistry and Web Receipt artifact format.' },
  { name: 'AIP-13', anchor: 'aip-13', description: 'Keystore and deployment. Defines encrypted keystore loading for CI and production.' },
  { name: 'AIP-14', anchor: 'aip-14', description: 'Dispute bonds plus cross-network replay protection.' },
  { name: 'BPS', anchor: 'bps', description: 'Basis points. 1 BPS = 0.01%. Used in the kernel for fee and bond percentages.' },
  { name: 'Capability', anchor: 'capability', description: 'A standardized service type tag. AGIRAILS recognizes 20 capability tags declared in the capabilities: field of AGIRAILS.md.' },
  { name: 'Covenant', anchor: 'covenant', description: 'A {slug}.md file. Each registered agent publishes a V4-schema markdown file declaring services, pricing, SLA, and protocol metadata.' },
  { name: 'Dispute bond', anchor: 'dispute-bond', description: 'The collateral a disputer posts when raising a dispute. max(transaction_amount * 5%, $1 USDC).' },
  { name: 'EscrowVault', anchor: 'escrowvault', description: 'The on-chain contract holding locked USDC.' },
  { name: 'Fee model', anchor: 'fee-model', description: '1% of transaction value with a $0.05 USDC minimum (MIN_FEE), capped at 5% by a hardcoded kernel constant.' },
  { name: 'INV-30', anchor: 'inv-30', description: 'Per-transaction locked BPS invariant. When a transaction is created, platformFeeBpsLocked, disputeBondBpsLocked, and requesterPenaltyBpsLocked become immutable for its entire lifetime.' },
  { name: 'MIN_FEE', anchor: 'min_fee', description: 'The $0.05 USDC fee floor. Enforced on-chain since V3.' },
  { name: 'Mediator', anchor: 'mediator', description: 'The authorized dispute resolver. Currently the AGIRAILS team multisig with a 24-hour timelock.' },
  { name: 'Settlement', anchor: 'settlement', description: 'The terminal state transition where USDC moves from escrow to the provider. DELIVERED to SETTLED.' },
  { name: 'State machine', anchor: 'state-machine', description: 'The 8-state DAG governing every ACTP transaction. Kernel-enforced.' },

  // States
  { name: 'INITIATED', anchor: 'initiated', description: 'State 0. Transaction created by requester. No escrow yet locked.' },
  { name: 'QUOTED', anchor: 'quoted', description: 'State 1. Provider has responded with a signed price quote.' },
  { name: 'COMMITTED', anchor: 'committed', description: 'State 2. Quote accepted, USDC locked in EscrowVault.' },
  { name: 'IN_PROGRESS', anchor: 'in_progress', description: 'State 3. Provider is performing the work.' },
  { name: 'DELIVERED', anchor: 'delivered', description: 'State 4. Provider has submitted the deliverable. Consumer dispute window opens.' },
  { name: 'SETTLED', anchor: 'settled', description: 'State 5 (terminal). USDC released to provider minus platform fee.' },
  { name: 'DISPUTED', anchor: 'disputed', description: 'State 6. Either party has raised a dispute. Mediator review begins.' },
  { name: 'CANCELLED', anchor: 'cancelled', description: 'State 7 (terminal). Transaction terminated. Escrow returned per cancellation reason.' },

  // Identity & wallets
  { name: 'Account Abstraction', anchor: 'account-abstraction-erc-4337', description: 'ERC-4337. The standard that allows smart contracts to function as wallets.' },
  { name: 'AgentID', anchor: 'agentid', description: 'An ERC-8004 chain-agnostic agent identifier. Reputation accrues to AgentID, not to wallet address.' },
  { name: 'AgentRegistry', anchor: 'agentregistry', description: 'The on-chain contract mapping {slug} to AgentID and wallet address.' },
  { name: 'DID', anchor: 'did', description: 'Decentralized Identifier. AGIRAILS emits did:ethr:{chainId}:{address} for each registered agent.' },
  { name: 'EOA', anchor: 'eoa', description: 'Externally Owned Account. A wallet whose authority lives in a private key.' },
  { name: 'ERC-4337', anchor: 'erc-4337', description: 'The Account Abstraction standard. See Account Abstraction.' },
  { name: 'ERC-8004', anchor: 'erc-8004', description: 'The agent identity and reputation standard ACTP implements.' },
  { name: 'Paymaster', anchor: 'paymaster', description: 'The contract that sponsors gas for UserOperations. AGIRAILS uses the Coinbase Paymaster.' },
  { name: 'SCW', anchor: 'scw', description: 'Smart Contract Wallet. The on-chain address users interact with in wallet=auto mode.' },
  { name: 'UserOperation', anchor: 'useroperation', description: 'An ERC-4337 transaction object signed by the EOA, validated by the SCW, bundled, and submitted on-chain.' },
  { name: 'wallet=auto', anchor: 'walletauto', description: 'The default SDK wallet mode. Wraps the EOA in a Coinbase Smart Wallet and routes through the Paymaster. User pays only USDC.' },
  { name: 'wallet=eoa', anchor: 'walleteoa', description: 'Direct-EOA SDK wallet mode. EOA sends transactions directly and pays its own gas in ETH.' },

  // Cryptography
  { name: 'CID', anchor: 'cid', description: 'Content Identifier. The IPFS content-addressed hash for a file.' },
  { name: 'ECDSA', anchor: 'ecdsa', description: 'Elliptic Curve Digital Signature Algorithm. The signature scheme Ethereum uses.' },
  { name: 'EAS', anchor: 'eas', description: 'Ethereum Attestation Service. An on-chain attestation registry ACTP uses for delivery and settlement attestations.' },
  { name: 'EIP-712', anchor: 'eip-712', description: 'Typed data signing standard. Used for AIP-2.1 quote messages, counter-offers, and Web Receipts.' },
  { name: 'EIP-3009', anchor: 'eip-3009', description: 'Transfer with authorization. Pre-signed USDC transfer that a third party can execute. Used by x402.' },
  { name: 'keccak256', anchor: 'keccak256', description: 'The Ethereum hash function. Used for quote hashes, content hashes, and EIP-712 domain separators.' },

  // Receipts
  { name: 'IPFS', anchor: 'ipfs', description: 'InterPlanetary File System. The content-addressed file storage layer Web Receipts live on.' },
  { name: 'Web Receipt', anchor: 'web-receipt', description: 'A signed JSON artifact pinned to IPFS that records what was delivered. Anchored on-chain via the delivery attestation CID.' },

  // SDK tiers
  { name: 'Level 0', anchor: 'level-0', description: 'The smallest SDK surface. Three exports: request, provide, Provider. One-shot consumer/provider flows.' },
  { name: 'Basic tier', anchor: 'basic-tier', description: 'The high-level convenience layer. Agent, pay(), request(), provide(). Long-lived agent with handlers and lifecycle.' },
  { name: 'Standard tier', anchor: 'standard-tier', description: 'Production-stable surface for non-trivial integrations. Direct adapter access, builders, runtime helpers.' },
  { name: 'Advanced tier', anchor: 'advanced-tier', description: 'Lower-level building blocks. Orchestrators, policy engines, dedup stores, raw runtime interfaces.' },
  { name: 'Internal', anchor: 'internal', description: 'Implementation details exposed for testing or compatibility. Not part of the public API contract.' },

  // Networks
  { name: 'Base', anchor: 'base', description: "Coinbase's Ethereum L2. The chain AGIRAILS operates on." },
  { name: 'Base mainnet', anchor: 'base-mainnet', description: 'Production network. Chain ID 8453. AGIRAILS live since V3 redeploy on 2026-05-19.' },
  { name: 'Base Sepolia', anchor: 'base-sepolia', description: 'Testnet for AGIRAILS. Chain ID 84532. V4 kernel deployed, one patch ahead of mainnet V3.' },
  { name: 'mock mode', anchor: 'mock-mode', description: 'SDK mode that runs entirely in memory with no on-chain calls. Used for unit tests and local development.' },
  { name: 'USDC', anchor: 'usdc', description: "Circle's USD stablecoin. The settlement currency for AGIRAILS on Base." },

  // Math & verification
  { name: 'Cellular sheaf', anchor: 'cellular-sheaf', description: 'A mathematical structure that attaches local data to a state space. Used to model ACTP and compute its cohomology.' },
  { name: 'Echidna', anchor: 'echidna', description: 'A property-based fuzzer for Solidity contracts. Runs continuously against the kernel for vault solvency invariant.' },
  { name: 'H¹ = 0', anchor: 'h-0', description: 'The structural completeness result. Computed on ACTP state sheaf after a 2-cell refinement. No hidden seams in the protocol.' },
  { name: 'Hypothesis stateful', anchor: 'hypothesis-stateful', description: 'A Python property-based testing library used in stateful mode. ~600 random ACTP op sequences per CI run.' },
  { name: 'Sourcify EXACT_MATCH', anchor: 'sourcify-exact_match', description: 'The strongest contract verification level. Both runtime bytecode and metadata IPFS hash match the source on GitHub.' },

  // Tooling
  { name: 'actp CLI', anchor: 'actp-cli', description: 'The command-line tool shipped with both SDKs. Subcommands: init, pay, provide, test, publish, keystore:*, and more.' },
  { name: 'Claude Code plugin', anchor: 'claude-code-plugin', description: 'The AGIRAILS plugin for Claude Code. 8 slash commands, integration-wizard subagent, custom skills.' },
  { name: 'Claude Skill', anchor: 'claude-skill', description: 'The AGIRAILS Anthropic Skill. A read-only knowledge package for claude.ai web and the Claude API.' },
  { name: 'MCP', anchor: 'mcp', description: 'Model Context Protocol. The Anthropic-led open standard for connecting AI clients to tool servers.' },
  { name: 'MCP server', anchor: 'mcp-server', description: '@agirails/mcp-server. 20 tools across discovery, runtime, and protocol-bootstrap layers.' },
  { name: 'n8n', anchor: 'n8n', description: 'A no-code workflow builder. AGIRAILS ships a community node with Pay, Receive, Provide trigger, and Wait for delivery operations.' },
  { name: 'OpenClaw', anchor: 'openclaw', description: "ClawHub's Skill ecosystem. Equivalent of Anthropic's Claude Skill, served via ClawHub." },
  { name: 'Truth-ledger manifest', anchor: 'truth-ledger-manifest', description: '/sdk-manifest.json. The machine-readable JSON of every SDK symbol, contract address, CLI command, error class, MCP tool, and protocol field. Regenerated daily.' },

  // x402
  { name: 'x402', anchor: 'x402', description: 'An open HTTP payment protocol. Returns 402 Payment Required with a quote; client signs EIP-3009; server executes the transfer.' },
  { name: 'x402 v2', anchor: 'x402-v2', description: 'The current x402 spec AGIRAILS supports. Direct buyer-to-seller settlement on mainnet with zero protocol fee.' },

  // Roles
  { name: 'Provider', anchor: 'provider', description: 'The party delivering a service in exchange for USDC.' },
  { name: 'Requester', anchor: 'requester', description: 'The party requesting and paying for a service. Locks USDC, settles or disputes.' },
];

export default function GlossarySchema(): JSX.Element {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: 'AGIRAILS Glossary',
    description: 'Every AGIRAILS acronym, protocol term, and standard reference, each linked to its canonical deep-dive page.',
    url: GLOSSARY_URL,
    inDefinedTermSet: GLOSSARY_URL,
    hasDefinedTerm: TERMS.map((t) => ({
      '@type': 'DefinedTerm',
      name: t.name,
      description: t.description,
      url: `${GLOSSARY_URL}#${t.anchor}`,
      inDefinedTermSet: GLOSSARY_URL,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
