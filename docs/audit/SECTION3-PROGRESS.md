# Section 3 build — progress

Brief: `docs/briefs/2026-10-28-section-3-build-brief.md`. Spec: `docs/superpowers/specs/2026-10-28-section-3-budget-ux-design.md`
(signed by Kyron, 28 Oct 2026, 08:41). Orchestrator: Claude Opus 5.5, effort high, one Claude Code session, started 28 Oct 2026.
Nothing merged, deployed or applied; no live database access.

## Orchestrator decisions

1. **Bases.** Local `master` (FPA) and local `main` (GRP) were behind their remotes. Build A branches from
   `origin/master` (2ec9aa4, includes PR #5 at 86c48a4); Build B branches from `origin/main` (db74f97, the fact-finder
   page with fix run 4).
2. **Worktrees.** FPA: `C:\Projects\FPA-wt-section3` (`feat/section3-engine`). GRP: `C:\Projects\GRP-wt-section3`
   (`feat/section3-page`), with the `node_modules` junction to the main checkout.
3. **First FPA commit** `2d7fd58`: the spec, prototype v6 and the build brief, copied from `docs/briefs/`.
4. **This file** lives on `docs/fact-finder-specs`, like `ONE-SHOT-PROGRESS.md`, so the build PRs carry only their own run records.
5. **Subagents** as the brief's table: A Opus 5.5 high, B Opus 5.5 medium, C Sonnet 5.5 medium.

## Builds

### Build A — engine (done, 28 Oct 2026)

PR https://github.com/Kelsean868/Financial-Planning-App/pull/6 (`feat/section3-engine` → `master`, not merged). Engine
commit `59224e270879324a7821b2cadfda1b254e1cd4e9`; run record `b84f727`, then `ed38ae8` (orchestrator: fixed mis-encoded
"§" signs in its golden table). `core/dist/fpa-core.js` SHA-256
`b6976268419c0b2141fcf0f7759d321647c3a682d31039c811c0586c8e1c308e`. Assumption set `ff-2026-10-28-s3`. Tests 178/178
(was 161), typecheck clean; the orchestrator re-ran `npm test` and the hash. No hard stop hit. Guards 28–33 sabotage-tested;
guards 27 and 3 re-sabotaged (new meaning). Run record: `docs/audit/RUN-2026-10-28-section3-a.md` (23 decisions).

**Only non-golden line that moved:** the young single's Floor band, $187.07 → $200 (the floor; decision D4).

**Evidence paste-back, before and after Build A** (before: `2d7fd58`, dist `0c052d55…`; after: `59224e2`). Rows 23–37 are
the care graph §3 goldens. Full values to 4 decimals in the run record §4.

| # | Golden | Old | New | Moved |
|---|---|---|---|---|
| 1 | §2.8 family: stage | 2 | 2 | no |
| 2 | §2.8 family: ceiling | 711 | 711 | no |
| 3 | §2.8 family: care save a month | 3837 | 3837 | no |
| 4 | §2.8 family: already paying | 4000 | 4000 | no |
| 5 | §2.8 family: care present value | 1263107 | 1263107 | no |
| 6 | §2.8 family: peak a month | 17391 | 17391 | no |
| 7 | §2.8 family: peak at age | 54 | 54 | no |
| 8 | §2.8 family: sandwich years | 8 | 8 | no |
| 9 | §2.8 family: finish age | 55 | 55 | no |
| 10 | §2.8 family: cover essential | 823567 | 823567 | no |
| 11 | §2.8 family: cover recommended | 1994846 | 1994846 | no |
| 12 | §2.8 family: cover full | 2236674 | 2236674 | no |
| 13 | §2.8 family: needs | 15140 | 15140 | no |
| 14 | §2.8 family: living | 6700 | 6700 | no |
| 15 | §2.8 young single: stage | 1 | 1 | no |
| 16 | §2.8 young single: ceiling | 374 | 374 | no |
| 17 | §2.8 young single: care goals | 0 | 0 | no |
| 18 | §2.8 young single: cover essential | 149000 | 149000 | no |
| 19 | §2.8 young single: cover recommended | 149000 | 149000 | no |
| 20 | §2.8 young single: cover full | 149000 | 149000 | no |
| 21 | §2.8 young single: needs | 5450 | 5450 | no |
| 22 | §2.8 young single: living | 5300 | 5300 | no |
| 23 | care graph §3: peak a month | 17391 | 17391 | no |
| 24 | care graph §3: peak at age | 54 | 54 | no |
| 25 | care graph §3: sandwich years | 8 | 8 | no |
| 26 | care graph §3: finish age | 55 | 55 | no |
| 27 | care graph §3: nominal total | 2078000 | 2078000 | no |
| 28 | care graph §3: save from today | 3837 | 3837 | no |
| 29 | care graph §3: already paying | 4000 | 4000 | no |
| 30 | care graph §3: present value | 1263000 | 1263000 | no |
| 31 | care graph §3 UK: peak a month | 50753 | 50753 | no |
| 32 | care graph §3 UK: sandwich years | 8 | 8 | no |
| 33 | care graph §3 UK: nominal total | 3406000 | 3406000 | no |
| 34 | care graph §3 UK: save from today | 16487 | 16487 | no |
| 35 | care graph §3 UK: present value | 2161000 | 2161000 | no |
| 36 | care graph §3 UK: top lever | Send Child B locally | Send Child B locally | no |
| 37 | care graph §3 UK: top lever worth a month | 12650 | 12650 | no |

**New goldens.** Retirement (family): A $12,588.36, B $5,900, plan for $27,962 a month in 2053 (the spec's $28,048 was
illustrative). Weekly-paid renter (new sample `SAMPLE_WEEKLY_RENTER`): "Save $187.52 every payday"; floor lifts its $152 cap
to $200. Rent (young single): Home $255.14 above guide; retirement figure $17,807. Payoff mismatch: 2029-08 against the
given 2028-06. Make room default split (family, $500 freed from Food): protection $93.75, debt $204.18, retirement $202.07.

**Calls for Kyron (taken for him, reversible).**
1. NIS: spec §2.2 says the engine uses the class table; it uses a flat 5.4%. Kept flat, because the class table moves
   goldens 2 and 16. Weekly NIS is worked per week.
2. Saving the client already does is left out of needs, so it counts as money left.
3. Make room's debt step is sized to clear expensive debt within 3 years.

**F-16: closed** (a co-signed debt becomes a Tier 2 loan cover item).

**Dist hash note.** `origin/master`'s dist (`0c052d55…`) differs from the GRP pin (`e3e38f7d…`) because merge `9903799`
rebuilt it after master's parameter file gained rows (for example `corporation_tax`). Not line endings.

### Build B — page (done, 28 Oct 2026)

PR https://github.com/Kelsean868/General_Raters_Portal/pull/161 (`feat/section3-page` → `main`, not merged; merge after
FPA #6). Code `0b23253`, run record `75aeaaa`. Vendored engine `59224e2`, SHA-256 `b6976268…308e`, assumption set
`ff-2026-10-28-s3`; pins updated in `PINNED.txt`, `fact-finder.js`, `life-case-store.js` and the guard 9/10 SQL file.
Full portal suite: 3,108 tests, 3,078 pass, 0 fail, 30 skipped (the existing live-database tests; none new). The
orchestrator re-ran the fact-finder tests (50/50) and the vendored hash. No hard stop hit.

Guard 34 (live inputs, real headless Chrome), sabotage "listen to `change` only": both tests failed ("the engine re-ran
while typing"; the label showed $2,000 while the slider read 1950). Guard 35, sabotage "ladder controls in Client
view": failed with "full/choose: Client view shows the ladder controls (Up / Down)". It also caught a real "Stage 02"
leak, now fixed. Guards 7, 8, 9–13, 15 and 18 pass.

Run record `docs/audit/RUN-2026-10-28-section3-b.md` (GRP): 24 decisions (B1–B24), five spec/prototype rule clashes
(spec followed each time: event tabs, step list, where the scope record lives, 7 report blocks not 8, work pension under
retirement), and the **wording table for Kyron** (§8).

Main decisions: Full check-up runs the §0 3.5a order to the final report; Make a budget runs Your money and ends at next
steps; other doors keep the quick form. Starting the application and the scope record live on the final report only.
Client view does not render advisor-only content at all. Money fields are text fields with a decimal keypad (number
fields have no caret position). After "Use this plan", later screens show the Make room figures; pay, loans and budget
keep the real numbers.

Open items from Build B:
1. Kyron approves the wording table.
2. "Income if you cannot work" cover is recorded but not counted by the engine.
3. The snapshot has no field for the Make room plan; the "both versions" line on the one-page plan is page-held.
4. The one-page plan's tile still says "Stage".
5. A typed value followed by an instant click can rarely lose the click (the old page had the same exposure).
6. Checked by the orchestrator, not a defect: the engine note "Your safe range is $355 to $711" names the safe range;
   the Choose slider runs $200 to $711 (§5.2). Both are true.
7. Sent to Build C: the furniture line label (65 characters) fails the 60-character label check; savings typed twice.

### Build C — net worth (done, 28 Oct 2026)

Commits added to the two open PRs (no new PRs). FPA: engine `520a6899876435c890dd7677713d3a0f4a90b64a`, head `422a9fe`;
`core/dist/fpa-core.js` SHA-256 `246f0ae65df7853b1c6a8c253eedbdeb185b30213408db261d9b69d1fb207c82`; assumption set stays
`ff-2026-10-28-s3` (no parameter row changed). Tests 186/186, typecheck clean. GRP: head `9f9aaaf`, vendored engine
`520a689` with the new hash, every pin updated (the orchestrator grepped: no old hash or commit left outside `docs/`).
Full portal suite 3,111 tests, 3,081 pass, 0 fail, 30 skipped (the same live-database tests). The orchestrator re-ran
FPA `npm test` (186/186), both hashes, and the GRP fact-finder and life-case tests (76/76). No hard stop hit. Run records:
FPA and GRP `docs/audit/RUN-2026-10-28-section3-c.md`.

**What changed.** New `NetWorth` result (`computeFactFinder(...).netWorth`) and the "What you own and owe" card and
report block 4. Cash for the emergency fund now reads from the asset rows (bank, credit union, unit trust); the version-1
upgrade turns `budget.savings` into one bank row; the page no longer has a second savings field. The furniture catalogue
label now fits the 60-character label check, with a test over every catalogue label.

**Net worth goldens.**

| Sample | Owns | Owes | Net worth | Debts ÷ gross yearly pay | Months covered by cash |
|---|---|---|---|---|---|
| Family | $1,155,000 | $483,000 | $672,000 | 192% | 1.32 |
| Young single | $47,000 | $3,000 | $44,000 | 3% | 0.73 |
| Weekly renter | $7,000 | $6,000 | $1,000 | 6% | 1.12 |

The samples' old cash became one bank row of the same amount ($20,000; $4,000; $7,000). Non-cash assets (for example
the family's home $950,000 and vehicle $85,000) were added so the card has something to show.

**Evidence paste-back, after Build C.** Old = after Build A (`59224e2`); new = after Build C (`520a689`). The two golden
dumps (`evidence-2026-10-28-section3-a/goldens-after.json` and `evidence-2026-10-28-section3-c/after-c-goldens.json`)
are byte-identical (checked by the orchestrator). Against the Build A table above: every one of the 37 has the same old
and new value. A full dump of both samples shows 0 changed, 0 dropped, 110 `netWorth` lines added.

| # | Old | New | Moved | | # | Old | New | Moved |
|---|---|---|---|---|---|---|---|---|
| 1 | 2 | 2 | no | | 20 | 149000 | 149000 | no |
| 2 | 711 | 711 | no | | 21 | 5450 | 5450 | no |
| 3 | 3837 | 3837 | no | | 22 | 5300 | 5300 | no |
| 4 | 4000 | 4000 | no | | 23 | 17391 | 17391 | no |
| 5 | 1263107 | 1263107 | no | | 24 | 54 | 54 | no |
| 6 | 17391 | 17391 | no | | 25 | 8 | 8 | no |
| 7 | 54 | 54 | no | | 26 | 55 | 55 | no |
| 8 | 8 | 8 | no | | 27 | 2078000 | 2078000 | no |
| 9 | 55 | 55 | no | | 28 | 3837 | 3837 | no |
| 10 | 823567 | 823567 | no | | 29 | 4000 | 4000 | no |
| 11 | 1994846 | 1994846 | no | | 30 | 1263000 | 1263000 | no |
| 12 | 2236674 | 2236674 | no | | 31 | 50753 | 50753 | no |
| 13 | 15140 | 15140 | no | | 32 | 8 | 8 | no |
| 14 | 6700 | 6700 | no | | 33 | 3406000 | 3406000 | no |
| 15 | 1 | 1 | no | | 34 | 16487 | 16487 | no |
| 16 | 374 | 374 | no | | 35 | 2161000 | 2161000 | no |
| 17 | 0 | 0 | no | | 36 | Send Child B locally | Send Child B locally | no |
| 18 | 149000 | 149000 | no | | 37 | 12650 | 12650 | no |
| 19 | 149000 | 149000 | no | | | | | |

(Row names as in the Build A table.)

**Calls for Kyron (taken for him, reversible).**
1. Cash = bank, credit union and unit trust. The spec puts unit trusts and money market funds in one kind, so a unit
   trust that is not a money market fund also counts in full.
2. "Debts as a share of gross yearly pay" includes the mortgage, as the spec and the brief say. **Rule clash:** the
   prototype leaves the mortgage out. Spec followed: the family shows 192% (31% without the mortgage).
3. Gross yearly pay = the client's usual gross plus the partner's pay as stored, which is take-home (partner gross is
   not stored). The card says so.
4. `budget.savings` stays in version 2 as a legacy field; it is read only when there are no cash asset rows.

### Smoke walk (done, 28 Oct 2026)

Run by the Build B builder on GRP `9f9aaaf` and then `52c5276`, at 390 and 1280, ZZ clients only, Supabase stubbed
(`node scripts/fact-finder-preview-server.mjs 8791`, which swaps `portal-auth.js` for an in-memory fake agent). On every
screen: no page errors, no sideways scroll, 0 network writes. Evidence: GRP `docs/audit/evidence-2026-10-28-section3/`
(34 screenshots, `smoke-walk-results.md` / `.json`, `smoke-walk.mjs`); GRP run record B §10. The orchestrator scanned the
evidence folder for tokens: none.

| Scene | 390 | 1280 | What was seen |
|---|---|---|---|
| 1. Sample family, all seven sections | pass | pass | 14 screens to the final report; net worth card shown |
| 1. Make room custom split | pass | pass | Food $2,000 → $1,500 frees $500: retirement $100, the 24% card $150, protection $120, Spend more on Food $80; "Not yet given a job" $50 |
| 1. Use this plan | pass | pass | Food +$80; insurance budget $533 → $653; card payoff June 2028 → March 2028; "You live long" shows $100 a month; the report shows both versions |
| 1. Back to my real numbers | pass | pass | Plan cleared; report back on the real numbers |
| 2. Weekly-paid single who rents | pass | pass | Pay changes on, plans on the lowest month; "In a good month you take home $7,953"; "Plan on 4"; two groups "Estimated" |
| 3. Under $200 left | pass | pass | "To start the $200 minimum you need $16 more a month."; no plan; the button opens Make room |
| 4. Safe ceiling under $200, $200+ left | pass | pass | A $200 plan with the "above the safe range" note |
| 5. Payment under the interest | pass | pass | "This payment never clears the debt."; debt-free "Never, at today's payments" |
| 6. Client and advisor views | pass | pass | Client view on Choose and the report: no ladder controls, scope record or band detail; advisor view shows them |

**One fix during the walk** (`52c527617a985f8d2e5953c2c5b742056bf2fbdf`, page only): after "Use this plan", "You live
long" did not show the plan's retirement money (spec §6.3.4). It now adds a "Retirement money from Make room" row from
the engine's figures. New client-facing label added to the wording table. Fact-finder tests 76/76 after it; the
orchestrator then ran the full portal suite on the final code `e183c8c`: **3,111 tests, 3,081 pass, 0 fail, 30 skipped.**

### Fix run (done, 28 Oct 2026)

Brief `docs/briefs/2026-10-28-section-3-fix-brief.md`; Kyron's decisions of 28 Oct 2026, 10:55 (Decision 10 = A,
Decision 11 = A, the wording table approved with change 3, calls 2, 3, 4, 5 and 7 accepted as amended). Claude Opus 5.5,
effort medium, one session, no subagents. Run record: FPA `docs/audit/RUN-2026-10-28-section3-fix.md`. No hard stop hit.

| Change | What now holds |
|---|---|
| 1. One "left each month" (Decision 10) | The saving the client already does comes off the surplus; the stage, the ceiling, the shortfall, the buffer build and Make room use the budget's left. **Guard 36.** "Left after costs" is now "Left each month" on the page. |
| 2. Debt ratio (Decision 11) | "Debt payments, including the mortgage, as a share of pay before deductions": family **21%** ($1,440 + $3,000 over $17,000 + $4,000), guide at most 25% (PALIG, Loans 25%; parameter row), the partner note. Spec §6.4 amended. |
| 3. Make room order labels | Destinations read 1st to 5th; the header chip keeps "Step N of 5". Wording table row updated; guard 31 names no "Step" (no change). |
| 4. The plan in the snapshot | `closing.roomPlan` (targets, split, both versions' totals); the one-page plan prints both versions from the snapshot. **Guard 37.** |
| 5. One-page plan tile | "Where you are: Step N of 5: …" from `closing.savingsStep`. |
| 6. Records | F-20 gains the NIS class table step (`ONE-SHOT-PROGRESS.md`); docs PR #7. |

**Goldens.** 0 of the 37 moved (values compared from the built file; the samples' dump changed only in the assumption
set id). Moved, recorded: the weekly renter's Build A golden (its $300 saving is no longer left: save per pay $187.52 →
$118.29, ceiling $203.15 → $128.15, its $200 plan now above the safe range) and the Build C ratio goldens (192% →
21.1%, a new golden). Assumption set `ff-2026-10-28-s3` → **`ff-2026-10-28-s3fix`** (the guide row).

**Guards.** 36 (FPA, sabotage: drop the saving from the surplus → "sample weekly renter: the budget shows $512.58 left;
the stage and the ceiling use $812.58") and 37 (GRP, sabotage: leave the plan out of the snapshot → "the printed plan,
from the snapshot, has the Make room line the screen had: …"). Guard 8 passes on the larger `closing`; guards 7, 11, 13
and 15 pass.

**Tests.** FPA `npm test` **190/190**, typecheck clean. GRP full suite **3,116 tests, 3,086 pass, 0 fail, 30 skipped**
(the same live-database tests). Short smoke walk at 390 and 1280: **6 of 6 pass** (GRP
`docs/audit/evidence-2026-10-28-section3/fix/`).

## Final summary

### PRs, in merge order (Kyron merges; nothing merged, deployed or applied)

1. FPA https://github.com/Kelsean868/Financial-Planning-App/pull/6 — `feat/section3-engine` → `master`. Builds A and C,
   and the fix run's engine part.
2. GRP https://github.com/Kelsean868/General_Raters_Portal/pull/161 — `feat/section3-page` → `main`. Builds B and C, the
   smoke walk and the fix run's page part. It vendors the engine from FPA #6, so merge it after FPA #6.
3. FPA https://github.com/Kelsean868/Financial-Planning-App/pull/7 — `docs/fact-finder-specs` → `master`. This file,
   the Section 3 briefs, the spec copy and the prototype. Docs only. Merge last.

No database migration (facts live in `life_cases.facts`; the store upgrades version 1 on read and writes version 2).

### New hashes

| What | Old | New |
|---|---|---|
| FPA `feat/section3-engine` head (PR #6) | — (from `origin/master` 2ec9aa4) | `6cbf1e7` (fix run record; was `422a9fe` after Build C) |
| FPA engine commit | `0a332cf` (fix run 4) | `e0f2edd2f693cfd2332a73cb7504ac90607e0f2b` (Build A `59224e2`, Build C `520a689`, then the fix run) |
| `core/dist/fpa-core.js` SHA-256 (= GRP `vendor/fpa-core/fpa-core.js`) | `e3e38f7d…b100` | `50734563eee00019132d178ad869703c4a3cfaff6016d3fc37565fd86364b2c9` (was `246f0ae6…7c82` after Build C) |
| Assumption set id | `ff-2026-10-28-cards1` | `ff-2026-10-28-s3fix` (was `ff-2026-10-28-s3`) |
| GRP `feat/section3-page` head (PR #161) | — (from `origin/main` db74f97) | `83324ee` (page `3a0b0dc`; was `e183c8c` after the smoke walk) |
| FPA `docs/fact-finder-specs` head (PR #7) | `f461284` | this file's commit |

Guard 9/10 SQL now expects `ff-2026-10-28-s3fix` and engine commit `e0f2edd`.

### Results

- Goldens: 0 of 37 moved after Build A, after Build C and after the fix run (tables above and the fix run record). Care
  graph §3 goldens included.
- New guards 28–37, each sabotage-tested; guards 3 and 27 changed meaning and were re-sabotaged.
- FPA `npm test` 190/190; GRP full suite 3,116 / 3,086 pass / 0 fail / 30 skipped (the existing live-database tests).
- Smoke walk 6 scenes × 2 widths, all pass; fix-run short walk 3 scenes × 2 widths, all pass.
- No hard stop hit. F-16 closed.

### Kyron's calls (decided 28 Oct 2026, 10:55)

1. **Wording table**: approved, with change 3 (Make room order labels); GRP run record B §8 now carries the fix run's rows.
2. NIS stays a flat 5.4% for now; F-20 records the switch to the NIBTT class table when the 2027 table is published
   (moves goldens 2 and 16, re-baseline then).
3. Saving the client already does stays out of needs, and since Decision 10 it is also not money left.
4. Make room's debt step is sized to clear expensive debt within 3 years (accepted).
5. Cash = bank, credit union and unit trust (accepted).
6. Replaced by Decision 11: debt payments, including the mortgage, as a share of pay before deductions (family 21%).
7. The partner's pay is counted after deductions, because gross is not asked; the screen says so.

### Every open item

1. "Income if you cannot work" cover is recorded but not counted by the engine.
2. ~~The snapshot has no field for the Make room plan~~ **Closed by the fix run** (`closing.roomPlan`, guard 37).
3. ~~The one-page plan's tile still says "Stage"~~ **Closed by the fix run** ("Where you are: Step N of 5").
4. A typed value followed by an instant click can rarely lose the click (old page had the same exposure).
5. A child studying now could be counted twice (care graph and school fees); already true in version 1.
6. Free-text fields (line labels, lender, co-signer name, own items) are not scanned for health words; the store's
   health-key check and the on-screen hint are the guard.
7. Five spec/prototype rule clashes in Build B and one in Build C; the spec was followed each time (run records B and C).
8. F-13, F-15, F-17, F-19 and F-20 stay open (F-20: parameter refresh before 4 Jan 2027, now with the NIS class table step).
9. The Build B smoke walk's scenes 3 and 4 used the weekly renter at fixed grocery amounts; with Decision 10 it starts
   $300 lower, so those amounts now land in other states. The unit tests search for their case and pass.

### Fenced (not in Section 3)

- **F-21:** bank-statement import or receipt scanning.
- **F-22:** a "track actual against budget" month view.
- **F-23:** client self-serve budgeting at home (Section 2 fence 1).
