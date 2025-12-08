import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, X, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIAssistantPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  onMethodSelect?: (methodId: string) => void;
  onFillForm?: (values: Record<string, string>) => void;
}

const suggestedPrompts = [
  "How do I create my first transaction?",
  "Explain the escrow flow",
  "What happens if a dispute is raised?",
  "Help me test a payment of 50 USDC",
];

export default function AIAssistantPanel({ 
  isOpen, 
  onToggle,
  onMethodSelect,
  onFillForm
}: AIAssistantPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your AGIRAILS SDK assistant. I can help you understand the protocol, write code, and test transactions. What would you like to do?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg hover:scale-105 transition-transform duration-200 z-50"
        style={{ boxShadow: '0 4px 20px rgba(0, 228, 228, 0.4)' }}
      >
        <Bot className="w-6 h-6 text-primary-foreground" />
      </button>
    );
  }

  return (
    <div 
      className={cn(
        "fixed z-50 bg-card border border-secondary rounded-lg shadow-2xl flex flex-col transition-all duration-300",
        isExpanded 
          ? "bottom-4 right-4 left-4 top-20" 
          : "bottom-6 right-6 w-[400px] h-[600px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-secondary">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">AI Assistant</h3>
            <p className="text-xs text-muted-foreground">Powered by AGIRAILS</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8"
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3",
              message.role === 'user' ? "flex-row-reverse" : ""
            )}
          >
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
              message.role === 'assistant' ? "bg-primary/20" : "bg-accent/20"
            )}>
              {message.role === 'assistant' ? (
                <Bot className="w-4 h-4 text-primary" />
              ) : (
                <span className="text-xs font-medium text-accent">You</span>
              )}
            </div>
            <div className={cn(
              "max-w-[80%] rounded-lg px-3 py-2",
              message.role === 'assistant' 
                ? "bg-secondary/50" 
                : "bg-primary/20"
            )}>
              <p className="text-sm text-foreground whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-secondary/50 rounded-lg px-3 py-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-muted-foreground mb-2">Suggested prompts:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSuggestedPrompt(prompt)}
                className="text-xs px-3 py-1.5 rounded-full bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors duration-200"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-secondary">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about AGIRAILS..."
            rows={1}
            className="flex-1 resize-none bg-secondary/50 border border-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors duration-200"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="btn-primary h-auto px-3"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}

function getSimulatedResponse(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes('create') && lowerMessage.includes('transaction')) {
    return `To create a transaction, you'll need:

1. **Provider Address** - The wallet that will receive payment
2. **Amount** - How much USDC to escrow
3. **Deadline** - When the transaction expires

Here's the basic flow:
\`\`\`typescript
const txId = await client.kernel.createTransaction({
  provider: '0x...',
  amount: parseUnits('100', 6),
  deadline: Math.floor(Date.now()/1000) + 86400
});
\`\`\`

Would you like me to fill in the form with example values?`;
  }

  if (lowerMessage.includes('escrow')) {
    return `The **escrow flow** in AGIRAILS works like this:

1. **Requester creates transaction** → Funds locked in escrow
2. **Provider links escrow** → Confirms they'll do the work
3. **State transitions** → INITIATED → IN_PROGRESS → COMPLETED
4. **Release escrow** → Funds sent to provider

The escrow contract ensures neither party can cheat - funds are only released when conditions are met or through dispute resolution.

Need help with a specific step?`;
  }

  if (lowerMessage.includes('dispute')) {
    return `**Dispute Resolution** in AGIRAILS:

When a dispute is raised:
1. Transaction state changes to DISPUTED
2. Both parties can submit evidence (attestations)
3. Arbitrator reviews and makes decision
4. Funds distributed based on ruling

Key methods:
- \`raiseDispute()\` - Initiate dispute
- \`anchorAttestation()\` - Submit evidence
- \`resolveDispute()\` - Arbitrator decision

The dispute window is configurable per transaction (default: 1 hour after completion).`;
  }

  if (lowerMessage.includes('50 usdc') || lowerMessage.includes('test') && lowerMessage.includes('payment')) {
    return `I'll help you set up a test payment of 50 USDC! 

Here's what I recommend:
1. Use the \`createTransaction\` method
2. Set amount to 50 USDC
3. Set deadline to 24 hours
4. Run simulation first to verify

Click "Simulate Transaction" to test without spending gas. Once you're happy, "Execute on Testnet" will submit it to Base Sepolia.

**Tip**: Make sure you have testnet ETH for gas fees. Get some from the [Base Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet).`;
  }

  return `I understand you're asking about "${userMessage.slice(0, 50)}..."

Here are some things I can help with:
- Explaining ACTP protocol concepts
- Generating code snippets
- Setting up test transactions
- Debugging common issues

Could you be more specific about what you'd like to learn or do?`;
}
