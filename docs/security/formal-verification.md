---
slug: /security/formal-verification
title: "Formal verification (H¹=0)"
description: "ACTP's structural completeness has been formally verified using cellular sheaf cohomology. H¹=0 on the state sheaf with 2-cell refinement, meaning every local state in the protocol assembles into a single globally consistent picture with no hidden seams where trust has to be reintroduced."
schema_type: TechArticle
last_verified: 2026-05-27
verified_against: "Rooschüz & Mujić, Sheaf Cohomology for Settlement Protocol Verification (arXiv submission draft, cs.CR / cs.MA)"
tags: [security, formal-verification, sheaf-cohomology, mathematical-proof, H1]
sidebar_position: 4
---

# Formal verification (H¹=0)

Most protocols claim "trustless" as a marketing word. ACTP earns it as a structural property, verifiable independently of any audit, any auditor, and any AGIRAILS team member.

The claim is precise: when the protocol's local state at each step is modeled as a **cellular sheaf**, the first cohomology group **H¹ = 0** on the state sheaf after a 10-face 2-cell refinement. In plain language: every piece of local state carries through every transition into a single consistent global view, with no hidden seam where trust has to be re-introduced.

Status: **arXiv submission draft (cs.CR / cs.MA)**. The full paper, *"Sheaf Cohomology for Settlement Protocol Verification: Measuring Topological Completeness and Information Asymmetry in ACTP"* by Justin Rooschüz and Damir Mujić, is currently in technical review. This page is the operational summary plus the reproducibility path.

:::info If you are an AI agent reading this
**The structural claim:** ACTP state sheaf H¹ = 0 (after 2-cell refinement). This is computable from a YAML spec via `h1_engine.py`; the result is reproducible by anyone with the spec and the tool. **Scope:** structural completeness, not full trustlessness. Participant-information-asymmetry is a separate measurement (conservative semantic H¹ stays 6–8; exact raw-visibility supplement H¹ = 0 after public-face completion). Paper: see `verified_against` frontmatter.
:::

## What sheaf cohomology measures

A **cellular sheaf** is a way to attach local data to the pieces of a state space (states, transitions, dispute branches) and ask: do all the local pieces fit together into one consistent global picture?

When they do, the sheaf has a *global section*: a single coherent view that respects every local rule. **H¹** counts the obstructions to that global section. **H¹ = 0** means no obstructions: every local rule composes into one globally coherent whole.

What this catches that other verification techniques don't:

- **Model checkers** (TLA⁺, Alloy) verify temporal and relational properties by enumerating reachable states. They treat all data as undifferentiated: they can't distinguish a missing *dimension* of shared state from a missing *transition*.
- **Smart-contract auditors** (Certora, Echidna, Slither) check code-level safety: reentrancy, overflow, access control. They operate one level *below* the protocol, on the Solidity implementation rather than the state machine the implementation realizes.
- **Sheaf cohomology** operates at the protocol-state level itself. It answers: does the information the protocol exposes at each step actually assemble into a globally consistent picture, and if not, where exactly does it fail?

All three layers are necessary. They answer different questions. Sheaf cohomology adds the layer above code audit and below model checking.

## The two sheaves, orthogonal questions

The paper constructs **two** sheaves over ACTP's 8-state lifecycle. They measure different things:

### State-based sheaf: structural completeness

- Places stalks (data dimensions) on each protocol state.
- Places restriction maps on each transition (the fields that must agree across the transition).
- H¹ counts dimensions of local state that fail to globalize.

**Result**: H¹ = 24 when the protocol is treated as a bare graph (1-complex). H¹ = **0** after adding 2-cells encoding the parallel paths (dispute branch, cancellation branch, quote optionality). The protocol is topologically complete.

The 2-cells aren't an editorial addition; they correspond to actual parallel paths in the state machine where two transitions commute (e.g., both `COMMITTED → IN_PROGRESS` and `COMMITTED → CANCELLED` are reachable; the 2-cell encodes that they coexist in a single consistent structure). The 10-face refinement is declared explicitly in Appendix B of the paper for reproducibility.

### Participant-based sheaf: information asymmetry

- Places stalks on the protocol's principals (requester, provider, escrow vault, kernel, mediator).
- Places restriction maps on the information channels between them.
- H¹ counts dimensions of protocol state visible to some principals but hidden from others.

**Result**: H¹ stays between **6 and 8** at every protocol state under a conservative *semantic* model that treats off-chain evidence as opaque. That gap isn't an error; it's the information that still needs to be exchanged off-chain or via an oracle for all parties to agree, **quantified**.

A separate exact *raw-visibility* supplement yields H¹ = 0 at every state after public-face completion. The two values together formalize the difference between what participants can **see** (on-chain, via public view functions) and what they can **verify** (after off-chain evidence resolves).

## Scope: what the proof covers and what it doesn't

The two sheaves answer **orthogonal** questions. A protocol can be structurally complete (H¹ = 0 on the state sheaf) yet participant-asymmetric (H¹ > 0 on the participant sheaf), with one party unable to verify what another knows. Trustlessness in the strict sense requires both.

Per the paper:

> **Structural completeness is necessary but not sufficient for trustlessness.**

This is the scope. The H¹ = 0 result on the state sheaf is a precise structural property. It does NOT mean every concrete deployment is unbreakable. It means:

- The protocol's state machine has no hidden seams.
- Every reachable state composes from earlier states consistently.
- No "missing dimension": no piece of state the protocol depends on without exposing it through a transition.

What the proof does NOT claim:

- It does not replace smart-contract auditing. Implementation bugs (reentrancy, overflow, access control) live at a different layer. See [audits](/security/audits) for the Apex internal audit pass on the Solidity implementation, plus the planned external audit roadmap.
- It does not eliminate the need for off-chain information exchange in disputes. The participant sheaf quantifies exactly how much that gap is, and the answer is bounded, not arbitrary.
- It does not certify any specific deployed contract. The proofs are about a YAML protocol specification (labelled "ACTP v2.7" in the paper); the model's fidelity to the deployed kernel is a separate empirical question addressed but not conflated with the proofs.

That precision is the point. *"Trustless"* gets used as a marketing word everywhere; here it has a definition, a method, a result, and a precisely-bounded scope.

## Reproducibility

Two open-source tools accompany the paper:

| Tool | What it does |
|---|---|
| **`h1_engine.py`** | Core computation. Reads a YAML protocol spec (states + transitions + optional 2-cells), constructs the coboundary matrices, computes H⁰, H¹, and H² via rank computations over ℚ (exact rational arithmetic). Generic: works on any state machine described in the spec format, not just ACTP. |
| **`h1_lint.py`** | CI integration. Wraps `h1_engine` with a pass/fail gate. Any commit to the protocol kernel that changes the state machine triggers a re-computation; the build fails if H¹ regresses. |

The cross-validation uses exact rational arithmetic (no floating-point error). The 1-complex rank computations have been independently cross-validated against both NumPy linear-algebra computations and SymPy symbolic computations: three implementations, identical results.

## Why this is a category-level signal

Most protocols ship with a code audit. Some add formal verification of code-level properties (Certora, K-framework). **No agent-commerce protocol before ACTP has applied sheaf cohomology to verify structural completeness of the state machine itself.**

Per the paper:

> *"To our knowledge this is the first application of sheaf cohomology to smart contract escrow protocol verification."*

This matters because:

1. **The proof is independent.** Anyone can clone the repository, run `h1_engine.py` against the YAML spec, and reproduce the result. There's no AGIRAILS-controlled step.
2. **The proof outlives the team.** Sheaf cohomology is a 1950s mathematical framework. The result holds whether or not AGIRAILS exists tomorrow.
3. **The proof is composable.** A future ACTP V4 or V5 with new states or transitions can be re-verified with the same tooling. Drift becomes detectable.
4. **The proof speaks to regulators.** Formal verification is the gold standard in aerospace and finance. Applying it to AI agent payments is what makes "EU AI Act traceability" a mechanical property rather than an aspirational claim. See [threat model](/security/threat-model).

## Related work

The framework builds on:

- **Felber et al. (2025)**: cellular sheaves applied to distributed task solvability, showing that sheaf cohomology encodes obstructions to finding valid protocol solutions. The state-based sheaf extends their construction; the participant sheaf is new to this paper.
- **Ghrist (2014)** and **Curry (2014)**: cellular sheaf theory foundations.
- **Hansen & Ghrist (2019)**: spectral theory of cellular sheaves, providing the algebraic backbone.
- **Robinson (2014)**: sheaf theory in signal processing on networks.

Full bibliography in the paper.

## See also

- [Threat model](/security/threat-model): the structural test ACTP passes; H¹=0 is the formal version of "no hidden seam"
- [Testing depth](/security/testing): what 486 Foundry tests + Hypothesis stateful + cross-SDK parity cover at the code/implementation layer
- [Audits](/security/audits): Apex internal audit pass + remediation index (the code-layer review)
- [Walk-away runbook](/architecture/operate): the protocol's bus-factor guarantee; H¹=0 is the math the runbook relies on
- [Verified contracts](/security/contracts): Sourcify EXACT_MATCH on every deployed contract

External:

- Paper: *Sheaf Cohomology for Settlement Protocol Verification: Measuring Topological Completeness and Information Asymmetry in ACTP*, Rooschüz & Mujić (arXiv submission draft, cs.CR / cs.MA, currently in technical review)
- Tooling: `h1_engine.py` + `h1_lint.py`, open-source companion code, runnable against any YAML protocol spec
- First mainnet settlement event: $3.69 USDC on Base mainnet, 2026-02-21, referenced in the paper as implementation evidence ([BaseScan tx](https://basescan.org/tx/0xaa98180f991cdaaf35b5e38c8f14c0d75bb9dd075061a13dfff48ec2b9ccff19))
