# BRIEF 28 Oct 2026 — Section 3 fix run (before merge)

Model: **Claude Opus 5.5, effort medium.** One session, no subagents. Do not use `/model` mid-session.
Start in `C:\Projects`. Use the existing worktrees: FPA `C:\Projects\FPA-wt-section3` (`feat/section3-engine`, PR #6)
and GRP `C:\Projects\GRP-wt-section3` (`feat/section3-page`, PR #161). GRP `CLAUDE.md` guardrails hold. No merge, no
deploy, and no live database access.

Decided by Kyron, 28 Oct 2026, 10:55 ("I agree with all your recommendations"):
- **Decision 10 = A:** one "left each month" everywhere.
- **Decision 11 = A:** the debt ratio uses monthly payments.
- The **wording table** in GRP `docs/audit/RUN-2026-10-28-section3-b.md` §8 is approved, with change 3 below.
- The **other calls** in `SECTION3-PROGRESS.md` ("Kyron's calls" 2, 3, 4, 5, 7) are accepted, as amended below.

Read first: `FPA/docs/audit/SECTION3-PROGRESS.md` (on `docs/fact-finder-specs`), and the run records A, B and C.

## Change 1 — one "left each month" (Decision 10)

1. Money the client already saves (the "Saving you already do" group) is subtracted from the household surplus in
   `household-budget.ts`. Stage, the safe insurance ceiling, the shortfall, the buffer build and Make room all use
   that one figure.
2. It stays out of needs (call 3 stands for needs). Only the surplus changes.
3. `budgetAnalysis.leftMonthly` and `budget.surplusMonthly` must be equal for every input.
4. **Guard 36:** for every sample and fixture, plus a fixture with a $400 credit union line, the left figure on the
   budget equals the surplus that the stage and the ceiling use. Sabotage: drop the saving from the surplus; the
   guard must fail.
5. Inverted gate: the samples have no saving line, so **none of the 37 goldens may move**. If one moves, stop.

## Change 2 — the debt ratio (Decision 11)

1. On "What you own and owe", replace "debts as a share of gross yearly pay" with **"Debt payments, including the
   mortgage, as a share of pay before deductions"**: (loan and card payments + mortgage payment) ÷ (client gross
   monthly + partner pay).
2. The partner's pay is take-home, because gross is not asked (call 7). The screen says: "Your partner's pay is
   counted after deductions."
3. Guide: at most 25%, source "PALIG net worth calculator benchmark, Loans 25%", as a parameter row with `source` and
   `asOf`. Show it as a common guide, never as a pass or fail.
4. Add a golden for the sample family's ratio. Update the spec's §6.4 line to match.

## Change 3 — Make room order labels

1. Make room's destinations show their **order** ("1st", "2nd", "3rd", "4th", "5th"), not "Step N". The header chip
   keeps its own "Step N of 5" wording. This removes two "Step 2"s that mean different things.
2. Update the wording table row and the guard 31 text if it names "Step".

## Change 4 — the snapshot holds the Make room plan

1. When a Make room plan is in use, the snapshot's `closing` JSON carries the full plan: the group targets, the split,
   the real-numbers totals and the with-plan totals. No new column and no migration: it is inside `closing`.
2. The one-page plan prints both versions **from the snapshot**, not from page state. This closes open item 2.
3. **Guard 37:** a snapshot taken with a plan in use reproduces both versions on the printed plan exactly. Sabotage:
   leave the plan out of the snapshot; the guard must fail.
4. The guard 8 health-key check still passes on the larger `closing`.

## Change 5 — plain words on the one-page plan

The one-page plan's "Stage" tile uses the header chip wording ("Where you are: Step N of 5: …"). This closes open
item 3.

## Change 6 — records

1. **NIS (call 2):** add to F-20: "switch PAYE NIS to the NIBTT class table when the 2027 table is published; this
   moves goldens 2 and 16, so re-baseline then."
2. **Progress file branch:** `docs/fact-finder-specs` was merged as FPA #4, and its later commits are not on `master`.
   Open one PR from `docs/fact-finder-specs` to `master` for the progress files and specs (docs only). Do not merge it.

## Hard stops

Stop, and write why in the progress file, when:
1. A golden of the 37 moves.
2. A test can pass only by being deleted or skipped.
3. A privacy guard (7, 8, 11) fails.
4. A step needs a merge, a deploy, or any live database access.

## Deliverables

1. **Run record:** `FPA/docs/audit/RUN-2026-10-28-section3-fix.md`, with each change, the sabotage log for guards 36
   and 37, the full test output from one run, and the new hashes.
2. **Re-vendor** the engine into GRP, update every pin, and run guards 13 and 15.
3. **Smoke walk, short:** at 390 and 1280, ZZ clients, Supabase stubbed:
   1. The family with a $400 credit union line: the budget's "Left each month" equals the figure behind the safe range on
      Choose.
   2. The family with a Make room plan in use: start the application, then print. Both versions come from the
      snapshot.
   3. "What you own and owe": the new ratio with its guide and the partner note.
   Evidence goes in `GRP/docs/audit/evidence-2026-10-28-section3/fix/`.
4. **PRs:** push to FPA #6 and GRP #161, with one comment on each saying what changed. Open the docs PR (Change 6).
5. **Progress file:** update `SECTION3-PROGRESS.md` with the new hashes, guards 36 and 37, the closed open items, and
   the merge order: FPA #6, then GRP #161, then the docs PR.
