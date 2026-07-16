# NIBTT — Authoritative Rates, Scraped From Source

**Source:** nibtt.net, fetched directly 2026-07-16
**Status:** 🔴 **This document CORRECTS a confidently wrong finding from the July 2026 verification round.**

---

## THE CORRECTION — the repo was right, my verification was wrong

**[parameter-verification-2026-07.md](parameter-verification-2026-07.md) claimed, with a unanimous 3–0 adversarial vote:**

> "NIS PER-CLASS BENEFIT RATES: **OUTDATED** — the most significant defect found. The codebase's Class 1 basic TT$335.83 / increment TT$4.90 and Class 16 basic TT$2,475.70 / increment TT$46.76 match NIBTT's schedule EFFECTIVE 7 JANUARY 2008 exactly. The current NIBTT benefit schedule (effective 5 September 2016) gives Class I = TT$566.72 / TT$566.72 monthly and Class XVI = TT$4,079.40 monthly. The codebase is keyed to an ~18-year-obsolete table and understates pensions by roughly 40%."

**That is false.** The live NIBTT benefit table, fetched today from
`https://www.nibtt.net/benefits_09/tables/retire_invalidity_rates.htm` — the URL NIBTT's own retirement pages link to as *the* rate table — reads:

> **Effective Date: "January 07, 2008"**

| Class | Weekly benefit | Weekly increment | **Monthly benefit** | **Monthly increment** |
|---|---|---|---|---|
| I | 77.50 | 1.13 | **335.83** | **4.90** |
| II | 100.75 | 1.58 | 436.58 | 6.85 |
| III | 119.35 | 2.00 | 517.18 | 8.67 |
| IV | 137.95 | 2.42 | 597.78 | 10.49 |
| V | 155.00 | 2.85 | 671.67 | 12.35 |
| VI | 183.68 | 3.46 | 795.95 | 14.99 |
| VII | 216.23 | 4.05 | 937.00 | 17.55 |
| VIII | 248.78 | 4.68 | 1,078.05 | 20.28 |
| IX | 283.65 | 5.32 | 1,229.15 | 23.05 |
| X | 320.85 | 6.05 | 1,390.35 | 26.22 |
| XI | 358.05 | 6.73 | 1,551.55 | 29.16 |
| XII | 376.65 | 7.49 | 1,632.15 | 32.46 |
| XIII | 440.05 | 8.31 | 1,906.87 | 36.01 |
| XIV | 487.78 | 9.21 | 2,113.72 | 39.91 |
| XV | 542.23 | 10.24 | 2,349.65 | 44.37 |
| XVI | 571.31 | 10.79 | **2,475.70** | **46.76** |

**The repo's `PENSION_RATES` matches this exactly, at both ends.** The 2008 date isn't drift — **NIBTT has not updated the benefit table since 2008, so the 2008 rates ARE the current rates.**

Confirmed by the benefit-rates index (`benefit_rates.html`), which links only three impact tables — 2008, 2010, 2012 — and **nothing newer**.

### Why the verifier got it wrong

The **2016 date belongs to the *earnings/contribution* table** (13.2%, eff. 5 Sept 2016) — not to a benefit table. The research agents appear to have carried the 2016 date across from the contribution schedule and **invented per-class benefit figures to go with it** (566.72 / 4,079.40 appear nowhere on NIBTT). Three independent adversarial verifiers rated a fabrication 3–0.

### The methodological lesson — and it cuts at the whole approach

This project has repeatedly used adversarial verification to catch stale data. **It just produced a confident, unanimous fabrication in the opposite direction** — and the "defect" it invented was the *self-serving* one (understated NIS → bigger retirement gap → recommend more product). Had it been actioned, we would have written a real mis-selling bug *into the spec, in the name of correctness*.

**Rules going forward:**
1. **Scrape the primary source. Do not verify a number against search results when the issuer publishes it.** nibtt.net was reachable the whole time.
2. **A 3–0 vote is not truth.** Verifiers share the searcher's context; they can agree on a fabrication.
3. **When verification contradicts a domain practitioner, the practitioner is evidence — go to source before overriding them.** The founder said the old rates were there on purpose. They were.

---

## 🔴 THE REAL FINDING — the $3,000 minimum is doing almost all the work

The far more important discovery, visible only now that the true rates are in hand:

**Class XVI — the top earnings class — has a basic monthly benefit of $2,475.70. The statutory minimum pension is $3,000/month.**

**Every basic rate in the table, all sixteen classes, is below the minimum.**

So the basic rate is essentially inoperative. A retiree exceeds $3,000/month **only through increments**, at 1 increment per 25 contributions above 750.

**For a Class XVI (top-earning) retiree to beat the minimum:**
```
(3,000 − 2,475.70) ÷ 46.76 = 11.2 → 12 increments
12 × 25 = 300 contributions beyond 750
= 1,050 contributions ≈ 20 years of contributions
```

**A top earner needs ~20 years of contributions just to exceed the floor available to everyone.** A Class I retiree with 750 contributions gets $3,000 — the same as a Class XVI retiree with 750 contributions.

### Why this matters to the product

1. **The minimum pension is the binding constraint for a large share of retirees**, not an edge case. The engine must apply it as the dominant rule, not a floor check.
2. **NIS is far weaker than clients assume**, and now we can prove it *from NIBTT's own table* — no sales framing required. Combined with the confirmed **$13,600/month insurable ceiling** (earnings above it contribute but don't increase the pension) and **whole-life averaging** (not final salary), the picture is: **NIS was never designed to fund a middle-class retirement.**
3. **The retirement gap is real and large** — and the argument for private provision now rests on three verifiable public facts rather than on a projection anyone can dispute.
4. **This makes the NIS⊕SCP interaction more important, not less.** If most retirees land at exactly $3,000 NIS, and if NIS counts as SCP assessed income, then that $3,000 sits precisely in the SCP band that pays $2,500 (2,501–3,500). *Still gated on confirming the SCP bands.*

**This is the strongest client-facing insight in the project so far, and it is honest.** It is not a scare tactic; it is NIBTT's published table, read correctly.

---

## Also confirmed from source

**Retirement Benefit qualifying conditions** (`ben_retirement.html`, `ben_retirement_I.html`):
- Age **60–64: must cease insurable employment** to claim; **age 65: paid whether you retire or not.**
- Once claimed at 60–64, *"will continue to receive such pension even if he returns to insurable employment before he attains age 65."*
- **750 contributions** minimum for a pension — may include **paid, Voluntary, Age Credits and/or Benefit Credits** *(the credits are new to us — the engine's contribution count is not just paid weeks)*.
- **Retirement Grant:** one-time lump sum, minimum $3,000, for **fewer than 750** contributions. Equal to **3× the value of total contributions** for those reaching retirement age on/after 07/01/2008.
- **Minimum pension:** *"the board shall pay with effect from February 1, 2012 the sum of $3,000.00 monthly"*.
- **Increments:** *"For every block of 25 contributions paid in excess of 750 one increment is added to the basic pension rate."*
- Payment *"starts from the Monday of the week in which Retirement Age was reached and continues on a monthly basis for life."*

**Contribution rates index** (`Contribution_Rates/rates.html`) confirms **2026 rates effective 5 January 2026 at 16.2%**, with the 2016 (13.2%) and historical tables back to 1972 retained — the era-selection design the repo implements.

---

---

## 🟢 THE ARCHITECTURE, SETTLED — two rate systems, two different rules

The sitemap resolves the open question ("are benefit rates era-selected or claim-date?"). **NIBTT keeps two separate rate systems and they behave differently:**

### 1. CONTRIBUTION rates — what you PAY — **era-selected**
Published as dated historical sets: **1972–2006 · 2008–2012 · 2013–2014 · 2016 (13.2%) · 2026 (16.2%)**.
Each applies to contributions **paid during its era**. The [2016 page](https://www.nibtt.net/Contribution_Rates/rates_sep2016.html) remains live *because contributions paid Sept 2016 → Jan 2026 were made at 13.2%* — it is **current for its period**, not stale.

### 2. BENEFIT rates — what you GET — **single current table, applied at qualification**
The sitemap's Benefit Rates section lists **seven** tables, each a *single current set*, not an era series:
sickness & maternity · **retirement & invalidity** · survivors · employment injury allowance · employment injury death benefit · employment injury · constant care & attendance.

**The decisive wording**, straight from the sitemap:

> *"Rates of constant Care and Attendance Allowance for persons **qualifying on or after 7th January 2008**."*

**Benefit rates are keyed to the date you QUALIFY, not the dates you contributed.** One table, applied at claim time. That is why the retirement/invalidity table carries a single 2008 effective date and no history — 2008 is simply when the current benefit rates took effect, and they haven't changed since.

### ✅ Both halves of the repo are architecturally correct
| | Rule | Repo |
|---|---|---|
| `HISTORICAL_EARNINGS_TABLES` + `getTableForDate()` | era-selected | ✅ correct |
| `PENSION_RATES` (single table) | claim-date, single current set | ✅ correct |

**Only defect: `PENSION_RATES` lacks the date and source its twelve neighbours carry.** Add `effective 2008-01-07`, cite the URL. Nothing else changes.

**This is the third time the founder's design has been confirmed against my doubts.** The undated singular table *looked* like the smell we'd been hunting all project. It wasn't — it was the correct shape for a benefit table. **A code smell is a hypothesis, not a finding.**

---

## New from the 2016 page: Class Z

The 2016 contribution table carries a column absent from my earlier extractions — **Class Z Weekly Contribution**:

| Class | Employee | Employer | Total | **Class Z** |
|---|---|---|---|---|
| I | 11.90 | 23.80 | 35.70 | **1.79** |
| XVI | 138.10 | 276.20 | 414.30 | **220.72** |

Class Z runs ~5% of the total weekly contribution for classes I–XV — **but XVI shows 220.72 against a 414.30 total (~53%)**, wildly out of pattern. Either Class Z is computed differently at the ceiling, or **it is an error on NIBTT's own page.**

**Do not encode Class Z until its meaning is confirmed.** It is not defined anywhere I could find on the site — not in registration definitions, the contribution pages, or either FAQ. It is *believed* to relate to employed persons over retirement age who remain in insurable employment (employment-injury cover only), **but I have no source and will not assert it.** Given that two of my confident claims about NIBTT have already been wrong, this one waits for evidence.

---

## Actions

1. ✅ **`PENSION_RATES` is CORRECT — do not change the values.** But **date it** (`effective 2008-01-07`), source it to the NIBTT URL, and add the comment its 12 neighbours have.
2. **Resolve era-selection for benefits.** NIBTT publishes *one current* benefit table (2008) and 12 historical *contribution* tables. So benefits appear to be **claim-date, single-table**; contributions are **era-selected**. The repo's design already matches this. Confirm no historical benefit tables are needed.
3. **Model the $3,000 minimum as the dominant rule**, and surface the "20 years to beat the floor" fact.
4. **Add credit types** — paid, Voluntary, Age Credits, Benefit Credits all count toward 750.
5. **Model the 60–64 cessation rule** — claiming before 65 requires ceasing insurable employment.
6. **Strike the "40% understatement" claim** from the verification record.
