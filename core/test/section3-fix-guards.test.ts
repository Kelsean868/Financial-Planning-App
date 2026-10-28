/**
 * Section 3 fix run (28 Oct 2026; docs/audit/RUN-2026-10-28-section3-fix.md) guard 36, sabotage-tested (§ sabotage log).
 *
 * Guard 36: one "left each month" (Decision 10). For every sample and fixture, and for a family with a $400 credit union
 * line, the budget's "$Y left" equals the surplus the stage, the safe insurance ceiling, the shortfall, the buffer build
 * and Make room use. The budget's figure is worked from its own rows (take-home less needs less saving), so a surplus
 * that forgets the saving already done fails here.
 *
 * Also the seams of Changes 4 and 5: the savings step on `closing` and the Make room plan kept in the snapshot (guard 37
 * itself, the printed plan, is in the portal: GRP test/fact-finder-section3-fix.test.mjs).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeFactFinder, computeRoomPlan, applyRoomPlan, roomPlanRecord, buildSnapshot, buildScopeStatement, findHealthKeys, savingsStep,
  stageAndCeiling, ProvenanceBuilder, SAMPLE_FAMILY, SAMPLE_YOUNG_SINGLE, SAMPLE_WEEKLY_RENTER,
  SAMPLE_FAMILY_V1, SAMPLE_YOUNG_SINGLE_V1, withChildBInUK, type FactFinderResult, type LifeCaseFacts,
} from "../src/index.ts";
import { variants } from "./ladder-cases.ts";
import { clone } from "./facts-helpers.ts";

const CENT = 0.005;
const FLOOR = 200;

/** A case with a "Saving you already do" group holding one $400 credit union line (or as a skipped total). */
function withCreditUnion(base: LifeCaseFacts, skip = false): LifeCaseFacts {
  const f = clone(base);
  const save = skip
    ? { key: "save" as const, skip: true, total: 400, totalFrequency: "monthly" as const, lines: [] }
    : { key: "save" as const, skip: false, total: null, totalFrequency: null, lines: [{ label: "Credit union shares", amount: 400, frequency: "monthly" as const }] };
  f.budget.groups = [...f.budget.groups.filter((g) => g.key !== "save"), save];
  return f;
}

function cases(): { readonly label: string; readonly facts: unknown }[] {
  return [
    { label: "sample family", facts: SAMPLE_FAMILY },
    { label: "sample young single", facts: SAMPLE_YOUNG_SINGLE },
    { label: "sample weekly renter", facts: SAMPLE_WEEKLY_RENTER },
    { label: "sample family v1", facts: SAMPLE_FAMILY_V1 },
    { label: "sample young single v1", facts: SAMPLE_YOUNG_SINGLE_V1 },
    { label: "sample family, Child B in the UK", facts: withChildBInUK(SAMPLE_FAMILY) },
    { label: "family with a $400 credit union line", facts: withCreditUnion(SAMPLE_FAMILY) },
    { label: "family with a $400 saving total (group skipped)", facts: withCreditUnion(SAMPLE_FAMILY, true) },
    { label: "young single with a $400 credit union line", facts: withCreditUnion(SAMPLE_YOUNG_SINGLE) },
    ...variants().map((facts, i) => ({ label: `ladder variant ${i}`, facts })),
    ...variants().map((facts, i) => ({ label: `ladder variant ${i} with a $400 credit union line`, facts: withCreditUnion(facts) })),
  ];
}

function checkOneLeft(r: FactFinderResult, label: string): void {
  const left = r.budgetAnalysis.leftMonthly;
  const bud = r.budget;
  assert.ok(Math.abs(left - bud.surplusMonthly) <= CENT, `${label}: the budget shows $${left.toFixed(2)} left; the stage and the ceiling use $${bud.surplusMonthly.toFixed(2)}`);
  assert.ok(Math.abs(r.budgetAnalysis.savingMonthly - bud.savingMonthly) <= CENT, `${label}: saving on the budget equals the saving taken from the surplus`);
  const { stage, ceiling } = stageAndCeiling(new ProvenanceBuilder(), {
    hhNet: bud.netPay.householdNetMonthly, surplus: left, buffer: bud.bufferMonths, expensiveDebt: bud.expensiveDebt, emergencyFundMonths: bud.emergencyFundMonths,
  });
  assert.equal(bud.stage, stage, `${label}: the stage is the one the budget's left gives`);
  assert.ok(Math.abs(bud.ceilingMonthly - ceiling) <= CENT, `${label}: the safe ceiling is the one the budget's left gives`);
  const short = !r.insuranceRange.stage0 && left < FLOOR ? FLOOR - left : 0;
  assert.ok(Math.abs(r.insuranceRange.shortByMonthly - short) <= CENT, `${label}: "$X more a month" to the $200 floor is worked from the budget's left`);
  assert.ok(Math.abs(r.closing.ladder.budgetMonthly - Math.max(0, left)) <= CENT, `${label}: the ladder shares out the budget's left`);
  assert.ok(r.buckets.payYourselfFirstMonthly <= Math.max(0, left) + CENT, `${label}: the buffer build never uses more than the budget's left`);
  const room = computeRoomPlan(r, { groupTargets: {} });
  // "Costs above income" is listed only at stage 0 (Build A D10); otherwise it needs nothing.
  const shortfall = room.defaultSplit.find((d) => d.key === "shortfall");
  assert.ok(Math.abs((shortfall?.neededMonthly ?? 0) - Math.max(0, -left)) <= CENT, `${label}: Make room's "Costs above income" is worked from the budget's left`);
}

test("guard 36: one left each month — the budget's left is the surplus the stage, ceiling, shortfall, buffer build and Make room use", () => {
  const all = cases();
  for (const { label, facts } of all) checkOneLeft(computeFactFinder(facts), label);
  assert.ok(all.length > 300, `swept ${all.length} cases`);
});

test("guard 36: a $400 credit union line lowers the left, the stage's surplus and the ceiling by the same $400", () => {
  const before = computeFactFinder(SAMPLE_FAMILY);
  const after = computeFactFinder(withCreditUnion(SAMPLE_FAMILY));
  assert.equal(after.budget.needsMonthly, before.budget.needsMonthly, "saving stays out of needs (call 3)");
  assert.ok(Math.abs(before.budget.surplusMonthly - after.budget.surplusMonthly - 400) <= CENT, "the surplus falls by $400");
  assert.ok(Math.abs(before.budgetAnalysis.leftMonthly - after.budgetAnalysis.leftMonthly - 400) <= CENT, "the budget's left falls by $400");
  assert.ok(after.budget.ceilingMonthly <= before.budget.ceilingMonthly + CENT, "the safe ceiling does not rise");
});

/* ------------------------------------------------------------------ Change 4 and Change 5 seams */

test("the savings step on closing: the first rung not reached, 0 at stage 0 (the header chip and the one-page plan read it)", () => {
  const page = (bud: { stage: number; bufferMonths: number; expensiveDebt: number }): number => {
    // Build B's page rule (GRP fact-finder-screens.js stepChip, before this run), kept here as the reference.
    if (bud.stage === 0) return 0;
    const done = [bud.bufferMonths >= 1, bud.expensiveDebt <= 0, bud.bufferMonths >= 3, bud.bufferMonths >= 6, false];
    return done.findIndex((x) => !x) + 1;
  };
  assert.equal(computeFactFinder(SAMPLE_FAMILY).closing.savingsStep, 2, "family: one month saved, expensive debt to clear");
  assert.equal(computeFactFinder(SAMPLE_YOUNG_SINGLE).closing.savingsStep, 1, "young single: under one month saved");
  for (const { label, facts } of cases()) {
    const r = computeFactFinder(facts);
    assert.equal(r.closing.savingsStep, page(r.budget), `${label}: the engine's step is the page's step`);
    assert.equal(savingsStep(r.budget), r.closing.savingsStep);
  }
});

test("the snapshot keeps a Make room plan in use inside closing: targets, split, both versions' totals", () => {
  const real = computeFactFinder(SAMPLE_FAMILY);
  const food = real.budgetAnalysis.groups.find((g) => g.key === "food")!.monthly;
  const plan = computeRoomPlan(real, { groupTargets: { food: food - 500 } });
  const facts = { ...SAMPLE_FAMILY, budget: { ...SAMPLE_FAMILY.budget, roomPlan: { groupTargets: { food: food - 500 }, split: {}, applied: true } } };
  const applied = applyRoomPlan(facts, plan);
  const withPlan = computeFactFinder(applied.facts, applied.options);
  const rec = roomPlanRecord({ plan, real, withPlan });
  assert.deepEqual(rec.groupTargets, [{ key: "food", label: "Food", todayMonthly: 2000, targetMonthly: 1500 }]);
  assert.deepEqual(rec.split.map((d) => [d.key, Math.round(d.monthly * 100) / 100]), [["buffer", 0], ["protection", 93.75], ["debt", 204.18], ["emergency", 0], ["retirement", 202.07], ["goals", 0]]);
  assert.equal(rec.freedMonthly, 500);
  assert.deepEqual([rec.real.leftMonthly, rec.withPlan.leftMonthly].map((x) => x.toFixed(2)), [real.budgetAnalysis.leftMonthly.toFixed(2), withPlan.budgetAnalysis.leftMonthly.toFixed(2)]);
  assert.deepEqual([rec.real.insuranceBudgetMonthly, rec.withPlan.insuranceBudgetMonthly].map((x) => x.toFixed(2)), ["533.13", "626.88"]);
  const scope = buildScopeStatement(withPlan.closing.gaps, []);
  const snap = buildSnapshot({ closing: withPlan.closing, scope, assumptionSetId: withPlan.assumptionSetId, engineVersion: "test", roomPlan: rec });
  assert.deepEqual(snap.closing.roomPlan, rec, "the plan is inside closing, unchanged");
  assert.equal(snap.closing.savingsStep, withPlan.closing.savingsStep);
  const without = buildSnapshot({ closing: real.closing, scope, assumptionSetId: real.assumptionSetId, engineVersion: "test" });
  assert.equal("roomPlan" in without.closing, false, "no plan in use: no roomPlan key");
  assert.deepEqual(findHealthKeys(snap), [], "the larger closing carries no health key");
  assert.throws(() => buildSnapshot({ closing: withPlan.closing, scope, assumptionSetId: "x", engineVersion: "test", roomPlan: { ...rec, healthNote: "x" } as never }), /health/i, "guard 8 still runs over the plan");
});
