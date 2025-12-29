import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Layout from '@theme/Layout';
import CodeBlock from '@theme/CodeBlock';
import Header from '../components/playground/Header';
import WalletModal from '../components/playground/WalletModal';
import { WalletState } from '../types/playground';
import {
  calculatePrice as calculatePriceLevel1,
  evaluateJob as evaluateJobLevel1,
  type AgentConfig,
} from '../lib/sdkLevel1';
import { usePlaygroundContext, PlaygroundContext } from '../hooks/usePlaygroundContext';
import '../components/playground/playground.css';

interface SimulatedJob {
  id: string;
  service: string;
  budget: number;
  units: number;
  timestamp: Date;
  decision: 'pending' | 'accepted' | 'rejected';
  status: 'incoming' | 'evaluating' | 'in_progress' | 'completed' | 'rejected';
  reason?: string;
  calculation?: {
    cost: number;
    price: number;
    profit: number;
    marginActual: number;
  };
}

interface AgentBalance {
  available: number;  // USDC ready to use
  locked: number;     // In active jobs (escrow)
  pending: number;    // Awaiting evaluation
  activeJobs: number; // Count of in-progress jobs
}

interface AgentStats {
  accepted: number;
  rejected: number;
  totalEarned: number;
  earningsHistory: number[];  // Last 10 earnings for trend
}

export default function StandardApiPage(): JSX.Element {
  // Agent configuration state
  const [config, setConfig] = useState<AgentConfig>({
    name: 'TranslatorBot',
    autoAccept: true,
    concurrency: 5,
    pricing: {
      baseCost: 0.50,
      perUnitCost: 0.002,
      unitType: 'word',
      marginPercent: 40,
    },
    filter: {
      minBudget: 1.00,
      maxBudget: 100.00,
    },
  });

  // Simulation state
  const [isSimulating, setIsSimulating] = useState(false);
  const [jobs, setJobs] = useState<SimulatedJob[]>([]);
  const [stats, setStats] = useState<AgentStats>({
    accepted: 0,
    rejected: 0,
    totalEarned: 0,
    earningsHistory: [],
  });
  const [balance, setBalance] = useState<AgentBalance>({
    available: 100.00,
    locked: 0,
    pending: 0,
    activeJobs: 0,
  });
  const simulationRef = useRef<number | null>(null);
  const jobProcessingRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Wallet modal
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const wallet: WalletState = {
    connected: isConnected,
    address: isConnected ? '0xAgent...7890' : '',
    ethBalance: '0.5 ETH',
    usdcBalance: '1,000.00 USDC',
    network: 'Mock Mode',
  };

  // Level 1 pricing (shared, SDK-like)
  const calculatePrice = useCallback(
    (units: number) => calculatePriceLevel1(config.pricing, units),
    [config.pricing]
  );

  // Evaluate job against configuration
  const evaluateJob = useCallback(
    (budget: number, units: number) => evaluateJobLevel1(config, budget, units),
    [config]
  );

  // Process a job through its lifecycle
  const processJob = useCallback((jobId: string, budget: number, accept: boolean, reason: string) => {
    if (!accept) {
      // Rejected immediately - remove from pending
      setBalance(prev => ({ ...prev, pending: Math.max(0, prev.pending - budget) }));
      setJobs(prev => prev.map(j =>
        j.id === jobId ? { ...j, status: 'rejected' as const, decision: 'rejected' as const, reason } : j
      ));
      setStats(prev => ({ ...prev, rejected: prev.rejected + 1 }));
      return;
    }

    // Accepted - move from pending to locked
    setBalance(prev => ({
      ...prev,
      pending: Math.max(0, prev.pending - budget),
      locked: prev.locked + budget,
      activeJobs: prev.activeJobs + 1,
    }));
    setJobs(prev => prev.map(j =>
      j.id === jobId ? { ...j, status: 'in_progress' as const, decision: 'accepted' as const, reason } : j
    ));

    // Simulate job completion after 2-4 seconds
    const completionTime = 2000 + Math.random() * 2000;
    const timeout = setTimeout(() => {
      // Job completed - move from locked to available (with earnings)
      setBalance(prev => ({
        ...prev,
        locked: Math.max(0, prev.locked - budget),
        available: prev.available + budget,
        activeJobs: Math.max(0, prev.activeJobs - 1),
      }));
      setJobs(prev => prev.map(j =>
        j.id === jobId ? { ...j, status: 'completed' as const } : j
      ));
      setStats(prev => ({
        ...prev,
        accepted: prev.accepted + 1,
        totalEarned: prev.totalEarned + budget,
        earningsHistory: [...prev.earningsHistory.slice(-9), budget],
      }));
      jobProcessingRef.current.delete(jobId);
    }, completionTime);

    jobProcessingRef.current.set(jobId, timeout);
  }, []);

  // Generate a random job
  const generateJob = useCallback((): SimulatedJob => {
    const units = Math.floor(Math.random() * 500) + 50; // 50-550 words
    const budget = Math.random() * 15 + 0.5; // $0.50 - $15.50

    const { accept, reason, calculation } = evaluateJob(budget, units);
    const roundedBudget = Math.round(budget * 100) / 100;

    return {
      id: `job_${Date.now().toString(36)}`,
      service: 'translate',
      budget: roundedBudget,
      units,
      timestamp: new Date(),
      decision: 'pending',
      status: 'incoming',
      reason,
      calculation,
    };
  }, [evaluateJob]);

  // Start simulation
  const startSimulation = useCallback(() => {
    if (isSimulating) return;
    setIsSimulating(true);
    setJobs([]);
    setStats({
      accepted: 0,
      rejected: 0,
      totalEarned: 0,
      earningsHistory: [],
    });
    setBalance({ available: 100.00, locked: 0, pending: 0, activeJobs: 0 });

    simulationRef.current = window.setInterval(() => {
      const job = generateJob();
      const { accept, reason } = evaluateJob(job.budget, job.units);

      // Add job as incoming, add to pending balance
      setJobs(prev => [{ ...job, status: 'evaluating' }, ...prev].slice(0, 30));
      setBalance(prev => ({ ...prev, pending: prev.pending + job.budget }));

      // After brief evaluation delay, process the job
      setTimeout(() => {
        processJob(job.id, job.budget, accept, reason);
      }, 500);
    }, 2500);
  }, [isSimulating, generateJob, evaluateJob, processJob]);

  // Stop simulation
  const stopSimulation = useCallback(() => {
    setIsSimulating(false);
    if (simulationRef.current) {
      clearInterval(simulationRef.current);
      simulationRef.current = null;
    }
    // Clear all pending job timeouts
    jobProcessingRef.current.forEach(timeout => clearTimeout(timeout));
    jobProcessingRef.current.clear();
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (simulationRef.current) {
        clearInterval(simulationRef.current);
      }
      jobProcessingRef.current.forEach(timeout => clearTimeout(timeout));
      jobProcessingRef.current.clear();
    };
  }, []);

  // Generate code based on config
  const generatedCode = `import { Agent } from '@agirails/sdk';

const agent = new Agent({
  name: '${config.name}',
  network: 'mock', // simulated, no real funds
  behavior: {
    autoAccept: ${config.autoAccept},
    concurrency: ${config.concurrency},
  },
});

agent.provide({
  name: 'translate',
  pricing: {
    cost: {
      base: ${config.pricing.baseCost.toFixed(2)}, // USDC
      perUnit: {
        unit: '${config.pricing.unitType}',
        rate: ${config.pricing.perUnitCost.toFixed(4)} // USDC per unit
      },
    },
    margin: ${(config.pricing.marginPercent / 100).toFixed(2)}, // profit margin (0-1)
  },
  filter: {
    minBudget: ${config.filter.minBudget.toFixed(2)}, // USDC
    maxBudget: ${config.filter.maxBudget.toFixed(2)}, // USDC
  },
}, async (job, ctx) => {
  ctx.progress(50, 'Translating...');
  const result = await translateText(job.input);
  return { translated: result };
});

await agent.start();`;

  // Build playground context for AI Assistant
  const playgroundContext = useMemo((): PlaygroundContext => {
    const recentJobs = jobs.slice(0, 5);
    const acceptRate = stats.accepted + stats.rejected > 0
      ? Math.round((stats.accepted / (stats.accepted + stats.rejected)) * 100)
      : 0;

    return {
      type: 'standard-api',
      title: 'Standard API Playground (Level 1)',
      description: 'Configure agent pricing, filters, and behavior - see jobs processed in real-time',
      summary: isSimulating
        ? `Simulation running: ${stats.accepted} accepted, ${stats.rejected} rejected (${acceptRate}% rate), $${stats.totalEarned.toFixed(2)} earned`
        : `Agent "${config.name}" configured - ${balance.activeJobs} active jobs, $${balance.available.toFixed(2)} available`,
      data: {
        agentName: config.name,
        autoAccept: config.autoAccept,
        concurrency: config.concurrency,
        pricing: {
          baseCost: `$${config.pricing.baseCost.toFixed(2)}`,
          perWordCost: `$${config.pricing.perUnitCost.toFixed(4)}`,
          marginPercent: `${config.pricing.marginPercent}%`,
        },
        filter: {
          minBudget: `$${config.filter.minBudget.toFixed(2)}`,
          maxBudget: `$${config.filter.maxBudget.toFixed(2)}`,
        },
        stats: {
          accepted: stats.accepted,
          rejected: stats.rejected,
          totalEarned: `$${stats.totalEarned.toFixed(2)}`,
          acceptRate: `${acceptRate}%`,
        },
        balance: {
          available: `$${balance.available.toFixed(2)}`,
          locked: `$${balance.locked.toFixed(2)}`,
          pending: `$${balance.pending.toFixed(2)}`,
          activeJobs: balance.activeJobs,
        },
        recentJobs: recentJobs.map(j => ({
          status: j.status,
          budget: `$${j.budget.toFixed(2)}`,
          units: j.units,
          reason: j.reason,
        })),
        isSimulating,
      },
      generatedCode,
    };
  }, [config, stats, balance, jobs, isSimulating, generatedCode]);

  // Emit context for AI Assistant
  usePlaygroundContext(playgroundContext);

  return (
    <Layout
      title="Standard API"
      description="Learn to configure AI agents with pricing and filtering"
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
            onDisconnect={() => setIsConnected(false)}
            currentLevel="standard-api"
          />

          <WalletModal
            isOpen={showWalletModal}
            onClose={() => setShowWalletModal(false)}
            onConnect={() => { setIsConnected(true); setShowWalletModal(false); }}
          />

          {/* Main Content */}
          <div className="pg-layout">
            {/* Left Panel - Configuration */}
            <div className="pg-sidebar" style={{ width: '340px', padding: '1.5rem', overflowY: 'auto' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--pg-text)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                Agent Configuration
              </h3>

              {/* Agent Name */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--pg-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Agent Name
                </label>
                <input
                  type="text"
                  value={config.name}
                  onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    background: 'var(--pg-secondary)',
                    border: '1px solid var(--pg-border)',
                    borderRadius: '6px',
                    color: 'var(--pg-text)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              {/* Behavior */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--pg-text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Behavior
                </label>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--pg-text)' }}>Auto-accept jobs</span>
                  <button
                    onClick={() => setConfig(prev => ({ ...prev, autoAccept: !prev.autoAccept }))}
                    style={{
                      width: '44px',
                      height: '24px',
                      borderRadius: '12px',
                      border: 'none',
                      background: config.autoAccept ? 'var(--pg-primary)' : 'var(--pg-muted)',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background 0.2s',
                    }}
                  >
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: 'white',
                      position: 'absolute',
                      top: '3px',
                      left: config.autoAccept ? '23px' : '3px',
                      transition: 'left 0.2s',
                    }} />
                  </button>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--pg-text)' }}>Concurrency</span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--pg-primary)', fontFamily: 'var(--pg-font-mono)' }}>{config.concurrency}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={config.concurrency}
                    onChange={(e) => setConfig(prev => ({ ...prev, concurrency: parseInt(e.target.value) }))}
                    style={{ width: '100%', accentColor: 'var(--pg-primary)' }}
                  />
                </div>
              </div>

              {/* Pricing Strategy */}
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--pg-secondary)', borderRadius: '8px', border: '1px solid var(--pg-border)' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--pg-primary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                  💰 Pricing Strategy
                </label>

                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--pg-text)' }}>Base Cost</span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--pg-success)', fontFamily: 'var(--pg-font-mono)' }}>${config.pricing.baseCost.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={config.pricing.baseCost}
                    onChange={(e) => setConfig(prev => ({ ...prev, pricing: { ...prev.pricing, baseCost: parseFloat(e.target.value) } }))}
                    style={{ width: '100%', accentColor: 'var(--pg-success)' }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--pg-text)' }}>Per-word Cost</span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--pg-success)', fontFamily: 'var(--pg-font-mono)' }}>${config.pricing.perUnitCost.toFixed(4)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.01"
                    step="0.0005"
                    value={config.pricing.perUnitCost}
                    onChange={(e) => setConfig(prev => ({ ...prev, pricing: { ...prev.pricing, perUnitCost: parseFloat(e.target.value) } }))}
                    style={{ width: '100%', accentColor: 'var(--pg-success)' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--pg-text)' }}>Target Margin</span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--pg-warning)', fontFamily: 'var(--pg-font-mono)' }}>{config.pricing.marginPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={config.pricing.marginPercent}
                    onChange={(e) => setConfig(prev => ({ ...prev, pricing: { ...prev.pricing, marginPercent: parseInt(e.target.value) } }))}
                    style={{ width: '100%', accentColor: 'var(--pg-warning)' }}
                  />
                </div>

                {/* Live calculation preview */}
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--pg-bg)', borderRadius: '6px', fontSize: '0.75rem' }}>
                  <div style={{ color: 'var(--pg-text-muted)', marginBottom: '0.5rem' }}>Example: 200 words</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--pg-text)' }}>
                    <span>Cost:</span>
                    <span style={{ fontFamily: 'var(--pg-font-mono)' }}>${calculatePrice(200).cost.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--pg-success)' }}>
                    <span>Min Price:</span>
                    <span style={{ fontFamily: 'var(--pg-font-mono)' }}>${calculatePrice(200).price.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--pg-warning)' }}>
                    <span>Profit:</span>
                    <span style={{ fontFamily: 'var(--pg-font-mono)' }}>${calculatePrice(200).profit.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Service Filter */}
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--pg-secondary)', borderRadius: '8px', border: '1px solid var(--pg-border)' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--pg-accent)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                  🎯 Service Filter
                </label>

                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--pg-text)' }}>Min Budget</span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--pg-text)', fontFamily: 'var(--pg-font-mono)' }}>${config.filter.minBudget.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={config.filter.minBudget}
                    onChange={(e) => setConfig(prev => ({ ...prev, filter: { ...prev.filter, minBudget: parseFloat(e.target.value) } }))}
                    style={{ width: '100%', accentColor: 'var(--pg-accent)' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--pg-text)' }}>Max Budget</span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--pg-text)', fontFamily: 'var(--pg-font-mono)' }}>${config.filter.maxBudget.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="500"
                    step="10"
                    value={config.filter.maxBudget}
                    onChange={(e) => setConfig(prev => ({ ...prev, filter: { ...prev.filter, maxBudget: parseFloat(e.target.value) } }))}
                    style={{ width: '100%', accentColor: 'var(--pg-accent)' }}
                  />
                </div>
              </div>
            </div>

            {/* Right Panel - Simulation + Code */}
            <div className="pg-main" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Balance Visualization */}
              <div className="pg-result" style={{ padding: '1rem', background: 'linear-gradient(135deg, var(--pg-card) 0%, var(--pg-secondary) 100%)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--pg-primary)" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--pg-text)' }}>Agent Balance</span>
                  {balance.activeJobs > 0 && (
                    <span style={{ fontSize: '0.625rem', padding: '0.125rem 0.5rem', background: 'var(--pg-primary)', color: 'var(--pg-bg)', borderRadius: '10px', marginLeft: 'auto' }}>
                      {balance.activeJobs} active job{balance.activeJobs > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Balance Flow Visualization */}
                <div style={{ display: 'flex', alignItems: 'stretch', gap: '0.5rem' }}>
                  {/* Pending */}
                  <div style={{ flex: 1, padding: '0.75rem', background: 'var(--pg-bg)', borderRadius: '8px', border: '1px solid var(--pg-border)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: `${Math.min(100, (balance.pending / 50) * 100)}%`,
                      background: 'rgba(255, 145, 0, 0.1)',
                      transition: 'height 0.3s ease',
                    }} />
                    <div style={{ position: 'relative' }}>
                      <div style={{ fontSize: '0.625rem', color: 'var(--pg-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Pending</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--pg-warning)', fontFamily: 'var(--pg-font-mono)' }}>
                        ${balance.pending.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.625rem', color: 'var(--pg-text-muted)', marginTop: '0.25rem' }}>Evaluating...</div>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div style={{ display: 'flex', alignItems: 'center', color: 'var(--pg-text-muted)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>

                  {/* Locked */}
                  <div style={{ flex: 1, padding: '0.75rem', background: 'var(--pg-bg)', borderRadius: '8px', border: '1px solid var(--pg-border)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: `${Math.min(100, (balance.locked / 50) * 100)}%`,
                      background: 'rgba(0, 82, 255, 0.1)',
                      transition: 'height 0.3s ease',
                    }} />
                    <div style={{ position: 'relative' }}>
                      <div style={{ fontSize: '0.625rem', color: 'var(--pg-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Locked</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--pg-accent)', fontFamily: 'var(--pg-font-mono)' }}>
                        ${balance.locked.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.625rem', color: 'var(--pg-text-muted)', marginTop: '0.25rem' }}>In escrow</div>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div style={{ display: 'flex', alignItems: 'center', color: 'var(--pg-text-muted)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>

                  {/* Available */}
                  <div style={{ flex: 1.5, padding: '0.75rem', background: 'var(--pg-bg)', borderRadius: '8px', border: '2px solid var(--pg-success)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: `${Math.min(100, (balance.available / 200) * 100)}%`,
                      background: 'rgba(0, 200, 83, 0.1)',
                      transition: 'height 0.3s ease',
                    }} />
                    <div style={{ position: 'relative' }}>
                      <div style={{ fontSize: '0.625rem', color: 'var(--pg-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Available</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--pg-success)', fontFamily: 'var(--pg-font-mono)' }}>
                        ${balance.available.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.625rem', color: 'var(--pg-success)', marginTop: '0.25rem' }}>Ready to use</div>
                    </div>
                  </div>
                </div>

                {/* Flow explanation */}
                <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'var(--pg-bg)', borderRadius: '6px', fontSize: '0.6875rem', color: 'var(--pg-text-muted)' }}>
                  <span style={{ color: 'var(--pg-warning)' }}>Pending</span> → Job arrives, awaiting evaluation →{' '}
                  <span style={{ color: 'var(--pg-accent)' }}>Locked</span> → Accepted, funds in escrow →{' '}
                  <span style={{ color: 'var(--pg-success)' }}>Available</span> → Job complete, payment received
                </div>
              </div>

              {/* Stats Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                <div className="pg-result" style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--pg-text-muted)', marginBottom: '0.25rem' }}>Jobs Received</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--pg-text)' }}>{stats.accepted + stats.rejected}</div>
                </div>
                <div className="pg-result" style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--pg-text-muted)', marginBottom: '0.25rem' }}>Completed</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--pg-success)' }}>{stats.accepted}</div>
                </div>
                <div className="pg-result" style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--pg-text-muted)', marginBottom: '0.25rem' }}>Rejected</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--pg-warning)' }}>{stats.rejected}</div>
                </div>
                <div className="pg-result" style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--pg-text-muted)', marginBottom: '0.25rem' }}>Total Earned</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--pg-success)' }}>${stats.totalEarned.toFixed(2)}</div>
                </div>
              </div>

              {/* Earnings Trend */}
              {stats.earningsHistory.length > 1 && (
                <div className="pg-result" style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--pg-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                    Earnings Trend (Last 10 Jobs)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '40px' }}>
                    {stats.earningsHistory.map((earning, idx) => {
                      const maxEarning = Math.max(...stats.earningsHistory);
                      const height = (earning / maxEarning) * 100;
                      return (
                        <div
                          key={idx}
                          style={{
                            flex: 1,
                            height: `${height}%`,
                            minHeight: '4px',
                            background: `linear-gradient(to top, var(--pg-success), rgba(0, 200, 83, 0.4))`,
                            borderRadius: '2px 2px 0 0',
                            transition: 'height 0.3s ease',
                          }}
                          title={`$${earning.toFixed(2)}`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Simulation Control */}
              <div className="pg-result" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: isSimulating ? 'var(--pg-success)' : 'var(--pg-text-muted)',
                    boxShadow: isSimulating ? '0 0 10px var(--pg-success)' : 'none',
                  }} />
                  <span style={{ fontWeight: 500, color: 'var(--pg-text)' }}>
                    {isSimulating ? 'Simulating incoming jobs...' : 'Simulation stopped'}
                  </span>
                </div>
                <button
                  className={`pg-btn ${isSimulating ? 'pg-btn-secondary' : 'pg-btn-primary'}`}
                  onClick={isSimulating ? stopSimulation : startSimulation}
                >
                  {isSimulating ? 'Stop' : 'Start Simulation'}
                </button>
              </div>

              {/* Job Stream */}
              <div className="pg-result" style={{ flex: 1, minHeight: '200px', maxHeight: '300px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--pg-border)' }}>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--pg-text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Incoming Jobs
                  </h4>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                  {jobs.length === 0 ? (
                    <div className="pg-empty-state" style={{ padding: '2rem' }}>
                      <p className="pg-empty-title">No jobs yet</p>
                      <p className="pg-empty-desc">Start simulation to see how your config handles jobs</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {jobs.map(job => {
                        const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
                          evaluating: { color: 'var(--pg-warning)', bg: 'rgba(255, 145, 0, 0.2)', label: 'Evaluating...' },
                          in_progress: { color: 'var(--pg-accent)', bg: 'rgba(0, 82, 255, 0.2)', label: 'In Progress' },
                          completed: { color: 'var(--pg-success)', bg: 'rgba(0, 200, 83, 0.2)', label: 'Completed' },
                          rejected: { color: 'var(--pg-warning)', bg: 'rgba(255, 145, 0, 0.2)', label: 'Rejected' },
                          incoming: { color: 'var(--pg-text-muted)', bg: 'rgba(136, 136, 136, 0.2)', label: 'Incoming' },
                        };
                        const statusCfg = statusConfig[job.status] || statusConfig.incoming;

                        return (
                          <div
                            key={job.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '1rem',
                              padding: '0.75rem',
                              background: 'var(--pg-secondary)',
                              borderRadius: '6px',
                              borderLeft: `3px solid ${statusCfg.color}`,
                              opacity: job.status === 'completed' ? 0.7 : 1,
                              transition: 'opacity 0.3s ease',
                            }}
                          >
                            <div style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: statusCfg.bg,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              fontSize: '0.875rem',
                              animation: job.status === 'in_progress' ? 'spin 2s linear infinite' : job.status === 'evaluating' ? 'pulse 1s ease-in-out infinite' : 'none',
                            }}>
                              {job.status === 'completed' ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--pg-success)" strokeWidth="3">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              ) : job.status === 'rejected' ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--pg-warning)" strokeWidth="3">
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                              ) : job.status === 'in_progress' ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--pg-accent)" strokeWidth="2">
                                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                                </svg>
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={statusCfg.color} strokeWidth="2">
                                  <circle cx="12" cy="12" r="10" />
                                  <path d="M12 6v6l4 2" />
                                </svg>
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--pg-text)' }}>{job.service}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--pg-text-muted)' }}>{job.units} words</span>
                                <span style={{
                                  fontSize: '0.5625rem',
                                  padding: '0.125rem 0.375rem',
                                  background: statusCfg.bg,
                                  color: statusCfg.color,
                                  borderRadius: '4px',
                                  textTransform: 'uppercase',
                                  fontWeight: 600,
                                  letterSpacing: '0.03em',
                                }}>
                                  {statusCfg.label}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: statusCfg.color }}>
                                {job.reason}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--pg-text)', fontFamily: 'var(--pg-font-mono)' }}>
                                ${job.budget.toFixed(2)}
                              </div>
                              <div style={{ fontSize: '0.625rem', color: 'var(--pg-text-muted)' }}>
                                budget
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Generated Code */}
              <div className="pg-result" style={{ flex: 1 }}>
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--pg-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--pg-text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Generated Code
                  </h4>
                  <button
                    className="pg-btn pg-btn-secondary"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                    onClick={() => navigator.clipboard.writeText(generatedCode)}
                  >
                    Copy
                  </button>
                </div>
                <div className="standard-code-block" style={{ maxHeight: '300px', overflow: 'auto' }}>
                  <CodeBlock language="typescript">{generatedCode}</CodeBlock>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
