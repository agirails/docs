import { useState } from 'react';
import { Check, Copy, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Language, FormValues } from '@/types/playground';
import { cn } from '@/lib/utils';

interface CodeDisplayProps {
  methodId: string;
  values: FormValues;
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

const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY
});

const txId = await client.kernel.createTransaction({
  provider: '${providerShort}',
  amount: parseUnits('${amount}', 6),
  deadline: Math.floor(Date.now()/1000) + ${deadlineSeconds}
});`;
      case 'linkEscrow':
        return `import { ACTPClient } from '@agirails/sdk';

const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY
});

await client.kernel.linkEscrow({
  transactionId: txId,
  escrowAddress: '${values.escrowAddress || '0x8a4c...6A8C'}'
});`;
      case 'transitionState':
        return `import { ACTPClient, TransactionState } from '@agirails/sdk';

const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY
});

await client.kernel.transitionState({
  transactionId: txId,
  newState: TransactionState.${values.newState || 'IN_PROGRESS'}
});`;
      case 'releaseEscrow':
        return `import { ACTPClient } from '@agirails/sdk';

const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY
});

const receipt = await client.escrow.release({
  transactionId: txId
});

console.log('Released:', receipt.transactionHash);`;
      default:
        return `import { ACTPClient } from '@agirails/sdk';

const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY
});

// Call ${methodId}
const result = await client.kernel.${methodId}();`;
    }
  };

  const getPythonCode = () => {
    switch (methodId) {
      case 'createTransaction':
        return `from agirails_sdk import ACTPClient, Network

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
        return `from agirails_sdk import ACTPClient, Network

client = ACTPClient(
    network=Network.BASE_SEPOLIA,
    private_key=os.getenv("PRIVATE_KEY")
)

client.link_escrow(
    transaction_id=tx_id,
    escrow_address="${values.escrowAddress || '0x8a4c...6A8C'}"
)`;
      case 'transitionState':
        return `from agirails_sdk import ACTPClient, Network, State

client = ACTPClient(
    network=Network.BASE_SEPOLIA,
    private_key=os.getenv("PRIVATE_KEY")
)

client.transition_state(
    transaction_id=tx_id,
    new_state=State.${values.newState || 'IN_PROGRESS'}
)`;
      case 'releaseEscrow':
        return `from agirails_sdk import ACTPClient, Network

client = ACTPClient(
    network=Network.BASE_SEPOLIA,
    private_key=os.getenv("PRIVATE_KEY")
)

receipt = client.release_escrow(transaction_id=tx_id)
print(f"Released: {receipt.transaction_hash}")`;
      default:
        return `from agirails_sdk import ACTPClient, Network

client = ACTPClient(
    network=Network.BASE_SEPOLIA,
    private_key=os.getenv("PRIVATE_KEY")
)

# Call ${methodId}
result = client.${methodId.replace(/([A-Z])/g, '_$1').toLowerCase()}()`;
    }
  };

  const code = language === 'typescript' ? getTypeScriptCode() : getPythonCode();
  const installCmd = language === 'typescript' 
    ? 'npm install @agirails/sdk ethers'
    : 'pip install agirails-sdk';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split('\n');

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-secondary">
        <div className="flex gap-1">
          <button
            onClick={() => setLanguage('typescript')}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors duration-200",
              language === 'typescript'
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            TypeScript
          </button>
          <button
            onClick={() => setLanguage('python')}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors duration-200",
              language === 'python'
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Python
          </button>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleCopy}
          className="gap-2"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-success" />
              <span className="text-success">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy
            </>
          )}
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 bg-background/50">
        <pre className="text-code font-mono">
          <code>
            {lines.map((line, i) => (
              <div key={i} className="flex">
                <span className="w-8 text-right pr-4 text-muted-foreground select-none">
                  {i + 1}
                </span>
                <span className="flex-1">
                  {highlightSyntax(line, language)}
                </span>
              </div>
            ))}
          </code>
        </pre>
      </div>

      <div className="p-3 border-t border-secondary bg-muted/30">
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
          <Package className="w-4 h-4" />
          {installCmd}
        </div>
      </div>
    </div>
  );
}

function highlightSyntax(line: string, lang: Language): React.ReactNode {
  const keywords = lang === 'typescript' 
    ? ['import', 'from', 'const', 'await', 'async', 'export', 'function', 'let', 'var', 'return', 'new', 'throw', 'if', 'else']
    : ['from', 'import', 'def', 'class', 'await', 'async', 'return', 'if', 'else', 'try', 'except', 'with', 'as'];
  
  const builtins = lang === 'typescript'
    ? ['console', 'Math', 'Date', 'process', 'parseUnits', 'ACTPClient']
    : ['print', 'os', 'int', 'str', 'float', 'ACTPClient', 'Network', 'State'];

  const parts: React.ReactNode[] = [];
  let remaining = line;
  let key = 0;

  const stringRegex = /(['"`])((?:\\\1|(?:(?!\1)).)*)(\1)/;
  const commentRegex = lang === 'typescript' ? /\/\/.*$/ : /#.*$/;
  const numberRegex = /\b(\d+(?:_\d+)*)\b/;
  const functionCallRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/;
  const propertyRegex = /\.([a-zA-Z_][a-zA-Z0-9_]*)/;

  while (remaining.length > 0) {
    let matched = false;

    // Check for comments first
    const commentMatch = remaining.match(commentRegex);
    if (commentMatch && remaining.indexOf(commentMatch[0]) === 0) {
      parts.push(<span key={key++} className="syntax-comment">{commentMatch[0]}</span>);
      remaining = remaining.slice(commentMatch[0].length);
      matched = true;
      continue;
    }

    // Check for strings
    const stringMatch = remaining.match(stringRegex);
    if (stringMatch) {
      const idx = remaining.indexOf(stringMatch[0]);
      if (idx === 0) {
        parts.push(<span key={key++} className="syntax-string">{stringMatch[0]}</span>);
        remaining = remaining.slice(stringMatch[0].length);
        matched = true;
        continue;
      }
    }

    // Check for property access (after dot)
    if (remaining.startsWith('.')) {
      const propMatch = remaining.match(propertyRegex);
      if (propMatch) {
        parts.push(<span key={key++} className="syntax-punctuation">.</span>);
        parts.push(<span key={key++} className="syntax-property">{propMatch[1]}</span>);
        remaining = remaining.slice(propMatch[0].length);
        matched = true;
        continue;
      }
    }

    // Check for keywords
    for (const kw of keywords) {
      if (remaining.startsWith(kw) && (remaining.length === kw.length || /\W/.test(remaining[kw.length]))) {
        parts.push(<span key={key++} className="syntax-keyword">{kw}</span>);
        remaining = remaining.slice(kw.length);
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Check for builtins/classes
    for (const builtin of builtins) {
      if (remaining.startsWith(builtin) && (remaining.length === builtin.length || /\W/.test(remaining[builtin.length]))) {
        parts.push(<span key={key++} className="syntax-function">{builtin}</span>);
        remaining = remaining.slice(builtin.length);
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Check for function calls
    const funcMatch = remaining.match(functionCallRegex);
    if (funcMatch && remaining.indexOf(funcMatch[0]) === 0) {
      parts.push(<span key={key++} className="syntax-function">{funcMatch[1]}</span>);
      parts.push(<span key={key++} className="syntax-punctuation">(</span>);
      remaining = remaining.slice(funcMatch[0].length);
      matched = true;
      continue;
    }

    // Check for numbers
    const numMatch = remaining.match(numberRegex);
    if (numMatch && remaining.indexOf(numMatch[0]) === 0) {
      parts.push(<span key={key++} className="syntax-number">{numMatch[0]}</span>);
      remaining = remaining.slice(numMatch[0].length);
      continue;
    }

    // Check for punctuation
    if (/[{}()\[\];,:]/.test(remaining[0])) {
      parts.push(<span key={key++} className="syntax-punctuation">{remaining[0]}</span>);
      remaining = remaining.slice(1);
      continue;
    }

    // Check for operators
    if (/[=+\-*/<>!&|]/.test(remaining[0])) {
      parts.push(<span key={key++} className="syntax-operator">{remaining[0]}</span>);
      remaining = remaining.slice(1);
      continue;
    }

    parts.push(remaining[0]);
    remaining = remaining.slice(1);
  }

  return parts;
}
