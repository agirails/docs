/**
 * Interactive Code Editor with Monaco
 * Allows editing and running SDK code
 */

import { useState, useCallback, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { Language, FormValues } from '../../types/playground';

interface CodeEditorProps {
  methodId: string;
  values: FormValues;
  onRun?: (code: string) => void;
  isRunning?: boolean;
}

// Code templates for each method
function getTypeScriptTemplate(methodId: string, values: FormValues): string {
  const providerShort = values.provider
    ? `${values.provider.slice(0, 6)}...${values.provider.slice(-4)}`
    : '0x742d...5f12';
  const amount = values.amount || '100';
  const deadlineSeconds = values.deadlineUnit === 'days'
    ? parseInt(values.deadlineValue || '1') * 86400
    : parseInt(values.deadlineValue || '24') * 3600;

  switch (methodId) {
    case 'createTransaction':
      return `import { ACTPClient } from '@agirails/sdk';
import { parseUnits } from 'ethers';

const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY
});

// Create a new transaction
const txId = await client.kernel.createTransaction({
  provider: '${providerShort}',
  requester: await client.getAddress(),
  amount: parseUnits('${amount}', 6),
  deadline: Math.floor(Date.now()/1000) + ${deadlineSeconds},
  disputeWindow: 3600
});

console.log('Transaction created:', txId);`;

    case 'linkEscrow':
      return `import { ACTPClient } from '@agirails/sdk';
import { id } from 'ethers';

const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY
});

// Transaction ID from previous step
const txId = '${values.txId || '0x...'}';

// Generate unique escrow ID
const escrowId = id(\`escrow-\${txId}-\${Date.now()}\`);

// Link escrow (auto-transitions to COMMITTED)
await client.kernel.linkEscrow(
  txId,
  '${values.escrowAddress || '0x6aDB...7ba'}',
  escrowId
);

console.log('Escrow linked successfully');`;

    case 'transitionState':
      return `import { ACTPClient, State } from '@agirails/sdk';

const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY
});

// Transaction ID
const txId = '${values.txId || '0x...'}';

// Transition to new state
await client.kernel.transitionState(
  txId,
  State.${values.newState || 'IN_PROGRESS'}
);

console.log('State transitioned to ${values.newState || 'IN_PROGRESS'}');`;

    case 'releaseEscrow':
      return `import { ACTPClient } from '@agirails/sdk';

const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY
});

// Transaction ID
const txId = '${values.txId || '0x...'}';

// Release escrow to provider
await client.kernel.releaseEscrow(txId);

console.log('Escrow released for:', txId);`;

    case 'getTransaction':
      return `import { ACTPClient } from '@agirails/sdk';

const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY
});

// Get transaction details
const txId = '${values.txId || '0x...'}';
const tx = await client.kernel.getTransaction(txId);

console.log('Transaction:', tx);
console.log('State:', tx.state);
console.log('Amount:', tx.amount);`;

    case 'getEscrowBalance':
      return `import { ACTPClient } from '@agirails/sdk';

const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY
});

// Get escrow balance
const balance = await client.escrow.getBalance(
  await client.getAddress()
);

console.log('Escrow balance:', balance, 'USDC');`;

    case 'initiateDispute':
      return `import { ACTPClient, State } from '@agirails/sdk';

const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY
});

// Transaction ID
const txId = '${values.txId || '0x...'}';

// Initiate dispute
await client.kernel.transitionState(txId, State.DISPUTED);

console.log('Dispute initiated for:', txId);
console.log('Reason: ${values.reason || 'Service not delivered as expected'}');`;

    case 'resolveDispute':
      return `import { ACTPClient } from '@agirails/sdk';

const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY
});

// Transaction ID
const txId = '${values.txId || '0x...'}';

// Resolve dispute (admin/mediator only)
// Resolution: RELEASE (to provider), REFUND (to requester), or SPLIT
await client.kernel.resolveDispute(
  txId,
  '${values.resolution || 'RELEASE'}'
);

console.log('Dispute resolved:', '${values.resolution || 'RELEASE'}');`;

    case 'anchorAttestation':
      return `import { ACTPClient } from '@agirails/sdk';

const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY
});

// Transaction ID
const txId = '${values.txId || '0x...'}';

// Anchor attestation (proof of delivery)
const attestationUID = await client.proofs.anchorAttestation(
  txId,
  '${values.attestation || '0x...'}'
);

console.log('Attestation anchored:', attestationUID);`;

    default:
      return `import { ACTPClient } from '@agirails/sdk';

const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY
});

// Your code here
const result = await client.kernel.${methodId}();
console.log('Result:', result);`;
  }
}

function getPythonTemplate(methodId: string, values: FormValues): string {
  const providerShort = values.provider
    ? `${values.provider.slice(0, 6)}...${values.provider.slice(-4)}`
    : '0x742d...5f12';
  const amount = values.amount || '100';
  const deadlineSeconds = values.deadlineUnit === 'days'
    ? parseInt(values.deadlineValue || '1') * 86400
    : parseInt(values.deadlineValue || '24') * 3600;

  switch (methodId) {
    case 'createTransaction':
      return `import os
from agirails_sdk import ACTPClient, Network

client = ACTPClient(
    network=Network.BASE_SEPOLIA,
    private_key=os.getenv("PRIVATE_KEY")
)

# Create a new transaction
tx_id = client.create_transaction(
    provider="${providerShort}",
    requester=client.address,
    amount=${parseInt(amount) * 1_000_000},  # ${amount} USDC
    deadline=client.now() + ${deadlineSeconds},
    dispute_window=3600
)

print(f"Transaction created: {tx_id}")`;

    case 'linkEscrow':
      return `import os
from agirails_sdk import ACTPClient, Network

client = ACTPClient(
    network=Network.BASE_SEPOLIA,
    private_key=os.getenv("PRIVATE_KEY")
)

# Transaction ID from previous step
tx_id = "${values.txId || '0x...'}"

# Link escrow (auto-approves USDC and transitions to COMMITTED)
escrow_id = client.link_escrow(tx_id=tx_id)
print(f"Escrow linked: {escrow_id}")`;

    default:
      return `import os
from agirails_sdk import ACTPClient, Network

client = ACTPClient(
    network=Network.BASE_SEPOLIA,
    private_key=os.getenv("PRIVATE_KEY")
)

# Your code here
result = client.${methodId.replace(/([A-Z])/g, '_$1').toLowerCase()}()
print(f"Result: {result}")`;
  }
}

export default function CodeEditor({ methodId, values, onRun, isRunning }: CodeEditorProps) {
  const [language, setLanguage] = useState<Language>('typescript');
  const [code, setCode] = useState(() => getTypeScriptTemplate(methodId, values));
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<any>(null);

  // Update code when method or values change
  const updateTemplate = useCallback(() => {
    const newCode = language === 'typescript'
      ? getTypeScriptTemplate(methodId, values)
      : getPythonTemplate(methodId, values);
    setCode(newCode);
  }, [methodId, values, language]);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    const newCode = newLang === 'typescript'
      ? getTypeScriptTemplate(methodId, values)
      : getPythonTemplate(methodId, values);
    setCode(newCode);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRun = () => {
    if (onRun) {
      onRun(code);
    }
  };

  const handleReset = () => {
    updateTemplate();
  };

  const installCmd = language === 'typescript'
    ? 'npm install @agirails/sdk'
    : 'pip install agirails';

  return (
    <div className="pg-code-editor">
      {/* Header */}
      <div className="pg-code-header">
        <div className="pg-code-tabs">
          <button
            onClick={() => handleLanguageChange('typescript')}
            className={`pg-code-tab ${language === 'typescript' ? 'active' : ''}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 0 1 1.306.34v2.458a3.95 3.95 0 0 0-.643-.361 5.093 5.093 0 0 0-.717-.26 5.453 5.453 0 0 0-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 0 0-.623.242c-.17.104-.3.229-.393.374a.888.888 0 0 0-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 0 1-1.012 1.085 4.38 4.38 0 0 1-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 0 1-1.84-.164 5.544 5.544 0 0 1-1.512-.493v-2.63a5.033 5.033 0 0 0 3.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 0 0-.074-1.089 2.12 2.12 0 0 0-.537-.5 5.597 5.597 0 0 0-.807-.444 27.72 27.72 0 0 0-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 0 1 1.47-.629 7.536 7.536 0 0 1 1.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z"/>
            </svg>
            TypeScript
          </button>
          <button
            onClick={() => handleLanguageChange('python')}
            className={`pg-code-tab ${language === 'python' ? 'active' : ''}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14.25.18l.9.2.73.26.59.3.45.32.34.34.25.34.16.33.1.3.04.26.02.2-.01.13V8.5l-.05.63-.13.55-.21.46-.26.38-.3.31-.33.25-.35.19-.35.14-.33.1-.3.07-.26.04-.21.02H8.77l-.69.05-.59.14-.5.22-.41.27-.33.32-.27.35-.2.36-.15.37-.1.35-.07.32-.04.27-.02.21v3.06H3.17l-.21-.03-.28-.07-.32-.12-.35-.18-.36-.26-.36-.36-.35-.46-.32-.59-.28-.73-.21-.88-.14-1.05-.05-1.23.06-1.22.16-1.04.24-.87.32-.71.36-.57.4-.44.42-.33.42-.24.4-.16.36-.1.32-.05.24-.01h.16l.06.01h8.16v-.83H6.18l-.01-2.75-.02-.37.05-.34.11-.31.17-.28.25-.26.31-.23.38-.2.44-.18.51-.15.58-.12.64-.1.71-.06.77-.04.84-.02 1.27.05zm-6.3 1.98l-.23.33-.08.41.08.41.23.34.33.22.41.09.41-.09.33-.22.23-.34.08-.41-.08-.41-.23-.33-.33-.22-.41-.09-.41.09zm13.09 3.95l.28.06.32.12.35.18.36.27.36.35.35.47.32.59.28.73.21.88.14 1.04.05 1.23-.06 1.23-.16 1.04-.24.86-.32.71-.36.57-.4.45-.42.33-.42.24-.4.16-.36.09-.32.05-.24.02-.16-.01h-8.22v.82h5.84l.01 2.76.02.36-.05.34-.11.31-.17.29-.25.25-.31.24-.38.2-.44.17-.51.15-.58.13-.64.09-.71.07-.77.04-.84.01-1.27-.04-1.07-.14-.9-.2-.73-.25-.59-.3-.45-.33-.34-.34-.25-.34-.16-.33-.1-.3-.04-.25-.02-.2.01-.13v-5.34l.05-.64.13-.54.21-.46.26-.38.3-.32.33-.24.35-.2.35-.14.33-.1.3-.06.26-.04.21-.02.13-.01h5.84l.69-.05.59-.14.5-.21.41-.28.33-.32.27-.35.2-.36.15-.36.1-.35.07-.32.04-.28.02-.21V6.07h2.09l.14.01zm-6.47 14.25l-.23.33-.08.41.08.41.23.33.33.23.41.08.41-.08.33-.23.23-.33.08-.41-.08-.41-.23-.33-.33-.23-.41-.08-.41.08z"/>
            </svg>
            Python
          </button>
        </div>

        <div className="pg-code-actions">
          <button onClick={handleReset} className="pg-code-action-btn" title="Reset to template">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </button>
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
      </div>

      {/* Monaco Editor */}
      <div className="pg-monaco-wrapper">
        <Editor
          height="300px"
          language={language === 'typescript' ? 'typescript' : 'python'}
          value={code}
          onChange={(value) => setCode(value || '')}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: 'line',
            cursorBlinking: 'smooth',
            smoothScrolling: true,
          }}
        />
      </div>

      {/* Footer */}
      <div className="pg-code-footer">
        <div className="pg-install-hint">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
          <span className="pg-install-cmd">{installCmd}</span>
        </div>

        {onRun && (
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="pg-btn pg-btn-primary pg-run-btn"
          >
            {isRunning ? (
              <>
                <div className="pg-spinner" />
                Running...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                Run Code
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
