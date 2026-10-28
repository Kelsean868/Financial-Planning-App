# RUN 28 Oct 2026 — Fix run 4 (F-18): the package cards become a real choice

Brief: `docs/briefs/2026-10-28-f18-package-cards.md` (on `docs/fact-finder-specs`). Decided by Kyron, 27 Oct 2026
23:49: **Decision 8 = B** (the package cards are a choice inside Tier 1; the slider sets the insurance budget). Branch
`feat/fact-finder-engine` (FPA PR #5), GRP `feat/fact-finder` (GRP PR #160). Claude Opus 5.5, effort high, one
session. Nothing merged, deployed or applied; no live database access. **No care graph golden moved; no privacy guard
failed.** One gate question for Kyron: §1 item 1.

## 1. Flagged

1. **Kyron's call: three dump lines outside the cards and bands move with the default card.** Found on the first
   dump after the change, before the guards were written. The brief's own changes force each of them; none moves an
   allocation, the cap, the insurance budget, the budget card or the death story:
   - `family.closing.chosen.package` "recommended" → "essential" (Change 1, item 4: the default card).
   - `family.closing.chosen.basket.partial` true → false. "Partial" compares the basket with the chosen card. The
     default card was Recommended ($1,727,351), now Essential ($823,567), and the basket ($823,567) reaches it.
   - `family.closing.ladder.items[8].full` and `ladderSpecs[8].full` (life-beyond-ruin) 262.0975 → 339.671. Change 1
     item 3 sets it from the Recommended cover, and item 1 moves that cover ($1,727,351 → $1,994,846, the budget cap
     removed). Its allocation stays $0.

   I read these as card lines (their value is set only by the card definitions), so hard stop 2 is not hit. If Kyron
   reads "basket" and "ladder" strictly, this run stops here: the engine commit is the only thing to revert.
2. **Moving the slider up can give less life cover.** Family, Recommended card: at $533.13 life gets $383.13
   ($1,321,144 of cover); at $710.84 life gets $297.96 ($1,027,453). At $711 the father's funeral minimum ($262.88)
   fits in pass one, so less is left for pass two, where life fills first. The death story gets worse: the father's
   care stops in month 49 (was 120). This is the rule as written (pass one unchanged, §11.4). Kyron's call whether the
   page should say so.
3. **The Floor band shows more life cover than the Recommended band** (family, Essential card): $1,225,591 at $355
   against $823,567 at $533. At $355 critical illness ($150) does not fit after life ($238.83), so the $116.59 left
   goes to life beyond the ruin level in Tier 3. Same cause as item 2.
4. **The young single's cards show cover lines although there is no life plan.** Each card shows $150,000, $150 a
   month and the lines `layerAt(5, $150,000)` meets (funeral, final medical bills, expensive debt, household income),
   with the status "No life plan: no one depends on you, so no life cover is planned." No life item is invented
   (expected result 4).
5. **`budgetMonthly` changed meaning.** It was "a monthly amount instead of a package" (it set the wanted cover and
   made `chosen.package` null). It is now the insurance cap, and `package` always applies. `chosen.package` is never
   null.
6. **New helper `completeOrder`.** The spec list now depends on the card (life-beyond-ruin drops out when its full is 0),
   so an order the page stored under one card could lack a key another card needs. The engine puts a missing key back
   at its default place. No order in the dump changes.
7. **Rollback of `20261027130000` does not re-grant** the two revoked trigger functions. Revoking EXECUTE on a trigger
   function changes nothing for the triggers. Not changed.

## 2. The changes

- **Change 1, the cards** (`closing.ts`). Essential, Recommended, Full = `deathNeed.tiers.*`, each `floorCover` and
  capped by `uw`; the `coverFor(budget.band.recommended)` cap is gone. `life-ruin`: min = premium on the Essential cover
  (unchanged), full = premium on the chosen card's cover. `life-beyond-ruin`: full = max(0, Recommended premium − chosen
  premium). Default card: Essential. Pass one unchanged; pass two fills the chosen level first (life is first in Tier 1).
- **Change 2, the slider** (`closing-ladder.ts` `insuranceCap`, `allocateLadder(…, capMonthly)`; `fact-finder.ts`;
  `household-budget.ts`; `insurance-budget.ts`). `budgetMonthly` is the cap; default `budget.band.recommended`. Not a
  finite number, or outside `band.floor` to `band.ceiling`: `ClosingInputError` (no clamp; 1e-9 float tolerance only).
  The budget card's Protection bucket and the insurance budget note follow it ("We plan to $711, the amount you
  chose, …"). Guard 23 is now "≤ the cap in use". Closing guard 3 (≤ ceiling) unchanged.
- **Change 3, the truth on each card** (`closing.cards`). Per card: a ladder run with that card chosen at the cap in
  use. Cover, premium, covers / does not cover (`layerAt(5, cover)`), status "In your plan" (life-ruin gets the card's
  premium) or "Needs $X more a month" (X = card premium − life-ruin's allocation), or "no-life-plan". **Bands**: a ladder
  run at each band's cap with the chosen card; `cover` = life cover funded. The basket's cover uses the same function:
  the ruin level, then what life-ruin's premium above it buys up to the chosen card, then the funded share of the step
  to the Recommended card.
- **Change 4**: the dated changes block appended under §11.2 of `docs/superpowers/specs/2026-10-27-closing-engine-brief.md`
  (on `docs/fact-finder-specs`), word for word.
- **Change 5**: GRP `supabase/migrations/20261027130000_life_case_link_owner.sql` (not applied) revokes EXECUTE on
  `life_case_scope_append_only()` and `life_case_snapshots_insert_only()` from public, anon, authenticated, before the
  ledger insert. `test/life-case-migrations.test.mjs` checks both lines and their place.
- **GRP page** (display only): the three cards read `closing.cards`; the slider "Your insurance budget" runs from the
  floor to the ceiling (`step="any"`), starts at the recommended figure, and re-runs the engine on each change; default
  card Essential; the ladder line says "you chose" when the slider is set; the Recommended card's text drops "at a
  premium that fits your band". When changed facts put the slider outside the new range, the page goes back to the
  recommended figure (the engine still throws; the page catches `ClosingInputError` and re-runs without it).
- Assumption set **`ff-2026-10-28-cards1`** (was `ff-2026-10-27-ladder2`).

## 3. Expected results, as the engine gives them

| # | Case | Engine output |
|---|---|---|
| 1 | Family, Essential, $533.13 | Term **$238.83**, critical illness **$294.30**. Father, mother, disability income not yet. Essential card: $823,567, $238.83, "In your plan". Matches. |
| 2 | Family, Recommended, $533.13 | Term **$383.13** (238.83 + the 144.30 left), critical illness **$150.00**. Recommended card: $1,994,846, $578.51, **"Needs $195 more a month"** (X = 578.51 − 383.13 = 195.37). Life cover $1,321,144; "Your family receives $1,341,144." Matches the brief ("about $383"). |
| 3 | Family, Recommended, $710.84 | Term **$297.96**, critical illness **$150.00**, father's funeral **$262.88**; mother ($178.56) and disability income ($300) not yet. Budget card $710.84; note "We plan to $711, the amount you chose". Life cover $1,027,453; "Your family receives $1,047,453."; "Your father's care stops in month 49."; **Child B line: "Child B's degree stops in month 1."** Recommended card "Needs $281 more a month". |
| 4 | Young single | No life item. All three cards: $150,000, $150 a month, status "No life plan: no one depends on you, so no life cover is planned."; covers funeral, final medical bills, expensive debt, household income. Bands' life cover: $0, $0, $0. |

The chain for 3: cap $710.8425. Pass one: life 238.83 (left 472.01), CI 150 (left 322.01), father 262.88 (left
59.13); the mother's 178.56 and disability income's 300 do not fit. Pass two: life's full is 578.51, so it takes the
59.13 → 297.96. CI's full ($1,700) waits behind life.

All four pinned in `core/test/f18-package-cards.test.ts`.

## 4. The 37 goldens (evidence paste-back)

Before: `core/dist/fpa-core.js` at `3b0e7f4` (SHA-256 `14b9c994…72e2a`, the vendored GRP copy). After: rebuilt at
`0a332cf` (SHA-256 `e3e38f7d…6b100`). **0 of 37 moved. No care graph §3 golden moved** (hard stop 1 not hit).

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

**Goldens updated this run:** none moved. Tests changed, with the reason: `closing-guards.test.ts` guard 3 and
`fix-ladder-advice.test.ts` guard 25 used `{ budgetMonthly: 5000 }`, which now throws (outside the band); they use the
band's ceiling instead, with the Full card too. Guard 23 became "≤ the cap in use" and also sweeps the floor, the middle
and the ceiling with each card. `goldens-fact-finder.test.ts`: the id. No test deleted or skipped.

**New goldens:** the four expected results (§3).

## 5. What moved with the default card

Flat diff of every value `computeFactFinder` returns for both samples (provenance and facts left out), before and
after: **24 moved, 110 added, 20 dropped.** By area:

| Area | Lines |
|---|---|
| Assumption set id | 4 moved |
| Cards (Change 1 item 1; Change 3) | `packages.recommended` 1,727,351 → 1,994,846; `cards[0..2]` added (110 lines, both samples) |
| Bands (Change 3 item 2) | family: floor 1,114,556 → 1,225,591, recommended 1,727,351 → 823,567, ceiling 2,340,147 → 823,567, with their covers lines; young: 1,761,272 / 2,708,624 / 2,880,000 → 0 / 0 / 0 |
| Outside cards and bands | the three lines in §1 item 1 (Kyron's call) |
| Not moved | every allocation on the ladder, the cap, the insurance budget, the budget buckets, the basket's cover and premium, the death story, the care graph, the goldens |

Every line is in the appendix.

## 6. Sabotage log

**Guard 26 — card truth** (`core/test/f18-package-cards.test.ts`). Break: `closing.ts`, the card status from the card
premium alone (`short = premiumMonthly − cap`). Ran `node --test test/f18-package-cards.test.ts`: 3 fail.
- `guard 26 …`: `AssertionError [ERR_ASSERTION]: variant 0, order 0: recommended card needs 45.37 more; the run says 195.37`
- expected results 2 and 3 (`Expected values to be strictly deep-equal` / `strictly equal`)

Restored from a copy; 9/9 pass.

**Guard 27 — slider range.** Break: `closing-ladder.ts` `insuranceCap` clamps to the floor to ceiling (and a bad value
to the recommended figure) instead of throwing. Ran the same file: 1 fail.
- `guard 27 …`: `AssertionError [ERR_ASSERTION]: Missing expected exception (ClosingInputError): budget 354.4212500000003 (range 355.42 to 710.84) must throw`

Restored from a copy; 9/9 pass.

**Change 5 migration text test** (GRP `test/life-case-migrations.test.mjs`). Break: delete the
`life_case_snapshots_insert_only` revoke line. 1 fail: `AssertionError [ERR_ASSERTION]: life_case_snapshots_insert_only execute revoked`.
Restored; 9/9 pass.

Guard 26 runs over the shared sweep (`ladder-cases.ts`: both samples and 150 variants, each order with every Tier 1
item moved to the top) and, for each variant, each card at the floor and the ceiling. Guard 27 covers both samples and
30 variants: floor − 1, floor − 0.01, ceiling + 0.01, ceiling + 1, NaN, ±Infinity, the string "500", 0 and −1;
the floor, the ceiling and the middle are accepted unchanged.

**Guards 21 to 25, re-run** (`node --test test/one-allocator.test.ts test/fix-ladder-advice.test.ts test/privacy-guards.test.ts`):
```
✔ guard 23: insurance allocated is never above the cap in use (the slider, else the recommended figure)
✔ guard 24: no funded ladder item breaks its product's issue ages (rated age)
✔ guard 24 fixture: a client of rated age 66 gets whole life to the ruin level, not term
✔ guard 25: the close screen's life package is the ladder's life allocation, to the cent
✔ expected result, family: cap $533.13; term $238.83 and CI $294.30; the funerals and disability income wait
✔ expected result, young single: cap $280.61; CI $280.61; disability income, car loan cover (Tier 2) and home loan cover (Tier 3) wait
✔ Change 3: no ruin-level life cover without dependants; parent care paid by the client counts as a dependant
✔ Change 4: loan cover follows each loan goal; whole life when term cannot be issued at the goal date
✔ guard 21: the insurance budget's Protection rows equal the ladder's funded insurance items, to the cent
✔ guard 22: no funded insurance item on the ladder is below its product minimum
✔ Tier 1 default order: life, CI, parent funerals oldest first, disability income; own final expense for 50 and over
✔ the sample family at the $533 recommended: what each Tier 1 item gets
✔ a reorder inside Tier 1 moves both screens: the father's funeral above critical illness
✔ valid sample facts pass
✔ guard 7: no free text on a parent
✔ guard 8: no health answer anywhere in a case
✔ guard 8: a scope row or a snapshot carrying a health answer fails the write
✔ guard 8: the engine's own outputs carry no health keys
✔ people are deduped by id only: duplicate person ids fail
ℹ pass 19
ℹ fail 0
```

**Guards 13 and 15, re-run in GRP** (`node --test test/fact-finder-guards.test.mjs`, after the re-vendor):
```
✔ guard 13: the vendored engine hashes to PINNED.txt, and the page and the store name the same commit
✔ guard 13 catches a changed engine and a missing pin
✔ guard 13 runs in the build before anything is copied
✔ guard 12: every fact-finder file is classified PORTAL ONLY, and none is on a public, partner or proposals list
✔ guard 12 runs in the build over public, referrer and proposals after they are written
✔ guard 12 catches a fact-finder file, the vendored engine, or an inlined engine in a non-portal bundle
✔ guard 18: no fact-finder file carries a WhatsApp link, "Send to Kyron" or a resume link
✔ guard 18 catches each self-serve route
✔ guard 15: the vendored product table matches life-shapes.js PRODUCTS - cover ranges, child ages and riders
ℹ tests 9
ℹ pass 9
ℹ fail 0
```
(The first run of guard 13 failed, as it should: the page and the store still named commit `0f71c4a…`. Fixed with
`0a332cf…` in `fact-finder.js` `ENGINE_PIN` and `life-case-store.js` `ENGINE_VERSION`, and the stamp `?v=e3e38f7d`.)

Privacy guards 7 and 8 pass (above). Guard 11 (the queue strip) passes in the GRP full suite (hard stop 4 not hit).

## 7. Tests, build and hashes

- Before: `npm test` 152/152; dist SHA-256 `14b9c994b6b7b2150b7249d7549649a962166e5ce0e7b6f933b2d3b32fb72e2a`.
- After: `npm test` **161/161** (new file `f18-package-cards.test.ts`, 9 tests), `npm run typecheck` exit 0,
  `npm run build` rewrote `core/dist/fpa-core.js`; `dist.test.ts` confirms it matches a fresh build.
- New dist SHA-256 **`e3e38f7ddc4d97ddf4a8e0731053ba728f907c5e4476d2198e2f55fc8146b100`**, engine commit
  **`0a332cf7d7e526981ad1643da4f50005fbbf82d7`**. GRP `vendor/fpa-core/PINNED.txt` pins it.
- GRP full suite (`npm test` in the GRP worktree, after the re-vendor): **3,090 tests, 0 fail, 30 skipped** (the same 30 as fix run 3). The three files `npm test` rewrites were restored, not committed. The guard SQL id was updated after this run; the three test files that read it were re-run: 31/31. GRP commit **`87b0c818efdea144acb491135f3657a257e15031`** (re-vendor, page, migration, smoke walk evidence).
- Assumption set: **`ff-2026-10-28-cards1`** (was `ff-2026-10-27-ladder2`).

## 8. Smoke walk (GRP)

390 only, private headless Chromium, every `supabase.co` request stubbed, fake session, ZZ names. Script
`scratch/fix4-walk.mjs` (not shipped). Evidence: GRP `docs/audit/evidence-2026-10-27-fact-finder/fix4/`.
**12/12 checks pass**; no page errors, no Supabase writes, no horizontal overflow.
1. Family: three cards, three covers: Essential $823,567 "In your plan"; Recommended $1,994,846 "Needs $195 more a
   month"; Full $2,236,674 "Needs $266 more a month". Each shows "Covers: …" and "Does not cover: …".
2. Family: Recommended chosen. At $533 the budget card, the insurance budget and the close show $533 ("Insurance in the
   plan: $533 of the $533 recommended a month"). Slider to $711: all three show $711 ("… $711 of the $711 you chose a
   month"). The death story changes: "Your family receives $1,341,144." → "$1,047,453."; the father's care: month 120 →
   month 49. The Recommended card: "Needs $281 more a month".
3. Family: the slider's min is $355 and max $711. Pushed to 0 it stops at $355; pushed to 99,999 it stops at $711.

## 9. Follow-ups and open items

- **§1 item 1: decided** (Decision 1, §10): the three lines are card lines. `0a332cf` stands.
- **§1 item 2: decided** (Decision 9, §10): the rule stays; the card says which plans take their minimum first.
- F-13 to F-17 stay open (fence 1).
- **F-19 (new, record only):** two NIS pension-age rows disagree. `fact-finder-2026-10.ts` has a flat 65
  (`nisPensionAge`); `retirement-2026-10.ts` has the 2028–2036 rise.
- **F-20 (new, record only):** parameter refresh before **4 Jan 2027**: the NIS class table (rate up about 3 points)
  and the SCP income bands for the $3,750 rate. Both unpublished today.
- Fence 4 held: no care graph change; no care graph §3 golden moved.

## 10. Kyron's decisions, 28 Oct 2026, and the follow-up change

- **Decision 1: accept.** `chosen.package`, `chosen.basket.partial` and life-beyond-ruin's `full` are card lines. Hard
  stop 2 was not hit; nothing reverted.
- **Decision 9: keep the rule** (raising the budget can lower life cover; pass one is unchanged). On a card whose
  status is "Needs $X more a month", when other Tier 1 plans are funded at this budget, the page shows under the
  status: "Other plans get their minimum first: {plan names}. To keep the {card} life cover as well, you need $X more a
  month."
  - GRP only (no engine change, no new maths): `cardNeedsLine` in `fact-finder-plan.js`. The plan names are the ladder
    labels of the engine run with that card chosen at the budget in use (Tier 1, insurance, not life-ruin, allocated
    above $0); $X is the card's own `needsMonthly`, formatted with the engine's `money`. No line on a card in the plan,
    on a card with no life plan, or when no other Tier 1 plan is funded.
  - Family at $711: Recommended: "Other plans get their minimum first: critical illness cover, your father's funeral
    cover. To keep the Recommended life cover as well, you need $281 more a month." Full: the same plans, "$351". At
    $533, Recommended: "… critical illness cover. … you need $195 more a month." Essential: no line.
  - One test: `test/fact-finder-close.test.mjs` "Decision 9: …" (the $711 and $533 Recommended lines, no line on
    Essential, no line for the young single). Break: $X from `card.premiumMonthly`; it failed with `… you need $579 more
    a month.`; restored. The six fact-finder test files: 55/55.
  - Smoke walk re-run at 390 (`scratch/fix4-walk.mjs`, Recommended at $711, Supabase stubbed, ZZ names): **13/13**,
    the new check included; no page errors, no Supabase writes, no overflow. Evidence `fix4/` overwritten.
  - GRP commit **`7dbe512c78c0256c0ab03014771fdcacf03d7140`** (PR #160). The engine and its hash did not change.
  - Note: after a reorder that puts a plan above life in Tier 1, that plan can get more than its minimum, while the line
    said "minimum first". The new wording below no longer claims a minimum.
- **Wording change (Kyron, 28 Oct 2026).** The line is now: "Your budget also pays for: {plans}. To keep the {card}
  life cover as well, you need $X more a month." Only the opening words changed; the plans, the card and $X come from
  the engine as before.
  - Family at $711, Recommended: "Your budget also pays for: critical illness cover, your father's funeral cover. To
    keep the Recommended life cover as well, you need $281 more a month." Full: the same plans, "$351". At $533,
    Recommended: "Your budget also pays for: critical illness cover. … you need $195 more a month." Essential: no line.
  - The Decision 9 test and the smoke walk check use the new text. Fact-finder test files: 55/55. Smoke walk re-run
    at 390 (Recommended at $711): **13/13**; no page errors, no Supabase writes, no overflow. Evidence `fix4/`
    overwritten.
  - **Full portal suite, once, on the final code** (`npm test` in `C:\Projects\GRP-wt-fact-finder`): **3,091 tests,
    3,061 pass, 0 fail, 30 skipped** (the same 30 as before; one more test than §7: the Decision 9 test). The three
    files `npm test` rewrites were restored, not committed.
  - GRP commit **`db74f97c925b148029f27b9b8f3caf4729c528c1`** (PR #160). The engine and its hash did not change.

## Appendix — every dump line that moved, was added or dropped

`path<TAB>old<TAB>new` (moved), `path<TAB>value` (added / dropped). Numbers to 4 decimal places.

```
MOVED 24
family.assumptionSetId	"ff-2026-10-27-ladder2"	"ff-2026-10-28-cards1"
family.closing.assumptionSetId	"ff-2026-10-27-ladder2"	"ff-2026-10-28-cards1"
family.closing.packages.recommended	1727351.2931	1994846.1357
family.closing.chosen.package	"recommended"	"essential"
family.closing.chosen.basket.partial	true	false
family.closing.bands[0].cover	1114556.0345	1225590.5172
family.closing.bands[1].cover	1727351.2931	823566.7663
family.closing.bands[1].doesNotCover[0]	"Child B's degree"	"Your father's care"
family.closing.bands[1].doesNotCover[1]	"Child A's degree"	"Child B's degree"
family.closing.bands[1].doesNotCover[2]	"Child B's first vehicle"	"Child A's degree"
family.closing.bands[1].doesNotCover[3]	"Child B's wedding"	"Child B's first vehicle"
family.closing.bands[1].doesNotCover[4]	"What you leave behind"	"Child B's wedding"
family.closing.bands[2].cover	2340146.5517	823566.7663
family.closing.ladder.items[8].full	262.0975	339.671
family.closing.ladderSpecs[8].full	262.0975	339.671
young.assumptionSetId	"ff-2026-10-27-ladder2"	"ff-2026-10-28-cards1"
young.closing.assumptionSetId	"ff-2026-10-27-ladder2"	"ff-2026-10-28-cards1"
young.closing.chosen.package	"recommended"	"essential"
young.closing.bands[0].cover	1761271.6472	0
young.closing.bands[0].covers[0]	"Your funeral"	"Household income, to youngest age 19"
young.closing.bands[1].cover	2708624.2037	0
young.closing.bands[1].covers[0]	"Your funeral"	"Household income, to youngest age 19"
young.closing.bands[2].cover	2880000	0
young.closing.bands[2].covers[0]	"Your funeral"	"Household income, to youngest age 19"

ADDED 110
family.closing.cards[0].package	"essential"
family.closing.cards[0].cover	823566.7663
family.closing.cards[0].premiumMonthly	238.8344
family.closing.cards[0].lifeMonthly	238.8344
family.closing.cards[0].covers[0]	"Your funeral"
family.closing.cards[0].covers[1]	"Final medical bills"
family.closing.cards[0].covers[2]	"Expensive debt"
family.closing.cards[0].covers[3]	"The mortgage"
family.closing.cards[0].covers[4]	"Household income, to youngest age 19"
family.closing.cards[0].covers[5]	"Your mother's care"
family.closing.cards[0].doesNotCover[0]	"Your father's care"
family.closing.cards[0].doesNotCover[1]	"Child B's degree"
family.closing.cards[0].doesNotCover[2]	"Child A's degree"
family.closing.cards[0].doesNotCover[3]	"Child B's first vehicle"
family.closing.cards[0].doesNotCover[4]	"Child B's wedding"
family.closing.cards[0].doesNotCover[5]	"What you leave behind"
family.closing.cards[0].status	"in-plan"
family.closing.cards[0].needsMonthly	0
family.closing.cards[0].statusText	"In your plan"
family.closing.cards[1].package	"recommended"
family.closing.cards[1].cover	1994846.1357
family.closing.cards[1].premiumMonthly	578.5054
family.closing.cards[1].lifeMonthly	383.1319
family.closing.cards[1].covers[0]	"Your funeral"
family.closing.cards[1].covers[1]	"Final medical bills"
family.closing.cards[1].covers[2]	"Expensive debt"
family.closing.cards[1].covers[3]	"The mortgage"
family.closing.cards[1].covers[4]	"Household income, to youngest age 19"
family.closing.cards[1].covers[5]	"Your mother's care"
family.closing.cards[1].covers[6]	"Your father's care"
family.closing.cards[1].covers[7]	"Child B's degree"
family.closing.cards[1].covers[8]	"Child A's degree"
family.closing.cards[1].doesNotCover[0]	"Child B's first vehicle"
family.closing.cards[1].doesNotCover[1]	"Child B's wedding"
family.closing.cards[1].doesNotCover[2]	"What you leave behind"
family.closing.cards[1].status	"needs-more"
family.closing.cards[1].needsMonthly	195.3735
family.closing.cards[1].statusText	"Needs $195 more a month"
family.closing.cards[2].package	"full"
family.closing.cards[2].cover	2236674.0251
family.closing.cards[2].premiumMonthly	648.6355
family.closing.cards[2].lifeMonthly	383.1319
family.closing.cards[2].covers[0]	"Your funeral"
family.closing.cards[2].covers[1]	"Final medical bills"
family.closing.cards[2].covers[2]	"Expensive debt"
family.closing.cards[2].covers[3]	"The mortgage"
family.closing.cards[2].covers[4]	"Household income, to youngest age 19"
family.closing.cards[2].covers[5]	"Your mother's care"
family.closing.cards[2].covers[6]	"Your father's care"
family.closing.cards[2].covers[7]	"Child B's degree"
family.closing.cards[2].covers[8]	"Child A's degree"
family.closing.cards[2].covers[9]	"Child B's first vehicle"
family.closing.cards[2].covers[10]	"Child B's wedding"
family.closing.cards[2].covers[11]	"What you leave behind"
family.closing.cards[2].doesNotCover	"[]"
family.closing.cards[2].status	"needs-more"
family.closing.cards[2].needsMonthly	265.5036
family.closing.cards[2].statusText	"Needs $266 more a month"
family.closing.bands[1].doesNotCover[5]	"What you leave behind"
family.closing.bands[2].doesNotCover[0]	"Your father's care"
family.closing.bands[2].doesNotCover[1]	"Child B's degree"
family.closing.bands[2].doesNotCover[2]	"Child A's degree"
family.closing.bands[2].doesNotCover[3]	"Child B's first vehicle"
family.closing.bands[2].doesNotCover[4]	"Child B's wedding"
family.closing.bands[2].doesNotCover[5]	"What you leave behind"
young.closing.cards[0].package	"essential"
young.closing.cards[0].cover	150000
young.closing.cards[0].premiumMonthly	150
young.closing.cards[0].lifeMonthly	0
young.closing.cards[0].covers[0]	"Your funeral"
young.closing.cards[0].covers[1]	"Final medical bills"
young.closing.cards[0].covers[2]	"Expensive debt"
young.closing.cards[0].covers[3]	"Household income, to youngest age 19"
young.closing.cards[0].doesNotCover	"[]"
young.closing.cards[0].status	"no-life-plan"
young.closing.cards[0].needsMonthly	0
young.closing.cards[0].statusText	"No life plan: no one depends on you, so no life cover is planned."
young.closing.cards[1].package	"recommended"
young.closing.cards[1].cover	150000
young.closing.cards[1].premiumMonthly	150
young.closing.cards[1].lifeMonthly	0
young.closing.cards[1].covers[0]	"Your funeral"
young.closing.cards[1].covers[1]	"Final medical bills"
young.closing.cards[1].covers[2]	"Expensive debt"
young.closing.cards[1].covers[3]	"Household income, to youngest age 19"
young.closing.cards[1].doesNotCover	"[]"
young.closing.cards[1].status	"no-life-plan"
young.closing.cards[1].needsMonthly	0
young.closing.cards[1].statusText	"No life plan: no one depends on you, so no life cover is planned."
young.closing.cards[2].package	"full"
young.closing.cards[2].cover	150000
young.closing.cards[2].premiumMonthly	150
young.closing.cards[2].lifeMonthly	0
young.closing.cards[2].covers[0]	"Your funeral"
young.closing.cards[2].covers[1]	"Final medical bills"
young.closing.cards[2].covers[2]	"Expensive debt"
young.closing.cards[2].covers[3]	"Household income, to youngest age 19"
young.closing.cards[2].doesNotCover	"[]"
young.closing.cards[2].status	"no-life-plan"
young.closing.cards[2].needsMonthly	0
young.closing.cards[2].statusText	"No life plan: no one depends on you, so no life cover is planned."
young.closing.bands[0].doesNotCover[0]	"Your funeral"
young.closing.bands[0].doesNotCover[1]	"Final medical bills"
young.closing.bands[0].doesNotCover[2]	"Expensive debt"
young.closing.bands[1].doesNotCover[0]	"Your funeral"
young.closing.bands[1].doesNotCover[1]	"Final medical bills"
young.closing.bands[1].doesNotCover[2]	"Expensive debt"
young.closing.bands[2].doesNotCover[0]	"Your funeral"
young.closing.bands[2].doesNotCover[1]	"Final medical bills"
young.closing.bands[2].doesNotCover[2]	"Expensive debt"

DROPPED 20
family.closing.bands[1].covers[6]	"Your father's care"
family.closing.bands[2].covers[6]	"Your father's care"
family.closing.bands[2].covers[7]	"Child B's degree"
family.closing.bands[2].covers[8]	"Child A's degree"
family.closing.bands[2].covers[9]	"Child B's first vehicle"
family.closing.bands[2].covers[10]	"Child B's wedding"
family.closing.bands[2].covers[11]	"What you leave behind"
family.closing.bands[2].doesNotCover	"[]"
young.closing.bands[0].covers[1]	"Final medical bills"
young.closing.bands[0].covers[2]	"Expensive debt"
young.closing.bands[0].covers[3]	"Household income, to youngest age 19"
young.closing.bands[0].doesNotCover	"[]"
young.closing.bands[1].covers[1]	"Final medical bills"
young.closing.bands[1].covers[2]	"Expensive debt"
young.closing.bands[1].covers[3]	"Household income, to youngest age 19"
young.closing.bands[1].doesNotCover	"[]"
young.closing.bands[2].covers[1]	"Final medical bills"
young.closing.bands[2].covers[2]	"Expensive debt"
young.closing.bands[2].covers[3]	"Household income, to youngest age 19"
young.closing.bands[2].doesNotCover	"[]"
```
