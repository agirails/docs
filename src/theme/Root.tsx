import React, { useEffect } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import '../components/AIAssistant/AIAssistant.css';

interface RootProps {
  children: React.ReactNode;
}

export default function Root({ children }: RootProps): JSX.Element {
  // Suppress benign ResizeObserver errors (common with animations/real-time updates)
  useEffect(() => {
    const handler = (e: ErrorEvent) => {
      if (e.message?.includes('ResizeObserver loop')) {
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener('error', handler);
    return () => window.removeEventListener('error', handler);
  }, []);

  return (
    <>
      {children}
      <BrowserOnly fallback={null}>
        {() => {
          const AIAssistant = require('../components/AIAssistant/AIAssistant').default;
          return <AIAssistant />;
        }}
      </BrowserOnly>
    </>
  );
}
