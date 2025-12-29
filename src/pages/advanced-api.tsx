import { useState, useCallback } from 'react';
import Layout from '@theme/Layout';
import Header from '../components/playground/Header';
import WalletModal from '../components/playground/WalletModal';
import { AdvancedApiWelcome } from '../components/playground/AdvancedApiWelcome';
import AgentBattle from '../components/battle/AgentBattle';
import { WalletState } from '../types/playground';
import '../components/playground/playground.css';

export default function AdvancedApiPage(): JSX.Element {
  // Welcome screen (first-time visitor)
  const [showWelcome, setShowWelcome] = useState(() => {
    try {
      return localStorage.getItem('agirails-advanced-api-welcome') !== '1';
    } catch {
      return true;
    }
  });

  const handleDismissWelcome = useCallback(() => {
    setShowWelcome(false);
    try {
      localStorage.setItem('agirails-advanced-api-welcome', '1');
    } catch {}
  }, []);

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const wallet: WalletState = {
    connected: isConnected,
    address: isConnected ? '0xReq...1234' : '',
    ethBalance: '0.5 ETH',
    usdcBalance: '1,000.00 USDC',
    network: 'Mock Mode',
  };

  return (
    <Layout
      title="Advanced API"
      description="Full ACTP protocol lifecycle control - create transactions, manage escrow, handle state transitions"
    >
      <main style={{
        width: '100%',
        maxWidth: '100%',
        padding: '0',
        background: '#0A0A0A',
        minHeight: 'calc(100vh - 60px)'
      }}>
        <div className="pg-container">
          <Header
            wallet={wallet}
            onConnect={() => setShowWalletModal(true)}
            onDisconnect={() => setIsConnected(false)}
            currentLevel="advanced-api"
          />

          <WalletModal
            isOpen={showWalletModal}
            onClose={() => setShowWalletModal(false)}
            onConnect={() => { setIsConnected(true); setShowWalletModal(false); }}
          />

          {showWelcome && (
            <AdvancedApiWelcome onDismiss={handleDismissWelcome} />
          )}

          {/* Orientation for first-time users */}
          <div style={{ textAlign: 'center', padding: '1rem 0 0.5rem', maxWidth: '600px', margin: '0 auto' }}>
            <p style={{ color: 'var(--pg-text-muted)', fontSize: '0.85rem', margin: 0 }}>
              Simulate both sides of an ACTP transaction.<br />
              Start by creating a transaction on the <strong style={{ color: 'var(--pg-text)' }}>Requester panel</strong> (left).
            </p>
          </div>

          <AgentBattle hideHeader />
        </div>
      </main>
    </Layout>
  );
}
