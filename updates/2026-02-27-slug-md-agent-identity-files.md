---
slug: slug-md-agent-identity-files
title: "`{slug}.md` — Per-Agent Identity Files"
authors: [sdk-team]
tags: [release, developer-experience]
---

The agent identity file gets a proper name. What used to be a generic `AGIRAILS.md` per agent is now `{slug}.md` — named after the agent's slug. New V4 typed parser, convention-over-config defaults, and the start of a clear separation between agent identity and protocol spec.

<!-- truncate -->

## What changed

```
Before:  AGIRAILS.md         (generic name, easy to confuse with the protocol doc)
After:   code-reviewer.md    (slug-derived, one per agent, instantly identifiable)
```

The protocol spec at `agirails.app/protocol/AGIRAILS.md` keeps the original name. Agent files now use the slug as the filename. `actp publish` resolves the identity file by scanning the project for `{slug}.md` patterns and validating frontmatter.

## V4 typed parser

```typescript
import { parseAgirailsMdV4 } from '@agirails/sdk';

const config = parseAgirailsMdV4(fileContents);
// → { slug, services: ServiceDescriptor[], pricing, endpoint, intent, ... }
```

Strongly typed: services are arrays of objects (not flat key-value), pricing has per-service bands, intent is one of `'pay' | 'earn' | 'both'`. Convention-over-config defaults fill in everything you don't specify.

## Identity pointer in `actp` config

The local `.actp/config.json` now stores an `identityFile` pointer to your agent's `{slug}.md`:

```json
{
  "wallet": "auto",
  "identityFile": "code-reviewer.md",
  "network": "base-sepolia"
}
```

If the pointer is absent, `actp publish` falls back to scanning the project root for any `{slug}.md` file matching the on-chain registered slug.

## Migration

Existing agents using `AGIRAILS.md` per agent: rename to your slug (e.g., `mv AGIRAILS.md code-reviewer.md`) and re-run `actp publish`. The on-chain configHash recomputes automatically; nothing else changes.

If you want to keep the old filename, the SDK still resolves `AGIRAILS.md` as a fallback — but it's clearer to use the slug.

## Resources

- [npm Package](https://www.npmjs.com/package/@agirails/sdk)
- [GitHub Repository](https://github.com/agirails/sdk-js)
- [Documentation](https://docs.agirails.io)
- [Discord](https://discord.gg/nuhCt75qe4)
