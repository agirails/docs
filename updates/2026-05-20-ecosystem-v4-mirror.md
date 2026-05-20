---
slug: ecosystem-v4-mirror
title: "Ecosystem Mirror — n8n 2.5.0, MCP 0.2.0, Skill Refresh"
authors: [agirails]
tags: [release, ecosystem]
---

`@agirails/sdk@4.0.0` shipped on 2026-05-19. Within 24 hours the rest of the ecosystem followed: `n8n-nodes-actp@2.5.0`, `@agirails/mcp-server@0.2.0`, and a refresh of the Claude plugin, Claude skill, and OpenClaw skill. All three npm packages now publish through the same workflow-attested pipeline; all three documentation surfaces are aligned with the V3 mainnet redeploy.

<!-- truncate -->

## n8n Community Node — `n8n-nodes-actp@2.5.0`

```bash
npm install n8n-nodes-actp@2.5.0
```

- `@agirails/sdk` peer bumped to `^4.0.0`
- First workflow-attested publish for the n8n node — OIDC + sigstore + SLSA provenance, same flow as the SDK
- Lockfile-consistency fix (the previous lock had an orphaned `arconnect` entry that broke `npm ci` on Linux CI)
- uuid pinned to `^9` via overrides — keeps the CJS shape for Jest under newer transitive resolutions
- No hardcoded contract addresses; the node reads them via SDK `getNetwork()`, so the V3 mainnet swap is automatic on this bump

## MCP Server — `@agirails/mcp-server@0.2.0`

```bash
npx @agirails/mcp-server
```

For Claude Desktop / Cursor / Windsurf / VS Code with MCP — gives any context window the same 20 tools (5 discovery + 14 runtime + 1 protocol bootstrap), now tracking SDK 4.0.0.

- `@agirails/sdk` dep bumped `^3.3.0` → `^4.0.0`
- Workflow-attested publish — first attested release of the MCP server
- All 125 tests pass under SDK 4.0.0; no MCP-side code changes were needed (the SDK API surface used — `ACTPClient`, `Agent`, `AgentRegistry`, `getNetwork`, `provide`, `request` — is fully compatible)

## Documentation surfaces — three skills refreshed

The three Claude/AI-agent documentation packages all received a 4.0.0 refresh:

### `agirails/claude-plugin` (Claude Code marketplace)

Eight files updated:

- `commands/upgrade.md` rewritten — drops the ancient `1.x → 2.0` and `2.0 → 2.1` migration sections, adds a `3.x → 4.0.0` migration section that's actually relevant (mainnet address swap, `x402Relay` drop, `X402Adapter` auto-registration), version history table bumped to include 4.0.0 / 3.5.3 / 3.3.0
- `commands/init.md` — example `--version` flag bumped from `3.0.0` to `4.0.0`
- `commands/pay.md` — drops the now-deprecated manual `X402Adapter` registration code; payment summary updated for x402 v2 zero-fee semantics
- `skills/agirails-typescript/SKILL.md` — version bumped, the WRONG/CORRECT troubleshooting example replaced with the auto-registration pattern
- `skills/agirails-patterns/SKILL.md` — version bumped, two manual-registration code blocks replaced with metadata opt-in pattern
- `skills/agirails-core/SKILL.md` — fee comparison table fixed (x402 v2 is zero AGIRAILS fee, not "same as ACTP"); X402Relay-on-mainnet language replaced with deprecation note
- `skills/agirails-security/SKILL.md` — X402Relay fee-enforcement bullet rewritten for v2 facilitator model
- `README.md` — added a "What's new in v4.0" callout at the top with the six high-impact changes integrators see

### `agirails/claude-skill` (ClawHub generic Claude skill)

- Fee section in `SKILL.md` refreshed — ACTP path keeps 1% / $0.05 floor (now enforced on-chain via MIN_FEE), x402 path documented as zero-fee buyer→seller via `@x402/fetch` + facilitator
- "Current state (v4.0.0, 2026-05-19)" callout added at the top of the skill — mainnet V3 redeploy, AIP-14 dispute bonds, MIN_FEE on-chain, INV-30, Sourcify EXACT_MATCH, workflow-attested publish

### `agirails/openclaw-skill` (ClawHub OpenClaw skill)

- Frontmatter `version: 3.0.0` → `4.0.0`
- Floor references `@agirails/sdk@3.3.0+` → `@agirails/sdk@4.0.0+` (kept the historical "deprecated AS OF SDK 3.3.0" timestamps where relevant)
- "What's new in v4.0.0" callout added below the title

All three skill repos auto-sync from GitHub `main` to their respective distribution channels (Claude Code plugin marketplace and ClawHub). No version tag or npm publish involved — the docs propagate on the next consumer refresh.

## What didn't ship in this wave

- **Python SDK on PyPI (`agirails`)** — `python-sdk-v2` still on 2.4.0 with pre-V3 addresses. The mirror is queued; the wider story (poetry publish path, dependency cleanup, address surface refresh) takes another focused session.
- **`agirails-market` Next.js app** — local-only repo (no GitHub remote). `lib/contracts/addresses.ts` still references the pre-2026-04-15 Sepolia generation. Bumps queued for the next time it gets touched.

## Resources

- [n8n-nodes-actp on npm](https://www.npmjs.com/package/n8n-nodes-actp) (2.5.0)
- [@agirails/mcp-server on npm](https://www.npmjs.com/package/@agirails/mcp-server) (0.2.0)
- [claude-plugin](https://github.com/agirails/claude-plugin)
- [claude-skill](https://github.com/agirails/claude-skill)
- [openclaw-skill](https://github.com/agirails/openclaw-skill)
- [Discord](https://discord.gg/nuhCt75qe4)
