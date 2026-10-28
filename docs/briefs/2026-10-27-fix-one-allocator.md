# BRIEF 27 Oct 2026 — Fix run 2: one allocator, real Rest Assured II rates

Model: **Claude Opus 5.5, effort high.** One session. Do not use `/model` mid-session.
Start in `C:\Projects`. Read GRP `CLAUDE.md` before any GRP step; its guardrails hold (never read `.env.local`,
ZZ test names, worktrees with the node_modules junction, never `npm install` in a worktree, no deploys).

Decided by Kyron, 27 Oct 2026, 20:10: **Decision 3 = A (one allocator), Decision 4 = A (funeral minimum = smallest
Rest Assured II plan).**

## Context

Fix run 1 (NIS 70%, F-12) is done and pushed: FPA #5 at `3f6bd49`, GRP #160. Nothing is merged or applied.
Fix run 1 exposed a fork that came from Phase 1. The engine shares money two ways:

| Sample family, now | `insurance-budget.ts` (`fitToMinimums`) | `closing-ladder.ts` |
|---|---|---|
| Insurance money | $533 (band recommended) | $711 (ceiling) |
| Life | term $300 | life-ruin $370 |
| Critical illness | $233 | $150 |
| Father's funeral | "Not yet", needs $240 | $0 of $1,144 |
| Mother's funeral | not offered | $191 of $1,082 |

Defects:
1. Two rules give the client two different plans in one meeting. The project contract forbids forks.
2. `fitToMinimums` drops plans by list position. The parent funeral is last in the list, so it drops first.
   Addendum §11.1's tie-break (time to need) puts it before CI.
3. The insurance budget funds life below the ruin level ($300 against $370).
4. The ladder funds a plan below what Tatil sells ($191; the smallest plan is $178.56 for the mother and $262.88 for
   the father, so $191 buys the mother's minimum only by luck, and the ladder does not check).
5. The ladder's funeral minimum is the full inflated funeral cost (`premium.high`), not the smallest plan.
6. The Rest Assured II rate is a prototype estimate (`restAssuredPer1000` 1.6, `restAssuredAgeGrowth` 1.05,
   status `estimate`). Real quotes differ (below).

## Real Rest Assured II quotes (ApplyOn, 27 Oct 2026)

Pay to Age 100, monthly mode, premiums include taxes and stamp duty. Leads: TTRA-9WZE859 (father), TTRA-9DWVJ3Y
(mother). Pay to Age 60 and 65 return "Base Premium - Factor matching query does not exist" at these ages.

| Insured | Engine `parentAge` | Rated age (next birthday) | $30,000 | $50,000 | Per $1,000 a month |
|---|---|---|---|---|---|
| Father, male, born 1955 | 71 | 72 | $262.88 | $438.14 | 8.7627 |
| Mother, female, born 1960 | 66 | 67 | $178.56 * | $297.60 | 5.9520 |

\* Derived: the father's quotes are exactly proportional to cover ($3,063.90 = 0.6 × $5,106.50 a year), so the
mother's $30,000 is 0.6 × $297.60. The engine's estimate today gives the father $240.15 at $30,000 (9% low).

## Fix A — Rest Assured II rates

1. Replace the single `restAssuredPer1000` row with two rows: male and female. Each holds the "per $1,000 a
   month" figure above, at the rated age above. Source: "ApplyOn quote, lead TTRA-9WZE859" (male) and "ApplyOn
   quote, lead TTRA-9DWVJ3Y" (female). `asOf` 2026-10-27. Status `verified`.
2. Keep `restAssuredAgeGrowth` 1.05 as the per-year factor away from each anchor. It stays status `estimate`, with
   a caveat that it is not yet checked against a quote.
3. Price on the rated age (age next birthday), not `parentAge`. Rated age = `parentAge + 1`.
4. Eligibility is judged on the rated age too: issue only when rated age ≤ 80 (`issueAge.max`). Today the engine
   compares `parentAge` to 80, which lets one too-old age through.
5. The insured's sex comes from `relationship` for parents (mother = female, father = male) and from `sex` for
   the client. If a parent's sex cannot be told, use the male row (the higher rate) and record a flag.
6. One pricing function. `insurance-budget.ts`, `closing.ts` and `loved-ones.ts` all call it. No module keeps its
   own Rest Assured arithmetic.
7. New goldens: the two quotes above, at both covers, to the cent. A rate change that moves them is a re-baseline
   under addendum §14.1.

## Fix B — one allocator (the §11 ladder)

1. **The ladder is the only allocator for protection.** `insurance-budget.ts` builds its Protection group from the
   ladder's insurance items. `fitToMinimums` is no longer used for protection. Keep it only if the Savings group
   still needs it (see the fence below).
2. **No insurance item is ever funded below its minimum.** In each pass, an insurance item gets its minimum or
   nothing. When its minimum does not fit, it goes to "not yet" with the amount it needs, and the ladder moves on
   to the next item (skip and continue). It does not stop. Non-insurance items keep partial funding.
3. **Tier 1 default order:**
   1. Life to the ruin level.
   2. Parent funerals, oldest parent first (time to need, §11.1).
   3. Critical illness.
   4. Disability income (Cashbuilder II with the Disability Income Rider), family and single profiles. New ladder
      item. Its minimum is today's `minimumFor`. It goes in Tier 1 by the §11.1 test: illness can close the window.
   5. Own final expense (Rest Assured II on the client), "later" profile only. New ladder item.
   Option B still holds: the client may reorder inside Tier 1. A reorder across tiers is still declined.
4. **Parent funeral item:** minimum = premium on $30,000 cover (the product minimum). Full = premium on the cover
   `closing.ts` already computes (inflated cost less the NIS grant where eligible), clamped to $30,000–$150,000.
   One item per eligible parent.
5. **The cap is the stage ceiling** (closing guard 3), for both screens. The screen's protection total becomes
   what the ladder funds. The safe range and the recommended figure stay on the screen as context, unchanged.
6. **Product mapping** for the Protection group, in ladder order:
   - life-ruin → Term life (family, single); Term life to clear debts (later)
   - life-beyond-ruin → adds to the same term plan; not a separate row
   - critical-illness → Life Span Gold
   - parent-funeral:<id> → Rest Assured II on that parent
   - disability-income → Cashbuilder II with the Disability Income Rider
   - own-final-expense → Rest Assured II on the client
   Guards 16 (no funded plan below its minimum) and 17 (the rider only on Cashbuilder II) still hold on the result.
7. **Parity guard (guard 21).** For every sample and fixture, the insurance budget's Protection rows equal the
   ladder's funded insurance items, item for item and to the cent. Sabotage: change the order of one item in the
   insurance budget only; the guard must fail.
8. **Guard 22, no unbuyable plan.** Every funded insurance item on the ladder is ≥ its product minimum. Sabotage:
   restore the old partial funding; the guard must fail.

## Scope fence

1. The Savings group of the insurance budget is not changed in this run. Record as follow-up **F-13**: the
   Savings group (pay-yourself-first buckets) and the ladder's Tier 1.5 and Tier 3 savings items must be checked
   for the same kind of fork.
2. Rest Assured II age growth is not re-fitted. Record as follow-up **F-14**: quote two more ages per sex and fit
   the factor.
3. No change to the care graph. Care graph §3 goldens must not move. If one moves, that is a hard stop.

## Re-baseline

1. Record all goldens and the full output dump (as fix run 1 did) before the change.
2. Expected movements: the insurance budget's protection rows and totals, the closing ladder's Tier 1 allocations,
   and any closing figure that reads them. List every golden and every dump line that moves, old and new, with the
   chain that explains it.
3. Expected result for the sample family at the $711 cap, with the order above: life to the ruin level is funded
   first, then the father's funeral. Report what the mother's funeral, critical illness and disability income get,
   and why. If the real ruin-level premium differs from $370, report it.
4. Add goldens for the death scenario lines that fix run 1 showed as unpinned (the "degree stops in month N" lines),
   for both samples.
5. New assumption set id: `ff-2026-10-27-ladder1`. Record the old id (`ff-2026-10-27-nis70`) beside it.
6. Rebuild the single ES-module file. Re-vendor in GRP, write the new hash to `PINNED.txt`, run guards 13 and 15.

## Hard stops

Stop and write why in the progress file when:
1. A care graph §3 golden moves.
2. A test can pass only by being deleted or skipped.
3. A privacy guard (7, 8, 11) fails.
4. A step needs a merge into `master` or `main`, a deploy, or any live database access.
5. The real ruin-level life premium alone is above the ceiling for either sample. Report, do not redesign.

## Deliverables

1. **Evidence paste-back:** FPA `docs/audit/RUN-2026-10-27-fix-one-allocator.md`. It holds the before/after table
   for every golden and every dump line that moved, the two Rest Assured quotes as goldens, and the new hashes.
2. **Sabotage log:** guards 21 and 22, each with the deliberate break and the failure message. Guards 13 and 15
   re-run, with their output.
3. **Smoke walk, short:** at 390 only, Supabase stubbed, ZZ clients.
   1. The sample family: the insurance budget screen and the close screen show the same protection plans and
      amounts.
   2. The sample family: reorder critical illness above the father's funeral (inside Tier 1). Both screens follow.
   3. The young single: no funded plan below its minimum; Cashbuilder II with the Disability Income Rider shows
      Medical.
   Evidence goes in `GRP/docs/audit/evidence-2026-10-27-fact-finder/fix2/`.
4. **PRs:** push to FPA #5 and GRP #160. One comment on each saying what changed.
5. **Progress file:** update `FPA/docs/audit/ONE-SHOT-PROGRESS.md` with the new hashes, the new goldens, F-13 and
   F-14. The merge and deploy order from fix run 1 stands.
