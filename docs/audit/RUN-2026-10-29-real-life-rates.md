# Run record: real Tatil life rates inside the engine

Date: 29 Oct 2026 · Branch `feat/real-life-rates` · Spec `docs/superpowers/specs/2026-10-29-real-life-rates-design.md`
Brief `docs/briefs/2026-10-28-real-life-rates-brief.md` · Model: Opus 5 (import script and nothing else on Sonnet 5.5)

Status: **done, waiting on Kyron's merge.** Kyron accepted the moved goldens, R3a included, at STOP B on
29 Oct 2026. PR: https://github.com/Kelsean868/Financial-Planning-App/pull/8 — CC does not merge and does not
deploy (rule 9).

## 1. Risks, written before the change (rule 5)

The eleven risks are in the spec, §2. Three were answered by Kyron at sign-off (28 Oct 2026):

- **R1** nicotine use stays on `facts.client.smoker`, the one health-related fact allowed in the case facts,
  used only to pick premium rates; never in a parameter table, never in a snapshot, fixtures synthetic.
- **R2** everything moves to age next birthday, so sample-fallback goldens move by about one age-year.
- **R6** whole life's $150 a month minimum may not reach its own $65,000 minimum cover: kept as fence F6.

One more was found while wiring the engine and is flagged here for acceptance:

- **R3a** Two of the four verified Rest Assured II goldens move. R3 claimed all four sat outside the
  harvested grid; only the male pair does (rated age 72, past ANB 70). The **female pair is at rated age 67,
  inside the grid** (ANB 65 and 70 are harvested), so the book now prices her by interpolation. The book wins
  inside the grid, because keeping a one-off anchor there would re-create the two-sources-of-truth problem
  this run exists to remove. The ApplyOn quote is kept as the accuracy check, and it is within 0.9%.

## 2. What changed

| File | What |
|---|---|
| `tools/import-life-rate-book.mjs` | new. Writes the parameter table from the rate book. Fails loudly on a slug collision, an unparseable harvest date or an unknown product. |
| `core/src/parameters/tatil-life-rates-2026-10.ts` | new, **generated**, 1,618 lines, 846 rate cells, checksum `c5b3e442`. |
| `core/src/parameters/rate-checksum.ts` | new, pure. One checksum implementation for the script and the test. |
| `core/src/life-rates.ts` | new. Bands, the $360 fee, the 0.0858 modal factor, interpolation, the fallbacks, the minimum premiums, the band inversion. |
| `core/src/premiums.ts` | `rest-assured` joins the rate kinds; `premiumFor` and `coverForPremium` take a rating and an ANB; the Rest Assured wrappers go through the book. |
| `core/src/closing.ts` | six premium sites now price through the book; the cover inversion no longer divides by a bare rate. |
| `core/src/insurance-budget.ts` | `coverPerDollar` deleted; `coverAt` and `premiumForCover` replace it; `minimumFor` takes a rating. |
| `core/src/goals.ts` | loan cover priced at ANB with the client's rating. |
| `core/src/life-case-facts.ts` | `smoker?: boolean` on the client, validated when present. |
| `core/src/household-budget.ts`, `core/src/health-score.ts` | the age 60+ crash. |
| `core/src/parameters/tatil-products-2026-10.ts` | Life Span Gold minimum premium 150 -> 154.44. |
| `core/src/parameters/index.ts` | registers `lifeRates`; adds `coreRowExists` and `coreGroupKeys` for probing a sparse grid. |

## 3. Parity (guard G5, exact to the cent)

| Case | Working | Figure |
|---|---|---|
| Term to 65, M, ANB 36, NS, $500,000 | $3.3746 x 500 + $360 = $2,047.30/yr; x 0.0858 | **$175.66 / mth** |
| Life Span Gold to 65, F, ANB 36, NS, $250,000 | $10.8679 x 250 + $360 | **$3,076.96 / yr** |
| Whole Life, F, ANB 35, NS, $125,000 | $20.4900 x 125 + $360 | **$2,921.25 / yr** |
| Life Span Gold, F, ANB 26, NS, $100,000 | $1,212.77/yr is under the $1,800 minimum -> $1,800; x 0.0858 | **$154.44 / mth**, cover stays $100,000 |
| Rest Assured II to 100, F, ANB 56, $125,000 | rate 46.524, a line from ANB 55 to 60 | **$5,815.50 / yr** vs the held-out quote $5,788.75 (+0.46%) |
| Term, M, ANB 36, NS, cover for $200/mth | band 1 gives $365,513, band 2 gives $584,071 | **$584,071** (the band 2 answer) |

Band non-monotonicity, measured: term, M, ANB 36, NS costs **$262.23 a month at $499,999** and
**$175.66 at $500,000**.

## 4. Goldens that moved (spec decision 10)

Every test that failed carried a premium. **No golden without a premium in it moved** — the remaining half of
rule 4's inverted gate held, and no other golden file was touched.

### `core/test/f18-package-cards.test.ts`

| What | Old | New | Why |
|---|---|---|---|
| Result 1, Term life | 238.83 | **297.29** | the harvested term rate at ANB 39 is $3.7701 per $1,000 a year plus the $360 fee; the sample curve charged 0.29 per $1,000 a month at actual age 38 |
| Result 1, critical illness | 294.30 | **235.84** | Life Span Gold is cheaper from the book, and its minimum is now 154.44, so pass two leaves it less |
| Result 1, card 0 premium | 238.83 | **297.29** | same as the Term life row |
| Result 2, Term life | 383.13 | **378.69** | pass one costs more, so pass two has less to add |
| Result 2, critical illness | 150.00 | **154.44** | Tatil's minimum premium |
| Result 2, card 1 premium | 578.51 | **676.16** | the Recommended cover at the real term rate |
| Result 2, card 1 needs | 195.37 | **297.47** | follows the card premium |
| Result 2, card 1 text | Needs $195 more a month | **Needs $297 more a month** | follows the card needs |
| Result 2, basket cover | 1,321,144 | **1,075,221** | the same money buys less cover once the fee and the real rate apply |
| Result 2, death sentence 0 | $1,341,144 | **$1,095,221** | follows the basket cover |
| Result 2, death sentence 9 | month 120 | **month 61** | less cover, so the father's care runs out sooner |
| Result 3, Term life | 297.96 | **376.28** | see below |
| Result 3, critical illness | 150.00 | **154.44** | Tatil's minimum premium |
| Result 3, third funded plan | the father's funeral, 262.88 | **the mother's funeral, 180.12** | life and CI now take $530.72 of the $710.84 ceiling, leaving $180.12: the mother's minimum fits, the father's $262.88 does not. The oldest-first order is unchanged; the money ran out sooner |
| Result 3, not yet | the mother, Cashbuilder II | **the father, Cashbuilder II** | the same swap |
| Result 3, basket cover | 1,027,453 | **1,067,773** | life keeps more, because the funded funeral is the cheaper one |
| Result 3, death sentence 0 | $1,047,453 | **$1,087,773** | follows the basket cover |
| Result 3, death sentence 9 | month 49 | **month 59** | follows the basket cover |
| Result 3, card 1 text | Needs $281 more a month | **Needs $300 more a month** | follows the card premium |
| Default card, life-ruin (twice) | 238.83 | **297.29** | the real term rate |
| Default card, CI after the reorder | 294.30 | **235.84** | the real CI rate |

### `core/test/fix-ladder-advice.test.ts`

| What | Old | New | Why |
|---|---|---|---|
| Term life | 238.83 | **297.29** | the real term rate |
| Critical illness | 294.30 | **235.84** | the real CI rate and its new minimum |
| The mother, not yet | 178.56 | **180.12** | R3a: the book prices ANB 67 |
| Basket total | 238.83 | **297.29** | follows the life allocation |

### `core/test/modules-parity.test.ts`

| What | Old | New | Why |
|---|---|---|---|
| term | 238.83 | **297.29** | the real term rate |
| life-span-gold | 294.30 | **235.84** | the real CI rate and its new minimum |
| rest-assured-ii, the mother, not yet | 178.56 | **180.12** | R3a |

### `core/test/one-allocator.test.ts`

| What | Old | New | Why |
|---|---|---|---|
| Tier 1, life cover | 238.83 | **297.29** | the real term rate |
| Tier 1, critical illness | 294.30 | **235.84** | the real CI rate and its new minimum |
| The reorder test's cap | the $533.13 default | **the $710.84 ceiling** | at the default cap no funeral fits any more, so a reorder there would change nothing and prove nothing. At the ceiling it still proves the point: by default life $297.29, CI $233.43 and the mother $180.12 are funded; moving the father above CI funds him ($413.55) instead of CI |
| The reorder, funded | term 238.83, rest-assured-ii 294.30 | **term 297.29, rest-assured-ii 413.55** | the new cap and the real rates |
| The reorder, not yet | LSG 150.00, RA 178.56, CB 300.00 | **LSG 154.44, RA 180.12, CB 300.00** | the new minimum and R3a |
| The reorder, basket | 238.83 | **297.29** | follows the life allocation |
| `productMinimum` helper, CI floor | the sample curve | **the book at ANB and the client's rating** | a stale expectation, not an engine change: guard 22 failed because the helper still priced the $100,000 minimum cover off the old curve |

### `core/test/products.test.ts`

| What | Old | New | Why |
|---|---|---|---|
| life-span-gold minimum premium | 150 | **154.44** | $1,800.00 a year at the 0.0858 modal factor (spec decision 6) |

### `core/test/rest-assured.test.ts` (all R3a)

| What | Old | New | Why |
|---|---|---|---|
| The mother, $30,000 | 178.56 | **180.12** | ANB 67 is inside the grid; the book interpolates rate 69.978. Quote +0.87% |
| The mother, $50,000 | 297.60 | **300.21** | same. Quote +0.88% |
| The mother's ladder minimum | 178.56 | **180.12** | same |
| The mother's full monthly | 892.80 | **900.62** | the book's rate on her $150,000 cover |
| The mother-in-law (ANB 67, female) | 178.56 | **180.12** | same |
| The other-elder (ANB 67, sex unknown) | 205.97 | **213.94** | the book's male rate 83.114 at ANB 67, instead of the quote moved back five years by the 5% factor |
| The "one pricing function" guard | `["premiums.ts"]` | **`["life-rates.ts"]`** | the quoted rates moved into `life-rates.ts`, beside the book's own lookup |
| The father's figures ($262.88, $438.14) | — | **unchanged** | rated age 72 is past the grid, and it is the exact quoted age, so the engine uses the quote itself and raises no estimate caveat |

## 5. Guards, and the sabotage of each (rule 3)

| Guard | Sabotage | Failure message |
|---|---|---|
| G1 checksum | one rate nudged by 0.001 | `G1: table checksum is b04e1ee6 but meta.checksum says c5b3e442` |
| G2 every cell verified | one status set to `estimate` | `G2: term/levelConvertibleTermTo65/M-NS/2/36 has status "estimate", not "verified"` |
| G3 no missing cell has a value | a missing ANB filled in | `G3: wholeLife/Whole Life/F-NS/band 2 lists ANB 20 as missing but the table has a rate for it` |
| G4 held-out quotes are not rates | a rate set to a held-out annual figure | `G4: rate term/levelConvertibleTermTo65/M-NS/2/36 = 5788.75 equals the held-out quote restAssured/Payment to Age 100/F-NS ANB 56 annual` |
| G5 parity | the $360 fee dropped | `term yearly: 3.374592 x 500 + 360 fee` — actual `'1748.25'`, expected `'2047.30'` |
| G7 age 60+ | a NaN part fed to the health score | before the fix it threw `Cannot read properties of undefined (reading 'label')`; the guard now asserts score 0 and label "Needs work" |
| G8 maximum issue age | the age check removed | `no monthly figure` — actual `1250.930426025077`, expected `null` |
| G9 no extrapolation | extrapolation past the grid allowed | `not a Tatil rate` — actual `'verified'`, expected `'estimate'` |
| G10 rating picks the table | the smoker flag ignored | `the M-S table` — `'175.66' !== '270.02'` |
| G11 band inversion | the first in-band candidate kept instead of the largest | `the band 2 cover, was 365501` |
| G12 interpolation | the lower age's rate used instead of a line | actual `'5618.75'`, expected `'5815.50'` |
| G14 no smoker field in a parameter table | a `smokerLoading` row added | `a smoker field in a parameter table` — actual `['core.ff.premiumRates.smokerLoading']` |

Every file was restored and the suite re-run clean after each sabotage.

## 6. Results

- `npm run typecheck` (in `core/`): no errors.
- `npm test`: **207 tests, 207 pass, 0 fail, 0 skipped.**
- `npm run build`: `core/dist/fpa-core.js`, **410,847 bytes** (was 285,461 — the 846 rate cells add 44%).
  - commit `4ffb4c87068d73b4f3a093083fba9ccc7c4651f4`
  - sha256 `ebaa661d645296cdfae5dee45a0b7aa4eae73937ee6022ba69a516baed34064a`
- `npm ci` was needed first: `core/node_modules` was absent, so `esbuild` could not be found.

## 7. Worth knowing

- **The 10-year grid means most clients get an interpolation caveat.** Term and Life Span Gold are harvested at
  ANB 26, 36, 46 and 56, so any other age crosses a 10-year gap and the engine says "Straight line across a
  10-year gap in the harvested ages: rougher than usual." That is honest, and it will be on most plans until
  the grid is denser. Harvesting the in-between ages is fence F1.
- **The sample fallback is now rare but still reachable:** ANB under 26 or over 56 for term and critical
  illness, whole life bands 2 and 3 outside ANB 25 to 55, and any un-harvested series or band.
- The engine and the portal differ on purpose outside the grid: the portal refuses, the engine falls back and
  says so (spec R10). The portal's parity test must use in-grid cases only.

## 8. Still to do (Part 4, after Kyron accepts)

1. Open the PR on `feat/real-life-rates`. CC does not merge and does not deploy.
2. Then, in a fresh General-Rater-Portal session, the brief's appendix: re-vendor `fpa-core.js`, update
   `PINNED.txt` with the commit and sha256 above, add the parity test, drop the page-level age-60 guard's
   "remove me" test, smoke walk at 1280 and 390.
