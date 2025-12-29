import React, { useEffect, Component, ErrorInfo, ReactNode } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import '../components/AIAssistant/AIAssistant.css';

interface RootProps {
  children: React.ReactNode;
}

// Error boundary that suppresses wallet extension errors
class WalletErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): { hasError: boolean } {
    // Check if it's a wallet-related error
    const message = error?.message?.toLowerCase() || '';
    if (message.includes('metamask') ||
        message.includes('ethereum') ||
        message.includes('wallet')) {
      // Don't set hasError, just suppress
      return { hasError: false };
    }
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const message = error?.message?.toLowerCase() || '';
    // Only log non-wallet errors
    if (!message.includes('metamask') &&
        !message.includes('ethereum') &&
        !message.includes('wallet')) {
      console.error('Uncaught error:', error, errorInfo);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return <div>Something went wrong.</div>;
    }
    return this.props.children;
  }
}

export default function Root({ children }: RootProps): JSX.Element {
  // Suppress benign errors
  useEffect(() => {
    const handler = (e: ErrorEvent) => {
      // ResizeObserver errors (common with animations/real-time updates)
      if (e.message?.includes('ResizeObserver loop')) {
        e.stopImmediatePropagation();
        return;
      }
      // MetaMask extension auto-connect errors (not our code, extension behavior)
      if (e.message?.includes('MetaMask') || e.message?.includes('ethereum')) {
        e.stopImmediatePropagation();
        return;
      }
    };

    // Also suppress unhandled promise rejections from MetaMask
    const rejectionHandler = (e: PromiseRejectionEvent) => {
      const reason = String(e.reason);
      if (reason.includes('MetaMask') || reason.includes('ethereum') || reason.includes('wallet')) {
        e.preventDefault();
      }
    };

    window.addEventListener('error', handler);
    window.addEventListener('unhandledrejection', rejectionHandler);
    return () => {
      window.removeEventListener('error', handler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
    };
  }, []);

  return (
    <WalletErrorBoundary>
      {children}
      <BrowserOnly fallback={null}>
        {() => {
          const AIAssistant = require('../components/AIAssistant/AIAssistant').default;
          const MobileMenu = require('../components/MobileMenu/MobileMenu').default;
          return (
            <>
              <AIAssistant />
              <MobileMenu />
            </>
          );
        }}
      </BrowserOnly>
    </WalletErrorBoundary>
  );
}
