/**
 * SHA pin verification + coverage floor enforcement for the truth-ledger.
 *
 * Apex DR-2 fix: the extractor reads filesystem paths to sibling repos
 * and treats them as ground truth. This module adds three guards:
 *
 *   1. SHA pin: before extraction, verify each pinned repo's HEAD
 *      matches the declared sha in truth-ledger.pins.json. A
 *      compromised upstream cannot silently propagate into the manifest
 *      without also updating the pin (which is a deliberate review act).
 *   2. Coverage floor: after extraction, verify per-surface counts
 *      stay at or above declared minimums. Detects silent symbol
 *      drops where in-sync improves while coverage regresses.
 *   3. Manifest diff: at the end of every build, emit MANIFEST_DIFF.md
 *      next to the manifest summarizing what changed since the previous
 *      build. Makes drift visible to PR review.
 *
 * Strict vs loose: pins/floor failures are warnings by default so a
 * developer pulling new SDK source can iterate. Setting
 * TRUTH_LEDGER_PINS=strict (which CI does) escalates to errors.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

export interface SourcePin {
  expected_path: string;
  head_sha: string;
  notes?: string;
}

export interface CoverageFloors {
  ts_symbols: number;
  python_symbols: number;
  ts_errors: number;
  python_errors: number;
  mcp_tools: number;
  ts_cli_commands: number;
  python_cli_commands: number;
}

export interface PinsFile {
  source_pins: Record<string, SourcePin>;
  coverage_floors: CoverageFloors;
}

export interface PinViolation {
  kind: 'pin_mismatch' | 'pin_missing' | 'floor_violation' | 'repo_not_git';
  source: string;
  expected?: string;
  actual?: string | number;
  message: string;
}

export function loadPins(docsSiteRoot: string): PinsFile | null {
  const file = path.join(docsSiteRoot, 'truth-ledger.pins.json');
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

export function getRepoHead(repoPath: string): string | null {
  try {
    const out = execSync('git rev-parse HEAD', {
      cwd: repoPath,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return out.trim();
  } catch {
    return null;
  }
}

export function verifyPins(
  pins: PinsFile,
  repoRoot: string,
): PinViolation[] {
  const violations: PinViolation[] = [];
  for (const [name, pin] of Object.entries(pins.source_pins)) {
    const repoPath = path.join(repoRoot, pin.expected_path);
    if (!fs.existsSync(path.join(repoPath, '.git'))) {
      violations.push({
        kind: 'repo_not_git',
        source: name,
        message: `Source repo not a git checkout: ${pin.expected_path} (cannot verify SHA pin)`,
      });
      continue;
    }
    const actual = getRepoHead(repoPath);
    if (!actual) {
      violations.push({
        kind: 'pin_missing',
        source: name,
        expected: pin.head_sha,
        message: `Could not read HEAD of ${pin.expected_path}`,
      });
      continue;
    }
    if (actual !== pin.head_sha) {
      violations.push({
        kind: 'pin_mismatch',
        source: name,
        expected: pin.head_sha,
        actual,
        message: `Pin mismatch for ${name}: expected ${pin.head_sha.slice(0, 12)}, working tree at ${actual.slice(0, 12)}. Bump pin via npm run truth-ledger:bump-pins after reviewing the source diff.`,
      });
    }
  }
  return violations;
}

export interface SurfaceCounts {
  ts_symbols: number;
  python_symbols: number;
  ts_errors: number;
  python_errors: number;
  mcp_tools: number;
  ts_cli_commands: number;
  python_cli_commands: number;
}

export function verifyFloors(
  pins: PinsFile,
  counts: SurfaceCounts,
): PinViolation[] {
  const violations: PinViolation[] = [];
  const floors = pins.coverage_floors;
  for (const key of Object.keys(floors) as Array<keyof CoverageFloors>) {
    if (typeof floors[key] !== 'number') continue;
    const actual = counts[key];
    const floor = floors[key];
    if (actual < floor) {
      violations.push({
        kind: 'floor_violation',
        source: key,
        expected: floor,
        actual,
        message: `Coverage floor violated for ${key}: ${actual} (floor: ${floor}). Either a real regression (investigate which symbols dropped) or a deprecation requiring a floor bump.`,
      });
    }
  }
  return violations;
}

export function reportViolations(
  violations: PinViolation[],
  strict: boolean,
): void {
  if (violations.length === 0) {
    console.log('[truth-ledger:pins] all pins + floors verified');
    return;
  }
  const level = strict ? '[truth-ledger:pins] FAIL' : '[truth-ledger:pins] WARN';
  for (const v of violations) {
    console.log(`${level} (${v.kind}): ${v.message}`);
  }
  if (strict) {
    throw new Error(
      `Truth-ledger pin/floor verification failed (${violations.length} violations). ` +
        'Either bump the pins explicitly (npm run truth-ledger:bump-pins) or investigate the regression.',
    );
  } else {
    console.log(
      `[truth-ledger:pins] running in non-strict mode; ${violations.length} violations reported as warnings. ` +
        'Set TRUTH_LEDGER_PINS=strict to fail the build.',
    );
  }
}

/**
 * Diff two manifest snapshots and emit a human-readable summary of
 * what changed: added/removed symbols per surface, contract address
 * deltas, MCP tool changes. Output is consumed by PR review.
 */
export function emitManifestDiff(
  oldManifest: unknown | null,
  newManifest: unknown,
  outputPath: string,
): void {
  const oldM = oldManifest as Record<string, unknown> | null;
  const newM = newManifest as Record<string, unknown>;
  const lines: string[] = [];
  lines.push('<!-- GENERATED by scripts/truth-ledger/pins.ts on every truth-ledger build. -->');
  lines.push('');
  lines.push('# Manifest diff');
  lines.push('');
  if (oldM == null) {
    lines.push('No previous manifest available for comparison (first build, or previous file missing).');
    fs.writeFileSync(outputPath, lines.join('\n') + '\n', 'utf-8');
    return;
  }

  const at = ((newM._generatedAt as string) ?? 'unknown').slice(0, 19).replace('T', ' ');
  const prev = ((oldM._generatedAt as string) ?? 'unknown').slice(0, 19).replace('T', ' ');
  lines.push(`**Generated at**: ${at} UTC  ·  **Previous build**: ${prev} UTC`);
  lines.push('');

  // SDK symbol diffs
  const sectionDiffs = (label: string, oldSyms: string[], newSyms: string[]): void => {
    const added = newSyms.filter((s) => !oldSyms.includes(s));
    const removed = oldSyms.filter((s) => !newSyms.includes(s));
    if (added.length === 0 && removed.length === 0) {
      lines.push(`### ${label}`);
      lines.push('');
      lines.push('_(no changes)_');
      lines.push('');
      return;
    }
    lines.push(`### ${label}`);
    lines.push('');
    if (added.length > 0) {
      lines.push(`**Added (${added.length})**: ${added.map((s) => `\`${s}\``).join(', ')}`);
      lines.push('');
    }
    if (removed.length > 0) {
      lines.push(`**Removed (${removed.length})**: ${removed.map((s) => `\`${s}\``).join(', ')}`);
      lines.push('');
    }
  };

  const oldTs = ((oldM.sdk_api as { ts?: { symbols?: { name: string }[] } } | undefined)?.ts?.symbols ?? []).map((s) => s.name);
  const newTs = ((newM.sdk_api as { ts?: { symbols?: { name: string }[] } } | undefined)?.ts?.symbols ?? []).map((s) => s.name);
  const oldPy = ((oldM.sdk_api as { python?: { symbols?: { name: string }[] } } | undefined)?.python?.symbols ?? []).map((s) => s.name);
  const newPy = ((newM.sdk_api as { python?: { symbols?: { name: string }[] } } | undefined)?.python?.symbols ?? []).map((s) => s.name);
  const oldErrTs = ((oldM.errors as { ts?: { class_name: string }[] } | undefined)?.ts ?? []).map((e) => e.class_name);
  const newErrTs = ((newM.errors as { ts?: { class_name: string }[] } | undefined)?.ts ?? []).map((e) => e.class_name);
  const oldErrPy = ((oldM.errors as { python?: { class_name: string }[] } | undefined)?.python ?? []).map((e) => e.class_name);
  const newErrPy = ((newM.errors as { python?: { class_name: string }[] } | undefined)?.python ?? []).map((e) => e.class_name);

  sectionDiffs('TS SDK symbols', oldTs, newTs);
  sectionDiffs('Python SDK symbols', oldPy, newPy);
  sectionDiffs('TS error classes', oldErrTs, newErrTs);
  sectionDiffs('Python error classes', oldErrPy, newErrPy);

  // MCP tool diffs
  const mcpTools = (m: Record<string, unknown> | null): string[] => {
    if (!m) return [];
    const mcp = m.mcp as { layers?: { discovery?: { name: string }[]; runtime?: { name: string }[]; protocol?: { name: string }[] } } | undefined;
    if (!mcp?.layers) return [];
    return [
      ...(mcp.layers.discovery ?? []),
      ...(mcp.layers.runtime ?? []),
      ...(mcp.layers.protocol ?? []),
    ].map((t) => t.name);
  };
  sectionDiffs('MCP tools', mcpTools(oldM), mcpTools(newM));

  fs.writeFileSync(outputPath, lines.join('\n') + '\n', 'utf-8');
  console.log(`[truth-ledger:pins] manifest diff written to ${path.basename(outputPath)}`);
}
