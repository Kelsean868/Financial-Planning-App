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
