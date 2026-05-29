/**
 * No-drift / no-ghost-entries invariants.
 *
 * These tests catch the class of bugs the Wave A.23 deep-dive surfaced:
 * extractors picking up test fixtures as public API, divergence lists
 * disagreeing between two manifest sections, CLI subcommands missing
 * from one SDK because the extractor regex didn't cover the pattern,
 * and rendered pages drifting from the manifest they're rendered from.
 *
 * If any of these fail, either:
 *   1. An extractor regressed (fix the extractor, re-run truth-ledger)
 *   2. The source-of-truth `KNOWN_NAME_DIFFS` is out of sync with reality
 *      (curate the array in tier-map.ts)
 *   3. A rendered docs page was hand-edited away from the manifest (revert
 *      the hand-edit; the page is auto-generated)
 *
 * Run with:
 *   npx vitest run scripts/truth-ledger/__tests__/no-drift.test.ts
 */

// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { KNOWN_NAME_DIFFS } from '../tier-map.ts';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const MANIFEST_PATH = path.join(REPO_ROOT, 'static', 'sdk-manifest.json');
const ERRORS_PAGE = path.join(REPO_ROOT, 'docs', 'reference', 'errors', 'index.md');
const CROSS_SDK_PAGE = path.join(REPO_ROOT, 'docs', 'reference', 'cross-sdk-divergences.md');

let manifest: any;
let errorsPage: string;
let crossSdkPage: string;

beforeAll(() => {
  manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  errorsPage = fs.readFileSync(ERRORS_PAGE, 'utf-8');
  crossSdkPage = fs.readFileSync(CROSS_SDK_PAGE, 'utf-8');
});

// ============================================================
// No ghost source paths
// ============================================================
//
// The errors extractor used to include MockRuntime.ts, which has
// test-fixture error classes (ContractPausedError, DeadlinePassedError,
// EscrowNotFoundError, DisputeWindowActiveError) that extend Error
// directly, not ACTPError, and aren't part of the public surface.
// Wave A.23 excluded MockRuntime.ts from TS_ERROR_FILES; this test
// catches a regression.

const BANNED_TS_ERROR_PATHS = [
  /MockRuntime/,
  /\/test\//,
  /__tests__/,
  /\.test\.ts$/,
  /\.spec\.ts$/,
  /fixtures/,
];

const BANNED_PY_ERROR_PATHS = [
  /\/tests?\//,
  /\.test\.py$/,
  /test_.*\.py$/,
];

describe('no ghost error entries from test fixtures', () => {
  it('TS error entries never come from test/mock source paths', () => {
    const offenders: string[] = [];
    for (const e of manifest.errors.ts) {
      for (const banned of BANNED_TS_ERROR_PATHS) {
        if (banned.test(e.source_file)) {
          offenders.push(`${e.class_name} (source: ${e.source_file})`);
          break;
        }
      }
    }
    expect(offenders, `Error entries from banned source paths:\n  ${offenders.join('\n  ')}`).toEqual([]);
  });

  it('Python error entries never come from test source paths', () => {
    const offenders: string[] = [];
    for (const e of manifest.errors.python) {
      for (const banned of BANNED_PY_ERROR_PATHS) {
        if (banned.test(e.source_file)) {
          offenders.push(`${e.class_name} (source: ${e.source_file})`);
          break;
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

// ============================================================
// Divergence list consistency
// ============================================================
//
// The manifest exposes cross-SDK differences in two places:
//   - errors.cross_sdk.ts_only (raw extractor output)
//   - divergences.ts_only.errors (filtered via KNOWN_NAME_DIFFS in diverge.ts)
//
// These must agree: divergences.ts_only.errors should be a subset of
// errors.cross_sdk.ts_only, and the items dropped should be exactly the
// KNOWN_NAME_DIFFS entries.
//
// Wave A.23 surfaced a bug where render-reference rendered the unfiltered
// list while the cross-sdk-divergences page rendered the filtered one,
// producing different counts. This test catches that class of bug.

describe('errors divergence lists are consistent across manifest structures', () => {
  it('divergences.ts_only.errors is a subset of errors.cross_sdk.ts_only', () => {
    const rawTsOnly = new Set<string>(manifest.errors.cross_sdk.ts_only);
    for (const name of manifest.divergences.ts_only.errors) {
      expect(rawTsOnly.has(name), `${name} in filtered but not raw`).toBe(true);
    }
  });

  it('divergences.python_only.errors is a subset of errors.cross_sdk.python_only', () => {
    const rawPyOnly = new Set<string>(manifest.errors.cross_sdk.python_only);
    for (const name of manifest.divergences.python_only.errors) {
      expect(rawPyOnly.has(name), `${name} in filtered but not raw`).toBe(true);
    }
  });

  it('the difference between raw and filtered is exactly the KNOWN_NAME_DIFFS entries', () => {
    const aliasedTs = new Set<string>();
    const aliasedPy = new Set<string>();
    for (const d of KNOWN_NAME_DIFFS) {
      if (d.ts !== d.python) {
        aliasedTs.add(d.ts);
        aliasedPy.add(d.python);
      }
    }

    const filteredTs = new Set<string>(manifest.divergences.ts_only.errors);
    for (const name of manifest.errors.cross_sdk.ts_only) {
      if (!filteredTs.has(name)) {
        expect(aliasedTs.has(name), `${name} dropped from filtered list but not in KNOWN_NAME_DIFFS`).toBe(true);
      }
    }

    const filteredPy = new Set<string>(manifest.divergences.python_only.errors);
    for (const name of manifest.errors.cross_sdk.python_only) {
      if (!filteredPy.has(name)) {
        expect(aliasedPy.has(name), `${name} dropped from filtered list but not in KNOWN_NAME_DIFFS`).toBe(true);
      }
    }
  });

  it('no KNOWN_NAME_DIFFS entry appears in the filtered divergence lists', () => {
    const filteredTs = new Set<string>(manifest.divergences.ts_only.errors);
    const filteredPy = new Set<string>(manifest.divergences.python_only.errors);
    for (const d of KNOWN_NAME_DIFFS) {
      if (d.ts !== d.python) {
        expect(filteredTs.has(d.ts), `name-diff ${d.ts} leaked into ts_only.errors`).toBe(false);
        expect(filteredPy.has(d.python), `name-diff ${d.python} leaked into python_only.errors`).toBe(false);
      }
    }
  });
});

// ============================================================
// CLI cross-SDK consistency
// ============================================================
//
// If a command name with subcommands exists in both SDKs, neither the
// command itself NOR its subcommands should appear in the cross-SDK
// divergence lists (those lists are for genuine asymmetries).
//
// Wave A.23 surfaced a bug where the TS extractor only matched
// `.command('x')` and missed `cmd.addCommand(createXxxCommand())`, so
// shared subcommands like `config show` were falsely listed as
// Python-only.

function flattenCommands(cmds: any[]): string[] {
  const out: string[] = [];
  for (const c of cmds) {
    out.push(c.qualified_name);
    if (c.subcommands) {
      for (const sub of c.subcommands) {
        out.push(sub.qualified_name);
      }
    }
  }
  return out;
}

describe('CLI divergence list does not include commands shared by both SDKs', () => {
  it('no name in divergences.python_only.cli exists in ts.commands (top-level or sub)', () => {
    const tsAll = new Set(flattenCommands(manifest.cli.ts.commands));
    const offenders: string[] = [];
    for (const name of manifest.divergences.python_only.cli) {
      if (tsAll.has(name)) {
        offenders.push(name);
      }
    }
    expect(offenders, `Commands listed as Python-only but present in TS:\n  ${offenders.join('\n  ')}`).toEqual([]);
  });

  it('no name in divergences.ts_only.cli exists in python.commands (top-level or sub)', () => {
    const pyAll = new Set(flattenCommands(manifest.cli.python.commands));
    const offenders: string[] = [];
    for (const name of manifest.divergences.ts_only.cli) {
      if (pyAll.has(name)) {
        offenders.push(name);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('shared parent commands have subcommands extracted on both sides (parity heuristic)', () => {
    // Heuristic: if Python's `config` command has subcommands and TS's `config`
    // command exists, TS's `config` should also have subcommands. If TS extractor
    // genuinely diverges (TS uses a flat command, Python uses a group), document
    // it via KNOWN_BEHAVIORAL_DIFFS rather than letting it silently slip.
    const tsCommands = new Map<string, any>();
    for (const c of manifest.cli.ts.commands) tsCommands.set(c.name, c);
    const pyCommands = new Map<string, any>();
    for (const c of manifest.cli.python.commands) pyCommands.set(c.name, c);

    const SHARED_GROUPS = ['config', 'simulate', 'time', 'tx'];
    const suspicious: string[] = [];
    for (const cmd of SHARED_GROUPS) {
      const ts = tsCommands.get(cmd);
      const py = pyCommands.get(cmd);
      if (!ts || !py) continue;
      const tsHasSubs = ts.subcommands && ts.subcommands.length > 0;
      const pyHasSubs = py.subcommands && py.subcommands.length > 0;
      if (pyHasSubs && !tsHasSubs) {
        suspicious.push(`${cmd}: Python has ${py.subcommands.length} subs, TS has none`);
      }
    }
    expect(
      suspicious,
      `CLI parity bug suspected (likely extractor regression):\n  ${suspicious.join('\n  ')}`,
    ).toEqual([]);
  });
});

// ============================================================
// Contract count agreement
// ============================================================
//
// The contracts extractor knows the per-network contract list. If anyone
// asserts a global count in prose (e.g. "9/10 contracts verified"), the
// number should match what the manifest carries. The glossary had a
// stale "All 8 (4+4)" claim before Wave A.23.

describe('contract counts in the manifest agree with the docs claim shape', () => {
  it('counts the AGIRAILS-deployed contracts (excludes external tokens like USDC)', () => {
    let total = 0;
    let verified = 0;
    for (const net of ['base-mainnet', 'base-sepolia'] as const) {
      const contracts = manifest.contracts[net].contracts;
      for (const [name, c] of Object.entries<any>(contracts)) {
        // Skip external tokens (USDC on mainnet, MockUSDC on sepolia)
        if (c.verified_status === 'external_token') continue;
        if (name === 'USDC' || name === 'MockUSDC') continue;
        total += 1;
        if (c.verified_status === 'exact_match') verified += 1;
      }
    }
    // Sanity bounds. As of 2026-05-29: 4 mainnet + 6 sepolia = 10 contracts,
    // 9 EXACT_MATCH (Sepolia AGIRAILSIdentityRegistry unverified).
    expect(total).toBeGreaterThanOrEqual(8);
    expect(total).toBeLessThanOrEqual(15);
    expect(verified).toBeGreaterThanOrEqual(total - 2);
    expect(verified).toBeLessThanOrEqual(total);
  });
});

// ============================================================
// Rendered docs <> manifest consistency
// ============================================================
//
// The auto-rendered pages must match the manifest they were rendered
// from. Hand-edits to these pages get overwritten on next render, so
// failing here means someone hand-edited a generated page (revert it
// and fix the manifest or render-reference instead).

describe('rendered errors page count matches the manifest', () => {
  it('"TypeScript-only (N)" prose count matches divergences.ts_only.errors.length', () => {
    const m = errorsPage.match(/\*\*TypeScript-only\*\*\s*\((\d+)\)/);
    expect(m, 'errors page missing "TypeScript-only (N)" heading').not.toBeNull();
    const claimed = parseInt(m![1], 10);
    expect(claimed).toBe(manifest.divergences.ts_only.errors.length);
  });

  it('"Python-only (N)" prose count matches divergences.python_only.errors.length', () => {
    const m = errorsPage.match(/\*\*Python-only\*\*\s*\((\d+)\)/);
    expect(m).not.toBeNull();
    const claimed = parseInt(m![1], 10);
    expect(claimed).toBe(manifest.divergences.python_only.errors.length);
  });
});

describe('rendered cross-sdk-divergences page counts match the manifest', () => {
  it('### Errors (N) matches divergences.ts_only.errors.length OR python_only.errors.length', () => {
    // The page has one ### Errors heading. Its count should match the
    // section it's under (TS-only vs Python-only).
    const matches = [...crossSdkPage.matchAll(/### Errors\s*\((\d+)\)/g)];
    expect(matches.length).toBeGreaterThanOrEqual(1);
    const counts = matches.map((m) => parseInt(m[1], 10));
    // Each count should match either TS-only or Python-only filtered count.
    for (const c of counts) {
      const match =
        c === manifest.divergences.ts_only.errors.length ||
        c === manifest.divergences.python_only.errors.length;
      expect(match, `Errors count ${c} matches neither TS-only nor Python-only manifest count`).toBe(true);
    }
  });
});
