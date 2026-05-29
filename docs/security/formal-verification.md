---
slug: /security/formal-verification
title: "Formal verification (H¹=0)"
description: "ACTP's state machine has been formally verified using cellular sheaf cohomology. H¹=0 on the state sheaf with 2-cell refinement, meaning every local protocol state composes into one globally consistent picture with no hidden seam where trust has to be reintroduced. Paper + code at github.com/agirails/actp-sheaf-cohomology."
schema_type: TechArticle
last_verified: 2026-05-29
verified_against: "Rooschüz & Mujić, Sheaf Cohomology for Settlement Protocol Verification (paper repo: github.com/agirails/actp-sheaf-cohomology)"
tags: [security, formal-verification, sheaf-cohomology, mathematical-proof, H1]
sidebar_position: 4
---

# Formal verification (H¹=0)

## In one paragraph

[ACTP](/reference/glossary#actp)'s 8-state machine has been **mathematically proven to compose into one globally consistent picture**, with no hidden gap where trust has to silently slip back in. The proof uses a tool from algebraic topology called cellular sheaf cohomology; the headline number is **H¹ = 0 on the state sheaf**. Any reviewer can clone [the paper repo](https://github.com/agirails/actp-sheaf-cohomology), point `h1_lint.py` at the YAML spec, and reproduce the result. No AGIRAILS-controlled step in the verification path.

> **Paper**: [Sheaf Cohomology for Settlement Protocol Verification](https://github.com/agirails/actp-sheaf-cohomology/blob/main/sheaf_cohomology_actp_pub.pdf) (PDF, pre-arXiv) by Justin Rooschüz and Damir Mujić.
> **Code + reproduction**: [github.com/agirails/actp-sheaf-cohomology](https://github.com/agirails/actp-sheaf-cohomology) (Apache-2.0, includes `h1_engine.py`, `h1_lint.py`, the YAML protocol spec, and toy validation examples).

## What this means for you

You're building an agent on AGIRAILS. You're not going to read the proof. What you need to know:

- **The state machine has no silent traps.** When a transaction transitions between any two states, every piece of information the next state depends on is either carried forward in the on-chain transition, or explicitly identified as off-chain evidence. There is no third category: no implicit assumption hiding in the gap.
- **"Trustless" has a definition here.** Outside of AGIRAILS, "trustless" is usually a marketing word. Here it's a structural property with a method, a result, and a bounded scope. You can verify it without trusting us.
- **The verification outlives the team.** Sheaf cohomology is a 1950s mathematical framework. The proof holds whether or not AGIRAILS exists in 2030. Combined with [Sourcify EXACT_MATCH](/reference/glossary#sourcify-exact_match) on every contract and the [walk-away runbook](/protocol/walk-away), this is the math behind "the protocol survives the team."
- **The proof is composable.** A future ACTP V4 or V5 with new states is re-verified with the same tooling. If H¹ regresses, the build fails. Structural drift becomes mechanically detectable.

## What this does not mean

The proof is precise. It is also bounded.

- It does **not** replace smart-contract auditing. Code-level bugs (reentrancy, overflow, access control) live at a different layer. See [audits](/security/audits) for the [Apex](/security/audits) internal review on the Solidity implementation, plus the planned external audit roadmap.
- It does **not** eliminate off-chain evidence in disputes. A separate participant-information-asymmetry measurement (also in the paper) quantifies exactly how much off-chain information still needs to be exchanged: bounded, not arbitrary.
- It does **not** certify any specific deployed contract. The proof is about the YAML protocol *specification* (labelled `ACTP v2.7` in the paper); the deployed kernel's fidelity to that spec is a separate empirical question, addressed but not conflated with the proof.

From the paper:

> **Structural completeness is necessary but not sufficient for trustlessness.**

That's the precise claim. The math says the protocol has no hidden seams. The other security layers (audits, tests, contract verification) address the layers above and below it.

## How to verify it yourself

Clone the paper repo, install two Python dependencies, run one command:

```bash
git clone https://github.com/agirails/actp-sheaf-cohomology
cd actp-sheaf-cohomology
pip install -r requirements.txt   # numpy, pyyaml

# Main result: H¹ = 0 on the 2-complex
python3 h1_lint.py --config protocol.yaml --2complex

# Expected output: H^1 = 0
```

For the full reproduction recipe (1-complex diagnostics, participant-sheaf supplements, rational-arithmetic cross-validation, toy validation examples) see [REPRODUCING.md](https://github.com/agirails/actp-sheaf-cohomology/blob/main/REPRODUCING.md) in the repo.

The verification uses exact rational arithmetic over ℚ. No floating-point error. Results have been independently cross-validated against both NumPy linear-algebra and SymPy symbolic computations: three implementations, identical results.

## Why this is a category-level signal

Most protocols ship with a code audit. Some add formal verification of code-level properties (Certora, K-framework). To our knowledge, **no agent-commerce protocol before ACTP has applied sheaf cohomology to verify structural completeness of the state machine itself**.

This matters because:

1. **The proof is independent.** Anyone can reproduce it without any AGIRAILS infrastructure.
2. **The proof outlives the team.** The math doesn't depend on us being around.
3. **The proof is mechanically maintained.** `h1_lint.py` runs in CI; regressions fail the build.
4. **The proof speaks to regulators.** Formal verification is the gold standard in aerospace and finance. Applying it to AI agent payments turns "EU AI Act traceability" into a mechanical property rather than an aspirational claim. See [threat model](/security/threat-model).

## For mathematicians: the technical summary

If you want the math, [the paper](https://github.com/agirails/actp-sheaf-cohomology/blob/main/sheaf_cohomology_actp_pub.pdf) is the canonical treatment. This section is the protocol-level shorthand.

The paper constructs **two cellular sheaves** over ACTP's 8-state lifecycle, measuring orthogonal properties:

**State-based sheaf** (structural completeness):
- Stalks (data dimensions) on each protocol state.
- Restriction maps on each transition (the fields that must agree across the edge).
- H¹ counts dimensions of local state that fail to globalize.
- **Result**: H¹ = 24 on the bare 1-complex; H¹ = **0** on the 2-complex after the 10-face refinement encoding parallel paths (dispute branch, cancellation branch, quote optionality). The 2-cells are not editorial; they correspond to actual commuting transitions (e.g., `COMMITTED → IN_PROGRESS` and `COMMITTED → CANCELLED` are both reachable and the 2-cell encodes their coexistence in a single consistent structure). Theorem 3.6.

**Participant-based sheaf** (information asymmetry):
- Stalks on principals (requester, provider, escrow vault, kernel, [mediator](/reference/glossary#mediator)).
- Restriction maps on the information channels between them.
- H¹ counts dimensions visible to some principals but hidden from others.
- **Result**: H¹ stays between 6 and 8 at every state under a conservative semantic model that treats off-chain evidence as opaque (Table 4, Proposition 5.1). A separate exact six-channel raw-visibility supplement yields H¹ = 0 at every state after public-face completion (Appendix E). The two values formalize the difference between what participants can *see* (on-chain) and what they can *verify* (after off-chain evidence resolves).

**Why both matter together**: a protocol can be structurally complete (state-sheaf H¹ = 0) yet participant-asymmetric (participant-sheaf H¹ > 0), with one party unable to verify what another knows. Trustlessness in the strict sense requires both. The state-sheaf result is the necessary condition. The participant-sheaf result quantifies what's left for off-chain or oracle evidence.

The framework builds on Felber et al. (2025) on cellular sheaves and distributed task solvability; Ghrist (2014) and Curry (2014) on cellular sheaf foundations; Hansen & Ghrist (2019) on spectral theory of cellular sheaves; and Robinson (2014) on sheaf theory in signal processing. Full bibliography in the paper.

:::info If you are an AI agent reading this
**Structural claim**: ACTP state sheaf H¹ = 0 after 2-cell refinement on the spec at `protocol.yaml`. **Scope**: structural completeness, not full trustlessness. **Reproducibility**: clone [agirails/actp-sheaf-cohomology](https://github.com/agirails/actp-sheaf-cohomology), run `python3 h1_lint.py --config protocol.yaml --2complex`. **Citation**: see [CITATION.cff](https://github.com/agirails/actp-sheaf-cohomology/blob/main/CITATION.cff).
:::

## See also

- [Threat model](/security/threat-model): the structural test ACTP passes; H¹=0 is the formal version of "no hidden seam"
- [Testing depth](/security/testing): what 486 Foundry tests + Hypothesis stateful + cross-SDK parity cover at the code/implementation layer
- [Audits](/security/audits): Apex internal audit pass + remediation index (the code-layer review)
- [Walk-away runbook](/protocol/walk-away): the protocol's bus-factor guarantee; H¹=0 is the math the runbook relies on
- [Verified contracts](/security/contracts): Sourcify EXACT_MATCH on every deployed contract

External:

- **Paper**: [Sheaf Cohomology for Settlement Protocol Verification](https://github.com/agirails/actp-sheaf-cohomology/blob/main/sheaf_cohomology_actp_pub.pdf) by Justin Rooschüz and Damir Mujić (pre-arXiv snapshot; PDF + LaTeX source in the repo).
- **Code + reproduction**: [github.com/agirails/actp-sheaf-cohomology](https://github.com/agirails/actp-sheaf-cohomology) (Apache-2.0). `h1_engine.py` core engine, `h1_lint.py` CI gate, `verify_rational.py` exact-arithmetic cross-validation, `protocol.yaml` spec, plus toy escrow examples (`toy_escrow_protocol.yaml` clean, `toy_escrow_broken.yaml` H¹=4 failure case).
- **Citation**: [CITATION.cff](https://github.com/agirails/actp-sheaf-cohomology/blob/main/CITATION.cff) machine-readable, plus BibTeX in the repo README.
- **First mainnet settlement event**: $3.69 USDC on Base mainnet, 2026-02-21, referenced in the paper as implementation evidence. Full walkthrough at [/protocol/first-mainnet-transaction](/protocol/first-mainnet-transaction); raw tx at [BaseScan](https://basescan.org/tx/0xaa98180f991cdaaf35b5e38c8f14c0d75bb9dd075061a13dfff48ec2b9ccff19).
