# URL preservation strategy — link juice through the IA rewrite

**Status**: Damir's concern raised 2026-05-26 ("treba voditi računa da se sačuva stari link juice ako se neki linkovi mijenjaju tj urlovi")
**Date**: 2026-05-26
**Owner constraint for FINAL_PLAN Wave A flip moment**

## Why this matters

The IA rewrite changes ~25+ URLs. Every URL change leaks:

- **Inbound external links** — blog posts, tweets, Discord messages, Hacker News, Reddit citing `docs.agirails.io/concepts/actp-protocol` lose their target
- **LLM citation chain** — LLMs trained on the old URLs return broken paths to their users; we degrade their citation quality and ours by not transferring
- **Accumulated search ranking** — Google PageRank that crawled the old URL takes time to migrate to the new one without an explicit signal
- **AI-search GEO ranking** — same mechanism for Perplexity, ChatGPT search, Claude web

The fix is **301 (permanent) redirects** for every changed URL. Search engines and AI crawlers honor 301s and transfer ranking signal to the destination.

## Implementation: Vercel `vercel.json` redirects

Vercel server-side redirects are the right tool (NOT Docusaurus `plugin-client-redirects`):

| Reason | Vercel server | Docusaurus client |
|---|---|---|
| **Speed** | Edge-level, 0 client load | JS bundle must load first |
| **SEO** | 301 status emitted | Client-side JS bounce |
| **Crawler-friendly** | Yes — Googlebot follows | Many crawlers don't execute JS |
| **Raw `.md` URLs** | Works | Docusaurus serves `.html`, missing `.md` raw via plugin |
| **Bot-detected redirects** | Honored | Sometimes flagged as cloaking |

Add a top-level `"redirects"` array to `docs-site/vercel.json`. Schema:

```json
{
  "redirects": [
    {
      "source": "/concepts/actp-protocol",
      "destination": "/protocol/state-machine",
      "permanent": true
    },
    ...
  ]
}
```

`"permanent": true` emits HTTP 308 (or 301 depending on Vercel config — both transfer link juice). Wildcard support exists (`/sdk-reference/:slug*` → `/reference/sdk-js/:slug*`) for whole-subtree moves.

## URL change map (from IA_PROPOSAL migration table)

This is the complete list of URL changes the branch-and-flip will introduce. Every row gets a redirect entry.

### Root pages

| Old URL | New URL | Notes |
|---|---|---|
| `/installation` | `/start/manual` | Full manual walkthrough kept; LLM-driven onboarding becomes `/start` |
| `/quick-start` | `/start` | Repurposed as the LLM-onboarding hero path |
| `/agent-integration` | `/recipes/provider-agent` + `/recipes/consumer-agent` | Split by intent. Choose primary redirect to `/recipes/` (index) |
| `/developer-responsibilities` | `/protocol/security` + `/recipes/keystore-and-deployment` | Split. Redirect to `/protocol/security` (the protocol-side guarantees page) |
| `/cli-reference` | `/reference/cli` | Top-level CLI index; subcommands live at `/reference/cli/{command}` |
| `/contract-reference` | `/reference/contracts` | Network-specific lives at `/reference/contracts/{network}` |
| `/error-reference` | `/reference/errors` | Specific errors at `/reference/errors/{code}` |

### `/concepts/` → `/protocol/`

| Old URL | New URL |
|---|---|
| `/concepts/` | `/protocol/` |
| `/concepts/actp-protocol` | `/protocol/state-machine` |
| `/concepts/adapter-routing` | `/protocol/adapters` |
| `/concepts/agent-identity` | `/protocol/identity` |
| `/concepts/erc8004-identity` | `/protocol/identity` (folded) |
| `/concepts/escrow-mechanism` | `/protocol/escrow` |
| `/concepts/fee-model` | `/protocol/fees` |
| `/concepts/transaction-lifecycle` | `/protocol/state-machine` (merged) |
| `/concepts/x402-protocol` | `/protocol/x402` |

### `/guides/` → `/recipes/` and `/start/ai-environment/`

| Old URL | New URL |
|---|---|
| `/guides/` | `/recipes/` |
| `/guides/agirailsmd-config` | **DELETED — point to `/protocol/agirails-md`** (P0: was teaching wrong frontmatter schema) |
| `/guides/agents/provider-agent` | `/recipes/provider-agent` |
| `/guides/agents/consumer-agent` | `/recipes/consumer-agent` |
| `/guides/agents/autonomous-agent` | `/recipes/autonomous-agent` |
| `/guides/integrations/claude-plugin` | `/start/ai-environment/claude-code` ← **first-class promotion** |
| `/guides/integrations/crewai` | `/recipes/crewai` |
| `/guides/integrations/langchain` | `/recipes/langchain` |
| `/guides/integrations/n8n` | `/recipes/n8n` |
| `/guides/integrations/openclaw` | `/start/ai-environment/openclaw` ← **first-class promotion** |

### `/cookbook/` → folded into `/recipes/`

| Old URL | New URL |
|---|---|
| `/cookbook/` | `/recipes/` |
| `/cookbook/api-pay-per-call` | `/recipes/per-call-api` |
| `/cookbook/automated-provider-agent` | `/recipes/provider-agent#advanced` (folded with anchor) |
| `/cookbook/multi-agent-budget` | `/recipes/multi-agent-budget` |
| `/cookbook/n8n-workflow` | `/recipes/n8n` (folded) |
| `/cookbook/secure-key-management` | `/recipes/keystore-and-deployment` |

### `/examples/` → folded into `/recipes/`

| Old URL | New URL |
|---|---|
| `/examples/` | `/recipes/` |
| `/examples/e2e-single-script` | `/recipes/e2e-quickstart` |

### `/sdk-reference/` → `/reference/sdk-{js,python}/*`

All sdk-reference pages get redirected to the auto-extracted reference pages. Use wildcard pattern where possible:

```json
{
  "source": "/sdk-reference/:slug*",
  "destination": "/reference/sdk-js/:slug*",
  "permanent": true
}
```

Caveat: sdk-reference's old layout doesn't 1:1 map to the new `/reference/sdk-{js,python}/` split (TS vs Python). Default the wildcard to `/reference/sdk-js/*`, then add explicit overrides for any Python-specific old paths.

| Old URL | New URL |
|---|---|
| `/sdk-reference` | `/reference/sdk-js` |
| `/sdk-reference/basic-api` | `/reference/sdk-js/basic` |
| `/sdk-reference/standard-api` | `/reference/sdk-js/standard` |
| `/sdk-reference/advanced-api/*` | `/reference/sdk-js/advanced/*` (via wildcard) |
| `/sdk-reference/registry` | `/reference/sdk-js/registry` |
| `/sdk-reference/utilities` | `/reference/sdk-js/utilities` |
| `/sdk-reference/errors` | `/reference/errors` |

## Crawler grace policy

For 6 months after the flip:
- All 301s remain active
- `sitemap.xml` includes ONLY new URLs (old URLs already redirect; including both would suggest duplicate content)
- `robots.txt` allow-list unchanged (already set up Day -1)

At 6 months: review with Google Search Console / Bing Webmaster / Vercel analytics. If any old URL still receives significant traffic, keep its redirect indefinitely.

## Tracking and verification

Post-flip verification gates (add to FINAL_PLAN's Wave A QA):

1. **`scripts/verify-redirects.ts`** — script that hits every old URL, asserts 301/308 status + correct destination header. Runs in CI after deploy.
2. **Google Search Console resubmission** — after flip, submit new sitemap.xml; ask Google to refetch old URLs to discover the 301s
3. **Manual spot-check** — open 5 old URLs in a fresh browser, confirm landing on correct new pages
4. **LLM citation re-test** — same test from FINAL_PLAN Wave 3 (ask Claude/ChatGPT/Perplexity 20 anticipated questions); if any answers cite old URLs, verify 301 chain still resolves

## How this affects FINAL_PLAN

Adds two concrete items to Wave A flip:

- **Pre-flip**: build the URL map (this doc), draft `vercel.json` redirect entries
- **Flip moment**: deploy `vercel.json` with new IA + redirects in same commit; verify with `scripts/verify-redirects.ts` immediately after

Effort: +2h (Pre-flip URL map + draft) + 1h (post-flip verification script + manual spot-check). Negligible delta to 3-week plan.

## Open question

**`vercel.json` rewrites vs redirects**:
- `redirects` change the URL in the user's browser (301 → 308). Search-engine friendly.
- `rewrites` proxy silently (no URL change). Used when you want the new content served at the old URL.

For SEO link juice, **redirects (not rewrites)** is the right choice. Google explicitly recommends 301s for content moves. Rewrites would NOT transfer ranking signal — they look like the old URL still serves canonical content, which then competes with the new URL for ranking.

Decision: use `"redirects"` array with `"permanent": true` for every entry above.
