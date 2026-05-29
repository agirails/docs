#!/usr/bin/env tsx
/**
 * Bump truth-ledger source SHA pins to current working-tree HEAD.
 *
 * Reads truth-ledger.pins.json, queries each source repo's HEAD via
 * git rev-parse, writes the new SHAs back. Emits a summary of what
 * changed so the resulting git diff is the explicit review surface.
 *
 * The right workflow:
 *   1. Pull upstream SDK source intentionally (review the source diff).
 *   2. Run: npm run truth-ledger:bump-pins
 *   3. Verify the truth-ledger.pins.json diff matches your expectation.
 *   4. Commit the pin bump as its own PR for explicit review.
 *
 * The pin bump is the deliberate trust-extension act Apex DR-2 calls for.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { getRepoHead, loadPins } from './truth-ledger/pins.ts';
import { resolveConfig } from './truth-ledger/config.ts';

const docsSiteRoot = path.resolve(__dirname, '..');
const pinsPath = path.join(docsSiteRoot, 'truth-ledger.pins.json');

function main(): void {
  const pins = loadPins(docsSiteRoot);
  if (!pins) {
    console.error('[bump-pins] truth-ledger.pins.json not found at', pinsPath);
    process.exit(1);
  }
  const config = resolveConfig({ docsSiteRoot });
  const repoRoot = config.repoRoot;

  let bumped = 0;
  const summary: string[] = [];

  for (const [name, pin] of Object.entries(pins.source_pins)) {
    const repoPath = path.join(repoRoot, pin.expected_path);
    if (!fs.existsSync(path.join(repoPath, '.git'))) {
      summary.push(`  ${name}: SKIP (not a git checkout at ${pin.expected_path})`);
      continue;
    }
    const actual = getRepoHead(repoPath);
    if (!actual) {
      summary.push(`  ${name}: SKIP (could not read HEAD)`);
      continue;
    }
    if (actual === pin.head_sha) {
      summary.push(`  ${name}: unchanged (${actual.slice(0, 12)})`);
      continue;
    }
    summary.push(`  ${name}: ${pin.head_sha.slice(0, 12)} -> ${actual.slice(0, 12)}`);
    pin.head_sha = actual;
    bumped++;
  }

  if (bumped === 0) {
    console.log('[bump-pins] no pins changed');
    for (const line of summary) console.log(line);
    return;
  }

  // Update timestamp marker. Manual; not used by code, just bookkeeping.
  const today = new Date().toISOString().slice(0, 10);
  (pins as Record<string, unknown>)._updated_at = today;

  // Write back with 2-space indent matching original formatting.
  const json = JSON.stringify(pins, null, 2) + '\n';
  fs.writeFileSync(pinsPath, json, 'utf-8');

  console.log(`[bump-pins] updated ${bumped} pin(s) in ${path.basename(pinsPath)}:`);
  for (const line of summary) console.log(line);
  console.log('');
  console.log('Review the diff in truth-ledger.pins.json and commit explicitly.');
  console.log('A pin bump is the deliberate extension of trust to a new upstream SHA.');
}

main();
