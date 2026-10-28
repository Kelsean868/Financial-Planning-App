# BRIEF 27 Oct 2026 — Fix run 3: cap, Tier 1 order, cover that follows the loan

Model: **Claude Opus 5.5, effort high.** One session. Do not use `/model` mid-session.
Start in `C:\Projects`. Read GRP `CLAUDE.md` before any GRP step; its guardrails hold (never read `.env.local`,
ZZ test names, worktrees with the node_modules junction, never `npm install` in a worktree, no deploys).

Decided by Kyron, 27 Oct 2026, 21:39:
- **Decision 1:** the ruin-level life item is all term (accepted as fix run 2 built it).
- **Decision 5 = A:** the insurance cap is the band's **recommended** figure. The ceiling stays a guard only.
- **Decision 6 = A:** Tier 1 default order is life, then critical illness, then parent funerals.
- **Decision 7 = A:** no ruin-level life cover when no one depends on the client; life cover follows each loan goal.

## Context

Fix run 2 is pushed: FPA #5 head `76b121d` (engine `fd5fc30`, dist `2c15c5f8…dae55f`), GRP #160 head `d710a7e`,
assumption set `ff-2026-10-27-ladder1`. Nothing is merged or applied. Read FPA
`docs/audit/RUN-2026-10-27-fix-one-allocator.md` §1 and §5 first.

## Change 1 — the cap is the recommended figure

1. The ladder caps insurance items at `budget.band.recommended`, not `budget.ceilingMonthly`
   (`closing-ladder.ts`, today line 105). Rename the field to `insuranceCapMonthly`. Keep the ceiling on the result
   as `insuranceCeilingMonthly`.
2. Closing guard 3 (insurance ≤ ceiling) stays as it is. It now always passes with room to spare.
3. New guard 23: insurance allocated ≤ recommended. Sabotage: set the cap back to the ceiling; the guard must fail
   on the family sample.
4. The insurance budget note reads: "Your safe range is $F to $C. We plan to $R, the recommended amount, and fund
   plans in priority order." Use the existing `fmt`.

## Change 2 — Tier 1 default order

1. Order: life to the ruin level; critical illness; parent funerals, oldest parent first; disability income; own
   final expense ("later" profile only).
2. Option B is unchanged: the client may reorder inside Tier 1; a cross-tier request is declined.

## Change 3 — ruin-level life cover only when someone depends on the client

1. The client has dependants when any of these is true: a partner; one or more children; the care graph charges
   any parent's care to the client (care cost > 0).
2. No dependants: the `life-ruin` and `life-beyond-ruin` items are not created. The death need is unchanged; only the
   ladder item goes.
3. Record the reason in provenance ("no partner, no children, no parent care paid: no ruin-level life cover").

## Change 4 — loan cover follows each loan goal

1. For each goal that is `on` with a loan: `home` with route `mortgage`, and `vehicle` with route `loan`. Create one
   ladder item `loan-cover:<goalId>`, `insurance: true`.
2. Cover = the loan amount the engine already works out (`homePlan` for the home, `carLoan` for the vehicle). Clamp
   to the product's cover range.
3. Product: Term life on the client. If term cannot be issued at the client's rated age **at the goal date**, use
   Whole Life. Min = full = the premium on that cover today, at the client's rated age today, never below the
   product minimum premium.
4. Tier: 2 when the goal is due inside 3 years (`years <= 3`); 3 otherwise.
5. Applies to every profile (single, family, later). A family's existing mortgage stays inside `life-ruin` as today;
   this item is for loans not yet taken.
6. Plan row text: "Your lender will want this from year N. It costs about $X a month if you start now." N is the
   goal's `years`. X is the item's minimum.
7. The insurance budget maps `loan-cover:<goalId>` to its plan row like any other insurance item. Guards 16, 21 and
   22 cover it.
8. Business loans stay in the business section. Do not add them here.

## Change 5 — product eligibility on rated age, for every ladder item

1. Every insurance item checks its product's `issueAge` against the insured's rated age (age next birthday).
2. `life-ruin` (and `life-beyond-ruin`) on a client whose term cannot be issued: map to Whole Life.
3. Any other item whose product cannot be issued: do not create it; record why in provenance.
4. New guard 24: no funded item breaks its product's issue age. Sabotage: drop the check; a fixture with a client of
   rated age 66 must fail.

## Change 6 — the close screen's life package matches the ladder

1. `chosen.basket` in `closing.ts` reads its life plan from the ladder's `life-ruin` and `life-beyond-ruin`
   allocation. It no longer splits term and whole life on its own.
2. Guard 25: the basket's life premium equals the ladder's life allocation, to the cent, for every sample and
   fixture. Sabotage: restore the old split; the guard must fail.

## Expected results (record what the engine gives; explain any difference)

| Sample | Cap | Funded | Not yet |
|---|---|---|---|
| Family | $533.13 | Term $238.83; critical illness $294.30 | Father's funeral $262.88; mother's funeral $178.56; disability income $300 |
| Young single | $280.61 | Critical illness $280.61 | Disability income $300; car loan cover (Tier 2); home loan cover (Tier 3) |

The young single has no dependants (no partner, no children, no parents), so no life-ruin item. His car loan
($150,000 in 2 years) and home loan (in 6 years) create the two loan cover items.

## Scope fence

1. **F-13** stays open (Savings group against the ladder's savings tiers). The Protection figure on the budget card
   and the insurance budget's Protection total now agree; record that in F-13.
2. **F-15 (new):** plans for loved ones carry no sex in their facts, so they are priced on the male rate.
3. **F-16 (new):** a loan someone else co-signed leaves that person exposed. The fact-finder does not ask about
   co-signers. Needs a new question.
4. **F-17 (new):** disability income has no need figure; it is funded at its $300 minimum only.
5. No change to the care graph. Care graph §3 goldens must not move. If one moves, that is a hard stop.

## Re-baseline

1. Record all goldens and the full output dump before the change, as fix run 2 did.
2. List every golden and dump line that moves, old and new, with the chain that explains it.
3. Update the fix run 2 goldens for the family's Tier 1 and the Tier 1 reorder result. Add goldens for both rows of
   the expected results table.
4. New assumption set id: `ff-2026-10-27-ladder2`. Record the old id (`ff-2026-10-27-ladder1`) beside it.
5. Rebuild the single ES-module file. Re-vendor in GRP, write the new hash to `PINNED.txt`, run guards 13 and 15.

## Hard stops

Stop and write why in the progress file when:
1. A care graph §3 golden moves.
2. A test can pass only by being deleted or skipped.
3. A privacy guard (7, 8, 11) fails.
4. A step needs a merge into `master` or `main`, a deploy, or any live database access.

## Deliverables

1. **Evidence paste-back:** FPA `docs/audit/RUN-2026-10-27-fix-ladder-advice.md`, with the before/after table for
   every golden and dump line that moved, the two expected-result rows as engine output, and the new hashes.
2. **Sabotage log:** guards 23, 24 and 25, each with the deliberate break and the failure message. Guards 13, 15,
   21 and 22 re-run, with their output.
3. **Smoke walk, short:** at 390 only, Supabase stubbed, ZZ clients.
   1. Family: the budget card, the insurance budget and the close screen show the same Protection total ($533) and
      the same plans.
   2. Family: move the father's funeral above critical illness. All three screens follow.
   3. Young single: no term life row; the car loan cover row shows "from year 2".
   Evidence goes in `GRP/docs/audit/evidence-2026-10-27-fact-finder/fix3/`.
4. **PRs:** push to FPA #5 and GRP #160. One comment on each saying what changed.
5. **Progress file:** update `FPA/docs/audit/ONE-SHOT-PROGRESS.md` with the new hashes, the new goldens and
   F-13 to F-17. The merge and deploy order from fix run 1 stands.
