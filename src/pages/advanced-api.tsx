import { useState } from 'react';
import Layout from '@theme/Layout';
import Header from '../components/playground/Header';
import WalletModal from '../components/playground/WalletModal';
import AgentBattle from '../components/battle/AgentBattle';
import { WalletState } from '../types/playground';
import '../components/playground/playground.css';

export default function AdvancedApiPage(): JSX.Element {
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

          <AgentBattle hideHeader />
        </div>
      </main>
    </Layout>
  );
}
