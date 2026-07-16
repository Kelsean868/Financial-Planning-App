# Domain Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure, tested domain core — `Household`, `PolicyLedger`, `NeedsEngine` (death + retirement), `GapCalculator` — on top of the existing `/parameters` module, with no UI and no I/O.

**Architecture:** A zero-dependency TypeScript ESM package at `core/`. Every function is pure: same inputs → byte-identical outputs. All Trinidad & Tobago constants come from the spec's **`ParameterTables`** component — already implemented at `parameters/tt-parameters.js` — and **nothing is hardcoded**. Every computed result carries a `provenance` block (parameter effective dates, sources, and any caveats) so a regulator or an agent can see exactly why a number is what it is.

**Spec traceability** — this plan implements these spec components, and only these:

| Spec component (§3.2) | This plan |
|---|---|
| `ParameterTables` | ✅ already built (`/parameters`) — Task 1 types the boundary and Task 8 guards against hardcoding |
| `Household` | Task 2 |
| `PolicyLedger` | Task 3 |
| `NeedsEngine` (death, Need #2) | Task 5 |
| `NeedsEngine` (retirement, Need #1) | Task 6 |
| `GapCalculator` | Task 7 |
| `ProductCatalog` · `RecommendationEngine` · `SuitabilityRecord` · `CommissionCalculator` · `AIIngestionService` · `AIExplanationService` · `ClientPortal` · `PresentationMode` | ❌ **out of scope** — see "Explicitly NOT in this plan" |

**Tech Stack:**
- **TypeScript, ESM, zero runtime dependencies.**
- **Node 24 runs `.ts` natively** (verified: `node file.ts` works via built-in type stripping) — **no build step, no transpiler, no bundler.**
- **`node:test` + `node:assert/strict`** — built-in test runner, no Jest/Vitest.
- `tsconfig.json` exists for editor/`tsc --noEmit` type-checking only.

**Why this stack:** the spec requires the core to be pure and framework-agnostic because three different consumers need it — the eventual agent UI, the public HTML calculators, and possibly Supabase edge functions in `General_Raters_Portal`. `/parameters` is already plain `.js` so it works everywhere; the core is `.ts` because this is money advice and type errors here are mis-selling. Node's native TS support means we pay no build cost to get that safety. **No UI stack is chosen — that decision is deliberately deferred until there is something to show.**

## Global Constraints

- **Never hardcode a T&T parameter.** Import from `parameters/tt-parameters.js`. This is the project's most-proven rule (three separate government sources publish stale figures).
- **Purity:** no `Date.now()`, no `Math.random()`, no network, no filesystem, no `console.log` in `core/src/`. Any "today" is passed in as a parameter.
- **Determinism:** identical inputs must produce byte-identical `JSON.stringify` output. That property *is* auditability.
- **Never silently use an unsafe parameter.** `assertSafe()` throws on `BLOCKING_UNRESOLVED` / `PROVISIONAL` / `STALE_DO_NOT_USE` / `UNVERIFIED_1995_SOURCE`. Surface a caveat instead of guessing.
- **Money is TTD**, represented as `number`, rounded only at presentation. Never round intermediates.
- **No estate-tax driver in the needs formula.** T&T has no estate, inheritance, or gift tax.
- **`core/` must not import from `graphify-out/`, `research/`, or `tools/`.**
- Node ≥ 24. All files ESM (`"type": "module"`).

---

## File Structure

| File | Responsibility |
|---|---|
| `core/package.json` | ESM package, test script. No dependencies. |
| `core/tsconfig.json` | Type-checking only (`noEmit`). Node runs the `.ts` directly. |
| `parameters/tt-parameters.d.ts` | **NEW.** Type declarations for the existing `.js` parameters module — makes the boundary explicit. |
| `core/src/types.ts` | Shared domain types. No logic. |
| `core/src/household.ts` | `Household` aggregate: people, informal dependents, income, debts, `ageAt()`, `yearsToPayoff()`. |
| `core/src/policy-ledger.ts` | `PolicyLedger`: policies + `inForceCoverAt(age)` with **group cover zeroed from 70**. |
| `core/src/needs/death.ts` | Tatil's death-needs formula. |
| `core/src/needs/retirement.ts` | Retirement need via `retirementFloor()` (NIS⊕SCP jointly). |
| `core/src/gap.ts` | `computeGap()` — need − cover, with provenance. |
| `core/src/provenance.ts` | Builds the `Provenance` block. Shared by every engine. |
| `core/src/index.ts` | Public API surface. |
| `core/test/*.test.ts` | One test file per module. |
| `core/test/golden/*.json` | Hand-computed T&T acceptance cases. |

---

## Task 1: Scaffold, types, and the parameters boundary

**Files:**
- Create: `core/package.json`
- Create: `core/tsconfig.json`
- Create: `parameters/tt-parameters.d.ts`
- Create: `core/src/types.ts`
- Test: `core/test/parameters-boundary.test.ts`

**Interfaces:**
- Consumes: `parameters/tt-parameters.js` (existing — `P`, `nisPension`, `scpBenefit`, `retirementFloor`, `healthSurcharge`, `incomeTax`, `checkAnnuityMaturity`, `auditParameters`, `assertSafe`, `ParameterError`)
- Produces: all domain types used by every later task — `TTD`, `ISODate`, `Sex`, `SmokerStatus`, `RelationshipKind`, `Person`, `Debt`, `Household`, `Policy`, `PolicyType`, `PolicyStatus`, `Provenance`, `DeathNeedsProfile`, `RetirementNeedsProfile`, `Gap`

- [ ] **Step 1: Write the failing test**

Create `core/test/parameters-boundary.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { P, nisPension, retirementFloor } from "../../parameters/tt-parameters.js";

test("parameters module is importable from the core", () => {
  assert.equal(typeof P, "object");
  assert.equal(typeof nisPension, "function");
  assert.equal(typeof retirementFloor, "function");
});

test("the T&T conventions the needs formula depends on are present", () => {
  assert.equal(P.conventions.rental_income_months.value, 120);
  assert.equal(P.conventions.income_continuation_to_age.value, 21);
  assert.equal(P.estate.estate_tax.value, 0);
});

test("the current NIS benefit table is the 2016 schedule, not the stale 2008 one", () => {
  assert.equal(P.nis.benefit_rates.current.effective, "2016-09-05");
  assert.equal(P.nis.benefit_rates.current.basic_monthly.I, 566.72);
  assert.equal(P.nis.benefit_rates.superseded_2008.status, "STALE_DO_NOT_USE");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd core && node --test test/parameters-boundary.test.ts`
Expected: FAIL — `Cannot find package` or a resolution error, because `core/package.json` does not exist yet.

- [ ] **Step 3: Create the scaffold**

Create `core/package.json`:

```json
{
  "name": "@tt-planning/core",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Pure domain core for the T&T insurance planning engine. No I/O, no UI, no dependencies.",
  "engines": { "node": ">=24" },
  "scripts": {
    "test": "node --test test/**/*.test.ts",
    "typecheck": "tsc --noEmit"
  }
}
```

Create `core/tsconfig.json` (type-checking only — Node runs the `.ts` directly, so we never emit):

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts", "test/**/*.ts", "../parameters/**/*.d.ts"]
}
```

Create `parameters/tt-parameters.d.ts` — declares the existing JS module's public surface:

```ts
export interface ParameterNode {
  value?: unknown;
  status?: string;
  effective?: string | null;
  source?: string;
  retrieved?: string;
  warning?: string;
  [key: string]: unknown;
}

export interface NisPensionResult {
  type: "PENSION" | "GRANT";
  class?: string;
  basic?: number;
  increments?: number;
  incrementApplied?: boolean;
  beforeMinimum?: number;
  monthly?: number;
  minimumApplied?: boolean;
  caveat: string | null;
  countsTowardScp: boolean;
  effective?: string;
  source?: string;
  note?: string;
  formula?: string;
  minimum?: number;
}

export interface ScpResult {
  eligible: boolean;
  monthly: number;
  reason?: string;
  residencyRequirement?: string;
  nearCliff?: number | null;
  cliffWarning?: string | null;
  source?: string;
}

export interface RetirementFloorResult {
  nis: NisPensionResult;
  scp: ScpResult;
  assessedIncome: number;
  totalMonthly: number;
  note: string;
}

export interface IncomeTaxResult {
  chargeable: number;
  tax: number;
  allowance: number;
  nisDeductible: number;
  combinedDeductionUsed: number;
  combinedDeductionCap: number;
  headroom: number;
  capReached: boolean;
  note: string;
}

export interface MaturityCheck {
  ok: boolean;
  severity: "OK" | "WARN" | "ILLEGAL";
  message: string | null;
}

export interface AuditEntry {
  path: string;
  status: string;
  warning: string | null;
}

export declare const P: any;
export declare class ParameterError extends Error {}
export declare function assertSafe<T>(node: T, name: string): T;
export declare function nisClassForMonthly(monthly: number, tableDate?: string): string;
export declare function nisPension(
  lifetimeAvgMonthlyEarnings: number,
  totalContributions: number,
  opts?: { allowIncrements?: boolean }
): NisPensionResult;
export declare function scpBenefit(assessedMonthlyIncome: number, age: number): ScpResult;
export declare function retirementFloor(
  lifetimeAvgMonthlyEarnings: number,
  totalContributions: number,
  age: number,
  otherMonthlyIncome?: number
): RetirementFloorResult;
export declare function healthSurcharge(
  monthlyEmoluments: number,
  age: number,
  onlyIncomeIsPension?: boolean
): { weekly: number; exempt: string | null; source?: string };
export declare function incomeTax(input: {
  grossAnnual: number;
  nisContributionsAnnual?: number;
  approvedContributionsAnnual?: number;
  otherDeductions?: number;
}): IncomeTaxResult;
export declare function checkAnnuityMaturity(age: number, opts?: { registered?: boolean }): MaturityCheck;
export declare function auditParameters(node?: unknown, path?: string[]): AuditEntry[];
```

Create `core/src/types.ts`:

```ts
/** Trinidad & Tobago dollars. Never rounded until presentation. */
export type TTD = number;

/** ISO-8601 date, e.g. "1985-03-17". All dates are passed in — the core never reads a clock. */
export type ISODate = string;

export type Sex = "male" | "female";
export type SmokerStatus = "smoker" | "non-smoker";

/**
 * Relationship to the client.
 * "other" exists deliberately: T&T households include supported nephews,
 * outside children and relatives overseas. The fact-find's promise is
 * "it doesn't have to be official" — this type must not force a nuclear family.
 */
export type RelationshipKind = "self" | "spouse" | "child" | "parent" | "sibling" | "other";

export interface Person {
  id: string;
  name: string;
  sex: Sex;
  dateOfBirth: ISODate;
  relationship: RelationshipKind;
  /** false for informally supported dependents — they still count. */
  isFormalDependent: boolean;
  /** What the client provides this person each month, if anything. */
  monthlySupport?: TTD;
}

export type DebtKind =
  | "mortgage"
  | "vehicle"
  | "credit-union"
  | "credit-card"
  | "hire-purchase"
  | "tertiary-education"
  | "first-time-home-owner"
  | "other";

export interface Debt {
  kind: DebtKind;
  balance: TTD;
  monthlyInstallment: TTD;
  /** Final payment date. Drives the obligation decline schedule for the term ladder. */
  endDate: ISODate;
}

export interface Household {
  client: Person;
  dependents: Person[];
  monthlyIncome: TTD;
  monthlyExpenses: TTD;
  debts: Debt[];
  savings: TTD;
  otherInvestments: TTD;
  /** Monthly rent, if the household rents rather than owns. */
  monthlyRent?: TTD;
  /** Total expected education cost across all dependents. */
  educationCost?: TTD;
  /** Expected final medical costs. */
  expectedMedicalCost?: TTD;
  /** Expected funeral cost. */
  expectedFuneralCost?: TTD;
  /** First date of insurable employment — drives NIS contribution weeks. */
  workStartDate?: ISODate;
}

export type PolicyType =
  | "term"
  | "whole-life"
  | "limited-pay"
  | "endowment"
  | "universal-life"
  | "final-expense"
  | "annuity"
  | "group-life"
  | "critical-illness";

export type PolicyStatus = "in-force" | "lapsed" | "paid-up";

export interface Policy {
  id: string;
  insurer: string;
  productName: string;
  type: PolicyType;
  coverAmount: TTD;
  monthlyPremium: TTD;
  cashValue?: TTD;
  status: PolicyStatus;
  /**
   * Group cover reduces 50% at 66 and terminates at 70.
   * Counting it as permanent cover is a real mis-selling risk.
   */
  isGroupCover: boolean;
  beneficiary?: string;
}

/** Why a number is what it is. Attached to every engine result. */
export interface Provenance {
  /** Parameter paths used, with their effective dates and sources. */
  parameters: Array<{ path: string; effective: string | null; source: string | null; status: string }>;
  /** Anything the engine could not compute confidently. */
  caveats: string[];
  /** Rules that fired, in order. */
  rulesFired: string[];
}

export interface DeathNeedsProfile {
  funeral: TTD;
  medical: TTD;
  outstandingLoans: TTD;
  mortgageLiquidation: TTD;
  housingRentReplacement: TTD;
  education: TTD;
  incomeContinuation: TTD;
  totalNeeds: TTD;
  assets: { savings: TTD; lifeInsurance: TTD; otherInvestments: TTD; total: TTD };
  insuranceNeed: TTD;
  provenance: Provenance;
}

export interface RetirementNeedsProfile {
  targetMonthlyIncome: TTD;
  nisMonthly: TTD;
  scpMonthly: TTD;
  otherMonthlyIncome: TTD;
  guaranteedFloorMonthly: TTD;
  monthlyShortfall: TTD;
  provenance: Provenance;
}

export interface Gap {
  need: TTD;
  inForceCover: TTD;
  groupCoverExcluded: TTD;
  gap: TTD;
  provenance: Provenance;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd core && node --test test/parameters-boundary.test.ts`
Expected: PASS — 3 tests passing.

- [ ] **Step 5: Verify types check**

Run: `cd core && npx -y typescript@5 tsc --noEmit`
Expected: no errors. (`npx` is used once here for the type-check; it is *not* a runtime dependency.)

- [ ] **Step 6: Commit**

```bash
git add core/package.json core/tsconfig.json core/src/types.ts core/test/parameters-boundary.test.ts parameters/tt-parameters.d.ts
git commit -m "feat(core): scaffold zero-dependency TS domain core and type the parameters boundary"
```

---

## Task 2: Household aggregate

**Files:**
- Create: `core/src/household.ts`
- Test: `core/test/household.test.ts`

**Interfaces:**
- Consumes: `Person`, `Debt`, `Household`, `ISODate`, `TTD` from `core/src/types.ts`
- Produces:
  - `ageAt(dateOfBirth: ISODate, on: ISODate): number`
  - `yearsToPayoff(debt: Debt, on: ISODate): number`
  - `totalDebtBalance(h: Household): TTD`
  - `mortgageBalance(h: Household): TTD`
  - `nonMortgageDebtBalance(h: Household): TTD`
  - `dependents(h: Household): Person[]`
  - `youngestDependentChild(h: Household, on: ISODate): Person | null`
  - `yearsUntilLastChildReaches(h: Household, targetAge: number, on: ISODate): number`
  - `obligationDeclineSchedule(h: Household, on: ISODate): Array<{ year: number; remainingDebt: TTD }>`

- [ ] **Step 1: Write the failing test**

Create `core/test/household.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ageAt, yearsToPayoff, totalDebtBalance, mortgageBalance, nonMortgageDebtBalance,
  youngestDependentChild, yearsUntilLastChildReaches, obligationDeclineSchedule,
} from "../src/household.ts";
import type { Household, Person, Debt } from "../src/types.ts";

const client: Person = {
  id: "c1", name: "Kyron", sex: "male", dateOfBirth: "1990-06-15",
  relationship: "self", isFormalDependent: false,
};

const mother: Person = {
  id: "d1", name: "Mother", sex: "female", dateOfBirth: "1955-01-10",
  relationship: "parent", isFormalDependent: false, monthlySupport: 800,
};

const child1: Person = {
  id: "d2", name: "Jaden", sex: "male", dateOfBirth: "2012-03-01",
  relationship: "child", isFormalDependent: true,
};

const child2: Person = {
  id: "d3", name: "Aaliyah", sex: "female", dateOfBirth: "2018-09-20",
  relationship: "child", isFormalDependent: true,
};

const debts: Debt[] = [
  { kind: "mortgage", balance: 350000, monthlyInstallment: 3000, endDate: "2040-01-21" },
  { kind: "credit-union", balance: 1500, monthlyInstallment: 250, endDate: "2027-11-04" },
];

const h: Household = {
  client, dependents: [mother, child1, child2],
  monthlyIncome: 12000, monthlyExpenses: 9000,
  debts, savings: 20000, otherInvestments: 5000,
};

const TODAY = "2026-07-16";

test("ageAt computes age on a given date, not from a clock", () => {
  assert.equal(ageAt("1990-06-15", "2026-07-16"), 36);
  assert.equal(ageAt("1990-08-15", "2026-07-16"), 35, "birthday not yet reached this year");
  assert.equal(ageAt("1990-07-16", "2026-07-16"), 36, "birthday exactly today");
});

test("yearsToPayoff derives the debt decline schedule input", () => {
  assert.ok(Math.abs(yearsToPayoff(debts[1]!, TODAY) - 1.30) < 0.02);
  assert.equal(yearsToPayoff({ ...debts[1]!, endDate: "2020-01-01" }, TODAY), 0, "past debts are zero, never negative");
});

test("debt totals split mortgage from the rest", () => {
  assert.equal(totalDebtBalance(h), 351500);
  assert.equal(mortgageBalance(h), 350000);
  assert.equal(nonMortgageDebtBalance(h), 1500);
});

test("informal dependents are counted — the household is not assumed nuclear", () => {
  const supported = h.dependents.filter((p) => !p.isFormalDependent);
  assert.equal(supported.length, 1);
  assert.equal(supported[0]!.name, "Mother");
});

test("youngestDependentChild ignores non-children", () => {
  const y = youngestDependentChild(h, TODAY);
  assert.equal(y?.name, "Aaliyah");
});

test("yearsUntilLastChildReaches drives income continuation", () => {
  // Aaliyah born 2018-09-20 is 7 on 2026-07-16; she reaches 21 on 2039-09-20,
  // which is 13.18 years away (13 years + 66 days).
  const y = yearsUntilLastChildReaches(h, 21, TODAY);
  assert.ok(y > 13.1 && y < 13.3, `expected ~13.18, got ${y}`);
  assert.equal(yearsUntilLastChildReaches({ ...h, dependents: [mother] }, 21, TODAY), 0, "no children => zero");
});

test("obligationDeclineSchedule steps down as debts retire", () => {
  const s = obligationDeclineSchedule(h, TODAY);
  assert.equal(s[0]!.remainingDebt, 351500, "year 0 carries every debt");
  const y2 = s.find((x) => x.year === 2)!;
  assert.equal(y2.remainingDebt, 350000, "credit union retires in ~1.3y, leaving the mortgage");
  assert.equal(s.at(-1)!.remainingDebt, 0, "everything eventually retires");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd core && node --test test/household.test.ts`
Expected: FAIL — `Cannot find module '../src/household.ts'`

- [ ] **Step 3: Write minimal implementation**

Create `core/src/household.ts`:

```ts
import type { Debt, Household, ISODate, Person, TTD } from "./types.ts";

const MS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000;

/** Whole years completed on `on`. Both dates are supplied — the core never reads a clock. */
export function ageAt(dateOfBirth: ISODate, on: ISODate): number {
  const b = new Date(dateOfBirth);
  const d = new Date(on);
  let age = d.getUTCFullYear() - b.getUTCFullYear();
  const beforeBirthday =
    d.getUTCMonth() < b.getUTCMonth() ||
    (d.getUTCMonth() === b.getUTCMonth() && d.getUTCDate() < b.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/** Fractional years until this debt's final payment. Never negative. */
export function yearsToPayoff(debt: Debt, on: ISODate): number {
  const ms = new Date(debt.endDate).getTime() - new Date(on).getTime();
  return ms <= 0 ? 0 : ms / MS_PER_YEAR;
}

export function totalDebtBalance(h: Household): TTD {
  return h.debts.reduce((sum, d) => sum + d.balance, 0);
}

export function mortgageBalance(h: Household): TTD {
  return h.debts.filter((d) => d.kind === "mortgage").reduce((s, d) => s + d.balance, 0);
}

export function nonMortgageDebtBalance(h: Household): TTD {
  return h.debts.filter((d) => d.kind !== "mortgage").reduce((s, d) => s + d.balance, 0);
}

export function dependents(h: Household): Person[] {
  return h.dependents;
}

/** The youngest person whose relationship is "child". Non-children are ignored. */
export function youngestDependentChild(h: Household, on: ISODate): Person | null {
  const kids = h.dependents.filter((p) => p.relationship === "child");
  if (kids.length === 0) return null;
  return kids.reduce((youngest, p) =>
    ageAt(p.dateOfBirth, on) < ageAt(youngest.dateOfBirth, on) ? p : youngest
  );
}

/** Fractional years until the youngest child reaches `targetAge`. Zero if no children or already past. */
export function yearsUntilLastChildReaches(h: Household, targetAge: number, on: ISODate): number {
  const youngest = youngestDependentChild(h, on);
  if (!youngest) return 0;
  const b = new Date(youngest.dateOfBirth);
  const target = new Date(Date.UTC(b.getUTCFullYear() + targetAge, b.getUTCMonth(), b.getUTCDate()));
  const ms = target.getTime() - new Date(on).getTime();
  return ms <= 0 ? 0 : ms / MS_PER_YEAR;
}

/**
 * Remaining debt at each whole year from now until the last debt retires.
 * This is the decline schedule the term ladder steps down against.
 */
export function obligationDeclineSchedule(
  h: Household,
  on: ISODate
): Array<{ year: number; remainingDebt: TTD }> {
  const horizons = h.debts.map((d) => yearsToPayoff(d, on));
  const last = Math.ceil(Math.max(0, ...horizons));
  const out: Array<{ year: number; remainingDebt: TTD }> = [];
  for (let year = 0; year <= last; year++) {
    const remaining = h.debts
      .filter((d) => yearsToPayoff(d, on) > year)
      .reduce((s, d) => s + d.balance, 0);
    out.push({ year, remainingDebt: remaining });
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd core && node --test test/household.test.ts`
Expected: PASS — 7 tests passing.

- [ ] **Step 5: Commit**

```bash
git add core/src/household.ts core/test/household.test.ts
git commit -m "feat(core): Household aggregate with informal dependents and debt decline schedule"
```

---

## Task 3: PolicyLedger

**Files:**
- Create: `core/src/policy-ledger.ts`
- Test: `core/test/policy-ledger.test.ts`

**⚠️ PRE-FLIGHT RESOLUTION (supersedes the code shown below):** the group-life ages are **T&T parameters and must NOT be hardcoded** — this task as originally drafted contradicted the Global Constraints. They now live in `parameters/tt-parameters.json` under `group_life` (`reduction_age` 66, `reduction_factor` 0.5, `termination_age` 70, all `VERIFIED_SINGLE_SOURCE`). **Import them via `ProvenanceBuilder.use()` so they carry provenance like every other parameter.** Task 4 builds `ProvenanceBuilder`, so this task may either read them directly via `resolveParameter()` or — simpler — export them as module constants *derived from* the parameters module, never as literals:

```ts
import { P } from "../../parameters/tt-parameters.js";
export const GROUP_LIFE_REDUCTION_AGE: number = P.group_life.reduction_age.value;
export const GROUP_LIFE_TERMINATION_AGE: number = P.group_life.termination_age.value;
export const GROUP_LIFE_REDUCTION_FACTOR: number = P.group_life.reduction_factor.value;
```

The literals `66`, `70`, `0.5` **must not appear** in `core/src/policy-ledger.ts`. Task 8's purity guard adds them to its forbidden list.

**Interfaces:**
- Consumes: `Policy`, `TTD` from `core/src/types.ts`; `P` from `parameters/tt-parameters.js`
- Produces:
  - `GROUP_LIFE_REDUCTION_AGE`, `GROUP_LIFE_TERMINATION_AGE`, `GROUP_LIFE_REDUCTION_FACTOR` — **all read from `P.group_life`, never literals**
  - `inForceCoverAt(policies: Policy[], age: number): { individual: TTD; group: TTD; total: TTD }`
  - `totalMonthlyPremium(policies: Policy[]): TTD`
  - `totalCashValue(policies: Policy[]): TTD`
  - `policiesByType(policies: Policy[], type: PolicyType): Policy[]`
  - `universalLifePolicies(policies: Policy[]): Policy[]`

- [ ] **Step 1: Write the failing test**

Create `core/test/policy-ledger.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  inForceCoverAt, totalMonthlyPremium, totalCashValue, universalLifePolicies,
  GROUP_LIFE_REDUCTION_AGE, GROUP_LIFE_TERMINATION_AGE,
} from "../src/policy-ledger.ts";
import type { Policy } from "../src/types.ts";

const individual: Policy = {
  id: "p1", insurer: "Tatil Life", productName: "Whole Life 2023", type: "whole-life",
  coverAmount: 250000, monthlyPremium: 467.18, cashValue: 31283,
  status: "in-force", isGroupCover: false,
};

const group: Policy = {
  id: "p2", insurer: "Employer Scheme", productName: "Group Life", type: "group-life",
  coverAmount: 200000, monthlyPremium: 0, status: "in-force", isGroupCover: true,
};

const lapsed: Policy = {
  id: "p3", insurer: "Guardian", productName: "Term", type: "term",
  coverAmount: 100000, monthlyPremium: 120, status: "lapsed", isGroupCover: false,
};

const cashbuilder: Policy = {
  id: "p4", insurer: "Tatil Life", productName: "Cashbuilder II", type: "universal-life",
  coverAmount: 150000, monthlyPremium: 300, cashValue: 45000,
  status: "in-force", isGroupCover: false,
};

const all = [individual, group, lapsed, cashbuilder];

test("lapsed policies contribute no cover", () => {
  const c = inForceCoverAt([lapsed], 40);
  assert.equal(c.total, 0);
});

test("below 66, group cover counts in full", () => {
  const c = inForceCoverAt(all, 40);
  assert.equal(c.individual, 400000, "whole life 250k + cashbuilder 150k");
  assert.equal(c.group, 200000);
  assert.equal(c.total, 600000);
});

test("group cover halves at 66", () => {
  const c = inForceCoverAt(all, GROUP_LIFE_REDUCTION_AGE);
  assert.equal(c.group, 100000);
  assert.equal(c.total, 500000);
});

test("group cover terminates at 70 — the protection gap", () => {
  const c = inForceCoverAt(all, GROUP_LIFE_TERMINATION_AGE);
  assert.equal(c.group, 0, "no post-retirement group cover");
  assert.equal(c.individual, 400000, "individual cover survives");
  assert.equal(c.total, 400000);
});

test("group cover is still zero above 70", () => {
  assert.equal(inForceCoverAt(all, 75).group, 0);
});

test("premiums and cash value sum only over in-force policies", () => {
  // Money is TTD as float and the engine must NOT round intermediates (Global Constraint),
  // so 467.18 + 300 lands on 767.1800000000001 in IEEE-754. The tolerance belongs in the
  // TEST, not in the implementation — rounding in the engine would violate the constraint.
  const premium = totalMonthlyPremium(all);
  assert.ok(Math.abs(premium - 767.18) < 0.005,
    `expected ~767.18 (467.18 + 0 + 300; lapsed excluded), got ${premium}`);

  // Cash values are whole dollars here, so exact equality is safe.
  assert.equal(totalCashValue(all), 76283, "31283 + 45000");
});

test("universalLifePolicies finds the X-ray's highest-value target", () => {
  const ul = universalLifePolicies(all);
  assert.equal(ul.length, 1);
  assert.equal(ul[0]!.productName, "Cashbuilder II");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd core && node --test test/policy-ledger.test.ts`
Expected: FAIL — `Cannot find module '../src/policy-ledger.ts'`

- [ ] **Step 3: Write minimal implementation**

Create `core/src/policy-ledger.ts`:

```ts
import type { Policy, PolicyType, TTD } from "./types.ts";

/**
 * Group life reduces by 50% at 66 and terminates at 70, with no post-retirement cover.
 * Source: Sagicor T&T CariCARE group life terms (research/product-knowledge-base.md).
 * Counting group cover as permanent is a real mis-selling risk — it vanishes exactly
 * when the client may still have dependents.
 */
export const GROUP_LIFE_REDUCTION_AGE = 66;
export const GROUP_LIFE_TERMINATION_AGE = 70;
export const GROUP_LIFE_REDUCTION_FACTOR = 0.5;

function isActive(p: Policy): boolean {
  return p.status === "in-force" || p.status === "paid-up";
}

/** Cover actually available at a given attained age, with group cover correctly decayed. */
export function inForceCoverAt(
  policies: Policy[],
  age: number
): { individual: TTD; group: TTD; total: TTD } {
  let individual = 0;
  let group = 0;
  for (const p of policies) {
    if (!isActive(p)) continue;
    if (p.type === "annuity" || p.type === "critical-illness") continue; // not death cover
    if (p.isGroupCover) {
      if (age >= GROUP_LIFE_TERMINATION_AGE) continue;
      group += age >= GROUP_LIFE_REDUCTION_AGE
        ? p.coverAmount * GROUP_LIFE_REDUCTION_FACTOR
        : p.coverAmount;
    } else {
      individual += p.coverAmount;
    }
  }
  return { individual, group, total: individual + group };
}

export function totalMonthlyPremium(policies: Policy[]): TTD {
  return policies.filter(isActive).reduce((s, p) => s + p.monthlyPremium, 0);
}

export function totalCashValue(policies: Policy[]): TTD {
  return policies.filter(isActive).reduce((s, p) => s + (p.cashValue ?? 0), 0);
}

export function policiesByType(policies: Policy[], type: PolicyType): Policy[] {
  return policies.filter((p) => p.type === type);
}

/**
 * Universal life policies on a client's book are the Policy X-ray's highest-value target:
 * a Cashbuilder sold in the 1990s on a 10.5% credited assumption against a 4% guarantee
 * may be silently heading for lapse. Flag them for an in-force illustration.
 */
export function universalLifePolicies(policies: Policy[]): Policy[] {
  return policies.filter((p) => p.type === "universal-life" && isActive(p));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd core && node --test test/policy-ledger.test.ts`
Expected: PASS — 7 tests passing.

- [ ] **Step 5: Commit**

```bash
git add core/src/policy-ledger.ts core/test/policy-ledger.test.ts
git commit -m "feat(core): PolicyLedger with group cover decay at 66/70 and UL flagging"
```

---

## Task 4: Provenance builder

**Files:**
- Create: `core/src/provenance.ts`
- Test: `core/test/provenance.test.ts`

**Interfaces:**
- Consumes: `Provenance` from `core/src/types.ts`; `P` from `parameters/tt-parameters.js`
- Produces:
  - `class ProvenanceBuilder` with `.use(path: string): unknown`, `.caveat(msg: string): void`, `.rule(msg: string): void`, `.build(): Provenance`
  - `resolveParameter(path: string): { node: any; value: unknown }`

- [ ] **Step 1: Write the failing test**

Create `core/test/provenance.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { ProvenanceBuilder, resolveParameter } from "../src/provenance.ts";

test("resolveParameter reads a dotted path and returns node + value", () => {
  const { node, value } = resolveParameter("nis.minimum_pension");
  assert.equal(value, 3000);
  assert.equal(node.effective, "2012-02-01");
  assert.equal(node.status, "VERIFIED");
});

test("builder records every parameter used, with provenance", () => {
  const b = new ProvenanceBuilder();
  const min = b.use("nis.minimum_pension");
  assert.equal(min, 3000);
  const p = b.build();
  assert.equal(p.parameters.length, 1);
  assert.equal(p.parameters[0]!.path, "nis.minimum_pension");
  assert.equal(p.parameters[0]!.effective, "2012-02-01");
  assert.equal(p.parameters[0]!.status, "VERIFIED");
  assert.ok(p.parameters[0]!.source?.includes("nibtt.net"));
});

test("using a STALE parameter throws — drift cannot enter silently", () => {
  const b = new ProvenanceBuilder();
  assert.throws(() => b.use("nis.benefit_rates.superseded_2008"), /STALE_DO_NOT_USE/);
});

test("caveats and rules are recorded in order and deduplicated", () => {
  const b = new ProvenanceBuilder();
  b.rule("applied minimum pension");
  b.rule("applied minimum pension");
  b.caveat("increments unconfirmed");
  const p = b.build();
  assert.deepEqual(p.rulesFired, ["applied minimum pension"]);
  assert.deepEqual(p.caveats, ["increments unconfirmed"]);
});

test("build() output is stable — same calls, byte-identical JSON", () => {
  const mk = () => {
    const b = new ProvenanceBuilder();
    b.use("nis.minimum_pension");
    b.rule("r1");
    return JSON.stringify(b.build());
  };
  assert.equal(mk(), mk());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd core && node --test test/provenance.test.ts`
Expected: FAIL — `Cannot find module '../src/provenance.ts'`

- [ ] **Step 3: Write minimal implementation**

Create `core/src/provenance.ts`:

```ts
import { P, assertSafe } from "../../parameters/tt-parameters.js";
import type { Provenance } from "./types.ts";

/** Read a dotted parameter path, returning both the node (for provenance) and its value. */
export function resolveParameter(path: string): { node: any; value: unknown } {
  let node: any = P;
  for (const key of path.split(".")) {
    if (node == null || typeof node !== "object" || !(key in node)) {
      throw new Error(`Unknown parameter path: "${path}"`);
    }
    node = node[key];
  }
  return { node, value: node?.value };
}

/**
 * Accumulates the audit trail for one computation.
 * Every parameter read goes through `.use()` so nothing enters a result
 * without its effective date, source and status coming with it.
 */
export class ProvenanceBuilder {
  #params = new Map<string, Provenance["parameters"][number]>();
  #caveats: string[] = [];
  #rules: string[] = [];

  /** Read a parameter, record its provenance, and refuse unsafe statuses. */
  use(path: string): unknown {
    const { node, value } = resolveParameter(path);
    assertSafe(node, path);
    if (!this.#params.has(path)) {
      this.#params.set(path, {
        path,
        effective: node.effective ?? null,
        source: node.source ?? null,
        status: node.status ?? "UNMARKED",
      });
    }
    return value;
  }

  caveat(msg: string): void {
    if (!this.#caveats.includes(msg)) this.#caveats.push(msg);
  }

  rule(msg: string): void {
    if (!this.#rules.includes(msg)) this.#rules.push(msg);
  }

  build(): Provenance {
    return {
      parameters: [...this.#params.values()].sort((a, b) => a.path.localeCompare(b.path)),
      caveats: [...this.#caveats],
      rulesFired: [...this.#rules],
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd core && node --test test/provenance.test.ts`
Expected: PASS — 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add core/src/provenance.ts core/test/provenance.test.ts
git commit -m "feat(core): ProvenanceBuilder — no parameter enters a result without its source"
```

---

## Task 5: NeedsEngine — death need (Tatil's formula)

**Files:**
- Create: `core/src/needs/death.ts`
- Test: `core/test/needs-death.test.ts`

**Interfaces:**
- Consumes: `Household`, `DeathNeedsProfile`, `ISODate` from types; `ProvenanceBuilder`; `mortgageBalance`, `nonMortgageDebtBalance`, `yearsUntilLastChildReaches` from `household.ts`; `inForceCoverAt` is **not** used here (that is the gap's job)
- Produces: `computeDeathNeeds(h: Household, on: ISODate, opts?: { nisSurvivorMonthly?: TTD }): DeathNeedsProfile`

**Domain note — this formula is not invented.** It is the standardised T&T instrument from Tatil Life's Client Financial Profile:

```
TOTAL NEEDS = funeral + medical + outstanding loans + mortgage liquidation
            + rental income for 120 months
            + education expense
            + continuation of income until last child attains 21
LESS ASSETS = savings + existing life insurance + other investments
INSURANCE NEED = TOTAL NEEDS − TOTAL ASSETS
```

⚠️ **Open question to confirm with the founder:** the form lists *"(iv) Mortgage Liquidation"* and *"(v) Rental Income for 120 months"* as separate lines. This plan treats them as **housing alternatives** — pay off the mortgage if they own, or fund 120 months of rent if they rent — because that is the only reading in which the formula does not double-count housing. **This is an inference, not a verified rule.** Encode it, test it, and flag it for confirmation.

- [ ] **Step 1: Write the failing test**

Create `core/test/needs-death.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeDeathNeeds } from "../src/needs/death.ts";
import type { Household, Person } from "../src/types.ts";

const client: Person = {
  id: "c1", name: "Client", sex: "male", dateOfBirth: "1990-06-15",
  relationship: "self", isFormalDependent: false,
};
const child: Person = {
  id: "d1", name: "Child", sex: "female", dateOfBirth: "2018-09-20",
  relationship: "child", isFormalDependent: true,
};

const owner: Household = {
  client, dependents: [child],
  monthlyIncome: 12000, monthlyExpenses: 9000,
  debts: [
    { kind: "mortgage", balance: 350000, monthlyInstallment: 3000, endDate: "2040-01-21" },
    { kind: "credit-union", balance: 1500, monthlyInstallment: 250, endDate: "2027-11-04" },
  ],
  savings: 20000, otherInvestments: 5000,
  educationCost: 150000, expectedFuneralCost: 40000, expectedMedicalCost: 10000,
};

const TODAY = "2026-07-16";

test("owner: mortgage is liquidated and rent replacement is zero — housing is not double-counted", () => {
  const n = computeDeathNeeds(owner, TODAY);
  assert.equal(n.mortgageLiquidation, 350000);
  assert.equal(n.housingRentReplacement, 0);
});

test("renter: 120 months of rent replaces mortgage liquidation", () => {
  const renter: Household = { ...owner, debts: [owner.debts[1]!], monthlyRent: 4000 };
  const n = computeDeathNeeds(renter, TODAY);
  assert.equal(n.mortgageLiquidation, 0);
  assert.equal(n.housingRentReplacement, 480000, "4000 x 120 months");
});

test("income continuation runs until the last child reaches 21", () => {
  const n = computeDeathNeeds(owner, TODAY);
  // child born 2018-09-20 reaches 21 on 2039-09-20 = 13.18y from TODAY.
  // 9000 monthly expenses x 12 x 13.18 = ~1,423,471
  assert.ok(n.incomeContinuation > 1_420_000 && n.incomeContinuation < 1_430_000,
    `expected ~1.42M, got ${n.incomeContinuation}`);
});

test("no children => no income continuation", () => {
  const n = computeDeathNeeds({ ...owner, dependents: [] }, TODAY);
  assert.equal(n.incomeContinuation, 0);
});

test("total need nets assets and never goes below zero", () => {
  const n = computeDeathNeeds(owner, TODAY);
  assert.equal(n.assets.total, 25000, "savings 20000 + investments 5000");
  assert.equal(n.insuranceNeed, Math.max(0, n.totalNeeds - n.assets.total));

  const rich = computeDeathNeeds({ ...owner, savings: 99_000_000 }, TODAY);
  assert.equal(rich.insuranceNeed, 0, "over-assetted households need zero, not negative");
});

test("NIS survivor benefit reduces the income-continuation need", () => {
  const without = computeDeathNeeds(owner, TODAY);
  const with_ = computeDeathNeeds(owner, TODAY, { nisSurvivorMonthly: 1000 });
  assert.ok(with_.incomeContinuation < without.incomeContinuation);
  assert.ok(with_.provenance.rulesFired.some((r) => r.includes("NIS survivor")));
});

test("provenance records the T&T conventions used and contains no estate-tax driver", () => {
  const n = computeDeathNeeds(owner, TODAY);
  const paths = n.provenance.parameters.map((p) => p.path);
  assert.ok(paths.includes("conventions.income_continuation_to_age"));
  assert.ok(paths.includes("conventions.rental_income_months"));
  assert.ok(!JSON.stringify(n).toLowerCase().includes("estate_tax"),
    "T&T has no estate tax — the US liquidity driver must not appear");
});

test("the housing-alternatives reading is flagged as an inference, not a verified rule", () => {
  const n = computeDeathNeeds(owner, TODAY);
  assert.ok(n.provenance.caveats.some((c) => c.includes("housing")),
    "must surface that mortgage-vs-rent is an inference pending confirmation");
});

test("deterministic — identical inputs give byte-identical output", () => {
  assert.equal(
    JSON.stringify(computeDeathNeeds(owner, TODAY)),
    JSON.stringify(computeDeathNeeds(owner, TODAY))
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd core && node --test test/needs-death.test.ts`
Expected: FAIL — `Cannot find module '../src/needs/death.ts'`

- [ ] **Step 3: Write minimal implementation**

Create `core/src/needs/death.ts`:

```ts
import type { DeathNeedsProfile, Household, ISODate, TTD } from "../types.ts";
import { ProvenanceBuilder } from "../provenance.ts";
import { mortgageBalance, nonMortgageDebtBalance, yearsUntilLastChildReaches } from "../household.ts";

/**
 * Tatil Life's standardised T&T death-needs formula.
 * Not invented here — see research/factfinder-analysis.md.
 *
 * Deliberately OMITS the US/AU estate-tax liquidity driver: T&T has no estate,
 * inheritance or gift tax. The T&T estate concern is probate bypass and titling.
 */
export function computeDeathNeeds(
  h: Household,
  on: ISODate,
  opts: { nisSurvivorMonthly?: TTD } = {}
): DeathNeedsProfile {
  const b = new ProvenanceBuilder();

  const rentalMonths = b.use("conventions.rental_income_months") as number; // 120
  const continuationToAge = b.use("conventions.income_continuation_to_age") as number; // 21

  const funeral = h.expectedFuneralCost ?? 0;
  const medical = h.expectedMedicalCost ?? 0;
  const outstandingLoans = nonMortgageDebtBalance(h);
  const mortgage = mortgageBalance(h);

  // Housing: liquidate the mortgage if they own, else fund `rentalMonths` of rent.
  // INFERENCE — the Tatil form lists these as separate lines and does not state
  // they are alternatives. This is the only reading that avoids double-counting.
  const owns = mortgage > 0;
  const mortgageLiquidation = owns ? mortgage : 0;
  const housingRentReplacement = owns ? 0 : (h.monthlyRent ?? 0) * rentalMonths;
  b.caveat(
    "housing need treats mortgage liquidation and rent replacement as ALTERNATIVES " +
    "(own => liquidate; rent => fund 120 months). The Tatil form lists them separately " +
    "without stating they are exclusive. Confirm with the founder before relying on this."
  );
  b.rule(owns ? "housing: mortgage liquidation" : "housing: 120 months rent replacement");

  const education = h.educationCost ?? 0;

  // Income continuation until the youngest child reaches 21, net of any NIS survivor benefit.
  const years = yearsUntilLastChildReaches(h, continuationToAge, on);
  const survivorMonthly = opts.nisSurvivorMonthly ?? 0;
  const netMonthlyNeed = Math.max(0, h.monthlyExpenses - survivorMonthly);
  const incomeContinuation = netMonthlyNeed * 12 * years;
  if (years > 0) b.rule(`income continuation for ${years.toFixed(2)} years to age ${continuationToAge}`);
  if (survivorMonthly > 0) b.rule(`NIS survivor benefit of ${survivorMonthly}/month nets off the income need`);

  const totalNeeds =
    funeral + medical + outstandingLoans + mortgageLiquidation +
    housingRentReplacement + education + incomeContinuation;

  const lifeInsurance = 0; // in-force cover is applied by the GapCalculator, not here
  const assets = {
    savings: h.savings,
    lifeInsurance,
    otherInvestments: h.otherInvestments,
    total: h.savings + lifeInsurance + h.otherInvestments,
  };

  const insuranceNeed = Math.max(0, totalNeeds - assets.total);
  if (totalNeeds - assets.total < 0) b.rule("assets exceed needs — insurance need floored at zero");

  return {
    funeral, medical, outstandingLoans, mortgageLiquidation, housingRentReplacement,
    education, incomeContinuation, totalNeeds, assets, insuranceNeed,
    provenance: b.build(),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd core && node --test test/needs-death.test.ts`
Expected: PASS — 9 tests passing.

- [ ] **Step 5: Commit**

```bash
git add core/src/needs/death.ts core/test/needs-death.test.ts
git commit -m "feat(core): death needs engine using Tatil's standardised T&T formula"
```

---

## Task 6: NeedsEngine — retirement need (NIS ⊕ SCP)

**Files:**
- Create: `core/src/needs/retirement.ts`
- Test: `core/test/needs-retirement.test.ts`

**Interfaces:**
- Consumes: `Household`, `RetirementNeedsProfile`, `TTD` from types; `ProvenanceBuilder`; `retirementFloor` from `parameters/tt-parameters.js`
- Produces: `computeRetirementNeeds(input: { lifetimeAvgMonthlyEarnings: TTD; totalContributions: number; retirementAge: number; targetMonthlyIncome: TTD; otherMonthlyIncome?: TTD }): RetirementNeedsProfile`

**Domain note:** NIS and SCP **must** be computed together. NIS retirement pension counts as SCP assessed income (SCP application form items 6 & 31), so a 3,000 NIS pension delivers only 2,000 net — and since Classes I–XII land on the 3,000 minimum, that is the *common* case, not an edge case.

- [ ] **Step 1: Write the failing test**

Create `core/test/needs-retirement.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeRetirementNeeds } from "../src/needs/retirement.ts";

test("no NIS entitlement: SCP alone pays 3,500", () => {
  const r = computeRetirementNeeds({
    lifetimeAvgMonthlyEarnings: 0, totalContributions: 0,
    retirementAge: 66, targetMonthlyIncome: 8000,
  });
  assert.equal(r.nisMonthly, 0);
  assert.equal(r.scpMonthly, 3500);
  assert.equal(r.guaranteedFloorMonthly, 3500);
  assert.equal(r.monthlyShortfall, 4500);
});

test("the SCP offset: a 3,000 NIS pension delivers only 2,000 net", () => {
  const none = computeRetirementNeeds({
    lifetimeAvgMonthlyEarnings: 0, totalContributions: 0,
    retirementAge: 66, targetMonthlyIncome: 8000,
  });
  const min = computeRetirementNeeds({
    lifetimeAvgMonthlyEarnings: 1000, totalContributions: 750,
    retirementAge: 66, targetMonthlyIncome: 8000,
  });
  assert.equal(min.nisMonthly, 3000, "Class I at 750 contributions => the 3,000 minimum binds");
  assert.equal(min.scpMonthly, 2500, "NIS counts as assessed income => SCP drops a band");
  assert.equal(min.guaranteedFloorMonthly - none.guaranteedFloorMonthly, 2000);
  assert.ok(min.provenance.rulesFired.some((r) => r.includes("SCP")));
});

test("shortfall never goes negative", () => {
  const r = computeRetirementNeeds({
    lifetimeAvgMonthlyEarnings: 1000, totalContributions: 750,
    retirementAge: 66, targetMonthlyIncome: 2000,
  });
  assert.equal(r.monthlyShortfall, 0);
});

test("increments are not silently applied — the caveat surfaces instead", () => {
  const r = computeRetirementNeeds({
    lifetimeAvgMonthlyEarnings: 6000, totalContributions: 1050,
    retirementAge: 66, targetMonthlyIncome: 10000,
  });
  assert.ok(r.provenance.caveats.some((c) => c.toLowerCase().includes("increment")),
    "NIBTT has published no 2016 increment schedule — we must say so, not guess");
});

test("below SCP age, only NIS counts", () => {
  const r = computeRetirementNeeds({
    lifetimeAvgMonthlyEarnings: 1000, totalContributions: 750,
    retirementAge: 62, targetMonthlyIncome: 8000,
  });
  assert.equal(r.scpMonthly, 0, "SCP requires age 65");
  assert.equal(r.guaranteedFloorMonthly, 3000);
});

test("deterministic", () => {
  const mk = () => JSON.stringify(computeRetirementNeeds({
    lifetimeAvgMonthlyEarnings: 5000, totalContributions: 900,
    retirementAge: 66, targetMonthlyIncome: 9000,
  }));
  assert.equal(mk(), mk());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd core && node --test test/needs-retirement.test.ts`
Expected: FAIL — `Cannot find module '../src/needs/retirement.ts'`

- [ ] **Step 3: Write minimal implementation**

Create `core/src/needs/retirement.ts`:

```ts
import { retirementFloor } from "../../../parameters/tt-parameters.js";
import type { RetirementNeedsProfile, TTD } from "../types.ts";
import { ProvenanceBuilder } from "../provenance.ts";

/**
 * Retirement shortfall against the NIS + SCP guaranteed floor.
 *
 * NIS and SCP MUST be modelled together: NIS retirement pension counts as SCP
 * assessed income (SCP form items 6 & 31), so it claws back a band of SCP.
 * `lifetimeAvgMonthlyEarnings` is the WHOLE-WORKING-LIFE average, not final salary
 * and not the last 7 years — confirmed verbatim from NIBTT training material.
 */
export function computeRetirementNeeds(input: {
  lifetimeAvgMonthlyEarnings: TTD;
  totalContributions: number;
  retirementAge: number;
  targetMonthlyIncome: TTD;
  otherMonthlyIncome?: TTD;
}): RetirementNeedsProfile {
  const b = new ProvenanceBuilder();
  b.use("nis.averaging_basis");
  b.use("nis.minimum_pension");
  b.use("scp.bands");
  b.use("scp.assessed_income_includes_nis_pension");

  const other = input.otherMonthlyIncome ?? 0;
  const floor = retirementFloor(
    input.lifetimeAvgMonthlyEarnings,
    input.totalContributions,
    input.retirementAge,
    other
  );

  const nisMonthly = floor.nis.type === "PENSION" ? (floor.nis.monthly ?? 0) : 0;
  const scpMonthly = floor.scp.monthly;

  if (floor.nis.type === "GRANT") {
    b.rule("fewer than 750 contributions — Retirement Grant (lump sum), not a pension");
    b.rule("the grant is excluded from SCP assessed income");
  } else {
    b.rule(`NIS pension: class ${floor.nis.class}`);
    if (floor.nis.minimumApplied) b.rule("the 3,000/month minimum pension binds");
    if (nisMonthly > 0 && scpMonthly > 0) {
      b.rule("NIS pension counts as SCP assessed income — SCP reduced accordingly");
    }
  }

  if (floor.nis.caveat) b.caveat(floor.nis.caveat);
  if (floor.scp.cliffWarning) b.caveat(floor.scp.cliffWarning);

  const guaranteedFloorMonthly = nisMonthly + scpMonthly + other;
  const monthlyShortfall = Math.max(0, input.targetMonthlyIncome - guaranteedFloorMonthly);

  return {
    targetMonthlyIncome: input.targetMonthlyIncome,
    nisMonthly,
    scpMonthly,
    otherMonthlyIncome: other,
    guaranteedFloorMonthly,
    monthlyShortfall,
    provenance: b.build(),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd core && node --test test/needs-retirement.test.ts`
Expected: PASS — 6 tests passing.

- [ ] **Step 5: Commit**

```bash
git add core/src/needs/retirement.ts core/test/needs-retirement.test.ts
git commit -m "feat(core): retirement needs engine modelling NIS and SCP jointly"
```

---

## Task 7: GapCalculator and public API

**Files:**
- Create: `core/src/gap.ts`
- Create: `core/src/index.ts`
- Test: `core/test/gap.test.ts`

**Interfaces:**
- Consumes: `DeathNeedsProfile`, `Policy`, `Gap` from types; `inForceCoverAt` from `policy-ledger.ts`; `ProvenanceBuilder`
- Produces:
  - `computeGap(needs: DeathNeedsProfile, policies: Policy[], atAge: number): Gap`
  - `core/src/index.ts` re-exporting the full public API

- [ ] **Step 1: Write the failing test**

Create `core/test/gap.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeGap } from "../src/gap.ts";
import type { DeathNeedsProfile, Policy } from "../src/types.ts";

const needs = {
  funeral: 40000, medical: 10000, outstandingLoans: 1500, mortgageLiquidation: 350000,
  housingRentReplacement: 0, education: 150000, incomeContinuation: 1_000_000,
  totalNeeds: 1_551_500,
  assets: { savings: 20000, lifeInsurance: 0, otherInvestments: 5000, total: 25000 },
  insuranceNeed: 1_526_500,
  provenance: { parameters: [], caveats: [], rulesFired: [] },
} satisfies DeathNeedsProfile;

const individual: Policy = {
  id: "p1", insurer: "Tatil Life", productName: "Whole Life", type: "whole-life",
  coverAmount: 250000, monthlyPremium: 467, status: "in-force", isGroupCover: false,
};
const group: Policy = {
  id: "p2", insurer: "Employer", productName: "Group Life", type: "group-life",
  coverAmount: 200000, monthlyPremium: 0, status: "in-force", isGroupCover: true,
};

test("gap is need minus in-force cover", () => {
  const g = computeGap(needs, [individual, group], 40);
  assert.equal(g.need, 1_526_500);
  assert.equal(g.inForceCover, 450000, "250k individual + 200k group at age 40");
  assert.equal(g.gap, 1_076_500);
});

test("at 70 the group cover is gone and the gap widens — and we say so", () => {
  const g = computeGap(needs, [individual, group], 70);
  assert.equal(g.inForceCover, 250000);
  assert.equal(g.groupCoverExcluded, 200000);
  assert.equal(g.gap, 1_276_500);
  assert.ok(g.provenance.rulesFired.some((r) => r.includes("group")),
    "the client must be told their work cover ends at 70");
});

test("over-insured households have a zero gap, never negative", () => {
  const huge: Policy = { ...individual, coverAmount: 99_000_000 };
  assert.equal(computeGap(needs, [huge], 40).gap, 0);
});

test("deterministic", () => {
  const mk = () => JSON.stringify(computeGap(needs, [individual, group], 40));
  assert.equal(mk(), mk());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd core && node --test test/gap.test.ts`
Expected: FAIL — `Cannot find module '../src/gap.ts'`

- [ ] **Step 3: Write minimal implementation**

Create `core/src/gap.ts`:

```ts
import type { DeathNeedsProfile, Gap, Policy } from "./types.ts";
import { ProvenanceBuilder } from "./provenance.ts";
import { GROUP_LIFE_TERMINATION_AGE, inForceCoverAt } from "./policy-ledger.ts";

/**
 * gap = need − (individual cover + group cover available at this age)
 *
 * Group cover halves at 66 and terminates at 70. Most employed clients are
 * underinsured AND about to lose what they have — the engine must surface that
 * rather than quietly counting cover that will vanish.
 */
export function computeGap(needs: DeathNeedsProfile, policies: Policy[], atAge: number): Gap {
  const b = new ProvenanceBuilder();
  const cover = inForceCoverAt(policies, atAge);

  const groupFaceTotal = policies
    .filter((p) => p.isGroupCover && (p.status === "in-force" || p.status === "paid-up"))
    .reduce((s, p) => s + p.coverAmount, 0);
  const groupCoverExcluded = groupFaceTotal - cover.group;

  if (groupFaceTotal > 0) {
    if (atAge >= GROUP_LIFE_TERMINATION_AGE) {
      b.rule(`group cover of ${groupFaceTotal} has terminated at age ${GROUP_LIFE_TERMINATION_AGE} — excluded in full`);
    } else if (groupCoverExcluded > 0) {
      b.rule(`group cover reduced by ${groupCoverExcluded} at attained age ${atAge}`);
    } else {
      b.rule(`group cover of ${groupFaceTotal} counted in full, but it halves at 66 and ends at 70`);
    }
  }

  const gap = Math.max(0, needs.insuranceNeed - cover.total);
  if (needs.insuranceNeed - cover.total < 0) b.rule("cover exceeds need — gap floored at zero");

  return {
    need: needs.insuranceNeed,
    inForceCover: cover.total,
    groupCoverExcluded,
    gap,
    provenance: b.build(),
  };
}
```

Create `core/src/index.ts`:

```ts
export type {
  TTD, ISODate, Sex, SmokerStatus, RelationshipKind, Person, Debt, DebtKind,
  Household, Policy, PolicyType, PolicyStatus, Provenance,
  DeathNeedsProfile, RetirementNeedsProfile, Gap,
} from "./types.ts";

export {
  ageAt, yearsToPayoff, totalDebtBalance, mortgageBalance, nonMortgageDebtBalance,
  dependents, youngestDependentChild, yearsUntilLastChildReaches, obligationDeclineSchedule,
} from "./household.ts";

export {
  inForceCoverAt, totalMonthlyPremium, totalCashValue, policiesByType, universalLifePolicies,
  GROUP_LIFE_REDUCTION_AGE, GROUP_LIFE_TERMINATION_AGE, GROUP_LIFE_REDUCTION_FACTOR,
} from "./policy-ledger.ts";

export { ProvenanceBuilder, resolveParameter } from "./provenance.ts";
export { computeDeathNeeds } from "./needs/death.ts";
export { computeRetirementNeeds } from "./needs/retirement.ts";
export { computeGap } from "./gap.ts";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd core && node --test test/gap.test.ts`
Expected: PASS — 4 tests passing.

- [ ] **Step 5: Run the whole suite**

Run: `cd core && npm test`
Expected: PASS — all test files, 38 tests.

- [ ] **Step 6: Commit**

```bash
git add core/src/gap.ts core/src/index.ts core/test/gap.test.ts
git commit -m "feat(core): GapCalculator with group-cover exclusion, and public API"
```

---

## Task 8: Golden acceptance cases and the purity guard

**Files:**
- Create: `core/test/golden/kyron-household.json`
- Create: `core/test/golden.test.ts`
- Create: `core/test/purity.test.ts`

**Interfaces:**
- Consumes: the full public API from `core/src/index.ts`
- Produces: the acceptance gate for this plan. No new runtime code.

**Note:** the golden file is the **expected output**, hand-checked once and then frozen. If a later change alters a number, the diff must be explained — that is the point.

- [ ] **Step 1: Write the failing test**

Create `core/test/golden/kyron-household.json`:

```json
{
  "_note": "Frozen expected output. If these numbers change, the change must be explained, not accepted.",
  "case": "Owner, 36, spouse-less, one child aged 7, supported mother, mortgage + credit union",
  "on": "2026-07-16",
  "expected": {
    "deathNeeds": {
      "funeral": 40000,
      "medical": 10000,
      "outstandingLoans": 1500,
      "mortgageLiquidation": 350000,
      "housingRentReplacement": 0,
      "education": 150000,
      "assetsTotal": 25000
    },
    "gapAt40": {
      "inForceCover": 450000,
      "groupCoverExcluded": 0
    },
    "gapAt70": {
      "inForceCover": 250000,
      "groupCoverExcluded": 200000
    },
    "retirementAt66": {
      "nisMonthly": 3000,
      "scpMonthly": 2500,
      "guaranteedFloorMonthly": 5500
    }
  }
}
```

Create `core/test/golden.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { computeDeathNeeds, computeGap, computeRetirementNeeds } from "../src/index.ts";
import type { Household, Person, Policy } from "../src/types.ts";

const golden = JSON.parse(
  readFileSync(new URL("./golden/kyron-household.json", import.meta.url), "utf8")
);

const client: Person = {
  id: "c1", name: "Client", sex: "male", dateOfBirth: "1990-06-15",
  relationship: "self", isFormalDependent: false,
};
const mother: Person = {
  id: "d1", name: "Mother", sex: "female", dateOfBirth: "1955-01-10",
  relationship: "parent", isFormalDependent: false, monthlySupport: 800,
};
const child: Person = {
  id: "d2", name: "Child", sex: "female", dateOfBirth: "2018-09-20",
  relationship: "child", isFormalDependent: true,
};

const household: Household = {
  client, dependents: [mother, child],
  monthlyIncome: 12000, monthlyExpenses: 9000,
  debts: [
    { kind: "mortgage", balance: 350000, monthlyInstallment: 3000, endDate: "2040-01-21" },
    { kind: "credit-union", balance: 1500, monthlyInstallment: 250, endDate: "2027-11-04" },
  ],
  savings: 20000, otherInvestments: 5000,
  educationCost: 150000, expectedFuneralCost: 40000, expectedMedicalCost: 10000,
};

const policies: Policy[] = [
  { id: "p1", insurer: "Tatil Life", productName: "Whole Life 2023", type: "whole-life",
    coverAmount: 250000, monthlyPremium: 467.18, cashValue: 31283, status: "in-force", isGroupCover: false },
  { id: "p2", insurer: "Employer", productName: "Group Life", type: "group-life",
    coverAmount: 200000, monthlyPremium: 0, status: "in-force", isGroupCover: true },
];

test("golden: death needs match the frozen hand-computed case", () => {
  const n = computeDeathNeeds(household, golden.on);
  const e = golden.expected.deathNeeds;
  assert.equal(n.funeral, e.funeral);
  assert.equal(n.medical, e.medical);
  assert.equal(n.outstandingLoans, e.outstandingLoans);
  assert.equal(n.mortgageLiquidation, e.mortgageLiquidation);
  assert.equal(n.housingRentReplacement, e.housingRentReplacement);
  assert.equal(n.education, e.education);
  assert.equal(n.assets.total, e.assetsTotal);
});

test("golden: the gap at 40 and at 70 — group cover vanishes", () => {
  const n = computeDeathNeeds(household, golden.on);
  const g40 = computeGap(n, policies, 40);
  const g70 = computeGap(n, policies, 70);
  assert.equal(g40.inForceCover, golden.expected.gapAt40.inForceCover);
  assert.equal(g40.groupCoverExcluded, golden.expected.gapAt40.groupCoverExcluded);
  assert.equal(g70.inForceCover, golden.expected.gapAt70.inForceCover);
  assert.equal(g70.groupCoverExcluded, golden.expected.gapAt70.groupCoverExcluded);
  assert.ok(g70.gap > g40.gap, "losing group cover widens the gap");
});

test("golden: the retirement floor and the SCP offset", () => {
  const r = computeRetirementNeeds({
    lifetimeAvgMonthlyEarnings: 1000, totalContributions: 750,
    retirementAge: 66, targetMonthlyIncome: 9000,
  });
  const e = golden.expected.retirementAt66;
  assert.equal(r.nisMonthly, e.nisMonthly);
  assert.equal(r.scpMonthly, e.scpMonthly);
  assert.equal(r.guaranteedFloorMonthly, e.guaranteedFloorMonthly);
});

test("golden: every result carries provenance a regulator could read", () => {
  const n = computeDeathNeeds(household, golden.on);
  assert.ok(n.provenance.parameters.length > 0, "parameters used must be recorded");
  assert.ok(n.provenance.parameters.every((p) => p.effective !== undefined && p.status));
  assert.ok(n.provenance.rulesFired.length > 0, "rules fired must be recorded");
});
```

Create `core/test/purity.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".ts") ? [p] : [];
  });
}

const SRC = new URL("../src", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const files = walk(SRC);

test("the core reads no clock and rolls no dice — determinism is auditability", () => {
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    assert.ok(!/Date\.now\(\)/.test(src), `${f} must not call Date.now() — pass dates in`);
    assert.ok(!/Math\.random\(\)/.test(src), `${f} must not call Math.random()`);
    assert.ok(!/new Date\(\s*\)/.test(src), `${f} must not construct an empty Date()`);
  }
});

test("the core performs no I/O", () => {
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    assert.ok(!/from ["']node:fs["']/.test(src), `${f} must not import node:fs`);
    assert.ok(!/\bfetch\s*\(/.test(src), `${f} must not call fetch()`);
    assert.ok(!/console\.(log|warn|error)/.test(src), `${f} must not log — return caveats instead`);
  }
});

test("no T&T parameter is hardcoded outside the parameters module", () => {
  const FORBIDDEN = [
    ["3000", "the NIS minimum pension"],
    ["13600", "the insurable earnings ceiling"],
    ["60000", "the combined deduction cap"],
    ["90000", "the personal allowance"],
    ["566.72", "a NIS benefit rate"],
    ["335.83", "a STALE NIS benefit rate"],
    ["120", "the rental-income replacement months"],
    ["66", "the group life reduction age"],
    ["70", "the group life termination age"],
  ] as const;
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    for (const [num, what] of FORBIDDEN) {
      assert.ok(!new RegExp(`\\b${num.replace(".", "\\.")}\\b`).test(src),
        `${f} hardcodes ${num} (${what}) — import it from parameters/tt-parameters.js instead`);
    }
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd core && node --test test/golden.test.ts test/purity.test.ts`
Expected: FAIL — golden file assertions fail if any number is wrong; purity passes only if Tasks 2–7 were written cleanly. **If purity fails, fix the source, not the test.**

- [ ] **Step 3: Reconcile**

No new implementation. If a golden assertion fails:
1. Hand-check the arithmetic against `research/factfinder-analysis.md` (the Tatil formula) and `parameters/tt-parameters.json`.
2. If the **code** is wrong, fix the code.
3. If the **golden file** is wrong, fix the golden file **and say so in the commit message** — a golden file changed without explanation is how a silent regression enters.

- [ ] **Step 4: Run the full suite**

Run: `cd core && npm test && cd .. && node parameters/verify.mjs`
Expected: PASS — all core tests, plus the 24 parameter checks still green.

- [ ] **Step 5: Type-check**

Run: `cd core && npx -y typescript@5 tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add core/test/golden/ core/test/golden.test.ts core/test/purity.test.ts
git commit -m "test(core): golden acceptance cases, purity guard, and no-hardcoded-parameters check"
```

---

## Done when

- [ ] `cd core && npm test` — all tests pass
- [ ] `node parameters/verify.mjs` — 24 checks still pass
- [ ] `cd core && npx tsc --noEmit` — no type errors
- [ ] The purity guard proves: no clock, no randomness, no I/O, no hardcoded T&T parameters
- [ ] Every engine result carries `provenance` with parameter effective dates, sources, rules fired, and caveats
- [ ] `computeRetirementNeeds` surfaces the increments caveat rather than guessing

## Explicitly NOT in this plan

- **No UI.** The Mode A fact-find screens are a separate plan, once the maths is trusted.
- **No RecommendationEngine / ProductCatalog / RateProvider.** The founder will walk through the real quoting process using their portal first — *do not reverse-engineer it from the rate grid.*
- **No SuitabilityRecord.** It is emitted *by* the recommendation engine, which does not exist yet.
- **No persistence.** The core is pure; storage is a later decision.
- **No CommissionCalculator.** It sits strictly downstream of a recommendation.

## Open questions this plan surfaces (for the founder)

1. **Mortgage liquidation vs. rental income for 120 months** — the plan treats them as housing alternatives. Is that right, or does the Tatil form intend both?
2. **`expectedFuneralCost` / `expectedMedicalCost`** are currently caller-supplied. Should these have T&T defaults in `conventions`?
3. **NIS survivor benefit** — `computeDeathNeeds` accepts `nisSurvivorMonthly` as an input. The real survivor-benefit calculation is a separate NIBTT rate table not yet extracted.
