/* ============================================
   AGIRAILS Canvas - Worker Thread Sandbox (Phase E)
   ============================================

   Runs in Web Worker context. Executes agent code via QuickJS
   and returns operations for main thread to apply.

   Worker responsibilities:
   - Execute QuickJS in isolated context
   - Inject ctx API that queues operations (not direct state mutations)
   - Return { logs, ops, finalState, idCounter }
   - Enforce hard timeout via Worker termination mechanism
   ============================================ */

import { getQuickJS, QuickJSContext, isFail, isSuccess } from 'quickjs-emscripten';
import type {
  WorkerRequest,
  WorkerResponse,
  WorkerExecuteRequest,
  WorkerOp,
  WorkerLog,
} from './protocol';
import type { TransactionState } from '../types';

// ============================================
// Worker State
// ============================================

let quickjsPromise: ReturnType<typeof getQuickJS> | null = null;
let limits = {
  maxExecutionTimeMs: 5000,
  maxMemoryBytes: 10485760, // 10MB
  maxStackSizeBytes: 1024 * 1024, // 1MB
};

// ============================================
// Message Handler
// ============================================

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  try {
    switch (request.type) {
      case 'INIT':
        limits = request.limits;
        // Pre-load QuickJS module (caching)
        quickjsPromise = getQuickJS();
        await quickjsPromise;
        postResponse({ type: 'READY' });
        break;

      case 'EXECUTE':
        await handleExecute(request);
        break;

      case 'RESET':
        // Clear cached QuickJS instance (if needed for memory cleanup)
        quickjsPromise = null;
        postResponse({ type: 'READY' });
        break;

      default:
        postResponse({
          type: 'FATAL',
          message: `Unknown request type: ${(request as any).type}`,
        });
    }
  } catch (error) {
    postResponse({
      type: 'FATAL',
      message: `Worker error: ${String(error)}`,
    });
  }
};

function postResponse(response: WorkerResponse): void {
  self.postMessage(response);
}

// ============================================
// Static Analysis - Detect undefined variables
// ============================================

/**
 * Known globals that are always available in agent code
 */
const KNOWN_GLOBALS = new Set([
  // Our API
  'ctx',
  // JavaScript builtins
  'undefined', 'null', 'true', 'false', 'NaN', 'Infinity',
  'Object', 'Array', 'String', 'Number', 'Boolean', 'Function',
  'Symbol', 'BigInt', 'Math', 'Date', 'RegExp', 'Error',
  'TypeError', 'ReferenceError', 'SyntaxError', 'RangeError',
  'JSON', 'parseInt', 'parseFloat', 'isNaN', 'isFinite',
  'encodeURI', 'decodeURI', 'encodeURIComponent', 'decodeURIComponent',
  'console', 'Promise', 'Map', 'Set', 'WeakMap', 'WeakSet',
  'Proxy', 'Reflect', 'ArrayBuffer', 'DataView',
  'Int8Array', 'Uint8Array', 'Int16Array', 'Uint16Array',
  'Int32Array', 'Uint32Array', 'Float32Array', 'Float64Array',
]);

/**
 * JavaScript keywords that aren't identifiers
 */
const JS_KEYWORDS = new Set([
  'break', 'case', 'catch', 'continue', 'debugger', 'default', 'delete',
  'do', 'else', 'finally', 'for', 'function', 'if', 'in', 'instanceof',
  'new', 'return', 'switch', 'this', 'throw', 'try', 'typeof', 'var',
  'void', 'while', 'with', 'class', 'const', 'enum', 'export', 'extends',
  'import', 'super', 'implements', 'interface', 'let', 'package', 'private',
  'protected', 'public', 'static', 'yield', 'await', 'async', 'of',
]);

/**
 * Extract declared variable names from code (var, let, const, function)
 */
function extractDeclaredVariables(code: string): Set<string> {
  const declared = new Set<string>();

  // Match var/let/const declarations
  const varPattern = /\b(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  let match;
  while ((match = varPattern.exec(code)) !== null) {
    declared.add(match[1]);
  }

  // Match function declarations
  const funcPattern = /\bfunction\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  while ((match = funcPattern.exec(code)) !== null) {
    declared.add(match[1]);
  }

  // Match function parameters (basic - inside parentheses after function keyword)
  const paramPattern = /\bfunction\s*[a-zA-Z_$]*\s*\(([^)]*)\)/g;
  while ((match = paramPattern.exec(code)) !== null) {
    const params = match[1].split(',').map(p => p.trim().split('=')[0].trim());
    params.forEach(p => {
      if (p && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(p)) {
        declared.add(p);
      }
    });
  }

  // Match arrow function parameters
  const arrowPattern = /\(([^)]*)\)\s*=>/g;
  while ((match = arrowPattern.exec(code)) !== null) {
    const params = match[1].split(',').map(p => p.trim().split('=')[0].trim());
    params.forEach(p => {
      if (p && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(p)) {
        declared.add(p);
      }
    });
  }

  // Match for...in/of loop variables
  const forPattern = /\bfor\s*\(\s*(?:var|let|const)?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s+(?:in|of)/g;
  while ((match = forPattern.exec(code)) !== null) {
    declared.add(match[1]);
  }

  return declared;
}

/**
 * Extract all identifier usages from code
 */
function extractIdentifierUsages(code: string): Array<{ name: string; line: number }> {
  const usages: Array<{ name: string; line: number }> = [];

  // Remove strings and comments to avoid false positives
  const cleanCode = code
    .replace(/\/\*[\s\S]*?\*\//g, ' ') // Remove block comments
    .replace(/\/\/.*$/gm, ' ')          // Remove line comments
    .replace(/"(?:[^"\\]|\\.)*"/g, '""') // Remove double-quoted strings
    .replace(/'(?:[^'\\]|\\.)*'/g, "''") // Remove single-quoted strings
    .replace(/`(?:[^`\\]|\\.)*`/g, '``'); // Remove template literals

  // Find all identifiers (words that could be variable names)
  const lines = cleanCode.split('\n');
  const identPattern = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;

  lines.forEach((line, lineIndex) => {
    let match;
    while ((match = identPattern.exec(line)) !== null) {
      const name = match[1];
      // Skip if it's a keyword
      if (JS_KEYWORDS.has(name)) continue;
      // Skip if it's a property access (preceded by .)
      const beforeMatch = line.substring(0, match.index);
      if (beforeMatch.endsWith('.')) continue;
      // Skip if it's a method definition
      if (line.substring(match.index + name.length).match(/^\s*\(/)) {
        // Check if this is a function call or definition
        // If preceded by 'function' keyword, skip
        if (beforeMatch.match(/\bfunction\s*$/)) continue;
      }

      usages.push({ name, line: lineIndex + 1 });
    }
  });

  return usages;
}

/**
 * Known properties on transaction objects (tx)
 * Used to detect typos like tx.stavvte instead of tx.state
 */
const KNOWN_TX_PROPERTIES = new Set([
  'id', 'sourceId', 'targetId', 'state', 'amountMicro', 'service',
  // Allow common JS object methods
  'toString', 'valueOf', 'hasOwnProperty',
]);

/**
 * Validate code for undefined variables and property typos
 * Returns array of validation errors
 */
function validateCode(code: string): Array<{ message: string; line: number; type: 'error' | 'warning' }> {
  const errors: Array<{ message: string; line: number; type: 'error' | 'warning' }> = [];

  try {
    const declared = extractDeclaredVariables(code);
    const usages = extractIdentifierUsages(code);

    // Check each usage - these are warnings (not errors) since regex detection isn't 100% reliable
    for (const usage of usages) {
      if (!KNOWN_GLOBALS.has(usage.name) && !declared.has(usage.name)) {
        // Check if it might be a property (we can't fully detect this with regex)
        // Only report if it looks like a standalone identifier
        errors.push({
          message: `'${usage.name}' is not defined`,
          line: usage.line,
          type: 'warning',
        });
      }
    }

    // Check for property access typos on transaction objects
    // Pattern: tx.propertyName or variableName.propertyName where variable could be a tx
    const lines = code.split('\n');
    lines.forEach((line, lineIndex) => {
      // Match patterns like: tx.something, transaction.something
      // Also match patterns inside forEach callbacks: (tx) => tx.something
      const txPropertyPattern = /\btx\.(\w+)/g;
      let match;
      while ((match = txPropertyPattern.exec(line)) !== null) {
        const propName = match[1];
        if (!KNOWN_TX_PROPERTIES.has(propName)) {
          // Find similar property (for better error message)
          const similar = findSimilarProperty(propName, KNOWN_TX_PROPERTIES);
          const suggestion = similar ? ` Did you mean '${similar}'?` : '';
          errors.push({
            message: `Unknown transaction property 'tx.${propName}'.${suggestion} Valid properties: ${Array.from(KNOWN_TX_PROPERTIES).slice(0, 6).join(', ')}`,
            line: lineIndex + 1,
            type: 'error',
          });
        }
      }
    });
  } catch (e) {
    // If validation fails, don't block execution
    // The runtime will catch actual errors
  }

  return errors;
}

function stripStringsAndComments(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, ' ') // block comments
    .replace(/\/\/.*$/gm, ' ') // line comments
    .replace(/"(?:[^"\\]|\\.)*"/g, '""') // double-quoted strings
    .replace(/'(?:[^'\\]|\\.)*'/g, "''") // single-quoted strings
    .replace(/`(?:[^`\\]|\\.)*`/g, '``'); // template literals
}

/**
 * Find similar property name using Levenshtein distance
 */
function findSimilarProperty(input: string, validProps: Set<string>): string | null {
  let bestMatch: string | null = null;
  let bestDistance = Infinity;

  for (const prop of validProps) {
    const distance = levenshteinDistance(input.toLowerCase(), prop.toLowerCase());
    // Only suggest if reasonably close (max 3 edits for short strings)
    if (distance < bestDistance && distance <= Math.max(3, Math.floor(input.length / 2))) {
      bestDistance = distance;
      bestMatch = prop;
    }
  }

  return bestMatch;
}

/**
 * Simple Levenshtein distance implementation
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// ============================================
// Execution Handler
// ============================================

async function handleExecute(request: WorkerExecuteRequest): Promise<void> {
  const logs: WorkerLog[] = [];
  const ops: WorkerOp[] = [];
  let idCounter = request.idCounter; // Start from provided counter

  // Hard caps to prevent DoS / UI freezes from untrusted agent code
  const MAX_LOGS = 200;
  const MAX_LOG_CHARS = 2000;
  const MAX_OPS = 200;
  const MAX_STATE_CHARS = 200_000; // generous, but prevents multi-MB state bombs

  // Production-parity constraint for this sandbox:
  // agent ticks are synchronous and deterministic. Async/await/promises are forbidden.
  const cleanForAsyncScan = stripStringsAndComments(request.code);
  const asyncPatterns: Array<{ re: RegExp; message: string }> = [
    { re: /\bawait\b/, message: 'Async not supported in sandbox tick: "await". Use ctx.services.* jobs + polling via ctx.state.' },
    { re: /\basync\b/, message: 'Async not supported in sandbox tick: "async". Use ctx.services.* jobs + polling via ctx.state.' },
    { re: /\bnew\s+Promise\s*\(/, message: 'Promises not supported in sandbox tick. Use ctx.services.* jobs + polling via ctx.state.' },
    { re: /\.\s*then\s*\(/, message: 'Promise.then not supported in sandbox tick. Use ctx.services.* jobs + polling via ctx.state.' },
  ];
  for (const p of asyncPatterns) {
    if (p.re.test(cleanForAsyncScan)) {
      postResponse({
        type: 'RESULT',
        requestId: request.requestId,
        success: false,
        error: {
          type: 'validation',
          message: p.message,
        },
        idCounter,
        logs: [
          { level: 'error', message: p.message, timestamp: request.virtualTimeMs },
        ],
        ops: [],
      });
      return;
    }
  }

  // Helper: allocate deterministic ID
  const allocId = (prefix: string): string => {
    return `${prefix}-${idCounter++}`;
  };

  // Helper: append log
  const appendLog = (level: 'info' | 'warn' | 'error', message: string) => {
    if (logs.length >= MAX_LOGS) {
      // Emit a single warning once when hitting the cap
      if (logs.length === MAX_LOGS) {
        logs.push({
          level: 'warn',
          message: `Log limit reached (${MAX_LOGS}). Further logs are dropped.`,
          timestamp: request.virtualTimeMs,
        });
      }
      return;
    }

    const msg = String(message);
    logs.push({
      level,
      message: msg.length > MAX_LOG_CHARS ? `${msg.slice(0, MAX_LOG_CHARS)}… [truncated]` : msg,
      timestamp: request.virtualTimeMs,
    });
  };

  // Pre-flight validation: Check for undefined variables and property typos
  const validationErrors = validateCode(request.code);
  if (validationErrors.length > 0) {
    // IMPORTANT: Keep production parity.
    // These checks are heuristic (regex-based), so they must NEVER block execution.
    for (const e of validationErrors) {
      appendLog('warn', `Potential issue: ${e.message} (line ${e.line})`);
    }
  }

  let vm: QuickJSContext | null = null;

  try {
    // Initialize QuickJS
    const QuickJS = await (quickjsPromise ?? (quickjsPromise = getQuickJS()));
    vm = QuickJS.newContext();

    // Resource limits
    vm.runtime.setMemoryLimit(limits.maxMemoryBytes);
    vm.runtime.setMaxStackSize(limits.maxStackSizeBytes);

    // Build ctx API
    const ctxHandle = vm.newObject();

    // Inject identity (read-only)
    vm.setProp(ctxHandle, 'agentId', vm.newString(request.agent.id));
    vm.setProp(ctxHandle, 'agentName', vm.newString(request.agent.name));
    vm.setProp(ctxHandle, 'agentType', vm.newString(request.agent.type));
    vm.setProp(ctxHandle, 'balance', vm.newNumber(request.agent.balanceMicro));

    // Inject logging functions
    const logFn = vm.newFunction('log', (msgHandle) => {
      const msg = vm.dump(msgHandle);
      appendLog('info', String(msg));
    });
    vm.setProp(ctxHandle, 'log', logFn);
    logFn.dispose();

    const warnFn = vm.newFunction('warn', (msgHandle) => {
      const msg = vm.dump(msgHandle);
      appendLog('warn', String(msg));
    });
    vm.setProp(ctxHandle, 'warn', warnFn);
    warnFn.dispose();

    const errorFn = vm.newFunction('error', (msgHandle) => {
      const msg = vm.dump(msgHandle);
      appendLog('error', String(msg));
    });
    vm.setProp(ctxHandle, 'error', errorFn);
    errorFn.dispose();

    // Valid transaction states (must match production SDK)
    const VALID_STATES: TransactionState[] = [
      'INITIATED', 'QUOTED', 'COMMITTED', 'IN_PROGRESS',
      'DELIVERED', 'SETTLED', 'DISPUTED', 'CANCELLED'
    ];

    // Inject transaction operations (queue ops, return ID synchronously)
    // STRICT VALIDATION: Matches production SDK behavior
    const createTxFn = vm.newFunction('createTransaction', (paramsHandle) => {
      const raw = vm.dump(paramsHandle);

      // Strict type check: must be an object
      if (raw === null || raw === undefined) {
        throw new Error('ValidationError: ctx.createTransaction() requires params object, got ' + typeof raw);
      }
      if (typeof raw !== 'object' || Array.isArray(raw)) {
        throw new Error('ValidationError: ctx.createTransaction() requires params object, got ' + (Array.isArray(raw) ? 'array' : typeof raw));
      }

      const params = raw as Record<string, any>;

      // Strict validation: provider (required, must be string)
      if (params.provider === undefined || params.provider === null) {
        throw new Error('ValidationError for provider: provider is required');
      }
      if (typeof params.provider !== 'string') {
        throw new Error('ValidationError for provider: expected string, got ' + typeof params.provider);
      }
      if (params.provider.trim() === '') {
        throw new Error('ValidationError for provider: provider cannot be empty');
      }

      // Strict validation: amountMicro (required, must be positive integer)
      const amountMicroRaw = params.amountMicro ?? params.amount;
      if (amountMicroRaw === undefined || amountMicroRaw === null) {
        throw new Error('ValidationError for amountMicro: amountMicro is required');
      }
      if (typeof amountMicroRaw !== 'number') {
        throw new Error('ValidationError for amountMicro: expected number, got ' + typeof amountMicroRaw);
      }
      if (!Number.isFinite(amountMicroRaw)) {
        throw new Error('ValidationError for amountMicro: must be a finite number, got ' + amountMicroRaw);
      }
      if (amountMicroRaw <= 0) {
        throw new Error('ValidationError for amountMicro: Invalid amount: ' + amountMicroRaw + ' (must be > 0)');
      }
      if (!Number.isInteger(amountMicroRaw)) {
        throw new Error('ValidationError for amountMicro: must be an integer (micro-USDC), got ' + amountMicroRaw);
      }

      // Strict validation: service (required, must be non-empty string)
      if (params.service === undefined || params.service === null) {
        throw new Error('ValidationError for service: service is required');
      }
      if (typeof params.service !== 'string') {
        throw new Error('ValidationError for service: expected string, got ' + typeof params.service);
      }
      if (params.service.trim() === '') {
        throw new Error('ValidationError for service: service cannot be empty');
      }

      // Strict validation: deadlineMs (optional, but if provided must be positive integer)
      const deadlineMsRaw = params.deadlineMs ?? params.deadline;
      let deadlineMs: number | undefined;
      if (deadlineMsRaw !== undefined && deadlineMsRaw !== null) {
        if (typeof deadlineMsRaw !== 'number') {
          throw new Error('ValidationError for deadlineMs: expected number, got ' + typeof deadlineMsRaw);
        }
        if (!Number.isFinite(deadlineMsRaw)) {
          throw new Error('ValidationError for deadlineMs: must be a finite number');
        }
        if (deadlineMsRaw <= 0) {
          throw new Error('ValidationError for deadlineMs: must be positive, got ' + deadlineMsRaw);
        }
        deadlineMs = Math.floor(deadlineMsRaw);
      }

      const txId = allocId('tx');
      if (ops.length >= MAX_OPS) {
        throw new Error(`ResourceError: too many operations in one tick (max ${MAX_OPS})`);
      }
      ops.push({
        type: 'CREATE_TX',
        tx: {
          id: txId,
          provider: params.provider.trim(),
          amountMicro: amountMicroRaw,
          service: params.service.trim(),
          deadlineMs,
        },
      });

      appendLog('info', `Creating transaction: ${params.service} (${txId})`);
      return vm.newString(txId);
    });
    vm.setProp(ctxHandle, 'createTransaction', createTxFn);
    createTxFn.dispose();

    const transitionFn = vm.newFunction('transitionState', (txIdHandle, stateHandle) => {
      const txIdRaw = vm.dump(txIdHandle);
      const stateRaw = vm.dump(stateHandle);

      // Strict validation: txId
      if (txIdRaw === undefined || txIdRaw === null) {
        throw new Error('ValidationError for txId: txId is required');
      }
      if (typeof txIdRaw !== 'string') {
        throw new Error('ValidationError for txId: expected string, got ' + typeof txIdRaw);
      }
      if (txIdRaw.trim() === '') {
        throw new Error('ValidationError for txId: txId cannot be empty');
      }

      // Strict validation: state
      if (stateRaw === undefined || stateRaw === null) {
        throw new Error('ValidationError for state: state is required');
      }
      if (typeof stateRaw !== 'string') {
        throw new Error('ValidationError for state: expected string, got ' + typeof stateRaw);
      }
      const state = stateRaw as TransactionState;
      if (!VALID_STATES.includes(state)) {
        throw new Error('ValidationError for state: invalid state "' + state + '". Valid states: ' + VALID_STATES.join(', '));
      }

      if (ops.length >= MAX_OPS) {
        throw new Error(`ResourceError: too many operations in one tick (max ${MAX_OPS})`);
      }
      ops.push({ type: 'TRANSITION_STATE', txId: txIdRaw, state });
      appendLog('info', `Transitioning ${txIdRaw} to ${state}`);
    });
    vm.setProp(ctxHandle, 'transitionState', transitionFn);
    transitionFn.dispose();

    const releaseFn = vm.newFunction('releaseEscrow', (txIdHandle) => {
      const txIdRaw = vm.dump(txIdHandle);

      // Strict validation: txId
      if (txIdRaw === undefined || txIdRaw === null) {
        throw new Error('ValidationError for txId: txId is required');
      }
      if (typeof txIdRaw !== 'string') {
        throw new Error('ValidationError for txId: expected string, got ' + typeof txIdRaw);
      }
      if (txIdRaw.trim() === '') {
        throw new Error('ValidationError for txId: txId cannot be empty');
      }

      if (ops.length >= MAX_OPS) {
        throw new Error(`ResourceError: too many operations in one tick (max ${MAX_OPS})`);
      }
      ops.push({ type: 'RELEASE_ESCROW', txId: txIdRaw });
      appendLog('info', `Releasing escrow for ${txIdRaw}`);
    });
    vm.setProp(ctxHandle, 'releaseEscrow', releaseFn);
    releaseFn.dispose();

    const disputeFn = vm.newFunction('initiateDispute', (txIdHandle, reasonHandle) => {
      const txIdRaw = vm.dump(txIdHandle);
      const reasonRaw = vm.dump(reasonHandle);

      // Strict validation: txId
      if (txIdRaw === undefined || txIdRaw === null) {
        throw new Error('ValidationError for txId: txId is required');
      }
      if (typeof txIdRaw !== 'string') {
        throw new Error('ValidationError for txId: expected string, got ' + typeof txIdRaw);
      }
      if (txIdRaw.trim() === '') {
        throw new Error('ValidationError for txId: txId cannot be empty');
      }

      // Strict validation: reason
      if (reasonRaw === undefined || reasonRaw === null) {
        throw new Error('ValidationError for reason: reason is required');
      }
      if (typeof reasonRaw !== 'string') {
        throw new Error('ValidationError for reason: expected string, got ' + typeof reasonRaw);
      }

      if (ops.length >= MAX_OPS) {
        throw new Error(`ResourceError: too many operations in one tick (max ${MAX_OPS})`);
      }
      ops.push({ type: 'DISPUTE', txId: txIdRaw, reason: String(reasonRaw) });
      appendLog('warn', `Initiating dispute for ${txIdRaw}: ${reasonRaw}`);
    });
    vm.setProp(ctxHandle, 'initiateDispute', disputeFn);
    disputeFn.dispose();

    const cancelFn = vm.newFunction('cancelTransaction', (txIdHandle) => {
      const txIdRaw = vm.dump(txIdHandle);

      // Strict validation: txId
      if (txIdRaw === undefined || txIdRaw === null) {
        throw new Error('ValidationError for txId: txId is required');
      }
      if (typeof txIdRaw !== 'string') {
        throw new Error('ValidationError for txId: expected string, got ' + typeof txIdRaw);
      }
      if (txIdRaw.trim() === '') {
        throw new Error('ValidationError for txId: txId cannot be empty');
      }

      if (ops.length >= MAX_OPS) {
        throw new Error(`ResourceError: too many operations in one tick (max ${MAX_OPS})`);
      }
      ops.push({ type: 'CANCEL', txId: txIdRaw });
      appendLog('info', `Cancelling transaction ${txIdRaw}`);
    });
    vm.setProp(ctxHandle, 'cancelTransaction', cancelFn);
    cancelFn.dispose();

    // Inject incoming transactions
    const txArrayHandle = vm.newArray();
    request.incomingTransactions.forEach((tx, index) => {
      const txObjHandle = vm.newObject();
      vm.setProp(txObjHandle, 'id', vm.newString(tx.id));
      vm.setProp(txObjHandle, 'sourceId', vm.newString(tx.sourceId));
      vm.setProp(txObjHandle, 'targetId', vm.newString(tx.targetId));
      vm.setProp(txObjHandle, 'state', vm.newString(tx.state));
      vm.setProp(txObjHandle, 'amountMicro', vm.newNumber(tx.amountMicro));
      vm.setProp(txObjHandle, 'service', vm.newString(tx.service));
      vm.setProp(txArrayHandle, index, txObjHandle);
      txObjHandle.dispose();
    });
    vm.setProp(ctxHandle, 'incomingTransactions', txArrayHandle);
    txArrayHandle.dispose();

    // Inject all transactions
    const allTxArrayHandle = vm.newArray();
    request.transactions.forEach((tx, index) => {
      const txObjHandle = vm.newObject();
      vm.setProp(txObjHandle, 'id', vm.newString(tx.id));
      vm.setProp(txObjHandle, 'sourceId', vm.newString(tx.sourceId));
      vm.setProp(txObjHandle, 'targetId', vm.newString(tx.targetId));
      vm.setProp(txObjHandle, 'state', vm.newString(tx.state));
      vm.setProp(txObjHandle, 'amountMicro', vm.newNumber(tx.amountMicro));
      vm.setProp(txObjHandle, 'service', vm.newString(tx.service));
      vm.setProp(allTxArrayHandle, index, txObjHandle);
      txObjHandle.dispose();
    });
    vm.setProp(ctxHandle, 'transactions', allTxArrayHandle);
    allTxArrayHandle.dispose();

    // Inject persistent state (ctx.state)
    const stateHandle = vm.newObject();
    if (request.persistentState && typeof request.persistentState === 'object') {
      for (const [key, value] of Object.entries(request.persistentState)) {
        let valueStr: string | undefined;
        try {
          valueStr = JSON.stringify(value);
        } catch (err) {
          appendLog('warn', `Failed to restore ctx.state.${key} (not JSON-serializable): ${String(err)}`);
          continue;
        }

        if (valueStr === undefined) continue;

        const parseResult = vm.evalCode(`(${valueStr})`);
        if (isFail(parseResult)) {
          const dumped = vm.dump(parseResult.error);
          parseResult.error.dispose();

          const msg =
            typeof dumped === 'string'
              ? dumped
              : dumped && typeof dumped === 'object' && 'message' in dumped
                ? String((dumped as any).message)
                : JSON.stringify(dumped);

          appendLog('warn', `Failed to restore ctx.state.${key}: ${msg}`);
          continue;
        }

        vm.setProp(stateHandle, key, parseResult.value);
        parseResult.value.dispose();
      }
    }
    vm.setProp(ctxHandle, 'state', stateHandle);
    stateHandle.dispose();

    // Inject services API (ctx.services.translate)
    const servicesHandle = vm.newObject();

    const translateFn = vm.newFunction('translate', (paramsHandle) => {
      const raw = vm.dump(paramsHandle) as any;
      if (!raw || typeof raw !== 'object') {
        throw new Error('ctx.services.translate(params) expects an object');
      }

      const text = String(raw.text ?? '');
      const to = String(raw.to ?? '');
      const from = raw.from ? String(raw.from) : undefined;

      if (!text) throw new Error('ctx.services.translate: missing text');
      if (!to) throw new Error('ctx.services.translate: missing to (target language)');

      const jobId = allocId('job');
      if (ops.length >= MAX_OPS) {
        throw new Error(`ResourceError: too many operations in one tick (max ${MAX_OPS})`);
      }
      ops.push({
        type: 'SUBMIT_JOB',
        job: {
          id: jobId,
          service: 'translate',
          params: { text, to, from },
        },
      });

      appendLog('info', `Submitted translation job: ${jobId}`);
      return vm.newString(jobId);
    });
    vm.setProp(servicesHandle, 'translate', translateFn);
    translateFn.dispose();

    vm.setProp(ctxHandle, 'services', servicesHandle);
    servicesHandle.dispose();

    // Set ctx as global
    vm.setProp(vm.global, 'ctx', ctxHandle);
    ctxHandle.dispose();

    // Execute code with timeout
    const startTime = Date.now();
    vm.runtime.setInterruptHandler(() => Date.now() - startTime > limits.maxExecutionTimeMs);

    const result = vm.evalCode(request.code);

    if (isFail(result)) {
      const error = vm.dump(result.error);
      result.error.dispose();

      const elapsed = Date.now() - startTime;
      const msg =
        (error && typeof error === 'object' && 'message' in error)
          ? String((error as any).message)
          : String(error);

      if (elapsed >= limits.maxExecutionTimeMs && msg.toLowerCase().includes('interrupted')) {
        postResponse({
          type: 'RESULT',
          requestId: request.requestId,
          success: false,
          error: {
            type: 'timeout',
            message: `Code execution timed out (${limits.maxExecutionTimeMs / 1000} second limit)`,
          },
          idCounter,
          logs,
          ops: [], // Discard ops on timeout
        });
        return;
      }

      postResponse({
        type: 'RESULT',
        requestId: request.requestId,
        success: false,
        error: parseQuickJSError(error),
        idCounter,
        logs,
        ops: [], // Discard ops on error
      });
      return;
    }

    result.value.dispose();

    // Extract final ctx.state
    let finalState: Record<string, any> | undefined;
    try {
      const getStateResult = vm.evalCode('JSON.stringify(ctx.state || {})');
      if (isSuccess(getStateResult)) {
        const stateJson = String(vm.dump(getStateResult.value));
        getStateResult.value.dispose();
        if (stateJson.length > MAX_STATE_CHARS) {
          appendLog('warn', `ctx.state too large (${stateJson.length} chars). Truncating to {}.`);
          finalState = {};
          postResponse({
            type: 'RESULT',
            requestId: request.requestId,
            success: false,
            error: {
              type: 'resource',
              message: `ctx.state too large (${stateJson.length} chars)`,
            },
            idCounter,
            logs,
            ops: [],
          });
          return;
        }

        const parsed = JSON.parse(stateJson) as unknown;

        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          appendLog('warn', 'ctx.state must be a plain object; resetting to {}');
          finalState = {};
        } else {
          finalState = parsed as Record<string, any>;
        }
      } else {
        const dumped = vm.dump(getStateResult.error);
        getStateResult.error.dispose();

        const msg =
          typeof dumped === 'string'
            ? dumped
            : dumped && typeof dumped === 'object' && 'message' in dumped
              ? String((dumped as any).message)
              : JSON.stringify(dumped);

        appendLog('warn', `Failed to serialize ctx.state (must be JSON-serializable): ${msg}`);
      }
    } catch {
      // Ignore state read errors
    }

    postResponse({
      type: 'RESULT',
      requestId: request.requestId,
      success: true,
      idCounter,
      logs,
      ops,
      finalState,
    });
  } catch (error) {
    postResponse({
      type: 'RESULT',
      requestId: request.requestId,
      success: false,
      error: {
        type: 'runtime',
        message: `Sandbox initialization failed: ${String(error)}`,
      },
      idCounter,
      logs,
      ops: [],
    });
  } finally {
    if (vm) {
      vm.dispose();
    }
  }
}

// ============================================
// Error Parsing
// ============================================

function parseQuickJSError(error: any): { type: 'syntax' | 'runtime'; message: string; line?: number; column?: number } {
  if (typeof error === 'string') {
    return {
      type: 'runtime',
      message: error,
    };
  }

  if (error && typeof error === 'object') {
    let line: number | undefined;
    if (error.stack && typeof error.stack === 'string') {
      const lineMatch = error.stack.match(/:(\d+):/);
      if (lineMatch) {
        line = parseInt(lineMatch[1], 10);
      }
    }

    if (error.name === 'SyntaxError' || (error.message && error.message.includes('syntax'))) {
      return {
        type: 'syntax',
        message: error.message || 'Syntax error in agent code',
        line,
      };
    }

    return {
      type: 'runtime',
      message: error.message || String(error),
      line,
    };
  }

  return {
    type: 'runtime',
    message: 'Unknown error occurred',
  };
}
