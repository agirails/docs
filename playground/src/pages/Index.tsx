import { useState, useCallback } from 'react';
import Header from '@/components/playground/Header';
import MethodSelector from '@/components/playground/MethodSelector';
import GettingStartedChecklist from '@/components/playground/GettingStartedChecklist';
import ParameterForm from '@/components/playground/ParameterForm';
import CodeDisplay from '@/components/playground/CodeDisplay';
import ResultPanel from '@/components/playground/ResultPanel';
import AIAssistantPanel from '@/components/playground/AIAssistantPanel';
import NetworkSwitchPrompt from '@/components/playground/NetworkSwitchPrompt';
import CompletionCelebration from '@/components/playground/CompletionCelebration';
import { showTransactionToast } from '@/components/playground/TransactionToast';
import { methods } from '@/data/methods';
import { getSimulationResult } from '@/lib/simulationResults';
import { WalletState, FormValues, SimulationResult } from '@/types/playground';

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

export default function Index() {
  const [wallet, setWallet] = useState<WalletState>(initialWallet);
  const [selectedMethodId, setSelectedMethodId] = useState('createTransaction');
  const [formValues, setFormValues] = useState<FormValues>(initialFormValues);
const [hasSimulated, setHasSimulated] = useState(() => {
    try {
      return localStorage.getItem('agirails-has-simulated') === 'true';
    } catch { return false; }
  });
  const [hasExecuted, setHasExecuted] = useState(() => {
    try {
      return localStorage.getItem('agirails-has-executed') === 'true';
    } catch { return false; }
  });
  const [result, setResult] = useState<SimulationResult>({ status: 'idle' });
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [showNetworkPrompt, setShowNetworkPrompt] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [lastTxHash, setLastTxHash] = useState('');

  const selectedMethod = methods.find(m => m.id === selectedMethodId) || methods[0];

  const handleConnect = useCallback((walletType: string) => {
    // Simulate wrong network scenario occasionally
    const simulateWrongNetwork = Math.random() > 0.7;
    if (simulateWrongNetwork) {
      setShowNetworkPrompt(true);
    }
    setWallet(connectedWallet);
  }, []);

  const handleDisconnect = useCallback(() => {
    setWallet(initialWallet);
  }, []);

  const handleNetworkSwitch = useCallback(() => {
    // Simulate network switch
    setWallet(prev => ({ ...prev, network: 'Base Sepolia' }));
  }, []);

  const handleMethodSelect = useCallback((methodId: string) => {
    setSelectedMethodId(methodId);
    setFormValues(initialFormValues);
    setResult({ status: 'idle' });
  }, []);

  const handleSimulate = useCallback(async () => {
    setResult({ status: 'loading' });
    
    const txHash = '0x7a3b1c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b';

    // Show signing toast
    showTransactionToast({ status: 'signing' });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Show pending toast
    showTransactionToast({ status: 'pending', txHash });
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Get dynamic simulation result based on method and form values
    const simulationResult = getSimulationResult(selectedMethodId, formValues);
    setResult(simulationResult);

    // Show success toast
    showTransactionToast({ status: 'success', txHash, blockNumber: 12345678 });
    
    setHasSimulated(true);
    setHasExecuted(true);
    setLastTxHash(txHash);
    try {
      localStorage.setItem('agirails-has-simulated', 'true');
      localStorage.setItem('agirails-has-executed', 'true');
    } catch {}

    // Show celebration on first simulation
    if (!hasExecuted) {
      setTimeout(() => {
        setShowCelebration(true);
      }, 1000);
    }
  }, [formValues, selectedMethodId, hasExecuted]);

  const handleRetry = useCallback(() => {
    setResult({ status: 'idle' });
  }, []);

  const handleAIMethodSelect = useCallback((methodId: string) => {
    setSelectedMethodId(methodId);
    setFormValues(initialFormValues);
    setResult({ status: 'idle' });
  }, []);

  const handleAIFillForm = useCallback((values: Record<string, string>) => {
    setFormValues(prev => ({ ...prev, ...values }));
  }, []);

  const handleChecklistReset = useCallback(() => {
    setHasSimulated(false);
    setHasExecuted(false);
    try {
      localStorage.removeItem('agirails-has-simulated');
      localStorage.removeItem('agirails-has-executed');
    } catch {}
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header 
        wallet={wallet}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />

      <div className="flex-1 flex overflow-hidden">
        <MethodSelector 
          selectedMethod={selectedMethodId}
          onSelectMethod={handleMethodSelect}
        />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <GettingStartedChecklist 
            wallet={wallet}
            hasSimulated={hasSimulated}
            hasExecuted={hasExecuted}
            onReset={handleChecklistReset}
          />

          <div className="card-surface flex min-h-[400px]">
            <ParameterForm
              method={selectedMethod}
              values={formValues}
              onChange={setFormValues}
              onSimulate={handleSimulate}
              isSimulating={result.status === 'loading'}
            />
            <CodeDisplay 
              methodId={selectedMethodId}
              values={formValues}
            />
          </div>

          <ResultPanel 
            result={result}
            onRetry={handleRetry}
            formAmount={formValues.amount}
          />
        </main>
      </div>

      {/* AI Assistant */}
      <AIAssistantPanel 
        isOpen={isAIOpen}
        onToggle={() => setIsAIOpen(!isAIOpen)}
        onMethodSelect={handleAIMethodSelect}
        onFillForm={handleAIFillForm}
      />

      {/* Network Switch Prompt */}
      <NetworkSwitchPrompt
        open={showNetworkPrompt}
        onOpenChange={setShowNetworkPrompt}
        currentNetwork="Ethereum Mainnet"
        targetNetwork="Base Sepolia"
        onSwitch={handleNetworkSwitch}
      />

      {/* Completion Celebration */}
      <CompletionCelebration
        open={showCelebration}
        onOpenChange={setShowCelebration}
        txHash={lastTxHash}
      />
    </div>
  );
}
