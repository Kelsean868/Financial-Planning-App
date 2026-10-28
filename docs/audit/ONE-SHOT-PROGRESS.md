# One-shot run, Phases 0 to 3 — progress

Brief: `docs/briefs/2026-10-27-fact-finder-one-shot.md`. Rules: Section 2 §2.13.
Orchestrator: Claude Opus 5.5 (effort high), one Claude Code session, started 27 Oct 2026.

## Fix run 4, 28 Oct 2026 (F-18: the package cards become a real choice)

Brief: `docs/briefs/2026-10-28-f18-package-cards.md` (committed with this file). Kyron, 27 Oct 2026 23:49:
Decision 8 = B (the package cards are a choice inside Tier 1; the slider sets the insurance budget). One session, Claude
Opus 5.5, effort high. Nothing merged, deployed or applied; no live database access. No care graph golden moved; no
privacy guard failed.

**Kyron's decisions, 28 Oct 2026.**
- **Decision 1: accept.** With the default card, three dump lines outside the cards and bands moved, each forced by
  the brief's own changes: `chosen.package` (recommended → essential), `chosen.basket.partial` (true → false), and
  life-beyond-ruin's `full` (262.10 → 339.67; still $0 allocated). They are card lines. Hard stop 2 not hit.
- **Decision 9: keep the rule** (raising the budget can lower life cover). A card that "Needs $X more a month", with
  other Tier 1 plans funded at this budget, now says under the status: "Your budget also pays for: {plans}. To keep
  the {card} life cover as well, you need $X more a month." (Kyron's wording, 28 Oct 2026; it replaced "Other plans
  get their minimum first: …".) GRP only, engine figures only (`cardNeedsLine`). Family, Recommended at $711: "Your
  budget also pays for: critical illness cover, your father's funeral cover. … you need $281 more a month." One test (`fact-finder-close.test.mjs`), sabotage-tested; fact-finder tests 55/55; smoke walk
  re-run at 390: 13/13. Full portal suite on the final code: 3,091 tests, 0 fail, 30 skipped. GRP commits `7dbe512` and `db74f97c925b148029f27b9b8f3caf4729c528c1` (wording); FPA run record §10 at `86c48a4`.

**New hashes.**

| What | Old | New |
|---|---|---|
| FPA `feat/fact-finder-engine` head (PR #5) | `3b0e7f4` | `86c48a4348014acb95a64b02d96466f0daf7ac40` (engine `0a332cf7d7e526981ad1643da4f50005fbbf82d7`, then the run record `13fc2fe` and its §10) |
| `core/dist/fpa-core.js` SHA-256 (= GRP `vendor/fpa-core/fpa-core.js`) | `14b9c994…72e2a` | `e3e38f7ddc4d97ddf4a8e0731053ba728f907c5e4476d2198e2f55fc8146b100` |
| Assumption set id | `ff-2026-10-27-ladder2` | `ff-2026-10-28-cards1` |
| GRP `feat/fact-finder` head (PR #160) | `2bfb622` | `db74f97c925b148029f27b9b8f3caf4729c528c1` (`87b0c81`: re-vendor pinned to FPA `0a332cf`, cards and slider, migration grants; then the Decision 9 card line and its wording) |

**What changed.** The cards are the death-need tiers (floored, capped by the underwriting limit); the budget no longer
caps the Recommended card. The chosen card is the Tier 1 life target (life-ruin's full); the default is Essential, the
ruin level. `budgetMonthly` (the slider) is the insurance cap, floor to ceiling; outside that, or not finite, it throws.
Each card shows its cover, premium, covers / does not cover, and "In your plan" or "Needs $X more a month" from a ladder
run with that card chosen. The bands report the life cover funded. The addendum's §11.2 has its dated changes block.
Migration `20261027130000` also revokes EXECUTE on the two earlier trigger functions.

**New goldens (the four expected results).** Family, Essential, $533.13: term $238.83, CI $294.30. Family,
Recommended, $533.13: term $383.13, CI $150; the card "Needs $195 more a month". Family, Recommended, $710.84: term
$297.96, CI $150, father's funeral $262.88; life cover $1,027,453 (less than at $533: run record §1 item 2); "Child B's
degree stops in month 1." Young single: no life item; every card "No life plan: no one depends on you, so no life cover
is planned."

**Goldens.** 0 of 37 moved. New guards 26 (card truth) and 27 (slider range), sabotage-tested; guard 23 is now "≤ the
cap in use"; 13, 15 and 21 to 25 re-run and pass. FPA 161/161; GRP 3,090 tests, 0 fail, 30 skipped; smoke walk 12/12 at 390. Full
record: FPA `docs/audit/RUN-2026-10-28-f18-package-cards.md` (on `feat/fact-finder-engine`).

**Follow-ups.**
- F-13 to F-17 stay open (see fix run 3 below).
- **F-18: closed** by this run; Kyron's two calls are decided (Decisions 1 and 9, above).
- **F-19 (new, record only):** two NIS pension-age rows disagree. `fact-finder-2026-10.ts` has a flat 65
  (`nisPensionAge`); `retirement-2026-10.ts` has the 2028–2036 rise.
- **F-20 (new, record only):** parameter refresh before **4 Jan 2027**: the NIS class table (rate up about 3 points)
  and the SCP income bands for the $3,750 rate. Both unpublished today.
  **Added 28 Oct 2026 (Section 3 fix run, Kyron's call 2):** switch PAYE NIS to the NIBTT class table when the 2027
  table is published; this moves goldens 2 and 16, so re-baseline then.

The merge and deploy order from fix run 1 (below) stands. In step 4, guard SQL now expects `ff-2026-10-28-cards1` and
engine commit `0a332cf`; migration `20261027130000` gained the two revoke lines (still not applied).

## Fix run 3, 27 Oct 2026 (cap, Tier 1 order, cover that follows the loan)

Brief: `docs/briefs/2026-10-27-fix-ladder-advice.md`. Kyron, 27 Oct 2026 21:39: Decision 1 (ruin-level life all term),
Decision 5 = A (cap = recommended), Decision 6 = A (Tier 1: life, CI, parent funerals), Decision 7 = A (no ruin-level
life without dependants; life cover follows each loan goal). One session, Claude Opus 5.5, effort high. Nothing merged,
deployed or applied; no live database access. No hard stop.

**New hashes.**

| What | Old | New |
|---|---|---|
| FPA `feat/fact-finder-engine` head (PR #5) | `76b121d` | `3b0e7f49d164161c84f5c91f038b7dbe67e92876` (engine `0f71c4a33fb38b3edca2a02a8f5904a871440ae0`, then the run record) |
| `core/dist/fpa-core.js` SHA-256 (= GRP `vendor/fpa-core/fpa-core.js`) | `2c15c5f8…dae55f` | `14b9c994b6b7b2150b7249d7549649a962166e5ce0e7b6f933b2d3b32fb72e2a` |
| Assumption set id | `ff-2026-10-27-ladder1` | `ff-2026-10-27-ladder2` |
| GRP `feat/fact-finder` head (PR #160) | `d710a7e` | `2bfb6228bdce09bffc92cc2ec4cee76b2a394e04` (re-vendor pinned to FPA `0f71c4a`, page text, smoke walk evidence) |

**What changed.** Insurance is capped at the recommended figure; the ceiling stays a guard. Tier 1 is life, CI, parent
funerals, disability income, own final expense. No ruin-level life cover without a partner, children or parent care
paid. One loan cover item per home or car loan goal (Tier 2 inside 3 years, else Tier 3). Every item is issued on rated
age; past term's 65 the ruin-level plan is whole life. The close screen's life package is the ladder's life allocation.
Family at $533.13: term $238.83, CI $294.30; both funerals and disability income wait. Young single at $280.61: CI
$280.61; disability income, car loan cover and home loan cover wait. Both match the brief to the cent.

**Goldens.** 0 of 37 moved; no care graph §3 golden moved. Re-baselined with the chain: the family's Tier 1, the Tier 1
reorder (now the father above CI), both insurance budgets, and the "with the plan" death lines (family receives
$843,567, was $1,747,351; the father's care now stops in month 1; the young single's plan holds no life cover). New
goldens: both expected-result rows. New guards 23 (insurance ≤ recommended), 24 (issue ages on rated age) and 25 (the
basket is the ladder), sabotage-tested; 21 and 22 re-run. FPA 152/152; GRP 3,090 tests, 0 fail, 30 skipped; guards 13
and 15 pass; smoke walk 13/13 at 390. Full record: FPA `docs/audit/RUN-2026-10-27-fix-ladder-advice.md` (on
`feat/fact-finder-engine`).

**Follow-ups.**
- **F-13** (open): the Savings group and the ladder's Tier 1.5 and Tier 3 savings items must be checked for the same
  kind of fork. Part closed: the budget card's Protection bucket and the insurance budget's Protection total now agree
  ($533 / $281).
- **F-14** (open): Rest Assured II age growth is not re-fitted.
- **F-15 (new):** plans for loved ones carry no sex in their facts, so they are priced on the male rate.
- **F-16 (new):** a loan someone else co-signed leaves that person exposed; the fact-finder does not ask about
  co-signers. Needs a new question.
- **F-17 (new):** disability income has no need figure; it is funded at its $300 minimum only.
- **Proposed F-18 (Kyron's call):** the choose screen's package cards and budget slider all show the ladder's basket
  now, and its "Partial cover" text still names the safe ceiling (run record §1 items 2 and 9).

The merge and deploy order from fix run 1 (below) stands. In step 4, guard SQL now expects `ff-2026-10-27-ladder2` and
engine commit `0f71c4a`; the migrations themselves did not change.

## Fix run 2, 27 Oct 2026 (one allocator, real Rest Assured II rates)

Brief: `docs/briefs/2026-10-27-fix-one-allocator.md`. Kyron, 27 Oct 2026 20:10: Decision 3 = A (one allocator),
Decision 4 = A (funeral minimum = smallest Rest Assured II plan). One session, Claude Opus 5.5, effort high. Nothing
merged, deployed or applied; no live database access. No hard stop.

**New hashes.**

| What | Old | New |
|---|---|---|
| FPA `feat/fact-finder-engine` head (PR #5) | `8bd31a13a9caef9e58a28a296867a1817595aa72` | `76b121d` (engine `c1537aa` and `fd5fc30553477e178ecef1a72944e15d0ffd227f`, then the run record) |
| `core/dist/fpa-core.js` SHA-256 (= GRP `vendor/fpa-core/fpa-core.js`) | `7633c014…6f2d18` | `2c15c5f873398b3c912c108c263bf873e08f2fb060c58744c959675b85dae55f` |
| Assumption set id | `ff-2026-10-27-nis70` | `ff-2026-10-27-ladder1` |
| GRP `feat/fact-finder` head (PR #160) | `c24dd0f2f38bcf17cd44232503e3cc80d2a1e7c5` | `d710a7ef83de55a9630ea7455aa49e4bec7a4668` (re-vendor pinned to FPA `fd5fc30`, smoke walk evidence) |

**What changed.** The closing ladder is the only allocator for protection: an insurance item gets its minimum or waits
as "not yet". The insurance budget's Protection group is built from it, capped at the stage ceiling. Rest Assured II
uses the two ApplyOn quotes, priced on age next birthday, through one function. Sample family at $711: term $238.83,
father's funeral $293.45, mother's funeral $178.56; CI and Cashbuilder II with the rider wait. The ruin-level premium
is $238.83 (all term, per the brief's mapping), not the brief's $370: Kyron's call (run record §1).

**Goldens.** 0 of 37 moved; no care graph §3 golden moved. New goldens: the four Rest Assured II quotes ($262.88 /
$438.14 male rated 72; $178.56 / $297.60 female rated 67), the death scenario lines for both samples (family: Child B's
degree stops in month 2 with the plan), the family's Tier 1 allocation and the Tier 1 reorder. New guards 21 (parity)
and 22 (no unbuyable plan), sabotage-tested. FPA 144/144; GRP 3,090 tests, 0 fail, 30 skipped; guards 13 and 15 pass;
smoke walk 13/13 at 390. Full record: FPA `docs/audit/RUN-2026-10-27-fix-one-allocator.md` (on `feat/fact-finder-engine`).

**New follow-ups.**
- **F-13:** the Savings group (pay-yourself-first buckets) and the ladder's Tier 1.5 and Tier 3 savings items must be
  checked for the same kind of fork. Seen now: the budget screen's "Protection (insurance)" bucket shows the
  recommended figure ($533 / $281) while the insurance budget below funds up to the ceiling ($711 / $374).
- **F-14:** Rest Assured II age growth (1.05, estimate) is not re-fitted: quote two more ages per sex and fit it.

The merge and deploy order from fix run 1 (below) stands. In step 4, guard SQL now expects
`ff-2026-10-27-ladder1` and the new engine commit; the migrations themselves did not change.

## Fix run, 27 Oct 2026 (NIS 70% and F-12)

Brief: `docs/briefs/2026-10-27-fix-nis70-f12.md`. Kyron, 27 Oct 2026 19:30: Decision 1 = A, Decision 2 = A. One
session, Claude Opus 5.5, effort medium. Nothing merged, deployed or applied; no live database access. No hard stop.

**New hashes.**

| What | Old | New |
|---|---|---|
| FPA `feat/fact-finder-engine` head (PR #5) | `3b8e7d69320f9264777fb39ca73c0b1565beab84` | `8bd31a13a9caef9e58a28a296867a1817595aa72` (engine change `3f6bd49`, then the run record) |
| `core/dist/fpa-core.js` SHA-256 (= GRP `vendor/fpa-core/fpa-core.js`) | `0fcef96c…cddd97` | `7633c01460422f599014554407e0627243728972c36eeefd72e36e64946f2d18` |
| Assumption set id | `ff-2026-10-27` | `ff-2026-10-27-nis70` |
| GRP `feat/fact-finder` head (PR #160) | `7e5500e` | `c24dd0f2f38bcf17cd44232503e3cc80d2a1e7c5` (F-12 `a23ddec`, then the re-vendor and run record) |

**New goldens.** PAYE now deducts 70% of employee NIS (IRD TD1 2023 line 4(b)). 2 of 37 goldens moved: family ceiling
$725 → **$711** (724.61 → 710.84), young single $376 → **$374** (375.76 → 374.14). No care graph §3 golden moved.
Also moved (not goldens): the family's protection budget $543 → $533 no longer fits Rest Assured II's $240 minimum
beside term and CI, so it shows as "Not yet"; the family's death scenario says Child B's degree stops in month 2, not 11.
Full table and chain: FPA `docs/audit/RUN-2026-10-27-fix-nis70.md` (on `feat/fact-finder-engine`). O9 is closed.

**F-12 closed in the database.** New migration `20261027130000_life_case_link_owner.sql` (owner triggers on the three
fact-finder tables) and guard 20 in the guard 9/10 script. GRP `docs/audit/RUN-2026-10-27-fix-f12.md` (on
`feat/fact-finder`).

**Merge and deploy order (replaces the old one):**
1. Merge FPA #4, then #1, then #5.
2. Merge GRP #159. Deploy it (the health-on-phone fix; static file list under "Open items", Phase 0b).
3. Merge GRP #160. Do not deploy the portal yet. (Merging into `main` does not deploy: GRP deploys are manual
   direct uploads, GRP `CLAUDE.md` Phase 5.)
4. Apply the migrations in this order in the Supabase SQL editor (paths in the GRP repo, `supabase/migrations/`):
   `20261027120000_life_cases.sql`, `20261027120100_life_case_scope.sql`, `20261027120200_life_case_snapshots.sql`,
   `20261027130000_life_case_link_owner.sql`. Then run `supabase/tests/20261027120200_fact_finder.guards-9-10.sql`
   (guards 9, 10 and 20). **Every value must be `true`.** Read-only check: 4 ledger rows `like '20261027%'`.
5. Deploy the portal.

This order replaces "PRs, in merge order" and "Commands Kyron runs" below.

## Final summary

**The chain ran to the end. Phases 0a, 0b, 1, 2 and 3 are done. No hard stop was hit.** Nothing was merged or
deployed, no migration was applied and no live row was written. Phase 4 (self-serve) was not started.

### PRs, in merge order

1. FPA https://github.com/Kelsean868/Financial-Planning-App/pull/4 — `docs/fact-finder-specs` (specs, prototype,
   briefs, `CLAUDE.md`, this file).
2. FPA https://github.com/Kelsean868/Financial-Planning-App/pull/1 — `feat/domain-core` (review fixes + review record).
3. FPA https://github.com/Kelsean868/Financial-Planning-App/pull/5 — `feat/fact-finder-engine` (head `3b8e7d6`; the
   vendored engine is pinned to this commit).
4. GRP https://github.com/Kelsean868/General_Raters_Portal/pull/159 — `fix/life-phase0`.
5. GRP https://github.com/Kelsean868/General_Raters_Portal/pull/160 — `feat/fact-finder` (Phases 2 and 3, head `7e5500e`).

After 4: deploy the Phase 0b static files (list under "Open items", Phase 0b). The health-on-device fix reaches
clients' phones only after that deploy.

### Commands Kyron runs: migrations and guards 9 and 10

Not run here (no Docker, no Supabase CLI). Full text: GRP `docs/audit/RUN-2026-10-27-fact-finder-page.md` §7.
Do these after PR 5 is reviewed.

1. Live project `oujnscwyxwuzmgyszkxd`, Supabase SQL editor. Paste and run, in this order:
   `supabase/migrations/20261027120000_life_cases.sql`, then `20261027120100_life_case_scope.sql`, then
   `20261027120200_life_case_snapshots.sql`. **Do not use `supabase db push`** (the files write their own ledger
   row, as the life migrations do).
2. Guards 9 and 10: paste and run `supabase/tests/20261027120200_fact_finder.guards-9-10.sql`. It ends in an error on
   purpose, which rolls back its ZZ rows. The error text starts `GUARDS 9-10 RESULT`. **Every value in the JSON must be
   `true`.**
3. Check, read-only:
   `select version, name from supabase_migrations.schema_migrations where version like '20261027%' order by 1;`
   (3 rows) and `select count(*) from public.life_cases;` (0).
4. Rollback, only if needed: the three files in `supabase/rollback/`, newest first.

Until step 1 is done, the page's save, scope and snapshot writes fail against the live project.

### Quiz wording table

GRP `docs/audit/RUN-2026-10-27-fact-finder-page.md` §5 (on `feat/fact-finder`). Four items were reworded (nis, wl,
unreg, juv); D18 in the same record lists product claims replaced (e.g. LifeSPAN → Life Span Gold). Kyron approves.
This is a wording review, not a legal or Tatil compliance sign-off (fence 6).

### Kyron's calls (decisions taken for him, reversible)

- O9: the signed goldens deduct 100% of NIS; the table says 70%. Kept as signed. At 70% the family ceiling is
  $710.84 (not $725) and the young single's $374.14 (not $376). Changing it is a recorded re-baseline.
- O10: parents' Rest Assured II is priced at the parent's age (the prototype used the client's age).
- O11: the three migrations write their own ledger row (repo precedent).

### Every open item

Listed per phase under "Open items" below.

## Orchestrator decisions

| # | Decision | Why |
|---|---|---|
| O1 | The FPA main checkout (`C:\Projects\Financial-Planning-App`) stays on `docs/fact-finder-specs` for the whole run. `feat/domain-core` is reviewed in worktree `C:\Projects\FPA-wt-domain-core`; Phase 1 runs in worktree `C:\Projects\FPA-wt-engine`. | The specs and the prototype are committed only on `docs/fact-finder-specs`. Keeping the main checkout there keeps them readable at their usual paths for every phase. Separate worktrees stop two phases switching one checkout. |
| O2 | GRP Phase 0 runs in worktree `C:\Projects\GRP-wt-phase0`; Phases 2 and 3 in `C:\Projects\GRP-wt-fact-finder`. Both use the `node_modules` junction to `C:\Projects\General-Rater-Portal\node_modules` (as `GRP-wt-wl-endow`). No `npm install` in a worktree. FPA worktrees run `npm ci` inside `core/` only. | GRP `CLAUDE.md` and the Phase 0 brief. |
| O3 | Docker is not installed on this PC (`docker: command not found`), and the Supabase CLI is not on PATH. Guards 9 and 10 are written but not run. The Phase 2 run record gives Kyron the commands. | §2.13.4. |
| O4 | The `supabase-kqm` MCP server failed to connect at session start. The Phase 0b saved-case count uses another read-only Supabase tool only if it reaches project `oujnscwyxwuzmgyszkxd`; otherwise the count is an open item with the exact `SELECT`. `.env.local` is never read. | GRP `CLAUDE.md` guardrail (never go around a blocked tool). |
| O5 | This progress file lives on `docs/fact-finder-specs` and is committed and pushed at the end of each phase. | One place that a new session can resume from. |
| O6 | Part A commits every untracked spec and brief in FPA `docs/` (Section 1, Section 2, care graph brief, closing brief, pension audit, prototype v17, both briefs), not only the four the Phase 0 brief names. | All of them are inputs to Phases 1–3 and are not yet in git. |
| O7 | Each phase runs in one subagent with the model and effort in the one-shot brief's table. The orchestrator reviews each phase's output (diff, test run, goldens) before the next phase starts. | One-shot brief; `~/.claude/CLAUDE.md` delegation rules. |

## Phases

| Phase | Repo / branch | Head | PR | Guards passed | State |
|---|---|---|---|---|---|
| 0a specs | FPA `docs/fact-finder-specs` | `ab2e777` | https://github.com/Kelsean868/Financial-Planning-App/pull/4 | — | done, PR open |
| 0a review | FPA `feat/domain-core` | `596cfea` | https://github.com/Kelsean868/Financial-Planning-App/pull/1 (existing PR from July; review comment added) | purity (5 probes), no hard-coded parameter, goldens (table, code, fixture): all sabotage-tested. 71/71 tests, typecheck clean. Orchestrator re-ran: 71/71. | done, verdict "ready to merge" |
| 0b | GRP `fix/life-phase0` | `e789623` | https://github.com/Kelsean868/General_Raters_Portal/pull/159 | Phase 0 guards 1–5 (rider list, no DI field on Part 1, Medical follows the rider, queue strip = Section 1 guard 11, grading text), each sabotage-tested. Full `npm test`: 3036 tests, 3006 pass, 0 fail, 30 skipped (existing live-DB partner-invite tests). Orchestrator re-ran the three changed test files: 60/60; no test deleted or skipped. | done, PR open |
| 1 | FPA `feat/fact-finder-engine` | `3b8e7d6` (`3b8e7d69320f9264777fb39ca73c0b1565beab84`) | https://github.com/Kelsean868/Financial-Planning-App/pull/5 (stacked on #1) | Care graph 1–5, closing 1–12, Section 1 guards 6 (11 probes), 7, 8, Section 2 guards 14, 16, 17, dist freshness: 36 breaks, all failed, all restored. 130/130 tests, typecheck exit 0. All 34 goldens match from the built file; no re-baseline. `core/dist/fpa-core.js` SHA-256 `0fcef96c4b17b45a2179a68e526a430afa7781fd0860f90b7a199ddb38cddd97`. Orchestrator re-ran: 130/130, typecheck 0, hash matches. | done, PR open |
| 2 | GRP `feat/fact-finder` | `f2fffe0` | https://github.com/Kelsean868/General_Raters_Portal/pull/160 (stacked on GRP #159 and FPA #5) | Section 1 guards 7, 8, 9 (SQL text only), 10 (SQL text only), 12, 13; Section 2 guards 15, 18: each sabotage-tested. Full `npm test`: 3,076 tests, 3,046 pass, 0 fail, 30 skipped (none new). Short smoke walk passed at 390 and 1280 (`p2-*`). Orchestrator re-ran the 5 new test files: 40/40; vendored hash = `PINNED.txt`; `node build-deploy.js` exit 0; no fact-finder file in `dist/public`. | done, PR open |
| 3 | GRP `feat/fact-finder` | `7e5500e` | https://github.com/Kelsean868/General_Raters_Portal/pull/160 (new commits, body updated) | Closing guards 5 and 12 end-to-end through the store (stubbed `restFetch`), one snapshot only, plan prints from the snapshot, no lead created: each sabotage-tested. Full `npm test`: 3,087 tests, 3,057 pass, 0 fail, 30 skipped (existing). `node build-deploy.js` exit 0. Evidence paste-back after Phase 3: 37/37 goldens match from the vendored engine (`p3-golden-paste-back.md`). Smoke walk: 41 checks at each of 390 and 1280 pass, Supabase stubbed by `page.route`, ZZ names (`p3-*`). Orchestrator re-ran the 6 fact-finder test files: 51/51; 684 test lines added, none removed or skipped; build exit 0; no fact-finder file in `dist/public`; no token in the repo. | done |

| O9 | Phase 1 open item O-1 (the prototype, and so the signed §2.8 goldens, deduct 100% of NIS from taxable pay; the table says 70%): **keep the signed goldens.** At 70% the family ceiling would be $710.84 (not $725) and the young single's $374.14 (not $376). Moving a signed golden needs Kyron's recorded reason; §14.1 does not cover it. Open item for Kyron. | §2.8: goldens move only with a recorded reason. The error is about $14 a month on an advisory ceiling. |
| O10 | Phase 1 open item O-2 (parents' Rest Assured II priced at the parent's age, not the client's, as the prototype did): **keep the engine's way.** It moves no §2.8 golden; it changes only the protection split shown on screen ($152 / $151 / $241 instead of $260 / $211 / $72). | Pricing a parent's plan at the client's age is a prototype error. |
| O11 | Phase 2's three migrations insert their own row into `supabase_migrations.schema_migrations` and are to be applied in the SQL editor, not with `db push`. **Accepted.** | Repo precedent: seven earlier migrations (e.g. `20261026230000_life_pack_all.sql`) do the same, because the ledger is shared with a second app and `db push` / `db pull` are not safe from either repo. |
| O8 | Phase 1 owns review findings F2 (purity guard short of Section 1 guard 6), F3 (no parameter layer in `core/`, `ProvenanceBuilder` tied to one table) and F4 (no single-file build), because Phase 1's own deliverables need them. F1 (provenance by construction for the July modules) and F5–F10 stay follow-ups: Phase 1 does not refactor the July modules. F6: parents get their own birth-year type; `Person` is not changed. | Keeps `feat/domain-core` as reviewed; Phase 1 builds only what its brief needs. |

## Open items

From Phase 0a (`docs/audit/RUN-2026-10-27-domain-core-review.md` on `feat/domain-core`):
- F1 Medium: provenance still hand-listed in `retirement.ts`, `gap.ts`, `policy-ledger.ts`; the 2026-07-17 provenance spec has no plan.
- F5 Low: hard-coded list misses SCP bands, ages 21/65, 750 contributions, medical/funeral defaults.
- F7 Low: explanation strings repeat parameter values.
- F8 Low: `retirement.ts` hard-codes the 2016 NIS table date.
- F9 Low: `resolveParameter` throws a plain `Error`; `basis` dropped from provenance.
- F10 Low: unquoted test glob in `core/package.json`.
- F11–F13 Info: see the review record.

From Phase 0b (`docs/audit/RUN-2026-10-27-life-phase0.md` on `fix/life-phase0`):
- Saved-case count: 0 (read-only SELECT through the plugin Supabase tool on `oujnscwyxwuzmgyszkxd`; 4 Whole Life / Endowment rows, all ZZ, none with the rider).
- Deploy for Kyron after merge (static files only). Portal `tatil-portal`: `life-shapes.js`, `life-ingenium.js`, `life-ingenium-maps.js`, `life-limits-2026-09.js`, `life-app-panel.js`, `life-products.js`, `life-panel.js`, `sw.js` (v340). Intake `tatil-intake`: `life-guided.js`, `life-guided.html`, `life-guided-desktop.html`, `life-shapes.js`, intake service worker (v115). The health-on-device fix reaches clients' phones only after this deploy.

From Phase 1 (`docs/audit/RUN-2026-10-27-fact-finder-engine.md` on `feat/fact-finder-engine`):
- O-1 NIS deductible 100% vs 70% (decision O9): **closed 27 Oct 2026** (Decision 1 = A; fix run above, re-baselined).
- O-3: all premium rates are rough sample estimates (`estimate`).
- O-4: whether Platinum Edge grades (item 5.3a) is unconfirmed.
- O-6: first-time-buyer stamp duty threshold not checked against the Act.
- O-5 / O-9: follow-ups F-1 to F-3 and review findings F1, F5–F13.
- Build uses esbuild 0.28.2 as an exact-pinned devDependency.

From Phase 2 (`docs/audit/RUN-2026-10-27-fact-finder-page.md` on GRP `feat/fact-finder`):
- Kyron applies the three migrations and runs guards 9 and 10 (commands in that record's §7). Not run here: no Docker, no Supabase CLI.
- Kyron approves the quiz and copy wording (record §5; four items reworded; D18 replaced unverified product claims, e.g. LifeSPAN → Life Span Gold).
- Firm quick-quote price only for motor and HomeSure (existing raters). Every life product shows the rough band.
- Follow-ups: CoverCare in the quick quote; smoker and term length in the engine; annuity controls as engine inputs; a portal nav link to the page; parent care-cost breakdown editor (left out: not storable in case facts).
- `npm test` rewrites `docs/underwriting/rate-verification.html` and the wl-endow `acid-test.json` / `.md`; they were restored, not committed.

From Phase 3 (`docs/audit/RUN-2026-10-27-fact-finder-close.md` on GRP `feat/fact-finder`):
- F-10: no "New case" control; after a saved Start the page offers no second snapshot.
- F-11: no offline queue for case and scope writes; offline, the page says "Not saved" and sends nothing.
- F-12 (security, medium) — **closed 27 Oct 2026** (Decision 2 = A; migration `20261027130000`, guard 20; fix run above): `life_cases.lead_id` is a foreign key, and a foreign-key check ignores row security, so the
  database alone does not stop a case linking another owner's `pipeline_cards` id. The page offers only the owner's
  own cards. A trigger that checks the card's owner would close it.
- F-13: the money health score and the live "next steps" are no longer on the printed plan (it prints only what the
  snapshot holds). Putting them in the engine's snapshot would bring them back.
- Guard 12's first assertion message was not captured in the sabotage log (the failure was seen; the text is inferred).
- Untracked, git-ignored build outputs `life-proposal-links.json` / `.txt` remain in `C:\Projects\GRP-wt-fact-finder`.
- Worktrees left in place for review: `C:\Projects\FPA-wt-domain-core`, `C:\Projects\FPA-wt-engine`,
  `C:\Projects\GRP-wt-phase0`, `C:\Projects\GRP-wt-fact-finder`.
