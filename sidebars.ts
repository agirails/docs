import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

/**
 * AGIRAILS docs IA — Wave A.1 (post-truth-ledger).
 *
 * Five top-level surfaces:
 *   1. Home (index)
 *   2. Start (LLM onboarding + manual + AI-environment matrix)
 *   3. Protocol (canonical spec wrapper)
 *   4. Reference (auto-extracted from truth-ledger)
 *   5. Recipes (merged former guides + cookbook)
 *
 * Old pages (concepts/, sdk-reference/, guides/, cookbook/, examples/,
 * installation, quick-start, cli-reference, contract-reference,
 * error-reference, agent-integration, developer-responsibilities) are
 * NOT in this sidebar. Their URLs 301-redirect via vercel.json.
 */
const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'doc',
      id: 'index',
      label: 'What is AGIRAILS?',
    },

    {
      type: 'doc',
      id: 'why',
      label: 'Why AGIRAILS exists',
    },

    {
      type: 'category',
      label: 'Start',
      collapsed: false,
      link: { type: 'doc', id: 'start/index' },
      items: [
        'start/manual',
        'start/agent-onboarding-prompt',
        {
          type: 'category',
          label: 'Get AGIRAILS into your AI tool',
          link: { type: 'doc', id: 'start/ai-environment/index' },
          items: [
            'start/ai-environment/claude-code',
            'start/ai-environment/claude-skill',
            'start/ai-environment/mcp-server',
            'start/ai-environment/openclaw',
          ],
        },
      ],
    },

    {
      type: 'category',
      label: 'Protocol',
      collapsed: false,
      link: { type: 'doc', id: 'protocol/index' },
      items: [
        'protocol/agirails-md',
        'protocol/covenant',
        'protocol/state-machine',
        'protocol/escrow',
        'protocol/fees',
        'protocol/quote-channel',
        'protocol/identity',
        'protocol/adapters',
        'protocol/web-receipts',
        'protocol/x402',
      ],
    },

    {
      type: 'category',
      label: 'Recipes',
      link: { type: 'doc', id: 'recipes/index' },
      items: [
        'recipes/provider-agent',
        'recipes/consumer-agent',
        'recipes/autonomous-agent',
        'recipes/gasless-payment',
        'recipes/per-call-api',
        'recipes/quote-negotiation',
        'recipes/dispute-flow',
        'recipes/receipts-and-discovery',
        'recipes/keystore-and-deployment',
        'recipes/n8n',
        'recipes/langchain',
        'recipes/crewai',
        'recipes/claude-code-plugin',
      ],
    },

    {
      type: 'category',
      label: 'Reference',
      link: { type: 'doc', id: 'reference/index' },
      items: [
        'reference/cli/index',
        {
          type: 'category',
          label: 'Contracts',
          link: { type: 'doc', id: 'reference/contracts/index' },
          items: [
            'reference/contracts/base-mainnet',
            'reference/contracts/base-sepolia',
          ],
        },
        {
          type: 'category',
          label: 'TypeScript SDK',
          link: { type: 'doc', id: 'reference/sdk-js/index' },
          items: [
            'reference/sdk-js/basic',
            'reference/sdk-js/standard',
          ],
        },
        {
          type: 'doc',
          id: 'reference/sdk-python/index',
          label: 'Python SDK',
        },
        'reference/errors/index',
        'reference/mcp-server/index',
        'reference/agirails-md-v4',
      ],
    },

    {
      type: 'category',
      label: 'Security',
      link: { type: 'doc', id: 'security/index' },
      items: [
        'security/threat-model',
        'security/audits',
        'security/contracts',
        'security/formal-verification',
        'security/testing',
        'security/disclosure',
      ],
    },

    {
      type: 'doc',
      id: 'faq/index',
      label: 'FAQ',
    },

    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/operate/index',
      ],
    },
  ],
};

export default sidebars;
