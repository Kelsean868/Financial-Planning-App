# NIS Training Transcript — Authoritative Findings

**Source:** `NIS Training.mp4` (June 2022) + Whisper transcript — NIBTT training session, an officer answering questions live.
**Date analysed:** 2026-07-16
**Status:** This is the closest thing to a primary source we have on *methodology*. It resolves the project's biggest open question.

---

## 🟢 RESOLVED — averaging is WHOLE WORKING LIFE, not the last 7 years

The NIBTT officer, verbatim:

> **"the manner in which we calculate the averages. Do you guys understand that it's *not based on your last value of contributions, but your average value throughout your lifetime*?"**

And again, explaining the mechanics:

> "even though they paid in this class last, **the average throughout their lifetime would be probably less**… That's the average of their entire contributions. Once we find the average, 750 pays them this… And then every extra 25 beyond 750 pays them one of this… **the average contribution value throughout their entire life from beginning to end** of the periods that they paid contributions."

**Conclusion: the repo is CORRECT.** `averageLifetimeMonthlyEarnings = totalLifetimeIncomeSum / totalContribMonths` implements exactly what NIBTT describes. My flagged concern — that whole-life averaging might understate a rising earner's pension — was **unfounded as a bug**. It understates relative to final salary, but that is *the actual rule*, not an error.

### Where the "7 years" memory comes from — it's real, but it's a different rule

The transcript shows **"7 years" is a QUALIFYING condition, not an averaging window**:

> "the next contribution requirement… **in the last seven years, you must have been employed for at least five of the last seven years**. That is the second qualifying condition for contributions."

**The three qualifying conditions** (from the transcript):
1. **150 total contributions, with 50 in the last 3 years**, or
2. **employed 5 of the last 7 years**, and
3. **750 contributions minimum** for a *pension* — "and it doesn't matter when, throughout your lifetime, you would have accumulated this."

So: **7 years gates eligibility. Lifetime averaging sets the amount.** Two different rules, easily conflated — and the engine must implement both, separately.

---

## 🟢 RESOLVED — retirement pension uses the invalidity rate table

> "Now that you have seen the **invalidity benefit rates** and I've told you that **the retirement pension is identical to that**, now you're aware that you can get increments once you cross that 750."

Confirms the single shared benefit-rate table and the increment mechanic (`+1 increment per 25 contributions over 750`). Also confirmed: **you cannot stop paying NIS once you pass 750** — "it's mandatory." NIBTT offers **23 benefits**; retirement pension is one.

---

## 🔴 THE FOLDER'S THREE MARKDOWN FILES CONTRADICT EACH OTHER

This is the parameter-drift lesson again, this time inside our own working notes. **Three files, three different answers for the same question:**

| Source | Class XVI / high earner monthly pension |
|---|---|
| `NIS Pension Calculation Research.md` (50%-of-earnings method) | **$6,799** |
| `NIS Pension Amounts - Corrected.md` (titled "Corrected") | **$5,500** |
| `NIS_Research_Findings.md` ("estimated") | **$10,000–12,000** at $25k salary |
| **Repo `PENSION_RATES`** (undated, 2008 schedule) | **$2,475.70** + increments |
| **NIBTT current schedule** (eff. 2016-09-05, from verification) | **$4,079.40** + increments |

**Five sources, five different numbers, spanning ~5×.** None of the three markdown files matches the repo, and none matches the verified NIBTT 2016 schedule.

### What's actually going on

- `NIS Pension Calculation Research.md` **derives** pension as "**approximately 50%** of assumed average weekly earnings" — its own text says *"the pension **appears to be** approximately 50%"*. **That is an inference, not a rule.** The transcript describes a *lookup table* of basic rates + increments, not a 50% formula.
- `NIS Pension Amounts - Corrected.md` presents a salary→pension band table with **no methodology and no source**. Titled "Corrected", which implies authority it doesn't document.
- `NIS_Research_Findings.md` explicitly labels its numbers **"estimated"** and its high-earner figures (~$10–12k) are implausible against a Class XVI basic of ~$4,079.

**None of these should be encoded.** The authoritative chain is: **NIBTT published benefit schedule (dated) → basic + increments per class → lifetime-average class lookup.** The 50%-derivation is a reconstruction that happens to be in the right ballpark for mid classes and wrong at the edges.

### The one useful confirmation in them

`NIS Pension Calculation Research.md` independently states: *"The pension calculation is based on the average of ALL contributions throughout the working life, not just recent earnings"* — **agreeing with the transcript.** Two independent sources, same conclusion.

---

## 🔴 The repo's `PENSION_RATES` problem is now precisely diagnosed

Not "obsolete" as my earlier verification claimed — **mismatched**:

- `HISTORICAL_EARNINGS_TABLES` (12 dated snapshots, 1972→2016) — **correct by design**, era-selected via `getTableForDate()`, exactly as the founder explained. Contributions are computed at the rates in force when paid.
- `PENSION_RATES` — **one table, no date, no comment**, holding 2008-schedule values, while classification uses the 2016 earnings table.

**So the code classifies against 2016 bands and pays at 2008 rates.** That's a genuine internal inconsistency regardless of which schedule is right.

**Action:** date the `PENSION_RATES` table, source it to a published NIBTT benefit schedule, and confirm whether benefit rates are also era-selected (i.e. does a person retiring in 2026 get the 2016 schedule, or the schedule in force at each contribution's date?). The transcript implies a *current* schedule applied to a *lifetime-average class* — one benefit table, applied at claim time — but this needs confirmation.

---

## The earnings-class table (2016, eff. 5 Sept 2016) — corroborated

The folder's class table matches the verified NIBTT data exactly (Class I $867–1,472.99 / assumed AWE $270; Class XVI $13,600+ / AWE $3,138). Note the folder shows **weekly contributions at the 13.2% rate** (Class I $35.70, Class XVI $414.30); the **2026 rate is 16.2%** (Class XVI now $508.50/wk), so those contribution columns are superseded while the *bands and assumed AWE* stand.

**Ceiling insight worth surfacing to clients:** earnings above **$13,600/month** still contribute at Class XVI **but do not increase the pension**. High earners hit a hard benefit ceiling — a strong, honest argument for private retirement provision, and it comes straight from the rules rather than from a sales pitch.

---

## Still open

1. **Are benefit rates era-selected or claim-date?** (see above) — determines whether `PENSION_RATES` needs 13 dated versions like the contribution tables, or one current one.
2. **The exact current NIBTT benefit schedule**, dated and sourced. Verification says Class I $566.72 / Class XVI $4,079.40 (eff. 2016-09-05). Confirm against the NIBTT benefit-rates page or a published Order.
3. **SCP means-test bands** — the transcript covers NIS, not the Senior Citizens' Pension. Still unresolved.
4. The video may contain more (the transcript is 18,856 words); it mentions **23 benefits**, funeral grants, survivors', maternity, sickness, injury — worth mining when those needs enter scope.
