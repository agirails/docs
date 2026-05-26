/**
 * Extractor registry. Lists all extractors in dependency-free order;
 * the orchestrator imports this barrel and runs them via Promise.allSettled.
 *
 * Per A2 architecture: each extractor is independently importable.
 * n8n/claude-plugin post-v1 consumers can import a single extractor
 * without pulling in the rest.
 *
 * Phase 5.1 — STUB. Real extractors land in 5.2-5.4. Currently each
 * extractor returns an empty surface so the orchestrator + emit
 * pipeline can be smoke-tested end-to-end without source coupling.
 */

import type { Extractor, RawSurface, ExtractorConfig, SurfaceName } from '../types.ts';
import { contractsExtractor } from './contracts.ts';
import { agirailsMdV4Extractor } from './agirailsmd-v4.ts';
import { errorsExtractor } from './errors.ts';
import { cliExtractor } from './cli.ts';
import { mcpToolsExtractor } from './mcp-tools.ts';
import { sdkApiTsExtractor } from './sdk-api-ts.ts';
import { sdkApiPyExtractor } from './sdk-api-py.ts';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _makeStub_unused(surface: SurfaceName): Extractor {
  return {
    surface,
    async extract(_config: ExtractorConfig): Promise<RawSurface> {
      return {
        surface,
        extractedAt: new Date().toISOString(),
        sourceVersion: 'stub-0.0.0',
        data: { _stub: true, _extractor: surface },
        warnings: [`[${surface}] stub extractor — full implementation pending Phase 5.${surfacePhase(surface)}`],
      };
    },
  };
}

function surfacePhase(surface: SurfaceName): string {
  const phases: Record<SurfaceName, string> = {
    contracts: '2',
    'agirailsmd-v4': '2',
    errors: '3',
    cli: '3',
    'sdk-api-ts': '4',
    'sdk-api-py': '4',
    'mcp-tools': '4',
  };
  return phases[surface];
}

// Order matters only for log readability; execution is parallel.
// All 7 extractors are real as of Phase 5.4.
export const EXTRACTORS: readonly Extractor[] = [
  contractsExtractor,
  agirailsMdV4Extractor,
  errorsExtractor,
  cliExtractor,
  sdkApiTsExtractor,
  sdkApiPyExtractor,
  mcpToolsExtractor,
] as const;
