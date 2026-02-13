---
slug: security-audit-sdk-v241
title: "Phase 1F Security Audit Complete — SDK v2.4.1"
authors: [agirails]
tags: [release, engineering]
---

Three-agent security audit across smart contracts, SDK, and infrastructure. Smart contracts passed clean. Six SDK hardening fixes shipped in v2.4.1.

<!-- truncate -->

## Smart Contracts: Clean

ACTPKernel, EscrowVault, and AgentRegistry were audited for common vulnerability classes. No critical or high findings. Highlights:

- **ReentrancyGuard** on all state-changing functions
- **CEI pattern** (checks-effects-interactions) throughout
- **Fee cap** hardcoded at 5% (immutable)
- **Two-step admin transfer** (propose + accept)
- **2-day timelock** on economic parameter changes
- **Sybil-resistant reputation** ($100 minimum transaction for attestation)
- **Permanent escrow IDs** (no reuse after settlement)

Ready for external audit.

---

## SDK: Six Fixes Applied

### 1. Dependency Updates (P0)

Updated `@aws-sdk/client-s3` to 3.989.0 (resolved SSRF advisory chain) and `@vercel/node` to 5.6.3. Production HIGH vulnerabilities reduced from 24 to 3, all in transitive dependencies with no upstream fix.

### 2. CORS Origin Restriction (P1)

The publish proxy previously set `Access-Control-Allow-Origin: *`. Now restricted to:

```
https://agirails.io
https://agirails.app
https://app.agirails.io
```

CLI and server-to-server calls (no `Origin` header) are unaffected.

### 3. Private Key Cache TTL (P1)

`resolvePrivateKey()` cached decrypted keys in memory indefinitely. Long-running agent processes would hold keys forever. Now enforces a **30-minute TTL** — expired entries are cleaned on next access.

### 4. Gateway URL Validation (P1)

Already implemented prior to audit. FilebaseClient validates gateway URLs against a whitelist of known IPFS gateways, enforces HTTPS, and rejects non-standard ports.

### 5. Atomic File Writes (P2)

`pending-publish.json` writes now use a write-to-temp + rename pattern:

```
write .tmp (mode 0o600) → rename to target (atomic)
```

Also validates that `.actp/` is a real directory (not a symlink) before writing.

### 6. Secret Scanning CI (P2)

Added [gitleaks](https://github.com/gitleaks/gitleaks) to the CI pipeline. Runs before lint/build/test on every PR and push to main. Prevents accidental credential commits.

---

## Verification

| Check | Result |
|-------|--------|
| TypeScript compilation | 0 errors |
| Test suite | 1,573 passing |
| ESLint | 0 warnings |
| npm audit (production) | 0 critical, 3 high (unfixable transitive) |

---

## SDK v2.4.1

```bash
npm install @agirails/sdk@2.4.1
```

This is a security patch release. No API changes. Drop-in replacement for 2.3.0+.

---

## Publish Proxy — New Repository

The IPFS publish proxy (Vercel serverless) now has its own repository:

[github.com/agirails/publish-proxy](https://github.com/agirails/publish-proxy)

Handles `actp publish` uploads: validates AGIRAILS.md, uploads to Filebase (IPFS pinning), computes canonical configHash, returns CID + hash.

---

## Resources

- [npm Package](https://www.npmjs.com/package/@agirails/sdk)
- [GitHub Repository](https://github.com/agirails/sdk-js)
- [Publish Proxy](https://github.com/agirails/publish-proxy)
- [Contract Source](https://github.com/agirails/actp-kernel)
- [Documentation](https://docs.agirails.io)
- [Discord](https://discord.gg/nuhCt75qe4)
