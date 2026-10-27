> **Read first: overrides from Section 1 §1.6 and Section 2 (both signed 27 Oct 2026).** The target is NOT
> `life-guided.js`. Engine code goes in `Financial-Planning-App/core`; page code goes in General-Rater-Portal
> `fact-finder.html` / `fact-finder.js`. Fences 9.4 and 9.5 are replaced by Section 1 §1.10 and §1.1–1.5. Parents
> use `birthYear`, not age; `careTier` is an integer 0–4; no free text on a parent. `personId` is a device UUIDv4.
> `CareGraphResult` is exported from core. Section 1 guards 6–8 and 12–13 apply. Where this brief and Section 1 or
> Section 2 disagree, Sections 1 and 2 win. Lightly trimmed copy of the claude.ai Project brief, 27 Oct 2026;
> every rule, number, guard and seam is kept.

# CC Brief — Care Graph: holistic dependants in the guided life intake

Date: 2026-10-27
Target repo: `General-Rater-Portal`
Target file: `life-guided.js` (+ its thin layout pair)
Status: signed · corrections of 27 Oct 2026 applied (see `2026-10-27-prototype-findings.md`).

**This is v2 of an existing flow, not a new build.** `docs/briefs/2026-10-22-life-intake-spec.md`
already delivers six goal cards, the CFP method, CI = 10 x income, printed-and-editable
assumptions beside each figure, and a "Skip — I'd rather talk about it on the call" escape on
every money question. Nothing in that spec is being replaced. Everything below is additive and
fits the existing `goals[]` / `People[]` contract without a schema migration.

---

## 0. Sign-off checkpoint

| # | Decision | Chosen |
|---|---|---|
| 0.1 | Assumption source of record | Eleventh Actuarial Review of the NIS as of 30 June 2020 (ILO/NIBTT), with four named deviations (§4) |
| 0.2 | Dependants model | Extend `People[]` with a `relationship` discriminator; do **not** add a parallel array |
| 0.3 | Education model | A **support period**, not a lump sum — the parent funds the child *through* the degree |
| 0.4 | Premium presentation | Floor 50 / Recommended 75 / Ceiling 100, anchored at the ceiling (closes open item 9.3) |

---

## 1. What is being added

1. **Four new goal cards** — business start-up, wedding contribution, first home deposit,
   first vehicle. Same card shape as the existing six. Each carries `{on, atChildAge, amountToday}`.
2. **Elderly parents as dependants** — `People[]` gains `relationship: 'child' | 'parent' | 'other'`
   plus, for parents, `{careTier, careFromAge, receivesSCP}`.
3. **Education as a support period** — a child reading locally still eats at home. Local and
   regional routes add a monthly home-support line for the duration of study; overseas routes
   already carry maintenance inside the route cost.
4. **The premium band** — not a question to ask; a band to derive and show.
5. **Historical inflation projected forward** — the assumptions block gains the five rates in §4.
   No spot rate anywhere in the engine.
6. **A legacy goal** — what the client wants to leave behind, distinct from covering bills.

## 2. The care graph module

```
careGraph(state) -> { years[], goals[], peak, sandwichYears, finishAge, funding }
```

- `years[y]` carries `{age, eduMonthly, parentMonthly, lumps[], isSandwich}` for y = 0..horizon.
- A **sandwich year** is one in which at least one child commitment and at least one parent
  commitment are both live. Shade it; count it; name it on screen.
- Recurring commitments render as stacked bars; one-off lumps render as markers **above** the
  stack, never inside it.

### 2.1 The funding seam

Group costs into **goals**, then split by start year:

- `start <= 1` → a **current budget line**. Report it as money already leaving the account.
  Do **not** compute a sinking fund for it (that produces a ten-fold overstatement).
- `start > 1` → accumulate the goal's discounted value by the year it begins:
  `target = PV_today * (1+r)^start`, then level monthly `PMT` over `start` years.

Two output numbers, labelled as such:

- **Save from today** — the monthly standing order, future goals only.
- **If you die tomorrow** — PV of the whole graph, current and future.

### 2.2 The hardball, with a lever

Verdict bands on `load = (monthlySaving + currentCare) / netIncome`:

| load | verdict |
|---|---|
| <= 10% | Comfortable |
| <= 25% | Tight but real |
| <= 45% | Something has to give |
| > 45% | Not a savings problem |

Every verdict above 18% must be accompanied by the **single highest-value lever**, computed by
counterfactual: clone state, apply one change, re-run `careGraph`, report the monthly delta. Rank all
levers, show the top two. Levers: drop a child's cost level, move a child from an overseas route to
local, defer a milestone.

## 3. Golden numbers

> Client 38, horizon 35, household net $14,000/mo.
> Child A age 4, local, typical, starts 18.
> Child B age 11, local, typical, starts 18, wedding at 28 ($60,000), first vehicle at 22 ($60,000).
> Mother 66, light top-up, receives SCP, from 66. Father 71, help at home, no SCP, from 71.
> Assumptions: inflation 3.0, care basket 5.5, foreign tuition 4.0, return 5.0, SCP $3,750.

| Output | Golden |
|---|---|
| Peak recurring load | $17,391/mo at client age 54 |
| Sandwich years | 8 |
| Finish age | 55 |
| Total care bill, nominal | $2,078,000 |
| Save from today | $3,837/mo |
| Already paying | $4,000/mo |
| If you die tomorrow | $1,263,000 |

Variant — Child B to the United Kingdom, everything else held:

| Output | Golden |
|---|---|
| Peak recurring load | $50,753/mo |
| Sandwich years | 8 |
| Total care bill, nominal | $3,406,000 |
| Save from today | $16,487/mo |
| If you die tomorrow | $2,161,000 |
| Top lever | send Child B locally, worth $12,650/mo |

## 4. Assumptions block

| Assumption | Default | Source |
|---|---|---|
| General inflation | 3.0% | ILO ultimate for T&T, reached 2035. 10-year actual 2.15%, 30-year 4.66%. |
| Real wage growth | +1.25% | ILO base scenario. 2009–19 actual was negative — this assumes recovery. |
| Care & food basket | 5.5% | **Deviation, headline + 2.5 pts.** Food is T&T's main inflation driver (5.1% vs CPI 1.8%, June 2021). |
| Foreign tuition | 4.0% | **Deviation, no ILO equivalent.** FX- and host-fee-driven. |
| Medical trend | 7.0% | **Deviation, no ILO equivalent.** Regional ~10% overstates T&T. |
| Return on savings | 5.0% nominal | **Deviation, ILO less 0.25 pts.** Retail, not institutional. |
| Local tuition | 0% | GATE at enrolment. The "full" cost level models paying it yourself. |

Do not use a spot inflation rate anywhere. A forbidden-import grep enforces this (§7).

## 5. Reference data to encode

**Education routes** — annual cost in TTD today, lean / typical / full, with programme length.
Local 3yr 5,200 / 27,900 / 50,700 (child lives at home — add home support).
Regional 3yr 26,300 / 44,700 / 63,000. UK 3yr 290,000 / 373,300 / 456,700.
Canada 4yr 285,000 / 368,800 / 452,500. USA 4yr 365,000 / 402,500 / 440,000.
Home support while studying locally: $1,800/mo, inflated at the care basket rate.

**GATE** has a cliff, not a taper: nothing above $75,000/month household, tested at enrolment.

**Parent care tiers** — TTD/month today. No support 0; light top-up 1,500; help at home 4,000;
private residential 5,600; high-dependency 12,000.

**Offsets.** Senior Citizens' Pension $3,750/month (2027 Budget), age 65+. NIS plus SCP capped at
$5,500/month combined (Trinidad Guardian, 17 Oct 2026). Model as an offset capped at the care cost.
GAPP and the Home Help grant ($1,800/month up to six months) are **never** modelled as recurring.
T&T has no statutory long-term care benefit. Surface this as copy, not a calculation.

## 6. Two corrections

**6.1** NIS minimum retirement pension is $3,000/month at 750 contributions. Survivors' minimum is
$600 spouse plus $600 per child to age 19. Under 750 contributions: no pension, a one-time grant of
3 × contributions, minimum $3,000 (NIBTT).

**6.2** RestASSURED II carries a **graded death benefit** — year one returns premiums only, year two
the greater of 25% of the sum assured or premiums back, full benefit from year three. Accidental
death pays in full from day one. Print the grading wherever it is recommended.

## 7. Guards (each sabotage-tested before trusted)

1. **Forbidden-import grep** — no spot/current inflation constant reachable from the engine.
2. **Golden-number test** — both fixtures in §3, exact. Inverted acceptance gate.
3. **Current-vs-future split guard** — any goal with `start <= 1` contributes zero to `monthlySaving`.
4. **Sandwich-detection guard** — non-overlapping child and parent windows report zero sandwich years.
5. **Lever monotonicity guard** — applying the top lever reduces `monthlySaving` by the reported
   amount, within $1.

## 8. Merge, error and type seams

- **Dependant merge** — `People[]` keyed by stable `personId`; dedupe by id only, never by name.
- **Error type** — `CareGraphInputError` for an impossible timeline (study start before current age,
  care start before current age, horizon under 10). Fail loudly; never clamp silently.
- **JS/TS seam** — export `CareGraphResult`. No `any` crossing into the layout.
- **Privacy boundary** — the client form stops before ID numbers and bank details. Health History,
  Non-Medical Questionnaire and Agent Report are never collected. `healthFlag` / `healthNote` are
  owner-only: never in an email, never on the device. A parent's care tier is a cost input, not a
  health record.

## 9. Scope fences

1. No critical-illness interaction with the care graph. CI stays at 10 x income.
2. No disability income modelling.
3. No multi-currency display; no live FX.
4. (Replaced by Section 1 §1.10.)
5. (Replaced by Section 1 §1.1–1.5.)

## 10. Execution

- **Engine, maths and guards** — Opus 5.5, effort high.
- **Layout wiring, cards and copy** — Sonnet 5.5, effort medium.

Deliverables: smoke walk on the §3 canonical case; evidence paste-back of the §3 goldens; sabotage
log for the five guards; post-merge fill of `General-Rater-Portal/docs/briefs/2026-10-22-life-intake-spec.md`
(close 9.1 and 9.3, record the §6.2 defect).
