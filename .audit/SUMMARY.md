# docs-site audit — SUMMARY

**Audit window**: 2026-05-26
**Scope**: 48 markdown files under `docs-site/docs/`, audited against `@agirails/sdk@4.0.0` + `agirails@3.0.1` + V3 mainnet / V4 sepolia contracts + canonical AGIRAILS.md V4.
**Sources**: [`01-root-and-concepts.md`](./01-root-and-concepts.md) (Agent A), [`02-guides-and-cookbook.md`](./02-guides-and-cookbook.md) (Agent B), [`03-reference.md`](./03-reference.md) (Agent C).

## Corrections (post-rewrite, 2026-05-29)

This pre-rewrite audit was the input that motivated building the truth-ledger. The truth-ledger itself surfaced false negatives in this very audit. Per Apex DR-7, those need to be back-propagated so the record is honest about its own approximation.

Confirmed false negatives in this audit:

- **`actp time` was claimed to not exist** (table row 6, line 80, and elsewhere). The truth-ledger manifest confirms `actp time` ships at [`python-sdk-v2/src/agirails/cli/main.py:146`](https://github.com/agirails/sdk-python/blob/main/src/agirails/cli/main.py#L146) as `app.add_typer(time_cmd.time_app, name="time")` and is present in the auto-extracted CLI surface (`manifest.cli.python.commands`). This was not a deprecated-but-still-shipping case; it was a manual-audit miss against a command that was there the whole time. It is the origin story for the truth-ledger as a source-of-truth gate.

Implications for the 54%-P0 headline:

The **54% P0** figure was derived from the same manual-grade approximation that produced the `actp time` false negative. Treat it as a directional severity signal, not a precise count. The rewrite (Waves A.1 through A.21) replaced the whole audited surface anyway, so the P0/P1/P2 split here mostly serves as historical context for what we were responding to, not as a load-bearing claim today. If you want a current-state figure, run the truth-ledger build and read [REWRITE_REPORT.md](./REWRITE_REPORT.md) (the metrics block auto-regenerates from manifest, so it cannot drift from reality the way this audit did).

Other false-claim entries in 03-reference.md flagging non-existent commands were not re-graded against current source individually. The truth-ledger build catches any future divergence: if `actp time` (or any other Typer-registered command) is missing from the manifest, the CLI extractor warns, and the coverage floor in `truth-ledger.pins.json` fails the build if Python CLI commands drop below the configured minimum.

## Executive summary

**54% of audited pages are P0** — broken or misleading on copy-paste. The docs reflect the pre-2026-05-19 protocol surface (V2 mainnet kernel, 15-field `TransactionView`, no Smart Wallet, no Web Receipts, no AIP-2.1, no LLM onboarding) almost across the board.

| Severity | Count | % of audited |
|---|---:|---:|
| **P0** (broken / misleading) | 26 | 54% |
| **P1** (stale but functional) | 17 | 35% |
| **P2** (cosmetic) | 5 | 10% |
| **TOTAL** | 48 | 100% |

The mental model is wrong, not just the addresses. AGIRAILS.md is documented as "another config file"; the canonical 1242-line protocol spec with embedded LLM onboarding is mentioned in **zero** of the 48 pages.

## Per-scope tally

| Scope | Files | P0 | P1 | P2 | Note |
|---|---:|---:|---:|---:|---|
| **A — root + concepts** (Agent A) | 14 | 8 | 4 | 2 | Hero funnel and protocol concepts. Every page has stale addresses and pre-Smart-Wallet framing. |
| **B — guides + cookbook + examples** (Agent B) | 18 | 13 | 5 | 0 | Worst absolute count. `agirailsmd-config.md` teaches wrong frontmatter schema; n8n + openclaw integration addresses all stale; CrewAI guide doesn't parse as Python. |
| **C — reference (CLI, contracts, SDK)** (Agent C) | 16 | 5 | 8 | 3 | `contract-reference.md` lists 8 stale addresses; `cli-reference.md` has ~18 surface mismatches; ~30+ SDK function mismatches between docs and shipped surface. |

## The 15 most-broken pages (P0, by gap-to-current-SDK)

| # | Page | Why it's broken | Effort |
|---|---|---|---|
| 1 | `docs/contract-reference.md` | 8 stale addresses hardcoded in ~30 code blocks; `TransactionView` listed as 15 fields (chain has 21); `createTransaction` listed with 6 params (chain has 8). Every other reference page links to it as canonical. | L |
| 2 | `docs/guides/agirailsmd-config.md` | Teaches wrong frontmatter schema for the single most-consequential file in the platform. Copy-paste yields a file `parseAgirailsMdV4` rejects. Doesn't mention LLM onboarding, doesn't mention `{slug}.md` identity file output. | L |
| 3 | `docs/installation.md` | Pins `@agirails/sdk@2.5.0` / `agirails@2.3.0`. All contract addresses pre-V3. Mint-USDC example uses raw ethers instead of `actp mint`. | L |
| 4 | `docs/index.md` | Homepage. Stale addresses, zero mention of new positioning (AGIRAILS.md, LLM onboarding, Smart Wallet). First impression every reader gets. | M |
| 5 | `docs/quick-start.md` | Wrong SDK shape (`ACTPClient.create({mode, privateKey})` pattern; current is `wallet="auto"`). No `actp init` flow. No "ask your AI" framing. | M |
| 6 | `docs/cli-reference.md` | 6 documented commands don't exist (`tx deliver/settle/cancel/create`, `actp time`); 11+ shipped commands undocumented (`serve`, `request`, `verify`, `claim-code`, `repair`, `find`, `negotiate`, `register`, `claim`, `autopublish`, `health`). | L |
| 7 | `docs/guides/integrations/n8n.md` | Every on-chain address stale (V3 mainnet kernel, V4 sepolia kernel, both EscrowVaults). Stale n8n package version (2.3.0 vs 2.5.0). | M |
| 8 | `docs/guides/integrations/crewai.md` | `CrewPaymentTool` class doesn't parse as Python (broken indentation, literal newlines mid-return). Sync calls on async-only Python SDK. | M |
| 9 | `docs/guides/integrations/langchain.md` | Calls 4 methods that don't exist on `ACTPClient`. Sync-on-async. | M |
| 10 | `docs/concepts/transaction-lifecycle.md` | "1B USDC max amount" — actual mainnet cap is $1000. No AIP-14 dispute bonds, no INV-30 locked-bps. | L |
| 11 | `docs/concepts/fee-model.md` | Central claim "$0.05 fee enforced off-chain by SDK" inverted — MIN_FEE moved on-chain in V3. Every "MUST enforce off-chain" warning becomes wrong. | M |
| 12 | `docs/sdk-reference/advanced-api/kernel.md` | `createTransaction` signature wrong (6 vs 8 params); `Transaction` interface wrong (15 vs 21 fields); `raiseDispute`/`resolveDispute`/`cancelTransaction` documented as kernel methods (they're SDK wrappers). | L |
| 13 | `docs/sdk-reference/registry.md` | `register({services, metadata})` API doesn't exist on chain; `queryAgentsByService` signature wrong; ERC-8004 integration entirely missing. | L |
| 14 | `docs/sdk-reference/advanced-api/quote.md` | Documents AIP-2 only; AIP-2.1 (`CounterOfferBuilder`, `CounterAcceptBuilder`, `actp serve`) is the current shipped surface and is invisible. | M |
| 15 | `docs/cookbook/api-pay-per-call.md` | Recommends ACTP escrow for the textbook x402 use case (per-API-call billing). Canonical AGIRAILS.md explicitly says x402 here. Also `linkEscrow(txId)` single-arg bug. | M |

## Cross-cut A — Concepts missing from the ENTIRE docs

These are core 4.0/V3 surface items. Mentioned in ≤2 of 48 pages each.

| Concept | Pages that mention it | Should mention it |
|---|---:|---:|
| **AGIRAILS.md as canonical protocol spec (not "config file")** | 0 | ≥15 |
| **`{slug}.md` / agent.md identity file (V4 parser, `parseAgirailsMdV4`)** | 0 | ≥10 |
| **LLM-driven onboarding ("ask your AI assistant")** | 0 | ≥5 (everywhere `actp init` appears) |
| **`wallet="auto"` Smart Wallet path (Coinbase paymaster, gasless)** | 1 | ≥20 |
| **Web Receipts (`upload_receipt`, EIP-712 ReceiptWrite, agirails.app)** | 0 | ≥8 |
| **AIP-2.1 quote channel (`CounterOfferBuilder`, `CounterAcceptBuilder`, `actp serve`)** | 0 | ≥10 |
| **New CLI commands** (`serve`, `request`, `verify`, `claim-code`, `repair`, `find`) | 0 | ≥15 |
| **V3 mainnet addresses** (`0x048c8113…` kernel etc.) | 0 | ≥20 |
| **V4 sepolia addresses** (`0x9d25A874…` kernel etc.) | 0 | ≥20 |
| **AIP-14 dispute bonds + INV-30 `disputeBondBpsLocked`** | 0 | ≥6 |
| **Hash-based service routing** (`keccak256(service_name)` on-chain, no JSON in routing key) | 0 | ≥4 |
| **x402 v2 mainnet** (zero AGIRAILS fee, direct buyer → seller via `@x402/fetch` + facilitator) | 1 | ≥4 |
| **MIN_FEE enforced on-chain** ($0.05 floor in `_payoutProviderAmount`, V3) | 0 | ≥3 |
| **21-field `TransactionView`** | 0 | ≥5 |

## Cross-cut B — False claims the docs currently make

Each appears in ≥1 page in current docs and is contradicted by current SDK / chain state.

- `linkEscrow(txId)` single-arg — real signature is `linkEscrow(txId, amount)`. Repeated in **7+ code snippets** across cookbook + integrations.
- `client.advanced.anchorAttestation(...)` — method lives on `ACTPKernel`, not `IACTPRuntime`. Calls via `.advanced` throw.
- Python `ACTPClient(...)` sync constructor — Python SDK 3.0.1 is async-only; must use `await ACTPClient.create(...)`.
- `network: 'base-sepolia'` / `'base-mainnet'` on user-facing config — `NetworkOption` is `'mock' | 'testnet' | 'mainnet'`; mixing causes "Invalid mode" errors.
- "1B USDC max amount" — actual mainnet cap is **$1000 USDC** (`maxTransactionAmount: 1000` in `networks.ts:202`).
- "SDK does not enforce $0.05 minimum fee, must enforce in your app" — V3 enforces MIN_FEE on-chain.
- `actp tx deliver` / `tx settle` / `tx cancel` / `tx create` — none exist. Current `tx.py` has only `status`, `list`, `transition`.
- `actp time show/advance/set` — entire `time` command group is absent from the SDK.
- `eth_account.hdaccount.HDAccount.from_mnemonic()` — wrong namespace.
- `kernel.raiseDispute(txId, proof)` / `kernel.resolveDispute(txId, resolution)` / `kernel.cancelTransaction(txId)` — none exist as kernel methods; all are SDK wrappers that call `transitionState`.
- `client.proofs.hashContent(...)` — fictitious namespace.
- `wallet: { privateKey: ... }` object on `Agent` constructor — doesn't match `WalletOption` discriminated union.
- 8 contract addresses (in `contract-reference.md` table alone) — all pre-2026-05-19, including V2 mainnet kernel `0x132B9eB…` and V2 sepolia kernel `0x0ba0b17…`.

## Cross-cut C — Shipped APIs entirely undocumented

These are exported and tested in the current SDKs; **zero documentation pages reference them**.

**TypeScript SDK 4.0.0 exports never documented**:
- `AutoWalletProvider`, `EOAWalletProvider`, `IWalletProvider`, `WalletTier`, `WalletInfo`
- `CounterOfferBuilder`, `CounterAcceptBuilder`, `MessageNonceManager` (AIP-2.1)
- `ERC8004Bridge`, `ReputationReporter`, `discover_agents`
- `computeTransactionId` (Smart Wallet routing hash)
- `kernel.acceptQuote(txId, newAmount)` (AIP-2 accept-quote on chain)
- X402 error class family (10 classes)
- AGIRAILS.md V4 parser (`parseAgirailsMdV4`, `validateAgirailsMdV4`)
- Identity file generator (`generateIdentityFile`)

**Python SDK 3.0.1 exports never documented**:
- `AutoWalletProvider`, `EOAWalletProvider`, `IWalletProvider`
- `CounterOfferBuilder`, `CounterAcceptBuilder`, `MessageNonceManager`
- `upload_receipt`, `ReceiptUploadOptions`, `ReceiptUploadPayload`
- `ERC8004Bridge`, `ReputationReporter`
- `compute_transaction_id`
- `discover_agents`
- `MockStateCorruptedError`, `MockStateVersionError`, `MockStateLockError`
- `ACTPTimeoutError` (current is documented as `TimeoutError`)
- 5 new CLI commands

## Effort consolidation

| Bucket | Count | Indicative time (per page) | Sub-total |
|---|---:|---|---:|
| L (>2h, conceptual rework) | 16 | 4h | 64h |
| M (1-2h, rewrite) | 21 | 1.5h | 31.5h |
| S (<30 min surgical) | 11 | 20 min | 3.7h |
| **TOTAL** | 48 | | **~99h** |

Plus IA design, verification gates, and purple-cow layer (not page-level): est. additional 20-40h.

This is a **~3 focused-week effort** to bring docs to fact-truth parity with shipped SDKs, with the purple-cow layer a separate stream on top.

## Recommended wave priority

### Wave 0 — Surgical address sweep (1 session, 2-4 hours)

Find-and-replace, no design needed. Unblocks downstream by removing the most dangerous P0 (security-adjacent stale addresses):

1. `contract-reference.md` — all 8 V2/pre-V3 addresses → V3 mainnet + V4 sepolia
2. `guides/integrations/n8n.md` — same address sweep
3. `guides/integrations/openclaw.md` — same address sweep
4. All other pages — grep-replace `0x132B9eB…` / `0x0ba0b17…` / `0x6aAF45…` / `0xedC62264…` etc. to current

Net effect: stops misleading users to dead/wrong contracts. Doesn't touch frame.

### Wave A — Hero funnel rewrite (1 session, 6-10 hours)

The first 5 minutes of every reader's experience. Re-anchor the entire docs site on the new mental model:

1. `docs/index.md` — new positioning ("Stripe for AI agents — no code, just AGIRAILS.md and your LLM")
2. `docs/installation.md` — LLM onboarding entry point ("tell your AI assistant: onboard me from agirails.app/protocol/AGIRAILS.md")
3. `docs/quick-start.md` — AGIRAILS.md → onboarding Q&A → `{slug}.md` generated → first gasless payment
4. **New page** `docs/concepts/agirails-md-spec.md` — what AGIRAILS.md is, what's in it, why it's the SOT
5. **New page** `docs/concepts/agent-identity-file.md` — `{slug}.md` schema, V4 parser, how discovery uses it

Wave A is the largest single dependency for the rest of the rewrite. Until the frame is right, every other page is fighting an outdated mental model.

### Wave B — Concepts (2 sessions, 8-12 hours)

Replace pre-V3 protocol concepts with current state. Each existing concept page needs version + paradigm update; some need new sections; add 2-3 new concept pages:

- Sweep `concepts/actp-protocol.md`, `concepts/transaction-lifecycle.md`, `concepts/escrow-mechanism.md`, `concepts/fee-model.md` for V3 (21-field tx view, AIP-14 bonds, MIN_FEE on-chain, INV-30)
- Sweep `concepts/adapter-routing.md`, `concepts/x402-protocol.md` for x402 v2 + Smart Wallet routing
- Rewrite `concepts/agent-identity.md` to point at the new identity file concept page
- New: `concepts/smart-wallet-gasless-path.md` (ERC-4337 + Coinbase paymaster + every lifecycle call gasless)
- New: `concepts/aip-2-quote-channel.md` (`CounterOfferBuilder` / `CounterAcceptBuilder` + `actp serve`)
- New: `concepts/web-receipts.md` (EIP-712 ReceiptWrite + agirails.app upload)

### Wave C — Practical paths (2-3 sessions, 12-20 hours)

The 18 P0/P1 files in scope B. Highest reader value, biggest copy-paste risk:

- Rewrite `guides/agirailsmd-config.md` → split into `guides/onboarding-from-spec.md` + reference page (per Agent B)
- All three agent guides (provider/consumer/autonomous) — wallet="auto" first-class, AGIRAILS.md-first
- All five cookbook recipes — replace ACTP-where-x402-belongs, fix `linkEscrow(amount)` arg, async Python everywhere, drop fictitious methods
- All five integration guides — versions current, addresses current, code-blocks actually parse

### Wave D — Reference (1-2 sessions, 8-12 hours)

Once frame is right, reference is largely mechanical:

- `cli-reference.md` — extract from `cli/main.py` + per-command sources; document the 11 new commands; remove the 6 fictitious ones
- `error-reference.md` — extract from `errors.py` modules; current code list + current "fix" recommendations
- `sdk-reference/*` — extract from current SDK exports; add 30+ missing surfaces (AutoWalletProvider, CounterOfferBuilder, upload_receipt, etc.)

Some of this can be **autogenerated from source** — at least CLI surface and SDK exports — and may be worth investing in tooling to keep it in sync.

### Wave E — Purple-cow layer (parallel stream, indefinite)

Not on the critical path for fact-correctness, but the differentiator. Separate scope:

- Narrative / voice / personality on hero pages — "Iva test"
- Diagrams for state machine, Smart Wallet flow, AIP-2.1 negotiation
- Possibly: interactive playground (mock-mode SDK in browser, see tx_id live) — `docs-site/src/components` already has React stack
- Possibly: an embeddable "ask Claude to onboard me" button that drops the canonical AGIRAILS.md into a chat client

## Verification gates (per IA proposal — Faza 4)

Each wave gates on:

1. **Code-block runner** — extract every ```bash / ```python / ```ts / ```js block, run in sandbox where applicable (mock mode + actual sepolia where feasible).
2. **CLI signature scan** — diff documented `actp <cmd>` invocations against `--help` output from current binary.
3. **Address scan** — every `0x[a-fA-F0-9]{40}` in docs → cast call against the network it claims to be on.
4. **Version scan** — grep for `@agirails/sdk@[0-9]` and `agirails==[0-9]` → must match current shipped versions.
5. **Link checker** — full Docusaurus build, 0 broken internal links.
6. **Fresh-eyes pass** — non-developer follows quick-start, snags noted, iterate until clean.

## Single recommended first action

**Wave 0 (address sweep) → Wave A (hero funnel) in same session.**

Wave 0 is mechanical and removes the highest-risk P0s (wrong contract addresses, security-adjacent). Wave A is the hardest design call but unblocks everything else — if we wait to do it after concepts/cookbook are surgically updated, we burn effort on pages that need re-rewriting once the frame changes. Better to set the frame correctly once, then fix everything against the right frame.

Audit done. Next decision is whether to roll into Wave 0 + A immediately (1 long session, ~8-12h) or split.
