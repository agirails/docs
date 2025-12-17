import { useState } from 'react';
import Layout from '@theme/Layout';
import { Canvas } from '../components/canvas';
import Header from '../components/playground/Header';
import WalletModal from '../components/playground/WalletModal';
import { WalletState } from '../types/playground';
import '../css/canvas.css';
import '../components/playground/playground.css';

export default function CanvasPage(): JSX.Element {
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const wallet: WalletState = {
    connected: isConnected,
    address: isConnected ? '0xCanvas...5678' : '',
    ethBalance: '0.5 ETH',
    usdcBalance: '1,000.00 USDC',
    network: 'Mock Mode',
  };

  return (
    <Layout title="Agent Canvas" description="AGIRAILS Agent Simulation Sandbox">
      <main
        style={{
          width: '100%',
          maxWidth: '100%',
          padding: '0',
          background: 'var(--pg-bg)',
          minHeight: 'calc(100vh - 60px)',
        }}
      >
        <div className="pg-container">
          <Header
            wallet={wallet}
            onConnect={() => setShowWalletModal(true)}
            onDisconnect={() => setIsConnected(false)}
            currentLevel="canvas"
          />

          <WalletModal
            isOpen={showWalletModal}
            onClose={() => setShowWalletModal(false)}
            onConnect={() => { setIsConnected(true); setShowWalletModal(false); }}
          />

          <Canvas />
        </div>
      </main>
    </Layout>
  );
}

