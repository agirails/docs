/**
 * Cross-boundary compat test for truth-ledger output.
 *
 * Validates `static/sdk-manifest.json` shape from the CONSUMER
 * perspective without importing any truth-ledger internals. Mirrors
 * the checks that `index-docs.ts` performs at runtime when chunking
 * the manifest into Upstash Vector.
 *
 * Per PHASE3_DECISIONS.md constraint 5: "mirrors consumer parser
 * without importing consumer package".
 *
 * Run with `npm run test:run -- truth-ledger-sdk-compat`.
 *
 * NOTE: This test assumes the manifest has been built (either via
 * `npm run truth-ledger` or via the prebuild hook). It does not
 * execute the build itself — that's what extractor unit tests do.
 */

// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const MANIFEST_PATH = path.resolve(__dirname, '..', '..', '..', 'static', 'sdk-manifest.json');

interface ManifestShape {
  _generated?: boolean;
  _doNotEdit?: boolean;
  _generator?: string;
  _generatedAt?: string;
  _sourceVersions?: Record<string, string>;
  divergences?: {
    summary?: Record<string, number>;
    ts_only?: Record<string, string[]>;
    python_only?: Record<string, string[]>;
    name_diffs?: unknown[];
    behavioral_diffs?: unknown[];
  };
  tiers?: Record<string, { sync_status?: string; ts?: string; python?: string }>;
  errors?: { counts?: { ts?: number; python?: number }; ts?: unknown[]; python?: unknown[] };
  cli?: { counts?: { ts?: number; python?: number } };
  contracts?: Record<string, unknown>;
  mcp?: { total?: number; expected_total?: number; layers?: Record<string, unknown[]> };
  protocol?: { protocol?: string; version?: string };
  sdk_api?: { ts?: unknown; python?: unknown; cross_sdk?: unknown };
}

let manifest: ManifestShape;

beforeAll(() => {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(
      `sdk-manifest.json not found at ${MANIFEST_PATH}. Run \`npm run truth-ledger\` first.`,
    );
  }
  const raw = fs.readFileSync(MANIFEST_PATH, 'utf-8');
  manifest = JSON.parse(raw);
});

describe('truth-ledger manifest shape', () => {
  it('has _generated header fields', () => {
    expect(manifest._generated).toBe(true);
    expect(manifest._doNotEdit).toBe(true);
    expect(manifest._generator).toMatch(/build-truth-ledger\.ts/);
    expect(manifest._generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(manifest._sourceVersions).toBeTypeOf('object');
  });

  it('declares current SDK versions', () => {
    const v = manifest._sourceVersions!;
    expect(v['sdk-js']).toMatch(/^\d+\.\d+\.\d+/);
    expect(v['agirails-python']).toMatch(/^\d+\.\d+\.\d+/);
    expect(v['mcp-server']).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe('contracts section', () => {
  it('has both networks', () => {
    expect(manifest.contracts).toBeTypeOf('object');
    expect(manifest.contracts).toHaveProperty('base-mainnet');
    expect(manifest.contracts).toHaveProperty('base-sepolia');
  });

  it('contains V3 mainnet kernel (not V2)', () => {
    const mainnet = manifest.contracts as Record<string, { contracts?: Record<string, { address?: string }> }>;
    const kernel = mainnet['base-mainnet']?.contracts?.['ACTPKernel'];
    expect(kernel?.address?.toLowerCase()).toBe('0x048c811352e8a3fecd5b0ec4aa2c2b94083cc842');
    // Sanity: V2 mainnet kernel must NOT appear anywhere
    const serialized = JSON.stringify(manifest);
    expect(serialized.toLowerCase()).not.toContain('0x132b9eb321dbb57c828b083844287171bdc92d29');
  });

  it('contains V4 sepolia kernel (not pre-V4)', () => {
    const sepolia = manifest.contracts as Record<string, { contracts?: Record<string, { address?: string }> }>;
    const kernel = sepolia['base-sepolia']?.contracts?.['ACTPKernel'];
    expect(kernel?.address?.toLowerCase()).toBe('0x9d25a874f046185d9237cd4954c88d2b74b0021b');
    // Sanity: pre-V4 sepolia kernel must NOT appear
    const serialized = JSON.stringify(manifest);
    expect(serialized.toLowerCase()).not.toContain('0x0ba0b17554601b30f5406e74d2208f567c12ccfe');
  });
});

describe('MCP tools section', () => {
  it('has exactly 20 tools across 3 layers', () => {
    expect(manifest.mcp?.total).toBe(20);
    expect(manifest.mcp?.expected_total).toBe(20);
    const layers = manifest.mcp?.layers as Record<string, unknown[]>;
    expect(layers.discovery).toHaveLength(5);
    expect(layers.runtime).toHaveLength(14);
    expect(layers.protocol).toHaveLength(1);
  });
});

describe('errors section', () => {
  it('has both TS and Python error catalogs with non-zero counts', () => {
    const c = manifest.errors?.counts;
    expect(c?.ts).toBeGreaterThan(0);
    expect(c?.python).toBeGreaterThan(0);
  });
});

describe('CLI section', () => {
  it('has both TS and Python command counts', () => {
    const c = manifest.cli?.counts;
    expect(c?.ts).toBeGreaterThan(0);
    expect(c?.python).toBeGreaterThan(0);
  });

  it('Python CLI includes the "time" command (audit false-negative regression test)', () => {
    // The original docs audit reported `actp time` doesn't exist;
    // python-sdk-v2/src/agirails/cli/main.py:146 proved otherwise.
    // Truth-ledger MUST capture this correctly — it's the canonical
    // motivating example for source-of-truth extraction.
    const cli = manifest.cli as { python?: { commands?: { name?: string; qualified_name?: string }[] } };
    const cmds = cli.python?.commands ?? [];
    const hasTime = cmds.some((c) => c.name === 'time' || c.qualified_name === 'time');
    expect(hasTime).toBe(true);
  });
});

describe('AGIRAILS.md V4 protocol section', () => {
  it('reports protocol=AGIRAILS, version=4.0.0, spec=ACTP', () => {
    const p = manifest.protocol as { protocol?: string; version?: string; spec?: string };
    expect(p.protocol).toBe('AGIRAILS');
    expect(p.version).toBe('4.0.0');
    expect(p.spec).toBe('ACTP');
  });

  it('extracts the 8 canonical ACTP states', () => {
    const p = manifest.protocol as { states?: { name?: string }[] };
    expect(p.states).toHaveLength(8);
    const names = p.states!.map((s) => s.name);
    expect(names).toContain('INITIATED');
    expect(names).toContain('DELIVERED');
    expect(names).toContain('SETTLED');
    expect(names).toContain('DISPUTED');
  });
});

describe('SDK API surface', () => {
  it('has non-empty TS + Python symbol lists', () => {
    const ts = manifest.sdk_api?.ts as { count?: number } | undefined;
    const py = manifest.sdk_api?.python as { count?: number } | undefined;
    expect(ts?.count).toBeGreaterThan(0);
    expect(py?.count).toBeGreaterThan(0);
  });
});

describe('divergences section', () => {
  it('has summary with all four count fields', () => {
    const s = manifest.divergences?.summary;
    expect(s).toBeTypeOf('object');
    expect(s).toHaveProperty('ts_only_count');
    expect(s).toHaveProperty('python_only_count');
    expect(s).toHaveProperty('name_diffs_count');
    expect(s).toHaveProperty('behavioral_diffs_count');
  });

  it('includes the deadline_expired name diff', () => {
    const nds = manifest.divergences?.name_diffs as { concept?: string }[];
    expect(nds.some((n) => n.concept === 'deadline_expired')).toBe(true);
  });

  it('DeadlineExpiredError is NOT in ts_only.errors (alias-filtered)', () => {
    const tsOnly = manifest.divergences?.ts_only as { errors?: string[] };
    expect(tsOnly.errors).not.toContain('DeadlineExpiredError');
  });
});

describe('tiers section', () => {
  it('classifies ACTPClient as level0 in both SDKs', () => {
    const t = manifest.tiers?.['ACTPClient'];
    expect(t?.ts).toBe('level0');
    expect(t?.python).toBe('level0');
    expect(t?.sync_status).toBe('in-sync');
  });
});
