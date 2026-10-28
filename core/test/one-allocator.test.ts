/**
 * One allocator for protection (Fix B, Kyron, Decision 3 = A, 27 Oct 2026; docs/audit/RUN-2026-10-27-fix-one-allocator.md).
 *
 * Guard 21 (parity): the insurance budget's Protection rows equal the closing ladder's funded insurance items,
 * item for item, in ladder order, to the cent. Guard 22 (no unbuyable plan): every funded insurance item on the
 * ladder is at least its product minimum. Both run over the samples, the variants below and Tier 1 reorders.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeFactFinder, requestReorder, restAssuredPremium, parentAge, parentSex, parentLabel, ratePer1000, ProvenanceBuilder,
  TATIL_PRODUCTS, SAMPLE_FAMILY, SAMPLE_YOUNG_SINGLE, type LifeCaseFacts, type FactFinderResult,
} from "../src/index.ts";

type Mutable<T> = { -readonly [K in keyof T]: T[K] };
const clone = (f: LifeCaseFacts): Mutable<LifeCaseFacts> => JSON.parse(JSON.stringify(f));
const CENT = 0.005;

function variants(): LifeCaseFacts[] {
  const out: LifeCaseFacts[] = [SAMPLE_FAMILY, SAMPLE_YOUNG_SINGLE];
  const parentSets = [
    SAMPLE_FAMILY.parents,
    [],
    // Care starts at each parent's current age (careFromAge left out).
    [{ ...SAMPLE_FAMILY.parents[1]!, birthYear: 1947, careFromAge: undefined }, { ...SAMPLE_FAMILY.parents[0]!, birthYear: 1950, relationship: "other-elder" as const, careFromAge: undefined }],
  ];
  for (const base of [SAMPLE_FAMILY, SAMPLE_YOUNG_SINGLE]) {
    for (const age of [24, 38, 52, 62]) {
      for (const gross of [9000, 12000, 17000, 30000, 60000]) {
        for (const parents of parentSets) {
          const f = clone(base);
          f.client = { ...f.client, age, grossMonthly: gross };
          f.parents = JSON.parse(JSON.stringify(parents));
          out.push(f);
        }
      }
    }
  }
  return out;
}

/** The default order, and each Tier 1 item moved to the top of Tier 1. */
function orders(r: FactFinderResult): (readonly string[] | undefined)[] {
  const order = r.closing.ladder.items.map((i) => i.key);
  const tier1 = order.filter((k) => r.closing.ladderSpecs.find((s) => s.key === k)!.tier === 1);
  return [undefined, ...tier1.slice(1).map((k) => requestReorder(r.closing.ladderSpecs, order, k, order.indexOf(tier1[0]!), "2026-10-27T12:00:00Z").order)];
}

function eachCase(fn: (r: FactFinderResult, label: string) => void): number {
  let n = 0;
  for (const [i, f] of variants().entries()) {
    const base = computeFactFinder(f);
    if (base.closing.ladder.underwater) { fn(base, `variant ${i} (stage 0)`); n++; continue; }
    for (const [j, ladderOrder] of orders(base).entries()) {
      fn(ladderOrder ? computeFactFinder(f, { ladderOrder }) : base, `variant ${i}, order ${j}`);
      n++;
    }
  }
  return n;
}

export function assertParity(r: FactFinderResult, label: string): void {
  const prot = r.insuranceBudget.groups[0];
  const items = r.closing.ladder.items.filter((i) => i.insurance);
  const got = new Map(items.map((i) => [i.key, i.allocated]));
  const funded = items.filter((i) => i.allocated > 0);
  const keys = prot.funded.flatMap((p) => p.ladderKeys);
  assert.deepEqual([...keys].sort(), funded.map((i) => i.key).sort(), `${label}: every funded ladder insurance item is in exactly one Protection row`);
  assert.deepEqual(prot.funded.map((p) => p.ladderKeys[0]), funded.filter((i) => i.addsTo === undefined).map((i) => i.key), `${label}: the Protection rows are in ladder order`);
  for (const p of prot.funded) {
    const want = p.ladderKeys.reduce((a, k) => a + got.get(k)!, 0);
    assert.ok(Math.abs(p.monthly - want) < CENT, `${label}: ${p.name} is ${p.monthly}, the ladder funds ${want}`);
  }
  if (!r.closing.ladder.underwater) {
    assert.deepEqual(prot.notYet.map((p) => [p.ladderKeys[0], p.needsMonthly.toFixed(2)]), items.filter((i) => i.notYet).map((i) => [i.key, i.min.toFixed(2)]), `${label}: "not yet" rows are the ladder's waiting items`);
  }
  assert.ok(Math.abs(prot.totalMonthly - r.closing.ladder.insuranceAllocated) < CENT, `${label}: the Protection total is what the ladder funds`);
}

/** The product minimum for a ladder insurance item, worked out here from the product table and the quote rates. */
function productMinimum(r: FactFinderResult, key: string): number {
  const b = new ProvenanceBuilder();
  const min = (id: keyof typeof TATIL_PRODUCTS): number => TATIL_PRODUCTS[id].value.minPremiumMonthly ?? 0;
  const ra = TATIL_PRODUCTS["rest-assured-ii"].value.cover!.min;
  const age = r.facts.client.age;
  if (key === "life-ruin") return min("term");
  if (key === "critical-illness") return Math.max(min("life-span-gold"), TATIL_PRODUCTS["life-span-gold"].value.cover!.min * ratePer1000(b, "ci", age) / 1000);
  if (key === "disability-income") return min("cashbuilder-ii");
  if (key === "own-final-expense") return restAssuredPremium(b, { age, sex: r.facts.client.sex, who: "You" }, ra);
  if (key === "life-beyond-ruin") return 0;
  const p = r.facts.parents.find((x) => key === `parent-funeral:${x.personId}`);
  if (p) return restAssuredPremium(b, { age: parentAge(p, r.facts.asOfYear), sex: parentSex(p), who: parentLabel(p) }, ra);
  throw new Error(`unmapped ladder item ${key}`);
}

export function assertNoUnbuyablePlan(r: FactFinderResult, label: string): void {
  const items = r.closing.ladder.items.filter((i) => i.insurance);
  const got = new Map(items.map((i) => [i.key, i.allocated]));
  for (const it of items) {
    if (it.allocated <= 0) continue;
    const floor = productMinimum(r, it.key);
    assert.ok(it.allocated + 1e-9 >= floor, `${label}: ${it.label} funded at ${it.allocated}, below its product minimum ${floor}`);
    assert.ok(it.allocated + 1e-9 >= it.min, `${label}: ${it.label} funded at ${it.allocated}, below its ladder minimum ${it.min}`);
    if (it.addsTo) assert.ok((got.get(it.addsTo) ?? 0) > 0, `${label}: ${it.label} is funded but the plan it adds to is not`);
  }
}

test("guard 21: the insurance budget's Protection rows equal the ladder's funded insurance items, to the cent", () => {
  const n = eachCase(assertParity);
  assert.ok(n > 400, `${n} cases checked`);
});

test("guard 22: no funded insurance item on the ladder is below its product minimum", () => {
  let funded = 0;
  const n = eachCase((r, label) => { assertNoUnbuyablePlan(r, label); funded += r.closing.ladder.items.filter((i) => i.insurance && i.allocated > 0).length; });
  assert.ok(n > 400 && funded > 1000, `${n} cases, ${funded} funded insurance items checked`);
});

test("Tier 1 default order: life, parent funerals oldest first, CI, disability income; own final expense for 50 and over", () => {
  const fam = computeFactFinder(SAMPLE_FAMILY).closing.ladderSpecs.filter((s) => s.tier === 1).map((s) => s.key);
  assert.deepEqual(fam, ["life-ruin", "parent-funeral:00000000-0000-4000-8000-000000000006", "parent-funeral:00000000-0000-4000-8000-000000000005", "critical-illness", "disability-income"]);
  const later = clone(SAMPLE_FAMILY);
  later.client = { ...later.client, age: 55 };
  later.parents = [];
  const k = computeFactFinder(later).closing.ladderSpecs.filter((s) => s.tier === 1).map((s) => s.key);
  assert.deepEqual(k, ["life-ruin", "critical-illness", "own-final-expense"], "no disability income from 50; own final expense instead");
});

test("the sample family at the $711 ceiling: what each Tier 1 item gets", () => {
  const items = computeFactFinder(SAMPLE_FAMILY).closing.ladder.items.filter((i) => i.tier === 1);
  assert.deepEqual(items.map((i) => [i.label, i.allocated.toFixed(2), i.notYet]), [
    ["Life cover to the ruin level", "238.83", false],
    ["Your father's funeral cover", "293.45", false],
    ["Your mother's funeral cover", "178.56", false],
    ["Critical illness cover", "0.00", true],
    ["Disability income (Cashbuilder II with the Disability Income Rider)", "0.00", true],
  ]);
});

test("a reorder inside Tier 1 moves both screens: critical illness above the father's funeral", () => {
  const r = computeFactFinder(SAMPLE_FAMILY);
  const order = r.closing.ladder.items.map((i) => i.key);
  const father = "parent-funeral:00000000-0000-4000-8000-000000000006";
  const moved = requestReorder(r.closing.ladderSpecs, order, "critical-illness", order.indexOf(father), "2026-10-27T12:00:00Z");
  assert.equal(moved.declined.length, 0, "inside a tier: no declined record");
  const re = computeFactFinder(SAMPLE_FAMILY, { ladderOrder: moved.order });
  assertParity(re, "reordered");
  assert.deepEqual(re.insuranceBudget.groups[0].funded.map((p) => [p.product, p.monthly.toFixed(2)]), [["term", "238.83"], ["life-span-gold", "209.13"], ["rest-assured-ii", "262.88"]]);
  assert.deepEqual(re.insuranceBudget.groups[0].notYet.map((p) => [p.product, p.needsMonthly.toFixed(2)]), [["rest-assured-ii", "178.56"], ["cashbuilder-ii", "300.00"]]);
});
