# T&T Parameter Tables — the single source of truth

**Both the planning engine and the public calculators import from here. Nothing hardcodes a T&T parameter anywhere else.**

```
parameters/
  tt-parameters.json   # the data — every value carries provenance
  tt-parameters.js     # the loader + computation helpers
  verify.mjs           # drift + correctness checks (run in CI)
  README.md
```

```bash
node parameters/verify.mjs   # exits non-zero on failure
```

---

## Why this is load-bearing, not hygiene

The [product vision](../research/) is that **clients reach their own conclusions on the public calculators and then refer in**. That only works if their numbers are right.

> **A wrong self-serve number is worse than no number.** A client with conviction built on a bad figure is harder to correct than a client with no figure — you would be arguing against their own arithmetic, which they trust more than yours.

**The drift this module fixes is a live example.** The public calculators held the **2008 NIS benefit table** (Class I `335.83`). The current table is the **2016 schedule** (Class I `566.72`) — the calculators understated the pension by **69%**, which *overstates* the retirement gap, which *sells more product*. That is the self-serving direction, and in a self-serve model it would be wearing **the client's own authority**.

---

## The rules

1. **Never hardcode a T&T parameter outside this module.** Import it.
2. **Every value carries** `effective`, `source`, `retrieved`, `status`.
3. **Provenance is PER-PARAMETER, not per-page.** Agencies contradict themselves — this is proven, not theoretical:
   - **NIBTT publishes benefit rates in two places with ~69% different values** and never reconciles them. The *Benefits* section serves the stale 2008 table and is the one its own Retirement pages link to; the current 2016 table lives under `/Contribution_Rates/`.
   - **The Ministry of Finance** publishes a TT$30,000 deduction cap that is **two increases and 17 years** out of date (actual: TT$60,000 since 2022).
   - **NIBTT's FAQ** still states the 2016 rate of 13.2% — while the TT$13,600 ceiling *on the same page* is current. One page, one right constant and one wrong one.
   - **The SCP application form** says income must not exceed $4,500; the maintained Ministry page says $5,500.
   - **Prefer the maintained page over the linked PDF.**
4. **Never silently use an unsafe value.** `assertSafe()` throws on `BLOCKING_UNRESOLVED`, `PROVISIONAL`, `UNVERIFIED_1995_SOURCE`, `STALE_DO_NOT_USE`. Surface the uncertainty to the user instead of guessing.
5. **OCR and derived values are leads, not truth.** Verify against the source before encoding.
6. **Never multiply by a rate. Ask the engine.** Any figure a user sees must come from the same function that produces the real answer — never from `amount × rate`. See below.

---

## Rule 6 has already been broken once, and it broke the way the others do

The engine was right; the *display* took a shortcut.

Income tax is banded: 25% on chargeable income to TT$1,000,000, 30% above. `incomeTax()` has always
walked the bands correctly — exact at 999,999 / 1,000,000 / 1,000,001 / 2,000,000. But several
displayed figures computed relief as `premium × marginalRate`, which is wrong for anyone whose
deduction **crosses** the threshold, because part of it is relieved at 30% and the rest at 25%.

| Gross 1,120,000, premium 53,830 | |
|---|---|
| Chargeable before → after | 1,023,830 → 970,000 |
| True saving | **14,649** (27.21% effective) |
| `premium × 0.30` said | 16,149 |
| Overstated by | **1,500** |

**Note the direction.** It overstated the tax saving, which makes the product look better. That is the
same direction as the 2008 NIS benefit table (understated the pension → overstated the retirement gap)
and the same direction as advising a client to fill the TT$60,000 cap when their tax ran out first.
Three separate defects, all flattering the sale. None were deliberate. That is exactly why the rule is
mechanical rather than a matter of care: **if a number on screen was not produced by the engine, it is
not verified, however obvious the arithmetic looks.**

The fix is always the same shape — replace the multiplication with a call:

```js
// wrong: assumes one rate applies to the whole deduction
const saving = premium * marginalRate;

// right: ask what the tax actually is, with and without
const saveAt = x => before.tax - incomeTax({ ...inputs, approvedContributionsAnnual: x }).tax;
```

A marginal rate is still fine as a *label* ("your top rate is 30%"). It is never fine as a *multiplier*.
`verify.mjs` asserts a straddling premium relieves below the flat-30% figure, so a reintroduced
shortcut fails the suite.

## Status vocabulary

| Status | Meaning |
|---|---|
| `VERIFIED` | Confirmed from the issuing agency, with a source URL and date |
| `VERIFIED_SINGLE_SOURCE` | Confirmed, but only one source found — a second would be welcome |
| `VERIFIED_PRACTICE_UNCITED` | Real and safe to compute with, but **no statutory basis located** — do not claim a legal citation |
| `VERIFIED_MARKET_STANDARD` | Not law — market convention, confirmed across independent insurers |
| `MARKET_CONVENTION` | A local norm, not a universal truth. Encode as a parameter, never as a constant |
| `PROVISIONAL` | Announced but not gazetted. **Never show to a client as settled** |
| `DERIVED` | Computed by us from verified inputs, not published directly |
| `BLOCKING_UNRESOLVED` | **Ships nothing.** Must be answered before the dependent feature |
| `UNVERIFIED_1995_SOURCE` | From a dated document; may not survive |
| `STALE_DO_NOT_USE` | Superseded. Retained only so drift is detectable |

## Current attention list

Run `auditParameters()` (or `verify.mjs`) — it returns everything not plainly `VERIFIED`:

| Parameter | Status | Action |
|---|---|---|
| `nis.benefit_rates.increments` | 🔴 **BLOCKING** | The 2016 schedule publishes **basics only**. 2008 = 4.90…46.76; 2013 = 6.11…56.33; 2016 = **unpublished**. Two readings, neither adopted. **Confirm with NIBTT or the Legal Notices (25–30) before the pension formula ships.** Until then `nisPension()` returns the basic + minimum and *surfaces a caveat* rather than guessing. |
| `nis.contribution_rate.future` (19.2%, 2027) | 🟡 PROVISIONAL | Budget announcement + arithmetic (16.2 + 3). **No gazetted class schedule exists.** Never present 2027 as settled. |
| `income_tax.nis_deductible_portion` (70%) | 🟡 UNCITED | On IRD's page and Form T.D.-1; **no statutory section located**. Safe to compute; do not cite. |
| `scp.bands` | 🟡 SINGLE SOURCE | One Ministry page. An earlier verification round **refuted these exact bands 1–2** before the source was scraped. A second source would be welcome. |
| `annuities.s134_6a_deferred_compensation` | 🟡 1995 SOURCE | Reportedly **one-third of chargeable income**, *not* the TT$60k cap. If current, the envelope optimizer is materially wrong to ignore it. Lead: the `Corporation Tax Training` document. |
| `nis.contribution_tables["2026-01-05"]` | ⚠️ INCOMPLETE | Only Classes I and XVI transcribed. **Classes II–XV must be read from `NISContributions_20260105.pdf` before use.** |

## What the helpers enforce

- **`nisPension()`** — averaging is **whole working life** (NIBTT training transcript, verbatim), *not* final salary and *not* the last 7 years. The "7 years" people remember is a **qualifying condition** (employed 5 of the last 7), a different rule. Increments are **not** applied silently.
- **`retirementFloor()`** — NIS and SCP **must** be modelled together. NIS pension counts as SCP assessed income (form items 6 & 31); the grant does not. **A 3,000 NIS pension delivers 2,000 net** — and since classes I–XII land on the 3,000 minimum, that is the *common* case.
- **`scpBenefit()`** — flags proximity to the **cliff edges** (2,500 / 3,500 / 4,500 / 5,500). At 5,501 one extra dollar costs **$500/month**.
- **`healthSurcharge()`** — returns 0 for **under 16 / 60+ / pension-only**. Material: never charge a 62-year-old.
- **`incomeTax()`** — the TT$60,000 cap is a **single aggregate** across pension + approved annuity + 70% of NIS, never per-product. Returns `headroom`, which the envelope optimizer needs.
- **`checkAnnuityMaturity()`** — below 50 is **ILLEGAL** (statutory floor, refuse); above 70 is **WARN** (legal, forfeits the s.8(1)(ta) exemption). Two different rules, not one window.

## Wiring the public calculators

The calculators in [T-T-Financial-Insurance-Hub](https://github.com/Kelsean868/T-T-Financial-Insurance-Hub) are standalone HTML. To wire them:

1. Copy `tt-parameters.json` + `tt-parameters.js` into the repo (or fetch the JSON from a shared URL at build time).
2. Replace every inline constant — `PENSION_RATES`, `PERSONAL_ALLOWANCE`, `TAX_RATE_1/2`, `MAX_DEDUCTIBLE_NIS_ANNUITY_COMBINED`, the health-surcharge rates, `MIN_NIS_PENSION`, `PENSION_CONTRIB_THRESHOLD` — with imports.
3. **Keep `HISTORICAL_EARNINGS_TABLES` and `getTableForDate()`** — that design is **correct**: contributions are era-selected. Only the *benefit* table was wrong, and only because it's claim-date/single-table and NIBTT hid the current one.
4. Surface `caveat` fields in the UI. When the engine says "increments unconfirmed", the calculator should say so too — an honest gap beats a confident wrong number.
5. Add `node parameters/verify.mjs` to CI in both repos.
