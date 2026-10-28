/**
 * Section 3 (signed 28 Oct 2026) guards 28 to 33, each sabotage-tested (docs/audit/RUN-2026-10-28-section3-a.md §5), and
 * the §14 seams: the version-1 upgrade on read, the §14.3 errors, and the co-signed debt cover (F-16).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeFactFinder, computeRoomPlan, applyRoomPlan, payoffMonths, toMonthly, validateLifeCaseFacts, upgradeLifeCaseFacts,
  ProvenanceBuilder, LifeCaseFactsError, ROOM_ORDER, SAMPLE_FAMILY, SAMPLE_YOUNG_SINGLE, SAMPLE_FAMILY_V1, SAMPLE_YOUNG_SINGLE_V1,
  SAMPLE_WEEKLY_RENTER, type FactFinderResult, type LifeCaseFacts,
} from "../src/index.ts";
import { variants } from "./ladder-cases.ts";
import { clone, setGross, scaleCosts, setPartnerIncome } from "./facts-helpers.ts";

const b = (): ProvenanceBuilder => new ProvenanceBuilder();
const near = (x: number, y: number, eps = 1e-6): boolean => Math.abs(x - y) <= eps;
const FLOOR = 200;

/* ------------------------------------------------------------------ guard 28 */

test("guard 28: frequency maths — weekly ×52/12, fortnightly ×26/12, twice a month ×2, monthly ×1, yearly ÷12", () => {
  assert.equal(toMonthly(b(), 1200, "weekly"), 5200, "weekly");
  assert.equal(toMonthly(b(), 1200, "fortnightly"), 2600, "fortnightly");
  assert.equal(toMonthly(b(), 1200, "semimonthly"), 2400, "twice a month");
  assert.equal(toMonthly(b(), 1200, "monthly"), 1200, "monthly");
  assert.equal(toMonthly(b(), 1200, "yearly"), 100, "yearly");
  // End to end: one line and the pay, at each frequency, against hand-worked monthly figures.
  for (const [freq, monthly] of [["weekly", 5200], ["fortnightly", 2600], ["monthly", 1200], ["yearly", 100]] as const) {
    const f = clone(SAMPLE_YOUNG_SINGLE);
    f.budget.groups = [...f.budget.groups, { key: "other", skip: false, total: null, totalFrequency: null, lines: [{ label: "Anything else", amount: 1200, frequency: freq }] }];
    assert.ok(near(computeFactFinder(f).budget.needsMonthly - 5450, monthly), `a ${freq} line of $1,200 adds $${monthly} a month to needs`);
  }
  for (const [freq, monthly] of [["weekly", 8666.666666666666], ["fortnightly", 4333.333333333333], ["semimonthly", 4000], ["monthly", 2000]] as const) {
    const f = clone(SAMPLE_YOUNG_SINGLE);
    f.client = { ...f.client, pay: { frequency: freq, amountPerPay: 2000, varies: false, lowestMonthly: null } };
    assert.ok(near(computeFactFinder(f).budget.netPay.grossMonthly, monthly), `$2,000 paid ${freq} is $${monthly} a month gross`);
  }
});

test("guard 28: a weekly-paid client's NIS is worked on the week's pay and equals the monthly sum", () => {
  for (const weekly of [500, 1730, 3138, 5000]) {
    const w = clone(SAMPLE_YOUNG_SINGLE);
    w.client = { ...w.client, pay: { frequency: "weekly", amountPerPay: weekly, varies: false, lowestMonthly: null } };
    const r = computeFactFinder(w).budget.netPay;
    const hand = 0.054 * Math.min(weekly, 13600 * 12 / 52) * 52 / 12;
    assert.ok(near(r.nisMonthly, hand), `$${weekly} a week: NIS ${r.nisMonthly}, hand-worked ${hand}`);
  }
});

/* ------------------------------------------------------------------ guard 29 */

/** Every budget line a month, worked out here from the facts (not by the engine), less saving and parents' care. */
function linesByHand(f: LifeCaseFacts): number {
  const per = { weekly: 52 / 12, fortnightly: 26 / 12, monthly: 1, yearly: 1 / 12 } as const;
  let sum = 0;
  for (const g of f.budget.groups) {
    if (g.key === "save") continue;
    if (g.skip) { sum += (g.total ?? 0) * per[g.totalFrequency ?? "monthly"]; continue; }
    for (const l of g.lines) if (l.personId === undefined) sum += l.amount * per[l.frequency];
  }
  return sum;
}

function assertBudgetAddsUp(f: LifeCaseFacts, label: string): FactFinderResult {
  const r = computeFactFinder(f);
  const debts = f.debts.items.reduce((a, d) => a + (d.balance > 0 ? d.minimumMonthly : 0), 0);
  const care = r.careGraph.funding.alreadyPaying;
  assert.ok(near(r.budget.needsMonthly, linesByHand(f) + debts + care), `${label}: needs ${r.budget.needsMonthly} = lines ${linesByHand(f)} + debt payments ${debts} + care today ${care}`);
  assert.ok(near(r.budget.costsMonthly + r.budget.irregularMonthly, linesByHand(f)), `${label}: costs and once-a-year bills hold the budget lines only, no debt payment and no parent's care`);
  const a = r.budgetAnalysis;
  const rows = a.groups.filter((g) => g.kind !== "saving").reduce((x, g) => x + g.monthly, 0);
  assert.ok(near(rows, r.budget.needsMonthly), `${label}: the analysis rows add to needs (${rows} vs ${r.budget.needsMonthly})`);
  assert.equal(a.groups.filter((g) => g.key === "debts").length, 1, `${label}: one debt row`);
  assert.ok(near(a.groups.find((g) => g.key === "debts")!.monthly, debts), `${label}: the debt row is the debt payments`);
  assert.ok(near(a.outgoingMonthly, r.budget.needsMonthly + a.savingMonthly), `${label}: going out = needs + saving`);
  return r;
}

test("guard 29: budget lines add to the totals the rest of the engine uses; debts and parent care are never counted twice", () => {
  const fam = assertBudgetAddsUp(SAMPLE_FAMILY, "sample family");
  assert.equal(Math.round(fam.budget.needsMonthly), 15140, "the family's needs golden");
  assertBudgetAddsUp(SAMPLE_YOUNG_SINGLE, "young single");
  assertBudgetAddsUp(SAMPLE_WEEKLY_RENTER, "weekly renter");
  // The father's $4,000 line is counted once: taking it away takes $4,000 off needs, not $0 or $8,000.
  const noLine = clone(SAMPLE_FAMILY);
  noLine.budget.groups = noLine.budget.groups.map((g) => (g.key === "family" ? { ...g, lines: g.lines.map((l) => ({ ...l, amount: 0 })) } : g));
  assert.ok(near(fam.budget.needsMonthly - assertBudgetAddsUp(noLine, "no father's line").budget.needsMonthly, 4000), "the parent's line is counted once");
  // A relative's line (no personId) is spending; a parent's line in another group is still care, once.
  const mixed = clone(SAMPLE_FAMILY);
  mixed.budget.groups = mixed.budget.groups.map((g) => (g.key === "family" ? { ...g, lines: [...g.lines, { label: "Aunt", amount: 250, frequency: "monthly" as const }] } : g));
  mixed.budget.groups = mixed.budget.groups.map((g) => (g.key === "food" ? { ...g, lines: [...g.lines, { label: "Father's groceries", amount: 100, frequency: "weekly" as const, personId: SAMPLE_FAMILY.parents[1]!.personId }] } : g));
  const m = assertBudgetAddsUp(mixed, "relative and a parent's line in Food");
  assert.ok(near(m.budget.needsMonthly - fam.budget.needsMonthly, 250 + 100 * 52 / 12), "the relative adds once; the father's groceries add once, as care");
  // A debt payment never enters the budget: adding a debt moves needs by its payment only.
  const debt = clone(SAMPLE_FAMILY);
  debt.debts.items = [...debt.debts.items, { label: "Hire purchase", type: "hire-purchase", lender: null, balance: 9000, ratePct: 18, minimumMonthly: 410, endDate: null, cosigned: false, cosignerName: null }];
  assert.ok(near(assertBudgetAddsUp(debt, "one more debt").budget.needsMonthly - fam.budget.needsMonthly, 410), "a debt payment counts once");
});

/* ------------------------------------------------------------------ guard 30 */

/** Low-income variants to reach §5.3 (ceiling under $200, $200 or more left) and §5.4 (under $200 left). */
function floorVariants(): LifeCaseFacts[] {
  const out: LifeCaseFacts[] = [...variants(), SAMPLE_WEEKLY_RENTER];
  for (const base of [SAMPLE_YOUNG_SINGLE, SAMPLE_WEEKLY_RENTER, SAMPLE_FAMILY]) {
    for (const gross of [5500, 6000, 6500, 7000, 7500, 8000, 9000]) {
      for (const k of [0.8, 0.9, 1, 1.1]) {
        const f = clone(base);
        setGross(f, gross);
        scaleCosts(f, k);
        if (base === SAMPLE_FAMILY) setPartnerIncome(f, 0);
        out.push(f);
      }
    }
  }
  return out;
}

test("guard 30: insurance is never below $200 except at stage 0, and stage 0 still has no plan", () => {
  const seen = { stage0: 0, short: 0, aboveSafe: 0, floorLifts: 0, plain: 0 };
  for (const f of floorVariants()) {
    const r = computeFactFinder(f);
    const L = r.closing.ladder;
    const rg = r.insuranceRange;
    const label = `gross ${r.budget.netPay.grossMonthly}, stage ${r.budget.stage}, left ${r.budget.surplusMonthly.toFixed(2)}`;
    if (r.budget.stage === 0) {
      seen.stage0++;
      assert.ok(L.underwater && L.items.length === 0 && L.insuranceAllocated === 0 && L.insuranceCapMonthly === 0, `${label}: stage 0 has no plan`);
      assert.ok(L.whatWouldChange && L.whatWouldChange.shortfallMonthly > 0, `${label}: stage 0 says what would change the picture`);
      assert.ok(rg.noPlan && rg.stage0 && rg.shortByMonthly === 0, `${label}: the floor never overrides stage 0`);
      continue;
    }
    if (r.budget.surplusMonthly < FLOOR) {
      seen.short++;
      assert.ok(rg.noPlan && near(rg.shortByMonthly, FLOOR - r.budget.surplusMonthly), `${label}: "you need $X more a month" = $200 less money left`);
      assert.equal(L.insuranceCapMonthly, 0, `${label}: no insurance plan yet`);
      assert.equal(L.insuranceAllocated, 0, `${label}: nothing allocated to insurance`);
      assert.ok(r.closing.bands.every((x) => x.monthly === 0), `${label}: no band`);
      continue;
    }
    assert.ok(L.insuranceCapMonthly >= FLOOR - 1e-9, `${label}: the cap ${L.insuranceCapMonthly} is below the $200 floor`);
    assert.ok(near(L.insuranceCapMonthly, Math.max(FLOOR, r.budget.band.recommended)), `${label}: the cap is max($200, recommended)`);
    assert.ok(r.closing.bands.every((x) => x.monthly >= FLOOR - 1e-9), `${label}: no band below the floor`);
    assert.ok(near(rg.minMonthly, FLOOR) && near(rg.maxMonthly, Math.max(r.budget.ceilingMonthly, FLOOR)), `${label}: the slider runs from $200 to max(ceiling, $200)`);
    assert.equal(L.aboveSafeRange, L.insuranceCapMonthly > r.budget.ceilingMonthly + 1e-9, `${label}: "above the safe range" exactly when the cap is above the ceiling`);
    if (r.budget.ceilingMonthly < FLOOR) seen.aboveSafe++;
    else if (r.budget.band.recommended < FLOOR) seen.floorLifts++;
    else seen.plain++;
  }
  for (const [k, n] of Object.entries(seen)) assert.ok(n > 0, `the sweep reaches the ${k} case (${JSON.stringify(seen)})`);
});

/* ------------------------------------------------------------------ guard 31 */

function foodCut(f: LifeCaseFacts, cut: number): { r: FactFinderResult; target: number } {
  const r = computeFactFinder(f);
  return { r, target: r.budgetAnalysis.groups.find((g) => g.key === "food")!.monthly - cut };
}

test("guard 31: Make room sends freed money in the §6.3 plan order", () => {
  assert.deepEqual([...ROOM_ORDER], ["shortfall", "buffer", "protection", "debt", "emergency", "retirement", "goals"]);
  for (const f of [SAMPLE_FAMILY, SAMPLE_YOUNG_SINGLE, SAMPLE_WEEKLY_RENTER, ...variants().slice(0, 40)]) {
    for (const cut of [50, 150, 400, 900]) {
      const { r, target } = foodCut(f, cut);
      if (target < 0) continue;
      const p = computeRoomPlan(r, { groupTargets: { food: target } });
      assert.ok(near(p.freedMonthly, cut), "freed is what the target takes off");
      let left = p.freedMonthly;
      for (const d of p.defaultSplit) {
        const want = d.key === "retirement" ? null : Math.min(left, d.neededMonthly!);
        if (want !== null) assert.ok(near(d.monthly, want), `${d.key} gets ${d.monthly}; in plan order it gets ${want} (left ${left})`);
        left -= d.monthly;
      }
      assert.ok(near(p.assignedMonthly, p.freedMonthly) && near(p.notGivenAJobMonthly, 0), "the default split gives every dollar a job");
    }
  }
  // The family: $100 freed. One month is saved, so the floor and the insurance budget come next, before the card.
  const { r, target } = foodCut(SAMPLE_FAMILY, 100);
  const p = computeRoomPlan(r, { groupTargets: { food: target } });
  assert.deepEqual(p.defaultSplit.map((d) => [d.key, Math.round(d.monthly * 100) / 100]), [
    ["buffer", 0], ["protection", 18.75], ["debt", 81.25], ["emergency", 0], ["retirement", 0], ["goals", 0],
  ]);
});

test("guard 31: a custom split is validated — never more than freed; the rest is 'not yet given a job'", () => {
  const { r, target } = foodCut(SAMPLE_FAMILY, 500);
  const ok = computeRoomPlan(r, { groupTargets: { food: target }, split: { protection: 150, debt: 100, "group:food": 50 } });
  assert.equal(ok.custom, true);
  assert.ok(near(ok.notGivenAJobMonthly, 200), "$200 not yet given a job");
  assert.ok(near(ok.effects.groupsAfter.find((g) => g.key === "food")!.afterMonthly, target + 50), "Spend more on Food raises Food");
  assert.ok(near(ok.effects.insuranceBudgetMonthly, r.closing.ladder.insuranceCapMonthly + 150), "protection raises the insurance budget");
  assert.ok(near(ok.effects.debtExtraMonthly, SAMPLE_FAMILY.debts.extraMonthly + 100), "extra on expensive debt");
  assert.throws(() => computeRoomPlan(r, { groupTargets: { food: target }, split: { protection: 400, debt: 100.01 } }), LifeCaseFactsError, "more than freed");
  assert.throws(() => computeRoomPlan(r, { groupTargets: { food: target }, split: { holiday: 10 } as never }), LifeCaseFactsError, "not a destination");
  assert.throws(() => computeRoomPlan(r, { groupTargets: { food: target }, split: { "group:save": 10 } as never }), LifeCaseFactsError, "saving is not a Spend more on group");
  assert.throws(() => computeRoomPlan(r, { groupTargets: { food: -1 } }), LifeCaseFactsError, "a negative target");
  // "Use this plan": the applied facts run, and the real facts are unchanged.
  const applied = applyRoomPlan(SAMPLE_FAMILY, ok);
  const after = computeFactFinder(applied.facts, applied.options);
  assert.ok(near(after.budget.needsMonthly, r.budget.needsMonthly - 500 + 50), "the plan's budget is the targets plus Spend more on");
  assert.ok(near(after.closing.ladder.insuranceCapMonthly, applied.options.budgetMonthly!), "the plan's insurance budget is in use");
  assert.equal(after.facts.debts.extraMonthly, SAMPLE_FAMILY.debts.extraMonthly + 100);
  assert.equal(computeFactFinder(SAMPLE_FAMILY).budget.needsMonthly, r.budget.needsMonthly, "the real numbers stay");
});

/* ------------------------------------------------------------------ guard 32 */

/** Month by month, interest first: the independent check on the closed form. */
function simulateMonths(balance: number, ratePct: number, pay: number): number | null {
  let bal = balance;
  for (let m = 1; m <= 1200; m++) {
    const interest = bal * ratePct / 1200;
    if (pay <= interest) return null;
    bal = bal + interest - pay;
    if (bal <= 1e-6) return m;
  }
  return null;
}

test("guard 32: payoff months from balance, rate and payment; a payment that does not cover the interest never clears", () => {
  for (const [bal, rate, pay] of [[18000, 24, 650], [18000, 24, 540], [45000, 14, 900], [38000, 8.5, 1100], [7000, 12, 350], [6000, 24, 250], [5000, 0, 300], [1000, 30, 1001]] as const) {
    assert.equal(payoffMonths(bal, rate, pay), simulateMonths(bal, rate, pay), `$${bal} at ${rate}% paying $${pay}`);
  }
  assert.equal(payoffMonths(18000, 24, 650), 41, "hand-worked: −ln(1 − 0.02 × 18000/650) / ln 1.02 = 40.7, so 41 payments");
  assert.equal(payoffMonths(18000, 24, 360), null, "a payment equal to the interest never clears");
  assert.equal(payoffMonths(18000, 24, 300), null, "below the interest: never clears");
  assert.equal(payoffMonths(0, 24, 300), 0, "no balance: cleared");
  const f = clone(SAMPLE_FAMILY);
  f.debts.items = [...f.debts.items, { label: "Informal", type: "informal", lender: null, balance: 10000, ratePct: 36, minimumMonthly: 250, endDate: "2028-01", cosigned: false, cosignerName: null }];
  const r = computeFactFinder(f, { asOfMonth: "2026-10" });
  const bad = r.debtPayoff.debts[2]!;
  assert.ok(bad.neverClears && bad.payoffMonth === null && !bad.mismatch, "never clears is flagged, not a mismatch");
  assert.ok(r.debtPayoff.anyNeverClears && r.debtPayoff.debtFree.minimumsOnly.months === null, "minimums only: never debt-free");
  const w = computeFactFinder(SAMPLE_WEEKLY_RENTER, { asOfMonth: "2026-10" }).debtPayoff.debts[0]!;
  assert.deepEqual([w.months, w.payoffMonth, w.endDateDiffMonths, w.mismatch], [34, "2029-08", 14, true], "more than 3 months apart: both dates shown");
});

/* ------------------------------------------------------------------ guard 33 */

test("guard 33: the retirement figure is max(A, B) × (1 + i)^n, to the dollar", () => {
  const cases: [LifeCaseFacts, number][] = [[SAMPLE_FAMILY, 15140 - 3000 - 800 - 4000 - 1440], [SAMPLE_YOUNG_SINGLE, 5450 - 150], [SAMPLE_WEEKLY_RENTER, 0]];
  for (const [f, handB] of cases) {
    const r = computeFactFinder(f);
    const x = r.retirementFigure;
    const n = f.wishes.retireAge - f.client.age;
    const A = 0.7 * r.budget.netPay.householdNetMonthly;
    const B = f === SAMPLE_WEEKLY_RENTER ? r.budget.needsMonthly - 250 - 100 * 52 / 12 : handB;
    assert.ok(near(x.incomeRuleMonthly, A), "A = 70% of household take-home");
    assert.ok(near(x.lifestyleRuleMonthly, B), `B = spending less what stops: ${x.lifestyleRuleMonthly} vs ${B}`);
    assert.equal(Math.round(x.atRetirementMonthly), Math.round(Math.max(A, B) * Math.pow(1.03, n)), `figure ${x.atRetirementMonthly}`);
    assert.equal(x.yearsToRetirement, n);
  }
  // The young single's lifestyle rule is the larger: rent never stops (§1.1), so the figure must not use A alone.
  const y = computeFactFinder(SAMPLE_YOUNG_SINGLE).retirementFigure;
  assert.equal(y.rule, "lifestyle");
});

/* ------------------------------------------------------------------ §14.1 upgrade, §14.3 errors, F-16 */

test("§14.1: a version-1 case is upgraded on read and computes exactly as before", () => {
  for (const [v1, v2] of [[SAMPLE_FAMILY_V1, SAMPLE_FAMILY], [SAMPLE_YOUNG_SINGLE_V1, SAMPLE_YOUNG_SINGLE]] as const) {
    const up = upgradeLifeCaseFacts(v1);
    assert.equal(up.schemaVersion, 2);
    assert.deepEqual(validateLifeCaseFacts(v1), up, "validate upgrades version 1");
    assert.equal(up.budget.groups[0]!.key, "quick", "the cost lines become one quick group");
    const a = computeFactFinder(v1);
    const c = computeFactFinder(v2);
    for (const k of ["budget", "careGraph", "deathNeed", "retirement", "goals", "buckets", "closing", "insuranceBudget", "healthScore", "debts", "retirementFigure", "insuranceRange"] as const) {
      assert.deepEqual(a[k], c[k], `${k}: the upgraded version 1 sample computes as the version 2 sample`);
    }
  }
  const up = upgradeLifeCaseFacts(SAMPLE_FAMILY_V1);
  const fam = up.budget.groups.find((g) => g.key === "family")!;
  assert.deepEqual(fam.lines.map((l) => [l.label, l.amount, l.personId]), [["Mother", 0, SAMPLE_FAMILY.parents[0]!.personId], ["Father", 4000, SAMPLE_FAMILY.parents[1]!.personId]], "each parent's care share becomes a line");
  assert.ok(up.budget.groups[0]!.lines.find((l) => l.label === "Mortgage payment")!.stop === "mortgage", "the housing payment line is tagged");
  assert.deepEqual(up.existingCover.map((c) => c.status), ["unsure", "none", "none"]);
  const broken = JSON.parse(JSON.stringify(SAMPLE_FAMILY_V1));
  broken.budget.housingPaymentMonthly = 3100;
  assert.throws(() => validateLifeCaseFacts(broken), LifeCaseFactsError, "a version 1 housing payment that is not a cost line");
});

test("§14.3: bad facts throw LifeCaseFactsError", () => {
  const cases: [string, (f: any) => void][] = [
    ["a negative line amount", (f) => { f.budget.groups[0].lines[0].amount = -1; }],
    ["an unknown line frequency", (f) => { f.budget.groups[0].lines[0].frequency = "daily"; }],
    ["an unknown pay frequency", (f) => { f.client.pay.frequency = "quarterly"; }],
    ["negative pay", (f) => { f.client.pay.amountPerPay = -5; }],
    ["pay changes with no lowest month", (f) => { f.client.pay.varies = true; }],
    ["a personId that is not a parent", (f) => { f.budget.groups[5].lines[0].personId = f.children[0].personId; }],
    ["four own worries", (f) => { f.opener.ownWorries = ["a", "b", "c", "d"]; }],
    ["an own dream over 80 characters", (f) => { f.opener.ownDreams = ["x".repeat(81)]; }],
    ["a negative debt balance", (f) => { f.debts.items[0].balance = -1; }],
    ["a bad end date", (f) => { f.debts.items[0].endDate = "03/2028"; }],
    ["an unknown debt type", (f) => { f.debts.items[0].type = "payday"; }],
    ["a skipped group with no total", (f) => { f.budget.groups[0].skip = true; }],
    ["cover status none with an amount", (f) => { f.existingCover[1].amount = 50000; }],
    ["an unknown asset kind", (f) => { f.assets = [{ kind: "crypto", value: 1 }]; }],
    ["a negative room plan target", (f) => { f.budget.roomPlan = { groupTargets: { food: -1 }, split: {}, applied: false }; }],
    ["schema version 3", (f) => { f.schemaVersion = 3; }],
  ];
  assert.doesNotThrow(() => validateLifeCaseFacts(SAMPLE_FAMILY));
  for (const [what, mutate] of cases) {
    const f = JSON.parse(JSON.stringify(SAMPLE_FAMILY));
    mutate(f);
    assert.throws(() => validateLifeCaseFacts(f), LifeCaseFactsError, what);
  }
  const ok = JSON.parse(JSON.stringify(SAMPLE_FAMILY));
  ok.opener = { worries: ["die", "sick"], dreams: ["retire"], ownWorries: ["x".repeat(80), "b", "c"], ownDreams: [] };
  assert.doesNotThrow(() => validateLifeCaseFacts(ok), "three own items of 80 characters are allowed");
});

test("§14.3: an insurance cap below $200, above max(ceiling, $200), or not finite throws (guard 27's range)", () => {
  const w = computeFactFinder(SAMPLE_WEEKLY_RENTER);
  assert.ok(w.budget.band.recommended < FLOOR && w.insuranceRange.defaultMonthly === FLOOR, "the floor lifts the weekly renter's cap to $200");
  for (const bad of [199.99, w.insuranceRange.maxMonthly + 0.01, Number.NaN]) {
    assert.throws(() => computeFactFinder(SAMPLE_WEEKLY_RENTER, { budgetMonthly: bad }), /ClosingInputError|outside the range|finite/);
  }
  assert.equal(computeFactFinder(SAMPLE_WEEKLY_RENTER, { budgetMonthly: FLOOR }).closing.ladder.insuranceCapMonthly, FLOOR);
});

test("§7.5 (closes F-16): a co-signed debt is a loan cover item for the co-signer's exposure, in Tier 2", () => {
  const f = clone(SAMPLE_FAMILY);
  f.debts.items = [...f.debts.items, { label: "Credit union loan", type: "personal", lender: "Credit union", balance: 7000, ratePct: 12, minimumMonthly: 350, endDate: "2028-09", cosigned: true, cosignerName: "Mother" }];
  const r = computeFactFinder(f);
  const it = r.closing.ladderSpecs.find((s) => s.key === "cosigned-cover:2");
  assert.ok(it, "one item for the co-signed debt");
  assert.deepEqual([it!.tier, it!.insurance, it!.product, it!.label], [2, true, "term", "Life cover for the personal loan Mother co-signed"]);
  assert.ok(near(it!.min, 150) && near(it!.full, 150), "term on the $150,000 minimum cover costs the $150 minimum");
  assert.ok(!computeFactFinder(SAMPLE_FAMILY).closing.ladderSpecs.some((s) => s.key.startsWith("cosigned-cover:")), "no item without a co-signer");
});
