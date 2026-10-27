/**
 * Care graph brief §7 guards 1, 3, 4, 5 and the §8 input errors.
 * (Guard 2, the goldens, is in goldens-fact-finder.test.ts.)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  careGraph, careGraphInputFromFacts, applyLever, SAMPLE_FAMILY, withChildBInUK, CARE_GRAPH_FIXTURE_NET_MONTHLY,
  CareGraphInputError, CORE_TABLES, coreRowPaths, type CareGraphInput,
} from "../src/index.ts";
import { walk, SRC, read, codeOnly, rel } from "./source-scan.ts";

const id = (n: number): string => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;

/** Guard 1: a spot or current inflation figure, by name, anywhere in executable engine code. */
const SPOT_INFLATION = /\b\w*(spot|current|latest|actual|headline|yoy)\w*(inflation|cpi)\w*\b|\bcpi\w*\b/i;

test("guard 1: no spot or current inflation is reachable from the engine", () => {
  for (const f of walk(SRC)) {
    const hit = codeOnly(read(f)).match(SPOT_INFLATION);
    assert.ok(!hit, `${rel(f)} names a spot/current inflation figure ("${hit?.[0]}") — inflation comes only from the assumption set's projected rates`);
  }
  for (const p of coreRowPaths()) {
    assert.ok(!/(spot|current|latest|headline)\w*(inflation|cpi)|cpi/i.test(p), `parameter row ${p} looks like a spot inflation figure`);
  }
  // every parameter read that names inflation is the assumption set's projected rate
  for (const f of walk(SRC)) {
    for (const m of read(f).matchAll(/["'`]([^"'`\s]*inflation[^"'`\s]*)["'`]/gi)) {
      const path = m[1]!;
      if (/^core:|^[a-z_]+\.[a-z_]/.test(path)) assert.equal(path, "core:ff.rates.inflation", `${rel(f)} reads inflation from ${path}`);
    }
  }
  assert.equal(CORE_TABLES.ff.rates.inflation.status, "assumed");
});

test("guard 1 catches a violation and stays quiet on prose", () => {
  assert.ok(SPOT_INFLATION.test(codeOnly("const spotInflation = 0.018;")), "must catch a spot inflation constant");
  assert.ok(SPOT_INFLATION.test(codeOnly("const currentCpi = 1.8;")), "must catch a current CPI constant");
  assert.ok(!SPOT_INFLATION.test(codeOnly("// do not use a spot inflation rate")), "must not trip on a comment");
  assert.ok(!SPOT_INFLATION.test(codeOnly('const i = b.num("core:ff.rates.inflation");')), "must not trip on the projected rate");
});

function input(over: Partial<CareGraphInput>): CareGraphInput {
  return { clientAge: 40, asOfYear: 2026, children: [], parents: [], ...over };
}

test("guard 3: a goal starting within a year contributes nothing to monthly saving", () => {
  const cg = careGraph(input({
    children: [
      { personId: id(1), age: 17, route: "regional", costLevel: "typical", studyStartAge: 18, milestones: [{ key: "vehicle", on: true, atAge: 18, amountToday: 50000 }] },
      { personId: id(2), age: 8, route: "local", costLevel: "typical", studyStartAge: 18, milestones: [] },
    ],
    parents: [{ personId: id(3), relationship: "father", birthYear: 1950, careTier: 2, receivesSCP: false, nisContributions: "no" }],
  }), 20000);
  const current = cg.goals.filter((g) => g.start <= 1);
  assert.ok(current.length >= 3, "the fixture has current goals (degree next year, vehicle next year, care now)");
  for (const g of current) {
    assert.equal(g.current, true, `${g.key} is a current line`);
    assert.equal(g.monthlySaving, 0, `${g.key} starts in year ${g.start} and must add nothing to monthly saving`);
  }
  const future = cg.goals.filter((g) => g.start > 1).reduce((a, g) => a + g.monthlySaving, 0);
  assert.ok(Math.abs(cg.funding.saveFromToday - future) < 1e-9, "save from today is future goals only");
  assert.ok(cg.funding.alreadyPaying > 0, "the current care is reported as money already leaving the account");
});

test("guard 4: non-overlapping child and parent windows report zero sandwich years", () => {
  const cg = careGraph(input({
    clientAge: 38,
    children: [{ personId: id(1), age: 4, route: "local", costLevel: "typical", studyStartAge: 18, milestones: [] }],
    // aged 86 in 2026: care runs to 88, years 0–2; the degree is years 14–16
    parents: [{ personId: id(2), relationship: "mother", birthYear: 1940, careTier: 2, receivesSCP: false, nisContributions: "no" }],
  }));
  assert.ok(cg.years.some((y) => y.eduMonthly > 0) && cg.years.some((y) => y.parentMonthly > 0), "both windows exist");
  assert.equal(cg.sandwichYears, 0, "no year has both a child and a parent commitment");
  assert.equal(cg.years.filter((y) => y.isSandwich).length, 0);
});

test("guard 5: applying a lever reduces monthly saving by the reported amount, within $1", () => {
  for (const facts of [withChildBInUK(SAMPLE_FAMILY), SAMPLE_FAMILY]) {
    const inp = careGraphInputFromFacts(facts);
    const cg = careGraph(inp, CARE_GRAPH_FIXTURE_NET_MONTHLY);
    assert.ok(cg.levers.length > 0, "the fixture has levers");
    for (const lever of cg.levers) {
      const after = careGraph(applyLever(inp, lever)).funding.saveFromToday;
      const real = cg.funding.saveFromToday - after;
      assert.ok(Math.abs(real - lever.monthlyReduction) <= 1, `${lever.label}: reported ${lever.monthlyReduction}, real ${real}`);
      assert.ok(real >= 0, `${lever.label} must not raise the saving`);
    }
    for (let i = 1; i < cg.topLevers.length; i++) assert.ok(cg.topLevers[i - 1]!.monthlyReduction >= cg.topLevers[i]!.monthlyReduction, "ranked");
  }
});

test("§8: CareGraphInputError for an impossible timeline; never clamped", () => {
  const kid = { personId: id(1), age: 20, route: "local" as const, costLevel: "typical" as const, studyStartAge: 18, milestones: [] };
  assert.throws(() => careGraph(input({ children: [kid] })), CareGraphInputError, "study start before current age");
  assert.doesNotThrow(() => careGraph(input({ children: [{ ...kid, route: "none" }] })), "no study, no check");
  const parent = { personId: id(2), relationship: "father" as const, birthYear: 1955, careTier: 2 as const, careFromAge: 65, receivesSCP: false, nisContributions: "no" as const };
  assert.throws(() => careGraph(input({ parents: [parent] })), CareGraphInputError, "care start before current age");
});
