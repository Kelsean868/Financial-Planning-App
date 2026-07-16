# NIBTT Benefit Rates — FINAL, and a correction of my correction

**Date:** 2026-07-16
**Status:** 🔴 **This supersedes [nibtt-authoritative-rates.md](nibtt-authoritative-rates.md), which is WRONG and must be read only with this document.**

---

## What happened, in order

1. **Verification research** said the repo's benefit rates were the 2008 schedule, that a **2016 schedule exists** giving **Class I = 566.72 / Class XVI = 4,079.40**, and that the repo therefore understates pensions by ~40%. Vote: **3–0**.
2. **I scraped** `nibtt.net/benefits_09/tables/retire_invalidity_rates.htm` — the table NIBTT's own retirement pages link to — found **"Effective Date: January 07, 2008"** with values matching the repo exactly, found no newer table on the benefit-rates index, and **declared the research a fabrication.** I wrote a document about it and lectured about methodology.
3. **The founder pointed me at the rates section.** Following it, I found:
   **`nibtt.net/Contribution_Rates/Benefit_rates_retire_and_invalid_sep2016.html`**
   → **"Basic Retirement and Invalidity Pension Rates 2016"**, effective **5 September 2016**:
   **Class I = 566.72 · Class XVI = 4,079.40.**

**Those are precisely the figures the research reported. It was right. My "fabrication" accusation was false, and I should not have made it.**

---

## The actual state of NIBTT's site

**NIBTT publishes retirement/invalidity benefit rates in two places, with different values, and does not reconcile them:**

| Location | Title | Class I | Class XVI | Status |
|---|---|---|---|---|
| `/benefits_09/tables/retire_invalidity_rates.htm` | "Retirement and Invalidity Pension Rates" · **eff. 2008-01-07** | 335.83 | 2,475.70 | 🔴 **STALE** |
| `/Contribution_Rates/Benefit_rates_retire_and_invalid_sep2016.html` | "Basic Retirement and Invalidity Pension Rates **2016**" · **eff. 2016-09-05** | **566.72** | **4,079.40** | ✅ **CURRENT** |

**The trap:** NIBTT's *Benefits* section — the natural place to look, and the one its own Retirement Benefit pages link to — serves the **stale 2008 table**. The **current 2016 table lives under `/Contribution_Rates/`**, a section a reader would reasonably assume is about contributions, not benefits.

The 2016 page also reveals a **full benefit-rate history** (2016 · 2014 · 2013 · 2012) that the Benefits-section index does not show. So benefit rates *are* revised periodically — my claim that "NIBTT has published no benefit table since 2008" was **false**; I simply never found the index that lists them.

---

## 🔴 Therefore: the repo IS outdated, by ~40%

`PENSION_RATES` (335.83 … 2,475.70) is the **2008** table. The current values are **566.72 … 4,079.40** — roughly **69% higher**.

**And the direction is the dangerous one**, exactly as the original research warned: understated NIS pension → client looks poorer in retirement → **overstated retirement gap → engine recommends more product.** On a suitability record the client signs. **This is a real mis-selling exposure and it must be fixed before any retirement figure ships.**

---

## What I got wrong, and why it matters

I made three errors, each compounding the last:

1. **I searched one branch of the site and concluded the whole site.** The benefits index doesn't link the 2016 tables; the rates index does. One missing link produced total confidence in a wrong answer.
2. **I mistook "I could not find it" for "it does not exist"** — and then wrote that as a finding.
3. **I accused a correct source of fabricating.** The most serious error. The research had the right numbers *and the right effective date*; I couldn't locate them, so I assumed invention.

The bitter irony: I used that false conclusion to write a methodology lecture — *"a unanimous vote is not truth," "scrape the issuer,"* *"when verification contradicts a practitioner, go to source."* **The lecture was right. I was the one who failed it.** I scraped one page of the issuer's site and treated it as the issuer's position.

**The correct rule, learned properly this time:** *scraping is not verification either.* A single page is a sample. When a number is disputed, find **every** page the issuer publishes it on and reconcile them — because agencies contradict themselves, and NIBTT demonstrably does.

---

## Increments — the pattern, found (founder was right: chase the invalidity table)

**NIBTT publishes each revision showing only what CHANGED, on a separate dated page.** The retirement pension and invalidity benefit share one rate table throughout — confirmed by the training transcript (*"the retirement pension is identical to that"*) and by every table being titled *"Rates of Retirement and Invalidity Pension"*.

| Table | Effective | Publishes | Class I | Class XVI |
|---|---|---|---|---|
| `benefits_09/tables/retire_invalidity_rates.htm` *(and `-1` variant)* | **2008-01-07** | **basics + increments** | basic 335.83, **incr 4.90** | basic 2,475.70, **incr 46.76** |
| `benefits_09/tables/2013/retire_invalidity_rates.htm` | **2013-03-04** | **increments ONLY** | **incr 6.11** | **incr 56.33** |
| `benefits_09/tables/2014/Invalidity-Benefit.htm` *(+ Benefit Tables PDF)* | **2014-03-03** | **basics ONLY** | basic 419.79 | basic 2,983.76 |
| `Contribution_Rates/Benefit_rates_retire_and_invalid_sep2016.html` | **2016-09-05** | **basics ONLY** ("New Basic Pension") | **basic 566.72** | **basic 4,079.40** |

**The basics progression is clean and confirms the repo is stale:**
Class I monthly — **335.83 (2008–13) → 419.79 (2014) → 566.72 (2016)**
Class XVI monthly — **2,475.70 (2008–13) → 2,983.76 (2014) → 4,079.40 (2016)**
*(The 2014 PDF prints 2013 and 2014 side by side, and its 2013 column equals the 2008 table exactly — proving the 2008 rates ran through 2013.)*

**The increments progression: 4.90 (2008) → 6.11 (2013) → ?**

### The honest position on current increments

**No 2016 increment table is published.** Two readings, and I will not pick one by inference:

- **(a) 2013 increments still stand** — the 2013 revision changed increments, the 2014 and 2016 revisions changed only basics. Under this reading, current = **basics 2016 + increments 2013** (Class I 566.72 + 6.11; Class XVI 4,079.40 + 56.33).
- **(b) increments were revised in 2016 but not published on the site** — plausible given that the *current* basics table sits in the Contribution_Rates section while the Benefits section still serves 2008.

Reading (a) is the more natural fit for the "publish only what changed" pattern, **but this project has now twice been burned by a plausible inference.** ⚠️ **This must be confirmed with NIBTT directly, or from the Legal Notices (25–30) under `Amendments/NIBTTAct_amend.html`, before the pension formula ships.**

---

## 🟢 Class Z — confirmed from source (founder was right)

From `Contribution_Rates/rates.html`, Rate Amendments section, verbatim:

> "Contributions payable by an employer in respect of **employment injury coverage** for an employed person who has **not yet attained the age of 16 years** or **who is in receipt of retirement pension** or **who has attained the age of 65 years** shall be as set out in **Class Z**, or for an unpaid apprentice shall be **$1.00 per week**."

**Exactly as the founder described** — a retiree drawing NIS pension who returns to work pays the reduced Class Z rate. Three additions from the source: it also covers **under-16s** and **anyone 65+**; it is **employer-paid**; and it buys **employment-injury cover only** — which is *why* it's ~5% of a full contribution: no further retirement benefit accrues.

**The Class XVI anomaly is a site typo.** Class Z is exactly **5.00%** of the total weekly contribution for classes I–XV (XV: 20.00 / 399.90). Class XVI should be `414.30 × 0.05 = **20.72**`; the page prints **220.72** — a stray leading "2". *Encode 20.72, flag the discrepancy, do not propagate NIBTT's typo.*

## Also found: pre-1999 class restructuring

For very old contribution records, classes were remapped (`rates.html`, Rate Amendments):
- **Benefit periods 1980-08-11 → 1999-05-02:** old classes 1–4 → new Class 1; 5→2; 6→3; 7→4; 8→5; classes 6–16 are new.
- **Benefit periods before 1980-08-11** (from 1999-05-03): old classes 1–6 → new Class 1; 7→2; 8→3.

Relevant to any client with contributions before 1999 — i.e. anyone retiring now with a long career.

---

## Actions

1. 🔴 **Update `PENSION_RATES` to the 2016 basics** (566.72 … 4,079.40), date it `effective 2016-09-05`, cite `Benefit_rates_retire_and_invalid_sep2016.html`. **Blocking for any retirement output.**
2. 🔴 **Resolve the increment values** before the pension formula is trusted.
3. **Re-check every "confirmed from source" claim in this project that rests on a single page.** At minimum, the SCP bands (single Ministry page) deserve a second source.
4. **Correct the record** in [nibtt-authoritative-rates.md](nibtt-authoritative-rates.md) and [parameter-verification-2026-07.md](parameter-verification-2026-07.md).

---

## What survives from the discredited document

Two findings there were independently sourced and still stand:

- **The architecture** — contributions era-selected, benefits keyed to qualification date (*"for persons qualifying on or after…"*). The repo's shape is right; only the values are stale. **Note this now cuts the other way too:** a *history* of benefit tables exists, so whether a claimant gets the schedule in force at qualification (2016) is confirmed — the repo needs the current table, not a table series.
- **The $3,000 minimum's significance is REDUCED but not eliminated.** Under the 2016 basics, classes **XIII–XVI now exceed $3,000** without increments (3,256.50 · 3,607.50 · 3,938.00 · 4,079.40). Under 2008 values *every* class was below it. So the "top earner needs 20 years just to beat the floor" claim is **FALSE under current rates** and must be struck. The minimum still binds for classes I–XII, which is most contributors — but the dramatic framing was an artifact of the stale table.
