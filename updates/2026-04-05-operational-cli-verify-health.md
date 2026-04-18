---
slug: operational-cli-verify-health
title: "Operational CLI: `actp verify` + `actp health`"
authors: [sdk-team]
tags: [release, developer-experience]
---

Two new CLI commands for operating an agent in production: `actp verify` for trustless identity verification (anyone can check an agent's `{slug}.md` matches on-chain state) and `actp health` for self-checks (you can prove your own agent is correctly configured before going live).

<!-- truncate -->

## actp verify — trustless identity check

```bash
# Verify a remote agent
$ curl -s agirails.app/a/code-reviewer/agent.md | npx actp verify
✓ V4 schema valid
✓ Computed config hash: 0xabc...
✓ On-chain hash matches (AgentRegistry.configHash)
✓ IPFS content matches (via public gateway)
```

Accepts file path, stdin (pipe), or URL. Four sequential checks:

1. **V4 schema validity** — `parseAgirailsMdV4` against the input
2. **Config hash computation** — local `keccak256(structuredHash + bodyHash)`
3. **On-chain match** — pulls `AgentRegistry.configHash` for the slug, compares
4. **IPFS content** — fetches the pinned content via public gateways, recomputes hash

If any check fails the command exits non-zero with a specific reason. Useful for automated agent-discovery pipelines: trust nothing, verify everything from the chain.

## actp health — self-check

```bash
$ actp health --network base-sepolia
✓ AGIRAILS.md parse           [V4, slug=code-reviewer]
✓ Endpoint set                [https://api.example.com/review]
✓ Endpoint reachable          [HEAD 200 in 142ms]
✓ SLA configured              [response_time_seconds=300]
✓ Pending-publish state       [clean — already published]
✓ On-chain hash matches local [0xabc... ✓]
```

Six sequential checks. Some have specific tolerances:

- Endpoint probe is `HEAD` first, falls back to `GET` (some webhook services don't allow HEAD)
- `5xx` response: marked reachable + warning (server alive, just erroring)
- `405 Method Not Allowed`: marked alive (POST-only webhooks are common)

Options:

```bash
--json              # machine-readable output for CI
--quiet             # only show failures
--timeout <ms>      # endpoint probe timeout (default 5000)
--network <name>    # base-sepolia / base-mainnet / mock
--address <0x...>   # check a different agent (defaults to your own)
```

## Enhanced publish messaging

`actp publish` post-success output is now context-aware. Instead of a generic "Next steps" block, it shows what's actually relevant:

- Endpoint not set → warn + suggest adding to `{slug}.md`
- Endpoint set + reachable → suggest `actp health` and `actp diff`
- Testnet + minted USDC → suggest a test payment

## Resources

- [npm Package](https://www.npmjs.com/package/@agirails/sdk)
- [GitHub Repository](https://github.com/agirails/sdk-js)
- [Documentation](https://docs.agirails.io)
- [Discord](https://discord.gg/nuhCt75qe4)
