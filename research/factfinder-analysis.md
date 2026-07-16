# T&T Fact Finder Analysis — What the Incumbents Actually Ask

**Sources:** Maritime Financial Group · Tatil Life · Guardian Life of the Caribbean · *Foundations of Retirement Planning* (US textbook template, included as contrast)
**Date:** 2026-07-15
**Purpose:** Derive the question set for our fact-find from real T&T instruments rather than inference.

---

## The headline findings

### 1. Tatil's "Four Basic Needs" is a ready-made information architecture

Tatil frames the entire conversation around four needs:

1. **Retirement income**
2. **Financial security in event of death**
3. **Money to assist in event of critical illness**
4. **Money to assist with major expenses (education etc.)**

**Do not invent a new framework.** This is the mental model T&T agents are already trained on and clients have already heard. Adopt it as the product's IA — it makes the tool legible to an agent on day one, which is idea #10 (agent ramp) for free.

### 2. The needs formula is already standardized — Tatil states it explicitly

This *is* the `NeedsEngine` spec, from a real T&T insurer:

```
IMMEDIATE CASH NEEDS
  + Funeral cost
  + Medical cost
  + Outstanding loans
  + Mortgage liquidation
  + Rental income for 120 months          ← T&T convention: 10 years
  + Education expense
  + Continuation of income until last child attains age 21   ← T&T convention
  = TOTAL NEEDS

LESS ASSETS AVAILABLE
  + Savings
  + Life insurance
  + Other investments (stocks, shares)
  = TOTAL ASSETS

TOTAL INSURANCE NEED = TOTAL NEEDS − TOTAL ASSETS
```

Two conventions worth encoding as named, dated parameters: **"120 months"** of rental income and **"until last child attains 21."** Both are local norms, not universal truths — they belong in `ParameterTables`, not in code.

### 3. ⚠️ Our spec was wrong about Budget

Guardian elicits budget as a **percentage-of-income band**, using social-proof anchoring — never as a dollar figure:

> "Most of my clients spend between 10–15% of their income towards solving their needs. There are a fortunate few who can invest 16–25%... And some are on a tight budget and can only afford between 5–9%. Into which category would you fall?"
> `[ ] 10–15%   [ ] 16–25%   [ ] 5–9%`

Note the framing: 10–15% is "most of my clients" (the norm), 16–25% is "a fortunate few" (aspirational), 5–9% is "a tight budget" (the floor). The middle band is the default and the top band flatters. This is a deliberately engineered anchor.

**Correction required:** capture budget as a **% band**, normalize to TTD internally. Our spec defined it as agent-supplied TTD, which loses the anchoring mechanic entirely.

### 4. ⚠️ The recommendation engine must output THREE options, not one

Guardian's Decision Meeting agenda:

> "3. **Presentation of up to three (3) alternative solutions** (15 mins)
> 4. Selecting the solution that has the best benefits for your needs, wants and preferences (10 mins)"

Our spec has `RecommendationEngine → Package`. It should be `→ [Package]`, three of them, with differentiated rationale. The sale is a **choice among three**, not an accept/reject of one.

### 5. ⚠️ The product is two meetings, not one session

Guardian documents the process precisely:

| Discovery Meeting (~40 min) | Decision Meeting |
|---|---|
| Introduction (1 min) | Changes since last meeting (2 min) |
| Client introduces themselves (2 min) | Review concerns (2 min) |
| Importance of income (5 min) | **Three alternative solutions (15 min)** |
| **Fact-finding questionnaire (15 min)** | Select solution (10 min) |
| **Identify needs, wants & budget (15 min)** | Paperwork + first premium (5 min) |
| Summary (1 min) | Schedule medical exam (1 min) |
| **List of what to bring to 2nd meeting** | Next steps (1 min) |
| Schedule 2nd meeting + who must attend (1 min) | |

Two things fall out of this:

- **The client portal's job is the gap between the meetings.** That's not a nice-to-have; it's the structural role.
- **"List of what to bring for our 2nd meeting" is where the Policy X-ray lives.** The agent already asks clients to bring their policies. Our wedge slots into an existing ritual rather than creating a new one.

Our spec models a single session. Wrong shape.

### 6. Guardian already asks the informal-dependent question — the canvas is validated

> "If there was an immediate need to fund a major surgery for **your parents or family members** due to an accident or sickness, how would you help fund it?"

The household obligation (#14) is **already in the incumbent's script.** We're not inventing a need — we're making an existing, awkwardly-worded question visual and structured. That's a much safer bet than a novel insight.

### 7. Tied-agent model confirmed, in writing

> "Tatil Life Assurance Limited... is a licensed financial institution regulated by the Central Bank of Trinidad & Tobago (CBTT). **All of our Agents and Sales Representatives are registered with the CBTT and are only authorised to sell Tatil Life products.**"

Confirms all three: Central Bank regulation (not TTSEC), mandatory agent registration, and single-carrier tied distribution. Our segment decision holds.

### 8. The suitability attestation already exists — model ours on it

Tatil's client signature block:

> "I certify that to the best of my knowledge the information provided above is correct. **Based on the above review, I understand why the foregoing product(s) have been suggested as suitable for me and that I can afford to pay the ongoing premiums.**"

Both client and agent sign, both dated. Note it bundles **suitability + affordability** in one attestation — which is why affordability (#5) can't be deferred as far as we planned; the attestation already claims it.

### 9. The soft questions are written for us — don't invent them

Guardian's open questions are warm, specific, and already field-tested. These are the A-mode (one-question-at-a-time) content:

- "What are some of the things that you and your family like to do?"
- "What do you believe life insurance should do for you and your family?"
- "If you suffered a long term disability for say 6 to 12 months, how would your bills be paid?"
- "What are some of the things you plan to do when you retire? **Paint a picture for me.**"
- "How do you feel about University Education for your children? What profession are they leaning towards?"

### 10. Triage first — that's how you get to five questions

Guardian opens with a 16-item concern checklist, self/spouse columns:

> "Please tick which is of utmost concern to you currently **to guide our discussion today**."

Income protection · family income protection · life insurance · critical illness · funeral expense · mortgage planning (repay at term / on death / on critical illness) · paying off debt · retirement · savings · children's education · health · car · property · contents.

**This is the mechanism that makes "five questions, not twelve" honest.** You don't shorten the fact-find by asking less — you triage first and ask only what's relevant to what they pointed at.

---

## Smaller findings worth keeping

- **Maritime's benchmark allocation** — a T&T cash-flow yardstick: Taxes 15% · Loans 25% · Retirement 10% · Life Insurance 5% · General Insurance 5% · Savings 10% · Living 30%. Useful for affordability (#5).
- **Maritime's emergency fund = 6× gross monthly income** (note: *gross income*, not months of expenses as in US convention).
- **Maritime's tax deduction lines** — Education Allowance, Company Pension/NIS, Personal Pension, Personal Allowance — map directly onto the TT$60k envelope (#6).
- **Maritime's competitive displacement question** — lists the client's existing lawyer/accountant/financial advisor, then: *"Are you satisfied with the service? If you like my service will you hire me for the job?"*
- **Guardian's dependents table includes a HEALTH column** — feeds underwriting pre-qualification (#13).
- **Tatil's referral table** is part of the fact-find itself: name, address, occupation, income, dependents, phone, email.
- **Guardian's motivating statistics are from 1986** — explicitly labelled as such in their own document. Forty-year-old data is still being presented to clients. Current, real T&T data is a cheap and genuine differentiator.
- **The US textbook fact finder is the control group.** It asks about IRAs, Social Security, revocable living trusts, durable powers of attorney, and taxable-equivalent conversion — none of which exist in T&T. It's a precise inventory of what localization must strip out, and it's what every US tool would drag in.

---

## The synthesized question set

**Screen 0 — Triage.** *"What's on your mind right now?"* (Guardian's checklist, reduced to ~8 tiles, self/spouse). Everything downstream adapts to this.

**Then five, one at a time, canvas reflecting:**

1. **Who depends on you?** → household canvas. *"A parent, a nephew, someone overseas. It doesn't have to be official."* (Guardian's parents-surgery question, made structural.)
2. **What comes in, what goes out?** → monthly income + monthly expense (Tatil captures both; most US tools only capture income).
3. **What do you owe?** → mortgage, loans, cards: balance, installment, years to go (Maritime's shape).
4. **What do you already have?** → life insurance, savings, NIS/pension. **This is the X-ray.** Seeded from documents where available.
5. **What would you want to happen?** → one soft question, chosen by triage. *"What do you believe life insurance should do for you and your family?"*

**Then budget** — Guardian's % band anchor, verbatim.

**Then:** need → gap → *"here's what to bring next time"* → portal → Decision Meeting → three options.
