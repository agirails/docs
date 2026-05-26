/**
 * Truth-ledger config resolution.
 *
 * Single place where filesystem paths get resolved. All extractors
 * receive the resolved `ExtractorConfig`; no extractor reads
 * `process.env` or computes paths itself. Per A2 architecture.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ExtractorConfig } from './types.ts';
import { NETWORKS } from './types.ts';

/**
 * Verify that source paths exist before extraction begins. Helps
 * fail-fast when running in an environment that doesn't include
 * the broader AGIRAILS monorepo (e.g. Vercel build of `agirails/docs`
 * repo in isolation). Truth-ledger is meant to run locally or via
 * the CI workflow, NOT during Vercel deploys.
 *
 * @returns array of missing paths (empty when all present)
 */
export function checkSourceAvailability(config: ExtractorConfig): string[] {
  const required = [
    { label: 'sdk-js root', path: config.sdkJsRoot },
    { label: 'python-sdk root', path: config.pythonSdkRoot },
    { label: 'mcp-server root', path: config.mcpServerRoot },
    { label: 'contracts deployments', path: config.contractsRoot },
    { label: 'canonical AGIRAILS.md', path: config.agirailsMdPath },
  ];
  return required.filter((r) => !fs.existsSync(r.path)).map((r) => `${r.label}: ${r.path}`);
}

/**
 * Resolve config from the docs-site root. Assumes this script is
 * invoked from `docs-site/` (per package.json prebuild hook), so
 * monorepo root is `..` from there.
 */
export function resolveConfig(opts?: { docsSiteRoot?: string }): ExtractorConfig {
  // __dirname is docs-site/scripts/truth-ledger/, so monorepo is ../../..
  const docsSiteRoot = opts?.docsSiteRoot ?? path.resolve(__dirname, '..', '..');
  const repoRoot = path.resolve(docsSiteRoot, '..');

  return {
    repoRoot,
    sdkJsRoot: path.join(repoRoot, 'SDK and Runtime', 'sdk-js'),
    pythonSdkRoot: path.join(repoRoot, 'SDK and Runtime', 'python-sdk-v2'),
    mcpServerRoot: path.join(repoRoot, 'Platform', 'agirails-mcp-server'),
    contractsRoot: path.join(repoRoot, 'Protocol', 'actp-kernel', 'deployments'),
    agirailsMdPath: path.join(
      repoRoot,
      'Platform',
      'agirails.app',
      'web',
      'public',
      'protocol',
      'AGIRAILS.md',
    ),
    networks: NETWORKS,
    sourcifyBaseUrl: 'https://sourcify.dev/server/v2',
    sourcifyTimeoutMs: 5000,
    strict: process.env.CI_STRICT === 'true',
  };
}

export const MANIFEST_OUTPUT_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'static',
  'sdk-manifest.json',
);
