import { useState, useCallback } from 'react';
import Header from './Header';
import MethodSelector from './MethodSelector';
import GettingStartedChecklist from './GettingStartedChecklist';
import ParameterForm from './ParameterForm';
import CodeDisplay from './CodeDisplay';
import ResultPanel from './ResultPanel';
import WalletModal from './WalletModal';
import { methods } from '../../data/methods';
import { getSimulationResult } from '../../lib/simulationResults';
import { FormValues, SimulationResult, WalletState } from '../../types/playground';
import './playground.css';

const initialWallet: WalletState = {
  connected: false,
  address: '',
  ethBalance: '0',
  usdcBalance: '0',
  network: 'Base Sepolia',
};

const connectedWallet: WalletState = {
  connected: true,
  address: '0x742d35Cc6634C0532925a3b844Bc9e7595f12345',
  ethBalance: '0.1234 ETH',
  usdcBalance: '1,000.00 USDC',
  network: 'Base Sepolia',
};

const initialFormValues: FormValues = {
  provider: '0x8a4c5B1D7F2E9A0C3b6E8D4f1A7C2E9B0D3F6A8C',
  amount: '100',
  deadlineValue: '24',
  deadlineUnit: 'hours',
  description: 'Translate 500 words EN→DE',
  txId: '0x7a3b1c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
  escrowAddress: '0x6aDB650e185b0ee77981AC5279271f0Fa6CFe7ba',
  attestation: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890',
};

export default function Playground() {
  const [wallet, setWallet] = useState<WalletState>(initialWallet);
  const [selectedMethodId, setSelectedMethodId] = useState('createTransaction');
  const [formValues, setFormValues] = useState<FormValues>(initialFormValues);
  const [hasSimulated, setHasSimulated] = useState(() => {
    try {
      return localStorage.getItem('agirails-has-simulated') === 'true';
    } catch {
      return false;
    }
  });
  const [hasExecuted, setHasExecuted] = useState(() => {
    try {
      return localStorage.getItem('agirails-has-executed') === 'true';
    } catch {
      return false;
    }
  });
  const [result, setResult] = useState<SimulationResult>({ status: 'idle' });
  const [showWalletModal, setShowWalletModal] = useState(false);

  const selectedMethod = methods.find((m) => m.id === selectedMethodId) || methods[0];

  const handleOpenWalletModal = useCallback(() => {
    setShowWalletModal(true);
  }, []);

  const handleCloseWalletModal = useCallback(() => {
    setShowWalletModal(false);
  }, []);

  const handleConnect = useCallback(() => {
    setWallet(connectedWallet);
  }, []);

  const handleDisconnect = useCallback(() => {
    setWallet(initialWallet);
  }, []);

  const handleMethodSelect = useCallback((methodId: string) => {
    setSelectedMethodId(methodId);
    setFormValues(initialFormValues);
    setResult({ status: 'idle' });
  }, []);

  const handleSimulate = useCallback(async () => {
    setResult({ status: 'loading' });

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const simulationResult = getSimulationResult(selectedMethodId, formValues);
    setResult(simulationResult);

    setHasSimulated(true);
    setHasExecuted(true);

    try {
      localStorage.setItem('agirails-has-simulated', 'true');
      localStorage.setItem('agirails-has-executed', 'true');
    } catch {
      // Ignore
    }
  }, [formValues, selectedMethodId]);

  const handleRetry = useCallback(() => {
    setResult({ status: 'idle' });
  }, []);

  const handleChecklistReset = useCallback(() => {
    setHasSimulated(false);
    setHasExecuted(false);
    try {
      localStorage.removeItem('agirails-has-simulated');
      localStorage.removeItem('agirails-has-executed');
    } catch {
      // Ignore
    }
  }, []);

  return (
    <div className="pg-container">
      <Header wallet={wallet} onConnect={handleOpenWalletModal} onDisconnect={handleDisconnect} />

      <WalletModal
        isOpen={showWalletModal}
        onClose={handleCloseWalletModal}
        onConnect={handleConnect}
      />

      <div className="pg-layout">
        <MethodSelector selectedMethod={selectedMethodId} onSelectMethod={handleMethodSelect} />

        <main className="pg-main">
          <GettingStartedChecklist
            wallet={wallet}
            hasSimulated={hasSimulated}
            hasExecuted={hasExecuted}
            onReset={handleChecklistReset}
          />

          <div className="pg-editor-panel">
            <ParameterForm
              method={selectedMethod}
              values={formValues}
              onChange={setFormValues}
              onSimulate={handleSimulate}
              isSimulating={result.status === 'loading'}
            />
            <CodeDisplay methodId={selectedMethodId} values={formValues} />
          </div>

          <ResultPanel result={result} onRetry={handleRetry} formAmount={formValues.amount} />
        </main>
      </div>
    </div>
  );
}
