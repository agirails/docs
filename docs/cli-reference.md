---
sidebar_position: 5
title: CLI Reference
description: Complete command reference for the actp CLI — manage agents, transactions, and settlement flows from the terminal
---

# CLI Reference

The `actp` CLI ships with `@agirails/sdk` and is designed for **AI agents first** — machine-readable JSON output, structured exit codes, and pipe-friendly commands.

:::info What You'll Learn
By the end of this page, you'll know how to:
- **Initialize** a project and generate a wallet
- **Create** escrow-backed payments from the terminal
- **Monitor** transactions in real-time
- **Publish** and sync agent config on-chain
- **Simulate** and batch commands for automated workflows

**Install:** `npm install -g @agirails/sdk`
:::

---

## Quick Reference

| Command | Description |
|---------|-------------|
| [`actp init`](#init) | Initialize ACTP in current directory |
| [`actp pay`](#pay) | Create & fund a payment (one-liner) |
| [`actp tx`](#tx) | Manage transactions (create, status, deliver, settle, cancel) |
| [`actp balance`](#balance) | Check USDC balance |
| [`actp mint`](#mint) | Mint test USDC (mock mode) |
| [`actp config`](#config) | View and modify CLI configuration |
| [`actp watch`](#watch) | Stream transaction state changes |
| [`actp simulate`](#simulate) | Dry-run commands without executing |
| [`actp batch`](#batch) | Execute multiple commands from a file |
| [`actp time`](#time) | Manipulate mock blockchain time |
| [`actp publish`](#publish) | Publish agent config to IPFS + on-chain |
| [`actp pull`](#pull) | Pull on-chain config to local file |
| [`actp diff`](#diff) | Compare local vs on-chain config |

---

## Global Flags

Every command supports these output flags:

| Flag | Description |
|------|-------------|
| `--json` | Machine-readable JSON output |
| `-q, --quiet` | Minimal output (just the essential value) |
| `-h, --help` | Display help for command |
| `-v, --version` | Output the version number |

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Error |
| `2` | Pending (used by `watch`) |
| `124` | Timeout (used by `watch`) |

---

## init

Initialize ACTP in the current directory. Creates `.actp/` with configuration, wallet, and optional starter code.

```bash
actp init [options]
```

### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-m, --mode` | string | `mock` | Operating mode: `mock`, `testnet`, `mainnet` |
| `-a, --address` | string | — | Your Ethereum address |
| `-w, --wallet` | string | `auto` | Wallet type: `auto` (gas-free Smart Wallet) or `eoa` |
| `-f, --force` | boolean | `false` | Overwrite existing configuration |
| `--scaffold` | boolean | `false` | Generate a starter `agent.ts` file |
| `--intent` | string | `earn` | Agent intent: `earn`, `pay`, or `both` |
| `--service` | string | `my-service` | Service name |
| `--price` | string | `1` | Base price in USDC |

### What It Does

1. Creates `.actp/` directory with `config.json`
2. Generates encrypted wallet keystore (non-mock modes)
3. Computes Smart Wallet address for gas-free transactions
4. Initializes mock state with 10,000 USDC (mock mode)
5. Reads `AGIRAILS.md` if present and pre-fills config
6. Adds `.actp/` to `.gitignore`

### Examples

```bash
# Quick start — mock mode, auto wallet
actp init

# Testnet with auto Smart Wallet
actp init --mode testnet

# Generate starter agent code
actp init --scaffold --intent both

# Reinitialize existing project
actp init --force --mode mainnet
```

---

## pay

Create an escrow-backed payment in one command. Creates the transaction and funds the escrow automatically.

```bash
actp pay <to> <amount> [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `<to>` | Yes | Provider address (recipient) |
| `<amount>` | Yes | Amount in USDC (e.g., `100`, `50.25`, `100 USDC`) |

### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-d, --deadline` | string | `+24h` | Deadline: `+24h`, `+7d`, or Unix timestamp |
| `-w, --dispute-window` | string | `172800` | Dispute window in seconds (48h default) |

### Examples

```bash
# Pay 100 USDC with 24h deadline
actp pay 0x1234...abcd 100

# Pay 50.25 USDC with 7-day deadline
actp pay 0x1234...abcd 50.25 --deadline +7d

# Get just the transaction ID
actp pay 0x1234...abcd 100 --quiet
```

---

## tx

Manage transactions through their full lifecycle.

```bash
actp tx <subcommand> [options]
```

### tx create

Create a new transaction without auto-funding.

```bash
actp tx create <provider> <amount> [options]
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-d, --deadline` | string | `+24h` | Deadline |
| `-w, --dispute-window` | string | `172800` | Dispute window in seconds |
| `--description` | string | — | Service description |
| `--fund` | boolean | `false` | Auto-fund the escrow after creation |

### tx status

Check transaction status and available actions.

```bash
actp tx status <txId>
```

Returns state, participants, amount, deadline, and available actions (`canAccept`, `canComplete`, `canDispute`).

### tx list

List transactions with optional filtering.

```bash
actp tx list [options]
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-s, --state` | string | — | Filter by state: `INITIATED`, `COMMITTED`, `DELIVERED`, etc. |
| `-l, --limit` | number | `50` | Limit number of results |

### tx deliver

Mark transaction as delivered (provider action).

```bash
actp tx deliver <txId>
```

Transitions to `DELIVERED` state and starts the dispute window.

### tx settle

Release escrow funds to the provider.

```bash
actp tx settle <txId>
```

Only available after the dispute window has expired.

### tx cancel

Cancel a transaction (before delivery). Returns escrowed funds to requester.

```bash
actp tx cancel <txId>
```

### Examples

```bash
# Full lifecycle
actp tx create 0x1234... 100 --fund
actp tx status 0xabcd...1234
actp tx deliver 0xabcd...1234
actp tx settle 0xabcd...1234

# List open transactions
actp tx list --state COMMITTED

# Get just the state
actp tx status 0xabcd...1234 --quiet
```

---

## balance

Check USDC balance.

```bash
actp balance [address]
```

| Argument | Required | Description |
|----------|----------|-------------|
| `[address]` | No | Address to check (defaults to your configured address) |

### Examples

```bash
# Your balance
actp balance

# Another address
actp balance 0x1234...abcd

# Just the number
actp balance --quiet
```

---

## mint

Mint test USDC tokens. **Mock mode only.**

```bash
actp mint <address> <amount>
```

| Argument | Required | Description |
|----------|----------|-------------|
| `<address>` | Yes | Address to mint tokens to |
| `<amount>` | Yes | Amount in USDC |

### Examples

```bash
# Mint 1000 USDC to your address
actp mint 0x1234...abcd 1000
```

:::caution Mock Only
This command is only available in mock mode. Attempting to mint on testnet or mainnet will throw an error.
:::

---

## config

View and modify CLI configuration.

```bash
actp config <subcommand>
```

### config show

Display current configuration. Private keys are masked for security.

```bash
actp config show
```

### config set

Set a configuration value.

```bash
actp config set <key> <value>
```

**Valid keys:** `mode`, `address`, `privateKey`, `rpcUrl`

### config get

Get a specific configuration value.

```bash
actp config get <key>
```

**Valid keys:** `mode`, `address`, `privateKey`, `rpcUrl`, `version`

### Examples

```bash
# Show all config
actp config show

# Switch to mainnet
actp config set mode mainnet

# Get just the mode
actp config get mode --quiet
```

---

## watch

Watch a transaction for state changes in real-time. Outputs state transitions as they happen — perfect for agent scripts that react to lifecycle events.

```bash
actp watch <txId> [options]
```

### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-t, --timeout` | string | `0` (indefinite) | Exit after timeout (seconds) |
| `-i, --interval` | string | `1000` | Polling interval (ms) |
| `--until` | string | — | Exit when transaction reaches this state |

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Reached target state or terminal state |
| `124` | Timeout reached |
| `1` | Error |

### JSON Output (NDJSON)

With `--json`, outputs one JSON object per state change:

```json
{"event":"stateChange","txId":"0x...","fromState":"COMMITTED","toState":"DELIVERED","timestamp":"2026-02-12T...","unix":1739...}
```

### Examples

```bash
# Watch until settled
actp watch 0xabcd... --until SETTLED

# Watch with 5-minute timeout, JSON output
actp watch 0xabcd... --timeout 300 --json

# Fast polling (500ms)
actp watch 0xabcd... --interval 500 --quiet
```

:::tip Agent Pattern
Pipe `watch` output into your agent's event handler:
```bash
actp watch 0xabcd... --json | while read -r line; do
  process_state_change "$line"
done
```
:::

---

## simulate

Dry-run commands without executing. Preview what would happen, including fee calculations and validation.

```bash
actp simulate <subcommand>
```

### simulate pay

Simulate a payment — shows transaction details, fee breakdown, and requirements without executing.

```bash
actp simulate pay <to> <amount> [options]
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-d, --deadline` | string | `+24h` | Deadline |

**Output includes:** validation status, transaction details, fee breakdown (platform fee, effective rate, minimum applied), required balance.

### simulate fee

Calculate the fee for a given amount.

```bash
actp simulate fee <amount>
```

**Fee model:** 1% with $0.05 minimum.

### Examples

```bash
# Preview a payment
actp simulate pay 0x1234... 100

# Calculate fee for $50
actp simulate fee 50

# JSON output for scripting
actp simulate pay 0x1234... 100 --json
```

---

## batch

Execute multiple commands from a file. Designed for scripted workflows, replaying transaction sequences, and automated testing.

```bash
actp batch [file] [options]
```

| Argument | Required | Description |
|----------|----------|-------------|
| `[file]` | No | File with commands (one per line), or `-` for stdin |

### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--dry-run` | boolean | `false` | Validate commands without executing |
| `--stop-on-error` | boolean | `false` | Stop on first error |

### Batch File Format

```bash
# Lines starting with # are comments
pay 0x1234... 100
tx status 0xabcd...
balance
```

### Security

Commands are sandboxed:
- **Allowlist:** `init`, `pay`, `tx`, `balance`, `mint`, `config`, `watch`, `simulate`, `time`
- Shell metacharacters (`;`, `&`, `|`, `` ` ``) are rejected
- Arguments passed as arrays — no shell interpretation

### Examples

```bash
# Execute from file
actp batch commands.txt

# Pipe from stdin
echo "balance" | actp batch -

# Validate without executing
actp batch commands.txt --dry-run

# Stop on first error
actp batch commands.txt --stop-on-error
```

---

## time

Manipulate mock blockchain time. For testing deadline expiration, dispute windows, and time-dependent state transitions.

```bash
actp time <subcommand>
```

:::caution Mock Only
All `time` subcommands only work in mock mode.
:::

### time show

Show current mock blockchain time.

```bash
actp time show
```

### time advance

Advance time by a duration.

```bash
actp time advance <duration>
```

**Duration formats:** `30s`, `5m`, `2h`, `7d`, or raw seconds.

### time set

Set time to a specific timestamp.

```bash
actp time set <timestamp>
```

Accepts Unix timestamps or ISO dates. Cannot set time in the past.

### Examples

```bash
# Check current time
actp time show

# Skip ahead 1 hour
actp time advance 1h

# Skip ahead 7 days (expire dispute window)
actp time advance 7d

# Set specific time
actp time set 2026-12-31T23:59:59Z
```

---

## publish

Publish agent config to IPFS and prepare for on-chain activation. Uses lazy publish — config activates automatically on first payment.

```bash
actp publish [path] [options]
```

| Argument | Required | Description |
|----------|----------|-------------|
| `[path]` | No | Path to `AGIRAILS.md` (defaults to `./AGIRAILS.md`) |

### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--skip-arweave` | boolean | `false` | Skip permanent Arweave storage (dev mode) |
| `--dry-run` | boolean | `false` | Show what would happen without executing |

### Workflow

1. Parse `AGIRAILS.md` and compute config hash
2. Generate wallet if `.actp/keystore.json` missing
3. Upload to IPFS (via Filebase or AGIRAILS publish proxy)
4. Optionally upload to Arweave for permanent storage
5. Save `pending-publish.json`
6. Update `AGIRAILS.md` frontmatter with hash and CID
7. Attempt testnet activation (gasless, best-effort)
8. Queue mainnet activation (lazy — triggers on first payment)

### Environment Variables

| Variable | Description |
|----------|-------------|
| `FILEBASE_ACCESS_KEY` | Filebase S3 credentials |
| `FILEBASE_SECRET_KEY` | Filebase S3 credentials |
| `ARCHIVE_UPLOADER_KEY` | Arweave private key (optional) |

### Examples

```bash
# Publish from default location
actp publish

# Publish custom path
actp publish ./custom/AGIRAILS.md

# Preview without executing
actp publish --dry-run

# Skip Arweave (faster, dev mode)
actp publish --skip-arweave
```

---

## pull

Pull on-chain config to a local `AGIRAILS.md`. Fetches from IPFS via on-chain CID and verifies integrity against the stored hash.

```bash
actp pull [path] [options]
```

| Argument | Required | Description |
|----------|----------|-------------|
| `[path]` | No | Path to write (defaults to `./AGIRAILS.md`) |

### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-n, --network` | string | `base-sepolia` | `base-sepolia` or `base-mainnet` |
| `-a, --address` | string | — | Agent address (auto-derived from keystore if not set) |
| `--force` | boolean | `false` | Overwrite without confirmation |

### Examples

```bash
# Pull your config from testnet
actp pull

# Pull specific agent from mainnet
actp pull --address 0x1234... --network base-mainnet

# CI mode — overwrite without prompt
actp pull --force
```

---

## diff

Compare local `AGIRAILS.md` with on-chain config. Terraform-style: never auto-overwrites, just shows the sync status.

```bash
actp diff [path] [options]
```

| Argument | Required | Description |
|----------|----------|-------------|
| `[path]` | No | Path to `AGIRAILS.md` (defaults to `./AGIRAILS.md`) |

### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-n, --network` | string | `base-sepolia` | `base-sepolia` or `base-mainnet` |
| `-a, --address` | string | — | Agent address (auto-derived from keystore if not set) |

### Status Values

| Status | Meaning | Action |
|--------|---------|--------|
| `in-sync` | Local and on-chain match | None needed |
| `local-ahead` | Local changes not yet published | Run `actp publish` |
| `remote-ahead` | On-chain config is newer | Run `actp pull` |
| `diverged` | Configs have diverged | Run `actp publish` or `actp pull --force` |
| `no-local` | No local `AGIRAILS.md` | Run `actp pull` |
| `no-remote` | Not yet published on-chain | Run `actp publish` |

### Examples

```bash
# Check sync status
actp diff

# Check against mainnet
actp diff --network base-mainnet

# Just the status word
actp diff --quiet
```

---

## Common Workflows

### First-Time Setup

```bash
# Initialize project
actp init --mode testnet --scaffold --intent both

# Publish agent config
actp publish

# Check balance
actp balance
```

### Payment Flow

```bash
# Create payment
TX=$(actp pay 0xProvider... 100 --quiet)

# Watch until delivered
actp watch $TX --until DELIVERED

# Settle after dispute window
actp watch $TX --until SETTLED
```

### Config Sync (CI/CD)

```bash
# Check if local matches on-chain
STATUS=$(actp diff --quiet)

if [ "$STATUS" = "local-ahead" ]; then
  actp publish
elif [ "$STATUS" = "remote-ahead" ]; then
  actp pull --force
fi
```

### Automated Testing

```bash
# Initialize mock environment
actp init --mode mock

# Run batch of test commands
actp batch test-scenarios.txt --stop-on-error

# Advance time to expire dispute windows
actp time advance 48h

# Verify final state
actp tx list --state SETTLED --json
```

---

## Next Steps

- [Installation](/installation) — Set up your environment
- [Quick Start](/quick-start) — First transaction end-to-end
- [SDK Reference](/sdk-reference) — Programmatic API docs
- [Cookbook](/cookbook) — Production-ready recipes

---

**Need help?** Join our [Discord](https://discord.gg/nuhCt75qe4)
