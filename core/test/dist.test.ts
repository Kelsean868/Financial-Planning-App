/**
 * The built file `dist/fpa-core.js` (review finding F4; Section 1 §1.10, guard 13's input):
 * it is current, self-contained, pure, and reproduces the Section 2 §2.8 and care graph §3 goldens.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { buildBytes, OUTFILE } from "../scripts/build.mjs";
import * as src from "../src/index.ts";

const committed = readFileSync(OUTFILE);
const text = committed.toString("utf8");

test("dist/fpa-core.js matches a fresh build of src byte for byte (run `npm run build` if not)", async () => {
  const fresh = await buildBytes();
  assert.equal(Buffer.compare(committed, fresh), 0, `dist is stale: ${committed.length} bytes committed, ${fresh.length} built`);
});

test("dist is one self-contained ES module: no imports, no require, LF line endings", () => {
  assert.ok(!/^\s*import\s/m.test(text), "no import statements");
  assert.ok(!/\bimport\s*\(/.test(text), "no dynamic import");
  assert.ok(!/\brequire\s*\(/.test(text), "no require");
  assert.ok(!text.includes("\r"), "LF only, so the vendored file hashes the same on every checkout");
  for (const [re, what] of [[/\bfetch\s*\(/, "fetch"], [/\blocalStorage\b/, "localStorage"], [/\bindexedDB\b/, "indexedDB"], [/\bprocess\.env\b/, "process.env"], [/supabase/i, "Supabase"]] as const) {
    assert.ok(!re.test(text), `dist contains ${what}`);
  }
});

test("dist exports the same public API as src/index.ts", async () => {
  const dist = await import(pathToFileURL(OUTFILE).href);
  assert.deepEqual(Object.keys(dist).sort(), Object.keys(src).sort());
});

test("dist reproduces the §2.8 and care graph §3 goldens", async () => {
  const d = await import(pathToFileURL(OUTFILE).href);
  const fam = d.computeFactFinder(d.SAMPLE_FAMILY);
  const R = Math.round;
  assert.deepEqual(
    [fam.budget.stage, R(fam.budget.ceilingMonthly), R(fam.careGraph.funding.saveFromToday), R(fam.careGraph.funding.alreadyPaying),
      R(fam.careGraph.funding.ifYouDieTomorrow), R(fam.careGraph.peak.monthly), fam.careGraph.peak.atAge, fam.careGraph.sandwichYears,
      fam.careGraph.finishAge, R(fam.deathNeed.tiers.essential), R(fam.deathNeed.tiers.recommended), R(fam.deathNeed.tiers.full),
      R(fam.budget.needsMonthly), R(fam.budget.livingMonthly)],
    // ceilings 725 -> 711 and 376 -> 374: NIS 70% re-baseline (docs/audit/RUN-2026-10-27-fix-nis70.md)
    [2, 711, 3837, 4000, 1263107, 17391, 54, 8, 55, 823567, 1994846, 2236674, 15140, 6700],
  );
  const young = d.computeFactFinder(d.SAMPLE_YOUNG_SINGLE);
  assert.deepEqual(
    [young.budget.stage, R(young.budget.ceilingMonthly), young.careGraph.goals.length, R(young.deathNeed.tiers.essential),
      R(young.deathNeed.tiers.recommended), R(young.deathNeed.tiers.full), R(young.budget.needsMonthly), R(young.budget.livingMonthly)],
    [1, 374, 0, 149000, 149000, 149000, 5450, 5300],
  );
  const cg = d.careGraph(d.careGraphInputFromFacts(d.SAMPLE_FAMILY), d.CARE_GRAPH_FIXTURE_NET_MONTHLY);
  assert.equal(R(cg.nominalTotal / 1000) * 1000, 2078000);
  const uk = d.careGraph(d.careGraphInputFromFacts(d.withChildBInUK(d.SAMPLE_FAMILY)), d.CARE_GRAPH_FIXTURE_NET_MONTHLY);
  assert.deepEqual(
    [R(uk.peak.monthly), uk.sandwichYears, R(uk.nominalTotal / 1000) * 1000, R(uk.funding.saveFromToday), R(uk.funding.ifYouDieTomorrow / 1000) * 1000, uk.topLevers[0].label, R(uk.topLevers[0].monthlyReduction)],
    [50753, 8, 3406000, 16487, 2161000, "Send Child B locally", 12650],
  );
});
