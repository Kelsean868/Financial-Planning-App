# RUN 2026-10-27 — fact-finder engine (Phase 1)

Brief: `docs/briefs/2026-10-27-fact-finder-one-shot.md` ("Phase 1 — what done means"), on `docs/fact-finder-specs`.
Specs: Section 1, Section 2 (§2.3–2.5, §2.8, §2.10 fence 7, §2.11, §2.13), care graph brief, closing engine brief and
addendum §11–15, pension calculators audit. Design reference: `docs/prototype/fact-finder-prototype-v17.html`.
Model: Opus 5.5, effort high. Owner away: every decision is recorded here.
Worktree `C:\Projects\FPA-wt-engine`, branch `feat/fact-finder-engine` from `feat/domain-core` at `596cfea`.

## 1. Risks and conflicts, flagged before any change

Written after reading the specs and tracing the prototype's model, before the first engine file was written.

Prototype trace (scratch copy of `static model(s)` run under Node against its own `samples`, nothing copied into the
repo): every Section 2 §2.8 golden and every care graph §3 golden reproduces from the prototype's own arithmetic
(full-precision values in §6). So no golden needs a re-baseline to be reproducible; the risks below are about what
the engine must keep from the prototype to stay on those numbers.

| # | Risk or conflict | Decision |
|---|---|---|
| R1 | **NIS in PAYE.** The prototype deducts 100% of the employee's NIS from chargeable income. The root table (`parameters/tt-parameters.json` `income_tax.nis_deductible_portion`, 0.7, `VERIFIED_PRACTICE_UNCITED`) and the pension audit say 70%. At 70% the family ceiling becomes about $711 (golden $725) and the young single's about $374 (golden $376). | The goldens are signed and only the §14.1 re-baseline is allowed, so the engine reproduces the prototype: a core row `ff.tax.nisDeductibleShare = 1`, status `assumed`, whose caveat names the conflict and is carried on every budget's provenance. Open item O-1 for Kyron: confirm 70% and re-baseline §2.8, or keep. |
| R2 | **Guard 7 vs §1.5(d).** Guard 7 says "a string field on a parent fails", but §1.5(d) allows an optional first name and a relationship label, both strings. | A closed key list for parents: `personId` (UUIDv4), `relationship` (enum), `firstName` (optional, a name pattern; tightened during the run to one word, see D16), `nisContributions` (enum) are the only strings. Any other key, or any other string value, fails. |
| R3 | **Funded below minimum.** The prototype's `ibGroup` and loved-one split fund a lone remaining plan below its minimum (`x.short`). Guard 16 forbids any funded plan below its minimum. | The engine moves that plan to "not yet" with the amount needed (§2.3 module 4's own wording). Deliberate deviation from the prototype, not a golden. |
| R4 | **Levers.** The care graph brief names "defer a milestone"; the prototype's lever is "drop a milestone" and the brief gives no deferral amount. | The engine follows the prototype (the §3 top-lever golden comes from it). Follow-up F-1: define a deferral lever. |
| R5 | **§14.1 re-baseline.** Addendum §13 adds per-vehicle floors and an advisor-set planning rate. | The care graph's return is the advisor-set planning rate, defaulted at 5.0% in assumption set `ff-2026-10-27`; floors feed only the stress lines. The goldens do not move, so §14.1 is recorded as checked and not triggered (§7). |
| R6 | **Parent age.** The prototype stores parent age; Section 1 allows birth year only. | Facts carry `birthYear`; the engine derives age as `asOfYear − birthYear`, with `asOfYear` passed in (the engine reads no clock). Goldens use `asOfYear` 2026, mother 1960, father 1955. |
| R7 | **Health surcharge at 60+.** The prototype charges every earner; the root table exempts 60 and over. | The engine applies the exemption. No golden moves (clients 38 and 24). |
| R8 | **Line endings.** `core.autocrlf=true` on this PC; a CRLF checkout of the built file would not hash to the committed blob. | `.gitattributes` marks `core/dist/fpa-core.js -text`. |
| R9 | **Build tool.** No build exists; `tsc` cannot emit one ES-module file. | devDependency `esbuild` 0.28.2 (exact): correct scope-hoisted ESM bundling, JSON import attributes and `.ts` specifiers, which a hand-written concatenator would get wrong silently. Zero runtime dependencies; a test proves the built file reproduces the goldens and matches a fresh build byte for byte. |
| R10 | **"Your mother's care continues."** In the sample the mother's light top-up is fully offset by her SCP, so she has no care cost line. | As the prototype does: every parent with `careTier > 0` gets an obligation line; a fully offset one is met and renders the brief's sentence. |
| R11 | **Retirement (fence 7).** O8 forbids refactoring the July modules; the fact-finder does not capture NIS contributions or lifetime earnings, which `needs/retirement.ts` needs. | `needs/retirement.ts` is not edited. Public-service rules go into `core/src/parameters/retirement-2026-10.ts` and `core/src/needs/work-pension.ts`; the fact-finder retirement gap (`retirement-income.ts`) uses the prototype's NIS minimum pension when the client pays NIS. Follow-up F-2: fold into `needs/retirement.ts` when F1 lands. |
| R12 | **`CareGraphInputError` for "study start before current age"** rejects a child who is already at university. | Implemented as the signed brief says. Follow-up F-3. |
| R13 | **Health question.** The prototype asks whether the client has health cover. | Stored as `hasHealthCover: "yes" \| "no" \| "unknown"` (cover held, not health), per Section 2 §2.6. |
| R14 | **Premium band.** The prototype gives one rough figure; §2.5 asks for a band. | Band = estimate × (1 ± 0.15), the spread an `assumed` row; a band whose top is under the plan minimum returns the minimum, labelled "the minimum premium". |
| R15 | **Parent funeral cover in the death need.** Adding it to the client's obligation stack would move the cover goldens, and it is a policy on the parent's life. | Kept out of the death stack; it is a tier 1 ladder item and a closing recommendation (closing §5). |
| R16 | **Ladder.** The prototype's five `items` are a simplification of addendum §11 (no tier 0, no CI or parent funeral in tier 1). | The engine implements §11 as signed. Its allocation therefore differs from the prototype's `items`; no golden depends on them. |

## 2. Outcome

Phase 1 is done: the ten modules, the product table, the goldens, the guards (each sabotage-tested), the exported
result types and `LifeCaseFacts`, and one built ES-module file. No hard stop was hit. No golden needed a
re-baseline (§7). 130 tests pass, typecheck is clean, `parameters/verify.mjs` prints `ALL CHECKS PASSED`
(root `parameters/`, `calculators/`, `research/` untouched).

| Deliverable | Where |
|---|---|
| Ten modules (§2.3) | `core/src/household-budget.ts`, `debts.ts`, `goals.ts`, `insurance-budget.ts`, `health-score.ts`, `start-early.ts`, `care-graph.ts`, `closing.ts` (+ `closing-ladder.ts`, `scope.ts`, `annuity-routing.ts`, `death-need.ts`, `retirement-income.ts`, `needs/work-pension.ts`), `loved-ones.ts`, `business.ts`; one call for the page: `fact-finder.ts` |
| `LifeCaseFacts` and validation | `core/src/life-case-facts.ts`; errors in `core/src/errors.ts` |
| Product table (§2.4) | `core/src/parameters/tatil-products-2026-10.ts` |
| Parameter layer (F3) | `core/src/parameters/` (`row.ts`, `fact-finder-2026-10.ts`, `retirement-2026-10.ts`, `index.ts`); `core/src/provenance.ts` resolves `core:` paths |
| Samples (fixtures) | `core/src/samples/index.ts` (exported: the page loads them for the smoke walk) |
| Purity guard (F2) | `core/test/purity.test.ts` (extended) |
| Build (F4) | `npm run build` → `core/dist/fpa-core.js` (committed), `core/scripts/build.mjs`, `.gitattributes` |
| Tests | `core/test/goldens-fact-finder.test.ts`, `care-graph-guards.test.ts`, `closing-guards.test.ts`, `privacy-guards.test.ts`, `products.test.ts`, `provenance-core.test.ts`, `modules-parity.test.ts`, `dist.test.ts` |

**Built file:** `core/dist/fpa-core.js`, 180,992 bytes, SHA-256
`0fcef96c4b17b45a2179a68e526a430afa7781fd0860f90b7a199ddb38cddd97`. Checked on a fresh CRLF checkout (scratch
worktree, `npm ci`): the checked-out file hashes the same and a rebuild from CRLF sources is byte-identical.

## 3. Decisions made during the run (owner away)

| # | Decision | Why |
|---|---|---|
| D1 | Row statuses: `verified`, `rule` (a Kyron decision in a signed spec), `assumed`, `estimate`, `advisor-set`, `unverified`. Statutory values the root table already holds (allowance, PAYE bands, deduction cap, NIS ceiling, NIS minimum pension, surcharge rates, SCP age, group life ages, medical floor, annuity windows) are read from root `parameters/`, not copied. | One source per fact; §2.4 asks for source and date on every row. |
| D2 | `ProvenanceBuilder.resolveParameter` resolves `core:<table>.<path>`; `asOf` is recorded as the entry's `effective`; an `unverified` row throws `ParameterError`; a row's `caveat` is added to the result's caveats; `num()` and `get()` helpers. The July call sites are unchanged. | F3, additive; F1 (the July modules) stays a follow-up per O8. |
| D3 | The hard-coded-number guard now exempts `src/parameters/` and `src/samples/` only (a test pins that list). | These directories are where numbers live. |
| D4 | Guard 6 is an import allowlist (only `core/src` and `parameters/tt-parameters.js`) plus code probes for network, storage, `process`, dynamic import, `require` and browser globals. It caught a local variable named `window` in `annuity-routing.ts`, renamed. | F2; an allowlist catches import kinds nobody listed. |
| D5 | The prototype samples are exported from core as `LifeCaseFacts` with fixed UUIDv4 ids. | Phase 2's smoke walk and the dist test use the same fixtures. |
| D6 | Premium estimates are age-adjusted everywhere. The prototype used its flat base rate at the close and in its ladder; at age 38 (the family) the two are identical. | A 24-year-old priced at a 38-year-old's rate is wrong. |
| D7 | Parents' Rest Assured II in the insurance budget is priced at the eldest eligible parent's age, not the client's. Family protection split moves from the prototype's term $260 / CI $211 / RA $72 to $152 / $151 / $241 (minimum $240 at 71). | The premium depends on the person insured. Open item O-2. |
| D8 | The life basket: the permanent part is at least the Whole Life minimum cover ($65,000); each part pays at least its plan minimum; the sum of band tops stays under the stage ceiling (guard 3); over it, the permanent part goes first, then cover reduces; below the Term minimum it is "not yet". | The prototype priced the funeral ($50,000) as whole life, under that plan's minimum cover. |
| D9 | Ladder (§11): tier 1 insurance and the tier 3 "life beyond the ruin level" share the stage ceiling; tier 1 life = the essential (ruin) premium; the §11.3 token annuity is the Destiny minimum ($200) when registered is permitted and a gap exists; compulsory motor third-party is listed as a precondition not captured. | §11.2 "tier 1 funds the ruin gap, not the full gap"; "token" read as the plan minimum. |
| D10 | Parent funeral cover: advisor-set cost $50,000 inflated at the care basket rate to the end of the parent's care stream (age 88 or the horizon); $7,500 grant held flat and only on `yes`; `unknown` applies nothing and raises a flag; Rest Assured II is the default (with grading), Platinum Edge is shown as the alternative (open item 5.3a blocks it as default). | Closing §5.2–5.3. |
| D11 | Sentences: the brief's templates verbatim where it gives one (death head, met/failed care and degree, unknown input, parent funeral, Adventurer); the prototype's wording for the other lines. Money is formatted without ICU. | Guard 4: byte-identical on every platform. |
| D12 | "Runs out in month N" is computed within the first short year from the capital left, not rounded to the year. | The template says month. |
| D13 | Critical illness: cover = 10 × gross a year less CI held, between the Life Span Gold minimum and maximum; met when savings plus the lump reach that need. | CI = 10 × income (care graph fence 1). |
| D14 | Registered hard block: gross a year at or under the personal allowance → no registered routing; `requireRegistered` throws `RegisteredRoutingError`. | §12.3 "the engine refuses, it does not warn". |
| D15 | The floor-stress sentence uses Destiny Explorer (1%), the brief's example; all three floors are in the data. | Addendum §13 example. |
| D16 | A parent's (and loved one's) `firstName` is one word, at most 20 characters. | A space lets a sentence in (R2). |
| D17 | `LifeCaseFacts`, `validateLifeCaseFacts` (throws `LifeCaseFactsError` listing every problem) and `assertNoHealthKeys` live in core; the portal's store wraps the error in `LifeCaseStoreError`. Person ids must be UUIDv4 and unique. | Section 1 §1.1 puts validation at the JS/TS seam; one implementation. |
| D18 | `esbuild` 0.28.2 (published 8 Aug 2026), exact pin, devDependency only; the build is deterministic (no timestamp or path); the dist is committed and marked `-text`. | R8, R9. |
| D19 | Guard 5's test first re-applied levers through the engine's own `applyLever`; the sabotage run showed a wrong lever agreed with itself. The test now applies each lever's named change by hand and compares. | Found by sabotage (§5). |
| D20 | F10 (unquoted test glob) left as is: all new tests are flat in `core/test/`. | O8: follow-up, not Phase 1. |

## 4. Exported API for Phase 2 (the JS/TS seam)

Everything below is exported from `core/src/index.ts` and from `core/dist/fpa-core.js` (the dist test checks the
two export lists are equal). Every result carries a frozen `provenance` (parameters read, caveats, rules fired).

| Export | Signature (one line) |
|---|---|
| `computeFactFinder` | `(facts: unknown, opts?: { savePct?, package?: "essential"\|"recommended"\|"full", budgetMonthly?: number\|null, ladderOrder?: string[] }) => FactFinderResult` — validates, then runs every module |
| `FactFinderResult` | `{ assumptionSetId, facts, debts, careGraph, budget, buckets, deathNeed, retirement, goals, insuranceBudget, healthScore, closing, lovedOnes \| null, business \| null }` |
| `validateLifeCaseFacts` | `(input: unknown) => LifeCaseFacts` (throws `LifeCaseFactsError`) |
| `assertNoHealthKeys` / `findHealthKeys` | `(value, what) => void` / `(value) => string[]` |
| `LifeCaseFacts` and parts | `ClientFacts, PartnerFacts, ChildFacts, MilestoneFacts, ParentFacts, BudgetFacts, DebtFacts, GoalFacts, CoverFacts, WishFacts, WorkPensionFacts, LovedOnesFacts, BusinessFacts` |
| `computeNetPay` | `(facts) => NetPay` |
| `computeHouseholdBudget` | `({ facts, netPay, debts: DebtSummary, carePaidMonthly }) => HouseholdBudget` (stage, ceiling, band floor/recommended/ceiling) |
| `buildBudgetBuckets` | `(budget, facts, savePct?) => BudgetBuckets` |
| `computeDebts` / `carLoan` | `(items, extraMonthly) => DebtsResult` / `(b, CarLoanInput) => CarLoanResult` |
| `computeGoals` | `(facts, budget) => GoalsResult` |
| `computeInsuranceBudget` | `(facts, budget, buckets) => InsuranceBudgetResult` (two groups, each `funded[]` and `notYet[]`) |
| `computeHealthScore` | `({ budget, deathNeed, retirement, savings }) => HealthScore` |
| `computeStartEarly` | `({ age, monthly, returnKind: "bank"\|"balanced"\|"growth", delayYears, paysTax }) => StartEarlyResult` |
| `careGraph` / `careGraphInputFromFacts` / `applyLever` | `(input, householdNetMonthly?) => CareGraphResult` / `(facts) => CareGraphInput` / `(input, lever) => CareGraphInput` |
| `computeDeathNeed` / `survivorCashflow` | `(ctx) => DeathNeedResult` / `(b, facts, living, usePartner, useNis, capital) => SurvivorCashflow` |
| `computeRetirementIncome` | `(facts, netPay) => RetirementIncome` |
| `routeAnnuity` / `requireRegistered` / `registeredWithdrawalGrossUp` / `vehicleFigures` / `stressAgainstFloor` | §12–13 |
| `computeClosing` | `(ctx: ClosingContext, opts?: ClosingOptions) => ClosingComparison` (throws `ClosingInputError`) |
| `requestReorder` / `allocateLadder` | `(specs, order, itemKey, toIndex, recordedAt) => { order, declined: ScopeRow[] }` / `(budget, specs, order?) => Ladder` |
| `scopeRow` / `buildScopeStatement` / `buildSnapshot` | `(gapKey, state, recordedAt, note?) => ScopeRow` / `(gaps, rows) => ScopeStatement` / `({ closing, scope, assumptionSetId, engineVersion }) => LifeCaseSnapshot` |
| `computeLovedOnes` / `computeBusiness` | `(LovedOnesFacts) => LovedOnesResult` / `(BusinessFacts) => BusinessResult` |
| `roughBand`, `fitToMinimums`, `money` | helpers (band labels are `"rough"` or `"the minimum premium"`) |
| Tables | `TATIL_PRODUCTS`, `TATIL_RIDERS`, `RETURN_VEHICLES`, `REST_ASSURED_GRADING`, `CORE_TABLES`, `coreRowPaths`, `ASSUMPTION_SET_ID` (`ff-2026-10-27`) |
| Samples | `SAMPLE_FAMILY`, `SAMPLE_YOUNG_SINGLE`, `SAMPLE_LOVED_ONE`, `SAMPLE_BUSINESS`, `CARE_GRAPH_FIXTURE_NET_MONTHLY`, `withChildBInUK` |
| Errors | `CareGraphInputError`, `ClosingInputError`, `LifeCaseFactsError`, `RegisteredRoutingError` |
| July API | unchanged (`computeGap`, `computeDeathNeeds`, `computeRetirementNeeds`, `ProvenanceBuilder`, …) |

**How the page computes what the close shows** (from one `r = computeFactFinder(facts, opts)`):

- **Five reveal layers:** `r.closing.layers[0..4]` are layers 1–5 (`LAYER_NAMES`: what they need, partner's income,
  NIS survivors, cover in force, your plan). Each has `lines[]` (obligation, amount, paid, met, sentence, note),
  `notes[]` (what the layer added), `survivor.rows[]` (the bar chart) and `outcome` (a `ScenarioOutcome`). The page
  advances `layer` on a click and reads the next element; nothing is recomputed.
- **Four scenarios, two states:** `r.closing.scenarios.death | criticalIllness | liveLong | legacy`, each
  `{ today, plan }` of `ScenarioOutcome = { lumpAvailable, monthlyAvailable, monthsUntilShortfall, obligationsMet[],
  obligationsFailed[], sentences[], unknowns[] }`. Death today = layer 4, death with plan = layer 5.
  `criticalIllness.coverSuggested` is the Life Span Gold amount. A non-empty `unknowns` renders
  `UNKNOWN_SENTENCE`, never $0.
- **Insurance budget:** `r.insuranceBudget.groups` = `[Protection, Savings plans]`; each `funded[]` (name, product,
  riders with `underwriting`, monthly, minimum, `atMinimum`, rough cover, disclosure, label) and `notYet[]`
  (name, product, riders, `needsMonthly`), plus the note text.
- **Premium bands:** the triage band is `r.budget.band` (floor/recommended/ceiling of `ceilingMonthly`). At the close,
  `r.closing.bands[]` gives each band's monthly amount, the cover it buys and which obligations it covers and does
  not. The proposed plan is `r.closing.chosen.basket` (items with a `band` labelled `"rough"` or
  `"the minimum premium"`, total, `partial`, `notCovered`, `notYet`). Pick a package with `opts.package`, or a
  client amount with `opts.budgetMonthly`, and call again.
- **Scope and snapshot:** `r.closing.gaps` → `buildScopeStatement(gaps, rows)`; at "start the application",
  `buildSnapshot({ closing: r.closing, scope, assumptionSetId: r.assumptionSetId, engineVersion: PINNED })`.

## 5. Sabotage log

Run by a scratch script (not in the repo): each break applied, the named test file run, the first failure
message copied, the original bytes restored, and `git status --porcelain -- <file>` checked empty. 36 breaks;
every one made its guard fail; every file was restored clean. The first run's "Care graph 5" row did **not**
fail (D19); the test was fixed and committed (`1ad98ee`) and the whole log re-run; this is the second run.

| Guard | File broken | Result | First failure message | After |
|---|---|---|---|---|
| Care graph 1 (no spot inflation) | src/care-graph.ts | 1 of 6 failed | "guard 1: no spot or current inflation is reachable from the engine": AssertionError [ERR_ASSERTION]: care-graph.ts names a spot/current inflation figure ("spotInflation") — inflation comes only from the assumption set's projected rates | restored, clean |
| Care graph 2 (goldens, engine code) | src/care-graph.ts | 3 of 6 failed | "§2.8 sample family": AssertionError [ERR_ASSERTION]: care save: produced 4282.3835646124, golden 3837 | restored, clean |
| Care graph 3 (current vs future split) | src/care-graph.ts | 1 of 6 failed | "guard 3: a goal starting within a year contributes nothing to monthly saving": AssertionError [ERR_ASSERTION]: 00000000-0000-4000-8000-000000000001:edu is a current line | restored, clean |
| Care graph 4 (sandwich detection) | src/care-graph.ts | 1 of 6 failed | "guard 4: non-overlapping child and parent windows report zero sandwich years": AssertionError [ERR_ASSERTION]: no year has both a child and a parent commitment | restored, clean |
| Care graph 5 (lever monotonicity) | src/care-graph.ts | 1 of 6 failed | "guard 5: applying a lever reduces monthly saving by the reported amount, within $1": AssertionError [ERR_ASSERTION]: Send Child B locally: the engine's change is the one the label names | restored, clean |
| Care graph 5 (lever misreports its value) | src/care-graph.ts | 1 of 6 failed | "guard 5: applying a lever reduces monthly saving by the reported amount, within $1": AssertionError [ERR_ASSERTION]: Send Child B locally: reported 12902.845845833413, real 12649.84886846413 | restored, clean |
| Closing 1 (upstream immutability) | src/death-need.ts | 2 of 6 failed | "§2.8 sample family": AssertionError [ERR_ASSERTION]: cover recommended: produced 2003844.8923962638, golden 1994846 | restored, clean |
| Closing 2 (no fabricated zero) | src/closing.ts | 1 of 14 failed | "guard 2: unknown cover renders differently from a confirmed $0": AssertionError [ERR_ASSERTION]: the uncaptured policy is named | restored, clean |
| Closing 3 (ceiling) | src/closing.ts | 1 of 14 failed | "guard 3: no basket and no ladder exceeds the triage stage ceiling": AssertionError [ERR_ASSERTION]: basket top 182.37499999999997 over ceiling 91.1875 (stage 2, {"package":"essential"}) | restored, clean |
| Closing 4 (template determinism) | src/closing.ts | 1 of 14 failed | "guard 4: identical inputs give byte-identical sentences": AssertionError [ERR_ASSERTION]: byte-identical | restored, clean |
| Closing 5 (scope completeness) | src/scope.ts | 1 of 14 failed | "guard 5: every gap is in exactly one state": AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: 3 !== 7 at TestContext.<anonymous> (file:///C:/Projects/FPA-wt-engine/core/test/closing-guards.test.ts:89:10) at Test.runInAsyncScope (node:asyn | restored, clean |
| Closing 6 (graded-benefit disclosure) | src/parameters/tatil-products-2026-10.ts | 1 of 14 failed | "guard 6: Rest Assured II anywhere in a recommendation prints its grading": AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: + actual - expected + null - 'Rest Assured II has a graded death benefit: in year one it returns the premiums paid | restored, clean |
| Closing 7 (funeral grant eligibility) | src/closing.ts | 1 of 14 failed | "guard 7: the $7,500 funeral grant only where 25+ contributions are affirmatively captured": AssertionError [ERR_ASSERTION]: unknown: nothing applied | restored, clean |
| Closing 8 (registered eligibility) | src/annuity-routing.ts | 1 of 14 failed | "guard 8: registered needs all three §12.3 conditions": AssertionError [ERR_ASSERTION]: no headroom | restored, clean |
| Closing 9 (low-earner hard block) | src/annuity-routing.ts | 1 of 14 failed | "guard 9: zero registered routings below the personal allowance (a hard block)": AssertionError [ERR_ASSERTION]: gross 0: registered routed below the allowance | restored, clean |
| Closing 10 (gross-up) | src/annuity-routing.ts | 1 of 14 failed | "guard 10: a registered withdrawal before maturity grosses up need / 0.75": AssertionError [ERR_ASSERTION]: need 1 | restored, clean |
| Closing 11 (no projected rate) | src/parameters/tatil-products-2026-10.ts | 1 of 14 failed | "guard 11: no rate above a vehicle's floor in the vehicle tables": AssertionError [ERR_ASSERTION]: vehicle destiny-explorer holds projectedReturn = 0.06, above its floor 0.01: no projected return in a vehicle table | restored, clean |
| Closing 12 (cross-tier reorder) | src/closing-ladder.ts | 1 of 14 failed | "guard 12: a cross-tier reorder writes a declined record and leaves the order unchanged": AssertionError [ERR_ASSERTION]: order unchanged | restored, clean |
| S1 guard 6: bare fs | src/debts.ts | 1 of 10 failed | "guard 6: the engine imports only itself and the root parameter table": AssertionError [ERR_ASSERTION]: C:\Projects\FPA-wt-engine\core\src\debts.ts imports the file system ("fs") — core/ is pure: no I/O, no UI, no runtime dependencies | restored, clean |
| S1 guard 6: node:fs/promises | src/debts.ts | 1 of 10 failed | "guard 6: the engine imports only itself and the root parameter table": AssertionError [ERR_ASSERTION]: C:\Projects\FPA-wt-engine\core\src\debts.ts imports the file system ("node:fs/promises") — core/ is pure: no I/O, no UI, no runtime dependencies | restored, clean |
| S1 guard 6: Supabase | src/debts.ts | 1 of 10 failed | "guard 6: the engine imports only itself and the root parameter table": AssertionError [ERR_ASSERTION]: C:\Projects\FPA-wt-engine\core\src\debts.ts imports a Supabase client ("@supabase/supabase-js") — core/ is pure: no I/O, no UI, no runtime dependencies | restored, clean |
| S1 guard 6: portal file | src/debts.ts | 1 of 10 failed | "guard 6: the engine imports only itself and the root parameter table": AssertionError [ERR_ASSERTION]: C:\Projects\FPA-wt-engine\core\src\debts.ts imports a portal file ("../../../General-Rater-Portal/life-shapes.js") — core/ is pure: no I/O, no UI, no runtim | restored, clean |
| S1 guard 6: side-effect import | src/debts.ts | 1 of 10 failed | "guard 6: the engine imports only itself and the root parameter table": AssertionError [ERR_ASSERTION]: C:\Projects\FPA-wt-engine\core\src\debts.ts imports a file outside core/src and parameters/tt-parameters.js ("../../research/x.js") — core/ is pure: no I/O, | restored, clean |
| S1 guard 6: dynamic import | src/debts.ts | 1 of 10 failed | "guard 6: the engine touches no network, storage, environment or UI": AssertionError [ERR_ASSERTION]: C:\Projects\FPA-wt-engine\core\src\debts.ts uses a dynamic import — core/ is pure | restored, clean |
| S1 guard 6: localStorage | src/debts.ts | 1 of 10 failed | "guard 6: the engine touches no network, storage, environment or UI": AssertionError [ERR_ASSERTION]: C:\Projects\FPA-wt-engine\core\src\debts.ts uses localStorage — core/ is pure | restored, clean |
| S1 guard 6: sessionStorage | src/debts.ts | 1 of 10 failed | "guard 6: the engine touches no network, storage, environment or UI": AssertionError [ERR_ASSERTION]: C:\Projects\FPA-wt-engine\core\src\debts.ts uses sessionStorage — core/ is pure | restored, clean |
| S1 guard 6: indexedDB | src/debts.ts | 1 of 10 failed | "guard 6: the engine touches no network, storage, environment or UI": AssertionError [ERR_ASSERTION]: C:\Projects\FPA-wt-engine\core\src\debts.ts uses indexedDB — core/ is pure | restored, clean |
| S1 guard 6: process.env | src/debts.ts | 1 of 10 failed | "guard 6: the engine touches no network, storage, environment or UI": AssertionError [ERR_ASSERTION]: C:\Projects\FPA-wt-engine\core\src\debts.ts uses process.env — core/ is pure | restored, clean |
| S1 guard 6: fetch reference | src/debts.ts | 1 of 10 failed | "guard 6: the engine touches no network, storage, environment or UI": AssertionError [ERR_ASSERTION]: C:\Projects\FPA-wt-engine\core\src\debts.ts uses the network (fetch) — core/ is pure | restored, clean |
| S1 guard 7 (no parent free text) | src/life-case-facts.ts | 1 of 6 failed | "guard 7: no free text on a parent": AssertionError [ERR_ASSERTION]: Missing expected exception (LifeCaseFactsError): a parent with an extra key of any kind must fail validation | restored, clean |
| S1 guard 8 (no health in a case) | src/life-case-facts.ts | 2 of 6 failed | "guard 8: no health answer anywhere in a case": AssertionError [ERR_ASSERTION]: Missing expected exception: a health key in the top level must fail | restored, clean |
| S2 guard 14 (goldens, parameter table) | src/parameters/fact-finder-2026-10.ts | 4 of 6 failed | "§2.8 sample family": AssertionError [ERR_ASSERTION]: care save: produced 3852.247946010094, golden 3837 | restored, clean |
| S2 guard 16 (minimum premiums) | src/insurance-budget.ts | 1 of 3 failed | "guard 16: for every recommendation set, no funded plan is below its minimum premium": AssertionError [ERR_ASSERTION]: Cashbuilder II with disability income rider funded at 170.76875000000004, below the table minimum 300 (age 22, gross 17000) | restored, clean |
| S2 guard 17 (rider, code) | src/insurance-budget.ts | 2 of 3 failed | "guard 16: for every recommendation set, no funded plan is below its minimum premium": Error: Disability Income Rider is not offered on whole-life; it is only on cashbuilder-ii | restored, clean |
| S2 guard 17 (rider, table) | src/parameters/tatil-products-2026-10.ts | 1 of 3 failed | "guard 17: the Disability Income Rider is only ever recommended on Cashbuilder II": AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal: + actual - expected [ 'cashbuilder-ii', +   'whole-life' | restored, clean |
| Dist current (stale build) | src/business.ts | 1 of 4 failed | "dist/fpa-core.js matches a fresh build of src byte for byte (run `npm run build` if not)": AssertionError [ERR_ASSERTION]: dist is stale: 180992 bytes committed, 180992 built | restored, clean |

## 6. Evidence paste-back: every §2.8 golden and every care graph §3 golden

Produced by the **built file** `core/dist/fpa-core.js` (imported directly), beside the signed figure. Assumption set
`ff-2026-10-27`; parents by birth year (mother 1960, father 1955, `asOfYear` 2026). The care graph §3 case uses
household net $14,000 (the brief's fixture).

| Set | Figure | Expected (signed) | Produced (full precision) | Produced (as signed) | Match |
|---|---|---|---|---|---|
| §2.8 family | stage | 2 | 2 | 2 | yes |
| §2.8 family | ceiling | $725 | 724.6125000000002 | 725 | yes |
| §2.8 family | care save | $3,837/mo | 3836.832922361326 | 3837 | yes |
| §2.8 family | already paying | $4,000/mo | 4000 | 4000 | yes |
| §2.8 family | care present value | $1,263,107 | 1263107.2588376082 | 1263107 | yes |
| §2.8 family | peak | $17,391 at 54 | 17391.466126908694 | 17391 at 54 | yes |
| §2.8 family | sandwich years | 8 | 8 | 8 | yes |
| §2.8 family | finish at | 55 | 55 | 55 | yes |
| §2.8 family | cover essential | $823,567 | 823566.766256042 | 823567 | yes |
| §2.8 family | cover recommended | $1,994,846 | 1994846.1357406415 | 1994846 | yes |
| §2.8 family | cover full | $2,236,674 | 2236674.0250936504 | 2236674 | yes |
| §2.8 family | needs | $15,140 | 15140 | 15140 | yes |
| §2.8 family | living | $6,700 | 6700 | 6700 | yes |
| §2.8 young single | stage | 1 | 1 | 1 | yes |
| §2.8 young single | ceiling | $376 | 375.76250000000005 | 376 | yes |
| §2.8 young single | care | none | 0 | none | yes |
| §2.8 young single | cover essential | $149,000 | 149000 | 149000 | yes |
| §2.8 young single | cover recommended | $149,000 | 149000 | 149000 | yes |
| §2.8 young single | cover full | $149,000 | 149000 | 149000 | yes |
| §2.8 young single | needs | $5,450 | 5450 | 5450 | yes |
| §2.8 young single | living | $5,300 | 5300 | 5300 | yes |
| care graph §3 | peak recurring load | $17,391/mo at 54 | 17391.466126908694 | 17391 at 54 | yes |
| care graph §3 | sandwich years | 8 | 8 | 8 | yes |
| care graph §3 | finish age | 55 | 55 | 55 | yes |
| care graph §3 | total care bill, nominal | $2,078,000 | 2078167.5911021903 | 2078000 | yes |
| care graph §3 | save from today | $3,837/mo | 3836.832922361326 | 3837 | yes |
| care graph §3 | already paying | $4,000/mo | 4000 | 4000 | yes |
| care graph §3 | if you die tomorrow | $1,263,000 | 1263107.2588376082 | 1263000 | yes |
| care graph §3 UK | peak recurring load | $50,753/mo | 50753.23539136213 | 50753 | yes |
| care graph §3 UK | sandwich years | 8 | 8 | 8 | yes |
| care graph §3 UK | total care bill, nominal | $3,406,000 | 3406011.777531116 | 3406000 | yes |
| care graph §3 UK | save from today | $16,487/mo | 16486.681790825456 | 16487 | yes |
| care graph §3 UK | if you die tomorrow | $2,161,000 | 2161420.0355303474 | 2161000 | yes |
| care graph §3 UK | top lever | send Child B locally, $12,650/mo | 12649.84886846413 | Send Child B locally, 12650 | yes |

The last row's label and amount match ("Send Child B locally", $12,650); the table generator only stumbled on
the comma. The prototype's own arithmetic gives the same full-precision values (scratch trace of `static model(s)`
before any engine code was written; for example family ceiling 724.6125000000002, care PV 1263107.2588376082,
UK save 16486.681790825456, top lever 12649.84886846413), and `goldens-fact-finder.test.ts` asserts both the
rounded golden and the prototype's value to 1e-6.

## 7. Re-baseline check (addendum §14.1)

Not triggered. The care graph's return is the advisor-set planning rate (`core:ff.rates.planningReturn`, 5.0%),
the same 5.0% the goldens were made at. Addendum §13's floors (Settler 2%, Explorer 1%, Adventurer 0%, Platinum Edge
2.5%) feed only the retirement stress lines, which no golden uses. Old value = new value for every golden in §6;
assumption set `ff-2026-10-27`.

## 8. Product table as it ended up (`core/src/parameters/tatil-products-2026-10.ts`, asOf 2026-10-27)

| Plan | Cover | Issue ages | Minimum a month | Riders | Status | Source |
|---|---|---|---|---|---|---|
| Term Life | $150,000 – $10,000,000 | to 65 | $150 | AD&D | rule | GRP `life-shapes.js`; Kyron 27 Oct 2026 |
| Whole Life | from $65,000 | — | $150 | AD&D | rule | as above |
| Endowment | from $55,000 | — | $150 | AD&D | rule | as above |
| Life Span Gold (CI) | $100,000 – $2,000,000 | — | $150 | none | rule | Kyron's rule; OIPA $50,000 not used |
| Goldspoon | $10,000 – $150,000 | 1–12 | $150 | none | verified | GRP `life-shapes.js` |
| Rest Assured II | $30,000 – $150,000 | to 80 | none | none; grading text printed | rule | Kyron 27 Oct 2026; Rest Assured 2024 spec |
| Cashbuilder II | from $10,000 | — | $300 | Disability Income (Medical at any amount), AD&D | rule | Kyron 27 Oct 2026 |
| Destiny (annuities) | n/a | — | $200 | none | rule | Kyron 27 Oct 2026 |
| Platinum Edge | single deposit $50,000 – $1,000,000 | — | n/a | none; grading unconfirmed (5.3a) | verified | GRP `life-products.js` |
| SPIA | single deposit $50,000 – $2,000,000 | 50+ | n/a | none; cannot be surrendered | verified | GRP `life-products.js` |

Riders: Disability Income Rider allowed on Cashbuilder II only (rule, Kyron 27 Oct 2026), `incomeProtection: true`;
AD&D allowed on Term, Whole Life, Endowment, Cashbuilder II, `incomeProtection: false` (pays on accident only).
Return floors (rule, addendum §13): Destiny Settler 2%, Explorer 1%, Adventurer 0% capital protected, Platinum
Edge 2.5%. Annuity levers (rule, closing §4.1): Destiny guaranteed 5/10/15 years, spousal 50/100%, lump at vesting
0/25%; SPIA spousal 50/60/66.67/100%.

Other rows: car loan 7.5% and 8–10 years `assumed`; new-car 100% financing `verified` (Republic Bank); used-car 20%
minimum deposit `assumed`; caregiver tiers and education routes `estimate`; all premium rates `estimate`; planning
rate `advisor-set`. `unverified` (value null, refused by the builder): 2027 NIS class table, SCP income bands for
$3,750, NIS early-pension reduction rate, public-service salary averaging, annuity conversion rates.

## 9. Test and typecheck output (one run, head `1ad98ee` plus this record)

`npm ci` in `core/` (plus `npm install --save-dev --save-exact esbuild@0.28.2`, D18). Node v24.15.0.

`npm run typecheck`:

```
> @tt-planning/core@0.1.0 typecheck
> tsc --noEmit
```

Exit 0, no diagnostics.

`npm test`:

```
> @tt-planning/core@0.1.0 test
> node --test test/**/*.test.ts

✔ guard 1: no spot or current inflation is reachable from the engine (225.0454ms)
✔ guard 1 catches a violation and stays quiet on prose (1.4645ms)
✔ guard 3: a goal starting within a year contributes nothing to monthly saving (103.86ms)
✔ guard 4: non-overlapping child and parent windows report zero sandwich years (1.4739ms)
✔ guard 5: applying a lever reduces monthly saving by the reported amount, within $1 (30.7637ms)
✔ §8: CareGraphInputError for an impossible timeline; never clamped (4.0461ms)
✔ guard 2: unknown cover renders differently from a confirmed $0 (343.2777ms)
✔ guard 3: no basket and no ladder exceeds the triage stage ceiling (1023.8756ms)
✔ guard 4: identical inputs give byte-identical sentences (37.0909ms)
✔ guard 5: every gap is in exactly one state (24.8054ms)
✔ guard 6: Rest Assured II anywhere in a recommendation prints its grading (39.9071ms)
✔ guard 7: the $7,500 funeral grant only where 25+ contributions are affirmatively captured (11.7821ms)
✔ guard 8: registered needs all three §12.3 conditions (1.0089ms)
✔ guard 9: zero registered routings below the personal allowance (a hard block) (24.0842ms)
✔ guard 10: a registered withdrawal before maturity grosses up need / 0.75 (1.7829ms)
✔ guard 11: no rate above a vehicle's floor in the vehicle tables (3.9763ms)
✔ guard 12: a cross-tier reorder writes a declined record and leaves the order unchanged (18.0745ms)
✔ §11.6 stage 0: the ladder returns no basket, only what would change the picture (7.3741ms)
✔ §8: ClosingInputError when an upstream engine did not run; never a default (6.7365ms)
✔ §2.5: a snapshot stores premium bands with their label, never a price (14.5311ms)
✔ dist/fpa-core.js matches a fresh build of src byte for byte (run `npm run build` if not) (677.486ms)
✔ dist is one self-contained ES module: no imports, no require, LF line endings (4.1558ms)
✔ dist exports the same public API as src/index.ts (21.5145ms)
✔ dist reproduces the §2.8 and care graph §3 goldens (212.5566ms)
✔ gap is need minus in-force cover (59.2711ms)
✔ at 70 the group cover is gone and the gap widens — and we say so (1.0736ms)
✔ over-insured households have a zero gap, never negative (0.6845ms)
✔ deterministic (1.683ms)
✔ the Gap carries the needs engine's caveats forward — a client never sees a number without its uncertainty (3.0505ms)
✔ a group critical-illness rider creates no phantom reduction below the reduction age (2.4884ms)
✔ the group-life parameters reach provenance, with their carrier caveat (1.4944ms)
✔ a client with no group cover gets no group-life parameters in their trail (1.2555ms)
✔ an annuity is not death cover either (1.1644ms)
✔ group cover is half-counted between the reduction and termination ages (2.7468ms)
✔ golden: death needs match the frozen hand-computed case (64.0684ms)
✔ golden: the gap at 40 and at 70 — group cover vanishes (2.5061ms)
✔ golden: the retirement floor and the SCP offset (6.508ms)
✔ golden: every result carries provenance a regulator could read (1.8988ms)
✔ goldens are pinned to assumption set ff-2026-10-27 (29.0833ms)
✔ §2.8 sample family (254.3531ms)
✔ §2.8 sample young single (age 24, $8,000 gross, renting) (11.6538ms)
✔ care graph §3 canonical case (household net $14,000) (4.5095ms)
✔ care graph §3 variant: Child B to the United Kingdom (4.3774ms)
✔ closing guard 1: the closing comparison reproduces the care graph goldens (upstream immutability) (14.9974ms)
✔ ageAt computes age on a given date, not from a clock (7.3899ms)
✔ yearsToPayoff derives the debt decline schedule input (0.8597ms)
✔ debt totals split mortgage from the rest (1.6642ms)
✔ informal dependents are counted — the household is not assumed nuclear (0.722ms)
✔ youngestDependentChild ignores non-children (0.9442ms)
✔ youngestDependentChild picks the younger of two children with the same whole-year age (1.0733ms)
✔ yearsUntilLastChildReaches drives income continuation (1.162ms)
✔ obligationDeclineSchedule steps down as debts retire (0.9883ms)
✔ health score: family 33 'Needs work', young single 51 'Getting there' (prototype parts) (211.6763ms)
✔ insurance budget, young single: as the prototype; Cashbuilder II with the rider waits as 'not yet' (10.5865ms)
✔ insurance budget, family: Rest Assured II is priced on the parent's age (run record D7) (8.2102ms)
✔ start early: prototype defaults ($500 a month, balanced 5%, 10 years' delay) (2.2086ms)
✔ loved ones: a grandchild aged 3 on $300 — Goldspoon and children's whole life at $150 each (3.5065ms)
✔ business: the prototype's default company (1.846ms)
✔ goals, young single: house and car as the prototype (12.8187ms)
✔ debts, family: payoff months and interest as the prototype (21.6437ms)
✔ retirement, family: floor $5,500, gap $2,500, Destiny Registered (34.707ms)
✔ death need cross-check: the Tatil standard formula as the prototype (39.2807ms)
✔ liquidate-mortgage: the mortgage is cleared and no rent is replaced (86.4432ms)
✔ replace-rent: 120 months of rent, no mortgage liquidation (1.9045ms)
✔ both: mortgage liquidation and rent replacement are ADDITIVE (25.5793ms)
✔ none: no housing provision at all, even with a mortgage on file (3.2126ms)
✔ housing is never inferred from the mortgage balance (2.4737ms)
✔ a housing strategy with no matching data is caveated, not silently zeroed (2.7929ms)
✔ funeral cost defaults when the client gives no figure, but a stated figure wins (3.3382ms)
✔ medical cost is a FLOOR — a lower client estimate does not win (4.5301ms)
✔ income continuation runs until the last child reaches 21 (3.19ms)
✔ no children => no income continuation (11.9675ms)
✔ total need nets assets and never goes below zero (2.172ms)
✔ NIS survivors' benefit reduces the income-continuation need (1.3256ms)
✔ an UNSUPPLIED survivors' benefit is caveated — silence would overstate the need (14.8349ms)
✔ an EXPLICIT nil survivors' benefit is a finding, not an omission (1.9104ms)
✔ provenance records the T&T conventions used and contains no estate-tax driver (5.1297ms)
✔ rental_income_months is recorded only when it actually multiplies into the total (1.5966ms)
✔ deterministic — identical inputs give byte-identical output (1.5909ms)
✔ no NIS entitlement: SCP alone pays 3,500 (83.881ms)
✔ the SCP offset: a 3,000 NIS pension delivers only 2,000 net (3.8997ms)
✔ shortfall never goes negative (2.8312ms)
✔ increments are not silently applied — the caveat surfaces instead (1.3419ms)
✔ below SCP age, only NIS counts (1.9554ms)
✔ retiring before SCP age: the client is told WHY their SCP is zero (2.5424ms)
✔ deterministic (21.3662ms)
✔ SCP cliff proximity is flagged — the engine must not step a client over silently (1.4668ms)
✔ crossing the 5,500 cliff zeroes SCP entirely (1.0069ms)
✔ parameters module is importable from the core (40.5663ms)
✔ the T&T conventions the needs formula depends on are present (0.7989ms)
✔ the current NIS benefit table is the 2016 schedule, not the stale 2008 one (3.5409ms)
✔ lapsed policies contribute no cover (14.0426ms)
✔ below 66, group cover counts in full (4.6687ms)
✔ group cover halves at 66 (0.5068ms)
✔ group cover terminates at 70 — the protection gap (0.6445ms)
✔ group cover is still zero above 70 (1.7603ms)
✔ premiums and cash value sum only over in-force policies (1.0505ms)
✔ universalLifePolicies finds the X-ray's highest-value target (0.5823ms)
✔ valid sample facts pass (10.2171ms)
✔ guard 7: no free text on a parent (8.5918ms)
✔ guard 8: no health answer anywhere in a case (4.5601ms)
✔ guard 8: a scope row or a snapshot carrying a health answer fails the write (244.627ms)
✔ guard 8: the engine's own outputs carry no health keys (24.13ms)
✔ people are deduped by id only: duplicate person ids fail (16.007ms)
✔ §2.4: every product row carries source and asOf, with the signed figures (10.0619ms)
✔ guard 16: for every recommendation set, no funded plan is below its minimum premium (3700.5218ms)
✔ guard 17: the Disability Income Rider is only ever recommended on Cashbuilder II (955.3604ms)
✔ a core row read is recorded with its asOf, source and status (35.3467ms)
✔ a fact-finder result records core rows and root rows side by side (155.5882ms)
✔ unverified rows have no value and the engine refuses to read them (5.2253ms)
✔ assumed figures are marked assumed (Section 2 risk 4) (1.2938ms)
✔ every core row has a source and an ISO asOf (3.5577ms)
✔ every core: path named in engine code resolves to a row (30.3936ms)
✔ resolveParameter reads a dotted path and returns node + value (6.0876ms)
✔ builder records every parameter used, with provenance (1.6304ms)
✔ using a STALE parameter throws — drift cannot enter silently (1.519ms)
✔ caveats and rules are recorded in order and deduplicated (2.6506ms)
✔ build() output is stable — same calls, byte-identical JSON (0.9368ms)
✔ build() output cannot be mutated to corrupt the builder (1.3414ms)
✔ the parameter tables are frozen — no caller can corrupt the source of truth (1.9229ms)
✔ the core reads no clock and rolls no dice — determinism is auditability (24.1831ms)
✔ the core performs no I/O (24.2795ms)
✔ the core imports nothing from graphify-out/, research/ or tools/ (25.5012ms)
✔ the forbidden-import guard actually catches a violation (2.0655ms)
✔ only src/parameters/ and src/samples/ are exempt from the hard-coded-number guard (4.257ms)
✔ no T&T parameter is hardcoded outside the parameters module (30.336ms)
✔ the hardcoded-parameter guard actually catches a violation (1.1277ms)
✔ guard 6: the engine imports only itself and the root parameter table (44.1481ms)
✔ guard 6: the engine touches no network, storage, environment or UI (48.6565ms)
✔ guard 6 catches every probe the Phase 0a review found uncaught (27.3285ms)
ℹ tests 130
ℹ suites 0
ℹ pass 130
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 7079.2709
```

## 10. Open items

| # | Item | For |
|---|---|---|
| O-1 | NIS in PAYE (R1): the engine deducts 100% of NIS to hold the goldens; the root table says 70%. At 70%: family household net $17,983.37, surplus $2,843.37, ceiling **$710.84** (golden $725); young single net $7,482.85, ceiling **$374.14** (golden $376). Confirm the rule; a change is a recorded re-baseline. | Kyron |
| O-2 | D7: parents' Rest Assured II priced at the parent's age moves the family protection split away from the prototype. Confirm. | Kyron |
| O-3 | Premium rates are the prototype's sample estimates (`estimate`); every figure is a rough band. Real rates come only from the portal's raters (Phase 2 lists which). | Phase 2 |
| O-4 | Open item 5.3a: whether Platinum Edge grades; it stays the alternative, not the default. | Kyron / Tatil |
| O-5 | F-1 a "defer a milestone" lever (R4); F-2 fold the fact-finder retirement into `needs/retirement.ts` when F1 lands (R11); F-3 a child already at university raises `CareGraphInputError` (R12). | follow-ups |
| O-6 | Stamp duty relief under $2M for first-time buyers is an `assumed` row, not checked against the Act. | Kyron |
| O-7 | The five `unverified` retirement rows (§8). | research |
| O-8 | Guard 15 (product parity with `life-shapes.js`) is the portal's (Phase 2); it reads `TATIL_PRODUCTS` from the vendored file. | Phase 2 |
| O-9 | Review findings F1 and F5–F13 remain as recorded (O8). | follow-ups |
| O-10 | Fence 6 stands: no legal or Tatil compliance sign-off is claimed for any sentence or template. | Kyron |
