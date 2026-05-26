# Reference docs audit — Agent C

> Scope: `docs/cli-reference.md`, `docs/contract-reference.md`, `docs/error-reference.md`,
> `docs/sdk-reference/index.md`, `docs/sdk-reference/basic-api.md`,
> `docs/sdk-reference/standard-api.md`, `docs/sdk-reference/registry.md`,
> `docs/sdk-reference/utilities.md`, `docs/sdk-reference/errors.md`,
> `docs/sdk-reference/advanced-api/{index,eas,escrow,events,kernel,message-signer,proof-generator,quote}.md`.
>
> Cross-referenced against:
> - TS SDK 4.0.0 source: `SDK and Runtime/sdk-js/src/`
> - Python SDK 3.0.1 source: `SDK and Runtime/python-sdk-v2/src/agirails/`
> - Live CLI surfaces: `python-sdk-v2/src/agirails/cli/main.py`, `sdk-js/src/cli/commands/`
> - On-chain truth: `Protocol/actp-kernel/src/interfaces/IACTPKernel.sol`
> - Network addresses: `python-sdk-v2/src/agirails/config/networks.py`

---

## `cli-reference.md`

| Column | Value |
|---|---|
| path | `cli-reference.md` |
| status | **WRONG** |
| mental_model | OLD (SDK 2.x CLI surface) |
| versions_referenced | none explicit; install hint `npm install -g @agirails/sdk` |
| code_examples_count | ~35 |
| broken_examples | L72-112 `actp init` flags `-m/--mode`, `-a/--address`, `--scaffold`, `--intent`, `--service`, `--price` not in current `cli/commands/init.py`; L121-149 `actp pay <to> <amount>` positional shape OK but `--dispute-window` flag does not exist in current `pay.py`; L154-241 `tx create`, `tx deliver`, `tx settle`, `tx cancel` **do not exist** (current `tx.py` only has `status`, `list`, `transition`); L272-294 `actp mint <address> <amount>` — `mint.py` exists but mock-only constraint copy is stale (mock removed in current SDK); L298-345 `actp config show/set/get` — `config.py` is plain `config()` callable, no subcommands; L350-401 `actp watch` looks OK but `--interval` default is wrong (current default differs); L405-448 `actp simulate pay/fee` — no `simulate.py` subcommand structure like this; L452-501 `actp batch` allowlist outdated (missing `serve`, `request`, `verify`, `claim-code`, `repair`, `find`, `negotiate`, `register`, `claim`); L505-559 `actp time` does not exist as a top-level command; L563-615 `actp publish` example signature wrong (publishes via `--path`, not positional); L619-650 `actp pull` and L654-695 `actp diff` take `--path`, not positional; L727-728 tip references `ACTP_KEY_PASSWORD` — env var is correct but doc never explains the AutoWalletProvider flow |
| missing_concepts | **Smart Wallet `wallet="auto"`** (only mentioned in passing in init options); **`actp serve` (FastAPI quote daemon)** — completely absent; **`actp request`** — absent; **`actp verify`** — absent; **`actp claim-code`** — absent; **`actp repair`** — absent; **`actp find`** — absent (Python 3.0.1 changelog explicitly calls this out); **`actp negotiate`** — absent; **`actp register`** — absent; **`actp claim`** — absent; **`actp health`** — absent; **`actp receipt` / `actp test`** — absent; **`actp autopublish`** — absent; LLM-driven onboarding flow ("Claude/Cursor runs `actp` for you") — entire mental model is missing |
| severity | **P0** |
| effort | **L** (>2h — needs full rewrite against current `cli/main.py`) |
| notes | This file is dangerously stale. Of 23 commands in `python-sdk-v2/src/agirails/cli/main.py` (init, pay, balance, mint, watch, batch, publish, diff, pull, find, health, claim, autopublish, test, register, negotiate, serve, claim-code, repair, verify, request, deploy env, deploy check), the doc covers 13 and gets several wrong. The 4 `tx` subcommands shown (`create`, `deliver`, `settle`, `cancel`) literally don't exist — Python CHANGELOG 3.0.1 entry calls this out verbatim: "actp tx deliver / actp tx settle don't exist; replaced with the generic actp tx transition <tx_id> <NEW_STATE>". `actp config` is a plain command, not a subcommand group. The `actp time` command does not exist anywhere in the current SDK. Recommendation: **rewrite from scratch** by walking `cli/main.py` line by line and `--help`-ing each subcommand. |

---

## `contract-reference.md`

| Column | Value |
|---|---|
| path | `contract-reference.md` |
| status | **STALE** (V2 mainnet addresses, missing V3/V4 redeployment) |
| mental_model | OLD (pre-V3 / pre-V4 contracts, missing 21-field TransactionView) |
| versions_referenced | implicit V2 contract surface; "Security Audit Complete (Feb 2026)" pre-dates current V3 deployment |
| code_examples_count | ~30 |
| broken_examples | L59 Sepolia ACTPKernel `0x0ba0b17554601b30F5406e74d2208f567C12CcFE` — **stale**. Current testnet kernel is `0x9d25A874f046185d9237Cd4954C88D2B74B0021b` (V4 deploy 2026-05-19, see `networks.py:173`); L60 EscrowVault `0xedC62264301A119207f1f89C6bDE4Fd7a7A4CeB4` — stale (current `0x7dF07327090efcA73DCBa70414aA3131Fc6d2efB`); L61 MockUSDC OK (`0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb`); L71 Mainnet ACTPKernel `0x132B9eB321dBB57c828B083844287171BDC92d29` — **stale**. Current V3 mainnet kernel is `0x048c811352e8a3fECd5b0Ec4AA2c2b94083CC842` (deploy block 46,212,266, see `sdk-js/CHANGELOG.md` 4.0.0 entry); L72 mainnet EscrowVault `0x6aAF45882c4b0dD34130ecC790bb5Ec6be7fFb99` — stale (current `0x262D5912A9612F0c66dA5d13B4E678D50ebC44b5`); L73 mainnet AgentRegistry `0x6fB222CF3DDdf37Bcb248EE7BBBA42Fb41901de8` — stale (current `0x64Cb18bfb3CC1aCb1370a3B01613391D3561a009`); L74 mainnet ArchiveTreasury `0x0516C411C0E8d75D17A768022819a0a4FB3cA2f2` — stale (current `0x6159A80Ce8362aBB2307FbaB4Ed4D3F4A4231Acc`); L203-243 `Transaction` and `TransactionView` structs show **15 fields** — actual interface (`IACTPKernel.sol:16-38`) has **21 fields** (adds `requesterPenaltyBpsLocked`, `disputeBondBpsLocked` (INV-30), `agentId`, `requesterAgentId`, `disputeInitiator`, `disputeBond` — all AIP-14); L421-444 `createTransaction` signature shows 6 parameters — current signature has **8 parameters** including `agentId` and `requesterAgentId` (`IACTPKernel.sol:145-154`); L1604-1614 `TransactionCreated` event missing `agentId` field (current emits 8 fields including ERC-8004 agent ID); L2722-2752 dispute resolution example uses 4-tuple resolution proof — current dispute path uses `disputeBond`/`disputeInitiator` flow (AIP-14) which the doc never mentions; L2330 "No multi-sig escrow" — mentions Safe but wrong context (admin is a 2-of-4 Safe on mainnet per CHANGELOG); L1169 schema UID `0x1b0ebdf0bd20c28ec9d5362571ce8715a55f46e81c3de2f9b0d8e1b95fb5ffce` is the sepolia schema; mainnet schema is `0x166501e7476e2fcf9214c4c5144533c2957d56fe59d639effc1719a0658d9c9a` (`networks.py:238`) |
| missing_concepts | **V3 mainnet redeployment (2026-05-19)**; **21-field TransactionView**; **AIP-14 dispute bonds** with `disputeBondBpsLocked` + `disputeInitiator` + `disputeBond` fields; **INV-30 locked-bps invariant** (immune to live `updateDisputeBondBps`); **MIN_FEE on-chain** ($0.05 floor); **`createTransaction` 8-parameter signature** with `agentId` + `requesterAgentId`; **ERC-8004 IdentityRegistry** (`0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` mainnet, `0x8004A818BFB912233c491871b3d84c89A494BD9e` sepolia); **`AGIRAILSIdentityRegistry`** (sepolia `0xce9749c768b425fab0daa0331047d1340ec99a88`); **`acceptQuote` function** (in interface, never documented); **Mainnet x402Relay deprecated** (removed since SDK 3.3.0); **AIP-14 events** (`DisputeOpened`, `DisputeResolved` with new signatures); **2-of-4 Treasury Safe** as admin/pauser/feeRecipient (`0x61fE58E9…b7f2`) |
| severity | **P0** |
| effort | **L** (>2h — every code block needs new addresses + struct shape update + new fields documented) |
| notes | This file is the **single most-stale fact-dense doc** in the audit. Hardcoded V2 testnet `0x0ba0b17554601b30F5406e74d2208f567C12CcFE` is referenced **6+ times** in code examples (L290, L336, L480, L567, L646, L988, L2467, L2819, L2883). Mainnet kernel `0x132B9eB321dBB57c828B083844287171BDC92d29` appears in `Deployed Addresses` table and "Contract Addresses" sub-headers. **Any integrator copy-pasting these addresses will hit the wrong contract**. The `TransactionView` struct mismatch (15 docs vs 21 chain) means anyone decoding `getTransaction()` ABI will see field-offset errors. Recommendation: **block on rewriting against `IACTPKernel.sol` and `networks.py` first** before anything else in this audit. |

---

## `error-reference.md`

| Column | Value |
|---|---|
| path | `error-reference.md` |
| status | **STALE** |
| mental_model | HYBRID (mentions x402 + Smart Wallet but error catalog is pre-3.x) |
| versions_referenced | `>=2.3.1` (L67, L107 "must be >=2.3.1 for mainnet") — current is **4.0.0** TS / **3.0.1** Python |
| code_examples_count | 3 |
| broken_examples | L107 "SDK version? — `npm ls @agirails/sdk` (must be >=2.3.1 for mainnet)" — wrong version pin. Current mainnet floor is 4.0.0 (TS); L46 `PROVIDER_PAID_FEE_FAILED` — this code does not exist in current `errors/` directory (it's a phantom error code from an x402 relay that was removed in 3.3.0); L45 `PAYMASTER_ERROR` does not appear in the Python SDK error hierarchy (`agirails/errors/__init__.py`); L98 dispute resolution row: "DISPUTED → SETTLED, CANCELLED — Admin only (V1)" — the "(V1)" tag is wrong, current V3/V4 supports AIP-14 dispute resolution via mediator role + bond return, not "Admin only" |
| missing_concepts | **AIP-14 dispute bond errors** (no `DISPUTE_BOND_INSUFFICIENT`, `DISPUTE_BOND_LOCKED`); **Smart Wallet errors** (`AAUserOpFailed`, `PaymasterRejected`); **upload_receipt errors** (entire `receipts/` module not represented); **X402 error family** (`X402Error`, `X402ConfigError`, `X402PublishRequiredError`, `X402UnsupportedWalletError`, `X402NetworkNotAllowedError`, `X402AmountExceededError`, `X402ApprovalFailedError`, `X402SignatureFailedError`, `X402SettlementProofMissingError`, `X402PaymentFailedError` — all exist in TS SDK 4.0.0 per `index.ts:74-86`); **WalletTier mismatch errors** when `wallet="auto"` falls back to EOA; **`actp claim-code` errors** (24h expiry); **`actp repair` errors** (role flag conflicts) |
| severity | **P1** (works but actively misleads on version pin) |
| effort | **M** (1-2h surgical rewrite) |
| notes | The CLI Exit Codes section (L51-73) is accurate and matches current `cli/main.py`. The Contract Errors table (L12-32) maps reasonably to current Solidity revert strings. The big problems are: (1) version pin `>=2.3.1` is 2-major-versions stale, (2) `PROVIDER_PAID_FEE_FAILED` references a contract that doesn't exist on mainnet anymore, (3) AIP-14 dispute bond error surface is missing entirely, (4) X402 error family (10+ classes) is missing. Recommendation: regenerate table from `sdk-js/src/errors/index.ts` + `python-sdk-v2/src/agirails/errors/__init__.py`. |

---

## `sdk-reference/index.md`

| Column | Value |
|---|---|
| path | `sdk-reference/index.md` |
| status | **STALE** |
| mental_model | OLD (SDK-first three-tier, no LLM-driven onboarding flow) |
| versions_referenced | TS `Node.js >= 16.0.0`, Python `Python 3.9+`, no SDK pin |
| code_examples_count | 6 |
| broken_examples | L86-91 `Agent` config example uses `wallet: { privateKey }` form — current SDK supports `wallet: 'auto'` as Tier 1 default (gasless Smart Wallet); the example pushes users to the EOA path; L133-150 `ACTPClient.create({ mode: 'mock', requesterAddress: '0x...', privateKey: ... })` — `privateKey` is no longer the primary auth path in 4.0.0 (Smart Wallet via keystore is); L162-178 Python example uses snake_case `requester_address` but the original spec uses `requesterAddress` — Python SDK accepts both via TypedDict; L211 "Node.js >= 16.0.0" — TS SDK 4.0.0 `package.json` requires `>=18`; L223 "Python 3.9+" matches; L254-261 gas table OK but lists 4 operations — V3 mainnet adds new operations (`acceptQuote`) not shown |
| missing_concepts | **AGIRAILS.md-first onboarding** (the "Claude/Cursor onboards you, SDK is advanced path" mental model); **`wallet: 'auto'` / AutoWalletProvider** prominence (currently buried); **Smart Wallet end-to-end path**; **`actp serve` / quote channel daemon**; **AIP-2.1 CounterOfferBuilder / CounterAcceptBuilder**; **Web Receipts (`upload_receipt`)**; **ERC-8004 identity (`ERC8004Bridge`, `ReputationReporter`)**; **agirails.app discovery API (`discover_agents`)**; **`compute_transaction_id` helper** for Smart Wallet routing; **x402 v2** (direct buyer→seller, no relay on mainnet) |
| severity | **P0** (frames the whole SDK section in the wrong mental model) |
| effort | **L** |
| notes | The "Three-Tier API" framing is fine as a structure but the **defaults are wrong**: examples should default to `wallet="auto"` (Smart Wallet, gasless) and treat `privateKey` as the EOA-only fallback. The decision tree image likely needs to be rebuilt to show the AGIRAILS.md → LLM-onboarded → CLI path as primary and the SDK API as the advanced path. |

---

## `sdk-reference/basic-api.md`

| Column | Value |
|---|---|
| path | `sdk-reference/basic-api.md` |
| status | **STALE** |
| mental_model | OLD |
| versions_referenced | none |
| code_examples_count | 9 |
| broken_examples | L62 `wallet: 'auto' \| string \| { privateKey }` — type union is right but doc never explains the gasless implication of `'auto'` (the whole reason it exists); L122-141 Python `translate_handler` example mixes `provide('translate', translate_handler, options={...})` — current Python signature passes options as keyword args, not nested dict (check `python-sdk-v2/src/agirails/level0/provide.py`); L243-249 `RequestResult` fields shown — `transaction.proof` is described as "Delivery proof JSON" but in current SDK that's actually a `DeliveryProof` typed dict not a JSON string; L286-292 `provider: '0x1234...abcd'` — the doc shows passing a hex address as provider but the basic API also supports DID strings (`did:ethr:...`) and `agent_id` (ERC-8004 uint) since 3.0+ |
| missing_concepts | **`wallet="auto"` gasless path** mentioned but not explained (no "this routes through Coinbase paymaster" line); **`provide()` returns Provider with `register_service` + on-chain registration option**; **ERC-8004 agent identity** integration (basic API can auto-register); **Web Receipts** (the upload-receipt hook fires after settle in 3.0+); **Hash-based service routing** (`keccak256(service_name)` on-chain) — basic API uses this but doc never says so |
| severity | **P1** (works but misses why `auto` matters) |
| effort | **M** |
| notes | The Basic API section is the least broken in this audit — the `provide()` / `request()` functions exist in current SDK and the surface matches. Main issue is that it documents 2024-era defaults and misses the Smart Wallet + Web Receipts story. The `serviceDirectory` section (L335-393) is correct but **in-memory directory is mostly deprecated** for production — the doc should pivot users to `discover_agents` (from `agirails.api`) or on-chain `AgentRegistry`. |

---

## `sdk-reference/standard-api.md`

| Column | Value |
|---|---|
| path | `sdk-reference/standard-api.md` |
| status | **STALE** |
| mental_model | OLD |
| versions_referenced | none |
| code_examples_count | ~12 |
| broken_examples | L84-91 `behavior.autoAccept` as function — current SDK supports this but `concurrency: 5` is per-service not per-agent; L101-117 Python example uses dict-positional config — current Python uses keyword args (`Agent(name=..., network=..., wallet=...)`); L222-227 `ServiceConfig.pricing` field — `PricingStrategy` in current SDK has different shape (no `behavior.belowPrice` field); L341-347 `PricingBehavior` table — `belowPrice: 'reject' \| 'counter-offer'` and `belowCost` are stale, current SDK pricing uses `negotiate_when_below=True/False` boolean; L298-303 Python `async def handler` inside dict — **syntactically invalid Python**, would not work as written (you can't define `async def` as a dict value with a colon); L460-493 process-data example uses `context.progress(...)` and `context.abort(...)` — current `JobContext` has `progress` but `abort` is `reject_job(reason)`; L547-552 events table includes `payment:received` with payload `(amount, txId)` — current SDK emits `(amount, tx_id, currency)` (3-tuple) |
| missing_concepts | **`wallet="auto"` as default**; **`Agent.register_service()` on-chain registration** (calls AgentRegistry on construction with `wallet="auto"`); **AIP-2.1 quote channel integration** (Agent can `provide` with `negotiate=True` to expose CounterOffer endpoint); **`actp serve` FastAPI integration** — Agent.start() can launch the daemon; **Web Receipts emission** after settle; **ERC-8004 agent ID** binding to Agent; **`provide_service` vs `provide`** — current SDK has both (decorator and inline forms) |
| severity | **P1** |
| effort | **L** (the pricing strategy shape changed enough that examples need rebuilding) |
| notes | Major issue: L300-304 Python code is syntactically invalid (`async def handler` placed inside a dict). Anyone trying to copy-paste this gets a SyntaxError. The pricing strategy shape (`PricingBehavior.belowPrice` / `belowCost`) doesn't match current implementation. Recommendation: re-derive from `python-sdk-v2/src/agirails/level1/agent.py` and `sdk-js/src/level1/Agent.ts`. |

---

## `sdk-reference/registry.md`

| Column | Value |
|---|---|
| path | `sdk-reference/registry.md` |
| status | **STALE** |
| mental_model | OLD (DID-first, no ERC-8004) |
| versions_referenced | none |
| code_examples_count | 9 |
| broken_examples | L42-49 `registry.register({ services: [...], metadata: {...} })` — current `AgentRegistry.registerAgent(endpoint, serviceDescriptors[])` takes an endpoint URL + array of `ServiceDescriptor` structs, **not** a `services` array of strings and a `metadata` object. Storage shape changed entirely; L88-114 `queryAgentsByService({service, limit})` — current contract signature is `queryAgentsByService(bytes32 hash, uint256 minReputation, uint256 offset, uint256 limit)` — requires `keccak256(service_name)` not the string itself, plus reputation/offset; L154-180 `updateMetadata({description, version})` — no such function. Current has `updateEndpoint(string)`, `addServiceType(string)`, `removeServiceType(bytes32)`; L184-204 `deactivate()` — current is `setActiveStatus(bool)`; L491-495 Chain IDs table OK (`84532`, `8453`); the **DIDManager** section L209-310 documents a DID format `did:ethr:<chainId>:<address>` which is still supported but **no longer primary** — current SDK uses ERC-8004 agent IDs as the canonical identity, DIDs are secondary |
| missing_concepts | **ERC-8004 identity registry** (`ERC8004Bridge` from `agirails.erc8004`); **`ReputationReporter`** for emitting reputation on-chain; **Service hash routing** — services are stored as `keccak256(service_name)` and routed via the reverse map; **`MAX_QUERY_AGENTS = 1000`** cap and **off-chain indexer pattern** (mentioned briefly L118 but no migration guide); **`AgentProfile` struct shape** (endpoint, DID, reputation, totals, flags); **`compute_service_type_hash`** helper (Python) / `computeServiceTypeHash` (TS) — both are exported in current SDK |
| severity | **P0** (function signatures don't match contract) |
| effort | **L** |
| notes | The Registry section documents a hypothetical API that does not match the on-chain `AgentRegistry.sol`. `register({services, metadata})` is the old "v1" registry shape; current is `registerAgent(endpoint, ServiceDescriptor[])`. `queryAgentsByService` takes a `bytes32 hash` not a string. Any integrator copy-pasting from this page hits ABI mismatch errors immediately. Recommendation: regenerate the entire section from `Protocol/actp-kernel/src/registry/AgentRegistry.sol` + `python-sdk-v2/src/agirails/protocol/agent_registry.py`. |

---

## `sdk-reference/utilities.md`

| Column | Value |
|---|---|
| path | `sdk-reference/utilities.md` |
| status | **STALE** |
| mental_model | OLD |
| versions_referenced | none |
| code_examples_count | ~14 |
| broken_examples | L24-39 `NonceManager('.actp/nonces')` — current TS SDK exports `NonceManager` + `InMemoryNonceManager`, not the file-backed `NonceManager` constructor signature shown. Current `NonceManagerPool` (Python) wraps multiple per-account NonceManagers; L77-90 `ReceivedNonceTracker` — current SDK has `IReceivedNonceTracker`, `InMemoryReceivedNonceTracker`, `SetBasedReceivedNonceTracker` (Python) and `IReceivedNonceTracker` + `InMemoryReceivedNonceTracker` (TS); the simple file-path constructor shown doesn't match either; L240-262 `validateAddress`, `validateAmount`, etc. — current Python SDK exports from `agirails.utils.validation` are `validate_address`, `validate_amount`, `validate_deadline`, `validate_tx_id`, `validate_endpoint_url`, `validate_dispute_window`, `validate_bytes32` (note: `validateBytes32` and `validateEndpointUrl` missing from doc); L304-329 `Helpers.parseDeadline()`, `Helpers.generateId()`, `Helpers.sleep()` — these are not in current Python SDK helpers module (different shape — `parse_usdc`, `format_usdc`, `shorten_address`, `hash_service_metadata` are the actual exports per `__init__.py:180-193`); L375-388 `Logger.setLevel('debug')` — current Python SDK Logger uses standard `logging` module conventions; L424-462 `IPFSClient` example shows `pinningService: 'https://api.pinata.cloud'` — current SDK uses Filebase (S3) not Pinata (changed in 3.0+); L532-545 `ErrorRecoveryGuide.get(error)` — this class is not exported from current `agirails` package |
| missing_concepts | **`compute_transaction_id`** helper (exported in Python `__init__.py:85`, computes Smart Wallet routing hash); **`canonical_json_dumps`** / `compute_type_hash` / `hash_struct` / `compute_domain_separator` (all exported but not documented); **`timing_safe_equal`**, **`validate_path`**, **`validate_service_name`**, **`is_valid_address`**, **`safe_json_parse`**, **`LRUCache`** (all in `agirails.utils`); **`IUsedAttestationTracker`** family (Python: `InMemoryUsedAttestationTracker`, `FileBasedUsedAttestationTracker`, `create_used_attestation_tracker`); **`MessageNonceManager`** for AIP-2 quote nonces |
| severity | **P1** |
| effort | **M** |
| notes | Most utilities documented exist conceptually but the constructor signatures and method names don't match current SDK. The IPFSClient example especially is misleading — pointing at Pinata when current SDK ships Filebase (S3) integration. Recommendation: regenerate from `agirails/__init__.py:151-212` (utilities section) + `sdk-js/src/utils/`. |

---

## `sdk-reference/errors.md`

| Column | Value |
|---|---|
| path | `sdk-reference/errors.md` |
| status | **STALE** |
| mental_model | OLD |
| versions_referenced | none |
| code_examples_count | ~10 |
| broken_examples | L18-48 error hierarchy diagram — missing **10+ x402 errors** (`X402Error`, `X402ConfigError`, `X402PublishRequiredError`, `X402UnsupportedWalletError`, `X402NetworkNotAllowedError`, `X402AmountExceededError`, `X402ApprovalFailedError`, `X402SignatureFailedError`, `X402SettlementProofMissingError`, `X402PaymentFailedError` — all exported in `sdk-js/src/index.ts:74-86`); missing **`MockStateCorruptedError`**, **`MockStateVersionError`**, **`MockStateLockError`** (Python exports `agirails/__init__.py:146-148`); missing **`EscrowNotFoundError`**, **`DeadlinePassedError`**, **`DisputeWindowActiveError`**, **`ContractPausedError`**, **`InsufficientBalanceError`** (all in Python `errors/__init__.py`); L139 Python `from agirails import TransactionNotFoundError` works but the `details` dict has changed shape (TS uses camelCase keys like `txId`, Python uses snake_case `tx_id`) — examples mix conventions; L591-594 imports `TimeoutError` from `agirails` — actual Python export is `ACTPTimeoutError` (renamed to avoid collision with built-in `TimeoutError`, see `agirails/__init__.py:139`) |
| missing_concepts | **X402 error family** (10 classes); **MockState errors** (3 classes for corruption / version / lock); **Receipt upload errors** (`ReceiptUploadFailure` exists in Python — see `agirails/receipts/__init__.py`); **AIP-14 dispute bond errors**; the Python rename **`TimeoutError` → `ACTPTimeoutError`** is undocumented |
| severity | **P1** |
| effort | **M** |
| notes | The error hierarchy was probably accurate at the time of writing but is now ~50% incomplete. Critical breakage: the doc says `from agirails import TimeoutError` but the actual export is `ACTPTimeoutError` — Python copy-paste hits ImportError (or shadows the built-in). Recommendation: re-derive hierarchy from `python-sdk-v2/src/agirails/errors/__init__.py` + `sdk-js/src/errors/index.ts` + `sdk-js/src/errors/X402Errors.ts`. |

---

## `sdk-reference/advanced-api/index.md`

| Column | Value |
|---|---|
| path | `sdk-reference/advanced-api/index.md` |
| status | **STALE** |
| mental_model | OLD |
| versions_referenced | none |
| code_examples_count | ~10 |
| broken_examples | L55-60 `ACTPClientConfig` table — `privateKey` is no longer the primary auth field. Current 4.0.0 + 3.0.1 SDK uses `wallet` (with values `"auto"`, `"existing"`, `{privateKey}`, `{keystore}`) and `requesterAddress` is auto-derived from wallet when `wallet="auto"`; L86-100 mainnet example `rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/YOUR_KEY'` — current default RPC is `https://mainnet.base.org` (public) and Alchemy is optional via `BASE_MAINNET_RPC` env var; L117-123 Python config uses **mixed case** keys (`requesterAddress`, `privateKey`, `rpcUrl`) in a Python dict — Python SDK accepts both but documentation should be consistent (snake_case is canonical); L150-184 `client.basic.pay({...})` — `'amount': '100'` shown as string. Current SDK accepts `int | str | Decimal | BigInt` per `BasicPayParams`; L290-298 `client.advanced.time.advance(3600)` and `client.advanced.mintTokens(...)` — only available in mock mode but the `if ('time' in client.advanced)` runtime check is correct; L362-381 State machine ASCII diagram — **shows IN_PROGRESS as optional ("Optional")** — current kernel requires IN_PROGRESS (cannot skip COMMITTED → DELIVERED, per `transitionState` revert rules); Python CHANGELOG 3.0.1 explicitly flags the corrected state machine including `INITIATED → COMMITTED` direct path |
| missing_concepts | **`wallet="auto"` / AutoWalletProvider** as primary path; **`compute_transaction_id`** helper; **AIP-2.1 quote channel** (`CounterOfferBuilder`, `CounterAcceptBuilder`, `QuoteChannelHandler`); **Web Receipts** (`upload_receipt`, `ReceiptUploadOptions`, `ReceiptWrite` EIP-712 signing); **`acceptQuote`**, **`linkEscrow`**, **`releaseEscrow` Smart Wallet paths** routed through bundler+paymaster; **ERC-8004 identity** (`ERC8004Bridge`, `ReputationReporter`); **`actp serve` FastAPI integration**; **x402 v2 direct buyer→seller** path |
| severity | **P0** (frames advanced API around EOA + privateKey, hides the Smart Wallet revolution) |
| effort | **L** |
| notes | This page sets the mental model for the entire advanced section — and it pushes integrators toward EOA / privateKey when current SDK defaults to Smart Wallet / gasless / paymaster. The state machine diagram has the IN_PROGRESS edge wrong (claims optional, kernel enforces). Recommendation: rebuild around `wallet="auto"` defaults, point to AIP-2.1 quote channel, and link to `actp serve` for the daemon path. |

---

## `sdk-reference/advanced-api/eas.md`

| Column | Value |
|---|---|
| path | `sdk-reference/advanced-api/eas.md` |
| status | **STALE** |
| mental_model | OLD |
| versions_referenced | none |
| code_examples_count | ~8 |
| broken_examples | L52-57 EAS contract addresses table — addresses correct (`0x4200000000000000000000000000000000000021` is the canonical EAS for Base on both networks per `networks.py:176-177` and `:229-230`). But the schema UID is not listed here. Schema UIDs differ per network: sepolia `0x1b0ebdf0bd20c28ec9d5362571ce8715a55f46e81c3de2f9b0d8e1b95fb5ffce`, mainnet `0x166501e7476e2fcf9214c4c5144533c2957d56fe59d639effc1719a0658d9c9a`. The doc shows neither |
| missing_concepts | **Network-specific delivery schema UIDs**; **`Attestation` typed dict / class** (exported from Python `protocol`); **`DELIVERY_SCHEMA` constant**; **`ZERO_BYTES32`**; **EAS SDK 2.x migration** (sdk-js 4.0.0 bumped `@ethereum-attestation-service/eas-sdk` 1.6.1 → 2.9.x, changed `EASHelper.attest` to read tx hash from `Transaction.receipt.hash` — see TS CHANGELOG 4.0.0) |
| severity | **P1** |
| effort | **S** (most of the doc is right, just add schema UIDs and EAS SDK 2.x note) |
| notes | Doc is closer to correct than most. Main gaps: missing per-network schema UIDs, missing the EAS SDK 2.x migration note (which could surprise an integrator if they pin `eas-sdk` 1.x). |

---

## `sdk-reference/advanced-api/escrow.md`

| Column | Value |
|---|---|
| path | `sdk-reference/advanced-api/escrow.md` |
| status | **STALE** |
| mental_model | OLD |
| versions_referenced | none |
| code_examples_count | ~5 |
| broken_examples | L48-57 `client.escrow.approveToken(USDC_ADDRESS, amount)` — this method exists but the doc never mentions that with `wallet="auto"` the approval is batched into the same UserOp as `linkEscrow` (no separate transaction needed); L93-100 `client.escrow.getEscrow(escrowId)` example returns fields `released` and `remaining` — verify against current `EscrowVault.sol` getter; the doc doesn't mention that escrow data is **deleted when fully released** (described in `contract-reference.md:1920` but not here) so `getEscrow` on a settled escrow returns zeros |
| missing_concepts | **Smart Wallet batched approve+link**; **`escrow.computeEscrowId(txId)` helper** (deterministic ID via `keccak256(txId || "escrow")`); **escrow deletion on full release**; **AIP-3 escrow workflow** (mentioned at L29 but no link); **dispute bond escrow** (separate from primary escrow per AIP-14) |
| severity | **P1** |
| effort | **M** |
| notes | Surface looks roughly correct but misses Smart Wallet batched flow. The "approve → link" two-step is now a one-tx UserOp in 4.0.0 SDK; doc still teaches the EOA two-step pattern. |

---

## `sdk-reference/advanced-api/events.md`

| Column | Value |
|---|---|
| path | `sdk-reference/advanced-api/events.md` |
| status | **STALE** |
| mental_model | OLD |
| versions_referenced | none |
| code_examples_count | ~8 |
| broken_examples | L38-49 `client.events.watchTransaction(txId, callback)` — current TS SDK exports `EventMonitor` from `protocol/EventMonitor` (`index.ts:158`). Need to verify whether `client.events` is still a property or whether you instantiate `EventMonitor` directly. Likely both work but the doc should show the canonical path; the AIP-14 event signatures (`DisputeOpened(initiator, bondAmount)`, `DisputeResolved(initiator, providerAtFault, bondAmount)`) are not documented here at all |
| missing_concepts | **AIP-14 dispute events** (`DisputeOpened`, `DisputeResolved` with new signatures); **`TransactionCreated` event has 8 fields** now (includes `agentId`); **ReceiptEmitted** event from agirails.app (Web Receipts); **Quote channel events** (off-chain WebSocket events from `actp serve`) |
| severity | **P1** |
| effort | **M** |
| notes | The basic event monitoring path is right but the new AIP-14 event signatures are missing entirely. Anyone parsing `DisputeOpened` against the old 4-field signature will fail. |

---

## `sdk-reference/advanced-api/kernel.md`

| Column | Value |
|---|---|
| path | `sdk-reference/advanced-api/kernel.md` |
| status | **WRONG** |
| mental_model | OLD |
| versions_referenced | none |
| code_examples_count | ~12 |
| broken_examples | L62-91 `kernel.createTransaction({provider, requester, amount, deadline, disputeWindow, serviceHash})` — **missing `agentId` and `requesterAgentId` parameters**. Current `IACTPKernel.createTransaction` (`IACTPKernel.sol:145-154`) takes **8 parameters**; L97-107 Parameters table — only 6 rows, missing `agentId`, `requesterAgentId`; L156-198 `Transaction` interface returned by `getTransaction()` — **15 fields shown, 21 fields in chain**. Missing: `requesterPenaltyBpsLocked`, `disputeBondBpsLocked`, `agentId`, `requesterAgentId`, `disputeInitiator`, `disputeBond`; L237-247 Valid Transitions table — "DELIVERED/DISPUTED → SETTLED — System" is wrong, current kernel allows requester/provider/admin paths via different proof types; L348-358 `kernel.raiseDispute(txId, disputeProof)` — **no such method on the contract**. `IACTPKernel.sol` has no `raiseDispute`. Disputes are raised via `transitionState(txId, State.DISPUTED, '0x')` (see `sdk-js/src/protocol/ACTPKernel.ts:719` — the TS SDK provides a wrapper but the underlying contract call is `transitionState`); L381-410 `kernel.resolveDispute` — same, wrapper not chain method. Doc should clarify SDK wrapper vs contract path; L421-449 `kernel.cancelTransaction(txId)` — same, this is a `transitionState(txId, State.CANCELLED, '0x')` call; L411-417 Resolution Options table (`PROVIDER_WINS`, `REQUESTER_WINS`, `SPLIT`) — these are SDK enum values; the on-chain proof format is `abi.encode(requesterAmount, providerAmount)` (64-byte) or `abi.encode(requesterAmount, providerAmount, mediator, mediatorAmount)` (128-byte) per `contract-reference.md:768-773` |
| missing_concepts | **8-parameter `createTransaction` with ERC-8004 agentIds**; **21-field `TransactionView`**; **`acceptQuote(txId, newAmount)` function**; **AIP-14 dispute bonds**; **Smart Wallet routing** (`msg.sender == requester` via UserOp); **`releaseMilestone`** (in contract, missing from doc); **AIP-14 dispute initiator + bond return logic**; **Mediator timelock M-2 fix**; **Mediator hot-swap fee lock M-3 fix**; **Per-tx-locked rates** (each tx locks fee/penalty/bond at creation) |
| severity | **P0** |
| effort | **L** (signature changes + 6 new fields + new function `acceptQuote` + AIP-14 surface = full rewrite) |
| notes | This is one of the **most-broken pages** because the contract signature has materially changed: `createTransaction` went from 6 params to 8, `TransactionView` went from 15 fields to 21, and dispute resolution involves a `disputeBond` flow that isn't documented anywhere on this page. Any integrator using `client.advanced.createTransaction` with only 6 params hits a function-not-found error (ABI mismatch). Recommendation: **block on `IACTPKernel.sol` rewrite first**, then mirror in this doc. |

---

## `sdk-reference/advanced-api/message-signer.md`

| Column | Value |
|---|---|
| path | `sdk-reference/advanced-api/message-signer.md` |
| status | **STALE** |
| mental_model | OLD |
| versions_referenced | none |
| code_examples_count | ~10 |
| broken_examples | L38-44 `MessageSigner.create(signer, KERNEL_ADDRESS, {chainId: 84532})` — factory signature looks roughly right; need to verify against `sdk-js/src/protocol/MessageSigner.ts`; the doc doesn't mention **Smart Wallet (ERC-4337) signing** path which differs from EOA signing (Smart Wallet signs via the smart account's `isValidSignature` ERC-1271 method) |
| missing_concepts | **ERC-1271 signing for Smart Wallets**; **`ReceiptWrite` EIP-712 type for Web Receipts**; **AIP-2.1 quote/counter-offer types**; **MessageNonceManager** (mentioned in `__init__.py` as exported but doc never references); **`hash_typed_data` / `create_typed_data`** helpers (Python exports) |
| severity | **P2** |
| effort | **M** |
| notes | The base EIP-712 signing surface is documented OK. Main gap is that Smart Wallet signing is materially different from EOA signing (ERC-1271 vs ECDSA recover) and the doc never mentions this, even though Smart Wallet is the default in 4.0.0. |

---

## `sdk-reference/advanced-api/proof-generator.md`

| Column | Value |
|---|---|
| path | `sdk-reference/advanced-api/proof-generator.md` |
| status | **STALE** |
| mental_model | OLD |
| versions_referenced | none |
| code_examples_count | ~8 |
| broken_examples | L37-49 `new ProofGenerator()` — the TS SDK 4.0.0 also exports `URLValidationConfig` (`index.ts:160`), which is not mentioned; L18-21 mentions "SSRF protection" but doesn't show how to configure the URL validator; need to verify `ProofGenerator` constructor signature against `sdk-js/src/protocol/ProofGenerator.ts` |
| missing_concepts | **`URLValidationConfig`** (SSRF protection knobs); **`DeliveryProofBuilder`** (separate builder, exported in `index.ts:172`); **`compute_result_hash`** Python helper (`agirails/__init__.py:267`); **Merkle proof family** — `MerkleProof`, `verify_merkle_proof`, `hash_service_input`, `hash_service_output` (all Python exports per `__init__.py:280-283`) |
| severity | **P2** |
| effort | **M** |
| notes | Surface largely accurate, but misses the Merkle proof helpers and SSRF configuration. Recommendation: add Merkle proof section and link `DeliveryProofBuilder` from quote.md. |

---

## `sdk-reference/advanced-api/quote.md`

| Column | Value |
|---|---|
| path | `sdk-reference/advanced-api/quote.md` |
| status | **STALE** |
| mental_model | OLD (AIP-2 only, no AIP-2.1) |
| versions_referenced | none |
| code_examples_count | ~6 |
| broken_examples | L35-58 `QuoteMessage` interface — looks correct for AIP-2 baseline; L100-124 `quoteBuilder.build({...})` example — matches AIP-2; but the doc covers **only `QuoteBuilder`** and is missing the AIP-2.1 surface entirely (no `CounterOfferBuilder`, no `CounterAcceptBuilder`); the EIP-712 types at L375-393 are for `PriceQuote` only — AIP-2.1 adds `CounterOffer` and `CounterAccept` typed-data schemas |
| missing_concepts | **AIP-2.1 `CounterOfferBuilder`** (exported in TS `index.ts:168` and Python `builders/`); **AIP-2.1 `CounterAcceptBuilder`** (TS `index.ts:170`, Python builders); **`CounterOfferMessage` / `CounterOfferParams` / `CounterAcceptMessage` / `CounterAcceptParams` typed dicts**; **`QuoteChannelHandler`** (or equivalent server-side daemon class behind `actp serve`); **CounterOffer justification field expanded** in 2.1 (estimatedTime, computeCost, breakdown); **Per-tx nonce tracking** via MessageNonceManager |
| severity | **P0** (this is the biggest "new product missing from docs" gap — AIP-2.1 quote channel is the headline feature of the current SDK) |
| effort | **L** |
| notes | This page documents AIP-2 quotes (the original price-quote spec) but the SDK has shipped **AIP-2.1** with `CounterOfferBuilder` / `CounterAcceptBuilder` and a FastAPI quote-channel daemon (`actp serve`). The headline "quote channel" / negotiation feature of the current shipped surface is **entirely absent** from this page. Recommendation: rewrite as "Quote Channel (AIP-2.1)" with sections for `QuoteBuilder` (legacy), `CounterOfferBuilder`, `CounterAcceptBuilder`, and `actp serve` integration. |

---

## Agent C — rollup

### Total severity counts

- **P0:** 8 (`cli-reference.md`, `contract-reference.md`, `sdk-reference/index.md`, `sdk-reference/registry.md`, `sdk-reference/advanced-api/index.md`, `sdk-reference/advanced-api/kernel.md`, `sdk-reference/advanced-api/quote.md`, plus `standard-api.md` for the invalid-Python `async def` inline dict)
- **P1:** 6 (`error-reference.md`, `basic-api.md`, `standard-api.md` — counted once for the broader staleness, `sdk-reference/errors.md`, `utilities.md`, `advanced-api/eas.md`, `advanced-api/escrow.md`, `advanced-api/events.md`)
- **P2:** 2 (`advanced-api/message-signer.md`, `advanced-api/proof-generator.md`)

(Net 16 distinct files; some files appear under more than one category in the discussion above because they have both P0 issues and P1 staleness. The bucket counts dedupe to: 5 P0, 8 P1, 3 P2 in strict-bucket terms. Quoted above is the per-issue count.)

### Top 5 most-broken pages (P0)

1. **`contract-reference.md`** — V2 testnet + V2 mainnet addresses hardcoded in 6+ code blocks; 21-field `TransactionView` documented as 15 fields; `createTransaction` documented with 6 params (chain has 8). Any copy-paste hits ABI mismatch or wrong contract.
2. **`cli-reference.md`** — `actp tx deliver`, `actp tx settle`, `actp tx cancel`, `actp tx create` don't exist in the SDK. `actp time` doesn't exist. 9+ new commands (`serve`, `request`, `verify`, `claim-code`, `repair`, `find`, `negotiate`, `register`, `claim`, `autopublish`, `health`) are entirely absent. `actp config` is documented as a subcommand group but is a flat command.
3. **`sdk-reference/advanced-api/kernel.md`** — Function signatures don't match: `createTransaction` shows 6 params (chain has 8 with ERC-8004 agentIds); `Transaction` interface shows 15 fields (chain has 21); `raiseDispute` / `resolveDispute` / `cancelTransaction` are SDK wrappers, not contract methods — doc presents them as primary. AIP-14 dispute-bond surface absent.
4. **`sdk-reference/registry.md`** — `register({services, metadata})` API does not exist on chain. `queryAgentsByService({service, limit})` takes a string but contract takes `bytes32 hash + minReputation + offset + limit`. `updateMetadata` / `deactivate` don't exist (current is `updateEndpoint` / `setActiveStatus`). ERC-8004 integration entirely missing.
5. **`sdk-reference/advanced-api/quote.md`** — Documents AIP-2 only; the SDK has shipped AIP-2.1 with `CounterOfferBuilder` / `CounterAcceptBuilder` / `actp serve` quote-channel daemon. The headline negotiation feature of the current SDK is invisible in the docs.

### Cross-cut: CLI commands

**Wrong or missing in `cli-reference.md`:**

- **Wrong (4):** `actp tx create`, `actp tx deliver`, `actp tx settle`, `actp tx cancel` — none of these exist. Current `tx.py` has only `status`, `list`, `transition`.
- **Wrong (1):** `actp time` (with `show`, `advance`, `set` subcommands) — does not exist anywhere in `python-sdk-v2/src/agirails/cli/`.
- **Wrong (1):** `actp config` shown as a subcommand group (`show` / `set` / `get`) — actual file is `config.py` with a flat callable.
- **Missing (11):** `actp serve`, `actp request`, `actp verify`, `actp claim-code`, `actp repair`, `actp find`, `actp negotiate`, `actp register`, `actp claim`, `actp autopublish`, `actp health` (plus `actp test`, `actp receipt`) — all exist in `cli/main.py` lines 140-184 but are absent from docs.

**Net:** 6 documented commands are wrong + 11-13 actual commands are missing = **~18 CLI surface mismatches** in this single file.

### Cross-cut: Contract addresses

**Stale in `contract-reference.md`:**

| Doc address | Real address (`networks.py`) | Network |
|---|---|---|
| `0x0ba0b17554601b30F5406e74d2208f567C12CcFE` (ACTPKernel) | `0x9d25A874f046185d9237Cd4954C88D2B74B0021b` | Base Sepolia |
| `0xedC62264301A119207f1f89C6bDE4Fd7a7A4CeB4` (EscrowVault) | `0x7dF07327090efcA73DCBa70414aA3131Fc6d2efB` | Base Sepolia |
| `0x132B9eB321dBB57c828B083844287171BDC92d29` (ACTPKernel) | `0x048c811352e8a3fECd5b0Ec4AA2c2b94083CC842` | Base Mainnet |
| `0x6aAF45882c4b0dD34130ecC790bb5Ec6be7fFb99` (EscrowVault) | `0x262D5912A9612F0c66dA5d13B4E678D50ebC44b5` | Base Mainnet |
| `0x6fB222CF3DDdf37Bcb248EE7BBBA42Fb41901de8` (AgentRegistry) | `0x64Cb18bfb3CC1aCb1370a3B01613391D3561a009` | Base Mainnet |
| `0x0516C411C0E8d75D17A768022819a0a4FB3cA2f2` (ArchiveTreasury) | `0x6159A80Ce8362aBB2307FbaB4Ed4D3F4A4231Acc` | Base Mainnet |
| `0xDd6D66924B43419F484aE981F174b803487AF25A` (AgentRegistry sepolia) | `0xD91F9aBfBf60b4a2Fd5317ab0cDF3F44faB5D656` | Base Sepolia |
| `0xACB672de092beaAE2cd286dD61Cb2352AF7159F1` (ArchiveTreasury sepolia) | `0x2eE4f7bE289fc9EFC2F9f2D6E53e50abDF23A3eb` | Base Sepolia |

**Net:** 8 stale contract addresses, all hardcoded into multiple code blocks (the V2 sepolia kernel `0x0ba0b17554601b30F5406e74d2208f567C12CcFE` is referenced ~9 times across `contract-reference.md`). Plus missing entirely: **ERC-8004 IdentityRegistry** (`0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` mainnet, `0x8004A818BFB912233c491871b3d84c89A494BD9e` sepolia), **AGIRAILSIdentityRegistry** (`0xce9749c768b425fab0daa0331047d1340ec99a88` sepolia only), **X402Relay** (`0x110b25bb3d45c40dfcf34bb451aa7069b2a1cb3b` sepolia, **deprecated since SDK 3.3.0**).

### Cross-cut: SDK function/class mismatches

**Functions in docs that don't exist in current SDK:**

- `Helpers.parseDeadline()`, `Helpers.generateId()`, `Helpers.sleep()` (utilities.md L304-329) — Python SDK helpers module has different exports
- `ErrorRecoveryGuide.get(error)` (utilities.md L532) — not exported from current `agirails` package
- `registry.register({services, metadata})` (registry.md L42) — signature is `registerAgent(endpoint, ServiceDescriptor[])`
- `registry.queryAgentsByService({service, limit})` (registry.md L88) — signature is `queryAgentsByService(bytes32 hash, minReputation, offset, limit)`
- `registry.updateMetadata({...})` (registry.md L154) — does not exist; use `updateEndpoint` / `addServiceType` / `removeServiceType`
- `registry.deactivate()` (registry.md L184) — current is `setActiveStatus(bool)`
- `kernel.raiseDispute(txId, proof)` (kernel.md L348) — chain has no such function; SDK wrapper calls `transitionState(DISPUTED)`
- `kernel.resolveDispute(txId, resolution)` (kernel.md L381) — same — SDK wrapper, not chain function
- `kernel.cancelTransaction(txId)` (kernel.md L421) — same — SDK wrapper, not chain function
- `TimeoutError` import in Python (errors.md L591) — actual export is `ACTPTimeoutError`
- `PROVIDER_PAID_FEE_FAILED` error code (error-reference.md L46) — phantom error from removed x402 relay
- `tx deliver` / `tx settle` / `tx cancel` / `tx create` (cli-reference.md) — none exist
- `actp time` command (cli-reference.md L505) — does not exist

**Functions in current SDK but missing from docs:**

- `actp serve`, `actp request`, `actp verify`, `actp claim-code`, `actp repair`, `actp find`, `actp negotiate`, `actp register`, `actp claim`, `actp autopublish`, `actp health` (CLI)
- `CounterOfferBuilder`, `CounterAcceptBuilder`, `MessageNonceManager` (AIP-2.1)
- `upload_receipt`, `ReceiptUploadOptions`, `ReceiptUploadPayload` (Web Receipts)
- `AutoWalletProvider`, `EOAWalletProvider`, `WalletTier`, `IWalletProvider` (Smart Wallet path)
- `ERC8004Bridge`, `ReputationReporter` (ERC-8004 identity)
- `discover_agents` (agirails.app discovery API)
- `compute_transaction_id` (Smart Wallet routing hash)
- `kernel.acceptQuote(txId, newAmount)` (in `IACTPKernel.sol:161`)
- `X402Error` family (10 classes)
- `MockStateCorruptedError`, `MockStateVersionError`, `MockStateLockError`

**Net:** ~13 documented APIs don't exist + ~20+ shipped APIs are undocumented = **30+ SDK surface mismatches**.

### One-line recommendation for what to rewrite first

**Rewrite `contract-reference.md` first.** It contains 8 stale contract addresses copy-pasted into ~30 code blocks, a `TransactionView` struct that's wrong by 6 fields, and a `createTransaction` signature that's wrong by 2 parameters — every other reference page links to it for the canonical truth, so fixing it unblocks the rest of the cascade.
