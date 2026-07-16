# OCR-Extracted Corpus

**Tooling installed:** Tesseract OCR 5.4 (via winget) + PyMuPDF 1.27 + pytesseract. Pipeline at `graphify-out/ocr.py` — renders at 200 DPI, uses native text where present (free/perfect), OCRs only scanned pages. Output in `.firecrawl/ocr/`.
**Extracted:** ~470,000 characters across 10 previously-unreadable documents.
**Date:** 2026-07-16

| Document | Pages | Chars | Value |
|---|---|---|---|
| Tolani — **Objection Playbook** | 163 | **130,923** | 🔥 37 numbered objections |
| Tolani — Sales Maximizer | 74 | 114,434 | sales process |
| Tolani — Closing Playbook | 75 | 109,392 | ⚠️ noisy (design-heavy) |
| **Maritime Sales Presentation** | 92 | 60,171 | competitor |
| **GoldSpoon Gift spec** | 8 | 7,678 | 🔥 **major find** |
| Guardian Importance of Income | 8 | 7,789 | competitor |
| Saving for Retirement Self-Employed T&T | 1 | 6,676 | T&T-specific |
| Personal / Corporate Destiny, SPIA, Rest Assured brochures | 4 img | 7,885 | client-facing language |

---

# 🔥 GoldSpoon Gift — the biggest find, and it closes two open loops

**This was catalogued as "a child/gift plan, spec not yet read." It is far more important than that.**

## 1. GoldSpoon Gift IS the LifeSPAN Maternity Benefit

> *"The Gold Spoon Gift is a **Maternity Benefit** that offers **one year's free insurance coverage of $10,000 to the newborn of female Lifespan Gold insureds**, whose policies have b[een in force]…"*

The [LifeSPAN research](tatil-lifespan-and-cashbuilder.md) recorded from marketing: *"after 2 years in force, free first-year coverage on a $10,000 children's savings policy for a newborn, max 2 children."* **That benefit is this product.** The marketing page and the spec describe the same thing from two ends — and now we have the mechanics.

**Mechanics:**
- *"a **Special Universal Life** revision of the Gold Spoon product"* — **another UL**, and *"like Cashbuilder II it has both a life insurance portion and a fund portion."*
- **Issue age 1** (Age-Next). Issued **non-smoker basis**.
- **Sum insured $10,000 at issue**, increasable after the first anniversary.
- **Matures at the greater of age 65 or [1] year**, or any time thereafter at the owner's option.
- **The policy is issued without a premium for the 1st year.** MMP becomes effective on the **first anniversary** — **$150.00/month** for issues from 1 Sep 2007 (was $100.00 before).
- **Both the administration charge AND the COI are suppressed during the first year** — which is *how* the free year works, mechanically.
- Min lump sum $500, accepted after the first anniversary.
- **Surrender/partial surrender allowed after the first anniversary**, max 90% of cash value, with a scaled surrender-charge table.
- **Death benefit: Sum Insured + net accumulation.** *(Same shape as Cashbuilder II — see the Option A/B question below.)*
- **WPDDP** (Waiver of Premium on Death/Disability of Payor) — *"the only benefit that would become available after the first anniversary"* — available until the **insured attains 25 or the policyowner attains 60**, whichever first.
- **Guaranteed Purchase Option included in all policies at no cost** — 🔑 **the child gets a guaranteed right to buy more cover later without underwriting.** That is a genuinely valuable, uncopyable planning lever: insure the child at age 1, and their future insurability is locked regardless of what health develops.

## 2. 🔥 It contains the actual CASHBUILDER COI RATE TABLE

Appendix I is headed **"TATIL LIFE CASHBUILDER ASSURANCE — ANNUAL PREMIUM RATES PER $1,000 SUM ASSURED"**, ages 0–60, in four columns (male NS / male S / female NS / female S):

| Age | M-NS | M-S | F-NS | F-S |
|---|---|---|---|---|
| 0 | 2.90 | — | 1.88 | — |
| 15 | 4.46 | 8.69 | 2.75 | — |
| 20 | 4.96 | 9.69 | 3.13 | 6.04 |
| 25 | 5.56 | 10.91 | 3.65 | 7.08 |
| 30 | 6.44 | 12.68 | 4.29 | 8.39 |
| 35 | 7.55 | 14.92 | 5.05 | 9.92 |
| 40 | 8.96 | 17.76 | 5.92 | 11.67 |
| 45 | 10.55 | 20.94 | 6.81 | 13.46 |
| 50 | 11.77 | 23.39 | 7.54 | 14.93 |
| 55 | 12.43 | 24.71 | 8.11 | 16.08 |
| 60 | **20.06** | **39.98** | **12.90** | **25.66** |

*(Full table ages 0–60 in `.firecrawl/ocr/GoldSpoon_Gift_-_Product_Specification_(Draft)_-_Jan_2008.txt`. Some OCR digit noise — e.g. age 33 M-NS reads "al" — **verify against the source PDF before encoding.**)*

**This closes the [UL knowledge base](product-knowledge-base.md)'s biggest gap:** *"COI rate tables — the specs describe the mechanic but don't publish the rates."* **Here they are.**

**And the shape confirms the UL thesis with real numbers.** Male non-smoker per $1,000: **5.56 at 25 → 12.43 at 55 → 20.06 at 60.** COI **quadruples** between 25 and 60, and the curve steepens sharply after 55 (12.43 → 20.06 in five years, +61%). **That is the rising-COI mechanic that consumes an underfunded Cashbuilder's accumulation** — no longer a hypothesis, a rate table. Smoker rates are roughly **double** non-smoker at every age.

**Also confirmed:** the technical setup lists plan family *"CB II, III, IV & GOLDSPOON"* and *"RHDR: UMPTL2 — CBII MINIMUM PREMIUM"* — **so a Cashbuilder IV exists** (beyond I/II/III), and GoldSpoon shares Cashbuilder's minimum-premium and rate infrastructure.

**Premium loading table** (by policy year, ~40%/10% visible — OCR partial) and a **lump-sum loading table** — these are the front-end loadings Destiny's spec proudly says it *removed* (*"no premium loadings… in contrast to the prior product, where premiums, net of front-end loadings, were paid into the fund"*). **The "prior product" is this generation.** Destiny's pitch is real and now evidenced.

---

# Tolani Objection Playbook — 37 numbered objections

**The most directly useful material for the `AIExplanationService`.** A complete objection taxonomy from a practitioner. Extracted list:

| # | Objection |
|---|---|
| 2 | I already have insurance |
| 3 | I don't see the need to buy life insurance |
| 4–5 | Company plan is not as good as the other plan / Other companies' policies are cheaper |
| 6 | I would rather hold cash right now |
| 7 | I am not married, why should I? |
| 8 | I have no money for the product |
| 9–10 | It is too expensive to buy this product *(two versions)* |
| 12 | I am not ready |
| 14 | Let me go back, do some research |
| 15 | You look young, why should I? |
| 16 | You are too old |
| 17 | You are so new in this business |
| 18 | I already have an insurance advisor |
| 19 | **How do I know an insurance company will pay my claims?** |
| 21 | When is the best time to buy insurance? |
| 24 | I need to ask my parents |
| 25 | I'd rather work with someone who is family |
| 26 | I don't want to mix business with friendship |
| 27 | Insurance is not for rich people |
| 28 | This will not happen to me |
| 30 | Will you give me a discount? Rebates? |
| 31 | **My wife does not need insurance as she is a housewife** |
| 32 | I have enough money to pay off medical costs |
| 33 | **My company has provided me insurance** |
| 34 | I'd rather put the money in a bank account and see it grow |
| 35 | I don't like long-term commitment |
| 36 | **What if the insurance company goes bankrupt?** |
| 37 | I don't want you to sell life insurance to me |

## 🔑 Four objections our engine can answer with verified facts

This is the payoff — **several of these map onto findings we've already sourced and verified**, which means the engine can answer them with evidence rather than persuasion:

- **#33 "My company has provided me insurance"** → **group life reduces 50% at age 66 and terminates at 70, with no post-retirement cover** ([product knowledge base](product-knowledge-base.md)). Not a rebuttal — a fact.
- **#36 "What if the insurance company goes bankrupt?" / #19 "will they pay my claims?"** → **AM Best affirms Tatil's credit ratings**, and this is *the* post-CLICO objection in T&T. Tolani's answer is generic ("governments and institutions ensure no insurance company goes bust"); **ours can be specific and local** — which is far stronger. This is idea #9 (the CLICO trust layer) with a named trigger.
- **#34 "I'd rather put money in a bank and watch it grow"** → **Platinum Edge guarantees 2.5%; Destiny Option 1 guarantees 2%** — and the TT$60,000 deduction applies to approved annuities but not to a bank account.
- **#8 / #9 / #10 "no money" / "too expensive"** → **the leak.** *"$1,300 leaves every month and you can't name it."* We don't argue about affordability; we show where the money already goes.

**Tolani's own framing worth keeping** (verbatim, p136): *"insurance is not just a backup plan for a small selected few. It is a backup plan for the world."* And his selectivity technique — *"pre-framing your prospect that you are selective and don't work with just about anybody"* — for #37.

⚠️ **The Closing Playbook OCR is noisy** — it's a heavily designed book and the render duplicates text blocks. Body pages are readable; title/graphic pages are garbage. Usable for concepts, **not for verbatim quotation**.

---

# Other extractions

- **Maritime Sales Presentation** (92pp, 60k chars) — competitor sales material, now readable. Pairs with the Maritime fact finder already analysed.
- **Guardian Importance of Income** (8pp) — competitor; income-replacement framing.
- **Saving for Retirement When You're Self-Employed in T&T** (1pp, 6.7k chars) — **directly on-point**: self-employed/irregular income is exactly the genuine use case for UL's "premium vacation" flexibility and for Destiny.
- **Brochures** (Personal Destiny, Corporate Destiny, SPIA, Rest Assured) — client-facing language for the explanation layer, in Tatil's own voice.

---

## ⚠️ Encoding rules for this corpus

1. **The GoldSpoon COI table has OCR digit noise.** Several cells are visibly corrupted (age 33 M-NS = "al"; age 22 F-S = "6.46" but age 21 reads "6.25" — plausible, but unconfirmed). **Verify every cell against the source PDF before it enters `ParameterTables`.** This corpus is OCR — it is a *lead*, not a source of truth. Same rule that has now caught three errors.
2. **The Tolani/Maritime/Guardian material is persuasion literature** — it belongs at the AI edges only, never in the decision path ([sales craft library](sales-craft-library.md)).
3. **The GoldSpoon *spec* is authoritative** (it's Tatil's own document); only its OCR fidelity is in question.

## Still unresolved
- **Option A vs Option B on Cashbuilder/GoldSpoon.** Both specs say death benefit = *"Sum Insured plus net accumulation"*, which reads like **Option B** — meaning **extra funding does NOT reduce COI**, inverting the standard "over-fund it to keep costs down" advice. With the COI table now in hand this is testable, but it needs the contract to confirm.
- **Cashbuilder IV** — newly discovered in the plan family, no spec seen.
- The GoldSpoon premium-loading and surrender-charge tables are OCR-partial.
