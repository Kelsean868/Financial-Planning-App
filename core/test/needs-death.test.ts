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
  housingStrategy: "liquidate-mortgage",
  educationCost: 150000, expectedFuneralCost: 40000, expectedMedicalCost: 10000,
};

const TODAY = "2026-07-16";

/* ------------------------------------------------------------------ housing */

test("liquidate-mortgage: the mortgage is cleared and no rent is replaced", () => {
  const n = computeDeathNeeds(owner, TODAY);
  assert.equal(n.mortgageLiquidation, 350000);
  assert.equal(n.housingRentReplacement, 0);
});

test("replace-rent: 120 months of rent, no mortgage liquidation", () => {
  const renter: Household = {
    ...owner, debts: [owner.debts[1]!],
    housingStrategy: "replace-rent", monthlyRent: 4000,
  };
  const n = computeDeathNeeds(renter, TODAY);
  assert.equal(n.mortgageLiquidation, 0);
  assert.equal(n.housingRentReplacement, 480000, "4000 x 120 months");
});

test("both: mortgage liquidation and rent replacement are ADDITIVE", () => {
  // The case the old `owns = mortgage > 0` inference could not express: a mortgage
  // on one property while paying rent on another. Founder-confirmed 2026-07-17.
  const dual: Household = { ...owner, housingStrategy: "both", monthlyRent: 4000 };
  const n = computeDeathNeeds(dual, TODAY);
  assert.equal(n.mortgageLiquidation, 350000);
  assert.equal(n.housingRentReplacement, 480000);
  assert.ok(n.provenance.rulesFired.some((r) => r.includes("ADDITIVE")),
    "the additive treatment must be stated in the audit trail, not left implicit");
});

test("none: no housing provision at all, even with a mortgage on file", () => {
  const n = computeDeathNeeds({ ...owner, housingStrategy: "none" }, TODAY);
  assert.equal(n.mortgageLiquidation, 0);
  assert.equal(n.housingRentReplacement, 0);
  assert.ok(n.provenance.rulesFired.some((r) => r.includes("no provision requested")));
});

test("housing is never inferred from the mortgage balance", () => {
  // A mortgage-free owner who rents elsewhere. The old inference read `mortgage > 0`
  // as "owns" and would have silently dropped the rent need.
  const mortgageFreeButRenting: Household = {
    ...owner, debts: [owner.debts[1]!],
    housingStrategy: "replace-rent", monthlyRent: 4000,
  };
  const n = computeDeathNeeds(mortgageFreeButRenting, TODAY);
  assert.equal(n.housingRentReplacement, 480000, "rent must be funded regardless of mortgage state");
});

test("a housing strategy with no matching data is caveated, not silently zeroed", () => {
  const noRent = computeDeathNeeds({ ...owner, housingStrategy: "replace-rent" }, TODAY);
  assert.equal(noRent.housingRentReplacement, 0);
  assert.ok(noRent.provenance.caveats.some((c) => c.includes("no monthlyRent is recorded")));

  const noMortgage = computeDeathNeeds({ ...owner, debts: [owner.debts[1]!] }, TODAY);
  assert.equal(noMortgage.mortgageLiquidation, 0);
  assert.ok(noMortgage.provenance.caveats.some((c) => c.includes("no mortgage debt is recorded")));
});

/* ------------------------------------------------- funeral default & medical floor */

test("funeral cost defaults when the client gives no figure, but a stated figure wins", () => {
  const { expectedFuneralCost: _omitted, ...noFuneral } = owner;
  const n = computeDeathNeeds(noFuneral, TODAY);
  assert.equal(n.funeral, 50000, "conventions.funeral_cost_default");
  assert.ok(n.provenance.rulesFired.some((r) => r.includes("funeral cost defaulted")));

  // A DEFAULT, not a floor — it must yield in BOTH directions.
  assert.equal(computeDeathNeeds({ ...owner, expectedFuneralCost: 20000 }, TODAY).funeral, 20000);
  assert.equal(computeDeathNeeds({ ...owner, expectedFuneralCost: 90000 }, TODAY).funeral, 90000);
});

test("medical cost is a FLOOR — a lower client estimate does not win", () => {
  // The fixture states 10,000. Clients systematically underestimate final illness costs,
  // and understating is the direction that leaves the family short.
  const n = computeDeathNeeds(owner, TODAY);
  assert.equal(n.medical, 100000, "conventions.medical_cost_minimum overrides the stated 10,000");
  assert.ok(n.provenance.rulesFired.some((r) => r.includes("below the floor")),
    "overriding the client's own number must be visible in the audit trail");

  const { expectedMedicalCost: _omitted, ...noMedical } = owner;
  assert.equal(computeDeathNeeds(noMedical, TODAY).medical, 100000);

  // Above the floor, the client's figure stands.
  assert.equal(computeDeathNeeds({ ...owner, expectedMedicalCost: 250000 }, TODAY).medical, 250000);
});

/* ------------------------------------------------------- income continuation */

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

/* ------------------------------------------------------- NIS survivors' benefit */

test("NIS survivors' benefit reduces the income-continuation need", () => {
  const without = computeDeathNeeds(owner, TODAY);
  const with_ = computeDeathNeeds(owner, TODAY, { nisSurvivorMonthly: 1000 });
  assert.ok(with_.incomeContinuation < without.incomeContinuation);
  assert.ok(with_.provenance.rulesFired.some((r) => r.includes("NIS survivors' benefit of 1000")));
});

test("an UNSUPPLIED survivors' benefit is caveated — silence would overstate the need", () => {
  const n = computeDeathNeeds(owner, TODAY);
  assert.ok(n.provenance.caveats.some((c) => c.includes("OVERSTATES")),
    "treating an unknown resource as zero inflates the sale — it must be declared");
});

test("an EXPLICIT nil survivors' benefit is a finding, not an omission", () => {
  const n = computeDeathNeeds(owner, TODAY, { nisSurvivorMonthly: 0 });
  assert.ok(!n.provenance.caveats.some((c) => c.includes("OVERSTATES")),
    "'we checked, it is nil' must not carry the 'we did not check' caveat");
  assert.ok(n.provenance.rulesFired.some((r) => r.includes("confirmed as nil")));
});

/* ------------------------------------------------------------------ provenance */

test("provenance records the T&T conventions used and contains no estate-tax driver", () => {
  const n = computeDeathNeeds(owner, TODAY);
  const paths = n.provenance.parameters.map((p) => p.path);
  assert.ok(paths.includes("conventions.income_continuation_to_age"));
  assert.ok(paths.includes("conventions.funeral_cost_default"));
  assert.ok(paths.includes("conventions.medical_cost_minimum"));
  assert.ok(!JSON.stringify(n).toLowerCase().includes("estate_tax"),
    "T&T has no estate tax — the US liquidity driver must not appear");
});

test("rental_income_months is recorded only when it actually multiplies into the total", () => {
  const ownerPaths = computeDeathNeeds(owner, TODAY).provenance.parameters.map((p) => p.path);
  assert.ok(!ownerPaths.includes("conventions.rental_income_months"),
    "a parameter that never influenced the number must not be claimed as used");

  const renter: Household = { ...owner, housingStrategy: "replace-rent", monthlyRent: 4000 };
  const renterPaths = computeDeathNeeds(renter, TODAY).provenance.parameters.map((p) => p.path);
  assert.ok(renterPaths.includes("conventions.rental_income_months"));
});

test("deterministic — identical inputs give byte-identical output", () => {
  assert.equal(
    JSON.stringify(computeDeathNeeds(owner, TODAY)),
    JSON.stringify(computeDeathNeeds(owner, TODAY))
  );
});
