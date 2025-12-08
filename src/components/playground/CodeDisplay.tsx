import { useState, useMemo } from 'react';
import { Language, FormValues } from '../../types/playground';

interface CodeDisplayProps {
  methodId: string;
  values: FormValues;
}

// Simple syntax highlighter
function highlightCode(code: string, lang: Language): React.ReactNode[] {
  const lines = code.split('\n');

  return lines.map((line, lineIndex) => {
    const tokens: React.ReactNode[] = [];
    let remaining = line;
    let keyIndex = 0;

    // Process line character by character with regex matching
    while (remaining.length > 0) {
      let matched = false;

      // Comments (// or #)
      const commentMatch = remaining.match(/^(\/\/.*|#.*)$/);
      if (commentMatch) {
        tokens.push(<span key={keyIndex++} className="pg-hl-comment">{commentMatch[0]}</span>);
        remaining = '';
        matched = true;
      }

      // Strings (single or double quotes)
      if (!matched) {
        const stringMatch = remaining.match(/^(['"`])((?:\\.|(?!\1)[^\\])*)\1/);
        if (stringMatch) {
          tokens.push(<span key={keyIndex++} className="pg-hl-string">{stringMatch[0]}</span>);
          remaining = remaining.slice(stringMatch[0].length);
          matched = true;
        }
      }

      // Keywords
      if (!matched) {
        const keywords = lang === 'typescript'
          ? /^(import|from|export|const|let|var|async|await|function|return|if|else|new|class|extends|implements|interface|type|enum)\b/
          : /^(import|from|def|class|return|if|else|elif|for|while|try|except|with|as|async|await|True|False|None)\b/;
        const keywordMatch = remaining.match(keywords);
        if (keywordMatch) {
          tokens.push(<span key={keyIndex++} className="pg-hl-keyword">{keywordMatch[0]}</span>);
          remaining = remaining.slice(keywordMatch[0].length);
          matched = true;
        }
      }

      // Built-ins / Types
      if (!matched) {
        const builtinMatch = remaining.match(/^(Math|Date|console|process|os|parseInt|parseFloat|parseUnits|id|ACTPClient|Network|State)\b/);
        if (builtinMatch) {
          tokens.push(<span key={keyIndex++} className="pg-hl-builtin">{builtinMatch[0]}</span>);
          remaining = remaining.slice(builtinMatch[0].length);
          matched = true;
        }
      }

      // Numbers
      if (!matched) {
        const numberMatch = remaining.match(/^\d+(_\d+)*\.?\d*/);
        if (numberMatch) {
          tokens.push(<span key={keyIndex++} className="pg-hl-number">{numberMatch[0]}</span>);
          remaining = remaining.slice(numberMatch[0].length);
          matched = true;
        }
      }

      // Function calls
      if (!matched) {
        const funcMatch = remaining.match(/^([a-zA-Z_][a-zA-Z0-9_]*)(\s*\()/);
        if (funcMatch) {
          tokens.push(<span key={keyIndex++} className="pg-hl-function">{funcMatch[1]}</span>);
          tokens.push(<span key={keyIndex++}>{funcMatch[2]}</span>);
          remaining = remaining.slice(funcMatch[0].length);
          matched = true;
        }
      }

      // Property access
      if (!matched) {
        const propMatch = remaining.match(/^\.([a-zA-Z_][a-zA-Z0-9_]*)/);
        if (propMatch) {
          tokens.push(<span key={keyIndex++}>.</span>);
          tokens.push(<span key={keyIndex++} className="pg-hl-property">{propMatch[1]}</span>);
          remaining = remaining.slice(propMatch[0].length);
          matched = true;
        }
      }

      // Default: take one character
      if (!matched) {
        tokens.push(<span key={keyIndex++}>{remaining[0]}</span>);
        remaining = remaining.slice(1);
      }
    }

    return { lineIndex, tokens };
  });
}

export default function CodeDisplay({ methodId, values }: CodeDisplayProps) {
  const [language, setLanguage] = useState<Language>('typescript');
  const [copied, setCopied] = useState(false);

  const providerShort = values.provider
    ? `${values.provider.slice(0, 6)}...${values.provider.slice(-4)}`
    : '0x742d...5f12';

  const amount = values.amount || '100';
  const deadlineSeconds = values.deadlineUnit === 'days'
    ? parseInt(values.deadlineValue || '1') * 86400
    : parseInt(values.deadlineValue || '24') * 3600;

  const getTypeScriptCode = () => {
    switch (methodId) {
      case 'createTransaction':
        return `import { ACTPClient } from '@agirails/sdk';
import { parseUnits } from 'ethers';

const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY
});

const txId = await client.kernel.createTransaction({
  provider: '${providerShort}',
  requester: await client.getAddress(),
  amount: parseUnits('${amount}', 6),
  deadline: Math.floor(Date.now()/1000) + ${deadlineSeconds},
  disputeWindow: 3600
});`;
      case 'linkEscrow':
        return `import { ACTPClient } from '@agirails/sdk';
import { id } from 'ethers';

const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY
});

// Generate unique escrow ID
const escrowId = id(\`escrow-\${txId}-\${Date.now()}\`);

// Link escrow (auto-transitions to COMMITTED)
await client.kernel.linkEscrow(
  txId,
  '${values.escrowAddress || '0x6aDB...7ba'}',
  escrowId
);`;
      case 'transitionState':
        return `import { ACTPClient, State } from '@agirails/sdk';

const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY
});

await client.kernel.transitionState(
  txId,
  State.${values.newState || 'IN_PROGRESS'}
);`;
      case 'releaseEscrow':
        return `import { ACTPClient } from '@agirails/sdk';

const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY
});

await client.kernel.releaseEscrow(txId);

console.log('Escrow released for:', txId);`;
      default:
        return `import { ACTPClient } from '@agirails/sdk';

const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY
});

// Call ${methodId}
const result = await client.kernel.${methodId}(txId);`;
    }
  };

  const getPythonCode = () => {
    switch (methodId) {
      case 'createTransaction':
        return `import os
from agirails_sdk import ACTPClient, Network

client = ACTPClient(
    network=Network.BASE_SEPOLIA,
    private_key=os.getenv("PRIVATE_KEY")
)

tx_id = client.create_transaction(
    provider="${providerShort}",
    requester=client.address,
    amount=${parseInt(amount) * 1_000_000},  # ${amount} USDC
    deadline=client.now() + ${deadlineSeconds},
    dispute_window=3600
)`;
      case 'linkEscrow':
        return `import os
from agirails_sdk import ACTPClient, Network

client = ACTPClient(
    network=Network.BASE_SEPOLIA,
    private_key=os.getenv("PRIVATE_KEY")
)

# Link escrow (auto-approves USDC and transitions to COMMITTED)
escrow_id = client.link_escrow(tx_id=tx_id)
print(f"Escrow linked: {escrow_id}")`;
      case 'transitionState':
        return `import os
from agirails_sdk import ACTPClient, Network, State

client = ACTPClient(
    network=Network.BASE_SEPOLIA,
    private_key=os.getenv("PRIVATE_KEY")
)

client.transition_state(
    tx_id=tx_id,
    new_state=State.${values.newState || 'IN_PROGRESS'}
)`;
      case 'releaseEscrow':
        return `import os
from agirails_sdk import ACTPClient, Network

client = ACTPClient(
    network=Network.BASE_SEPOLIA,
    private_key=os.getenv("PRIVATE_KEY")
)

receipt = client.release_escrow(tx_id=tx_id)
print(f"Escrow released for: {tx_id}")`;
      default:
        return `import os
from agirails_sdk import ACTPClient, Network

client = ACTPClient(
    network=Network.BASE_SEPOLIA,
    private_key=os.getenv("PRIVATE_KEY")
)

# Call ${methodId}
result = client.${methodId.replace(/([A-Z])/g, '_$1').toLowerCase()}(tx_id)`;
    }
  };

  const code = language === 'typescript' ? getTypeScriptCode() : getPythonCode();
  const installCmd = language === 'typescript'
    ? 'npm install @agirails/sdk'
    : 'pip install agirails-sdk';

  const highlightedLines = useMemo(() => highlightCode(code, language), [code, language]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="pg-code-panel">
      <div className="pg-code-header">
        <div className="pg-code-tabs">
          <button
            onClick={() => setLanguage('typescript')}
            className={`pg-code-tab ${language === 'typescript' ? 'active' : ''}`}
          >
            TypeScript
          </button>
          <button
            onClick={() => setLanguage('python')}
            className={`pg-code-tab ${language === 'python' ? 'active' : ''}`}
          >
            Python
          </button>
        </div>
        <button onClick={handleCopy} className="pg-copy-btn">
          {copied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span style={{ color: 'var(--pg-success)' }}>Copied!</span>
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>

      <div className="pg-code-block">
        <pre className="pg-code-content">
          <code>
            {highlightedLines.map(({ lineIndex, tokens }) => (
              <div key={lineIndex} className="pg-code-line">
                <span className="pg-line-number">{lineIndex + 1}</span>
                <span className="pg-line-content">{tokens}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>

      <div className="pg-code-footer">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
        <span className="pg-install-cmd">{installCmd}</span>
      </div>
    </div>
  );
}
