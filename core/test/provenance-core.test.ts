/**
 * Finding F3: the parameter layer in `core/src/parameters/` and the `ProvenanceBuilder` path that
 * records rows from it. Also the audit's "could not verify" list (status `unverified`, no value).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ProvenanceBuilder, computeFactFinder, coreRowPaths, resolveCoreRow, CORE_TABLES, SAMPLE_FAMILY } from "../src/index.ts";
import { ParameterError } from "../../parameters/tt-parameters.js";
import { walk, SRC, read, rel } from "./source-scan.ts";

test("a core row read is recorded with its asOf, source and status", () => {
  const b = new ProvenanceBuilder();
  assert.equal(b.num("core:ff.tax.nisEmployeeRate"), 0.054);
  const p = b.build().parameters.find((x) => x.path === "core:ff.tax.nisEmployeeRate")!;
  assert.equal(p.effective, "2026-01-05");
  assert.equal(p.status, "verified");
  assert.match(p.source!, /NIBTT/);
});

test("a fact-finder result records core rows and root rows side by side", () => {
  const r = computeFactFinder(SAMPLE_FAMILY);
  const paths = r.budget.provenance.parameters.map((x) => x.path);
  assert.ok(paths.includes("core:ff.budget.stagePercents"));
  assert.ok(paths.includes("income_tax.personal_allowance"), "root table rows still come from parameters/");
  assert.ok(r.budget.provenance.caveats.some((c) => /70% is deductible/.test(c)), "the NIS deductibility conflict travels with the number (run record R1)");
  const closing = r.closing.provenance.parameters.map((x) => x.path);
  assert.ok(closing.includes("core:products.life-span-gold"), "product rows are recorded when read");
});

test("unverified rows have no value and the engine refuses to read them", () => {
  const unverified = coreRowPaths().filter((p) => resolveCoreRow(p).status === "unverified");
  assert.deepEqual(unverified.sort(), [
    "core:retirement.annuityConversionRates",
    "core:retirement.nis.classTable2027",
    "core:retirement.nis.earlyPensionReduction",
    "core:retirement.publicServiceSalaryAveraging",
    "core:retirement.scp.incomeBands2027",
  ]);
  for (const p of unverified) {
    assert.equal(resolveCoreRow(p).value, null, `${p} must not carry a guessed value`);
    assert.throws(() => new ProvenanceBuilder().use(p), ParameterError, `${p} must be refused`);
  }
});

test("assumed figures are marked assumed (Section 2 risk 4)", () => {
  assert.equal(CORE_TABLES.ff.carLoan.ratePct.status, "assumed");
  assert.equal(CORE_TABLES.ff.carLoan.defaultTermYears.status, "assumed");
  assert.equal(CORE_TABLES.ff.carLoan.maxTermYears.status, "assumed");
  assert.equal(CORE_TABLES.ff.carLoan.newMaxFinancing.status, "verified");
  for (const p of coreRowPaths().filter((x) => x.startsWith("core:ff.premiumRates.") && !x.endsWith("bandSpread"))) {
    assert.equal(resolveCoreRow(p).status, "estimate", `${p}: premium rates are estimates, never a quote`);
  }
});

test("every core row has a source and an ISO asOf", () => {
  const paths = coreRowPaths();
  assert.ok(paths.length > 100, `${paths.length} rows`);
  for (const p of paths) {
    const r = resolveCoreRow(p);
    assert.ok(r.source && r.source.length > 3, `${p} has a source`);
    assert.match(r.asOf, /^\d{4}-\d{2}-\d{2}$/, `${p} has an asOf date`);
  }
});

test("every core: path named in engine code resolves to a row", () => {
  let n = 0;
  for (const f of walk(SRC)) {
    for (const m of read(f).matchAll(/"(core:[A-Za-z0-9_.-]+)"/g)) {
      assert.doesNotThrow(() => resolveCoreRow(m[1]!), `${rel(f)} reads ${m[1]}, which is not a row`);
      n++;
    }
  }
  assert.ok(n > 100, `${n} reads checked`);
});
