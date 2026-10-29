# Spec: real Tatil life rates inside the engine

Date: 29 Oct 2026 · Author: CC (Opus 5) · Brief: `docs/briefs/2026-10-28-real-life-rates-brief.md`
Status: **awaiting Kyron's sign-off (STOP A)**. No code is written until this is signed (CLAUDE.md rule 1).

## 1. End state

Every premium the fact-finder shows comes from Tatil's harvested rate book, through `core/`: the quick quote,
the insurance budget, the package cards, the closing ladder, cover-for-budget and the one-page plan. The SAMPLE
curves in `core:ff.premiumRates` stay, but only as the named fallback for a cell nobody harvested. The close can
no longer contradict the quick quote, because both read one table.

The run also fixes the age-60 crash (decision 9), which blocks every screen for a blank case at 60 and over.

## 2. Risks and conflicts, written before the code (rule 5)

**R1 — `smoker` on the client facts vs rule 8. Needs Kyron's word.**
The brief's decision 4 says smoker "is never written into this repo's data (rule 8)", and Part 2 then says to
read `facts.client.smoker`. Those pull apart. The portal has already decided it: its run record
`RUN-2026-10-28-life-rate-engine.md` §2 keeps it "as `facts.client.smoker` (true / false; absent until
answered), the same way `client.sex` and `client.longLived` are kept", and says the engine's
`validateLifeCaseFacts` accepts it.
**This spec follows the portal:** `smoker?: boolean` is an optional field on `ClientBase`, validated when
present, with the same kind of comment `hasHealthCover` already carries ("an underwriting rating input, not a
health answer"). Guard 8 is untouched: `HEALTH_KEY` is `/^health(flag|note)$/i`, and a snapshot is built from
the closing result, which never carries it. Rule 8 is read as: no smoker status in `parameters/`, in a golden,
in a fixture of a real person, or in any stored snapshot. Fixtures are synthetic people.
*If Kyron wants the stricter reading instead, the field moves to `FactFinderOptions.smoker` and
`validateLifeCaseFacts` gains a guard that rejects `client.smoker`. That is a one-line change to this spec and
about twenty lines of code. Say which at sign-off.*

**R2 — the sample fallback changes age basis, so some goldens move. Needs Kyron's word.**
Today the SAMPLE curve is read at the client's **actual** age in `closing.ts:255-256` and `:471`
(`ratePer1000(b, kind, age)`) but at the **rated** age in `closing.ts:498` and `:508`
(`premiumFor(b, id, cover, ratedAge(age))`). Two age bases for one curve. This spec puts everything on ANB
(`ratedAge(age)`), including the fallback, so one convention holds. Cases that fall back therefore move by one
age-year of growth (about +7% to +8% on the sample curve). Every such golden is listed old -> new at STOP B.

**R3 — Rest Assured II: the quoted anchors and the book disagree by about 1%.**
The two verified ApplyOn quotes (male rated 72, female rated 67, taxes and stamp duty included) sit outside the
book's harvested grid (ANB 20-70), and `issueAge.max` is 80. So ANB 71-80 keeps the anchor formula, and ANB
20-70 uses the book. At the seam, $30,000 male: ANB 70 from the book is **$241.06 a month**, the anchor formula
at rated age 70 is **$238.44 a month** — a 1.1% step. Accepted: both figures are labelled rough, and the four
verified anchor goldens must not move. Harvesting ANB 71-80 is fence F5.

**R4 — bands make cover-for-budget non-monotone, and the effect is large.**
Term, male, ANB 36, non-smoker: **$499,999 costs $262.23 a month** and **$500,000 costs $175.66 a month**. A
naive inversion returns the small answer. Decision 7's algorithm is written out in §5.6 for exactly this.

**R5 — a fee breaks every "cover per dollar" shortcut.**
`insurance-budget.ts:107-113` (`coverPerDollar` = `1000 / rate`), `closing.ts:564` and `closing.ts`'s
`lifeCoverFunded` (`ruin.allocated / lifeRate * 1000`) all assume premium is proportional to cover. With a $360
fee and bands it is not. Each becomes a call to `premiumFor` or `coverForPremium`. Any site missed here will
quietly show a cover that is out by the fee.

**R6 — whole life at $150 a month may not reach its own minimum cover.**
Whole life, male, ANB 36, non-smoker (rate interpolated 22.472): $150 a month buys about **$61,776**, under the
$65,000 minimum cover. `minimumFor` already takes the larger of the minimum premium and the cost of the minimum
cover, so the ladder is right; but `coverForPremium` must not report an un-issuable cover. §5.6 returns 0 with a
caveat there. Raising the whole-life minimum premium row is fence F6, not this run.

**R7 — the book's harvest dates are not all ISO dates.**
`term.harvested_on` is `"2024-09"`; `wholeLife.harvested_on` is
`"2026-10-28 (bands 2-3: 2024-09 sheets + 2026-10-28 probe)"`. The guard
"every core row has a source and an ISO asOf" (`provenance-core.test.ts`) requires `^\d{4}-\d{2}-\d{2}$`.
The import normalises `asOf` (§5.2) and keeps the book's exact string in the row's `source`.

**R8 — 846 cells enter `coreRowPaths()` and `dist/fpa-core.js`.**
`coreRowPaths()` grows by about 880 rows. No test asserts a count today, but every row must pass "has a source
and an ISO asOf". `dist/fpa-core.js` grows from 285,461 bytes by roughly 50-70 KB, so its sha256 changes and the
portal must re-vendor (the brief's appendix). `dist.test.ts` only requires dist to be fresh, so the rebuilt file
must be committed.

**R9 — rounding. The CI table rounds differently from the rest.**
The book's note says "CI modal comes from the unrounded yearly ... All within 1 cent of yearly x factor". This
spec uses one rule everywhere (§5.4): round the yearly to cents, then round the modal to cents, half to even,
exactly as `life-rates.js` does. Life Span Gold monthly figures may therefore differ from an OIPA illustration
by one cent. The Part 3 Life Span Gold parity case is an annual figure, so it is exact.

**R10 — the engine and the portal differ on purpose outside the grid.**
`life-rates.js` **refuses** ("no guessing past the data"). The engine must still return a figure for the plan, so
it falls back to the SAMPLE curve labelled `estimate` with the reason (decision 5). Parity is therefore claimed
only for cells inside the grid, and the portal's parity test (appendix) must use in-grid cases only.

**R11 — goldens will move (decision 10).** Rule 4's inverted gate does not apply to premium goldens this run.
It still applies to every golden with no premium in it: those must not move. Enforced by guard G6.

## 3. Source of truth

`C:\Projects\General-Rater-Portal\rates\life\life-rate-book.json` — schema 1, generated by
`scripts/build-life-rate-book.mjs`. Not edited from this repo. 846 rate cells across 6 products and 23 variants;
`fee_annual` 360; `modal` `{annual 1, semi 0.5125, quarterly 0.2585, monthly 0.0858}`; `ages` "ANB";
`oipa_age_offset` 1 (already applied when the book was built, so look up by ANB only); `missing` 147 entries;
`held_out` 34 real quotes kept out of the rate build; `conflicts` 0.

## 4. Decisions (as signed)

1. **Import, do not hand-copy.** `tools/import-life-rate-book.mjs <path to life-rate-book.json>` writes
   `core/src/parameters/tatil-life-rates-2026-10.ts`: one `row()` per harvested cell, status `"verified"`,
   source `"Tatil <ApplyOn|OIPA> illustration, harvested <date>"`, `asOf` = the harvest date. `missing` is
   carried as data. Re-running the script on a new book is the ONLY way rates change.
2. **Formula.** Yearly = band rate per $1,000 x cover / 1,000 + **$360 fee** (Rest Assured II: no fee).
   Monthly = yearly x **0.0858** (semi 0.5125, quarterly 0.2585). Bands: Whole Life and Endowment
   < $150,000 / $150,000-$499,999 / $500,000+; Term and Life Span Gold < $500,000 / $500,000+.
3. **Product per engine kind:** `term` = Term "Level convertible term to 65"; `whole-life` = Whole Life
   "Whole Life"; `ci` = Life Span Gold "to age 65"; **new `rest-assured`** = Rest Assured II
   "Payment to Age 100".
4. **Inputs.** `premiumFor` and `coverForPremium` take `{ sex, smoker }` as well as kind, cover and age. ANB is
   the existing `ratedAge(age)`. Sex unknown: male rates (the higher) with a caveat. Smoker unknown: non-smoker
   rates with the caveat "Non-smoker rates — ask if they smoke". Smoker is a rating input only (see R1).
5. **Between harvested ANBs:** straight line on the rate per $1,000. **Outside the grid or a `missing` cell:**
   the SAMPLE curve, status `"estimate"`, with the reason as a caveat. **Past the product's maximum issue age:**
   no premium at all (null) and "Not available at this age".
6. **Minimum premiums.** Term $1,748.25 a year = $150.00 a month (unchanged). Life Span Gold $1,800.00 a year =
   **$154.44 a month** (today 150 — wrong). Rest Assured II as today (none). The premium is raised to the
   minimum; the cover stays.
7. **`coverForPremium`** inverts per band and returns the largest cover that is inside its own band and within
   the budget (§5.6).
8. **The rough band stays.** `roughBand` and `bandSpread` are unchanged. Only the estimate inside it becomes real.
9. **The age 60+ crash** is fixed in the same run (§5.8).
10. **Goldens will move**, and every move is listed old -> new with its reason in the run record.

## 5. Seams (rule 6)

### 5.1 Files

| File | Change |
|---|---|
| `tools/import-life-rate-book.mjs` | new. Node script: reads the book, writes the parameter file. |
| `core/src/parameters/tatil-life-rates-2026-10.ts` | new, **generated — never hand-edited**. Header says so. |
| `core/src/parameters/index.ts` | registers `lifeRates: LIFE_RATES` in `CORE_TABLES`. |
| `core/src/life-rates.ts` | new, pure: band pick, cell lookup, interpolation, fallback, rounding. |
| `core/src/premiums.ts` | `RateKind` gains `"rest-assured"`; `premiumFor` and `coverForPremium` gain `Rating`; `ratePer1000` becomes the fallback-only sample rate. |
| `core/src/closing.ts` | the six premium sites in §5.7. |
| `core/src/insurance-budget.ts` | `coverPerDollar` -> `coverForPremium`; `minimumFor`; the two `roughBand` sites. |
| `core/src/goals.ts` | `premiumFor` gains the rating and moves to ANB. |
| `core/src/loved-ones.ts` | `restAssuredPremium` call unchanged in shape; rating threaded. |
| `core/src/life-case-facts.ts` | `smoker?: boolean` on `ClientBase` plus validation (R1). |
| `core/src/household-budget.ts` | the `needsRatio` guard. |
| `core/src/health-score.ts` | finite-score and label guards. |
| `core/src/parameters/tatil-products-2026-10.ts` | Life Span Gold `minPremiumMonthly` 150 -> 154.44, a rule row with its source. |
| `core/src/index.ts` | exports `premiumQuote` and the `Rating` type. |

The generated parameter file will be well over the 800-line soft ceiling. That is allowed: it is generated, and
the ECC rule exempts generated files. Its header states the exception and names the import script.

### 5.2 The generated table

```
core:lifeRates.meta.ages                      "ANB"
core:lifeRates.meta.feeAnnual                 360
core:lifeRates.meta.modal.annual|semi|quarterly|monthly
core:lifeRates.meta.bookSchema                1
core:lifeRates.meta.cellCount                 846
core:lifeRates.meta.checksum                  "<8 hex>"
core:lifeRates.meta.missing                   the book's `missing` list, verbatim
core:lifeRates.meta.heldOut                   the book's `held_out` list, verbatim (quotes, NOT rates)
core:lifeRates.products.<product>.name|feeAnnual|minPremiumAnnual|minCover|maxCover|harvestedOn|bands
core:lifeRates.products.<product>.variants.<slug>.name|maxIssueAnb
core:lifeRates.products.<product>.variants.<slug>.rates.<series>.<band>.<anb>   -> rate per $1,000 a year
```

- `<product>` is the book's own key: `term`, `wholeLife`, `endowment`, `restAssured`, `applyonCi`, `lifespanGold`.
- `<slug>` is the variant name in camelCase with every non-alphanumeric character dropped:
  `"Level convertible term to 65"` -> `levelConvertibleTermTo65`, `"Payment to Age 100"` -> `paymentToAge100`,
  `"to age 65"` -> `toAge65`, `"Whole Life"` -> `wholeLife`. Slugs carry no spaces, so every path matches the
  pattern the guard "every core: path named in engine code resolves to a row" uses.
- `<series>` is `"F-NS" | "F-S" | "M-NS" | "M-S"`. Rest Assured II has `"F-NS" | "M-NS"` only.
- `<band>` is `"1" | "2" | "3"`. `<anb>` is the ANB as a decimal string.
- **Status** is `"verified"` on every rate cell and on every figure copied from the book. `missing` and `heldOut`
  are `"verified"` too: they are what the book records, not an estimate.
- **`asOf`** is normalised to a full ISO date (R7): a bare `YYYY-MM` becomes `YYYY-MM-01`; a string that starts
  with `YYYY-MM-DD` is cut to that date. The book's exact string always goes into `source`, for example
  `"Tatil ApplyOn illustration, harvested 2024-09 (quotes_2024.csv)"`.
- **Source wording** per product: `term`, `wholeLife`, `endowment`, `restAssured` and `applyonCi` ->
  `"Tatil ApplyOn illustration, harvested <book string>"`; `lifespanGold` ->
  `"Tatil OIPA illustration, harvested <book string>"` (its source is `ci_grid.csv`, OIPA quotation date
  18 Apr 2026).
- **Checksum**: FNV-1a 32-bit, 8 lowercase hex digits, over the sorted, newline-joined lines
  `<product>|<slug>|<series>|<band>|<anb>|<String(rate)>`. Computed the same way by the import script and by the
  test, so a book that drifted cannot pass unnoticed.

### 5.3 Kinds

```ts
export type RateKind = "term" | "whole-life" | "ci" | "rest-assured";
```

| kind | product | variant | fee | min premium a year | bands | harvested grid |
|---|---|---|---|---|---|---|
| `term` | `term` | `levelConvertibleTermTo65` | 360 | 1748.25 | <500k / 500k+ | ANB 26-56 (band 1 F-NS: 46 and 56 only) |
| `whole-life` | `wholeLife` | `wholeLife` | 360 | none | <150k / 150k-499,999 / 500k+ | band 1 ANB 20-70; bands 2-3 ANB 25-55 |
| `ci` | `lifespanGold` | `toAge65` | 360 | 1800 | <500k / 500k+ | ANB 26-56 |
| `rest-assured` | `restAssured` | `paymentToAge100` | 0 | none | one band | ANB 20-70, by sex only |

### 5.4 The premium call

```ts
export interface Rating {
  /** Null when it cannot be told: male rates (the higher), with a caveat. */
  readonly sex: Sex | null;
  /** Null when not asked: non-smoker rates, with a caveat. */
  readonly smoker: boolean | null;
  /** Who, for the caveat. */
  readonly who: string;
}

export interface PremiumQuote {
  /** Null only when the rated age is past the product's maximum issue age. */
  readonly yearly: number | null;
  readonly monthly: number | null;
  readonly ratePer1000: number | null;
  readonly band: number | null;
  /** "verified" from the book; "estimate" from the SAMPLE fallback. */
  readonly basis: "verified" | "estimate";
  readonly minApplied: boolean;
  /** Why it is not available, or why it is a sample. Null when the book priced it. */
  readonly reason: string | null;
  /** The arithmetic, for the run record and the portal parity test. */
  readonly working: string;
}

export function premiumQuote(b: ProvenanceBuilder, kind: RateKind, cover: number, anb: number, rating: Rating): PremiumQuote;
/** The monthly figure, or null past the maximum issue age. Callers have already passed `canIssue`. */
export function premiumFor(b: ProvenanceBuilder, kind: RateKind, cover: number, anb: number, rating: Rating): number | null;
```

Order of operations, the same as `life-rates.js` so the cent matches:

1. Past the variant's `maxIssueAnb` -> `{ yearly: null, monthly: null, reason: "Not available at this age" }`
   and `b.rule(...)`. Term: from ANB 66.
2. Pick the band from the cover against the product's `bands`.
3. Series = `(sex ?? "male")` + `(smoker ? "S" : "NS")`, mapped to `F-NS`, `F-S`, `M-NS`, `M-S`. Rest Assured II
   has no smoker tables, so it uses `-NS` whatever the answer, with the line "Rest Assured II has no smoker
   rates: one rate for everyone."
4. Rate: the cell at that ANB, else a straight line between the two nearest harvested ANBs. A gap wider than 5
   years adds the caveat "Straight line across a N-year gap in the harvested ages: rougher than usual." No
   extrapolation, ever.
5. `yearly = cents(rate * cover / 1000 + fee)`.
6. Minimum: if the product has one and `yearly` is under it, `yearly = minPremiumAnnual`, `minApplied = true`,
   caveat "Below Tatil's minimum premium: raised to $X a year. The cover stays at $Y." (OIPA raises the cover
   instead; this engine does not — fence F2.)
7. `monthly = cents(yearly * 0.0858)`.
8. `cents(x)` is half-to-even on cents with a 1e-6 tolerance — the same function as `life-rates.js`, so the
   figures agree to the cent.

Caveats, each raised once per build, in the engine's own words:

- sex unknown: `"<who>: sex not known, so the rate is the male one (the higher)."`
- smoker not asked: `"Non-smoker rates — ask if they smoke."`
- a sample fallback: `"Sample rates, not Tatil's: <reason>."` for example
  `"Sample rates, not Tatil's: ANB 58 is outside the harvested ages (ANB 26-56)."`

### 5.5 The fallback

When the band, series or ANB is not in the book (an un-harvested cell, or an ANB outside that table's grid):

- `term`, `whole-life` and `ci` -> the SAMPLE curve exactly as today, at **ANB**:
  `monthly = cover * samplePer1000(kind, anb) / 1000`. No fee, no bands, `basis: "estimate"`.
- `rest-assured` -> **the quoted anchor formula** (`restAssuredPer1000`), not the SAMPLE curve, so the four
  verified ApplyOn goldens keep their figures. `basis: "estimate"` (the age factor is an estimate).
- The SAMPLE rows' `source` strings are re-labelled "SAMPLE ... fallback only, used when the harvested rate book
  has no cell". Their status stays `estimate`, so the guard "assumed figures are marked assumed" still passes
  unchanged.

### 5.6 `coverForPremium` with a fee and bands

```ts
export function coverForPremium(b, kind, monthly, anb, rating): number;
```

1. If the product has a minimum premium and `monthly` is under it (to the cent): return **0**, with the caveat
   "A budget of $X a month is under <product>'s minimum premium of $Y a month, so it buys no cover."
2. `yearly = monthly / modal.monthly`.
3. For every band of the product, with its rate at this ANB (interpolated; skipped when that cell is missing):
   `cover = (yearly - fee) / rate * 1000`, floored to whole dollars.
4. Keep a candidate only when all of these hold: it is inside **its own** band's `from..to`; it is at least the
   product's minimum cover; it is at most the product's maximum cover; and re-pricing it with `premiumFor` gives
   a monthly figure no more than half a cent above `monthly`.
5. Return the **largest** survivor. No survivor -> **0**, with the reason as a caveat: either "under the minimum
   premium", or "under <product>'s minimum cover of $Z; that needs about $W a month" (R6).
6. When the band lookup fell back to the SAMPLE curve, the inversion is the sample one
   (`monthly / samplePer1000 * 1000`), as today, with the fallback caveat.

Worked check (term, male, ANB 36, non-smoker, $200 a month): band 1 gives about $365,513 and band 2 about
$584,071. Both are inside their own bands, so the answer is **about $584,071**, not $365,513.

### 5.7 Caller changes

`closing.ts`

1. Drop the bare `TR`, `WL` and `ciRate`. `lifePremium(cover)` calls
   `premiumFor(b, lifeProduct, cover, ratedAge(age), own)`, then `Math.max(spec.minPremiumMonthly ?? 0, ...)`
   as today.
2. `ciMin` and `ciFull` call `premiumFor(b, "ci", cover, ratedAge(age), own)`.
3. `lifeCoverFunded`'s inversion `ruin.allocated / lifeRate * 1000` becomes
   `coverForPremium(b, kind, ruin.allocated, ratedAge(age), own)`, clamped to `[essential, target]` as now.
4. `buildBasket`'s `roughBand(b, cover * lifeRate / 1000, ...)` becomes
   `roughBand(b, premiumFor(b, kind, cover, ratedAge(age), own) ?? 0, ...)`.
5. `loanCover` and `cosignedCover` keep `premiumFor`, now with the rating and ANB.
6. Parent funeral cover and own final expense keep `restAssuredPremium`, which becomes a thin wrapper over
   `premiumFor(b, "rest-assured", cover, ratedAge(insured.age), { sex: insured.sex, smoker: null, who: insured.who })`.
   Its name, signature and callers do not change.

`insurance-budget.ts`

7. `coverPerDollar` is deleted. The `ProtectionPlan.cover` closures call `coverForPremium` with the kind and the
   rating. `cashbuilder` keeps its 70% share, applied to the **premium**:
   `coverForPremium(b, "whole-life", monthly * cashbuilderCoverShare, anb, rating)`. `endowment` and `none` are
   unchanged (no rate is involved).
8. `minimumFor` becomes `max(minPremiumMonthly, premiumFor(kind, spec.cover.min, anb, rating) ?? 0)`.
9. `fitGroup`'s `roughCover` uses the same closure, so a funded plan's cover and its premium agree.
10. `computeInsuranceBudget(facts, budget, buckets, closing)` gains a fifth argument
    `options: { smoker?: boolean | null } = {}`, and `computeFactFinder` passes `facts.client.smoker ?? null`.

`goals.ts`

11. `premiumFor(b, "term", loan, ratedAge(age + g.years), own)` — note the rating, and that the age basis moves
    to ANB (R2).

The rating for the client is `{ sex: facts.client.sex, smoker: facts.client.smoker ?? null, who: "You" }`. For a
parent it is `{ sex: parentSex(p), smoker: null, who: parentLabel(p) }`; for a loved one, their own sex when it
is known, else null. A parent's or a loved one's smoker status is never asked, so it is always null.

### 5.8 The age 60+ fix

- `household-budget.ts:164`: `const needsRatio = hhNet > 0 ? needs / hhNet : (needs > 0 ? Infinity : 0);`
- `health-score.ts`: `const safe = Number.isFinite(score) ? score : 0;` used for the label and returned as the
  score, and `const band = labels.find((l) => safe >= l.from) || labels[labels.length - 1];`
  (`labels[labels.length - 1]` is the `from: 0` "Needs work" row, so the fallback is never a surprise).

Every case that works today scores the same: those cases all take the `hhNet > 0` path.

## 6. Guards and tests (rule 3 — each one sabotage-tested, the failure message recorded)

| # | Guard | Where |
|---|---|---|
| G1 | The parameter file's cell count and checksum equal the book's, recomputed from the JSON at test time. | `core/test/life-rate-import.test.ts` |
| G2 | Every rate cell is `verified`, has an ISO `asOf`, and names "harvested" in its source. | same |
| G3 | No `missing` cell carries a value: for every `missing` entry, each listed ANB is absent from that series and band. | same |
| G4 | `held_out` quotes are not reachable as rates: no `rates` path resolves to a held-out figure. | same |
| G5 | Parity to the cent on the four held-out cases in §7. | `core/test/life-rates-parity.test.ts` |
| G6 | Goldens with no premium in them do not move (rule 4 still holds for those). | the existing golden tests |
| G7 | A blank case at ages 60, 65 and 70 computes without throwing. | `core/test/age-60-guard.test.ts` |
| G8 | Term at ANB 66 returns no premium and the reason "Not available at this age". | parity test |
| G9 | ANB 58 term falls back, `basis: "estimate"`, caveat naming ANB 26-56. | parity test |
| G10 | Sex unknown -> male rate plus caveat; smoker unknown -> non-smoker plus caveat; smoker true uses the `-S` table. | parity test |
| G11 | `coverForPremium` across the band edge returns the larger cover (R4, §5.6). | parity test |
| G12 | Interpolation: Rest Assured II, F, ANB 56, $125,000, Payment to Age 100 is within 1% of the held-out $5,788.75 a year. | parity test |
| G13 | Every `core:lifeRates` row passes the existing "source and ISO asOf" guard. | existing `provenance-core.test.ts` |

## 7. Parity cases (must be exact to the cent)

| Case | Band rate | Working | Expected |
|---|---|---|---|
| Term to 65, M, ANB 36, NS, $500,000, monthly | 3.374592 (band 2) | 1687.296 + 360 = 2047.30; x 0.0858 | **$175.66 a month** |
| Life Span Gold to 65, F, ANB 36, NS, $250,000, yearly | 10.867859 (band 1) | 2716.96475 + 360 | **$3,076.96 a year** |
| Whole Life, F, ANB 35, NS, $125,000, yearly | 20.49 (band 1) | 2561.25 + 360 | **$2,921.25 a year** |
| Life Span Gold, F, ANB 26, NS, $100,000, monthly | 8.527693 (band 1) | 1212.77 is under the $1,800 minimum -> 1800; x 0.0858 | **$154.44 a month**, cover stays $100,000 |
| Rest Assured II to 100, F, ANB 56, $125,000, yearly | 46.524 (line 55 -> 60) | 5815.50 against the held-out quote $5,788.75 | within 1% (+0.46%) |
| Term, M, ANB 36, NS, cover for $200 a month | both bands | band 1 about $365,513; band 2 about $584,071 | **the band 2 answer** |

## 8. Scope fences (rule 2 — each one a follow-up)

- **F1** No re-harvesting. Gaps stay sample-rate fallbacks until the rate book is rebuilt. The 147 `missing`
  entries stand, band 1 of Term F-NS (only ANB 46 and 56) among them.
- **F2** The minimum premium raises the premium, not the cover. OIPA raises the cover instead
  (`min_premium_raises_face: true` in the book). Matching OIPA is a later run.
- **F3** Riders are not priced. The book's `addons.adnd` ($1.70 per $1,000, capped at $500,000) is imported as
  data and used by nothing.
- **F4** Endowment, the Limited Pay variants, `applyonCi` and cash values are imported but no engine kind uses
  them. Cash values stay in the portal.
- **F5** Rest Assured II ANB 71-80 keeps the quoted-anchor formula (R3). Harvest that range to close it.
- **F6** The whole-life $150 a month minimum premium row may be under what its $65,000 minimum cover costs (R6).
  Not changed this run.
- **F7** `roughBand` and `bandSpread` (±15%) are untouched (decision 8).
- **F8** No change in General-Rater-Portal. The re-vendor is the brief's appendix: a separate session after
  Kyron merges.
- **F9** The one-cent CI modal difference (R9) is accepted; one rounding rule is used everywhere.

## 9. Stop points and deliverables

- **STOP A (now).** Kyron signs this spec and answers R1 (where `smoker` lives) and R2 (ANB everywhere, so
  fallback goldens move). No code until then.
- **Parts 1-2.** The import script, the generated table, the engine, the age-60 fix, the Life Span Gold minimum.
- **STOP B.** Deliverable B pasted back: the `npm test` summary, the §7 parity table filled in with actual
  figures, and every moved golden old -> new with one line of reason each. Kyron accepts the new goldens.
- **Part 4.** `npm run build`, commit `core/dist/fpa-core.js`, record its commit and sha256, write
  `docs/audit/RUN-2026-10-29-real-life-rates.md` (risks first), open the PR. **CC does not merge.**
