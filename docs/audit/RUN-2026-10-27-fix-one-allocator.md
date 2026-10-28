# RUN 27 Oct 2026 — Fix run 2: one allocator, real Rest Assured II rates

Brief: `docs/briefs/2026-10-27-fix-one-allocator.md` (on `docs/fact-finder-specs`). Decided by Kyron, 27 Oct 2026
20:10: **Decision 3 = A (one allocator), Decision 4 = A (funeral minimum = smallest Rest Assured II plan).** Branch
`feat/fact-finder-engine` (FPA PR #5). Claude Opus 5.5, effort high, one session. Nothing merged, deployed or applied;
no live database access. **No hard stop was hit.**

## 1. Flagged before the change

1. **The ruin-level life premium is $238.83, not $370.** The brief's $370 is the old ladder figure. It priced the
   ruin-level cover ($823,567) as the closing basket splits it: $65,000 of whole life for the funeral (the $150 whole
   life minimum) plus $758,567 of term ($219.98). The brief maps `life-ruin` to **Term life**, and `life-beyond-ruin`
   "adds to the same term plan". So the item is now one term plan: max($150, 823,567 × 0.29 / 1,000) = **$238.83**.
   Kyron's call if the funeral piece should stay whole life. Had $370 stayed, the family at $711 would get: life $370,
   father $340.86 (minimum $262.88 plus the $77.98 left), and the mother's funeral would wait as "not yet".
   The closing basket (`chosen.basket`, the life package on the close) still splits term and whole life; it is not an
   allocator and was not changed.
2. **The budget screen still shows the old protection bucket.** "Protection (insurance)" in the pay-yourself-first
   buckets reads the recommended figure ($533 family, $281 young single), while the insurance budget below now funds
   up to the ceiling ($711, $374). This is the Savings-group fork the brief fences: recorded under **F-13** (§9).
   Seen in the smoke walk (`fix2-390-young-01-insurance-budget.jpg`).
3. **Disability income is funded at its minimum only.** The brief gives its minimum (today's `minimumFor`, $300) but
   no full amount, and the engine sizes no disability income need. Full = minimum.
4. **Own final expense full** = the premium on the client's funeral wish (`wishes.funeral`), clamped to
   $30,000–$150,000, the same way as a parent's. The brief gives only the minimum.
5. **The family's father gets the $30.57 left over in pass two, while critical illness waits.** That is the rule (pass
   two fills fulls top down; an insurance item that missed its minimum gets nothing). Kyron may want the leftover to
   wait instead.
6. **Loved ones carry no sex in their facts**, so an elder's Rest Assured II is priced on the male rate, with a
   caveat (the brief's rule for "cannot be told").
7. Not changed, noted: `life-ruin` for the "later" profile is a term plan, and term is issued only to age 65; the
   ladder does not check that (it did not before either).

## 2. Fix A — Rest Assured II rates

**Rows** (`core/src/parameters/fact-finder-2026-10.ts`). The single `restAssuredPer1000` row (1.6, estimate) is gone.

| Row | Value | Status | Source | asOf |
|---|---|---|---|---|
| `core:ff.premiumRates.restAssuredMale` | 8.7627 per $1,000 a month at rated age 72 | verified | ApplyOn quote, lead TTRA-9WZE859 | 2026-10-27 |
| `core:ff.premiumRates.restAssuredFemale` | 5.9520 per $1,000 a month at rated age 67 | verified | ApplyOn quote, lead TTRA-9DWVJ3Y | 2026-10-27 |
| `core:ff.premiumRates.restAssuredAgeGrowth` | 1.05 a year away from each anchor | estimate | prototype v17 | 2026-10-27 |

The age-growth row carries the caveat "…uses a 5% a year age factor that is not yet checked against a quote". The
engine reads it only away from a quoted age, so a plan priced at age 72 (male) or 67 (female) carries no estimate.

**One pricing function** (`core/src/premiums.ts`): `restAssuredRatedAge` (age + 1, age next birthday),
`restAssuredEligible` (rated age within the issue ages, so ≤ 80), `restAssuredPer1000`, `restAssuredPremium`,
`restAssuredCoverFor`. `closing.ts`, `insurance-budget.ts` and `loved-ones.ts` call them; the `"rest-assured"` rate
kind is removed from `ratePer1000`. A test asserts that only `premiums.ts` reads the rate rows.

**Sex.** Parents: `parentSex` (mother, grandmother, mother-in-law = female; father, grandfather, father-in-law = male;
`other-elder` = not known). The client: `client.sex`. Not known: male rate, a provenance caveat, and
`ParentFuneralCover.sexFlag`.

**Eligibility on the rated age.** Parent age 79 (rated 80) is issued; parent age 80 (rated 81) is not. The engine
used to let parent age 80 through. Same for loved ones (elder 80 → "Savings for the funeral").

**The quote goldens** (`core/test/rest-assured.test.ts`, to the cent):

| Insured | Engine age | Rated age | $30,000 | $50,000 |
|---|---|---|---|---|
| Father, male (TTRA-9WZE859) | 71 | 72 | **$262.88** | **$438.14** |
| Mother, female (TTRA-9DWVJ3Y) | 66 | 67 | **$178.56** | **$297.60** |

A rate change that moves them is a re-baseline under addendum §14.1.

## 3. Fix B — one allocator

- **`allocateLadder`** (`closing-ladder.ts`): an insurance item gets its minimum or nothing. When the minimum does not
  fit, the item is marked `notYet` and the ladder moves on (skip and continue). In pass two an insurance item is
  topped up only if its plan exists. New `addsTo`: `life-beyond-ruin` adds to `life-ruin` and gets nothing unless
  `life-ruin` is funded. Non-insurance items keep partial funding.
- **Tier 1 default order** (`closing.ts`): life to the ruin level; parent funerals, oldest parent first; critical
  illness; disability income (Cashbuilder II with the Disability Income Rider; family and single); own final expense
  (Rest Assured II on the client; 50 and over). Reorders inside Tier 1 still move; across tiers they are still
  declined (closing guard 12, unchanged).
- **Parent funeral item:** minimum = premium on $30,000; full = premium on the cover `closing.ts` already computes,
  clamped to $30,000–$150,000. New fields on `ParentFuneralCover`: `ratedAge`, `minimumMonthly`, `fullMonthly`,
  `sexFlag`.
- **Insurance budget** (`insurance-budget.ts`): `computeInsuranceBudget(facts, budget, buckets, { ladder, ladderSpecs })`.
  The Protection group is the ladder's insurance items in ladder order, mapped to plans (`life-ruin` → Term life /
  Term life to clear debts; `life-beyond-ruin` → added to that row; `critical-illness` → Life Span Gold;
  `parent-funeral:<id>` → Rest Assured II on that parent; `disability-income` → Cashbuilder II with the rider;
  `own-final-expense` → Rest Assured II on the client). Its total is what the ladder funds; the cap is the stage
  ceiling. The note keeps the safe range and the recommended figure as context. New field `ladderKeys` on
  `FundedPlan` and `NotYetPlan` (empty for savings plans). `fitToMinimums` is now used only by the Savings group and
  by loved ones.
- **Pipeline** (`fact-finder.ts`): the closing comparison runs before the insurance budget, so a ladder reorder
  (`options.ladderOrder`) reaches both screens.

## 4. The 37 goldens (evidence paste-back)

Recorded **before** the change from `core/dist/fpa-core.js` at `8bd31a1` (SHA-256 `7633c014…6f2d18`, the vendored GRP
copy) and **after** from the rebuilt file at `fd5fc30` (SHA-256 `2c15c5f8…dae55f`). **0 of 37 moved.**

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

**Care graph §3 goldens: none moved** (hard stop 1 not hit). No §2.8 golden reads the insurance budget or the ladder.

**New goldens this run.**
- The four Rest Assured II quotes (§2).
- The death scenario lines fix run 1 showed as unpinned, both samples (`goldens-fact-finder.test.ts`). Family, care
  and degree lines today: mother's care continues; father's care, Child B's degree and Child A's degree stop in
  month 1. With the plan: mother's and father's care continue; **Child B's degree stops in month 2**; Child A's
  degree stops in month 1; the family receives $1,747,351. Young single: the full today and plan sentence lists
  (no degree lines). These lines are the same before and after this run.
- The family's Tier 1 allocation at $711 and the Tier 1 reorder result (`one-allocator.test.ts`).

## 5. What moved, and why

Full flat diff of every value `computeFactFinder` returns for both samples (provenance and facts left out):
**188 values moved, 96 added, 4 dropped.** Every line, old and new, is in the appendix. By area:

| Area | Family | Young single |
|---|---|---|
| Insurance budget, Protection total | 533.13 (recommended) → **710.84** (what the ladder funds, at the ceiling) | 280.61 → **374.14** |
| Insurance budget, Protection rows | term 299.87, CI 233.26; not yet: Cashbuilder II 300, Rest Assured II 240.15 → **term 238.83; father's funeral 293.45; mother's funeral 178.56; not yet: CI 150, Cashbuilder II 300** | CI 280.61; not yet: Cashbuilder II 300 → **term 150; CI 224.14; not yet: Cashbuilder II 300** |
| Insurance budget, note | "This is the recommended amount…" → "Your safe range is $355 to $711, with $533 recommended. The plans are funded in priority order, inside the $711 ceiling. Not yet: …" | same, $187 to $374, $281 |
| Ladder Tier 1 | life 369.98; CI 150; mother 190.86 of 1,081.96; father 0 of 1,143.74 → **life 238.83; father 293.45 of 1,088.68; mother 178.56 of 892.80; CI 0 (not yet, needs 150); disability income 0 (not yet, needs 300)** | life 150; CI 224.14 (no change); **disability income 0 (not yet, needs 300)** added |
| Ladder Tier 3 | life beyond the ruin level: full 262.10 (same), 0 allocated (same) | — |
| Ladder, other items | same amounts; positions shift by one (the new disability income item) | same amounts; positions shift by one |
| Parent funeral bands | mother 845.37–1,143.74 → 925.38–1,251.98 (now the female quote, cover $150,000); father 799.71–1,081.96 → 758.88–1,026.72 (the male quote at 72) | — |
| Added fields | `ratedAge`, `minimumMonthly`, `fullMonthly`, `sexFlag` on each parent funeral; `notYet` and `addsTo` on ladder items; `ladderKeys` on plans | `notYet` on ladder items; `ladderKeys` on plans |
| Not moved | care graph, budget, buckets, death need, death scenarios, bands, basket, health score, retirement, goals, savings plans | same |

**The chain for the family's protection.** Ceiling $710.8425 (stage 2). Tier 1 in order:
1. Life to the ruin level: term on $823,567 at 0.29 per $1,000 = **$238.83** (above the $150 minimum). Cap left
   $472.01.
2. Father (71, rated 72, male): minimum = 30 × 8.7627 = **$262.88**. Fits. Cap left $209.13.
3. Mother (66, rated 67, female): minimum = 30 × 5.9520 = **$178.56**. Fits. Cap left $30.57.
4. Critical illness: minimum $150 (Life Span Gold minimum premium; $100,000 at 0.85 = $85). Does not fit: **not yet**.
5. Disability income: minimum $300 (Cashbuilder II). Does not fit: **not yet**.
6. Pass two, top down: life is full; the father's full is $1,088.68 (cover $124,239 = $50,000 × 1.055^17, no grant:
   NIS record unknown), so he takes the **$30.57** left → **$293.45**. Nothing is left for the rest.

Why the old figures moved: the old ladder listed CI before the parents and the parents in facts order (mother first),
funded the mother partly ($190.86 against a $1,082 "minimum" that was the full inflated funeral cost at the band top),
and priced Rest Assured II at the prototype rate on the parent's age. The old insurance budget split the recommended
$533 by weight and dropped the parent funeral first because it was last in its list.

**The chain for the young single.** Ceiling $374.1425 (stage 1). Life to the ruin level: cover $150,000 (the term
minimum) at age 24 costs $14.81, so the $150 minimum premium binds: **$150**. CI: minimum $150, fits. Disability
income: $300 does not fit what is left ($74.14): **not yet**. Pass two: CI takes the $74.14 → **$224.14**. The old
ladder already gave life $150 (as whole life) and CI $224.14; only the insurance budget moved to match it.

**Hard stop 5:** the real ruin-level premium alone is $238.83 against $711 (family) and $150 against $374 (young
single). Not hit.

## 6. Sabotage log

**Guard 21 — parity** (`core/test/one-allocator.test.ts`). Break: in `insurance-budget.ts`, move the last Protection
row to the front (`drafts.unshift(drafts.pop()!)`) — the insurance budget only. Ran
`node --test test/one-allocator.test.ts`: 2 fail.
- `guard 21 …`: `AssertionError [ERR_ASSERTION]: variant 0, order 0: the Protection rows are in ladder order`
- `a reorder inside Tier 1 moves both screens …`: `AssertionError [ERR_ASSERTION]: reordered: the Protection rows are in ladder order`

Restored from a copy; 5/5 pass.

**Guard 22 — no unbuyable plan.** Break: in `closing-ladder.ts`, restore the old partial funding (pass one gives an
insurance item `min(room, minimum)`; pass two tops up any item). Ran the same file: 3 fail.
- `guard 22 …`: `AssertionError [ERR_ASSERTION]: variant 0, order 0: Critical illness cover funded at 30.567137785748514, below its product minimum 150`
- `the sample family at the $711 ceiling: what each Tier 1 item gets`: `Expected values to be strictly deep-equal`
- `a reorder inside Tier 1 moves both screens …`: failed

Restored from a copy; 5/5 pass. (Guard 21 still passed under this break: the insurance budget follows the ladder,
broken or not. That is what guard 21 is for; guard 22 catches the break.)

Guard 21 checks 400+ cases and guard 22 1,000+ funded items: both samples, client ages 24/38/52/62, gross $9,000 to
$60,000, three parent sets (the samples' parents, none, two older parents one of them `other-elder`), each with the
default order and every Tier 1 item moved to the top of Tier 1.

**Guards 13 and 15, re-run in GRP** (`node --test test/fact-finder-guards.test.mjs`, after the re-vendor):
```
✔ guard 13: the vendored engine hashes to PINNED.txt, and the page and the store name the same commit
✔ guard 13 catches a changed engine and a missing pin
✔ guard 13 runs in the build before anything is copied
✔ guard 15: the vendored product table matches life-shapes.js PRODUCTS - cover ranges, child ages and riders
ℹ tests 9   ℹ pass 9   ℹ fail 0
```

## 7. Tests, build and hashes

- Before: `npm test` 132/132; dist SHA-256 `7633c01460422f599014554407e0627243728972c36eeefd72e36e64946f2d18`.
- After: `npm test` **144/144** (new files `rest-assured.test.ts` 6 tests, `one-allocator.test.ts` 5 tests; one new
  test in `goldens-fact-finder.test.ts`), `npm run typecheck` exit 0, `npm run build` rewrote `core/dist/fpa-core.js`;
  `dist.test.ts` confirms it matches a fresh build.
- New dist SHA-256 **`2c15c5f873398b3c912c108c263bf873e08f2fb060c58744c959675b85dae55f`**, engine head
  **`fd5fc30553477e178ecef1a72944e15d0ffd227f`** (commits `c1537aa` the change, `fd5fc30` the single person's term
  life text, seen in the smoke walk). GRP `vendor/fpa-core/PINNED.txt` pins `fd5fc30`.
- Assumption set: **`ff-2026-10-27-ladder1`** (was `ff-2026-10-27-nis70`).

Tests changed, each with the reason beside it: `goldens-fact-finder.test.ts` (the id; death scenario lines added),
`modules-parity.test.ts` (both insurance budgets: the Protection group is the ladder now), `provenance-core.test.ts`
(the two quote rows are `verified`; the age factor stays `estimate` with its caveat). No test deleted or skipped.

## 8. Smoke walk (GRP)

390 only, private headless Chromium, every `supabase.co` request stubbed, fake session, ZZ names. Script
`scratch/fix2-walk.mjs` (not shipped). Evidence: GRP `docs/audit/evidence-2026-10-27-fact-finder/fix2/`.
**13/13 checks pass**; no page errors, no Supabase writes, no horizontal overflow.
1. Family: the close screen's ladder and the insurance budget show the same plans and amounts — term $239, father's
   funeral $293, mother's funeral $179; CI ($150) and Cashbuilder II ($300) not yet; "$711 of $711" on both.
2. Family: critical illness moved up twice, above the father's funeral (inside Tier 1, no declined record). Both
   screens follow: term $239, CI $209, father $263; mother ($179) and Cashbuilder II ($300) not yet.
3. Young single: term $150 and CI $224 (none below its minimum); "Not yet: Cashbuilder II with disability income
   rider — Disability Income Rider: Medical at any amount".

## 9. Follow-ups and open items

- **F-13 (fence 1).** The Savings group (pay-yourself-first buckets) and the ladder's Tier 1.5 and Tier 3 savings items
  must be checked for the same kind of fork. Seen now: the budget builder's "Protection (insurance)" bucket reads the
  recommended figure ($533 / $281) while the insurance budget funds up to the ceiling ($711 / $374), on the same
  screen; guilt-free spending is worked out from the bucket.
- **F-14 (fence 2).** Rest Assured II age growth is not re-fitted: quote two more ages per sex and fit the factor.
- Fence 3 held: no care graph change; no care graph §3 golden moved.
- Kyron's calls: §1 items 1 (ruin level as all term), 3 (disability income full), 5 (pass-two leftover).
- Term issue age (65) is not checked for the "later" profile's life item (§1 item 7).

## Appendix — every dump line that moved, was added or dropped

`path<TAB>old<TAB>new` (moved), `path<TAB>value` (added / dropped). Numbers to 4 decimal places. Ladder positions
shift by one where the disability income item was inserted.

```
MOVED 188
family.assumptionSetId	"ff-2026-10-27-nis70"	"ff-2026-10-27-ladder1"
family.insuranceBudget.groups[0].totalMonthly	533.1319	710.8425
family.insuranceBudget.groups[0].funded[0].key	"term"	"life-ruin"
family.insuranceBudget.groups[0].funded[0].monthly	299.8705	238.8344
family.insuranceBudget.groups[0].funded[0].minimumMonthly	150	238.8344
family.insuranceBudget.groups[0].funded[0].atMinimum	false	true
family.insuranceBudget.groups[0].funded[0].roughCover	1034036.1761	823566.7663
family.insuranceBudget.groups[0].funded[0].label	"rough"	"the minimum premium"
family.insuranceBudget.groups[0].funded[1].key	"ci"	"parent-funeral:00000000-0000-4000-8000-000000000006"
family.insuranceBudget.groups[0].funded[1].name	"Critical illness (Life Span Gold)"	"Your father's funeral cover (Rest Assured II)"
family.insuranceBudget.groups[0].funded[1].product	"life-span-gold"	"rest-assured-ii"
family.insuranceBudget.groups[0].funded[1].monthly	233.2614	293.4481
family.insuranceBudget.groups[0].funded[1].minimumMonthly	150	262.8810
family.insuranceBudget.groups[0].funded[1].roughCover	274425.1576	33488.3241
family.insuranceBudget.groups[0].funded[1].why	"Keeps the family going while you recover."	"Pays the funeral home directly, with no probate wait."
family.insuranceBudget.groups[0].funded[1].disclosure	null	"Rest Assured II has a graded death benefit: in year one it returns the premiums paid; in year two it pays the greater of 25% of the sum assured or the premiums paid; full cover from year three. Accidental death pays in full from day one."
family.insuranceBudget.groups[0].notYet[0].key	"cashbuilder-di"	"critical-illness"
family.insuranceBudget.groups[0].notYet[0].name	"Cashbuilder II with disability income rider"	"Critical illness (Life Span Gold)"
family.insuranceBudget.groups[0].notYet[0].product	"cashbuilder-ii"	"life-span-gold"
family.insuranceBudget.groups[0].notYet[0].needsMonthly	300	150
family.insuranceBudget.groups[0].notYet[1].key	"parent-funeral"	"disability-income"
family.insuranceBudget.groups[0].notYet[1].name	"Parents' funeral cover (Rest Assured II)"	"Cashbuilder II with disability income rider"
family.insuranceBudget.groups[0].notYet[1].product	"rest-assured-ii"	"cashbuilder-ii"
family.insuranceBudget.groups[0].notYet[1].needsMonthly	240.1531	300
family.insuranceBudget.groups[0].note	"This is the recommended amount from your safe range ($355 to $711). Not yet: Cashbuilder II with disability income rider (needs about $300 a month), Parents' funeral cover (Rest Assured II) (needs about $240 a month). Add it when the budget grows."	"Your safe range is $355 to $711, with $533 recommended. The plans are funded in priority order, inside the $711 ceiling. Not yet: Critical illness (Life Span Gold) (needs about $150 a month), Cashbuilder II with disability income rider (needs about $300 a month). Add it when the budget grows."
family.closing.assumptionSetId	"ff-2026-10-27-nis70"	"ff-2026-10-27-ladder1"
family.closing.parentFuneral[0].premium.low	799.7063	758.8800
family.closing.parentFuneral[0].premium.high	1081.9556	1026.7200
family.closing.parentFuneral[1].premium.low	845.3715	925.3770
family.closing.parentFuneral[1].premium.high	1143.7379	1251.9806
family.closing.ladder.items[0].min	369.9844	238.8344
family.closing.ladder.items[0].full	369.9844	238.8344
family.closing.ladder.items[0].allocated	369.9844	238.8344
family.closing.ladder.items[1].key	"critical-illness"	"parent-funeral:00000000-0000-4000-8000-000000000006"
family.closing.ladder.items[1].label	"Critical illness cover"	"Your father's funeral cover"
family.closing.ladder.items[1].min	150	262.8810
family.closing.ladder.items[1].full	1700	1088.6788
family.closing.ladder.items[1].allocated	150	293.4481
family.closing.ladder.items[2].min	1081.9556	178.5600
family.closing.ladder.items[2].full	1081.9556	892.8000
family.closing.ladder.items[2].allocated	190.8581	178.5600
family.closing.ladder.items[3].key	"parent-funeral:00000000-0000-4000-8000-000000000006"	"critical-illness"
family.closing.ladder.items[3].label	"Your father's funeral cover"	"Critical illness cover"
family.closing.ladder.items[3].min	1143.7379	150
family.closing.ladder.items[3].full	1143.7379	1700
family.closing.ladder.items[4].key	"token-annuity"	"disability-income"
family.closing.ladder.items[4].tier	1.5000	1
family.closing.ladder.items[4].label	"Token registered annuity (unused tax relief)"	"Disability income (Cashbuilder II with the Disability Income Rider)"
family.closing.ladder.items[4].min	200	300
family.closing.ladder.items[4].full	200	300
family.closing.ladder.items[4].insurance	false	true
family.closing.ladder.items[4].allocated	200	0
family.closing.ladder.items[5].key	"buffer-three-months"	"token-annuity"
family.closing.ladder.items[5].tier	2	1.5000
family.closing.ladder.items[5].label	"Buffer out to three months"	"Token registered annuity (unused tax relief)"
family.closing.ladder.items[5].min	0	200
family.closing.ladder.items[5].full	1059.1667	200
family.closing.ladder.items[5].allocated	1059.1667	200
family.closing.ladder.items[6].key	"expensive-debt"	"buffer-three-months"
family.closing.ladder.items[6].label	"Expensive debt, extra"	"Buffer out to three months"
family.closing.ladder.items[6].full	600	1059.1667
family.closing.ladder.items[6].allocated	600	1059.1667
family.closing.ladder.items[7].key	"life-beyond-ruin"	"expensive-debt"
family.closing.ladder.items[7].tier	3	2
family.closing.ladder.items[7].label	"Life cover beyond the ruin level"	"Expensive debt, extra"
family.closing.ladder.items[7].full	262.0975	600
family.closing.ladder.items[7].insurance	true	false
family.closing.ladder.items[7].allocated	0	600
family.closing.ladder.items[8].key	"retirement"	"life-beyond-ruin"
family.closing.ladder.items[8].label	"Retirement"	"Life cover beyond the ruin level"
family.closing.ladder.items[8].full	3051.3526	262.0975
family.closing.ladder.items[8].insurance	false	true
family.closing.ladder.items[8].allocated	273.3608	0
family.closing.ladder.items[9].key	"education"	"retirement"
family.closing.ladder.items[9].label	"Education"	"Retirement"
family.closing.ladder.items[9].full	3047.7641	3051.3526
family.closing.ladder.items[9].allocated	0	273.3608
family.closing.ladder.items[10].key	"milestones"	"education"
family.closing.ladder.items[10].label	"Milestones and your own goals"	"Education"
family.closing.ladder.items[10].full	789.0688	3047.7641
family.closing.ladderSpecs[0].min	369.9844	238.8344
family.closing.ladderSpecs[0].full	369.9844	238.8344
family.closing.ladderSpecs[1].key	"critical-illness"	"parent-funeral:00000000-0000-4000-8000-000000000006"
family.closing.ladderSpecs[1].label	"Critical illness cover"	"Your father's funeral cover"
family.closing.ladderSpecs[1].min	150	262.8810
family.closing.ladderSpecs[1].full	1700	1088.6788
family.closing.ladderSpecs[2].min	1081.9556	178.5600
family.closing.ladderSpecs[2].full	1081.9556	892.8000
family.closing.ladderSpecs[3].key	"parent-funeral:00000000-0000-4000-8000-000000000006"	"critical-illness"
family.closing.ladderSpecs[3].label	"Your father's funeral cover"	"Critical illness cover"
family.closing.ladderSpecs[3].min	1143.7379	150
family.closing.ladderSpecs[3].full	1143.7379	1700
family.closing.ladderSpecs[4].key	"token-annuity"	"disability-income"
family.closing.ladderSpecs[4].tier	1.5000	1
family.closing.ladderSpecs[4].label	"Token registered annuity (unused tax relief)"	"Disability income (Cashbuilder II with the Disability Income Rider)"
family.closing.ladderSpecs[4].min	200	300
family.closing.ladderSpecs[4].full	200	300
family.closing.ladderSpecs[4].insurance	false	true
family.closing.ladderSpecs[5].key	"buffer-three-months"	"token-annuity"
family.closing.ladderSpecs[5].tier	2	1.5000
family.closing.ladderSpecs[5].label	"Buffer out to three months"	"Token registered annuity (unused tax relief)"
family.closing.ladderSpecs[5].min	0	200
family.closing.ladderSpecs[5].full	1059.1667	200
family.closing.ladderSpecs[6].key	"expensive-debt"	"buffer-three-months"
family.closing.ladderSpecs[6].label	"Expensive debt, extra"	"Buffer out to three months"
family.closing.ladderSpecs[6].full	600	1059.1667
family.closing.ladderSpecs[7].key	"life-beyond-ruin"	"expensive-debt"
family.closing.ladderSpecs[7].tier	3	2
family.closing.ladderSpecs[7].label	"Life cover beyond the ruin level"	"Expensive debt, extra"
family.closing.ladderSpecs[7].full	262.0975	600
family.closing.ladderSpecs[7].insurance	true	false
family.closing.ladderSpecs[8].key	"retirement"	"life-beyond-ruin"
family.closing.ladderSpecs[8].label	"Retirement"	"Life cover beyond the ruin level"
family.closing.ladderSpecs[8].full	3051.3526	262.0975
family.closing.ladderSpecs[8].insurance	false	true
family.closing.ladderSpecs[9].key	"education"	"retirement"
family.closing.ladderSpecs[9].label	"Education"	"Retirement"
family.closing.ladderSpecs[9].full	3047.7641	3051.3526
family.closing.ladderSpecs[10].key	"milestones"	"education"
family.closing.ladderSpecs[10].label	"Milestones and your own goals"	"Education"
family.closing.ladderSpecs[10].full	789.0688	3047.7641
young.assumptionSetId	"ff-2026-10-27-nis70"	"ff-2026-10-27-ladder1"
young.insuranceBudget.groups[0].totalMonthly	280.6069	374.1425
young.insuranceBudget.groups[0].funded[0].key	"ci"	"life-ruin"
young.insuranceBudget.groups[0].funded[0].name	"Critical illness (Life Span Gold)"	"Term life"
young.insuranceBudget.groups[0].funded[0].product	"life-span-gold"	"term"
young.insuranceBudget.groups[0].funded[0].monthly	280.6069	150
young.insuranceBudget.groups[0].funded[0].atMinimum	false	true
young.insuranceBudget.groups[0].funded[0].roughCover	851240.4823	1519238.0815
young.insuranceBudget.groups[0].funded[0].why	"At your age a serious illness or injury is far more likely than death. This pays a lump sum to live on while you recover."	"Clears what you owe and pays your funeral, so nothing falls on your family. The most cover for each dollar."
young.insuranceBudget.groups[0].funded[0].label	"rough"	"the minimum premium"
young.insuranceBudget.groups[0].notYet[0].key	"cashbuilder-di"	"disability-income"
young.insuranceBudget.groups[0].note	"This is the recommended amount from your safe range ($187 to $374). Not yet: Cashbuilder II with disability income rider (needs about $300 a month). Add it when the budget grows."	"Your safe range is $187 to $374, with $281 recommended. The plans are funded in priority order, inside the $374 ceiling. Not yet: Cashbuilder II with disability income rider (needs about $300 a month). Add it when the budget grows."
young.closing.assumptionSetId	"ff-2026-10-27-nis70"	"ff-2026-10-27-ladder1"
young.closing.ladder.items[3].key	"token-annuity"	"disability-income"
young.closing.ladder.items[3].tier	1.5000	1
young.closing.ladder.items[3].label	"Token registered annuity (unused tax relief)"	"Disability income (Cashbuilder II with the Disability Income Rider)"
young.closing.ladder.items[3].min	200	300
young.closing.ladder.items[3].full	200	300
young.closing.ladder.items[3].insurance	false	true
young.closing.ladder.items[3].allocated	200	0
young.closing.ladder.items[4].key	"buffer-three-months"	"token-annuity"
young.closing.ladder.items[4].tier	2	1.5000
young.closing.ladder.items[4].label	"Buffer out to three months"	"Token registered annuity (unused tax relief)"
young.closing.ladder.items[4].min	0	200
young.closing.ladder.items[4].full	454.1667	200
young.closing.ladder.items[4].allocated	454.1667	200
young.closing.ladder.items[5].key	"expensive-debt"	"buffer-three-months"
young.closing.ladder.items[5].label	"Expensive debt, extra"	"Buffer out to three months"
young.closing.ladder.items[5].full	200	454.1667
young.closing.ladder.items[5].allocated	200	454.1667
young.closing.ladder.items[6].key	"near-dated"	"expensive-debt"
young.closing.ladder.items[6].label	"Anything due inside three years"	"Expensive debt, extra"
young.closing.ladder.items[6].full	252.9162	200
young.closing.ladder.items[6].allocated	252.9162	200
young.closing.ladder.items[7].key	"retirement"	"near-dated"
young.closing.ladder.items[7].tier	3	2
young.closing.ladder.items[7].label	"Retirement"	"Anything due inside three years"
young.closing.ladder.items[7].full	215.7331	252.9162
young.closing.ladder.items[7].allocated	215.7331	252.9162
young.closing.ladder.items[8].key	"milestones"	"retirement"
young.closing.ladder.items[8].label	"Milestones and your own goals"	"Retirement"
young.closing.ladder.items[8].full	1618.4437	215.7331
young.closing.ladder.items[8].allocated	275.4749	215.7331
young.closing.ladderSpecs[3].key	"token-annuity"	"disability-income"
young.closing.ladderSpecs[3].tier	1.5000	1
young.closing.ladderSpecs[3].label	"Token registered annuity (unused tax relief)"	"Disability income (Cashbuilder II with the Disability Income Rider)"
young.closing.ladderSpecs[3].min	200	300
young.closing.ladderSpecs[3].full	200	300
young.closing.ladderSpecs[3].insurance	false	true
young.closing.ladderSpecs[4].key	"buffer-three-months"	"token-annuity"
young.closing.ladderSpecs[4].tier	2	1.5000
young.closing.ladderSpecs[4].label	"Buffer out to three months"	"Token registered annuity (unused tax relief)"
young.closing.ladderSpecs[4].min	0	200
young.closing.ladderSpecs[4].full	454.1667	200
young.closing.ladderSpecs[5].key	"expensive-debt"	"buffer-three-months"
young.closing.ladderSpecs[5].label	"Expensive debt, extra"	"Buffer out to three months"
young.closing.ladderSpecs[5].full	200	454.1667
young.closing.ladderSpecs[6].key	"near-dated"	"expensive-debt"
young.closing.ladderSpecs[6].label	"Anything due inside three years"	"Expensive debt, extra"
young.closing.ladderSpecs[6].full	252.9162	200
young.closing.ladderSpecs[7].key	"retirement"	"near-dated"
young.closing.ladderSpecs[7].tier	3	2
young.closing.ladderSpecs[7].label	"Retirement"	"Anything due inside three years"
young.closing.ladderSpecs[7].full	215.7331	252.9162
young.closing.ladderSpecs[8].key	"milestones"	"retirement"
young.closing.ladderSpecs[8].label	"Milestones and your own goals"	"Retirement"
young.closing.ladderSpecs[8].full	1618.4437	215.7331

ADDED 96
family.insuranceBudget.groups[0].funded[0].ladderKeys[0]	"life-ruin"
family.insuranceBudget.groups[0].funded[1].ladderKeys[0]	"parent-funeral:00000000-0000-4000-8000-000000000006"
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
family.insuranceBudget.groups[0].notYet[0].riders	"[]"
family.insuranceBudget.groups[0].notYet[0].ladderKeys[0]	"critical-illness"
family.insuranceBudget.groups[0].notYet[1].riders[0].id	"disability-income"
family.insuranceBudget.groups[0].notYet[1].riders[0].name	"Disability Income Rider"
family.insuranceBudget.groups[0].notYet[1].riders[0].underwriting	"Medical at any amount"
family.insuranceBudget.groups[0].notYet[1].ladderKeys[0]	"disability-income"
family.insuranceBudget.groups[1].funded[0].ladderKeys	"[]"
family.insuranceBudget.groups[1].funded[1].ladderKeys	"[]"
family.closing.parentFuneral[0].ratedAge	67
family.closing.parentFuneral[0].minimumMonthly	178.5600
family.closing.parentFuneral[0].fullMonthly	892.8000
family.closing.parentFuneral[0].sexFlag	null
family.closing.parentFuneral[1].ratedAge	72
family.closing.parentFuneral[1].minimumMonthly	262.8810
family.closing.parentFuneral[1].fullMonthly	1088.6788
family.closing.parentFuneral[1].sexFlag	null
family.closing.ladder.items[0].notYet	false
family.closing.ladder.items[1].notYet	false
family.closing.ladder.items[2].notYet	false
family.closing.ladder.items[3].notYet	true
family.closing.ladder.items[4].notYet	true
family.closing.ladder.items[5].notYet	false
family.closing.ladder.items[6].notYet	false
family.closing.ladder.items[7].notYet	false
family.closing.ladder.items[8].addsTo	"life-ruin"
family.closing.ladder.items[8].notYet	false
family.closing.ladder.items[9].notYet	false
family.closing.ladder.items[10].notYet	false
family.closing.ladder.items[11].key	"milestones"
family.closing.ladder.items[11].tier	3
family.closing.ladder.items[11].label	"Milestones and your own goals"
family.closing.ladder.items[11].min	0
family.closing.ladder.items[11].full	789.0688
family.closing.ladder.items[11].insurance	false
family.closing.ladder.items[11].allocated	0
family.closing.ladder.items[11].notYet	false
family.closing.ladderSpecs[8].addsTo	"life-ruin"
family.closing.ladderSpecs[11].key	"milestones"
family.closing.ladderSpecs[11].tier	3
family.closing.ladderSpecs[11].label	"Milestones and your own goals"
family.closing.ladderSpecs[11].min	0
family.closing.ladderSpecs[11].full	789.0688
family.closing.ladderSpecs[11].insurance	false
young.insuranceBudget.groups[0].funded[0].ladderKeys[0]	"life-ruin"
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
young.insuranceBudget.groups[0].notYet[0].ladderKeys[0]	"disability-income"
young.insuranceBudget.groups[1].funded[0].ladderKeys	"[]"
young.insuranceBudget.groups[1].funded[1].ladderKeys	"[]"
young.closing.ladder.items[0].notYet	false
young.closing.ladder.items[1].notYet	false
young.closing.ladder.items[2].notYet	false
young.closing.ladder.items[3].notYet	true
young.closing.ladder.items[4].notYet	false
young.closing.ladder.items[5].notYet	false
young.closing.ladder.items[6].notYet	false
young.closing.ladder.items[7].notYet	false
young.closing.ladder.items[8].notYet	false
young.closing.ladder.items[9].key	"milestones"
young.closing.ladder.items[9].tier	3
young.closing.ladder.items[9].label	"Milestones and your own goals"
young.closing.ladder.items[9].min	0
young.closing.ladder.items[9].full	1618.4437
young.closing.ladder.items[9].insurance	false
young.closing.ladder.items[9].allocated	275.4749
young.closing.ladder.items[9].notYet	false
young.closing.ladderSpecs[9].key	"milestones"
young.closing.ladderSpecs[9].tier	3
young.closing.ladderSpecs[9].label	"Milestones and your own goals"
young.closing.ladderSpecs[9].min	0
young.closing.ladderSpecs[9].full	1618.4437
young.closing.ladderSpecs[9].insurance	false

DROPPED 4
family.insuranceBudget.groups[0].notYet[0].riders[0].id	"disability-income"
family.insuranceBudget.groups[0].notYet[0].riders[0].name	"Disability Income Rider"
family.insuranceBudget.groups[0].notYet[0].riders[0].underwriting	"Medical at any amount"
family.insuranceBudget.groups[0].notYet[1].riders	"[]"
```
