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

interface McpToolParam {
  name: string;
  /** Zod type literal: 'string', 'number', 'boolean', 'enum', or the
   * name of a referenced schema (e.g. 'NetworkSchema'). */
  type: string;
  required: boolean;
  description?: string;
  /** Enum allowed values if the type resolves to an enum. */
  enum_values?: string[];
}

interface McpTool {
  name: string;
  description: string;
  layer: 1 | 2 | 3;
  read_only: boolean;
  destructive: boolean;
  /** Input schema name (e.g. 'REQUEST_SERVICE_SCHEMA') resolved against
   * the index.ts `inputSchema: zodToJsonSchema(X_SCHEMA)` reference. */
  input_schema?: string;
  /** Per-field input parameters parsed from the Zod schema declaration
   * in the schema source file. Empty array means the tool takes no
   * params; absent means we could not resolve the schema. */
  params?: McpToolParam[];
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

  // inputSchema: zodToJsonSchema(X_SCHEMA) — capture X_SCHEMA name.
  const schemaMatch = body.match(/inputSchema\s*:\s*zodToJsonSchema\(\s*(\w+_SCHEMA)\s*\)/);
  const input_schema = schemaMatch ? schemaMatch[1] : undefined;

  return { name, description, layer, read_only, destructive, input_schema };
}

// ============================================================
// Schema source parsing
// ============================================================

const SCHEMA_SOURCE_RELS = [
  'src/tools/layer1-discovery.ts',
  'src/tools/layer2-runtime.ts',
] as const;

/**
 * Parse `export const X_SCHEMA = z.object({ ... })` declarations from a
 * schema source file. Returns a map from schema name to the body between
 * the `z.object({` and matching `})`.
 */
function parseSchemaBodies(src: string): Map<string, string> {
  const out = new Map<string, string>();
  // Match `export const X_SCHEMA = z.object({` and capture the body up
  // to the matching `})`. Balanced-brace counting.
  const headerRegex = /export\s+const\s+(\w+_SCHEMA)\s*=\s*z\.object\(\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = headerRegex.exec(src)) !== null) {
    const schemaName = m[1];
    const objStart = m.index + m[0].length - 1; // position of `{`
    let depth = 0;
    let closeIdx = -1;
    for (let i = objStart; i < src.length; i++) {
      const c = src[i];
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          closeIdx = i;
          break;
        }
      }
    }
    if (closeIdx === -1) continue;
    out.set(schemaName, src.slice(objStart + 1, closeIdx));
  }
  return out;
}

/**
 * Parse the body of a `z.object({...})` into a list of per-field params.
 * Handles common Zod forms: z.string/z.number/z.boolean/z.enum, references
 * to other schemas (e.g. NetworkSchema), and the .optional() + .describe()
 * modifiers.
 */
function parseSchemaParams(body: string): McpToolParam[] {
  const params: McpToolParam[] = [];
  // Split into logical fields. Each field starts with `name:` at the
  // line-start (modulo whitespace) and ends at the next field or close.
  // We walk character-by-character with balanced parens for description
  // strings, since `.describe('...')` may contain commas.
  let i = 0;
  while (i < body.length) {
    // Skip whitespace/commas.
    while (i < body.length && /[\s,]/.test(body[i])) i++;
    if (i >= body.length) break;
    // Skip line comments.
    if (body[i] === '/' && body[i + 1] === '/') {
      const nl = body.indexOf('\n', i);
      i = nl === -1 ? body.length : nl + 1;
      continue;
    }
    // Skip block comments.
    if (body[i] === '/' && body[i + 1] === '*') {
      const close = body.indexOf('*/', i + 2);
      i = close === -1 ? body.length : close + 2;
      continue;
    }
    // Capture field name up to ':'.
    const colonIdx = body.indexOf(':', i);
    if (colonIdx === -1) break;
    const fieldName = body.slice(i, colonIdx).trim();
    if (!/^[A-Za-z_$][\w$]*$/.test(fieldName)) {
      // Defensive: skip junk.
      i = colonIdx + 1;
      continue;
    }
    // Read the field value: balanced parens, terminated by a top-level
    // comma followed by a newline-ish or end of body.
    let j = colonIdx + 1;
    let pdepth = 0;
    let bdepth = 0;
    let inStr: string | null = null;
    while (j < body.length) {
      const c = body[j];
      if (inStr) {
        if (c === '\\') {
          j += 2;
          continue;
        }
        if (c === inStr) inStr = null;
        j++;
        continue;
      }
      if (c === "'" || c === '"' || c === '`') {
        inStr = c;
        j++;
        continue;
      }
      if (c === '(') pdepth++;
      else if (c === ')') pdepth--;
      else if (c === '[') bdepth++;
      else if (c === ']') bdepth--;
      else if (c === ',' && pdepth === 0 && bdepth === 0) {
        break;
      }
      j++;
    }
    const valueText = body.slice(colonIdx + 1, j).trim();
    params.push(parseFieldValue(fieldName, valueText));
    i = j + 1;
  }
  return params;
}

/**
 * Find the text inside a `.describe(...)` call, matching the opening
 * quote with its same-character close. The naive regex form breaks when
 * the description body contains the other quote variant or escaped
 * characters; this walks the string manually.
 */
function extractDescribeText(value: string): string | undefined {
  const idx = value.indexOf('.describe(');
  if (idx === -1) return undefined;
  let i = idx + '.describe('.length;
  while (i < value.length && /\s/.test(value[i])) i++;
  const quote = value[i];
  if (quote !== "'" && quote !== '"' && quote !== '`') return undefined;
  i++;
  let out = '';
  while (i < value.length) {
    const c = value[i];
    if (c === '\\') {
      out += value[i + 1] ?? '';
      i += 2;
      continue;
    }
    if (c === quote) return out.replace(/\s+/g, ' ').trim();
    out += c;
    i++;
  }
  return undefined;
}

function parseFieldValue(name: string, value: string): McpToolParam {
  const optional = /\.optional\(\)/.test(value);
  const description = extractDescribeText(value);

  let type = 'unknown';
  let enum_values: string[] | undefined;
  if (/^z\.string\b/.test(value)) type = 'string';
  else if (/^z\.number\b/.test(value)) type = 'number';
  else if (/^z\.boolean\b/.test(value)) type = 'boolean';
  else if (/^z\.array\b/.test(value)) type = 'array';
  else if (/^z\.enum\b/.test(value)) {
    type = 'enum';
    const em = value.match(/z\.enum\(\s*\[(.*?)\]\s*\)/);
    if (em) {
      enum_values = [...em[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
    }
  } else {
    // Reference to another schema (e.g. NetworkSchema, AgentSlugSchema, TxIdSchema).
    const refMatch = value.match(/^(\w+)\b/);
    if (refMatch) type = refMatch[1];
  }

  return {
    name,
    type,
    required: !optional,
    ...(description ? { description } : {}),
    ...(enum_values ? { enum_values } : {}),
  };
}

/**
 * Inline the shared schemas (NetworkSchema, AgentSlugSchema, TxIdSchema)
 * by replacing their reference type with the underlying Zod literal.
 * If we can resolve, we replace `type` with the concrete primitive.
 */
function resolveSchemaReferences(
  params: McpToolParam[],
  refMap: Map<string, { type: string; enum_values?: string[] }>,
): McpToolParam[] {
  return params.map((p) => {
    const ref = refMap.get(p.type);
    if (!ref) return p;
    return {
      ...p,
      type: ref.type,
      ...(ref.enum_values ? { enum_values: ref.enum_values } : {}),
    };
  });
}

/**
 * Parse shared schema declarations like `const NetworkSchema = z.enum(['a','b']).default('a')`.
 * These appear at module scope in the schema source files. Tolerates the
 * `z\n  .string()` multiline-chain form by allowing whitespace around the dot.
 */
function parseSharedSchemas(src: string): Map<string, { type: string; enum_values?: string[] }> {
  const out = new Map<string, { type: string; enum_values?: string[] }>();
  const regex = /const\s+(\w+Schema)\s*=\s*z\s*\.\s*(\w+)\(([\s\S]*?)\)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(src)) !== null) {
    const name = m[1];
    const zType = m[2];
    const args = m[3];
    if (out.has(name)) continue;
    if (zType === 'enum') {
      const vals = [...args.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
      out.set(name, { type: 'enum', enum_values: vals });
    } else {
      out.set(name, { type: zType });
    }
  }
  return out;
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

    // Build the schema registry from layer1 + layer2 source files.
    const schemaBodies = new Map<string, string>();
    const sharedSchemas = new Map<string, { type: string; enum_values?: string[] }>();
    for (const rel of SCHEMA_SOURCE_RELS) {
      const filePath = path.join(config.mcpServerRoot, rel);
      if (!fs.existsSync(filePath)) {
        warnings.push(`MCP schema source missing: ${rel}`);
        continue;
      }
      const schemaSrc = fs.readFileSync(filePath, 'utf-8');
      const localShared = parseSharedSchemas(schemaSrc);
      for (const [k, v] of localShared) sharedSchemas.set(k, v);
      const localBodies = parseSchemaBodies(schemaSrc);
      for (const [k, v] of localBodies) schemaBodies.set(k, v);
    }

    // Resolve each tool's params from its referenced schema.
    for (const tool of tools) {
      if (!tool.input_schema) {
        tool.params = [];
        continue;
      }
      const body = schemaBodies.get(tool.input_schema);
      if (!body) {
        warnings.push(`Tool ${tool.name} references ${tool.input_schema} but schema body was not found`);
        continue;
      }
      const raw = parseSchemaParams(body);
      tool.params = resolveSchemaReferences(raw, sharedSchemas);
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
