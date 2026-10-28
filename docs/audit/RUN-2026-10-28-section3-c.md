# RUN 28 Oct 2026 — Section 3, Build C (engine part: net worth)

Spec: `docs/superpowers/specs/2026-10-28-section-3-budget-ux-design.md` §6.4, §0 row 3.9, §14.1, §14.4. Brief:
`docs/briefs/2026-10-28-section-3-build-brief.md`, "Build C". Branch `feat/section3-engine` (PR #6, open). Claude
Sonnet 5.5, one session, no subagents. Nothing merged, deployed or applied; no live database access. Kyron signed the
spec off and was away: every call below was decided inside the spec and is reversible.

## 1. Flagged before the change

Written before any engine code changed (CLAUDE.md rule 5).

1. **`engine.budget.savings` is read in seven modules** (closing, death need, health score, the budget, the room plan,
   the insurance budget, the stage). Changing the cash source in one place, `toEngineFacts`, moves all of them together
   or none. Risk: the 37 goldens read the samples' cash. Control: the samples' cash goes into asset rows of exactly the
   old amounts, and the 37 are re-run from the built file (inverted gate, hard stop 1).
2. **The partner's pay is take-home** (Build A, D2), the client's is gross. A "share of gross yearly pay" over a mixed
   figure is slightly high for a couple. Decision: use what is stored and say so on the result (`partnerPayIsTakeHome`).
3. **Room plan reads facts, not engine facts** (`room-plan.ts` used `r.facts.budget.savings`). It would have kept the
   old field. Switched to the same cash helper.
4. **Furniture label is 65 characters; the validator allows 60** (Build B). A stored line with that label failed
   validation. Shortened in the catalogue; no stored case holds it (`life_cases` held 0 rows on 28 Oct 2026).
5. **Net worth needs no parameter row**: it adds and divides stored figures. So the assumption set id stays
   `ff-2026-10-28-s3` (no row changed). The cash kinds are a constant beside the asset kind list, like `ASSET_KINDS`.
6. **The vendored file will change** (new export, new field), so GRP's pins change (Build B guard 13): done in the GRP
   record.

## 2. Decisions (inside the spec; reversible)

| # | Decision | Reason |
|---|---|---|
| C1 | **Cash = asset kinds `bank`, `credit-union` and `unit-trust`.** (For Kyron.) | §6.4 groups "unit trusts and money market funds" in one kind and says cash includes money market. So the whole kind counts, even though a unit trust that is not a money market fund is not really cash. `shares-bonds`, `pension-cash` and `life-cash` do not count. To change: edit `CASH_KINDS` in `engine-facts.ts`. |
| C2 | **Costs total = `budget.needsMonthly`** (lines + loan and card minimums + care paid today + the once-a-year set-aside). | It is the figure the rest of the engine divides cash by: `budget.bufferMonths` and the stage use `savings / needsMonthly`. A guard-style test pins `netWorth.monthsCovered === budget.bufferMonths` for the family. |
| C3 | **Gross yearly pay = (client usual gross a month + partner pay as stored) × 12.** The client's usual month, not the lowest month. The partner's pay is stored as take-home (Build A D2), so the family figure is (17,000 + 4,000) × 12 = $252,000, a little under true gross. | Stated on the result: `partnerPayIsTakeHome`. Asking for partner gross is a Build B question, not an engine one. |
| C4 | **What is owed = every debt balance + the mortgage balance when there is a mortgage.** The mortgage row comes first. | §6.4. The engine's own `DebtsResult` is not reused: it adds none of the mortgage. |
| C5 | **One cash figure: `cashFromFacts`** = the sum of the cash asset rows when there are any, else the version 1 field `budget.savings`. It feeds `toEngineFacts` (and so the emergency fund, the stage, the death need, the health score, the close screen) and the room plan. | §6.4 "No asset is typed twice". The fallback keeps a case that has no cash rows (a case saved before assets existed, or a test) working; it is never added to the rows. |
| C6 | **`budget.savings` stays in version 2 as a legacy field.** The version-1 upgrade writes one `bank` row from it and sets it to 0; the page writes 0 and no longer shows it. The validator still requires it to be a number, so Build B's stored shape stays valid. | Removing the field would be a version 3 and break a stored case for no gain. |
| C7 | **Each asset kind is listed once, in §6.4 order, even at $0**, with its label and a `cash` flag. Rows of one kind are summed. | The page renders without computing (§14.4). |
| C8 | **The samples gain realistic non-cash assets**, so the card has something to show: family: bank $20,000 (the version 1 cash), pension cash value $60,000, home $950,000, vehicles $85,000, furniture $40,000; young single: bank $4,000, a car $35,000, furniture $8,000; weekly renter: bank $7,000. Non-cash assets are read by nothing but the net worth card. | Inverted gate: cash unchanged. |
| C9 | **Furniture catalogue label** "Furniture and appliances (cash; hire purchase in Debts)" (55 characters). The validator limit stays 60. | Fix, not a limit change: the limit also guards lender and co-signer names. |
| C10 | **"Your safe range is $X to $Y" note left as is.** Checked (`insurance-budget.ts` lines 302–303): it prints `band.floor` to `band.ceiling`, the safe range of the budget, not the slider's range ($200 to max(ceiling, $200)). Not a defect. | Spec §5. |
| C11 | `monthsCovered` and `debtsShareOfGrossPay` are `null` when the divisor is 0 (no costs, no pay), never a number that is not finite. | The page then shows a dash. |

## 3. The seam for Build C's page (exported from `core/dist/fpa-core.js`)

`computeFactFinder(...)` now returns `netWorth: NetWorth`. Also exported: `computeNetWorth`, `cashFromFacts`,
`CASH_KINDS`, `ASSET_KIND_LABELS`, and the types `NetWorth`, `NetWorthAsset`, `NetWorthOwed`, `NetWorthInputs`
(`NetWorth` was `never` in Build A).

```
NetWorth {
  assets: { kind, label, value, cash }[]      // all 10 kinds, §6.4 order
  assetsTotal; owed: { label, balance, kind: 'mortgage'|'debt' }[]; owedTotal; netWorth;
  grossYearlyPay; debtsShareOfGrossPay: number | null;   // owedTotal / grossYearlyPay (1.92 = 192%)
  cashTotal; costsMonthly; monthsCovered: number | null; // cashTotal / budget.needsMonthly
  partnerPayIsTakeHome: boolean; provenance
}
```

## 4. The 37 goldens (evidence paste-back, after Build C)

"Old" is Build A's new value (§4 of `RUN-2026-10-28-section3-a.md`). New is read from the rebuilt `core/dist/fpa-core.js`
by `docs/audit/evidence-2026-10-28-section3-c/goldens.mjs` (a copy of Build A's script; the JSON is
`after-c-goldens.json`). **0 of 37 moved.** A flat dump of both samples and the two care graph runs against Build A's
build: 0 changed, 0 dropped, 110 added (all `netWorth`); the assumption set id is unchanged
(`evidence-…-c/dump-diff.json`).

| # | Golden | Old (Build A) | New | Moved |
|---|---|---|---|---|
| 1 | §2.8 family: stage | 2 (2) | 2 (2) | no |
| 2 | §2.8 family: ceiling | 711 (710.8425000000007) | 711 (710.8425000000007) | no |
| 3 | §2.8 family: care save a month | 3837 (3836.832922361326) | 3837 (3836.832922361326) | no |
| 4 | §2.8 family: already paying | 4000 (4000) | 4000 (4000) | no |
| 5 | §2.8 family: care present value | 1263107 (1263107.2588376082) | 1263107 (1263107.2588376082) | no |
| 6 | §2.8 family: peak a month | 17391 (17391.466126908694) | 17391 (17391.466126908694) | no |
| 7 | §2.8 family: peak at age | 54 (54) | 54 (54) | no |
| 8 | §2.8 family: sandwich years | 8 (8) | 8 (8) | no |
| 9 | §2.8 family: finish age | 55 (55) | 55 (55) | no |
| 10 | §2.8 family: cover essential | 823567 (823566.766256042) | 823567 (823566.766256042) | no |
| 11 | §2.8 family: cover recommended | 1994846 (1994846.1357406415) | 1994846 (1994846.1357406415) | no |
| 12 | §2.8 family: cover full | 2236674 (2236674.0250936504) | 2236674 (2236674.0250936504) | no |
| 13 | §2.8 family: needs | 15140 (15140) | 15140 (15140) | no |
| 14 | §2.8 family: living | 6700 (6700) | 6700 (6700) | no |
| 15 | §2.8 young single: stage | 1 (1) | 1 (1) | no |
| 16 | §2.8 young single: ceiling | 374 (374.14250000000004) | 374 (374.14250000000004) | no |
| 17 | §2.8 young single: care goals (no care) | 0 (0) | 0 (0) | no |
| 18 | §2.8 young single: cover essential | 149000 (149000) | 149000 (149000) | no |
| 19 | §2.8 young single: cover recommended | 149000 (149000) | 149000 (149000) | no |
| 20 | §2.8 young single: cover full | 149000 (149000) | 149000 (149000) | no |
| 21 | §2.8 young single: needs | 5450 (5450) | 5450 (5450) | no |
| 22 | §2.8 young single: living | 5300 (5300) | 5300 (5300) | no |
| 23 | care graph §3: peak a month | 17391 (17391.466126908694) | 17391 (17391.466126908694) | no |
| 24 | care graph §3: peak at age | 54 (54) | 54 (54) | no |
| 25 | care graph §3: sandwich years | 8 (8) | 8 (8) | no |
| 26 | care graph §3: finish age | 55 (55) | 55 (55) | no |
| 27 | care graph §3: nominal total (to the thousand) | 2078000 (2078167.5911021903) | 2078000 (2078167.5911021903) | no |
| 28 | care graph §3: save from today | 3837 (3836.832922361326) | 3837 (3836.832922361326) | no |
| 29 | care graph §3: already paying | 4000 (4000) | 4000 (4000) | no |
| 30 | care graph §3: present value (to the thousand) | 1263000 (1263107.2588376082) | 1263000 (1263107.2588376082) | no |
| 31 | care graph §3 UK: peak a month | 50753 (50753.23539136213) | 50753 (50753.23539136213) | no |
| 32 | care graph §3 UK: sandwich years | 8 (8) | 8 (8) | no |
| 33 | care graph §3 UK: nominal total (to the thousand) | 3406000 (3406011.777531116) | 3406000 (3406011.777531116) | no |
| 34 | care graph §3 UK: save from today | 16487 (16486.681790825456) | 16487 (16486.681790825456) | no |
| 35 | care graph §3 UK: present value (to the thousand) | 2161000 (2161420.0355303474) | 2161000 (2161420.0355303474) | no |
| 36 | care graph §3 UK: top lever | Send Child B locally (—) | Send Child B locally (—) | no |
| 37 | care graph §3 UK: top lever worth a month | 12650 (12649.84886846413) | 12650 (12649.84886846413) | no |

## 5. New goldens (`core/test/net-worth-goldens.test.ts`)

| Golden | Pinned |
|---|---|
| Net worth, sample family | Owns $1,155,000: bank $20,000, pension cash value $60,000, home $950,000, vehicles $85,000, furniture $40,000. Owes $483,000: mortgage $420,000, credit card $18,000, personal loan $45,000. **Net worth $672,000.** Gross yearly pay $252,000 ((17,000 + 4,000) × 12), so debts are **1.92** of it (192%). Cash $20,000 over costs $15,140 = **1.32 months** |
| Net worth, sample young single | Owns $47,000 (bank $4,000, car $35,000, furniture $8,000); owes $3,000 (card). **Net worth $44,000.** Gross yearly pay $96,000; debts **0.03** of it. Cash $4,000 over $5,450 = **0.73 months** |
| Net worth, weekly renter | Owns $7,000, owes $6,000, **net worth $1,000**; gross year $104,000 ($2,000 × 52, the usual year, not the lowest month); 1.12 months |
| Cash kinds | bank $1,000 + credit union $2,000 + unit trust $3,000 = $6,000; shares and bonds $50,000 and life cash value $9,000 are not cash |
| One cash source | `budget.bufferMonths` equals `netWorth.monthsCovered` (1.321…); a stale `budget.savings` of 999,999 beside cash rows is ignored; bank $60,000 gives 3.96 months |
| Version 1 upgrade | Both V1 samples upgrade to one `bank` row of the old savings and `budget.savings` 0; their emergency-fund months equal the version 2 samples'; savings 0 gives no row |
| Legacy fallback | No cash rows: cash is `budget.savings`; 0 gives 0 months |
| Catalogue labels | Every line label, "Other" label, housing label and the quick yearly label is at most 60 characters, and each catalogue group validates as a facts group |

## 6. Sabotage log

Each guard broken on purpose, the test file run, the failure copied, the file restored (`git diff` before and after
matched). Output: `evidence-2026-10-28-section3-c/sabotage-log.txt`.

| Guard | Sabotage | Failure (first message) | Restored |
|---|---|---|---|
| Catalogue labels fit the validator | the furniture label back to its 65-character text | `Got unwanted exception: group home: every label must validate` | yes |
| One cash source | `toEngineFacts` reads `budget.savings` again | `the emergency fund months are the card's months covered` (1.321… vs 1.321… with a stale 999,999 savings: the two numbers differ) | yes |

## 7. Tests, build and hashes

- Before (Build A, `59224e2`): `npm test` 178/178, dist `b6976268…308e`, assumption set `ff-2026-10-28-s3`.
- After: `npm test` **186/186** (8 new in `net-worth-goldens.test.ts`), 0 fail, 0 skipped; `npm run typecheck` exit 0;
  `npm run build` wrote `core/dist/fpa-core.js`; `dist.test.ts` confirms it matches a fresh build and the same API as
  `src/index.ts`. Privacy guards 7 and 8 and purity guard 6 pass (no hard stop).
- Dist SHA-256 **`246f0ae65df7853b1c6a8c253eedbdeb185b30213408db261d9b69d1fb207c82`**, 282,696 bytes.
- Engine commit **`520a6899876435c890dd7677713d3a0f4a90b64a`**. Assumption set **`ff-2026-10-28-s3`** (no parameter row changed).

**Tests changed, with the reason** (none deleted or skipped): `products.test.ts` guard 16 set `budget.savings` to vary cash;
it now sets the bank asset row (cash comes from assets). Nothing else changed in an existing test.

**Source changes:** new `src/net-worth.ts`; `engine-facts.ts` (`CASH_KINDS`, `cashFromFacts`, `savings` now cash);
`fact-finder.ts` (`netWorth` on the result); `room-plan.ts` (same cash helper); `life-case-facts.ts` (upgrade writes the
bank row; `savings` documented as legacy); `samples/index.ts` (asset rows); `parameters/budget-catalogue-2026-10.ts`
(furniture label); `index.ts` (exports).

## 8. Open items

1. **Kyron's call (C1):** unit trusts count in full as cash. If only money market funds should, the asset list needs a
   separate kind (a version change); until then the whole kind counts.
2. **Kyron's call (C3):** the debts ratio uses the partner's take-home, because that is how it is stored. Asking for the
   partner's gross is a Build B / spec question.
3. **Kyron's call (C5, C6):** `budget.savings` stays as a legacy field. Drop it at the next facts version.
4. A `unit-trust` row typed for investment (not a money market fund) shortens the "months covered" claim; the card's
   wording should say "cash and money market funds".
5. Build A's open items 1 to 3 (NIS class table, saving in needs, Make room debt step) are unchanged. F-21 to F-23 stay fenced.

## Appendix — full test output (one run, `npm test` in `core/`, tree as committed at `520a689`)

```

> @tt-planning/core@0.1.0 test
> node --test test/**/*.test.ts

✔ guard 1: no spot or current inflation is reachable from the engine (115.1206ms)
✔ guard 1 catches a violation and stays quiet on prose (0.5177ms)
✔ guard 3: a goal starting within a year contributes nothing to monthly saving (34.1892ms)
✔ guard 4: non-overlapping child and parent windows report zero sandwich years (2.2181ms)
✔ guard 5: applying a lever reduces monthly saving by the reported amount, within $1 (9.7214ms)
✔ §8: CareGraphInputError for an impossible timeline; never clamped (1.9111ms)
✔ guard 2: unknown cover renders differently from a confirmed $0 (152.2566ms)
✔ guard 3: no basket and no ladder exceeds max(the triage stage ceiling, the $200 floor) (1494.3437ms)
✔ guard 4: identical inputs give byte-identical sentences (89.798ms)
✔ guard 5: every gap is in exactly one state (20.492ms)
✔ guard 6: Rest Assured II anywhere in a recommendation prints its grading (11.0536ms)
✔ guard 7: the $7,500 funeral grant only where 25+ contributions are affirmatively captured (6.9582ms)
✔ guard 8: registered needs all three §12.3 conditions (0.9265ms)
✔ guard 9: zero registered routings below the personal allowance (a hard block) (29.327ms)
✔ guard 10: a registered withdrawal before maturity grosses up need / 0.75 (0.739ms)
✔ guard 11: no rate above a vehicle's floor in the vehicle tables (1.0473ms)
✔ guard 12: a cross-tier reorder writes a declined record and leaves the order unchanged (5.5388ms)
✔ §11.6 stage 0: the ladder returns no basket, only what would change the picture (5.6804ms)
✔ §8: ClosingInputError when an upstream engine did not run; never a default (5.6227ms)
✔ §2.5: a snapshot stores premium bands with their label, never a price (19.4973ms)
✔ dist/fpa-core.js matches a fresh build of src byte for byte (run `npm run build` if not) (1473.2642ms)
✔ dist is one self-contained ES module: no imports, no require, LF line endings (3.7458ms)
✔ dist exports the same public API as src/index.ts (22.0894ms)
✔ dist reproduces the §2.8 and care graph §3 goldens (179.5661ms)
✔ guard 26: each card's status and X equal a ladder run with that card chosen (12417.9693ms)
✔ guard 27: an insurance budget below $200, above max(ceiling, $200), or not finite, throws ClosingInputError (323.8118ms)
✔ expected result 1: family, Essential, $533.13: term $238.83, critical illness $294.30 (unchanged) (3.7207ms)
✔ expected result 2: family, Recommended, $533.13: life $383.13, critical illness $150; the card needs $195 more (2.0712ms)
✔ expected result 3: family, Recommended, $710.84: life $297.96, CI $150, father's funeral $262.88; less life than at $533 (3.2913ms)
✔ expected result 4: young single: no life item, so every card shows no life plan (1.5247ms)
✔ default card is Essential; the chosen card fills life first in pass two, and a Tier 1 reorder still changes that (4.5333ms)
✔ an order saved under one card still works under another (completeOrder) (5.4167ms)
✔ the slider reaches every screen: budget card, insurance budget and the close move together (6.489ms)
✔ guard 23: insurance allocated is never above the cap in use (the slider, else the recommended figure) (6488.2906ms)
✔ guard 24: no funded ladder item breaks its product's issue ages (rated age) (897.6167ms)
✔ guard 24 fixture: a client of rated age 66 gets whole life to the ruin level, not term (2.6638ms)
✔ guard 25: the close screen's life package is the ladder's life allocation, to the cent (1346.1705ms)
✔ expected result, family: cap $533.13; term $238.83 and CI $294.30; the funerals and disability income wait (3.9479ms)
✔ expected result, young single: cap $280.61; CI $280.61; disability income, car loan cover (Tier 2) and home loan cover (Tier 3) wait (2.3917ms)
✔ Change 3: no ruin-level life cover without dependants; parent care paid by the client counts as a dependant (3.9493ms)
✔ Change 4: loan cover follows each loan goal; whole life when term cannot be issued at the goal date (908.6832ms)
✔ gap is need minus in-force cover (35.2117ms)
✔ at 70 the group cover is gone and the gap widens — and we say so (19.9549ms)
✔ over-insured households have a zero gap, never negative (4.5307ms)
✔ deterministic (1.1125ms)
✔ the Gap carries the needs engine's caveats forward — a client never sees a number without its uncertainty (2.7667ms)
✔ a group critical-illness rider creates no phantom reduction below the reduction age (0.844ms)
✔ the group-life parameters reach provenance, with their carrier caveat (0.9815ms)
✔ a client with no group cover gets no group-life parameters in their trail (0.5651ms)
✔ an annuity is not death cover either (0.5718ms)
✔ group cover is half-counted between the reduction and termination ages (1.1764ms)
✔ golden: death needs match the frozen hand-computed case (34.424ms)
✔ golden: the gap at 40 and at 70 — group cover vanishes (1.3397ms)
✔ golden: the retirement floor and the SCP offset (1.577ms)
✔ golden: every result carries provenance a regulator could read (1.2952ms)
✔ goldens are pinned to assumption set ff-2026-10-28-s3 (6.0946ms)
✔ death scenario sentences, both samples (pinned 27 Oct 2026, one-allocator fix; re-baselined in fix run 3) (175.4682ms)
✔ §2.8 sample family (61.4501ms)
✔ §2.8 sample young single (age 24, $8,000 gross, renting) (9.3781ms)
✔ care graph §3 canonical case (household net $14,000) (2.2594ms)
✔ care graph §3 variant: Child B to the United Kingdom (2.5635ms)
✔ closing guard 1: the closing comparison reproduces the care graph goldens (upstream immutability) (51.1362ms)
✔ ageAt computes age on a given date, not from a clock (33.2431ms)
✔ yearsToPayoff derives the debt decline schedule input (0.7883ms)
✔ debt totals split mortgage from the rest (0.9346ms)
✔ informal dependents are counted — the household is not assumed nuclear (2.3792ms)
✔ youngestDependentChild ignores non-children (0.7022ms)
✔ youngestDependentChild picks the younger of two children with the same whole-year age (2.3361ms)
✔ yearsUntilLastChildReaches drives income continuation (0.8921ms)
✔ obligationDeclineSchedule steps down as debts retire (1.1893ms)
✔ health score: family 33 'Needs work', young single 51 'Getting there' (prototype parts) (207.959ms)
✔ insurance budget, young single: the ladder at the $281 recommended; CI only, three plans wait (22.3693ms)
✔ insurance budget, family: the ladder at the $533 recommended; the parents' funerals wait (25.9303ms)
✔ start early: prototype defaults ($500 a month, balanced 5%, 10 years' delay) (11.3889ms)
✔ loved ones: a grandchild aged 3 on $300 — Goldspoon and children's whole life at $150 each (2.9034ms)
✔ business: the prototype's default company (1.7448ms)
✔ goals, young single: house and car as the prototype (18.1826ms)
✔ debts, family: payoff months and interest as the prototype (25.9876ms)
✔ retirement, family: floor $5,500, gap $2,500, Destiny Registered (23.7908ms)
✔ death need cross-check: the Tatil standard formula as the prototype (13.1455ms)
✔ liquidate-mortgage: the mortgage is cleared and no rent is replaced (33.3154ms)
✔ replace-rent: 120 months of rent, no mortgage liquidation (4.0961ms)
✔ both: mortgage liquidation and rent replacement are ADDITIVE (2.3115ms)
✔ none: no housing provision at all, even with a mortgage on file (0.7893ms)
✔ housing is never inferred from the mortgage balance (0.729ms)
✔ a housing strategy with no matching data is caveated, not silently zeroed (0.8326ms)
✔ funeral cost defaults when the client gives no figure, but a stated figure wins (10.8502ms)
✔ medical cost is a FLOOR — a lower client estimate does not win (1.7537ms)
✔ income continuation runs until the last child reaches 21 (1.4869ms)
✔ no children => no income continuation (2.5801ms)
✔ total need nets assets and never goes below zero (0.6567ms)
✔ NIS survivors' benefit reduces the income-continuation need (0.7544ms)
✔ an UNSUPPLIED survivors' benefit is caveated — silence would overstate the need (0.5439ms)
✔ an EXPLICIT nil survivors' benefit is a finding, not an omission (0.5341ms)
✔ provenance records the T&T conventions used and contains no estate-tax driver (0.5529ms)
✔ rental_income_months is recorded only when it actually multiplies into the total (1.6753ms)
✔ deterministic — identical inputs give byte-identical output (3.6717ms)
✔ no NIS entitlement: SCP alone pays 3,500 (30.4417ms)
✔ the SCP offset: a 3,000 NIS pension delivers only 2,000 net (1.3634ms)
✔ shortfall never goes negative (0.7532ms)
✔ increments are not silently applied — the caveat surfaces instead (1.3114ms)
✔ below SCP age, only NIS counts (0.7832ms)
✔ retiring before SCP age: the client is told WHY their SCP is zero (6.4258ms)
✔ deterministic (1.5884ms)
✔ SCP cliff proximity is flagged — the engine must not step a client over silently (2.6868ms)
✔ crossing the 5,500 cliff zeroes SCP entirely (1.6493ms)
✔ the NIS deductible share is a 70% row with its IRD source and date (2.9235ms)
✔ hand-worked PAYE: $8,000 a month, age 24, pays NIS (the young single) (41.4366ms)
✔ golden: net worth, sample family (§6.4) (122.1327ms)
✔ golden: net worth, sample young single (§6.4) (14.5652ms)
✔ golden: net worth, weekly renter (no partner, one card) (20.5143ms)
✔ cash is bank + credit union + unit trusts; shares, property and the rest are not cash (25.1977ms)
✔ one cash source: the emergency fund reads the assets, and the old savings field is ignored beside them (61.9381ms)
✔ version 1 savings: the upgrade makes one bank row and the engine sees the same cash (36.7181ms)
✔ a case with no cash rows falls back to the version 1 savings field; none gives 0 months (7.0029ms)
✔ every budget catalogue label passes the facts validator (LABEL_MAX_CHARS) (10.9203ms)
✔ guard 21: the insurance budget's Protection rows equal the ladder's funded insurance items, to the cent (3031.0957ms)
✔ guard 22: no funded insurance item on the ladder is below its product minimum (1475.8301ms)
✔ Tier 1 default order: life, CI, parent funerals oldest first, disability income; own final expense for 50 and over (6.1547ms)
✔ the sample family at the $533 recommended: what each Tier 1 item gets (4.2274ms)
✔ a reorder inside Tier 1 moves both screens: the father's funeral above critical illness (6.4909ms)
✔ parameters module is importable from the core (1.9195ms)
✔ the T&T conventions the needs formula depends on are present (0.5019ms)
✔ the current NIS benefit table is the 2016 schedule, not the stale 2008 one (0.6539ms)
✔ lapsed policies contribute no cover (2.8275ms)
✔ below 66, group cover counts in full (0.4445ms)
✔ group cover halves at 66 (0.4842ms)
✔ group cover terminates at 70 — the protection gap (0.6333ms)
✔ group cover is still zero above 70 (0.6699ms)
✔ premiums and cash value sum only over in-force policies (0.8557ms)
✔ universalLifePolicies finds the X-ray's highest-value target (0.4165ms)
✔ valid sample facts pass (18.8503ms)
✔ guard 7: no free text on a parent (15.5473ms)
✔ guard 8: no health answer anywhere in a case (14.3119ms)
✔ guard 8: a scope row or a snapshot carrying a health answer fails the write (137.7634ms)
✔ guard 8: the engine's own outputs carry no health keys (19.1386ms)
✔ people are deduped by id only: duplicate person ids fail (2.1396ms)
✔ §2.4: every product row carries source and asOf, with the signed figures (4.6121ms)
✔ guard 16: for every recommendation set, no funded plan is below its minimum premium (4530.1715ms)
✔ guard 17: the Disability Income Rider is only ever recommended on Cashbuilder II (652.7033ms)
✔ a core row read is recorded with its asOf, source and status (4.5486ms)
✔ a fact-finder result records core rows and root rows side by side (106.9863ms)
✔ unverified rows have no value and the engine refuses to read them (4.8749ms)
✔ assumed figures are marked assumed (Section 2 risk 4) (2.2273ms)
✔ every core row has a source and an ISO asOf (2.4491ms)
✔ every core: path named in engine code resolves to a row (44.3434ms)
✔ resolveParameter reads a dotted path and returns node + value (4.2068ms)
✔ builder records every parameter used, with provenance (1.0328ms)
✔ using a STALE parameter throws — drift cannot enter silently (1.203ms)
✔ caveats and rules are recorded in order and deduplicated (1.871ms)
✔ build() output is stable — same calls, byte-identical JSON (0.6117ms)
✔ build() output cannot be mutated to corrupt the builder (0.6274ms)
✔ the parameter tables are frozen — no caller can corrupt the source of truth (1.9572ms)
✔ the core reads no clock and rolls no dice — determinism is auditability (22.3527ms)
✔ the core performs no I/O (18.7238ms)
✔ the core imports nothing from graphify-out/, research/ or tools/ (23.2893ms)
✔ the forbidden-import guard actually catches a violation (0.5657ms)
✔ only src/parameters/ and src/samples/ are exempt from the hard-coded-number guard (2.2838ms)
✔ no T&T parameter is hardcoded outside the parameters module (36.8971ms)
✔ the hardcoded-parameter guard actually catches a violation (0.6581ms)
✔ guard 6: the engine imports only itself and the root parameter table (70.0339ms)
✔ guard 6: the engine touches no network, storage, environment or UI (40.1642ms)
✔ guard 6 catches every probe the Phase 0a review found uncaught (14.4168ms)
✔ goldens: the two ApplyOn quotes, at both covers, to the cent (46.9449ms)
✔ the sample family's parent funerals use the quotes: minimum on $30,000 at the rated age (93.5787ms)
✔ away from a quoted age the 5% a year factor applies, with its caveat (0.9089ms)
✔ eligibility is judged on the rated age: parent age 79 (rated 80) issues, 80 (rated 81) does not (41.1377ms)
✔ the insured's sex: from the relationship for parents; male rate and a flag when it cannot be told (10.7083ms)
✔ one pricing function: only premiums.ts reads the Rest Assured II rate rows (54.1821ms)
✔ golden: the retirement working, sample family (§9) (121.4976ms)
✔ golden: a weekly-paid case, pay changes and two groups skipped (§2, §1.2, §5.2) (11.0823ms)
✔ golden: a rent case, the young single (§6.1, §9: rent never stops) (11.4382ms)
✔ golden: payoff dates and a payoff-date mismatch (§7.2, §7.4) (77.4946ms)
✔ golden: a Make room default split, sample family, $500 freed from Food (§6.3) (17.6178ms)
✔ guard 28: frequency maths — weekly ×52/12, fortnightly ×26/12, twice a month ×2, monthly ×1, yearly ÷12 (229.4668ms)
✔ guard 28: a weekly-paid client's NIS is worked on the week's pay and equals the monthly sum (22.6655ms)
✔ guard 29: budget lines add to the totals the rest of the engine uses; debts and parent care are never counted twice (54.7016ms)
✔ guard 30: insurance is never below $200 except at stage 0, and stage 0 still has no plan (1073.6449ms)
✔ guard 31: Make room sends freed money in the §6.3 plan order (632.7216ms)
✔ guard 31: a custom split is validated — never more than freed; the rest is 'not yet given a job' (18.0763ms)
✔ guard 32: payoff months from balance, rate and payment; a payment that does not cover the interest never clears (9.5181ms)
✔ guard 33: the retirement figure is max(A, B) × (1 + i)^n, to the dollar (18.3576ms)
✔ §14.1: a version-1 case is upgraded on read and computes exactly as before (29.2556ms)
✔ §14.3: bad facts throw LifeCaseFactsError (10.1808ms)
✔ §14.3: an insurance cap below $200, above max(ceiling, $200), or not finite throws (guard 27's range) (11.4782ms)
✔ §7.5 (closes F-16): a co-signed debt is a loan cover item for the co-signer's exposure, in Tier 2 (10.0919ms)
ℹ tests 186
ℹ suites 0
ℹ pass 186
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 13480.8309
```
