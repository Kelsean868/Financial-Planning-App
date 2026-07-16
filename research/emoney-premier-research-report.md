# eMoney Premier — Competitive Research & Caribbean Localization Report

**Purpose:** Functional understanding of eMoney Premier to build an *original* competing financial-planning product for the Trinidad & Tobago (and broader Caribbean) advisor market.
**Method:** Multi-agent deep research — 5 search angles, 23 sources fetched, 109 claims extracted, top 25 adversarially verified with 3-vote panels (24 confirmed, 1 refuted).
**Date:** 2026-07-15
**Legal boundary:** Findings support functional understanding only. Copying eMoney's code or pixel-exact designs is off the table. TTSEC/tax conclusions are research, not legal advice.

---

## Executive Summary

eMoney Premier is the vendor's top-tier bundle combining a **dual-methodology planning engine** (goals-based Foundational Planning plus advanced cash-flow modeling via Advanced Planning / Decision Center / Goal Planner), a **two-tier Client Portal** with held-away account aggregation, and a mobile app. A competing product must replicate all three layers to be feature-equivalent.

The genuinely hard engineering is (1) the **cash-flow simulation engine with real-time what-if recalculation** and (2) **reliable account aggregation** — the latter being eMoney's single most concrete user complaint (brittle bank connections, poor small-institution coverage). **Aggregation reliability and speed-to-plan are the two clearest attack surfaces** for a new entrant, alongside a checklist of modeling gaps named even by 5-star reviewers.

A Trinidad & Tobago localization requires replacing the entire US retirement/tax layer: NIB's 16-class banded contribution system with a year-indexed rate schedule (16.2% in 2026 → 19.2% in 2027), a TTD 3,000/month statutory minimum pension, BIR-approved annuities with a 25% early-surrender tax, and **no estate/gift tax** (shifting estate features toward titling/succession rather than tax minimization). Advisors using the product must be TTSEC-registered Investment Advisers, and the software itself must avoid generating securities-specific recommendations that could constitute unregistered advice.

---

## Part 1 — Feature Inventory (verified, high confidence unless noted)

### 1.1 Product scope & packaging
- **Premier = Plus (goals-based) + Pro (advanced cash-flow) + Premium Client Portal + mobile app.** Vendor page verbatim: Premier "brings together the best of eMoney Plus and eMoney Pro, along with our Premium Client Portal."
- **Two-tier portal monetization:** a standard Client Portal is included in every planning package; the Premium Client Portal (launched April 2025) is a paid upgrade adding interactivity/engagement — bundled with Premier, add-on for lower tiers. *This is a proven tiering pattern worth copying.*
- **Pricing (G2):** ~$2,600/yr Plus, ~$4,100/yr Pro, ~$5,000+/yr Premier. No public price for the portal add-on (sales-gated).
- Sources: [Premier product page](https://emoneyadvisor.com/products/emoney-premier/), [Client Portal page](https://emoneyadvisor.com/why-emoney/client-portal/), [Premium Portal launch](https://emoneyadvisor.com/resources/news/emoney-advisor-launches-premium-client-portal/)

### 1.2 Planning engine architecture — the core replication requirement
- **One projection engine, multiple UX depths.** Premier supports both goals-based and comprehensive cash-flow planning in one product; the advisor switches methodology per client.
- Three planning UX tiers over the shared engine:
  1. **Needs Analysis** — single-goal quick analyses
  2. **Foundational Planning** — streamlined goals-based workflow producing plans "with minimal client information and data input"
  3. **Advanced Planning / Decision Center** — full cash-flow what-if modeling
- Foundational Planning and Decision Center are distinct workflows/entry points on one platform, not siloed engines; eMoney is actively integrating them (2025/2026 releases).
- Sources: [Premier page](https://emoneyadvisor.com/products/emoney-premier/), [Getting Started Welcome Kit (PDF)](https://content.emaplan.com/knowledgebase/slicks/Getting_Started_Welcome_Kit.pdf), [Foundational Planning](https://emoneyadvisor.com/foundational-planning/)

### 1.3 Core modules (medium confidence on framing)
The Pro/Premier plan-building workflow centers on three named tools:
- **Advanced Planning** — model the current situation and what-if scenarios (bear markets, spousal disability, retirement timing, inflation shocks)
- **Goal Planner** — goal visualization (update slated early 2026)
- **Decision Center** — demonstrate recommendation impacts **in real time during live client meetings**: interactive what-if toggling with immediate recalculation and multi-view dashboards (redesigned 2025 with Presentation View), not batch report generation

**A replica's hardest build is this real-time scenario layer over the projection engine.** Verifier note: Goal Planner and Decision Center are presentation/scenario layers over one cash-flow engine, not independent engines.

### 1.4 Client Portal & account aggregation
- Clients view all finances in one place, aggregate accounts **including held-away assets** (consolidated net worth), and store documents in a secure **Vault** (My Documents / Shared Documents, 30MB per-file limit, API-accessible via eMoney's developer portal).
- **Aggregation is treated as foundational and operationally hard:** it is the *first onboarding task* on a new advisor's first coaching call, with a dedicated Week-1 "Optimizing Aggregation" one-on-one where the advisor selects a "preferred primary data source." eMoney itself reports a multi-year effort cutting aggregation service tickets by 70% — evidence of difficulty even at the market leader.
- **"Real-time" is marketing.** Practical replication spec: daily refresh with robust reconnection handling.
- Sources: [Client Portal](https://emoneyadvisor.com/why-emoney/client-portal/), [Aggregation](https://emoneyadvisor.com/why-emoney/aggregation/), [Welcome Kit PDF](https://content.emaplan.com/knowledgebase/slicks/Getting_Started_Welcome_Kit.pdf)

### 1.5 Not yet verified (needs dedicated research)
- **Monte Carlo engine specifics** (trial count, return-assumption model, per-goal vs whole-plan success probability) — did not survive verification.
- **Mobile app feature set** — did not survive verification.

---

## Part 2 — UX / Workflow Teardown

From the official onboarding Welcome Kit (primary source) and third-party walkthroughs:

**Advisor onboarding sequence (eMoney's own coaching order — a strong signal of what matters):**
1. Week 1: **Optimizing Aggregation** (before anything else — data quality is the foundation)
2. Data entry / client fact-finding
3. Reports
4. Client Portal setup
5. Plan building (Foundational → Advanced Planning → Goal Planner → Decision Center)

**Live-meeting flow (Pro/Premier):** model current situation in Advanced Planning → visualize with Goal Planner → toggle variables live in Decision Center to show recommendation impact in real time.

**Best public UX sources for your design study:**
- [eMoney beginner walkthrough](https://www.youtube.com/watch?v=eU0bbkPvqpk) — screen-recorded navigation, fact-finding, plan setup, reporting screens
- [Client Portal tutorial](https://www.youtube.com/watch?v=o3Q9uMW4YL4)
- [Product overview](https://www.youtube.com/watch?v=iBHB66QFecM) and the [official YouTube channel](https://www.youtube.com/user/emoneyadvisor)
- Review-site screenshot galleries: [GetApp](https://www.getapp.com/finance-accounting-software/a/emx/), [Software Advice](https://www.softwareadvice.com/product/451720-emX/), [Capterra](https://www.capterra.com/p/119135/emX/)
- Requesting a live vendor demo remains the best authorized way to see the real UI.

---

## Part 3 — Competitive Gap Analysis (where to attack)

### Attack surface #1: Aggregation reliability (high confidence)
The most concrete recurring complaint across G2, Capterra, and Software Advice (verified across three independent review sites, 2026):
- Connections to outside accounts/custodians frequently break or can't be established
- Clients repeatedly forced to re-authenticate
- Smaller institutions (credit unions) poorly covered
- Reviewer language: "very brittle," "constant connection issues… to the point of making the software useless"

**Implication:** aggregation is unsolved even for the market leader — a differentiation opportunity, but also the hardest subsystem to build. (Caveat: learning-curve and price complaints recur at least as often; aggregation is the most concrete *technical* complaint.)

### Attack surface #2: Learning curve & silent modeling errors (high confidence)
- Kitces: **3–6 months to advisor proficiency** on the cash-flow engine.
- Documented G2 case: a non-intuitive Social Security setting ("benefit specified as Full Retirement Age amount") silently stacked early-claiming reductions on top of statement-entered amounts, understating a client's age-63 benefit until the client challenged the numbers.
- Even 5-star fans: detailed cash-flow modeling "does take more time than less detailed planning tools"; interface called "kind of clunky."
- **This is exactly where RightCapital and MoneyGuidePro win — ease and speed-to-plan, not raw modeling power.** Build assumption-input guardrails/validation from day one.

### Attack surface #3: Ready-made differentiation backlog (high confidence)
Named by 5-star reviewers (literally "even the fans"):
1. **No automatic debt-snowball rollover** — paid-off debt payments must be manually reallocated to the next debt
2. **Imprecise mid-year transaction timing** — e.g., a modeled home purchase starts the new mortgage January 1, over-projecting spending
3. **No healthcare-cost simulators** (US complaint is IRMAA-specific; translates to a generic healthcare-cost-simulation requirement for the Caribbean)
4. **No AI features** (one reviewer's perception; eMoney could ship AI anytime — but it's an opening now)
5. G2 aggregate cons: "lack of advanced features, making complex financial modeling challenging and imprecise" (6 mentions)

### Market context
- eMoney is the #2 most-adopted planning software (Kitces surveys), competing with MoneyGuidePro; its historical differentiator is the **client portal/PFM experience**, not the planning engine itself.
- Comparison sources: [Kitces landscape](https://www.kitces.com/blog/financial-advisor-software-survey-ratings-market-share-fintech-wealthtech-landscape-chart/), [RightCapital vs eMoney](https://www.rightcapital.com/blog/rightcapital-vs-emoney-differences/), [Ezra Group shootout](https://ezragroup.com/finplan-shootout-emoney-advisor-versus-moneyguidepro/)

---

## Part 4 — Trinidad & Tobago Localization Spec

### 4.1 NIB contributions (replaces US FICA/Social Security wage-base model) — high confidence
- **Rate: 16.2% of insurable earnings effective Jan 5, 2026** (max total weekly contribution TTD 508.50 = TTD 339.00 employer / TTD 169.50 employee, a 2:1 split, at monthly income TTD 13,600+).
- **Legislated to rise to 19.2% effective Jan 2027** (max weekly TTD 602.40 = 401.60 / 200.80).
- Administered through a **16-class banded earnings system** — a *fixed contribution per class* based on assumed class earnings, **not** a flat percentage of actual wages like US FICA.
- **Engine requirement: year-indexed contribution-rate tables + earnings-class lookup logic.** Retirement age phases up from 2028.
- Sources: [NIBTT rates](https://www.nibtt.net/Contribution_Rates/rates.html), [PwC Tax Summaries T&T](https://taxsummaries.pwc.com/trinidad-and-tobago/individual/other-taxes) (figures match exactly across both)

### 4.2 NIB retirement benefits (replaces the Social Security module) — high confidence
- **Statutory minimum Retirement Pension: TTD 3,000/month** (effective Feb 1, 2012, still in force July 2026) for every person qualifying.
- **Fewer than 750 contributions → one-time Retirement Grant instead** of a pension.
- US Social Security has no comparable flat minimum — this is a *structurally different* benefit calculation. Model the pension floor + grant-vs-pension eligibility threshold.
- Source: [NIB Retirement Benefit](https://www.nibtt.net/benefits_09/ben_retirement_II.html)

### 4.3 Tax engine — high confidence
1. **No inheritance, estate, or gift taxes in T&T.** US-style estate-tax modeling is largely inapplicable — build estate features around **asset titling, succession, and probate** (Succession Act Ch. 9:02), with an optional stamp-duty calculator for gifts/conveyances.
2. **Only BIR-approved annuities qualify for the pension/annuity tax deduction** — model approved vs non-approved annuities as distinct account types.
3. **Early surrender of an approved annuity: 25% tax on the withdrawn amount**, only premiums refunded (gains forfeited), BIR approval required for surrender — analogous to but structurally different from the US 10% penalty.
4. **Finance Bill 2026: pension/approved-annuity income at maturity is tax-free from Jan 1, 2026** — sharpening the modeled early-surrender asymmetry.
5. ⚠️ **REFUTED (0–3): the TT$30,000 combined deduction cap.** The finance.gov.tt annuities page is stale — the combined pension/NIS/annuity deduction cap has been **TT$60,000/year since Jan 1, 2022** (per IRD/PwC). Do not hard-code the TT$30,000 figure.
- Sources: [PwC](https://taxsummaries.pwc.com/trinidad-and-tobago/individual/other-taxes), [finance.gov.tt annuities](https://www.finance.gov.tt/services/income-tax/annuities/) (stale on cap), [IRD annuity approval/surrender](https://www.ird.gov.tt/approvals-annuities-approval-surrender)

### 4.4 Regulatory perimeter (TTSEC) — high confidence
- Under **s.51(1)(b) of the Securities Act (Ch. 83:02, Act 17 of 2012)**, anyone in the business of providing investment advice must register with TTSEC as an **Investment Adviser** (TT$50,000 minimum capital; By-law 19 prerequisites).
- The statutory definition is **broad**: "a person engaging in, or holding himself out as engaging in, the business of providing investment advice," with no human-delivery limitation and a s.4(6) presumption covering electronic advice sent to persons in T&T — wide enough that automated product-recommendation features inside planning software could fall within scope.
- **Design implications:**
  - Your target users (advisors) operate under mandatory registration — TTSEC maintains a [public searchable register](https://www.ttsec.org.tt/industry/registration/list-of-registered-and-or-authorized-companies-and-individuals/) (filterable, Excel/PDF export) you can use to verify prospective customers.
  - Architect the software so it does **not itself generate securities-specific recommendations** that could constitute unregistered advice.
  - Key narrowing: "investment advice" covers only **securities** — budgeting, cash-flow, insurance, and NIB projection features arguably fall outside s.51 entirely.
  - s.51(5) permits foreign-registered sponsored advisers up to 30 days/year.
- Sources: [TTSEC Investment Advisers](https://www.ttsec.org.tt/industry/registration/categories-of-registration/investment-advisers/), Securities Act 2012 ss. 4, 51 (legalaffairs.gov.tt)
- **Get local counsel to confirm the software/advice perimeter before launch.**

### 4.5 Aggregation feasibility — ⚠️ UNRESOLVED (the biggest open question)
The research surfaced sources ([Open Banking Tracker for T&T](https://www.openbankingtracker.com/providers/country/tt) — 43 institutions cataloged, **no confirmed developer portals for any T&T bank**; [Plaid institution docs](https://plaid.com/docs/institutions/); [Salt Edge coverage](https://www.saltedge.com/products/account_information/coverage); [Central Bank fintech licensing](https://www.central-bank.org.tt/fintech-and-payments/fintech-licensing-application-process-in-trinidad-tobago/)) but no claims in this area survived to verification. **Treat as unconfirmed:** early signals suggest no native open-banking APIs exist at T&T banks, which would make direct integrations, screen-scraping partnerships, or well-designed manual/statement-import entry the realistic aggregation paths. This needs dedicated follow-up research — it is the single largest technical-feasibility question for the product.

---

## Open Questions (next research targets)

1. **Do Plaid, MX, Yodlee, Salt Edge, or Flinks have ANY coverage of T&T/Caribbean banks** (Republic Bank, First Citizens, Scotiabank T&T, RBC Caribbean)? If not: direct integrations vs open-banking workarounds vs manual entry as the primary path?
2. **Central Bank of T&T + Data Protection Act 2011:** what licensing/data-protection requirements apply to a fintech vendor storing and aggregating bank-account data (separate from TTSEC)?
3. **eMoney's Monte Carlo engine specifics and mobile app feature set** — need dedicated research for the build backlog.
4. **Would TTSEC treat software outputting asset-allocation or fund-level suggestions as "investment advice" requiring the VENDOR to register?** No robo-advice guidance or precedent found either way.

## Caveats

- T&T NIB parameters are mid-phase (16.2% → 19.2% in 2027; retirement-age phase-up from 2028). **Build all T&T parameters as year-indexed tables** and re-verify before launch.
- eMoney feature claims rest on vendor marketing and onboarding docs — reliable for feature existence/packaging, silent on engine internals. eMoney ships actively (Decision Center Presentation View 2025, Goal Planner update early 2026), so this inventory has a short shelf life.
- G2 was bot-blocked for two of four review claims; those relied on consistent search-indexed content across multiple queries. Two others were verified verbatim against the live page.

## Verification stats

5 search angles · 23 sources fetched · 109 claims extracted · top 25 verified by 3-vote adversarial panels · **24 confirmed, 1 refuted (the stale TT$30,000 cap), 0 unverified** · 105 agents total.
