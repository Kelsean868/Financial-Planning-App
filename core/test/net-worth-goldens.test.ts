/**
 * Section 3 Build C (28 Oct 2026; docs/audit/RUN-2026-10-28-section3-c.md): the net worth goldens for the samples, the
 * single cash source (the emergency fund reads the assets; no asset is typed twice), the version 1 upgrade, and the
 * catalogue labels against the facts validator. Assumption set `ff-2026-10-28-s3fix`.
 *
 * Section 3 fix run (28 Oct 2026; docs/audit/RUN-2026-10-28-section3-fix.md, Decision 11): "debts as a share of gross
 * yearly pay" (family 192%) is replaced by debt payments, including the mortgage, as a share of pay before deductions
 * (family 21.1%, against a common guide of at most 25%).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeFactFinder, validateLifeCaseFacts, upgradeLifeCaseFacts, cashFromFacts, BUDGET_CATALOGUE, QUICK_GROUP, QUICK_YEARLY_LABEL,
  HOUSING_LINE_LABELS, SAMPLE_FAMILY, SAMPLE_YOUNG_SINGLE, SAMPLE_WEEKLY_RENTER, SAMPLE_FAMILY_V1, SAMPLE_YOUNG_SINGLE_V1,
} from "../src/index.ts";
import { clone } from "./facts-helpers.ts";

const c2 = (x: number): string => x.toFixed(2);
const values = (nw: ReturnType<typeof computeFactFinder>["netWorth"]): Record<string, number> => Object.fromEntries(nw.assets.filter((a) => a.value > 0).map((a) => [a.kind, a.value]));

test("golden: net worth, sample family (§6.4)", () => {
  const n = computeFactFinder(SAMPLE_FAMILY).netWorth;
  assert.deepEqual(values(n), { bank: 20000, "pension-cash": 60000, property: 950000, vehicle: 85000, furniture: 40000 });
  assert.equal(n.assets.length, 10, "every kind is listed, in the §6.4 order");
  assert.deepEqual(n.owed.map((o) => [o.label, o.balance]), [["Mortgage", 420000], ["Credit card", 18000], ["Personal loan", 45000]]);
  assert.deepEqual([n.assetsTotal, n.owedTotal, n.netWorth], [1155000, 483000, 672000], "$1,155,000 owned, $483,000 owed");
  // Decision 11 (28 Oct 2026): debt payments, including the mortgage, as a share of pay before deductions.
  assert.deepEqual([n.loanAndCardPaymentsMonthly, n.mortgagePaymentMonthly, n.debtPaymentsMonthly], [1440, 3000, 4440], "loan and card payments $1,440 + the mortgage payment $3,000");
  assert.deepEqual([n.payBeforeDeductionsMonthly, n.debtPaymentsShareOfPay!.toFixed(4)], [21000, "0.2114"], "client $17,000 gross + partner $4,000 take-home; $4,440 is 21.1% of it");
  assert.deepEqual(n.debtPaymentsGuide, { max: 0.25, source: "PALIG net worth calculator benchmark, Loans 25%", asOf: "2026-10-28" }, "a common guide: at most 25%");
  assert.deepEqual([n.cashTotal, n.costsMonthly, c2(n.monthsCovered!)], [20000, 15140, "1.32"], "$20,000 of cash covers 1.32 months of $15,140 costs");
  assert.equal(n.partnerPayIsTakeHome, true);
});

test("golden: net worth, sample young single (§6.4)", () => {
  const n = computeFactFinder(SAMPLE_YOUNG_SINGLE).netWorth;
  assert.deepEqual(values(n), { bank: 4000, vehicle: 35000, furniture: 8000 });
  assert.deepEqual([n.assetsTotal, n.owedTotal, n.netWorth], [47000, 3000, 44000]);
  assert.deepEqual([n.debtPaymentsMonthly, n.payBeforeDeductionsMonthly, n.debtPaymentsShareOfPay!.toFixed(5)], [150, 8000, "0.01875"], "$150 card payment, no mortgage (she rents), $8,000 gross: 1.9%");
  assert.deepEqual([n.cashTotal, n.costsMonthly, c2(n.monthsCovered!)], [4000, 5450, "0.73"]);
  assert.equal(n.partnerPayIsTakeHome, false);
});

test("golden: net worth, weekly renter (no partner, one card)", () => {
  const n = computeFactFinder(SAMPLE_WEEKLY_RENTER).netWorth;
  assert.deepEqual([n.assetsTotal, n.owedTotal, n.netWorth, c2(n.payBeforeDeductionsMonthly)], [7000, 6000, 1000, "8666.67"], "$2,000 a week × 52 ÷ 12 is the usual month, not the lowest month");
  assert.equal(n.debtPaymentsShareOfPay!.toFixed(4), "0.0288", "$250 card payment over $8,666.67");
  assert.equal(c2(n.monthsCovered!), "1.12");
});

test("cash is bank + credit union + unit trusts; shares, property and the rest are not cash", () => {
  const f = clone(SAMPLE_FAMILY);
  f.assets = [{ kind: "bank", value: 1000 }, { kind: "credit-union", value: 2000 }, { kind: "unit-trust", value: 3000 }, { kind: "shares-bonds", value: 50000 }, { kind: "life-cash", value: 9000 }];
  const n = computeFactFinder(f).netWorth;
  assert.equal(n.cashTotal, 6000);
  assert.deepEqual(n.assets.filter((a) => a.cash).map((a) => a.kind), ["bank", "credit-union", "unit-trust"]);
});

test("one cash source: the emergency fund reads the assets, and the old savings field is ignored beside them", () => {
  const f = clone(SAMPLE_FAMILY);
  f.budget.savings = 999999; // a stale version 1 value must not count once there are cash rows
  const r = computeFactFinder(f);
  assert.equal(r.budget.bufferMonths, r.netWorth.monthsCovered, "the emergency fund months are the card's months covered");
  assert.equal(c2(r.budget.bufferMonths), "1.32");
  const g = clone(SAMPLE_FAMILY);
  g.assets = g.assets.map((a) => (a.kind === "bank" ? { ...a, value: 60000 } : a));
  assert.equal(c2(computeFactFinder(g).budget.bufferMonths), "3.96", "$60,000 of bank money is 3.96 months of $15,140");
});

test("version 1 savings: the upgrade makes one bank row and the engine sees the same cash", () => {
  for (const [v1, v2] of [[SAMPLE_FAMILY_V1, SAMPLE_FAMILY], [SAMPLE_YOUNG_SINGLE_V1, SAMPLE_YOUNG_SINGLE]] as const) {
    const up = upgradeLifeCaseFacts(v1);
    assert.deepEqual(up.assets, [{ kind: "bank", value: v1.budget.savings }]);
    assert.equal(up.budget.savings, 0);
    assert.equal(cashFromFacts(up), cashFromFacts(v2));
    assert.equal(computeFactFinder(v1).budget.bufferMonths, computeFactFinder(v2).budget.bufferMonths);
  }
  const none = JSON.parse(JSON.stringify(SAMPLE_FAMILY_V1)) as { budget: { savings: number } };
  none.budget.savings = 0;
  assert.deepEqual(upgradeLifeCaseFacts(none).assets, [], "no savings, no row");
});

test("a case with no cash rows falls back to the version 1 savings field; none gives 0 months", () => {
  const f = clone(SAMPLE_FAMILY);
  f.assets = [{ kind: "property", value: 100000 }];
  f.budget.savings = 5000;
  assert.equal(cashFromFacts(f), 5000);
  f.budget.savings = 0;
  const n = computeFactFinder(f).netWorth;
  assert.deepEqual([n.cashTotal, n.monthsCovered], [0, 0]);
});

test("every budget catalogue label passes the facts validator (LABEL_MAX_CHARS)", () => {
  const labels: [string, string][] = [];
  for (const g of [...BUDGET_CATALOGUE, QUICK_GROUP]) {
    labels.push([`${g.key} otherLabel`, g.otherLabel]);
    for (const l of g.lines) labels.push([`${g.key}/${l.key}`, l.label]);
  }
  for (const [k, v] of Object.entries(HOUSING_LINE_LABELS)) if (v) labels.push([`housing ${k}`, v]);
  labels.push(["quick yearly", QUICK_YEARLY_LABEL]);
  assert.ok(labels.length > 80, `${labels.length} labels checked`);
  for (const g of [...BUDGET_CATALOGUE, QUICK_GROUP]) {
    const f = clone(SAMPLE_FAMILY);
    f.budget.groups = [{ key: g.key, skip: false, total: null, totalFrequency: null, lines: [...g.lines.map((l) => ({ label: l.label, amount: 1, frequency: l.frequency })), { label: g.otherLabel, amount: 1, frequency: "monthly" as const }] }];
    assert.doesNotThrow(() => validateLifeCaseFacts(f), `group ${g.key}: every label must validate`);
  }
  const tooLong = labels.filter(([, v]) => v.length > 60);
  assert.deepEqual(tooLong, [], "no catalogue label is over 60 characters");
});
