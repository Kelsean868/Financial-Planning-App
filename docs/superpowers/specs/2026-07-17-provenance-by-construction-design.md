# Provenance by construction

**Date:** 2026-07-17
**Status:** approved, ready for planning
**Branch target:** a new branch off `feat/domain-core` (PR #1 open)
**Predecessor:** `docs/superpowers/specs/2026-07-15-insurance-planning-mvp-design.md`

## 1. The problem

The whole-branch review of the domain core found one Critical and three Important defects
that all eight per-task reviews missed. Its root diagnosis:

> **Provenance was enforced by discipline at the `b.use()` call site, not by construction.**
> Every path reading `P` directly escaped both the audit trail and `assertSafe`.

A read and its record are two separate statements, so they drift. They already have:

- `core/src/needs/retirement.ts` declares `nis.averaging_basis`, which the calculation never
  reads, and omitted `nis.benefit_rates.current` — **the NIBTT table the reported figure
  literally comes from** — until a reviewer noticed. It hand-mirrors nine parameter reads it
  cannot see, because `retirementFloor()` reads `P` internally.
- `core/src/gap.ts` hand-declares the three `group_life.*` parameters that
  `inForceCoverAt` consumed via module-level constants in `core/src/policy-ledger.ts`. If the
  ledger stops reading `reduction_factor`, the client keeps being told it was used.
- The worst instance, already fixed in `7f20878`: a group critical-illness rider created a
  phantom reduction, wrote a false rule into the audit trail, and *suppressed* the
  "halves at 66, ends at 70" mis-selling warning.

**Why now.** The recommendation engine multiplies parameter reads several-fold, and every one
is a chance to bypass the gate silently. This is the last moment the fix is cheap.

### 1.1 The constraint that deferred this was checked, and is weaker than assumed

The ledger deferred this because it "touches `parameters/tt-parameters.js`, which is shared
with the browser calculators". Verified 2026-07-17 against the primary source
(`github.com/Kelsean868/T-T-Financial-Insurance-Hub`, public, last pushed 2025-06-15):

- **`tt-parameters.js` is not referenced anywhere in that repo.** No ES module imports at all.
  The only external scripts are Tailwind, Chart.js, jsPDF and GTM, all from CDNs.
- Every calculator is a self-contained HTML file with its parameter values inline. The live
  NIS/SCP calculator hardcodes the SCP bands (`3000`/`2500`/`1500`) — the drift the shared
  table exists to end.

The sharing is therefore **intent, not a live dependency**. Signature changes are free today
and expensive the moment the calculators are wired up. Wiring them up is a separate job,
downstream of this one, and out of scope here.

## 2. Principle

**Reading a parameter and recording it must be the same act.** Not a convention, not a review
checklist — a thing the type system and the test suite make it hard to get wrong.

## 3. Architecture

### 3.1 The recorder lives in `parameters/`, not `core/`

`parameters/` is the lower layer; `core/` imports it and never the reverse. If the shared
helpers are to read through a recorder, the recorder must exist below them. A second recorder
built inside `parameters/` would be a fork of exactly the kind this change prevents.

- **`parameters/tt-parameters.js` gains `createRecorder()`** — ~30 lines, zero runtime
  dependencies, browser-safe. Returns `{ use, useNode, caveat, rule, merge, build }` and
  produces a plain `{ parameters, caveats, rulesFired }` object. Plain data crosses the
  layer boundary; no classes.
- **`resolveParameter` moves down** from `core/src/provenance.ts` into `tt-parameters.js`. It
  resolves dotted paths against the table's shape, so it belongs with the table. That it
  currently lives in `core` is the layering seam the bug crawled through.
- **`core`'s `ProvenanceBuilder` keeps its identity** — TypeScript types, deep-freezing,
  `merge()` — but **delegates recording to `createRecorder()`**. One implementation, wrapped,
  not duplicated. Its public API (`use`, `useNode`, `caveat`, `rule`, `merge`, `build`) is
  unchanged, so `death.ts`, which already reads through `b.use()` correctly, does not change.

### 3.2 Helpers return their receipt with the value

The chosen shape. The value and its provenance arrive in the same object, so the record
cannot be forgotten — the failure mode of threading a recorder as an optional argument is
that a caller omits it and provenance goes silently empty.

```js
export function nisPension(avgEarnings, contributions, opts = {}) {
  const rec = createRecorder();
  const min = rec.use("nis.minimum_pension");        // read AND record: one act
  ...
  return { type: "PENSION", monthly, ..., provenance: rec.build() };
}
```

`retirementFloor` composes by merging `nisPension`'s and `scpBenefit`'s receipts into its own.
Provenance composes all the way down, exactly as the engines do — reusing the
`ProvenanceBuilder.merge()` built for this in Task 7.

Helpers in scope (all currently read `P` internally): `nisClassForMonthly`, `nisPension`,
`scpBenefit`, `retirementFloor`, `healthSurcharge`, `incomeTax`, `checkAnnuityMaturity`.

Browser cost: one extra field on a returned object, ignorable. For Meeting Zero it is an
asset — the self-serve calculator can show a client where its number came from.

### 3.3 Division of labour: helpers own parameters and caveats; engines own rules

- **Caveats belong to the helper.** *"Increments unconfirmed for 2016+"* is a fact about the
  table, and only `nisPension` knows it fired. Today `retirement.ts` forwards
  `floor.nis.caveat` and `floor.scp.cliffWarning` by hand; those lines are deleted.
- **`rulesFired` stays in the engine.** *"The 3,000/month minimum pension binds"* is
  client-facing narration in the engine's voice. It does not drift, because it is authored
  where it is used.

Consequence: `nisPension`'s `caveat` field and `scpBenefit`'s `cliffWarning` field move into
their `provenance.caveats`. Nothing outside `core` consumes them (verified §1.1).

## 4. Call sites

### 4.1 `core/src/needs/retirement.ts`

Nine hand-declared `b.use()` calls and two hand-forwarded caveats collapse to:

```ts
const floor = retirementFloor(avg, contributions, age, other);
b.merge(floor.provenance);   // parameters + caveats, by construction
```

`rulesFired` narration stays. The `TODO(provenance)` block and the
`NIS_CONTRIBUTION_TABLE` mirror constant are deleted — the table's identity now arrives in the
receipt instead of being restated by a caller who hopes it still matches.

### 4.2 `core/src/policy-ledger.ts` and `core/src/gap.ts`

`inForceCoverAt` reads `group_life.*` through a recorder and returns `provenance` alongside the
cover. `gap.ts` merges it instead of restating three parameter paths and fishing the carrier
warning out with `if (typeof termination.node.warning === "string")`.

The module-level constants `GROUP_LIFE_REDUCTION_AGE` / `_TERMINATION_AGE` / `_REDUCTION_FACTOR`
read `P` at import — that import **is** the bypass, and it is removed.

But `gap.ts` needs the termination age as a *value*, not just a citation: it branches on
`atAge >= GROUP_LIFE_TERMINATION_AGE` to choose its narration. Deleting the constants without
replacing that value would push `gap.ts` into reading `P` directly — trading one bypass for
another. So `inForceCoverAt` returns the values it read, next to their receipt:

```ts
{ individual, group, groupFaceTotal, total,
  terms: { reductionAge, terminationAge, reductionFactor },
  provenance }
```

`gap.ts` narrates from `cover.terms.terminationAge`. The value and its provenance arrive
together, which is §3.2's principle applied one layer up.

`core/test/gap.test.ts` currently imports `GROUP_LIFE_REDUCTION_AGE` to derive test ages
(`GROUP_LIFE_REDUCTION_AGE - 16`). Tests are not the engine and may read the table directly, so
the test imports `P` from `parameters/tt-parameters.js`. The structural guard (§5.2) therefore
scopes to `core/src`, not `core/test` — deliberately: forbidding it in tests would push them
back to hardcoded ages, which is the failure the no-hardcoded-parameters guard already forbids.

**Conditional recording is preserved and becomes honest.** A client with no group cover still
gets no `group_life.*` in their trail — but because `inForceCoverAt` only *reads* those
parameters when there is group cover to decay, not because `gap.ts` guards
`if (groupFaceTotal > 0)` around reads that already happened at module load. The guard and the
read become the same thing.

## 5. Testing

Three guards, in increasing strength.

### 5.1 The drift test (the proxy, confined to tests)

For each shared helper, run it with `P` wrapped in a recording `Proxy`, collect every parameter
node actually touched, and assert it equals the helper's declared `provenance.parameters` —
**in both directions**:

- **Under-declaring** hides a source from the client.
- **Over-declaring** cites a parameter that never moved the number — the `nis.averaging_basis`
  bug.

A touched node counts as a parameter if it has a `status` field. This rule is the proxy's known
ambiguity (`P.nis.benefit_rates.current.basic_monthly[cls]` touches four nodes); if it is ever
wrong, this test is what says so. The proxy is **test-only** — a `Proxy` in the runtime of a
regulated calculation is not where the complexity budget goes.

### 5.2 The structural guard (the highest-value test here)

**Only `core/src/provenance.ts` may import `P`.** One grep over `core/src`, in the same shape
as the existing forbidden-import guard. This converts "provenance by discipline" into a build
failure, which is the entire point of the change.

### 5.3 Sabotage-test both

Add an unrecorded read, confirm the guard fires and names the file, revert. A gate nobody has
watched fail is a gate nobody should trust — that is exactly how the golden test passed a build
in which the group-life parameters, the rule that most moves the gap, entered no provenance at
all.

## 6. Acceptance gate

- **70/70 tests green with the golden numbers UNCHANGED.** This is a pure refactor of *how*
  provenance is recorded. If any client-facing number moves, the refactor is wrong, and
  `core/test/golden/kyron-household.json` is the thing that says so.
- `npx tsc --noEmit` clean.
- `node parameters/verify.mjs` → ALL CHECKS PASSED (`tt-parameters.js` changes underneath it).
- The purity guard still fires when sabotaged.
- `core/src` contains exactly one import of `P`.

## 7. Out of scope

- **The `basis`-vs-`source` citation gap** (follow-up #2). 19 parameter nodes cite statute via
  `basis`, which `ProvenanceBuilder` drops, so the table cites the Act and the client's
  provenance shows `null`. Changing that changes the `Provenance` shape and every consumer.
  The `CITED_ELSEWHERE` allowlist guards it meanwhile.
- **The float epsilon** (follow-up #3). Belongs with the first threshold comparison — the
  recommendation engine's premium-vs-budget check.
- **Wiring the browser calculators to the shared table.** Separate job, downstream (§1.1).
- **Extracting the NIBTT survivors' rate table.** Research, not refactor.

## 8. Error handling

`resolveParameter` currently throws a bare `Error` on an unknown path while the rest of the
parameters layer signals via `ParameterError`; a caller catching by type misses it. Since the
function moves into `tt-parameters.js` regardless, it throws `ParameterError` there — closing
part of follow-up #4 at zero marginal cost.

`assertSafe` is unchanged: `BLOCKING_UNRESOLVED` and `PROVISIONAL` still throw rather than
compute silently.

## 9. Risks

- **A recorder in the parameters layer could tempt domain logic downward.** It must stay a
  recording primitive; the T&T domain rules stay in `core`. The reviewer should push back on
  any engine logic that migrates into `tt-parameters.js` on the back of this change.
- **The proxy's "has a `status` field" rule may misclassify a node.** Mitigated by asserting in
  both directions and by sabotage-testing.
- **`build()` returning `rulesFired: []` from helpers is dead weight** if helpers never emit
  rules (§3.3). Acceptable: `merge()` handles it uniformly, and the alternative is two shapes.
