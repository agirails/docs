/**
 * SDK Level 0 (Browser) - request/provide facade
 *
 * Goal: make /simple-api map 1:1 to the real SDK's Level 0 mental model
 * (request() + provide()) while still running entirely in-browser.
 *
 * IMPORTANT: This is a browser mock implementation that drives the existing
 * docs-site mock runtime in `src/lib/sdk.ts`.
 */
import { sdk, initializeSDK, type TransactionState } from './sdk';
import type { SDKEvent } from './sdk';
import { z } from 'zod';

/**
 * Match real SDK Level0 RequestStatus shape (sdk-js):
 * state is lowercase, progress/message optional.
 */
export type RequestStatus = {
  state:
    | 'initiated'
    | 'quoted'
    | 'committed'
    | 'in_progress'
    | 'delivered'
    | 'settled'
    | 'disputed'
    | 'cancelled';
  progress?: number; // 0-100
  message?: string;
  eta?: number;
};

export type RequestOptions = {
  input: any;
  budget: number; // USDC (human units)
  provider?: string | 'any' | 'best' | 'cheapest';
  deadline?: number | Date;
  timeout?: number;
  network?: 'mock' | 'testnet' | 'mainnet';
  wallet?: 'auto' | 'connect' | string | { privateKey: string };
  rpcUrl?: string;
  stateDirectory?: string;
  onProgress?: (status: RequestStatus) => void;
};

export type RequestResult<T = any> = {
  txId: string;
  result: T;
  provider: string;
  events: SDKEvent[];
};

export type ProvideOptions = {
  filter?: {
    minBudget?: number;
    maxBudget?: number;
  };
  autoAccept?: boolean | ((job: Job) => boolean | Promise<boolean>);
  network?: 'mock' | 'testnet' | 'mainnet';
  wallet?: 'auto' | 'connect' | string | { privateKey: string };
  rpcUrl?: string;
  stateDirectory?: string;
};

export type Job<TInput = any> = {
  txId: string;
  service: string;
  input: TInput;
  budget: number; // USDC
  requester: string;
  provider: string;
};

export type Provider = {
  service: string;
  address: string;
  on: (event: 'payment:received', handler: (amountUsdc: number) => void) => void;
  off: (event: 'payment:received', handler: (amountUsdc: number) => void) => void;
  stop: () => void;
};

const serviceRegistry = new Map<
  string,
  {
    address: string;
    handler: (job: Job) => Promise<any>;
    listeners: Set<(amountUsdc: number) => void>;
    options?: ProvideOptions;
  }
>();

const serviceNameSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9:_-]+$/, 'Invalid service name');

export function provide(
  service: string,
  handler: (job: Job) => Promise<any>,
  options?: ProvideOptions
): Provider {
  const validated = serviceNameSchema.parse(service);
  const address = sdk.getProviderAddress();
  const listeners = new Set<(amountUsdc: number) => void>();
  serviceRegistry.set(validated, { address, handler, listeners, options });
  return {
    service: validated,
    address,
    on: (_event, fn) => listeners.add(fn),
    off: (_event, fn) => listeners.delete(fn),
    stop: () => {
      const current = serviceRegistry.get(validated);
      if (current?.address === address) {
        serviceRegistry.delete(validated);
      }
    },
  };
}

export async function request<T = any>(
  service: string,
  options: RequestOptions
): Promise<RequestResult<T>> {
  const validated = serviceNameSchema.parse(service);
  await initializeSDK();

  const providerRecord = serviceRegistry.get(validated);
  const providerSelection = options.provider ?? 'any';
  const provider =
    typeof providerSelection === 'string' && providerSelection.startsWith('0x')
      ? providerSelection
      : providerRecord?.address || sdk.getProviderAddress();

  const budgetSchema = z.number().finite().positive().max(1_000_000);
  const budget = budgetSchema.parse(options.budget);

  const onProgress = options.onProgress;

  const toStatusState = (state: TransactionState): RequestStatus['state'] => {
    switch (state) {
      case 'INITIATED':
        return 'initiated';
      case 'QUOTED':
        return 'quoted';
      case 'COMMITTED':
        return 'committed';
      case 'IN_PROGRESS':
        return 'in_progress';
      case 'DELIVERED':
        return 'delivered';
      case 'SETTLED':
        return 'settled';
      case 'DISPUTED':
        return 'disputed';
      case 'CANCELLED':
        return 'cancelled';
      default:
        return 'initiated';
    }
  };

  const emitProgress = (state: TransactionState, progress?: number, message?: string) => {
    try {
      onProgress?.({ state: toStatusState(state), progress, message });
    } catch {
      // Never let callbacks break protocol flow
    }
  };

  // Capture events produced during this request for caller UX
  const captured: SDKEvent[] = [];
  const unsubscribe = sdk.subscribeToEvents((e) => captured.push(e));

  try {
    // Create tx
    emitProgress('INITIATED', 5, 'Creating transaction');
    const amountWei = Math.round(budget * 1_000_000).toString(); // USDC 6 decimals
    const txId = await sdk.createTransaction({
      provider,
      amount: amountWei,
      deadline:
        typeof options.deadline === 'number'
          ? options.deadline
          : options.deadline instanceof Date
            ? Math.floor(options.deadline.getTime() / 1000)
            : Math.floor(Date.now() / 1000) + 24 * 3600,
      metadata: JSON.stringify({ service: validated, input: options.input }),
    });

    // Link escrow (auto transitions to COMMITTED in mock)
    emitProgress('COMMITTED', 25, 'Linking escrow');
    await sdk.linkEscrow(txId);

    // Provider starts work
    emitProgress('IN_PROGRESS', 55, 'Provider working');
    await sdk.transitionState(txId, 'IN_PROGRESS');

    // Execute handler (if registered), otherwise echo input back
    const job: Job = {
      txId,
      service: validated,
      input: options.input,
      budget,
      requester: sdk.getRequesterAddress(),
      provider,
    };

    let result: any;
    if (providerRecord?.handler) {
      // Apply provider-side options (filter + autoAccept) like Simple API semantics
      const minBudget = providerRecord.options?.filter?.minBudget;
      const maxBudget = providerRecord.options?.filter?.maxBudget;

      if (typeof minBudget === 'number' && budget < minBudget) {
        throw new Error(`Provider rejected: budget $${budget.toFixed(2)} < minBudget $${minBudget.toFixed(2)}`);
      }
      if (typeof maxBudget === 'number' && budget > maxBudget) {
        throw new Error(`Provider rejected: budget $${budget.toFixed(2)} > maxBudget $${maxBudget.toFixed(2)}`);
      }

      const autoAccept = providerRecord.options?.autoAccept;
      if (autoAccept === false) {
        throw new Error('Provider requires manual acceptance (autoAccept=false)');
      }
      if (typeof autoAccept === 'function') {
        const ok = await autoAccept(job);
        if (!ok) {
          throw new Error('Provider rejected by autoAccept(job) policy');
        }
      }

      result = await providerRecord.handler(job);
    } else {
      result = { ok: true, echo: options.input };
    }

    // Deliver + settle
    emitProgress('DELIVERED', 85, 'Delivering result');
    await sdk.transitionState(txId, 'DELIVERED');

    emitProgress('SETTLED', 100, 'Releasing escrow');
    await sdk.releaseEscrow(txId);

    // Fire provider event (matches real SDK ergonomics)
    if (providerRecord?.listeners && providerRecord.listeners.size > 0) {
      for (const fn of providerRecord.listeners) {
        try {
          fn(budget);
        } catch {
          // ignore user handler errors
        }
      }
    }

    return { txId, result: result as T, provider, events: captured };
  } finally {
    unsubscribe();
  }
}

