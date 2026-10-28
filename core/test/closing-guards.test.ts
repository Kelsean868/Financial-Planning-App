/**
 * Closing engine brief §7 guards 2–7, addendum §14 guards 8–12, and the §8 seams.
 * (Guard 1, upstream immutability, is in goldens-fact-finder.test.ts.)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeFactFinder, computeClosing, buildScopeStatement, scopeRow, buildSnapshot, requestReorder, allocateLadder,
  routeAnnuity, requireRegistered, registeredWithdrawalGrossUp, vehicleFigures, ProvenanceBuilder, RETURN_VEHICLES,
  REST_ASSURED_GRADING, UNKNOWN_SENTENCE, ADVENTURER_WORDING, ClosingInputError, RegisteredRoutingError, computeLovedOnes,
  SAMPLE_FAMILY, SAMPLE_YOUNG_SINGLE, type LifeCaseFacts,
} from "../src/index.ts";

const b = (): ProvenanceBuilder => new ProvenanceBuilder();
type Mutable<T> = { -readonly [K in keyof T]: T[K] };
const clone = (f: LifeCaseFacts): Mutable<LifeCaseFacts> => JSON.parse(JSON.stringify(f));

test("guard 2: unknown cover renders differently from a confirmed $0", () => {
  const unknown = clone(SAMPLE_FAMILY); // group life amount: null
  const zero = clone(SAMPLE_FAMILY);
  zero.existingCover = zero.existingCover.map((c) => (c.amount === null ? { ...c, amount: 0 } : c));
  const u = computeFactFinder(unknown).closing.scenarios.death.today;
  const z = computeFactFinder(zero).closing.scenarios.death.today;
  assert.deepEqual(u.unknowns, ["Group life through work"], "the uncaptured policy is named");
  assert.ok(u.sentences.includes(UNKNOWN_SENTENCE), "unknown renders the unknown sentence");
  assert.deepEqual(z.unknowns, [], "a confirmed zero is not unknown");
  assert.ok(!z.sentences.includes(UNKNOWN_SENTENCE), "a confirmed zero does not render the unknown sentence");
  assert.notDeepEqual(u.sentences, z.sentences);
  assert.equal(u.lumpAvailable, z.lumpAvailable, "neither is counted as money");
});

function variants(): LifeCaseFacts[] {
  const out: LifeCaseFacts[] = [];
  for (const base of [SAMPLE_FAMILY, SAMPLE_YOUNG_SINGLE]) {
    for (const gross of [6000, 9000, 12000, 17000, 30000, 60000]) {
      for (const costScale of [0.6, 1, 1.4]) {
        const f = clone(base);
        f.client = { ...f.client, grossMonthly: gross };
        f.budget = { ...f.budget, costs: f.budget.costs.map((c) => ({ ...c, monthly: c.monthly * costScale })) };
        out.push(f);
      }
    }
  }
  return out;
}

test("guard 3: no basket and no ladder exceeds the triage stage ceiling", () => {
  let checked = 0;
  for (const f of variants()) {
    // budgetMonthly is the insurance cap since F-18 and must sit inside the band, so the old $5,000 is now the band's
    // ceiling: the most the slider allows, with the biggest card.
    const top = computeFactFinder(f).budget.band.ceiling;
    for (const opt of [{ package: "essential" as const }, { package: "recommended" as const }, { package: "full" as const }, { budgetMonthly: top }, { package: "full" as const, budgetMonthly: top }]) {
      const r = computeFactFinder(f, opt);
      const ceiling = r.budget.ceilingMonthly;
      const bk = r.closing.chosen.basket;
      assert.ok(bk.totalHighMonthly <= ceiling + 1e-9, `basket top ${bk.totalHighMonthly} over ceiling ${ceiling} (stage ${r.budget.stage}, ${JSON.stringify(opt)})`);
      assert.ok(bk.totalMonthly <= ceiling + 1e-9, "basket mid over ceiling");
      assert.ok(r.closing.ladder.insuranceAllocated <= ceiling + 1e-9, `ladder insurance ${r.closing.ladder.insuranceAllocated} over ceiling ${ceiling}`);
      const unmet = r.closing.layers[4]!.lines.filter((l) => !l.met).map((l) => l.label);
      assert.deepEqual(bk.notCovered, unmet, "the basket names exactly what its cover does not reach");
      checked++;
    }
  }
  assert.ok(checked >= 100, `${checked} baskets checked`);
});

test("guard 4: identical inputs give byte-identical sentences", () => {
  const all = (f: LifeCaseFacts): string => {
    const c = computeFactFinder(f).closing;
    return JSON.stringify([c.layers.map((l) => l.outcome.sentences), Object.values(c.scenarios).map((s) => [s.today.sentences, s.plan.sentences]), c.parentFuneral.map((p) => p.sentence)]);
  };
  for (const f of [SAMPLE_FAMILY, SAMPLE_YOUNG_SINGLE]) {
    const a = all(f);
    const c = all(clone(f));
    assert.equal(Buffer.compare(Buffer.from(a), Buffer.from(c)), 0, "byte-identical");
  }
  const s = computeFactFinder(SAMPLE_FAMILY).closing.scenarios.death;
  assert.deepEqual(s.today.sentences.slice(0, 3), ["Your family receives $20,000.", "The mortgage of $420,000 stays.", "The money runs out in month 1."]);
  assert.ok(s.plan.sentences.includes("Your mother's care continues."), "the brief's required sentence renders for a parent dependant");
});

test("guard 5: every gap is in exactly one state", () => {
  const gaps = computeFactFinder(SAMPLE_FAMILY).closing.gaps;
  const rows = [
    scopeRow("death", "acted", "2026-10-27T10:00:00Z"),
    scopeRow("critical-illness", "declined", "2026-10-27T10:01:00Z", "Client will think about it"),
    scopeRow("critical-illness", "acted", "2026-10-27T10:05:00Z"),
    scopeRow("legacy", "out_of_scope", "2026-10-27T10:02:00Z"),
  ];
  const st = buildScopeStatement(gaps, rows);
  assert.equal(st.lines.length, gaps.length);
  for (const g of gaps) assert.equal(st.lines.filter((l) => l.gapKey === g.gapKey).length, 1, `${g.gapKey} appears once`);
  const groups = [st.acted, st.declined, st.outOfScope, st.notReviewed];
  assert.equal(groups.reduce((a, x) => a + x.length, 0), gaps.length, "the four groups partition the gaps");
  assert.equal(st.lines.find((l) => l.gapKey === "critical-illness")!.state, "acted", "the latest record wins");
  assert.ok(st.notReviewed.some((l) => l.gapKey === "retirement"), "a gap with no record is not reviewed");
  assert.throws(() => buildScopeStatement(gaps, [scopeRow("nonsense", "acted", "2026-10-27")]), ClosingInputError);
  assert.throws(() => scopeRow("death", "maybe" as never, "2026-10-27"), ClosingInputError);
  assert.throws(() => scopeRow("death", "declined", "yesterday"), ClosingInputError, "a declined record needs a date");
});

test("guard 6: Rest Assured II anywhere in a recommendation prints its grading", () => {
  const r = computeFactFinder(SAMPLE_FAMILY);
  const ra = r.closing.parentFuneral.filter((p) => p.product === "rest-assured-ii");
  assert.ok(ra.length > 0, "the family has Rest Assured II parent funeral cover");
  for (const p of ra) assert.equal(p.disclosure, REST_ASSURED_GRADING);
  const ib = r.insuranceBudget.groups.flatMap((g) => g.funded).filter((x) => x.product === "rest-assured-ii");
  for (const x of ib) assert.equal(x.disclosure, REST_ASSURED_GRADING);
  const lv = computeLovedOnes({ buyerRole: "adult-child", buyerAge: 45, budgetMonthly: 500, aims: { save: false, life: false, funeral: true, retire: false }, ones: [{ personId: "00000000-0000-4000-8000-0000000000aa", age: 75, relation: "elder" }] });
  const lvRa = lv.ones.flatMap((o) => o.plans).filter((p) => p.product === "rest-assured-ii");
  assert.ok(lvRa.length > 0);
  for (const p of lvRa) assert.equal(p.disclosure, REST_ASSURED_GRADING);
  assert.match(REST_ASSURED_GRADING, /year two .*greater of 25% of the sum assured or the premiums paid/);
  assert.match(REST_ASSURED_GRADING, /Accidental death pays in full from day one/);
});

test("guard 7: the $7,500 funeral grant only where 25+ contributions are affirmatively captured", () => {
  const f = clone(SAMPLE_FAMILY);
  f.parents = [
    { ...f.parents[0]!, nisContributions: "yes" },
    { ...f.parents[1]!, nisContributions: "unknown" },
    { ...f.parents[1]!, personId: "00000000-0000-4000-8000-0000000000bb", relationship: "grandfather", nisContributions: "no" },
  ];
  const pf = computeFactFinder(f).closing.parentFuneral;
  assert.equal(pf[0]!.nisGrant, 7500, "yes: grant applied");
  assert.equal(pf[1]!.nisGrant, 0, "unknown: nothing applied");
  assert.ok(pf[1]!.nisGrantFlag, "unknown raises a flag");
  assert.equal(pf[2]!.nisGrant, 0, "no: nothing applied");
  assert.equal(pf[2]!.nisGrantFlag, null);
  assert.equal(pf[0]!.sentence, "Your mother's funeral is covered. The funeral home can be paid directly, without waiting on probate.");
});

const RICH = { paysTax: true, grossAnnual: 200000, capHeadroomAnnual: 40000 };

test("guard 8: registered needs all three §12.3 conditions", () => {
  assert.equal(routeAnnuity(b(), { ageAtGoal: 60 }, RICH).mode, "registered", "all three hold");
  assert.equal(routeAnnuity(b(), { ageAtGoal: 60 }, { ...RICH, paysTax: false }).mode, "unregistered", "no tax paid");
  assert.equal(routeAnnuity(b(), { ageAtGoal: 49 }, RICH).mode, "unregistered", "goal before 50");
  assert.equal(routeAnnuity(b(), { ageAtGoal: 60 }, { ...RICH, capHeadroomAnnual: 0 }).mode, "unregistered", "no headroom");
  assert.equal(routeAnnuity(b(), { ageAtGoal: 50 }, RICH).mode, "registered", "50 counts");
});

test("guard 9: zero registered routings below the personal allowance (a hard block)", () => {
  let n = 0;
  for (let gross = 0; gross <= 90000; gross += 2500) {
    for (const age of [50, 60, 70]) {
      const client = { paysTax: true, grossAnnual: gross, capHeadroomAnnual: 60000 };
      const r = routeAnnuity(b(), { ageAtGoal: age }, client);
      assert.notEqual(r.mode, "registered", `gross ${gross}: registered routed below the allowance`);
      assert.equal(r.hardBlocked, true);
      assert.throws(() => requireRegistered(b(), { ageAtGoal: age }, client), RegisteredRoutingError, "the engine refuses, it does not warn");
      n++;
    }
  }
  for (const grossMonthly of [3000, 5000, 7000, 7500]) {
    const f = clone(SAMPLE_YOUNG_SINGLE);
    f.client = { ...f.client, grossMonthly };
    const r = computeFactFinder(f);
    assert.notEqual(r.retirement.routing.mode, "registered", `$${grossMonthly}/month routed registered`);
    assert.ok(!r.closing.ladderSpecs.some((s) => s.key === "token-annuity"), "no token registered annuity");
  }
  assert.ok(n > 100);
});

test("guard 10: a registered withdrawal before maturity grosses up need / 0.75", () => {
  for (const need of [0, 1, 7500, 12345.67, 1e6]) {
    assert.ok(Math.abs(registeredWithdrawalGrossUp(b(), need) - need / 0.75) < 1e-9, `need ${need}`);
  }
  assert.equal(registeredWithdrawalGrossUp(b(), 7500), 10000);
});

test("guard 11: no rate above a vehicle's floor in the vehicle tables", () => {
  for (const [id, r] of Object.entries(RETURN_VEHICLES)) {
    const floor = r.value.floor;
    for (const [k, v] of Object.entries(r.value)) {
      if (typeof v === "number") assert.ok(v <= floor, `vehicle ${id} holds ${k} = ${v}, above its floor ${floor}: no projected return in a vehicle table`);
    }
    const fig = vehicleFigures(b(), id as Parameters<typeof vehicleFigures>[1]);
    assert.equal(fig.guaranteedFloor, floor);
    assert.equal(fig.planningRateLabel, "advisor-set", "the planning rate is never shown as a product figure");
  }
  assert.equal(vehicleFigures(b(), "destiny-adventurer").wording, ADVENTURER_WORDING);
  assert.deepEqual(Object.fromEntries(Object.entries(RETURN_VEHICLES).map(([k, r]) => [k, r.value.floor])),
    { "destiny-settler": 0.02, "destiny-explorer": 0.01, "destiny-adventurer": 0, "platinum-edge": 0.025 });
});

test("guard 12: a cross-tier reorder writes a declined record and leaves the order unchanged", () => {
  const r = computeFactFinder(SAMPLE_FAMILY);
  const specs = r.closing.ladderSpecs;
  const order = r.closing.ladder.items.map((i) => i.key);
  const cross = requestReorder(specs, order, "retirement", order.indexOf("life-ruin"), "2026-10-27T11:00:00Z");
  assert.deepEqual(cross.order, order, "order unchanged");
  assert.equal(cross.declined.length, 1);
  assert.equal(cross.declined[0]!.state, "declined");
  assert.equal(cross.declined[0]!.gapKey, "reorder:retirement");
  const st = buildScopeStatement(r.closing.gaps, cross.declined);
  assert.equal(st.declinedRequests.length, 1, "the declined request is on the scope statement");
  const tier2 = order.filter((k) => specs.find((s) => s.key === k)!.tier === 2);
  const inside = requestReorder(specs, order, tier2[1]!, order.indexOf(tier2[0]!), "2026-10-27T11:01:00Z");
  assert.equal(inside.declined.length, 0, "inside a tier: no record");
  assert.equal(inside.order.indexOf(tier2[1]!), order.indexOf(tier2[0]!), "inside a tier: moved");
  const re = allocateLadder(r.budget, specs, inside.order);
  assert.ok(re.items.every((it, i) => i === 0 || re.items[i - 1]!.tier <= it.tier), "tiers stay in order after a reorder");
});

test("§11.6 stage 0: the ladder returns no basket, only what would change the picture", () => {
  const f = clone(SAMPLE_FAMILY);
  f.client = { ...f.client, grossMonthly: 9000 };
  f.partner = null;
  const r = computeFactFinder(f);
  assert.equal(r.budget.stage, 0);
  assert.equal(r.closing.ladder.underwater, true);
  assert.equal(r.closing.ladder.items.length, 0);
  assert.ok(r.closing.ladder.whatWouldChange!.shortfallMonthly > 0);
  assert.equal(r.closing.chosen.basket.items.length, 0, "no basket at stage 0");
});

test("§8: ClosingInputError when an upstream engine did not run; never a default", () => {
  const r = computeFactFinder(SAMPLE_FAMILY);
  const ctx = { facts: r.facts, budget: r.budget, debts: r.debts, careGraph: r.careGraph, deathNeed: r.deathNeed, retirement: r.retirement, goals: r.goals };
  for (const k of Object.keys(ctx) as (keyof typeof ctx)[]) {
    const partial = { ...ctx, [k]: undefined };
    assert.throws(() => computeClosing(partial), ClosingInputError, `missing ${k}`);
  }
});

test("§2.5: a snapshot stores premium bands with their label, never a price", () => {
  const r = computeFactFinder(SAMPLE_FAMILY);
  const snap = buildSnapshot({ closing: r.closing, scope: buildScopeStatement(r.closing.gaps, []), assumptionSetId: r.assumptionSetId, engineVersion: "test-hash" });
  const labels = new Set<string>();
  JSON.stringify(snap, (k, v) => { if (k === "band" || k === "premium") { if (v) labels.add(v.label); } return v; });
  assert.ok(labels.size > 0);
  for (const l of labels) assert.ok(l === "rough" || l === "the minimum premium", `band label ${l}`);
  assert.throws(() => buildSnapshot({ closing: r.closing, scope: buildScopeStatement(r.closing.gaps, []), assumptionSetId: r.assumptionSetId, engineVersion: "" }), ClosingInputError);
});
