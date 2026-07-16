# Round 2 — The Four Open Questions, Answered

**Method:** Second deep-research pass — 5 search angles, 21 sources fetched, 95 claims extracted, top 25 adversarially verified. **20 confirmed, 2 refuted, 3 unverified** (the 3 died on a session limit, not on merit — flagged below).
**Date:** 2026-07-15
**Note:** The synthesis agent hit the session limit; this synthesis is hand-written from the verified claim set.

---

## Q1 — Caribbean aggregation coverage: **RESOLVED. There is none.**

This was the biggest open risk. It's now answered, and the answer is unambiguous.

| Aggregator | T&T / Caribbean coverage | Evidence |
|---|---|---|
| **Salt Edge** | **Zero.** No T&T, Jamaica, Barbados, Bahamas, DR, or any Caribbean territory | Full country list: Americas = 4 countries total (Argentina, Brazil, Canada, Mexico), 10 connections |
| **Plaid** | **Zero.** ~20 countries: North America, UK, Europe only | "95% bank coverage… across 20 countries"; 12,000+ institutions, none Caribbean |
| **T&T banks generally** | **No developer portals confirmed at any of 43 institutions** | Open Banking Tracker (round 1) |

**Confirmed (3–0):** Republic Bank, First Citizens, Scotiabank Trinidad, RBC Caribbean, and ANSA Bank **cannot be connected through Salt Edge or Plaid.** Salt Edge's entire Western-Hemisphere depth is negligible even outside the Caribbean.

### The one lead: Finerio Connect
**Confirmed (3–0):** In June 2022, **Finerio Connect + Ozone API + Visa** announced an end-to-end open-banking toolkit explicitly targeted at financial institutions across **Latin America and the Caribbean** — a white-label modular stack via the Finerio API Hub.
**Confirmed (2–1):** That toolkit includes **account aggregation supplied by Finerio Connect**, plus data handling and a PFM app.

Caveat: this is a toolkit sold *to banks* so they can offer open banking — not a ready-made consumer-side aggregator with live T&T bank connections. Whether any T&T bank has actually adopted it is unverified.

### What this means for the build
Off-the-shelf aggregation does not exist for your market. Realistic paths, in order of likely viability:

1. **Manual entry + statement/PDF import** — unglamorous, but the only path with zero external dependencies. Make it *excellent*: OCR/CSV statement parsing, smart categorization, fast re-entry. eMoney's own users complain aggregation is broken anyway; a planning tool that never promises live sync can't disappoint on it.
2. **Direct bank partnerships** — slow, relationship-driven, but a genuine moat once landed. T&T's banking market is concentrated enough that 3–4 deals covers most of it.
3. **Finerio Connect** — worth a discovery call, but it's a bank-side toolkit, not a plug-in aggregator.
4. **Screen-scraping** — legally and operationally fragile; do not build the business on it.

> **Strategic read:** this reframes the product. Don't sell "we aggregate your accounts." Sell "planning that works without aggregation" — the constraint is the positioning.

*Sources: [Salt Edge coverage](https://www.saltedge.com/products/account_information/coverage) · [Plaid Global](https://plaid.com/global/) · [Visa/Finerio/Ozone press release](https://www.visa.com.tt/about-visa/newsroom/press-releases/visa-open-banking-financial-institutions.html)*

---

## Q2 — Central Bank & data protection: **RESOLVED. Mostly good news.**

### Central Bank of T&T — you are likely outside the licensing perimeter
**Confirmed (3–0):** CBTT's regulated payment-services perimeter covers: money transfer, issuance/acquisition of payment instruments, acceptance/clearance/settlement of payment claims, e-money account issuance, electronic wallets, remittance services. Payment Service Providers must register under **s.36(cc), Central Bank Act Chap. 79:02**.

**Confirmed (3–0):** That list **does not enumerate read-only account-data aggregation or account-information services.** CBTT's own fintech licensing page contains **no registration category** for a fintech that merely stores or aggregates bank-account data without moving money or issuing e-money — data protection appears there only as a risk applicants must address in their org processes.

**Read:** a planning app that never touches payments is not within the listed PSP activities. This is an argument from omission on the regulator's own page — strong, but get counsel to confirm before relying on it.

*One claim refuted (1–2): that CBTT's perimeter is exactly two categories (PSP + EMI) with a single application form via the GoAnywhere Portal. Don't state the perimeter that crisply.*

### Data Protection Act 2011 — mostly not in force, but one live rule bites
**Confirmed (3–0):** Only **Part I (ss.1–6, the General Privacy Principles)** plus administrative ss.7–18, 22, 23, 25(1), 26, 28 came into force **6 January 2012**. The rest — including **Part IV (private-sector obligations, ss.69–83)** — **is not proclaimed.** Private-sector data-handling duties are not yet legally operative.

**Confirmed (3–0) — the rule that IS live:** s.6 sets out twelve General Privacy Principles binding **all persons who handle, store or process personal information**, including:

> **(l)** personal information disclosed outside Trinidad and Tobago shall go only to jurisdictions with **regulation and comparable safeguards** to those under the Act.

**This is your cloud-hosting constraint, and it is in force today.** Hosting T&T client financial data in a foreign region requires that jurisdiction to have comparable safeguards. EU/UK (GDPR) reads as comfortably comparable; US-only hosting is a harder argument.

**Confirmed (3–0) — plan for the future:** s.69 (Part IV, unproclaimed) would bind any person who collects/retains/manages/uses/processes/stores personal information **in T&T**, *or* collects it **from individuals in T&T**, or uses a T&T intermediary — **a scope that captures your app even if hosted abroad.** Build to Part IV now; proclamation is a switch someone can flip.

*One claim refuted (0–3): that s.72 makes cross-border transfer consent-based (inform + consent) rather than adequacy-based. Do not rely on that reading — the operative live rule is the s.6(l) comparable-safeguards test.*

*Sources: [Data Protection Act Chap. 22:04 (PDF)](https://rgd.legalaffairs.gov.tt/laws2/alphabetical_list/lawspdfs/22.04.pdf) · [CBTT payment services](https://www.central-bank.org.tt/fintech-and-payments/payment-services/) · [CBTT fintech licensing](https://www.central-bank.org.tt/fintech-and-payments/fintech-licensing-application-process-in-trinidad-tobago/)*

---

## Q3 — eMoney engine internals: **PARTIALLY resolved.**

### Monte Carlo — one real architectural signal
**Confirmed (3–0):** eMoney ships a proprietary **"Confidence Age"** metric — the age at which a client's Monte Carlo probability-of-success score **dips below the advisor's chosen threshold** for a strong plan.

That tells you the shape of the engine: eMoney computes a **whole-plan Monte Carlo score projected across the client's lifetime**, not a single point-in-time estimate — and then surfaces it as an *age*, which is a far more legible client-facing number than "83% success." **Worth copying the pattern, not the metric name.**

**Still unresolved:** trial count, return-assumption methodology (historical bootstrap vs parametric), and whether per-goal success probabilities are computed alongside the whole-plan score. eMoney doesn't publish these. Realistically you'll only learn them from a live demo — and you don't need them: pick a defensible methodology (e.g. 1,000+ trials, regime-aware or historical-bootstrap returns) and document it. **This is a case where being *more* transparent than eMoney is a differentiator.**

### Mobile app — feature bar now defined (3–0)
The [eMoney Client Portal iOS app](https://apps.apple.com/us/app/emoney-client-portal/id6479571927) ships:
- **All-in-One Account View** — connect and view all accounts (aggregation is the *flagship* feature — and the one you can't replicate; see Q1)
- **Spending & investment tracking** with asset allocation
- **Personalized goal setting** with progress tracking
- **Secure document vault** — upload, store, share
- **In-portal advisor messaging**
- **"Explore"** — a financial-education section kept separate from planning

**Confirmed (3–0):** the web portal adds spending/budgeting tools and goal tracking on top of aggregation and the vault.

**The tension worth noting:** eMoney's client app is *built around* the one capability unavailable to you in T&T. Your client app needs a different center of gravity — goals, document vault, advisor messaging, and education are all achievable; live account sync is not.

---

## Q4 — Software-as-advice perimeter: **RESOLVED, and this is the most consequential finding.**

Round 1 hedged this as "automated recommendations *could* fall within scope." That hedge is now gone — **TTSEC has addressed robo-advice directly.**

**Confirmed (3–0):** TTSEC has **no robo-adviser-specific rules**; it regulates automated advice platforms under the **existing investment-adviser provisions of the Securities Act 2012**:

> "No specific guidelines for robo-advisers exist locally, however the provisions for investment advisers within the Securities Act (as amended) 2012, provide the basis for regulating potential market entrants."

**Confirmed (2–1) — the vendor-registration answer:**

> "Any potential entrant will be subject to the **same registration and renewal procedures** that are currently applicable to investment advisers under the Securities Act (as amended), 2012 and the Securities (General) By-Laws, 2015."

**So: a robo-adviser entrant to the T&T market must itself register as an investment adviser.** This directly answers the vendor question — automated advice does not escape the perimeter by being software.

**Confirmed (3–0) — there is real TTSEC precedent:** a **2018 research paper**, *"Automated Advice Tools in the Securities Industry of Trinidad and Tobago: The Regulatory Challenges"*, identifying six focus areas:

1. Fiduciary standard of care
2. Client profiling / on-boarding
3. **Review of algorithms and methodologies**
4. Suitability of recommendations
5. Conflicts of interest
6. Effective compliance programmes

Point 3 is the one to internalize: **TTSEC expects to review your algorithms.** Build the modeling engine to be explainable and auditable from day one — assumption provenance, versioned calculation logic, reproducible outputs. That is a design constraint, not a compliance afterthought.

### Flagged: 3 claims unverified due to session limit (not refuted)
These are from TTSEC's own 2024 fintech-policy paper and look important. **They were never adjudicated — treat as leads, not findings:**
- TTSEC's position that fintech providers doing a regulated activity must register under an existing category (investment adviser, broker-dealer, underwriter, SRO, issuer).
- That the paper explicitly names **"Automated Advice Tools" — including financial aggregator platforms that link accounts across institutions and mine the data to provide investment advice** — as a category within TTSEC's regulatory scoping. *If confirmed, this describes your exact product architecture.*
- That TTSEC concluded it can regulate fintech under existing law without amendment, and offers a combined **Innovation Hub + Regulatory Sandbox** as a pre-registration engagement path.

The sandbox lead is worth chasing independently — a defined path to talk to the regulator *before* committing to an architecture is worth a lot.

### The design conclusion
Keep the earlier narrowing in view: **"investment advice" covers securities only.** Budgeting, cash-flow projection, NIB/pension modeling, insurance needs analysis, and goal tracking sit outside s.51. The perimeter line is at **securities-specific recommendations** — asset allocation, fund selection, buy/sell/hold.

Two viable postures:
- **(a) Stay outside the line.** Ship planning, projection, and education; let the registered advisor supply the securities recommendation. Fastest to market, no vendor registration.
- **(b) Cross deliberately.** Build recommendation features and register as an investment adviser (TT$50,000 minimum capital, By-law 19 prerequisites). Slower, more defensible, larger product.

**Recommendation: (a) first, architected so (b) is a later switch** — keep the recommendation layer separable from the planning engine.

*Sources: [TTSEC Robo-Advisers paper (PDF)](https://www.ttsec.org.tt/wp-content/uploads/2021/04/Robo-Advisers-1.pdf) · [TTSEC Fintech Policy paper (PDF)](https://www.ttsec.org.tt/wp-content/uploads/2024/10/Developing-a-Fintech-Policy-A-case-of-the-TTSEC-2.pdf) · [TTSEC Investment Advisers](https://www.ttsec.org.tt/industry/registration/categories-of-registration/investment-advisers/) · [Securities Act Chap. 83:02 (PDF)](https://rgd.legalaffairs.gov.tt/laws2/Alphabetical_List/lawspdfs/83.02.pdf)*

---

## What changed since Round 1

| Round 1 said | Round 2 establishes |
|---|---|
| Aggregation feasibility **unresolved** — "biggest open question" | **No aggregator covers T&T.** Manual/statement-import is the realistic path; Finerio is the only lead |
| Central Bank constraints **unknown** | **Likely outside the CBTT perimeter** — read-only aggregation isn't an enumerated payment service |
| Data Protection Act **unknown** | **Mostly unproclaimed**, but s.6(l) cross-border rule is **live today** and governs cloud hosting |
| Monte Carlo internals **unverified** | **Whole-plan lifetime score** confirmed via Confidence Age; trials/return model still unpublished |
| Mobile app **unverified** | **Full feature set confirmed** — and it's built around the capability you can't ship |
| Automated advice **"could" fall in scope** | **TTSEC says robo-adviser entrants must register.** Real 2018 precedent; algorithms subject to review |

## Remaining unknowns (all now second-order)

1. Has **any T&T bank** actually adopted the Finerio/Ozone/Visa stack? (Determines whether path 3 is real.)
2. Do the three **unverified TTSEC fintech-policy claims** hold — particularly "Automated Advice Tools" explicitly covering aggregator-plus-advice platforms, and the Innovation Hub/Sandbox path?
3. eMoney's **Monte Carlo trial count and return model** — likely only obtainable via live demo, and not blocking.
4. Does **Yodlee/Envestnet, MX, or Flinks** have any T&T coverage? Salt Edge and Plaid are confirmed zero; the others weren't individually verified, though nothing suggests otherwise.

## Verification stats

5 angles · 21 sources · 95 claims extracted · top 25 verified by 3-vote adversarial panels · **20 confirmed, 2 refuted, 3 unverified (session limit, not merit)** · 94/103 agents completed.
