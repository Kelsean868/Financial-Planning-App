# BRIEF 28 Oct 2026 — Section 3 build: engine, page, net worth in one run (orchestrator)

Model: **Claude Opus 5.5, effort high** for this session (the orchestrator). Each build runs in a subagent with the
model and effort in the table below. Do not use `/model` mid-session.

Start in `C:\Projects`. Two repos:
- `C:\Projects\Financial-Planning-App` (FPA): the engine. Its `CLAUDE.md` holds.
- `C:\Projects\General-Rater-Portal` (GRP): the page. Read its `CLAUDE.md` before any GRP step. Its guardrails
  hold: never read `.env.local`, ZZ test names, worktrees with the node_modules junction, never `npm install` in a
  worktree, no deploys, no merges.

Signed off by Kyron, 28 Oct 2026, 08:41 ("go ahead and build"). The owner is away during the run: decide inside the
spec, and record each decision in the run record of the build it belongs to.

## Read first

1. **The spec:** `FPA/docs/briefs/2026-10-28-section-3-budget-ux-design.md`, all of it. §0 is the decision table (with
   Kyron's revisions), §13 says what happens to each of today's screens, and §14 states the seams. As your first
   commit on the FPA branch, copy it to `docs/superpowers/specs/2026-10-28-section-3-budget-ux-design.md`.
2. **The prototype of record:** `FPA/docs/briefs/section3-prototype-v6.dc.html` (copy it to `docs/prototype/` in the same first commit). Read it as text: the screens are
   the markup, and the model is the `data-dc-script` block. Copy its screen order, wording, controls and layout. Do
   **not** copy its maths: it is simplified (rough PAYE, sample rates, fixed event thresholds). Every figure comes
   from the engine.
3. The closing addendum with its dated changes under §11.2, and `FPA/docs/audit/ONE-SHOT-PROGRESS.md` (fix runs 1 to
   4), for the ladder rules as they stand.

## The chain

| Build | Contents (spec sections) | Repo / branch | Subagent model, effort |
|---|---|---|---|
| A — engine | §1 maths, §1.3, §2, §5, §6.1–6.3 maths, §7, §9, §14; guards 28–33 | FPA: `feat/section3-engine` from `master` | Opus 5.5, high |
| B — page | §1–§10 and §13 screens, live inputs, client/advisor view; guards 34–35 | GRP: `feat/section3-page` from `main` | Opus 5.5, medium |
| C — net worth | §6.4 card, its engine function, and its link to the emergency fund | FPA: same branch, then GRP: same branch | Sonnet 5.5, medium |

B waits for A (it vendors A's build). C waits for B. Run them in that order.

## Build A — what "done" means

1. Facts schema version 2 exactly as §14.1, with the version-1 upgrade on read. `LifeCaseFactsError` for anything
   else that does not validate.
2. New engine functions and exported result types (§14.4): the budget totals and analysis against the §6.1 guides
   (each guide a parameter row with `source` and `asOf`), the Make room plan with the default split and a validated
   custom split, debt payoff dates and flags, the retirement figure, and the care graph input built from budget
   lines plus the future level.
3. The $200 floor (§5) as `core:ff.insurance.floorMonthly`. Guard 27 becomes the new range. Stage 0 is unchanged.
4. Guards 28 to 33, each made to fail on purpose first.
5. **Inverted gate.** Map the two samples to version 2 so that their totals equal today's: the family's father has a
   $4,000 Family you support line and no growth; the mother has a $0 line, and her future level is the current one.
   With that mapping, **none of the 37 goldens and none of the care graph §3 goldens move.** Add new goldens for
   each new function (the retirement working, a weekly-paid case, a rent case, a payoff-date mismatch, a Make room
   default split).
6. Rebuild the single ES-module file. New assumption set id `ff-2026-10-28-s3`.

## Build B — what "done" means

1. Vendor A's build into GRP `vendor/fpa-core/`, and update `PINNED.txt` and every pin (guard 13).
2. The screens per §13 and the prototype. The section order is §0 row 3.5a. There are **no section summary screens**:
   one final report holds a block per section (§0 row 3.17).
3. Live inputs (§8): `input` events, the engine re-runs at most every 100 ms, and focus and caret stay put.
4. Client view and advisor view (§0 row 3.15). The default is Client view.
5. Plain words on the client view (§10.2).
6. The store writes version 2. The snapshot and scope record come from the final report only.
7. Guards 34 and 35, each made to fail on purpose first. Guards 7, 8, 9 to 13, 15 and 18 still pass.

## Build C — what "done" means

1. The "What you own and owe" engine function and card (§6.4): net worth, debts as a share of gross yearly pay, and
   months of costs covered by cash.
2. The emergency-fund figure reads cash from these assets. No asset is typed twice.
3. Goldens for the sample's net worth figures.

## Hard stops

Stop, and write why in the progress file, when:
1. With the version-2 sample mapping, a golden of the 37 or a care graph §3 golden moves.
2. A test can pass only by being deleted or skipped.
3. A privacy guard (7, 8, 11) fails.
4. A step needs a merge into `master` or `main`, a deploy, or any live database access (read or write).
5. The spec and the prototype disagree on a rule (not on looks). Follow the spec, and record the clash.

## Deliverables (named rituals)

1. **Per build:** a run record, `docs/audit/RUN-2026-10-28-section3-<a|b|c>.md`, in that build's repo. It holds the
   decisions, the sabotage log, the full test output from one run, and a PR (not merged).
2. **Evidence paste-back:** all 37 goldens and the care graph §3 goldens, before and after Build A, and again after
   Build C, in a table with old value, new value and "moved: yes/no".
3. **Smoke walk** after Build C, at 390 and 1280, ZZ clients only, Supabase stubbed:
   1. The sample family through all seven sections to the final report. It must include a Make room custom split:
      money sent to protection, to the 24% card, and to "Spend more on Food". Then "Use this plan", with each effect
      showing.
   2. A weekly-paid single who rents, with "My pay changes" on and two groups skipped.
   3. A case with less than $200 left: no plan, and the "Make room" message.
   4. A case whose safe ceiling is below $200 but has $200 or more left: a $200 plan with the "above the safe range"
      note.
   5. A debt whose payment does not cover the interest: the "never clears" flag.
   6. Client view and advisor view on Choose and on the final report.
   Evidence goes in `GRP/docs/audit/evidence-2026-10-28-section3/`, with no tokens in the repo.
4. **Wording table:** every new client-facing sentence in one table, for Kyron to approve. It goes in Build B's run
   record.
5. **Progress file:** `FPA/docs/audit/SECTION3-PROGRESS.md`, updated at the end of every build. Its final summary
   lists the PRs in merge order, the new hashes, every open item, and F-21 to F-23 as fenced.

No database migration is needed: the facts live in `life_cases.facts` (JSON), and the store upgrades version 1.
