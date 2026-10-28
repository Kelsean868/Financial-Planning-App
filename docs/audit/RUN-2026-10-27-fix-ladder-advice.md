# RUN 27 Oct 2026 — Fix run 3: cap, Tier 1 order, cover that follows the loan

Brief: `docs/briefs/2026-10-27-fix-ladder-advice.md` (on `docs/fact-finder-specs`). Decided by Kyron, 27 Oct 2026
21:39: **Decision 1 (ruin-level life is all term), Decision 5 = A (cap = recommended), Decision 6 = A (Tier 1: life, CI,
parent funerals), Decision 7 = A (no ruin-level life without dependants; life cover follows each loan goal).** Branch
`feat/fact-finder-engine` (FPA PR #5). Claude Opus 5.5, effort high, one session. Nothing merged, deployed or applied;
no live database access. **No hard stop was hit.**

## 1. Flagged before the change

1. **The "with the plan" death sentences move (Change 6).** The close screen's life package used to be the
   recommended package's own term and whole life split, not what the ladder funds. Family: the basket was $1,662,351 of
   term plus $65,000 of whole life, $632.08 a month, while the ladder gave life $238.83. Young single: $150,000 of whole
   life at $150, while the ladder gave term $150. Now the basket is the ladder's life allocation, so the plan's death
   story moves: family receives **$843,567** (was $1,747,351); **the father's care stops in month 1** (was "continues");
   Child B's degree stops in month 1 (was 2); "What you leave behind" is not met. Young single: no life cover, so the
   plan's death sentences are today's (the funeral, final bills and the $3,000 debt fall on the family). These lines were
   pinned in fix run 2; they are re-baselined here with the chain (§5). They are not care graph §3 goldens.
2. **The package cards and the budget slider no longer change the life package.** The choose screen shows Essential,
   Recommended and Full cards, and "Or tell us your budget", each read from `chosen.basket`. Change 6 makes the basket the
   ladder's life allocation, so all three cards show the same cover ($823,567 for the family), and the slider's
   "buys about $X of life cover" no longer moves. The `package` and `budgetMonthly` options still set `chosen.package`
   and the `packages` figures. Not changed in this run. **Kyron's call; proposed follow-up F-18** (§9).
3. **Loan cover is priced on rated age today; the other life items are not.** The brief says loan cover is priced "at
   the client's rated age today" (age + 1). Life to the ruin level, CI and the bands are still priced on `client.age`,
   as before, so the expected $238.83 holds. The two bases differ by one year of the estimate age factor. Both samples
   are at the $150 term minimum for loan cover, so no figure here depends on it.
4. **Issue ages exist for term (to 65), Rest Assured II (to 80), Goldspoon and SPIA only.** Life Span Gold, Cashbuilder
   II and whole life have no stated issue ages in the product table, so the check (Change 5) never removes them. It is in
   place for when they get one.
5. **At rated age 66 the ruin-level plan is whole life, and it never fits.** Whole life on the family's $823,567 at 65
   costs about $4,780 a month, above every cap in the fixtures. Such a client sees "Not yet: Whole life to clear debts".
   That is the rule as written; noted because a 65-year-old will rarely see a life row.
6. **"Dependants" from the care graph** = a care goal with a present value above 0. A parent whose care the Senior
   Citizens' Pension covers has no care goal, so does not count alone (the family's mother).
7. **The young single sample is female** (`sex: "female"`); the brief says "his". No effect on any figure.
8. **The insurance budget note** is the brief's sentence, followed by the existing "Not yet: …" list.
9. **"Partial cover" wording.** The family's basket is now partial ($823,567 against the $1,727,351 wanted), so the
   choose screen shows "Partial cover: the safe ceiling does not reach the full need." The cap is now the recommended
   figure, not the ceiling; the GRP text was not changed (part of F-18).

## 2. The changes

- **Change 1, the cap** (`closing-ladder.ts`). Insurance items share `budget.band.recommended`. The result carries
  `insuranceCapMonthly` (the cap) and `insuranceCeilingMonthly` (the ceiling, kept for closing guard 3, which is
  unchanged). Insurance budget note: "Your safe range is $F to $C. We plan to $R, the recommended amount, and fund plans
  in priority order."
- **Change 2, Tier 1 order** (`closing.ts`): life to the ruin level; critical illness; parent funerals, oldest first;
  disability income; own final expense ("later" only). Option B reorders are unchanged.
- **Change 3, dependants** (`closing.ts`): partner, or children, or a parent's care charged to the client. Without one,
  `life-ruin` and `life-beyond-ruin` are not created; provenance rule "no partner, no children, no parent care paid: no
  ruin-level life cover". The death need is unchanged.
- **Change 4, loan cover** (`closing.ts`, `insurance-budget.ts`). One item `loan-cover:<goalId>` per goal that is on:
  home on a mortgage (cover = `homePlan.loan`), car on a loan (cover = `carLoan.loan`), clamped to the product's cover
  range. Term, or whole life when term cannot be issued at the client's rated age at the goal date. Min = full = the
  premium today at today's rated age, at least the product minimum. Tier 2 when `years <= 3`, else Tier 3. Plan row:
  "Term life for your car loan" — "Your lender will want this from year N. It costs about $X a month if you start now."
  Business loans are not added.
- **Change 5, rated age for every item** (`premiums.ts`: `ratedAge`, `canIssue`). Every insurance item now carries its
  `product`. `life-ruin` and `life-beyond-ruin` are whole life when term cannot be issued at the client's rated age. Any
  other item whose product cannot be issued is not created, with a provenance rule naming why.
- **Change 6, the basket** (`closing.ts`). `chosen.basket` is one item on the ladder's life product. Its premium is the
  `life-ruin` plus `life-beyond-ruin` allocation; its cover is the ruin level plus the funded share of the step to the
  recommended cover.
- **Insurance budget** (`insurance-budget.ts`): `NotYetPlan` gains `why` (protection: the plan's reason; savings: the
  row's), so the page can show "from year 2" on a waiting row.
- **GRP page** (display only): the ladder line reads "Insurance in the plan: $533 of the $533 recommended a month (safe
  ceiling $711)."; "not yet" rows show their `why`.
- Assumption set **`ff-2026-10-27-ladder2`** (was `ff-2026-10-27-ladder1`).

## 3. Expected results, as the engine gives them

| Sample | Cap | Funded | Not yet |
|---|---|---|---|
| Family | **$533.13** (533.131875) | Term $238.83; critical illness $294.30 | Father's funeral $262.88; mother's funeral $178.56; disability income $300 |
| Young single | **$280.61** (280.606875) | Critical illness $280.61 | Disability income $300; car loan cover $150 (Tier 2, term); home loan cover $150 (Tier 3, term) |

Both rows match the brief to the cent. Pinned in `core/test/fix-ladder-advice.test.ts`.

**The chain, family.** Cap = ceiling $710.8425 × 0.75 = $533.131875. Tier 1, pass one: term on $823,567 at 0.29 per
$1,000 = $238.83 (cap left $294.30); CI minimum $150 fits (left $144.30); father $262.88, mother $178.56 and disability
income $300 do not fit: not yet. Pass two: term is full; CI's full is $1,700, so it takes the $144.30 → **$294.30**.

**The chain, young single.** Cap = $374.1425 × 0.75 = $280.606875. No partner, no children, no parents: no `life-ruin`.
Pass one: CI $150 (left $130.61); disability income $300, car loan cover $150 (term on $150,000 at rated age 25 costs
$15.99, so the $150 minimum binds; the car is due in 2 years: Tier 2) and home loan cover $150 (term on $765,000 =
$850,000 × 90%, $81.57, minimum binds; 6 years: Tier 3) do not fit. Pass two: CI's full is $316.46, so it takes the
$130.61 → **$280.61**.

**The Tier 1 reorder** (the father's funeral moved above CI): term $238.83; father $262.88, topped up with the $31.42
left → **$294.30**; CI $150, mother $178.56 and disability income $300 wait.

## 4. The 37 goldens (evidence paste-back)

Recorded **before** from `core/dist/fpa-core.js` at `fd5fc30` (SHA-256 `2c15c5f8…dae55f`, the vendored GRP copy) and
**after** from the rebuilt file at `0f71c4a` (SHA-256 `14b9c994…72e2a`). **0 of 37 moved. No care graph §3 golden
moved** (hard stop 1 not hit).

| # | Golden | Old (shown) | New (shown) | Old full | New full | Moved |
|---|---|---|---|---|---|---|
| 1 | §2.8 family: stage | 2 | 2 | 2 | 2 | no |
| 2 | §2.8 family: ceiling | 711 | 711 | 710.8425 | 710.8425 | no |
| 3 | §2.8 family: care save a month | 3837 | 3837 | 3836.8329 | 3836.8329 | no |
| 4 | §2.8 family: already paying | 4000 | 4000 | 4000 | 4000 | no |
| 5 | §2.8 family: care present value | 1263107 | 1263107 | 1263107.2588 | 1263107.2588 | no |
| 6 | §2.8 family: peak a month | 17391 | 17391 | 17391.4661 | 17391.4661 | no |
| 7 | §2.8 family: peak at age | 54 | 54 | 54 | 54 | no |
| 8 | §2.8 family: sandwich years | 8 | 8 | 8 | 8 | no |
| 9 | §2.8 family: finish age | 55 | 55 | 55 | 55 | no |
| 10 | §2.8 family: cover essential | 823567 | 823567 | 823566.7663 | 823566.7663 | no |
| 11 | §2.8 family: cover recommended | 1994846 | 1994846 | 1994846.1357 | 1994846.1357 | no |
| 12 | §2.8 family: cover full | 2236674 | 2236674 | 2236674.0251 | 2236674.0251 | no |
| 13 | §2.8 family: needs | 15140 | 15140 | 15140 | 15140 | no |
| 14 | §2.8 family: living | 6700 | 6700 | 6700 | 6700 | no |
| 15 | §2.8 young single: stage | 1 | 1 | 1 | 1 | no |
| 16 | §2.8 young single: ceiling | 374 | 374 | 374.1425 | 374.1425 | no |
| 17 | §2.8 young single: care goals (no care) | 0 | 0 | 0 | 0 | no |
| 18 | §2.8 young single: cover essential | 149000 | 149000 | 149000 | 149000 | no |
| 19 | §2.8 young single: cover recommended | 149000 | 149000 | 149000 | 149000 | no |
| 20 | §2.8 young single: cover full | 149000 | 149000 | 149000 | 149000 | no |
| 21 | §2.8 young single: needs | 5450 | 5450 | 5450 | 5450 | no |
| 22 | §2.8 young single: living | 5300 | 5300 | 5300 | 5300 | no |
| 23 | care graph §3: peak a month | 17391 | 17391 | 17391.4661 | 17391.4661 | no |
| 24 | care graph §3: peak at age | 54 | 54 | 54 | 54 | no |
| 25 | care graph §3: sandwich years | 8 | 8 | 8 | 8 | no |
| 26 | care graph §3: finish age | 55 | 55 | 55 | 55 | no |
| 27 | care graph §3: nominal total (to the thousand) | 2078000 | 2078000 | 2078167.5911 | 2078167.5911 | no |
| 28 | care graph §3: save from today | 3837 | 3837 | 3836.8329 | 3836.8329 | no |
| 29 | care graph §3: already paying | 4000 | 4000 | 4000 | 4000 | no |
| 30 | care graph §3: present value (to the thousand) | 1263000 | 1263000 | 1263107.2588 | 1263107.2588 | no |
| 31 | care graph §3 UK: peak a month | 50753 | 50753 | 50753.2354 | 50753.2354 | no |
| 32 | care graph §3 UK: sandwich years | 8 | 8 | 8 | 8 | no |
| 33 | care graph §3 UK: nominal total (to the thousand) | 3406000 | 3406000 | 3406011.7775 | 3406011.7775 | no |
| 34 | care graph §3 UK: save from today | 16487 | 16487 | 16486.6818 | 16486.6818 | no |
| 35 | care graph §3 UK: present value (to the thousand) | 2161000 | 2161000 | 2161420.0355 | 2161420.0355 | no |
| 36 | care graph §3 UK: top lever | Send Child B locally | Send Child B locally | — | — | no |
| 37 | care graph §3 UK: top lever worth a month | 12650 | 12650 | 12649.8489 | 12649.8489 | no |

**Goldens updated this run** (re-baselines under addendum §14.1, each with its chain in §3 and §5):
- Family Tier 1 at the cap (`one-allocator.test.ts`): was life 238.83, father 293.45, mother 178.56, CI and disability
  income not yet → **life 238.83, CI 294.30; father, mother and disability income not yet**.
- The Tier 1 reorder: was CI moved above the father (term 238.83, CI 209.13, father 262.88) → now the brief's move, the
  father above CI: **term 238.83, father 294.30; CI, mother and disability income not yet**.
- Insurance budget for both samples (`modules-parity.test.ts`), as §3.
- Death scenario "with the plan" lines (`goldens-fact-finder.test.ts`), as §1 item 1.

**New goldens:** both rows of the expected-results table (§3).

## 5. What moved, and why

Full flat diff of every value `computeFactFinder` returns for both samples (provenance and facts left out):
**219 values moved, 76 added, 50 dropped.** Every line is in the appendix.

| Area | Family | Young single |
|---|---|---|
| Ladder cap | `insuranceCapMonthly` 533.13 added; insurance allocated 710.84 → **533.13** | 280.61 added; 374.14 → **280.61** |
| Ladder Tier 1 | life 238.83; father 293.45; mother 178.56; CI 0; DI 0 → **life 238.83; CI 294.30; father 0; mother 0; DI 0** | life 150; CI 224.14; DI 0 → **CI 280.61; DI 0** (no life item) |
| Ladder, other | `product` on each insurance item | car loan cover (Tier 2) and home loan cover (Tier 3) added, $150 each, not yet; other items shift position |
| Insurance budget | total 710.84 → **533.13**; rows as §3; note as §2 | total 374.14 → **280.61**; rows as §3; note as §2 |
| Life basket | term $1,662,351 + whole life $65,000, $632.08 → **term $823,567, $238.83** (partial) | whole life $150,000, $150 → **none** |
| Death, with the plan | §1 item 1 | §1 item 1 |
| Not moved | care graph, budget, buckets, death need, bands, packages, parent funeral figures, health score, retirement, goals, savings plans | same |

The budget card's "Protection (insurance)" bucket was already the recommended figure ($533 / $281). It now agrees with
the insurance budget's Protection total (F-13, part closed).

## 6. Sabotage log

**Guard 23 — insurance ≤ recommended** (`core/test/fix-ladder-advice.test.ts`). Break: `closing-ladder.ts`, the cap
back to the ceiling (`let capLeft = budget.ceilingMonthly;`). Ran `node --test test/fix-ladder-advice.test.ts`: 3 fail.
- `guard 23 …`: `AssertionError [ERR_ASSERTION]: sample family: insurance allocated 710.8425000000007 is above the recommended 533.1318750000005`
- the two expected-result tests (`Expected values to be strictly deep-equal`)

Restored from a copy; 8/8 pass.

**Guard 24 — issue ages on rated age.** Break: `closing.ts`, drop the check (the ruin-level plan and every loan cover
always term). Ran the same file: 3 fail.
- `guard 24 …`: `AssertionError [ERR_ASSERTION]: variant 71, order 0: Life cover for the car loan is on term, which cannot be issued at rated age 66`
  (variant 71: the family at client age 65, rated age 66, $30,000 gross, with the home and car goals on)
- `guard 24 fixture: a client of rated age 66 gets whole life …`: `Expected values to be strictly equal` (term, not whole life)
- `Change 4 …`: `AssertionError [ERR_ASSERTION]: rated age 67 in 6 years: past term's 65`

Restored from a copy; 8/8 pass.

**Guard 25 — the basket is the ladder.** Break: `closing.ts`, restore the old term / whole life split sized from the
package. Ran the same file: 3 fail.
- `guard 25 …`: `AssertionError [ERR_ASSERTION]: variant 0, order 0: the basket's life premium is 632.0818750000005, the ladder's life allocation is 238.83436221425217`
- the two expected-result tests (`Expected values to be strictly equal`; young single: `no life package`)

Restored from a copy; 8/8 pass.

Guards 23 to 25 run over the shared sweep (`core/test/ladder-cases.ts`, moved out of `one-allocator.test.ts`): both
samples, client ages 24/38/52/62/65, gross $9,000 to $60,000, three parent sets, the home and car goals on for families
at $30,000 and above, each with the default order and every Tier 1 item moved to the top of Tier 1. Guard 25 also runs
the Essential, Full and $5,000 budget options.

**Guards 21 and 22, re-run** (`node --test test/one-allocator.test.ts`, after the change; guard 22 now knows loan cover
and the whole life ruin-level plan):
```
✔ guard 21: the insurance budget's Protection rows equal the ladder's funded insurance items, to the cent (622.1734ms)
✔ guard 22: no funded insurance item on the ladder is below its product minimum (513.996ms)
✔ Tier 1 default order: life, CI, parent funerals oldest first, disability income; own final expense for 50 and over (2.4762ms)
✔ the sample family at the $533 recommended: what each Tier 1 item gets (2.491ms)
✔ a reorder inside Tier 1 moves both screens: the father's funeral above critical illness (2.8898ms)
ℹ pass 5
ℹ fail 0
```

**Guards 13 and 15, re-run in GRP** (`node --test test/fact-finder-guards.test.mjs`, after the re-vendor):
```
✔ guard 13: the vendored engine hashes to PINNED.txt, and the page and the store name the same commit (16.259ms)
✔ guard 13 catches a changed engine and a missing pin (67.6261ms)
✔ guard 13 runs in the build before anything is copied (1.403ms)
✔ guard 12: every fact-finder file is classified PORTAL ONLY, and none is on a public, partner or proposals list (3.6933ms)
✔ guard 12 runs in the build over public, referrer and proposals after they are written (1.1293ms)
✔ guard 12 catches a fact-finder file, the vendored engine, or an inlined engine in a non-portal bundle (10.1866ms)
✔ guard 18: no fact-finder file carries a WhatsApp link, "Send to Kyron" or a resume link (8.8186ms)
✔ guard 18 catches each self-serve route (8.9464ms)
✔ guard 15: the vendored product table matches life-shapes.js PRODUCTS - cover ranges, child ages and riders (9.5998ms)
ℹ tests 9
ℹ pass 9
ℹ fail 0
```
(The first run of guard 13 failed, as it should: the page still imported the engine stamped `?v=2c15c5f8`. Fixed by
the new stamp `?v=14b9c994` in `fact-finder.js` and `life-case-store.js`.)

Privacy guards 7, 8 and 11: pass in the full suite (hard stop 3 not hit).

## 7. Tests, build and hashes

- Before: `npm test` 144/144; dist SHA-256 `2c15c5f873398b3c912c108c263bf873e08f2fb060c58744c959675b85dae55f`.
- After: `npm test` **152/152** (new file `fix-ladder-advice.test.ts`, 8 tests; helper `ladder-cases.ts`),
  `npm run typecheck` exit 0, `npm run build` rewrote `core/dist/fpa-core.js`; `dist.test.ts` confirms it matches a
  fresh build.
- New dist SHA-256 **`14b9c994b6b7b2150b7249d7549649a962166e5ce0e7b6f933b2d3b32fb72e2a`**, engine commit
  **`0f71c4a33fb38b3edca2a02a8f5904a871440ae0`**. GRP `vendor/fpa-core/PINNED.txt` pins it (GRP `feat/fact-finder`
  commit **`2bfb6228bdce09bffc92cc2ec4cee76b2a394e04`**: re-vendor, page text, smoke walk evidence).
- GRP full suite (`npm test` in the GRP worktree, after the re-vendor): **3,090 tests, 0 fail, 30 skipped** (the same
  30 as fix run 2).
- Assumption set: **`ff-2026-10-27-ladder2`** (was `ff-2026-10-27-ladder1`).

Tests changed, each with the reason beside it: `goldens-fact-finder.test.ts` (the id; the death lines, §1 item 1),
`modules-parity.test.ts` (both insurance budgets), `one-allocator.test.ts` (Tier 1 order, the family's Tier 1, the
reorder the brief now asks for, guard 22 for loan cover and whole life; the sweep moved to `ladder-cases.ts` with age 65
and loan goals added). No test deleted or skipped.

## 8. Smoke walk (GRP)

390 only, private headless Chromium, every `supabase.co` request stubbed, fake session, ZZ names. Script
`scratch/fix3-walk.mjs` (not shipped). Evidence: GRP `docs/audit/evidence-2026-10-27-fact-finder/fix3/`.
**13/13 checks pass**; no page errors, no Supabase writes, no horizontal overflow.
1. Family: the budget card ($533), the insurance budget ($533 a month) and the close screen ("Insurance in the plan:
   $533 of the $533 recommended a month (safe ceiling $711).") show the same total and the same plans: term $239, CI
   $294; the father's funeral ($263), the mother's ($179) and Cashbuilder II ($300) not yet.
2. Family: the father's funeral moved up once, above CI (inside Tier 1, no declined record). All three follow: $533 on
   each; term $239, father $294; CI ($150), mother ($179) and Cashbuilder II ($300) not yet. The budget screen's
   insurance budget shows the same rows as the plan screen.
3. Young single: no term life row; CI $281 (not below its minimum); the budget card says $281; "Not yet: Term life for
   your car loan — Your lender will want this from year 2. It costs about $150 a month if you start now."

## 9. Follow-ups and open items

- **F-13 (fence 1), still open.** The Savings group (pay-yourself-first buckets) and the ladder's Tier 1.5 and Tier 3
  savings items must be checked for the same kind of fork. Part closed: the budget card's Protection bucket and the
  insurance budget's Protection total now agree ($533 / $281).
- **F-14**, unchanged: Rest Assured II age growth is not re-fitted.
- **F-15 (fence 2, new):** plans for loved ones carry no sex in their facts, so they are priced on the male rate.
- **F-16 (fence 3, new):** a loan someone else co-signed leaves that person exposed. The fact-finder does not ask about
  co-signers. Needs a new question.
- **F-17 (fence 4, new):** disability income has no need figure; it is funded at its $300 minimum only.
- **Proposed F-18 (Kyron's call):** the choose screen's package cards and budget slider all show the ladder's basket
  (§1 item 2), and the "Partial cover" text still names the safe ceiling (§1 item 9).
- Fence 5 held: no care graph change; no care graph §3 golden moved.

## Appendix — every dump line that moved, was added or dropped

`path<TAB>old<TAB>new` (moved), `path<TAB>value` (added / dropped). Numbers to 4 decimal places. Ladder positions
shift where items were reordered, removed or added.

```
MOVED 219
family.assumptionSetId	"ff-2026-10-27-ladder1"	"ff-2026-10-27-ladder2"
family.insuranceBudget.groups[0].totalMonthly	710.8425	533.1319
family.insuranceBudget.groups[0].funded[1].key	"parent-funeral:00000000-0000-4000-8000-000000000006"	"critical-illness"
family.insuranceBudget.groups[0].funded[1].name	"Your father's funeral cover (Rest Assured II)"	"Critical illness (Life Span Gold)"
family.insuranceBudget.groups[0].funded[1].product	"rest-assured-ii"	"life-span-gold"
family.insuranceBudget.groups[0].funded[1].monthly	293.4481	294.2975
family.insuranceBudget.groups[0].funded[1].minimumMonthly	262.8810	150
family.insuranceBudget.groups[0].funded[1].roughCover	33488.3241	346232.3680
family.insuranceBudget.groups[0].funded[1].why	"Pays the funeral home directly, with no probate wait."	"Keeps the family going while you recover."
family.insuranceBudget.groups[0].funded[1].disclosure	"Rest Assured II has a graded death benefit: in year one it returns the premiums paid; in year two it pays the greater of 25% of the sum assured or the premiums paid; full cover from year three. Accidental death pays in full from day one."	null
family.insuranceBudget.groups[0].funded[1].ladderKeys[0]	"parent-funeral:00000000-0000-4000-8000-000000000006"	"critical-illness"
family.insuranceBudget.groups[0].notYet[0].key	"critical-illness"	"parent-funeral:00000000-0000-4000-8000-000000000006"
family.insuranceBudget.groups[0].notYet[0].name	"Critical illness (Life Span Gold)"	"Your father's funeral cover (Rest Assured II)"
family.insuranceBudget.groups[0].notYet[0].product	"life-span-gold"	"rest-assured-ii"
family.insuranceBudget.groups[0].notYet[0].needsMonthly	150	262.8810
family.insuranceBudget.groups[0].notYet[0].ladderKeys[0]	"critical-illness"	"parent-funeral:00000000-0000-4000-8000-000000000006"
family.insuranceBudget.groups[0].notYet[1].key	"disability-income"	"parent-funeral:00000000-0000-4000-8000-000000000005"
family.insuranceBudget.groups[0].notYet[1].name	"Cashbuilder II with disability income rider"	"Your mother's funeral cover (Rest Assured II)"
family.insuranceBudget.groups[0].notYet[1].product	"cashbuilder-ii"	"rest-assured-ii"
family.insuranceBudget.groups[0].notYet[1].needsMonthly	300	178.5600
family.insuranceBudget.groups[0].notYet[1].ladderKeys[0]	"disability-income"	"parent-funeral:00000000-0000-4000-8000-000000000005"
family.insuranceBudget.groups[0].note	"Your safe range is $355 to $711, with $533 recommended. The plans are funded in priority order, inside the $711 ceiling. Not yet: Critical illness (Life Span Gold) (needs about $150 a month), Cashbuilder II with disability income rider (needs about $300 a month). Add it when the budget grows."	"Your safe range is $355 to $711. We plan to $533, the recommended amount, and fund plans in priority order. Not yet: Your father's funeral cover (Rest Assured II) (needs about $263 a month), Your mother's funeral cover (Rest Assured II) (needs about $179 a month), Cashbuilder II with disability income rider (needs about $300 a month). Add it when the budget grows."
family.closing.assumptionSetId	"ff-2026-10-27-ladder1"	"ff-2026-10-27-ladder2"
family.closing.chosen.cover	1727351.2931	823566.7663
family.closing.chosen.basket.cover	1727351.2931	823566.7663
family.closing.chosen.basket.items[0].cover	1662351.2931	823566.7663
family.closing.chosen.basket.items[0].premiumMonthly	482.0819	238.8344
family.closing.chosen.basket.items[0].band.low	409.7696	203.0092
family.closing.chosen.basket.items[0].band.high	554.3942	274.6595
family.closing.chosen.basket.totalMonthly	632.0819	238.8344
family.closing.chosen.basket.totalHighMonthly	704.3942	274.6595
family.closing.chosen.basket.partial	false	true
family.closing.chosen.basket.notCovered[0]	"Child B's degree"	"Your father's care"
family.closing.chosen.basket.notCovered[1]	"Child A's degree"	"Child B's degree"
family.closing.chosen.basket.notCovered[2]	"Child B's first vehicle"	"Child A's degree"
family.closing.chosen.basket.notCovered[3]	"Child B's wedding"	"Child B's first vehicle"
family.closing.chosen.basket.notCovered[4]	"What you leave behind"	"Child B's wedding"
family.closing.layers[4].lines[6].paid	899875.6656	0
family.closing.layers[4].lines[6].met	true	false
family.closing.layers[4].lines[6].sentence	"Your father's care continues."	"Your father's care stops in month 1."
family.closing.layers[4].lines[7].paid	3908.8613	0
family.closing.layers[4].lines[7].sentence	"Child B's degree stops in month 2."	"Child B's degree stops in month 1."
family.closing.layers[4].notes[4]	"Your plan adds $1,727,351 of cover."	"Your plan adds $823,567 of cover."
family.closing.layers[4].outcome.lumpAvailable	1747351.2931	843566.7663
family.closing.layers[4].outcome.obligationsFailed[0]	"Child B's degree"	"Your father's care"
family.closing.layers[4].outcome.obligationsFailed[1]	"Child A's degree"	"Child B's degree"
family.closing.layers[4].outcome.obligationsFailed[2]	"Child B's first vehicle"	"Child A's degree"
family.closing.layers[4].outcome.obligationsFailed[3]	"Child B's wedding"	"Child B's first vehicle"
family.closing.layers[4].outcome.obligationsFailed[4]	"What you leave behind"	"Child B's wedding"
family.closing.layers[4].outcome.sentences[0]	"Your family receives $1,747,351."	"Your family receives $843,567."
family.closing.layers[4].outcome.sentences[9]	"Your father's care continues."	"Your father's care stops in month 1."
family.closing.layers[4].outcome.sentences[10]	"Child B's degree stops in month 2."	"Child B's degree stops in month 1."
family.closing.scenarios.death.plan.lumpAvailable	1747351.2931	843566.7663
family.closing.scenarios.death.plan.obligationsFailed[0]	"Child B's degree"	"Your father's care"
family.closing.scenarios.death.plan.obligationsFailed[1]	"Child A's degree"	"Child B's degree"
family.closing.scenarios.death.plan.obligationsFailed[2]	"Child B's first vehicle"	"Child A's degree"
family.closing.scenarios.death.plan.obligationsFailed[3]	"Child B's wedding"	"Child B's first vehicle"
family.closing.scenarios.death.plan.obligationsFailed[4]	"What you leave behind"	"Child B's wedding"
family.closing.scenarios.death.plan.sentences[0]	"Your family receives $1,747,351."	"Your family receives $843,567."
family.closing.scenarios.death.plan.sentences[9]	"Your father's care continues."	"Your father's care stops in month 1."
family.closing.scenarios.death.plan.sentences[10]	"Child B's degree stops in month 2."	"Child B's degree stops in month 1."
family.closing.ladder.items[1].key	"parent-funeral:00000000-0000-4000-8000-000000000006"	"critical-illness"
family.closing.ladder.items[1].label	"Your father's funeral cover"	"Critical illness cover"
family.closing.ladder.items[1].min	262.8810	150
family.closing.ladder.items[1].full	1088.6788	1700
family.closing.ladder.items[1].allocated	293.4481	294.2975
family.closing.ladder.items[2].key	"parent-funeral:00000000-0000-4000-8000-000000000005"	"parent-funeral:00000000-0000-4000-8000-000000000006"
family.closing.ladder.items[2].label	"Your mother's funeral cover"	"Your father's funeral cover"
family.closing.ladder.items[2].min	178.5600	262.8810
family.closing.ladder.items[2].full	892.8000	1088.6788
family.closing.ladder.items[2].allocated	178.5600	0
family.closing.ladder.items[2].notYet	false	true
family.closing.ladder.items[3].key	"critical-illness"	"parent-funeral:00000000-0000-4000-8000-000000000005"
family.closing.ladder.items[3].label	"Critical illness cover"	"Your mother's funeral cover"
family.closing.ladder.items[3].min	150	178.5600
family.closing.ladder.items[3].full	1700	892.8000
family.closing.ladder.items[9].allocated	273.3608	451.0715
family.closing.ladder.insuranceAllocated	710.8425	533.1319
family.closing.ladderSpecs[1].key	"parent-funeral:00000000-0000-4000-8000-000000000006"	"critical-illness"
family.closing.ladderSpecs[1].label	"Your father's funeral cover"	"Critical illness cover"
family.closing.ladderSpecs[1].min	262.8810	150
family.closing.ladderSpecs[1].full	1088.6788	1700
family.closing.ladderSpecs[2].key	"parent-funeral:00000000-0000-4000-8000-000000000005"	"parent-funeral:00000000-0000-4000-8000-000000000006"
family.closing.ladderSpecs[2].label	"Your mother's funeral cover"	"Your father's funeral cover"
family.closing.ladderSpecs[2].min	178.5600	262.8810
family.closing.ladderSpecs[2].full	892.8000	1088.6788
family.closing.ladderSpecs[3].key	"critical-illness"	"parent-funeral:00000000-0000-4000-8000-000000000005"
family.closing.ladderSpecs[3].label	"Critical illness cover"	"Your mother's funeral cover"
family.closing.ladderSpecs[3].min	150	178.5600
family.closing.ladderSpecs[3].full	1700	892.8000
young.assumptionSetId	"ff-2026-10-27-ladder1"	"ff-2026-10-27-ladder2"
young.insuranceBudget.groups[0].totalMonthly	374.1425	280.6069
young.insuranceBudget.groups[0].funded[0].key	"life-ruin"	"critical-illness"
young.insuranceBudget.groups[0].funded[0].name	"Term life"	"Critical illness (Life Span Gold)"
young.insuranceBudget.groups[0].funded[0].product	"term"	"life-span-gold"
young.insuranceBudget.groups[0].funded[0].monthly	150	280.6069
young.insuranceBudget.groups[0].funded[0].atMinimum	true	false
young.insuranceBudget.groups[0].funded[0].roughCover	1519238.0815	851240.4823
young.insuranceBudget.groups[0].funded[0].why	"Clears what you owe and pays your funeral, so nothing falls on your family. The most cover for each dollar."	"At your age a serious illness or injury is far more likely than death. This pays a lump sum to live on while you recover."
young.insuranceBudget.groups[0].funded[0].label	"the minimum premium"	"rough"
young.insuranceBudget.groups[0].funded[0].ladderKeys[0]	"life-ruin"	"critical-illness"
young.insuranceBudget.groups[0].note	"Your safe range is $187 to $374, with $281 recommended. The plans are funded in priority order, inside the $374 ceiling. Not yet: Cashbuilder II with disability income rider (needs about $300 a month). Add it when the budget grows."	"Your safe range is $187 to $374. We plan to $281, the recommended amount, and fund plans in priority order. Not yet: Cashbuilder II with disability income rider (needs about $300 a month), Term life for your car loan (needs about $150 a month), Term life for your home loan (needs about $150 a month). Add it when the budget grows."
young.closing.assumptionSetId	"ff-2026-10-27-ladder1"	"ff-2026-10-27-ladder2"
young.closing.chosen.cover	150000	0
young.closing.chosen.basket.cover	150000	0
young.closing.chosen.basket.totalMonthly	150	0
young.closing.chosen.basket.totalHighMonthly	150	0
young.closing.layers[4].lines[0].paid	50000	4000
young.closing.layers[4].lines[0].met	true	false
young.closing.layers[4].lines[0].sentence	"Your funeral is paid for. The funeral home can be paid directly, without waiting on probate."	"Your funeral falls on the family."
young.closing.layers[4].lines[1].paid	100000	0
young.closing.layers[4].lines[1].met	true	false
young.closing.layers[4].lines[1].sentence	"Final medical bills are paid."	"Final medical bills fall on the family."
young.closing.layers[4].lines[2].paid	3000	0
young.closing.layers[4].lines[2].met	true	false
young.closing.layers[4].lines[2].sentence	"The expensive debt is cleared."	"The $3,000 of expensive debt stays with the family."
young.closing.layers[4].notes[4]	"Your plan adds $150,000 of cover."	"Your plan adds $0 of cover."
young.closing.layers[4].outcome.lumpAvailable	154000	4000
young.closing.layers[4].outcome.obligationsMet[0]	"Your funeral"	"Household income, to youngest age 19"
young.closing.layers[4].outcome.sentences[0]	"Your family receives $154,000."	"Your family receives $4,000."
young.closing.layers[4].outcome.sentences[1]	"Your funeral is paid for. The funeral home can be paid directly, without waiting on probate."	"Your funeral falls on the family."
young.closing.layers[4].outcome.sentences[2]	"Final medical bills are paid."	"Final medical bills fall on the family."
young.closing.layers[4].outcome.sentences[3]	"The expensive debt is cleared."	"The $3,000 of expensive debt stays with the family."
young.closing.scenarios.death.plan.lumpAvailable	154000	4000
young.closing.scenarios.death.plan.obligationsMet[0]	"Your funeral"	"Household income, to youngest age 19"
young.closing.scenarios.death.plan.sentences[0]	"Your family receives $154,000."	"Your family receives $4,000."
young.closing.scenarios.death.plan.sentences[1]	"Your funeral is paid for. The funeral home can be paid directly, without waiting on probate."	"Your funeral falls on the family."
young.closing.scenarios.death.plan.sentences[2]	"Final medical bills are paid."	"Final medical bills fall on the family."
young.closing.scenarios.death.plan.sentences[3]	"The expensive debt is cleared."	"The $3,000 of expensive debt stays with the family."
young.closing.ladder.items[1].key	"life-ruin"	"critical-illness"
young.closing.ladder.items[1].label	"Life cover to the ruin level"	"Critical illness cover"
young.closing.ladder.items[1].full	150	316.4589
young.closing.ladder.items[1].allocated	150	280.6069
young.closing.ladder.items[2].key	"critical-illness"	"disability-income"
young.closing.ladder.items[2].label	"Critical illness cover"	"Disability income (Cashbuilder II with the Disability Income Rider)"
young.closing.ladder.items[2].min	150	300
young.closing.ladder.items[2].full	316.4589	300
young.closing.ladder.items[2].allocated	224.1425	0
young.closing.ladder.items[2].notYet	false	true
young.closing.ladder.items[3].key	"disability-income"	"token-annuity"
young.closing.ladder.items[3].tier	1	1.5000
young.closing.ladder.items[3].label	"Disability income (Cashbuilder II with the Disability Income Rider)"	"Token registered annuity (unused tax relief)"
young.closing.ladder.items[3].min	300	200
young.closing.ladder.items[3].full	300	200
young.closing.ladder.items[3].insurance	true	false
young.closing.ladder.items[3].allocated	0	200
young.closing.ladder.items[3].notYet	true	false
young.closing.ladder.items[4].key	"token-annuity"	"buffer-three-months"
young.closing.ladder.items[4].tier	1.5000	2
young.closing.ladder.items[4].label	"Token registered annuity (unused tax relief)"	"Buffer out to three months"
young.closing.ladder.items[4].min	200	0
young.closing.ladder.items[4].full	200	454.1667
young.closing.ladder.items[4].allocated	200	454.1667
young.closing.ladder.items[5].key	"buffer-three-months"	"expensive-debt"
young.closing.ladder.items[5].label	"Buffer out to three months"	"Expensive debt, extra"
young.closing.ladder.items[5].full	454.1667	200
young.closing.ladder.items[5].allocated	454.1667	200
young.closing.ladder.items[6].key	"expensive-debt"	"near-dated"
young.closing.ladder.items[6].label	"Expensive debt, extra"	"Anything due inside three years"
young.closing.ladder.items[6].full	200	252.9162
young.closing.ladder.items[6].allocated	200	252.9162
young.closing.ladder.items[7].key	"near-dated"	"loan-cover:00000000-0000-4000-8000-000000000212"
young.closing.ladder.items[7].label	"Anything due inside three years"	"Life cover for the car loan"
young.closing.ladder.items[7].min	0	150
young.closing.ladder.items[7].full	252.9162	150
young.closing.ladder.items[7].insurance	false	true
young.closing.ladder.items[7].allocated	252.9162	0
young.closing.ladder.items[7].notYet	false	true
young.closing.ladder.items[8].key	"retirement"	"loan-cover:00000000-0000-4000-8000-000000000211"
young.closing.ladder.items[8].label	"Retirement"	"Life cover for the home loan"
young.closing.ladder.items[8].min	0	150
young.closing.ladder.items[8].full	215.7331	150
young.closing.ladder.items[8].insurance	false	true
young.closing.ladder.items[8].allocated	215.7331	0
young.closing.ladder.items[8].notYet	false	true
young.closing.ladder.items[9].key	"milestones"	"retirement"
young.closing.ladder.items[9].label	"Milestones and your own goals"	"Retirement"
young.closing.ladder.items[9].full	1618.4437	215.7331
young.closing.ladder.items[9].allocated	275.4749	215.7331
young.closing.ladder.insuranceAllocated	374.1425	280.6069
young.closing.ladderSpecs[1].key	"life-ruin"	"critical-illness"
young.closing.ladderSpecs[1].label	"Life cover to the ruin level"	"Critical illness cover"
young.closing.ladderSpecs[1].full	150	316.4589
young.closing.ladderSpecs[2].key	"critical-illness"	"disability-income"
young.closing.ladderSpecs[2].label	"Critical illness cover"	"Disability income (Cashbuilder II with the Disability Income Rider)"
young.closing.ladderSpecs[2].min	150	300
young.closing.ladderSpecs[2].full	316.4589	300
young.closing.ladderSpecs[3].key	"disability-income"	"token-annuity"
young.closing.ladderSpecs[3].tier	1	1.5000
young.closing.ladderSpecs[3].label	"Disability income (Cashbuilder II with the Disability Income Rider)"	"Token registered annuity (unused tax relief)"
young.closing.ladderSpecs[3].min	300	200
young.closing.ladderSpecs[3].full	300	200
young.closing.ladderSpecs[3].insurance	true	false
young.closing.ladderSpecs[4].key	"token-annuity"	"buffer-three-months"
young.closing.ladderSpecs[4].tier	1.5000	2
young.closing.ladderSpecs[4].label	"Token registered annuity (unused tax relief)"	"Buffer out to three months"
young.closing.ladderSpecs[4].min	200	0
young.closing.ladderSpecs[4].full	200	454.1667
young.closing.ladderSpecs[5].key	"buffer-three-months"	"expensive-debt"
young.closing.ladderSpecs[5].label	"Buffer out to three months"	"Expensive debt, extra"
young.closing.ladderSpecs[5].full	454.1667	200
young.closing.ladderSpecs[6].key	"expensive-debt"	"near-dated"
young.closing.ladderSpecs[6].label	"Expensive debt, extra"	"Anything due inside three years"
young.closing.ladderSpecs[6].full	200	252.9162
young.closing.ladderSpecs[7].key	"near-dated"	"loan-cover:00000000-0000-4000-8000-000000000211"
young.closing.ladderSpecs[7].tier	2	3
young.closing.ladderSpecs[7].label	"Anything due inside three years"	"Life cover for the home loan"
young.closing.ladderSpecs[7].min	0	150
young.closing.ladderSpecs[7].full	252.9162	150
young.closing.ladderSpecs[7].insurance	false	true
young.closing.ladderSpecs[8].key	"retirement"	"loan-cover:00000000-0000-4000-8000-000000000212"
young.closing.ladderSpecs[8].tier	3	2
young.closing.ladderSpecs[8].label	"Retirement"	"Life cover for the car loan"
young.closing.ladderSpecs[8].min	0	150
young.closing.ladderSpecs[8].full	215.7331	150
young.closing.ladderSpecs[8].insurance	false	true
young.closing.ladderSpecs[9].key	"milestones"	"retirement"
young.closing.ladderSpecs[9].label	"Milestones and your own goals"	"Retirement"
young.closing.ladderSpecs[9].full	1618.4437	215.7331

ADDED 76
family.insuranceBudget.groups[0].notYet[0].why	"Pays the funeral home directly, with no probate wait."
family.insuranceBudget.groups[0].notYet[1].riders	"[]"
family.insuranceBudget.groups[0].notYet[1].why	"Pays the funeral home directly, with no probate wait."
family.insuranceBudget.groups[0].notYet[2].key	"disability-income"
family.insuranceBudget.groups[0].notYet[2].name	"Cashbuilder II with disability income rider"
family.insuranceBudget.groups[0].notYet[2].product	"cashbuilder-ii"
family.insuranceBudget.groups[0].notYet[2].riders[0].id	"disability-income"
family.insuranceBudget.groups[0].notYet[2].riders[0].name	"Disability Income Rider"
family.insuranceBudget.groups[0].notYet[2].riders[0].underwriting	"Medical at any amount"
family.insuranceBudget.groups[0].notYet[2].needsMonthly	300
family.insuranceBudget.groups[0].notYet[2].why	"Pays a monthly income if illness or injury stops you working, on top of lifelong cover."
family.insuranceBudget.groups[0].notYet[2].ladderKeys[0]	"disability-income"
family.closing.chosen.basket.notCovered[5]	"What you leave behind"
family.closing.layers[4].outcome.obligationsFailed[5]	"What you leave behind"
family.closing.scenarios.death.plan.obligationsFailed[5]	"What you leave behind"
family.closing.ladder.items[0].product	"term"
family.closing.ladder.items[1].product	"life-span-gold"
family.closing.ladder.items[2].product	"rest-assured-ii"
family.closing.ladder.items[3].product	"rest-assured-ii"
family.closing.ladder.items[4].product	"cashbuilder-ii"
family.closing.ladder.items[8].product	"term"
family.closing.ladder.insuranceCapMonthly	533.1319
family.closing.ladderSpecs[0].product	"term"
family.closing.ladderSpecs[1].product	"life-span-gold"
family.closing.ladderSpecs[2].product	"rest-assured-ii"
family.closing.ladderSpecs[3].product	"rest-assured-ii"
family.closing.ladderSpecs[4].product	"cashbuilder-ii"
family.closing.ladderSpecs[8].product	"term"
young.insuranceBudget.groups[0].notYet[0].why	"The rider pays a monthly income if illness or injury stops you working. The plan locks in lifelong cover while you are young and healthy, and builds cash value."
young.insuranceBudget.groups[0].notYet[1].key	"loan-cover:00000000-0000-4000-8000-000000000212"
young.insuranceBudget.groups[0].notYet[1].name	"Term life for your car loan"
young.insuranceBudget.groups[0].notYet[1].product	"term"
young.insuranceBudget.groups[0].notYet[1].riders	"[]"
young.insuranceBudget.groups[0].notYet[1].needsMonthly	150
young.insuranceBudget.groups[0].notYet[1].why	"Your lender will want this from year 2. It costs about $150 a month if you start now."
young.insuranceBudget.groups[0].notYet[1].ladderKeys[0]	"loan-cover:00000000-0000-4000-8000-000000000212"
young.insuranceBudget.groups[0].notYet[2].key	"loan-cover:00000000-0000-4000-8000-000000000211"
young.insuranceBudget.groups[0].notYet[2].name	"Term life for your home loan"
young.insuranceBudget.groups[0].notYet[2].product	"term"
young.insuranceBudget.groups[0].notYet[2].riders	"[]"
young.insuranceBudget.groups[0].notYet[2].needsMonthly	150
young.insuranceBudget.groups[0].notYet[2].why	"Your lender will want this from year 6. It costs about $150 a month if you start now."
young.insuranceBudget.groups[0].notYet[2].ladderKeys[0]	"loan-cover:00000000-0000-4000-8000-000000000211"
young.closing.chosen.basket.items	"[]"
young.closing.chosen.basket.notCovered[0]	"Your funeral"
young.closing.chosen.basket.notCovered[1]	"Final medical bills"
young.closing.chosen.basket.notCovered[2]	"Expensive debt"
young.closing.layers[4].outcome.obligationsFailed[0]	"Your funeral"
young.closing.layers[4].outcome.obligationsFailed[1]	"Final medical bills"
young.closing.layers[4].outcome.obligationsFailed[2]	"Expensive debt"
young.closing.scenarios.death.plan.obligationsFailed[0]	"Your funeral"
young.closing.scenarios.death.plan.obligationsFailed[1]	"Final medical bills"
young.closing.scenarios.death.plan.obligationsFailed[2]	"Expensive debt"
young.closing.ladder.items[1].product	"life-span-gold"
young.closing.ladder.items[2].product	"cashbuilder-ii"
young.closing.ladder.items[7].product	"term"
young.closing.ladder.items[8].product	"term"
young.closing.ladder.items[10].key	"milestones"
young.closing.ladder.items[10].tier	3
young.closing.ladder.items[10].label	"Milestones and your own goals"
young.closing.ladder.items[10].min	0
young.closing.ladder.items[10].full	1618.4437
young.closing.ladder.items[10].insurance	false
young.closing.ladder.items[10].allocated	369.0105
young.closing.ladder.items[10].notYet	false
young.closing.ladder.insuranceCapMonthly	280.6069
young.closing.ladderSpecs[1].product	"life-span-gold"
young.closing.ladderSpecs[2].product	"cashbuilder-ii"
young.closing.ladderSpecs[7].product	"term"
young.closing.ladderSpecs[8].product	"term"
young.closing.ladderSpecs[10].key	"milestones"
young.closing.ladderSpecs[10].tier	3
young.closing.ladderSpecs[10].label	"Milestones and your own goals"
young.closing.ladderSpecs[10].min	0
young.closing.ladderSpecs[10].full	1618.4437
young.closing.ladderSpecs[10].insurance	false

DROPPED 50
family.insuranceBudget.groups[0].funded[2].key	"parent-funeral:00000000-0000-4000-8000-000000000005"
family.insuranceBudget.groups[0].funded[2].name	"Your mother's funeral cover (Rest Assured II)"
family.insuranceBudget.groups[0].funded[2].product	"rest-assured-ii"
family.insuranceBudget.groups[0].funded[2].riders	"[]"
family.insuranceBudget.groups[0].funded[2].monthly	178.5600
family.insuranceBudget.groups[0].funded[2].minimumMonthly	178.5600
family.insuranceBudget.groups[0].funded[2].atMinimum	true
family.insuranceBudget.groups[0].funded[2].roughCover	30000
family.insuranceBudget.groups[0].funded[2].why	"Pays the funeral home directly, with no probate wait."
family.insuranceBudget.groups[0].funded[2].disclosure	"Rest Assured II has a graded death benefit: in year one it returns the premiums paid; in year two it pays the greater of 25% of the sum assured or the premiums paid; full cover from year three. Accidental death pays in full from day one."
family.insuranceBudget.groups[0].funded[2].label	"the minimum premium"
family.insuranceBudget.groups[0].funded[2].ladderKeys[0]	"parent-funeral:00000000-0000-4000-8000-000000000005"
family.insuranceBudget.groups[0].notYet[1].riders[0].id	"disability-income"
family.insuranceBudget.groups[0].notYet[1].riders[0].name	"Disability Income Rider"
family.insuranceBudget.groups[0].notYet[1].riders[0].underwriting	"Medical at any amount"
family.closing.chosen.basket.items[1].product	"whole-life"
family.closing.chosen.basket.items[1].cover	65000
family.closing.chosen.basket.items[1].premiumMonthly	150
family.closing.chosen.basket.items[1].band.low	150
family.closing.chosen.basket.items[1].band.high	150
family.closing.chosen.basket.items[1].band.label	"the minimum premium"
family.closing.layers[4].outcome.obligationsMet[6]	"Your father's care"
family.closing.scenarios.death.plan.obligationsMet[6]	"Your father's care"
young.insuranceBudget.groups[0].funded[1].key	"critical-illness"
young.insuranceBudget.groups[0].funded[1].name	"Critical illness (Life Span Gold)"
young.insuranceBudget.groups[0].funded[1].product	"life-span-gold"
young.insuranceBudget.groups[0].funded[1].riders	"[]"
young.insuranceBudget.groups[0].funded[1].monthly	224.1425
young.insuranceBudget.groups[0].funded[1].minimumMonthly	150
young.insuranceBudget.groups[0].funded[1].atMinimum	false
young.insuranceBudget.groups[0].funded[1].roughCover	679951.8715
young.insuranceBudget.groups[0].funded[1].why	"At your age a serious illness or injury is far more likely than death. This pays a lump sum to live on while you recover."
young.insuranceBudget.groups[0].funded[1].disclosure	null
young.insuranceBudget.groups[0].funded[1].label	"rough"
young.insuranceBudget.groups[0].funded[1].ladderKeys[0]	"critical-illness"
young.closing.chosen.basket.items[0].product	"whole-life"
young.closing.chosen.basket.items[0].cover	150000
young.closing.chosen.basket.items[0].premiumMonthly	150
young.closing.chosen.basket.items[0].band.low	150
young.closing.chosen.basket.items[0].band.high	150
young.closing.chosen.basket.items[0].band.label	"the minimum premium"
young.closing.chosen.basket.notCovered	"[]"
young.closing.layers[4].outcome.obligationsMet[1]	"Final medical bills"
young.closing.layers[4].outcome.obligationsMet[2]	"Expensive debt"
young.closing.layers[4].outcome.obligationsMet[3]	"Household income, to youngest age 19"
young.closing.layers[4].outcome.obligationsFailed	"[]"
young.closing.scenarios.death.plan.obligationsMet[1]	"Final medical bills"
young.closing.scenarios.death.plan.obligationsMet[2]	"Expensive debt"
young.closing.scenarios.death.plan.obligationsMet[3]	"Household income, to youngest age 19"
young.closing.scenarios.death.plan.obligationsFailed	"[]"
```
