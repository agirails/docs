import { useEffect, useState, useCallback, useMemo } from 'react';
import Layout from '@theme/Layout';
import CodeBlock from '@theme/CodeBlock';
import Header from '../components/playground/Header';
import WalletModal from '../components/playground/WalletModal';
import { useACTPClient } from '../hooks/useACTPClient';
import { resetExecutor } from '../lib/methodExecutor';
import { provide, request, type RequestStatus } from '../lib/sdkLevel0';
import { WalletState } from '../types/playground';
import { usePlaygroundContext, PlaygroundContext } from '../hooks/usePlaygroundContext';
import '../components/playground/playground.css';

interface ExecutionStep {
  id: number;
  label: string;
  status: 'pending' | 'running' | 'done';
  result?: string;
}

export default function PlaygroundPage(): JSX.Element {
  const { isInitialized, requesterAddress, providerAddress } = useACTPClient();
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<ExecutionStep[]>([]);
  const [txId, setTxId] = useState<string | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Simple API (Level 1) inputs for code generation
  const [serviceName, setServiceName] = useState('translate');
  const [budget, setBudget] = useState(10);
  const [providerStrategy, setProviderStrategy] = useState<'any' | 'best' | 'cheapest' | 'specific'>('any');
  const [network, setNetwork] = useState<'mock' | 'testnet' | 'mainnet'>('mock');
  const [minBudget, setMinBudget] = useState(1);
  const [maxBudget, setMaxBudget] = useState(100);
  const [autoAccept, setAutoAccept] = useState(true);

  // Create wallet state from SDK
  const wallet: WalletState = {
    connected: isInitialized,
    address: requesterAddress,
    ethBalance: '0.5 ETH',
    usdcBalance: '10,000.00 USDC',
    network: 'Mock Mode',
  };

  const requestCode = `import { request } from '@agirails/sdk';

// Request a service with payload
const { result } = await request('${serviceName}', {
  input: {
    text: 'Hello, world!',
    from: 'en',
    to: 'de'
  },
  budget: ${Number.isFinite(budget) ? budget : 10}, // USDC
  network: '${network}', // mock = simulated, no real funds
  provider: ${providerStrategy === 'specific' ? `'${providerAddress || '0x...'}'` : `'${providerStrategy}'`}, // 'any' = first available provider
  onProgress: (status) => {
    console.log(\`\${status.state}: \${status.progress}%\`);
  }
});`;

  const provideCode = `import { provide } from '@agirails/sdk';

// Provide a service - receive jobs automatically
const provider = provide('${serviceName}', async (job) => {
  const { text, from, to } = job.input;
  const translated = await translateText(text, from, to);
  return { translated };
}, {
  network: '${network}', // mock = simulated, no real funds
  filter: { minBudget: ${minBudget.toFixed(2)}, maxBudget: ${maxBudget.toFixed(2)} }, // USDC
  autoAccept: ${autoAccept}, // auto-accept jobs matching filter
});

provider.on('payment:received', (amount) => {
  console.log(\`Earned \${amount} USDC!\`);
});`;

  // Build playground context for AI Assistant
  const playgroundContext = useMemo((): PlaygroundContext => {
    const currentStepLabel = steps.find(s => s.status === 'running')?.label ||
                             (currentStep >= 7 ? 'Complete' : 'Not started');
    const completedSteps = steps.filter(s => s.status === 'done').length;

    return {
      type: 'simple-api',
      title: 'Simple API Playground (Level 0)',
      description: 'Basic request/provide pattern - the simplest way to use AGIRAILS SDK',
      summary: isRunning
        ? `Running demo: ${currentStepLabel} (${completedSteps}/${steps.length} steps complete)`
        : currentStep >= 7
          ? `Demo complete! Transaction ${txId ? `ID: ${txId.slice(0, 10)}...` : 'finished'}`
          : 'Ready to run demo - shows requester→provider flow with escrow',
      data: {
        serviceName,
        budget: `${budget} USDC`,
        network,
        providerStrategy,
        autoAccept,
        isRunning,
        currentStep,
        stepsCompleted: completedSteps,
        txId: txId || 'none',
      },
      generatedCode: requestCode,
    };
  }, [serviceName, budget, network, providerStrategy, autoAccept, isRunning, currentStep, steps, txId, requestCode]);

  // Emit context for AI Assistant
  usePlaygroundContext(playgroundContext);

  // Register a real Simple API provider for this page (browser mock)
  useEffect(() => {
    const p = provide(serviceName, async (job) => {
      // Minimal deterministic "provider": just echoes a fake translation
      const input = job.input as any;
      const text = typeof input?.text === 'string' ? input.text : JSON.stringify(job.input);
      const to = typeof input?.to === 'string' ? input.to : 'de';
      return { translated: `[${String(to).toUpperCase()}] ${text}` };
    }, {
      filter: { minBudget, maxBudget },
      autoAccept,
      network,
    });
    return () => p.stop();
  }, [serviceName, minBudget, maxBudget, autoAccept, network]);

  const updateStep = useCallback((id: number, patch: Partial<ExecutionStep>) => {
    setSteps((s) => s.map((step) => (step.id === id ? { ...step, ...patch } : step)));
  }, []);

  const runDemo = useCallback(async () => {
    if (isRunning || !isInitialized) return;

    setIsRunning(true);
    setTxId(null);
    setCurrentStep(0);
    setSteps([
      { id: 1, label: 'Requester sends request', status: 'pending' },
      { id: 2, label: 'Escrow locks 10 USDC', status: 'pending' },
      { id: 3, label: 'Provider receives job', status: 'pending' },
      { id: 4, label: 'Provider processes', status: 'pending' },
      { id: 5, label: 'Result delivered', status: 'pending' },
      { id: 6, label: 'Payment released', status: 'pending' },
    ]);

    // Step 1: Requester sends request
    setCurrentStep(1);
    try {
      updateStep(1, { status: 'running' });

      const onProgress = (p: RequestStatus) => {
        // Map protocol states to our demo steps
        if (p.state === 'initiated') {
          setCurrentStep(1);
          updateStep(1, { status: 'done' });
          setCurrentStep(2);
          updateStep(2, { status: 'running' });
        } else if (p.state === 'committed') {
          updateStep(2, { status: 'done' });
          setCurrentStep(3);
          updateStep(3, { status: 'running' });
          // provider "receives job" instantly in this mock
          updateStep(3, { status: 'done' });
          setCurrentStep(4);
          updateStep(4, { status: 'running' });
        } else if (p.state === 'in_progress') {
          // keep step 4 running
        } else if (p.state === 'delivered') {
          updateStep(4, { status: 'done' });
          setCurrentStep(5);
          updateStep(5, { status: 'running' });
        } else if (p.state === 'settled') {
          updateStep(5, { status: 'done' });
          setCurrentStep(6);
          updateStep(6, { status: 'running' });
        }
      };

      const res = await request('translate', {
        input: { text: 'Hello, world!', from: 'en', to: 'de' },
        budget,
        network,
        provider: providerStrategy === 'specific' ? providerAddress : providerStrategy,
        onProgress,
      });

      setTxId(res.txId);
      updateStep(6, { status: 'done', result: res.result?.translated ? String(res.result.translated) : 'OK' });
    } catch (err) {
      updateStep(1, { status: 'done' });
      updateStep(2, { status: 'done', result: 'Error' });
      setIsRunning(false);
      return;
    }

    setCurrentStep(7); // Complete
    setIsRunning(false);
  }, [isRunning, isInitialized, providerAddress, updateStep]);

  const copyRequesterCode = useCallback(() => {
    navigator.clipboard.writeText(requestCode);
  }, [requestCode]);

  const copyProviderCode = useCallback(() => {
    navigator.clipboard.writeText(provideCode);
  }, [provideCode]);

  const handleDisconnect = useCallback(async () => {
    await resetExecutor();
  }, []);

  return (
    <Layout
      title="SDK Playground"
      description="Interactive ACTP protocol playground"
    >
      <main style={{
        width: '100%',
        maxWidth: '100%',
        padding: '0',
        background: 'var(--pg-bg)',
        minHeight: 'calc(100vh - 60px)'
      }}>
        <div className="pg-container">
          <Header
            wallet={wallet}
            onConnect={() => setShowWalletModal(true)}
            onDisconnect={handleDisconnect}
            currentLevel="simple-api"
          />

          <WalletModal
            isOpen={showWalletModal}
            onClose={() => setShowWalletModal(false)}
            onConnect={() => setShowWalletModal(false)}
          />

          {/* Main Content */}
          <div className="pg-main" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Hero */}
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--pg-text)' }}>
                Agent-to-Agent Transactions
              </h2>
              <p style={{ color: 'var(--pg-text-muted)', fontSize: '0.95rem' }}>
                Requester sends payload → Provider processes → Payment settles automatically
              </p>
            </div>

            {/* Run Demo Button - Centered */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <button
                className="pg-btn pg-btn-primary"
                onClick={runDemo}
                disabled={isRunning || !isInitialized}
                style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}
              >
                {isRunning ? (
                  <>
                    <div className="pg-spinner" style={{ width: '16px', height: '16px', marginRight: '0.5rem' }} />
                    Running...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '0.5rem' }}>
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                    Run Demo
                  </>
                )}
              </button>
            </div>

            {/* Three Column Layout: Requester | Flow | Provider */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px 1fr', gap: '1rem', alignItems: 'start' }}>

              {/* LEFT: Requester */}
              <div className="pg-result" style={{
                padding: '1rem',
                border: currentStep >= 1 && currentStep <= 2 ? '2px solid var(--pg-primary)' : '1px solid var(--pg-border)',
                transition: 'border-color 0.3s'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: currentStep >= 1 && currentStep <= 2 ? 'var(--pg-primary)' : 'var(--pg-text-muted)'
                    }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--pg-text)' }}>
                      Requester
                    </span>
                  </div>
                  <button className="pg-copy-btn" onClick={copyRequesterCode} style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}>
                    Copy
                  </button>
                </div>
                <div className="simple-code-block">
                  <CodeBlock language="typescript">{requestCode}</CodeBlock>
                </div>
              </div>

              {/* CENTER: Flow Visualization */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem 0' }}>
                {steps.length === 0 ? (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    height: '100%', color: 'var(--pg-text-muted)', textAlign: 'center', padding: '2rem 0'
                  }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '0.5rem', opacity: 0.5 }}>
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                    <span style={{ fontSize: '0.75rem' }}>Runs a simulated transaction. No wallet required.</span>
                  </div>
                ) : (
                  <>
                    {steps.map((step, index) => (
                      <div key={step.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                        {/* Step indicator */}
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: '28px', height: '28px', borderRadius: '50%',
                          background: step.status === 'done' ? 'var(--pg-success)' :
                                     step.status === 'running' ? 'var(--pg-primary)' : 'var(--pg-muted)',
                          color: step.status === 'pending' ? 'var(--pg-text-muted)' : 'var(--pg-bg)',
                          fontSize: '0.7rem', fontWeight: 600,
                          transition: 'all 0.3s'
                        }}>
                          {step.status === 'done' ? '✓' : step.status === 'running' ? '...' : step.id}
                        </div>
                        <span style={{
                          fontSize: '0.65rem',
                          color: step.status === 'pending' ? 'var(--pg-text-muted)' : 'var(--pg-text)',
                          textAlign: 'center',
                          marginTop: '0.25rem',
                          maxWidth: '100%'
                        }}>
                          {step.label}
                        </span>
                        {/* Connector line */}
                        {index < steps.length - 1 && (
                          <div style={{
                            width: '2px', height: '20px',
                            background: steps[index + 1].status !== 'pending' ? 'var(--pg-success)' : 'var(--pg-border)',
                            margin: '0.25rem 0',
                            transition: 'background 0.3s'
                          }} />
                        )}
                      </div>
                    ))}

                    {/* Result at bottom of flow */}
                    {currentStep >= 7 && txId && (
                      <div style={{
                        marginTop: '1rem', padding: '0.75rem',
                        background: 'var(--pg-state-settled-bg)',
                        borderRadius: '8px',
                        border: '1px solid var(--pg-success)',
                        width: '100%',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--pg-success)', fontWeight: 600, marginBottom: '0.25rem' }}>
                          ✓ Complete!
                        </div>
                        <code style={{ fontSize: '0.65rem', color: 'var(--pg-primary)' }}>
                          "Hallo, Welt!"
                        </code>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* RIGHT: Provider */}
              <div className="pg-result" style={{
                padding: '1rem',
                border: currentStep >= 3 && currentStep <= 5 ? '2px solid var(--pg-success)' : '1px solid var(--pg-border)',
                transition: 'border-color 0.3s'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: currentStep >= 3 && currentStep <= 5 ? 'var(--pg-success)' : 'var(--pg-text-muted)'
                    }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--pg-text)' }}>
                      Provider
                    </span>
                  </div>
                  <button className="pg-copy-btn" onClick={copyProviderCode} style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}>
                    Copy
                  </button>
                </div>
                <div className="simple-code-block">
                  <CodeBlock language="typescript">{provideCode}</CodeBlock>
                </div>
              </div>
            </div>

            {/* Bottom info */}
            <div style={{ marginTop: '2rem', textAlign: 'center', paddingBottom: '2rem' }}>
              <p style={{ color: 'var(--pg-text-muted)', fontSize: '0.85rem' }}>
                Want to customize parameters? Try <a href="/standard-api" style={{ color: 'var(--pg-primary)' }}>Standard API</a> or <a href="/advanced-api" style={{ color: 'var(--pg-primary)' }}>Advanced API</a>
              </p>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
