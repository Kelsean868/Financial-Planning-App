# RUN 2026-10-27 — review of `feat/domain-core` (Phase 0a)

Brief: `docs/briefs/2026-10-27-phase0-domain-core-review.md` (on `docs/fact-finder-specs`). Model: Opus 5.5, high.
Branch reviewed: `feat/domain-core`, head before review `e79a7af` (local and `origin` matched), 21 commits on merge
base `7cc4029`. `master` is at `7949d9d`, 30 commits past that merge base.
Read, in order: `docs/superpowers/specs/2026-07-15-insurance-planning-mvp-design.md`,
`docs/superpowers/plans/2026-07-16-domain-core.md`,
`docs/superpowers/specs/2026-07-17-provenance-by-construction-design.md`, then every file in `core/src` and `core/test`.

**Verdict: ready to merge.**

## Decisions made during the run (owner away)

1. **`parameters/` was not edited, even for sabotage.** Section 2 guard 14 says to sabotage the goldens by changing a
   rate in the parameter table. The run rule forbids touching `parameters/`, so that sabotage ran on a scratch copy of
   `core/` and `parameters/` outside the repo. A second golden sabotage was done in engine code inside the worktree.
2. **Merge readiness against today's `master` was tested without merging.** `git merge-tree` gave a clean tree
   (`c19df38`); a throwaway commit of that tree (`05a10d1`, on no branch) was checked out in a scratch worktree and
   tested. No branch was merged.
3. **Guard-coverage gaps were recorded, not fixed.** Extending the purity guard to Section 1 guard 6 is new guard work
   for Phase 1, not a fix to code that contradicts its own spec (the plan specifies the guard's patterns exactly).
4. **Provenance by construction was not built.** Its spec is approved but targets a later branch and has no plan;
   building it is far beyond the fix rule. It is finding F1.
5. **`docs/audit/RUN-...` is the only file added by the review besides the two fixes.**

## 1. Test and typecheck output (evidence paste-back)

`npm ci` in `core/`: `added 3 packages, and audited 4 packages in 3s`, `found 0 vulnerabilities`. Node v24.15.0,
TypeScript 5.9.3.

Before the fixes (head `e79a7af`), `npm test`:

```
ℹ tests 70
ℹ suites 0
ℹ pass 70
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 503.5057
```

After the fixes (head `d6d20fa`), `npm test`:

```
ℹ tests 71
ℹ suites 0
ℹ pass 71
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 523.182
```

`npm run typecheck` (`tsc --noEmit`): no output, exit 0, before and after.
`node parameters/verify.mjs`: `ALL CHECKS PASSED` (25 `ok` lines) before and after.

Trial merge with `master` (decision 2), before the fixes: `ℹ tests 70`, `ℹ pass 70`, `ℹ fail 0`; typecheck exit 0;
`verify.mjs` `ALL CHECKS PASSED`. The goldens did not move.

## 2. Plan tasks

| Task | Status | Shown by |
|---|---|---|
| 1 Scaffold, types, parameters boundary | Done | `core/package.json`, `core/tsconfig.json`, `parameters/tt-parameters.d.ts`, `core/src/types.ts`, `core/test/parameters-boundary.test.ts` (3 tests). `package.json` adds dev-only `typescript` and `@types/node`; no runtime dependency. |
| 2 Household aggregate | Done (fixed in this run, see §5) | `core/src/household.ts` (all 9 functions), `core/test/household.test.ts` |
| 3 PolicyLedger | Done | `core/src/policy-ledger.ts` reads the three group-life values from `P.group_life` (pre-flight resolution followed); `core/test/policy-ledger.test.ts` |
| 4 ProvenanceBuilder | Done, extended | `core/src/provenance.ts`: `use`, `useNode`, `caveat`, `rule`, `merge`, `build` (deep-frozen); `core/test/provenance.test.ts` |
| 5 Death needs | Done, changed by founder decisions | `core/src/needs/death.ts`: housing is a stated `housingStrategy` (open question 1 resolved 2026-07-17), funeral default and medical floor (open question 2 resolved), survivors' benefit caveated (open question 3 still open); `core/test/needs-death.test.ts` |
| 6 Retirement needs | Done | `core/src/needs/retirement.ts`, `core/test/needs-retirement.test.ts`. Provenance is hand-mirrored (F1). |
| 7 GapCalculator and public API | Done (fixed in this run, see §5) | `core/src/gap.ts`, `core/src/index.ts`, `core/test/gap.test.ts` |
| 8 Goldens and purity guard | Done | `core/test/golden/kyron-household.json` (re-baselined 2026-07-17, +90,000, reason recorded in the file), `core/test/golden.test.ts`, `core/test/purity.test.ts` |
| Done-when list | Met, with one overstatement | Tests, `verify.mjs`, typecheck, provenance on every result, increments caveat: all met. "The purity guard proves no I/O" is too strong (F2). |
| Provenance-by-construction spec (2026-07-17) | Not done, by design | Spec status "approved, ready for planning", target "a new branch off `feat/domain-core`". No plan exists. `retirement.ts` still carries the `TODO(provenance)` block. |

## 3. Sabotage log

Each break was applied, the named test file run, the message copied, and the file restored with `git checkout`;
`git status` was clean after each.

| Guard | Break | Failure message seen |
|---|---|---|
| Purity: clock | `export const _sabotageNow = Date.now();` appended to `src/household.ts` | `...core\src\household.ts must not call Date.now() — pass dates in` |
| Purity: randomness | `Math.random()` appended to `src/gap.ts` | `...core\src\gap.ts must not call Math.random()` |
| Purity: I/O (fs) | `import { readFileSync } from "node:fs";` added to `src/gap.ts` | `...core\src\gap.ts must not import node:fs` |
| Purity: I/O (fetch) | `fetch("https://example.com")` added to `src/gap.ts` | `...core\src\gap.ts must not call fetch()` |
| Purity: forbidden import | `import { g } from "../../graphify-out/graph.js";` added to `src/policy-ledger.ts` | `...core\src\policy-ledger.ts imports from graphify-out/ — the core may only depend on parameters/` |
| No hard-coded parameter | `const rentalMonths = 120;` in place of the `b.use(...)` read in `src/needs/death.ts` | `...core\src\needs\death.ts hardcodes 120 (the rental-income replacement months) in executable code — import it from parameters/tt-parameters.js instead` |
| Goldens: parameter table (scratch copy, decision 1) | `nis.minimum_pension.value` 3000 → 3100 in a copy of `tt-parameters.json` | `Expected values to be strictly equal: 3100 !== 3000` (retirement golden; 1 of 4 golden tests failed) |
| Goldens: engine code | `netMonthlyNeed * 12 * years` → `* 11` in `src/needs/death.ts` | `incomeContinuation 1304848.1488326252 !== 1423470.7078174092` and `gap at 40: 1471348.1488326252 !== 1589970.7078174092` |
| Goldens: frozen fixture | `"nisMonthly": 3000` → `3001` in `test/golden/kyron-household.json` | `Expected values to be strictly equal:` (1 of 4 failed) |

Every guard failed when broken. Probes that the guards did **not** catch (each appended to `src/gap.ts`, purity test
run, `ℹ fail 0` every time, file restored):

| Probe | Caught? |
|---|---|
| `import fs from "fs";` | no |
| `import { readFile } from "node:fs/promises";` | no |
| `localStorage.getItem("x")` | no |
| `indexedDB.open("x")` | no |
| `import { createClient } from "@supabase/supabase-js";` | no |
| `import { x } from "../../../General-Rater-Portal/life-shapes.js";` | no |
| `import "../../research/x.js";` (side-effect import) | no |
| `import("../../tools/ocr.js")` (dynamic import) | no |
| `process.env.HOME` | no |
| `export const _p9 = 3500;` (SCP maximum) | no |
| `export const _p10 = 21;` (continuation age) | no |

A grep of `core/src` for all of these patterns finds none in the real code.

## 4. Seam check (what Section 1 and Section 2 Phase 1 need)

| Seam | Exists | Missing |
|---|---|---|
| Exported result type per module | `DeathNeedsProfile`, `RetirementNeedsProfile`, `Gap`, `Provenance`, `ProvenanceParameter`, `HousingStrategy` (the last two after fix 2), all via `core/src/index.ts` | `inForceCoverAt` and `obligationDeclineSchedule` return inline object types, not named ones. `LifeCaseFacts`, `LifeCaseStoreError`, `CareGraphResult`, `ClosingComparison` do not exist yet (Phase 1 builds them). |
| `ProvenanceBuilder` | Yes, exported: `use`, `useNode`, `caveat`, `rule`, `merge`, `build`; refuses unsafe statuses through `assertSafe` | `resolveParameter` resolves dotted paths against the single `P` from `parameters/tt-parameters.js` only. It cannot record a row from a second table such as `core/src/parameters/tatil-products-2026-10.ts`. |
| Parameter-table layer | `parameters/tt-parameters.json` + `.js` (loader, helpers, `assertSafe`, deep freeze) + `.d.ts`, at repo root; every node has `source`/`effective`/`status` | No `core/src/parameters/` directory. `P` is typed `any`. Rows use `effective`, while Section 2 §2.4 asks for `asOf`. |
| Build script producing one ES-module file (e.g. `core/dist/fpa-core.js`) | **None.** `package.json` has only `test` and `typecheck`; `tsconfig.json` has `noEmit: true`; the plan says "no build step, no transpiler, no bundler". | A build step. It has to inline `tt-parameters.json` (loaded with `import ... with { type: "json" }`) and rewrite the `.ts` import extensions. Not built (out of scope). |
| Parent shape for Section 1 §1.5(d) | `Person` with `relationship: "parent"` | `Person` requires `name` and a full `dateOfBirth`. Section 1 allows parents only birth year, optional first name and `careTier`. Phase 1 needs a separate parent shape (F6). |
| No health data | No `health*` field or key anywhere in `core/src` or `core/test` | Nothing missing. |

## 5. Fixes made on the branch

| Commit | Plan task | What |
|---|---|---|
| `0103171` | Task 2 | `youngestDependentChild` compared whole-year ages. Two children with the same age tied, and list order picked the older one. Income continuation then ran to the older child's 21st. Example: children born 2018-09-20 and 2019-07-01 on 2026-07-16 gave 1,423,471 instead of 1,507,743 (about 84,272 short). It now compares dates of birth. A regression test covers both list orders and failed before the fix. Goldens did not move. |
| `d6d20fa` | Task 7 | `index.ts` did not export `HousingStrategy` (a required `Household` field) or `ProvenanceParameter`, against Task 7's "re-exporting the full public API". A scratch type-only import failed with TS2305 before the fix and passed after it. No runtime change. |

## 6. Findings for Kyron

| # | Severity | Finding |
|---|---|---|
| F1 | Medium | Provenance is still recorded by discipline, not by construction. `retirement.ts` hand-declares the parameters `retirementFloor` reads (including the `NIS_CONTRIBUTION_TABLE = "2016-09-05"` mirror), `gap.ts` hand-declares the group-life paths, and `policy-ledger.ts` reads `P` at import outside `ProvenanceBuilder`. The approved 2026-07-17 spec fixes this and calls it "the last moment the fix is cheap" before more engines land. Phase 1 adds ten modules on top. Decide whether it runs before Phase 1. |
| F2 | Medium | The purity guard does not meet Section 1 guard 6. It misses `localStorage`, `indexedDB`, Supabase imports, portal-file imports, bare `fs` and `node:fs/promises`, side-effect and dynamic imports, and `process.env` (§3 probes). The code is clean today. Phase 1 must extend the guard and sabotage-test each new pattern before guard 6 is trusted. |
| F3 | Medium | No parameter-table layer inside `core`, and `ProvenanceBuilder` is bound to `P` (§4). Phase 1's `tatil-products-2026-10.ts` cannot be recorded through the existing builder without a change to `resolveParameter` or a second source. The Phase 1 spec should say which. |
| F4 | Medium | No build script to one ES-module file (§4), which Section 1 §1.10 requires for vendoring. Recorded per the orchestrator's instruction; not built. |
| F5 | Low | The hard-coded-parameter list covers nine numbers only. It misses the SCP bands (3500, 2500, 1500, 500, 5500), ages 21 and 65, 750 contributions, the 100,000 medical floor and the 50,000 funeral default (probes P9 and P10 passed). |
| F6 | Low | `Person` requires a full date of birth and a name for every dependent. Section 1 §1.5(d) limits parents to birth year, optional first name and `careTier`. Phase 1 must model parents without forcing a full DOB into a case. |
| F7 | Low | Narration strings repeat parameter values: `gap.ts` "halves at 66 and ends at 70"; `retirement.ts` "the 3,000/month minimum pension binds" and "fewer than 750 contributions". The guard exempts strings by design, so these drift silently if a parameter changes. |
| F8 | Low | After merge, `master` adds `CURRENT_NIS_TABLE` (`2026-01-05`) for contributions, while `nisClassForMonthly` still defaults to `2016-09-05`. `retirement.ts` declares `2016-09-05` by hand. They agree today; if the default moves, the declared provenance is wrong without any test failing. Covered by F1. |
| F9 | Low | `resolveParameter` throws a bare `Error`, not `ParameterError` (provenance spec §8). `ProvenanceBuilder` drops a node's statutory `basis`, so `scp.eligibility` shows `source: null` (allowlisted in `golden.test.ts`, follow-up #2). |
| F10 | Low | `"test": "node --test test/**/*.test.ts"` is unquoted. On a POSIX shell without globstar, `**` acts as `*`; it works today only because no subfolder holds a `.test.ts`. Quote the glob when a subfolder gets tests. |
| F11 | Info | Spec vs plan: the MVP spec says `NeedsEngine` takes `ParameterTables` "injected, never imported" (`computeNeeds(household, params)`) and `PolicyLedger` has `.add()`/`.byInsurer()`. The plan imports `P` and uses free functions; there is no `byInsurer`. The plan's choice stands; recorded so a later spec does not assume injection. |
| F12 | Info | Merge state: the branch sits on `7cc4029`; `master` is 30 commits ahead and also changed `parameters/`. `git merge-tree` is clean, and the trial merge passes 70/70, typecheck and `verify.mjs` (§1). |
| F13 | Info | By design, worth knowing for Phase 1: income continuation uses household `monthlyExpenses` (not the deceased's income, no own-consumption deduction); with `housingStrategy` `replace-rent` or `none` a recorded mortgage enters no line of the need; `obligationDeclineSchedule` drops each debt's full balance in its payoff year rather than amortising. |

None of F1 to F13 makes a test or typecheck fail or contradicts the branch's own spec, so none blocks this merge.
F1 to F4 and F6 are inputs to Phase 1.

## 7. Verdict

**Ready to merge.**
