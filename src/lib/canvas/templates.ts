/* ============================================
   AGIRAILS Canvas - Agent Templates
   ============================================ */

import { Agent, AgentType, generateId, AgentTemplate as BaseAgentTemplate, AgentPosition } from './types';

/**
 * Extended Agent Template with initial balance
 */
export interface ExtendedAgentTemplate extends BaseAgentTemplate {
  initialBalanceMicro: number;
}

/**
 * Built-in Agent Templates
 */
export const AGENT_TEMPLATES: Record<string, ExtendedAgentTemplate> = {
  requester: {
    id: 'requester',
    name: 'Requester Agent',
    description: 'Initiates transactions and pays for services',
    type: 'requester' as const,
    icon: '🤖',
    defaultCode: `// Requester Agent
// Initiates transactions and pays for services

// Log agent info
ctx.log("Agent: " + ctx.agentName);
ctx.log("Balance: $" + (ctx.balance / 1000000).toFixed(2));

// Initialize state
ctx.state.committed = ctx.state.committed || {};

// Process outgoing transactions
ctx.transactions.forEach(function(tx) {
  // Only process transactions we initiated
  if (tx.sourceId !== ctx.agentId) return;

  ctx.log("Transaction: " + tx.service + " (" + tx.state + ")");

  // Auto-commit on INITIATED or QUOTED
  if ((tx.state === "INITIATED" || tx.state === "QUOTED") && !ctx.state.committed[tx.id]) {
    ctx.log("Committing funds for: " + tx.service);
    ctx.transitionState(tx.id, "COMMITTED");
    ctx.state.committed[tx.id] = true;
  }

  // Auto-release on DELIVERED
  if (tx.state === "DELIVERED") {
    ctx.log("Work delivered! Releasing payment...");
    ctx.releaseEscrow(tx.id);
  }
});`,
    initialBalanceMicro: 100_000_000, // $100 USDC
  },

  provider: {
    id: 'provider',
    name: 'Provider Agent',
    description: 'Accepts work requests and delivers results',
    type: 'provider' as const,
    icon: '⚙️',
    defaultCode: `// Provider Agent
// Accepts work and delivers results

// Initialize persistent state (survives between ticks)
ctx.state.jobsCompleted = ctx.state.jobsCompleted || 0;
ctx.state.tickCount = (ctx.state.tickCount || 0) + 1;

// Log agent info
ctx.log("Agent: " + ctx.agentName + " (tick #" + ctx.state.tickCount + ")");
ctx.log("Jobs completed so far: " + ctx.state.jobsCompleted);
ctx.log("Incoming transactions: " + ctx.incomingTransactions.length);

// Process incoming transactions
ctx.incomingTransactions.forEach(function(tx) {
  ctx.log("Transaction: " + tx.service + " ($" + (tx.amountMicro / 1000000).toFixed(2) + ")");

  // Transition through states
  if (tx.state === "COMMITTED") {
    ctx.log("Starting work on: " + tx.service);
    ctx.transitionState(tx.id, "IN_PROGRESS");
  } else if (tx.state === "IN_PROGRESS") {
    // Simulate work completion
    ctx.log("Completing work on: " + tx.service);
    ctx.transitionState(tx.id, "DELIVERED");
    ctx.state.jobsCompleted++;
  }
});`,
    initialBalanceMicro: 0, // Starts with no balance
  },

  validator: {
    id: 'validator',
    name: 'Mediator Agent',
    description: 'Resolves disputes between parties',
    type: 'validator' as const,
    icon: '🛡️',
    defaultCode: `// Mediator Agent
// Resolves disputes between parties

// Log agent info
ctx.log("Agent: " + ctx.agentName);
ctx.log("Incoming transactions: " + ctx.incomingTransactions.length);

// Check for disputed transactions
ctx.incomingTransactions.forEach(function(tx) {
  if (tx.state === "DISPUTED") {
    ctx.log("Dispute for: " + tx.service);
    ctx.log("Amount: $" + (tx.amountMicro / 1000000).toFixed(2));

    // In a real scenario, analyze evidence and resolve
    // For now, log the dispute
    ctx.warn("Dispute requires manual resolution");
  }
});`,
    initialBalanceMicro: 0, // Mediators don't need starting balance
  },

  autonomous: {
    id: 'autonomous',
    name: 'Autonomous Agent',
    description: 'Acts as both consumer and orchestrator - receives work and delegates to sub-providers',
    type: 'requester' as const, // Technically both, but orchestrates like a requester
    icon: '🤖',
    defaultCode: `// Autonomous Agent
// Receives work requests and delegates to sub-providers

// Initialize state
ctx.state.committed = ctx.state.committed || {};
ctx.state.subTasks = ctx.state.subTasks || {};
ctx.state.completed = ctx.state.completed || {};

ctx.log("Autonomous Agent: " + ctx.agentName);
ctx.log("Balance: $" + (ctx.balance / 1000000).toFixed(2));

// Process incoming work (we're acting as a provider)
ctx.incomingTransactions.forEach(function(tx) {
  ctx.log("Incoming: " + tx.service + " (" + tx.state + ")");

  // Accept and start work
  if (tx.state === "COMMITTED" && !ctx.state.subTasks[tx.id]) {
    ctx.log("Accepting job: " + tx.service);
    ctx.transitionState(tx.id, "IN_PROGRESS");
    ctx.state.subTasks[tx.id] = "pending"; // Track we need to delegate this
  }

  // Complete upstream job after sub-provider delivers
  if (tx.state === "IN_PROGRESS" && ctx.state.subTasks[tx.id] === "completed") {
    ctx.log("Sub-task complete, delivering upstream...");
    ctx.transitionState(tx.id, "DELIVERED");
    ctx.state.completed[tx.id] = true;
  }
});

// Process outgoing sub-transactions (we're delegating work)
ctx.transactions.forEach(function(tx) {
  if (tx.sourceId !== ctx.agentId) return; // Only our outgoing

  ctx.log("Outgoing: " + tx.service + " (" + tx.state + ")");

  // Auto-commit sub-transactions
  if ((tx.state === "INITIATED" || tx.state === "QUOTED") && !ctx.state.committed[tx.id]) {
    ctx.log("Committing sub-task funds...");
    ctx.transitionState(tx.id, "COMMITTED");
    ctx.state.committed[tx.id] = true;
  }

  // Release payment when sub-provider delivers
  if (tx.state === "DELIVERED") {
    ctx.log("Sub-provider delivered! Releasing payment...");
    ctx.releaseEscrow(tx.id);

    // Mark upstream job as ready to complete
    // In a real scenario, you'd map sub-tx to upstream tx
    for (var upstreamId in ctx.state.subTasks) {
      if (ctx.state.subTasks[upstreamId] === "pending") {
        ctx.state.subTasks[upstreamId] = "completed";
        break; // Simple 1:1 mapping for demo
      }
    }
  }
});`,
    initialBalanceMicro: 50_000_000, // $50 USDC - needs some balance to pay sub-providers
  },
};

/**
 * Create an agent from a template
 * @param templateId - The template ID to use
 * @param position - Initial position on canvas
 * @param customizations - Optional customizations (name, code, etc.)
 * @returns New Agent instance
 */
export function createAgentFromTemplate(
  templateId: string,
  position: AgentPosition,
  customizations?: {
    name?: string;
    code?: string;
    balanceMicro?: number;
  }
): Agent {
  const template = AGENT_TEMPLATES[templateId];
  if (!template) {
    throw new Error(`Unknown template: ${templateId}`);
  }

  return {
    id: generateId('agent'),
    name: customizations?.name || template.name,
    type: template.type,
    templateId: template.id,
    icon: template.icon,
    balanceMicro: customizations?.balanceMicro ?? template.initialBalanceMicro,
    status: 'idle',
    code: customizations?.code || template.defaultCode,
    createdAt: 0,
  };
}

/**
 * Default Canvas State with example agents
 */
export function getExampleCanvasState() {
  return {
    agents: [
      {
        id: 'agent-1',
        name: 'Requester',
        type: 'requester' as const,
        templateId: 'requester',
        icon: '🤖',
        balanceMicro: 100_000_000,
        status: 'idle' as const,
        code: AGENT_TEMPLATES.requester.defaultCode,
        createdAt: 0,
      },
      {
        id: 'agent-2',
        name: 'Provider',
        type: 'provider' as const,
        templateId: 'provider',
        icon: '⚙️',
        balanceMicro: 0,
        status: 'idle' as const,
        code: AGENT_TEMPLATES.provider.defaultCode,
        createdAt: 0,
      },
    ],
    // Pre-wired example transaction so "Run" does something immediately
    connections: [
      {
        id: 'tx-1',
        sourceId: 'agent-1',
        targetId: 'agent-2',
        state: 'INITIATED' as const,
        amountMicro: 10_000_000, // $10
        service: 'Data Analysis',
        createdAt: 0,
        updatedAt: 0,
      },
    ],
    events: [],
    isRunning: false,
    selectedAgentId: null,
    inspectorExpanded: true,
    tick: 0,
  };
}

/**
 * Get all available templates as an array
 */
export function getAllTemplates(): ExtendedAgentTemplate[] {
  return Object.values(AGENT_TEMPLATES);
}

/**
 * Get template by ID
 */
export function getTemplate(templateId: string): ExtendedAgentTemplate | undefined {
  return AGENT_TEMPLATES[templateId];
}
