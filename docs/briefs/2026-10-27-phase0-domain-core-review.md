# BRIEF 27 Oct 2026 — Financial-Planning-App Phase 0: review `feat/domain-core`, add the specs and CLAUDE.md

Model: **Claude Opus 5.5, effort high.** Repo `C:\Projects\Financial-Planning-App`. Two branches, two PRs, no merge.
Never `npm install` outside `core/`. No deploys. Do not touch `calculators/`, `parameters/` or `research/` except to
read them. The owner may be away: decide, and record each decision.

Why: Section 2 (`docs/superpowers/specs/2026-10-27-section-2-build-design.md`, §2.1) makes this Phase 0. The
fact-finder engine is built on `feat/domain-core`, which is 21 commits ahead of `master` (`7949d9d`) and has never
been reviewed. Section 1 §1.10 says it merges first.

## Part A — branch `docs/fact-finder-specs` from `master`

The four files are already in the working tree, untracked:
- `docs/superpowers/specs/2026-10-27-section-1-data-storage-design.md` (condensed copy; the claude.ai Project doc
  is the master)
- `docs/superpowers/specs/2026-10-27-section-2-build-design.md`
- `docs/prototype/fact-finder-prototype-v17.html` (Design canvas file; it does not run on its own)
- `docs/briefs/2026-10-27-phase0-domain-core-review.md` (this brief)

Add one more file, **`CLAUDE.md`** at the repo root, that encodes the workflow contract so later runs need no
re-explaining. It says, in short numbered rules:
1. Specs live in `docs/superpowers/specs/YYYY-MM-DD-<name>-design.md`. A spec picks one answer; it never leaves a
   decision to the planner. Sections are signed off by Kyron before work starts.
2. Scope fences are explicit and numbered as follow-ups.
3. Guards over discipline: forbidden-import greps, golden-number tests. Every guard is sabotage-tested (made to
   fail on purpose, failure message recorded) before it is trusted.
4. Refactors use inverted gates: success means the goldens did not move.
5. Risks and conflicts are flagged before a change, in the run record, not after.
6. Merge/dedupe semantics, error types and JS/TS seams are stated in specs.
7. `core/` is pure: no I/O, no UI, no dependencies (the existing purity test).
8. No client health answers in this repo's data, ever (Section 1 §1.3).
9. Runs end with a run record in `docs/audit/RUN-YYYY-MM-DD-<name>.md` and a PR, never a merge.

Commit, push, PR against `master`.

## Part B — review `feat/domain-core`

Read, in this order: `docs/superpowers/specs/2026-07-15-insurance-planning-mvp-design.md`,
`docs/superpowers/plans/2026-07-16-domain-core.md`,
`docs/superpowers/specs/2026-07-17-provenance-by-construction-design.md`, then every file in `core/src` and
`core/test` on the branch.

1. In `core/`: `npm ci`, `npm test`, `npm run typecheck`. Save the output.
2. For each plan task: done, partly done, or not done, with the file that shows it.
3. For each guard on the branch (purity, goldens, no hard-coded parameter): sabotage it once, record the failure
   message, restore. A guard that does not fail is a finding.
4. Check the seams Section 1 needs: is there an exported result type per module, a `ProvenanceBuilder`, and a
   parameter-table layer the new modules can use? Record what exists and what is missing; do not build what is
   missing.
5. **Fix on the branch only** what makes a test or typecheck fail, or contradicts its own spec. One commit per fix,
   message says which plan task. Anything bigger is a finding for Kyron, not a fix.

## Deliverables (named rituals)

1. **Review record** `docs/audit/RUN-2026-10-27-domain-core-review.md`: the plan-task table, the test and typecheck
   output, the sabotage log, the seam check, each fix with its commit, the findings list, and a one-line verdict
   ("ready to merge" or "not ready, because ...").
2. **Evidence paste-back**: the exact `npm test` summary lines in the record.
3. **Two PRs**: `docs/fact-finder-specs` → `master`, and `feat/domain-core` → `master`. Neither merged. Kyron merges
   the specs PR first.
