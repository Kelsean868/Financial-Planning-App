# Caribbean Life Insurance Planning Platform — MVP Design

**Date:** 2026-07-15
**Status:** Draft for review
**Market:** Trinidad & Tobago first, Caribbean thereafter
**Research basis:** [eMoney Premier teardown](../../../research/emoney-premier-research-report.md) · [Round 2 open questions](../../../research/followup-open-questions-answered.md)

---

## 1. What we're building

An insurance-first financial planning platform for Trinidad & Tobago. A registered insurance agent buys a seat; their client gets a portal. The product ingests the policies a client already owns, computes what they actually need under T&T rules, shows the gap, and recommends a package of policies within their budget — producing the Central Bank suitability record as a byproduct.

**Not** a clone of eMoney. Functional understanding only — no code or pixel-exact design copying. The domain layer (T&T tax, NIB, household structure, insurance products) is original and is the moat.

### The three insights this rests on

1. **Insurance changes the regulator.** Life insurance in T&T falls under the **Insurance Act 2018** (+ 2020 amendment, in force 2021-01-01), administered by the **Central Bank** — not TTSEC under the Securities Act. The securities-advice perimeter that constrained a general planning product largely dissolves. *Caveat: investment-linked products (universal life, endowment, annuities) may straddle both regimes — legal review required.*

2. **The aggregation blocker mostly dissolves too.** Round 2 confirmed **no aggregator (Plaid, Salt Edge) covers a single Caribbean bank**. But an insurance-first product's data source is **policy documents**, not bank APIs. We never needed Plaid to read a policy schedule.

3. **Underinsurance is the market.** T&T insurance penetration is **~5.8%** vs a ~7% global average; Caribbean life is a ~$3.4B market. The product's job is to close that gap, not to fight for share of the already-insured.

---

## 2. Decisions locked

| Decision | Choice | Rationale |
|---|---|---|
| **Buyer** | Agent-led marketplace — agent pays, client gets portal | Proven (eMoney's model); matches how the market already works |
| **Segment** | Tied agents first, brokers later | Largest population; comparison features stay behind a flag so we don't offend the first buyer |
| **Wedge** | Policy X-ray first | Only wedge that pays both sides on day one; builds the data asset everything else needs; uncopyable by incumbents |
| **MVP scope** | X-ray + needs gap + portal + recommendation engine + rate catalog | Deliberately ambitious; gated on rate data (see §7 Risks) |
| **AI posture** | AI at the edges, never in the decision path | Regulatory auditability (§4) |
| **Recommender of record** | The registered agent, always | Keeps the vendor outside intermediary registration |
| **Fact-find UX** | Conversation drives, canvas reflects | §5 |
| **Obligation counter** | Agent sees live (quiet); client sees on reveal, via presentation mode | §5.3 |
| **Modes** | **ASSISTED (face-to-face) first, UNASSISTED (client link) second** | Founder's call. Build where the human is present, learn what the tool needs, *then* remove the human's presence once it's trusted. Both modes share one fact-find and one validation gate (§3.2b) |
| **Validation gate** | The agent vets client inputs **and** engine output before anything becomes a recommendation | Makes `agent_recommender_of_record` a mechanism, not an aspiration. The robust defence against a wrong self-serve number |
| **Quotations / rating** | **Deferred — learn the real process from the founder's portal first** | *"What I will do in the future is show you how to do the real calculations in terms of quotations… how to use our actual written portal to run quotes."* The [192-quote rate grid](../../../research/quotations-rate-grid.md) seeds `RateProvider`, but **do not reverse-engineer the quoting process from it** — that's the same inference error that misclassified Platinum Edge |
| **First milestone** | One household, one carrier, three products, end to end — including portal | Vertical slice over completed subsystems |

---

## 3. Architecture

### 3.1 The organizing principle

```
  AI ingestion  ──→  [ DETERMINISTIC CORE ]  ──→  AI explanation
  (documents in)      (decides everything)        (plain language out)
```

**Test of correctness:** if both AI services fail, the product still works and still recommends correctly — it is merely less convenient. If that ceases to be true, the architecture has been violated.

**Why this is non-negotiable:** TTSEC's 2018 robo-advice paper lists **"review of algorithms and methodologies"** as a regulatory focus area; the Central Bank's **Market Conduct Guideline (July 2023)** imposes parallel suitability duties. "The model decided" is not an auditable methodology. An LLM that hallucinates a cover amount is not a bug — it is a mis-selling event.

### 3.2 Components

Each unit states: what it does · how you use it · what it depends on.

#### Domain core (pure — no I/O, no network, fully unit-testable)

**`Household`** — *root aggregate*
- **Does:** models the people who depend on the client, their relationships, obligations, income, and ages. Supports multi-generational and informal dependents (elderly parents, outside children, supported relatives overseas) — not a nuclear couple.
- **Interface:** `Household` value object; built incrementally by the fact-find.
- **Depends on:** nothing.

**`PolicyLedger`**
- **Does:** holds the client's in-force and lapsed policies — insurer, product, cover, premium, riders, cash value, beneficiary, status.
- **Interface:** `PolicyLedger.add(Policy)`, `.inForceCover()`, `.byInsurer()`.
- **Depends on:** nothing. (Populated by manual entry or AI ingestion — it doesn't care which.)

**`NeedsEngine`**
- **Does:** `Household → NeedsProfile`. T&T-localized. **The formula is not invented — it is the standardized T&T instrument** ([fact finder analysis](../../../research/factfinder-analysis.md), from Tatil Life):

  ```
  TOTAL NEEDS  = funeral + medical + outstanding loans + mortgage liquidation
               + rental income for 120 months          ← T&T convention
               + education expense
               + income continuation until last child attains 21   ← T&T convention
  TOTAL ASSETS = savings + existing life insurance + other investments
  INSURANCE NEED = TOTAL NEEDS − TOTAL ASSETS
  ```

  Nets NIB survivors' benefits. **Correctly omits the US estate-tax liquidity driver** — T&T has no estate, inheritance, or gift tax.
- **`120 months` and `age 21` are local conventions, not universal truths** — they live in `ParameterTables` as named, dated, sourced values.
- **✅ MUST model NIS ⊕ SCP jointly — CONFIRMED from primary source, gate lifted.** [Scraped from the Ministry's own page and application form](../../../research/scp-authoritative.md). SCP is means-tested (≤2,500→3,500 · 2,501–3,500→2,500 · 3,501–4,500→1,500 · 4,501–5,500→500 · **>5,500→nil, hard disqualification**), age 65+, residency 20 yrs preceding (absences ≤5) **or** 50 yrs aggregate. **NIS retirement pension counts as assessed income** — the application form requires *"Evidence of National Insurance Benefits"* (item 6) and asks *"how much is your monthly pension?"* (item 31). The **one-time grant is excluded** (not monthly income).
  - **The modal outcome, provable from two primary sources:** no NIS → SCP 3,500 → **total 3,500**. NIS minimum 3,000 → SCP 2,500 → **total 5,500**. **A 3,000 NIS pension delivers 2,000.** And since *every* NIBTT basic rate is below 3,000, most retirees land at exactly 3,000 — landing exactly in the band paying 2,500. **Not an edge case: the common case.**
  - **Counter-intuitive and true:** SCP's maximum (3,500) **exceeds** the NIS minimum pension (3,000).
  - **Cliff-edge guard required:** 2,500 / 3,500 / 4,500 / 5,500 are hard thresholds — at **5,501 one extra dollar costs 500/month**. The engine must refuse to land a client just over a cliff without flagging it.
  - 🔴 **A prior verification round refuted these exact bands 1–2 and declared the interaction unverifiable**, causing this spec to downgrade a correct insight to "fiction." **Both that and the NIBTT fabrication overrode the practitioner and were wrong; both answers sat on the issuing agency's own website.** *Rule: when an agency publishes the number, scrape the agency — a vote over search results is not evidence.*
- **Supports both T&T methodologies, shown side by side** ([analysis](../../../research/existing-assets-analysis.md)): Tatil's bottom-up needs formula (headline) and PALIG's top-down `coverage − net worth` (cross-check). They will disagree. Two credible numbers with a stated basis beats one number with a hidden method — and it directly attacks eMoney's silent-assumption weakness.
- **Consumes per-debt years-to-payoff** as the ladder's decline schedule (PALIG tracks balance + end date + computed years-to-payoff per debt). This is where "declining obligation" actually comes from.
- **Interface:** pure function `computeNeeds(household, params) → NeedsProfile`.
- **Depends on:** `ParameterTables` (injected, never imported).

**`GapCalculator`**
- **Does:** `NeedsProfile − PolicyLedger.inForceCover() → Gap`. Trivial code; it is the money shot of the whole product.
- **Depends on:** `NeedsEngine`, `PolicyLedger`.

**`ProductCatalog`**
- **Does:** structured store of T&T life products — insurer, product type, rate tables (age/sex/smoker/band), riders, underwriting rules, non-medical limits, exclusions, and a `status` field (new/legacy, so the X-ray can identify old products like Cashbuilder on a client's book).
- **Real T&T taxonomy** ([Tatil catalog](../../../research/tatil-product-catalog-and-commission.md)) — the solution space the engine matches need against:
  - **Term:** convertible level (10/15/20/25 yr), term-to-age (60/65/70). **Convertibility is a modelled attribute** — buy cheap term now, convert to permanent later without re-underwriting; a real planning lever no US tool localizes.
  - **Permanent:** whole life, limited-pay whole life (pay 10–30 yr / paid-up at 55/60/65).
  - **Accumulation:** endowment (15–30 yr), fund-linked deferred annuity (conservative/moderate/aggressive), savings+insurance hybrids (Publicsaver).
  - **Specialist:** final expense / simplified issue (Rest Assured, LifeSpan Lite), riders (CI / disability / income protection).
  - **Group:** group life, group annuity, deposit administration.
- **Interface:** `RateProvider` — `quote(product, applicant, coverAmount) → Premium | NoRates`.
- **Depends on:** rate data (external — see §7).

**`RecommendationEngine`**
- **Does:** `(Gap, Budget, Catalog, Constraints) → [Package × 3] + Rationale`. Constrained optimization over a **policy ladder**: term laddering against declining obligation, a whole-life floor for permanent need, CI riders. Maximize coverage adequacy subject to `totalMonthlyPremium ≤ budget`.
- **Emits exactly three differentiated options, not one.** Guardian Life's Decision Meeting agenda is *"Presentation of up to three (3) alternative solutions"* followed by *"selecting the solution that has the best benefits for your needs, wants and preferences."* **The sale is a choice among three, not an accept/reject of one.** Options must be meaningfully differentiated (e.g. maximum cover / balanced / lowest premium) with distinct rationale, not three cosmetic variants.
- **Reasons from a verified [product knowledge base](../../../research/product-knowledge-base.md)** — matching rules per product type, not ad-hoc logic. Load-bearing rules:
  - **The anti-mis-selling guardrail:** when term satisfies the need, term must appear among the three options with its lower cost shown, *even when* a permanent product also fits. Recommending permanent without surfacing the cheaper term that works is a recognized mis-selling pattern — and "no silent truncation" (§4) already forbids omitting it. This is the client-side twin of the commission firewall.
  - **Annuity maturity:** age 50 is a **statutory floor** (an approved plan cannot legally mature before 50) — refuse to model maturity < 50. Age 70 is the exemption edge — *warn* on maturity > 70 (legal, but forfeits the 2026 income-tax exemption). These are different rules, not one window.
  - **Convertibility is a lever:** cheap term now + the right to convert to permanent later with no exam and the original health rating preserved. Carrier conversion windows are product-specific and must come from `ProductCatalog`, never assumed.
  - **Simplified-issue graded benefit:** never present final-expense/no-medical products as first-day full cover — the graded period pays premiums-only on early non-accidental death.
  - **Universal life is the one product that can silently collapse.** `COI = rate(rises with attained age) × NAR(death benefit − account value)`, credited interest set at insurer discretion above a guaranteed floor. Rules: (a) **Option A vs Option B changes everything** — under Option A extra funding shrinks NAR and lowers COI; under **Option B, NAR is pinned at face and funding does NOT reduce COI**, so "over-fund it" is true for one and false for the other; (b) **never present an illustration as a promise** — "vanishing premium" was mass mis-selling (General American: ~251k policyholders, US$55M), and illustration risk is the named hazard; (c) **minimum-funded UL is a time bomb** — it lapses in old age when cover is irreplaceable; (d) UL requires **periodic in-force illustration review**, unlike whole life, which cannot collapse from underfunding.
  - **The protection gap includes group cover that will lapse:** group life reduces 50% at 66 and terminates at 70, so `gap = need − (in-force individual cover + group cover, the latter zeroed from 70)`.
- **`Budget` is elicited as a percentage-of-income band, not a dollar figure**, then normalized to monthly TTD internally. Guardian's field-tested anchor: *"Most of my clients spend between 10–15% of their income… a fortunate few 16–25%… some on a tight budget 5–9%. Into which category would you fall?"* The middle band reads as the norm, the top band flatters, the bottom is the floor. Capturing a raw TTD figure throws the anchoring mechanic away. All product rates normalize to monthly before optimization regardless of the carrier's native billing frequency.
- **Interface:** pure function. **Deterministic and reproducible** — same inputs produce byte-identical output, always. That property *is* auditability.
- **Depends on:** `ProductCatalog` (via `RateProvider`), `GapCalculator`.

**`CommissionCalculator`** — *agent-facing, strictly downstream*
- **Does:** given a recommendation **already fixed**, computes the agent's expected commission from the carrier schedule (heaped first-year + renewal trail; e.g. Tatil Whole Life 60/15/10/5/5/2.5, Destiny annuity 5/3/1+trail — see [catalog](../../../research/tatil-product-catalog-and-commission.md)).
- **🔴 THE FIREWALL — the single most important integrity rule in the system:** **commission is NEVER an input to `RecommendationEngine`.** It is computed only *after* the three options are fixed, for the agent's economics alone, and never influences ranking, selection, or presentation.
- **Why:** first-year commission ranges from **60% (whole life) to 0.5% (Platinum Edge)** for products that can solve the *same need*. An engine that optimizes on commission — even implicitly — steers every client to whole life. That is mis-selling, violates the Market Conduct Guideline, and is the eponymous "silent modeling error" we position against.
- **Turned into a feature:** because we hold commission but refuse to optimize on it, the `SuitabilityRecord` can **affirmatively state the recommendation was made without reference to commission** (a Market Conduct gold standard and a complete answer to "why this product?"), and an optional agent-initiated **transparency mode** can show the client the commission — radical honesty as a post-CLICO differentiator.
- **Depends on:** a *fixed* recommendation + the carrier commission schedule. Never sits upstream of `RecommendationEngine`.

**`SuitabilityRecord`**
- **Does:** the Market Conduct artifact — inputs, rules fired, alternatives considered, rejection reasons, rates-as-of date, catalog version.
- **Key design:** **emitted by `RecommendationEngine`, not built separately.** Compliance falls out of the recommendation for free.
- **The attestation already exists — model ours on Tatil's**, which both client and agent sign and date: *"I understand why the foregoing product(s) have been suggested as suitable for me **and that I can afford to pay the ongoing premiums**."*
- **Consequence:** the standard attestation bundles **suitability + affordability**. Affordability (#5) therefore cannot be deferred as far as §8 currently plans — the signed record already asserts it. v1 must at minimum capture monthly income and expense (fact-find Q2) and assert premium sustainability against them.
- **Depends on:** `RecommendationEngine`.

**`ParameterTables`** — ✅ **IMPLEMENTED: [`/parameters`](../../../parameters/README.md)**
- **Status:** built and verified. `tt-parameters.json` (data + provenance) · `tt-parameters.js` (loader + helpers) · `verify.mjs` (CI checks — all passing). **Shared by the engine AND the public calculators** ([Meeting Zero](#32b-meeting-zero--the-clients-own-conclusion) makes this load-bearing).
- **Enforced by the helpers:** whole-life averaging (not final salary, not last-7-years) · NIS⊕SCP modelled jointly with cliff-edge warnings · health-surcharge exemption at 60+ · the TT$60k cap as a single aggregate returning `headroom` · annuity maturity <50 = ILLEGAL vs >70 = WARN · **increments never guessed silently**.
- **Does:** year-indexed, dated, sourced T&T constants. Seeded from the [T-T-Financial-Insurance-Hub repo](https://github.com/Kelsean868/T-T-Financial-Insurance-Hub), whose **13 dated contribution-rate tables (1972→2016)** already implement the era-selection discipline correctly.

  **All values below carry a verification status from [the July 2026 audit](../../../research/parameter-verification-2026-07.md). Do not encode an unverified value without a flag.**

  | Parameter | Value | Status |
  |---|---|---|
  | Health Surcharge | 8.25/wk above 469.99/mo · 4.80/wk otherwise | ✅ **verified 3–0** |
  | **Health Surcharge exemptions** | **under 16 · 60 and over · pension-only income** | ✅ **verified 3–0** — *material: never charge a 62-year-old* |
  | Combined deduction cap | **TT$60,000** | ✅ **verified 3–0** — MoF's TT$30,000 page is a stale 2009 figure that *conflicts with* law |
  | NIS contribution rate | **16.2%** eff. 2026-01-05, ⅓ ee / ⅔ er | ✅ **verified 3–0** |
  | NIS classes & ceiling | 16 classes. I: 867–1,472.99/mo, 43.80/wk. XVI: **13,600+/mo**, 508.50/wk (169.50 ee / 339.00 er) | ✅ **verified 3–0** |
  | Pension formula | `basic + floor(excess/25) × increment` | ✅ **verified 3–0** (structure) |
  | **Averaging basis** | **WHOLE WORKING LIFE** — *not* final salary, *not* last 7 years | ✅ **[NIBTT training transcript](../../../research/nis-training-findings.md), verbatim** |
  | **Qualifying conditions** | 150 contributions incl. 50 in last 3 yrs · **OR employed 5 of last 7 yrs** · AND 750 for a pension | ✅ transcript — *the "7 years" is an **eligibility gate**, not the averaging window* |
  | **NIS per-class benefit rates** | **Class I 566.72 · Class XVI 4,079.40** (eff. **2016-09-05**) | 🔴 **repo holds the STALE 2008 table** — [see](../../../research/nibtt-benefit-rates-RESOLVED.md). Blocking. |
  | **NIS increments** | 2008: +4.90 … +46.76. **2016 values unpublished** | 🔴 **UNRESOLVED — do not guess** |
  | Minimum pension binds for | **Classes I–XII** (XIII–XVI now exceed 3,000 on basics alone) | ✅ derived from 2016 table — *the earlier "every class is below the minimum" claim is **struck**, it was an artifact of the stale 2008 values* |
  | Contribution credits | 750 may include **paid, Voluntary, Age Credits, Benefit Credits** | ✅ source — *not just paid weeks* |
  | Claiming age 60–64 | Requires **ceasing insurable employment**; at 65 paid regardless | ✅ source |
  | Pension threshold | 750 contributions → lifetime pension; below → grant | ✅ **verified 3–0** + transcript (*"it doesn't matter when, throughout your lifetime"*) |
  | Benefit ceiling | Earnings above **13,600/mo contribute at Class XVI but do not increase the pension** | ✅ transcript/folder — *an honest, rules-based argument for private provision* |
  | Minimum retirement pension | **3,000/mo** eff. 2012-02-01 | ✅ **verified 3–0** — a challenge claiming the minimum attaches to the *grant* was **refuted 0–3** |
  | Retirement Grant | 3 × monetary value, min 3,000 | ✅ **verified 3–0** |
  | Retirement age | 60→65, +1yr/2yrs from Jan 2028, reaching 65 in **2036** | ✅ **verified 3–0** |
  | **19.2% from Jan 2027** | rate + derived class tables | 🟡 **PROVISIONAL (2–1)** — budget announcement + arithmetic (16.2+3), **no gazetted schedule exists.** Never show 2027 figures as settled |
  | **Finance Bill 2026 annuity exemption** | s.8(1)(ta)/(tb): approved deferred annuity + pension income exempt from 2026-01-01 — **only if resident purchaser and maturity between ages 50 and 70**. New s.18D: lower of 20% of income or TT$20,000 | 🟡 **BILL, not Act** — passed House 28–0 (13 abstentions) June 2026; **Senate + assent unverified.** Code conditional on assent |
  | Personal allowance | 90,000/yr | ⚪ **unverified** — only negative evidence (Bill doesn't change it) |
  | PAYE bands | 25% ≤ 1M, 30% > 1M | ⚪ **unverified** — negative evidence only |
  | **70% NIS deductibility** | 70% | ⚪ **entirely unverified** |
  | **SCP means-test** | ≤2,500→3,500 · ≤3,500→2,500 · ≤4,500→1,500 · ≤5,500→500 · >5,500→**nil** | ✅ **[scraped from social.gov.tt](../../../research/scp-authoritative.md)** |
  | **SCP age / residency** | 65+ · 20 yrs preceding (absence ≤5) **or** 50 yrs aggregate | ✅ source |
  | **NIS pension = SCP assessed income** | yes (grant excluded) | ✅ **source — application form items 6 & 31** |
  | Annuity surrender tax | 25% | ✅ earlier research |
  | Benchmark allocation | Tax 15 · Loans 25 · Pension 10 · Life 5 · General 5 · Savings 10 · Living 30 | ✅ **market-standard** — identical across PALIG (2012) and Maritime |

  🔴 **`PENSION_RATES` IS OUTDATED — update to the 2016 basics. BLOCKING.** ([full account](../../../research/nibtt-benefit-rates-RESOLVED.md)) NIBTT publishes retirement/invalidity benefit rates **in two places with different values and does not reconcile them**: the *Benefits* section serves a **stale 2008 table** (335.83 … 2,475.70 — what the repo holds, and what its own Retirement pages link to), while the **current 2016 table** (eff. 2016-09-05, Class I **566.72** … Class XVI **4,079.40**) sits under `/Contribution_Rates/`. Current values are ~69% higher. **Understated NIS → overstated gap → recommends more product — a real mis-selling exposure on a signed suitability record.**
  - ⚠️ **Increments unresolved:** the 2016 table publishes basics only, no increment column. Whether the 2008 increments (+4.90 … +46.76) still apply is **unknown — do not guess.** The formula is confirmed; the current increment values are not.
  - 🔴 **I twice told this project the opposite, and was wrong both times.** First I called the 2016 figures a fabrication after scraping one page; the founder's pointer to the rates section found them exactly as reported. **Rule: scraping is not verification either — one page is a sample. When a number is disputed, find every page the issuer publishes it on and reconcile. Agencies contradict themselves; NIBTT demonstrably does.** Every single-page "confirmed from source" claim in this project — including the SCP bands — needs a second source.

  ✅ **NIBTT runs TWO rate systems with DIFFERENT rules — the sitemap settles it:**
  - **CONTRIBUTION rates (what you pay) — era-selected.** Dated sets: 1972–2006 · 2008–2012 · 2013–2014 · 2016 (13.2%) · 2026 (16.2%). The 2016 page is live **because contributions paid Sept 2016 → Jan 2026 were made at 13.2%** — current for its period, not stale.
  - **BENEFIT rates (what you get) — single current table, applied at QUALIFICATION.** Seven such tables exist (retirement/invalidity, survivors, sickness/maternity, employment injury ×3, constant care). NIBTT's own wording proves the rule: *"Rates … for persons **qualifying on or after 7th January 2008**."* Keyed to when you qualify, not when you contributed — which is exactly why the table carries one date and no history.

  **Both halves of the repo are architecturally correct.** `getTableForDate()` era-selects contributions ✅; `PENSION_RATES` is a single claim-date table ✅. **Only defect: missing provenance** — add `effective 2008-01-07` + source URL.

  🔴 **A prior verification round claimed 3–0 that these rates were "18 years obsolete, understating pensions by ~40%" and gave replacement figures (566.72 / 4,079.40) that appear nowhere on NIBTT.** It carried the 2016 *contribution*-table date onto the *benefit* table and fabricated values to match. **Had it been actioned it would have written a real mis-selling bug into the engine** — understated NIS → overstated gap → recommend more product. **Rules: scrape the issuer's own page before "verifying" a published number; a unanimous vote is not truth; when verification contradicts a practitioner, go to source before overriding them.**

  ✅ **THE FINDING THAT MATTERS — restated correctly on the 2016 table.** *(An earlier draft claimed "every basic rate, all sixteen classes, is below the 3,000 minimum" and that "a top earner needs ~20 years just to beat the floor". **Both were artifacts of the stale 2008 values and are struck** — see the parameter table above. The corrected version is weaker but true, and true is the only version worth having.)*

  Under the **current 2016 basics**: the **3,000 minimum binds for Classes I–XII**; XIII–XVI clear it unaided (3,256.50 … 4,079.40). So the minimum is still the operative rule **for most contributors**, but not for all — and the top class is no longer below it.

  **The honest, verifiable case remains strong and rests on four public NIBTT facts:**
  1. **Whole-life averaging** — your pension reflects your whole career, not your final salary.
  2. **The 13,600/mo insurable ceiling** — earn above it, contribute, receive nothing extra.
  3. **The 3,000 minimum, unindexed since 2012** — the 9th Actuarial Review explicitly recommended holding it there.
  4. **The NIS⊕SCP offset** — a 3,000 NIS pension delivers only 2,000 net, and Classes I–XII land exactly there ([confirmed](../../../research/scp-authoritative.md)).

  Together with the actuary's own **GAP of 25.5%** against a rate reaching 19.2% in 2027, these support the framing **"NIS is a floor, not a plan"** — from the issuer's own tables, with no sales framing and no exaggeration required. **That restraint is the point:** the dramatic version of this claim was the one that turned out to be false.

  ⚠️ **Do not encode the `NIS Stuff` markdown files.** Three of them give three different answers for the same figure (Class XVI: $6,799 vs $5,500 vs "$10–12k estimated"), none matching the repo or the verified NIBTT schedule. The "50% of assumed average weekly earnings" method in them is an **inference** — its own text says the pension *"appears to be approximately 50%"* — whereas the transcript describes a **lookup table of basic rates + increments**. Authoritative chain: *published dated NIBTT benefit schedule → basic + increments → lifetime-average class lookup.*

  Also required: Section 134(6), and **public servants' pension + gratuity** — unverified; *lead:* Finance Bill 2026 cll. 4–5 (Prison Service Act 5th Sch.; Police Service Regs reg. 183A).

- **Hard rule: no T&T parameter is ever a constant in code — and provenance is PER-PARAMETER, not per-page.** Three independent proofs now support this:
  1. The government's own Ministry of Finance page publishes a stale **TT$30,000** cap (a 2009 figure) that *conflicts with* current law — killed 0–3 in Round 1.
  2. **The repo's contribution tables are stale at 2016 and its benefit rates at 2008** — written by an author who knew to date them. The architecture was right; the data drifted anyway.
  3. **NIBTT's own site is internally inconsistent.** Its FAQ page still states the 2016 rate of **13.2%** with no mention of 16.2% — while the **TT$13,600 ceiling on that same page is current.** One page, one right constant and one wrong one, silently.

  **Therefore:** every parameter carries its own source URL, retrieval date, and review date. Trusting a *page* is not a strategy. A staleness check runs in CI.
- **Migration action:** port the table structure; refresh contribution tables to 2026; **replace benefit rates with the 2016 schedule**; add 2027 as PROVISIONAL; add Health Surcharge exemptions; add the Finance Bill 2026 exemption gated on assent.

#### Edges

**`AIIngestionService`** — document → structured `Policy`. **An accelerant, never a dependency.** Structured manual entry is the primary path (~90 seconds per policy). Output is *always* agent-confirmed before entering the ledger.

**`AIExplanationService`** — engine output → plain language for the portal and the suitability narrative. **Never decides anything.**

**`ClientPortal`** — read view: household, policies, need, gap, proposed package.

**`PresentationMode`** — a client-safe render of the agent's live session. Same data, different view. Explicit toggle (§5.3).

### 3.2b Two modes: ASSISTED and UNASSISTED — one tool, one validation gate

**The organising intent:** *"not a system that replaces me, but one that augments what it is I do… A lot of clients these days want to do their own research and want to trust their own numbers and their own calculations. By building a system that allows them to do that and, at the same time, refer it back to me so that I can actually be the one providing those solutions."*

**This is NOT a shallow public teaser plus a deep agent tool. It is ONE fact-find with two modes, and a human gate between the client's output and any recommendation.**

#### Mode A — ASSISTED (face-to-face) · **BUILD THIS FIRST**
> *"if we are in a meeting and we are one-on-one or face-to-face with the client, we can use the tool to conduct the fact-finding and help with some solutions."*

Agent and client, one screen, one table. This is the §5 design: *conversation drives, canvas reflects*; the dual-view obligation counter; presentation mode. **The agent is present, so the agent is the interpreter in real time.**

#### Mode B — UNASSISTED (client link) · **THEN THIS**
> *"We can serve a link to the client… they could kind of do it on their own with us at the backend. They enter the information, and they can see the potential, **but it will still be validated by a real agent**. Even if they go through the whole process at 2:00 in the morning, a real insurance agent or financial advisor will vet what they entered and what the system came up with. They will give them a call to go through and possibly adjust it or give better advice for a better solution."*

A **named client**, sent a **personal link** — not an anonymous public calculator. They complete the **same full fact-find** on their own time. They see **"the potential" — ideas, not a recommendation.** The agent watches from the back end.

#### 🔑 The Validation Gate — the architectural heart of both modes

```
 Mode A (assisted)          Mode B (unassisted)
 agent + client at a        client alone, on a link,
 table, together            "sees the potential"
        │                            │
        └──────────┬─────────────────┘
                   ▼
        ╔═══════════════════════════╗
        ║   VALIDATION GATE          ║   ← the agent vets BOTH:
        ║   agent vets INPUTS        ║      (a) what the client entered
        ║   agent vets OUTPUT        ║      (b) what the engine produced
        ╚═══════════════════════════╝
                   ▼
        agent calls → adjusts → advises → closes
                   ▼
          RECOMMENDATION (agent is recommender of record)
```

**This gate is what makes `agent_recommender_of_record` a mechanism rather than an aspiration.** Nothing the client sees unassisted is a *recommendation* — it is a **projection of potential**. The recommendation only exists once a registered agent has vetted it. That is:
- **Regulatorily clean** — the agent is the recommender under the Insurance Act; the software proposes, the agent disposes.
- **Commercially right** — *"we as the insurance agent can pick up from there to bring them to a close."*
- **The answer to the self-serve risk** (below).

#### 🔴 The self-serve risk — and why the gate is the real answer

> **A wrong self-serve number is worse than no number.** A client with conviction built on a bad figure is **harder to correct** than one with no figure — you are arguing against their own arithmetic, which they trust more than yours.

**Not hypothetical:** the public calculators held the **stale 2008 NIS benefit table** (Class I `335.83` vs the current `566.72`) — understating the pension by **69%**, overstating the retirement gap, selling more product. The self-serving direction, wearing *the client's own authority*.

**Two defences, and we need both:**
1. ✅ **Correct parameters** — [`/parameters`](../../../parameters/README.md) is implemented: one source of truth for the engine **and** the calculators, every value carrying effective date, source, retrieval date and status; `verify.mjs` in CI for both repos. Keep the calculators' `HISTORICAL_EARNINGS_TABLES` + `getTableForDate()` — that design is *correct*; only the *benefit* table was wrong.
2. ✅ **The human gate** — *"it will still be validated by a real agent."* **This is the more robust defence.** Parameters can still drift, a client can still mis-enter, and the engine can still hit a case nobody modelled. **The agent catches it before it becomes conviction.** Defence 1 alone assumes we are never wrong; the gate assumes we sometimes are.

**Copy rule for Mode B:** the client sees **"here's the potential"**, never *"here's your recommendation."* Surface every `caveat` from `ParameterTables` in the client UI too — when the engine says *"increments unconfirmed"*, the client's screen says so. **An honest gap beats a confident wrong number**, especially when the client owns the number.

#### What differs between the modes — and what must not

**Same:** the five questions · the household canvas · the needs engine · the gap · the parameter tables · the validation gate.
**Different:** who drives; whether interpretation is live or deferred; the obligation counter (dual-view with presentation mode in Mode A — in Mode B there is no agent to hide it from, so the client simply sees the reveal); and the copy register (Mode A can be conversational because a human carries the tone; Mode B must be self-explanatory).

**Do not build two fact-finds.** Build one, with a `mode` flag and an agent-presence assumption.

#### Where the public calculators actually sit

The [five public calculators](https://github.com/Kelsean868/T-T-Financial-Insurance-Hub) are a **third, separate thing** — **anonymous, SEO'd, top-of-funnel**. No named client, no link, no gate. They are Principal's *Approach* step and they create the lead. **Mode B is mid-funnel**: a named client, invited, validated. Do not conflate them — but **they must share `ParameterTables`**, because a stranger who computes a wrong NIS pension at 2am and never speaks to anyone is the one case the gate cannot catch.

#### Why this is strategically strong
- **Self-discovery disarms the objection literature.** Most of the sales craft catalogued here ([Tolani's 37 objections](../../../research/ocr-extracted-corpus.md), [Banhelyi's 125 phrases](../../../research/power-phrases-taxonomy.md)) exists to overcome resistance to a conclusion *the agent* reached. **If the client reached it themselves, most never fire.** Banhelyi #45 — *"What formula did you use to arrive at the amount of life insurance you have?"* — becomes something they answered at 2am.
- **It makes the commission firewall honest rather than merely virtuous.** The client did their own maths; the engine never saw commission. The recommendation **wasn't sold — it was derived.**
- **The agent stays irreplaceable where it counts:** underwriting, placement, and the knowledge a calculator cannot hold — that LifeSPAN pays **+25% on breast cancer**, that a Registered Destiny can only mature **50–70**, that their Cashbuilder may be **silently lapsing**.

### 3.3 Data flow — a relationship with checkpoints, not a wizard

The sale is **usually two meetings, often three or more** (practitioner confirmation; Guardian documents two, PALIG's contact sheet tracks three). **Do not hardcode a step count.** A wizard that ends at step 2 either blocks the real conversation or forces the agent to lie to it.

**The plan has a state, not a step number. The portal is the continuous line; meetings are punctuation.** Any meeting can advance the state, revisit it, or add nothing. A six-meeting relationship is a supported path, not an error.

The canonical shape below is the *common* case, not the required one.

```
┌─ MEETING 1 · DISCOVERY (~40 min) ────────────────────────────┐
│  Triage: "What's on your mind?"        ← adapts everything    │
│  → fact-find: 5 questions, conversation drives/canvas reflects│
│  → PolicyLedger seeded (manual entry, AI-assisted)            │
│  → NeedsEngine → GapCalculator → gap surfaces                 │
│  → budget elicited (% band anchor)                            │
│  → "here's what to bring next time"    ← THE X-RAY HOOK       │
└───────────────────────────────────────────────────────────────┘
                          ↓
              ┌─ BETWEEN · ClientPortal ─┐
              │  This is the portal's    │
              │  structural job.         │
              └──────────────────────────┘
                          ↓
┌─ MEETING 2 · DECISION ───────────────────────────────────────┐
│  Changes since last time → review concerns                    │
│  → RecommendationEngine → THREE options (15 min)              │
│  → client selects (10 min)                                    │
│  → AGENT REVIEWS, ADJUSTS, APPROVES   ← the regulatory hinge  │
│  → SuitabilityRecord signed by both                           │
│  → paperwork + first premium → medical exam if needed         │
└───────────────────────────────────────────────────────────────┘
```

Three consequences:

1. **The client portal's job is the gap between the meetings.** Not a nice-to-have — that's its structural purpose, and it's why the agent-led marketplace model is right.
2. **The Policy X-ray slots into an existing ritual.** Agents *already* end Meeting 1 with "here's what to bring" — our wedge doesn't create a new behaviour, it instruments one that exists.
3. **The agent's approval step** keeps the vendor out of the intermediary perimeter. Not optional, not skippable.

---

## 4. Regulatory design

- **Registered agent is the recommender of record.** Software proposes; the agent disposes. Note "insurance consultants" are themselves a registered category under the Insurance Act — the vendor must not act as one.
- **Annuities are IN SCOPE. In T&T, annuities fall under the life licence** — a CBTT-registered life agent is licensed to sell them, and no TTSEC registration is involved. *(Source: founder, a CBTT-registered agent of 13+ years. Consistent with Tatil's own disclaimer that its agents "are only authorised to sell Tatil Life products," and with Round 2's finding that Securities Act "investment advice" attaches to **securities** specifically.)* This supersedes the earlier deferral, which was based on my inference rather than practitioner knowledge.
- **Consequence — retirement becomes first-class in v1, not roadmap.** It is Tatil's Need #1, the engine substantially exists in the repo, the SCP clawback is our strongest insight, and it is the founder's deepest expertise. The triage architecture already routes to it as a distinct journey.
- **Still out of v1:** unit-linked / investment-linked products where an explicit securities component may attach. Narrow, and revisit with counsel — do not let it re-block annuities.
- **Every recommendation carries provenance:** rates as of date, source, catalog version, rules fired, alternatives rejected and why.
- **No silent truncation.** If the optimizer couldn't evaluate a product (missing rates), it says **"cannot evaluate product X — no rates"**. Silently omitting reads as "we considered everything" when we didn't — the exact mis-selling failure mode.
- **Legal review required before launch** on: the investment-linked boundary, whether the software constitutes intermediary activity, and Data Protection Act s.6(l) hosting (below).

**Data protection:** Only Part I (ss.1–6) of the T&T Data Protection Act 2011 is proclaimed. But **s.6(l) is live today**: personal information disclosed outside T&T may only go to jurisdictions with comparable safeguards. This constrains cloud hosting — EU/UK (GDPR) reads as comfortably comparable; US-only is a harder argument. Build to the unproclaimed Part IV anyway: **s.69 would capture this product even if hosted abroad**, and proclamation is a switch someone can flip.

**Central Bank:** the CBTT payment-services perimeter (money transfer, payment instruments, clearing/settlement, e-money, wallets, remittances) **does not enumerate read-only data aggregation**. A product that never moves money is likely outside PSP registration. Argument from omission on the regulator's own page — confirm with counsel.

---

## 5. Fact-find UX — "conversation drives, canvas reflects"

The most-hated moment in insurance sales. eMoney's answer is a dense form that takes **3–6 months to master** and that its own 5-star reviewers call "kind of clunky." RightCapital beats it on ease, not power. That is the bar.

### 5.0 Information architecture — adopt Tatil's "Four Basic Needs"

**Do not invent a framework.** T&T agents are already trained on, and clients have already heard, Tatil Life's four needs:

1. **Retirement income**
2. **Financial security in event of death**
3. **Money to assist in event of critical illness**
4. **Money to assist with major expenses (education etc.)**

Using the incumbent framing makes the tool legible to an agent on day one — that's agent ramp (#10) for free.

### 5.1 The combined pattern

**Triage first.** Open with *"What's on your mind right now?"* — Guardian's concern checklist reduced to ~8 tiles, self/spouse. Everything downstream adapts to what they point at. **This is the mechanism that makes "five questions, not twelve" honest:** you don't shorten the fact-find by asking less, you triage and ask only what's relevant.

Then one calm question at a time (never a scrollable form) — while the **household canvas** grows beside it. The conversation does the input; the canvas holds the context. On mobile the canvas collapses to a ribbon of faces with the running total pinned right.

**The five questions** ([derivation](../../../research/factfinder-analysis.md)):

1. **Who depends on you?** → canvas. *"A parent, a nephew, someone overseas. It doesn't have to be official."*
2. **What comes in, what goes out?** → monthly income **and** monthly expense (Tatil captures both; US tools typically capture only income).
3. **What do you owe?** → mortgage, loans, cards — balance, installment, years to go.
4. **What do you already have?** → life insurance, savings, NIS/pension. **This is the X-ray.**
5. **What would you want to happen?** → one soft question, selected by triage.

**The soft questions are field-tested, not invented** — lift them from Guardian's instrument: *"What do you believe life insurance should do for you and your family?"* · *"If you suffered a long term disability for say 6 to 12 months, how would your bills be paid?"* · *"What are some of the things you plan to do when you retire? Paint a picture for me."*

**Validation for the canvas:** Guardian already asks *"If there was an immediate need to fund a major surgery for your parents or family members… how would you help fund it?"* The informal-dependent obligation (#14) is **already in the incumbent's script** — we are making an existing, awkwardly-worded question structural, not inventing a need.

### 5.1b Depth lives in the engine; the interface shows consequences

**The test for any new domain discovery: does it add a question, or an insight?** If it adds a question, it failed. Everything the research surfaced — 16 NIS classes, four SCP cliffs, Health Surcharge, PAYE brackets, 70% deductibility, two needs methodologies, the benchmark — is **derived from the same five answers**, not asked. The only addition is *"when did you start working?"* (NIS contribution weeks), which fits the conversation rather than a form.

**Insight is rationed, not dashboarded.** We have three strong revelations and showing all three is how this becomes overbearing. **Triage selects which one you get:** "retirement" → the SCP clawback · "my family" → the canvas and the gap · "debt" → the leak. One journey, one headline.

**The Quality Rater is repurposed, not shipped as designed.** PALIG's Excellent→Unacceptable labels grade a client against a benchmark they never agreed to; a gentler word doesn't fix that. **Drop the labels and the scorecard; keep the variance; express it in dollars; surface only the largest.** *"Loans take 34% of what you earn. Typical in T&T is 25%. That gap is $1,100 a month."* — a fact, not a verdict, and it **explains the leak** rather than existing as a separate report card. No judgment to hide, so nothing needs hiding.

### 5.2 What makes it relaxed — these are requirements, not polish

- **Never more than one question on screen.** No form to dread.
- **Five questions, not twelve.** Honest progress. Depth comes later, once the client is invested.
- **Everything skippable.** "That's everyone →" always available. No red validation errors mid-flow.
- **Permission language.** *"It doesn't have to be official"* — this is the line that lets someone name an outside child or a supported nephew. It is the household model earning its place in the UI.
- **Visible accomplishment.** The canvas grows; they're building, not being audited.

### 5.3 The obligation counter — dual view

**Decision: agent sees it live; client sees it on reveal.** Mirrors eMoney's Decision Center **Presentation View** (2025 redesign) — a separate client-facing render of the same live session.

Two mechanics make this legitimate rather than sneaky, and both are **required**:

1. **Presentation mode is a hard toggle**, not a hope. Same session, client-safe render, entered deliberately.
2. **The agent's number stays quiet** — a small glanceable figure in a status bar, not a banner. In T&T, agent and client are frequently at one kitchen table looking at **one laptop**. If the client catches the number, they must see a practitioner's instrument panel, not a concealed sales gauge. In a market still carrying the **CLICO** wound, getting this wrong doesn't cost a sale — it costs trust.

The client's phone becomes the true second screen via the portal, but **the MVP must not depend on that being present in the room.**

---

## 6. Testing

- **`NeedsEngine`** — golden-file tests against hand-computed T&T cases (NIB survivor offsets, funeral, education, mortgage; assert no estate-tax driver).
- **`RecommendationEngine`** — property tests: never exceeds budget; never recommends an ineligible product; always produces a rationale; never silently drops a product.
- **Determinism test** — identical inputs run twice, diff the output. Must be byte-identical.
- **`ParameterTables`** — assert every parameter has a date and a source; assert no bare numeric constants in domain code.
- **Ingestion** — AI output must always route through agent confirmation; test that unconfirmed extractions never reach the ledger.

---

## 7. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| ~~Rate data is outside our control~~ | **Downgraded High → Medium** | **The founder is a CBTT-registered agent with 13+ years** ([analysis](../../../research/existing-assets-analysis.md)) — design partner, first user, rate-book source, and recommender of record are all in-house. Still: `RateProvider` interface, seed with **one carrier, 2–3 products**. Adding carriers = data entry, not engineering. **Do not attempt to launch with the whole market.** |
| **Parameter drift** | **High** | Proven twice: the government's own site published a stale TT$30k cap, and the repo's tables — written by an author who *knew* to date them — are stale at 2016. Every parameter carries a source + review date; a staleness check runs in CI. |
| OCR of heterogeneous policy documents is hard | Medium | Manual entry is the primary path; OCR is an accelerant added after seeing real documents. MVP does not bet on it. |
| Investment-linked products straddle two regimes | Medium | Deferred from v1. Legal review before adding annuities/UL/endowment. |
| Client under-reports dependents to game the counter | Medium | Resolved by §5.3 dual view — client doesn't see the number while building. |
| T&T parameters are mid-phase (NIB 16.2%→19.2%, retirement age from 2028) | Medium | Year-indexed tables + re-verify before launch. |
| Agency gatekeeps tied agents | Medium | Agency is the buyer, not an obstacle — compliance + persistency + ramp is the agency pitch. |

---

## 8. Scope

### Scope is stated in Tatil's four needs — the framework agents already use

| # | Need | v1? |
|---|---|---|
| 1 | **Retirement income** | **✅ In** — engine exists in repo; SCP clawback is our best insight; founder's deepest expertise |
| 2 | **Financial security in event of death** | **✅ In** — Tatil's needs formula; the X-ray wedge |
| 3 | Money in event of critical illness | ⏳ Next |
| 4 | Money for major expenses (education) | ⏳ Next |

Two of four is a defensible v1: they are the two largest needs, both engines substantially exist, and **triage routes between them** — so the architecture doesn't change when 3 and 4 arrive.

### In (MVP)
Household model (#14) · Policy X-ray (#2) · Needs engine — **death + retirement** (#1) · **NIS ⊕ SCP engine** · Gap · Rate catalog, one carrier (#12) · Recommendation/laddering engine (#11) · Suitability record (#3, free) · **Affordability** (#5 — the signed attestation asserts it) · Client portal · Fact-find UX · **Leak + benchmark variance** (repurposed Quality Rater)

**Annuities and the TT$60k envelope (#6) are in**, following the licence finding in §4.

### Out (roadmap, in rough order)
Lapse prevention (#4) · Book dashboard (#15) · Underwriting pre-qualification (#13) · Health-shock/CI modeling (#7 = Need 3) · Education planning (Need 4) · Probate-bypass & beneficiary hygiene (#8) · CLICO trust layer (#9) · Agent accelerator (#10) · Broker comparison (behind flag) · Claims support · Inflation/FX erosion · Group benefits gap · **Public servants' pension** *(a distinct segment with its own regime — a targeting decision, not a feature)*

### Explicitly not doing
Bank account aggregation (no aggregator covers T&T — confirmed) · **Bank-statement import** (demoted: getting statements from clients is a hard trust ask; the *policy* ask survives because agents already collect exactly that data) · Securities advice · Unit-linked/investment-linked products in v1 · Copying eMoney code or exact UI

---

## 9. First milestone

**One household, one carrier, three products, end to end — including the portal.**

Not: any subsystem built to completion. The vertical slice proves the architecture, the regulatory posture, and the both-sides value proposition simultaneously — and it's the smallest thing an agency can actually look at and buy.
