/**
 * Fix run 4, F-18 (Kyron, Decision 8 = B, 27 Oct 2026; docs/audit/RUN-2026-10-28-f18-package-cards.md).
 *
 * Guard 26: each package card's status and "needs $X more" equal a ladder run with that card chosen, at the cap in use.
 * Guard 27: an insurance budget below the floor, above the ceiling, or not finite throws `ClosingInputError`.
 * Plus the brief's four expected results, the default card, and the slider reaching every screen.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeFactFinder, insuranceCap, completeOrder, ClosingInputError, SAMPLE_FAMILY, SAMPLE_YOUNG_SINGLE,
  type FactFinderResult, type Package,
} from "../src/index.ts";
import { eachCase, variants, CENT } from "./ladder-cases.ts";

const money2 = (x: number): string => x.toFixed(2);
const CARDS: readonly Package[] = ["essential", "recommended", "full"];

/** Guard 26: re-run the engine with each card chosen, at the same cap and order, and read the life item from that ladder. */
export function assertCardsAreLadderRuns(r: FactFinderResult, label: string): void {
  const cap = r.closing.ladder.insuranceCapMonthly;
  const ladderOrder = r.closing.ladder.items.map((i) => i.key);
  assert.equal(r.closing.cards.length, 3, `${label}: three cards`);
  for (const [i, k] of CARDS.entries()) {
    const card = r.closing.cards[i]!;
    assert.equal(card.package, k);
    const rk = computeFactFinder(r.facts, { package: k, budgetMonthly: r.budget.stage === 0 ? null : cap, ladderOrder });
    assert.equal(card.cover, rk.closing.packages[k], `${label}: ${k} card cover`);
    const ruin = rk.closing.ladder.items.find((x) => x.key === "life-ruin");
    if (!ruin || rk.closing.ladder.underwater) {
      assert.equal(card.status, "no-life-plan", `${label}: ${k} card with no life item`);
      continue;
    }
    const prem = ruin.full;
    const life = ruin.allocated;
    const want = life >= prem - CENT ? "in-plan" : "needs-more";
    assert.equal(card.status, want, `${label}: ${k} card status is ${card.status}; a ladder run with that card gives life ${money2(life)} of ${money2(prem)}`);
    assert.ok(Math.abs(card.premiumMonthly - prem) < CENT, `${label}: ${k} card premium ${card.premiumMonthly}, the run's life full ${prem}`);
    assert.ok(Math.abs(card.lifeMonthly - life) < CENT, `${label}: ${k} card life ${card.lifeMonthly}, the run's ${life}`);
    const x = want === "needs-more" ? prem - life : 0;
    assert.ok(Math.abs(card.needsMonthly - x) < CENT, `${label}: ${k} card needs ${money2(card.needsMonthly)} more; the run says ${money2(x)}`);
    if (want === "needs-more") assert.equal(card.statusText, `Needs $${Math.round(x).toLocaleString("en-US")} more a month`);
    else assert.equal(card.statusText, "In your plan");
  }
}

test("guard 26: each card's status and X equal a ladder run with that card chosen", () => {
  let n = eachCase(assertCardsAreLadderRuns);
  for (const f of variants()) {
    // Section 3 §5: the slider runs from the $200 floor to max(ceiling, $200) (was the band's floor to its ceiling).
    const range = computeFactFinder(f).insuranceRange;
    if (range.noPlan) continue;
    for (const budgetMonthly of [range.minMonthly, range.maxMonthly]) {
      for (const pkg of CARDS) {
        assertCardsAreLadderRuns(computeFactFinder(f, { package: pkg, budgetMonthly }), `${pkg} at ${money2(budgetMonthly)}`);
        n++;
      }
    }
  }
  assert.ok(n > 1000, `${n} cases checked`);
});

// Section 3 §14.3 (28 Oct 2026): guard 27 becomes the new range. Below the $200 floor, above max(ceiling, $200), or not
// finite throws (was: outside the band's floor to ceiling). Stage 0 is unchanged: only 0 is accepted.
test("guard 27: an insurance budget below $200, above max(ceiling, $200), or not finite, throws ClosingInputError", () => {
  let n = 0;
  for (const f of [SAMPLE_FAMILY, SAMPLE_YOUNG_SINGLE, ...variants().slice(0, 30)]) {
    const base = computeFactFinder(f);
    const { minMonthly: floor, maxMonthly: ceiling, noPlan } = base.insuranceRange;
    const bad: unknown[] = [floor - 1, floor - 0.01, ceiling + 0.01, ceiling + 1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, "500"];
    if (base.budget.stage !== 0) bad.push(0, -1);
    for (const v of bad) {
      assert.throws(() => computeFactFinder(f, { budgetMonthly: v as number }), ClosingInputError, `budget ${String(v)} (range ${money2(floor)} to ${money2(ceiling)}) must throw`);
      assert.throws(() => insuranceCap(base.budget, v as number), ClosingInputError);
      n++;
    }
    for (const ok of [floor, ceiling, (floor + ceiling) / 2]) {
      assert.equal(computeFactFinder(f, { budgetMonthly: ok }).closing.ladder.insuranceCapMonthly, noPlan ? 0 : ok, "an amount inside the range is the cap, unchanged (no plan: 0)");
    }
  }
  assert.ok(n > 200, `${n} bad amounts checked`);
});

test("expected result 1: family, Essential, $533.13: term $238.83, critical illness $294.30 (unchanged)", () => {
  const r = computeFactFinder(SAMPLE_FAMILY, { package: "essential", budgetMonthly: computeFactFinder(SAMPLE_FAMILY).budget.band.recommended });
  assert.equal(money2(r.closing.ladder.insuranceCapMonthly), "533.13");
  assert.deepEqual(r.insuranceBudget.groups[0].funded.map((p) => [p.name, money2(p.monthly)]), [["Term life", "238.83"], ["Critical illness (Life Span Gold)", "294.30"]]);
  const card = r.closing.cards[0]!;
  assert.deepEqual([card.status, Math.round(card.cover), money2(card.premiumMonthly)], ["in-plan", 823567, "238.83"]);
  assert.equal(r.closing.chosen.basket.partial, false, "the Essential card is funded in full");
});

test("expected result 2: family, Recommended, $533.13: life $383.13, critical illness $150; the card needs $195 more", () => {
  const r = computeFactFinder(SAMPLE_FAMILY, { package: "recommended" });
  assert.equal(money2(r.closing.ladder.insuranceCapMonthly), "533.13");
  // Pass one: life 238.83 and CI 150 (left 144.30); pass two fills life first: 238.83 + 144.30.
  assert.deepEqual(r.insuranceBudget.groups[0].funded.map((p) => [p.name, money2(p.monthly)]), [["Term life", "383.13"], ["Critical illness (Life Span Gold)", "150.00"]]);
  const card = r.closing.cards[1]!;
  assert.deepEqual([card.status, Math.round(card.cover), money2(card.premiumMonthly), money2(card.needsMonthly), card.statusText],
    ["needs-more", 1994846, "578.51", "195.37", "Needs $195 more a month"]);
  assert.equal(Math.round(r.closing.chosen.basket.cover), 1321144, "383.13 a month at 0.29 per $1,000");
  assert.equal(r.closing.scenarios.death.plan.sentences[0], "Your family receives $1,341,144.");
  assert.equal(r.closing.scenarios.death.plan.sentences[9], "Your father's care stops in month 120.");
});

test("expected result 3: family, Recommended, $710.84: life $297.96, CI $150, father's funeral $262.88; less life than at $533", () => {
  const band = computeFactFinder(SAMPLE_FAMILY).budget.band;
  const r = computeFactFinder(SAMPLE_FAMILY, { package: "recommended", budgetMonthly: band.ceiling });
  const [prot] = r.insuranceBudget.groups;
  // Pass one: life 238.83, CI 150, father 262.88 (left 59.13); the mother (178.56) and disability income (300) wait.
  // Pass two: life takes the 59.13. The father's minimum fits at $711, so life gets less than at $533.
  assert.deepEqual(prot.funded.map((p) => [p.name, money2(p.monthly)]), [
    ["Term life", "297.96"], ["Critical illness (Life Span Gold)", "150.00"], ["Your father's funeral cover (Rest Assured II)", "262.88"],
  ]);
  assert.deepEqual(prot.notYet.map((p) => p.name), ["Your mother's funeral cover (Rest Assured II)", "Cashbuilder II with disability income rider"]);
  assert.equal(money2(r.buckets.protection), "710.84", "the budget card follows the slider");
  assert.ok(prot.note.startsWith("Your safe range is $355 to $711. We plan to $711, the amount you chose,"));
  assert.equal(Math.round(r.closing.chosen.basket.cover), 1027453);
  assert.equal(r.closing.scenarios.death.plan.sentences[0], "Your family receives $1,047,453.");
  assert.equal(r.closing.scenarios.death.plan.sentences[9], "Your father's care stops in month 49.");
  assert.equal(r.closing.scenarios.death.plan.sentences[10], "Child B's degree stops in month 1.", "the Child B line");
  assert.equal(r.closing.cards[1]!.statusText, "Needs $281 more a month");
});

test("expected result 4: young single: no life item, so every card shows no life plan", () => {
  const r = computeFactFinder(SAMPLE_YOUNG_SINGLE);
  assert.ok(!r.closing.ladder.items.some((i) => i.key === "life-ruin" || i.key === "life-beyond-ruin"));
  assert.deepEqual(r.closing.cards.map((c) => [c.package, c.cover, money2(c.premiumMonthly), c.status, c.statusText]), CARDS.map((k) =>
    [k, 150000, "150.00", "no-life-plan", "No life plan: no one depends on you, so no life cover is planned."]));
  assert.deepEqual(r.closing.bands.map((x) => x.cover), [0, 0, 0], "the bands report the life cover funded: none");
});

test("default card is Essential; the chosen card fills life first in pass two, and a Tier 1 reorder still changes that", () => {
  const def = computeFactFinder(SAMPLE_FAMILY);
  assert.equal(def.closing.chosen.package, "essential");
  const ruin = (r: FactFinderResult): number => r.closing.ladder.items.find((i) => i.key === "life-ruin")!.allocated;
  assert.equal(money2(ruin(def)), "238.83");
  const rec = computeFactFinder(SAMPLE_FAMILY, { package: "recommended" });
  const order = rec.closing.ladder.items.map((i) => i.key);
  const moved = [...order];
  moved.splice(moved.indexOf("critical-illness"), 1);
  moved.splice(moved.indexOf("life-ruin"), 0, "critical-illness");
  const r = computeFactFinder(SAMPLE_FAMILY, { package: "recommended", ladderOrder: moved });
  assert.equal(money2(ruin(r)), "238.83", "CI moved above life: CI fills first in pass two");
  assert.equal(money2(r.closing.ladder.items.find((i) => i.key === "critical-illness")!.allocated), "294.30");
});

test("an order saved under one card still works under another (completeOrder)", () => {
  const rec = computeFactFinder(SAMPLE_FAMILY, { package: "recommended" });
  assert.ok(!rec.closing.ladderSpecs.some((s) => s.key === "life-beyond-ruin"), "no step beyond the Recommended card");
  const ess = computeFactFinder(SAMPLE_FAMILY, { ladderOrder: rec.closing.ladder.items.map((i) => i.key) });
  assert.deepEqual(ess.closing.ladder.items.map((i) => i.key), computeFactFinder(SAMPLE_FAMILY).closing.ladder.items.map((i) => i.key),
    "life-beyond-ruin is put back at its default place");
  assert.deepEqual(completeOrder(ess.closing.ladderSpecs, []), ess.closing.ladder.items.map((i) => i.key), "an empty order is the default order");
});

test("the slider reaches every screen: budget card, insurance budget and the close move together", () => {
  const band = computeFactFinder(SAMPLE_FAMILY).budget.band;
  for (const cap of [band.floor, band.recommended, band.ceiling]) {
    const r = computeFactFinder(SAMPLE_FAMILY, { package: "recommended", budgetMonthly: cap });
    assert.equal(money2(r.buckets.protection), money2(cap));
    assert.ok(Math.abs(r.insuranceBudget.groups[0].totalMonthly - r.closing.ladder.insuranceAllocated) < CENT);
    assert.equal(r.closing.ladder.insuranceCapMonthly, cap);
  }
});
