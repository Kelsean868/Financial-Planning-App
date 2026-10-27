/**
 * Guard 19 — NIS 70%. Taxable pay = gross − personal allowance − 70% of the employee's NIS contribution
 * (IRD form TD1 2023, line 4(b) "N.I.S (70% of Employees Contribution)"). One PAYE case worked by hand;
 * every number is written out so a reader can check it without the engine.
 * Re-baseline record: docs/audit/RUN-2026-10-27-fix-nis70.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeNetPay, resolveCoreRow, SAMPLE_YOUNG_SINGLE } from "../src/index.ts";

test("the NIS deductible share is a 70% row with its IRD source and date", () => {
  const r = resolveCoreRow("core:ff.tax.nisDeductibleShare");
  assert.equal(r.value, 0.7);
  assert.equal(r.status, "verified");
  assert.match(r.source, /IRD form TD1 2023, line 4\(b\)/);
  assert.equal(r.asOf, "2026-10-27");
});

test("hand-worked PAYE: $8,000 a month, age 24, pays NIS (the young single)", () => {
  // NIS, employee share:        5.4% x min($8,000, $13,600 ceiling)   = $432.00 a month = $5,184.00 a year
  // NIS deductible, 70%:        0.70 x $5,184.00                      = $3,628.80 a year
  // Deduction cap:              min($60,000, $3,628.80)               = $3,628.80
  // Chargeable income:          $96,000 - $90,000 allowance - $3,628.80 = $2,371.20 a year
  // PAYE:                       25% x $2,371.20                       = $592.80 a year = $49.40 a month
  // Health surcharge:           $8.25 a week x 52 / 12                = $35.75 a month
  // Net pay:                    $8,000 - $432.00 - $35.75 - $49.40    = $7,482.85 a month
  // (At 100% the chargeable income was $816.00 and PAYE $17.00 a month: $32.40 a month less tax.)
  const n = computeNetPay(SAMPLE_YOUNG_SINGLE);
  assert.equal(n.grossMonthly, 8000);
  assert.ok(Math.abs(n.nisMonthly - 432) < 1e-9, `NIS ${n.nisMonthly}`);
  assert.ok(Math.abs(n.payeMonthly - 49.4) < 1e-9, `PAYE ${n.payeMonthly}, hand-worked 49.40 (100% NIS gives 17.00)`);
  assert.ok(Math.abs(n.healthSurchargeMonthly - 35.75) < 1e-9, `health surcharge ${n.healthSurchargeMonthly}`);
  assert.ok(Math.abs(n.netMonthly - 7482.85) < 1e-9, `net ${n.netMonthly}, hand-worked 7,482.85`);
  assert.ok(Math.abs(n.deductionHeadroomAnnual - (60000 - 3628.8)) < 1e-9, `headroom ${n.deductionHeadroomAnnual}`);
});
