# Cross-repo commit policy

**Purpose**: any scripted change that touches multiple AGIRAILS repos in a short window is a supply-chain pattern. Verifying clean diffs after the fact is necessary but not sufficient. Reviewers need the generating script, its inputs, and the pre/post repo states to know what *could* have changed. Apex DR-6.

**Context**: the em-dash cleanup in Wave A.18 landed as four-repo batch commits within a six-second window (`agirails/docs`, `agirails/sdk-js`, `agirails/sdk-python`, `agirails/agirails-mcp-server`, plus `agirails/actp-kernel` for one deploy-note edit). Diffs were post-hoc verified clean. The pattern, not that specific instance, is the surface.

**Risk model**: the same capability an attacker wants for a coordinated, multi-repo malicious commit is the capability we just normalized for a "just comments" cleanup. The benign case lowers the bar for review on the dangerous case.

## Sensitivity tiers

| Tier | Repos | Cross-repo policy |
|---|---|---|
| **T1: highest** | `actp-kernel` | Any cross-repo automation touching this requires the policy below in full. Even a comment edit. |
| **T2: high** | `sdk-js`, `sdk-python`, `agirails-mcp-server` | Cross-repo automation requires generating script + inputs committed alongside. |
| **T3: medium** | `agirails.app`, `actp-sheaf-cohomology` | Generating script committed; review of the script needs only its committer's read-over (single human ok). |
| **T4: low** | `agirails/docs` | Cross-file batches inside this repo are routine; no special policy beyond regular review. |

## Policy

For any T1 or T2 change run from a script:

1. **Commit the generating script with the change.** Either in the same PR (preferred) or referenced by commit SHA in the commit message. The reviewer must be able to read the script that produced the diff, not only the diff itself.
2. **Commit the script's inputs** if they are not the source repos themselves. If the script reads a config file (e.g. `truth-ledger.pins.json`, an em-dash replacement table, a renaming map), commit that file in the same PR.
3. **Record pre/post HEAD SHAs of every affected repo** in the commit message. Reviewer can re-run the script against the pre-state and confirm the post-state matches what shipped.
4. **Limit blast radius**: never run a multi-repo script with credentials for more repos than the script actually needs. Use scoped tokens.
5. **Cool-off**: do not push T1 (`actp-kernel`) batched changes to `main` directly. Even for trivial diffs, route through a PR with at least one human reviewer who is not the script runner.

For T3:

1. Commit the generating script.
2. Single-human review is acceptable.

For T4 (within `agirails/docs`):

1. No special policy. Regular review applies.

## Template: script provenance section in commit message

When a commit was produced by a cross-repo script, include this block:

```
Generating script: scripts/<name>.ts (committed in this PR as <SHA>)
Script inputs: <path or "none">
Pre-state HEAD SHAs:
  agirails/docs        <sha>
  agirails/sdk-js      <sha>
  agirails/sdk-python  <sha>
  agirails/mcp-server  <sha>
  agirails/actp-kernel <sha>  # only if T1 was touched
Post-state HEAD SHAs:
  <same labels with post-script values>
Reviewer can reproduce: clone each repo at pre-state, run the script,
compare working tree against post-state. Any divergence is the
surface to investigate.
```

This block makes the script and its effects auditable without requiring the reviewer to trust the human running it.

## Historical exception (documented retroactively)

Wave A.18 em-dash cleanup landed batched commits across four repos without this provenance because the policy did not exist yet. Post-hoc verification was clean (Apex confirmed the diffs were comments / docstrings / metadata strings only, no `.sol` logic touched). The original commits are preserved as-is; this policy applies going forward.

The mechanism `truth-ledger.pins.json` (added Wave A.21 part 3) is the related defense: it requires every cross-repo pin bump to ride as an explicit, reviewed change. That is the SHA-pin half of "guard the guard"; this policy is the commit-process half.

## Related

- [Wave A.21 part 3 commit `c808668f`](https://github.com/agirails/docs): SHA pins + coverage floors + manifest diff.
- [REWRITE_REPORT.md](./REWRITE_REPORT.md): the rewrite work that included the em-dash cleanup batches.
