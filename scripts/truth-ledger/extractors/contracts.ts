/**
 * Contracts extractor.
 *
 * Reads `actp-kernel/deployments/base-{mainnet,sepolia}.json`, runs
 * live Sourcify verification queries for contracts where the
 * deployment JSON declares `verifiedOn: "sourcify"`, and merges
 * results into a typed surface.
 *
 * Per A2 architecture (see `.audit/ARCH_A2.md`).
 *
 * Sourcify API v2 returns:
 *   { match: 'exact_match' | 'partial_match' | null, matchId: number, ... }
 *
 * Soft-fail (per PHASE3_DECISIONS Q5):
 *   - 5xx / timeout / DNS failure → `verified_status: 'deployment_claim_only'`
 *   - 200 + match=null AND deployment claims verified=true:
 *       - local (strict=false): warn, continue
 *       - CI    (strict=true):  hard fail
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  Extractor,
  ExtractorConfig,
  RawSurface,
  NetworkConfig,
  SourcifyStatus,
} from '../types.ts';

// ============================================================
// Deployment JSON shape (per Explorer 1 recon of actp-kernel)
// ============================================================

interface DeploymentJson {
  network: string;
  chainId: number;
  deployedBy?: string;
  blockExplorer: string;
  contracts: Record<string, ContractEntry>;
  postDeploy?: unknown;
  deployment?: unknown;
}

interface ContractEntry {
  address: string;
  verified?: boolean;
  verifiedOn?: 'sourcify' | string;
  verifiedAt?: string;
  deployBlock?: number;
  deployTx?: string;
  explorerUrl?: string;
  constructorArgs?: Record<string, unknown>;
  compiler?: string;
  note?: string;
  status?: 'deprecated' | string;
  // mainnet ACTPKernel additionally:
  platformFeeBps?: number;
  disputeBondBps?: number;
  minDisputeBondMicroUSDC?: number;
  // mainnet ArchiveTreasury additionally:
  owner?: string;
  ownerTransferTx?: string;
  ownerTransferBlock?: number;
}

// ============================================================
// Output shape
// ============================================================

interface ManifestContract {
  address: string;
  verified_status: SourcifyStatus;
  verified_at?: string;
  deployment_claimed_verified?: boolean;
  deploy_block?: number;
  deploy_tx?: string;
  explorer_url?: string;
  compiler?: string;
  status?: 'deprecated';
  note?: string;
  // Surface useful per-contract metadata that already lives in deployment JSON
  platformFeeBps?: number;
  disputeBondBps?: number;
  minDisputeBondMicroUSDC?: number;
  owner?: string;
}

interface ManifestNetworkContracts {
  chainId: number;
  blockExplorer: string;
  contracts: Record<string, ManifestContract>;
}

export interface ContractsSurfaceData {
  'base-mainnet': ManifestNetworkContracts;
  'base-sepolia': ManifestNetworkContracts;
}

// ============================================================
// Sourcify
// ============================================================

interface SourcifyResponse {
  match?: 'exact_match' | 'partial_match' | null;
  matchId?: number;
  chainId?: string;
  address?: string;
  creationMatch?: string | null;
  runtimeMatch?: string | null;
}

interface SourcifyResult {
  status: SourcifyStatus;
  matchId?: number;
}

async function querySourcify(
  config: ExtractorConfig,
  chainId: number,
  address: string,
): Promise<SourcifyResult> {
  const url = `${config.sourcifyBaseUrl}/contract/${chainId}/${address}`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(config.sourcifyTimeoutMs),
    });
    if (!res.ok) {
      console.warn(`[contracts] Sourcify ${chainId}/${address} → HTTP ${res.status}`);
      return { status: 'deployment_claim_only' };
    }
    const body = (await res.json()) as SourcifyResponse;
    if (body.match === 'exact_match') {
      return { status: 'exact_match', matchId: body.matchId };
    }
    if (body.match === 'partial_match') {
      return { status: 'partial_match', matchId: body.matchId };
    }
    // match === null or undefined → no match returned
    return { status: 'no_match' };
  } catch (e) {
    // Network error, timeout, DNS failure
    console.warn(`[contracts] Sourcify ${chainId}/${address} → ${(e as Error).message ?? e}`);
    return { status: 'deployment_claim_only' };
  }
}

// ============================================================
// Per-network processing
// ============================================================

function readDeploymentJson(config: ExtractorConfig, network: NetworkConfig): DeploymentJson {
  const filePath = path.join(config.contractsRoot, `${network.name}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Deployment JSON not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as DeploymentJson;
}

interface VerifiedComputation {
  verified_status: SourcifyStatus;
  verified_at?: string;
  hardFail: boolean;
}

function computeVerifiedStatus(
  sourcifyResult: SourcifyResult | undefined,
  entry: ContractEntry,
  networkName: string,
  strict: boolean,
  warnings: string[],
): VerifiedComputation {
  // Branch 1: contract was queried (verifiedOn === 'sourcify' in deployment JSON)
  if (sourcifyResult) {
    const status = sourcifyResult.status;
    if (status === 'exact_match') {
      return { verified_status: 'exact_match', verified_at: new Date().toISOString(), hardFail: false };
    }
    if (status === 'partial_match') {
      warnings.push(`${networkName}/${entry.address}: Sourcify reports partial_match (not exact)`);
      return { verified_status: 'partial_match', verified_at: new Date().toISOString(), hardFail: false };
    }
    if (status === 'no_match') {
      // Deployment claimed verified but Sourcify disagrees
      if (entry.verified === true) {
        const msg = `${networkName}/${entry.address}: deployment claims verified=true but Sourcify returned no_match`;
        if (strict) {
          warnings.push(`${msg} (STRICT MODE HARD FAIL)`);
          return { verified_status: 'no_match', hardFail: true };
        }
        warnings.push(msg);
      }
      return { verified_status: 'no_match', hardFail: false };
    }
    // status === 'deployment_claim_only' from querySourcify (network error path)
    warnings.push(`${networkName}/${entry.address}: Sourcify unavailable, using deployment JSON claim`);
    return { verified_status: 'deployment_claim_only', hardFail: false };
  }

  // Branch 2: contract NOT queried (verifiedOn !== 'sourcify')
  if (entry.verified === false) {
    return { verified_status: 'unverified', hardFail: false };
  }
  if (entry.verifiedOn === undefined && entry.verified === true) {
    // External token (e.g. Circle USDC) — not our deployment, not Sourcify-verified
    return { verified_status: 'external_token', hardFail: false };
  }
  return { verified_status: 'deployment_claim_only', hardFail: false };
}

async function buildNetworkSection(
  config: ExtractorConfig,
  network: NetworkConfig,
  warnings: string[],
): Promise<{ section: ManifestNetworkContracts; hardFail: boolean }> {
  const deployment = readDeploymentJson(config, network);
  const out: Record<string, ManifestContract> = {};
  let hardFail = false;

  // Build Sourcify query list first; parallelize.
  const queries = Object.entries(deployment.contracts)
    .filter(([, c]) => c.verifiedOn === 'sourcify')
    .map(async ([name, c]) => ({
      name,
      entry: c,
      result: await querySourcify(config, network.chainId, c.address),
    }));
  const sourcifyResults = await Promise.all(queries);
  // Map name → SourcifyResult (not the {name,entry,result} wrapper)
  const byName = new Map<string, SourcifyResult>(sourcifyResults.map((r) => [r.name, r.result]));

  for (const [name, entry] of Object.entries(deployment.contracts)) {
    const sourcifyResult = byName.get(name);

    // Compute verified_status + verified_at first, never relying on
    // late-initialized `let`. tsx ESM transpilation drops late-init
    // declarations under some Node versions; initialize explicitly.
    const computed = computeVerifiedStatus(
      sourcifyResult,
      entry,
      network.name,
      config.strict,
      warnings,
    );
    if (computed.hardFail) hardFail = true;

    const contractEntry: ManifestContract = {
      address: entry.address,
      verified_status: computed.verified_status,
    };
    if (computed.verified_at) contractEntry.verified_at = computed.verified_at;
    if (entry.verified !== undefined) contractEntry.deployment_claimed_verified = entry.verified;
    if (entry.deployBlock !== undefined) contractEntry.deploy_block = entry.deployBlock;
    if (entry.deployTx !== undefined) contractEntry.deploy_tx = entry.deployTx;
    if (entry.explorerUrl) contractEntry.explorer_url = entry.explorerUrl;
    if (entry.compiler) contractEntry.compiler = entry.compiler;
    if (entry.status === 'deprecated') contractEntry.status = 'deprecated';
    if (entry.note) contractEntry.note = entry.note;
    if (entry.platformFeeBps !== undefined) contractEntry.platformFeeBps = entry.platformFeeBps;
    if (entry.disputeBondBps !== undefined) contractEntry.disputeBondBps = entry.disputeBondBps;
    if (entry.minDisputeBondMicroUSDC !== undefined) {
      contractEntry.minDisputeBondMicroUSDC = entry.minDisputeBondMicroUSDC;
    }
    if (entry.owner) contractEntry.owner = entry.owner;

    out[name] = contractEntry;
  }

  return {
    section: {
      chainId: deployment.chainId,
      blockExplorer: deployment.blockExplorer,
      contracts: out,
    },
    hardFail,
  };
}

// ============================================================
// Public extractor
// ============================================================

export const contractsExtractor: Extractor = {
  surface: 'contracts',

  async extract(config: ExtractorConfig): Promise<RawSurface> {
    const warnings: string[] = [];
    const data: Partial<ContractsSurfaceData> = {};
    let anyHardFail = false;

    for (const network of config.networks) {
      const { section, hardFail } = await buildNetworkSection(config, network, warnings);
      data[network.name] = section;
      if (hardFail) anyHardFail = true;
    }

    if (anyHardFail && config.strict) {
      throw new Error(
        'Sourcify deployment-mismatch in strict mode; see warnings above',
      );
    }

    return {
      surface: 'contracts',
      extractedAt: new Date().toISOString(),
      sourceVersion: 'deployments/base-mainnet.json + base-sepolia.json',
      data: data as ContractsSurfaceData,
      warnings,
    };
  },
};
