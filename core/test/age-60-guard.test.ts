/**
 * Guard G7 of the real-life-rates spec (2026-10-29): the age-60 crash.
 *
 * From 60 the client pays no NIS, so a case with no pay entered has a household take-home of exactly $0
 * (under 60 it is -$20.80, because NIS is still charged). With no costs entered either, the budget step
 * worked out `needs / hhNet` = 0 / 0 = NaN, the health score scored NaN, `labels.find(...)` found nothing,
 * and `.label` threw. `computeFactFinder` threw with it, and the portal replaced every screen but Start
 * with "The figures cannot be worked out" — so the pay could never be entered
 * (General-Rater-Portal docs/audit/RUN-2026-10-28-life-rate-engine.md, Option B).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeFactFinder, computeHealthScore, SAMPLE_YOUNG_SINGLE } from "../src/index.ts";
import { clone, setGross, type Mutable } from "./facts-helpers.ts";
import type { LifeCaseFacts } from "../src/life-case-facts.ts";

/**
 * A case with a client of this age, no pay and no costs: the shape that used to throw. The young single
 * fixture is the base because it has no partner, no children and no parents, so nothing else adds a need.
 */
function blankAt(age: number, oneCost = 0): Mutable<LifeCaseFacts> {
  const f = clone(SAMPLE_YOUNG_SINGLE);
  f.client.age = age;
  f.goals = [];
  f.existingCover = [];
  f.debts = { items: [], extraMonthly: 0 };
  setGross(f, 0);
  f.budget = {
    ...f.budget,
    savings: 0,
    groups: f.budget.groups.map((g) => ({
      ...g,
      total: g.total === null ? null : 0,
      lines: g.lines.map((l) => ({ ...l, amount: 0 })),
    })),
  };
  if (oneCost > 0) {
    const food = f.budget.groups.findIndex((g) => g.key === "food");
    f.budget.groups[food]!.lines[0]!.amount = oneCost;
    f.budget.groups[food]!.lines[0]!.frequency = "monthly";
  }
  return f;
}

test("G7: a blank case at 60, 65 and 70 works the figures out instead of throwing", () => {
  for (const age of [60, 65, 70]) {
    const r = computeFactFinder(blankAt(age));
    assert.ok(Number.isFinite(r.budget.needsRatio), `age ${age}: needsRatio is a number, was ${r.budget.needsRatio}`);
    assert.ok(Number.isFinite(r.healthScore.score), `age ${age}: the score is a number`);
    assert.ok(r.healthScore.label.length > 0, `age ${age}: the score has a label`);
  }
});

test("G7: no take-home and no needs is not over budget", () => {
  const r = computeFactFinder(blankAt(60));
  assert.equal(r.budget.netPay.householdNetMonthly, 0, "no NIS at 60, so take-home is exactly $0");
  assert.equal(r.budget.needsMonthly, 0, "no costs entered");
  assert.equal(r.budget.needsRatio, 0, "0 / 0 is not a household spending all its money");
});

test("G7: a cost with no take-home is still over budget", () => {
  const r = computeFactFinder(blankAt(60, 500));
  assert.equal(r.budget.needsRatio, Infinity, "needs with no income is as over budget as it gets");
  assert.ok(Number.isFinite(r.healthScore.score), "and the score still works out");
});

test("G7 sabotage: the health score refuses a label it cannot find", () => {
  // A guard that cannot fail is not a guard. Feed the score a NaN part directly: before the fix this threw
  // "Cannot read properties of undefined (reading 'label')"; now it scores 0 and reads "Needs work".
  const r = computeFactFinder(blankAt(60));
  const poisoned = computeHealthScore({
    budget: { ...r.budget, needsRatio: NaN },
    deathNeed: r.deathNeed,
    retirement: r.retirement,
    savings: 0,
  });
  assert.equal(poisoned.score, 0, "a NaN part scores 0");
  assert.equal(poisoned.label, "Needs work", "and takes the from-0 label");
});
