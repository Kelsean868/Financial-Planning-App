/**
 * Rest Assured II rates (Fix A, 27 Oct 2026; docs/audit/RUN-2026-10-27-fix-one-allocator.md).
 *
 * Goldens: two ApplyOn quotes (Pay to Age 100, monthly, taxes and stamp duty included), leads TTRA-9WZE859
 * (father, male, born 1955) and TTRA-9DWVJ3Y (mother, female, born 1960), each at $30,000 and $50,000, to the
 * cent. A rate change that moves them is a re-baseline under addendum §14.1.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ProvenanceBuilder, computeFactFinder, computeLovedOnes, restAssuredPremium, restAssuredRatedAge, restAssuredEligible,
  SAMPLE_FAMILY, type LifeCaseFacts,
} from "../src/index.ts";
import { walk, SRC, read, rel } from "./source-scan.ts";

const cents = (x: number): string => (Math.round(x * 100) / 100).toFixed(2);
type Mutable<T> = { -readonly [K in keyof T]: T[K] };
const clone = (f: LifeCaseFacts): Mutable<LifeCaseFacts> => JSON.parse(JSON.stringify(f));
/** A sample parent born in another year; care starts at the parent's current age. */
const bornIn = (p: LifeCaseFacts["parents"][number], birthYear: number, extra: Partial<LifeCaseFacts["parents"][number]> = {}): LifeCaseFacts["parents"][number] => {
  const { careFromAge: _drop, ...rest } = p;
  return { ...rest, ...extra, birthYear };
};

test("goldens: the two ApplyOn quotes, at both covers, to the cent", () => {
  const b = new ProvenanceBuilder();
  const father = { age: 71, sex: "male" as const, who: "Your father" };
  const mother = { age: 66, sex: "female" as const, who: "Your mother" };
  assert.equal(restAssuredRatedAge(father.age), 72, "the father is rated at 72 (next birthday)");
  assert.equal(restAssuredRatedAge(mother.age), 67, "the mother is rated at 67 (next birthday)");
  assert.equal(cents(restAssuredPremium(b, father, 30000)), "262.88", "TTRA-9WZE859, $30,000");
  assert.equal(cents(restAssuredPremium(b, father, 50000)), "438.14", "TTRA-9WZE859, $50,000");
  assert.equal(cents(restAssuredPremium(b, mother, 30000)), "178.56", "TTRA-9DWVJ3Y, $30,000 (by proportion)");
  assert.equal(cents(restAssuredPremium(b, mother, 50000)), "297.60", "TTRA-9DWVJ3Y, $50,000");
  assert.ok(!b.build().parameters.some((p) => p.path === "core:ff.premiumRates.restAssuredAgeGrowth"), "at a quoted age the age factor is not used");
  assert.deepEqual(b.build().caveats, [], "no estimate caveat at a quoted age");
});

test("the sample family's parent funerals use the quotes: minimum on $30,000 at the rated age", () => {
  const pf = computeFactFinder(SAMPLE_FAMILY).closing.parentFuneral;
  const father = pf.find((p) => p.who === "Your father")!;
  const mother = pf.find((p) => p.who === "Your mother")!;
  assert.deepEqual([father.age, father.ratedAge, cents(father.minimumMonthly)], [71, 72, "262.88"]);
  assert.deepEqual([mother.age, mother.ratedAge, cents(mother.minimumMonthly)], [66, 67, "178.56"]);
  assert.equal(cents(father.fullMonthly), cents(father.cover * 8.7627 / 1000), "full = the quoted rate on the computed cover");
  assert.equal(cents(mother.fullMonthly), cents(mother.cover * 5.952 / 1000));
  assert.equal(father.sexFlag, null);
});

test("away from a quoted age the 5% a year factor applies, with its caveat", () => {
  const b = new ProvenanceBuilder();
  const at = restAssuredPremium(b, { age: 71, sex: "male", who: "x" }, 30000);
  const older = restAssuredPremium(b, { age: 72, sex: "male", who: "x" }, 30000);
  assert.ok(Math.abs(older / at - 1.05) < 1e-12);
  assert.ok(b.build().caveats.some((c) => /not yet checked against a quote/.test(c)));
});

test("eligibility is judged on the rated age: parent age 79 (rated 80) issues, 80 (rated 81) does not", () => {
  const b = new ProvenanceBuilder();
  assert.equal(restAssuredEligible(b, 79), true);
  assert.equal(restAssuredEligible(b, 80), false, "the engine used to let parent age 80 through");
  const f = clone(SAMPLE_FAMILY);
  f.parents = [bornIn(f.parents[1]!, 2026 - 79), bornIn(f.parents[0]!, 2026 - 80)];
  const pf = computeFactFinder(f).closing.parentFuneral;
  assert.equal(pf[0]!.product, "rest-assured-ii");
  assert.equal(pf[1]!.product, null);
  assert.ok(!computeFactFinder(f).closing.ladderSpecs.some((s) => s.key === `parent-funeral:${f.parents[1]!.personId}`), "no ladder item for an ineligible parent");
  const elder = (age: number) => computeLovedOnes({ buyerRole: "adult-child", buyerAge: 45, budgetMonthly: 900, aims: { save: false, life: false, funeral: true, retire: false }, ones: [{ personId: "00000000-0000-4000-8000-0000000000aa", age, relation: "elder" }] });
  assert.equal(elder(79).ones[0]!.plans[0]!.product, "rest-assured-ii");
  assert.equal(elder(80).ones[0]!.plans[0]!.product, null);
});

test("the insured's sex: from the relationship for parents; male rate and a flag when it cannot be told", () => {
  const f = clone(SAMPLE_FAMILY);
  f.parents = [
    bornIn(f.parents[0]!, 1960, { relationship: "mother-in-law" }),
    bornIn(f.parents[1]!, 1960, { relationship: "other-elder" }),
  ];
  const r = computeFactFinder(f);
  const [inLaw, other] = r.closing.parentFuneral;
  assert.equal(cents(inLaw!.minimumMonthly), "178.56", "mother-in-law: the female rate");
  assert.equal(cents(other!.minimumMonthly), cents(30 * 8.7627 / Math.pow(1.05, 5)), "unknown: the male rate (age 67 is five years under the male quote)");
  assert.match(other!.sexFlag ?? "", /male rate \(the higher one\)/);
  assert.equal(inLaw!.sexFlag, null);
  assert.ok(r.closing.provenance.caveats.some((c) => /sex not known/.test(c)), "the flag is also a provenance caveat");
  const lv = computeLovedOnes({ buyerRole: "adult-child", buyerAge: 45, budgetMonthly: 900, aims: { save: false, life: false, funeral: true, retire: false }, ones: [{ personId: "00000000-0000-4000-8000-0000000000aa", age: 71, relation: "elder" }] });
  assert.equal(cents(lv.ones[0]!.plans[0]!.minimumMonthly), "262.88", "a loved one has no sex in the facts: the male rate");
  assert.ok(lv.provenance.caveats.some((c) => /sex not known/.test(c)));
});

test("one pricing function: only premiums.ts reads the Rest Assured II rate rows", () => {
  const RATE_ROW = /core:ff\.premiumRates\.restAssured/;
  const readers = walk(SRC).filter((f) => !/[\\/]parameters[\\/]/.test(f) && RATE_ROW.test(read(f))).map(rel);
  assert.deepEqual(readers, ["premiums.ts"]);
  for (const name of ["insurance-budget.ts", "closing.ts", "loved-ones.ts"]) {
    const src = read(walk(SRC).find((f) => rel(f) === name)!);
    assert.ok(/restAssured(Premium|CoverFor|Eligible)\(/.test(src), `${name} calls the one pricing function`);
    assert.ok(!/"rest-assured"/.test(src), `${name} keeps no Rest Assured rate kind of its own`);
  }
});
