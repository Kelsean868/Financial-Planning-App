# Section 3 build — progress

Brief: `docs/briefs/2026-10-28-section-3-build-brief.md`. Spec: `docs/superpowers/specs/2026-10-28-section-3-budget-ux-design.md`
(signed by Kyron, 28 Oct 2026, 08:41). Orchestrator: Claude Opus 5.5, effort high, one Claude Code session, started 28 Oct 2026.
Nothing merged, deployed or applied; no live database access.

## Orchestrator decisions

1. **Bases.** Local `master` (FPA) and local `main` (GRP) were behind their remotes. Build A branches from
   `origin/master` (2ec9aa4, includes PR #5 at 86c48a4); Build B branches from `origin/main` (db74f97, the fact-finder
   page with fix run 4).
2. **Worktrees.** FPA: `C:\Projects\FPA-wt-section3` (`feat/section3-engine`). GRP: `C:\Projects\GRP-wt-section3`
   (`feat/section3-page`), with the `node_modules` junction to the main checkout.
3. **First FPA commit** `2d7fd58`: the spec, prototype v6 and the build brief, copied from `docs/briefs/`.
4. **This file** lives on `docs/fact-finder-specs`, like `ONE-SHOT-PROGRESS.md`, so the build PRs carry only their own run records.
5. **Subagents** as the brief's table: A Opus 5.5 high, B Opus 5.5 medium, C Sonnet 5.5 medium.

## Builds

### Build A — engine (done, 28 Oct 2026)

PR https://github.com/Kelsean868/Financial-Planning-App/pull/6 (`feat/section3-engine` → `master`, not merged). Engine
commit `59224e270879324a7821b2cadfda1b254e1cd4e9`; run record `b84f727`, then `ed38ae8` (orchestrator: fixed mis-encoded
"§" signs in its golden table). `core/dist/fpa-core.js` SHA-256
`b6976268419c0b2141fcf0f7759d321647c3a682d31039c811c0586c8e1c308e`. Assumption set `ff-2026-10-28-s3`. Tests 178/178
(was 161), typecheck clean; the orchestrator re-ran `npm test` and the hash. No hard stop hit. Guards 28–33 sabotage-tested;
guards 27 and 3 re-sabotaged (new meaning). Run record: `docs/audit/RUN-2026-10-28-section3-a.md` (23 decisions).

**Only non-golden line that moved:** the young single's Floor band, $187.07 → $200 (the floor; decision D4).

**Evidence paste-back, before and after Build A** (before: `2d7fd58`, dist `0c052d55…`; after: `59224e2`). Rows 23–37 are
the care graph §3 goldens. Full values to 4 decimals in the run record §4.

| # | Golden | Old | New | Moved |
|---|---|---|---|---|
| 1 | §2.8 family: stage | 2 | 2 | no |
| 2 | §2.8 family: ceiling | 711 | 711 | no |
| 3 | §2.8 family: care save a month | 3837 | 3837 | no |
| 4 | §2.8 family: already paying | 4000 | 4000 | no |
| 5 | §2.8 family: care present value | 1263107 | 1263107 | no |
| 6 | §2.8 family: peak a month | 17391 | 17391 | no |
| 7 | §2.8 family: peak at age | 54 | 54 | no |
| 8 | §2.8 family: sandwich years | 8 | 8 | no |
| 9 | §2.8 family: finish age | 55 | 55 | no |
| 10 | §2.8 family: cover essential | 823567 | 823567 | no |
| 11 | §2.8 family: cover recommended | 1994846 | 1994846 | no |
| 12 | §2.8 family: cover full | 2236674 | 2236674 | no |
| 13 | §2.8 family: needs | 15140 | 15140 | no |
| 14 | §2.8 family: living | 6700 | 6700 | no |
| 15 | §2.8 young single: stage | 1 | 1 | no |
| 16 | §2.8 young single: ceiling | 374 | 374 | no |
| 17 | §2.8 young single: care goals | 0 | 0 | no |
| 18 | §2.8 young single: cover essential | 149000 | 149000 | no |
| 19 | §2.8 young single: cover recommended | 149000 | 149000 | no |
| 20 | §2.8 young single: cover full | 149000 | 149000 | no |
| 21 | §2.8 young single: needs | 5450 | 5450 | no |
| 22 | §2.8 young single: living | 5300 | 5300 | no |
| 23 | care graph §3: peak a month | 17391 | 17391 | no |
| 24 | care graph §3: peak at age | 54 | 54 | no |
| 25 | care graph §3: sandwich years | 8 | 8 | no |
| 26 | care graph §3: finish age | 55 | 55 | no |
| 27 | care graph §3: nominal total | 2078000 | 2078000 | no |
| 28 | care graph §3: save from today | 3837 | 3837 | no |
| 29 | care graph §3: already paying | 4000 | 4000 | no |
| 30 | care graph §3: present value | 1263000 | 1263000 | no |
| 31 | care graph §3 UK: peak a month | 50753 | 50753 | no |
| 32 | care graph §3 UK: sandwich years | 8 | 8 | no |
| 33 | care graph §3 UK: nominal total | 3406000 | 3406000 | no |
| 34 | care graph §3 UK: save from today | 16487 | 16487 | no |
| 35 | care graph §3 UK: present value | 2161000 | 2161000 | no |
| 36 | care graph §3 UK: top lever | Send Child B locally | Send Child B locally | no |
| 37 | care graph §3 UK: top lever worth a month | 12650 | 12650 | no |

**New goldens.** Retirement (family): A $12,588.36, B $5,900, plan for $27,962 a month in 2053 (the spec's $28,048 was
illustrative). Weekly-paid renter (new sample `SAMPLE_WEEKLY_RENTER`): "Save $187.52 every payday"; floor lifts its $152 cap
to $200. Rent (young single): Home $255.14 above guide; retirement figure $17,807. Payoff mismatch: 2029-08 against the
given 2028-06. Make room default split (family, $500 freed from Food): protection $93.75, debt $204.18, retirement $202.07.

**Calls for Kyron (taken for him, reversible).**
1. NIS: spec §2.2 says the engine uses the class table; it uses a flat 5.4%. Kept flat, because the class table moves
   goldens 2 and 16. Weekly NIS is worked per week.
2. Saving the client already does is left out of needs, so it counts as money left.
3. Make room's debt step is sized to clear expensive debt within 3 years.

**F-16: closed** (a co-signed debt becomes a Tier 2 loan cover item).

**Dist hash note.** `origin/master`'s dist (`0c052d55…`) differs from the GRP pin (`e3e38f7d…`) because merge `9903799`
rebuilt it after master's parameter file gained rows (for example `corporation_tax`). Not line endings.

### Build B — page (done, 28 Oct 2026)

PR https://github.com/Kelsean868/General_Raters_Portal/pull/161 (`feat/section3-page` → `main`, not merged; merge after
FPA #6). Code `0b23253`, run record `75aeaaa`. Vendored engine `59224e2`, SHA-256 `b6976268…308e`, assumption set
`ff-2026-10-28-s3`; pins updated in `PINNED.txt`, `fact-finder.js`, `life-case-store.js` and the guard 9/10 SQL file.
Full portal suite: 3,108 tests, 3,078 pass, 0 fail, 30 skipped (the existing live-database tests; none new). The
orchestrator re-ran the fact-finder tests (50/50) and the vendored hash. No hard stop hit.

Guard 34 (live inputs, real headless Chrome), sabotage "listen to `change` only": both tests failed ("the engine re-ran
while typing"; the label showed $2,000 while the slider read 1950). Guard 35, sabotage "ladder controls in Client
view": failed with "full/choose: Client view shows the ladder controls (Up / Down)". It also caught a real "Stage 02"
leak, now fixed. Guards 7, 8, 9–13, 15 and 18 pass.

Run record `docs/audit/RUN-2026-10-28-section3-b.md` (GRP): 24 decisions (B1–B24), five spec/prototype rule clashes
(spec followed each time: event tabs, step list, where the scope record lives, 7 report blocks not 8, work pension under
retirement), and the **wording table for Kyron** (§8).

Main decisions: Full check-up runs the §0 3.5a order to the final report; Make a budget runs Your money and ends at next
steps; other doors keep the quick form. Starting the application and the scope record live on the final report only.
Client view does not render advisor-only content at all. Money fields are text fields with a decimal keypad (number
fields have no caret position). After "Use this plan", later screens show the Make room figures; pay, loans and budget
keep the real numbers.

Open items from Build B:
1. Kyron approves the wording table.
2. "Income if you cannot work" cover is recorded but not counted by the engine.
3. The snapshot has no field for the Make room plan; the "both versions" line on the one-page plan is page-held.
4. The one-page plan's tile still says "Stage".
5. A typed value followed by an instant click can rarely lose the click (the old page had the same exposure).
6. Checked by the orchestrator, not a defect: the engine note "Your safe range is $355 to $711" names the safe range;
   the Choose slider runs $200 to $711 (§5.2). Both are true.
7. Sent to Build C: the furniture line label (65 characters) fails the 60-character label check; savings typed twice.

### Build C — net worth

Running.
