/**
 * Suppress MetaMask and wallet extension errors.
 *
 * These errors come from browser extensions trying to auto-connect,
 * not from our code. This module runs early via clientModules.
 *
 * IMPORTANT: All code must be guarded for SSR (no window during build)
 */

// Only run in browser environment
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const SUPPRESS_PATTERNS = [
    'metamask',
    'failed to connect',
    'ethereum',
    'wallet',
    'web3',
    'phantom',
    'coinbase',
    'user rejected',
    'already pending',
  ];

  const shouldSuppress = (message: unknown): boolean => {
    if (!message) return false;
    const msg = String(message).toLowerCase();
    return SUPPRESS_PATTERNS.some(pattern => msg.includes(pattern));
  };

  const isExtensionError = (source?: string): boolean => {
    return source?.includes('chrome-extension://') ||
           source?.includes('moz-extension://') ||
           false;
  };

  // Block MetaMask from auto-detecting/connecting
  try {
    const originalEthereum = (window as any).ethereum;
    if (originalEthereum) {
      const blockedMethods = ['request', 'send', 'sendAsync'];
      const handler: ProxyHandler<any> = {
        get(target, prop) {
          if (blockedMethods.includes(prop as string)) {
            return async (...args: any[]) => {
              const method = args[0]?.method || args[0];
              if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
                return [];
              }
              return target[prop]?.apply(target, args);
            };
          }
          return target[prop];
        }
      };
      (window as any).ethereum = new Proxy(originalEthereum, handler);
    }
  } catch {
    // Ignore proxy errors
  }

  // Capture phase error listener
  window.addEventListener('error', (event) => {
    if (shouldSuppress(event.message) || isExtensionError(event.filename)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return false;
    }
  }, true);

  // Capture phase unhandled rejection listener
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason?.message || String(reason || '');
    if (shouldSuppress(message)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return false;
    }
  }, true);

  // Override window.onerror
  const originalOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    if (shouldSuppress(message) || isExtensionError(source ?? undefined)) {
      return true;
    }
    if (originalOnError) {
      return originalOnError.call(this, message, source, lineno, colno, error);
    }
    return false;
  };

  // Patch console.error
  const originalConsoleError = console.error;
  console.error = function(...args: unknown[]) {
    if (args.length > 0 && shouldSuppress(args[0])) {
      return;
    }
    return originalConsoleError.apply(console, args);
  };
}

export {};
