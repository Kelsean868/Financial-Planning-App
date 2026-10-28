> **Read first: overrides from Section 1 §1.6 and Section 2 (both signed 27 Oct 2026).** The target is NOT
> `life-guided.js`. Engine code goes in `Financial-Planning-App/core`; page code goes in General-Rater-Portal
> `fact-finder.html` / `fact-finder.js`. The scope statement persists to `life_case_scope` (append-only); "start the
> application" also writes one `life_case_snapshots` row. `ClosingComparison` is exported from core. Fences 9.4 and
> 9.5 are replaced by Section 1. Section 1 guards 9–11 apply. Where this brief and Section 1 or Section 2 disagree,
> Sections 1 and 2 win. Lightly trimmed copy of the claude.ai Project brief and its addendum (§11–15), 27 Oct 2026;
> every rule, number, template, guard and seam is kept.

# CC Brief — The Closing Engine: before and after, in one screen

Date: 2026-10-27. Depends on the care graph brief (lands first). Status: signed.

**What this is.** The last screen of the flow. It shows four scenarios in two states: today, and with the plan.
**What it is not.** A new engine. It is a presentation layer over engines that already work. §7.1 enforces this.

## 0. Decisions

| # | Decision | Chosen |
|---|---|---|
| 0.1 | Close model | **Soft close in one call, hard close in two.** Call one ends with agreement on the shape of the solution and a signed application. Call two confirms the plan and collects requirements and premium. |
| 0.2 | Existing insurance capture | **As offsets inside each need, never as an inventory section.** |
| 0.3 | "Today" column | **Computed from captured facts only.** Unknown renders as unknown, never as zero. |
| 0.4 | Sentence generation | **Slot templates, deterministic.** No free text at runtime. |
| 0.5 | Parent funeral cover | **In scope.** Terminal node of each parent's care stream (§5). |
| 0.6 | Reveal pacing | **Advisor-advanced, five layers.** No auto-play. |

## 1. Why the soft close

The two-call structure creates a small yes before the big yes, **gives the client a night to talk to their
spouse**, and gives the advisor time to check availability and underwriting. The screen's terminal action is
**"start the application"**, not "collect the premium".

## 2. The four scenarios

| Scenario | Fed by |
|---|---|
| You die too soon | survivor cashflow + care graph obligations + debts |
| You become critically ill | CI = 10 x income + income interruption |
| You live long | retirement income gap + NIS entitlement + annuity levers |
| You leave something behind | legacy goal |

### 2.0 The death need — decided 27 Oct 2026

The death figures use the obligation stack: funeral, final medical (floor $100,000), expensive debt, the mortgage
if the client chooses to clear it, the household income gap to youngest age 19 (after partner income and NIS
survivors), each parent's care PV, each degree PV, then milestones and legacy, funded in that order. The Tatil
standard formula is shown beside it as a cross-check only.

```
ScenarioOutcome = { lumpAvailable, monthlyAvailable, monthsUntilShortfall, obligationsMet[], obligationsFailed[], sentences[] }
```

### 2.1 The reveal

Five layers, advisor-advanced: 1 all red; 2 add partner income; 3 add NIS; 4 add cover in force; 5 add proposed
cover. No auto-play; no animation faster than a click.

### 2.2 Sentence templates (verbatim)

- Death, today: `Your family receives {lumpToday}. The mortgage of {mortgage} stays. The money runs out in month {monthsToShortfall}.`
- Death, with plan: `Your family receives {lumpPlan}. The mortgage clears. {spouseName}'s income is replaced to age {spouseTo}.`
- Obligation met: `{dependantName}'s {obligation} continues.`
- Obligation failed: `{dependantName}'s {obligation} stops in month {month}.`
- Unknown input: `We did not capture this. It is not counted either way.`

`Your mother's care continues.` must render in the death scenario when a parent is a dependant.

## 3. The premium band at the close

Floor 50 / Recommended 75 / Ceiling 100, anchored at the ceiling; Recommended is the default. Each band shows which
obligations it covers and which it does not. Bounded by the triage stage ceiling: if the full need needs more,
show partial cover and name what is not covered.

## 4. Product basket rules

| Need shape | Product |
|---|---|
| Declining portion of need | Decreasing or level term |
| Permanent base; client wants cash value | Whole life / Cashbuilder II (UL) |
| Underwriting is the obstacle | Platinum Edge (no medical underwriting) |
| Retirement and spouse balance | Destiny / SPIA |
| Funeral, client's own | RestASSURED II — **grading must print** |

Draw the shrinking need line against the flat permanent base (need falls ~60% over ten years).

### 4.1 Annuity levers (controls, not text)

Guaranteed period 5 / 10 / 15 (Destiny); spousal continuation 50% / 100% (Destiny), 50 / 60 / 66.67 / 100% (SPIA);
lump sum at vesting 0% / 25% (Destiny). Print: approved annuity and pension income is tax-exempt from 1 Jan 2026
(Finance Act 2026) with maturity between 50 and 70. SPIA cannot be surrendered — on the control, not a footnote.

## 5. Parent funeral cover

Terminal node of each parent's care stream.

**5.1 Why a policy:** money in the parent's account is frozen pending probate. Insurance Act s.187: proceeds with a
named beneficiary fall outside the estate. s.193: TT$25,000 payable without probate, and a further TT$25,000 may be
paid directly to a funeral home. Sentence:
`{parentName}'s funeral is covered. The funeral home can be paid directly, without waiting on probate.`

**5.2 Offsets:** NIS funeral grant TT$7,500, needs 25+ contributions by the deceased. Ask each parent's NIS
status; unknown applies nothing and raises a flag. Inflate the funeral cost at the care-basket rate; hold the grant
flat. Funeral cost is an advisor-set parameter (Kyron sets the default).

**5.3 Product:** Platinum Edge (no medical, but a single deposit of $50,000–$1,000,000) and RestASSURED II (monthly,
issue to 80, graded). Present both. Grading flagged at the point of recommendation. **Open item 5.3a:** whether
Platinum Edge grades is unconfirmed; it blocks Platinum Edge as the default.

**5.4 Ownership:** the client owns the policy on the parent's life, pays, and is the beneficiary (insurable interest).

## 6. The scope statement — the liability record

Every gap ends in exactly one state: acted on, declined (with date), or out of scope. The "Skip" escape writes a
record. The close prints a scope statement: reviewed, not reviewed, declined.

## 7. Guards (each sabotage-tested before trusted)

1. **Upstream immutability.** Care graph goldens reproduced exactly (PV $1,263,000 / peak $17,391 / 8 sandwich
   years / finish 55). Inverted gate.
2. **No fabricated zero.** Unknown cover renders differently from a confirmed $0.
3. **Ceiling.** No basket exceeds the triage stage ceiling.
4. **Template determinism.** Identical inputs give byte-identical sentences.
5. **Scope completeness.** Every gap in exactly one state.
6. **Graded-benefit disclosure.** RestASSURED II in a basket means the grading text is rendered.
7. **Funeral grant eligibility.** $7,500 only where 25+ contributions are affirmatively captured.

## 8. Seams

- **Offsets merge:** `cover[]` keyed by stable `policyId`; dedupe by id only.
- **Error type:** `ClosingInputError` when a required upstream engine did not run. Never substitute a default.
- **JS/TS seam:** export `ClosingComparison`. No `any` across.
- **Privacy boundary:** unchanged; care tier and funeral suitability are cost and eligibility inputs, not health
  records.

## 9. Scope fences

1. No illustration generation. 2. No e-signature, no submission. 3. No health, motor or home quoting (offsets only).
4–5. Replaced by Section 1. 6. No CI interaction with the care graph beyond CI = 10 x income. 7. This engine consumes
a retirement gap; `needs/retirement.ts` computes it.

## 10. Execution

Comparison engine, offsets, guards: Opus 5.5, high. Reveal UI, templates, scope statement: Sonnet 5.5, medium.
Deliverables: smoke walk to the closing screen (all five layers, all four scenarios both states, scope statement);
evidence paste-back of the four upstream goldens; sabotage log for every guard; post-merge fill of
`General-Rater-Portal/docs/briefs/2026-10-22-life-intake-spec.md` (grading defect, open item 5.3a).

---

# Addendum §11–15 (confirmed by Kyron 27 Oct 2026: ladder Option B, and the §12.2 withdrawal rule)

## 11. The priority ladder — tier boundaries hard, order inside a tier soft

**11.1 Order by:** "Which of these, if it happens before I fund it, can the household never recover from?" Ruin
outranks setback regardless of size. Anything that can become unbuyable precedes anything that merely becomes
dearer. Tie-breaks: time to need, then leverage per dollar.

**11.2 Tiers**

| Tier | Contents |
|---|---|
| 0 — Preconditions | Compulsory motor third-party. **One month** of buffer cash. |
| 1 — Irreversible and losable | Life cover to the **ruin level**. CI cover. **Parent funeral cover.** |
| 2 — Reversible, near-dated | Buffer out to three months. Bad debt. Anything due inside three years. |
| 3 — Reversible, far-dated | Retirement. Education. Milestones. Legacy. |

Buffer splits across tiers 0 and 2. Tier 1 funds the ruin gap, not the full gap.

**Dated changes to §11.2**

- **27 Oct 2026, real quotes (ApplyOn leads TTRA-9WZE859, TTRA-9DWVJ3Y).** "The premium is small" does not hold.
  Rest Assured II on $30,000 costs $262.88 a month for a father rated 72 and $178.56 for a mother rated 67. For the
  sample family the two funerals take most of the insurance budget.
- **27 Oct 2026, Decision 6 = A (Kyron).** Tier 1 default order: life to the ruin level, critical illness, parent
  funerals (oldest first), disability income, own final expense ("later" profile only). The client may reorder
  inside Tier 1.
- **27 Oct 2026, Decision 5 = A (Kyron).** The insurance cap is the band's recommended figure. The stage ceiling
  stays a guard.
- **27 Oct 2026, Decision 7 = A (Kyron).** No ruin-level life cover when no one depends on the client. Life cover
  follows each loan goal, in the goal's tier.
- **27 Oct 2026, Decision 8 = B (Kyron).** The client may choose a life level above the ruin level (the package
  cards) as the Tier 1 life target. The default is the ruin level. Pass one is unchanged: every Tier 1 item gets
  its minimum first. In pass two the chosen life level fills first, in default order; a reorder inside Tier 1
  changes that. The remainder above the Recommended level stays in Tier 3.

**11.3 T&T exception:** a token annuity contribution outranks most of Tier 2 and all of Tier 3, only enough to
capture unused relief inside the TT$60,000 aggregate (pension, NIS, approved annuity), and only where §12 permits
registered. Void where §12.3 blocks registered.

**11.4 Allocation, two passes:** pass one fills minimums top down; pass two fills fulls top down. Nothing gets its
full allocation until everything above has its minimum.

**11.5 Option B:** client may reorder inside a tier, never across. A cross-tier request is recorded as **declined**.

**11.6** At triage Stage 00 (Underwater) the ladder returns no basket, only what would change the picture.

**11.7** Ship the ladder and the before/after screen together.

## 12. Registered against unregistered

**12.1** One product (Destiny), two modes. Maturity 50–70 registered, to 85 unregistered. Same s.187 protection.

**12.2 Withdrawal rule:** a registered withdrawal before maturity is taxed at **25% of the amount withdrawn**,
whether or not relief was claimed. Gross-up: `need / 0.75`. Registered always loses for a pre-maturity goal.

**12.3 Eligibility:**
```
registeredEligible(goal, client) = client.paysTax && client.ageAtGoal >= 50 && client.capHeadroom > 0
```
Below the personal allowance (TT$90,000 a year) is a **hard block**: the engine refuses, it does not warn.

**12.4 Unregistered trade-offs on screen:** no deduction; maturity to 85; surrender charges in the first ten years;
keeps s.187 protection (a unit trust does not).

**12.5** Maturity does not force a pension; §4.1 levers apply only on the income route.

## 13. Return assumptions — two figures per vehicle

| Figure | Source | Shown as |
|---|---|---|
| Floor | Contractual | Guaranteed |
| Planning rate | Advisor-set, defaulted per branch | "advisor-set" |

No projected return is ever shown as a product figure.

**Floors:** Destiny Settler 2%; Explorer 1%; Adventurer 0%, **capital protected**; Platinum Edge 2.5%.

**Adventurer wording (slot template):**
`Your money cannot go down. There is no promised growth, which is why the upside is the highest of the three.`

Size on the planning rate; stress against the floor ("if this delivers only the guaranteed 1%, you would be short
$X, or need $Y more each month"). Premium band anchors at the ceiling; return anchors near the floor.

## 14. Added guards

8. **Registered eligibility** — all three §12.3 conditions. 9. **Low-earner hard block** — zero registered routings
below the allowance. 10. **Gross-up** — `need / 0.75`. 11. **No projected rate** — grep: no hard-coded rate above a
vehicle's floor in the vehicle tables. 12. **Cross-tier reorder** — writes a declined record, order unchanged.

**14.1 Re-baseline:** guard 7.1's goldens were made at a flat 5.0% return. Section 13 changes that, so the goldens
move. Pin the assumption set with the numbers; record old and new figures and the reason; re-pin; then the
inverted gate applies.

## 15. Added fences

8. No registered withdrawals as a planning route. 9. No projected or historical performance for Destiny options.
10. No advice on switching a registered plan to unregistered.
