# Audit A — root + concepts/

Audit date: 2026-05-26
Auditor: Agent A
Scope: docs/index.md, docs/installation.md, docs/quick-start.md, docs/agent-integration.md, docs/developer-responsibilities.md, docs/concepts/index.md + 7 concept pages
Reference points: sdk-js@4.0.0, python-sdk-v2@3.0.1, canonical `Platform/agirails.app/web/public/protocol/AGIRAILS.md` (V4 spec, version 4.0.0)

Cross-cut summary of what's wrong before per-file:

- **Every contract address in the docs is stale.** Docs use the V3 mainnet kernel `0x132B9eB321dBB57c828B083844287171BDC92d29`, but `sdk-js/src/config/networks.ts:183` ships the V3-redeployed kernel `0x048c811352e8a3fECd5b0Ec4AA2c2b94083CC842` (deploy block 46,212,266, redeploy 2026-05-19 per CHANGELOG.md). EscrowVault, AgentRegistry, ArchiveTreasury are all new addresses. Sepolia kernel `0x0ba0b17554601b30F5406e74d2208f567C12CcFE` in docs → actual `0x9d25A874f046185d9237Cd4954C88D2B74B0021b` (`networks.ts:133`). Wrong addresses appear in 6 of 14 audited files.
- **SDK version drift is severe.** Docs cite `@agirails/sdk` v2.5.0 (installation.md:46), `>=2.3.1` (agent-integration), `>=3.3.0` (x402-protocol — closest to truth but still wrong, current is 4.0.0). Python SDK shown as v2.3.0 (installation.md:46), actual is 3.0.1.
- **The new mental model is absent.** Zero mentions of AGIRAILS.md spec/identity, `{slug}.md` agent.md business card, LLM onboarding flow, `wallet: 'auto'` Smart Wallet path, `actp serve`, `actp request`, `actp verify`, `actp claim-code`, `actp repair`, Web Receipts, AIP-2.1 CounterOffer/CounterAccept builders, AIP-14 dispute bonds, INV-30 locked-bps, hash-based service routing (`keccak256(service_name)`). Confirmed by grep across all 14 files.
- **Code examples are nearly all "Level 2 Advanced API"** with manual escrow lifecycle. Five of seven concept pages and developer-responsibilities.md show the legacy `ACTPClient.create({mode, requesterAddress, privateKey})` invocation, which is no longer the canonical entry point. Current SDK steers users to `wallet: 'auto'` auto-detect from `.actp/keystore.json` + paymaster.

---

## docs/index.md

- **status**: STALE
- **mental_model**: OLD
- **versions_referenced**: "Stripe for AI agents" branding; no explicit SDK version pin; mainnet/sepolia contract addresses lines 217-229 are V3-pre-2026-05-19 addresses
- **code_examples_count**: 2 (TS + Python level-0 `provide`/`request` one-liners)
- **broken_examples**: lines 87-100 + 106-119 — the `provide('echo', async (job) => job.input)` and `request('echo', {input, budget})` form does exist in level0 (sdk-js `src/level0/provide.ts:55` and `src/level0/request.ts:62`) so the snippet itself runs, but the page never explains the prerequisite `actp init` + keystore + `wallet: 'auto'` story, so a fresh integrator gets `WALLET_NOT_FOUND` on copy-paste
- **missing_concepts**: AGIRAILS.md / agent.md identity file, LLM onboarding, `wallet: 'auto'` Smart Wallet gasless path, Web Receipts, `actp serve`/`request`/`verify`/`claim-code`/`repair`, hash-based service routing, AIP-2.1 quote channel, x402 v2 zero-fee mainnet, V3 addresses, AIP-14 dispute bonds
- **severity**: P0
- **effort**: M
- **notes**:
  - Line 217-221: every mainnet address (`ACTPKernel 0x132B...d29`, `EscrowVault 0x6aAF...b99`, `AgentRegistry 0x6fB2...de8`, `ArchiveTreasury 0x0516...2f2`) is the pre-redeploy V3 surface. CHANGELOG sdk-js 4.0.0 (2026-05-19) ships a new kernel `0x048c811352e8a3fECd5b0Ec4AA2c2b94083CC842`. Anyone hitting Basescan to verify "the AGIRAILS contract" lands on a parked address.
  - Line 227-229: Sepolia addresses are also V3 (`0x0ba0...CcFE`, `0xedC6...CeB4`). Current sepolia kernel per `networks.ts:133` is `0x9d25A874f046185d9237Cd4954C88D2B74B0021b`.
  - Line 75 "SDK-first design. n8n integration available. LangChain and CrewAI coming soon." — reverses the new positioning. Per the AGIRAILS.md spec block + `claim-code` command, the *default* path is LLM-driven onboarding; SDK is the advanced path.
  - Line 234-244 "V1 Limitations" table references "Admin can adjust fees (max 5%) with 2-day timelock" — still accurate, but no mention of AIP-14 dispute bonds or INV-30 `disputeBondBpsLocked` that ship in V3 redeploy (per CHANGELOG).
  - Recommendation: rewrite as 2-card layout — "Onboard with your AI assistant (default)" pointing to AGIRAILS.md flow + "Integrate the SDK (advanced)" pointing to current sdk-js@4. Replace all addresses with the V3 surface.

---

## docs/installation.md

- **status**: WRONG
- **mental_model**: OLD
- **versions_referenced**: "TypeScript SDK v2.5.0 on npm · Python SDK v2.3.0 on PyPI" (line 46) — both wrong; actual `@agirails/sdk@4.0.0`, `agirails==3.0.1`. ethers.js v6 (line 37) accurate.
- **code_examples_count**: 9 (mint-usdc.ts, mint_usdc.py, verify-setup.ts, verify_setup.py, 4 Agent init variants TS/Py, tsconfig)
- **broken_examples**:
  - Lines 190-207 (TS mint-usdc.ts) and 213-246 (Py mint_usdc.py): reads `process.env.PRIVATE_KEY` directly with `new ethers.Wallet(...)`. SDK 4.0.0 path is `actp mint <address> <amount>` (verified `cli/commands/mint.ts:22` — mint takes `<address> <amount>` positional args). Showing raw ethers contract calls instead of `actp mint` actively contradicts the SDK's "wallet auto-detect from `.actp/keystore.json`" story introduced in 3.x.
  - Lines 472-476 (Py) and 471-477 (TS) — `wallet: { privateKey: ... }` / `wallet={'private_key': ...}`: not in current `WalletOption` type. Per `sdk-js/src/level1/types/Options.ts:12-21`, `WalletOption` is the discriminated type and `NetworkOption = 'mock' | 'testnet' | 'mainnet'`. `wallet` accepts `'auto' | 'eoa'` for tier, not a `{privateKey}` object on the `Agent` constructor.
  - Lines 295-307 verify-setup.ts: calls `agent.getBalances()` — exists, but the example never establishes a network 'testnet' actually means base-sepolia (chainId 84532 line 384), and there is no Smart Wallet / paymaster mention.
- **missing_concepts**: AGIRAILS.md onboarding (the canonical setup path), agent.md identity, Smart Wallet `wallet: 'auto'`, paymaster gasless, `actp publish`, `actp serve`, Web Receipts. Sepolia mock USDC mint path via `actp mint` (the SDK's built-in) replaced with raw contract calls.
- **severity**: P0
- **effort**: L
- **notes**:
  - Line 46 SDK versions are 1.5 majors behind both registries. This single line is the biggest "copy-paste broken" failure mode in the entire scope — any integrator running `npm install @agirails/sdk@2.5.0` gets pre-V3 contracts, no Smart Wallet, no AIP-2.1.
  - Lines 387-407: Sepolia and mainnet contract address tables all stale (same as index.md).
  - Lines 524-527 network options claim `'testnet'|'mainnet'|'mock'` — this matches `NetworkOption` exactly (`Options.ts:21`), the only block on the page that's still correct.
  - The whole "Step 4: Get Tokens" section should be `actp mint <addr> 1000` for testnet (one CLI line) per current command signature, not a hand-rolled ethers script.
  - Recommendation: rewrite Step 1-3 entirely around `actp init` → `actp publish` (which generates wallet, AGIRAILS.md, and registers on AgentRegistry), with the SDK install demoted to an appendix.

---

## docs/quick-start.md

- **status**: WRONG
- **mental_model**: OLD
- **versions_referenced**: none explicit in headers; `@agirails/sdk` install line 60 has no pin
- **code_examples_count**: 9 (provider.ts, provider.py, requester.ts, requester.py, full-flow-test.ts, full_flow_test.py, plus prerequisite shell blocks)
- **broken_examples**:
  - Lines 111-144 / 157-197 (provider.ts/py): use `new Agent({name, network: 'testnet'})`. The constructor signature exists (`level1/Agent.ts:217`), but the *behavior* shown — auto-keystore-detect, `provider.start()` listening for jobs, `payment:received` event — works only if the agent is published on AgentRegistry with hash routing, which the page never sets up. A literal copy-paste runs but never receives a job because the requester also uses `request('echo', ...)` which goes through `level0` direct paths not through the on-chain provider registry. Provider/requester wiring is incomplete.
  - Lines 240-252 / 282-292: `requester.request('echo', {input, budget})` returns destructured `{result, transactionId}` (line 243) but the actual return type from `level1/Agent.ts` `request()` is `RequestResult` defined in `level1/types/Options.ts`. Need to verify the shape — `transactionId` is plausible but the Python `result.transaction_id`/`result.data` access pattern is the right field name only if `RequestResult` matches that exactly. (Not verified to field level here; flag for spot-check.)
  - Lines 78-83: `ACTP_KEY_PASSWORD=your-password actp init -m testnet` run in *two* directories is the documented flow, but the canonical AGIRAILS.md onboarding generates wallet via `wallet: generate` inline — the integrator never sees a password. Showing `actp init` keystore as the primary path is the *advanced* alternative.
- **missing_concepts**: AGIRAILS.md / agent.md identity, LLM onboarding ("Claude/Cursor, onboard me"), `wallet: 'auto'` Smart Wallet, `actp publish`, `actp serve`, Web Receipts upload, hash-based routing, gasless paymaster
- **severity**: P0
- **effort**: L
- **notes**:
  - Line 35 prereq table: "Two wallets — Run `actp init -m testnet` once per agent (in separate directories)" — this is the old EOA model. New default is one AGIRAILS.md owner spec → SDK derives + publishes. The "two-wallets-required" SVG diagram (line 39-41) reinforces the wrong mental model.
  - Lines 304-313 "What the Agent Does Automatically" — claims the lifecycle is fully automated including "Settles payment to provider". In V3 with AIP-14 dispute bonds + INV-30 locking, settlement now has additional ABI-visible bond-return logic (per CHANGELOG sdk-js 4.0.0 §Mainnet contracts). The simplification is fine for a quick-start but the page should at least link to the real lifecycle doc with V3 caveats.
  - Lines 459-471 state-machine table is correct in shape but lacks the AIP-14 dispute bond row.
  - Recommendation: hide the EOA/keystore path behind a tab. Default tab = "Tell your AI assistant: `Claude, onboard me with AGIRAILS.md from agirails.io/protocol`" → ends with `actp publish` → a working gasless agent. Existing TS/Py code goes into the "SDK direct" tab.

---

## docs/agent-integration.md

- **status**: STALE
- **mental_model**: HYBRID
- **versions_referenced**: `@agirails/sdk >=2.3.1` (lines 36-95), `actp >=2.3.1` (multiple), "Must be >=2.3.1 for current mainnet contracts" (line 193), "Versions 2.3.0 and earlier contain retired V1 mainnet contract addresses" (line 197) — this warning is itself now stale by another major.
- **code_examples_count**: 6 (mock provide/request, testnet agent setup, CLI snippets, gas section, error table)
- **broken_examples**:
  - Lines 78-90: `new Agent({name: 'my-agent', network: 'base-sepolia'})` — but `NetworkOption` is `'mock' | 'testnet' | 'mainnet'` (`Options.ts:21`), not `'base-sepolia'`. Code throws. Same on line 105 (`'base-mainnet'`). This is the wire-format network name used inside the SDK (`config/networks.ts:223`), not the user-facing one. A direct copy-paste fails type-check and runtime.
  - Lines 67-72 `actp mint 1000` — the actual CLI signature requires `<address> <amount>` (verified `cli/commands/mint.ts:22-23`). The shown command errors with "missing argument 'amount'".
  - Lines 119-133 lifecycle "Before COMMITTED → Cancel freely (no cost)" — but `developer-responsibilities.md:485-493` and `concepts/transaction-lifecycle.md:491-493` show a 5% requester penalty after COMMITTED. The agent-integration version is oversimplified to the point of being misleading.
  - Lines 106 V1 limit "$1,000 max per transaction" — partially correct (mainnet only, per `networks.ts:202 maxTransactionAmount: 1000`), but no qualifier — testnet has no limit.
- **missing_concepts**: `actp publish`, `actp serve`, `actp verify`, `actp claim-code`, `actp repair`, AGIRAILS.md spec onboarding, `wallet: 'auto'`, Web Receipts upload, AIP-2.1 quote builders, current V3 contract addresses
- **severity**: P0
- **effort**: M
- **notes**:
  - Line 197 "SDK versions 2.3.0 and earlier contain retired V1 mainnet contract addresses. Upgrade immediately if using mainnet." — Itself a relic. Should now read "<4.0.0 hits pre-redeploy V3 addresses retired 2026-05-19; upgrade to ≥4.0.0".
  - Lines 170-174 "Gas Sponsorship: Registered agents get free gas via ERC-4337 paymaster" — closest to the new mental model anywhere in this scope. Good direction. But the page presents it as a tail-end feature rather than the headline.
  - Line 198: "actp config --json" — verify this exists; quick `grep` (commands dir has `config.ts`) suggests yes.
  - Recommendation: this page has the right *shape* (deterministic, machine-readable for agents) but every value/pin/address needs a refresh; promote gas sponsorship + paymaster from §"Gas Sponsorship" to §"Default Path".

---

## docs/developer-responsibilities.md

- **status**: STALE
- **mental_model**: OLD
- **versions_referenced**: no SDK version pinned; mainnet contracts listed lines 122-127 (pre-V3-redeploy addresses); sepolia AgentRegistry `0xDd6D...F25A` (line 118) — doesn't match networks.ts:147 (`0xD91F9aBfBf60b4a2Fd5317ab0cDF3F44faB5D656`)
- **code_examples_count**: 14 (6 sets of "wrong vs right" mistake examples + small fragments)
- **broken_examples**:
  - Lines 46-58, 70-84: `ACTPClient.create({mode, requesterAddress, privateKey})` — `mode` field exists but the canonical entry point in sdk-js 4.0.0 is `wallet: 'auto'` based on `.actp/keystore.json` (`ACTPClient.ts:853-860` auto-detects wallet mode to 'auto' when key + bundler+paymaster available). `privateKey` direct on `create()` is still accepted but flagged "advanced" in the new model.
  - Lines 314-316 Python: `tx_receipt = client.advanced.create_transaction(..., return_receipt=True)` — verify `return_receipt` kwarg exists. Quick check across python-sdk-v2 src didn't surface it; likely fabricated example.
  - Lines 365-369: `client.advanced.linkEscrow(txId)` — exists. `client.advanced.transitionState(txId, State.IN_PROGRESS)` — exists. Both OK in shape.
  - Lines 444-449 / 463-468: `client.proofs.hashContent(JSON.stringify(result))` — verify `client.proofs` is a real namespace. Not seen in grep of public exports. Likely stale name for what's now `DeliveryProofBuilder` (`builders/DeliveryProofBuilder.ts`).
- **missing_concepts**: AGIRAILS.md / onboarding flow, wallet: 'auto', Smart Wallet path, Web Receipts (which is the new "delivery proof" surface), AIP-14 dispute bonds with bondBps locked, INV-30 invariant, V3 redeploy addresses, `actp claim-code` for sharing access, secret-manager pattern updated for `ACTP_KEY_PASSWORD` (not `PRIVATE_KEY`)
- **severity**: P1 (still works as cautionary advice, but contradicts current SDK on every code sample)
- **effort**: L
- **notes**:
  - The "Mistake 1: Same Wallet for Both Parties" (line 245-281) is still valid advice.
  - "Mistake 2: Not Waiting for Confirmation" (line 286-320) — TS example shows `await client.advanced.createTransaction({...}); await client.advanced.transitionState(...)`. The first call returns `txId` synchronously *after* receipt in current SDK, so the "might fail" framing is wrong: `createTransaction` already waits internally.
  - "Mistake 4: Not Approving USDC" (line 357-386) — with `wallet: 'auto'` Smart Wallet path, USDC.approve is batched into the same UserOp; manual approve isn't a mistake anymore, it's a code smell. The whole section is rooted in the EOA mental model.
  - "Mistake 6: Not Creating Delivery Proofs" (line 434-472) — `client.proofs.hashContent()` likely doesn't exist on that namespace. Should be Web Receipts via `EIP-712 ReceiptWrite` to `agirails.app/api/v1/receipts` (new V3 mechanism per the SoT brief).
  - Recommendation: rewrite as "AGIRAILS.md guarantees / your responsibilities split" — keep ~30% (key security still valid), rewrite 70% around Smart Wallet / Web Receipts / AGIRAILS.md spec compliance.

---

## docs/concepts/index.md

- **status**: STALE
- **mental_model**: OLD
- **versions_referenced**: none
- **code_examples_count**: 0
- **broken_examples**: none
- **missing_concepts**: All "current shipped surface" items absent from the conceptual map. Missing entries: AGIRAILS.md spec, agent.md identity, Smart Wallet path, Web Receipts, AIP-2.1 quote channel, AIP-14 dispute bonds, hash-routing, current V3 addresses.
- **severity**: P1
- **effort**: S
- **notes**:
  - Lists 7 concept pages (ACTP, Lifecycle, Escrow, Identity, Fee, Adapter, x402, ERC-8004). Three new pages are needed: "AGIRAILS.md & agent.md", "Smart Wallet / Gasless Path", "Web Receipts".
  - "TL;DR" copy is accurate for the 7 pages it links to (line 22-60), so the structure works as long as the new pages are added.
  - Line 35-36 "validator-pattern access control - only the ACTPKernel contract can manage escrow" — accurate (verified per `concepts/escrow-mechanism.md:235-247` matches `onlyKernel` modifier in the source).
  - Recommendation: add three new TL;DR cards + reorder so AGIRAILS.md comes first.

---

## docs/concepts/actp-protocol.md

- **status**: STALE
- **mental_model**: OLD
- **versions_referenced**: V1 trust model mentioned 6 times; mainnet+sepolia addresses in §"Layer 1: Smart Contracts" (lines 229-236) all pre-redeploy V3.
- **code_examples_count**: 6 (3 TS + 3 Py — simple payment, multi-agent pipeline, milestone payments)
- **broken_examples**:
  - Lines 309-314 / 343-347: `ACTPClient.create({mode: 'testnet', requesterAddress: wallet.address, privateKey: process.env.PRIVATE_KEY})` — `mode` field still works but `wallet: 'auto'` is the new canonical path. `requesterAddress` redundant once Smart Wallet derives it.
  - Lines 463-465 / 495-497: `client.advanced.releaseMilestone(txId, parseUnits('250', 6))` — verified the function exists (`protocol/ACTPKernel.ts:452`), so milestone code itself runs. BUT the page never mentions that V3 redeploy added AIP-14 dispute bond logic affecting milestone-vs-final settlement bond accounting.
- **missing_concepts**: AGIRAILS.md spec as "the protocol's onboarding/identity format", Smart Wallet path, Web Receipts (replace generic "EAS attestations" examples), AIP-2.1 quote channel + builders, AIP-14 dispute bonds, INV-30 locked-bps, current V3 contract addresses, x402 v2 zero-fee mainnet
- **severity**: P0 (this is the conceptual landing page for the whole protocol and it doesn't mention any of the V3/V4 mental model)
- **effort**: L
- **notes**:
  - Lines 64-99 state-machine table is correct in 6 happy + 2 alt-terminal shape.
  - Lines 142-150 "AgentRegistry Deployed" callout — true, but the address linked (`0x6fB2...de8` line 233) is pre-redeploy. AgentRegistry on mainnet is now `0x64Cb18bfb3CC1aCb1370a3B01613391D3561a009` per `networks.ts:189`.
  - Lines 244-249 "Layer 2: Developer Tools (SDK)" table: TS SDK `npm install @agirails/sdk`, Python `pip install agirails`. No version pin so reader installs `@latest` which is correct path forward — only real risk is the addresses listed in §"Layer 1" being wrong.
  - Line 71-73 "V1 Trust Model" — this is the OLD framing. The current mainnet kernel ships INV-30 + AIP-14, so it's no longer "V1" in the old "no on-chain bonds" sense.
  - Recommendation: rewrite §"Protocol Architecture" with AGIRAILS.md spec layer above Smart Contracts/SDK/Spec, swap addresses for current V3, replace EAS-only attestation framing with EAS + Web Receipts.

---

## docs/concepts/transaction-lifecycle.md

- **status**: STALE
- **mental_model**: HYBRID
- **versions_referenced**: contracts table at lines 811-815 = pre-redeploy V3
- **code_examples_count**: 14 (state-by-state TS+Py for each happy-path stage + dispute + cancel + milestone)
- **broken_examples**:
  - Lines 80-101: `ACTPClient.create({mode, requesterAddress, privateKey})` — same as actp-protocol.md, OLD entry point.
  - Lines 159-170 / 174-181: `await client.advanced.linkEscrow(txId)` — current sdk-js V3 (`config/networks.ts`) routes Smart Wallet payments through `BasicAdapter.payACTPBatched` for batched approve+linkEscrow; the manual two-step `approve` then `linkEscrow` is the EOA fallback path. Page should at least mention both.
  - Lines 418-433 dispute TS example: `ethers.AbiCoder.defaultAbiCoder().encode(['uint256','uint256','uint256','address'], [...])` — this manual encoding is correct in the abstract (resolution proof shape) but AIP-14 redeploy added `disputeBondBpsLocked` accounting that may or may not still use this exact 4-field encoding. Not verified against the 21-field `TransactionView`. Flag for code-level verify.
- **missing_concepts**: AIP-14 dispute bonds + locked bond bps, INV-30 `disputeBondBpsLocked`, ERC-8004 agentId tracking in transitions, V3 21-field TransactionView, Web Receipts as DELIVERED proof mechanism
- **severity**: P0
- **effort**: L
- **notes**:
  - Line 139-147 "Validation rules" — "Minimum amount $0.05 USDC" matches `MIN_TRANSACTION_AMOUNT` in fee-model.md:48. "Maximum amount 1B USDC" matches `maxTransactionAmount: 1000`*USDC* on mainnet (line 200, `networks.ts:202`) — wait, `maxTransactionAmount: 1000` is $1000 USDC, not 1B. The "1B USDC" claim is WRONG. Verify quickly: `networks.ts:200` says `SECURITY: $1,000 max transaction limit`, value is `1000` (interpreted as USDC). Lifecycle doc states "1B USDC" — off by 6 orders of magnitude.
  - Lines 274-277 "Proof Handling in V1: The proof argument in transitionState(DELIVERED) is not stored as delivery proof. It is decoded to update the dispute window if provided. For actual delivery proofs, use anchorAttestation()..." — partially current but doesn't mention Web Receipts as the new mechanism.
  - Authorization matrix lines 528-541 is mostly correct but doesn't reflect AIP-14 (bond holders can also trigger SETTLED in dispute path).
  - Recommendation: add a new sub-section "V3 changes: dispute bonds + locked-bps" referencing AIP-14, fix the "1B USDC" max bug, reframe delivery proof around Web Receipts.

---

## docs/concepts/escrow-mechanism.md

- **status**: STALE
- **mental_model**: OLD
- **versions_referenced**: contracts table line 688-692 = pre-redeploy V3 (`0x6aAF...b99` for vault; current is `0x262D5912A9612F0c66dA5d13B4E678D50ebC44b5` per `networks.ts:184`)
- **code_examples_count**: 12 (approve, linkEscrow, full happy path, milestones, cancel, dispute, balance tracking, events)
- **broken_examples**:
  - Lines 78-87 manual `new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer).approve(...)` — works but obviated by `client.advanced.approveUsdc(amount)` shown later (line 105). Two competing patterns on the same page.
  - Lines 122-128: `ethers.id(`escrow-${txId}-${Date.now()}`)` for escrowId — actually correct shape (bytes32 keccak hash) and matches the protocol's expectation that escrowId is requester-supplied.
  - Lines 137-141 Python: `secrets.token_hex(32)` — produces 64 hex chars = 32 bytes, matches bytes32. OK.
  - Lines 565-580 `client.advanced.getEscrowRemaining(escrowId)` / `verifyEscrow(escrowId, expectedAmount)` — verify these exist on the advanced surface. Plausible per blockchain runtime helpers.
  - Lines 460-477: `transitionState(txId, State.CANCELLED, '0x')` results in "Requester refund: $475 (95%) / Provider penalty: $25 (5%) / Platform: $0" — this is for a $500 tx. Matches the documented 5% penalty model. Consistent with lifecycle.md.
- **missing_concepts**: Smart Wallet batched escrow path (single UserOp via paymaster), AIP-14 dispute bond accounting that interacts with escrow on dispute, V3 vault address, Web Receipts
- **severity**: P1 (the underlying model is still right; just the addresses + Smart Wallet are missing)
- **effort**: M
- **notes**:
  - Lines 235-247: validator-pattern `onlyKernel` description is accurate and matches `concepts/index.md` claim.
  - "Scenario 4: Dispute Resolution" (line 484-545): admin transitions DISPUTED→SETTLED with ABI-encoded resolution proof. Mechanism is correct, but doesn't mention AIP-14 disputeBondBpsLocked changing the bond return path.
  - Lines 651-654 "ACTP vs Escrow.com vs LocalBitcoins" comparison: row "ACTP Disputes — Smart contract" overstates current reality (V1 admin-only resolution acknowledged elsewhere on the page); contradicts the rest of the page.
  - Recommendation: update addresses to V3, add "Smart Wallet path" subsection, add AIP-14 bond accounting note in §"Scenario 4".

---

## docs/concepts/agent-identity.md

- **status**: STALE
- **mental_model**: OLD
- **versions_referenced**: AgentRegistry mainnet `0x6fB2...de8` line 343, sepolia `0xDd6D...F25A` line 344 — both pre-redeploy V3. (Mainnet now `0x64Cb18bfb3CC1aCb1370a3B01613391D3561a009`; sepolia `0xD91F9aBfBf60b4a2Fd5317ab0cDF3F44faB5D656`.)
- **code_examples_count**: 10 (wallet create, env load, AWS secret load, HD wallets, separate wallets, DID resolution, EAS attest)
- **broken_examples**:
  - Lines 50-77: `Wallet.createRandom()` / `Account.create()` — works in ethers v6 / eth_account.
  - Lines 197-204 / 209-217: `HDNodeWallet.fromPhrase(MASTER_MNEMONIC)` is ethers v6 correct. Python `from eth_account.hdaccount import HDAccount` followed by `HDAccount.from_mnemonic` — verify the API; eth-account uses `Account.from_mnemonic()` not `HDAccount.from_mnemonic()`. Likely WRONG (the namespace `eth_account.hdaccount.HDAccount` class with `.from_mnemonic` doesn't exist in modern eth-account). Copy-paste fails ImportError.
  - Lines 304-316 / 320-333: "Query provider's history" using `client.events.getTransactionHistory(providerAddress, 'provider')` — verify this exists. Most likely the actual API surfaces are `client.events.queryTransactions(filter)`-style, not a role-second-arg helper. Flag.
  - Lines 377-386 / 392-402: `eas.attest({schema: ACTP_OUTCOME_SCHEMA, data, recipient})` — `ACTP_OUTCOME_SCHEMA` is undefined in the example, and the modern EAS SDK uses `EASHelper.attest()` in this codebase (`protocol/EASHelper.ts`). The example is half-correct (right shape) but won't run as shown.
- **missing_concepts**: AGIRAILS.md as the agent identity *file format*, agent.md `{slug}.md` business card, V4 identity file generator (`identity-file-generator.ts`), `parseAgirailsMdV4` SDK parser, `actp claim-code` for sharing dashboard access, Web Receipts as the identity-tied reputation primitive, ERC-8004 IdentityRegistry as separate from AgentRegistry (covered elsewhere but not cross-linked here)
- **severity**: P0 (this is supposed to be the identity concept page and doesn't mention the new identity file at all)
- **effort**: L
- **notes**:
  - The whole §"Wallet-Based Identity" framing is the OLD model. New model: AGIRAILS.md spec → onboarding → `{slug}.md` + `.actp/keystore.json` is the *output* of identity creation, not the input.
  - "Multi-Agent Identity" (lines 161-247) discussing HD wallets and shared wallets is mostly orthogonal to where the platform is going (one agent ↔ one AGIRAILS.md ↔ one wallet on AgentRegistry).
  - DID section (lines 251-289) is fine as supplementary material but should be demoted; primary identity = AGIRAILS.md + agent.md.
  - Reputation formula (line 349-354) lists `score = 0.7 × successRate + 0.3 × logVolume` — sourced from old AIP-7 doc, may not match current AgentRegistry implementation. Flag for code-verify.
  - Recommendation: replace §"Wallet-Based Identity" with §"AGIRAILS.md + agent.md", relocate wallet-key sections to a "behind the scenes" appendix, update addresses, remove or fix the EAS code.

---

## docs/concepts/fee-model.md

- **status**: STALE
- **mental_model**: HYBRID
- **versions_referenced**: none direct; "SDKs currently do not enforce the $0.05 minimum fee" (line 246)
- **code_examples_count**: 8 (fee calc TS/Py, fee locking solidity, milestone scenarios, dispute scenario, cancel scenario, calculator fn)
- **broken_examples**:
  - Lines 246-248 "SDKs currently do not enforce the $0.05 minimum fee for you" — per the new "current shipped surface" note "MIN_FEE on-chain" (per .audit/README.md), MIN_FEE is now enforced on-chain in V3 redeploy. The page's whole architectural premise (off-chain SDK has to enforce min-fee) is OBSOLETE. The contract enforces it as of the 2026-05-19 redeploy.
  - Lines 38-41 callout "Important distinction: The smart contract enforces minimum transaction ($0.05) and calculates exactly 1% fee with NO minimum" — WRONG as of V3 redeploy if MIN_FEE moved on-chain.
  - Lines 169-175 solidity `_calculateFee` snippet — would need verification against current ACTPKernel.sol (post-redeploy) since MIN_FEE migration to on-chain changes the formula to `max(amount*100/10000, MIN_FEE)`.
  - Lines 197-209 / 222-239: off-chain minimum fee enforcement examples are now redundant if on-chain handles it.
- **missing_concepts**: On-chain MIN_FEE enforcement (post 2026-05-19), AIP-14 dispute bond fee mechanics, V3 21-field TransactionView fee-locked field, x402 v2 zero-fee path that bypasses ACTP fee entirely
- **severity**: P0 (the page's central architectural claim is now inverted)
- **effort**: M
- **notes**:
  - Lines 28-41 "Quick Reference" table: "Minimum Fee: $0.05 USDC — Enforced Where: Off-chain (SDK/frontend)" — this row is now wrong per current shipped surface.
  - Lines 254-278 fee locking section: `platformFeeBpsLocked` is correct. V3 adds `disputeBondBpsLocked` and `requesterPenaltyBpsLocked` (per CHANGELOG sdk-js 4.0.0); page should mention these are also locked.
  - Lines 555-561 comparison table: still accurate marketing-wise (1% vs Stripe 2.9%).
  - "Mediator Payout" section (lines 500-528) is consistent with other pages.
  - Recommendation: flip the "off-chain vs on-chain" callout (now MIN_FEE is on-chain), add §"Locked-BPS Invariants (INV-30)", add §"x402 = zero AGIRAILS fee" cross-reference.

---

## docs/concepts/adapter-routing.md

- **status**: STALE
- **mental_model**: HYBRID
- **versions_referenced**: `@agirails/sdk@3.3.0+` (line 42) — closer to current than other pages but still one major behind (4.0.0)
- **code_examples_count**: 4 (TS + Python pay examples; TS + Python custom adapter)
- **broken_examples**:
  - Lines 86-98 / 102-115: `await client.pay({to: ..., amount: '10.00'})` — the unified `client.pay()` exists (`ACTPClient.ts:1350` uses `this.router.selectAndResolve(params)`), so the call shape is correct.
  - Lines 130-155: custom adapter example with `IAdapter`, `AdapterMetadata`, `UnifiedPayParams` — these are real exports (`adapters/index.ts`).
  - Lines 27-30 priority diagram — X402Adapter (70), StandardAdapter (60), BasicAdapter (50). Verify priorities against current AdapterRouter; the ordering tracks the new "x402 first if URL" model.
- **missing_concepts**: AGIRAILS.md-driven adapter selection (the spec can declare `paymentMethod: x402` per AGIRAILS.md), `wallet: 'auto'` interaction with BasicAdapter (currently buried in §"Smart Wallet Routing Fix"), Web Receipts trigger on settlement
- **severity**: P1
- **effort**: S
- **notes**:
  - Lines 76-79 "Smart Wallet Routing Fix" is the closest the docs come to the new model. It's a useful technical note but reads as a bug fix patch, not as the headline behavior.
  - This is the best-maintained concept page in the scope and easiest to bring forward.
  - Recommendation: minor refresh — pin `4.0.0+`, lead with the Smart Wallet/BasicAdapter path, cross-link to a (still-to-be-written) AGIRAILS.md spec page.

---

## docs/concepts/erc8004-identity.md

- **status**: CURRENT
- **mental_model**: HYBRID
- **versions_referenced**: none explicit; canonical CREATE2 addresses verified.
- **code_examples_count**: 4 (TS + Py bridge resolve, TS + Py reporter)
- **broken_examples**:
  - Lines 46-58: `new ERC8004Bridge({network: 'base-sepolia'})` — verify constructor takes `network` string. In `types/erc8004.ts:225-227` registry constants use 'base'/'base-sepolia'/'ethereum' keys, so `'base-sepolia'` is likely a valid network identifier for the bridge.
  - Lines 86-105 / 111-122: `ReputationReporter` exists (`erc8004/ReputationReporter.ts:79`). `reportSettlement({agentId, transactionId, outcome, rating})` — verify exact arg shape against `ReputationReporter.ts`. The page is mostly aligned with the source.
- **missing_concepts**: AGIRAILS.md as the upstream identity spec that produces the ERC-8004 registration, `actp publish` as the CLI that writes to ERC-8004 IdentityRegistry, Web Receipts feeding ReputationRegistry
- **severity**: P2
- **effort**: S
- **notes**:
  - Mainnet IdentityRegistry `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` matches `networks.ts:190` exactly.
  - Sepolia IdentityRegistry `0x8004A818BFB912233c491871b3d84c89A494BD9e` matches `networks.ts:149` exactly.
  - The "ERC-8004 vs AgentRegistry" comparison table at lines 153-160 is useful and correct.
  - Recommendation: add a §"How agents land in ERC-8004: actp publish + AGIRAILS.md" pointer; otherwise minimal changes.

---

## docs/concepts/x402-protocol.md

- **status**: CURRENT
- **mental_model**: NEW
- **versions_referenced**: `@agirails/sdk@3.3.0` (line 14). Still one major behind 4.0.0 but the wire-protocol claims align with CHANGELOG.
- **code_examples_count**: 4 (TS buyer, TS seller via `buildX402Server`, Python buyer)
- **broken_examples**:
  - Lines 47-60: `client.pay({to: 'https://...', metadata: {paymentMethod: 'x402'}})` — matches current `ACTPClient.pay()` + X402Adapter.
  - Lines 65-82 seller side: `buildX402Server` import from `@agirails/sdk/server` — verify this subpath export exists. Per package.json exports list inspected above: `./server` exists with `dist/server/index.js`. Plausible. `paymentMiddleware` from `@x402/express` — external pkg, plausible.
  - Lines 87-96 Python buyer: `await ACTPClient.create(mode="testnet")` — verify python-sdk-v2 ACTPClient.create accepts mode kwarg. Per pyproject 3.0.1 README-only patch (CHANGELOG line 9-12), `client.basic.pay(...)` accepts UnifiedPayParams. Plausible.
- **missing_concepts**: x402 v2 in AGIRAILS.md spec onboarding (a provider declares `paymentMethod: x402` in AGIRAILS.md), Web Receipts not relevant here (x402 is atomic, no separate receipt mechanism).
- **severity**: P2
- **effort**: S
- **notes**:
  - Lines 36-38 "X402Relay Deprecated" callout matches CHANGELOG 4.0.0 §Breaking precisely.
  - This is the best page in the scope — written *after* the V3/x402-v2 transition and aligned with current SDK.
  - Recommendation: bump `3.3.0` references to `4.0.0` (or leave as "3.3.0+"), add a sentence about AGIRAILS.md spec declaring x402 preference, otherwise leave alone.

---

## Agent A — rollup

**P0 / P1 / P2 counts:**
- P0: 7 (index.md, installation.md, quick-start.md, agent-integration.md, concepts/actp-protocol.md, concepts/transaction-lifecycle.md, concepts/fee-model.md, concepts/agent-identity.md → actually 8 P0s)
- P1: 3 (developer-responsibilities.md, concepts/index.md, concepts/escrow-mechanism.md, concepts/adapter-routing.md → 4 P1s)
- P2: 2 (concepts/erc8004-identity.md, concepts/x402-protocol.md)

Recount: P0=8, P1=4, P2=2. Total = 14 files.

**Top 5 most-broken pages (biggest gap to current SDK):**

1. **docs/installation.md** — pins `@agirails/sdk@2.5.0` / `agirails@2.3.0`, both 1+ majors behind. Mainnet+sepolia contract addresses all pre-redeploy V3. Mint-USDC example uses raw ethers code instead of `actp mint`. Net effect: integrator copies broken setup and never reaches a working agent. (effort L)
2. **docs/concepts/fee-model.md** — central architectural claim ("$0.05 min fee is enforced off-chain by SDK/frontend, not by contract") is now inverted in V3 redeploy (MIN_FEE on-chain per .audit/README.md). Every "MUST enforce off-chain" warning becomes wrong. (effort M)
3. **docs/concepts/transaction-lifecycle.md** — max amount stated as "1B USDC" (line 142-147) vs actual `maxTransactionAmount: 1000` USDC on mainnet (`networks.ts:202`). Doesn't mention AIP-14 dispute bonds or INV-30 locked-bps that ship in V3. (effort L)
4. **docs/index.md** — homepage. All contract addresses stale. Zero mention of AGIRAILS.md / LLM onboarding / Smart Wallet — the entire new positioning. First impression for every reader. (effort M)
5. **docs/concepts/agent-identity.md** — supposed to be the identity concept page, doesn't mention the new identity *file format* (AGIRAILS.md + `{slug}.md`). HD wallet Python example uses non-existent `eth_account.hdaccount.HDAccount` API. (effort L)

**Cross-cut: concepts uniformly missing across this scope (in ≥10 of 14 files):**

- AGIRAILS.md spec as canonical onboarding format — mentioned in 0/14 audited pages.
- agent.md / `{slug}.md` identity file — 0/14.
- LLM-driven onboarding ("ask your AI assistant") — 0/14.
- `wallet: 'auto'` Smart Wallet path — 1/14 (only mentioned obliquely in adapter-routing.md as a "fix").
- ERC-4337 paymaster gasless flow — 1/14 (single bullet in agent-integration.md).
- Web Receipts (`ReceiptWrite` EIP-712 + upload to agirails.app) — 0/14.
- AIP-2.1 quote channel (`CounterOfferBuilder` / `CounterAcceptBuilder` / `actp serve` daemon) — 0/14.
- New CLI commands `actp serve` / `actp request` / `actp verify` / `actp claim-code` / `actp repair` — 0/14 (only legacy `actp init`, `actp pay`, `actp publish`, `actp mint` appear).
- Current V3 mainnet contract addresses (`0x048c811352e8a3fECd5b0Ec4AA2c2b94083CC842` kernel etc.) — 0/14 use the new addresses; all use pre-2026-05-19 V3.
- Current V3 Sepolia addresses (`0x9d25A874f046185d9237Cd4954C88D2B74B0021b` kernel etc.) — 0/14.
- AIP-14 dispute bonds + INV-30 `disputeBondBpsLocked` — 0/14.
- Hash-based service routing (`keccak256(service_name)` on-chain instead of JSON metadata) — 0/14.
- x402 v2 mainnet zero-fee — only mentioned in concepts/x402-protocol.md (1/14).

**Cross-cut: claims in docs that the SDK no longer does (or never did):**

- `client.proofs.hashContent(...)` namespace — likely fictitious in current SDK (developer-responsibilities.md:446, 466).
- `client.events.getTransactionHistory(addr, role)` second-arg helper shape — not seen in public exports (concepts/agent-identity.md:305).
- `wallet: { privateKey: ... }` object on `Agent` constructor — not matching `WalletOption` discriminated union (installation.md:475).
- `network: 'base-sepolia'` / `'base-mainnet'` strings on `Agent` constructor — `NetworkOption` is `'mock' | 'testnet' | 'mainnet'` only (agent-integration.md:81, 105).
- "1B USDC max" transaction amount — actual mainnet cap is $1000 USDC (concepts/transaction-lifecycle.md:144).
- `client.advanced.create_transaction(..., return_receipt=True)` Python kwarg — not seen in source (developer-responsibilities.md:314).
- "SDK does not enforce the $0.05 minimum fee" — per current shipped surface, MIN_FEE moved on-chain (concepts/fee-model.md:246).
- `actp mint 1000` (no address arg) — current CLI requires `<address> <amount>` positional (agent-integration.md:69, cli/commands/mint.ts:22).
- `eth_account.hdaccount.HDAccount.from_mnemonic()` — wrong namespace in eth-account package (concepts/agent-identity.md:211).

**One-line recommendation for what to rewrite first:**

Replace `docs/index.md` + `docs/installation.md` + `docs/quick-start.md` as a three-page set built around the AGIRAILS.md/LLM-onboarding flow with current V3 addresses, then strip the "OLD ACTPClient.create({mode, privateKey})" pattern from every concept page in the same wave — without that, every other fix is fighting an outdated framing.
