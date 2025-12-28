import React, { useRef, useEffect, useLayoutEffect, useState, useMemo } from 'react';
import { useLocation } from '@docusaurus/router';
import { useChat } from '@ai-sdk/react';
import { TextStreamChatTransport } from 'ai';
import { Highlight, themes } from 'prism-react-renderer';
import { getPlaygroundContext, PlaygroundContext } from '../../hooks/usePlaygroundContext';

// Map common language aliases
const languageMap: Record<string, string> = {
  ts: 'typescript',
  js: 'javascript',
  tsx: 'tsx',
  jsx: 'jsx',
  json: 'json',
  bash: 'bash',
  sh: 'bash',
  shell: 'bash',
  text: 'text',
};

// CodeBlock component with syntax highlighting and copy functionality
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = React.useState(false);
  const normalizedLang = languageMap[language.toLowerCase()] || language.toLowerCase() || 'text';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="ai-code-block-wrapper">
      <div className="ai-code-block-header">
        <span className="ai-code-block-lang">{language || 'text'}</span>
        <button
          className="ai-code-block-copy"
          onClick={handleCopy}
          title={copied ? 'Copied!' : 'Copy code'}
        >
          {copied ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>
      </div>
      <Highlight
        theme={themes.dracula}
        code={code}
        language={normalizedLang as any}
      >
        {({ style, tokens, getLineProps, getTokenProps }) => (
          <pre className="ai-code-block" style={{ ...style, background: 'transparent', margin: 0 }}>
            <code>
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })}>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </code>
          </pre>
        )}
      </Highlight>
    </div>
  );
}

const suggestedPrompts = [
  "How do I get started with the SDK?",
  "Explain the escrow flow",
  "What's the difference between Level 0, 1, and 2 APIs?",
  "How does the state machine work?",
];

type ViewMode = 'floating' | 'docked' | 'expanded';

// API URL - use local server in development, Vercel in production
const API_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3001/api/chat'
  : '/api/chat';

// Welcome message
const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant' as const,
  content: "Hi! I'm your AGIRAILS SDK assistant. I can help you understand the protocol, write code, and answer questions about the documentation. What would you like to know?",
};

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('floating');
  const [sidebarWidth, setSidebarWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);
  const [playgroundContext, setPlaygroundContext] = useState<PlaygroundContext | null>(null);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Create transport with memoization to avoid recreating on every render
  const transport = useMemo(() => new TextStreamChatTransport({
    api: API_URL,
    body: { playgroundContext },
  }), [playgroundContext]);

  // Vercel AI SDK useChat hook (v6 API with text stream transport)
  const {
    messages,
    sendMessage,
    status,
    error,
    stop,
    regenerate,
  } = useChat({
    transport,
    messages: [WELCOME_MESSAGE],
    onError: (err) => {
      console.error('Chat error:', err);
    },
  });

  // Derive isLoading from status
  const isLoading = status === 'streaming' || status === 'submitted';

  // Helper to extract text content from message (AI SDK v6 uses parts array)
  const getMessageContent = (message: any): string => {
    // v6 format: message.parts array with { type: 'text', text: string }
    if (message.parts && Array.isArray(message.parts)) {
      return message.parts
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text)
        .join('');
    }
    // Fallback to v5 format: message.content string
    return message.content || '';
  };

  // Listen for playground context updates
  useEffect(() => {
    const handleContextUpdate = (event: CustomEvent<PlaygroundContext | null>) => {
      setPlaygroundContext(event.detail);
    };

    // Get initial context
    setPlaygroundContext(getPlaygroundContext());

    window.addEventListener('playground-context-update', handleContextUpdate as EventListener);
    return () => {
      window.removeEventListener('playground-context-update', handleContextUpdate as EventListener);
    };
  }, []);

  // Auto-scroll to bottom on new messages
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

  // Apply CSS custom property for docked state
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        sendMessage(input);
        setInput('');
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput('');
    }
  };

  // Parse markdown table into structured data
  const parseTable = (tableLines: string[]): { headers: string[]; rows: string[][] } | null => {
    if (tableLines.length < 2) return null;

    const parseRow = (line: string): string[] => {
      return line
        .split('|')
        .map(cell => cell.trim())
        .filter((_, i, arr) => i > 0 && i < arr.length); // Remove empty first/last from | borders
    };

    const headers = parseRow(tableLines[0]);
    if (headers.length === 0) return null;

    // Skip separator line (|---|---|)
    const dataLines = tableLines.slice(2);
    const rows = dataLines.map(parseRow).filter(row => row.length > 0);

    return { headers, rows };
  };

  // Render a markdown table
  const renderTable = (tableLines: string[], key: number) => {
    const table = parseTable(tableLines);
    if (!table) return null;

    return (
      <div key={key} className="ai-table-wrapper">
        <table className="ai-table">
          <thead>
            <tr>
              {table.headers.map((header, i) => (
                <th key={i}>{formatInline(header)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{formatInline(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Format message content with markdown support
  const formatContent = (content: string) => {
    if (!content) return null;

    // Split by code blocks first (preserve them)
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, partIndex) => {
      if (part.startsWith('```')) {
        // Extract language and code
        const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
        if (match) {
          const [, lang, code] = match;
          return (
            <CodeBlock key={partIndex} code={code.trim()} language={lang || 'text'} />
          );
        }
      }

      // Process markdown in non-code parts - handle tables specially
      const lines = part.split('\n');
      const elements: React.ReactNode[] = [];
      let i = 0;

      while (i < lines.length) {
        const line = lines[i];

        // Check if this is the start of a table (line starts with |)
        if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
          // Collect all table lines
          const tableLines: string[] = [];
          while (i < lines.length && lines[i].trim().startsWith('|')) {
            tableLines.push(lines[i]);
            i++;
          }
          // Render table if we have at least header + separator
          if (tableLines.length >= 2) {
            const tableElement = renderTable(tableLines, elements.length);
            if (tableElement) {
              elements.push(tableElement);
              continue;
            }
          }
          // If not a valid table, fall through to render lines normally
          i -= tableLines.length;
        }

        // Headers
        if (line.startsWith('### ')) {
          elements.push(<h4 key={elements.length} className="ai-heading">{formatInline(line.slice(4))}</h4>);
          i++;
          continue;
        }
        if (line.startsWith('## ')) {
          elements.push(<h3 key={elements.length} className="ai-heading">{formatInline(line.slice(3))}</h3>);
          i++;
          continue;
        }
        if (line.startsWith('# ')) {
          elements.push(<h2 key={elements.length} className="ai-heading">{formatInline(line.slice(2))}</h2>);
          i++;
          continue;
        }

        // Bullet points
        if (line.match(/^[\-\*]\s/)) {
          elements.push(
            <div key={elements.length} className="ai-list-item">
              <span className="ai-bullet">•</span>
              <span>{formatInline(line.slice(2))}</span>
            </div>
          );
          i++;
          continue;
        }

        // Numbered lists
        const numberedMatch = line.match(/^(\d+)\.\s(.*)$/);
        if (numberedMatch) {
          elements.push(
            <div key={elements.length} className="ai-list-item">
              <span className="ai-number">{numberedMatch[1]}.</span>
              <span>{formatInline(numberedMatch[2])}</span>
            </div>
          );
          i++;
          continue;
        }

        // Empty lines become breaks
        if (line.trim() === '') {
          elements.push(<br key={elements.length} />);
          i++;
          continue;
        }

        // Regular paragraph
        elements.push(<span key={elements.length}>{formatInline(line)}{i < lines.length - 1 ? '\n' : ''}</span>);
        i++;
      }

      return <span key={partIndex}>{elements}</span>;
    });
  };

  // Format inline markdown (bold, italic, code, links)
  const formatInline = (text: string): React.ReactNode => {
    if (!text) return null;

    // Process in order: links, bold, italic, inline code
    const elements: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Check for link [text](url)
      const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        elements.push(
          <a key={key++} href={linkMatch[2]} className="ai-link" target="_blank" rel="noopener noreferrer">
            {linkMatch[1]}
          </a>
        );
        remaining = remaining.slice(linkMatch[0].length);
        continue;
      }

      // Check for bold **text**
      const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
      if (boldMatch) {
        elements.push(<strong key={key++}>{boldMatch[1]}</strong>);
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      // Check for italic *text* (but not **)
      const italicMatch = remaining.match(/^\*([^*]+)\*/);
      if (italicMatch && !remaining.startsWith('**')) {
        elements.push(<em key={key++}>{italicMatch[1]}</em>);
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      // Check for inline code `text`
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        elements.push(<code key={key++} className="ai-inline-code">{codeMatch[1]}</code>);
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // No match - take next character
      const nextSpecial = remaining.search(/[\[*`]/);
      if (nextSpecial === -1) {
        elements.push(remaining);
        break;
      } else if (nextSpecial === 0) {
        // Special char but didn't match pattern - take it literally
        elements.push(remaining[0]);
        remaining = remaining.slice(1);
      } else {
        elements.push(remaining.slice(0, nextSpecial));
        remaining = remaining.slice(nextSpecial);
      }
    }

    return elements.length === 1 ? elements[0] : elements;
  };

  if (!isOpen) {
    return null;
  }

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
          {/* Stop generation button (when loading) */}
          {isLoading && (
            <button
              onClick={stop}
              className="ai-assistant-btn"
              aria-label="Stop generation"
              title="Stop"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          )}
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

      {/* Error Banner */}
      {error && (
        <div className="ai-error-banner">
          <span>{error.message || 'An error occurred'}</span>
          <button onClick={() => regenerate()}>Retry</button>
        </div>
      )}

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
              <div className="ai-message-text">{formatContent(getMessageContent(message))}</div>
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
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
        <form onSubmit={handleSubmit}>
          <div className="ai-input-row">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask about AGIRAILS..."
              rows={1}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="ai-send-btn"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </form>
        <p className="ai-disclaimer">AI can make mistakes. Verify important information.</p>
      </div>
    </div>
  );
}
