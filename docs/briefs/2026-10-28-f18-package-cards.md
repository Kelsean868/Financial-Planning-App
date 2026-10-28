# BRIEF 28 Oct 2026 — Fix run 4 (F-18): the package cards become a real choice

Model: **Claude Opus 5.5, effort high.** One session. Do not use `/model` mid-session.
Start in `C:\Projects`. Read GRP `CLAUDE.md` before any GRP step; its guardrails hold (never read `.env.local`,
ZZ test names, worktrees with the node_modules junction, never `npm install` in a worktree, no deploys).

Decided by Kyron, 27 Oct 2026, 23:49: **Decision 8 = B.** The package cards become a choice inside Tier 1. The
slider sets the insurance budget.

## Context

Fix run 3 is pushed: FPA #5 at `3b0e7f4`, GRP #160 at `2bfb622`, progress file at `273424d`, assumption set
`ff-2026-10-27-ladder2`. Read FPA `docs/audit/RUN-2026-10-27-fix-ladder-advice.md` first. Its proposed F-18: on the
choose screen the Essential, Recommended and Full cards all show the same cover, and the slider changes nothing.
Closing brief §3 needs them: each card shows which obligations it covers and which it does not.

## Change 1 — the card sets the Tier 1 life target

1. Card covers: Essential = `deathNeed.tiers.essential`, Recommended = `tiers.recommended`, Full = `tiers.full`.
   Each is floored (`floorCover`) and capped by the underwriting limit (`uw`). Remove the
   `coverFor(budget.band.recommended)` cap from the Recommended card: the budget is the slider's job.
2. The chosen card sets the `life-ruin` item's **full**: the premium on the chosen card's cover. Its **minimum**
   stays the premium on the Essential cover (the ruin level).
3. `life-beyond-ruin` (Tier 3) full = max(0, premium on the Recommended cover − premium on the chosen cover).
4. Default card: **Essential.** This is the inverted gate for this change: **with the default card, no golden
   moves, and no dump line moves in the ladder, the insurance budget, the basket or the death story.** Only the
   card lines (Change 1, item 1; Change 3) and the band lines (Change 3, item 2) may move. List each one.
5. Pass one is unchanged. In pass two, life is first in Tier 1, so spare money fills the chosen life level before
   critical illness and the funerals. A reorder inside Tier 1 still changes that order (Option B).

## Change 2 — the slider sets the insurance budget

1. `options.budgetMonthly` now means the insurance cap. It replaces `budget.band.recommended` as the ladder's cap
   when given. Default (not given) = `budget.band.recommended`.
2. Valid range: from `budget.band.floor` to the ceiling. A value that is not a finite number, or is outside the range,
   throws `ClosingInputError`. Do not clamp silently.
3. The slider on the page runs from the floor to the ceiling, starts at the recommended figure, and re-runs the
   engine on each change. Every screen follows: budget card, insurance budget, close.
4. Guard 23 becomes: insurance allocated ≤ the cap in use. Closing guard 3 (≤ ceiling) is unchanged.

## Change 3 — each card shows the truth about itself

1. For each card, run the ladder with that card chosen, at the current cap. Show:
   1. its cover and its premium;
   2. what it covers and what it does not (`layerAt(5, cover)` lines, as today);
   3. its status: "In your plan" when the life item gets the card's full; otherwise "Needs $X more a month",
      where X = the card's premium − the life amount that run gives.
2. The bands (`floor`, `recommended`, `ceiling`) use the same method: run the ladder at each band's cap with the
   chosen card, and report the life cover actually funded. They no longer assume all premium goes to life.
3. The death story uses the life cover actually funded (as fix run 3 made it). So a chosen card that is funded
   brings its degree and care lines back.

## Change 4 — the addendum records the changes

Append this block under §11.2 in the repo copy of the closing addendum (on `docs/fact-finder-specs`), word for word:

> **Dated changes to §11.2**
>
> - **27 Oct 2026, real quotes (ApplyOn leads TTRA-9WZE859, TTRA-9DWVJ3Y).** "The premium is small" does not hold.
>   Rest Assured II on $30,000 costs $262.88 a month for a father rated 72 and $178.56 for a mother rated 67. For the
>   sample family the two funerals take most of the insurance budget.
> - **27 Oct 2026, Decision 6 = A (Kyron).** Tier 1 default order: life to the ruin level, critical illness, parent
>   funerals (oldest first), disability income, own final expense ("later" profile only). The client may reorder
>   inside Tier 1.
> - **27 Oct 2026, Decision 5 = A (Kyron).** The insurance cap is the band's recommended figure. The stage ceiling
>   stays a guard.
> - **27 Oct 2026, Decision 7 = A (Kyron).** No ruin-level life cover when no one depends on the client. Life cover
>   follows each loan goal, in the goal's tier.
> - **27 Oct 2026, Decision 8 = B (Kyron).** The client may choose a life level above the ruin level (the package
>   cards) as the Tier 1 life target. The default is the ruin level. Pass one is unchanged: every Tier 1 item gets
>   its minimum first. In pass two the chosen life level fills first, in default order; a reorder inside Tier 1
>   changes that. The remainder above the Recommended level stays in Tier 3.

## Change 5 — tidy the trigger function grants

In `supabase/migrations/20261027130000_life_case_link_owner.sql` (not yet applied), add before the ledger insert:

```sql
revoke execute on function public.life_case_scope_append_only() from public, anon, authenticated;
revoke execute on function public.life_case_snapshots_insert_only() from public, anon, authenticated;
```

This matches the repo convention (`sec_revoke_trigger_functions`). Extend the migration text test to check both lines.

## New guards (each made to fail on purpose first)

- **Guard 26, card truth.** For every sample and fixture, each card's status and X equal a ladder run with that card
  chosen. Sabotage: compute the status from the card premium alone; the guard must fail.
- **Guard 27, slider range.** A cap below the floor, above the ceiling, or not finite throws `ClosingInputError`.
  Sabotage: clamp instead of throwing; the guard must fail.

## Expected results (record what the engine gives; explain any difference)

1. Family, Essential, $533.13: term $238.83, critical illness $294.30 (unchanged).
2. Family, Recommended, $533.13: life gets the $144.30 left after the minimums → about $383; critical illness
   $150; Recommended card shows "Needs $X more a month".
3. Family, Recommended, $710.84: report life, critical illness and the funerals, and the Child B line in the death
   story.
4. Young single: no life item, so the cards show no life plan. Record what the cards show. Do not invent a life
   item for him.

## Scope fence

1. F-13 to F-17 stay open.
2. **F-19 (new):** two NIS pension-age rows disagree. `fact-finder-2026-10.ts` has a flat 65
   (`nisPensionAge`); `retirement-2026-10.ts` has the 2028–2036 rise. Record only.
3. **F-20 (new):** parameter refresh before **4 Jan 2027**: the NIS class table (rate up about 3 points) and the SCP
   income bands for the $3,750 rate. Both are unpublished today. Record only.
4. No change to the care graph. Care graph §3 goldens must not move. If one moves, that is a hard stop.

## Re-baseline

1. Record all goldens and the full dump before the change.
2. With the default card, only card and band lines move (Change 1, item 4). If anything else moves, stop and report it.
3. Add goldens for the four expected results.
4. New assumption set id: `ff-2026-10-28-cards1`. Record the old id beside it.
5. Rebuild the single ES-module file. Re-vendor in GRP, write the new hash to `PINNED.txt`, run guards 13 and 15.

## Hard stops

Stop and write why in the progress file when:
1. A care graph §3 golden moves.
2. With the default card, a golden moves, or a dump line moves outside the cards and bands.
3. A test can pass only by being deleted or skipped.
4. A privacy guard (7, 8, 11) fails.
5. A step needs a merge into `master` or `main`, a deploy, or any live database access.

## Deliverables

1. **Evidence paste-back:** FPA `docs/audit/RUN-2026-10-28-f18-package-cards.md`, with the before/after table, the
   four expected results as engine output, and the new hashes.
2. **Sabotage log:** guards 26 and 27, each with the deliberate break and the failure message. Guards 13, 15 and
   21 to 25 re-run, with their output.
3. **Smoke walk, short:** at 390 only, Supabase stubbed, ZZ clients.
   1. Family: the three cards show three different covers, each with covers / does not cover lines and a status.
   2. Family: choose Recommended; move the slider from $533 to $711. Every screen follows, and the death story
      changes.
   3. Family: the slider cannot go below $355 or above $711.
   Evidence goes in `GRP/docs/audit/evidence-2026-10-27-fact-finder/fix4/`.
4. **PRs:** push to FPA #5 and GRP #160. One comment on each saying what changed.
5. **Progress file:** update `FPA/docs/audit/ONE-SHOT-PROGRESS.md` with the new hashes, the new goldens, F-19 and
   F-20. The merge and deploy order from fix run 1 stands. Commit this brief with it.
