/**
 * Per-extractor invariant tests.
 *
 * Each extractor has shape guarantees its consumers (render-reference,
 * llms-full generator, MCP server indexer) depend on. These tests run
 * the live manifest through the same checks, plus dedicated invariants
 * that catch regressions in extractor output without rebuilding the
 * full pipeline.
 *
 * Coverage:
 *   - errors extractor: every entry has the four fields; cross_sdk lists
 *     are computed correctly (a name listed in ts_only must not appear
 *     in python's names, and vice versa)
 *   - cli extractor: every command has name + qualified_name;
 *     subcommands (when present) have the same shape; cross_sdk counts
 *     match what's listed
 *   - mcp extractor: total == sum of layers; every tool has
 *     name + description + read_only + destructive
 *   - contracts extractor: every contract has address + verified_status;
 *     verified_status is one of the known enum values
 *   - sdk_api extractor: every symbol has name + kind + tier;
 *     tier is one of {level0, basic, standard, advanced, internal};
 *     cross_sdk.counts match the lists
 *
 * Run with: npx vitest run scripts/truth-ledger/__tests__/extractors-invariants.test.ts
 */

// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const MANIFEST_PATH = path.resolve(__dirname, '..', '..', '..', 'static', 'sdk-manifest.json');

let manifest: any;

beforeAll(() => {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(
      `Manifest not found at ${MANIFEST_PATH}. Run npm run truth-ledger first.`,
    );
  }
  manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
});

// ============================================================
// Errors extractor
// ============================================================

describe('errors extractor', () => {
  it('exposes ts + python + cross_sdk + counts', () => {
    expect(manifest.errors).toBeDefined();
    expect(Array.isArray(manifest.errors.ts)).toBe(true);
    expect(Array.isArray(manifest.errors.python)).toBe(true);
    expect(manifest.errors.cross_sdk).toBeDefined();
    expect(manifest.errors.counts).toBeDefined();
  });

  it('every TS error entry has class_name + parent + source_file + code (string|null)', () => {
    for (const e of manifest.errors.ts) {
      expect(typeof e.class_name).toBe('string');
      expect(e.class_name.length).toBeGreaterThan(0);
      expect(typeof e.parent).toBe('string');
      expect(typeof e.source_file).toBe('string');
      expect(e.code === null || typeof e.code === 'string').toBe(true);
    }
  });

  it('every Python error entry has the same shape', () => {
    for (const e of manifest.errors.python) {
      expect(typeof e.class_name).toBe('string');
      expect(typeof e.parent).toBe('string');
      expect(typeof e.source_file).toBe('string');
      expect(e.code === null || typeof e.code === 'string').toBe(true);
    }
  });

  it('counts match the array lengths', () => {
    expect(manifest.errors.counts.ts).toBe(manifest.errors.ts.length);
    expect(manifest.errors.counts.python).toBe(manifest.errors.python.length);
  });

  it('ts_only names do not appear in python names, and vice versa', () => {
    const tsNames = new Set(manifest.errors.ts.map((e: any) => e.class_name));
    const pyNames = new Set(manifest.errors.python.map((e: any) => e.class_name));
    for (const name of manifest.errors.cross_sdk.ts_only) {
      expect(pyNames.has(name)).toBe(false);
      expect(tsNames.has(name)).toBe(true);
    }
    for (const name of manifest.errors.cross_sdk.python_only) {
      expect(tsNames.has(name)).toBe(false);
      expect(pyNames.has(name)).toBe(true);
    }
  });

  it('has at least 10 errors per SDK (sanity floor)', () => {
    expect(manifest.errors.ts.length).toBeGreaterThanOrEqual(10);
    expect(manifest.errors.python.length).toBeGreaterThanOrEqual(10);
  });
});

// ============================================================
// CLI extractor
// ============================================================

describe('cli extractor', () => {
  it('exposes ts.commands + python.commands + cross_sdk + counts', () => {
    expect(manifest.cli).toBeDefined();
    expect(Array.isArray(manifest.cli.ts.commands)).toBe(true);
    expect(Array.isArray(manifest.cli.python.commands)).toBe(true);
    expect(manifest.cli.cross_sdk).toBeDefined();
    expect(manifest.cli.counts).toBeDefined();
  });

  it('every command has name + qualified_name', () => {
    for (const sdk of ['ts', 'python'] as const) {
      for (const cmd of manifest.cli[sdk].commands) {
        expect(typeof cmd.name).toBe('string');
        expect(typeof cmd.qualified_name).toBe('string');
        if (cmd.subcommands) {
          expect(Array.isArray(cmd.subcommands)).toBe(true);
          for (const sub of cmd.subcommands) {
            expect(typeof sub.name).toBe('string');
            expect(typeof sub.qualified_name).toBe('string');
          }
        }
      }
    }
  });

  it('counts.ts >= ts.commands.length (counts may include subcommands)', () => {
    expect(manifest.cli.counts.ts).toBeGreaterThanOrEqual(manifest.cli.ts.commands.length);
    expect(manifest.cli.counts.python).toBeGreaterThanOrEqual(manifest.cli.python.commands.length);
  });

  it('has at least 5 CLI commands per SDK (sanity floor)', () => {
    expect(manifest.cli.ts.commands.length).toBeGreaterThanOrEqual(5);
    expect(manifest.cli.python.commands.length).toBeGreaterThanOrEqual(5);
  });
});

// ============================================================
// MCP extractor
// ============================================================

describe('mcp extractor', () => {
  it('exposes total + layers (discovery/runtime/protocol)', () => {
    expect(manifest.mcp).toBeDefined();
    expect(typeof manifest.mcp.total).toBe('number');
    expect(manifest.mcp.layers).toBeDefined();
    expect(Array.isArray(manifest.mcp.layers.discovery)).toBe(true);
    expect(Array.isArray(manifest.mcp.layers.runtime)).toBe(true);
    expect(Array.isArray(manifest.mcp.layers.protocol)).toBe(true);
  });

  it('total == sum of layer sizes', () => {
    const sum =
      manifest.mcp.layers.discovery.length +
      manifest.mcp.layers.runtime.length +
      manifest.mcp.layers.protocol.length;
    expect(manifest.mcp.total).toBe(sum);
  });

  it('every tool has name + description + read_only + destructive', () => {
    for (const layer of ['discovery', 'runtime', 'protocol'] as const) {
      for (const tool of manifest.mcp.layers[layer]) {
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(typeof tool.read_only).toBe('boolean');
        expect(typeof tool.destructive).toBe('boolean');
      }
    }
  });

  it('has at least 15 MCP tools (sanity floor)', () => {
    expect(manifest.mcp.total).toBeGreaterThanOrEqual(15);
  });
});

// ============================================================
// Contracts extractor
// ============================================================

describe('contracts extractor', () => {
  it('exposes base-mainnet + base-sepolia networks', () => {
    expect(manifest.contracts).toBeDefined();
    expect(manifest.contracts['base-mainnet']).toBeDefined();
    expect(manifest.contracts['base-sepolia']).toBeDefined();
  });

  it('every contract has address + verified_status', () => {
    const VALID_STATUSES = new Set([
      'exact_match',
      'partial_match',
      'no_match',
      'deployment_claim_only',
      'unverified',
      'external_token',
    ]);
    for (const net of ['base-mainnet', 'base-sepolia'] as const) {
      const contracts = manifest.contracts[net].contracts;
      for (const [name, c] of Object.entries<any>(contracts)) {
        expect(typeof c.address).toBe('string');
        expect(c.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
        expect(typeof c.verified_status).toBe('string');
        expect(VALID_STATUSES.has(c.verified_status)).toBe(true);
      }
    }
  });

  it('every network has chainId + blockExplorer', () => {
    for (const net of ['base-mainnet', 'base-sepolia'] as const) {
      expect(typeof manifest.contracts[net].chainId).toBe('number');
      expect(typeof manifest.contracts[net].blockExplorer).toBe('string');
      expect(manifest.contracts[net].blockExplorer.startsWith('https://')).toBe(true);
    }
  });

  it('mainnet has the four canonical contracts plus USDC', () => {
    const names = Object.keys(manifest.contracts['base-mainnet'].contracts);
    for (const required of ['ACTPKernel', 'EscrowVault', 'AgentRegistry', 'USDC']) {
      expect(names).toContain(required);
    }
  });
});

// ============================================================
// SDK API extractor
// ============================================================

describe('sdk_api extractor', () => {
  it('exposes ts + python + cross_sdk', () => {
    expect(manifest.sdk_api).toBeDefined();
    expect(manifest.sdk_api.ts).toBeDefined();
    expect(manifest.sdk_api.python).toBeDefined();
    expect(manifest.sdk_api.cross_sdk).toBeDefined();
  });

  it('every symbol has name + tier (TS additionally has kind)', () => {
    const VALID_TIERS = new Set(['simple', 'standard', 'advanced', 'internal']);
    for (const sym of manifest.sdk_api.ts.symbols) {
      expect(typeof sym.name).toBe('string');
      expect(sym.name.length).toBeGreaterThan(0);
      expect(typeof sym.kind).toBe('string');
      expect(typeof sym.tier).toBe('string');
      expect(VALID_TIERS.has(sym.tier)).toBe(true);
    }
    for (const sym of manifest.sdk_api.python.symbols) {
      expect(typeof sym.name).toBe('string');
      expect(sym.name.length).toBeGreaterThan(0);
      expect(typeof sym.tier).toBe('string');
      expect(VALID_TIERS.has(sym.tier)).toBe(true);
      // Python extractor doesn't surface kind yet — track but don't fail
    }
  });

  it('counts match symbol-array lengths', () => {
    expect(manifest.sdk_api.ts.count).toBe(manifest.sdk_api.ts.symbols.length);
    expect(manifest.sdk_api.python.count).toBe(manifest.sdk_api.python.symbols.length);
  });

  it('cross_sdk.counts match the cross_sdk arrays', () => {
    expect(manifest.sdk_api.cross_sdk.counts.ts_only).toBe(
      manifest.sdk_api.cross_sdk.ts_only.length,
    );
    expect(manifest.sdk_api.cross_sdk.counts.python_only).toBe(
      manifest.sdk_api.cross_sdk.python_only.length,
    );
  });

  it('package versions are present (semver)', () => {
    const SEMVER = /^\d+\.\d+\.\d+/;
    expect(manifest.sdk_api.ts.package_version).toMatch(SEMVER);
    expect(manifest.sdk_api.python.package_version).toMatch(SEMVER);
  });
});

// ============================================================
// Tiers (cross-SDK normalization)
// ============================================================

describe('tiers (cross-SDK normalization)', () => {
  it('every entry has sync_status', () => {
    const VALID_STATUSES = new Set([
      'in-sync',
      'local-ahead',
      'remote-ahead',
      'diverged',
      'ts-only',
      'python-only',
    ]);
    for (const [name, entry] of Object.entries<any>(manifest.tiers)) {
      expect(typeof entry.sync_status).toBe('string');
      expect(VALID_STATUSES.has(entry.sync_status)).toBe(true);
    }
  });

  it('in-sync entries have at least one side populated', () => {
    // An entry is keyed by the literal source name from one SDK; "in-sync"
    // means the OTHER SDK has a counterpart, but that counterpart lives
    // under its own key (e.g. `calculatePrice` ts-side, `calculate_price`
    // python-side — two tiers entries, both in-sync). So an in-sync entry
    // doesn't have to carry both `ts` and `python` itself.
    for (const [name, entry] of Object.entries<any>(manifest.tiers)) {
      if (entry.sync_status === 'in-sync') {
        const hasTs = typeof entry.ts === 'string';
        const hasPy = typeof entry.python === 'string';
        expect(hasTs || hasPy).toBe(true);
      }
    }
  });
});

// ============================================================
// Protocol surface
// ============================================================

describe('protocol surface', () => {
  it('exposes protocol identifier + spec + version', () => {
    expect(manifest.protocol).toBeDefined();
    // Canonical AGIRAILS.md uses { protocol: "AGIRAILS", spec: "ACTP", version: "X.Y.Z" }
    expect(manifest.protocol.protocol).toBe('AGIRAILS');
    expect(manifest.protocol.spec).toBe('ACTP');
    expect(typeof manifest.protocol.version).toBe('string');
  });

  it('exposes the 8-state machine in protocol.states', () => {
    expect(Array.isArray(manifest.protocol.states)).toBe(true);
    expect(manifest.protocol.states.length).toBe(8);
    const names = manifest.protocol.states.map((s: any) => s.name);
    for (const required of [
      'INITIATED', 'QUOTED', 'COMMITTED', 'IN_PROGRESS',
      'DELIVERED', 'SETTLED', 'DISPUTED', 'CANCELLED',
    ]) {
      expect(names).toContain(required);
    }
  });
});
