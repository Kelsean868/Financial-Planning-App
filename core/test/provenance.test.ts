import { test } from "node:test";
import assert from "node:assert/strict";
import { ProvenanceBuilder, resolveParameter } from "../src/provenance.ts";

test("resolveParameter reads a dotted path and returns node + value", () => {
  const { node, value } = resolveParameter("nis.minimum_pension");
  assert.equal(value, 3000);
  assert.equal(node.effective, "2012-02-01");
  assert.equal(node.status, "VERIFIED");
});

test("builder records every parameter used, with provenance", () => {
  const b = new ProvenanceBuilder();
  const min = b.use("nis.minimum_pension");
  assert.equal(min, 3000);
  const p = b.build();
  assert.equal(p.parameters.length, 1);
  assert.equal(p.parameters[0]!.path, "nis.minimum_pension");
  assert.equal(p.parameters[0]!.effective, "2012-02-01");
  assert.equal(p.parameters[0]!.status, "VERIFIED");
  assert.ok(p.parameters[0]!.source?.includes("nibtt.net"));
});

test("using a STALE parameter throws — drift cannot enter silently", () => {
  const b = new ProvenanceBuilder();
  assert.throws(() => b.use("nis.benefit_rates.superseded_2008"), /STALE_DO_NOT_USE/);
});

test("caveats and rules are recorded in order and deduplicated", () => {
  const b = new ProvenanceBuilder();
  b.rule("applied minimum pension");
  b.rule("applied minimum pension");
  b.caveat("increments unconfirmed");
  const p = b.build();
  assert.deepEqual(p.rulesFired, ["applied minimum pension"]);
  assert.deepEqual(p.caveats, ["increments unconfirmed"]);
});

test("build() output is stable — same calls, byte-identical JSON", () => {
  const mk = () => {
    const b = new ProvenanceBuilder();
    b.use("nis.minimum_pension");
    b.rule("r1");
    return JSON.stringify(b.build());
  };
  assert.equal(mk(), mk());
});
