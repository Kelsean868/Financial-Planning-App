# Tatil Product Catalog & Commission Structure — Analysis

**Source:** Tatil Life Commission Schedule V5 (provided by founder)
**Date:** 2026-07-16
**Two purposes:** (1) seed the product knowledge base; (2) confront the conflict of interest the commission data creates.

---

## 🔴 THE DESIGN DECISION THIS FILE FORCES

The recommendation engine now has access to commission. **What it does with that fact determines whether the product is trustworthy or a mis-selling machine.**

Look at first-year commission across products that can solve *the same need*:

| To deliver death cover, the engine could recommend… | 1st-year commission |
|---|---|
| Whole Life | **60%** |
| 20-Year Convertible Term | 35% |
| LifeSpan Lite (to 70) | 30% |
| Platinum Edge | **0.5%** |

**A whole life policy pays the agent 120× the first-year commission of a Platinum Edge policy.** An engine that optimizes for commission — even slightly, even implicitly — will systematically steer clients toward whole life and away from term and annuities. That is textbook mis-selling, it violates the Central Bank's Market Conduct Guideline, and it is precisely the "silent modeling error" failure mode we're positioning against eMoney on.

### The rule (non-negotiable, goes in the spec)

> **The recommendation engine MUST NOT see commission. Commission is not an input to `RecommendationEngine`. It is computed *after* the recommendation is fixed, for the agent's own economics only, and it never influences ranking, selection, or the three options presented.**

Architecturally: `RecommendationEngine` optimizes coverage-adequacy-per-premium-dollar for the *client*. A separate, downstream `CommissionCalculator` tells the agent what they'll earn on a recommendation already made. The two never touch. This is the deterministic-core / separable-layer discipline from the spec, applied to its highest-stakes case.

### And it becomes a *feature*

Because we hold commission but refuse to optimize on it, we can do the honest thing openly:

- **Suitability record can affirmatively state** the recommendation was made without reference to commission — a Market Conduct gold standard, and a defensible answer if a regulator ever asks "why this product?"
- **Optional commission-transparency mode:** the agent can show the client what they earn. In a post-CLICO trust market, radical transparency is a differentiator, not a risk.
- **The engine can flag its own temptation:** "a whole life here pays you 60% vs 35% on term — but term is the better fit for this need." That turns the tool into the agent's integrity backstop.

**This single decision may be the most important trust feature in the product.**

---

## The Product Catalog

Real T&T products, current + legacy. The **variety is the point** — the engine's job is matching need to product, and this is the solution space.

### Protection — Term
| Product | Terms | Note |
|---|---|---|
| Convertible Level Term | 10/15/20/25 yr | **Convertible** — can become permanent without new underwriting. Key laddering + future-insurability tool. |
| Level Convertible Term to Age | 60 / 65 / 70 | Aligns cover to retirement / mortgage horizon. |
| LifeSpan Lite | to 60 / 70 | Simplified issue (no bonus, lower commission) — the **easy-issue** protection play. |

### Protection — Permanent
| Product | Variants | Note |
|---|---|---|
| Whole Life | standard | Lifelong cover + cash value. The permanent-need / final-expense / estate floor. |
| Limited-Pay Whole Life | pay 10/15/20/25/30 yr · paid-up at 55/60/65 | Pay premiums for a fixed window, coverage for life. Retire the premium *before* you retire the income. |

### Savings / Accumulation
| Product | Variants | Note |
|---|---|---|
| Endowment | 15/20/25/30 yr | Insurance + guaranteed maturity lump sum. **Education funding** classic. |
| Deferred Annuity "Destiny" | Option 1 Conservative · Options 2&3 Moderate/Aggressive | **Fund-linked annuity.** BIR-approved → TT$60k deduction; now also the 2026 income exemption (50–70 maturity). Retirement engine's core product. |
| Publicsaver Life | split: savings portion + insurance portion | Hybrid — the two portions are commissioned separately (savings 5%/yr, insurance 35% yr1). |
| Publicsaver DA | — | Savings-oriented deferred annuity. |
| Platinum Edge | age 0–75 | Flat 0.5%/yr commission — likely single-premium / investment-oriented permanent. |

### Specialist
| Product | Note |
|---|---|
| Rest Assured (Final Expense) | 2024 product. Terms to age 60/65/85/100. The **underinsured-senior / funeral** market — small face, simplified issue. |
| Riders | CI / disability / income protection, attached to a base policy. Age-banded commission. |
| Cashbuilder Life/DA | **Legacy** — age-banded. Appears on existing books (X-ray will find these). |

### Group / Employer
| Product | Note |
|---|---|
| Group Life | Employer-sponsored death cover. The 1–2× salary most employees have and lose on job change. |
| Group Deferred Annuity | Employer retirement. |
| Deposit Administration | Tiered by fund size (≤30k / next 30k / >60k). Pooled employer retirement fund. |

---

## What the commission structure itself teaches

Beyond the conflict issue, the schedule encodes real product knowledge the engine can use — *as domain understanding, never as a ranking input*:

1. **Heaping.** Nearly everything front-loads year 1 (Whole Life 60% → 15% → 10%...). This is why **persistency/lapse (#4) matters so much**: an early lapse means the agent keeps a large advance the insurer clawed back, and the client loses everything. The commission shape *is* the lapse-prevention argument.

2. **Annuities and investment products pay little, deliberately.** Destiny Option 1 pays 5%; Platinum Edge 0.5%; Publicsaver savings 5% level. Low commission signals a savings/investment vehicle, not a protection product — useful *context*, and exactly why an honest engine must recommend them freely despite the low payout.

3. **The Destiny "+0.25% Fund" trail** (years 3+) shows a trail-commission model on the fund — aligns the agent with keeping the fund invested, a healthier incentive than pure heaping.

4. **Age-banding on Cashbuilder/Riders** (35% at 0–50 down to 20% at 61+) reflects real underwriting economics — older lives, shorter premium-paying horizons.

5. **Single-premium / lump-sum rows** (1.5–2.5%, no renewal) — distinguishes lump-sum deposits from regular-premium business in the data model.

---

## Feeds into the spec

- **`ProductCatalog`** gains a real T&T taxonomy: term (convertible, term-to-age), permanent (whole life, limited-pay), endowment, annuity (fund-linked), final expense, simplified-issue, hybrid, group, riders — plus a `status` field (NEW / legacy) so the X-ray can identify old products like Cashbuilder on a client's book.
- **`RecommendationEngine`** gets the hard firewall: **commission is not an input.**
- **New `CommissionCalculator`** (downstream, agent-facing only): given a *fixed* recommendation, compute the agent's expected commission from this schedule. Never upstream of a recommendation.
- **Product knowledge base** (use cases / mis-selling patterns / combinations) — the [product-types research](#) now running fills this; it's what lets the engine explain *why* a product fits, not just that it does.
- **Convertibility** becomes a modelled product attribute — it's a genuine planning lever (buy cheap term now, convert to permanent later without re-underwriting), and no US tool localizes it to these T&T products.

## Open items
- Confirm whether the engine should ever surface commission to the *client* by default (transparency mode) or only on the agent's explicit action. Leaning: agent-initiated only.
- Platinum Edge and Publicsaver mechanics need confirmation from a product brochure — the commission schedule shows economics, not features.
- Destiny fund options (Conservative / Moderate / Aggressive) imply investment risk borne by the client — check how this interacts with the "no securities advice" line, since fund selection edges toward investment advice even though the annuity wrapper is insurance.
