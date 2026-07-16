# Product Knowledge Base — the engine's reasoning corpus

**Source:** deep research, verified against real Caribbean products (Sagicor T&T, Guardian).
**Date:** 2026-07-16
**Role:** this is *why* the engine recommends, not *that* it does. Each rule is a matching principle the `RecommendationEngine` and the AI explanation layer draw on.

---

## Matching rules (need → product)

**Term (convertible level, term-to-age)**
- **Right for:** a *temporary* need with a known end date — income replacement while children are dependent, cover matching a mortgage term, protection to retirement. Cheapest cover per dollar.
- **The killer feature is convertibility:** conversion to permanent needs **no medical exam and preserves the original health rating from inception.** So a healthy 30-year-old can buy cheap term now and lock the right to permanent cover later *even if their health deteriorates*. This is a genuine planning lever — buy the option now, exercise it if life changes.
- ⚠️ **Conversion windows are carrier-specific** (US Guardian defaults to 5 years + an Extended Conversion Rider). **T&T carrier windows must be confirmed per product** — the no-exam/preserved-rating mechanic is universal; the window is not.

**Whole life / limited-pay whole life**
- **Right for:** a *permanent* need — final expenses, an estate floor, a dependent who will never become independent, leaving a guaranteed sum. Lifelong cover + cash value.
- **Limited-pay** (pay 10–30 yr / paid-up at 55/60/65): retire the *premium* before you retire the *income*. Right for someone who wants cover for life but no premiums in retirement.

**Endowment**
- **Right for:** a disciplined saver with a **fixed goal date** — the canonical **education-funding** product (Sagicor Saver Series: 15/20/25 yr or to age 60/65/70). Pays the sum assured on death during the term, or an equal lump sum at maturity if you live.
- ⚠️ **Premium ranking is term < whole life < endowment.** Endowments are the most expensive because they must fund a guaranteed payout in a compressed window. This is *why* they fell from favour against "buy term + invest the difference" — and exactly why an honest engine must show that trade-off, not just sell the endowment.

**Final expense / simplified issue (Rest Assured, Peace Assured III)**
- **Right for:** the **underinsured senior** — issue ages to 80, no medical, small face amounts for funeral/end-of-life. Fills a real gap for people other products decline.
- ⚠️ **Graded/waiting benefit:** simplified-issue products typically pay only premiums-paid (not full face) on non-accidental death in the first ~12 months. The engine must never present these as first-day full cover.

**Deferred annuity (fund-linked — Destiny)**
- **Right for:** retirement accumulation with the T&T tax wrapper. BIR-approved → shares the **TT$60,000 aggregate deduction**.
- 🔴 **Age 50 is a STATUTORY FLOOR, not just an exemption boundary.** An approved plan **cannot mature before age 50** under the Income Tax Act. So the "50–70 window" is really: 50 = hard legal minimum maturity; 70 = upper edge of the 2026 income-tax exemption. The engine must refuse to model maturity < 50 outright (illegal), and *warn* on maturity > 70 (legal but loses the exemption).
- **2026 change confirmed again:** approved pension + annuity income is income-tax-exempt from 1 Jan 2026, existing and future plans; early surrender still taxable.

**Universal Life (Tatil Cashbuilder, Pan-American Life T&T)**

*The only product in the catalog that can silently collapse. It needs its own rules.*

- **Mechanics — the whole product follows from one formula:**
  ```
  COI charge = COI rate (rises with attained age) × Net Amount at Risk
  Net Amount at Risk = death benefit − account value
  ```
  UL *unbundles* an interest-credited accumulation account from a monthly cost-of-insurance deduction. The credited rate is set **at the insurer's discretion above a contractual guaranteed minimum**. Surrender value = account balance − surrender charge.

- **The core risk, stated precisely:** COI rates **rise with attained age** while credited rates **can be cut to the guaranteed floor**. An underfunded policy's account value gets consumed from both ends — and the policy lapses or demands a large catch-up premium, *after decades of payments*. Wisconsin's insurance regulator reports seeing this "in many cases" among consumers who had paid for years.

- **⚠️ The Option A / Option B trap** (a real engine subtlety):
  - **Option A / Level:** DB is fixed → extra funding raises account value → **shrinks NAR** → *lowers* COI. Funding the policy well is genuinely protective.
  - **Option B / Increasing:** DB = face + account value → **NAR stays pinned at face** → extra funding does **NOT** reduce COI.
  - **So "over-fund it to keep costs down" is true under Option A and false under Option B.** The engine must know which option a policy carries before reasoning about its sustainability.

- **Right for:** irregular/commission-based income (skip a lean month, catch up in a good one), business owners, estate liquidity, someone who genuinely wants permanent cover *with* premium flexibility and will monitor it.

- **Wrong for:** anyone sold it as an "investment" or "savings plan" who actually needed term; **minimum-funded UL** (the classic time bomb — lapses in old age exactly when cover is irreplaceable); and **any client who cannot or will not monitor the policy**. UL is the one product that requires the owner to stay engaged.

- **"Vanishing premium" is a documented mass mis-selling failure, not agent error.** UL sold in high-interest eras on optimistic illustrations, promising premiums would stop; rates fell, policies didn't perform, premiums never vanished. General American settled for **~251,000 whole and universal life policyholders (1982–1996), US$55M**. **Illustration risk is the named hazard: an illustration is a projection, not a promise.**

- **UL vs whole life:** guarantees vs flexibility. Whole life's premium and cash value are contractual; UL's are conditional on crediting and COI. Whole life cannot collapse from underfunding. **That trade — a guarantee you can't break vs a flexibility you can misuse — is the whole comparison.**

- **In-force illustrations are the only way to know a UL is healthy.** Unlike whole life, a UL policy must be **reviewed periodically**. Warning signs: declining account value, COI exceeding premium paid, a projected lapse age inside the client's life expectancy.

**🔥 The product insight this unlocks:** every legacy **Cashbuilder** the Policy X-ray (#2) finds on a client's book **may be heading for lapse right now, and nobody knows.** A UL bought in the 1990s on 1990s crediting assumptions is exactly the failure profile above. **X-ray → flag every UL → request an in-force illustration → find the ones projected to lapse.** That is a genuine service, a real review trigger, and it lands squarely on lapse prevention (#4). No US tool will ever do this for a Tatil Cashbuilder.

**⚠️ WHAT IS NOT VERIFIED — do not encode:** Tatil Cashbuilder, Sagicor and Guardian Caribbean **product-level detail is entirely unverified** — COI tables, crediting vs guaranteed minimum rates, surrender charge schedules, no-lapse guarantee availability, Option A/B availability. All sources for the mechanics above are **US/generic and citable for mechanics only** — never for a T&T contract. **These must come from actual policy documents before anything is built on them.** *(Confirmed present in T&T: Pan-American Life T&T markets UL on flexible premiums, and the Central Bank's capital adequacy regulations name universal life as a distinct policy class — regulatory proof UL is sold locally.)*

**Regulatory hook:** the Central Bank's **Market Conduct Guideline (July 2023)** imposes generic Know-Your-Consumer, suitability, mis-selling-control and pre/during/post-sale disclosure duties — including **modal premiums, fees and charges, and cash and surrender values**. These map directly onto UL funding sustainability, in-force review, and illustration disclosure. Nothing UL-specific is needed; the general duty already reaches it.

**Group life / group pension / deposit administration**
- **The protection-gap engine.** Group life **reduces 50% at age 66 and terminates at 70 — no post-retirement cover.** Most employed clients are underinsured *and* about to lose what they have. This is the single best prospecting insight for the individual-cover conversation: what you have through work vanishes exactly when you still have dependents.

---

## The core suitability principle (encode this as a guardrail)

> **Selling expensive permanent cover when cheaper term would meet the need — without disclosing the term option — is a recognized mis-selling pattern.**

This is the exact conflict the commission firewall exists to prevent (whole life pays 60% vs term's 35%). **The engine's rule:** when term satisfies the need, term must appear among the three options with its lower cost shown, *even when* a permanent product also fits. Omitting the cheaper option that works is the failure mode — and "no silent truncation" from §4 already forbids it.

---

## Packaging / laddering principles

The right answer is usually a **combination**, matched to how obligations change over time:

- **Term ladder** against declining obligation — stack a 25/20/15-yr layered so total cover steps down as the mortgage amortizes and children age out (the per-debt years-to-payoff schedule from PALIG feeds this).
- **Whole life floor** for the permanent piece — final expenses, the never-independent dependent.
- **Annuity** for the retirement need, maturity timed inside 50–70.
- **CI / disability rider** on the base policy for the health-shock need (cheaper attached than standalone).

The "protection gap" is the organizing concept: **need − (in-force cover + group cover that will lapse at 70) = the gap the package fills.**

---

## What the research got WRONG (verifier refutations — do not encode)

Four plausible-sounding claims were **refuted**, and they're instructive because each is the kind of stale rule a naive build would ship:

- ❌ "Annuity matures between 50 and **75**." Refuted — the ceiling relevant to the exemption is **70**, and 50 is the statutory floor.
- ❌ "Immediate annuity income exempt only if purchased on/after 1994 by a resident aged **60**." Refuted — this is an old rule superseded by the 2026 exemption regime.
- ❌ A per-product (not aggregate) reading of the TT$60,000 cap. Refuted — it is a **single aggregate** ceiling.
- ❌ "Whole life matures at 95/100." Refuted as a mischaracterization.

The pattern is the same one this whole project keeps hitting: **plausible, dated, and wrong.** The knowledge base carries only verified rules, each with its refutation-tested provenance.

---

## Open confirmations
- **T&T carrier conversion windows** per term product (not the US Guardian defaults).
- **Destiny fund options** and the securities-advice line — allocating across conservative/moderate/aggressive funds is client-borne investment risk; confirm the annuity wrapper keeps this inside the life licence and doesn't tip fund-selection into securities advice.
- **Publicsaver / Platinum Edge** product mechanics from brochures (we have economics, not features).
