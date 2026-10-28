/**
 * One allocator for protection (Fix B, Kyron, Decision 3 = A, 27 Oct 2026; docs/audit/RUN-2026-10-27-fix-one-allocator.md).
 *
 * Guard 21 (parity): the insurance budget's Protection rows equal the closing ladder's funded insurance items,
 * item for item, in ladder order, to the cent. Guard 22 (no unbuyable plan): every funded insurance item on the
 * ladder is at least its product minimum. Both run over the samples, the variants below and Tier 1 reorders.
 *
 * Fix run 3 (Kyron, Decisions 5, 6 and 7 = A, 27 Oct 2026; docs/audit/RUN-2026-10-27-fix-ladder-advice.md): the cap is
 * the recommended figure, Tier 1 is life, CI, parent funerals; ruin-level life only with dependants; loan cover items.
 * The variants now include a client of rated age 66 and families with home and car loan goals.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeFactFinder, requestReorder, restAssuredPremium, parentAge, parentSex, parentLabel, ratePer1000, ProvenanceBuilder,
  TATIL_PRODUCTS, SAMPLE_FAMILY, type FactFinderResult,
} from "../src/index.ts";
import { clone, eachCase, CENT } from "./ladder-cases.ts";
import { setParents } from "./facts-helpers.ts";

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
  const item = r.closing.ladder.items.find((i) => i.key === key)!;
  if (key === "life-ruin" || key.startsWith("loan-cover:")) return min(item.product!);
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

// Fix run 3 (Decision 6 = A): was life, parent funerals, CI, disability income.
test("Tier 1 default order: life, CI, parent funerals oldest first, disability income; own final expense for 50 and over", () => {
  const fam = computeFactFinder(SAMPLE_FAMILY).closing.ladderSpecs.filter((s) => s.tier === 1).map((s) => s.key);
  assert.deepEqual(fam, ["life-ruin", "critical-illness", "parent-funeral:00000000-0000-4000-8000-000000000006", "parent-funeral:00000000-0000-4000-8000-000000000005", "disability-income"]);
  const later = clone(SAMPLE_FAMILY);
  later.client = { ...later.client, age: 55 };
  setParents(later, []);
  const k = computeFactFinder(later).closing.ladderSpecs.filter((s) => s.tier === 1).map((s) => s.key);
  assert.deepEqual(k, ["life-ruin", "critical-illness", "own-final-expense"], "no disability income from 50; own final expense instead");
});

// Fix run 3 re-baseline: was life 238.83, father 293.45, mother 178.56, CI and disability income not yet, at the $711 ceiling.
test("the sample family at the $533 recommended: what each Tier 1 item gets", () => {
  const items = computeFactFinder(SAMPLE_FAMILY).closing.ladder.items.filter((i) => i.tier === 1);
  assert.deepEqual(items.map((i) => [i.label, i.allocated.toFixed(2), i.notYet]), [
    ["Life cover to the ruin level", "238.83", false],
    ["Critical illness cover", "294.30", false],
    ["Your father's funeral cover", "0.00", true],
    ["Your mother's funeral cover", "0.00", true],
    ["Disability income (Cashbuilder II with the Disability Income Rider)", "0.00", true],
  ]);
});

// Fix run 3 re-baseline: the reorder is now the father's funeral above CI (CI is above it by default). Was CI moved above
// the father, giving term 238.83, CI 209.13, father 262.88 at the $711 ceiling.
test("a reorder inside Tier 1 moves both screens: the father's funeral above critical illness", () => {
  const r = computeFactFinder(SAMPLE_FAMILY);
  const order = r.closing.ladder.items.map((i) => i.key);
  const father = "parent-funeral:00000000-0000-4000-8000-000000000006";
  const moved = requestReorder(r.closing.ladderSpecs, order, father, order.indexOf("critical-illness"), "2026-10-27T12:00:00Z");
  assert.equal(moved.declined.length, 0, "inside a tier: no declined record");
  const re = computeFactFinder(SAMPLE_FAMILY, { ladderOrder: moved.order });
  assertParity(re, "reordered");
  assert.deepEqual(re.insuranceBudget.groups[0].funded.map((p) => [p.product, p.monthly.toFixed(2)]), [["term", "238.83"], ["rest-assured-ii", "294.30"]]);
  assert.deepEqual(re.insuranceBudget.groups[0].notYet.map((p) => [p.product, p.needsMonthly.toFixed(2)]), [["life-span-gold", "150.00"], ["rest-assured-ii", "178.56"], ["cashbuilder-ii", "300.00"]]);
  assert.equal(re.closing.chosen.basket.totalMonthly.toFixed(2), "238.83", "the close screen's life package follows the ladder");
});
