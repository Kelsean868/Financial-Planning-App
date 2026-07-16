# Tatil Quotation Grid — REAL RATE DATA

**Source:** `C:\Users\noryk\Downloads\Quotations` — 192 Tatil Life quotation PDFs (quote dates Sep 2024)
**Extracted to:** `research/data/tatil_quotes.json` (full records incl. cash-value tables) · `research/data/tatil_rate_grid.csv` (flat grid)
**Status:** 🟢 **This directly attacks the spec's #1 risk.**

---

## 🔥 Why this matters more than the founder said

The spec named **rate data as the single High risk** — *"outside our control… gates the recommendation engine entirely… seed with one carrier, 2–3 products from an agent's rate book."*

The founder described this folder as *"some quotations… give an idea of how some policies are designed and their prices."*

**It is not "an idea." It is a systematic rate grid: 3 products × 2 sexes × 2 smoker statuses × 4 issue ages × 4 sums insured, quoted from Tatil's own system.** 192 PDFs, 192 parsed, 0 errors.

**The `RateProvider` can be seeded from this today** — not with 2–3 products, but with a complete 4×4 grid for two products and a partial one for a third.

| Product | Face-first quotes | Grid completeness |
|---|---|---|
| **WL** — Whole Life | **64** | ✅ complete (2 sex × 2 smoker × 4 ages × 4 faces) |
| **LP65** — Limited Pay to 65 | **64** | ✅ complete |
| **T65** — Level Term to 65 | 43 | ⚠️ partial |
| *(T65 budget-first)* | 21 | see below |

Ages **25 / 35 / 45 / 55** · Faces **$100k / $250k / $500k / $750k**

---

## The extracted grid — monthly premium (TTD)

### Whole Life
| Sex | Smk | Age | $100k | $250k | $500k | $750k |
|---|---|---|---|---|---|---|
| M | NS | 25 | 195.20 | 268.98 | 344.06 | 500.64 |
| M | NS | 35 | 219.82 | 333.76 | 467.18 | 685.33 |
| M | NS | 45 | 265.64 | 451.95 | 683.83 | 1,010.30 |
| M | NS | 55 | 350.41 | 666.45 | 1,068.21 | 1,586.87 |
| M | S | 25 | 205.75 | 297.51 | 414.41 | 606.18 |
| M | S | 35 | 243.41 | 395.32 | 610.04 | 899.61 |
| M | S | 45 | 317.20 | 582.58 | 978.55 | 1,452.38 |
| M | S | 55 | 450.28 | 915.27 | 1,625.91 | 2,423.42 |
| F | NS | 25 | 185.93 | 244.74 | 302.02 | 437.58 |
| F | NS | 35 | 206.69 | 299.44 | 405.83 | 593.31 |
| F | NS | 45 | 243.24 | 394.47 | 582.58 | 858.43 |
| F | NS | 55 | 310.68 | 566.28 | 894.89 | 1,326.90 |
| F | S | 25 | 192.62 | 262.98 | 350.92 | 510.94 |
| F | S | 35 | 221.71 | 338.70 | 504.08 | 740.67 |
| F | S | 45 | 272.33 | 468.25 | 765.34 | 1,132.56 |
| F | S | 55 | 359.50 | 688.33 | 1,205.06 | 1,792.15 |

### Limited Pay to 65
| Sex | Smk | Age | $100k | $250k | $500k | $750k |
|---|---|---|---|---|---|---|
| M | NS | 25 | 204.20 | 286.14 | 374.52 | 546.33 |
| M | NS | 35 | 243.41 | 380.09 | 549.98 | 809.52 |
| M | NS | 45 | 332.82 | 588.80 | 934.36 | 1,386.10 |
| M | NS | 55 | 622.82 | 1,243.24 | 2,129.56 | 3,178.89 |
| M | S | 25 | 213.21 | 312.74 | 442.30 | 648.00 |
| M | S | 35 | 263.32 | 436.29 | 685.97 | 1,013.51 |
| M | S | 45 | 375.20 | 706.13 | 1,212.35 | 1,803.09 |
| M | S | 55 | 708.19 | 1,480.26 | 2,701.84 | 4,037.32 |
| F | NS | 25 | 194.94 | 261.48 | 330.33 | 480.05 |
| F | NS | 35 | 230.54 | 344.70 | 484.77 | 711.71 |
| F | NS | 45 | 310.25 | 526.81 | 818.10 | 1,211.71 |
| F | NS | 55 | 574.95 | 1,111.32 | 1,876.45 | 2,799.23 |
| F | S | 25 | 200.86 | 278.64 | 377.95 | 551.48 |
| F | S | 35 | 243.84 | 382.02 | 580.44 | 855.21 |
| F | S | 45 | 335.99 | 597.81 | 999.14 | 1,483.27 |
| F | S | 55 | 621.96 | 1,242.17 | 2,226.08 | 3,323.68 |

### Level Term to 65 *(partial grid)*
| Sex | Smk | Age | $250k | $500k | $750k |
|---|---|---|---|---|---|
| M | NS | 25 | — | 119.15 | 178.73 |
| M | NS | 35 | — | 144.77 | 217.16 |
| M | NS | 45 | 146.53 | 201.32 | 301.98 |
| M | NS | 55 | 185.45 | 265.10 | 397.65 |
| M | S | 25 | 126.11 | 163.01 | 244.52 |
| M | S | 35 | 165.45 | 239.13 | 358.70 |
| M | S | 45 | 248.32 | 396.29 | 594.44 |
| M | S | 55 | 345.13 | 566.63 | 849.95 |
| F | NS | 35 | — | 124.32 | 186.48 |
| F | NS | 45 | 125.21 | 164.71 | — |
| F | NS | 55 | 154.25 | 216.01 | 324.02 |
| F | S | 25 | — | 130.21 | 195.31 |
| F | S | 35 | 137.33 | 190.86 | 286.29 |
| F | S | 45 | 186.92 | 287.71 | 431.57 |
| F | S | 55 | 243.01 | 388.26 | 582.40 |

---

## 🔑 What the grid proves — the engine's anti-mis-selling rule, in real numbers

Take **Male, non-smoker, age 35, $500,000**:

| Product | Monthly | vs Term |
|---|---|---|
| **T65 (Term to 65)** | **$144.77** | — |
| WL (Whole Life) | $467.18 | **3.2×** |
| LP65 (Limited Pay to 65) | $549.98 | **3.8×** |

**Term costs less than a third of whole life for the same cover.** And recall the [commission structure](tatil-product-catalog-and-commission.md): term pays **35%** first year, whole life **60%**.

**So the agent is paid 1.7× more to sell a product costing the client 3.2× more.** The knowledge base's suitability rule — *"when term satisfies the need, term must appear among the three options with its lower cost shown"* — is no longer an abstraction. **This is the number that rule exists to surface.**

## Other findings from the grid

- **Smoker loading is real and steep.** M/45/$500k: NS $683.83 → S $978.55 (**+43%**). On LP65 at 55/$750k: $3,178.89 → $4,037.32 (**+27%**). Confirms the spec's *"smoker distinct"* — and gives the engine a concrete, honest number for a cessation conversation.
- **Female rates are consistently lower** — M/NS/35/$500k $467.18 vs F/NS/35/$500k $405.83 (**−13%**). Confirms *"sex distinct"*.
- **Premium is NOT linear in face amount** — WL M/NS/25: $100k→$195.20 but $750k→$500.64. **7.5× the cover for 2.6× the premium.** That's the policy fee + banding (4 bands: $65k–150k / 150k–500k / 500k–2M / 2M+) at work. **The engine must never scale a premium linearly** — it must look up the band. *This grid is what makes that testable.*
- **T65 carries a $30.89/month policy fee** ($360/yr) — matching the Whole Life and Endowment specs exactly. Cross-product consistency confirmed.
- **128 quotes carry full cash-surrender-value tables by duration** (years 1–65). WL M/NS/35/$500k: $0 for years 1–3, $2,875 at year 4, $31,283 at 10, $176,804 at 30, reaching the full $500,000 at 65. **This is real cash-value data — enough to model whole-life accumulation without guessing.**

---

## 🔍 The `#` files are BUDGET-FIRST quotes — and they validate the design

21 T65 PDFs are prefixed `#`. They are **reverse quotes**: fix the premium, solve for cover.

> *"Level Term to age 65 with **$594,185** — 119.11 … Policy Fee 30.89 … **Total initial monthly premium 150.00**"*

**The agent set a round $150/month budget and asked what it buys:**

| Sex | Smoker | Age | What $150/mo buys |
|---|---|---|---|
| F | NS | 25 | **$594,185** |
| F | NS | 35 | $285,394 |
| F | NS | 45 | $237,825 |
| F | NS | 55 | $193,052 |
| F | S | 25 | $278,225 |
| M | NS | 25 | $291,283 |
| M | S | 45 | *$150,000 floor* — premium rises to $148.99 |
| M | S | 55 | *$150,000 floor* — premium **$207.08**, over budget |

**This is exactly what the `RecommendationEngine` does** — Guardian's percentage-band anchor gives a budget, the engine solves for maximum coverage adequacy subject to `totalMonthlyPremium ≤ budget`. **The founder already works this way manually.** The design isn't novel; it's automation of an existing practice — which is the safest kind of product.

**Also visible: the floor.** At M/S/55, $150/month can't reach the minimum $150,000 face — premium goes to $207.08, over budget. **The engine must handle "budget cannot buy the minimum" as a real outcome**, not an error. That's the negative-leak case from the budget design, in product form.

⚠️ **Filename/content mismatch on 23 files** — e.g. `#T65 - F - NS - Age 25 - $250k.pdf` actually quotes **$594,185**. Several `#` files with different names hold identical content. **Trust the PDF, never the filename.** The extractor records `filename_face`, `face_matches_filename`, and `quote_type` so this can't silently corrupt the catalog.

---

## Actions
1. **Seed `RateProvider` from `tatil_rate_grid.csv`** — WL and LP65 are complete; T65 partial. **Downgrade the rate-data risk from High to Medium.**
2. **Interpolation is required** — the grid has 4 ages and 4 faces; real clients are 31 with $380k. Interpolate *within* the grid, **refuse to extrapolate outside it**, and flag interpolated quotes as estimates pending a real illustration.
3. **Encode banding, not linearity** — the grid proves premium/face is non-linear.
4. **Use the cash-value tables** for whole-life accumulation modeling.
5. **Fill the T65 gaps** (F/NS/25 at $250k–500k, F/NS/45 at $750k, and all $100k) — the founder can generate them from the same system.
6. **Quote date is 2024-09** — these carry an effective date like every other parameter. Re-verify before launch; rates change.
