# Sales Craft Library — the soft-skills corpus

**Source:** `C:\Users\noryk\Downloads\additional insurance resources`
**Purpose (founder's words):** *"just for memory to have the ability to understand the softer skills of making recommendations and to help come up with creative ideas."*

---

## ⚠️ What this corpus is and is NOT for

**This is a reference library for LANGUAGE and CONCEPTS, not a source of engine rules.**

The architecture's whole discipline is **deterministic core, AI at the edges**. This material belongs **at the edges**:
- ✅ **`AIExplanationService`** — how to *say* a recommendation the engine already made.
- ✅ **Fact-find soft questions** — the "paint me a picture" register.
- ✅ **Creative feature ideation** — concepts that suggest product opportunities.
- ❌ **Never** the `NeedsEngine`, `RecommendationEngine`, or `ParameterTables`. Sales craft must not influence what gets recommended — only how it's explained. **That is the commission firewall applied to persuasion.**

The distinction matters because this corpus is *persuasion literature*. Its job is to make a case. The engine's job is to be right. Keep them apart.

---

## The catalog

### Sales-craft classics (text-extractable)
| Document | Size | What it is |
|---|---|---|
| **Andrew Thomson — The Feldman Method** | 100pp, ~188k chars | **Ben Feldman** — the most famous life insurance salesman in history. The canonical text on needs-based selling and the "one more sale" discipline. |
| **High-Touch Selling — John Savage** | 200pp, ~80k chars | Savage is a legendary practitioner; the book is about *questions*, not pitches — directly relevant to fact-find design. |
| **Creative Selling for the 1990's** | 222pp, ~80k chars | Period sales technique. |
| **198 Prospecting Letters for Insurance** | 98pp, ~143k chars | Letter templates — approach language. |
| **Life Insurance Concept Marketing Strategies (Principal)** | 12pp | **The most directly useful.** See below. |
| **Life Insurance — Not Just for Dying Anymore** | 18pp | Living-benefits framing (CI, cash value, LTC). |
| **1040 Prospect Letter** · **Equiliving prospecting letters** | 2–3pp | Approach templates. |

### T&T / carrier-specific
| Document | Note |
|---|---|
| **Corporation Tax Training** | 52pp — corporate tax, relevant to s.134(6A) Cashbuilder III and Corporate Destiny |
| **Guardian OP** | 12pp — competitor sales material |
| **Guardian Importance of Income** | 8pp — **scanned** |
| **Maritime Sales Presentation** | 92pp — **scanned**, competitor presentation |
| **Saving for Retirement When You're Self-Employed in T&T** | 1pp — **scanned**; directly relevant (irregular income → UL/Destiny flexibility) |

### ⚠️ Scanned — need OCR
**All three Dr Sanjay Tolani playbooks** — **Objection Playbook (163pp)**, **Closing Playbook (75pp)**, **Sales Maximizer (74pp)**. **312 pages, zero extractable text.**

These are the most directly applicable to the product — objection handling is exactly what the AI explanation layer needs a register for. **Worth OCRing.**

---

## The one I read: Principal's Concept Marketing Guide

**Why it matters: it's the structural template for how a recommendation gets *delivered*, and it maps almost exactly onto our two-meeting flow.**

Its four-step concept structure:

| Principal's step | Our equivalent |
|---|---|
| **Learn** — understand the concept, how it works, the opportunity | product knowledge base |
| **Approach** — identify prospects to target | **triage + book dashboard (#15)** |
| **Consult** — start the conversation, gather information | **Discovery meeting / fact-find** |
| **Take action** — initiate next steps, deliver a custom solution | **Decision meeting / three options** |

**The organizing insight:** concepts are indexed **by need first, then by product** — *"organized by some of the most common needs a business or individual has to plan for, and then focuses on a popular solution to help meet the need."*

**That is exactly Tatil's Four Basic Needs architecture**, arrived at independently by a US carrier. It's further evidence that need-first (not product-first) is the correct information architecture — and it's what the triage already does.

**Concepts it names** (each = a need + a matched solution + an approach):
- **Key Person insurance** — *"The most valuable asset of any business is the people who contribute most to its success… Key person insurance can provide a financial cushion with cost-effective liquidity for replacing employees who critically impact the value of the business."*
- Business/employer concepts generally — buy-sell, executive bonus, deferred comp.

**🔑 Creative opportunity this surfaces:** **the business market is entirely absent from our spec.** We designed around *individuals* (household canvas, personal needs). But:
- **Cashbuilder III is employer-owned deferred compensation** (s.134(6A)) — a business product already in Tatil's book.
- **Corporate Destiny** exists.
- **Group Life / Group Annuity / Deposit Administration** are in the commission schedule.
- The founder holds **both licences** — so key-person, buy-sell, and group benefits are all sellable.

**Key Person is a genuinely creative extension**: the "household canvas" becomes an "org canvas" — who depends on this *business*? Same mechanic, different subject. Same needs formula (replace income/value, cover debt), different obligor. **Worth a roadmap entry.**

---

## Principles worth carrying into the AI explanation layer

Drawn from the corpus's shared thesis (Feldman, Savage, Principal all converge here):

1. **Ask, don't tell.** Savage's whole method is questions. This is already our fact-find thesis — *"conversation drives, canvas reflects"* — and it's why the soft questions we lifted from Guardian ("paint a picture for me") were the right instinct.
2. **Concept before product.** Lead with the *need* and the *situation*, never the product name. Tatil's Four Basic Needs and Principal's need-indexed concepts agree.
3. **Make the abstract concrete.** Feldman's signature move — turning an abstract obligation into a vivid specific number or image. **Our leak ($1,300/month unaccounted) and the household canvas obligation counter are doing exactly this.**
4. **Living benefits, not death benefits.** *"Not just for dying anymore"* — CI, cash value, and retirement are the modern frame. This is why LifeSPAN's 25% female benefit and the NIS⊕SCP insight land harder than a death-benefit pitch.
5. **The objection is the conversation.** 163 pages of Tolani on objections says the sale happens *after* the first "no". Relevant to the **three-options** design — a choice among three generates fewer objections than accept/reject of one.

---

## Actions
- **Do not graph this corpus as domain facts.** It's a library, not a source of truth. Catalog it (this document), reference it, don't encode it.
- **OCR the three Tolani playbooks** (312pp) — the highest-value unextracted material for the explanation layer's objection register.
- **Add a roadmap entry for the BUSINESS market** — key person, buy-sell, executive bonus. Cashbuilder III and Corporate Destiny already exist; the org-canvas is a natural extension of the household canvas.
- **Mine `Corporation Tax Training`** when the s.134(6A) one-third-of-income rule is verified — it may settle whether that limit survives.
- Treat Guardian OP and the Maritime Sales Presentation as **competitor intelligence**, alongside the fact finders already analysed.
