#!/usr/bin/env tsx
/**
 * Generates /static/llms-full.txt from all docs markdown files.
 * Run: npx tsx scripts/generate-llms-full.ts
 * Wired into: npm run build (via pre-build hook)
 *
 * Strips MDX components, frontmatter, and HTML tags.
 * Concatenates all docs into a single plain-text file for LLM consumption.
 */

import * as fs from 'fs';
import * as path from 'path';

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const OUTPUT_FILE = path.join(__dirname, '..', 'static', 'llms-full.txt');
const LLMS_TXT = path.join(__dirname, '..', 'static', 'llms.txt');

// Sidebar order — controls the output sequence
const ORDERED_FILES = [
  'index.md',
  'installation.md',
  'quick-start.md',
  'agent-integration.md',
  'concepts/index.md',
  'concepts/actp-protocol.md',
  'concepts/transaction-lifecycle.md',
  'concepts/escrow-mechanism.md',
  'concepts/agent-identity.md',
  'concepts/fee-model.md',
  'sdk-reference/index.md',
  'sdk-reference/basic-api.md',
  'sdk-reference/standard-api.md',
  'sdk-reference/advanced-api/index.md',
  'sdk-reference/advanced-api/kernel.md',
  'sdk-reference/advanced-api/escrow.md',
  'sdk-reference/advanced-api/events.md',
  'sdk-reference/advanced-api/eas.md',
  'sdk-reference/advanced-api/quote.md',
  'sdk-reference/advanced-api/proof-generator.md',
  'sdk-reference/advanced-api/message-signer.md',
  'sdk-reference/registry.md',
  'sdk-reference/utilities.md',
  'sdk-reference/errors.md',
  'cli-reference.md',
  'examples/index.md',
  'contract-reference.md',
  'error-reference.md',
  'developer-responsibilities.md',
];

function stripFrontmatter(content: string): string {
  const match = content.match(/^---\n[\s\S]*?\n---\n/);
  return match ? content.slice(match[0].length) : content;
}

function stripMdxComponents(content: string): string {
  // Remove import statements
  content = content.replace(/^import\s+.*$/gm, '');

  // Remove JSX/MDX tags like <Tabs>, <TabItem>, <div>, etc.
  content = content.replace(/<\/?[A-Z][a-zA-Z]*[^>]*>/g, '');
  content = content.replace(/<\/?[a-z]+[^>]*>/g, '');

  // Remove Docusaurus admonitions — keep content, strip markers
  content = content.replace(/^:::(\w+)(?:\s+.*)?$/gm, '[$1]');
  content = content.replace(/^:::$/gm, '');

  // Remove HTML comments
  content = content.replace(/<!--[\s\S]*?-->/g, '');

  // Remove style attributes
  content = content.replace(/\s*style=\{\{[^}]*\}\}/g, '');

  // Collapse multiple blank lines
  content = content.replace(/\n{4,}/g, '\n\n\n');

  return content.trim();
}

function processFile(relativePath: string): string | null {
  const fullPath = path.join(DOCS_DIR, relativePath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`  [skip] ${relativePath} — file not found`);
    return null;
  }

  const raw = fs.readFileSync(fullPath, 'utf-8');
  const content = stripMdxComponents(stripFrontmatter(raw));

  // Extract title from frontmatter or first heading
  const titleMatch = raw.match(/^title:\s*['"]?(.+?)['"]?\s*$/m)
    || content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : relativePath;

  return `${'='.repeat(60)}\n${title}\n${'='.repeat(60)}\n\n${content}`;
}

function main() {
  console.log('Generating llms-full.txt...');

  // Read llms.txt header
  let header = '';
  if (fs.existsSync(LLMS_TXT)) {
    header = fs.readFileSync(LLMS_TXT, 'utf-8');
  }

  const sections: string[] = [];

  // Header section
  sections.push(`AGIRAILS — Complete Documentation for LLMs
Generated: ${new Date().toISOString().split('T')[0]}
Short version: https://docs.agirails.io/llms.txt
Website: https://docs.agirails.io

This file contains the full AGIRAILS documentation in plain text.
Contract addresses are auto-configured by the SDK. Do not hardcode.
`);

  // Process each file in order
  let processed = 0;
  for (const file of ORDERED_FILES) {
    const section = processFile(file);
    if (section) {
      sections.push(section);
      processed++;
    }
  }

  // Also pick up any files not in the ordered list (cookbook, guides, etc.)
  const allFiles = getAllMarkdownFiles(DOCS_DIR);
  const orderedSet = new Set(ORDERED_FILES);
  const extras = allFiles.filter(f => !orderedSet.has(f));

  if (extras.length > 0) {
    sections.push(`\n${'='.repeat(60)}\nAdditional Documentation\n${'='.repeat(60)}\n`);
    for (const file of extras) {
      const section = processFile(file);
      if (section) {
        sections.push(section);
        processed++;
      }
    }
  }

  const output = sections.join('\n\n');
  fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');

  const wordCount = output.split(/\s+/).length;
  console.log(`  ${processed} files processed`);
  console.log(`  ${wordCount} words`);
  console.log(`  Written to: ${OUTPUT_FILE}`);
}

function getAllMarkdownFiles(dir: string, prefix = ''): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'img') continue;
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...getAllMarkdownFiles(path.join(dir, entry.name), relativePath));
    } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
      files.push(relativePath);
    }
  }
  return files;
}

main();
