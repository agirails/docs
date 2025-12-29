# AGIRAILS Documentation

Official documentation for AGIRAILS - Payment Rails for AI Agents.

**Live site**: [docs.agirails.io](https://docs.agirails.io)

## About AGIRAILS

AGIRAILS is the neutral settlement and trust layer for the AI agent economy. We implement the ACTP (Agent Commerce Transaction Protocol), enabling autonomous AI agents to pay each other through blockchain-based escrow.

## SDKs & Integrations

| Package | Language | Install | Docs |
|---------|----------|---------|------|
| [@agirails/sdk](https://www.npmjs.com/package/@agirails/sdk) | TypeScript | `npm install @agirails/sdk` | [SDK Reference](https://docs.agirails.io/sdk-reference) |
| [agirails](https://pypi.org/project/agirails/) | Python | `pip install agirails` | [SDK Reference](https://docs.agirails.io/sdk-reference) |
| [n8n-nodes-agirails](https://www.npmjs.com/package/n8n-nodes-agirails) | n8n | `npm install n8n-nodes-agirails` | [n8n Guide](https://docs.agirails.io/guides/integrations/n8n) |
| Claude Plugin | Claude Code | Built-in | [Claude Guide](https://docs.agirails.io/guides/integrations/claude-plugin) |

## Features

- **Three-tier SDK API** - Basic (`provide`/`request`), Standard (`Agent`), Advanced (`ACTPClient`)
- **Full TS/Python parity** - Same functionality in both languages
- **AI Assistant** - Built-in docs assistant powered by RAG
- **Interactive Playground** - Try the SDK in your browser
- **n8n Integration** - Visual workflow automation

## Documentation Structure

```
docs/
├── index.md                 # What is AGIRAILS?
├── installation.md          # Setup guide
├── quick-start.md           # 15-minute quickstart
├── concepts/                # Core concepts (ACTP, escrow, identity)
├── guides/
│   ├── agents/              # Provider, Consumer, Autonomous agents
│   └── integrations/        # n8n, Claude, LangChain, CrewAI
├── cookbook/                # Production recipes
├── sdk-reference/           # Full API reference
│   ├── basic-api.md         # provide(), request()
│   ├── standard-api.md      # Agent class
│   └── advanced-api/        # ACTPClient, Kernel, Escrow, Events
└── contract-reference.md    # Smart contract docs
```

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run start

# Build for production
npm run build

# Index docs for AI Assistant (requires Upstash credentials)
npx ts-node scripts/index-docs.ts
```

## Contributing

We welcome contributions! Here's how:

1. Fork this repository
2. Create a branch: `git checkout -b docs/your-improvement`
3. Make your changes
4. Test locally with `npm run start`
5. Submit a Pull Request

### Contribution Ideas

- Fix typos or improve clarity
- Add code examples (TypeScript and Python)
- Improve diagrams
- Translate content
- Report issues

## Related Repositories

| Repository | Description |
|------------|-------------|
| [sdk-js](https://github.com/agirails/sdk-js) | TypeScript SDK |
| [python-sdk](https://github.com/agirails/python-sdk) | Python SDK |
| [actp-kernel](https://github.com/agirails/actp-kernel) | Smart contracts (Solidity) |
| [n8n-nodes-agirails](https://github.com/agirails/n8n-nodes-agirails) | n8n community node |
| [claude-plugin](https://github.com/agirails/claude-plugin) | Claude Code MCP plugin |

## Community

- [Discord](https://discord.gg/nuhCt75qe4)
- [X/Twitter](https://x.com/agirails)
- [GitHub](https://github.com/agirails)

## License

Apache-2.0 - see [LICENSE](LICENSE)
