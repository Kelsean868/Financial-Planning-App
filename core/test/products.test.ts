/**
 * Section 2 §2.4 product table, guard 16 (minimum premiums) and guard 17 (Disability Income Rider).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TATIL_PRODUCTS, TATIL_RIDERS, computeFactFinder, computeLovedOnes, assertRidersAllowed, ProvenanceBuilder,
  SAMPLE_FAMILY, SAMPLE_YOUNG_SINGLE, type LifeCaseFacts, type ProductId,
} from "../src/index.ts";
import { setGross, setParents } from "./facts-helpers.ts";

const clone = (f: LifeCaseFacts): any => JSON.parse(JSON.stringify(f));
const withoutParents = (f: LifeCaseFacts): LifeCaseFacts => { const c = clone(f); setParents(c, []); return c; };

test("§2.4: every product row carries source and asOf, with the signed figures", () => {
  const expect: Record<ProductId, { cover: [number, number | null] | null; min: number | null }> = {
    term: { cover: [150000, 10000000], min: 150 },
    "whole-life": { cover: [65000, null], min: 150 },
    endowment: { cover: [55000, null], min: 150 },
    "life-span-gold": { cover: [100000, 2000000], min: 150 },
    goldspoon: { cover: [10000, 150000], min: 150 },
    "rest-assured-ii": { cover: [30000, 150000], min: null },
    "cashbuilder-ii": { cover: [10000, null], min: 300 },
    destiny: { cover: null, min: 200 },
    "platinum-edge": { cover: null, min: null },
    spia: { cover: null, min: null },
  };
  for (const [id, r] of Object.entries(TATIL_PRODUCTS)) {
    assert.ok(r.source.length > 0, `${id} has a source`);
    assert.match(r.asOf, /^\d{4}-\d{2}-\d{2}$/, `${id} has an asOf date`);
    const e = expect[id as ProductId];
    assert.deepEqual(r.value.cover ? [r.value.cover.min, r.value.cover.max] : null, e.cover, `${id} cover range`);
    assert.equal(r.value.minPremiumMonthly, e.min, `${id} minimum premium`);
  }
  assert.equal(TATIL_PRODUCTS.term.value.issueAge.max, 65, "term issued to age 65");
  assert.deepEqual(TATIL_PRODUCTS.goldspoon.value.issueAge, { min: 1, max: 12 }, "Goldspoon ages 1–12");
  assert.equal(TATIL_PRODUCTS["rest-assured-ii"].value.issueAge.max, 80, "Rest Assured II to age 80");
  assert.equal(TATIL_PRODUCTS.spia.value.issueAge.min, 50, "SPIA age 50+");
  assert.deepEqual(TATIL_PRODUCTS["platinum-edge"].value.singleDeposit, { min: 50000, max: 1000000 });
  assert.deepEqual(TATIL_PRODUCTS.spia.value.singleDeposit, { min: 50000, max: 2000000 });
});

function variants(): LifeCaseFacts[] {
  const out: LifeCaseFacts[] = [];
  const noParents = withoutParents(SAMPLE_FAMILY);
  for (const base of [SAMPLE_FAMILY, noParents, SAMPLE_YOUNG_SINGLE]) {
    for (const age of [22, 30, 38, 47, 55, 63]) {
      for (const gross of [7000, 9500, 13000, 17000, 25000, 45000]) {
        for (const savings of [0, 20000, 150000]) {
          const f = clone(base);
          f.client.age = age;
          setGross(f, gross);
          f.budget.savings = savings;
          out.push(f);
        }
      }
    }
  }
  return out;
}

test("guard 16: for every recommendation set, no funded plan is below its minimum premium", () => {
  let plans = 0;
  for (const f of variants()) {
    for (const savePct of [0, 5, 15, 30]) {
      const r = computeFactFinder(f, { savePct });
      for (const g of r.insuranceBudget.groups) {
        for (const p of g.funded) {
          const tableMin = TATIL_PRODUCTS[p.product].value.minPremiumMonthly ?? 0;
          assert.ok(p.monthly + 1e-9 >= tableMin, `${p.name} funded at ${p.monthly}, below the table minimum ${tableMin} (age ${f.client.age}, gross ${f.client.pay.amountPerPay})`);
          assert.ok(p.monthly + 1e-9 >= p.minimumMonthly, `${p.name} funded below its own minimum`);
          plans++;
        }
        const sum = g.funded.reduce((a, p) => a + p.monthly, 0);
        assert.ok(sum <= g.totalMonthly + 1e-6, `${g.title} funds more than its budget`);
      }
    }
  }
  for (let budget = 0; budget <= 1200; budget += 37) {
    for (const age of [1, 3, 9, 13, 30, 70, 79, 82]) {
      for (const relation of ["child", "adult", "elder"] as const) {
        const lv = computeLovedOnes({ buyerRole: "grandparent", buyerAge: 62, budgetMonthly: budget, aims: { save: true, life: true, funeral: true, retire: true }, ones: [{ personId: "00000000-0000-4000-8000-0000000000aa", age, relation }] });
        for (const p of lv.ones.flatMap((o) => o.plans)) {
          if (p.status !== "funded" || !p.product) continue;
          const tableMin = TATIL_PRODUCTS[p.product].value.minPremiumMonthly ?? 0;
          assert.ok(p.monthly + 1e-9 >= Math.max(tableMin, p.minimumMonthly), `loved-one ${p.name} funded at ${p.monthly}, below ${tableMin}`);
          if (p.product === "goldspoon") assert.ok(age >= 1 && age <= 12, `Goldspoon recommended at age ${age}`);
          if (p.product === "rest-assured-ii") assert.ok(age <= 80, `Rest Assured II recommended at age ${age}`);
          plans++;
        }
      }
    }
  }
  assert.ok(plans > 1000, `${plans} funded plans checked`);
});

test("guard 17: the Disability Income Rider is only ever recommended on Cashbuilder II", () => {
  assert.deepEqual(TATIL_RIDERS["disability-income"].value.allowedOn, ["cashbuilder-ii"]);
  for (const [id, r] of Object.entries(TATIL_PRODUCTS)) {
    if (id !== "cashbuilder-ii") assert.ok(!r.value.riders.includes("disability-income"), `${id} lists the Disability Income Rider`);
  }
  assert.throws(() => assertRidersAllowed(new ProvenanceBuilder(), "whole-life", ["disability-income"]), /only on cashbuilder-ii/);
  let seen = 0;
  for (const f of variants()) {
    const r = computeFactFinder(f);
    for (const p of r.insuranceBudget.groups.flatMap((g) => [...g.funded, ...g.notYet])) {
      if (p.riders.some((x) => x.id === "disability-income")) {
        assert.equal(p.product, "cashbuilder-ii", `${p.name} carries the Disability Income Rider`);
        assert.equal(p.riders.find((x) => x.id === "disability-income")!.underwriting, "Medical at any amount", "shows Medical");
        seen++;
      }
    }
  }
  assert.ok(seen > 0, "the rider was seen on Cashbuilder II");
  assert.equal(TATIL_RIDERS.add.value.incomeProtection, false, "AD&D is never income protection");
});
