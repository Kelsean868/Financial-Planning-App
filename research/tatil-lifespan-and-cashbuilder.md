# LifeSPAN (Critical Illness) + Cashbuilder (Universal Life)

**Sources:** tatil.co.tt product pages (scraped 2026-07-16) · Cashbuilder II (1992) & III (1995) product specifications
**Status:** LifeSPAN = **marketing pages only, "Conditions Apply"** — sample contract pending. Cashbuilder = **authoritative internal specs**.

---

# PART 1 — LifeSPAN · Critical Illness

⚠️ **Provenance warning: everything here is from public marketing pages, not a product specification.** The site states *"Conditions Apply."* Do **not** encode as engine rules until the contract is obtained. The gaps at the bottom are the ones that decide claims.

## LifeSPAN (full plan)

- **Lump sum up to $2,000,000** on diagnosis. Unrestricted use — treatment, mortgage payoff, early retirement.
- **23 critical illnesses covered:** Aorta Surgery · Bacterial Meningitis · Benign Brain Tumor · Blindness · **Cancer** · Coma · Coronary Artery Bypass Surgery · Deafness · Dementia incl. Alzheimer's · Heart Attack · Heart Valve Replacement or Repair · Kidney Failure · Loss of Independent Existence · Loss of Limbs · Loss of Speech · Major Organ Failure on Waiting List · Major Organ Transplant · Motor Neuron Disease · Multiple Sclerosis · Paralysis · Parkinson's and Specified Atypical Parkinsonian Disorders · Severe Burns · Stroke

### 🔑 FEMALE BENEFITS — the differentiator

> *"Female Insureds **automatically** benefit from an **additional 25% on the policy coverage** if diagnosed with any of these specific illnesses: **Breast Cancer** · Cervical Cancer · Ovarian Cancer · Cancer of the Uterus"*

**Automatic, not an optional rider.** A $500,000 policy pays **$625,000** on a breast cancer diagnosis.

**This is a genuinely differentiated, sex-specific benefit that no US planning tool models.** It is a first-class engine rule: for a female insured, the four named cancers carry a 1.25× multiplier. It also means **LifeSPAN strictly dominates LifeSPAN Lite for any female client whose concern is breast/gynaecological cancer** — the Lite plan makes no such provision.

### Other LifeSPAN benefits
- **Maternity Benefit** — after the policy has been in force **2 years**, free first-year coverage on a **$10,000** children's savings policy for a newborn. **Max 2 children per female insured.**
- **Refund of Premium (ROP)** — optional; refunds all premiums paid net of policy fees. Three variants: **ROP on death** · **ROP at maturity** · **ROP at either**.
  *Planning note: ROP reframes CI cover as "your money back if you never claim" — a real objection-handler for clients who resist paying for something they may never use.*
- **Total Disability Waiver of Premium** — optional; waives basic premium during total disability.

## LifeSPAN Lite

- **4 major critical illnesses only:** Cancer, Heart Attack, Stroke, Coma.
- **🔴 Waiting period stated explicitly:** *"Only a refund of premiums is payable if a claim is made in the first two years."*
- **Sum insured: min $75,000 · max $250,000.**
- **Issue ages:** Coverage to 60 → 20–50 · Coverage to 70 → 20–60.
- **Simplified issue** — *"A simplified application process with a few simple questions"*, **no medical exams**.
- **No female benefit mentioned.**

## LifeSPAN vs Lite — the engine's decision rule

| | **LifeSPAN** | **LifeSPAN Lite** |
|---|---|---|
| Conditions | **23** | 4 |
| **+25% female benefit** (breast/cervical/ovarian/uterine) | ✅ **automatic** | ❌ not mentioned |
| Maximum | **$2,000,000** | $250,000 |
| Minimum | — | $75,000 |
| Underwriting | standard | **none** — simplified, no medical |
| Waiting period | **not stated** | **2 years (ROP only)** |
| Maternity benefit | ✅ | ❌ |
| ROP | ✅ 3 variants | ❌ not mentioned |

**Rule:** Lite is for clients who **can't pass underwriting**, need **speed**, or for whom **$250,000 suffices**. Otherwise LifeSPAN — and for a female client concerned about breast or gynaecological cancer, **LifeSPAN is the answer**, because the 25% uplift is exactly the scenario.

## 🔴 UNVERIFIED — the questions that decide a claim

**These are not encodable and must come from the contract:**

1. **How is "Cancer" defined?** Nearly all CI policies exclude **carcinoma in situ** and early-stage disease. **DCIS (ductal carcinoma in situ) is among the most common breast cancer diagnoses** — so coverage may hinge entirely on staging language we have not seen. *This is the single most important unknown for the breast-cancer use case.*
2. **Does the +25% female benefit apply to in-situ diagnoses**, or only to the full covered definition?
3. **Survival period** — most CI plans require surviving 14–30 days post-diagnosis.
4. **Accelerated or additional?** Does the CI payout reduce a death benefit or pay on top?
5. **LifeSPAN's own waiting period** — Lite states 2 years; the LifeSPAN page is silent.
6. **Pre-existing condition exclusions.**
7. **Severity tiering** — do partial payouts exist for lesser diagnoses?
8. Issue ages, premium structure, commission (schedule shows age-banded 35/30/25/20 for "Lifespan"; Lite is 30/15/2.5).

**A client with DCIS discovering at claim time that they weren't covered is precisely the mis-selling failure this product exists to prevent.** Until the contract is read, the engine must present LifeSPAN's condition list as *marketing-sourced* and defer to policy wording.

**Also confirmed:** the Whole Life 2023 spec carries a **Critical Illness rider** (entry 17, max entry 50/55/60 for plans at 60/65/70) with an **ROP rider** refunding all premiums net of policy fees. **So CI is available both standalone (LifeSPAN) and as a rider** — a real structural choice the engine must model (riders are typically cheaper attached than standalone).

---

# PART 2 — Cashbuilder II & III · Universal Life

✅ **Authoritative — Tatil's own specifications.** These are the legacy UL policies the Policy X-ray will find on client books.

## Cashbuilder II (1992) — retail UL

> *"A Cashbuilder II Policy is a **Universal Life** type of insurance product. That is, it has both a life insurance portion and a fund portion. Premiums are actually paid into the fund portion and the fund earns interest which is **calculated and compounded daily**. The fund accumulates a cash value and **the expenses to cover the life insurance portion are paid from this cash value**."*

**✅ Confirms the UL knowledge base exactly** — fund/COI separation, COI deducted from cash value.

> *"At certain points… it is possible for a Policy owner to take a **'premium vacation'**, and let the cash value pay the expenses of the policy. In this way, the life insurance remains in force, even though the Policy owner is not paying premiums."*

**🔴 "Premium vacation" is the lapse mechanic, named in the vendor's own marketing language.** It's the flexibility that makes UL right for irregular income — *and* the exact feature that silently kills underfunded policies decades later, once COI has risen with attained age.

**Mechanics:**
- **Minimum Sum Insured $10,000, no maximum.** No age restriction. "Age Next."
- **MMP (Minimum Monthly Premium)** — *"the minimum monthly amount which will provide coverage for ten years and allow for a positive Accumulation after the Policy has been in force for two years."* **MMP is the anti-collapse floor, defined at issue.**
- **PPP (Planned Periodic Payment)** — what the owner agreed to pay; must be ≥ MMP and paid every mode for the **first two years**.
- **No modal loadings** — *"the annual minimum will be the monthly minimum premium multiplied by 12."* **Unlike every other Tatil product** (WL/Endowment/Rest Assured charge ~3% more monthly). A real cross-product inconsistency.
- **Maturity:** defaults to greater of **age 65** or **10 years from issue**; overridable subject to a 10-year minimum.
- **No female setback** for minimum premium calculations.
- **Medical ratings:** Table B–D → +100% (×1.0) · Table E–F → +150% (×1.5) · Table H → +200% (×2.0). Occupational/avocational flat extras convert to multipliers.

**Riders:** AD (max 2× SI or global limit; expires 65; ages 15–60; **$1.25 per thousand**) · **AD&D** (max 2× SI or $150,000, whichever less; expires at anniversary preceding 60th birthday; **$1.70 per thousand**) — **AD and AD&D mutually exclusive** · TDWP · **WPDDP** (waiver on death/disability of *payor* — for policies where someone else pays, e.g. a parent) · **DIR (Disability Income Rider)** — *$1,000/month per $100,000 SI; issue 20–55; expires at 60; **6-month elimination period***.

**Commission mechanics (unusual and important):**
- Commissions are **advanced**, then worked down by actual premiums.
- **Lump sums pay "as-earned"** — they do not work down the advance, and are *"commissionable at a reduced rate."*
- *"If a policy was previously lapsed or 'technically lapsed' in the first year **all projected commissions would have been clawed back**."*
→ **"Technically lapsed" is a named state.** This is the chargeback mechanic that makes lapse prevention (#4) an agent's economic self-interest, not just good service.

## Cashbuilder III (1995) — corporate deferred compensation

> *"This is a **Universal type product** and closely resembles the Cashbuilder II plan… The policy is a **deferred compensation plan and is subject to Section 134(6A) of the Income Tax Act**."*

**🔑 This is what s.134(6) is for** — the section that appeared in the tax research with no explanation. It's the **corporate deferred-compensation** regime.

- **Employer-owned, on the life of the employee, for the employee's benefit.** Employer pays.
- **Each policy must be BIR-approved before issue.**
- **🔴 Cannot be borrowed against, assigned, or surrendered** (BIR conditions for deductibility). Deregistration may be applied for; if granted, surrender is possible *"for its accumulated value less any applicable tax and charges."*
- **Death benefit = sum insured + net accumulation (if positive).**
- Min SI $10,000, no max. Issue ages **18–55**.
- **Maturity: normally 65; ages 51–70 considered.** Income *"may commence not earlier than age 50 and not later than age 70."* — **the 50–70 window again, in a 1995 document.**
- **Grace 30 days. Planned premium must be paid in year 1; thereafter the accumulation must be positive to keep the policy in force.**
- Minimum monthly premium **$100** (spec) / **$250** (brochure — *a discrepancy, unresolved*), with a full **age × sum-insured minimum-premium grid** (18–30 / 31–40 / 41–50 / 51–55 × $10k–$950k bands).

### 🔴 THE TAX RULE IS DIFFERENT — and this matters

> *"The maximum premium is **one-third of the chargeable income** of the employee."*
> *"The entire premium payable in any year including any lumpsum payment is eligible for tax relief and this together with other tax savings plans must **not exceed 1/3 of assessable income**."*

**This is NOT the TT$60,000 combined cap** (s.28(15)). Section 134(6A) deferred compensation appears to run on a **one-third-of-income** limit instead.

⚠️ **But this is a 1995 document.** Whether the 1/3 rule survives, and how it interacts with the modern TT$60,000 cap, is **unverified and must not be assumed**. It is, however, a strong lead: if s.134(6A) really allows one-third of income, it is a **far larger allowance for high earners** than $60k — and the engine's envelope optimizer (#6) would be materially wrong to ignore it.

### Retirement options
(a) full pension on fund balance · (b) **25% tax-free cash lump sum + reduced pension on 75%** · (c) guarantee period **5/10/15 years**.
**At resignation:** likely surrendered, subject to BIR approval. **At retirement:** up to 25% of Gross Accumulation in cash, reduced income from the remaining 75%.
**Death before retirement:** sum insured + fund balance paid **to the employer** for the beneficiary's benefit; lump sum or annuity on survivor's life.

### 🔥 THE ILLUSTRATION-RISK SMOKING GUN

> *"Interest will be credited at the beginning of each monthly anniversary. **The rate for 1994 and 1995 is 10.5%.**"*
> *"During the deferred period tax free interest will be credited to your account annually and this sum is guaranteed thereafter. **The guaranteed rate is 4%**, but **substantially higher rates have been credited to similar plans over the past five years**."*

**This is the vanishing-premium scenario, documented in the product's own literature.**

- Sold in 1995 crediting **10.5%**, guaranteed **4%**.
- *"Substantially higher rates have been credited… over the past five years"* — the exact optimistic-illustration framing that produced the General American settlement (~251,000 policyholders, US$55M).
- **And the collapse mechanic is explicit:** *"thereafter, the accumulation must be positive to keep the policy in force."*

**A Cashbuilder III written in 1995 on a 10.5% assumption, now crediting nearer its 4% floor, with COI rising every year on a life now ~30 years older, is a textbook candidate for silent collapse.** The [UL knowledge base](product-knowledge-base.md) hypothesised this; the spec confirms the ingredients.

**→ This is the Policy X-ray's highest-value target.** Find every Cashbuilder on a client's book → request an in-force illustration → identify the ones projected to lapse. Real service, real review trigger, and something **no US tool will ever do for a Tatil Cashbuilder.**

## Still unverified on Cashbuilder
- **COI rate tables** — the specs describe the mechanic but don't publish the rates.
- **Option A vs Option B** (level vs increasing death benefit) — CBII says death benefit = SI + net accumulation, which *resembles* Option B (fund on top of face). If so, **extra funding does NOT reduce COI** — the [knowledge base](product-knowledge-base.md) trap. **Needs confirmation.**
- Current credited rates vs the 4% guarantee.
- Expense charges (CBIII: *"identical to the Cashbuilder II"* — CBII's are in the 59-page spec, not yet extracted).
- Whether the s.134(6A) one-third rule is still current.
- Cashbuilder I (referenced as "CBI") — a further legacy generation.
