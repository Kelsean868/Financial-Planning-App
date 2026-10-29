# Brief: real Tatil life rates inside the engine (fpa-core)

Date: 28 Oct 2026 · Owner: Kyron · Model: **Opus 5.5, effort high** (one session, stop points below).
Subagents for mechanical work (the import script, golden diffs): **Sonnet 5.5, effort medium**.

## Goal

Every premium the fact-finder shows — the quick quote AND the insurance budget, package cards, closing
ladder, cover-for-budget and the one-page plan — comes from Tatil's own harvested rates, not the
SAMPLE curves in `core:ff.premiumRates`. Today only the quick quote is real (a page-level adapter in
General-Rater-Portal, PR #168), so the close can contradict the quick quote. This run fixes that at
the source, inside `core/`.

## Read first

1. `CLAUDE.md` (this repo's workflow contract). Rules 1, 4, 5, 8 and 9 matter most here.
2. `core/src/premiums.ts`, `core/src/closing.ts` (premium use ~lines 441-564),
   `core/src/insurance-budget.ts` (~120-281), `core/src/parameters/fact-finder-2026-10.ts`
   (`premiumRates`), `core/src/parameters/tatil-products-2026-10.ts` (`minPremiumMonthly`),
   `core/src/parameters/row.ts`.
3. The rate book (source of truth, do not edit it here):
   `C:\Projects\General-Rater-Portal\rates\life\life-rate-book.json` (keys: `ages`, `oipa_age_offset`,
   `fee_annual`, `modal`, `sources`, `products`, `cash_values`, `missing`, ...). Products: `wholeLife`,
   `endowment`, `restAssured`, `applyonCi`, `lifespanGold`, `term`. Rates are **yearly per $1,000, keyed
   by ANB**, by `"F-NS" | "F-S" | "M-NS" | "M-S"` (Rest Assured: by sex only) and band `"1" | "2" | "3"`.
   OIPA products were already converted to ANB when the book was built — look up by ANB only.
4. The portal's adapter, for parity: `C:\Projects\General-Rater-Portal\life-rates.js` (`estimate()`) and
   its run record `docs\audit\RUN-2026-10-28-life-rate-engine.md` (the age-60 root cause and fix are there).

## Step 0

`git checkout master && git pull`. Branch `feat/real-life-rates`. (Local was left on `docs/fact-finder-specs`.)

## Part 0 — the spec (STOP A: Kyron signs it)

Write `docs/superpowers/specs/2026-10-29-real-life-rates-design.md` from the decisions below. A spec picks one
answer (rule 1). Flag every risk in it before any code (rule 5). Then stop and wait for Kyron's sign-off.

### Decisions (put these in the spec as written)

1. **Import, do not hand-copy.** `tools/import-life-rate-book.mjs <path to life-rate-book.json>` writes
   `core/src/parameters/tatil-life-rates-2026-10.ts`: one `row()` per harvested cell, status `"verified"`,
   source `"Tatil <ApplyOn|OIPA> illustration, harvested <date>"`, `asOf` = the harvest date. The `missing`
   list is carried as data. Re-running the script on a new book is the ONLY way rates change.
2. **Formula.** Yearly = band rate per $1,000 x cover / 1,000 + **$360 fee** (Rest Assured II: no fee).
   Monthly = yearly x **0.0858** (semi 0.5125, quarterly 0.2585). Bands: Whole Life / Endowment
   < $150,000 / $150,000-$499,999 / $500,000+; Term and Life Span Gold < $500,000 / $500,000+.
3. **Which product each engine kind uses:** `term` = Term "Level convertible term to 65";
   `whole-life` = Whole Life "Whole Life"; `ci` = Life Span Gold "to age 65"; **add `rest-assured`** =
   Rest Assured II "Payment to Age 100" (today `premiumFor(b, 'rest-assured')` throws — no RATE_PATHS entry).
4. **Inputs.** `premiumFor` / `coverForPremium` take `{ sex, smoker }` as well as kind, cover, age.
   ANB = the existing `ratedAge(age)`. Sex unknown: male rates (the higher), with a caveat — the same
   pattern Rest Assured uses today. Smoker unknown: non-smoker rates, with the caveat
   "Non-smoker rates — ask if they smoke". **Smoker is a call-time rating input only; it is never written
   into this repo's data** (rule 8). Fixtures use synthetic people.
5. **Between harvested ANBs:** linear interpolation of the rate per $1,000. **Outside the grid or a
   `missing` cell:** fall back to the existing SAMPLE curve, status `"estimate"`, with the reason as a
   caveat (e.g. "Sample rates, not Tatil's: ANB 58 is outside the harvested ages (ANB 26-56)").
   **Past the product's maximum issue age:** no premium at all (null) and "Not available at this age"
   (Term to 65: from ANB 66). This matches the portal.
6. **Minimum premiums (rule rows):** Term $1,748.25/yr = **$150.00/mth**; Life Span Gold **$1,800.00/yr =
   $154.44/mth** (today 150 — wrong; source: OIPA raised M NS 25 $175,000 to $180,510 to reach $1,800);
   Rest Assured II as today. The premium is raised to the minimum; the cover stays.
7. **`coverForPremium` with a fee and bands.** Invert per band: cover = (monthly / 0.0858 - 360) / rate x 1,000.
   Bands make it non-monotone (e.g. $150,000 can cost less than $149,000). Rule: compute the cover in every
   band, keep the results that fall inside their own band, and return the **largest** cover whose premium
   is within the budget. A budget below the minimum premium buys no cover (0), with a caveat.
8. **The rough band stays.** `roughBand` and `bandSpread` are unchanged (Section 2 §2.5: rough, never a
   quote). Only the estimate inside it becomes real.
9. **The age 60+ crash (same run).** From 60 no NIS, so a blank case has take-home exactly $0; with no costs
   either, `needs / hhNet` = 0/0 = NaN and the health score throws on `.label`. Fix:
   (a) budget step `const needsRatio = hhNet > 0 ? needs / hhNet : (needs > 0 ? Infinity : 0);`
   (b) health score: `Number.isFinite(score)` guard and
   `labels.find((l) => score >= l.from) || labels[labels.length - 1]`.
10. **Goldens WILL move.** This is not a refactor, so rule 4's inverted gate does not apply to premium
    goldens. Every golden that moves is listed old -> new in the run record with the reason. Goldens with
    no premium in them must NOT move (that part of the gate stays).

## Part 1 — the import (after sign-off)

1. `tools/import-life-rate-book.mjs` and the generated parameter file. Run it on the current book.
2. A test: the parameter file's cell count and checksum equal the book's; every `verified` row has a
   harvest date; no `missing` cell has a value.

## Part 2 — the engine

1. `premiums.ts`: the formula, kinds, inputs, interpolation, fallback, minimums and `coverForPremium` per the
   spec. The SAMPLE rows stay as the fallback, re-labelled in their source as "fallback only".
2. `closing.ts`, `insurance-budget.ts` and every other caller pass `{ sex, smoker }` from the facts
   (`facts.client.sex`, `facts.client.smoker`; for parents / loved ones, their own sex if known).
3. The age 60+ fix (decision 9).
4. `tatil-products-2026-10.ts`: Life Span Gold minimum 154.44 (rule row, with source).

## Part 3 — tests (STOP B after this part)

1. **Parity with the portal** (held-out real quotes; these must be exact to the cent):
   - Term to 65, M, ANB 36, NS, $500,000 = **$175.66/mth**
   - Life Span Gold to 65, F, ANB 36, NS, $250,000 = **$3,076.96/yr** ($2,716.96 + $360)
   - Whole Life, F, ANB 35, NS, $125,000 = **$2,921.25/yr**
   - Life Span Gold at the minimum: F, ANB 26, NS, $100,000 -> **$154.44/mth**, cover unchanged
2. Interpolated: Rest Assured II F ANB 56 $125,000 to 100 = $5,788.75/yr within 1%.
3. `coverForPremium` across a band edge returns the larger cover when it is cheaper.
4. Fallback with reason (ANB 58 Term); "Not available" (Term ANB 66); sex unknown -> male + caveat;
   smoker unknown -> non-smoker + caveat; smoker true uses smoker rates.
5. Blank case at ages 60, 65 and 70: `computeFactFinder` does not throw.
6. Sabotage-test each new guard (rule 3) and record the failure message.
7. **Deliverable B (paste back):** `npm test` summary, the parity table, and the list of moved goldens
   old -> new with one line of reason each. **Stop. Kyron accepts the new goldens.**

## Part 4 — build, record, PR (rule 9)

1. `npm run build` -> `core/dist/fpa-core.js`. Record its commit and sha256.
2. Run record `docs/audit/RUN-2026-10-29-real-life-rates.md` (risks first, then results).
3. Open the PR. **Do not merge.** Paste back the PR link, commit and sha256. Stop.

## Out of scope

- Re-harvesting rates. Gaps stay sample-rate fallbacks until the rate book is rebuilt.
- Riders, Endowment / Limited Pay variants in the plan, cash values in the engine (the portal shows those).
- Any change in General-Rater-Portal (see the appendix — a separate session, after Kyron merges).

## Appendix — after Kyron merges the PR (a fresh session in General-Rater-Portal)

Paste there:

> Re-vendor fpa-core from Financial-Planning-App master (the real-life-rates merge). Copy core/dist/fpa-core.js
> into vendor/fpa-core/, update PINNED.txt (commit, sha256, source, assumption set). Add a parity test: for the
> four Part 3 cases, fpa-core premiumFor and life-rates estimate() give the same monthly figure. The page-level
> age-60 guard stays (its "remove me" test will now fail on purpose: remove the guard and that test). Run npm test
> alone, smoke walk the fact-finder at 1280 and 390 (quick quote, insurance budget, the close, the plan for
> Term M35 $500k smoker / non-smoker and a client aged 62), then open a PR and stop for Kyron.

## When the rate book changes (after any harvest)

1. General-Rater-Portal: `node scripts/build-life-rate-book.mjs <rate_harvest folder>`, npm test, PR.
2. Financial-Planning-App: `node tools/import-life-rate-book.mjs <book>`, npm test, PR.
3. General-Rater-Portal: re-vendor (appendix). The parity test catches a book that drifted.
