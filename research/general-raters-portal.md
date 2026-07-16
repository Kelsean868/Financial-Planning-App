# General_Raters_Portal — the general-insurance rating engine that already exists

**Source:** [github.com/Kelsean868/General_Raters_Portal](https://github.com/Kelsean868/General_Raters_Portal) (+ referenced `TATILraters`), fetched 2026-07-16
**Status:** 🔴 **This supersedes my "capture, don't quote" recommendation.** That advice rested on the assumption that general-insurance rating would be a scope explosion. **It's already built.**

---

## What it is

**TATIL motor/property/health rating & quoting — agent-built tooling** (explicitly *not* TATIL's official corporate system), by the founder. T&T-specific, Tatil-specific, with real rate tables.

**Full workflow, already implemented:**
`Client intake → Rating engine → Manager approval → Client proposal → Official CSR forms → Pipeline management`

**Stack:** HTML/JS/TS, **Supabase** (Postgres + edge functions), PWA. Rating logic in `motor-rates.js`, `property-rates.js`, `health-rates.js`, mirrored as edge functions (`02-04-edge-function-rate-*.ts`) over `01-schema-motor-v3.sql`.

---

## The rate engines are real

### Motor
- **Base rates (% of Sum Insured):** Private Comprehensive **0.08** · Platinum Standard 0.08 · **Platinum Qualified 0.0195 flat net** · Campaign 0.02 flat net · Third-Party **TT$1,700** (<2000cc) / **TT$2,000** (2000cc+)
- **Commercial by usage:** Private Pick-up 0.08 + $1,700 base · Own Goods 0.085 + $2,200 · Cartage 0.10 + $3,500 · Commercial TP by HP: $2,200 (≤30) / $2,700 (31–50) / $3,700 (>50)
- **NCD scale (years claim-free):** Private Comp `[0, 25, 35, 45, 60, 60]%` · Private TP `[0, 15, 20, 25, 35, 35]%` · Commercial `[0, 15, 20, 25, 35, 35]%` · Platinum `[0, 25, 35, 45, 60, 60]%`
- **Loadings:** Age 17–24 → Comp +20% / TP +50% · Experience <2yr → +20%/+50%, exactly 2yr → +10% both · Listed occupation → +10%/+25% · **EV/Hybrid +20%** · **Honda City +30%**
- **Floors:** Comp min net rate **2.5% of SI** · Platinum **1.95%** · Min premiums: Comp **$2,000** · TP **$1,150** · Platinum **$7,500**
- **Options:** Windscreen 10% rate (free to $5,000 Comp / $20,000 Platinum) · Personal Accident $200 Comp / $100 TP · Loss of Use $400 (free on Platinum) · Increased TPL $2,500 (Platinum only) · Vehicle excess 3% of SI
- **Tax 6%; exempt at age 60+**
- **Rule encoded in the UI:** *"only 2 discounts may be applied per vehicle, including NCD"* · Staff/Other Motor 10% each · Multi-Client 15%

### Property — HomeSure
- **Building:** standard **$3.75 per mille** · hard floor $3.50 (discouraged) · **flood-prone $5.00**
- **Contents:** general **0.4%** · electronics **1%** · jewellery = territory All Risks rate · special items 1%
- **All Risks (Section 3):** on-premises 0.50–0.75% · T&T 1.5% · West Indies/Worldwide 2.00–2.25% · flat addon 0.4%
- **Personal Accident (Section 5):** **$30 per person** (18–65)
- **Free liability with Building or Contents:** public liability **$250,000** · domestic servants **$100,000**
- **Flood:** rate-based ($5.00/mille) or excess-based ($2,500 standard / $5,000 increased)
- **Underwriting referral triggers:** flood-prone · subsidence/landslip · non-concrete construction · catastrophe claim in 5 years · prior declination/cancellation · business use or 40+ day vacancy
- **IPT 6%, waived age 60+**

### Health — CoverCare
- **Three tiers:** Base Plan (IAH6) · Major Medical (5 levels, **$50K–$500K**) · **Elite CoverCare** (requires **min monthly income TT$12,000**)
- **Age bands:** <40 · 40–49 · 50–59 · 60–65 · 66–67 · 68–70. **New business entry caps at 55**; standard terminates at **70**, Elite extends to **75**
- **Cover shapes:** single male · single female (±maternity) · husband/wife (±maternity) · children 0 / 1 / 2+. **Maternity only ages <40–49**
- **Major Medical benefits:** R&C surgery $300K+ · physician visits $100–250 · specialist $200–500 · **monthly drug allowance $800–$4,000**
- Annual / semi-annual / quarterly frequencies

---

## 🎨 The design system — and a striking convergence

The repo carries a full design system with an explicit visual language:

| | General_Raters_Portal | What I independently chose for the fact-find mockups |
|---|---|---|
| Primary | **deep teal `#04323C`** | teal `#0E7C7B` |
| Accent | **gold `#C8A24A`** | gold `#A57C1B` |
| Headings | Source Serif 4 | Charter (serif) |
| Body | Montserrat | system sans |

**We converged on teal + gold + serif-headings independently.** That is not a coincidence worth ignoring — it means **the two products can share one visual identity without either being redesigned.** Use the repo's tokens; they're the established ones and they're already in production with agents.

**Design rules worth adopting wholesale:**
- Cards: white, 1px border, **14px radius**, soft shadow. **Manager-level cards upgrade to gold borders + raised shadow** — a status signal, not decoration.
- **≥44px touch targets**; teal focus ring `0 0 0 3px rgba(4,50,60,.12)`.
- Signature treatment: **"gold caps on dark teal"** for key statistics.
- Unicode glyphs (↧ ✓ ×) — no icon fonts, no gradients, minimal animation.
- Dates `dd-Mmm-yyyy`; money `$6,240.00` with TT$ implied.

**The content tone is already exactly right, and matches our fact-find principles:**
> *"an experienced agent talking to a colleague or client"* — no marketing language; insurance terminology stays **precise** (net rate, NCD, loadings, sum insured) rather than simplified; hints and caveats are **specific and honest**.

---

## Why this changes the recommendation

My earlier "capture, don't quote" rested on three arguments. **The repo kills the biggest one:**

| Argument | Status |
|---|---|
| *"Building 3 more rate engines triples your #1 risk"* | 🔴 **DEAD** — motor, property and health raters exist, with real Tatil rate tables |
| *"It changes what the product is"* | 🟡 **Weakened** — the founder already does general insurance; it's not a pivot, it's his actual book |
| **"Tatil and Tatil Life are separate companies — licence question"** | ✅ **STANDS — and is now the only real constraint** |

**The question is no longer "should you capture general insurance?" It's "should these be one product or two?"**

---

## The real question: one product or two?

**What genuinely argues for one:**
- **The client is one person.** Their protection gap spans life, motor, home, health. The Four Basic Needs framework covers death/retirement/CI/education — but a family wiped out by an uninsured house fire is just as unprotected.
- **Both fact finders already table general insurance.** Maritime: Motor Vehicle + Home/Property with coverage/premium/renewal. Guardian: Home & Contents + Car #1/#2. **PALIG's verified benchmark allocates General Insurance 5%** — it's in the market-standard model already.
- **Guardian's triage checklist already asks** about car, home, contents, and health. If a client ticks one and we have nothing, that's a dead end we built ourselves.
- **Renewal dates are review triggers** — general insurance renews annually, life doesn't. That's a *recurring* reason to contact a client, which life planning lacks.
- **The design system already unifies them.**
- **Health ↔ Critical Illness is a genuine overlap** — CoverCare and LifeSPAN answer the same client fear from different angles. Modeling a health shock without knowing their health cover is modeling half the problem.
- **The Supabase schema + workflow (intake → rate → approve → proposal → pipeline) is the same shape** the life product needs.

**What genuinely argues for two:**
- **The licence perimeter.** Tatil (general) and Tatil Life are separate companies; Tatil's own disclaimer says its agents are *"only authorised to sell Tatil Life products."* The repo is explicitly *"agent-built tooling, not TATIL's official corporate system."* **Whether one person may advise across both, and under what registration, is unresolved — and it is the same perimeter question that shaped the whole spec.** *This needs answering before architecture.*
- **Different sales motions:** general is transactional and annually renewing; life is advisory and episodic (the two-meeting flow). One UI serving both risks serving neither.
- **The MVP hasn't shipped.** Merging two systems before either is proven is how both die.
- **Different rate volatility:** motor rates change with campaigns and underwriting appetite; NIS parameters change by legislation. Different refresh cadences, same `ParameterTables` discipline.

---

## Recommendation

**Two products, one platform, one design system — and sequence them.**

1. **Ship the life MVP first.** Unchanged. It is the harder, more defensible, more differentiated product, and it isn't done.
2. **Share the substrate now, not later:** the design system tokens (they're production-proven), the Supabase schema patterns, and the intake → rate → approve → proposal → pipeline workflow. **Do not fork the design language.**
3. **Extend the Policy X-ray to capture general policies immediately** — this part of my earlier advice survives and is now *cheaper*, because the data shapes exist. Premiums feed the leak and the 5% benchmark; renewal dates are review triggers; gaps are real risks.
4. **Federate, don't merge:** the life app reads the general portal's data for the *picture*; the general portal keeps its own rating engines. One client record, two engines. The `ProductCatalog`/`RateProvider` interface already anticipates this — general is just another provider.
5. **Health first if you ever unify rating** — because of the CI overlap. Motor last: it's the most transactional and the least connected to planning.

**Blocking question before any of this:** *can a Tatil Life agent advise on and place Tatil general business, and under what registration?* Same perimeter discipline as annuities — and there, the founder's practitioner knowledge settled it correctly when my research couldn't.

---

## Also worth noting
- The repo references a sibling: **`github.com/Kelsean868/TATILraters`** — not yet examined.
- **Design-system convergence is a real finding**, not a curiosity: it means the two products already look like one company's work.
- **AgencyTrack** (the repo initially cited) is a *third* asset — sales activity tracking with a persistency recorder and career levels. That's idea #15 (book dashboard) and half of #4 (lapse prevention), already built. **Three existing systems now: planning (to build), general rating (built), agent activity (built).** The platform story is stronger than any one of them.
