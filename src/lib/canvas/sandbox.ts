/* ============================================
   AGIRAILS Canvas - QuickJS WASM Sandbox
   ============================================

   Provides isolated JavaScript execution with:
   - 5-second timeout per agent
   - Injected ctx API for agent operations
   - No access to window, document, fetch, etc.
   ============================================ */

import { getQuickJS, QuickJSContext, isFail, isSuccess } from 'quickjs-emscripten';
import { TransactionState, Connection, generateId } from './types';
import { submitJob } from './services';

// ============================================
// Types
// ============================================

export interface CreateTxParams {
  id?: string; // optional caller-provided ID (returned by ctx.createTransaction)
  provider: string; // provider agentId
  amountMicro: number; // micro-USDC
  service: string;
  deadlineMs?: number;
}

export interface SandboxContext {
  agentId: string;
  agentName: string;
  agentType: 'requester' | 'provider' | 'validator';
  balance: number;
  incomingTransactions: Connection[];
  transactions: Connection[]; // All transactions (outgoing + incoming)

  // Persistent agent state (survives between ticks)
  persistentState?: Record<string, any>;

  // Callbacks to Canvas state
  onLog: (level: 'info' | 'warn' | 'error', message: string) => void;
  onCreateTransaction: (params: CreateTxParams) => Promise<string>;
  onTransitionState: (txId: string, state: TransactionState) => Promise<void>;
  onReleaseEscrow: (txId: string) => Promise<void>;
  onInitiateDispute: (txId: string, reason: string) => Promise<void>;
  onCancelTransaction: (txId: string) => Promise<void>;
}

export interface ExecutionError {
  type: 'timeout' | 'syntax' | 'runtime' | 'resource' | 'validation';
  message: string;
  line?: number;
  column?: number;
  suggestion?: string;
}

export interface ExecutionResult {
  success: boolean;
  error?: ExecutionError;
  logs: Array<{ level: 'info' | 'warn' | 'error'; message: string; timestamp: number }>;
  // Final agent state after execution (persists to next tick)
  finalState?: Record<string, any>;
}

// ============================================
// Resource Limits
// ============================================

const LIMITS = {
  maxExecutionTimeMs: 5000, // 5 seconds per agent
  maxMemoryBytes: 10485760, // 10MB
  maxStackSizeBytes: 1024 * 1024, // 1MB stack
  maxConsoleLines: 100, // Per execution
};

let quickjsPromise: ReturnType<typeof getQuickJS> | null = null;

// ============================================
// QuickJS Execution Engine
// ============================================

/**
 * Execute agent code in QuickJS WASM sandbox
 */
export async function executeAgentCode(
  code: string,
  context: SandboxContext,
  timeoutMs: number = LIMITS.maxExecutionTimeMs
): Promise<ExecutionResult> {
  const logs: Array<{ level: 'info' | 'warn' | 'error'; message: string; timestamp: number }> = [];

  // Initialize QuickJS
  let vm: QuickJSContext | null = null;

  try {
    const QuickJS = await (quickjsPromise ?? (quickjsPromise = getQuickJS()));
    vm = QuickJS.newContext();

    // Resource limits (best-effort; enforced by QuickJS runtime)
    vm.runtime.setMemoryLimit(LIMITS.maxMemoryBytes);
    vm.runtime.setMaxStackSize(LIMITS.maxStackSizeBytes);

    // Inject ctx API into sandbox
    const ctxAPI = buildContextAPI(context, logs);

    // Create global ctx object
    const ctxHandle = vm.newObject();

    // Inject identity (read-only)
    vm.setProp(ctxHandle, 'agentId', vm.newString(ctxAPI.agentId));
    vm.setProp(ctxHandle, 'agentName', vm.newString(ctxAPI.agentName));
    vm.setProp(ctxHandle, 'agentType', vm.newString(ctxAPI.agentType));
    vm.setProp(ctxHandle, 'balance', vm.newNumber(ctxAPI.balance));

    // Inject logging functions
    const logFn = vm.newFunction('log', (msgHandle) => {
      const msg = vm.dump(msgHandle);
      ctxAPI.log(String(msg));
    });
    vm.setProp(ctxHandle, 'log', logFn);
    logFn.dispose();

    const warnFn = vm.newFunction('warn', (msgHandle) => {
      const msg = vm.dump(msgHandle);
      ctxAPI.warn(String(msg));
    });
    vm.setProp(ctxHandle, 'warn', warnFn);
    warnFn.dispose();

    const errorFn = vm.newFunction('error', (msgHandle) => {
      const msg = vm.dump(msgHandle);
      ctxAPI.error(String(msg));
    });
    vm.setProp(ctxHandle, 'error', errorFn);
    errorFn.dispose();

    // Inject transaction operations (Phase 2 Week 2: synchronous, queued)
    const createTxFn = vm.newFunction('createTransaction', (paramsHandle) => {
      const raw = vm.dump(paramsHandle) as any;
      if (!raw || typeof raw !== 'object') {
        throw new Error('ctx.createTransaction(params) expects an object');
      }

      const provider = String(raw.provider ?? '');
      const amountMicroRaw = raw.amountMicro ?? raw.amount;
      const amountMicro = Number(amountMicroRaw ?? 0);
      const service = String(raw.service ?? '');

      const deadlineMsRaw = raw.deadlineMs ?? raw.deadline;
      const deadlineMs = deadlineMsRaw === undefined ? undefined : Number(deadlineMsRaw);

      if (!provider) throw new Error('ctx.createTransaction: missing provider');
      if (!service) throw new Error('ctx.createTransaction: missing service');
      if (!Number.isFinite(amountMicro) || amountMicro <= 0) {
        throw new Error('ctx.createTransaction: amountMicro must be a positive number');
      }
      if (deadlineMs !== undefined && (!Number.isFinite(deadlineMs) || deadlineMs <= 0)) {
        throw new Error('ctx.createTransaction: deadlineMs must be a positive number');
      }

      const txId = ctxAPI.createTransaction({
        provider,
        amountMicro: Math.floor(amountMicro),
        service,
        deadlineMs: deadlineMs === undefined ? undefined : Math.floor(deadlineMs),
      });
      return vm.newString(txId);
    });
    vm.setProp(ctxHandle, 'createTransaction', createTxFn);
    createTxFn.dispose();

    const transitionFn = vm.newFunction('transitionState', (txIdHandle, stateHandle) => {
      const txId = String(vm.dump(txIdHandle));
      const state = String(vm.dump(stateHandle)) as TransactionState;
      if (!txId) throw new Error('ctx.transitionState: missing txId');
      if (!state) throw new Error('ctx.transitionState: missing state');
      ctxAPI.transitionState(txId, state);
    });
    vm.setProp(ctxHandle, 'transitionState', transitionFn);
    transitionFn.dispose();

    const releaseFn = vm.newFunction('releaseEscrow', (txIdHandle) => {
      const txId = String(vm.dump(txIdHandle));
      if (!txId) throw new Error('ctx.releaseEscrow: missing txId');
      ctxAPI.releaseEscrow(txId);
    });
    vm.setProp(ctxHandle, 'releaseEscrow', releaseFn);
    releaseFn.dispose();

    const disputeFn = vm.newFunction('initiateDispute', (txIdHandle, reasonHandle) => {
      const txId = String(vm.dump(txIdHandle));
      const reason = String(vm.dump(reasonHandle));
      if (!txId) throw new Error('ctx.initiateDispute: missing txId');
      ctxAPI.initiateDispute(txId, reason);
    });
    vm.setProp(ctxHandle, 'initiateDispute', disputeFn);
    disputeFn.dispose();

    const cancelFn = vm.newFunction('cancelTransaction', (txIdHandle) => {
      const txId = String(vm.dump(txIdHandle));
      if (!txId) throw new Error('ctx.cancelTransaction: missing txId');
      ctxAPI.cancelTransaction(txId);
    });
    vm.setProp(ctxHandle, 'cancelTransaction', cancelFn);
    cancelFn.dispose();

    // Inject incoming transactions
    const txArrayHandle = vm.newArray();
    context.incomingTransactions.forEach((tx, index) => {
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

    // Inject all transactions (outgoing + incoming)
    const allTxArrayHandle = vm.newArray();
    context.transactions.forEach((tx, index) => {
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

    // Inject persistent state (ctx.state survives between ticks)
    const stateHandle = vm.newObject();
    if (context.persistentState && typeof context.persistentState === 'object') {
      // Serialize previous state into VM
      for (const [key, value] of Object.entries(context.persistentState)) {
        let valueStr: string | undefined;
        try {
          valueStr = JSON.stringify(value);
        } catch (err) {
          ctxAPI.warn(`Failed to restore ctx.state.${key} (not JSON-serializable): ${String(err)}`);
          continue;
        }

        // JSON.stringify can return undefined (e.g. functions/undefined); skip those.
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

          ctxAPI.warn(`Failed to restore ctx.state.${key}: ${msg}`);
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

      const jobId = submitJob('translate', { text, to, from });
      return vm.newString(jobId);
    });
    vm.setProp(servicesHandle, 'translate', translateFn);
    translateFn.dispose();

    vm.setProp(ctxHandle, 'services', servicesHandle);
    servicesHandle.dispose();

    // Set ctx as global variable
    vm.setProp(vm.global, 'ctx', ctxHandle);
    ctxHandle.dispose();

    // Execute code with timeout (interrupt handler must be set BEFORE evalCode).
    const startTime = Date.now();
    vm.runtime.setInterruptHandler(() => Date.now() - startTime > timeoutMs);

    try {
      const result = vm.evalCode(code);

      if (isFail(result)) {
        const error = vm.dump(result.error);
        result.error.dispose();

        const elapsed = Date.now() - startTime;
        const msg =
          (error && typeof error === 'object' && 'message' in error)
            ? String((error as any).message)
            : String(error);

        if (
          elapsed >= timeoutMs &&
          msg.toLowerCase().includes('interrupted')
        ) {
          return {
            success: false,
            error: {
              type: 'timeout',
              message: `Code execution timed out (${timeoutMs / 1000} second limit)`,
              suggestion: 'Simplify your code or remove infinite loops',
            },
            logs,
          };
        }

        return {
          success: false,
          error: parseQuickJSError(error),
          logs,
        };
      }

      result.value.dispose();

      // Read final ctx.state from VM (persists to next tick)
      let finalState: Record<string, any> | undefined;
      try {
        const getStateResult = vm.evalCode('JSON.stringify(ctx.state || {})');
        if (isSuccess(getStateResult)) {
          const stateJson = String(vm.dump(getStateResult.value));
          getStateResult.value.dispose();
          const parsed = JSON.parse(stateJson) as unknown;

          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            // Enforce ctx.state as a plain object. If user assigns a primitive/array, reset.
            ctxAPI.warn('ctx.state must be a plain object; resetting to {}');
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

          ctxAPI.warn(
            `Failed to serialize ctx.state (must be JSON-serializable to persist): ${msg}`
          );
        }
      } catch {
        // Ignore state read errors
      }

      return {
        success: true,
        logs,
        finalState,
      };
    } catch (err) {
      const elapsed = Date.now() - startTime;
      if (elapsed >= timeoutMs) {
        return {
          success: false,
          error: {
            type: 'timeout',
            message: `Code execution timed out (${timeoutMs / 1000} second limit)`,
            suggestion: 'Simplify your code or remove infinite loops',
          },
          logs,
        };
      }

      return {
        success: false,
        error: {
          type: 'runtime',
          message: String(err),
        },
        logs,
      };
    }
  } catch (err) {
    return {
      success: false,
      error: {
        type: 'runtime',
        message: `Sandbox initialization failed: ${String(err)}`,
      },
      logs,
    };
  } finally {
    if (vm) {
      vm.dispose();
    }
  }
}

// ============================================
// Context API Builder
// ============================================

/**
 * Build ctx API object (JavaScript-side interface)
 * This is what the agent code sees as `ctx`
 */
function buildContextAPI(
  context: SandboxContext,
  logs: Array<{ level: 'info' | 'warn' | 'error'; message: string; timestamp: number }>
) {
  // Helper to append log
  const appendLog = (level: 'info' | 'warn' | 'error', message: string) => {
    if (logs.length >= LIMITS.maxConsoleLines) {
      logs.shift(); // Ring buffer
    }
    logs.push({ level, message, timestamp: Date.now() });
    context.onLog(level, message);
  };

  return {
    // Identity (read-only)
    agentId: context.agentId,
    agentName: context.agentName,
    agentType: context.agentType,
    balance: context.balance,

    // Logging
    log: (msg: string) => appendLog('info', String(msg)),
    warn: (msg: string) => appendLog('warn', String(msg)),
    error: (msg: string) => appendLog('error', String(msg)),

    // Incoming transactions (for providers)
    incomingTransactions: context.incomingTransactions,

    // All transactions (outgoing + incoming)
    transactions: context.transactions,

    // Transaction operations (Phase 2 Week 2: synchronous, queued)
    // NOTE: QuickJS evalCode is synchronous; do NOT attempt to await host promises.
    createTransaction: (params: CreateTxParams): string => {
      const txId = params.id ?? generateId('tx');
      const withId: CreateTxParams = { ...params, id: txId };

      appendLog('info', `Creating transaction: ${JSON.stringify(withId)}`);
      context.onCreateTransaction(withId).catch((err) => {
        appendLog('error', `Failed to create transaction: ${String(err)}`);
      });
      return txId;
    },

    transitionState: (txId: string, state: TransactionState) => {
      appendLog('info', `Transitioning ${txId} to ${state}`);
      context.onTransitionState(txId, state).catch((err) => {
        appendLog('error', `Failed to transition state: ${String(err)}`);
      });
    },

    releaseEscrow: (txId: string) => {
      appendLog('info', `Releasing escrow for ${txId}`);
      context.onReleaseEscrow(txId).catch((err) => {
        appendLog('error', `Failed to release escrow: ${String(err)}`);
      });
    },

    initiateDispute: (txId: string, reason: string) => {
      appendLog('warn', `Initiating dispute for ${txId}: ${reason}`);
      context.onInitiateDispute(txId, reason).catch((err) => {
        appendLog('error', `Failed to initiate dispute: ${String(err)}`);
      });
    },

    cancelTransaction: (txId: string) => {
      appendLog('info', `Cancelling transaction ${txId}`);
      context.onCancelTransaction(txId).catch((err) => {
        appendLog('error', `Failed to cancel transaction: ${String(err)}`);
      });
    },
  };
}

// ============================================
// Error Parsing
// ============================================

/**
 * Parse QuickJS error into structured format
 */
function parseQuickJSError(error: any): ExecutionError {
  if (typeof error === 'string') {
    return {
      type: 'runtime',
      message: error,
    };
  }

  if (error && typeof error === 'object') {
    // Extract line number from stack trace if available
    let line: number | undefined;
    if (error.stack && typeof error.stack === 'string') {
      const lineMatch = error.stack.match(/:(\d+):/);
      if (lineMatch) {
        line = parseInt(lineMatch[1], 10);
      }
    }

    // Detect syntax errors
    if (error.name === 'SyntaxError' || (error.message && error.message.includes('syntax'))) {
      return {
        type: 'syntax',
        message: error.message || 'Syntax error in agent code',
        line,
        suggestion: 'Check for missing brackets, semicolons, or invalid JavaScript syntax',
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

// ============================================
// Phase E: Worker-Based Execution
// ============================================

import type { WorkerRequest, WorkerResponse, WorkerResult, WorkerOp } from './worker/protocol';

/**
 * Worker client for off-thread QuickJS execution
 */
class WorkerClient {
  private worker: Worker | null = null;
  private pendingRequests = new Map<
    string,
    {
      resolve: (result: WorkerResult) => void;
      reject: (error: Error) => void;
      timeout: ReturnType<typeof setTimeout>;
    }
  >();
  private requestCounter = 0;

  async init(): Promise<void> {
    if (this.worker) return;

    // Create worker
    this.worker = new Worker(
      new URL('./worker/sandboxWorker.ts', import.meta.url),
      { type: 'module' }
    );

    // Setup message handler
    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;

      if (response.type === 'RESULT') {
        const pending = this.pendingRequests.get(response.requestId);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(response.requestId);
          pending.resolve(response);
        }
      } else if (response.type === 'FATAL') {
        // Fatal worker error - reject all pending requests and recreate worker
        const error = new Error(response.message);
        for (const [requestId, pending] of this.pendingRequests.entries()) {
          clearTimeout(pending.timeout);
          pending.reject(error);
          this.pendingRequests.delete(requestId);
        }
        this.terminate();
      }
    };

    this.worker.onerror = (error) => {
      // Worker crashed - reject all pending requests
      const err = new Error(`Worker error: ${error.message}`);
      for (const [requestId, pending] of this.pendingRequests.entries()) {
        clearTimeout(pending.timeout);
        pending.reject(err);
        this.pendingRequests.delete(requestId);
      }
      this.terminate();
    };

    // Initialize worker
    const initRequest: WorkerRequest = {
      type: 'INIT',
      limits: {
        maxExecutionTimeMs: 5000,
        maxMemoryBytes: 10485760, // 10MB
        maxStackSizeBytes: 1024 * 1024, // 1MB
      },
    };
    this.worker.postMessage(initRequest);

    // Wait for READY response (with timeout)
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Worker initialization timeout'));
      }, 5000);

      const readyHandler = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.type === 'READY') {
          clearTimeout(timeout);
          if (this.worker) {
            this.worker.removeEventListener('message', readyHandler);
          }
          resolve();
        }
      };

      if (this.worker) {
        this.worker.addEventListener('message', readyHandler);
      }
    });
  }

  async execute(
    code: string,
    context: SandboxContext,
    determinism: { virtualTimeMs: number; idCounter: number }
  ): Promise<{
    success: boolean;
    logs: any[];
    finalState?: Record<string, any>;
    ops: WorkerOp[];
    idCounter: number;
    error?: ExecutionError;
  }> {
    if (!this.worker) {
      await this.init();
    }

    const requestId = `req-${++this.requestCounter}`;

    const request: WorkerRequest = {
      type: 'EXECUTE',
      requestId,
      agent: {
        id: context.agentId,
        name: context.agentName,
        type: context.agentType,
        balanceMicro: context.balance,
      },
      virtualTimeMs: determinism.virtualTimeMs,
      idCounter: determinism.idCounter,
      incomingTransactions: context.incomingTransactions,
      transactions: context.transactions,
      persistentState: context.persistentState,
      code,
    };

    return new Promise((resolve, reject) => {
      // Hard timeout (kill switch): 250ms buffer beyond max execution time
      const timeoutMs = 5000 + 250;
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);

        // Terminate and recreate worker
        this.terminate();
        this.init().catch(() => {}); // Best effort restart

        resolve({
          success: false,
          logs: [],
          ops: [],
          idCounter: determinism.idCounter, // Return original counter on timeout
          error: {
            type: 'timeout',
            message: 'Code execution timed out (hard timeout)',
          },
        });
      }, timeoutMs);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      if (this.worker) {
        this.worker.postMessage(request);
      } else {
        clearTimeout(timeout);
        this.pendingRequests.delete(requestId);
        reject(new Error('Worker not initialized'));
      }
    });
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingRequests.clear();
  }
}

// Singleton worker client
let workerClient: WorkerClient | null = null;

function getWorkerClient(): WorkerClient {
  if (!workerClient) {
    workerClient = new WorkerClient();
  }
  return workerClient;
}

/**
 * Execute agent code in worker thread (Phase E)
 * Returns operations for main thread to apply
 */
export async function executeAgentCodeWorker(
  code: string,
  context: SandboxContext,
  determinism: { virtualTimeMs: number; idCounter: number }
): Promise<{
  success: boolean;
  logs: any[];
  finalState?: Record<string, any>;
  ops: WorkerOp[];
  idCounter: number;
  error?: ExecutionError;
}> {
  const client = getWorkerClient();
  return client.execute(code, context, determinism);
}
