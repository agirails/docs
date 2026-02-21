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

  // Suppress MetaMask auto-connect errors (extension behavior, not our code)
  clientModules: [
    './src/lib/suppressWalletErrors.ts',
  ],

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
          showLastUpdateTime: true,
          showLastUpdateAuthor: false, // Hide individual names, show "Core Team" via footer
        },
        blog: {
          path: 'updates',
          routeBasePath: 'changelog',
          blogTitle: 'AGIRAILS Changelog',
          blogDescription: 'Release notes, engineering insights, and ecosystem news from AGIRAILS',
          blogSidebarTitle: 'Recent Changes',
          blogSidebarCount: 10,
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
            title: 'AGIRAILS Changelog',
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
      id: 'mainnet_live_v2',
      content: 'AGIRAILS is LIVE on Base Mainnet! <a href="/installation">Get started</a> · <a href="/agent-integration">Agent Integration Guide</a> · <a href="/llms.txt">llms.txt</a>',
      backgroundColor: '#10B981',
      textColor: '#ffffff',
      isCloseable: true,
    },

    colorMode: {
      defaultMode: 'dark',
      disableSwitch: true,
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
        {
          to: '/simple-api',
          label: 'Playground',
          position: 'left',
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
          to: '/changelog',
          label: 'Changelog',
          position: 'left',
        },
        {
          type: 'search',
          position: 'left',
        },
        // Right side
        {
          type: 'html',
          position: 'right',
          value: `<div class="ai-launcher-wrapper"><button class="ai-assistant-launcher" type="button" aria-label="Ask AI" onclick="window.dispatchEvent(new CustomEvent('agirails-toggle-assistant'))">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="4" y="8" width="16" height="12" rx="2"/>
    <circle cx="12" cy="3" r="2"/>
    <path d="M12 5v3"/>
    <line x1="9" y1="14" x2="9" y2="14"/>
    <line x1="15" y1="14" x2="15" y2="14"/>
    <rect x="1" y="11" width="3" height="5" rx="1"/>
    <rect x="20" y="11" width="3" height="5" rx="1"/>
  </svg>
  <span>Ask AI</span>
</button></div>`,
        },
        {
          type: 'html',
          position: 'right',
          value: `<a class="nav-icon-btn" href="https://github.com/agirails" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 5v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.74c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 17.13V21" />
  </svg>
</a>`,
        },
        {
          type: 'html',
          position: 'right',
          value: `<a class="nav-icon-btn" href="https://discord.gg/nuhCt75qe4" target="_blank" rel="noopener noreferrer" aria-label="Discord">
  <img src="/img/discord-outline.svg" alt="Discord" width="20" height="20" loading="lazy" />
</a>`,
        },
      ],
    },

    footer: {
      style: 'dark',
      links: [],
      copyright: `© ${new Date().getFullYear()} AGIRAILS. All rights reserved.`,
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
        searchBarPosition: 'left',
        searchBarShortcutHint: false,
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
