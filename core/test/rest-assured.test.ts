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
  // The mother's rated age 67 is INSIDE the harvested grid (ANB 65 and 70), so since 29 Oct 2026 the rate
  // book prices her by interpolation: rate 69.978, $180.12 on $30,000 and $300.21 on $50,000. The ApplyOn
  // quote TTRA-9DWVJ3Y said $178.56 and $297.60, which the book is within 0.9% of — that is the accuracy
  // check, and the book wins inside the grid (real-life-rates spec R3a). The father's rated age 72 is past
  // the grid, so his figures are still the quote itself.
  assert.equal(cents(restAssuredPremium(b, mother, 30000)), "180.12", "the book at ANB 67; quote TTRA-9DWVJ3Y was 178.56 (+0.87%)");
  assert.equal(cents(restAssuredPremium(b, mother, 50000)), "300.21", "the book at ANB 67; quote TTRA-9DWVJ3Y was 297.60 (+0.88%)");
  const off = (got: number, quoted: number): number => Math.abs(got / quoted - 1);
  assert.ok(off(restAssuredPremium(b, mother, 50000), 297.60) < 0.01, "the book stays within 1% of the quote");
  assert.ok(!b.build().parameters.some((p) => p.path === "core:ff.premiumRates.restAssuredAgeGrowth"), "at a quoted age the age factor is not used");
  assert.deepEqual(b.build().caveats, [], "no estimate caveat at a quoted age");
});

test("the sample family's parent funerals use the quotes: minimum on $30,000 at the rated age", () => {
  const pf = computeFactFinder(SAMPLE_FAMILY).closing.parentFuneral;
  const father = pf.find((p) => p.who === "Your father")!;
  const mother = pf.find((p) => p.who === "Your mother")!;
  assert.deepEqual([father.age, father.ratedAge, cents(father.minimumMonthly)], [71, 72, "262.88"]);
  // The mother is priced from the rate book (ANB 67 is inside the grid); the father from the quote (ANB 72 is past it).
  assert.deepEqual([mother.age, mother.ratedAge, cents(mother.minimumMonthly)], [66, 67, "180.12"]);
  assert.equal(cents(father.fullMonthly), cents(father.cover * 8.7627 / 1000), "full = the quoted rate on the computed cover");
  assert.equal(cents(mother.fullMonthly), "900.62", "the book's interpolated rate 69.978 on her $150,000 cover");
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
  // Both are ANB 67, inside the harvested grid, so the book prices them: female 69.978, male 83.114.
  assert.equal(cents(inLaw!.minimumMonthly), "180.12", "mother-in-law: the female rate");
  assert.equal(cents(other!.minimumMonthly), "213.94", "unknown: the male rate (the higher one)");
  assert.ok(other!.minimumMonthly > inLaw!.minimumMonthly, "the male rate is the dearer one");
  assert.match(other!.sexFlag ?? "", /male rate \(the higher one\)/);
  assert.equal(inLaw!.sexFlag, null);
  assert.ok(r.closing.provenance.caveats.some((c) => /sex not known/.test(c)), "the flag is also a provenance caveat");
  const lv = computeLovedOnes({ buyerRole: "adult-child", buyerAge: 45, budgetMonthly: 900, aims: { save: false, life: false, funeral: true, retire: false }, ones: [{ personId: "00000000-0000-4000-8000-0000000000aa", age: 71, relation: "elder" }] });
  assert.equal(cents(lv.ones[0]!.plans[0]!.minimumMonthly), "262.88", "a loved one has no sex in the facts: the male rate");
  assert.ok(lv.provenance.caveats.some((c) => /sex not known/.test(c)));
});

test("one pricing function: only life-rates.ts reads the Rest Assured II rate rows", () => {
  // The quoted rates moved into life-rates.ts on 29 Oct 2026, where the rate book's own lookup lives, so the
  // fallback and the book sit side by side in one module. premiums.ts wraps it; nobody else reads the rows.
  const RATE_ROW = /core:ff\.premiumRates\.restAssured/;
  const readers = walk(SRC).filter((f) => !/[\\/]parameters[\\/]/.test(f) && RATE_ROW.test(read(f))).map(rel);
  assert.deepEqual(readers, ["life-rates.ts"]);
  for (const name of ["insurance-budget.ts", "closing.ts", "loved-ones.ts"]) {
    const src = read(walk(SRC).find((f) => rel(f) === name)!);
    assert.ok(/restAssured(Premium|CoverFor|Eligible)\(/.test(src), `${name} calls the one pricing function`);
    assert.ok(!/"rest-assured"/.test(src), `${name} keeps no Rest Assured rate kind of its own`);
  }
});
