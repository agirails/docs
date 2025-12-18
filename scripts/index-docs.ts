/**
 * AGIRAILS Documentation Indexing Script
 *
 * This script indexes documentation, SDK 2.0 source code, AIPs, and contract interfaces
 * into Upstash Vector for the AI Assistant's RAG (Retrieval Augmented Generation) system.
 *
 * Indexed content:
 *   - /docs/*.mdx - Documentation (concepts, guides)
 *   - /sdk-js/src/level0/* - Basic API (provide/request)
 *   - /sdk-js/src/level1/* - Standard API (Agent class)
 *   - /sdk-js/src/ACTPClient.ts - Advanced API
 *   - /sdk-js/src/adapters/* - Beginner/Intermediate adapters
 *   - /Protocol/aips/*.md - AGIRAILS Improvement Proposals
 *   - /Protocol/actp-kernel/src/interfaces/*.sol - Contract interfaces
 *
 * Usage:
 *   npx ts-node scripts/index-docs.ts
 *
 * Required env vars:
 *   UPSTASH_VECTOR_REST_URL
 *   UPSTASH_VECTOR_REST_TOKEN
 */

import { config } from 'dotenv';
import { Index } from '@upstash/vector';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Configuration
const CONFIG = {
  // Directories to index
  docsDir: './docs',
  sdkDir: '../SDK and Runtime/sdk-js/src',
  aipsDir: '../Protocol/aips',
  contractsDir: '../Protocol/actp-kernel/src/interfaces',

  // Chunk settings
  chunkSize: 500,        // tokens (roughly 4 chars per token)
  chunkOverlap: 50,      // overlap between chunks

  // File patterns
  docPatterns: ['.md', '.mdx'],
  codePatterns: ['.ts', '.tsx'],
  solidityPatterns: ['.sol'],

  // Files/directories to skip
  skipFiles: ['node_modules', '.git', 'build', 'dist', '.docusaurus'],

  // SDK 2.0 key folders/files to index (prioritized content)
  sdkKeyPaths: [
    'level0',           // Basic API: provide(), request()
    'level1',           // Standard API: Agent class
    'adapters',         // BeginnerAdapter, IntermediateAdapter
    'ACTPClient.ts',    // Advanced API
    'index.ts',         // Main exports
  ],
};

// Upstash Vector index (initialized lazily in main)
let vectorIndex: Index;

interface ChunkMetadata {
  source: string;
  type: 'documentation' | 'code';
  title?: string;
  section?: string;
  [key: string]: string | undefined;  // Index signature for Upstash compatibility
}

interface DocumentChunk {
  id: string;
  content: string;
  metadata: ChunkMetadata;
}

/**
 * Split text into chunks with overlap
 */
function chunkText(text: string, maxChars: number = 2000, overlap: number = 200): string[] {
  const chunks: string[] = [];

  // Split by paragraphs first
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if ((currentChunk + paragraph).length > maxChars) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        // Keep overlap from the end of current chunk
        const overlapText = currentChunk.slice(-overlap);
        currentChunk = overlapText + '\n\n' + paragraph;
      } else {
        // Paragraph itself is too long, split it
        const words = paragraph.split(' ');
        let tempChunk = '';
        for (const word of words) {
          if ((tempChunk + ' ' + word).length > maxChars) {
            chunks.push(tempChunk.trim());
            tempChunk = word;
          } else {
            tempChunk += ' ' + word;
          }
        }
        currentChunk = tempChunk;
      }
    } else {
      currentChunk += '\n\n' + paragraph;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Extract title from markdown content
 */
function extractTitle(content: string, filePath: string): string {
  // Try to find h1 heading
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1];

  // Try to find frontmatter title
  const frontmatterMatch = content.match(/^---[\s\S]*?title:\s*["']?([^"'\n]+)["']?[\s\S]*?---/);
  if (frontmatterMatch) return frontmatterMatch[1];

  // Fallback to filename
  return path.basename(filePath, path.extname(filePath));
}

/**
 * Clean markdown content for indexing
 */
function cleanMarkdown(content: string): string {
  return content
    // Remove frontmatter
    .replace(/^---[\s\S]*?---\n*/m, '')
    // Remove import statements
    .replace(/^import\s+.*$/gm, '')
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove excessive whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Clean code content for indexing
 */
function cleanCode(content: string, filePath: string): string {
  const fileName = path.basename(filePath);

  // Add file context
  let cleaned = `// File: ${fileName}\n\n`;

  // Keep comments and JSDoc (they're valuable for understanding)
  // Remove import statements (they add noise)
  cleaned += content
    .replace(/^import\s+.*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned;
}

/**
 * Recursively find all files matching patterns
 */
function findFiles(dir: string, patterns: string[]): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    console.log(`Directory not found: ${dir}`);
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // Skip excluded directories
    if (CONFIG.skipFiles.includes(entry.name)) continue;

    if (entry.isDirectory()) {
      files.push(...findFiles(fullPath, patterns));
    } else if (patterns.some(p => entry.name.endsWith(p))) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Process documentation files
 */
async function processDocFiles(docsDir: string): Promise<DocumentChunk[]> {
  const chunks: DocumentChunk[] = [];
  const files = findFiles(docsDir, CONFIG.docPatterns);

  console.log(`Found ${files.length} documentation files`);

  for (const filePath of files) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const cleanedContent = cleanMarkdown(content);
      const title = extractTitle(content, filePath);

      // Get relative path for source reference
      const relativePath = path.relative(docsDir, filePath);

      const textChunks = chunkText(cleanedContent);

      for (let i = 0; i < textChunks.length; i++) {
        chunks.push({
          id: `doc-${relativePath}-${i}`.replace(/[^a-zA-Z0-9-]/g, '-'),
          content: textChunks[i],
          metadata: {
            source: relativePath,
            type: 'documentation',
            title,
            section: i === 0 ? 'intro' : `section-${i}`,
          },
        });
      }

      console.log(`  Processed: ${relativePath} (${textChunks.length} chunks)`);
    } catch (error) {
      console.error(`  Error processing ${filePath}:`, error);
    }
  }

  return chunks;
}

/**
 * Check if file is in a key SDK path (level0, level1, adapters, etc.)
 */
function isKeySDKFile(filePath: string, sdkDir: string): boolean {
  const relativePath = path.relative(sdkDir, filePath);

  // Skip test files
  if (relativePath.includes('.test.') || relativePath.includes('.spec.')) {
    return false;
  }

  // Check if file is in key paths
  return CONFIG.sdkKeyPaths.some(keyPath => {
    if (keyPath.endsWith('.ts')) {
      // Exact file match
      return relativePath === keyPath;
    }
    // Directory match
    return relativePath.startsWith(keyPath + path.sep) || relativePath.startsWith(keyPath + '/');
  });
}

/**
 * Process SDK 2.0 code files
 */
async function processCodeFiles(sdkDir: string): Promise<DocumentChunk[]> {
  const chunks: DocumentChunk[] = [];
  const files = findFiles(sdkDir, CONFIG.codePatterns);

  console.log(`Found ${files.length} code files in SDK`);

  let processedCount = 0;
  for (const filePath of files) {
    // Only process key SDK files
    if (!isKeySDKFile(filePath, sdkDir)) {
      continue;
    }

    const fileName = path.basename(filePath);

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const cleanedContent = cleanCode(content, filePath);

      // Get relative path for source reference
      const relativePath = path.relative(sdkDir, filePath);

      // Determine API level for better context
      let apiLevel = 'sdk';
      if (relativePath.startsWith('level0')) apiLevel = 'sdk/level0-basic';
      else if (relativePath.startsWith('level1')) apiLevel = 'sdk/level1-standard';
      else if (relativePath.startsWith('adapters')) apiLevel = 'sdk/adapters';
      else if (fileName === 'ACTPClient.ts') apiLevel = 'sdk/level2-advanced';

      // Use smaller chunks for code
      const textChunks = chunkText(cleanedContent, 1500, 100);

      for (let i = 0; i < textChunks.length; i++) {
        chunks.push({
          id: `code-${relativePath}-${i}`.replace(/[^a-zA-Z0-9-]/g, '-'),
          content: textChunks[i],
          metadata: {
            source: `${apiLevel}/${relativePath}`,
            type: 'code',
            title: fileName,
          },
        });
      }

      processedCount++;
      console.log(`  Processed: ${relativePath} (${textChunks.length} chunks)`);
    } catch (error) {
      console.error(`  Error processing ${filePath}:`, error);
    }
  }

  console.log(`  Total SDK files processed: ${processedCount}`);
  return chunks;
}

/**
 * Process AIP (AGIRAILS Improvement Proposals) files
 */
async function processAIPFiles(aipsDir: string): Promise<DocumentChunk[]> {
  const chunks: DocumentChunk[] = [];
  const files = findFiles(aipsDir, CONFIG.docPatterns);

  console.log(`Found ${files.length} AIP files`);

  for (const filePath of files) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const cleanedContent = cleanMarkdown(content);
      const title = extractTitle(content, filePath);

      const relativePath = path.relative(aipsDir, filePath);
      const textChunks = chunkText(cleanedContent);

      for (let i = 0; i < textChunks.length; i++) {
        chunks.push({
          id: `aip-${relativePath}-${i}`.replace(/[^a-zA-Z0-9-]/g, '-'),
          content: textChunks[i],
          metadata: {
            source: `aips/${relativePath}`,
            type: 'documentation',
            title: `AIP: ${title}`,
            section: i === 0 ? 'intro' : `section-${i}`,
          },
        });
      }

      console.log(`  Processed: ${relativePath} (${textChunks.length} chunks)`);
    } catch (error) {
      console.error(`  Error processing ${filePath}:`, error);
    }
  }

  return chunks;
}

/**
 * Clean Solidity code for indexing
 */
function cleanSolidity(content: string, filePath: string): string {
  const fileName = path.basename(filePath);

  let cleaned = `// Solidity Interface: ${fileName}\n\n`;

  // Keep the contract/interface with comments (NatSpec is valuable)
  cleaned += content
    // Remove license identifier
    .replace(/\/\/\s*SPDX-License-Identifier:.*$/gm, '')
    // Remove pragma statements
    .replace(/^pragma\s+.*$/gm, '')
    // Remove import statements
    .replace(/^import\s+.*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned;
}

/**
 * Process Solidity interface files
 */
async function processContractFiles(contractsDir: string): Promise<DocumentChunk[]> {
  const chunks: DocumentChunk[] = [];
  const files = findFiles(contractsDir, CONFIG.solidityPatterns);

  console.log(`Found ${files.length} Solidity interface files`);

  for (const filePath of files) {
    const fileName = path.basename(filePath);

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const cleanedContent = cleanSolidity(content, filePath);

      const relativePath = path.relative(contractsDir, filePath);

      // Solidity interfaces are usually small, use one chunk
      const textChunks = chunkText(cleanedContent, 2000, 100);

      for (let i = 0; i < textChunks.length; i++) {
        chunks.push({
          id: `sol-${relativePath}-${i}`.replace(/[^a-zA-Z0-9-]/g, '-'),
          content: textChunks[i],
          metadata: {
            source: `contracts/interfaces/${relativePath}`,
            type: 'code',
            title: fileName,
          },
        });
      }

      console.log(`  Processed: ${relativePath} (${textChunks.length} chunks)`);
    } catch (error) {
      console.error(`  Error processing ${filePath}:`, error);
    }
  }

  return chunks;
}

/**
 * Upload chunks to Upstash Vector
 */
async function uploadChunks(chunks: DocumentChunk[]): Promise<void> {
  console.log(`\nUploading ${chunks.length} chunks to Upstash Vector...`);

  // Upstash Vector has a limit of 1000 vectors per upsert
  const batchSize = 100;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);

    try {
      await vectorIndex.upsert(
        batch.map(chunk => ({
          id: chunk.id,
          data: chunk.content,  // Upstash auto-embeds this
          metadata: chunk.metadata,
        }))
      );

      console.log(`  Uploaded batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`);
    } catch (error) {
      console.error(`  Error uploading batch:`, error);
      throw error;
    }
  }
}

/**
 * Main indexing function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('AGIRAILS Documentation Indexer v2.0');
  console.log('='.repeat(60));
  console.log('\nIndexing:');
  console.log('  - Documentation (concepts, guides)');
  console.log('  - SDK 2.0 (Level 0, Level 1, Level 2, Adapters)');
  console.log('  - AIPs (AGIRAILS Improvement Proposals)');
  console.log('  - Contract Interfaces (Solidity)');

  // Validate environment variables
  if (!process.env.UPSTASH_VECTOR_REST_URL || !process.env.UPSTASH_VECTOR_REST_TOKEN) {
    console.error('\nError: Missing required environment variables!');
    console.error('Please set UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN');
    console.error('\nYou can create a free Upstash Vector database at: https://console.upstash.com');
    process.exit(1);
  }

  // Initialize Upstash Vector client
  vectorIndex = new Index({
    url: process.env.UPSTASH_VECTOR_REST_URL,
    token: process.env.UPSTASH_VECTOR_REST_TOKEN,
  });

  const allChunks: DocumentChunk[] = [];

  // Process documentation
  console.log('\n1. Processing documentation files...');
  const docChunks = await processDocFiles(CONFIG.docsDir);
  allChunks.push(...docChunks);

  // Process SDK 2.0 code
  console.log('\n2. Processing SDK 2.0 code files...');
  const codeChunks = await processCodeFiles(CONFIG.sdkDir);
  allChunks.push(...codeChunks);

  // Process AIPs
  console.log('\n3. Processing AIP files...');
  const aipChunks = await processAIPFiles(CONFIG.aipsDir);
  allChunks.push(...aipChunks);

  // Process Solidity interfaces
  console.log('\n4. Processing Solidity interface files...');
  const solChunks = await processContractFiles(CONFIG.contractsDir);
  allChunks.push(...solChunks);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Summary:');
  console.log(`  Documentation chunks: ${docChunks.length}`);
  console.log(`  SDK 2.0 code chunks:  ${codeChunks.length}`);
  console.log(`  AIP chunks:           ${aipChunks.length}`);
  console.log(`  Solidity chunks:      ${solChunks.length}`);
  console.log(`  ${'─'.repeat(28)}`);
  console.log(`  Total chunks:         ${allChunks.length}`);

  // Upload to Upstash
  console.log('\n5. Uploading to Upstash Vector...');
  await uploadChunks(allChunks);

  console.log('\n' + '='.repeat(60));
  console.log('Indexing complete!');
  console.log('='.repeat(60));
}

// Run the script
main().catch(console.error);
