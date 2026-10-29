/**
 * The secondary modules against the prototype v17's own output for its two samples (its model and
 * its renderVals, run in scratch on 27 Oct 2026; run record §6). Not §2.8 goldens: these pin the port.
 * Where the engine deliberately differs from the prototype, the test says so and why.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeFactFinder, computeStartEarly, computeLovedOnes, computeBusiness,
  SAMPLE_FAMILY, SAMPLE_YOUNG_SINGLE, SAMPLE_LOVED_ONE, SAMPLE_BUSINESS,
} from "../src/index.ts";

const R = Math.round;
const k = (x: number): number => R(x / 1000);

test("health score: family 33 'Needs work', young single 51 'Getting there' (prototype parts)", () => {
  const fam = computeFactFinder(SAMPLE_FAMILY).healthScore;
  assert.equal(fam.score, 33);
  assert.equal(fam.label, "Needs work");
  assert.deepEqual(fam.parts.map((p) => R(p.points)), [6, 4, 8, 14, 0]);
  const young = computeFactFinder(SAMPLE_YOUNG_SINGLE).healthScore;
  assert.equal(young.score, 51);
  assert.equal(young.label, "Getting there");
  assert.deepEqual(young.parts.map((p) => R(p.points)), [11, 2, 19, 18, 1]);
});

// One-allocator fix (Kyron, Decision 3 = A, 27 Oct 2026; docs/audit/RUN-2026-10-27-fix-one-allocator.md): the
// Protection group is the closing ladder's insurance items, not a weighted split. The prototype no longer applies to
// Protection. Savings plans are unchanged (fence F-13).
// Fix run 3 (Kyron, Decisions 5, 6 and 7 = A, 27 Oct 2026; docs/audit/RUN-2026-10-27-fix-ladder-advice.md): the cap is
// the band's recommended figure, not the ceiling; Tier 1 is life, CI, parent funerals; no ruin-level life cover without
// dependants; life cover follows each loan goal.
test("insurance budget, young single: the ladder at the $281 recommended; CI only, three plans wait", () => {
  const [prot, sav] = computeFactFinder(SAMPLE_YOUNG_SINGLE).insuranceBudget.groups;
  // Was term 150 and CI 224.14 of the $374 ceiling. Now: no one depends on her, so no term life to the ruin level;
  // CI takes its $150 minimum, then the rest of the $280.61 cap in pass two. Cashbuilder II ($300) and the two loan
  // covers (term, $150 minimum each) do not fit and wait.
  assert.equal(prot.totalMonthly.toFixed(2), "280.61");
  assert.deepEqual(prot.funded.map((p) => [p.key, p.monthly.toFixed(2)]), [["critical-illness", "280.61"]]);
  assert.deepEqual(prot.notYet.map((p) => [p.product, R(p.needsMonthly)]), [["cashbuilder-ii", 300], ["term", 150], ["term", 150]]);
  assert.equal(prot.notYet[0]!.riders[0]!.underwriting, "Medical at any amount");
  assert.equal(prot.notYet[1]!.why, "Your lender will want this from year 2. It costs about $150 a month if you start now.");
  assert.deepEqual(sav.funded.map((p) => [p.key, R(p.monthly)]), [["annuity", 361], ["endowment", 387]]);
});

test("insurance budget, family: the ladder at the $533 recommended; the parents' funerals wait", () => {
  const [prot, sav] = computeFactFinder(SAMPLE_FAMILY).insuranceBudget.groups;
  // Was term 238.83, the father's funeral 293.45 and the mother's 178.56 of the $711 ceiling; CI and Cashbuilder II
  // waited. Then, at the $533.13 cap in the order life, CI, funerals: term $238.83 and CI $294.30.
  // Real rates (29 Oct 2026): term $297.29, then CI's $154.44 minimum topped up to $235.84 in pass two.
  // The father ($262.88), the mother ($180.12) and Cashbuilder II ($300) wait.
  assert.equal(prot.totalMonthly.toFixed(2), "533.13");
  assert.deepEqual(prot.funded.map((p) => [p.product, p.monthly.toFixed(2)]), [["term", "297.29"], ["life-span-gold", "235.84"]]);
  assert.deepEqual(prot.notYet.map((p) => [p.product, p.needsMonthly.toFixed(2)]), [["rest-assured-ii", "262.88"], ["rest-assured-ii", "180.12"], ["cashbuilder-ii", "300.00"]]);
  assert.equal(prot.note.split(" Not yet:")[0], "Your safe range is $355 to $711. We plan to $533, the recommended amount, and fund plans in priority order.");
  assert.deepEqual(sav.funded.map((p) => [p.key, R(p.monthly)]), [["annuity", 872], ["endowment", 926]]);
});

test("start early: prototype defaults ($500 a month, balanced 5%, 10 years' delay)", () => {
  const fam = computeStartEarly({ age: 38, monthly: 500, returnKind: "balanced", delayYears: 10, paysTax: true });
  assert.deepEqual([k(fam.valueStartNow), k(fam.valueStartLater), k(fam.costOfWaiting), R(fam.incomeForLifeMonthly)], [212, 121, 92, 531]);
  const young = computeStartEarly({ age: 24, monthly: 500, returnKind: "balanced", delayYears: 10, paysTax: true });
  assert.deepEqual([k(young.valueStartNow), k(young.valueStartLater), k(young.costOfWaiting), R(young.incomeForLifeMonthly)], [374, 254, 120, 935]);
  assert.equal(computeStartEarly({ age: 30, monthly: 150, returnKind: "bank", delayYears: 5, paysTax: false }).losesToInflation, true);
  assert.equal(computeStartEarly({ age: 30, monthly: 150, returnKind: "bank", delayYears: 5, paysTax: false }).belowDestinyMinimum, true);
});

test("loved ones: a grandchild aged 3 on $300 — Goldspoon and children's whole life at $150 each", () => {
  const lv = computeLovedOnes(SAMPLE_LOVED_ONE);
  assert.deepEqual(lv.ones[0]!.plans.map((p) => [p.product, R(p.monthly), p.status]), [["goldspoon", 150, "funded"], ["whole-life", 150, "funded"]]);
  const older = computeLovedOnes({ ...SAMPLE_LOVED_ONE, ones: [{ ...SAMPLE_LOVED_ONE.ones[0]!, age: 13 }] });
  assert.equal(older.ones[0]!.plans[0]!.product, "endowment", "Goldspoon is for ages 1–12 only");
  const elder = computeLovedOnes({ ...SAMPLE_LOVED_ONE, aims: { save: false, life: false, funeral: true, retire: false }, ones: [{ personId: SAMPLE_LOVED_ONE.ones[0]!.personId, age: 82, relation: "elder" }] });
  assert.equal(elder.ones[0]!.plans[0]!.product, null, "Rest Assured II starts only up to 80");
});

test("business: the prototype's default company", () => {
  const bz = computeBusiness(SAMPLE_BUSINESS);
  assert.deepEqual(bz.needs.map((n) => [n.tag, n.amount]), [
    ["BUY-SELL AGREEMENT", 1500000], ["KEY PERSON", 1200000], ["BUSINESS LOANS", 300000], ["OVERHEADS", 480000],
    ["YOUR STAFF", null], ["YOUR RETIREMENT", null], ["PROPERTY AND LIABILITY", null],
  ]);
  assert.equal(computeBusiness({ ...SAMPLE_BUSINESS, type: "sole", owners: 1 }).needs[0]!.tag, "KEY PERSON", "no buy-sell for a sole trader");
  for (const key of Object.keys(SAMPLE_BUSINESS)) assert.ok(bz.whyAsked[key as keyof typeof SAMPLE_BUSINESS], `why ${key} is asked`);
});

test("goals, young single: house and car as the prototype", () => {
  const g = computeFactFinder(SAMPLE_YOUNG_SINGLE).goals;
  const house = g.plans.find((p) => p.kind === "home")!;
  assert.equal(R(house.monthlySaving), 1618);
  assert.deepEqual([k(house.home!.loan), house.home!.termYears, R(house.home!.monthlyPayment), R(house.home!.affordableMonthly), house.home!.fits], [765, 30, 4587, 2650, false]);
  assert.equal(house.home!.stampDutyReliefPossible, true, "under $2M");
  const car = g.plans.find((p) => p.kind === "vehicle")!;
  assert.equal(R(car.monthlySaving), 253);
  assert.deepEqual([car.car!.loan, car.car!.termYears, R(car.car!.monthlyPayment), R(car.car!.totalInterest), car.car!.underwaterYears], [150000, 8, 2083, 49928, 5]);
});

test("debts, family: payoff months and interest as the prototype", () => {
  const d = computeFactFinder(SAMPLE_FAMILY).debts;
  assert.deepEqual([d.payoff.minimumsOnly.months, d.payoff.avalanche.months, d.payoff.snowball.months], [68, 40, 40]);
  assert.ok(Math.abs(d.payoff.avalanche.interest - 17910.38759943865) < 1e-6);
  assert.deepEqual(d.summary.expensiveOrder.map((x) => x.label), ["Credit card", "Personal loan"]);
});

test("retirement, family: floor $5,500, gap $2,500, Destiny Registered", () => {
  const r = computeFactFinder(SAMPLE_FAMILY).retirement;
  assert.equal(r.floorMonthly, 5500);
  assert.equal(r.gapMonthly, 2500);
  assert.ok(Math.abs(r.saveMonthly - 3251.352572253299) < 1e-6);
  assert.equal(r.routing.mode, "registered");
  assert.ok(Math.abs(r.reliefAnnual - 9754.057716759897) < 1e-6);
  assert.equal(r.stress.length, 3, "stressed against each Destiny floor");
});

test("death need cross-check: the Tatil standard formula as the prototype", () => {
  const m = computeFactFinder(SAMPLE_FAMILY).deathNeed.methods;
  assert.deepEqual(m.map((x) => [x.key, R(x.value)]), [
    ["stack", 1994846], ["tatil", 2728600], ["retention", 1948000], ["spend-down", 1584186], ["dime", 2803000], ["age-multiple", 6120000], ["attic", 1428000],
  ]);
});
