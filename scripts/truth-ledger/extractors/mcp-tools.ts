/**
 * MCP server tool registry extractor.
 *
 * Reads `Platform/agirails-mcp-server/src/index.ts` and extracts the
 * 20-tool TOOLS array. Each tool has: name, description, layer attribution
 * (Layer 1: Discovery / Layer 2: Runtime / Layer 3: Protocol Bootstrap),
 * and annotation hints (readOnlyHint / destructiveHint).
 *
 * Layer attribution comes from `// ── Layer N: ...` comments that
 * precede each tool group in the source. Per PHASE3 constraint
 * (markers, not regex against arbitrary YAML/code structure).
 *
 * Per A2 architecture. Avoid pulling @modelcontextprotocol/sdk + zod +
 * ethers as build-time deps; we read the source as text and extract
 * the array literal.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Extractor, ExtractorConfig, RawSurface } from '../types.ts';

// ============================================================
// Output shape
// ============================================================

interface McpTool {
  name: string;
  description: string;
  layer: 1 | 2 | 3;
  read_only: boolean;
  destructive: boolean;
}

export interface McpToolsSurfaceData {
  package_version: string;
  total: number;
  expected_total: 20;
  layers: {
    discovery: McpTool[];
    runtime: McpTool[];
    protocol: McpTool[];
  };
  /** Set if extracted count !== 20 — a self-documenting drift signal. */
  _extraction_warning?: true;
}

// ============================================================
// Parse
// ============================================================

const SOURCE_REL = 'src/index.ts';

interface RawToolBlock {
  layer: 1 | 2 | 3;
  body: string;
}

/**
 * Scan the file for `const TOOLS = [` block and yield each tool object
 * literal with its layer attribution. Uses balanced-bracket counting to
 * find the array close — NOT regex-against-full-file.
 */
function extractToolBlocks(src: string): RawToolBlock[] {
  const startMatch = src.match(/const\s+TOOLS\s*=\s*\[/);
  if (!startMatch) {
    throw new Error('Could not locate `const TOOLS = [` in MCP server source');
  }
  const openIdx = (startMatch.index ?? 0) + startMatch[0].length - 1;
  // Find matching ] for the outer array.
  let depth = 0;
  let closeIdx = -1;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) {
        closeIdx = i;
        break;
      }
    }
  }
  if (closeIdx === -1) {
    throw new Error('Unbalanced [ ] in TOOLS array');
  }
  const arrayBody = src.slice(openIdx + 1, closeIdx);

  // Walk the array, tracking current layer via `// ── Layer N:` comments.
  // Strategy: between successive tool blocks, scan the inter-block region
  // for ANY layer marker (not anchored to line start, since the previous
  // tool's `}` + `,\n` precede the marker).
  const blocks: RawToolBlock[] = [];
  let currentLayer: 1 | 2 | 3 = 1;
  let i = 0;
  const layerMarkerRegex = /\/\/\s*[─\-]+\s*Layer\s+(\d):/g;
  while (i < arrayBody.length) {
    // Detect tool object literal — find next `{`.
    const next = arrayBody.indexOf('{', i);
    if (next === -1) break;
    // Inter-block region from i..next may contain a layer marker.
    const interBlock = arrayBody.slice(i, next);
    layerMarkerRegex.lastIndex = 0;
    let lm: RegExpExecArray | null;
    let lastLayer: 1 | 2 | 3 | null = null;
    while ((lm = layerMarkerRegex.exec(interBlock)) !== null) {
      lastLayer = Number(lm[1]) as 1 | 2 | 3;
    }
    if (lastLayer !== null) currentLayer = lastLayer;

    // Match braces to find object close.
    let d = 0;
    let endIdx = -1;
    for (let j = next; j < arrayBody.length; j++) {
      const c = arrayBody[j];
      if (c === '{') d++;
      else if (c === '}') {
        d--;
        if (d === 0) {
          endIdx = j;
          break;
        }
      }
    }
    if (endIdx === -1) break;
    blocks.push({ layer: currentLayer, body: arrayBody.slice(next, endIdx + 1) });
    i = endIdx + 1;
  }
  return blocks;
}

function parseToolBlock(body: string, layer: 1 | 2 | 3): McpTool | null {
  const nameMatch = body.match(/name\s*:\s*['"]([^'"]+)['"]/);
  if (!nameMatch) return null;
  const name = nameMatch[1];

  // Description may span multiple lines (template literal / regular string).
  const descMatch =
    body.match(/description\s*:\s*['"]([^'"]+(?:\\.[^'"]*)*)['"]/) ??
    body.match(/description\s*:\s*`([\s\S]+?)`/);
  const description = descMatch ? descMatch[1].trim().replace(/\s+/g, ' ') : '';

  // Annotations: { readOnlyHint: true | destructiveHint: true }
  const annotationsMatch = body.match(/annotations\s*:\s*\{([\s\S]*?)\}/);
  let read_only = false;
  let destructive = false;
  if (annotationsMatch) {
    const ann = annotationsMatch[1];
    if (/readOnlyHint\s*:\s*true/.test(ann)) read_only = true;
    if (/destructiveHint\s*:\s*true/.test(ann)) destructive = true;
  }

  return { name, description, layer, read_only, destructive };
}

function readMcpPackageVersion(config: ExtractorConfig): string {
  const pkgPath = path.join(config.mcpServerRoot, 'package.json');
  if (!fs.existsSync(pkgPath)) return 'unknown';
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return pkg.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

// ============================================================
// Public extractor
// ============================================================

export const mcpToolsExtractor: Extractor = {
  surface: 'mcp-tools',

  async extract(config: ExtractorConfig): Promise<RawSurface> {
    const warnings: string[] = [];
    const srcPath = path.join(config.mcpServerRoot, SOURCE_REL);
    if (!fs.existsSync(srcPath)) {
      throw new Error(`MCP server source not found: ${srcPath}`);
    }
    const src = fs.readFileSync(srcPath, 'utf-8');

    const blocks = extractToolBlocks(src);
    const tools: McpTool[] = [];
    for (const b of blocks) {
      const tool = parseToolBlock(b.body, b.layer);
      if (tool) tools.push(tool);
      else warnings.push(`Failed to parse a tool block (layer ${b.layer})`);
    }

    const data: McpToolsSurfaceData = {
      package_version: readMcpPackageVersion(config),
      total: tools.length,
      expected_total: 20,
      layers: {
        discovery: tools.filter((t) => t.layer === 1),
        runtime: tools.filter((t) => t.layer === 2),
        protocol: tools.filter((t) => t.layer === 3),
      },
    };

    if (tools.length !== 20) {
      warnings.push(
        `MCP tool count is ${tools.length}, expected 20 — registry drifted; update extractor or registry`,
      );
      data._extraction_warning = true;
    }

    return {
      surface: 'mcp-tools',
      extractedAt: new Date().toISOString(),
      sourceVersion: data.package_version,
      data,
      warnings,
    };
  },
};
