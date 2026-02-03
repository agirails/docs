import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

/**
 * AGIRAILS Documentation Sidebar Configuration
 *
 * Structure follows best practices from Stripe, Vercel, Twilio:
 * - Getting Started (immediate value)
 * - Core Concepts (understanding)
 * - SDK Reference (comprehensive, modular)
 * - Examples (runnable code)
 * - Guides (practical how-to)
 * - Protocol Specs (deep technical)
 */
const sidebars: SidebarsConfig = {
  docsSidebar: [
    // Landing page
    {
      type: 'doc',
      id: 'index',
      label: 'What is AGIRAILS?',
    },

    // Getting Started - Zero to Transaction in 15 min
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'installation',
        'quick-start',
      ],
    },

    // Core Concepts - Understanding the Protocol
    {
      type: 'category',
      label: 'Core Concepts',
      link: {
        type: 'doc',
        id: 'concepts/index',
      },
      items: [
        'concepts/actp-protocol',
        'concepts/transaction-lifecycle',
        'concepts/escrow-mechanism',
        'concepts/agent-identity',
        'concepts/fee-model',
      ],
    },

    // SDK Reference - Modular API Documentation
    {
      type: 'category',
      label: 'SDK Reference',
      link: {
        type: 'doc',
        id: 'sdk-reference/index',
      },
      items: [
        'sdk-reference/basic-api',
        'sdk-reference/standard-api',
        {
          type: 'category',
          label: 'Advanced API',
          link: {
            type: 'doc',
            id: 'sdk-reference/advanced-api/index',
          },
          items: [
            'sdk-reference/advanced-api/kernel',
            'sdk-reference/advanced-api/escrow',
            'sdk-reference/advanced-api/events',
            'sdk-reference/advanced-api/eas',
            'sdk-reference/advanced-api/quote',
            'sdk-reference/advanced-api/proof-generator',
            'sdk-reference/advanced-api/message-signer',
          ],
        },
        'sdk-reference/registry',
        'sdk-reference/utilities',
        'sdk-reference/errors',
      ],
    },

    // Examples - Runnable Code
    {
      type: 'doc',
      id: 'examples/index',
      label: 'Examples',
    },

    // Smart Contract Reference
    {
      type: 'doc',
      id: 'contract-reference',
      label: 'Contract Reference',
    },

    // Guides - Practical How-To
    {
      type: 'category',
      label: 'Guides',
      link: {
        type: 'doc',
        id: 'guides/index',
      },
      items: [
        {
          type: 'category',
          label: 'Building AI Agents',
          items: [
            'guides/agents/provider-agent',
            'guides/agents/consumer-agent',
            'guides/agents/autonomous-agent',
          ],
        },
        {
          type: 'category',
          label: 'Integrations',
          items: [
            'guides/integrations/n8n',
            'guides/integrations/claude-plugin',
            'guides/integrations/openclaw',
            'guides/integrations/langchain',
            'guides/integrations/crewai',
          ],
        },
      ],
    },

    // Cookbook - Production-Ready Recipes
    {
      type: 'category',
      label: 'Cookbook',
      link: {
        type: 'doc',
        id: 'cookbook/index',
      },
      items: [
        'cookbook/automated-provider-agent',
        'cookbook/api-pay-per-call',
        'cookbook/multi-agent-budget',
        'cookbook/secure-key-management',
        'cookbook/n8n-workflow',
      ],
    },

    // Developer Responsibilities
    {
      type: 'doc',
      id: 'developer-responsibilities',
      label: 'Developer Responsibilities',
    },
  ],
};

export default sidebars;
