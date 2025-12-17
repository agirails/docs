import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { useLocation } from '@docusaurus/router';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const suggestedPrompts = [
  "How do I create my first transaction?",
  "Explain the escrow flow",
  "What happens if a dispute is raised?",
  "How does the state machine work?",
];

type ViewMode = 'floating' | 'docked' | 'expanded';

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('floating');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your AGIRAILS SDK assistant. I can help you understand the protocol, write code, and answer questions about the documentation. What would you like to know?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for navbar "Ask AI" button click - toggle behavior
  useEffect(() => {
    const handleToggleAssistant = () => {
      setIsOpen(prev => {
        if (prev) {
          return false;
        } else {
          setViewMode('docked');
          return true;
        }
      });
    };
    window.addEventListener('agirails-toggle-assistant', handleToggleAssistant);
    return () => {
      window.removeEventListener('agirails-toggle-assistant', handleToggleAssistant);
    };
  }, []);

  // Track location changes for re-applying docked class
  const location = useLocation();

  // Apply CSS custom property for docked state - Docusaurus doesn't touch :root styles
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (isOpen && viewMode === 'docked') {
      root.style.setProperty('--ai-dock-width', `${sidebarWidth}px`);
    } else {
      root.style.setProperty('--ai-dock-width', '0px');
    }
    return () => {
      root.style.setProperty('--ai-dock-width', '0px');
    };
  }, [isOpen, viewMode, sidebarWidth]);

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      setSidebarWidth(Math.min(800, Math.max(320, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response (replace with actual AI integration later)
    await new Promise(resolve => setTimeout(resolve, 1500));

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: getSimulatedResponse(userMessage.content),
      timestamp: new Date(),
    };

    setIsTyping(false);
    setMessages(prev => [...prev, assistantMessage]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  // No floating button - use navbar "Ask AI" button instead
  if (!isOpen) {
    return null;
  }

  const cycleViewMode = () => {
    if (viewMode === 'floating') setViewMode('docked');
    else if (viewMode === 'docked') setViewMode('expanded');
    else setViewMode('floating');
  };

  return (
    <div 
      className={`ai-assistant-panel ${viewMode}`}
      style={viewMode === 'docked' ? { width: `${sidebarWidth}px` } : undefined}
    >
      {/* Resize handle */}
      {viewMode === 'docked' && (
        <div
          className="ai-assistant-resize-handle"
          onMouseDown={() => setIsResizing(true)}
        />
      )}
      {/* Header */}
      <div className="ai-assistant-header">
        <div className="ai-assistant-title">
          <div className="ai-assistant-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div>
            <h3>AI Assistant</h3>
            <span>Powered by AGIRAILS</span>
          </div>
        </div>
        <div className="ai-assistant-actions">
          {/* Close */}
          <button
            onClick={() => setIsOpen(false)}
            className="ai-assistant-btn"
            aria-label="Close"
            title="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="ai-assistant-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`ai-message ${message.role}`}
          >
            <div className="ai-message-avatar">
              {message.role === 'assistant' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 8V4H8" />
                  <rect x="8" y="8" width="8" height="12" rx="2" />
                  <path d="M12 8a4 4 0 0 0 4-4" />
                </svg>
              ) : (
                <span>You</span>
              )}
            </div>
            <div className="ai-message-content">
              <p>{message.content}</p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="ai-message assistant">
            <div className="ai-message-avatar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 8V4H8" />
                <rect x="8" y="8" width="8" height="12" rx="2" />
                <path d="M12 8a4 4 0 0 0 4-4" />
              </svg>
            </div>
            <div className="ai-message-content">
              <div className="ai-typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      {messages.length <= 1 && (
        <div className="ai-suggested-prompts">
          <p>Suggested prompts:</p>
          <div className="ai-prompts-list">
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSuggestedPrompt(prompt)}
                className="ai-prompt-chip"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="ai-assistant-input">
        <div className="ai-input-row">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about AGIRAILS..."
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="ai-send-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p className="ai-disclaimer">AI can make mistakes. Verify important information.</p>
      </div>
    </div>
  );
}

function getSimulatedResponse(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes('create') && lowerMessage.includes('transaction')) {
    return `To create a transaction, you'll need:

1. Provider Address - The wallet that will receive payment
2. Amount - How much USDC to escrow
3. Deadline - When the transaction expires
4. Dispute Window - Time for raising disputes

Here's the basic flow:

const txId = await client.kernel.createTransaction({
  provider: '0x...',
  requester: await client.getAddress(),
  amount: parseUnits('100', 6),
  deadline: Math.floor(Date.now()/1000) + 86400,
  disputeWindow: 3600
});

Check out the SDK Playground to test this interactively!`;
  }

  if (lowerMessage.includes('escrow')) {
    return `The escrow flow in AGIRAILS works like this:

1. Requester creates transaction → Funds locked in escrow
2. Provider links escrow → Confirms they'll do the work
3. State transitions → INITIATED → COMMITTED → IN_PROGRESS → DELIVERED
4. Release escrow → Funds sent to provider

The escrow contract ensures neither party can cheat - funds are only released when conditions are met or through dispute resolution.

See the Protocol Concepts docs for more details!`;
  }

  if (lowerMessage.includes('dispute')) {
    return `Dispute Resolution in AGIRAILS:

When a dispute is raised:
1. Transaction state changes to DISPUTED
2. Both parties can submit evidence (attestations)
3. Arbitrator reviews and makes decision
4. Funds distributed based on ruling

Key methods:
• raiseDispute() - Initiate dispute
• anchorAttestation() - Submit evidence
• resolveDispute() - Arbitrator decision

The dispute window is configurable per transaction (default: 1 hour after delivery).`;
  }

  if (lowerMessage.includes('state') && lowerMessage.includes('machine')) {
    return `AGIRAILS uses an 8-state transaction lifecycle:

1. INITIATED - Transaction created, awaiting escrow
2. QUOTED - Provider submitted price (optional)
3. COMMITTED - Escrow linked, work begins
4. IN_PROGRESS - Provider working (optional)
5. DELIVERED - Work completed with proof
6. SETTLED - Payment released (terminal)
7. DISPUTED - Under arbitration
8. CANCELLED - Transaction cancelled (terminal)

Happy path: INITIATED → COMMITTED → DELIVERED → SETTLED

All transitions are one-way and enforced by smart contracts.`;
  }

  if (lowerMessage.includes('sdk') || lowerMessage.includes('install')) {
    return `To get started with the AGIRAILS SDK:

TypeScript:
npm install @agirails/sdk

Python:
pip install agirails-sdk

Quick example:

import { ACTPClient } from '@agirails/sdk';

const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY
});

Check the SDK Reference docs for all available methods!`;
  }

  return `I understand you're asking about "${userMessage.slice(0, 50)}${userMessage.length > 50 ? '...' : ''}"

Here are some things I can help with:
• Explaining ACTP protocol concepts
• Generating code snippets
• Understanding the state machine
• SDK installation and usage
• Debugging common issues

Could you be more specific about what you'd like to learn?`;
}
