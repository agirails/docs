# Audit Report — Guides, Cookbook, Examples (Agent B)

Date: 2026-05-26
Auditor: Agent B
Scope: `docs/guides/**`, `docs/cookbook/**`, `docs/examples/index.md`, `docs/examples/e2e-single-script.md`
Cross-reference sources verified against:
- `SDK and Runtime/sdk-js@4.0.0` (TS SDK)
- `SDK and Runtime/python-sdk-v2@3.0.1` (Python SDK)
- `Platform/agirails.app/web/public/protocol/AGIRAILS.md` (canonical 1242-line spec)
- `SDK and Runtime/sdk-js/src/config/networks.ts` (V3 mainnet / V4 sepolia addresses)
- `SDK and Runtime/sdk-js/src/config/agirailsmdV4.ts` (V4 identity parser)
- `Platform/agirails.app/web/lib/identity-file-generator.ts` (canonical `{slug}.md` writer)
- `SDK and Runtime/claude-plugin/` (actual plugin contents)
- `SDK and Runtime/n8n-nodes-actp/package.json` (v2.5.0)

---

## guides/index.md

| Column | Value |
|---|---|
| `path` | `guides/index.md` |
| `status` | STALE |
| `mental_model` | OLD |
| `versions_referenced` | none directly |
| `code_examples_count` | 0 |
| `broken_examples` | n/a |
| `missing_concepts` | LLM-onboarding, agent.md identity file, AGIRAILS.md = protocol-spec-not-config, Smart Wallet path, `actp serve`, claude-plugin marketplace install via `/plugin`, agent.md publishing flow, Web Receipts |
| `severity` | P1 |
| `effort` | S |
| `notes` | Index reads as a feature directory but presents AGIRAILS.md as just "config", not as the spec-driven onboarding source. Difficulty labels (Beginner/Intermediate/Advanced) are debatable but the larger issue is the wrong framing: no entry-point for "tell your LLM to onboard you from the spec" — the actual happy path. |

---

## guides/agirailsmd-config.md

| Column | Value |
|---|---|
| `path` | `guides/agirailsmd-config.md` |
| `status` | **WRONG** — contradicts canonical AGIRAILS.md |
| `mental_model` | **OLD** (pure SDK config file) |
| `versions_referenced` | none |
| `code_examples_count` | ~9 fenced blocks |
| `broken_examples` | Lines 31–57: example frontmatter uses fields `name`, `version`, `network`, `wallet`, `configHash`, `ipfsCid` — none of these are canonical V4 `{slug}.md` fields. Canonical V4 schema (see `sdk-js/src/config/agirailsmdV4.ts` lines 65–112 and `web/lib/identity-file-generator.ts` lines 62–151) requires: `name`, `slug`, `description`, `intent`, `services[]{type,price,min_price,max_price}`, `servicesNeeded[]`, `budget`, `pricing{base,currency,unit,min_price,max_price,negotiable}`, `network` (values `mock`/`testnet`/`mainnet`, NOT `base-sepolia`/`base-mainnet`), `sla{response,delivery,concurrency,dispute_window}`, `covenant{accepts,returns}`, `payment{modes[]}`. None of those appear in this doc. <br/><br/>Lines 67: claims `network: base-sepolia` / `base-mainnet` — actual SDK V4 parser accepts only `mock | testnet | mainnet`. <br/><br/>Lines 178, 196: `parseAgirailsMd` is the legacy parser; canonical entry point for V4 identity is `parseAgirailsMdV4` (see `sdk-js/src/config/agirailsmdV4.ts` line 9: `parseAgirailsMdV4(content)`). <br/><br/>Lines 80–92: `actp publish` CLI flags `--dry-run` and `--skip-arweave` — verify; current `publish.ts` shows different flag set. |
| `missing_concepts` | • The 1242-line canonical AGIRAILS.md spec lives at `agirails.app/protocol/AGIRAILS.md` and is the **protocol spec with an embedded `onboarding:` YAML block** (lines 41–143 of canonical). <br/>• LLM-driven onboarding: owner does NOT hand-write the file — they paste the spec into Claude/Cursor/Cline, the LLM walks the 9-step checklist (Steps 1–9 in canonical lines 219–732). <br/>• Two-output rule: onboarding produces **Owner AGIRAILS.md** (filled template, local) AND **`{slug}.md`** (public agent identity, machine-parseable). The page conflates these into one "AGIRAILS.md" file. <br/>• Auto-wallet generation via `wallet: generate` in onboarding block (canonical line 122–128): creates `.actp/keystore.json` chmod 600 + auto `ACTP_KEY_PASSWORD` in `.env`. Page mentions nothing about this. <br/>• `actp publish` actually hashes `{slug}.md` (NOT `AGIRAILS.md`) — canonical line 1168: "Publish agent identity file (`{slug}.md`) hash to on-chain AgentRegistry". Page wrongly says `actp publish` hashes `AGIRAILS.md`. <br/>• Lazy publish on mainnet — half-mentioned but pre-V3 numbers and pre-pending semantics. <br/>• Hash-based service routing (keccak256). <br/>• `actp claim` / `actp claim-code` for dashboard linking. |
| `severity` | **P0** — most consequential file in this scope. Anyone copy-pasting this will write a non-parseable file, get parser errors from V4 parser, get rejected by `actp publish`, and conclude the SDK is broken. |
| `effort` | **L** (full conceptual rewrite — frontmatter schema, mental model, file roles, onboarding flow) |
| `notes` | The page teaches "AGIRAILS.md = my agent's config file" — the canonical model is "AGIRAILS.md = the protocol's instruction manual for LLMs to onboard owners, and onboarding produces a separate `{slug}.md` for each agent". <br/><br/>Recommendation: split into two pages. (1) **"Onboard your agent from AGIRAILS.md"** — point to the spec URL, show how to feed it to Claude/Cursor, summarize the 9-step flow. (2) **"`{slug}.md` identity file reference"** — exhaustive field table matching `agirailsmdV4.ts`, generator semantics, publish/diff/pull mechanics. <br/><br/>This single page is teaching the wrong mental model for the central concept of the entire platform. |

---

## guides/agents/provider-agent.md

| Column | Value |
|---|---|
| `path` | `guides/agents/provider-agent.md` |
| `status` | **WRONG** in places (broken APIs); HYBRID model |
| `mental_model` | HYBRID — uses Level 2 (`ACTPClient` direct), but pre-V3 with no Smart Wallet / hash routing / agent.md publish flow |
| `versions_referenced` | none explicit (no `@agirails/sdk@X.Y.Z`) |
| `code_examples_count` | 10 TS/PY blocks |
| `broken_examples` | • Lines 71–81 (TS) and 113–118 (PY): `ACTPClient.create({ mode: 'testnet', requesterAddress: ..., privateKey: ..., agentRegistry: true, eas: {...} })`. The `agentRegistry: true` shape isn't in current `ACTPClientConfig`; verify against `ACTPClient.ts`. The page also hardcodes `eas.contractAddress` and `deliveryProofSchemaId` — these come from `networks.ts` and shouldn't be hand-typed (testnet schema = `0x1b0e…ffce` per `networks.ts:152` is correct for sepolia but mainnet uses `0x1665…d9c9a` per `networks.ts:193`). <br/>• Lines 113–118 (PY): `client = ACTPClient(mode='testnet', requester_address=..., private_key=...)` — Python SDK 3.0.1 uses `await ACTPClient.create(...)` (see `python-sdk-v2/src/agirails/client.py:219` `async def create`). Direct constructor call is the legacy pattern. <br/>• Line 154 / 170: `client.registry.registerAgent({ endpoint, serviceDescriptors: [...] })` — current `AgentRegistryClient.registerAgent` (per `sdk-js/src/registry/AgentRegistryClient.ts:142`) takes `RegisterAgentParams`. Need to verify field shape matches doc; `serviceDescriptors` may not be the exact param key. <br/>• Lines 296–306, 367–371: TS `client.eas.attestDeliveryProof(proof, tx.requester, { revocable, expirationTime })` and `client.advanced.anchorAttestation(tx.txId, attestationUid)` — `anchorAttestation` is **not** on `IACTPRuntime` (i.e. on `client.advanced`); it's on `ACTPKernel` (per `sdk-js/src/protocol/ACTPKernel.test.ts:703`). Calling `client.advanced.anchorAttestation` will throw "is not a function". <br/>• Lines 215–219 (PY) `client.advanced.events.StateTransitioned.create_filter(...)` — assumes web3.py-style filter API exposed through `advanced.events` namespace. Python SDK's runtime exposes its own event surface; this exact path may not work. |
| `missing_concepts` | Smart Wallet auto path (`wallet: 'auto'` — SDK auto-detects on testnet/mainnet per `ACTPClient.ts:855–862`); gasless ERC-4337 + Coinbase paymaster; `actp serve` (provider quote-channel daemon, AIP-2.1); `actp publish` to register provider identity; hash-based service routing (`keccak256(service_name)`); Web Receipts on `SETTLED`; `actp register` for paymaster sponsorship eligibility; AIP-14 dispute bonds; MIN_FEE / locked-bps invariants. |
| `severity` | **P0** — broken `anchorAttestation` call, hardcoded EAS schema, Python constructor wrong |
| `effort` | M-L (rework signatures, add wallet=auto, point to AGIRAILS.md onboarding for the "easy" path) |
| `notes` | Whole guide commits to the Level 2 / Advanced API path. Canonical AGIRAILS.md (Step 4, lines 311–501) explicitly recommends Level 0 `provide()` / Level 1 `Agent.provide()` as the default. The page never shows them. <br/><br/>"AIP-7" is referenced repeatedly but AGIRAILS.md doesn't use AIP-7 framing — it just says "AgentRegistry". AIP labels are internal protocol artefacts and not user-facing language any more. |

---

## guides/agents/consumer-agent.md

| Column | Value |
|---|---|
| `path` | `guides/agents/consumer-agent.md` |
| `status` | **WRONG** (broken signatures + non-existent method) |
| `mental_model` | HYBRID |
| `versions_referenced` | none |
| `code_examples_count` | 8 TS/PY blocks |
| `broken_examples` | • Lines 171–175 (TS), 183–188 (PY): `client.advanced.linkEscrow(txId)` — `IACTPRuntime.linkEscrow` requires **two** args `(txId: string, amount: string)` (verified `sdk-js/src/runtime/IACTPRuntime.ts:104`). Single-arg call will be type-error / runtime fail. <br/>• Line 270 (TS): `client.releaseEscrowWithVerification(txId, attestationUid)` — **method does not exist** on `ACTPClient`. Grep `releaseEscrowWithVerification` across `sdk-js/src/` returns no source results outside docs / generated build. This is doc-only invention. Same for `release_escrow_with_verification` in Python (line 288). <br/>• Line 129: `metadata: req.description ? ethers.id(req.description) : undefined` — `ethers` import missing from snippet; would throw `ReferenceError`. <br/>• Lines 150–156 (PY) `client.create_transaction(...)` called sync — Python SDK 3.0.1 is async. Should be `await client.create_transaction(...)`. <br/>• Line 218: `client.eas?.verifyDeliveryAttestation(tx.txId, attUid)` — verify against SDK; current `EASHelper` API may differ. <br/>• Line 277: `client.advanced.transitionState(txId, State.DISPUTED, '0x')` for opening a dispute — AIP-14 introduced dispute bonds; the current contract requires bond payment, not just a state-transition call. Doc is pre-AIP-14. |
| `missing_concepts` | Smart Wallet auto path / gasless flow; AIP-14 dispute bonds; Web Receipts URL minted on SETTLED; `actp request` CLI for buyer-side discovery + counter-offers (AIP-2.1); ACTP vs x402 decision tree (canonical lines 431–441). |
| `severity` | **P0** — copy-paste yields broken code on 4+ surfaces |
| `effort` | M |
| `notes` | The whole page is Advanced API only. Canonical Step 4 (lines 381–501) shows the Level 0 `request('service', {provider, input, budget, network})` happy path with a 5-line snippet. That doesn't appear anywhere on this page. |

---

## guides/agents/autonomous-agent.md

| Column | Value |
|---|---|
| `path` | `guides/agents/autonomous-agent.md` |
| `status` | WRONG (broken API calls, same bugs as provider + consumer) |
| `mental_model` | HYBRID |
| `versions_referenced` | none |
| `code_examples_count` | 8 TS/PY blocks |
| `broken_examples` | • Same `client.advanced.linkEscrow(tx_id)` single-arg bug (lines 207, 249). <br/>• Same `client.releaseEscrowWithVerification(...)` non-existent method (line 219). <br/>• Same `client.advanced.anchorAttestation(...)` wrong namespace (line 137). <br/>• Line 222 (TS) and 265 (PY): `client.advanced.transitionState(txId, State.SETTLED, '0x')` from the consumer side — `DELIVERED → SETTLED` is restricted to requester/provider before window and to anyone after (canonical lines 996–1003); this code blindly settles regardless of attestation, which contradicts the doc's own "verify before paying out" checklist on lines 367–371. <br/>• Lines 84–87 (PY): `client = ACTPClient(mode='testnet', ...)` — sync constructor instead of `await ACTPClient.create(...)`. |
| `missing_concepts` | Single Agent class can both `provide()` and `request()` (canonical lines 471–501) — page reinvents this with two clients. `wallet: 'auto'` gasless mode. AIP-2.1 quote channel for orchestrating sub-services. `actp negotiate` for autonomous buyer-side discovery. |
| `severity` | **P0** |
| `effort` | M (or rewrite once provider/consumer pages are fixed) |
| `notes` | Page demonstrates the orchestrator pattern, which is valuable, but at the wrong abstraction level. Canonical Step 4c "Both (provide + request)" is 30 lines of Level 1 `Agent` code; this page is 350 lines of broken Level 2. |

---

## guides/integrations/claude-plugin.md

| Column | Value |
|---|---|
| `path` | `guides/integrations/claude-plugin.md` |
| `status` | STALE — content mostly right, counts wrong |
| `mental_model` | NEW-ish (plugin is the right entry point) |
| `versions_referenced` | none |
| `code_examples_count` | 2 TS/PY blocks (rest are CLI invocations) |
| `broken_examples` | Line 77: claims plugin ships "Commands: 8, Skills: 6, Agents: 4". Actual plugin (`SDK and Runtime/claude-plugin/`): **8 commands** (init, pay, debug, example, states, status, upgrade, watch) ✅, **6 skills** (agirails-core, agirails-agent-building, agirails-patterns, agirails-security, agirails-typescript, agirails-errors) — but the page lists `agirails-python` as a skill (line 296), which **does not exist** in the actual plugin; the actual sixth skill is `agirails-errors`. **3 agents** (integration-wizard, security-auditor, testing-assistant) — page lists **4** (lines 313–365: integration-wizard, testing-assistant, migration-helper, security-auditor) — `migration-helper` does NOT exist. <br/><br/>Lines 384–389: `ACTPClient.create({ mode: 'testnet', requesterAddress: ..., privateKey: ... })` — works but doesn't surface `wallet: 'auto'` default. Python example same pattern (line 396) but `await ACTPClient.create(...)` is correct here. |
| `missing_concepts` | `wallet: 'auto'` gasless flow (the plugin uses it under the hood per `claude-plugin/commands/pay.md`); AGIRAILS.md onboarding-via-MCP flow (canonical lines 753–769 — `@agirails/mcp-server` install); the canonical "tell Claude to onboard you from AGIRAILS.md" entry point. |
| `severity` | P1 (factually wrong on plugin contents — would mislead a user asking "what skills come with the plugin?") |
| `effort` | S (regenerate from `claude-plugin/` directory listing) |
| `notes` | Recommend regenerating the Commands/Skills/Agents tables directly from `SDK and Runtime/claude-plugin/`. The page should ALSO link to the AGIRAILS.md onboarding path as the primary entry, with the plugin as one of several executors (Cursor, Cline, plain Claude Code without plugin all work too — the spec is universal). |

---

## guides/integrations/crewai.md

| Column | Value |
|---|---|
| `path` | `guides/integrations/crewai.md` |
| `status` | WRONG (syntax errors + sync Python on async SDK) |
| `mental_model` | OLD (no agent.md, no wallet:auto, no AGIRAILS.md spec) |
| `versions_referenced` | none |
| `code_examples_count` | ~12 Python blocks |
| `broken_examples` | • Lines 90, 169–174: `self.client = ACTPClient(mode=mode, requester_address=..., private_key=...)` — sync direct-construct, Python SDK is async (`async def create`, `client.py:219`). Should be `self.client = await ACTPClient.create(...)`. <br/>• Lines 113 + 159: **broken indentation** — `def _pay_provider` at line 113 is at column 0 (outside class), and `_log_expense` at line 153–160 has a bare `return "\n".join(lines)` split across two lines because the source contains a literal newline inside the string. The whole `CrewPaymentTool` class will not import. <br/>• Lines 128–135: `self.client.create_transaction(requester=..., provider=..., amount=..., deadline=..., dispute_window=..., service_hash="0x" + "00"*32)` — calls a sync method on an async client. Also `service_hash` must be `bytes32` not a string — `keccak256(service_name)` per canonical lines 869–873. <br/>• Line 132: `self.client.now()` — verify this exists on Python `ACTPClient`. <br/>• Line 145: `escrow_id = self.client.advanced.link_escrow(tx_id)` — same single-arg bug (needs amount). |
| `missing_concepts` | Wallet auto; AGIRAILS.md spec; `agent.md` identity file; CrewAI agents could each be onboarded via Agent class (`Agent(name='coordinator', network='testnet').provide(...)` / `.request(...)`) — far simpler than custom BaseTool wrapper. |
| `severity` | **P0** — the central code example (CrewPaymentTool) does not parse |
| `effort` | M (full code rewrite, simpler design with `Agent` class) |
| `notes` | The whole guide should use Level 1 `Agent` class for each Crew member. Treasury could be one `Agent` with `intent: 'pay'`, workers could be `Agent` with `intent: 'both'`. Way less code than a custom BaseTool. |

---

## guides/integrations/langchain.md

| Column | Value |
|---|---|
| `path` | `guides/integrations/langchain.md` |
| `status` | WRONG (sync calls, missing args, undefined methods) |
| `mental_model` | OLD |
| `versions_referenced` | none |
| `code_examples_count` | ~9 Python blocks |
| `broken_examples` | • Line 92: `self.client = ACTPClient(mode=mode, requester_address=..., private_key=...)` — sync constructor; should be `await ACTPClient.create(...)`. <br/>• Lines 117–125: `self.client.create_transaction(...)` called sync; SDK is async (`agirails/runtime/blockchain_runtime.py` shows async). <br/>• Line 129: `self.client.advanced.link_escrow(tx_id)` — same single-arg bug. <br/>• Lines 197–212: `AGIRAILSRegistryTool` calls `self.client.validate_service_descriptors`, `self.client.compute_service_type_hash`, `self.client.query_agents_by_service` — these are not on `ACTPClient` per Python SDK. Verify against `python-sdk-v2/src/agirails/registry/`. <br/>• Line 238: `self.payment_tool = AGIRAILSPaymentTool(private_key)` — single-arg init but constructor signature is `(self, private_key, requester_address, mode='testnet')` (line 90). TypeError on instantiation. <br/>• Line 369: `payment_tool._get_balance()` — method not defined anywhere in the class. |
| `missing_concepts` | Wallet auto; AGIRAILS.md onboarding; Agent class as a LangChain tool (already async-friendly); `actp serve` for provider; Web Receipts. |
| `severity` | **P0** — multiple non-existent methods |
| `effort` | M |
| `notes` | LangChain agents are a primary integration use case but the guide reads like it was written against a fictional SDK. Simpler design: wrap `Agent.provide()` / `Agent.request()` as LangChain Tools — that's 30 lines, not 200. |

---

## guides/integrations/n8n.md

| Column | Value |
|---|---|
| `path` | `guides/integrations/n8n.md` |
| `status` | **WRONG** — all contract addresses are stale |
| `mental_model` | OLD (no wallet=auto, no AGIRAILS.md) |
| `versions_referenced` | `n8n-nodes-actp v2.3.0` (actual `package.json` says **v2.5.0**) |
| `code_examples_count` | 2 (mint snippet + curl) |
| `broken_examples` | • **All contract addresses wrong** (lines 663–673). Doc says:<br/>&nbsp;&nbsp;Sepolia kernel `0x0ba0b17554601b30F5406e74d2208f567C12CcFE` → actual V4 sepolia kernel `0x9d25A874f046185d9237Cd4954C88D2B74B0021b` (per `sdk-js/src/config/networks.ts:140`).<br/>&nbsp;&nbsp;Sepolia EscrowVault `0xedC62264301A119207f1f89C6bDE4Fd7a7A4CeB4` → actual `0x7dF07327090efcA73DCBa70414aA3131Fc6d2efB` (networks.ts:141).<br/>&nbsp;&nbsp;Mainnet kernel `0x132B9eB321dBB57c828B083844287171BDC92d29` → actual V3 mainnet kernel `0x048c811352e8a3fECd5b0Ec4AA2c2b94083CC842` (networks.ts:183).<br/>&nbsp;&nbsp;Mainnet EscrowVault `0x6aAF45882c4b0dD34130ecC790bb5Ec6be7fFb99` → actual `0x262D5912A9612F0c66dA5d13B4E678D50ebC44b5` (networks.ts:184).<br/>&nbsp;&nbsp;Mainnet USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` ✅ correct (canonical token, networks.ts:185). Mock USDC `0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb` ✅ correct (networks.ts:142). <br/>• Lines 627, 640–646: Basescan link to Mock USDC works, but ` MockUSDC mint` example is fine code (testnet only). <br/>• Line 676: "Smart contracts have completed a formal security audit (February 2026) with no findings" — verify; if true that's a Q1 2026 audit, mention which firm. |
| `missing_concepts` | `wallet: 'auto'` (n8n credential could optionally use the smart-wallet path); AGIRAILS.md / agent.md publish flow; Web Receipts on `SETTLED`; AIP-2.1 quote channel; n8n auto-discovery via `actp find`. |
| `severity` | **P0** — wrong on-chain addresses will send users to ghost contracts |
| `effort` | S for addresses (read `networks.ts`, replace 4 addresses + version bump), M for full update |
| `notes` | This guide has the most direct user-money impact risk because if someone clicks "View on Basescan" and finds the wrong contract — or worse, hand-codes the wrong kernel into custom workflow — funds go nowhere. Fix addresses **first**. <br/><br/>Also "CREATED" state appears nowhere in canonical; canonical uses `INITIATED` (value 0) per AGIRAILS.md lines 32–40. |

---

## guides/integrations/openclaw.md

| Column | Value |
|---|---|
| `path` | `guides/integrations/openclaw.md` |
| `status` | **WRONG** — addresses stale + wrong state-machine taxonomy |
| `mental_model` | OLD |
| `versions_referenced` | none |
| `code_examples_count` | ~3 |
| `broken_examples` | • Lines 376–381: claims mainnet kernel `0x132B…d29`, sepolia kernel `0x469C…411` — both stale. Actual V3 mainnet kernel `0x048c811352e8a3fECd5b0Ec4AA2c2b94083CC842`, V4 sepolia kernel `0x9d25A874f046185d9237Cd4954C88D2B74B0021b`. Sepolia EscrowVault `0x57f8…9E5` also wrong (actual `0x7dF07327090efcA73DCBa70414aA3131Fc6d2efB`). <br/>• Line 236: state machine diagram shows `CREATED → COMMITTED → IN_PROGRESS → DELIVERED → SETTLED`. Canonical uses **INITIATED** (value 0), not `CREATED`, and includes QUOTED (1) + DISPUTED (6) + CANCELLED (7) — page leaves them out. <br/>• Lines 243–249: state table omits QUOTED, lists "RESOLVED" which doesn't exist (DISPUTED resolves back to SETTLED or CANCELLED per canonical lines 974–978). <br/>• Line 60: `git clone https://github.com/agirails/openclaw-skill ~/.openclaw/skills/agirails-payments` — verify URL. |
| `missing_concepts` | Wallet auto path; AGIRAILS.md as protocol spec for any LLM (OpenClaw included — the spec is runtime-agnostic per canonical line 879+); agent.md identity; correct 8-state machine with QUOTED + CANCELLED + DISPUTED. |
| `severity` | **P0** — wrong states + wrong addresses |
| `effort` | M |
| `notes` | Probably the right move: regenerate from a shared "integrations template" that pulls states from canonical and addresses from `networks.ts`. Or delete this guide and link to the OpenClaw repo + spec. |

---

## cookbook/index.md

| Column | Value |
|---|---|
| `path` | `cookbook/index.md` |
| `status` | STALE (organizes around old patterns) |
| `mental_model` | OLD |
| `versions_referenced` | none |
| `code_examples_count` | 0 (index only) |
| `broken_examples` | n/a |
| `missing_concepts` | x402 instant API monetization recipe (canonical line 1038–1041: zero AGIRAILS fee on x402); Smart Wallet gasless recipe; Web Receipts dashboard recipe; AIP-2.1 negotiate-and-settle recipe; AGIRAILS.md publish + claim recipe. |
| `severity` | P1 |
| `effort` | S |
| `notes` | The five recipes listed are coherent but the index reads as "things you build with Level 2 SDK", not "patterns for the AGIRAILS.md-first owner". Recommend a second column "Beginner: LLM onboards me from AGIRAILS.md" path. |

---

## cookbook/api-pay-per-call.md

| Column | Value |
|---|---|
| `path` | `cookbook/api-pay-per-call.md` |
| `status` | WRONG (broken signatures) |
| `mental_model` | OLD — ACTP escrow chosen for what is canonically the x402 use case |
| `versions_referenced` | none |
| `code_examples_count` | 14 TS/PY blocks |
| `broken_examples` | • Lines 86–90 (TS), 269–273 (PY): `ACTPClient.create({...})` / `ACTPClient(...)` — Python uses sync constructor, should be `await ACTPClient.create(...)`. <br/>• Line 457 (TS), 525 (PY): `client.advanced.linkEscrow(txId)` / `client.advanced.link_escrow(tx_id)` — single-arg bug, needs `amount`. <br/>• Line 188 (TS), 356 (PY): `client.advanced.transitionState(txId, State.DELIVERED, client.proofGenerator.encodeProof(proof))` — verify `proofGenerator` is exposed on `ACTPClient`. (It is reachable but verify the API path: `client.proofGenerator` vs `new ProofGenerator()`.) <br/>• Line 221: pricing endpoint response object contains `requesterAddress: process.env.ADDRESS!` — that's a leaked stub variable, not a sensible field for the **provider's** pricing API. Whoever copy-pastes this hits a runtime ref error. <br/>• Line 435: `requesterAddress: process.env.ADDRESS!` again on the consumer side — same stub leak. |
| `missing_concepts` | **The big one: canonical AGIRAILS.md (lines 431–441) explicitly recommends x402 for "Simple API calls — lookups, queries, one-shot requests"**. This cookbook builds an Express middleware around full ACTP escrow for what is the textbook x402 use case. With x402 (SDK 3.3.0+, `metadata: { paymentMethod: 'x402' }`), the recipe collapses from 200 lines to ~40 and gets atomic / zero-AGIRAILS-fee settlement. <br/>• X402Adapter auto-registration. <br/>• Web Receipts auto-mint on settled x402 txns. |
| `severity` | **P0** — wrong protocol choice for the use case |
| `effort` | M (rewrite the primary path as x402; keep ACTP-escrow as the "long-running job" variant) |
| `notes` | This recipe should headline with x402; current ACTP-escrow path makes sense only for jobs that take time. Per canonical: "Rule of thumb: if the provider needs time to do work → ACTP. If it's a synchronous HTTP call → x402." Per-API-call is the textbook x402 case. |

---

## cookbook/automated-provider-agent.md

| Column | Value |
|---|---|
| `path` | `cookbook/automated-provider-agent.md` |
| `status` | WRONG (broken APIs) |
| `mental_model` | OLD |
| `versions_referenced` | none |
| `code_examples_count` | 10 TS/PY blocks |
| `broken_examples` | • Lines 235–239: `ACTPClient.create({ mode: 'testnet', requesterAddress: ..., privateKey: ... })` — works but misses `wallet: 'auto'` benefit. <br/>• Line 295 (PY): `client = ACTPClient(mode='testnet', requester_address=..., private_key=...)` — sync constructor on async SDK. <br/>• Lines 250–260: `client.registry.registerAgent({ metadata: "ipfs://Qm...", services: [...] })` — Registry API shape per `sdk-js/src/registry/AgentRegistryClient.ts:142` is `RegisterAgentParams` which is **NOT** `{metadata, services}`; it's `{endpoint, serviceDescriptors[]}` (per the provider-agent guide's own example, which is at least closer). Two of our docs disagree on the same API shape — a sure sign nobody verified against source. <br/>• Lines 312, 315 (PY): `client.transition_state(...)` sync on async SDK. <br/>• Lines 181, 188: `client.advanced.anchorAttestation(txId, attUid)` — same wrong-namespace bug as guides/agents pages. <br/>• Lines 336–342 (PY): `client.agent_registry.is_agent_registered(...)` / `client.agent_registry.register_agent(...)` — verify; current Python SDK exposes registry differently. |
| `missing_concepts` | `actp serve` daemon (AIP-2.1 quote channel) — the canonical answer for "always-on provider"; `wallet: 'auto'`; agent.md publish + claim flow; Web Receipts on settlement (the page even has a "wait for settlement" loop that should detect `agirails.app/r/<id>` URL). |
| `severity` | **P0** |
| `effort` | M |
| `notes` | This is a "build a custom event loop" recipe in a world where `actp serve` already provides a hardened daemon with quote-channel + auto-settle. Recipe should either (a) explain `actp serve` as the simple path and this as advanced, or (b) be deprecated. |

---

## cookbook/multi-agent-budget.md

| Column | Value |
|---|---|
| `path` | `cookbook/multi-agent-budget.md` |
| `status` | STALE |
| `mental_model` | OLD |
| `versions_referenced` | none |
| `code_examples_count` | Several (read first 120 lines only) |
| `broken_examples` | Likely same Python sync-on-async + linkEscrow single-arg + advanced.anchorAttestation pattern based on identical preamble pattern with other cookbook entries. (Did not exhaustively verify due to scope.) Page is fundamentally a "Treasury wallet + per-agent allowance" pattern which is sound but built on Level 2 API. |
| `missing_concepts` | Same set: Agent class (one Agent per sub-agent with `intent: 'pay'` and `budget` field — canonical-aligned solution); Wallet auto; AGIRAILS.md onboarding; `actp pay` CLI for one-shot human-driven payments out of treasury. |
| `severity` | P1 (the budget-coordination pattern itself is useful and not broken in concept, but the code is at the wrong abstraction level) |
| `effort` | M |
| `notes` | Could be rewritten in ~30% the length using Agent class + `budget` field from agent.md per-agent. |

---

## cookbook/n8n-workflow.md

| Column | Value |
|---|---|
| `path` | `cookbook/n8n-workflow.md` |
| `status` | **WRONG** (wrong npm package name + addresses) |
| `mental_model` | OLD |
| `versions_referenced` | (not stated; underlying package is `n8n-nodes-actp@2.5.0`) |
| `code_examples_count` | Visual workflow descriptions + ~5 inline snippets |
| `broken_examples` | • Line 53: `npm install @agirails/n8n-nodes-agirails` — package **does not exist** under that name. Actual package is `n8n-nodes-actp` (`SDK and Runtime/n8n-nodes-actp/package.json:2`). The companion page (`guides/integrations/n8n.md`) uses the correct name. Two pages, two different install commands, only one works. <br/>• Line 56: same wrong name in the UI install fallback. |
| `missing_concepts` | Smart Wallet via n8n credential (gasless option); AGIRAILS.md identity publishing as an n8n step; Web Receipts as a downstream node. |
| `severity` | **P0** — wrong package name = users cannot install |
| `effort` | S (one find-and-replace) |
| `notes` | Consolidate: this cookbook page and `guides/integrations/n8n.md` overlap heavily. Pick one canonical n8n location, redirect the other. |

---

## cookbook/secure-key-management.md

| Column | Value |
|---|---|
| `path` | `cookbook/secure-key-management.md` |
| `status` | **MISSING-SECTIONS** — major gap |
| `mental_model` | OLD (env-var-first) |
| `versions_referenced` | none |
| `code_examples_count` | Many (env-var, AWS Secrets, Vault, HSM) |
| `broken_examples` | Tier-1 env-var pattern is fine. AWS / Vault tiers I did not exhaustively verify (out-of-scope plumbing). |
| `missing_concepts` | **AIP-13 keystore is the SDK's canonical secure-key story and isn't mentioned once.** Confirmed via `grep -n "keystore\|ACTP_KEY_PASSWORD\|actp init\|wallet: 'auto'"` returns ZERO hits in this 1060-line file. Per canonical AGIRAILS.md lines 122–128: `wallet: generate` in onboarding creates `.actp/keystore.json` chmod 600, password auto-generated into `.env` — user never sees it. Per `ACTPClient.ts:818–832`, key resolution order is: `ACTP_KEY_PASSWORD` + keystore (preferred) → `ACTP_PRIVATE_KEY` env (policy-gated: blocked on mainnet) → explicit `privateKey` param. <br/>• `actp init -m testnet` / `actp init -m mainnet` and `actp deploy-env` / `actp deploy-check` (AIP-13 deployment security CLI per canonical line 197). <br/>• `wallet: 'auto'` Smart Wallet path — no private key on the requester side at all in the gasless flow (Smart Wallet sender is a contract). |
| `severity` | **P0** for omission — security cookbook that misses the SDK's own security primitive |
| `effort` | M (add a "Tier 0: AGIRAILS keystore" section as the recommended default, demote env-var to "what to do if you can't use keystore") |
| `notes` | The page also at line 95 hand-rolls `privateKey.length !== 66` validation — the SDK already validates this and emits `WalletConnectionError` (per `errors/index.ts`). Recipe should defer to SDK validation, not duplicate it. |

---

## examples/index.md

| Column | Value |
|---|---|
| `path` | `examples/index.md` |
| `status` | STALE |
| `mental_model` | HYBRID (mentions three-tier API correctly, but framing is SDK-first) |
| `versions_referenced` | none explicit |
| `code_examples_count` | 2 (Hello World TS + PY) |
| `broken_examples` | Lines 254–278 (TS hello-world): uses top-level `await` in an unmarked snippet. SDK is CJS and canonical line 317 says "Wrap in `async function main() { ... } main().catch(console.error);`". Top-level await will fail in many setups. <br/>Lines 290–311 (PY): uses `lambda job: {'echoed': job.input}` as the handler. Python SDK 3.0.1 expects async handlers (`async def`), not bare lambdas. |
| `missing_concepts` | LLM-onboard-from-AGIRAILS.md path; `npx actp test` as the canonical "verify your install" demo (canonical lines 590–658); examples for x402 / Smart Wallet / AGIRAILS.md publish flow / claim-code; the `actp serve` daemon. |
| `severity` | P1 |
| `effort` | S-M |
| `notes` | The repo `github.com/agirails/sdk-examples` is referenced but uncertain to be current — verify its existence + content. |

---

## examples/e2e-single-script.md

| Column | Value |
|---|---|
| `path` | `examples/e2e-single-script.md` |
| `status` | STALE |
| `mental_model` | HYBRID |
| `versions_referenced` | `@agirails/sdk >=2.3.1`, `agirails >=2.3.0` — **stale**, current is `@agirails/sdk@4.0.0` and `agirails==3.0.1`. |
| `code_examples_count` | 2 (TS + PY full scripts) |
| `broken_examples` | • TS top-level `await` at line 50, 54, 57 outside `main()` — wait, actually it IS inside `main()`. Fine. <br/>• Lines 36, 53, 96, 114: `network: 'mock'`. Canonical (line 99): SDK accepts `mock | testnet | mainnet`. ✅ correct. <br/>• Line 36: `new Agent({ name: 'translator', network: 'mock' })` — verify Agent constructor signature; Level 1 Agent class per `sdk-js/src/level1/Agent.ts:217`. Likely fine. <br/>• Line 146: claims "All 6 states (INITIATED → SETTLED)" — actually 8 states per canonical (lines 32–40: INITIATED, QUOTED, COMMITTED, IN_PROGRESS, DELIVERED, SETTLED, DISPUTED, CANCELLED). Even on the happy path you transit 5 (INITIATED→COMMITTED→IN_PROGRESS→DELIVERED→SETTLED, skipping QUOTED via AIP-3). "6 states" is inaccurate either way. <br/>• Line 152: "Replace `network: 'mock'` with `'base-sepolia'`" — **wrong value**. SDK accepts `'testnet'` (canonical line 99). `base-sepolia` is the *network ID* used internally (per `networks.ts:836`), not the user-facing mode value. User who copies this will hit "Invalid mode" (canonical line 1195). |
| `missing_concepts` | LLM-onboarding entry point (this could be replaced by `npx actp test` per canonical Step 8 lines 590–658); claim-code flow; Web Receipts URL output. |
| `severity` | **P0** (the "testnet switchover" instruction is wrong and will trip every user) |
| `effort` | S |
| `notes` | This is otherwise a clean, minimal example — version pin + the `base-sepolia` → `testnet` fix and it's good. Alternative: replace with a `npx actp test` demo per canonical, which already produces the desired "see ACTP work end-to-end" outcome with banner + receipt. |

---

## Agent B — rollup

### Total severity counts

| Severity | Count | Pages |
|---|---|---|
| **P0** | **11** | `agirailsmd-config.md`, `provider-agent.md`, `consumer-agent.md`, `autonomous-agent.md`, `crewai.md`, `langchain.md`, `n8n.md`, `openclaw.md`, `api-pay-per-call.md`, `automated-provider-agent.md`, `n8n-workflow.md`, `secure-key-management.md`, `e2e-single-script.md` (counted: 13 — clarified below) |
| **P1** | **4** | `guides/index.md`, `claude-plugin.md`, `cookbook/index.md`, `multi-agent-budget.md`, `examples/index.md` (5 — clarified below) |
| **P2** | **0** | — |

(Strict tally: 13 P0, 5 P1, 0 P2 = 18 audited files.)

### Top 5 most-broken pages (biggest P0 gap)

1. **`guides/agirailsmd-config.md`** — teaches an entirely wrong frontmatter schema for the single most-consequential file in the platform; copy-paste yields a file the V4 parser rejects. Wrong mental model (config-file, not protocol-spec).
2. **`guides/integrations/n8n.md`** — every contract address on the page is stale (V4 sepolia kernel, V3 mainnet kernel, both EscrowVaults). Users routed to dead Basescan addresses; possibility of misdirecting transactions if anyone hand-codes addresses.
3. **`guides/integrations/crewai.md`** — central `CrewPaymentTool` class has broken indentation and a string with literal newline mid-`return`; it does not parse. Plus sync calls on async Python SDK throughout.
4. **`guides/integrations/langchain.md`** — invokes 3+ methods that don't exist on `ACTPClient` (`validate_service_descriptors`, `compute_service_type_hash`, `query_agents_by_service`, `_get_balance`); sync-on-async; missing constructor args.
5. **`cookbook/api-pay-per-call.md`** — recommends ACTP escrow for the textbook x402 use case (per-API-call billing). Canonical AGIRAILS.md explicitly says use x402 here. Also has same broken `linkEscrow(txId)` single-arg bug + `process.env.ADDRESS!` stub leak in the pricing endpoint.

Honourable mentions: `secure-key-management.md` (0 mentions of AIP-13 keystore — the SDK's own canonical security primitive); `consumer-agent.md` (`releaseEscrowWithVerification` is doc-only invention).

### Cross-cut: integration guides accuracy vs current SDKs

| Integration | SDK alignment | Major issues |
|---|---|---|
| **claude-plugin** | Closest to current | Wrong component counts (skills + agents); missing `wallet:'auto'` framing; no AGIRAILS.md onboarding entry point |
| **n8n** | All on-chain addresses wrong | Stale kernel + escrowVault on both networks; stale n8n package version (2.3.0 vs actual 2.5.0) |
| **openclaw** | Stale addresses + wrong states | Same address staleness as n8n; uses `CREATED` instead of `INITIATED`; omits 3 of 8 canonical states |
| **crewai** | Code doesn't parse | Indentation broken; sync-on-async; non-existent helpers |
| **langchain** | Calls non-existent methods | `validate_service_descriptors` / `compute_service_type_hash` / `query_agents_by_service` / `_get_balance` aren't on `ACTPClient` |

Cross-cutting bugs across all integration code:
- **`linkEscrow(txId)` single-arg** — repeated in 7+ snippets. Real signature: `linkEscrow(txId, amount)` per `IACTPRuntime.ts:104`.
- **`client.advanced.anchorAttestation(...)`** — `anchorAttestation` is on `ACTPKernel`, not on `IACTPRuntime`. Calling via `.advanced` will throw.
- **Python `ACTPClient(...)` constructor** — Python SDK 3.0.1 is async; must use `await ACTPClient.create(...)`.
- **Hardcoded EAS contract + schema** — examples paste fixed bytes32 schema IDs from sepolia. Mainnet schema is different (per `networks.ts:193`); SDK already resolves from `networks.ts` automatically.
- **`network: 'base-sepolia'` / `base-mainnet`** — user-facing SDK config uses `'mock' | 'testnet' | 'mainnet'`; `base-sepolia`/`base-mainnet` are internal network IDs. Mixing these in docs causes "Invalid mode" errors.

### Cross-cut: is `agirailsmd-config.md` teaching the right mental model?

**No.** This is the most consequential failure in the whole audited scope.

- The canonical AGIRAILS.md (1242 lines at `Platform/agirails.app/web/public/protocol/AGIRAILS.md`) is **the protocol spec**, including an embedded `onboarding:` YAML block (lines 41–143) that defines the Q&A wizard an LLM walks the owner through.
- Onboarding produces **two artefacts**: (a) **Owner AGIRAILS.md** = filled template kept locally, and (b) **`{slug}.md`** = the public, machine-parseable agent identity file generated by `web/lib/identity-file-generator.ts` and parsed by the SDK via `parseAgirailsMdV4` (`sdk-js/src/config/agirailsmdV4.ts`).
- `actp publish` hashes the `{slug}.md` file (canonical line 1168), **not** AGIRAILS.md.
- The audited page conflates these into one "AGIRAILS.md" with a frontmatter schema that resembles **neither** the canonical spec **nor** the V4 `{slug}.md` parser. A user following the page writes a file the SDK cannot parse.
- The audited page also omits the entire "LLM-driven onboarding" flow, which is the canonical entry point (Steps 1–9, canonical lines 219–732). The whole point of AGIRAILS.md is that owners feed it to Claude/Cursor/Cline and the LLM does the work — owners never write the file by hand.

This page is the second-highest-priority rewrite (after fixing the n8n addresses, which is a security-adjacent fix). The mental model rework cascades into every "agent guide" and "cookbook" page that currently leans on the wrong abstraction.

### One-line recommendation for what to rewrite first

**Rewrite `guides/agirailsmd-config.md` from scratch** as two pages — `guides/onboarding-from-spec.md` (LLM walks owner through canonical AGIRAILS.md) and `reference/agent-identity-file.md` (exhaustive `{slug}.md` schema matching `agirailsmdV4.ts`) — then sweep-fix the n8n contract addresses (P0, 5-minute change in 2 files) and back-fill every Python `ACTPClient(...)` → `await ACTPClient.create(...)`, `linkEscrow(txId)` → `linkEscrow(txId, amount)`, `client.advanced.anchorAttestation` → `client.kernel.anchorAttestation` across the agent + cookbook + integration pages.
