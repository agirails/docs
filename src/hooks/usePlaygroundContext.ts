/**
 * Hook for emitting playground context to the AI Assistant
 *
 * Each playground uses this to broadcast its current state,
 * which the AI Assistant can use for contextual help.
 */

import { useEffect, useCallback } from 'react';

export type PlaygroundType = 'simple-api' | 'standard-api' | 'advanced-api' | 'canvas';

export interface PlaygroundContext {
  type: PlaygroundType;
  title: string;
  description: string;

  // Current state summary (human-readable)
  summary: string;

  // Structured data for AI
  data: Record<string, any>;

  // Generated code (if any)
  generatedCode?: string;

  // Current errors or issues
  errors?: string[];
}

// Global storage for current playground context
let currentContext: PlaygroundContext | null = null;

/**
 * Get the current playground context (for AI Assistant)
 */
export function getPlaygroundContext(): PlaygroundContext | null {
  return currentContext;
}

/**
 * Format playground context for inclusion in AI prompt
 */
export function formatPlaygroundContextForPrompt(ctx: PlaygroundContext): string {
  const lines: string[] = [
    `\n---\nUSER'S CURRENT PLAYGROUND CONTEXT:`,
    `Page: ${ctx.title}`,
    `Description: ${ctx.description}`,
    `\nCurrent State: ${ctx.summary}`,
  ];

  // Add structured data
  if (Object.keys(ctx.data).length > 0) {
    lines.push('\nDetails:');
    for (const [key, value] of Object.entries(ctx.data)) {
      if (typeof value === 'object') {
        lines.push(`- ${key}: ${JSON.stringify(value, null, 2)}`);
      } else {
        lines.push(`- ${key}: ${value}`);
      }
    }
  }

  // Add generated code
  if (ctx.generatedCode) {
    lines.push('\nGenerated Code:');
    lines.push('```typescript');
    lines.push(ctx.generatedCode);
    lines.push('```');
  }

  // Add errors
  if (ctx.errors && ctx.errors.length > 0) {
    lines.push('\nCurrent Issues:');
    ctx.errors.forEach(err => lines.push(`- ${err}`));
  }

  lines.push('\nThe user may ask questions about what they see. Use this context to provide relevant help.');
  lines.push('---\n');

  return lines.join('\n');
}

/**
 * Hook to emit playground context
 */
export function usePlaygroundContext(context: PlaygroundContext | null) {
  useEffect(() => {
    if (context) {
      currentContext = context;
      // Emit event for AI Assistant to pick up
      window.dispatchEvent(new CustomEvent('playground-context-update', {
        detail: context
      }));
    }

    return () => {
      // Only clear if this component set the context
      if (currentContext === context) {
        currentContext = null;
        window.dispatchEvent(new CustomEvent('playground-context-update', {
          detail: null
        }));
      }
    };
  }, [context]);

  // Return a function to manually update context
  const updateContext = useCallback((updates: Partial<PlaygroundContext>) => {
    if (currentContext && context) {
      const newContext = { ...currentContext, ...updates };
      currentContext = newContext;
      window.dispatchEvent(new CustomEvent('playground-context-update', {
        detail: newContext
      }));
    }
  }, [context]);

  return { updateContext };
}
