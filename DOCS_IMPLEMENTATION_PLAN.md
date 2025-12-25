# Documentation Implementation Plan

**Created:** 2025-12-25
**Status:** In Progress
**Owner:** Arha

---

## Executive Summary

SDK v2 i n8n node v2 su objavljeni na npm. Dokumentacija treba update da reflektira nove API-je, implementirani AIP-7 (DID + Agent Registry), i nove primjere.

---

## Audit Results

### Current Documentation State

| File | Status | Issues |
|------|--------|--------|
| `quick-start.md` | 🔴 OUTDATED | Koristi stari API (`client.kernel.*`), treba `client.intermediate.*` ili `client.beginner.*` |
| `installation.md` | 🟡 PARTIAL | Većinom OK, Python SDK link ne postoji još |
| `sdk-reference.md` | 🔴 OUTDATED | 118KB - koristi stari API, nedostaju DID/Agent Registry sekcije |
| `concepts/agent-identity.md` | 🔴 OUTDATED | Kaže "Future (AIP-7)" ali AIP-7 JE IMPLEMENTIRAN |
| `guides/integrations/n8n.md` | 🔴 OUTDATED | Kaže v1.2.0, mi smo na v2.0.1 |
| `contract-reference.md` | 🟡 UNKNOWN | Treba provjeriti match s deployiranim ugovorima |
| `concepts/*.md` | 🟢 OK | Konceptualno OK, možda minor updates |
| `cookbook/*.md` | 🟡 UNKNOWN | Treba provjeriti code snippets |
| `guides/agents/*.md` | 🟡 UNKNOWN | Treba provjeriti code snippets |

### Missing Documentation

| Topic | Priority | Notes |
|-------|----------|-------|
| **DID System** | 🔴 P0 | `DIDManager`, `DIDResolver` - potpuno nedostaje |
| **Agent Registry** | 🔴 P0 | `AgentRegistry` contract + SDK methods |
| **SDK v2 API Layers** | 🔴 P0 | `beginner`, `intermediate`, `runtime` API struktura |
| **n8n Node v2** | 🟡 P1 | Simple vs Advanced mode, nove operacije |
| **Python SDK** | 🟢 P2 | Čeka dok Python SDK bude gotov |
| **CLI Reference** | 🟡 P1 | `actp` CLI commands |

---

## SDK v2 API Changes

### Old API (v1.x) → New API (v2.x)

```typescript
// OLD (v1.x)
client.kernel.createTransaction(...)
client.kernel.transitionState(...)
client.escrow.approveToken(...)
client.fundTransaction(...)

// NEW (v2.x) - Beginner Layer
client.beginner.pay({ provider, amount, service })
client.beginner.checkStatus(txId)

// NEW (v2.x) - Intermediate Layer
client.intermediate.createTransaction({ provider, amount, deadline, disputeWindow })
client.intermediate.linkEscrow(txId)
client.intermediate.transitionState(txId, state)
client.intermediate.releaseEscrow(txId)
client.intermediate.getTransaction(txId)

// NEW (v2.x) - Runtime Layer
client.runtime  // Direct BlockchainRuntime or MockRuntime access
```

### New Features in v2

1. **Three API Layers**: beginner (simple), intermediate (standard), runtime (low-level)
2. **Mock Mode**: `mode: 'mock'` - no blockchain needed for testing
3. **DID Support**: `DIDManager`, `DIDResolver` classes
4. **Agent Registry**: On-chain agent registration and reputation
5. **Delivery Proofs**: `DeliveryProofBuilder` with EAS attestations
6. **Quote Builder**: `QuoteBuilder` for price negotiation
7. **CLI**: `actp` command-line tool

---

## Implementation Phases

### Phase 1: Critical Updates (P0)
- [ ] **quick-start.md** - Update all code to v2 API
- [ ] **sdk-reference.md** - Major rewrite with new API structure
- [ ] **concepts/agent-identity.md** - Update "Future" to "Implemented"
- [ ] **New: concepts/did-system.md** - DID documentation
- [ ] **New: concepts/agent-registry.md** - Agent Registry documentation

### Phase 2: Integration Guides (P1)
- [ ] **guides/integrations/n8n.md** - Update to v2.0.1, new operations
- [ ] **New: sdk-reference/cli.md** - CLI reference
- [ ] **cookbook/*.md** - Verify and update code snippets
- [ ] **guides/agents/*.md** - Verify and update code snippets

### Phase 3: Python SDK (P2)
- [ ] **installation.md** - Add Python SDK when ready
- [ ] **sdk-reference.md** - Add Python examples
- [ ] **quick-start.md** - Add Python tab content

### Phase 4: Polish (P3)
- [ ] Review all diagrams
- [ ] Add changelog/release notes
- [ ] SEO optimization
- [ ] Test all code snippets

---

## Detailed Tasks

### quick-start.md

**Current issues:**
```typescript
// Line ~99-100 - OLD API
const requesterClient = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.REQUESTER_PRIVATE_KEY
});
// Uses: client.kernel.createTransaction(...)
```

**Should be:**
```typescript
// NEW API - Beginner layer (simplest)
const result = await client.beginner.pay({
  provider: '0x...',
  amount: '10.00',
  service: 'echo'
});

// OR NEW API - Intermediate layer (more control)
const txId = await client.intermediate.createTransaction({
  provider: '0x...',
  amount: '10.00',
  deadline: '+1h',
  disputeWindow: 3600
});
await client.intermediate.linkEscrow(txId);
```

---

### concepts/agent-identity.md

**Current (line 30-35):**
```markdown
| Component | Current Implementation | Future (AIP-7) |
|-----------|------------------------|----------------|
| **Identifier** | Ethereum address | DID |
| **Registry** | None (optional) | AgentRegistry contract |
```

**Should be:**
```markdown
| Component | Implementation |
|-----------|----------------|
| **Identifier** | DID (`did:ethr:84532:0x...`) |
| **Authentication** | Wallet signature (ECDSA) |
| **Reputation** | On-chain via AgentRegistry |
| **Registry** | `0xFed6914Aa70c0a53E9c7Cc4d2Ae159e4748fb09D` (Base Sepolia) |
```

---

### New: concepts/did-system.md

**Outline:**
1. What is a DID?
2. AGIRAILS DID Format: `did:ethr:<chainId>:<address>`
3. DIDResolver - resolving DIDs to documents
4. DIDManager - managing delegates and attributes
5. Code examples (TS + Python)
6. Security considerations

---

### New: concepts/agent-registry.md

**Outline:**
1. What is Agent Registry?
2. Registering an agent
3. Querying agent info
4. Reputation scores
5. Code examples
6. Contract address: `0xFed6914Aa70c0a53E9c7Cc4d2Ae159e4748fb09D`

---

### guides/integrations/n8n.md

**Updates needed:**
- Version: v1.2.0 → v2.0.1
- License: MIT → Apache-2.0
- New operations: Simple Mode vs Advanced Mode
- Updated screenshots (if any)

---

## Contract Addresses (Base Sepolia)

For documentation reference:

| Contract | Address |
|----------|---------|
| ACTPKernel | `0xD199070F8e9FB9a127F6Fe730Bc13300B4b3d962` |
| EscrowVault | `0x948b9Ea081C4Cec1E112Af2e539224c531d4d585` |
| MockUSDC | `0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb` |
| AgentRegistry | `0xFed6914Aa70c0a53E9c7Cc4d2Ae159e4748fb09D` |
| EAS | `0x4200000000000000000000000000000000000021` |

---

## Progress Tracking

### Phase 1 Progress
- [ ] quick-start.md
- [ ] sdk-reference.md
- [ ] concepts/agent-identity.md
- [ ] concepts/did-system.md (NEW)
- [ ] concepts/agent-registry.md (NEW)

### Phase 2 Progress
- [ ] guides/integrations/n8n.md
- [ ] sdk-reference/cli.md (NEW)
- [ ] cookbook/*.md audit
- [ ] guides/agents/*.md audit

### Phase 3 Progress
- [ ] Python SDK integration (waiting)

---

## Notes

- Migration guide NIJE potreban (nema postojećih v1 korisnika)
- Python SDK dolazi - 1:1 parity s JS SDK
- Prioritet je "zero to first transaction" developer experience
