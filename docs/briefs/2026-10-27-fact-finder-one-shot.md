# BRIEF 27 Oct 2026 — Fact-finder, Phases 0 to 3 in one run (orchestrator)

Model: **Claude Opus 5.5, effort high** for this session (the orchestrator). Each phase runs in a subagent with the
model and effort in the table below. Do not use `/model` mid-session.

Start the session in `C:\Projects`. Two repos:
- `C:\Projects\Financial-Planning-App` (FPA) — engine. Read its `CLAUDE.md` once Phase 0 Part A adds it.
- `C:\Projects\General-Rater-Portal` (GRP) — page. Read its `CLAUDE.md` before any GRP step; its guardrails hold
  (never read `.env.local` for SQL, ZZ test names, worktrees with the node_modules junction, never `npm install` in
  a worktree, no deploys, no merge).
`C:\Projects\tatil_automation` is READ ONLY. The owner is away: decide, and record each decision in the run record
of the phase it belongs to.

## Read first (all in FPA `docs/superpowers/specs/`)

1. `2026-10-27-section-1-data-storage-design.md` — signed. Tables, privacy, guards 6–13.
2. `2026-10-27-section-2-build-design.md` — signed. Phases, modules, product table, guards 14–18, **§2.13 one-shot
   rules (stacked branches, no merges, no deploys, no live DB change, hard stops, progress file).**
3. `2026-10-27-care-graph-brief.md` and `2026-10-27-closing-engine-brief.md` (with addendum §11–15). Their
   override header comes first.
4. `2026-10-27-pension-calculators-audit.md` — retirement parameters.
5. The design: `FPA/docs/prototype/fact-finder-prototype-v17.html` (read as text; model is in `data-dc-script`).

## The chain

| Phase | Brief | Repo / branch | Subagent model, effort |
|---|---|---|---|
| 0a | `FPA/docs/briefs/2026-10-27-phase0-domain-core-review.md` | FPA: `docs/fact-finder-specs`, `feat/domain-core` | Opus 5.5, high |
| 0b | `GRP/docs/briefs/2026-10-27-life-phase0-fixes.md` | GRP: `fix/life-phase0` | Opus 5.5, medium |
| 1 | Section 2 §2.3–2.5, §2.8; care graph brief; closing brief + addendum (engine parts) | FPA: `feat/fact-finder-engine` from `feat/domain-core` | Opus 5.5, high |
| 2 | Section 2 §2.6–2.7; Section 1 §1.1–1.4, §1.9; closing brief reveal UI | GRP: `feat/fact-finder` from `fix/life-phase0` | Opus 5.5, medium |
| 3 | Section 2 §2.12; Section 1 snapshots and scope; closing brief §6 | GRP: same branch, new commits | Sonnet 5.5, medium |

0a and 0b are independent: run them in parallel. Phase 1 waits for 0a. Phase 2 waits for 0b and Phase 1.
Phase 3 waits for Phase 2. Phase 4 (self-serve) is fenced: do not start it.

**Verdict rule for 0a.** If the review verdict is "not ready" because of a finding the review could not fix,
that is a hard stop (§2.13.5). Otherwise continue.

## Phase 1 — what "done" means

1. The ten modules in Section 2 §2.3, with the care graph and closing comparison as their briefs specify.
2. `core/src/parameters/tatil-products-2026-10.ts` as Section 2 §2.4, every row with `source` and `asOf`.
   Assumed figures (car loan 7.5%, 8–10 years) are marked `assumed`. Unverified figures from the audit are
   marked `unverified`, never guessed.
3. Goldens: Section 2 §2.8 (sample family and young single, from the prototype) and the care graph §3 fixtures.
   The prototype's sample inputs are in its `samples` object. If the closing addendum §13 re-baselines a golden,
   record old and new values, the assumption set and the reason, then re-pin.
4. Guards: care graph 1–5, closing 1–12, Section 1 guard 6–8 (engine side), Section 2 guards 14, 16, 17.
   Each sabotage-tested.
5. One built ES-module file (`core/dist/fpa-core.js` or as the build already names it).

## Phase 2 — what "done" means

1. Vendor the Phase 1 build into GRP `vendor/fpa-core/` with `PINNED.txt` (the `feat/fact-finder-engine` head hash).
2. `fact-finder.html` + `fact-finder.js` in advisor mode, built from the prototype's screens, wording, smart path,
   motion and 390 layout. Section 2 §2.6 lists what is kept and what is left out.
3. `life-case-store.js` (the one adapter), the three migrations with rollback files (not applied), `LifeCaseFacts`
   validation, `LifeCaseStoreError`.
4. Guards: Section 1 guards 7, 8, 9, 10 (§2.13.4 rule), 12, 13; Section 2 guards 15 and 18. Each sabotage-tested.
5. A wording table of every quiz question and answer, for Kyron to approve.

## Phase 3 — what "done" means

1. "Start the application" writes one `life_case_snapshots` row; the one-page plan prints from the snapshot.
2. Scope outcomes write to `life_case_scope`; a cross-tier reorder writes a declined row.
3. A case links to an existing Pipeline lead by id. No lead creation.
4. Closing guards 5 and 12 checked end-to-end through the store (stubbed per §2.13.4).

## Deliverables (named rituals)

1. **Per phase:** the deliverables in its brief, or for Phases 1–3: a run record
   `docs/audit/RUN-2026-10-27-<phase-name>.md` in the phase's repo, with decisions, the sabotage log, the full
   test output in one run, and a PR (not merged).
2. **Evidence paste-back:** the Section 2 §2.8 goldens and the care graph §3 goldens as produced by Phase 1, beside
   the expected values, in the Phase 1 run record and again after Phase 3 (proving they did not move).
3. **Smoke walk** after Phase 3, at 390 and 1280, ZZ clients only, Supabase stubbed:
   - the sample family through every screen to the close: all five reveal layers, all four scenarios in both
     states, the scope statement, the printed plan;
   - the young single through budget, protection and the insurance budget: no funded plan below its minimum;
     Cashbuilder II with the Disability Income Rider shows Medical;
   - one loved-one case (a grandchild, Goldspoon) and one business case.
   Evidence in `GRP/docs/audit/evidence-2026-10-27-fact-finder/`, no tokens in the repo.
4. **Progress file** `FPA/docs/audit/ONE-SHOT-PROGRESS.md`, updated at the end of every phase (§2.13.6).
5. **Final summary** at the top of the progress file: the PR list in merge order, the commands Kyron runs to apply
   the migrations and run guards 9 and 10 (if not run locally), the quiz wording table location, and every open
   item.
