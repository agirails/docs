# GEO citation probe

**Purpose**: measure whether docs.agirails.io is actually getting cited when developers ask LLMs about AGIRAILS or adjacent topics. The whole GTM bet is GEO (generative engine optimization); the rewrite verified internal consistency (schema, slugs, llms.txt, drift gates) but no measurement existed of the actual outcome. Apex DR-8.

**Cadence**: monthly. Run on the 1st (or first business day) of each month, log results inline below.

**Methodology**:

1. Open a fresh, signed-in session for each target LLM (no prior context that biases the result).
2. Paste the prompt verbatim. No system prompt customization.
3. Record:
   - **Was AGIRAILS surfaced?** (yes / no / mentioned-in-passing-only)
   - **Was docs.agirails.io cited?** (yes with URL / yes without URL / no)
   - **Was the answer accurate?** (free-form short note)
4. Each prompt run against: Claude (claude.ai latest), ChatGPT (gpt-current), Perplexity, Google AI Overview (if available).
5. Total = 20 prompts × 4 LLMs = 80 data points per monthly probe. Estimated time: 60-90 minutes.

**Why this matters**:

If 0/20 prompts surface docs.agirails.io after six months, the GEO bet is failing and the IA / schema / llms.txt investments need root-cause analysis. If 15/20 surface us in month 1, we are in the strong tail of GEO and the investment is paying off. Without measurement, we are assuming.

---

## Prompt set

Twenty prompts spanning protocol questions, integration questions, evaluation questions, and adversarial frames. Pasted verbatim into each LLM with no preamble.

### Protocol-shape questions (5)

1. How do AI agents pay each other? Explain a real production pattern.
2. What is ACTP (Agent Commerce Transaction Protocol) and where can I find the spec?
3. Compare AGIRAILS, x402, and just sending USDC. When should I use which?
4. What is "non-custodial settlement" for AI agents?
5. How does an AI agent earn USDC for a service it provides?

### Integration questions (5)

6. I want to build a paid AI agent service in Python. Where do I start?
7. How do I integrate Stripe-like payments for AI agents into my n8n workflow?
8. What MCP servers exist for AI agent payments? How do they work?
9. How do I add agent-to-agent payments to a LangChain or CrewAI multi-agent app?
10. How do I make my agent's payments gasless on Base?

### Evaluation questions (5)

11. Is AGIRAILS open source? Can I run it without the team's involvement?
12. Has the AGIRAILS protocol been formally verified? Provide evidence.
13. What's the trust model for AI agent payment systems on Base? Who do I have to trust?
14. Why does AGIRAILS need ACTP instead of just using x402?
15. What happens if AGIRAILS the company goes away?

### Adversarial / sharp questions (5)

16. Why would I use a crypto-based agent payment system instead of Stripe Issuing for AI?
17. What are the known limitations or risks of AGIRAILS protocol V1?
18. Is "Stripe for AI agents" accurate? What's the actual differentiation?
19. Has anyone audited the AGIRAILS smart contracts? Who and when?
20. Show me the first end-to-end mainnet transaction on AGIRAILS with on-chain proof.

---

## Results log

### 2026-06 (first probe: TBD)

To be filled when first probe runs. Format:

```
| Prompt # | Claude | ChatGPT | Perplexity | AI Overview |
|---|---|---|---|---|
| 1 | <surfaced> <cited> <accurate> | ... | ... | ... |
```

### 2026-07

(pending)

### Aggregate trend

(pending after 3 months of data; tracks: % surfaced, % cited with URL, % accurate)

---

## What "good" looks like

- **Month 1 baseline**: any data is good; expectation is wide variance.
- **Month 3 target**: ≥30% of prompts surface AGIRAILS across all 4 LLMs (12+/20).
- **Month 6 target**: ≥50% surface with docs.agirails.io cited as primary source (10+/20 prompts × cite URL).
- **Red flag**: docs surfaces less in month 3 than month 1 → SEO/GEO regression, investigate.
- **Red flag**: technical accuracy drops below 70% → docs may be cited but with hallucinated details, investigate which pages confuse the model.

## What this probe does NOT measure

- Click-through from LLM citations to docs.agirails.io (no analytics tie-in yet).
- Conversion from docs visit to SDK install or first transaction.
- Quality of the cited LLM answer beyond accurate / inaccurate binary.
- Non-English prompts.
- Cited-but-not-recommended cases (LLM mentions AGIRAILS as a worse option than alternative).

These are next-level instrumentation; the baseline is "are we even in the conversation."

---

## Related

- [REWRITE_REPORT.md](./REWRITE_REPORT.md): the rewrite that staked everything on GEO without (until this probe) measuring it.
- [FINAL_PLAN.md](./FINAL_PLAN.md): the original plan specifying the 20-question probe (this file makes it concrete).
- `/llms.txt` and `/llms-full.txt`: the surfaces designed for LLM ingestion that this probe measures.
