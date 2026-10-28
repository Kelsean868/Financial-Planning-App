# RUN 28 Oct 2026 — Section 3, Build A (engine)

Spec: `docs/superpowers/specs/2026-10-28-section-3-budget-ux-design.md` (signed by Kyron 28 Oct 2026, 08:41). Brief:
`docs/briefs/2026-10-28-section-3-build-brief.md`, "Build A". Branch `feat/section3-engine` from `origin/master`
(`2ec9aa4`). Claude Opus 5.5, effort high, one session (builder subagent). Nothing merged, deployed or applied; no live
database access.

## 1. Flagged before the change

Written before any engine code changed (CLAUDE.md rule 5). Each is decided inside the spec; the decision is in §2.

1. **The engine does not use the NIS class table.** Spec §2.2 says "the engine already works from the class table".
   It does not: `computeNetPay` takes 5.4% of gross up to the $13,600 monthly insurable ceiling. Moving to the class
   table would move golden 2 (family ceiling) and golden 16 (young single ceiling): hard stop 1. Decision: keep the
   flat rate; a weekly-paid client's NIS is worked per week on the weekly figure (5.4% of the week's pay up to the
   weekly ceiling, then × 52/12), which is the same number the monthly sum gives. Open item for Kyron (ties to F-20).
2. **Partner pay is take-home.** v1 `partner.incomeMonthly` was used as take-home (no tax maths). `partner.pay` keeps
   that meaning; the client's `pay.amountPerPay` is gross, as `grossMonthly` was.
3. **"Saving you already do" is not in needs.** §1.1 says "counted as saving, not spending". Needs (and so the stage,
   the ceiling and "money left after costs") leave it out; the "going out" bar and the analysis count it. Risk: the
   insurance ceiling is a share of money that already goes to a sou-sou or credit union. Make room is where it is
   redirected. §9 subtracts saving from "today's spending", so the two readings agree on the retirement figure.
4. **The floor also lifts the close screen's Floor / Recommended / Ceiling bands** (guard 30: insurance never below
   $200 except stage 0). For the young single the Floor band's monthly moves $187.07 → $200 (its life cover stays $0:
   no one depends on her). Not one of the 37 goldens.
5. **The version-1 upgrade is exact except one case.** A v1 parent whose care has already started and who is under the
   SCP age: v1 dropped the care cost when the pension started; v2 keeps today's budget amount when it is larger (§1.3
   rule). `life_cases` held 0 rows on 28 Oct 2026, so no stored case is affected.
6. **Payoff dates need a month; the engine reads no clock.** The page passes `asOfMonth` ("YYYY-MM"); without it the
   engine uses January of `asOfYear` and says so on the result.
7. **Co-signed debt cover tier.** §7.5 says "a loan cover item in its tier". By Decision 7's rule (tier by when the
   loan is taken: inside 3 years is Tier 2) an existing loan is Tier 2.
8. **Make room's expensive-debt step has no size in the spec.** Decision: it takes what would clear all expensive debt
   inside the near-dated horizon (3 years, the Tier 2 rule), less the minimums and the extra already funded.
9. **Spec and prototype clashes (rules, not looks).** Followed the spec (hard stop 5 is "record and continue"):
   (a) the prototype's insurance band is 5% of take-home / 25% of money left; the engine keeps its stage table;
   (b) the prototype's "no plan" test uses money left after saving; the engine uses money left after costs (item 3);
   (c) the prototype lists co-signed loan cover after Tier 1 items; the engine puts it in Tier 2 (item 7);
   (d) the prototype tags saving lines `stop: 'save'`; §14.1 allows only mortgage, kids, work, care, so saving is told
   by its group; (e) the prototype's sample parents (father: future "Day care" from 80) differ from the brief's mapping
   (father: no growth); the brief's mapping is used.
10. **Name clash.** `DebtPayoff` already exists in `debts.ts` (the three payoff runs). §14.4 needs the name for the new
    result. The old type is renamed `DebtPayoffRuns`; the runtime shape (`debts.payoff`) is unchanged.
11. **Origin/master's dist hash.** `origin/master` `core/dist/fpa-core.js` hashes `0c052d55…128aab`, not the GRP pin
    `e3e38f7d…b100`. Cause: merge `9903799` rebuilt the dist after master's `parameters/tt-parameters.json` gained rows
    (e.g. `corporation_tax`), which esbuild inlines. Not line endings (`.gitattributes` marks the file `-text`). The
    engine code is the same as `0a332cf`. Not chased further.

The "before" values (all 37 goldens with full precision, and a flat dump of both samples) are in
`docs/audit/evidence-2026-10-28-section3-a/goldens-before.json`, written by `goldens.mjs` beside it from the untouched
branch (`2d7fd58`, dist SHA-256 `0c052d55341e50ca3e1812cc2c493ac7435a7483b5ed9d48684241edbc128aab`; `npm test` 161/161,
typecheck exit 0).

**Result.** Done. Hard stop 1 not hit (0 of 37 goldens moved; no care graph §3 golden moved). Hard stops 2 to 4 not
hit: no test deleted or skipped, privacy guards 7 and 8 pass, nothing needed a merge, a deploy or database access. Hard
stop 5 (spec–prototype clashes) recorded in §1 item 9; the spec was followed.

| What | Value |
|---|---|
| Engine commit (last code commit) | `59224e270879324a7821b2cadfda1b254e1cd4e9` |
| `core/dist/fpa-core.js` SHA-256 | `b6976268419c0b2141fcf0f7759d321647c3a682d31039c811c0586c8e1c308e` (279,232 bytes) |
| Assumption set id | `ff-2026-10-28-s3` (was `ff-2026-10-28-cards1`) |
| Tests | 178/178 pass (was 161/161); `npm run typecheck` exit 0 |
| Goldens | 0 of 37 moved; 5 new golden tests (§6) |

## 2. Decisions (taken inside the spec; reversible)

| # | Decision | Why |
|---|---|---|
| D1 | NIS stays the flat 5.4% to the $13,600 ceiling; weekly pay is worked per week (§1 item 1). | The class table moves goldens 2 and 16 (hard stop 1). |
| D2 | `partner.pay` is take-home, as v1's `incomeMonthly`; the client's `pay` is gross. | Keeps v1 meaning; the prototype also treats partner pay as take-home. |
| D3 | "Saving you already do" is not in needs; it is in "going out" and the analysis (`kind: saving`). | §1.1 "counted as saving, not spending"; §9 then subtracts nothing for saving. Flagged §1 item 3. |
| D4 | The Floor / Recommended / Ceiling bands are `max($200, share × ceiling)`, and 0 when there is no plan. | Guard 30. Moves one non-golden line (young single Floor band $187.07 → $200). |
| D5 | v1 upgrade: cost lines → one `quick` group (the line equal to `housingPaymentMonthly` gets `stop: mortgage`; "School and childcare" gets `stop: kids` by its quick-form label); `irregularAnnual` → a `yearly` group with one yearly line "Once-a-year bills"; pay → monthly; `growth = careTier > 0`; each parent's care share today (care level less the SCP when care has started, else 0) → a Family you support line; debt `type` from its label (else `other`), `lender`/`endDate`/`cosignerName` null, `cosigned` false; cover `status` from the amount (null → unsure, 0 → none, else have); empty opener; no assets. A v1 housing payment that matches no cost line throws `LifeCaseFactsError`. | §14.1 mapping; keeps every v1 total, so an upgraded v1 case computes exactly as the v2 sample (test "§14.1"). |
| D6 | Payoff dates count from `options.asOfMonth` ("YYYY-MM"); default January of `asOfYear`, with `asOfMonthAssumed: true`. | The engine reads no clock (purity guard). |
| D7 | A co-signed debt with a balance is ladder item `cosigned-cover:<debt index>`, Tier 2, term (whole life past term's issue age), cover max($150,000, balance), premium max($150, rate). The insurance budget maps it to a plan ("Term life for the … co-signed"). | §7.5 "in its tier"; Decision 7 puts a loan taken now in Tier 2. Closes F-16. |
| D8 | Make room step 3 (expensive debt) can use what clears all expensive debt inside 3 years (`core:ff.closing.nearDatedYears`), less its minimums and the extra the ladder already pays. | The spec gives no size; the Tier 2 horizon is the existing rule. |
| D9 | Make room is its own function, `computeRoomPlan(result, input)`, not part of `computeFactFinder`. A split above the freed amount, an unknown destination, "Spend more on" saving, or a negative target throws `LifeCaseFactsError`. A target above today's amount frees nothing (raising a group is "Spend more on"). | A stale stored plan cannot stop the rest of the engine; the error is about facts. |
| D10 | Default split: step 0 "Costs above income" (stage 0 only) first; steps 1–4 fill the unfilled part of the ladder item (buffer one month, protection, debt, buffer to three months); step 5 fills retirement's unfilled part, then goals' (near-dated, education, milestones); anything left goes to retirement, so every dollar has a job by default. | §6.3.3 order; "the same rule, not a new one" (the ladder's own items). |
| D11 | Protection step size = the cap the new budget allows (max($200, recommended) with the freed money, stage table re-run) less the cap in use. | §6.3.3 "the $200 insurance floor, then the insurance budget". |
| D12 | `applyRoomPlan(facts, plan)` builds the "With your plan" facts: a cut scales a group's untagged lines first, tagged lines (mortgage, kids, work, a parent's care) only after; a raise adds a "More from Make room" line; debt money raises `debts.extraMonthly`; protection becomes `options.budgetMonthly`, kept inside the applied run's range. The real facts never change. | §6.3.4 and §14.1 ("facts keep the real numbers; the plan sits beside them"). |
| D13 | Care graph (§1.3): today's amount grows at the care basket rate; `growth: false` → today's amount to 88; `growth: true` → today's amount until `careFromAge`, then max(today's, future level less the pension); no amount today and no growth → no stream. A parent with no line today and growth starts at `careFromAge`, exactly as v1. "Supported parent" (dependants, the SCP offset line) = care today > 0, or growth with a level. | Keeps v1 arithmetic float-for-float for the samples. |
| D14 | Budget split: a line with a parent's `personId` is that parent's care in whichever group it sits (counted once, through the care graph); a skipped Family you support group is one total for relatives (no parent care read from it); the mortgage payment is the sum of `stop: mortgage` lines, used only while `housing` is `mortgage`; skipped groups' lines are ignored (the total replaces them). | Guard 29. |
| D15 | Analysis: shares of household take-home; a parent's care shows in Family you support at the care graph's year-0 figure; a "Study costs today" row when a child studies now; a "Loan and card payments" row with the `debt` guide; status within / below / above / far-above (> 1.5 × top) / no-guide; gaps = the top 3 groups above their guide, in dollars. | Rows add exactly to needs (guard 29). |
| D16 | Retirement B: needs less: the mortgage payment if `yearsLeft` ≤ years to retirement; `kids` lines when the youngest is 19 by then (new row `core:ff.retirementFigure.childCostsStopAge`); `work` lines; each parent's care whose stream ends (age 88) by then; study paid today; debt payments. "NIS and your pensions pay about $X" is `retirement.floorMonthly`, taken at today's figures and held level with inflation. | §9; the spec's "$6,900 is illustrative; the engine computes it". |
| D17 | "My pay changes": the lowest month drives every engine figure (tax, budget, insurance range, death need, goals); the usual month is shown as `goodMonthNetMonthly`. | §2.5 "the plan uses the lowest". |
| D18 | Stage 0 `insuranceCap` is unchanged (only 0 is accepted). With money left under $200 (stage > 0) a slider amount inside $200–max(ceiling, $200) is accepted and the cap is 0. | §5.4, §5.5; guard 27's range is §14.3's. |
| D19 | `DebtPayoff` (old, the three runs) renamed `DebtPayoffRuns`; `DebtPayoff` is the §14.4 result. `NetWorth` reserved as a type alias for Build C. | §14.4 names. |
| D20 | Care tier labels 3 and 4: "Private residential" → "Day care", "High-dependency" → "Full-time" (amounts $5,600, $12,000 unchanged). | §1.3 names the levels. |
| D21 | New fixture `SAMPLE_WEEKLY_RENTER` (weekly $2,000, pay changes, lowest $7,500, two groups skipped, card end date 2028-06) for Build B's smoke walk case 2. Its recommended figure ($152.36) is under $200, so the floor sets its cap. | The brief's smoke walk; one golden (§6). |
| D22 | Modules read `EngineFacts` (from `toEngineFacts`); `computeNetPay`, `computeClosing` and the other per-module exports take it. `computeFactFinder` takes v1 or v2 facts and returns `facts` as v2. | One place works out monthly figures. |
| D23 | v2 validation also rejects: an unknown or repeated group key, a skipped group without total and frequency, a cover `status` that disagrees with its `amount`, a label, lender or co-signer name over 60 characters, room-plan keys that are not groups or destinations. | §14.3 "anything else that does not validate". |

**Noted while building:** the family's household take-home is $17,983.37, not the spec's illustrative $18,038
(prototype PAYE). So A = $12,588.36 and the figure is **$27,962** a month in 2053 (spec illustration $28,048). The engine
figure is the one pinned.

## 3. The seam for Build B (exported from `core/dist/fpa-core.js`)

### 3.1 Functions and result types

| Function | Signature | Result |
|---|---|---|
| `computeFactFinder` | `(input: unknown, options?: FactFinderOptions) => FactFinderResult` | adds `pay: PayPlan`, `budgetAnalysis: BudgetAnalysis`, `debtPayoff: DebtPayoff`, `retirementFigure: RetirementFigure`, `insuranceRange: InsuranceRange`; `closing.ladder` adds `insuranceRange`, `aboveSafeRange`; `careGraph` adds `parentsToday` |
| `FactFinderOptions` | `{ package?, budgetMonthly?, ladderOrder?, savePct?, asOfMonth?: "YYYY-MM" }` | `budgetMonthly`: $200 to max(ceiling, $200), else `ClosingInputError` |
| `computeRoomPlan` | `(result: FactFinderResult, input: RoomPlanInput) => RoomPlanResult` | `RoomPlanInput = { groupTargets: Partial<Record<BudgetGroupKey, number>>; split?: Partial<Record<RoomDestination, number>> \| null }` |
| `applyRoomPlan` | `(facts: LifeCaseFacts, plan: RoomPlanResult) => { facts: LifeCaseFacts; options: { budgetMonthly: number \| null } }` | run `computeFactFinder(facts, {...yourOptions, ...options})` for "With your plan" |
| `validateLifeCaseFacts` | `(input: unknown) => LifeCaseFacts` | v2; v1 upgraded; else `LifeCaseFactsError` |
| `upgradeLifeCaseFacts` | `(input: unknown) => LifeCaseFacts` | v1 only |
| `insuranceRange` / `insuranceCap` | `(budget: HouseholdBudget) => InsuranceRange` / `(budget, budgetMonthly?) => number` | |
| `computeBudgetAnalysis` | `({ facts: LifeCaseFacts, budget, debts: DebtSummary, careGraph }) => BudgetAnalysis` | (also on the result) |
| `computeDebtPayoff` | `(items, runs: DebtPayoffRuns, extraMonthly, asOfYear, asOfMonth?) => DebtPayoff` | (also on the result) |
| `computeRetirementFigure` | `({ facts: EngineFacts, budget, careGraph, retirement }) => RetirementFigure` | (also on the result) |
| `computePayPlan` | `(facts: EngineFacts, netPay: NetPay, buckets: BudgetBuckets) => PayPlan` | (also on the result) |
| `payoffMonths`, `addMonths`, `monthIndex`, `monthLabel` | `(balance, ratePct, payment) => number \| null`; `("YYYY-MM", n) => "YYYY-MM"` | helpers |
| `toEngineFacts`, `toMonthly`, `toYearly`, `payMonthly`, `groupMonthly`, `splitBudget`, `parentSupported`, `catalogueGroup`, `isRoomDestination` | | helpers |
| Data | `BUDGET_CATALOGUE`, `QUICK_GROUP`, `QUICK_YEARLY_LABEL`, `HOUSING_LINE_LABELS`, `GROUP_KEYS`, `ROOM_ORDER`, `OWN_ITEMS_MAX` (3), `OWN_ITEM_MAX_CHARS` (80), `SAMPLE_WEEKLY_RENTER`, `SAMPLE_FAMILY_V1`, `SAMPLE_YOUNG_SINGLE_V1` | |

Result shapes (fields, all `readonly`):

- **`InsuranceRange`**: `floorMonthly` (200), `stage0`, `noPlan`, `shortByMonthly` (§5.4 "$X more a month"), `minMonthly`,
  `maxMonthly` (slider), `defaultMonthly` (max($200, recommended); 0 with no plan), `ceilingMonthly`, `recommendedMonthly`.
  `closing.ladder.aboveSafeRange` is §5.3's note.
- **`BudgetAnalysis`**: `takeHomeMonthly`, `groups: BudgetGroupRow[]`, `spendingMonthly`, `savingMonthly`,
  `debtPaymentsMonthly`, `careMonthly`, `needsMonthly`, `outgoingMonthly` ("So far: $X going out"), `leftMonthly`
  ("$Y left"), `gaps: { key, label, monthly, aboveByMonthly }[]` (≤ 3), `estimatedGroups`, `stopMonthly`,
  `careAboveBudget`. `BudgetGroupRow`: `key` (a group key, `debts` or `study`), `label`, `kind`, `monthly`, `share`,
  `guide: { key, min, max, source, asOf } | null`, `status` (`no-guide | below | within | above | far-above`),
  `aboveByMonthly`, `estimated`, `lines: { label, amount, frequency, monthly, stop, personId }[]`.
- **`RoomPlanResult`**: `groups: { key, label, kind, todayMonthly, targetMonthly, freedMonthly, suggestedMonthly,
  aboveByMonthly }[]`, `suggestions`, `freedMonthly`, `defaultSplit` and `split: { key, label, step (0–5 | null),
  neededMonthly, monthly }[]`, `custom`, `assignedMonthly`, `notGivenAJobMonthly`, `effects: { groupsAfter[],
  insuranceBudgetBeforeMonthly, insuranceBudgetMonthly, debtExtraBeforeMonthly, debtExtraMonthly, debtTarget: { index,
  label, payoffBefore, payoffAfter } | null, shortfallMonthly, bufferMonthly, emergencyMonthly, retirementMonthly,
  goalsMonthly }`. Destinations: `shortfall`, `buffer`, `protection`, `debt`, `emergency`, `retirement`, `goals`,
  `group:<key>`.
- **`DebtPayoff`**: `asOfMonth`, `asOfMonthAssumed`, `debts: { index, label, type, lender, balance, ratePct,
  minimumMonthly, interestMonthly, expensive, months, payoffMonth, neverClears, endDate, endDateDiffMonths, mismatch,
  cosigned, cosignerName }[]`, `anyNeverClears`, `debtFree: { minimumsOnly, highestRateFirst, smallestBalanceFirst }`
  (each `{ months, month }`, null = never), `extraMonthly`.
- **`RetirementFigure`**: `retireAge`, `retireYear`, `yearsToRetirement`, `inflationRate`, `replacementRate`,
  `takeHomeMonthly`, `incomeRuleMonthly` (A), `spendingMonthly`, `stops: { kind, label, monthly, endsYear }[]`,
  `stopsMonthly`, `lifestyleRuleMonthly` (B), `rule`, `todayMonthly`, `factor`, `atRetirementMonthly` (headline),
  `pensionsTodayMonthly`, `gapTodayMonthly`, `gapAtRetirementMonthly`, `wantedMonthly`, `wantBelowRecommended`.
- **`PayPlan`**: `client` and `partner` rhythms (`frequency, paysPerYear, amountPerPay, varies, usualMonthly,
  planMonthly`), `planNetMonthly`, `goodMonthNetMonthly`, `takeHomePerPay`, `savePerPay`, `planPaysPerMonth`,
  `extraPaysPerYear`.
- **`careGraph.parentsToday`**: `{ personId, budgetMonthly, graphMonthly }[]` (Your people: "From your budget, today").

### 3.2 Facts version 2, as built

```
LifeCaseFacts {
  schemaVersion: 2; asOfYear;
  client: { personId, firstName?, lastName?, age, sex, longLived, nisPaying, selfEmployed, hasHealthCover,
            pay: PayFacts };
  partner: { personId, firstName?, age, pay: PayFacts } | null;          // partner pay is take-home
  PayFacts = { frequency: 'weekly'|'fortnightly'|'semimonthly'|'monthly', amountPerPay, varies, lowestMonthly|null };
  children: ChildFacts[]  (unchanged);
  parents: { personId, relationship, firstName?, birthYear, careTier 0–4, careFromAge?, growth: boolean,
             receivesSCP, nisContributions }[];                          // careTier/careFromAge = the future level
  budget: { groups: { key: BudgetGroupKey, skip, total|null, totalFrequency|null,
                      lines: { label, amount, frequency: 'weekly'|'fortnightly'|'monthly'|'yearly',
                               stop?: 'mortgage'|'kids'|'work'|'care', personId?: <a parent's id> }[] }[];
            housing: 'mortgage'|'rent'|'contribution'|'own';
            mortgage: { balance, yearsLeft, clearOnDeath } | null;
            savings;                                                     // cash today (Build C moves it to assets)
            roomPlan: { groupTargets: {key: monthly}, split: {destination: monthly}, applied } | null };
  debts: { items: { label, type: 'credit-card'|'car-loan'|'personal'|'hire-purchase'|'student-loan'|'informal'|'other',
                    lender|null, balance, ratePct, minimumMonthly, endDate: 'YYYY-MM'|null, cosigned,
                    cosignerName|null }[];
           extraMonthly };
  goals: GoalFacts[]  (unchanged);
  existingCover: { policyId, label, kind, group, amount|null, status: 'none'|'unsure'|'have' }[];
  wishes, workPension  (unchanged);
  opener: { worries: string[], dreams: string[], ownWorries: string[≤3, ≤80], ownDreams: string[≤3, ≤80] };
  assets: { kind: 'bank'|'credit-union'|'unit-trust'|'shares-bonds'|'pension-cash'|'life-cash'|'property'|'vehicle'
                  |'furniture'|'other', value }[];
  lovedOnes?, business?  (unchanged)
}
```

### 3.3 Budget catalogue keys (`BUDGET_CATALOGUE`; `kind`, guide row, stop tags)

| Group key | Label | Kind | Guide | Line keys (stop tag) |
|---|---|---|---|---|
| `home` | Home | spending | `home` 25–30% | `housing` (first line: Mortgage `mortgage` / Rent / Household contribution / none if owned; `HOUSING_LINE_LABELS`), `land-tax`, `home-insurance`, `repairs`, `security`, `domestic-help`, `furniture` |
| `util` | Utilities and bills | spending | `util` 5–10% | `ttec`, `wasa`, `gas`, `mobile`, `internet`, `streaming` |
| `food` | Food | spending | `food` 10–15% | `groceries`, `lunches` (`work`), `eating-out`, `drinks` |
| `move` | Getting around | spending | `move` 10–15% | `fuel`, `public-transport`, `motor-insurance`, `licence`, `servicing`, `parking` |
| `kids` | Children | spending | none | `school-fees`, `books-uniforms`, `lunch-money`, `school-transport`, `lessons`, `daycare`, `activities`, `allowances` (all `kids`) |
| `health` | Health and personal care | spending | `health` 5–10% | `health-insurance`, `doctor`, `medication`, `gym`, `hair`, `nails`, `toiletries`, `clothing` |
| `family` | Family you support | support | none | one line per person; a parent's line has its `personId` and `care` |
| `giving` | Giving | spending | `giving` 5–10% | `church`, `gifts`, `child-support` |
| `ins` | Insurance you pay now | spending | `insurance` 5–10% | `life`, `other-premiums` |
| `save` | Saving you already do | saving | `saving` 10–20% | `sou-sou`, `credit-union`, `pension`, `unit-trust` |
| `fun` | Fun and lifestyle | spending | `fun` 5–10% | `entertainment`, `hobbies`, `travel`, `carnival`, `lotto` |
| `yearly` | Once-a-year costs | yearly | none | `christmas`, `back-to-school`, `carnival-season`, `motor-renewal`, `home-repairs`, `medical` (all yearly) |
| `other` | Pets and other | spending | none | `pets`, `bank-fees`, `anything-else` |
| `quick` | Your costs (quick 7-line form) | spending | none | `housing` (`mortgage`), `groceries`, `utilities`, `transport`, `phone`, `school` (`kids`), `insurance`; its once-a-year figure goes in a `yearly` group line "Once-a-year bills" |
| (row) `debts` | Loan and card payments | — | `debt` at most 20% | from Debts, never typed in the budget |

Guide rows: `core:ff.guides.{home,food,move,util,health,debt,insurance,saving,fun,giving}` (advisor-set, source and
asOf 2026-10-28), `farAboveFactor` 1.5, `gapsShown` 3. Other new rows: `core:ff.frequency.perYear`,
`core:ff.frequency.planPaysPerMonth`, `core:ff.insurance.floorMonthly` (200, "Kyron, 28 Oct 2026"),
`core:ff.retirementFigure.replacementRate` (0.7, advisor-set), `core:ff.retirementFigure.childCostsStopAge` (19),
`core:ff.debts.mismatchMonths` (3).

## 4. The 37 goldens and the care graph §3 goldens (evidence paste-back)

Before: untouched branch `2d7fd58`, `core/dist/fpa-core.js` SHA-256 `0c052d55…128aab`. After: rebuilt at `59224e2`,
SHA-256 `b6976268…308e`. Both read from the built file by `docs/audit/evidence-2026-10-28-section3-a/goldens.mjs`
(JSON beside it). Rows 23–37 are the care graph §3 goldens. **0 of 37 moved.**

| # | Golden | Old (shown) | New (shown) | Old full | New full | Moved |
|---|---|---|---|---|---|---|
| 1 | §2.8 family: stage | 2 | 2 | 2 | 2 | no |
| 2 | §2.8 family: ceiling | 711 | 711 | 710.8425 | 710.8425 | no |
| 3 | §2.8 family: care save a month | 3837 | 3837 | 3836.8329 | 3836.8329 | no |
| 4 | §2.8 family: already paying | 4000 | 4000 | 4000 | 4000 | no |
| 5 | §2.8 family: care present value | 1263107 | 1263107 | 1263107.2588 | 1263107.2588 | no |
| 6 | §2.8 family: peak a month | 17391 | 17391 | 17391.4661 | 17391.4661 | no |
| 7 | §2.8 family: peak at age | 54 | 54 | 54 | 54 | no |
| 8 | §2.8 family: sandwich years | 8 | 8 | 8 | 8 | no |
| 9 | §2.8 family: finish age | 55 | 55 | 55 | 55 | no |
| 10 | §2.8 family: cover essential | 823567 | 823567 | 823566.7663 | 823566.7663 | no |
| 11 | §2.8 family: cover recommended | 1994846 | 1994846 | 1994846.1357 | 1994846.1357 | no |
| 12 | §2.8 family: cover full | 2236674 | 2236674 | 2236674.0251 | 2236674.0251 | no |
| 13 | §2.8 family: needs | 15140 | 15140 | 15140 | 15140 | no |
| 14 | §2.8 family: living | 6700 | 6700 | 6700 | 6700 | no |
| 15 | §2.8 young single: stage | 1 | 1 | 1 | 1 | no |
| 16 | §2.8 young single: ceiling | 374 | 374 | 374.1425 | 374.1425 | no |
| 17 | §2.8 young single: care goals (no care) | 0 | 0 | 0 | 0 | no |
| 18 | §2.8 young single: cover essential | 149000 | 149000 | 149000 | 149000 | no |
| 19 | §2.8 young single: cover recommended | 149000 | 149000 | 149000 | 149000 | no |
| 20 | §2.8 young single: cover full | 149000 | 149000 | 149000 | 149000 | no |
| 21 | §2.8 young single: needs | 5450 | 5450 | 5450 | 5450 | no |
| 22 | §2.8 young single: living | 5300 | 5300 | 5300 | 5300 | no |
| 23 | care graph §3: peak a month | 17391 | 17391 | 17391.4661 | 17391.4661 | no |
| 24 | care graph §3: peak at age | 54 | 54 | 54 | 54 | no |
| 25 | care graph §3: sandwich years | 8 | 8 | 8 | 8 | no |
| 26 | care graph §3: finish age | 55 | 55 | 55 | 55 | no |
| 27 | care graph §3: nominal total (to the thousand) | 2078000 | 2078000 | 2078167.5911 | 2078167.5911 | no |
| 28 | care graph §3: save from today | 3837 | 3837 | 3836.8329 | 3836.8329 | no |
| 29 | care graph §3: already paying | 4000 | 4000 | 4000 | 4000 | no |
| 30 | care graph §3: present value (to the thousand) | 1263000 | 1263000 | 1263107.2588 | 1263107.2588 | no |
| 31 | care graph §3 UK: peak a month | 50753 | 50753 | 50753.2354 | 50753.2354 | no |
| 32 | care graph §3 UK: sandwich years | 8 | 8 | 8 | 8 | no |
| 33 | care graph §3 UK: nominal total (to the thousand) | 3406000 | 3406000 | 3406011.7775 | 3406011.7775 | no |
| 34 | care graph §3 UK: save from today | 16487 | 16487 | 16486.6818 | 16486.6818 | no |
| 35 | care graph §3 UK: present value (to the thousand) | 2161000 | 2161000 | 2161420.0355 | 2161420.0355 | no |
| 36 | care graph §3 UK: top lever | Send Child B locally | Send Child B locally | — | — | no |
| 37 | care graph §3 UK: top lever worth a month | 12650 | 12650 | 12649.8489 | 12649.8489 | no |

**What else moved** (flat dump of `computeFactFinder` for both samples plus the two care graph runs, provenance and facts
left out; `evidence-2026-10-28-section3-a/dump-diff.json`): 5 changed, 549 added, 0 dropped. Changed: the assumption
set id (4 lines) and `young.closing.bands[0].monthly` 187.07125 → 200 (D4). Added: `pay`, `budgetAnalysis`, `debtPayoff`,
`retirementFigure`, `insuranceRange`, `closing.ladder.insuranceRange` / `aboveSafeRange`, `careGraph.parentsToday`.

## 5. Sabotage log

Each guard broken on purpose, its test file run, the failure copied, the file restored byte for byte (script
`evidence-2026-10-28-section3-a/sabotage.py`; the working-tree diff was the same before and after all eight runs).
Guards 27 and 3 changed meaning this run, so they were sabotaged again.

| Guard | Sabotage | Failure (first message) | Restored |
|---|---|---|---|
| 28 frequency maths | the weekly row 52 → 48 (×4 for weekly) | `AssertionError: weekly`; `$500 a week: NIS 108, hand-worked 117` (4 tests fail) | yes |
| 29 lines add up, nothing counted twice | `toEngineFacts` adds the debt payments as a cost line | `sample family: needs 16580 = lines 9700 + debt payments 1440 + care today 4000` (3 fail) | yes |
| 30 never below $200 except stage 0 | `insuranceRange` floor 0 instead of the row | `gross 17000, stage 2, left 2843.37: the slider runs from $200 to max(ceiling, $200)`; `the floor lifts the weekly renter's cap to $200` | yes |
| 31 plan order | the default split fills debt before protection | `protection gets 0; in plan order it gets 9.375 (left 50)` | yes |
| 32 payoff maths, never clears | `payoffMonths` with a 0% rate | `$18000 at 24% paying $650` (expected 41 months) | yes |
| 33 max(A, B) × (1+i)^n | `todayMonthly = A` | `figure 17599.133773631274` (young single; B is larger) | yes |
| 27 (new range) | the lower bound back to the band's floor | `ClosingInputError: The insurance budget of 200.00 a month is outside the range 355.42 to 710.84.` (guards 26, 27 fail) | yes |
| 3 (≤ max(ceiling, floor)) | the slider's top doubled | `basket top 230.20588140684336 over ceiling 200 (stage 2, {"budgetMonthly":400})` | yes |

Full output of the eight runs: `evidence-2026-10-28-section3-a/sabotage-log.txt`.

## 6. New goldens (`core/test/section3-goldens.test.ts`)

| Golden | Pinned |
|---|---|
| Retirement working, family | A = 70% × $17,983.37 = **$12,588.36**; B = $15,140 − (mortgage $3,000 ends 2044, children $800, father's care $4,000 ends 2043, debts $1,440) = **$5,900**; rule income; × 1.03^27 = 2.2213; **$27,962 a month in 2053**; pensions $5,500 today; gap $7,088.36 today, $15,745 in 2053; the $8,000 want is below it |
| Weekly-paid case (`SAMPLE_WEEKLY_RENTER`) | 52 pays; usual $8,666.67, plan $7,500 (lowest); NIS $405.00; take-home $7,059.25 (good month $7,953.15); $1,629.06 a pay; save **$187.52 every payday**; plan on 4 pays, 4 extra a year; Fun and Pets/other estimated; needs $6,246.67, saving $300, left $512.58; stage 2, ceiling $203.15, recommended $152.36 → **cap $200** (floor), not above the safe range |
| Rent case (young single) | Home $2,500 = 33.41% of take-home, above the 25–30% guide by **$255.14** (the one gap); retirement A $5,237.99, B $5,300 (rent carries on): rule lifestyle, × 3.3599 = **$17,807** a month in 2067 |
| Payoff-date mismatch | Weekly renter's card ($6,000, 24%, $250): 34 payments, **2029-08**; said 2028-06; 14 months later → mismatch. Family (as of 2026-10): card 56 → 2031-06, loan 76 → 2033-02; debt-free 2033-02 at minimums, **2030-02** highest rate or smallest balance first |
| Make room default split | Family, Food $2,000 → $1,500 ($500 freed): buffer $0, protection **$93.75**, debt **$204.18**, emergency $0, retirement **$202.07**, goals $0; insurance budget $533.13 → $626.88; debt extra $600 → $804.18; the card clears 2028-06 → **2028-02** |

## 7. Tests, build and hashes

- Before: `npm test` 161/161, typecheck exit 0, dist `0c052d55…128aab` (origin/master; §1 item 11).
- After: `npm test` **178/178** (17 new: `section3-guards.test.ts` 12, `section3-goldens.test.ts` 5), typecheck exit 0,
  `npm run build` wrote `core/dist/fpa-core.js`; `dist.test.ts` confirms it matches a fresh build and exports the
  same API as `src/index.ts`.
- Dist SHA-256 **`b6976268419c0b2141fcf0f7759d321647c3a682d31039c811c0586c8e1c308e`**, engine commit
  **`59224e270879324a7821b2cadfda1b254e1cd4e9`**, assumption set **`ff-2026-10-28-s3`**.
- Privacy guards 7 and 8 (`privacy-guards.test.ts`) and purity guard 6 pass (hard stop 3 not hit).

**Tests changed, with the reason** (none deleted or skipped):
- `goldens-fact-finder.test.ts`: the assumption set id and the header note (no golden moved).
- `f18-package-cards.test.ts` guards 26 and 27, `fix-ladder-advice.test.ts` guard 23, `closing-guards.test.ts` guard 3:
  the slider's range is now $200 to max(ceiling, $200) (§5, §14.3), and guard 3 is ≤ max(ceiling, floor). Same
  assertions, new bounds; guard 23's default cap is max($200, recommended).
- `ladder-cases.ts`, `closing-guards.test.ts`, `fix-ladder-advice.test.ts`, `one-allocator.test.ts`, `products.test.ts`:
  v1 edits (`client.grossMonthly`, `budget.costs`, `parents`) replaced by v2 helpers in the new `test/facts-helpers.ts`
  (`setGross`, `scaleCosts`, `setParents` — which keeps a parent's care line with the parent, as §14.3 requires).
- `care-graph-guards.test.ts`: hand-built care graph parents gain `growth: true, todayMonthly: 0` (v1's care-from-now).
- `net-pay-nis70.test.ts`, `closing-guards.test.ts` §8: `computeNetPay` / `computeClosing` take `toEngineFacts(facts)`.

## 8. Open items

1. **Kyron's call — NIS class table** (§1 item 1, D1). Ties to F-20 (class table refresh before 4 Jan 2027).
2. **Kyron's call — saving in needs** (D3): confirm "Saving you already do" stays out of needs (it raises money left
   and so the ceiling).
3. **Kyron's call — Make room debt step size** (D8): the 3-year clearing payment.
4. "Insurance you pay now" lines do not pre-fill "Cover you already have" (§1.1 "these feed"): the engine keeps
   `existingCover` separate. Build B can pre-fill from the `ins` group; no engine change needed.
5. §6.4 assets are validated only. The net worth function, and the emergency fund reading cash from assets, are Build C;
   until then `budget.savings` is the cash figure.
6. A child studying now is counted by the care graph (year 0) and could also be typed under Children (school fees):
   pre-existing (v1 had the same), noted for the advisor check.
7. Free text in budget line labels, lenders, co-signer names and own items is not scanned for health words; the
   store's health-key check and the on-screen hint are the guard (§3.3).
8. The GRP store and page still write version 1; Build B moves them to version 2 (the engine upgrades v1 on read).
9. F-16 **closed** (§7.5, D7). F-13, F-15, F-17, F-19 and F-20 stay open. F-21 to F-23 stay fenced.

## Appendix — full test output (one final run, `npm test` in `core/`, tree as committed at `59224e2`)

```
> @tt-planning/core@0.1.0 test
> node --test test/**/*.test.ts

✔ guard 1: no spot or current inflation is reachable from the engine (132.2203ms)
✔ guard 1 catches a violation and stays quiet on prose (0.5407ms)
✔ guard 3: a goal starting within a year contributes nothing to monthly saving (32.023ms)
✔ guard 4: non-overlapping child and parent windows report zero sandwich years (25.3872ms)
✔ guard 5: applying a lever reduces monthly saving by the reported amount, within $1 (7.9429ms)
✔ §8: CareGraphInputError for an impossible timeline; never clamped (1.9156ms)
✔ guard 2: unknown cover renders differently from a confirmed $0 (153.6255ms)
✔ guard 3: no basket and no ladder exceeds max(the triage stage ceiling, the $200 floor) (1676.2413ms)
✔ guard 4: identical inputs give byte-identical sentences (47.6504ms)
✔ guard 5: every gap is in exactly one state (7.0748ms)
✔ guard 6: Rest Assured II anywhere in a recommendation prints its grading (29.5192ms)
✔ guard 7: the $7,500 funeral grant only where 25+ contributions are affirmatively captured (9.6081ms)
✔ guard 8: registered needs all three §12.3 conditions (0.7265ms)
✔ guard 9: zero registered routings below the personal allowance (a hard block) (73.9012ms)
✔ guard 10: a registered withdrawal before maturity grosses up need / 0.75 (0.5908ms)
✔ guard 11: no rate above a vehicle's floor in the vehicle tables (33.793ms)
✔ guard 12: a cross-tier reorder writes a declined record and leaves the order unchanged (6.4163ms)
✔ §11.6 stage 0: the ladder returns no basket, only what would change the picture (43.7878ms)
✔ §8: ClosingInputError when an upstream engine did not run; never a default (16.375ms)
✔ §2.5: a snapshot stores premium bands with their label, never a price (17.9516ms)
✔ dist/fpa-core.js matches a fresh build of src byte for byte (run `npm run build` if not) (1065.2454ms)
✔ dist is one self-contained ES module: no imports, no require, LF line endings (2.8964ms)
✔ dist exports the same public API as src/index.ts (18.502ms)
✔ dist reproduces the §2.8 and care graph §3 goldens (127.8114ms)
✔ guard 26: each card's status and X equal a ladder run with that card chosen (11890.6256ms)
✔ guard 27: an insurance budget below $200, above max(ceiling, $200), or not finite, throws ClosingInputError (353.5135ms)
✔ expected result 1: family, Essential, $533.13: term $238.83, critical illness $294.30 (unchanged) (3.6887ms)
✔ expected result 2: family, Recommended, $533.13: life $383.13, critical illness $150; the card needs $195 more (1.8884ms)
✔ expected result 3: family, Recommended, $710.84: life $297.96, CI $150, father's funeral $262.88; less life than at $533 (3.5691ms)
✔ expected result 4: young single: no life item, so every card shows no life plan (1.3163ms)
✔ default card is Essential; the chosen card fills life first in pass two, and a Tier 1 reorder still changes that (4.0867ms)
✔ an order saved under one card still works under another (completeOrder) (6.3547ms)
✔ the slider reaches every screen: budget card, insurance budget and the close move together (8.016ms)
✔ guard 23: insurance allocated is never above the cap in use (the slider, else the recommended figure) (6310.1841ms)
✔ guard 24: no funded ladder item breaks its product's issue ages (rated age) (886.1551ms)
✔ guard 24 fixture: a client of rated age 66 gets whole life to the ruin level, not term (2.7992ms)
✔ guard 25: the close screen's life package is the ladder's life allocation, to the cent (1186.3942ms)
✔ expected result, family: cap $533.13; term $238.83 and CI $294.30; the funerals and disability income wait (4.5951ms)
✔ expected result, young single: cap $280.61; CI $280.61; disability income, car loan cover (Tier 2) and home loan cover (Tier 3) wait (2.5071ms)
✔ Change 3: no ruin-level life cover without dependants; parent care paid by the client counts as a dependant (4.1381ms)
✔ Change 4: loan cover follows each loan goal; whole life when term cannot be issued at the goal date (833.5725ms)
✔ gap is need minus in-force cover (38.461ms)
✔ at 70 the group cover is gone and the gap widens — and we say so (0.9018ms)
✔ over-insured households have a zero gap, never negative (0.3015ms)
✔ deterministic (0.6332ms)
✔ the Gap carries the needs engine's caveats forward — a client never sees a number without its uncertainty (1.7309ms)
✔ a group critical-illness rider creates no phantom reduction below the reduction age (1.3674ms)
✔ the group-life parameters reach provenance, with their carrier caveat (0.8723ms)
✔ a client with no group cover gets no group-life parameters in their trail (0.3776ms)
✔ an annuity is not death cover either (0.485ms)
✔ group cover is half-counted between the reduction and termination ages (1.1752ms)
✔ golden: death needs match the frozen hand-computed case (23.1408ms)
✔ golden: the gap at 40 and at 70 — group cover vanishes (1.9109ms)
✔ golden: the retirement floor and the SCP offset (1.4913ms)
✔ golden: every result carries provenance a regulator could read (3.6603ms)
✔ goldens are pinned to assumption set ff-2026-10-28-s3 (1.8374ms)
✔ death scenario sentences, both samples (pinned 27 Oct 2026, one-allocator fix; re-baselined in fix run 3) (179.6453ms)
✔ §2.8 sample family (31.5728ms)
✔ §2.8 sample young single (age 24, $8,000 gross, renting) (5.5083ms)
✔ care graph §3 canonical case (household net $14,000) (2.1909ms)
✔ care graph §3 variant: Child B to the United Kingdom (2.4958ms)
✔ closing guard 1: the closing comparison reproduces the care graph goldens (upstream immutability) (44.4817ms)
✔ ageAt computes age on a given date, not from a clock (3.8787ms)
✔ yearsToPayoff derives the debt decline schedule input (0.9046ms)
✔ debt totals split mortgage from the rest (0.6799ms)
✔ informal dependents are counted — the household is not assumed nuclear (1.1489ms)
✔ youngestDependentChild ignores non-children (0.7918ms)
✔ youngestDependentChild picks the younger of two children with the same whole-year age (0.7545ms)
✔ yearsUntilLastChildReaches drives income continuation (1.5359ms)
✔ obligationDeclineSchedule steps down as debts retire (0.7567ms)
✔ health score: family 33 'Needs work', young single 51 'Getting there' (prototype parts) (173.7509ms)
✔ insurance budget, young single: the ladder at the $281 recommended; CI only, three plans wait (47.8464ms)
✔ insurance budget, family: the ladder at the $533 recommended; the parents' funerals wait (61.5827ms)
✔ start early: prototype defaults ($500 a month, balanced 5%, 10 years' delay) (2.0506ms)
✔ loved ones: a grandchild aged 3 on $300 — Goldspoon and children's whole life at $150 each (3.5743ms)
✔ business: the prototype's default company (1.2723ms)
✔ goals, young single: house and car as the prototype (32.7695ms)
✔ debts, family: payoff months and interest as the prototype (23.8701ms)
✔ retirement, family: floor $5,500, gap $2,500, Destiny Registered (7.4568ms)
✔ death need cross-check: the Tatil standard formula as the prototype (9.362ms)
✔ liquidate-mortgage: the mortgage is cleared and no rent is replaced (33.1984ms)
✔ replace-rent: 120 months of rent, no mortgage liquidation (0.7024ms)
✔ both: mortgage liquidation and rent replacement are ADDITIVE (0.9695ms)
✔ none: no housing provision at all, even with a mortgage on file (0.7077ms)
✔ housing is never inferred from the mortgage balance (0.9576ms)
✔ a housing strategy with no matching data is caveated, not silently zeroed (0.7816ms)
✔ funeral cost defaults when the client gives no figure, but a stated figure wins (14.3981ms)
✔ medical cost is a FLOOR — a lower client estimate does not win (0.8708ms)
✔ income continuation runs until the last child reaches 21 (0.849ms)
✔ no children => no income continuation (0.8553ms)
✔ total need nets assets and never goes below zero (0.5492ms)
✔ NIS survivors' benefit reduces the income-continuation need (0.5683ms)
✔ an UNSUPPLIED survivors' benefit is caveated — silence would overstate the need (0.3115ms)
✔ an EXPLICIT nil survivors' benefit is a finding, not an omission (0.2263ms)
✔ provenance records the T&T conventions used and contains no estate-tax driver (0.3667ms)
✔ rental_income_months is recorded only when it actually multiplies into the total (0.4855ms)
✔ deterministic — identical inputs give byte-identical output (0.4698ms)
✔ no NIS entitlement: SCP alone pays 3,500 (27.9529ms)
✔ the SCP offset: a 3,000 NIS pension delivers only 2,000 net (1.1578ms)
✔ shortfall never goes negative (0.7718ms)
✔ increments are not silently applied — the caveat surfaces instead (0.8507ms)
✔ below SCP age, only NIS counts (0.8856ms)
✔ retiring before SCP age: the client is told WHY their SCP is zero (1.782ms)
✔ deterministic (0.9198ms)
✔ SCP cliff proximity is flagged — the engine must not step a client over silently (1.1931ms)
✔ crossing the 5,500 cliff zeroes SCP entirely (0.7779ms)
✔ the NIS deductible share is a 70% row with its IRD source and date (2.6889ms)
✔ hand-worked PAYE: $8,000 a month, age 24, pays NIS (the young single) (61.7464ms)
✔ guard 21: the insurance budget's Protection rows equal the ladder's funded insurance items, to the cent (2692.5838ms)
✔ guard 22: no funded insurance item on the ladder is below its product minimum (1738.1731ms)
✔ Tier 1 default order: life, CI, parent funerals oldest first, disability income; own final expense for 50 and over (6.254ms)
✔ the sample family at the $533 recommended: what each Tier 1 item gets (2.6175ms)
✔ a reorder inside Tier 1 moves both screens: the father's funeral above critical illness (7.1731ms)
✔ parameters module is importable from the core (2.0577ms)
✔ the T&T conventions the needs formula depends on are present (0.3836ms)
✔ the current NIS benefit table is the 2016 schedule, not the stale 2008 one (0.394ms)
✔ lapsed policies contribute no cover (1.8954ms)
✔ below 66, group cover counts in full (0.3995ms)
✔ group cover halves at 66 (0.3663ms)
✔ group cover terminates at 70 — the protection gap (0.3522ms)
✔ group cover is still zero above 70 (0.3432ms)
✔ premiums and cash value sum only over in-force policies (0.5602ms)
✔ universalLifePolicies finds the X-ray's highest-value target (0.3755ms)
✔ valid sample facts pass (33.5991ms)
✔ guard 7: no free text on a parent (78.3722ms)
✔ guard 8: no health answer anywhere in a case (32.5018ms)
✔ guard 8: a scope row or a snapshot carrying a health answer fails the write (160.4426ms)
✔ guard 8: the engine's own outputs carry no health keys (47.9853ms)
✔ people are deduped by id only: duplicate person ids fail (1.6ms)
✔ §2.4: every product row carries source and asOf, with the signed figures (3.5907ms)
✔ guard 16: for every recommendation set, no funded plan is below its minimum premium (4374.2504ms)
✔ guard 17: the Disability Income Rider is only ever recommended on Cashbuilder II (596.4698ms)
✔ a core row read is recorded with its asOf, source and status (3.4255ms)
✔ a fact-finder result records core rows and root rows side by side (131.343ms)
✔ unverified rows have no value and the engine refuses to read them (3.3421ms)
✔ assumed figures are marked assumed (Section 2 risk 4) (1.1244ms)
✔ every core row has a source and an ISO asOf (4.9853ms)
✔ every core: path named in engine code resolves to a row (57.2229ms)
✔ resolveParameter reads a dotted path and returns node + value (3.9685ms)
✔ builder records every parameter used, with provenance (0.6864ms)
✔ using a STALE parameter throws — drift cannot enter silently (1.6453ms)
✔ caveats and rules are recorded in order and deduplicated (2.7841ms)
✔ build() output is stable — same calls, byte-identical JSON (0.6588ms)
✔ build() output cannot be mutated to corrupt the builder (0.6943ms)
✔ the parameter tables are frozen — no caller can corrupt the source of truth (0.3554ms)
✔ the core reads no clock and rolls no dice — determinism is auditability (63.9776ms)
✔ the core performs no I/O (12.7062ms)
✔ the core imports nothing from graphify-out/, research/ or tools/ (35.3611ms)
✔ the forbidden-import guard actually catches a violation (0.3893ms)
✔ only src/parameters/ and src/samples/ are exempt from the hard-coded-number guard (2.2452ms)
✔ no T&T parameter is hardcoded outside the parameters module (39.8841ms)
✔ the hardcoded-parameter guard actually catches a violation (0.4984ms)
✔ guard 6: the engine imports only itself and the root parameter table (70.4776ms)
✔ guard 6: the engine touches no network, storage, environment or UI (37.0122ms)
✔ guard 6 catches every probe the Phase 0a review found uncaught (1.8665ms)
✔ goldens: the two ApplyOn quotes, at both covers, to the cent (30.2756ms)
✔ the sample family's parent funerals use the quotes: minimum on $30,000 at the rated age (82.971ms)
✔ away from a quoted age the 5% a year factor applies, with its caveat (0.5791ms)
✔ eligibility is judged on the rated age: parent age 79 (rated 80) issues, 80 (rated 81) does not (29.312ms)
✔ the insured's sex: from the relationship for parents; male rate and a flag when it cannot be told (19.4161ms)
✔ one pricing function: only premiums.ts reads the Rest Assured II rate rows (45.1911ms)
✔ golden: the retirement working, sample family (§9) (92.2935ms)
✔ golden: a weekly-paid case, pay changes and two groups skipped (§2, §1.2, §5.2) (11.0045ms)
✔ golden: a rent case, the young single (§6.1, §9: rent never stops) (8.417ms)
✔ golden: payoff dates and a payoff-date mismatch (§7.2, §7.4) (36.0097ms)
✔ golden: a Make room default split, sample family, $500 freed from Food (§6.3) (14.3493ms)
✔ guard 28: frequency maths — weekly ×52/12, fortnightly ×26/12, twice a month ×2, monthly ×1, yearly ÷12 (135.1452ms)
✔ guard 28: a weekly-paid client's NIS is worked on the week's pay and equals the monthly sum (23.4546ms)
✔ guard 29: budget lines add to the totals the rest of the engine uses; debts and parent care are never counted twice (60.5338ms)
✔ guard 30: insurance is never below $200 except at stage 0, and stage 0 still has no plan (951.099ms)
✔ guard 31: Make room sends freed money in the §6.3 plan order (729.1655ms)
✔ guard 31: a custom split is validated — never more than freed; the rest is 'not yet given a job' (21.3722ms)
✔ guard 32: payoff months from balance, rate and payment; a payment that does not cover the interest never clears (6.3829ms)
✔ guard 33: the retirement figure is max(A, B) × (1 + i)^n, to the dollar (9.9052ms)
✔ §14.1: a version-1 case is upgraded on read and computes exactly as before (35.7974ms)
✔ §14.3: bad facts throw LifeCaseFactsError (11.732ms)
✔ §14.3: an insurance cap below $200, above max(ceiling, $200), or not finite throws (guard 27's range) (12.1748ms)
✔ §7.5 (closes F-16): a co-signed debt is a loan cover item for the co-signer's exposure, in Tier 2 (8.9067ms)
ℹ tests 178
ℹ suites 0
ℹ pass 178
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 13069.4439
```
