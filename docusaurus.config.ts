import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'AGIRAILS Documentation',
  tagline: 'Payment Rails for AI Agents - Build autonomous AI economies',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  // Production URL
  url: 'https://docs.agirails.io',
  baseUrl: '/',

  // GitHub config
  organizationName: 'agirails',
  projectName: 'agirails-docs',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/', // Docs at root, not /docs
          editUrl: 'https://github.com/agirails/agirails/tree/main/docs-site/',
          showLastUpdateTime: true,
          showLastUpdateAuthor: false, // Hide individual names, show "Core Team" via footer
        },
        blog: {
          path: 'updates',
          routeBasePath: 'updates',
          blogTitle: 'AGIRAILS Updates',
          blogDescription: 'Release notes, engineering insights, and ecosystem news from AGIRAILS',
          blogSidebarTitle: 'Recent Updates',
          blogSidebarCount: 10,
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
            title: 'AGIRAILS Updates',
            description: 'Release notes, engineering insights, and ecosystem news',
          },
          editUrl: 'https://github.com/agirails/agirails/tree/main/docs-site/',
          tags: 'tags.yml',
          onInlineTags: 'throw',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/agirails-social-card.png',

    // Announcement bar for important updates
    announcementBar: {
      id: 'testnet_live',
      content: '🚀 AGIRAILS is live on Base Sepolia Testnet! <a href="/quick-start">Try it now →</a>',
      backgroundColor: '#0052FF', // Base blue
      textColor: '#ffffff',
      isCloseable: true,
    },

    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: false,
    },

    navbar: {
      title: '',
      logo: {
        alt: 'AGIRAILS Logo',
        src: 'img/logo.png',
        href: 'https://www.agirails.io',
        target: '_self',
        height: 32,
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentation',
        },
        // TODO: Uncomment when pages exist
        // {
        //   to: '/sdk',
        //   label: 'SDK Reference',
        //   position: 'left',
        // },
        // {
        //   to: '/contracts',
        //   label: 'Contracts',
        //   position: 'left',
        // },
        // {
        //   to: '/aips',
        //   label: 'Protocol Specs',
        //   position: 'left',
        // },
        {
          to: '/updates',
          label: 'Updates',
          position: 'left',
        },
        // Right side
        {
          href: 'https://github.com/agirails',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://discord.gg/nuhCt75qe4',
          label: 'Discord',
          position: 'right',
        },
      ],
    },

    footer: {
      style: 'dark',
      links: [
        {
          title: 'Learn',
          items: [
            { label: 'What is AGIRAILS?', to: '/' },
            { label: 'Quick Start', to: '/quick-start' },
            // TODO: Add when pages exist
            // { label: 'Core Concepts', to: '/concepts' },
            // { label: 'Tutorials', to: '/tutorials' },
          ],
        },
        {
          title: 'Develop',
          items: [
            // TODO: Add when pages exist
            // { label: 'SDK Reference', to: '/sdk' },
            // { label: 'Smart Contracts', to: '/contracts' },
            // { label: 'Protocol Specs (AIPs)', to: '/aips' },
            { label: 'Examples', href: 'https://github.com/agirails/examples' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'Discord', href: 'https://discord.gg/nuhCt75qe4' },
            { label: 'X', href: 'https://x.com/agirails' },
            { label: 'GitHub', href: 'https://github.com/agirails' },
            { label: 'Updates', to: '/updates' },
          ],
        },
        {
          title: 'Resources',
          items: [
            // TODO: Add when pages exist
            // { label: 'Testnet Faucet', to: '/resources/faucet' },
            { label: 'Block Explorer', href: 'https://sepolia.basescan.org' },
            // { label: 'Brand Assets', to: '/resources/brand' },
            // { label: 'Security', to: '/security' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} AGIRAILS Inc. Built with Docusaurus.`,
    },

    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['solidity', 'bash', 'json', 'typescript'],
    },

    // Algolia search (configure later)
    // algolia: {
    //   appId: 'YOUR_APP_ID',
    //   apiKey: 'YOUR_SEARCH_API_KEY',
    //   indexName: 'agirails',
    // },

    // Table of contents
    tableOfContents: {
      minHeadingLevel: 2,
      maxHeadingLevel: 4,
    },
  } satisfies Preset.ThemeConfig,

  // Plugins
  plugins: [
    // Local search (no Algolia required)
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        language: ['en'],
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
        docsRouteBasePath: '/',
        indexBlog: false,
      },
    ],
  ],

  // Markdown config
  markdown: {
    mermaid: true,
  },

  themes: ['@docusaurus/theme-mermaid'],
};

export default config;
