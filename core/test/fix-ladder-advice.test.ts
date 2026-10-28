/**
 * Fix run 3 (Kyron, 27 Oct 2026: Decisions 1, 5, 6 and 7 = A; docs/audit/RUN-2026-10-27-fix-ladder-advice.md).
 *
 * Guard 23: insurance allocated is never above the band's recommended figure (the cap).
 * Guard 24: no funded ladder item breaks its product's issue ages, judged on the insured's rated age (age next
 *           birthday); a loan cover written on term must also be issuable at the goal date.
 * Guard 25: the close screen's life package (`chosen.basket`) costs exactly what the ladder gives life-ruin and
 *           life-beyond-ruin, to the cent, on the same product.
 * Plus the brief's two expected-result rows, Change 3 (ruin-level life only with dependants) and Change 4 (loan cover).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeFactFinder, parentAge, TATIL_PRODUCTS, SAMPLE_FAMILY, SAMPLE_YOUNG_SINGLE, type FactFinderResult, type ProductId,
} from "../src/index.ts";
import { clone, eachCase, variants, CENT } from "./ladder-cases.ts";

const money2 = (x: number): string => x.toFixed(2);

/** Guard 23 (F-18): insurance is never above the cap in use: the slider's amount when given, else the recommended figure. */
export function assertWithinCap(r: FactFinderResult, label: string, budgetMonthly?: number): void {
  const cap = r.budget.stage === 0 ? 0 : budgetMonthly ?? r.budget.band.recommended;
  assert.ok(r.closing.ladder.insuranceAllocated <= cap + 1e-9, `${label}: insurance allocated ${r.closing.ladder.insuranceAllocated} is above the cap in use ${cap}`);
  assert.ok(r.insuranceBudget.groups[0].totalMonthly <= cap + 1e-9, `${label}: the Protection total ${r.insuranceBudget.groups[0].totalMonthly} is above the cap in use ${cap}`);
  assert.ok(r.buckets.protection <= cap + 1e-9, `${label}: the budget card's Protection bucket ${r.buckets.protection} is above the cap in use ${cap}`);
}

/** Issue ages from the product table, on rated age: worked out here, not by the engine's own check. */
function issuableAt(product: ProductId, age: number): boolean {
  const { min, max } = TATIL_PRODUCTS[product].value.issueAge;
  const rated = age + 1;
  return (min === null || rated >= min) && (max === null || rated <= max);
}

export function assertIssueAges(r: FactFinderResult, label: string): void {
  const age = r.facts.client.age;
  for (const it of r.closing.ladder.items) {
    if (!it.insurance || it.allocated <= 0) continue;
    assert.ok(it.product, `${label}: ${it.label} has no product`);
    const parent = r.facts.parents.find((p) => it.key === `parent-funeral:${p.personId}`);
    const insuredAge = parent ? parentAge(parent, r.facts.asOfYear) : age;
    assert.ok(issuableAt(it.product!, insuredAge), `${label}: ${it.label} is on ${it.product}, which cannot be issued at rated age ${insuredAge + 1}`);
    const goal = r.goals.plans.find((p) => it.key === `loan-cover:${p.goalId}`);
    if (goal && it.product === "term") assert.ok(issuableAt("term", age + goal.years), `${label}: ${it.label} is term, which cannot be issued at rated age ${age + goal.years + 1} at the goal date`);
  }
}

export function assertBasketIsLadder(r: FactFinderResult, label: string): void {
  const life = r.closing.ladder.items.filter((i) => i.key === "life-ruin" || i.key === "life-beyond-ruin");
  const want = life.reduce((a, i) => a + i.allocated, 0);
  const bk = r.closing.chosen.basket;
  assert.ok(Math.abs(bk.totalMonthly - want) < CENT, `${label}: the basket's life premium is ${bk.totalMonthly}, the ladder's life allocation is ${want}`);
  assert.ok(Math.abs(bk.items.reduce((a, x) => a + x.premiumMonthly, 0) - want) < CENT, `${label}: the basket's items add to the ladder's life allocation`);
  const ruin = life.find((i) => i.key === "life-ruin");
  for (const x of bk.items) assert.equal(x.product, ruin?.product, `${label}: the basket is written on the ladder's life product`);
}

test("guard 23: insurance allocated is never above the cap in use (the slider, else the recommended figure)", () => {
  const fam = computeFactFinder(SAMPLE_FAMILY);
  assert.equal(money2(fam.closing.ladder.insuranceCapMonthly), money2(fam.budget.band.recommended), "with no slider amount the cap is the recommended figure");
  assert.equal(money2(fam.closing.ladder.insuranceCeilingMonthly), money2(fam.budget.ceilingMonthly), "the ceiling stays on the result");
  assertWithinCap(fam, "sample family");
  let n = eachCase((r, label) => assertWithinCap(r, label));
  for (const f of variants()) {
    const { band, stage } = computeFactFinder(f).budget;
    if (stage === 0) continue;
    for (const cap of [band.floor, (band.floor + band.recommended) / 2, band.ceiling]) {
      for (const pkg of ["essential", "recommended", "full"] as const) {
        const r = computeFactFinder(f, { package: pkg, budgetMonthly: cap });
        assert.equal(r.closing.ladder.insuranceCapMonthly, cap, "the slider's amount is the cap");
        assertWithinCap(r, `${pkg} at ${money2(cap)}`, cap);
        n++;
      }
    }
  }
  assert.ok(n > 1000, `${n} cases checked`);
});

test("guard 24: no funded ladder item breaks its product's issue ages (rated age)", () => {
  let funded = 0;
  const n = eachCase((r, label) => { assertIssueAges(r, label); funded += r.closing.ladder.items.filter((i) => i.insurance && i.allocated > 0).length; });
  assert.ok(n > 400 && funded > 1000, `${n} cases, ${funded} funded insurance items checked`);
});

test("guard 24 fixture: a client of rated age 66 gets whole life to the ruin level, not term", () => {
  const f = clone(SAMPLE_FAMILY);
  f.client = { ...f.client, age: 65, grossMonthly: 60000 };
  const r = computeFactFinder(f);
  const ruin = r.closing.ladder.items.find((i) => i.key === "life-ruin")!;
  assert.equal(ruin.product, "whole-life");
  // Whole life on the $823,567 ruin level costs about $4,780 a month at 65: more than the $3,016 cap, so it waits.
  assert.equal(ruin.notYet, true);
  assertIssueAges(r, "rated age 66");
  assert.equal(r.insuranceBudget.groups[0].notYet[0]!.product, "whole-life");
  assert.equal(r.insuranceBudget.groups[0].notYet[0]!.name, "Whole life to clear debts");
  assert.ok(r.closing.provenance.rulesFired.includes("term life cannot be issued at rated age 66, so the ruin-level life plan is whole life"));
});

test("guard 25: the close screen's life package is the ladder's life allocation, to the cent", () => {
  let n = eachCase(assertBasketIsLadder);
  for (const f of variants().slice(0, 40)) {
    // F-18: budgetMonthly is the insurance cap, inside the band; the old $5,000 is now the band's ceiling.
    const top = computeFactFinder(f).budget.band.ceiling;
    for (const opt of [{ package: "recommended" as const }, { package: "full" as const }, { budgetMonthly: top }, { package: "full" as const, budgetMonthly: top }]) {
      assertBasketIsLadder(computeFactFinder(f, opt), JSON.stringify(opt));
      n++;
    }
  }
  assert.ok(n > 500, `${n} baskets checked`);
});

test("expected result, family: cap $533.13; term $238.83 and CI $294.30; the funerals and disability income wait", () => {
  const r = computeFactFinder(SAMPLE_FAMILY);
  const [prot] = r.insuranceBudget.groups;
  assert.equal(money2(r.closing.ladder.insuranceCapMonthly), "533.13");
  assert.deepEqual(prot.funded.map((p) => [p.name, money2(p.monthly)]), [["Term life", "238.83"], ["Critical illness (Life Span Gold)", "294.30"]]);
  assert.deepEqual(prot.notYet.map((p) => [p.name, money2(p.needsMonthly)]), [
    ["Your father's funeral cover (Rest Assured II)", "262.88"], ["Your mother's funeral cover (Rest Assured II)", "178.56"],
    ["Cashbuilder II with disability income rider", "300.00"],
  ]);
  assert.equal(money2(r.closing.chosen.basket.totalMonthly), "238.83");
  assert.equal(Math.round(r.closing.chosen.basket.cover), 823567, "the basket's cover is the ruin level");
  assert.equal(money2(r.buckets.protection), "533.13", "the budget card's Protection bucket agrees (F-13)");
});

test("expected result, young single: cap $280.61; CI $280.61; disability income, car loan cover (Tier 2) and home loan cover (Tier 3) wait", () => {
  const r = computeFactFinder(SAMPLE_YOUNG_SINGLE);
  const [prot] = r.insuranceBudget.groups;
  assert.equal(money2(r.closing.ladder.insuranceCapMonthly), "280.61");
  assert.deepEqual(prot.funded.map((p) => [p.name, money2(p.monthly)]), [["Critical illness (Life Span Gold)", "280.61"]]);
  assert.deepEqual(prot.notYet.map((p) => [p.name, money2(p.needsMonthly)]), [
    ["Cashbuilder II with disability income rider", "300.00"], ["Term life for your car loan", "150.00"], ["Term life for your home loan", "150.00"],
  ]);
  const tier = (k: string): number => r.closing.ladder.items.find((i) => i.key === k)!.tier;
  assert.equal(tier("loan-cover:00000000-0000-4000-8000-000000000212"), 2, "the car loan, in 2 years, is Tier 2");
  assert.equal(tier("loan-cover:00000000-0000-4000-8000-000000000211"), 3, "the home loan, in 6 years, is Tier 3");
  assert.equal(prot.notYet[1]!.why, "Your lender will want this from year 2. It costs about $150 a month if you start now.");
  assert.equal(r.closing.chosen.basket.items.length, 0, "no life package");
  assert.equal(money2(r.buckets.protection), "280.61", "the budget card's Protection bucket agrees (F-13)");
});

test("Change 3: no ruin-level life cover without dependants; parent care paid by the client counts as a dependant", () => {
  const young = computeFactFinder(SAMPLE_YOUNG_SINGLE);
  assert.ok(!young.closing.ladderSpecs.some((s) => s.key === "life-ruin" || s.key === "life-beyond-ruin"));
  assert.ok(young.closing.provenance.rulesFired.includes("no partner, no children, no parent care paid: no ruin-level life cover"));
  assert.equal(Math.round(young.deathNeed.tiers.essential), 149000, "the death need is unchanged; only the ladder item goes");
  const carer = clone(SAMPLE_YOUNG_SINGLE);
  carer.parents = [JSON.parse(JSON.stringify(SAMPLE_FAMILY.parents[1]))];
  const r = computeFactFinder(carer);
  assert.ok(r.careGraph.goals.some((g) => g.kind === "care" && g.presentValue > 0), "the father's care is charged to the client");
  assert.ok(r.closing.ladderSpecs.some((s) => s.key === "life-ruin"), "so she has a dependant and a ruin-level item");
});

test("Change 4: loan cover follows each loan goal; whole life when term cannot be issued at the goal date", () => {
  const f = clone(SAMPLE_YOUNG_SINGLE);
  f.client = { ...f.client, age: 60 };
  const r = computeFactFinder(f);
  const home = r.closing.ladderSpecs.find((s) => s.key === "loan-cover:00000000-0000-4000-8000-000000000211")!;
  const car = r.closing.ladderSpecs.find((s) => s.key === "loan-cover:00000000-0000-4000-8000-000000000212")!;
  assert.equal(home.product, "whole-life", "rated age 67 in 6 years: past term's 65");
  assert.equal(car.product, "term", "rated age 63 in 2 years: term");
  assert.equal(home.min, home.full);
  let seen = 0;
  eachCase((x, label) => {
    for (const it of x.closing.ladder.items.filter((i) => i.key.startsWith("loan-cover:"))) {
      const g = x.goals.plans.find((p) => it.key === `loan-cover:${p.goalId}`);
      assert.ok(g && (g.home || g.car), `${label}: ${it.key} follows a home or car loan goal`);
      assert.equal(it.tier, g!.years <= 3 ? 2 : 3, `${label}: ${it.key} tier`);
      seen++;
    }
  });
  assert.ok(seen > 100, `${seen} loan cover items checked`);
});
