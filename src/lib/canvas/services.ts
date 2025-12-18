/* ============================================
   AGIRAILS Canvas - Services API
   ============================================

   Job queue system for agent services without blocking
   QuickJS execution. Supports mock and optional Ollama backends.
   ============================================ */

import { generateId } from './types';

// ============================================
// Types
// ============================================

export type JobStatus = 'pending' | 'completed' | 'failed';

export interface ServiceJob {
  /** Unique job ID */
  id: string;

  /** Job type (translate, etc.) */
  type: string;

  /** Job parameters */
  params: Record<string, any>;

  /** Job status */
  status: JobStatus;

  /** Result data (when completed) */
  result?: any;

  /** Error message (when failed) */
  error?: string;

  /** Created timestamp */
  createdAt: number;

  /** Completed/failed timestamp */
  completedAt?: number;
}

export interface TranslateParams {
  /** Text to translate */
  text: string;

  /** Target language code (e.g., 'es', 'fr', 'de') */
  to: string;

  /** Source language (optional, auto-detect if omitted) */
  from?: string;
}

export interface TranslateResult {
  /** Translated text */
  text: string;

  /** Source language detected/specified */
  from: string;

  /** Target language */
  to: string;

  /** Backend used (mock or ollama) */
  backend: 'mock' | 'ollama';
}

// ============================================
// Job Queue Manager
// ============================================

/**
 * Global job store (per Canvas session)
 * Maps jobId -> ServiceJob
 */
const jobStore = new Map<string, ServiceJob>();

/**
 * Budget limits (prevent runaway job creation)
 */
const BUDGET_LIMITS = {
  maxJobsPerTick: 10,
  maxOutputSize: 10000, // characters
  maxQueueSize: 100,
};

/**
 * Submit a new job to the queue
 * Returns jobId synchronously (job executes later)
 */
export function submitJob(type: string, params: Record<string, any>): string {
  // Enforce queue size limit
  if (jobStore.size >= BUDGET_LIMITS.maxQueueSize) {
    throw new Error(`Job queue full (max ${BUDGET_LIMITS.maxQueueSize} jobs)`);
  }

  const jobId = generateId('job');
  const job: ServiceJob = {
    id: jobId,
    type,
    params,
    status: 'pending',
    createdAt: Date.now(),
  };

  jobStore.set(jobId, job);
  return jobId;
}

/**
 * Submit a new job with a pre-allocated ID (Phase E: for worker-based execution)
 * Used when worker allocates deterministic IDs and main thread needs to insert them.
 * @throws Error if job ID already exists (collision detection)
 */
export function submitJobWithId(id: string, type: string, params: Record<string, any>): string {
  // Enforce queue size limit
  if (jobStore.size >= BUDGET_LIMITS.maxQueueSize) {
    throw new Error(`Job queue full (max ${BUDGET_LIMITS.maxQueueSize} jobs)`);
  }

  // Collision detection
  if (jobStore.has(id)) {
    throw new Error(`Job ID collision: ${id} already exists`);
  }

  const job: ServiceJob = {
    id,
    type,
    params,
    status: 'pending',
    createdAt: Date.now(),
  };

  jobStore.set(id, job);
  return id;
}

/**
 * Get job result (null if still pending)
 */
export function getJobResult(jobId: string): ServiceJob | null {
  return jobStore.get(jobId) ?? null;
}

/**
 * Get all jobs (for debugging/inspection)
 */
export function getAllJobs(): ServiceJob[] {
  return Array.from(jobStore.values());
}

/**
 * Snapshot the whole job store (for debug/time-travel).
 */
export function snapshotJobStore(): ServiceJob[] {
  try {
    return JSON.parse(JSON.stringify(getAllJobs())) as ServiceJob[];
  } catch {
    return [];
  }
}

/**
 * Restore the whole job store from a snapshot.
 */
export function restoreJobStore(jobs: ServiceJob[]): void {
  jobStore.clear();
  if (!Array.isArray(jobs)) return;

  for (const job of jobs) {
    if (!job?.id) continue;
    // Defensive clone
    try {
      const cloned = JSON.parse(JSON.stringify(job)) as ServiceJob;
      jobStore.set(cloned.id, cloned);
    } catch {
      // Skip corrupt job entries
    }
  }
}

/**
 * Clear all jobs (call on runtime reset)
 */
export function clearAllJobs(): void {
  jobStore.clear();
}

/**
 * Clear completed/failed jobs (cleanup)
 */
export function clearCompletedJobs(): void {
  for (const [jobId, job] of jobStore.entries()) {
    if (job.status === 'completed' || job.status === 'failed') {
      jobStore.delete(jobId);
    }
  }
}

// ============================================
// Service Backends
// ============================================

/**
 * Check if Ollama is available (optional)
 */
async function isOllamaAvailable(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      method: 'GET',
      signal: AbortSignal.timeout(1000), // 1 second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Mock translation backend (deterministic, always works)
 */
function mockTranslate(params: TranslateParams): TranslateResult {
  const { text, to, from } = params;

  // Simple mock: add language prefix
  const mockTranslation = `[${to.toUpperCase()}] ${text}`;

  return {
    text: mockTranslation,
    from: from ?? 'en',
    to,
    backend: 'mock',
  };
}

/**
 * Ollama translation backend (if available)
 */
async function ollamaTranslate(params: TranslateParams): Promise<TranslateResult> {
  const { text, to, from } = params;

  const prompt = `Translate the following text to ${to}. Only return the translation, no explanations.\n\nText: ${text}`;

  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama2', // Or any available model
      prompt,
      stream: false,
    }),
    signal: AbortSignal.timeout(30000), // 30 second timeout
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed: ${response.statusText}`);
  }

  const data = await response.json();
  const translatedText = data.response?.trim() ?? text;

  return {
    text: translatedText,
    from: from ?? 'auto',
    to,
    backend: 'ollama',
  };
}

/**
 * Process pending translation jobs
 */
async function processTranslationJobs(): Promise<void> {
  const pendingJobs = Array.from(jobStore.values()).filter(
    (job) => job.type === 'translate' && job.status === 'pending'
  );

  // Budget: max N jobs per tick
  const jobsToProcess = pendingJobs.slice(0, BUDGET_LIMITS.maxJobsPerTick);

  if (jobsToProcess.length === 0) return;

  // Check Ollama availability once per batch
  const useOllama = await isOllamaAvailable();

  for (const job of jobsToProcess) {
    try {
      const params = job.params as TranslateParams;

      // Validate params
      if (!params.text || typeof params.text !== 'string') {
        throw new Error('Missing or invalid "text" parameter');
      }
      if (!params.to || typeof params.to !== 'string') {
        throw new Error('Missing or invalid "to" parameter');
      }

      // Execute translation
      let result: TranslateResult;
      if (useOllama) {
        try {
          result = await ollamaTranslate(params);
        } catch (err) {
          // Fallback to mock if Ollama fails
          console.warn('Ollama translation failed, falling back to mock:', err);
          result = mockTranslate(params);
        }
      } else {
        result = mockTranslate(params);
      }

      // Enforce output size limit
      if (result.text.length > BUDGET_LIMITS.maxOutputSize) {
        result.text = result.text.slice(0, BUDGET_LIMITS.maxOutputSize) + '... [truncated]';
      }

      // Mark job as completed
      job.status = 'completed';
      job.result = result;
      job.completedAt = Date.now();
    } catch (err) {
      // Mark job as failed
      job.status = 'failed';
      job.error = String(err);
      job.completedAt = Date.now();
    }
  }
}

/**
 * Process all pending jobs (called between ticks)
 */
export async function processJobs(): Promise<void> {
  await processTranslationJobs();
  // Future: add more service types here (summarize, analyze, etc.)
}

// ============================================
// Agent-Facing API (Injected into ctx.services)
// ============================================

/**
 * Build services API for sandbox injection
 */
export function buildServicesAPI() {
  return {
    /**
     * Submit a translation job (returns jobId synchronously)
     * @param params Translation parameters
     * @returns Job ID (check ctx.state.jobs[jobId] for results)
     */
    translate: (params: TranslateParams): string => {
      return submitJob('translate', params);
    },

    // Future: add more services
    // summarize: (params: SummarizeParams) => submitJob('summarize', params),
    // analyze: (params: AnalyzeParams) => submitJob('analyze', params),
  };
}
