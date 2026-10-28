# Section 3 — Budget, pay, debts, retirement figure and an easier close

Date: 2026-10-28. Status: **Signed off by Kyron, 28 Oct 2026, 08:41 ("go ahead and build"), with the revisions marked in §0.** Prototype of record: `FPA/docs/prototype/section3-prototype-v6.dc.html` (delivered in `docs/briefs/`).
Source: Kyron's 13 review points after using the live fact-finder (28 Oct 2026, 07:41), his two example files
(Vertex42 personal monthly budget; PALIG personal net worth calculator 2012), the earlier T&T budget planner work
("Video analysis and market research" chat: sinking funds, debt ladder), and YNAB's method.

---

## 0. Sign-off checkpoint

Each row is a decision with one chosen answer. Kyron says yes, or changes a row.

| # | Decision | Chosen |
|---|---|---|
| 3.1 | Budget depth | **Line by line by default** for the Full check-up and Make a budget doors (12 groups, §1). Every group has **"Skip: give one total"**. The other doors use the quick 7-line form, with "Go line by line" on it. |
| 3.2 | How amounts are entered | Each line takes an amount **and** how often: weekly, fortnightly, monthly or yearly. The engine turns all of them into monthly. |
| 3.3 | Pay frequency | Weekly, fortnightly, twice a month, or monthly. A **"My pay changes"** switch asks for the usual and the lowest month; the plan uses the lowest. |
| 3.4 | Family support and parent care | **Revised by Kyron, 28 Oct 2026.** Money spent on parents and relatives is entered **only in the budget**, in a "Family you support" group with one line per person. Your people then shows that amount (read-only) and asks only about the future: will care grow, which care level, from what age, the Senior Citizens' Pension, and 25 NIS contributions. The care graph uses today's budget amount, and the future level from the age chosen. |
| 3.5 | Worries and dreams | **Decision A (Kyron, 28 Oct 2026):** one opener screen, "What matters to you", before the budget. "+ Add your own" on both lists, up to 3 items of 80 characters each, with the hint "Please leave out any health details." |
| 3.5a | Section order | **Revised by Kyron, 28 Oct 2026:** 1 What matters to you · 2 Your money (pay, **loans and cards**, budget, graph, Make room) · 3 Your people · 4 What you own and owe · 5 Your goals · 6 Your retirement · 7 Protecting it · final report. Loans and cards come **before** the budget, so no total ever uses a payment the client has not entered. |
| 3.6 | Insurance floor | **$200 a month** is the lowest insurance budget the tool will plan, except at stage 0 (§5). |
| 3.7 | Spending guides | The take-home ranges in §6.1, shown as "common guides", never as a pass or fail. Each one is an advisor-editable parameter with its source. |
| 3.8 | Reallocation | One screen, "Make room": a live slider per group, a running "Freed up" total, a default split in plan order, and **an adjustable split** (tick destinations, one slider each, "Spend more on" any group, never more than was freed). See §6.3. |
| 3.9 | Net worth | A "What you own and owe" card: assets list (§6.4) minus debts. One figure plus two ratios. |
| 3.10 | Debts | Each debt has type, lender, balance, rate, payment and an end date. The engine also works out the payoff date and flags it when the two differ by more than 3 months. A "Did anyone co-sign?" question per debt (this closes the F-16 gap). |
| 3.11 | Cover held | Every cover type gets **None**, **Not sure** and an amount. A top button "I have no cover" sets all to None. |
| 3.12 | Live sliders | Every slider and money field updates its shown value as the finger moves. The engine re-runs at most every 100 ms. Focus and caret stay put. |
| 3.13 | Retirement figure | One recommended monthly income, in dollars of the year you retire: the larger of 70% of take-home and your spending less what stops, grown by inflation (§9). The working shows under it. |
| 3.14 | Before and after | Rebuilt as one simple two-column card per event: "Today" and "With your plan" (§10). The working moves behind "How we worked this out". |
| 3.15 | Client view and advisor view | A switch in the header. Client view hides the ladder controls, the scope record, the premium band detail and every source note. Advisor view shows all of it. Default: Client view. |
| 3.17 | Section summaries | **Revised by Kyron, 28 Oct 2026, after using the prototype: no summary screen after each section.** The sections run straight through. The final report keeps one block per section (what you told us, what it means, what to do next), each a view of the one full-plan result. The snapshot and scope record come from the final report only. |
| 3.16 | Build order | Three builds: A engine, B page, C net worth (§12). Each one ends with goldens, guards and a smoke walk. |

---

## 1. The budget, line by line (points 1, 2)

### 1.1 Groups and lines

Each group shows a live subtotal. "Other (name it)" can be added to any group. Lines with no amount count as $0.

| Group | Lines |
|---|---|
| **Home** | First, "Your home": **Mortgage, Rent, Household contribution or Own it outright** (Kyron, 28 Oct 2026). The first line renames to match. Mortgage also asks the balance and the years left; it stops at payoff and life cover can clear it. Rent and household contribution never stop and carry into retirement. Own it outright has no payment line. Then: land and building tax; home insurance; repairs and maintenance; security; domestic help and yard work; furniture and appliances (cash only; hire purchase goes in Debts) |
| **Utilities and bills** | T&TEC; WASA; cooking gas; mobile phone (bMobile / Digicel); home internet and cable; streaming and apps |
| **Food** | Groceries and market; work and school lunches, snacks; eating out, doubles and takeaway; drinks |
| **Getting around** | Fuel; maxi taxi, taxi, bus or ferry; motor insurance; licence and inspection; servicing and tyres; parking and car wash |
| **Children** | School fees; books and uniforms; lunch money; transport to school; lessons and extra classes; daycare or babysitter; sport and activities; allowances |
| **Health and personal care** | Health insurance premium; doctor, dentist, optician (not covered); medication; gym; hair and barber; nails and beauty; toiletries; clothing and shoes |
| **Family you support** | One line per person (Mother, Father, a relative, a grown child), each with amount and how often. Hint: "Count only money not already in the lines above. If you buy their groceries with yours, leave them in Food." "+ Add a person". |
| **Giving** | Church, tithes and offerings; gifts and birthdays; child support |
| **Insurance you pay now** | Life; motor and home are in their own groups; other premiums. These feed "Cover you already have". |
| **Saving you already do** | Sou-sou hand; credit union shares; pension or annuity contributions; unit trust or standing orders. **Counted as saving, not spending.** |
| **Fun and lifestyle** | Entertainment and outings; hobbies; travel and vacation; Carnival and fetes; lotto and betting |
| **Once-a-year costs** | Christmas; back to school; Carnival season (if not above); motor renewal; home repairs; medical and dental not covered. Each entered **per year**; the screen shows the monthly set-aside. Replaces today's single "once-a-year bills" slider. |
| **Pets and other** | Pet food and vet; bank fees; anything else |

Loan and card payments are **not** typed here. They are entered on the step before the budget (§7), so they are never counted twice and every total already includes them.

### 1.2 Skip

- Each group header has **"Skip: give one total"**. The group then takes one amount and frequency.
- A skipped group is marked "estimated" in the analysis (§6) and on the one-page plan.
- The quick 7-line form stays for the doors that do not need a full budget.

### 1.3 Family support and parent care (point 2, revised 28 Oct 2026)

- Today's spending on each parent or relative is entered once, in the budget's "Family you support" group. This stops the same money being counted in a care figure and again in Groceries or Utilities.
- Your people (after Your money) shows "From your budget, today: $X a month" for each parent, read-only.
- It then asks about the future only: "Will her care needs grow?" If yes, the care level she may need (Light top-up $1,500, Help at home $4,000, Day care $5,600, Full-time $12,000, today's money) and from what age. Also the Senior Citizens' Pension and the 25 NIS contributions question.
- The care graph uses today's budget amount until the age chosen, then the larger of today's amount and the future level less the pension, grown at the care basket rate (5.5%) and stopping at 88.
- Risk: a client may still put a parent's food in Food and in Family you support. The hint reduces it; the advisor checks it in the meeting.
- With the sample's values, the care graph goldens stay as they are (inverted gate).

### 1.4 What the client sees while filling it in (YNAB's "true expenses" idea)

- A bar at the top: **"So far: $X a month going out · $Y left"**, updating live.
- After the last group: **"Where your money goes"** (§6.2), before any advice.

---

## 2. Pay (point 3)

1. Frequency: **weekly (×52/12), fortnightly (×26/12), twice a month (×2), monthly (×1)**. All tax maths runs on the annual figure, as now.
2. NIS: the engine already works from the class table. Weekly earnings are used directly for the weekly class; the monthly figure is not divided back.
3. "Save each payday" shows the amount **per pay** in the client's own rhythm: "Save $650 every Friday."
4. Extra pay months: weekly-paid clients get 5 pays in about 4 months a year; fortnightly-paid clients get 3 pays in 2 months a year. The tool says: "Plan on 4 pays (or 2). Send the extra pay straight to savings."
5. **My pay changes** (self-employed, commission, overtime): ask for the usual month and the lowest month in the last year. The budget and the insurance range use **the lowest**. The usual month shows as "in a good month".
6. Partner pay takes the same frequency choice.

---

## 3. Worries and dreams (point 4)

1. "+ Add your own" under "What keeps you up at night?" and "What would you love to do?".
2. Up to 3 own items each, 80 characters each.
3. Hint under the field: "Please leave out any health details." The store keeps its health-key check. Free text is never sent to a lead email.
4. Own items appear on the one-page plan as "You told us: …".
5. An own dream can become a goal with one tap ("Plan for this"): it opens the goal planner with the name filled in.

---

## 4. Cover you already have (point 8)

1. Every cover type has three buttons, **None**, **Not sure** and **I have this**, which opens the amount field.
2. A top button, **"I have no cover"**, sets every type to None.
3. Engine meaning is unchanged: None = 0 and confirmed; Not sure = not counted either way, and flagged.

---

## 5. The $200 insurance floor (points 5, 11)

1. Parameter `core:ff.insurance.floorMonthly` = 200, source "Kyron, 28 Oct 2026", advisor-editable.
2. Cap in use = **max($200, recommended)**, unless the client moves the slider (Decision 8 stands). The slider runs from **$200** to the ceiling.
3. When the stage ceiling is below $200 but **money left after costs is $200 or more**: the cap is $200. The screen says, "This is above the safe range for your budget. Use 'Make room' to free the difference." Guard 3 becomes: insurance ≤ max(ceiling, floor).
4. When money left after costs is **below $200**: no insurance plan is shown yet. The screen says, "To start the $200 minimum you need $X more a month," with a button to "Make room" (§6.3).
5. **Stage 0 (costs above income) does not change.** The ladder still returns no plan, only what would change the picture (addendum §11.6). The floor never overrides it.
6. **Risk to flag:** planning $200 for a client whose safe range is lower raises the chance of a lapse. CBTT's market conduct rules ask for affordable advice. Point 3 keeps that honest by naming it on screen and in the scope record.

---

## 6. Where the money goes, and making room (points 6, 11)

### 6.1 Common guides (share of take-home)

| Group | Guide | Source to cite |
|---|---|---|
| Home (incl. mortgage or rent) | 25–30% | The Penny Hoarder budget percentages (take-home basis) |
| Food | 10–15% | same |
| Getting around | 10–15% | same |
| Utilities and bills | 5–10% | same |
| Health and personal care | 5–10% | same |
| Debt payments (not mortgage) | at most 20% | PALIG calculator benchmark "Loans 25%" of gross, restated on take-home |
| Insurance (life and general) | 5–10% | PALIG calculator benchmarks: life 5%, general 5% |
| Saving and investing | 10–20% | The Penny Hoarder; PALIG "Savings + Investment 10%", "Pension 10%" |
| Fun, lifestyle and giving | 5–10% each | The Penny Hoarder |
| Children | no guide | shown as a share only |

Each row is a parameter with `source` and `asOf`. The screen calls them "common guides". T&T families often sit above them on needs; the copy says so, as the current 50/30/20 card already does.

### 6.2 The graph

- One horizontal bar per group: the client's share of take-home, with the guide range shaded behind it.
- Colour: inside the range is neutral, above it is amber, and far above (more than 1.5 times the top) is red. Never a word like "fail".
- Under the graph, three lines at most: the biggest gaps, in dollars a month. Example: "Eating out is $900 a month, about $400 above the usual range."

### 6.3 Make room

1. One slider per group, starting at today's amount, live. A running total: **"Freed up: $X a month"**.
2. Suggestions first: the groups furthest above their guide, with a one-tap "Bring to the top of the range".
3. Freed money is first filled in this order, and the screen shows where each dollar lands. **The client or advisor can then change the split (Kyron, 28 Oct 2026):** tick or untick any destination, set each amount with its own live slider, and also send money to "Spend more on" any budget group. The total can never pass what was freed; any amount not given a job shows as "Not yet given a job". "Fill in plan order" restores the default split. The default order is:
   1. one month of costs saved (buffer);
   2. the $200 insurance floor, then the insurance budget;
   3. expensive debt;
   4. emergency fund to 3 months;
   5. retirement and goals.
   This is the §11 ladder applied to the freed money, so it is the same rule, not a new one.
4. Nothing changes the client's budget until they press **"Use this plan"**. Then: money given to a group raises that group; money given to protection raises the insurance budget; extra on expensive debt brings its payoff date forward; retirement money shows in the "live long" event. "Back to my real numbers" undoes it. Both versions print on the one-page plan.

### 6.4 What you own and owe (net worth)

- **Assets:** bank and fixed deposits; credit union shares; unit trusts and money market funds; shares and bonds; pension and annuity cash value; life insurance cash value; home and other property; vehicles; furniture and equipment; other.
- **Owe:** pulled from Debts (§7) and the mortgage balance.
- Shows **net worth**, **debt payments, including the mortgage, as a share of pay before deductions**, and **months of costs covered by cash**. Debt payments = loan and card payments + the mortgage payment; pay before deductions = the client's gross a month + the partner's pay. The partner's pay is take-home, because gross is not asked; the screen says "Your partner's pay is counted after deductions." Common guide: at most 25% (PALIG net worth calculator benchmark, Loans 25%), shown as a guide, never a pass or fail. (Amended 28 Oct 2026, Decision 11 = A; was "debts as a share of gross yearly pay".)
- No asset is typed twice: the emergency fund figure on the budget reads from bank, credit union and money market here.

---

## 7. Debts (point 7)

1. Per debt: type (credit card, car loan, personal or credit union loan, hire purchase, student loan, informal or family, other), lender, balance, interest rate, monthly payment, **end date** (optional), and "Did anyone co-sign or guarantee this?".
2. The engine computes each payoff date from balance, rate and payment. When the client also gives an end date and the two differ by more than 3 months, it shows both: "You said March 2028; at this payment it ends June 2029."
3. A payment that does not cover the interest is flagged: "This payment never clears the debt."
4. The screen shows a **debt-free date** for minimums only, and for the chosen order (highest rate first, or smallest balance first).
5. A co-signed debt gives the co-signer's exposure as a loan cover item in its tier (closes F-16).
6. Mortgage stays on "Your home", as now.

---

## 8. Live sliders (point 9)

1. Range and money inputs listen to `input`, not only `change`.
2. The shown value updates at once. The engine re-runs at most once every 100 ms, and once more on release.
3. Re-rendering must not move focus or the caret. A test types into a money field and drags a slider and checks both.

---

## 9. The recommended retirement income (point 10)

One figure: **"Plan for about $X a month when you retire in 2053."** The working shows under it:
(Sample family: client 38, retiring at 65. The $6,900 of costs that stop is illustrative; the engine computes it.)

```
A. Income rule:    70% of today's household take-home ($18,038) = $12,627
B. Lifestyle rule: today's spending                              $15,140
                   less costs that stop by 65:
                   mortgage (ends 2044), children, work travel,
                   saving and debt payments                     − $6,900
                                                                = $8,240
Use the larger, in today's money                                = $12,627
Grown by 3.0% inflation for 27 years (× 2.2213)
Plan for, at retirement                                         = $28,048 a month
NIS and your pensions pay about $X of it. The gap is $Y.
```

- Inflation 3.0% and the 70% replacement rate are parameter rows (care graph assumptions block; 70% advisor-editable).
- The "want" field stays editable. The tool shows the recommended figure beside it, and a note when the want is lower.
- Today's-money equivalent shows in small type under the headline.

---

## 10. Before and after, simpler (point 12)

### 10.1 What the client sees, per event (die too soon, seriously ill, live long, leave something behind)

```
IF YOU DIE TOO SOON (sample family, Essential, $533)   Life cover: $239 a month
                       Today       With your plan
Funeral paid           ✗           ✓
Mortgage cleared       ✗           ✓
Family income to 19    ✗ month 1   ✓
Mother's care          ✓           ✓
Father's care          ✗ month 1   ✗ month 1
Child B's degree       ✗           ✗   → Recommended cover funds this (+$195)
```

- One table per event, two columns, ✓ or ✗ with a short note. No bar chart on the client view.
- One line under the table names the single change that would turn the next ✗ into ✓, with its cost.

### 10.2 What moves elsewhere

- The five layers (need, partner income, NIS, cover in force, plan) go behind **"How we worked this out"**.
- The premium band, the priority ladder (with Up and Down) and the annuity choices move to the **Choose** screen, advisor view.
- The Rest Assured II graded-benefit note shows **once**, on the plan row, not twice.
- Plain words on the client view: "ruin level" becomes "enough to keep the family afloat"; Tier 1, 2, 3 become "Must have", "Next", "Later"; "token registered annuity" becomes "a small annuity to use your tax relief"; the header chip "Stage 02 Expensive debt" becomes "Step 2 of 5: clear expensive debt".

---

## 11. Guards (each made to fail on purpose first)

| # | Guard | Sabotage |
|---|---|---|
| 28 | Frequency maths: weekly ×52/12, fortnightly ×26/12, twice a month ×2, yearly ÷12 | Use ×4 for weekly |
| 29 | Budget lines add to the totals the rest of the engine uses; debts and parent care are never counted twice | Add debt payments to the budget too |
| 30 | Insurance never below $200 except stage 0; stage 0 still has no plan | Drop the floor |
| 31 | Reallocation sends freed money in the §6.3 order | Swap steps 2 and 3 |
| 32 | Payoff date maths, and the "never clears" flag | Ignore interest |
| 33 | Retirement figure = max(A, B) × (1 + i)^n, to the dollar | Use A only |
| 34 | Live inputs: value label updates on `input`; focus kept | Listen to `change` only |
| 35 | Client view hides advisor-only cards | Show the ladder controls in client view |

Inverted gate: with the default answers (no own care amount, monthly pay, the sample's costs spread across lines to the same total, the floor below the sample's recommended figure), **all 37 goldens stay**. The young single's insurance figures move only if his recommended figure is below $200 (it is $281, so they do not).

---

## 12. Build plan and scope fences

| Build | Contents | Model |
|---|---|---|
| A — engine | §1 maths, §2, §1.3, §5, §6.1–6.3 maths, §7, §9; guards 28–33 | Opus 5.5, high |
| B — page | Screens for §1–§10, live inputs, client/advisor view; guards 34–35; smoke walk at 390 and 1280 | Opus 5.5, medium |
| C — net worth | §6.4 card and its link to the emergency fund | Sonnet 5.5, medium |

Fences (recorded as follow-ups):
- **F-21:** bank-statement import or receipt scanning. Not in Section 3.
- **F-22:** a "track actual against budget" month view (the Vertex42 Actual column). Section 3 plans only.
- **F-23:** client self-serve budgeting at home. Still fenced (Section 2 fence 1).
- F-13, F-15, F-17, F-19 and F-20 stay open. F-16 is closed by §7.5.

---

## 13. What happens to today's screens

| Today (live) | Section 3 |
|---|---|
| Start screen and doors | Kept. Full check-up and Make a budget run the §0 3.5a order; the other doors keep their current paths and the quick 7-line budget. |
| "Let's talk" (feelings, worries, dreams, a little about you) | Becomes the opener "What matters to you" (worries, dreams, own items). Feelings and "a little about you" stay on this screen. |
| "Your people" | After Your money. Parents: today's amount read from the budget; future care level and age; pension; NIS (§1.3). |
| "Your money, in and out" | Split: pay (§2), loans and cards (§7), budget (§1). The single once-a-year slider is replaced by the Once-a-year group. |
| "A budget that saves" | Retired. "Pay yourself first" becomes the per-pay line on the money step and a Make room destination. The savings ladder becomes the "Step N of 5" tags. The 50/30/20 card is replaced by the graph (§6.2). The insurance budget card moves to Choose. |
| "Your debts" | Moves into Your money, before the budget (§7). |
| "What you have" | Becomes "What you own and owe" (§6.4) plus "Cover you already have" (§4), which opens Protecting it. |
| Goals, Start early, Retirement | Kept; retirement gains the recommended figure (§9). |
| Before and after, Plan, Choose | Rebuilt as §10; Choose keeps the cards and the slider (Decision 8), floor $200. |

## 14. Seams (stated, not left to the build)

1. **Facts shape.** `LifeCaseFacts.schemaVersion` goes from 1 to 2. `life_cases` held 0 rows on 28 Oct 2026, so no database migration is needed. The store **upgrades a version-1 case when it reads it** (its cost lines become one `quick` group; pay becomes monthly; `careTier`/`careFromAge` are kept as the future level; each parent's care share becomes a Family you support line) and writes version 2 on the next save. Anything else that does not validate throws `LifeCaseFactsError`.
   - `client.pay = { frequency: 'weekly'|'fortnightly'|'semimonthly'|'monthly', amountPerPay, varies, lowestMonthly|null }`; `partner.pay` the same shape.
   - `budget.groups[] = { key, skip, total|null, totalFrequency|null, lines[] }`; each line `{ label, amount, frequency: 'weekly'|'fortnightly'|'monthly'|'yearly', stop?: 'mortgage'|'kids'|'work'|'care', personId?: string }`. The quick 7-line form writes the same shape (one group, key `quick`).
   - `budget.housing` keeps `mortgage|rent|contribution|own` and the mortgage balance and years.
   - `budget.roomPlan = { groupTargets: {key: monthly}, split: {destination: monthly}, applied: boolean } | null`. Facts keep the real numbers; the plan sits beside them.
   - `debts.items[]` gain `type`, `lender`, `endDate: 'YYYY-MM'|null`, `cosigned: boolean`, `cosignerName|null`.
   - `parents[]`: `careTier` and `careFromAge` now mean the **future** level and its starting age; `growth: boolean`. Today's amount is the sum of budget lines whose `personId` is that parent.
   - `existingCover[]` entries gain `status: 'none'|'unsure'|'have'`.
   - `opener = { worries: string[], dreams: string[], ownWorries: string[≤3, ≤80 chars], ownDreams: string[≤3, ≤80 chars] }`.
   - `assets[] = { kind, value }`, kinds as §6.4.
2. **Merge semantics.** Unchanged: last write wins per case row, by `updated_at`. `roomPlan` is replaced whole, never merged.
3. **Errors.** Bad facts throw `LifeCaseFactsError` (negative amounts, unknown frequency, a `personId` that is not a parent, more than 3 own items or over 80 characters). An insurance cap below $200, above `max(ceiling, 200)`, or not finite throws `ClosingInputError` (guard 27 becomes this range).
4. **JS/TS seam.** The engine exports the new result types (`BudgetAnalysis`, `RoomPlanResult`, `RetirementFigure`, `NetWorth`, `DebtPayoff`) from the one built file. The page reads only those; it computes nothing itself.
