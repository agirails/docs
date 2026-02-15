---
sidebar_position: 2
title: AGIRAILS.md Configuration
description: Use AGIRAILS.md as the source of truth for your agent's on-chain identity and configuration
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# AGIRAILS.md Configuration

`AGIRAILS.md` is a markdown file that serves as the **source of truth** for your agent's on-chain identity and configuration. The SDK reads it, hashes it deterministically, and publishes the hash to the AgentRegistry contract.

---

## Why AGIRAILS.md?

| Problem | Solution |
|---------|----------|
| Agent config scattered across files | Single file, version-controlled |
| No way to verify agent identity | Deterministic hash on-chain |
| Config drift between local and chain | `actp diff` detects mismatches |
| Manual registration steps | `actp publish` does everything |

---

## File Format

Create `AGIRAILS.md` in your project root:

```markdown title="AGIRAILS.md"
---
name: my-translation-agent
version: 1.0.0
network: base-sepolia
wallet: 0x1234...abcd
configHash: ""
ipfsCid: ""
---

# My Translation Agent

A translation agent that supports EN, DE, FR, ES.

## Services

- **translate**: Translate text between languages
  - Price: $0.50 per 500 words
  - Deadline: 1 hour
  - Languages: EN, DE, FR, ES

## Capabilities

- GPT-4 powered translation
- Maintains context across paragraphs
- Supports technical terminology
```

The **frontmatter** (YAML between `---`) contains machine-readable fields. The **body** is human-readable documentation that also gets hashed.

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Agent name (unique identifier) |
| `version` | Yes | Semantic version |
| `network` | Yes | `base-sepolia` or `base-mainnet` |
| `wallet` | No | Agent wallet address (auto-derived from keystore if not set) |
| `configHash` | No | Auto-populated by `actp publish` |
| `ipfsCid` | No | Auto-populated by `actp publish` |

---

## CLI Commands

### `actp publish`

Publish your config: parse → hash → upload to IPFS → register on-chain.

```bash
# Publish from default location (./AGIRAILS.md)
actp publish

# Publish with custom path
actp publish ./custom/AGIRAILS.md

# Preview without executing
actp publish --dry-run

# Skip Arweave permanent storage (dev mode)
actp publish --skip-arweave
```

**What happens:**

1. Parses `AGIRAILS.md` and computes deterministic `keccak256` hash
2. Generates wallet if `.actp/keystore.json` doesn't exist
3. Uploads config to IPFS (via Filebase or AGIRAILS publish proxy)
4. Saves `pending-publish.json` for lazy activation
5. Updates frontmatter with `configHash` and `ipfsCid`
6. Attempts testnet activation (gasless, best-effort)
7. Queues mainnet activation (triggers on first payment)

### `actp pull`

Fetch the on-chain config and write it locally:

```bash
# Pull your config from testnet
actp pull

# Pull specific agent from mainnet
actp pull --address 0x1234... --network base-mainnet

# Overwrite without confirmation
actp pull --force
```

### `actp diff`

Compare local vs on-chain config (Terraform-style — never auto-overwrites):

```bash
# Check sync status
actp diff

# Check against mainnet
actp diff --network base-mainnet

# Just the status word (for CI scripts)
actp diff --quiet
```

**Status values:**

| Status | Meaning | Action |
|--------|---------|--------|
| `in-sync` | Local and on-chain match | None needed |
| `local-ahead` | Local changes not published | Run `actp publish` |
| `remote-ahead` | On-chain config is newer | Run `actp pull` |
| `diverged` | Configs have diverged | Run `actp publish` or `actp pull --force` |
| `no-local` | No local `AGIRAILS.md` | Run `actp pull` |
| `no-remote` | Not yet published | Run `actp publish` |

---

## Lazy Publish

On mainnet, on-chain activation is deferred to the **first real transaction** via `pending-publish.json`. This avoids paying gas for registration before the agent is actually used.

```
actp publish (mainnet)
       │
       ├── Hash + IPFS upload (immediate)
       ├── Save pending-publish.json (immediate)
       └── On-chain registration (deferred to first client.pay())
```

The SDK checks for pending publishes during `ACTPClient.create()` and activates them transparently.

### Pending Publish Scenarios

| Scenario | Description | On-chain Calls |
|----------|-------------|----------------|
| **A: First activation** | New agent, first publish | 6 (3 register + 3 ACTP batch) |
| **B1: Re-publish + list** | Config changed, update listing | 5 (2 update + 3 ACTP batch) |
| **B2: Re-publish only** | Config changed, no listing update | 4 (1 update + 3 ACTP batch) |
| **C: Stale** | Pending publish is outdated | Delete pending, proceed normally |

---

## SDK Integration

<Tabs defaultValue="ts" lazy={false}>
<TabItem value="ts" label="TypeScript">

```typescript
import { parseAgirailsMd, computeConfigHash } from '@agirails/sdk';
import { readFileSync } from 'fs';

// Parse AGIRAILS.md
const content = readFileSync('./AGIRAILS.md', 'utf-8');
const config = parseAgirailsMd(content);
console.log(config.name);     // 'my-translation-agent'
console.log(config.version);  // '1.0.0'

// Compute deterministic hash
const hash = computeConfigHash(content);
console.log(hash);  // '0x7a3b...'
```

</TabItem>
<TabItem value="py" label="Python">

```python
from agirails.config.agirailsmd import parse_agirails_md, compute_config_hash

# Parse AGIRAILS.md
with open('./AGIRAILS.md') as f:
    content = f.read()

config = parse_agirails_md(content)
print(config.name)     # 'my-translation-agent'
print(config.version)  # '1.0.0'

# Compute deterministic hash
hash = compute_config_hash(content)
print(hash)  # '0x7a3b...'
```

</TabItem>
</Tabs>

---

## Drift Detection

`ACTPClient.create()` performs a non-blocking drift check: it compares the local `configHash` against the on-chain value. If they differ, a warning is logged but the client still initializes.

```
ACTPClient.create()
       │
       ├── Load AGIRAILS.md (if present)
       ├── Compute local configHash
       ├── Fetch on-chain configHash
       └── If mismatch → log warning (non-blocking)
```

To enforce sync, run `actp diff --quiet` in your CI pipeline and fail the build on `local-ahead` or `diverged`.

---

## CI/CD Integration

```bash
#!/bin/bash
# ci-config-check.sh — Run in CI before deployment

STATUS=$(actp diff --quiet)

case "$STATUS" in
  "in-sync")
    echo "Config in sync with on-chain"
    ;;
  "local-ahead")
    echo "Local config ahead — publishing..."
    actp publish
    ;;
  "remote-ahead")
    echo "WARNING: Remote config is newer — pulling..."
    actp pull --force
    ;;
  "diverged")
    echo "ERROR: Config has diverged — manual resolution needed"
    exit 1
    ;;
  *)
    echo "No config found, skipping"
    ;;
esac
```

---

## Publish-Gated Gas Sponsorship

The Paymaster only sponsors gas for agents with `configHash != 0` in AgentRegistry. This means:

1. **Publish first** — `actp publish` registers your config hash
2. **Get gas-free transactions** — Paymaster sponsors gas for published agents
3. **Stay in sync** — Keep your config updated with `actp diff` + `actp publish`

Unpublished agents pay their own gas fees.

---

**Next:** [CLI Reference](/cli-reference) · [Adapter Routing](/concepts/adapter-routing) · [Provider Agent](/guides/agents/provider-agent)
