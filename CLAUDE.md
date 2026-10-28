# Financial-Planning-App — workflow contract

This repo holds the planning engine (`core/`, pure TypeScript), the calculators (`calculators/`), the parameter
tables (`parameters/`) and the research notes (`research/`). The General-Rater-Portal vendors one built file from
`core/`; no engine code is written there (Section 1 §1.10).

These rules hold for every run. They come from Section 1 and Section 2 (27 Oct 2026); a later signed spec may
amend them.

1. **Specs.** Specs live in `docs/superpowers/specs/YYYY-MM-DD-<name>-design.md`. A spec picks one answer; it never
   leaves a decision to the planner. Each section is signed off by Kyron before work on it starts.
2. **Scope fences.** Fences are explicit and numbered, and each one is recorded as a follow-up.
3. **Guards over discipline.** Rules are enforced by tests: forbidden-import greps, golden-number tests. Every
   guard is sabotage-tested (made to fail on purpose, the failure message recorded) before it is trusted.
4. **Inverted gates for refactors.** A refactor succeeds when the goldens did not move.
5. **Flag first.** Risks and conflicts are written in the run record before the change, not after it.
6. **Seams in the spec.** Merge and dedupe semantics, error types and the JS/TS seams (exported types, built
   files) are stated in the spec, not left to the code.
7. **`core/` is pure.** No I/O, no UI, no runtime dependencies. `core/test/purity.test.ts` enforces it.
8. **No client health answers in this repo's data, ever** (Section 1 §1.3). Health answers live only in the
   portal's `intakes` row.
9. **Runs end with a record and a PR.** Each run writes `docs/audit/RUN-YYYY-MM-DD-<name>.md` and opens a PR. CC
   never merges and never deploys; Kyron merges.

Working notes:
- Run `npm` only inside `core/` (`npm ci`, `npm test`, `npm run typecheck`). Never `npm install` elsewhere.
- `calculators/`, `parameters/` and `research/` change only when a signed spec says so.
- Commits end with the `Co-Authored-By` line the session gives; PR bodies end with the Claude Code line.
