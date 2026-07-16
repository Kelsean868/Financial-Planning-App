# Parameter Verification — July 2026

**Method:** Deep research, 10 verification targets, 106 agents, 3-vote adversarial panels.
**Result:** 16 findings confirmed · 4 refuted · **roughly half the question unanswered**
**Date:** 2026-07-16

---

## 🔴 CRITICAL #1 — The repo understates every NIS pension by ~40%

**The single most significant defect found.**

The repo's per-class benefit rates match NIBTT's schedule **effective 7 January 2008** — exactly. They are **18 years obsolete.**

| | Repo (2008 schedule) | Current (eff. 5 Sept 2016) |
|---|---|---|
| **Class I** basic | TT$335.83/mo | **TT$566.72/mo** (130.78/wk) |
| **Class XVI** basic | TT$2,475.70/mo | **TT$4,079.40/mo** (941.40/wk) |

**~40% understatement at both ends of the scale.**

### Why this is worse than a stale number

Understating NIS pension → the client looks poorer in retirement → **the retirement gap is overstated** → the engine recommends **more product**.

**That is the self-serving direction.** On a suitability record the client signs, a systematic 40% understatement of their state pension is a mis-selling exposure — and it is precisely the "silent modeling error" failure we identified in eMoney (the Social Security setting that understated a client's benefit until the client challenged it). Same bug class, worse direction.

**Action: replace with the 2016 schedule before any retirement figure is shown to anyone.**

---

## 🔴 CRITICAL #2 — My SCP clawback claim did NOT survive verification

**I need to be straight about this.** I wrote into the spec that the engine "MUST model NIS ⊕ SCP jointly — this is a correctness requirement," called the clawback "our strongest insight," and proposed a headline for the retirement journey: *"Your NIS pension is worth $2,000, not $3,000."*

**Verification status:**
- The SCP 4-tier means-test schedule (≤2,500→3,500 · 2,501–3,500→2,500 · 3,501–4,500→1,500 · 4,501–5,500→500) was **REFUTED 1–2**. The only source located was a Central Bank working paper describing the bands as effective 1 January 2019.
- **The load-bearing question — does NIS retirement pension count as assessed income for the SCP means test? — is entirely UNANSWERED.**
- Age-65 requirement, residency requirements, and whether Budget 2026 changed anything: **all unanswered.**

**If NIS pension does not count as assessed income, there is no clawback and the insight is fiction.** I asserted it confidently on the strength of the repo's code. That was the same error the repo itself demonstrates: trusting an undated constant.

**Status: DOWNGRADED to an unverified hypothesis. Must be confirmed against the Senior Citizens' Pension Act (Chap. 32:02) and its regulations before anything is built on it — and certainly before it is said to a client.**

The hypothesis is still worth chasing: if true, it is a genuine differentiator. But it is not a finding.

---

## 🔴 CRITICAL #3 — The legal scope question is a total gap

Item 10, flagged as most important: **nothing was returned.** No TTSEC guidance, no Central Bank guidance, no commentary on whether BIR-approved deferred annuities fall within the Securities Act 2012 definition of "security."

**This is a gap, not a negative finding.** The volume of verified tax/NIS detail must not obscure that the highest-stakes question is unaddressed.

**Current evidential position on annuities-in-scope:**
- ✅ Founder (CBTT-registered agent, 13+ yrs): *annuities are part of the life licence*
- ✅ Consistent with Tatil's disclaimer and Round 2's finding that "investment advice" attaches to securities
- ❌ **No documentary corroboration found**
- ❌ No contradiction found either

Practitioner knowledge remains the **sole** evidence. That is reasonable grounds to proceed — it is not grounds to stop asking. Confirm with counsel before launch.

---

## ✅ CONFIRMED CURRENT — safe to encode

| Parameter | Value | Vote |
|---|---|---|
| Health Surcharge | TT$8.25/wk above TT$469.99/mo; TT$4.80/wk otherwise | 3–0 |
| **Health Surcharge exemptions** | **under 16 · 60 and over · only income is pension** | 3–0 |
| Combined deduction cap | **TT$60,000** — the MoF page's TT$30,000 is a stale 2009 figure that *conflicts with* current law | 3–0 |
| NIS contribution rate | **16.2%** eff. 5 Jan 2026 (from 13.2%), split ⅓ employee / ⅔ employer | 3–0 |
| NIS classes & ceiling | 16 classes (I–XVI). Class I: $867–1,472.99/mo, $43.80/wk total. Class XVI: **$13,600+/mo**, $508.50/wk ($169.50 ee / $339.00 er) | 3–0 |
| Pension formula | `basic + floor(excess/25) × increment` — structure confirmed | 3–0 |
| 750-contribution threshold | Confirmed: 750+ → lifetime pension; below → Retirement Grant | 3–0 |
| **Minimum retirement pension** | **TT$3,000/mo** eff. 1 Feb 2012 — a challenge claiming the minimum attaches to the *grant* not the *pension* was **REFUTED 0–3** | 3–0 |
| Retirement Grant | 3 × monetary value of contributions, min TT$3,000 | 3–0 |
| NIS reform scope | Changed **exactly two things**: rate (13.2→16.2→19.2) and retirement age (60→65, +1yr every 2yrs from Jan 2028, reaching 65 in **2036**). Did *not* touch the 750 threshold, increments, minimum pension, grant formula, or ceiling | 3–0 |

### The age-60 Health Surcharge exemption is material

A retirement-planning app that charges Health Surcharge to a 62-year-old is simply wrong. The repo's constants alone don't capture this — the exemptions are a separate rule.

*(Boundary note: IRD says "sixty (60) years and over"; one secondary source renders it "over 60." IRD's wording governs, but confirm against Health Surcharge Act Chap. 75:05. Do not cross-wire with the NIS "under 16 / 65 and over" rule — different levy.)*

---

## 🟡 NEW FOR 2026 — Finance Bill 2026, and it is only a Bill

**House Bill 12 of 2026**, laid 5 June 2026, passed the House 28–0 (13 abstentions). **Senate passage and Presidential assent could not be verified as of July 2026.**

- **New s.8(1)(ta):** exempts income from an **approved deferred annuity plan** (s.28) from income tax, effective 1 Jan 2026 — *conditional on* the annuity being purchased by a **T&T resident** and **maturing between ages 50 and 70**.
- **New s.8(1)(tb):** parallel exemption for approved pension fund plan income.
- **New s.18D deduction:** lower of **20% of total income or TT$20,000**.

This refines an earlier Round 1 finding, which stated the exemption more loosely. The **50–70 maturity window and residency condition are new constraints** with direct planning consequences — an annuity maturing at 71 would not qualify.

**Code as conditional on assent, with the retroactive 1 Jan 2026 effective date.**

**Negative evidence (valuable):** the Bill amends the Income Tax Act *only* via s.8, new s.18D, s.28(9), and new s.48O. It does **not** touch the personal allowance, PAYE rates/threshold, 70% NIS deductibility, the TT$60k cap, or s.134(6) — **nor** the National Insurance Act, the Senior Citizens' Pension Act, or the Health Surcharge Act. Any 2026 change to NIS/SCP/surcharge came from regulations or Orders, not this Bill.

---

## 🟡 PROVISIONAL — the 19.2% January 2027 rate (2–1)

The 19.2% figure rests on a **Ministry of Finance budget announcement plus arithmetic inference** (16.2 + 3), **not** on any NIBTT-published or gazetted earnings-class schedule. **The 2027 class tables do not yet exist in published form** — so any 2027 table is necessarily derived.

**Flag as PROVISIONAL in code. Do not present 2027 figures to clients as settled.**

---

## ⚠️ NIBTT site hygiene — never trust a single page

> The FAQ page (`cont_FAQs-rev.html`) **still states the 2016 rate of 13.2%** with no mention of 16.2% — yet the TT$13,600/month ceiling **on the same page is current.**

**One page, one right constant and one wrong one.** A codebase trusting any single NIBTT page wholesale will get some parameters right and others wrong — silently. This is the third independent proof of the parameter rule, alongside the government's stale TT$30k page and the repo's 2008 rates.

**Every parameter needs its own source URL, retrieval date, and review date. Per-parameter, not per-page.**

---

## ⚪ STILL UNANSWERED — do not mistake volume for coverage

| Item | Status |
|---|---|
| TT$90,000 personal allowance | **Negative evidence only** — the Bill doesn't change it, which does not establish it is right |
| 25%/30% PAYE bands, TT$1M threshold | **Negative evidence only** — same |
| **70% NIS deductibility** | **Entirely unverified** |
| **SCP — bands, age, residency, clawback** | **Refuted/unanswered** (see Critical #2) |
| Public servants' pension formula | Unverified. *Lead:* Finance Bill 2026 cll. 4–5 (Prison Service Act 5th Sch.; Police Service Regs reg. 183A — protective-services superannuation computed on acting-office salary) |
| **Annuities: Insurance Act vs Securities Act** | **Total gap** (see Critical #3) |

---

## Structural context worth keeping

NIBTT's **8th Actuarial Review** (published Sept 2012, valuation date 30 June 2010) recommended converting the earnings-class system to **career-average revalued earnings (CARE)** and — conditional on that — cutting the pension threshold from **750 to 260 weeks**. **Neither was implemented.** The 16-class structure, the basic/increment formula, and the 750-week threshold all survive the 2026 changes intact.

Useful for two reasons: it confirms the current architecture is stable, and it names the reform that would invalidate large parts of the engine if it ever lands.

---

## Actions

1. **Replace NIS per-class benefit rates with the 5 Sept 2016 schedule.** Blocking — no retirement figure ships until this is done.
2. **Downgrade the SCP clawback to an unverified hypothesis.** Confirm against the SCP Act (Chap. 32:02) + regulations. Do not build, and do not say it to a client, until confirmed.
3. **Add Health Surcharge exemptions** (under 16 / 60+ / pension-only).
4. **Add Finance Bill 2026 annuity exemption** — conditional on assent, with the 50–70 maturity and residency conditions.
5. **Flag 19.2%/2027 as PROVISIONAL.**
6. **Verify the unverified**: personal allowance, PAYE bands, 70% NIS deductibility — affirmatively, not by absence of change.
7. **Legal review** on the annuity scope question. Practitioner knowledge is sole evidence.
8. **Per-parameter provenance**: source URL + retrieval date + review date. Not per-page. The NIBTT FAQ proves why.
