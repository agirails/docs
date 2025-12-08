import { useState, useEffect, useCallback } from 'react';
import { WalletState } from '@/types/playground';

const STORAGE_KEY = 'agirails-checklist-progress';

interface ChecklistState {
  installCompleted: boolean;
  envCompleted: boolean;
  tokensCompleted: boolean;
}

interface UseChecklistReturn {
  state: ChecklistState;
  markComplete: (step: keyof ChecklistState) => void;
  reset: () => void;
}

const defaultState: ChecklistState = {
  installCompleted: false,
  envCompleted: false,
  tokensCompleted: false,
};

export function useChecklist(): UseChecklistReturn {
  const [state, setState] = useState<ChecklistState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : defaultState;
    } catch {
      return defaultState;
    }
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore localStorage errors
    }
  }, [state]);

  const markComplete = useCallback((step: keyof ChecklistState) => {
    setState(prev => ({ ...prev, [step]: true }));
  }, []);

  const reset = useCallback(() => {
    setState(defaultState);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  return { state, markComplete, reset };
}
