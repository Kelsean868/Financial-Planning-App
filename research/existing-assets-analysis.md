# Existing Assets Analysis — PALIG Calculator + T&T Financial Hub Repo

**Sources:** PALIG Personal Net Worth Calculator (2012, last saved 2013) · [T-T-Financial-Insurance-Hub](https://github.com/Kelsean868/T-T-Financial-Insurance-Hub)
**Date:** 2026-07-16
**Verdict:** Both are load-bearing. The repo is a substantial chunk of `ParameterTables` already written. The PALIG tool contributes a scoring model and confirms a market convention.

---

## HEADLINE: The NIS ⊕ SCP interaction — a real gap in our spec

The repo's NIS/SCP calculator encodes something our `NeedsEngine` does not model at all.

**Senior Citizens' Pension is means-tested against assessed monthly income:**

| Assessed monthly income | SCP received |
|---|---|
| ≤ TTD 2,500 | **TTD 3,500** |
| 2,501 – 3,500 | 2,500 |
| 3,501 – 4,500 | 1,500 |
| 4,501 – 5,500 | 500 |
| > 5,500 | **nil** |

Now put that beside the NIS minimum pension of **TTD 3,000/month**:

- **No NIS pension** → assessed income 0 → SCP **3,500** → total **3,500**
- **NIS minimum pension 3,000** → assessed income 3,000 → SCP **2,500** → total **5,500**

**A TTD 3,000 NIS pension nets only TTD 2,000 of additional retirement income.** There is an effective ~33% clawback at the minimum-pension level, and it gets worse in the higher bands: at an assessed income of 5,501 the SCP goes to zero, so earning one extra dollar costs 500/month.

**Consequences:**
1. `NeedsEngine` **must model NIS and SCP together.** Modeling NIS alone materially overstates the value of NIS contributions and understates the retirement gap.
2. There are **hard cliff edges** at 2,500 / 3,500 / 4,500 / 5,500 of assessed income. Any retirement recommendation that lands a client just over a cliff is actively harmful.
3. This is precisely the class of local complexity that makes the engine uncopyable — and no US tool has any analogue (US Social Security has no means-tested companion benefit of this shape).

**Note:** SCP at 3,500 exceeds the NIS minimum pension at 3,000. That is counter-intuitive and worth stating plainly in any client-facing output.

---

## The repo: `ParameterTables`, already written

Five calculators, 100% HTML on GitHub Pages, SEO'd, public. The **HTML is a prototype; the logic is the asset.**

### Constants extracted — these go straight into `ParameterTables`

**Income tax (PAYE)**
```js
PERSONAL_ALLOWANCE   = 90_000     // annual, tax-free
TAX_BRACKET_1_LIMIT  = 1_000_000
TAX_RATE_1           = 0.25       // up to 1M
TAX_RATE_2           = 0.30       // above 1M
```

**Deductibility — two rules we did not have**
```js
MAX_DEDUCTIBLE_NIS_ANNUITY_COMBINED = 60_000   // ✅ CONFIRMS our research
// 70% of NIS contributions are deductible      ← NEW, we had no such rule
```
The TT$60,000 combined cap independently confirms Round 1's verification panel, which killed the government website's stale **TT$30,000** figure 0–3. Two independent sources now agree.

Taxable income = `Gross − Personal Allowance − (NIS × 0.70) − Deductible Registered Contributions`

**Health Surcharge — a deduction absent from our spec entirely**
```js
4.80 / week   if monthly income ≤ 469.99
8.25 / week   if monthly income >  469.99
```

**NIS pension formula — the real one**
```js
PENSION_CONTRIB_THRESHOLD = 750    // weeks required   ✅ CONFIRMS research
MIN_NIS_PENSION           = 3000   // monthly          ✅ CONFIRMS research
MIN_NIS_GRANT             = 3000

// 16 earnings classes, each with basicMonthly + incrementMonthly
Class 1  : basicMonthly  335.83, incrementMonthly  4.90
Class 16 : basicMonthly 2475.70, incrementMonthly 46.76

increments = Math.floor(excessContributions / 25)
pension    = basicMonthly + (increments × incrementMonthly)
grant      = totalMonetaryValue × 3
```
Our spec said "16-class banded system" abstractly. **This is the actual formula.**

**Also present:** Section 134(6) corporate annuity logic, public servants' pension + gratuity (a separate regime covering a large share of T&T employment — another gap in our spec), and a tax return calculator for 2019–2024.

### The repo already implements our hardest rule

It embeds **13 dated contribution-rate tables spanning 1972 → 2016.** That *is* the "no bare constants, always year-indexed and dated" discipline our spec demands — already built, in production, by the same author.

### ⚠️ But the data is ten years stale — which proves the rule

The most recent embedded table is **2016-09-05**. Our Round 1 research established the rate is **16.2% effective 2026-01-05**, rising to **19.2% in January 2027**, with the retirement age phasing up from 2028.

**None of that is in the repo.** The architecture is right; the data has drifted. This is the strongest possible argument for the spec's parameter discipline — the tables went stale in exactly the way we predicted, in code written by someone who knew to date them.

**Action:** port the table structure, refresh every table to 2026, add the 2027 entry, and put a review date on each.

---

## PALIG: a scoring model, and a confirmed market convention

### 1. The benchmark allocation is market-standard — not house style

PALIG's benchmark, beside Maritime's:

| Category | PALIG | Maritime |
|---|---|---|
| Tax | 15% | 15% |
| Loans | 25% | 25% |
| Pension / Retirement | 10% | 10% |
| Insurance — Life | 5% | 5% |
| Insurance — General | 5% | 5% |
| Savings + Investment | 10% | 10% |
| Living Expense | 30% | 30% |

**Identical.** Two independent T&T insurers, one from 2012 and one current. This answers the question I raised about needing a Sagicor fact finder to distinguish convention from house style — **it's convention.** Encode it as a T&T benchmark with confidence.

### 2. The Quality Rater — turn the budget into a diagnosis

PALIG scores each category's variance from benchmark:

| Rating | Variance from benchmark |
|---|---|
| Excellent | better than −5% |
| Good | −15% to −6% |
| Fair | −30% to −16% |
| Poor | −45% to −31% |
| Unacceptable | worse than −46% |

Worked example from the file: Loans at 34.2% against a 25% benchmark → variance −9.2% → **"Poor."** Living Expense at 13.2% against 30% → **"Excellent."**

**This is a financial health scorecard**, and it's a strong product feature: it converts the exhaustive budget from data entry into a *diagnosis the client receives*. It gives them something back for the work — which is exactly what makes optional homework get done.

### 3. "Usable Income" — PALIG built the leak mechanic in 2012

```
Liability / Gross Income = 0.537
Liability / Take home    = 0.591
Usable Income %          = 0.409
Usable Income $          = 2,925
```

That is our leak, computed thirteen years ago by a T&T insurer. **The mechanic is validated, not novel** — which is reassuring rather than disappointing. Ours improves on it by deriving the number conversationally instead of demanding a filled form.

### 4. Years-to-payoff per loan → this drives the term ladder

PALIG tracks each debt with a balance, an end date, and a computed years-to-payoff:

| Debt | Balance | End date | Yrs to payoff |
|---|---|---|---|
| Credit Union | 1,500 | 2014-11-04 | 1.47 |
| Mortgage | 350,000 | 2016-01-21 | 2.68 |
| Tertiary Education | 50,000 | 2015-04-12 | 1.90 |

**This is the input the laddering engine (#11) needs.** Obligation declines on a known schedule as debts retire; the term ladder should step down to match. Our spec asserted laddering against "declining obligation" without saying where the decline schedule comes from. It comes from here.

### 5. A second, competing needs methodology

PALIG computes the insurance gap **top-down from net worth**:
```
Current Insurance Coverage :  350,000
Net Worth                  :  543,500
Over/Shortage              : -193,500     ← coverage − net worth
```

Tatil computes it **bottom-up from needs** (funeral + loans + income continuation − assets).

**These are different methods and they will disagree.** Rather than picking one, the engine should support both and show them side by side — two credible numbers with a stated basis is more honest than one number with a hidden method, and it's exactly the kind of transparency that beats eMoney's silent-assumption problem.

*(Caveat: insuring to net worth is closer to estate replacement than income replacement, and is arguably the weaker method. Present it as a cross-check, not a headline.)*

### 6. Real T&T taxonomy — use these labels verbatim

**Expenses:** Food/Clothing · Education · Entertainment/Travelling · **TSTT/WASA/T&TEC/CCTT** · Life Insurance Premiums · General Insurance Premiums · Property Maintenance Fee · Reg. Pension/Annuity · **Alimony/Maintenance** · NIS

**Debts:** Credit Union Loans · Bank Loan · Mortgage/Rent · **Tertiary Education Loans** · Vehicle Loan · **First Time Home Owners** · **Hire Purchase** · Credit Card Debt/Overdraft

**Assets:** Bank Accounts · Fixed Deposits · Private Stock Shares · Bonds · **Credit Union Shares** · Life Insurance (CSV) · Money Market Funds · **Income & Growth Funds** *(UTC)* · Retirement Savings (CSV) · Real Estate · **Real Estate – Time Share** · Vehicle · Furniture & Appliances · Machinery & Equipment

**Income:** Monthly Salary/Pension · **Mth tax-free special duty allowance** · Other Income

Hire Purchase, First Time Home Owners, Credit Union Shares, tax-free special duty allowance, and the TSTT/WASA/T&TEC/CCTT grouping have no US analogue. These are the labels a Trini recognizes.

### 7. Smaller items

- **Net worth quality bands** (Excellent 1M / Good 750k / Fair 500k / Poor 250k / Unacceptable 100k) — **2012 figures, need inflation adjustment before reuse.**
- **Three appointment dates** on the contact sheet — PALIG tracked *three* meetings where Guardian documents two. Worth confirming with practising agents which is typical.
- **Disclaimer language** worth adopting: *"The calculated results are intended for illustrative purposes only; accuracy is not guaranteed. Please consult a financial professional for advice."*
- Investment calculator: initial + monthly deposit + rate + months → FV. Straightforward compounding.

---

## Strategic: the founder materially de-risks the spec's #1 risk

The repo's README identifies the author as **a licensed insurance agent with 13+ years of retirement planning experience.**

Our spec named rate-catalog data as the single **High** risk — "outside our control," to be solved by finding a design partner who is also a data supplier. That partner is **the founder**:

| Spec need | Status |
|---|---|
| Design partner | In-house |
| First user | In-house |
| **Rate book source** | An agent has one |
| **Recommender of record** (registered agent) | Already registered with the CBTT |
| T&T domain expertise | 13 years |
| Distribution | **Five public SEO'd calculators already live** |

That last row deserves attention: the public calculators are an **existing top-of-funnel asset**. Someone computing their take-home pay or NIS pension is self-identifying as exactly the person who needs a needs analysis. That's idea #9 (public value) and lead-gen, already built and indexed.

---

## Actions

**Into `ParameterTables` (from repo, refreshed to 2026):**
PAYE brackets + personal allowance · NIS 16-class basic/increment table · 70% NIS deductibility · TT$60k combined cap · Health Surcharge bands · SCP means-test bands · 750-week threshold · min pension/grant · Section 134(6) · public servants' pension + gratuity

**Into `NeedsEngine`:**
- **Model NIS ⊕ SCP jointly**, including the means-test clawback and the four cliff edges — *this is a correctness fix, not an enhancement*
- Support both methodologies (Tatil needs-based headline, PALIG net-worth cross-check)
- Consume per-debt years-to-payoff as the ladder's decline schedule

**New component — `FinancialHealthScore`:**
PALIG's Quality Rater over the verified market-standard benchmark. The client's reward for doing the budget homework.

**Refresh before use:** every repo table (stale at 2016) · PALIG net-worth bands (2012)

**Confirm:** whether the sale is two meetings (Guardian) or three (PALIG)
