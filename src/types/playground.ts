export interface Method {
  id: string;
  name: string;
  category: string;
  description: string;
  params: MethodParam[];
}

export interface MethodParam {
  name: string;
  type: 'address' | 'number' | 'text' | 'select' | 'deadline';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
}

export interface FormValues {
  provider: string;
  amount: string;
  deadlineValue: string;
  deadlineUnit: 'hours' | 'days';
  description: string;
  escrowAddress?: string;
  newState?: string;
  attestation?: string;
  txId?: string;
  reason?: string;
  resolution?: string;
}

export interface SimulationResult {
  status: 'idle' | 'loading' | 'success' | 'error';
  stateChanges?: {
    field: string;
    from: string;
    to: string;
  }[];
  events?: {
    name: string;
    args: Record<string, string>;
  }[];
  gasEstimate?: number;
  gasCostUsd?: string;
  error?: string;
}

export interface WalletState {
  connected: boolean;
  address: string;
  ethBalance: string;
  usdcBalance: string;
  network: string;
}

export type Language = 'typescript' | 'python';
