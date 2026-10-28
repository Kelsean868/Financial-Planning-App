/**
 * Section 3 Build A goldens (28 Oct 2026; docs/audit/RUN-2026-10-28-section3-a.md §7). One per new function, as the brief
 * asks: the retirement working, a weekly-paid case, a rent case, a payoff-date mismatch, a Make room default split.
 * Assumption set `ff-2026-10-28-s3fix`. Each moves only with a recorded re-baseline. Fix run (28 Oct 2026, Decision 10):
 * the weekly renter's $300 saving is no longer money left, so its save-per-payday and ceiling moved (fix run record).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeFactFinder, computeRoomPlan, SAMPLE_FAMILY, SAMPLE_YOUNG_SINGLE, SAMPLE_WEEKLY_RENTER } from "../src/index.ts";

const c = (x: number): string => x.toFixed(2);

test("golden: the retirement working, sample family (§9)", () => {
  const x = computeFactFinder(SAMPLE_FAMILY).retirementFigure;
  assert.deepEqual([x.retireYear, x.yearsToRetirement, c(x.takeHomeMonthly), c(x.incomeRuleMonthly)], [2053, 27, "17983.37", "12588.36"], "A: 70% of $17,983.37");
  assert.deepEqual(x.stops.map((s) => [s.kind, s.monthly, s.endsYear]), [["mortgage", 3000, 2044], ["kids", 800, null], ["care", 4000, 2043], ["debts", 1440, null]]);
  assert.deepEqual([c(x.spendingMonthly), c(x.stopsMonthly), c(x.lifestyleRuleMonthly)], ["15140.00", "9240.00", "5900.00"], "B: $15,140 less $9,240 that stops");
  assert.equal(x.rule, "income");
  assert.equal(x.factor.toFixed(4), "2.2213", "3.0% for 27 years");
  assert.equal(Math.round(x.atRetirementMonthly), 27962, "plan for about $27,962 a month in 2053");
  assert.deepEqual([c(x.pensionsTodayMonthly), c(x.gapTodayMonthly), Math.round(x.gapAtRetirementMonthly)], ["5500.00", "7088.36", 15745]);
  assert.equal(x.wantBelowRecommended, true, "the $8,000 want is below the recommended figure");
});

test("golden: a weekly-paid case, pay changes and two groups skipped (§2, §1.2, §5.2)", () => {
  const r = computeFactFinder(SAMPLE_WEEKLY_RENTER);
  const p = r.pay;
  assert.deepEqual([p.client.paysPerYear, c(p.client.usualMonthly), c(p.client.planMonthly)], [52, "8666.67", "7500.00"], "$2,000 a week; the plan uses the $7,500 lowest month");
  assert.deepEqual([c(r.budget.netPay.nisMonthly), c(r.budget.netPay.netMonthly), c(p.goodMonthNetMonthly!)], ["405.00", "7059.25", "7953.15"], "take-home on the lowest month, and in a good month");
  assert.deepEqual([c(p.takeHomePerPay), c(p.savePerPay), p.planPaysPerMonth, p.extraPaysPerYear], ["1629.06", "118.29", 4, 4], "save $118 every payday (money left after the $300 already saved, Decision 10); plan on 4 pays");
  assert.deepEqual(r.budgetAnalysis.estimatedGroups, ["fun", "other"], "two groups skipped, marked estimated");
  assert.deepEqual([c(r.budget.needsMonthly), c(r.budgetAnalysis.savingMonthly), c(r.budgetAnalysis.leftMonthly)], ["6246.67", "300.00", "512.58"]);
  assert.deepEqual([c(r.budget.savingMonthly), c(r.budget.surplusMonthly)], ["300.00", "512.58"], "one left each month: the stage and the ceiling use the $512.58 the budget shows (Decision 10)");
  assert.deepEqual([r.budget.stage, c(r.budget.ceilingMonthly), c(r.budget.band.recommended)], [2, "128.15", "96.11"]);
  assert.deepEqual([c(r.closing.ladder.insuranceCapMonthly), r.closing.ladder.aboveSafeRange], ["200.00", true], "the floor lifts the $96 recommended figure to $200, above the $128 safe ceiling (§5.3 note)");
});

test("golden: a rent case, the young single (§6.1, §9: rent never stops)", () => {
  const r = computeFactFinder(SAMPLE_YOUNG_SINGLE);
  const home = r.budgetAnalysis.groups.find((g) => g.key === "home")!;
  assert.deepEqual([home.monthly, home.share!.toFixed(4), home.status, c(home.aboveByMonthly)], [2500, "0.3341", "above", "255.14"], "rent is 33% of take-home, $255 above the 30% top");
  assert.deepEqual([home.guide!.min, home.guide!.max, home.guide!.asOf], [0.25, 0.3, "2026-10-28"]);
  assert.deepEqual(r.budgetAnalysis.gaps.map((g) => [g.key, c(g.aboveByMonthly)]), [["home", "255.14"]]);
  const x = r.retirementFigure;
  assert.deepEqual([c(x.incomeRuleMonthly), c(x.lifestyleRuleMonthly), x.rule, x.factor.toFixed(4), Math.round(x.atRetirementMonthly)], ["5237.99", "5300.00", "lifestyle", "3.3599", 17807],
    "the rent carries into retirement, so B ($5,300) beats A; $17,807 a month in 2067");
});

test("golden: payoff dates and a payoff-date mismatch (§7.2, §7.4)", () => {
  const w = computeFactFinder(SAMPLE_WEEKLY_RENTER, { asOfMonth: "2026-10" }).debtPayoff;
  assert.deepEqual([w.debts[0]!.months, w.debts[0]!.payoffMonth, w.debts[0]!.endDate, w.debts[0]!.endDateDiffMonths, w.debts[0]!.mismatch], [34, "2029-08", "2028-06", 14, true],
    "You said June 2028; at this payment it ends August 2029");
  const f = computeFactFinder(SAMPLE_FAMILY, { asOfMonth: "2026-10" }).debtPayoff;
  assert.deepEqual(f.debts.map((d) => [d.label, d.months, d.payoffMonth, d.mismatch]), [["Credit card", 56, "2031-06", false], ["Personal loan", 76, "2033-02", false]]);
  assert.deepEqual([f.debtFree.minimumsOnly.month, f.debtFree.highestRateFirst.month, f.debtFree.smallestBalanceFirst.month], ["2033-02", "2030-02", "2030-02"]);
  assert.equal(computeFactFinder(SAMPLE_FAMILY).debtPayoff.asOfMonth, "2026-01", "without asOfMonth: January of the facts' year, and it says so");
  assert.equal(computeFactFinder(SAMPLE_FAMILY).debtPayoff.asOfMonthAssumed, true);
});

test("golden: a Make room default split, sample family, $500 freed from Food (§6.3)", () => {
  const r = computeFactFinder(SAMPLE_FAMILY, { asOfMonth: "2026-10" });
  const p = computeRoomPlan(r, { groupTargets: { food: 1500 } });
  assert.equal(p.freedMonthly, 500);
  assert.deepEqual(p.defaultSplit.map((d) => [d.step, d.key, c(d.monthly)]), [
    [1, "buffer", "0.00"], [2, "protection", "93.75"], [3, "debt", "204.18"], [4, "emergency", "0.00"], [5, "retirement", "202.07"], [5, "goals", "0.00"],
  ]);
  const e = p.effects;
  assert.deepEqual([c(e.insuranceBudgetBeforeMonthly), c(e.insuranceBudgetMonthly), c(e.debtExtraMonthly)], ["533.13", "626.88", "804.18"]);
  assert.deepEqual(e.debtTarget, { index: 0, label: "Credit card", payoffBefore: "2028-06", payoffAfter: "2028-02" }, "the card clears four months sooner");
  assert.equal(c(p.notGivenAJobMonthly), "0.00");
});
