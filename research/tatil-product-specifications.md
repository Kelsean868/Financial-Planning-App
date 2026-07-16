# Tatil Product Specifications — from the actual spec documents

**Sources:** `Product Training and Specifications` folder (Tatil Life internal product specification documents) + tatil.co.tt
**Date:** 2026-07-16
**Status:** 🟢 **The highest-quality product source in the project.** These are Tatil's own technical specifications — not marketing, not inference. They supersede the US/generic material in [product-knowledge-base.md](product-knowledge-base.md) for anything Tatil-specific.

---

## 🔥 THE HEADLINE — Destiny's commission structure is a live conflict of interest

The Destiny spec (`TL Individual Retirement Solution — 2023`) publishes both the fund guarantees and the commissions. Put them side by side:

| | **Option 1** | **Option 2** | **Option 3** |
|---|---|---|---|
| Risk profile | Moderately Low | Moderate | Moderately High |
| **Guaranteed minimum interest** | **2% pa** | **1% pa** | **0% pa** |
| Equities allocation | ≤20% | ≤30% | ≤40% |
| Government bonds | ≤55% | ≤45% | ≤25% |
| **Year-1 commission** | **5%** | **12%** | **12%** |
| Year 2 | 3% | 5% | 5% |
| Year 3+ | 1% | 0.25% of fund | 0.25% of fund |

**The agent earns 2.4× more first-year commission for placing a client in a fund with a LOWER guaranteed minimum.** Option 1 guarantees 2% and pays 5%. Option 3 guarantees **nothing** and pays 12%.

**This is the commission firewall's justification, in the vendor's own numbers.** It is no longer a hypothetical about whole life vs term — it's a quantified incentive to move clients into products with weaker guarantees, inside a single product line. Any engine that can see commission will drift toward Option 3. **The firewall is not optional.**

---

## Destiny — Individual Retirement Solution *(the retirement engine's core product)*

**Product overview, verbatim:** *"This is a Universal Life product, with a fund portion only, and no insurance component. The product entails no premium loadings such that any payments made by the policyholder fully contribute to the value of the interest-earning fund component. This is in contrast to the prior product, where premiums, net of front-end loadings, were paid into the fund."*

- ✅ **Confirms UL is the chassis** — Destiny is UL-with-no-insurance, i.e. a pure accumulation vehicle.
- ✅ **No front-end loadings** — a genuine improvement over the predecessor, and a real selling point.
- **Variants:** Individual / Corporate × Registered (BIR) / Unregistered. *Corporate is Registered-only.*

**Issue ages:** Registered **18–60** · Unregistered **1–65**

**🔑 Maturity ages — the product enforces the tax law:**
- **Registered (BIR): 50, 55, 60, 65, 70**
- Unregistered: 50, 55, 60, 65, 70, **75, 80, 85**

**This is a major finding.** The Registered maturity options are *exactly* the 50–70 window: **50 is the statutory floor** (an approved plan cannot mature earlier) and **70 is the Finance Act 2026 exemption ceiling**. So a Registered Destiny **can never fall outside the exemption window — the product design guarantees it.** My earlier spec rule ("warn if maturity > 70") is therefore *structurally impossible* on a Registered policy. It still matters for the **Unregistered** variant, which can mature at 75/80/85 — but unregistered plans aren't BIR-approved and never qualified for s.8(1)(ta) anyway. **The real engine rule is: Registered vs Unregistered is the decision that determines tax treatment, not maturity age.**

**Premiums:** Minimum monthly **$200** (discretion to accept lower). Minimum lump sum: Registered $500 individual / $1,000 corporate; Unregistered $500.

**Interest crediting:** *"credited based on historic performance of the notional fund... net of a predetermined investment margin spread of **200 basis points**. The investment margin spread would cover all administrative and commission expenses."*
→ **The client pays a 2% annual spread**, and that spread funds the commission. Worth stating plainly: on Option 3 (0% guarantee), a year returning under 2% gross credits **zero**.

**🔴 Surrender charges — brutal, and a first-class lapse risk:**

| Policy year | 1 | 2 | 3 | 4 | 5 | 6+ |
|---|---|---|---|---|---|---|
| **Surrender charge** | **80%** | **60%** | **40%** | **20%** | **10%** | **5%** |

*"Net proceeds for approved deferred annuities would be subject to any taxes applicable at time of surrender."*

**Compounding:** surrender a Registered Destiny in year 1 → **lose 80% to the surrender charge, then 25% tax on what's left.** A client surrendering year-1 recovers roughly **15% of their accumulation**. This is the single most important disclosure in the product, and it belongs in the suitability record.

- **Partial withdrawals:** ❌ **not allowed on BIR-approved policies.** Unregistered: up to 90% of cash value.
- **Death benefit:** the Accumulation.

**Maturity benefits:**
- Annuity for life, at the **Schedule of Guaranteed Annuity Rates** *or* current rates **if greater** (a genuine floor — worth surfacing).
- **Guaranteed periods: 5 / 10 / 15 years. Default = 10-year** unless the policyholder elects otherwise ≥1 month before maturity.
- **Spousal benefit:** 50% or 100% of the monthly annuity, payable after the guaranteed period expires.
- **Registered: max 25% of accumulation as a TAX-FREE lump sum**; remainder becomes a "Reduced Pension".
- Small-annuity commutation: if monthly annuity < **$500** (Registered) or < **$3,000** (Unregistered), the whole accumulation may be taken as a lump sum.
- **Rider:** Total Disability Waiver of Premium (ATDWP 6). Term coverage available on **Unregistered only**.

---

## Platinum Edge — *the open question, answered*

**Verbatim:** *"registered as an **unapproved deferred annuity** with an embedded **Accidental Death Benefit**."*

So Platinum Edge is **not** the permanent-life product I guessed from its 0.5% commission — it's a **single-deposit accumulation account**, and the low commission now makes sense.

- **No underwriting.** Issue ages **1–99** (age next).
- **Deposits:** initial min **$50,000**, max $1,000,000; additional min $1,000, max $1,000,000/year.
- **Expense charges: NONE** — *"There are no expense charges. However, the company reserves the right to introduce such charges in the future following prior notice."*
- **Interest:** credited annually, company-determined, **floor of 2.5% pa** — *"In no event will the rate of interest be less than 2.5% per annum, and once interest has been credited, the net accumulation is guaranteed."* **Ratchet: credited interest locks in.**
- **Withdrawals:** min $5,000; must leave ≥$5,000; **max 1 per policy year**.
- **Death benefit:** net accumulation **+ Accidental Death Benefit**.
- **Maturity:** the net accumulation.

**Net accumulation formula:** `initial deposit − withdrawals/charges + additional deposits − expense charges + interest`

**Engine note:** Platinum Edge's **2.5% guaranteed floor beats every Destiny option** (2% / 1% / 0%) — but it's **unapproved**, so no TT$60k deduction and no s.8(1)(ta) exemption. **That is a real, non-obvious planning trade-off the engine can surface: guaranteed rate vs tax treatment.** Nobody's US tool has this comparison.

---

## Single Premium Immediate Annuity (SPIA) — *new product, not in the commission schedule*

- **Single premium → immediate monthly pension.** Minimum premium **$50,000**.
- **Issue ages (age next):** minimum **51 standard / 31 ill-health**; maximum **71 Registered / 91 Non-Registered**.
  - *The ill-health minimum of 31 implies impaired-life annuity underwriting — a real planning tool for a client with reduced life expectancy.*
- **No underwriting requirements.**
- **❌ Cannot be surrendered in whole or in part. No loans.** Irreversible — the strongest possible reason for an affordability check before sale.
- **Guaranteed periods:** 5 / 10 / 15 years.
- **Spousal benefit:** 50%, 60%, **66⅔%**, or 100%.
- **Commission:** Tatil agents **1.5%** · Brokers **0.5%** · Direct Sales **0.0%**.

**This is the decumulation product** — it converts a Destiny maturity (or any lump sum) into lifetime income. **Destiny → SPIA is the complete retirement arc**, and the engine should model it as such.

---

## Whole Life 2023

- **Non-participating** — *"This product does not participate in profit sharing."* **No dividends/bonuses.** Important: never illustrate this like a par whole life.
- **Plans:** Whole Life + Limited Pay 10/15/20/25/30 yr, and Limited Pay to age **55 / 60 / 65**.
- **Issue ages:** min 15. Max **70** (WL and all year-based limited pay); **45** for LP-to-55, **50** for LP-to-60, **55** for LP-to-65.
- **Sex distinct AND smoker distinct.**
- **Premium banding (4 bands):** $65,000–149,999 · $150,000–499,999 · $500,000–1,999,999 · $2,000,000+
- **Policy fee $360/yr. Minimum annual premium $1,800.**
- **10% staff discount** — ANSA McAL group.

**Commission by premium-paying duration** *(more granular than the commission schedule)*:

| Policy year | Life; 25–30 yr | 20–24 yr | 15–19 yr | 10–14 yr |
|---|---|---|---|---|
| 1 | **60%** | 50% | 40% | 30% |
| 2 | 15% | 15% | 15% | 15% |
| 3 | 10% | 10% | 10% | 10% |
| 4–10 | 5% | 5% | 5% | 5% |
| 11+ | 2.5% | 2.5% | 2.5% | 2.5% |

**⚠️ A shorter pay period halves the first-year commission** (30% at 10–14yr vs 60% at life/25–30yr) — so the agent is paid *least* for the limited-pay structure that often suits the client best (premiums retired before retirement). **Another firewall justification.**

**Overrides — new, and load-bearing for the agency sale:**
- **Managers:** 12% first-year override of Annualized Premium Income for directly supervised agents; 5% for agents under a supervisor; 10% renewal override.
- **Supervisors:** 12% first-year; 10% renewal.
- *"It is noted that **85% of agents report directly to a Manager**. This has been reflected in the pricing of the products."*
→ **The agency hierarchy is priced into the product.** This is why the buyer is the agency, not the agent.

**Riders:** Waiver of Premium (max issue 50, expires 60) · Accidental Death (≤2× base, cap $500k, max issue 55, expires 65) · AD&D (same limits; **mutually exclusive with AD**) · Term coverage · **Critical Illness** (entry 17–50/55/60 for plans at 60/65/70) · **Refund of Premium** on the CI rider.

**Loans:** need positive net cash value + **3 full years** premiums; max **90% of Net Cash Value**; **10% interest**, changeable at will.
**Automatic Premium Loans (APL):** premium unpaid 30 days + positive net cash value → charged as a loan at 10%. If insufficient, coverage pro-rates and **lapses**.
**Lapse:** processed **62 days** after due date; notice at **31 days**.
**Reinstatement:** within **3 years**, underwriting approval.
**Reduced Paid-Up:** after 3 years with positive net cash value; minimum reduced coverage **$2,000**.
**Reinsurance:** treaty A005-99; retention $500k/life; YRT basis; expires at age next 100.

---

## Rest Assured 2024 (Final Expense)

- **Coverage for life; paid-up at 100**, and the coverage amount is payable at age 100 if active.
- **No underwriting.**
- **Coverage: min $30,000 · max $150,000 — and the $150,000 cap is AGGREGATE across all the insured's policies.** (A hard engine constraint.)
- **Plans / issue ages:** Pay to 60 (20–50) · to 65 (20–55) · to 85 (20–75) · to 100 (20–80).
- **Gender distinct; NOT smoker distinct.** No policy fee.
- **❌ No cash value at all** — no loans, no APL, no surrender, no reduced paid-up.

**🔑 The graded death benefit, exactly specified:**

| Policy year | Insured amount |
|---|---|
| 1 | **Return of premiums only** |
| 2 | **Max of** (25% of sum assured, return of premiums) |
| 3+ | **100% of sum assured** |

**Accidental death pays the full sum insured at any duration.**

This confirms the knowledge-base rule with real numbers: **never present Rest Assured as first-day full cover.** The engine must show the graded schedule.

- **Commission:** 30% / 15% / 2.5%+. **Reinstatement: 6 months only** (vs 3 years for Whole Life).

---

## Endowment 2024 (ENDXX6)

- **Non-participating.** Terms: **15 / 20 / 25 / 30 years** (durational only).
- **Issue ages:** min **1** for all. Max **70** (15yr) · **65** (20yr) · **60** (25yr) · **55** (30yr).
  - *Max issue age steps down with term — every plan matures by ~85.*
- **Minimum coverage:** greater of **$55,000** or the amount supporting the minimum premium.
- **Policy fee $360/yr**, added to annual premium **before** modal factors.
- **Minimum premium:** $154.44/mo · $465.30/qtr · $922.50/half · **$1,800/yr** — all payable in advance.

**Premium formula (explicit):**
```
Base Premium  = (Premium Rate × Face Amount × Underwriting Rating) + Policy Fee
Modal Premium = Base Premium × Modal Factor
Staff Premium = (1 − Discount Rate) × Modal Premium
Rider Premium = Benefit Rate per thousand × Coverage Amount / 1,000
```

**Commission:** 50% / 15% / 15% / 5% / 5% / 2.5%+
**Bonus & overrides:** **15% per premium in year 1**, then **10% per commission year 2+**.

Loans/APL/lapse/reinstatement/reduced paid-up mirror Whole Life. **Additional rule:** *"If at any time the total indebtedness equals or exceeds the gross cash value, the policy will immediately lapse."*

---

## 🔑 Cross-product mechanics the engine must encode

**Modal factors are IDENTICAL across Whole Life, Endowment, and Rest Assured:**

| Mode | Factor | Annualized | **Cost vs annual** |
|---|---|---|---|
| Monthly | 0.08580 | ×12 = **1.0296** | **+2.96%** |
| Quarterly | 0.25850 | ×4 = **1.0340** | **+3.40%** |
| Semi-annual | 0.51250 | ×2 = **1.0250** | **+2.50%** |
| Annual | 1.00000 | 1.0000 | — |

**Paying monthly costs the client ~3% more than paying annually.** And *"policies with annual payment modes attract an additional 5% commissions in the first year only."*

**→ Annual payment is cheaper for the client AND pays the agent more.** A rare genuine alignment, and a concrete, honest recommendation the engine can make with no conflict whatsoever. **Worth surfacing prominently.**

**Universal rules across products:** lapse processed at **62 days**, notice at **31 days**; loans need **3 full years** + positive net cash value, max **90%**, **10% interest**; reduced paid-up minimum **$2,000**; **10% ANSA McAL staff discount**; "Age Next" for all issue ages.

---

## Products confirmed to exist (beyond the commission schedule)

| Product | Type | Status |
|---|---|---|
| **GoldSpoon / GoldSpoon Gift** | Child/gift plan (spec 2008) | ⚠️ **scanned PDF — not yet read** |
| **SPIA** | Single Premium Immediate Annuity | ✅ specified above |
| **Cashbuilder II (1992, 59pp) / III (1995)** | Universal Life | ⚠️ **scanned PDFs — not yet read** |
| **Corporate Destiny** | Corporate registered annuity | brochure (jpg) |
| **LifeSpan / LifeSpan Lite** | CI-oriented (site: *"heart surgery… critical illness costs"*) | on tatil.co.tt; no spec in folder |

**tatil.co.tt** markets four consumer lines: **Life Span** (critical illness), **Rest Assured** (funeral), **Term Life**, **Whole Life** — each with an instant-quote flow. Also confirmed: **AM Best affirms credit ratings of Trinidad and Tobago Insurance Limited** (a real trust asset for the CLICO-scarred market, #9).

---

## ⚠️ Not yet extracted — scanned image PDFs needing OCR

`Cashbuilder II Product Specifications (1992, 59pp)` · `Cashbuilder III (1995, 8pp)` · `GoldSpoon Gift Product Specification (2008)` · brochures for CashbuilderII / Goldspoon / PlatinumEdge / Term Life · JPEGs: SPIA, Corporate Destiny, Personal Destiny, Rest Assured.

**Cashbuilder II/III matter most** — they're the legacy UL policies the Policy X-ray will find on client books, and the [UL knowledge base](product-knowledge-base.md) flags those as the ones that may be silently heading for lapse. Their COI tables, crediting rates, and Option A/B availability remain **unverified**. Requires poppler/OCR or vision.

## Corrections to earlier work
- **Platinum Edge is an unapproved deferred annuity**, not a permanent life product. My inference from its 0.5% commission was wrong.
- **Destiny is UL with no insurance component** — the [product knowledge base](product-knowledge-base.md) listed it under "deferred annuity with fund options", which is right in effect but understates that the chassis is UL.
- **The "warn if maturity > 70" rule is inapplicable to Registered Destiny** — the product only offers 50–70. Rewrite as a Registered-vs-Unregistered decision.
