import { useState, useCallback } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import './battle.css';

/**
 * Supported programming languages for syntax highlighting
 */
export type CodeLanguage = 'typescript' | 'python' | 'javascript' | 'solidity' | 'json' | 'bash';

/**
 * Props for the BattleCodeDisplay component
 */
export interface BattleCodeDisplayProps {
  /** The code string to display with syntax highlighting */
  code: string;
  /** Programming language for syntax highlighting */
  language: CodeLanguage;
  /** Callback when copy button is clicked */
  onCopy?: (code: string) => void;
  /** Optional comment/description shown above the code block */
  comment?: string;
}

/**
 * Copy icon SVG component
 */
const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
);

/**
 * Checkmark icon SVG component for copy success state
 */
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

/**
 * Map language names to Prism language identifiers
 */
const languageMap: Record<CodeLanguage, string> = {
  typescript: 'tsx',
  python: 'python',
  javascript: 'javascript',
  solidity: 'solidity',
  json: 'json',
  bash: 'bash',
};

/**
 * BattleCodeDisplay component with Prism.js syntax highlighting.
 * Features copy-to-clipboard functionality and optional comment display.
 *
 * @example
 * ```tsx
 * <BattleCodeDisplay
 *   code={`const client = await ACTPClient.create({...});`}
 *   language="typescript"
 *   onCopy={(code) => console.log('Copied:', code)}
 *   comment="// Initialize the ACTP client"
 * />
 * ```
 */
export default function BattleCodeDisplay({
  code,
  language,
  onCopy,
  comment,
}: BattleCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      onCopy?.(code);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  }, [code, onCopy]);

  const prismLanguage = languageMap[language] || 'typescript';

  return (
    <div className="battle-code-display">
      {comment && (
        <div className="battle-code-comment">
          <span>{comment}</span>
        </div>
      )}
      <div className="battle-code-container">
        <button
          className="battle-code-copy-btn"
          onClick={handleCopy}
          aria-label={copied ? 'Copied!' : 'Copy code'}
          title={copied ? 'Copied!' : 'Copy to clipboard'}
        >
          {copied ? (
            <>
              <CheckIcon />
              <span className="battle-code-copy-text success">Copied!</span>
            </>
          ) : (
            <>
              <CopyIcon />
              <span className="battle-code-copy-text">Copy</span>
            </>
          )}
        </button>
        <Highlight
          theme={themes.nightOwl}
          code={code.trim()}
          language={prismLanguage}
        >
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className={`battle-code ${className}`}
              style={{
                ...style,
                background: 'transparent',
                margin: 0,
                padding: '1rem',
              }}
            >
              <code>
                {tokens.map((line, lineIndex) => (
                  <div
                    key={lineIndex}
                    {...getLineProps({ line })}
                    className="battle-code-line"
                  >
                    <span className="battle-code-line-number">{lineIndex + 1}</span>
                    <span className="battle-code-line-content">
                      {line.map((token, tokenIndex) => (
                        <span key={tokenIndex} {...getTokenProps({ token })} />
                      ))}
                    </span>
                  </div>
                ))}
              </code>
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  );
}
