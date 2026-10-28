# RUN 28 Oct 2026 — Section 3 fix run (before merge)

Brief: `docs/briefs/2026-10-28-section-3-fix-brief.md` (on `docs/fact-finder-specs`). Decided by Kyron, 28 Oct 2026, 10:55
("I agree with all your recommendations"): Decision 10 = A, Decision 11 = A, the wording table approved with change 3,
and Kyron's calls 2, 3, 4, 5 and 7 accepted as amended. Claude Opus 5.5, effort medium, one session, no subagents.
Worktrees: FPA `C:\Projects\FPA-wt-section3` (`feat/section3-engine`, PR #6), GRP `C:\Projects\GRP-wt-section3`
(`feat/section3-page`, PR #161). Nothing merged or deployed; no live database access; ZZ names only; `.env.local` not read.

## 1. Flagged before the change

Written as each risk was found, before the change it belongs to was committed (CLAUDE.md rule 5).

1. **The weekly renter has a saving line; the 37 goldens do not.** `SAMPLE_WEEKLY_RENTER` holds "Credit union shares"
   $300 a month. Change 1 takes it off the surplus, so its Build A golden moves (not one of the 37): left $812.58 →
   $512.58, ceiling $203.15 → $128.15, recommended $152.36 → $96.11, save per pay $187.52 → $118.29. Its cap stays $200
   (the floor), now **above** the safe ceiling, so `aboveSafeRange` turns true and §5.3's note shows. Re-baselined in
   `section3-goldens.test.ts`; the full list of moved lines is in §4.
2. **Make room re-runs the stage table itself** (`rangeAfter` in `room-plan.ts`) with its own `surplus = take-home −
   needs`. Left as it was, Make room would use a second "left". It now takes the saving off too, and money freed from
   the saving group counts as freed saving (it raises the left by the same amount). No golden uses a saving cut.
3. **"Left after costs" and "Left each month" are now the same figure.** The page showed both names. Decision 10 says
   one "left each month" everywhere, so the three "Left after costs" tiles and "is left after costs" now say "Left each
   month" (wording table row added).
4. **Decision 11 adds a parameter row** (`core:ff.netWorth.debtPaymentsGuide`), so the assumption set id moves:
   `ff-2026-10-28-s3` → **`ff-2026-10-28-s3fix`**. Every pin moves with it (GRP guard 9/10 SQL included).
5. **"Client gross monthly" is the usual month**, as Build C's "gross yearly pay" used: for a client whose pay changes,
   the lowest month drives the plan (D17) but the ratio uses the usual month. The weekly renter: $8,666.67, not $7,500.
6. **The printed plan cannot word the step from the snapshot.** The snapshot's `closing` held only `stage`, and the
   page's chip needs the buffer months and the expensive debt (Build B open item 4). Change 5 needs it, so the engine
   now counts the step on `closing.savingsStep` (the page's own rule, moved into the engine; a test sweeps 300+ cases
   and finds the two equal). The header chip reads the same field, so the screen and the print cannot disagree.
7. **The snapshot's shape grows** (`closing.roomPlan`, `closing.savingsStep`). `life_case_snapshots.closing` is `jsonb`;
   no column or migration. Guard 8's health-key check runs over the larger object inside `buildSnapshot` (tested).
8. **Guard 31's text names no "Step"** (`section3-guards.test.ts`: "Make room sends freed money in the §6.3 plan
   order"). Change 3 needs no edit there. The engine's `RoomStep` numbers stay; only the page's labels change.
9. **The docs branch had an uncommitted one-line edit** to `docs/briefs/2026-10-28-section-3-budget-ux-design.md`
   (where the prototype file lives), saved at 10:55 with the fix brief. Docs only; carried in the docs PR and named there.

**Result.** Done. Hard stop 1 not hit: **0 of the 37 goldens moved** (values compared from the built file; the only
dump lines that changed for the two samples are the four assumption set ids). Hard stops 2 to 4 not hit: no test
deleted or skipped; privacy guards 7, 8 and 11 pass; nothing needed a merge, a deploy or database access.

## 2. Changes

### Change 1 — one "left each month" (Decision 10)

- `household-budget.ts`: `surplusMonthly = household take-home − needs − savingMonthly`. New field
  `budget.savingMonthly` ("Saving you already do"). Needs are unchanged (call 3 stands for needs).
- The stage, the safe ceiling, the shortfall (stage 0 and hardball), the buffer build (`buildBudgetBuckets`), the
  ladder's budget, goals' "available" and Make room all read that one surplus. `room-plan.ts` `rangeAfter` takes the
  saving off too (§1 item 2).
- `budgetAnalysis.leftMonthly` (worked from its own rows: take-home − needs − saving) equals `budget.surplusMonthly` for
  every input: guard 36.
- Page: "Left after costs" → "Left each month" (§1 item 3).

### Change 2 — the debt ratio (Decision 11)

- `net-worth.ts`: `debtsShareOfGrossPay` and `grossYearlyPay` are replaced by `loanAndCardPaymentsMonthly` (the budget's
  "Loan and card payments", the minimums), `mortgagePaymentMonthly` (the budget's mortgage line, when on a mortgage),
  `debtPaymentsMonthly`, `payBeforeDeductionsMonthly` (client usual gross + partner pay as stored, take-home),
  `debtPaymentsShareOfPay` and `debtPaymentsGuide` (`{ max, source, asOf }`).
- Parameter row `core:ff.netWorth.debtPaymentsGuide` = at most 25%, status advisor-set, source "PALIG net worth
  calculator benchmark, Loans 25%", asOf 2026-10-28.
- Page card: "Debt payments, including the mortgage, as a share of pay before deductions" 21%, the working line, "Your
  partner’s pay is counted after deductions.", "Common guide: at most 25%. A guide, not a pass or a fail." The source
  shows in Advisor view only. Report block 4 the same.
- Spec §6.4 line amended (FPA `docs/superpowers/specs/…` on PR #6, and the copy in `docs/briefs/` on the docs PR).

### Change 3 — Make room order labels

- The page labels the destinations "1st" to "5th" (`C.ROOM_ORDER_LABELS`), not "Step N". Step 0, "Costs above income",
  stays "First". The header chip keeps "Step N of 5". Wording table row updated (GRP record B §8). Guard 31: no change
  (§1 item 8).

### Change 4 — the snapshot holds the Make room plan

- Engine: `roomPlanRecord({ plan, real, withPlan })` returns plain numbers: the groups the plan changes (today and
  target), the split in use (key, label, step, amount), freed, not yet given a job, and both versions' totals
  (take-home, needs, saving, going out, left each month, insurance budget, extra on expensive debt).
  `buildSnapshot({ …, roomPlan })` keeps it inside the closing JSON as `closing.roomPlan`. No new column, no migration.
- Page: one record (`roomPlanInUse`) feeds the report's Make room line, the snapshot written at "Start the
  application" and the preview. `fact-finder-print.js` prints the Make room line and a "Make room: both versions" block
  from `snapshot.closing.roomPlan` only; the page-held `held.room` / `meta.room` are gone. Closes open item 2.
- Guard 37 (GRP `test/fact-finder-section3-fix.test.mjs`); guard 8 passes on the larger closing.

### Change 5 — plain words on the one-page plan

- The tile is "Where you are" · "Step N of 5: …" (the header chip's words, from `closing.savingsStep`), not "Stage 0N
  name". The family prints "Step 2 of 5: clear expensive debt". Closes open item 3.

### Change 6 — records

- F-20 (`ONE-SHOT-PROGRESS.md`, docs branch): "switch PAYE NIS to the NIBTT class table when the 2027 table is
  published; this moves goldens 2 and 16, so re-baseline then."
- Docs PR from `docs/fact-finder-specs` to `master`: the Section 3 progress file, briefs (build and fix), spec copy and
  prototype, docs only, not merged (its link is in `SECTION3-PROGRESS.md`).

## 3. The 37 goldens (inverted gate)

Before: Build C's built file (`422a9fe`, SHA-256 `246f0ae6…7c82`, checked). After: this run's built file
(`50734563…b2c9`). Both read by `evidence-2026-10-28-section3-fix/goldens.mjs` (Build C's script, unchanged) and compared
by `cmpgoldens.cjs`: **37 goldens, 0 moved** (every value equal to full precision; table in Build A's record §4 and the
JSON beside this record). Care graph §3 goldens included.

Flat dump of both samples and the two care graph runs (`dump-diff.json`): **4 changed** (the assumption set id, ×4),
**20 added** (`budget.savingMonthly` 0, `closing.savingsStep` 2 and 1, the eight new `netWorth` fields), **4 dropped**
(`netWorth.grossYearlyPay`, `netWorth.debtsShareOfGrossPay`, both samples).

## 4. Other goldens that moved, with the reason

| Golden (test file) | Old | New | Why |
|---|---|---|---|
| Weekly renter: save per pay (`section3-goldens`) | $187.52 | **$118.29** | Decision 10: the $300 already saved is not left |
| Weekly renter: ceiling / recommended | $203.15 / $152.36 | **$128.15 / $96.11** | Same |
| Weekly renter: cap $200, above the safe range | false | **true** | The $200 floor is now above the $128 ceiling (§5.3) |
| Family: debts ÷ gross yearly pay (`net-worth-goldens`) | 192% | **removed** | Decision 11 |
| Family: debt payments ÷ pay before deductions | — | **21.1%** ($1,440 + $3,000) ÷ ($17,000 + $4,000) | Decision 11 (new golden) |
| Young single | 3% | **1.875%** ($150 ÷ $8,000) | Decision 11 |
| Weekly renter | $104,000 a year | **2.88%** ($250 ÷ $8,666.67) | Decision 11 |
| Assumption set id (`goldens-fact-finder`) | `ff-2026-10-28-s3` | **`ff-2026-10-28-s3fix`** | §1 item 4 |

Weekly renter, every other line that moved (`renter-dump-diff.json`, 36 changed, 10 added, 2 dropped): the surplus,
buckets, goals' available and the ladder's budget $812.58 → $512.58; the buffer to three months $489.17 → $312.58; the
Ceiling band $203.15 → $200; the slider top $203.15 → $200; the insurance budget note now "Your safe range is $64 to
$128"; its Make room default split (Food cut by $300): protection $8.61 → $0, emergency $0 → $176.58, retirement
$291.39 → $123.42, insurance budget after $208.61 → $200.

## 5. Sabotage log

| Guard | Sabotage | Failure (first message) | Restored |
|---|---|---|---|
| 36 one left each month (FPA) | `household-budget.ts`: `surplus = hhNet − needs` (saving dropped) | `sample weekly renter: the budget shows $512.58 left; the stage and the ceiling use $812.58` (both guard 36 tests fail) | yes (SHA-256 equal) |
| 37 the printed plan from the snapshot (GRP) | `fact-finder-plan.js` `startApplication`: `buildSnapshot` without `roomPlan` | `the printed plan, from the snapshot, has the Make room line the screen had: Make room plan in use: $500 a month freed. Left each month: $2,843 on your real numbers, $3,343 with the plan. Insurance budget $533 → $627.` | yes (SHA-256 equal) |

Full output: FPA `evidence-2026-10-28-section3-fix/sabotage-log.txt`, GRP `evidence-2026-10-28-section3/fix/sabotage-guard37.txt`.

## 6. Tests, build and hashes

- FPA `npm test`: **190/190** (was 186: guard 36 ×2, the savings step, the snapshot plan record; `net-worth-goldens`
  changed in place), 0 fail, 0 skipped. `npm run typecheck` exit 0. `dist.test.ts` confirms the dist is a fresh build.
- Privacy guards 7 and 8 (`privacy-guards.test.ts`) and purity guard 6 pass.

**Tests changed, with the reason** (none deleted or skipped): `section3-goldens.test.ts` (the weekly renter, §4);
`net-worth-goldens.test.ts` (Decision 11, §4); `goldens-fact-finder.test.ts` (the assumption set id). New:
`section3-fix-guards.test.ts`.

| What | Old | New |
|---|---|---|
| FPA engine commit | `520a6899876435c890dd7677713d3a0f4a90b64a` | `e0f2edd2f693cfd2332a73cb7504ac90607e0f2b` |
| `core/dist/fpa-core.js` SHA-256 (= GRP `vendor/fpa-core/fpa-core.js`) | `246f0ae65df7853b1c6a8c253eedbdeb185b30213408db261d9b69d1fb207c82` | `50734563eee00019132d178ad869703c4a3cfaff6016d3fc37565fd86364b2c9` (285,461 bytes) |
| Assumption set id | `ff-2026-10-28-s3` | `ff-2026-10-28-s3fix` |
| GRP page commit (PR #161) | `e183c8c6759700ee19bd9dc7e1276ac87edd8f44` | `3a0b0dc404642436007e073a15efa4f59d65c03b` (then the evidence commit) |

## 7. The portal (GRP `feat/section3-page`, PR #161)

**Re-vendor and pins (guard 13).** `vendor/fpa-core/fpa-core.js` copied from FPA `core/dist/fpa-core.js`; SHA-256
`50734563…b2c9` checked equal. Updated: `vendor/fpa-core/PINNED.txt` (commit, sha256, assumption set),
`fact-finder.js` (`?v=50734563`, `ENGINE_PIN`), `life-case-store.js` (`?v=50734563`, `ENGINE_VERSION`),
`supabase/tests/20261027120200_fact_finder.guards-9-10.sql` (`eng` and the five `ff-2026-10-28-s3fix` inserts). A grep
for `246f0ae6`, `520a689` and `'ff-2026-10-28-s3'` outside `docs/` finds nothing. Guards 13 (three tests) and 15 pass.

**Page files changed:** `fact-finder-copy.js` (`stepWords`, `ROOM_ORDER_LABELS`, `DEBT_RATIO_LABEL`,
`PARTNER_PAY_NOTE`), `fact-finder-money.js` (order labels; the net worth card), `fact-finder-report.js` (block 4),
`fact-finder-screens.js` (`stepChip` reads `closing.savingsStep`; "Left each month"), `fact-finder-plan.js`
(`roomPlanInUse`, `roomLine`, `startApplication`, the preview; "Left each month"), `fact-finder-print.js`
(`roomPlanText`, the both-versions block, the "Where you are" tile). No new page file (guard 12 unchanged).

**Tests.** New `test/fact-finder-section3-fix.test.mjs` (5): guard 37; no plan → no `roomPlan` and no Make room block;
Change 5's tile for the family and the young single; Change 3's labels; Decision 10 with a $400 credit union line on the
budget, the header tile and Choose's safe top. Changed (none deleted or skipped): `test/fact-finder-section3.test.mjs`,
the two Build C net worth tests, to the new ratio (21%, the guide, the partner note, the old ratio gone).

**Full portal suite, once, at the end** (`npm test`, GRP `3a0b0dc` tree): **3,116 tests, 3,086 pass, 0 fail, 30
skipped** (Build C: 3,111 / 3,081 / 0 / 30; the difference is the 5 new tests; the 30 are the existing live-database
tests that skip without a live session). Guards 7 and 8 (store and database), 9, 10, 11 (Section 1, the queue strip),
12, 13, 15, 18, 34, 35 and 37 pass. Full output: GRP `docs/audit/evidence-2026-10-28-section3/fix/full-suite-output.txt`.
`npm test`'s posttest step rewrites `docs/underwriting/rate-verification.html` and two `evidence-2026-10-25-wl-endow`
files; they were already modified in the worktree before this run and are not in any commit.

## 8. Smoke walk (short; GRP `docs/audit/evidence-2026-10-28-section3/fix/`)

Headless Chrome at 390 and 1280, `scripts/fact-finder-preview-server.mjs` on port 8791 (Supabase stubbed, fake ZZ agent,
no token; stopped at the end). **6 of 6 runs pass**; every screen 0 page errors, no sideways scroll. Detail:
`smoke-walk-fix-results.md` / `.json`, 12 screenshots. No token in the folder (scanned).

| Scene | 390 | 1280 | What was seen |
|---|---|---|---|
| 1. Family + $400 credit union line | pass | pass | Budget "Left each month $2,443" = the engine's left and surplus; Choose's header tile $2,443 and "Safe top: $611", worked from it |
| 2. Make room plan in use, start, print | pass | pass | Tags 1st–5th; started (the stub's snapshot insert carries `closing.roomPlan`); after "Back to my real numbers" the one-page plan still prints the Make room line and both versions ($2,843 / $3,343 left; $533 / $627 insurance) and "Where you are: Step 2 of 5: clear expensive debt" |
| 3. What you own and owe | pass | pass | "Debt payments, including the mortgage, as a share of pay before deductions 21%", the working line, the partner note, the 25% guide |

Writes: scenes 1 and 3 none; scene 2 only to the stub (the case, 7 scope rows, 1 snapshot), as starting an application does.

## 9. Open items

1. "Income if you cannot work" cover is recorded but not counted by the engine (Build B open item; unchanged).
2. A typed value followed by an instant click can rarely lose the click (unchanged).
3. A child studying now could be counted twice (care graph and school fees); already true in version 1.
4. Free-text fields are not scanned for health words; the store's health-key check and the on-screen hint are the guard.
5. The Build B smoke walk's scenes 3 and 4 used the weekly renter at fixed grocery amounts. With Decision 10 the renter
   starts $300 lower, so those amounts now land in other states (it is already above the safe range at $0 extra). The
   unit tests for §5.3 and §5.4 search for their case and still pass; the short walk here did not re-run those scenes.
6. F-13, F-15, F-17, F-19 and F-20 stay open (F-20 now carries the NIS class table step). F-21 to F-23 stay fenced.
7. Closed by this run: open item 2 (the plan in the snapshot) and open item 3 (the "Stage" tile).

## Appendix — full test output (one run, `npm test` in `core/`, tree as committed at `e0f2edd`)

```

> @tt-planning/core@0.1.0 test
> node --test test/**/*.test.ts

✔ guard 1: no spot or current inflation is reachable from the engine (289.3448ms)
✔ guard 1 catches a violation and stays quiet on prose (1.9544ms)
✔ guard 3: a goal starting within a year contributes nothing to monthly saving (79.085ms)
✔ guard 4: non-overlapping child and parent windows report zero sandwich years (0.9501ms)
✔ guard 5: applying a lever reduces monthly saving by the reported amount, within $1 (68.6542ms)
✔ §8: CareGraphInputError for an impossible timeline; never clamped (2.5554ms)
✔ guard 2: unknown cover renders differently from a confirmed $0 (286.956ms)
✔ guard 3: no basket and no ladder exceeds max(the triage stage ceiling, the $200 floor) (2758.6001ms)
✔ guard 4: identical inputs give byte-identical sentences (165.6909ms)
✔ guard 5: every gap is in exactly one state (53.6667ms)
✔ guard 6: Rest Assured II anywhere in a recommendation prints its grading (14.0081ms)
✔ guard 7: the $7,500 funeral grant only where 25+ contributions are affirmatively captured (86.4336ms)
✔ guard 8: registered needs all three §12.3 conditions (0.7128ms)
✔ guard 9: zero registered routings below the personal allowance (a hard block) (131.9902ms)
✔ guard 10: a registered withdrawal before maturity grosses up need / 0.75 (32.0894ms)
✔ guard 11: no rate above a vehicle's floor in the vehicle tables (1.3595ms)
✔ guard 12: a cross-tier reorder writes a declined record and leaves the order unchanged (41.1614ms)
✔ §11.6 stage 0: the ladder returns no basket, only what would change the picture (140.6643ms)
✔ §8: ClosingInputError when an upstream engine did not run; never a default (301.0079ms)
✔ §2.5: a snapshot stores premium bands with their label, never a price (112.4713ms)
✔ dist/fpa-core.js matches a fresh build of src byte for byte (run `npm run build` if not) (1323.4066ms)
✔ dist is one self-contained ES module: no imports, no require, LF line endings (3.6196ms)
✔ dist exports the same public API as src/index.ts (19.4048ms)
✔ dist reproduces the §2.8 and care graph §3 goldens (145.1141ms)
✔ guard 26: each card's status and X equal a ladder run with that card chosen (36788.0951ms)
✔ guard 27: an insurance budget below $200, above max(ceiling, $200), or not finite, throws ClosingInputError (1125.4199ms)
✔ expected result 1: family, Essential, $533.13: term $238.83, critical illness $294.30 (unchanged) (13.4599ms)
✔ expected result 2: family, Recommended, $533.13: life $383.13, critical illness $150; the card needs $195 more (5.7365ms)
✔ expected result 3: family, Recommended, $710.84: life $297.96, CI $150, father's funeral $262.88; less life than at $533 (9.9717ms)
✔ expected result 4: young single: no life item, so every card shows no life plan (4.1072ms)
✔ default card is Essential; the chosen card fills life first in pass two, and a Tier 1 reorder still changes that (11.7672ms)
✔ an order saved under one card still works under another (completeOrder) (18.3674ms)
✔ the slider reaches every screen: budget card, insurance budget and the close move together (17.4842ms)
✔ guard 23: insurance allocated is never above the cap in use (the slider, else the recommended figure) (10158.2176ms)
✔ guard 24: no funded ladder item breaks its product's issue ages (rated age) (2031.6277ms)
✔ guard 24 fixture: a client of rated age 66 gets whole life to the ruin level, not term (3.4755ms)
✔ guard 25: the close screen's life package is the ladder's life allocation, to the cent (2985.0564ms)
✔ expected result, family: cap $533.13; term $238.83 and CI $294.30; the funerals and disability income wait (7.5706ms)
✔ expected result, young single: cap $280.61; CI $280.61; disability income, car loan cover (Tier 2) and home loan cover (Tier 3) wait (5.864ms)
✔ Change 3: no ruin-level life cover without dependants; parent care paid by the client counts as a dependant (10.8972ms)
✔ Change 4: loan cover follows each loan goal; whole life when term cannot be issued at the goal date (1733.6922ms)
✔ gap is need minus in-force cover (32.0605ms)
✔ at 70 the group cover is gone and the gap widens — and we say so (0.6928ms)
✔ over-insured households have a zero gap, never negative (0.31ms)
✔ deterministic (1.2495ms)
✔ the Gap carries the needs engine's caveats forward — a client never sees a number without its uncertainty (2.0138ms)
✔ a group critical-illness rider creates no phantom reduction below the reduction age (0.8896ms)
✔ the group-life parameters reach provenance, with their carrier caveat (0.9361ms)
✔ a client with no group cover gets no group-life parameters in their trail (0.4604ms)
✔ an annuity is not death cover either (0.5964ms)
✔ group cover is half-counted between the reduction and termination ages (1.1546ms)
✔ golden: death needs match the frozen hand-computed case (38.1094ms)
✔ golden: the gap at 40 and at 70 — group cover vanishes (1.5199ms)
✔ golden: the retirement floor and the SCP offset (1.7003ms)
✔ golden: every result carries provenance a regulator could read (1.2139ms)
✔ goldens are pinned to assumption set ff-2026-10-28-s3fix (1.8155ms)
✔ death scenario sentences, both samples (pinned 27 Oct 2026, one-allocator fix; re-baselined in fix run 3) (283.5542ms)
✔ §2.8 sample family (149.6387ms)
✔ §2.8 sample young single (age 24, $8,000 gross, renting) (6.142ms)
✔ care graph §3 canonical case (household net $14,000) (1.9844ms)
✔ care graph §3 variant: Child B to the United Kingdom (1.8589ms)
✔ closing guard 1: the closing comparison reproduces the care graph goldens (upstream immutability) (9.97ms)
✔ ageAt computes age on a given date, not from a clock (2.0927ms)
✔ yearsToPayoff derives the debt decline schedule input (0.6246ms)
✔ debt totals split mortgage from the rest (0.4788ms)
✔ informal dependents are counted — the household is not assumed nuclear (0.413ms)
✔ youngestDependentChild ignores non-children (0.506ms)
✔ youngestDependentChild picks the younger of two children with the same whole-year age (0.4613ms)
✔ yearsUntilLastChildReaches drives income continuation (0.9494ms)
✔ obligationDeclineSchedule steps down as debts retire (1.4603ms)
✔ health score: family 33 'Needs work', young single 51 'Getting there' (prototype parts) (207.91ms)
✔ insurance budget, young single: the ladder at the $281 recommended; CI only, three plans wait (21.2444ms)
✔ insurance budget, family: the ladder at the $533 recommended; the parents' funerals wait (11.278ms)
✔ start early: prototype defaults ($500 a month, balanced 5%, 10 years' delay) (1.7812ms)
✔ loved ones: a grandchild aged 3 on $300 — Goldspoon and children's whole life at $150 each (2.5128ms)
✔ business: the prototype's default company (1.1862ms)
✔ goals, young single: house and car as the prototype (8.0451ms)
✔ debts, family: payoff months and interest as the prototype (12.1214ms)
✔ retirement, family: floor $5,500, gap $2,500, Destiny Registered (31.9055ms)
✔ death need cross-check: the Tatil standard formula as the prototype (12.796ms)
✔ liquidate-mortgage: the mortgage is cleared and no rent is replaced (23.926ms)
✔ replace-rent: 120 months of rent, no mortgage liquidation (2.5506ms)
✔ both: mortgage liquidation and rent replacement are ADDITIVE (4.0044ms)
✔ none: no housing provision at all, even with a mortgage on file (3.9701ms)
✔ housing is never inferred from the mortgage balance (0.5434ms)
✔ a housing strategy with no matching data is caveated, not silently zeroed (0.6001ms)
✔ funeral cost defaults when the client gives no figure, but a stated figure wins (1.542ms)
✔ medical cost is a FLOOR — a lower client estimate does not win (1.2736ms)
✔ income continuation runs until the last child reaches 21 (0.8191ms)
✔ no children => no income continuation (0.7927ms)
✔ total need nets assets and never goes below zero (0.3958ms)
✔ NIS survivors' benefit reduces the income-continuation need (0.8148ms)
✔ an UNSUPPLIED survivors' benefit is caveated — silence would overstate the need (0.4897ms)
✔ an EXPLICIT nil survivors' benefit is a finding, not an omission (0.4203ms)
✔ provenance records the T&T conventions used and contains no estate-tax driver (0.7413ms)
✔ rental_income_months is recorded only when it actually multiplies into the total (0.5715ms)
✔ deterministic — identical inputs give byte-identical output (0.4263ms)
✔ no NIS entitlement: SCP alone pays 3,500 (70.8433ms)
✔ the SCP offset: a 3,000 NIS pension delivers only 2,000 net (1.6481ms)
✔ shortfall never goes negative (0.6301ms)
✔ increments are not silently applied — the caveat surfaces instead (0.9385ms)
✔ below SCP age, only NIS counts (0.7371ms)
✔ retiring before SCP age: the client is told WHY their SCP is zero (7.2189ms)
✔ deterministic (22.3938ms)
✔ SCP cliff proximity is flagged — the engine must not step a client over silently (1.9361ms)
✔ crossing the 5,500 cliff zeroes SCP entirely (1.1565ms)
✔ the NIS deductible share is a 70% row with its IRD source and date (2.5768ms)
✔ hand-worked PAYE: $8,000 a month, age 24, pays NIS (the young single) (32.8736ms)
✔ golden: net worth, sample family (§6.4) (127.2995ms)
✔ golden: net worth, sample young single (§6.4) (11.6167ms)
✔ golden: net worth, weekly renter (no partner, one card) (22.4002ms)
✔ cash is bank + credit union + unit trusts; shares, property and the rest are not cash (17.8083ms)
✔ one cash source: the emergency fund reads the assets, and the old savings field is ignored beside them (55.3497ms)
✔ version 1 savings: the upgrade makes one bank row and the engine sees the same cash (59.0317ms)
✔ a case with no cash rows falls back to the version 1 savings field; none gives 0 months (23.2413ms)
✔ every budget catalogue label passes the facts validator (LABEL_MAX_CHARS) (9.896ms)
✔ guard 21: the insurance budget's Protection rows equal the ladder's funded insurance items, to the cent (8912.6548ms)
✔ guard 22: no funded insurance item on the ladder is below its product minimum (4539.5763ms)
✔ Tier 1 default order: life, CI, parent funerals oldest first, disability income; own final expense for 50 and over (8.0789ms)
✔ the sample family at the $533 recommended: what each Tier 1 item gets (6.3958ms)
✔ a reorder inside Tier 1 moves both screens: the father's funeral above critical illness (7.5245ms)
✔ parameters module is importable from the core (6.2113ms)
✔ the T&T conventions the needs formula depends on are present (0.3613ms)
✔ the current NIS benefit table is the 2016 schedule, not the stale 2008 one (10.2845ms)
✔ lapsed policies contribute no cover (1.8781ms)
✔ below 66, group cover counts in full (0.353ms)
✔ group cover halves at 66 (0.2756ms)
✔ group cover terminates at 70 — the protection gap (0.2818ms)
✔ group cover is still zero above 70 (0.2169ms)
✔ premiums and cash value sum only over in-force policies (0.621ms)
✔ universalLifePolicies finds the X-ray's highest-value target (0.4319ms)
✔ valid sample facts pass (9.1313ms)
✔ guard 7: no free text on a parent (9.0032ms)
✔ guard 8: no health answer anywhere in a case (7.1416ms)
✔ guard 8: a scope row or a snapshot carrying a health answer fails the write (103.7722ms)
✔ guard 8: the engine's own outputs carry no health keys (16.9754ms)
✔ people are deduped by id only: duplicate person ids fail (1.4476ms)
✔ §2.4: every product row carries source and asOf, with the signed figures (16.3915ms)
✔ guard 16: for every recommendation set, no funded plan is below its minimum premium (7136.4274ms)
✔ guard 17: the Disability Income Rider is only ever recommended on Cashbuilder II (1790.5563ms)
✔ a core row read is recorded with its asOf, source and status (3.0153ms)
✔ a fact-finder result records core rows and root rows side by side (165.5362ms)
✔ unverified rows have no value and the engine refuses to read them (3.8925ms)
✔ assumed figures are marked assumed (Section 2 risk 4) (1.5994ms)
✔ every core row has a source and an ISO asOf (2.0294ms)
✔ every core: path named in engine code resolves to a row (24.4096ms)
✔ resolveParameter reads a dotted path and returns node + value (6.964ms)
✔ builder records every parameter used, with provenance (3.1623ms)
✔ using a STALE parameter throws — drift cannot enter silently (1.483ms)
✔ caveats and rules are recorded in order and deduplicated (2.3876ms)
✔ build() output is stable — same calls, byte-identical JSON (2.6462ms)
✔ build() output cannot be mutated to corrupt the builder (2.7915ms)
✔ the parameter tables are frozen — no caller can corrupt the source of truth (0.7295ms)
✔ the core reads no clock and rolls no dice — determinism is auditability (46.2816ms)
✔ the core performs no I/O (14.3511ms)
✔ the core imports nothing from graphify-out/, research/ or tools/ (37.4619ms)
✔ the forbidden-import guard actually catches a violation (1.1677ms)
✔ only src/parameters/ and src/samples/ are exempt from the hard-coded-number guard (3.4314ms)
✔ no T&T parameter is hardcoded outside the parameters module (37.5632ms)
✔ the hardcoded-parameter guard actually catches a violation (0.4549ms)
✔ guard 6: the engine imports only itself and the root parameter table (125.3224ms)
✔ guard 6: the engine touches no network, storage, environment or UI (27.7056ms)
✔ guard 6 catches every probe the Phase 0a review found uncaught (2.4629ms)
✔ goldens: the two ApplyOn quotes, at both covers, to the cent (25.1727ms)
✔ the sample family's parent funerals use the quotes: minimum on $30,000 at the rated age (65.4799ms)
✔ away from a quoted age the 5% a year factor applies, with its caveat (0.7064ms)
✔ eligibility is judged on the rated age: parent age 79 (rated 80) issues, 80 (rated 81) does not (61.8658ms)
✔ the insured's sex: from the relationship for parents; male rate and a flag when it cannot be told (24.1846ms)
✔ one pricing function: only premiums.ts reads the Rest Assured II rate rows (70.0381ms)
✔ guard 36: one left each month — the budget's left is the surplus the stage, ceiling, shortfall, buffer build and Make room use (6781.7741ms)
✔ guard 36: a $400 credit union line lowers the left, the stage's surplus and the ceiling by the same $400 (10.0387ms)
✔ the savings step on closing: the first rung not reached, 0 at stage 0 (the header chip and the one-page plan read it) (4031.4636ms)
✔ the snapshot keeps a Make room plan in use inside closing: targets, split, both versions' totals (45.632ms)
✔ golden: the retirement working, sample family (§9) (142.7332ms)
✔ golden: a weekly-paid case, pay changes and two groups skipped (§2, §1.2, §5.2) (26.5523ms)
✔ golden: a rent case, the young single (§6.1, §9: rent never stops) (19.0155ms)
✔ golden: payoff dates and a payoff-date mismatch (§7.2, §7.4) (55.6275ms)
✔ golden: a Make room default split, sample family, $500 freed from Food (§6.3) (33.5513ms)
✔ guard 28: frequency maths — weekly ×52/12, fortnightly ×26/12, twice a month ×2, monthly ×1, yearly ÷12 (159.6959ms)
✔ guard 28: a weekly-paid client's NIS is worked on the week's pay and equals the monthly sum (45.208ms)
✔ guard 29: budget lines add to the totals the rest of the engine uses; debts and parent care are never counted twice (191.9002ms)
✔ guard 30: insurance is never below $200 except at stage 0, and stage 0 still has no plan (1236.0314ms)
✔ guard 31: Make room sends freed money in the §6.3 plan order (904.5363ms)
✔ guard 31: a custom split is validated — never more than freed; the rest is 'not yet given a job' (26.6927ms)
✔ guard 32: payoff months from balance, rate and payment; a payment that does not cover the interest never clears (10.3848ms)
✔ guard 33: the retirement figure is max(A, B) × (1 + i)^n, to the dollar (23.4005ms)
✔ §14.1: a version-1 case is upgraded on read and computes exactly as before (58.469ms)
✔ §14.3: bad facts throw LifeCaseFactsError (16.3881ms)
✔ §14.3: an insurance cap below $200, above max(ceiling, $200), or not finite throws (guard 27's range) (21.2107ms)
✔ §7.5 (closes F-16): a co-signed debt is a loan cover item for the co-signer's exposure, in Tier 2 (13.4204ms)
ℹ tests 190
ℹ suites 0
ℹ pass 190
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 39580.5299
```
