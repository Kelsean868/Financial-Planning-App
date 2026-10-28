/**
 * Section 2 guard 14 (goldens), care graph guard 2 (golden numbers, inverted gate) and closing
 * guard 1 (upstream immutability). Numbers from the prototype v17, 27 Oct 2026; each moves only with
 * a recorded re-baseline (closing addendum §14.1). Assumption set `ff-2026-10-27-ladder2`.
 *
 * Two checks per figure: the signed rounded golden exactly, and the prototype's full-precision value
 * (traced in the run record §6) to 1e-6, so a drift too small to move the rounding is still caught.
 *
 * Re-baseline 27 Oct 2026 (Kyron, Decision 1 = A; docs/audit/RUN-2026-10-27-fix-nis70.md): PAYE deducts
 * 70% of the employee's NIS (IRD TD1 2023, line 4(b)), not the prototype's 100%. Only the two ceilings
 * moved: family 725 -> 711 (724.6125 -> 710.8425), young single 376 -> 374 (375.7625 -> 374.1425).
 *
 * One-allocator fix 27 Oct 2026 (Kyron, Decisions 3 = A and 4 = A; docs/audit/RUN-2026-10-27-fix-one-allocator.md):
 * no golden here moved; the assumption set id did (was `ff-2026-10-27-nis70`). The death scenario sentences are
 * pinned from this run (they were unpinned before it; the same lines before and after the fix).
 *
 * Fix run 3, 27 Oct 2026 (Kyron, Decisions 5, 6 and 7 = A; docs/audit/RUN-2026-10-27-fix-ladder-advice.md): no golden
 * number here moved; the assumption set id did (was `ff-2026-10-27-ladder1`). The "with the plan" death sentences moved:
 * the close screen's life package is now what the ladder funds (Change 6), not the recommended package's own split.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeFactFinder, careGraph, careGraphInputFromFacts, SAMPLE_FAMILY, SAMPLE_YOUNG_SINGLE,
  CARE_GRAPH_FIXTURE_NET_MONTHLY, withChildBInUK, applyLever, ASSUMPTION_SET_ID,
} from "../src/index.ts";

const eq = (name: string, produced: number, expected: number): void =>
  assert.equal(Math.round(produced), expected, `${name}: produced ${produced}, golden ${expected}`);
const near = (name: string, produced: number, prototype: number): void =>
  assert.ok(Math.abs(produced - prototype) < 1e-6, `${name}: produced ${produced}, prototype ${prototype}`);
const thousands = (x: number): number => Math.round(x / 1000) * 1000;

test("goldens are pinned to assumption set ff-2026-10-27-ladder2", () => {
  assert.equal(ASSUMPTION_SET_ID, "ff-2026-10-27-ladder2");
});

test("death scenario sentences, both samples (pinned 27 Oct 2026, one-allocator fix; re-baselined in fix run 3)", () => {
  const fam = computeFactFinder(SAMPLE_FAMILY).closing.scenarios.death;
  const careAndEdu = (xs: readonly string[]): string[] => xs.filter((s) => /'s (care|degree) /.test(s));
  assert.deepEqual(careAndEdu(fam.today.sentences), [
    "Your mother's care continues.", "Your father's care stops in month 1.", "Child B's degree stops in month 1.", "Child A's degree stops in month 1.",
  ]);
  // Fix run 3: the plan's life cover is the ladder's $823,567 (the ruin level), not the recommended package's $1,727,351.
  // Was: the father's care continues; Child B's degree stops in month 2; the family receives $1,747,351.
  assert.deepEqual(careAndEdu(fam.plan.sentences), [
    "Your mother's care continues.", "Your father's care stops in month 1.", "Child B's degree stops in month 1.", "Child A's degree stops in month 1.",
  ]);
  assert.equal(fam.plan.sentences[0], "Your family receives $843,567.");
  const young = computeFactFinder(SAMPLE_YOUNG_SINGLE).closing.scenarios.death;
  assert.deepEqual(young.today.sentences, [
    "Your family receives $4,000.", "Your funeral falls on the family.", "Final medical bills fall on the family.",
    "The $3,000 of expensive debt stays with the family.", "The household has enough to live on until the youngest is 19.",
    "We did not capture this. It is not counted either way.",
  ]);
  // Fix run 3: no one depends on her, so the plan holds no life cover (Decision 7 = A) and the plan's death sentences are
  // today's. Was: "Your family receives $154,000.", and the funeral, final medical bills and the debt paid.
  assert.deepEqual(young.plan.sentences, young.today.sentences);
  assert.ok(!young.plan.sentences.some((s) => /degree/.test(s)), "the young single has no degree lines");
});

test("§2.8 sample family", () => {
  const r = computeFactFinder(SAMPLE_FAMILY);
  assert.equal(r.budget.stage, 2, "stage");
  // NIS 70% re-baseline: was 725 (724.6125000000002).
  eq("ceiling", r.budget.ceilingMonthly, 711); near("ceiling", r.budget.ceilingMonthly, 710.8425000000007);
  eq("care save", r.careGraph.funding.saveFromToday, 3837); near("care save", r.careGraph.funding.saveFromToday, 3836.832922361326);
  eq("already paying", r.careGraph.funding.alreadyPaying, 4000);
  eq("care PV", r.careGraph.funding.ifYouDieTomorrow, 1263107); near("care PV", r.careGraph.funding.ifYouDieTomorrow, 1263107.2588376082);
  eq("peak", r.careGraph.peak.monthly, 17391); near("peak", r.careGraph.peak.monthly, 17391.466126908694);
  assert.equal(r.careGraph.peak.atAge, 54, "peak age");
  assert.equal(r.careGraph.sandwichYears, 8, "sandwich years");
  assert.equal(r.careGraph.finishAge, 55, "finish age");
  eq("cover essential", r.deathNeed.tiers.essential, 823567); near("cover essential", r.deathNeed.tiers.essential, 823566.766256042);
  eq("cover recommended", r.deathNeed.tiers.recommended, 1994846); near("cover recommended", r.deathNeed.tiers.recommended, 1994846.1357406415);
  eq("cover full", r.deathNeed.tiers.full, 2236674); near("cover full", r.deathNeed.tiers.full, 2236674.0250936504);
  eq("needs", r.budget.needsMonthly, 15140);
  eq("living", r.budget.livingMonthly, 6700);
});

test("§2.8 sample young single (age 24, $8,000 gross, renting)", () => {
  const r = computeFactFinder(SAMPLE_YOUNG_SINGLE);
  assert.equal(r.budget.stage, 1, "stage");
  // NIS 70% re-baseline: was 376 (375.76250000000005).
  eq("ceiling", r.budget.ceilingMonthly, 374); near("ceiling", r.budget.ceilingMonthly, 374.14250000000004);
  assert.equal(r.careGraph.goals.length, 0, "no care");
  assert.equal(r.careGraph.funding.saveFromToday, 0, "no care saving");
  for (const t of ["essential", "recommended", "full"] as const) eq(`cover ${t}`, r.deathNeed.tiers[t], 149000);
  eq("needs", r.budget.needsMonthly, 5450);
  eq("living", r.budget.livingMonthly, 5300);
});

test("care graph §3 canonical case (household net $14,000)", () => {
  const cg = careGraph(careGraphInputFromFacts(SAMPLE_FAMILY), CARE_GRAPH_FIXTURE_NET_MONTHLY);
  eq("peak", cg.peak.monthly, 17391);
  assert.equal(cg.peak.atAge, 54, "peak at client age 54");
  assert.equal(cg.sandwichYears, 8, "sandwich years");
  assert.equal(cg.finishAge, 55, "finish age");
  assert.equal(thousands(cg.nominalTotal), 2078000, `nominal ${cg.nominalTotal}`);
  near("nominal", cg.nominalTotal, 2078167.5911021903);
  eq("save from today", cg.funding.saveFromToday, 3837);
  eq("already paying", cg.funding.alreadyPaying, 4000);
  assert.equal(thousands(cg.funding.ifYouDieTomorrow), 1263000, `PV ${cg.funding.ifYouDieTomorrow}`);
});

test("care graph §3 variant: Child B to the United Kingdom", () => {
  const input = careGraphInputFromFacts(withChildBInUK(SAMPLE_FAMILY));
  const cg = careGraph(input, CARE_GRAPH_FIXTURE_NET_MONTHLY);
  eq("peak", cg.peak.monthly, 50753); near("peak", cg.peak.monthly, 50753.23539136213);
  assert.equal(cg.sandwichYears, 8, "sandwich years");
  assert.equal(thousands(cg.nominalTotal), 3406000, `nominal ${cg.nominalTotal}`);
  eq("save from today", cg.funding.saveFromToday, 16487); near("save", cg.funding.saveFromToday, 16486.681790825456);
  assert.equal(thousands(cg.funding.ifYouDieTomorrow), 2161000, `PV ${cg.funding.ifYouDieTomorrow}`);
  const top = cg.topLevers[0]!;
  assert.equal(top.label, "Send Child B locally", "top lever");
  eq("top lever worth", top.monthlyReduction, 12650); near("top lever", top.monthlyReduction, 12649.84886846413);
  // and the lever really lands the base case
  const back = careGraph(applyLever(input, top), CARE_GRAPH_FIXTURE_NET_MONTHLY);
  eq("after the lever", back.funding.saveFromToday, 3837);
});

test("closing guard 1: the closing comparison reproduces the care graph goldens (upstream immutability)", () => {
  const r = computeFactFinder(SAMPLE_FAMILY);
  const alone = careGraph(careGraphInputFromFacts(SAMPLE_FAMILY), r.budget.netPay.householdNetMonthly);
  assert.deepEqual(r.careGraph.funding, alone.funding, "the pipeline and the care graph alone agree");
  eq("PV seen by closing", r.careGraph.funding.ifYouDieTomorrow, 1263107);
  eq("peak seen by closing", r.careGraph.peak.monthly, 17391);
  assert.equal(r.careGraph.sandwichYears, 8);
  assert.equal(r.careGraph.finishAge, 55);
  const careLines = r.closing.layers[4]!.lines.filter((l) => l.kind === "care");
  const careGoal = r.careGraph.goals.find((g) => g.kind === "care")!;
  assert.equal(careLines[0]!.amount, careGoal.presentValue, "closing uses the care graph's PV, not its own");
  // running the closing did not mutate its inputs
  assert.ok(Object.isFrozen(SAMPLE_FAMILY), "sample facts stay frozen");
  assert.ok(Object.isFrozen(r.careGraph.provenance), "upstream provenance is frozen");
});
