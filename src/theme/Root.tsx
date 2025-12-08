import React from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import '../components/AIAssistant/AIAssistant.css';

interface RootProps {
  children: React.ReactNode;
}

export default function Root({ children }: RootProps): JSX.Element {
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
