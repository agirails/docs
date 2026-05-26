/**
 * Canonical AGIRAILS.md V4 extractor.
 *
 * Reads the protocol-spec file at `Platform/agirails.app/web/public/protocol/AGIRAILS.md`
 * and extracts:
 *   - protocol version, network, currency, fee
 *   - 8 ACTP states with values
 *   - 20 capability names
 *   - onboarding question shapes (id + type only — no hint text in v1)
 *
 * Uses `js-yaml` directly (transitive Docusaurus dep, no new install).
 * Does NOT duplicate parseAgirailsMdV4 — only extracts top-level
 * fields. Validation logic stays in the SDK.
 *
 * Markers used (per PHASE3 constraint: markers not regex):
 *   `# OWNER:ONBOARDING_START` — line ~41 of canonical AGIRAILS.md
 *   `# OWNER:ONBOARDING_END`   — closes the onboarding YAML block
 *
 * Per A2 architecture.
 */

import * as fs from 'node:fs';
import yaml from 'js-yaml';
import type { Extractor, ExtractorConfig, RawSurface } from '../types.ts';

// ============================================================
// Output shape
// ============================================================

interface AgirailsState {
  name: string;
  value: number;
  description: string;
}

interface OnboardingQuestion {
  id: string;
  ask: string;
  type: string;
  options?: string[];
  default?: string | number;
  condition?: string;
  advanced?: boolean;
}

export interface AgirailsMdSurfaceData {
  protocol: string;
  version: string;
  spec: string;
  network: string;
  currency: string;
  fee: string;
  sdk: { npm?: string; pip?: string };
  capabilities: string[];
  states: AgirailsState[];
  onboarding: {
    execution: string;
    questions: OnboardingQuestion[];
  };
  _source: {
    file: string;
    line_count: number;
    onboarding_marker_line: number;
  };
}

// ============================================================
// Parse
// ============================================================

const ONBOARDING_START = '# OWNER:ONBOARDING_START';
const ONBOARDING_END = '# OWNER:ONBOARDING_END';

interface ParsedSpec {
  protocol: string;
  version: string;
  spec: string;
  network: string;
  currency: string;
  fee: string;
  sdk?: { npm?: string; pip?: string };
  capabilities?: string[];
  states?: AgirailsState[];
}

interface ParsedOnboarding {
  onboarding?: {
    execution?: string;
    questions?: OnboardingQuestion[];
  };
}

function findMarkerLine(lines: string[], marker: string): number {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === marker) return i;
  }
  return -1;
}

function buildSurfaceData(
  filePath: string,
  raw: string,
  warnings: string[],
): AgirailsMdSurfaceData {
  const lines = raw.split('\n');
  const startIdx = findMarkerLine(lines, ONBOARDING_START);
  const endIdx = findMarkerLine(lines, ONBOARDING_END);

  if (startIdx === -1) {
    throw new Error(
      `${ONBOARDING_START} marker not found in ${filePath}; cannot reliably parse onboarding block`,
    );
  }
  if (endIdx === -1) {
    throw new Error(
      `${ONBOARDING_END} marker not found in ${filePath}; cannot reliably parse onboarding block`,
    );
  }
  if (endIdx <= startIdx) {
    throw new Error(
      `Markers out of order in ${filePath}: start at ${startIdx}, end at ${endIdx}`,
    );
  }

  // Spec frontmatter: everything BEFORE ONBOARDING_START (the canonical
  // AGIRAILS.md is a pure YAML doc; no `---` fences).
  const specYaml = lines.slice(0, startIdx).join('\n');
  // Onboarding block: between the START and END markers (inclusive of YAML).
  const onboardingYaml = lines.slice(startIdx + 1, endIdx).join('\n');

  const spec = yaml.load(specYaml) as ParsedSpec;
  if (!spec || typeof spec !== 'object') {
    throw new Error(`Failed to parse spec YAML in ${filePath}`);
  }
  if (!spec.protocol || !spec.version) {
    warnings.push('canonical AGIRAILS.md missing required top-level fields (protocol/version)');
  }

  let onboardingParsed: ParsedOnboarding;
  try {
    onboardingParsed = yaml.load(onboardingYaml) as ParsedOnboarding;
    if (!onboardingParsed || typeof onboardingParsed !== 'object') {
      onboardingParsed = {};
      warnings.push('onboarding block YAML parse returned non-object; using empty fallback');
    }
  } catch (e) {
    warnings.push(`onboarding block YAML parse failed: ${(e as Error).message}`);
    onboardingParsed = {};
  }

  // The onboarding block in canonical AGIRAILS.md is keyed under "onboarding:"
  // (per the line 41 anchor); unwrap.
  const onboarding = onboardingParsed.onboarding ?? {
    execution: 'unknown',
    questions: [],
  };

  // Strip hints from questions (v1 per A2: shape only, no hint text).
  const questions: OnboardingQuestion[] = (onboarding.questions ?? []).map((q) => ({
    id: q.id,
    ask: q.ask,
    type: q.type,
    ...(q.options !== undefined && { options: q.options }),
    ...(q.default !== undefined && { default: q.default }),
    ...(q.condition !== undefined && { condition: q.condition }),
    ...(q.advanced !== undefined && { advanced: q.advanced }),
  }));

  return {
    protocol: spec.protocol,
    version: String(spec.version),
    spec: spec.spec,
    network: spec.network,
    currency: spec.currency,
    fee: spec.fee,
    sdk: spec.sdk ?? {},
    capabilities: spec.capabilities ?? [],
    states: spec.states ?? [],
    onboarding: {
      execution: onboarding.execution ?? 'unknown',
      questions,
    },
    _source: {
      // _source.file references the CANONICAL source location on agirails.app —
      // not the local path (per memory: "no local paths in shareable docs").
      file: 'https://agirails.app/protocol/AGIRAILS.md',
      line_count: lines.length,
      onboarding_marker_line: startIdx + 1,
    },
  };
}

// ============================================================
// Public extractor
// ============================================================

export const agirailsMdV4Extractor: Extractor = {
  surface: 'agirailsmd-v4',

  async extract(config: ExtractorConfig): Promise<RawSurface> {
    const warnings: string[] = [];
    if (!fs.existsSync(config.agirailsMdPath)) {
      throw new Error(`Canonical AGIRAILS.md not found at ${config.agirailsMdPath}`);
    }
    const raw = fs.readFileSync(config.agirailsMdPath, 'utf-8');
    const data = buildSurfaceData(config.agirailsMdPath, raw, warnings);

    return {
      surface: 'agirailsmd-v4',
      extractedAt: new Date().toISOString(),
      sourceVersion: data.version,
      data,
      warnings,
    };
  },
};
