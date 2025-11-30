import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

/**
 * AGIRAILS Documentation Sidebar Configuration
 *
 * Structure follows best practices from Stripe, Vercel, Twilio:
 * - Getting Started (immediate value)
 * - Core Concepts (understanding)
 * - Guides (practical how-to)
 * - API Reference (comprehensive)
 * - Protocol Specs (deep technical)
 *
 * NOTE: Only existing pages are listed. As content is created,
 * uncomment the relevant items in each section.
 */
const sidebars: SidebarsConfig = {
  // Main documentation sidebar
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
        'n8n-integration',
        // TODO: Create these pages
        // 'first-transaction',
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

    // SDK Reference - Complete API Documentation
    {
      type: 'doc',
      id: 'sdk-reference',
      label: 'SDK Reference',
    },

    // Smart Contract Reference - Complete Contract Documentation
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
      ],
    },
  ],

  // SDK Reference sidebar
  // TODO: Uncomment when SDK docs are created
  // sdkSidebar: [
  //   {
  //     type: 'doc',
  //     id: 'sdk/index',
  //     label: 'SDK Overview',
  //   },
  // ],

  // Smart Contracts sidebar
  // TODO: Uncomment when contract docs are created
  // contractsSidebar: [
  //   {
  //     type: 'doc',
  //     id: 'contracts/index',
  //     label: 'Contracts Overview',
  //   },
  // ],

  // Protocol Specifications (AIPs) sidebar
  // TODO: Uncomment when AIP docs are created
  // aipsSidebar: [
  //   {
  //     type: 'doc',
  //     id: 'aips/index',
  //     label: 'Protocol Specifications',
  //   },
  // ],
};

export default sidebars;
