# One-shot run, Phases 0 to 3 — progress

Brief: `docs/briefs/2026-10-27-fact-finder-one-shot.md`. Rules: Section 2 §2.13.
Orchestrator: Claude Opus 5.5 (effort high), one Claude Code session, started 27 Oct 2026.

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
- O-1 NIS deductible 100% vs 70% (decision O9): Kyron to rule; a change is a recorded re-baseline of the two ceilings.
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
- F-12 (security, medium): `life_cases.lead_id` is a foreign key, and a foreign-key check ignores row security, so the
  database alone does not stop a case linking another owner's `pipeline_cards` id. The page offers only the owner's
  own cards. A trigger that checks the card's owner would close it.
- F-13: the money health score and the live "next steps" are no longer on the printed plan (it prints only what the
  snapshot holds). Putting them in the engine's snapshot would bring them back.
- Guard 12's first assertion message was not captured in the sabotage log (the failure was seen; the text is inferred).
- Untracked, git-ignored build outputs `life-proposal-links.json` / `.txt` remain in `C:\Projects\GRP-wt-fact-finder`.
- Worktrees left in place for review: `C:\Projects\FPA-wt-domain-core`, `C:\Projects\FPA-wt-engine`,
  `C:\Projects\GRP-wt-phase0`, `C:\Projects\GRP-wt-fact-finder`.
