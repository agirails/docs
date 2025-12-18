/* ============================================
   AGIRAILS Canvas - Pre-built Scenarios
   ============================================

   Forkable scenario templates for "aha moment in 5 minutes".
   Each scenario demonstrates a key ACTP concept.
   ============================================ */

import { Agent, Connection, CanvasState, TransactionState } from './types';
import { AGENT_TEMPLATES } from './templates';

/**
 * Pre-built scenario definition
 */
export interface Scenario {
  /** Unique scenario ID */
  id: string;

  /** Display name */
  name: string;

  /** Short description (shown in gallery) */
  description: string;

  /** Longer explanation (shown in detail view) */
  details: string;

  /** Icon/emoji */
  icon: string;

  /** Estimated time to complete (in minutes) */
  durationMinutes: number;

  /** Difficulty level */
  difficulty: 'beginner' | 'intermediate' | 'advanced';

  /** What the user will learn */
  learnings: string[];

  /** Tags for filtering */
  tags: string[];

  /** Canvas state for this scenario */
  canvasState: Omit<
    CanvasState,
    | 'selectedAgentId'
    | 'inspectorExpanded'
    | 'isRunning'
    | 'tick'
    | 'runtimeMode'
    | 'tickIntervalMs'
    | 'executionMode'
    | 'virtualTimeMs'
    | 'idCounter'
    | 'rngSeed'
  >;

  /** Agent positions */
  positions: Record<string, { x: number; y: number }>;
}

/**
 * Pre-built scenarios library
 */
export const SCENARIOS: Scenario[] = [
  // ============================================
  // SCENARIO 1: Basic Escrow
  // ============================================
  {
    id: 'basic-escrow',
    name: 'Basic Escrow',
    description: 'See how payments flow between two agents with escrow protection.',
    details: 'This scenario shows the fundamental ACTP flow: A Requester creates a transaction, funds are locked in escrow, Provider delivers work, and funds are released. Watch balances update in real-time!',
    icon: '💰',
    durationMinutes: 2,
    difficulty: 'beginner',
    learnings: [
      'How escrow protects both parties',
      'ACTP state transitions (INITIATED → COMMITTED → DELIVERED → SETTLED)',
      'Balance updates during transaction lifecycle',
    ],
    tags: ['escrow', 'basics', 'payment'],
    positions: {
      'scenario-agent-1': { x: 100, y: 150 },
      'scenario-agent-2': { x: 500, y: 150 },
    },
    canvasState: {
      agents: [
        {
          id: 'scenario-agent-1',
          name: 'Client',
          type: 'requester',
          templateId: 'requester',
          icon: '🤖',
          balanceMicro: 100_000_000, // $100
          status: 'idle',
          code: `// Client Agent
// Requests work from Provider and pays via escrow

ctx.log("Client balance: $" + (ctx.balance / 1000000).toFixed(2));

// Initialize state
ctx.state.committed = ctx.state.committed || {};

// Process outgoing transactions
ctx.transactions.forEach(function(tx) {
  if (tx.sourceId !== ctx.agentId) return;

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
          createdAt: 0,
        },
        {
          id: 'scenario-agent-2',
          name: 'Worker',
          type: 'provider',
          templateId: 'provider',
          icon: '⚙️',
          balanceMicro: 0,
          status: 'idle',
          code: `// Worker Agent
// Accepts jobs and delivers results

ctx.state.jobsCompleted = ctx.state.jobsCompleted || 0;

ctx.log("Worker balance: $" + (ctx.balance / 1000000).toFixed(2));
ctx.log("Jobs completed: " + ctx.state.jobsCompleted);

// Process incoming work requests
ctx.incomingTransactions.forEach(function(tx) {
  ctx.log("Transaction: " + tx.service + " (" + tx.state + ")");

  if (tx.state === "COMMITTED") {
    ctx.log("Starting work on: " + tx.service);
    ctx.transitionState(tx.id, "IN_PROGRESS");
  } else if (tx.state === "IN_PROGRESS") {
    ctx.log("Delivering: " + tx.service);
    ctx.transitionState(tx.id, "DELIVERED");
    ctx.state.jobsCompleted++;
  }
});`,
          createdAt: 0,
        },
      ],
      connections: [
        {
          id: 'scenario-tx-1',
          sourceId: 'scenario-agent-1',
          targetId: 'scenario-agent-2',
          state: 'INITIATED' as TransactionState,
          amountMicro: 10_000_000, // $10
          service: 'Data Analysis',
          createdAt: 0,
          updatedAt: 0,
        },
      ],
      events: [],
    },
  },

  // ============================================
  // SCENARIO 2: Marketplace (3 agents)
  // ============================================
  {
    id: 'marketplace',
    name: 'Marketplace',
    description: 'Multiple providers compete for work in a marketplace.',
    details: 'A Buyer agent requests services from multiple Providers. Watch how parallel transactions flow through the system and how each provider independently delivers and gets paid.',
    icon: '🛒',
    durationMinutes: 3,
    difficulty: 'beginner',
    learnings: [
      'Multiple concurrent transactions',
      'Different service types',
      'Parallel work execution',
    ],
    tags: ['marketplace', 'multi-agent', 'parallel'],
    positions: {
      'marketplace-buyer': { x: 100, y: 200 },
      'marketplace-translator': { x: 500, y: 80 },
      'marketplace-analyst': { x: 500, y: 320 },
    },
    canvasState: {
      agents: [
        {
          id: 'marketplace-buyer',
          name: 'Buyer',
          type: 'requester',
          templateId: 'requester',
          icon: '🛒',
          balanceMicro: 200_000_000, // $200
          status: 'idle',
          code: `// Marketplace Buyer
// Requests multiple services from different providers

ctx.log("Buyer balance: $" + (ctx.balance / 1000000).toFixed(2));

// Initialize state
ctx.state.committed = ctx.state.committed || {};

// Process outgoing transactions
ctx.transactions.forEach(function(tx) {
  if (tx.sourceId !== ctx.agentId) return;

  // Auto-commit on INITIATED or QUOTED
  if ((tx.state === "INITIATED" || tx.state === "QUOTED") && !ctx.state.committed[tx.id]) {
    ctx.log("Committing funds for: " + tx.service);
    ctx.transitionState(tx.id, "COMMITTED");
    ctx.state.committed[tx.id] = true;
  }

  // Auto-release on DELIVERED
  if (tx.state === "DELIVERED") {
    ctx.log("Received delivery for: " + tx.service);
    ctx.releaseEscrow(tx.id);
  }
});`,
          createdAt: 0,
        },
        {
          id: 'marketplace-translator',
          name: 'Translator',
          type: 'provider',
          templateId: 'provider',
          icon: '🌐',
          balanceMicro: 0,
          status: 'idle',
          code: `// Translator Agent
// Provides translation services

ctx.state.translations = ctx.state.translations || 0;

ctx.log("Translator earned: $" + (ctx.balance / 1000000).toFixed(2));

ctx.incomingTransactions.forEach(function(tx) {
  if (tx.state === "COMMITTED") {
    ctx.log("Translating: " + tx.service);
    ctx.transitionState(tx.id, "IN_PROGRESS");
  } else if (tx.state === "IN_PROGRESS") {
    ctx.log("Translation complete!");
    ctx.transitionState(tx.id, "DELIVERED");
    ctx.state.translations++;
  }
});`,
          createdAt: 0,
        },
        {
          id: 'marketplace-analyst',
          name: 'Data Analyst',
          type: 'provider',
          templateId: 'provider',
          icon: '📊',
          balanceMicro: 0,
          status: 'idle',
          code: `// Data Analyst Agent
// Provides data analysis services

ctx.state.analyses = ctx.state.analyses || 0;

ctx.log("Analyst earned: $" + (ctx.balance / 1000000).toFixed(2));

ctx.incomingTransactions.forEach(function(tx) {
  if (tx.state === "COMMITTED") {
    ctx.log("Analyzing data...");
    ctx.transitionState(tx.id, "IN_PROGRESS");
  } else if (tx.state === "IN_PROGRESS") {
    ctx.log("Analysis complete!");
    ctx.transitionState(tx.id, "DELIVERED");
    ctx.state.analyses++;
  }
});`,
          createdAt: 0,
        },
      ],
      connections: [
        {
          id: 'marketplace-tx-1',
          sourceId: 'marketplace-buyer',
          targetId: 'marketplace-translator',
          state: 'INITIATED' as TransactionState,
          amountMicro: 25_000_000, // $25
          service: 'Document Translation',
          createdAt: 0,
          updatedAt: 0,
        },
        {
          id: 'marketplace-tx-2',
          sourceId: 'marketplace-buyer',
          targetId: 'marketplace-analyst',
          state: 'INITIATED' as TransactionState,
          amountMicro: 50_000_000, // $50
          service: 'Market Research',
          createdAt: 0,
          updatedAt: 0,
        },
      ],
      events: [],
    },
  },

  // ============================================
  // SCENARIO 3: Dispute Resolution
  // ============================================
  {
    id: 'dispute-resolution',
    name: 'Dispute Resolution',
    description: 'What happens when things go wrong? See the dispute flow.',
    details: 'This scenario demonstrates the dispute path. After a Provider delivers work, the Requester raises a dispute. A Mediator agent reviews and resolves (mocked/manual) to protect both parties.',
    icon: '⚖️',
    durationMinutes: 3,
    difficulty: 'intermediate',
    learnings: [
      'How disputes are raised after delivery',
      'Mediator role in dispute resolution',
      'DISPUTED state and resolution flow',
    ],
    tags: ['dispute', 'mediator', 'protection'],
    positions: {
      'dispute-requester': { x: 100, y: 150 },
      'dispute-provider': { x: 400, y: 150 },
      'dispute-mediator': { x: 250, y: 350 },
    },
    canvasState: {
      agents: [
        {
          id: 'dispute-requester',
          name: 'Unhappy Client',
          type: 'requester',
          templateId: 'requester',
          icon: '😤',
          balanceMicro: 100_000_000, // $100
          status: 'idle',
          code: `// Unhappy Client
// Will raise a dispute after delivery

ctx.log("Client balance: $" + (ctx.balance / 1000000).toFixed(2));

// Initialize state
ctx.state.committed = ctx.state.committed || {};

ctx.transactions.forEach(function(tx) {
  if (tx.sourceId !== ctx.agentId) return;

  ctx.log("Transaction: " + tx.service + " (" + tx.state + ")");

  // Auto-commit on INITIATED
  if ((tx.state === "INITIATED" || tx.state === "QUOTED") && !ctx.state.committed[tx.id]) {
    ctx.log("Committing funds...");
    ctx.transitionState(tx.id, "COMMITTED");
    ctx.state.committed[tx.id] = true;
  }

  if (tx.state === "DELIVERED") {
    // Client is not happy with the work!
    ctx.warn("Quality issue detected!");
    ctx.warn("Raising dispute...");
    ctx.initiateDispute(tx.id, "Quality does not meet requirements");
  }
});`,
          createdAt: 0,
        },
        {
          id: 'dispute-provider',
          name: 'Provider',
          type: 'provider',
          templateId: 'provider',
          icon: '⚙️',
          balanceMicro: 0,
          status: 'idle',
          code: `// Provider Agent
// Delivers work (which will be disputed)

ctx.log("Provider balance: $" + (ctx.balance / 1000000).toFixed(2));

ctx.incomingTransactions.forEach(function(tx) {
  ctx.log("Transaction: " + tx.service + " (" + tx.state + ")");

  if (tx.state === "COMMITTED") {
    ctx.transitionState(tx.id, "IN_PROGRESS");
  } else if (tx.state === "IN_PROGRESS") {
    ctx.log("Delivering work...");
    ctx.transitionState(tx.id, "DELIVERED");
  } else if (tx.state === "DISPUTED") {
    ctx.error("Dispute received! Waiting for mediator...");
  }
});`,
          createdAt: 0,
        },
        {
          id: 'dispute-mediator',
          name: 'Mediator',
          type: 'validator',
          templateId: 'validator',
          icon: '🛡️',
          balanceMicro: 0,
          status: 'idle',
          code: `// Mediator Agent
// Resolves disputes between parties

ctx.log("Mediator active");

ctx.incomingTransactions.forEach(function(tx) {
  if (tx.state === "DISPUTED") {
    ctx.warn("Reviewing dispute for: " + tx.service);
    ctx.log("Amount at stake: $" + (tx.amountMicro / 1000000).toFixed(2));

    // In a real scenario, mediator would review evidence
    // For demo, we'll show the dispute is pending resolution
    ctx.warn("Dispute under review...");
    ctx.warn("(Use manual controls to resolve)");
  }
});`,
          createdAt: 0,
        },
      ],
      connections: [
        {
          id: 'dispute-tx-1',
          sourceId: 'dispute-requester',
          targetId: 'dispute-provider',
          state: 'INITIATED' as TransactionState,
          amountMicro: 30_000_000, // $30
          service: 'Logo Design',
          createdAt: 0,
          updatedAt: 0,
        },
      ],
      events: [],
    },
  },

  // ============================================
  // SCENARIO 4: Pipeline (Multi-step)
  // ============================================
  {
    id: 'pipeline',
    name: 'Agent Pipeline',
    description: 'Chain multiple agents to process work in sequence.',
    details: 'A Coordinator agent orchestrates work through multiple specialists: first a Researcher gathers data, then an Analyst processes it. Watch how funds flow through the pipeline!',
    icon: '🔄',
    durationMinutes: 4,
    difficulty: 'intermediate',
    learnings: [
      'Multi-step agent workflows',
      'Agent-to-agent payments',
      'Pipeline orchestration patterns',
    ],
    tags: ['pipeline', 'workflow', 'orchestration'],
    positions: {
      'pipeline-coordinator': { x: 100, y: 200 },
      'pipeline-researcher': { x: 400, y: 80 },
      'pipeline-analyst': { x: 400, y: 320 },
    },
    canvasState: {
      agents: [
        {
          id: 'pipeline-coordinator',
          name: 'Coordinator',
          type: 'requester',
          templateId: 'requester',
          icon: '🎯',
          balanceMicro: 150_000_000, // $150
          status: 'idle',
          code: `// Coordinator Agent
// Orchestrates work through the pipeline

ctx.log("Coordinator balance: $" + (ctx.balance / 1000000).toFixed(2));

// Initialize state
ctx.state.committed = ctx.state.committed || {};
ctx.state.pipelineStage = ctx.state.pipelineStage || "waiting";

ctx.transactions.forEach(function(tx) {
  if (tx.sourceId !== ctx.agentId) return;

  ctx.log(tx.service + ": " + tx.state);

  // Auto-commit
  if ((tx.state === "INITIATED" || tx.state === "QUOTED") && !ctx.state.committed[tx.id]) {
    ctx.log("Committing funds for: " + tx.service);
    ctx.transitionState(tx.id, "COMMITTED");
    ctx.state.committed[tx.id] = true;
  }

  // Auto-release on delivery
  if (tx.state === "DELIVERED") {
    ctx.log("Stage complete: " + tx.service);
    ctx.releaseEscrow(tx.id);
  }
});`,
          createdAt: 0,
        },
        {
          id: 'pipeline-researcher',
          name: 'Researcher',
          type: 'provider',
          templateId: 'provider',
          icon: '🔍',
          balanceMicro: 0,
          status: 'idle',
          code: `// Researcher Agent
// First stage: gathers information

ctx.state.researched = ctx.state.researched || 0;

ctx.log("Researcher earned: $" + (ctx.balance / 1000000).toFixed(2));

ctx.incomingTransactions.forEach(function(tx) {
  if (tx.state === "COMMITTED") {
    ctx.log("Starting research...");
    ctx.transitionState(tx.id, "IN_PROGRESS");
  } else if (tx.state === "IN_PROGRESS") {
    ctx.log("Research complete!");
    ctx.transitionState(tx.id, "DELIVERED");
    ctx.state.researched++;
  }
});`,
          createdAt: 0,
        },
        {
          id: 'pipeline-analyst',
          name: 'Analyst',
          type: 'provider',
          templateId: 'provider',
          icon: '📈',
          balanceMicro: 0,
          status: 'idle',
          code: `// Analyst Agent
// Second stage: analyzes research data

ctx.state.analyzed = ctx.state.analyzed || 0;

ctx.log("Analyst earned: $" + (ctx.balance / 1000000).toFixed(2));

ctx.incomingTransactions.forEach(function(tx) {
  if (tx.state === "COMMITTED") {
    ctx.log("Analyzing research data...");
    ctx.transitionState(tx.id, "IN_PROGRESS");
  } else if (tx.state === "IN_PROGRESS") {
    ctx.log("Analysis complete!");
    ctx.transitionState(tx.id, "DELIVERED");
    ctx.state.analyzed++;
  }
});`,
          createdAt: 0,
        },
      ],
      connections: [
        {
          id: 'pipeline-tx-1',
          sourceId: 'pipeline-coordinator',
          targetId: 'pipeline-researcher',
          state: 'INITIATED' as TransactionState,
          amountMicro: 20_000_000, // $20
          service: 'Market Research',
          createdAt: 0,
          updatedAt: 0,
        },
        {
          id: 'pipeline-tx-2',
          sourceId: 'pipeline-coordinator',
          targetId: 'pipeline-analyst',
          state: 'INITIATED' as TransactionState,
          amountMicro: 30_000_000, // $30
          service: 'Data Analysis',
          createdAt: 0,
          updatedAt: 0,
        },
      ],
      events: [],
    },
  },

  // ============================================
  // SCENARIO 5: Cancellation Flow
  // ============================================
  {
    id: 'cancellation',
    name: 'Transaction Cancellation',
    description: 'Learn when and how transactions can be cancelled.',
    details: 'Not every transaction completes successfully. This scenario shows how a Requester can cancel a transaction before delivery, getting their escrowed funds returned safely.',
    icon: '❌',
    durationMinutes: 2,
    difficulty: 'beginner',
    learnings: [
      'When cancellation is allowed',
      'Escrow refund on cancellation',
      'CANCELLED terminal state',
    ],
    tags: ['cancellation', 'refund', 'basics'],
    positions: {
      'cancel-requester': { x: 100, y: 150 },
      'cancel-provider': { x: 500, y: 150 },
    },
    canvasState: {
      agents: [
        {
          id: 'cancel-requester',
          name: 'Cautious Client',
          type: 'requester',
          templateId: 'requester',
          icon: '🤔',
          balanceMicro: 100_000_000, // $100
          status: 'idle',
          code: `// Cautious Client
// May decide to cancel the transaction

ctx.log("Client balance: $" + (ctx.balance / 1000000).toFixed(2));

// Initialize state
ctx.state.committed = ctx.state.committed || {};

// This client demonstrates cancellation
// Use the "Cancel" button in the Inspector to see the flow

ctx.transactions.forEach(function(tx) {
  if (tx.sourceId !== ctx.agentId) return;

  ctx.log("Transaction: " + tx.service);
  ctx.log("State: " + tx.state);
  ctx.log("Amount: $" + (tx.amountMicro / 1000000).toFixed(2));

  // Auto-commit (provider is slow, so client can cancel during COMMITTED)
  if ((tx.state === "INITIATED" || tx.state === "QUOTED") && !ctx.state.committed[tx.id]) {
    ctx.log("Committing funds...");
    ctx.transitionState(tx.id, "COMMITTED");
    ctx.state.committed[tx.id] = true;
  }

  if (tx.state === "CANCELLED") {
    ctx.log("Transaction was cancelled.");
    ctx.log("Funds returned to escrow.");
  }
});`,
          createdAt: 0,
        },
        {
          id: 'cancel-provider',
          name: 'Slow Provider',
          type: 'provider',
          templateId: 'provider',
          icon: '🐢',
          balanceMicro: 0,
          status: 'idle',
          code: `// Slow Provider
// Takes time to start work (allowing cancellation)

ctx.state.tickCount = (ctx.state.tickCount || 0) + 1;

ctx.log("Provider tick #" + ctx.state.tickCount);

// This provider is slow - gives client time to cancel
// The transaction will stay in COMMITTED state

ctx.incomingTransactions.forEach(function(tx) {
  ctx.log("Transaction: " + tx.service + " (" + tx.state + ")");

  if (tx.state === "CANCELLED") {
    ctx.warn("Transaction was cancelled by client!");
  }

  // Intentionally not progressing - demo cancellation
  if (tx.state === "COMMITTED") {
    ctx.log("Preparing to start work...");
    ctx.log("(Client can still cancel at this point)");
  }
});`,
          createdAt: 0,
        },
      ],
      connections: [
        {
          id: 'cancel-tx-1',
          sourceId: 'cancel-requester',
          targetId: 'cancel-provider',
          state: 'INITIATED' as TransactionState,
          amountMicro: 15_000_000, // $15
          service: 'Report Writing',
          createdAt: 0,
          updatedAt: 0,
        },
      ],
      events: [],
    },
  },

  // ============================================
  // SCENARIO 6: Autonomous Orchestrator
  // ============================================
  {
    id: 'autonomous-orchestrator',
    name: 'Autonomous Orchestrator',
    description: 'Agent receives work and delegates to sub-providers automatically.',
    details: 'An Autonomous Agent acts as both a provider (accepts work from Client) and a consumer (purchases services from a Translator). Watch how it orchestrates the full workflow: accept job → delegate to specialist → deliver back to client.',
    icon: '🔄',
    durationMinutes: 4,
    difficulty: 'intermediate',
    learnings: [
      'Autonomous agent pattern (provider + consumer)',
      'Sub-service purchasing and orchestration',
      'Multi-hop transaction flows',
    ],
    tags: ['autonomous', 'orchestration', 'subservice'],
    positions: {
      'auto-client': { x: 100, y: 200 },
      'auto-orchestrator': { x: 400, y: 200 },
      'auto-translator': { x: 700, y: 200 },
    },
    canvasState: {
      agents: [
        {
          id: 'auto-client',
          name: 'Client',
          type: 'requester',
          templateId: 'requester',
          icon: '👤',
          balanceMicro: 100_000_000, // $100
          status: 'idle',
          code: `// Client
// Requests translation service from Orchestrator

ctx.log("Client balance: $" + (ctx.balance / 1000000).toFixed(2));

// Initialize state
ctx.state.committed = ctx.state.committed || {};

ctx.transactions.forEach(function(tx) {
  if (tx.sourceId !== ctx.agentId) return;

  ctx.log("Transaction: " + tx.service + " (" + tx.state + ")");

  // Auto-commit
  if ((tx.state === "INITIATED" || tx.state === "QUOTED") && !ctx.state.committed[tx.id]) {
    ctx.log("Committing funds...");
    ctx.transitionState(tx.id, "COMMITTED");
    ctx.state.committed[tx.id] = true;
  }

  // Auto-release on delivery
  if (tx.state === "DELIVERED") {
    ctx.log("Translation received! Releasing payment...");
    ctx.releaseEscrow(tx.id);
  }
});`,
          createdAt: 0,
        },
        {
          id: 'auto-orchestrator',
          name: 'Orchestrator',
          type: 'requester',
          templateId: 'autonomous',
          icon: '🤖',
          balanceMicro: 50_000_000, // $50 - needs funds to pay translator
          status: 'idle',
          code: `// Autonomous Orchestrator
// Receives translation request and delegates to specialist

ctx.state.committed = ctx.state.committed || {};
ctx.state.subTasks = ctx.state.subTasks || {};
ctx.state.delegated = ctx.state.delegated || {};

ctx.log("Orchestrator balance: $" + (ctx.balance / 1000000).toFixed(2));

// Process incoming work (acting as provider to Client)
ctx.incomingTransactions.forEach(function(tx) {
  ctx.log("Incoming job: " + tx.service + " (" + tx.state + ")");

  // Accept work and delegate to translator
  if (tx.state === "COMMITTED" && !ctx.state.subTasks[tx.id]) {
    ctx.log("Accepting translation job...");
    ctx.transitionState(tx.id, "IN_PROGRESS");
    ctx.state.subTasks[tx.id] = "pending";

    // Create sub-transaction to Translator
    if (!ctx.state.delegated[tx.id]) {
      ctx.log("Delegating to translator...");
      var subTxId = ctx.createTransaction({
        provider: "auto-translator",
        amountMicro: 20000000, // $20 (we keep $10 margin)
        service: "Spanish Translation (sub-task)"
      });
      ctx.state.delegated[tx.id] = subTxId;
    }
  }

  // Complete upstream after sub-task done
  if (tx.state === "IN_PROGRESS" && ctx.state.subTasks[tx.id] === "completed") {
    ctx.log("Translation complete! Delivering to client...");
    ctx.transitionState(tx.id, "DELIVERED");
  }
});

// Process outgoing sub-transactions (acting as consumer of Translator)
ctx.transactions.forEach(function(tx) {
  if (tx.sourceId !== ctx.agentId) return;

  ctx.log("Sub-task: " + tx.service + " (" + tx.state + ")");

  // Auto-commit sub-transactions
  if ((tx.state === "INITIATED" || tx.state === "QUOTED") && !ctx.state.committed[tx.id]) {
    ctx.log("Committing sub-task funds...");
    ctx.transitionState(tx.id, "COMMITTED");
    ctx.state.committed[tx.id] = true;
  }

  // Release payment and mark upstream complete
  if (tx.state === "DELIVERED") {
    ctx.log("Translator delivered! Releasing payment...");
    ctx.releaseEscrow(tx.id);

    // Mark upstream as ready to complete
    for (var upstreamId in ctx.state.delegated) {
      if (ctx.state.delegated[upstreamId] === tx.id) {
        ctx.state.subTasks[upstreamId] = "completed";
        ctx.log("Upstream job ready to deliver");
      }
    }
  }
});`,
          createdAt: 0,
        },
        {
          id: 'auto-translator',
          name: 'Translator',
          type: 'provider',
          templateId: 'provider',
          icon: '🌐',
          balanceMicro: 0,
          status: 'idle',
          code: `// Translator
// Performs actual translation work

ctx.state.translations = ctx.state.translations || 0;

ctx.log("Translator earned: $" + (ctx.balance / 1000000).toFixed(2));

ctx.incomingTransactions.forEach(function(tx) {
  ctx.log("Translation job: " + tx.service + " (" + tx.state + ")");

  if (tx.state === "COMMITTED") {
    ctx.log("Starting translation...");
    ctx.transitionState(tx.id, "IN_PROGRESS");
  } else if (tx.state === "IN_PROGRESS") {
    ctx.log("Translation complete!");
    ctx.transitionState(tx.id, "DELIVERED");
    ctx.state.translations++;
  }
});`,
          createdAt: 0,
        },
      ],
      connections: [
        {
          id: 'auto-tx-1',
          sourceId: 'auto-client',
          targetId: 'auto-orchestrator',
          state: 'INITIATED' as TransactionState,
          amountMicro: 30_000_000, // $30 total to orchestrator
          service: 'Document Translation',
          createdAt: 0,
          updatedAt: 0,
        },
        // Sub-transaction will be created dynamically by orchestrator
      ],
      events: [],
    },
  },

  // ============================================
  // SCENARIO 7: Translation Service
  // ============================================
  {
    id: 'translation-service',
    name: 'AI Translation Service',
    description: 'Real AI-powered translation without API keys.',
    details: 'This scenario demonstrates ctx.services.translate() - a Provider uses actual AI (mock or Ollama) to translate text. Watch as the deliverable is generated in real-time and attached to the transaction!',
    icon: '🌐',
    durationMinutes: 2,
    difficulty: 'intermediate',
    learnings: [
      'Using ctx.services.translate() job queue',
      'Real deliverable generation (not hardcoded)',
      'Optional Ollama integration with fallback',
    ],
    tags: ['translation', 'AI', 'services'],
    positions: {
      'trans-client': { x: 100, y: 150 },
      'trans-translator': { x: 500, y: 150 },
    },
    canvasState: {
      agents: [
        {
          id: 'trans-client',
          name: 'Client',
          type: 'requester',
          templateId: 'requester',
          icon: '👤',
          balanceMicro: 50_000_000, // $50
          status: 'idle',
          code: `// Client requesting translation
ctx.log("Client balance: $" + (ctx.balance / 1000000).toFixed(2));

// Initialize state
ctx.state.committed = ctx.state.committed || {};

ctx.transactions.forEach(function(tx) {
  if (tx.sourceId !== ctx.agentId) return;

  ctx.log("Transaction: " + tx.service + " (" + tx.state + ")");

  // Auto-commit
  if ((tx.state === "INITIATED" || tx.state === "QUOTED") && !ctx.state.committed[tx.id]) {
    ctx.log("Committing funds for translation...");
    ctx.transitionState(tx.id, "COMMITTED");
    ctx.state.committed[tx.id] = true;
  }

  // Accept delivery
  if (tx.state === "DELIVERED") {
    ctx.log("Translation received!");
    ctx.releaseEscrow(tx.id);
  }
});`,
          createdAt: 0,
        },
        {
          id: 'trans-translator',
          name: 'AI Translator',
          type: 'provider',
          templateId: 'provider',
          icon: '🌐',
          balanceMicro: 0,
          status: 'idle',
          code: `// AI Translator using ctx.services
ctx.state.translationJobs = ctx.state.translationJobs || {};
ctx.state.jobs = ctx.state.jobs || {};

ctx.log("Translator earnings: $" + (ctx.balance / 1000000).toFixed(2));

ctx.incomingTransactions.forEach(function(tx) {
  ctx.log("Job: " + tx.service + " (" + tx.state + ")");

  // Accept job and start translation
  if (tx.state === "COMMITTED" && !ctx.state.translationJobs[tx.id]) {
    ctx.log("Starting translation work...");
    ctx.transitionState(tx.id, "IN_PROGRESS");

    // Submit translation job (async, returns jobId immediately)
    var jobId = ctx.services.translate({
      text: "Hello, how are you today? I hope you are doing well!",
      to: "es" // Spanish
    });

    ctx.log("Translation job submitted: " + jobId);
    ctx.state.translationJobs[tx.id] = jobId;
  }

  // Check if translation is complete
  if (tx.state === "IN_PROGRESS" && ctx.state.translationJobs[tx.id]) {
    var jobId = ctx.state.translationJobs[tx.id];
    var job = ctx.state.jobs[jobId];

    if (job && job.status === "completed") {
      ctx.log("Translation completed!");
      ctx.log("Result: " + job.result.text);
      ctx.log("Backend: " + job.result.backend);

      // Store deliverable in state (proof of work)
      ctx.state.deliverable = job.result.text;

      // Deliver work
      ctx.transitionState(tx.id, "DELIVERED");
    } else if (job && job.status === "failed") {
      ctx.error("Translation failed: " + job.error);
    } else {
      ctx.log("Translation in progress...");
    }
  }
});`,
          createdAt: 0,
        },
      ],
      connections: [
        {
          id: 'trans-tx-1',
          sourceId: 'trans-client',
          targetId: 'trans-translator',
          state: 'INITIATED' as TransactionState,
          amountMicro: 5_000_000, // $5
          service: 'English to Spanish Translation',
          createdAt: 0,
          updatedAt: 0,
        },
      ],
      events: [],
    },
  },
];

/**
 * Get all scenarios
 */
export function getAllScenarios(): Scenario[] {
  return SCENARIOS;
}

/**
 * Get scenario by ID
 */
export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find(s => s.id === id);
}

/**
 * Get scenarios by difficulty
 */
export function getScenariosByDifficulty(difficulty: Scenario['difficulty']): Scenario[] {
  return SCENARIOS.filter(s => s.difficulty === difficulty);
}

/**
 * Get scenarios by tag
 */
export function getScenariosByTag(tag: string): Scenario[] {
  return SCENARIOS.filter(s => s.tags.includes(tag));
}
