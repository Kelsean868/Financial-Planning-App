# One-shot run, Phases 0 to 3 — progress

Brief: `docs/briefs/2026-10-27-fact-finder-one-shot.md`. Rules: Section 2 §2.13.
Orchestrator: Claude Opus 5.5 (effort high), one Claude Code session, started 27 Oct 2026.

## Final summary

(Written when the chain ends.)

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
| 1 | FPA `feat/fact-finder-engine` | | | | not started |
| 2 | GRP `feat/fact-finder` | | | | not started |
| 3 | GRP `feat/fact-finder` | | | | not started |

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
