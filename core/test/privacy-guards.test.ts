/**
 * Section 1 guards 7 and 8, engine side: `LifeCaseFacts` validation, scope rows and snapshots.
 * A failure here is a hard stop (Section 2 §2.13.5).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateLifeCaseFacts, assertNoHealthKeys, scopeRow, validateScopeRow, buildSnapshot, buildScopeStatement,
  computeFactFinder, LifeCaseFactsError, SAMPLE_FAMILY,
} from "../src/index.ts";

const clone = <T>(x: T): any => JSON.parse(JSON.stringify(x));

test("valid sample facts pass", () => {
  assert.doesNotThrow(() => validateLifeCaseFacts(clone(SAMPLE_FAMILY)));
  const f = clone(SAMPLE_FAMILY);
  f.parents[0].firstName = "Mary-Ann";
  assert.doesNotThrow(() => validateLifeCaseFacts(f), "a one-word first name is allowed on a parent");
});

test("guard 7: no free text on a parent", () => {
  const cases: [string, (p: any) => void][] = [
    ["an extra text key", (p) => { p.notes = "needs help with stairs"; }],
    ["an extra key of any kind", (p) => { p.condition = 3; }],
    ["a sentence as a first name", (p) => { p.firstName = "Mum has dementia"; }],
    ["a long first name", (p) => { p.firstName = "Abcdefghijklmnopqrstuvwxyz"; }],
    ["a free relationship label", (p) => { p.relationship = "my mum who is unwell"; }],
    ["text in a number field", (p) => { p.birthYear = "1960"; }],
    ["text care tier", (p) => { p.careTier = "help at home"; }],
    ["a care tier out of range", (p) => { p.careTier = 5; }],
    ["a full date of birth", (p) => { p.dateOfBirth = "1960-04-01"; }],
    ["free-text NIS status", (p) => { p.nisContributions = "paid most of her life"; }],
  ];
  for (const [what, mutate] of cases) {
    const f = clone(SAMPLE_FAMILY);
    mutate(f.parents[1]);
    assert.throws(() => validateLifeCaseFacts(f), LifeCaseFactsError, `a parent with ${what} must fail validation`);
  }
});

test("guard 8: no health answer anywhere in a case", () => {
  const places: [string, (f: any) => void][] = [
    ["the top level", (f) => { f.healthFlag = true; }],
    ["the client", (f) => { f.client.healthNote = "asthma"; }],
    ["a parent", (f) => { f.parents[0].healthFlag = "yes"; }],
    ["a child", (f) => { f.children[0].HealthNote = "x"; }],
    ["deep inside a list", (f) => { f.existingCover[0].extra = { healthflag: true }; }],
  ];
  for (const [where, mutate] of places) {
    const f = clone(SAMPLE_FAMILY);
    mutate(f);
    assert.throws(() => validateLifeCaseFacts(f), (e: unknown) => e instanceof LifeCaseFactsError && /health answer/.test(e.message), `a health key in ${where} must fail`);
  }
});

test("guard 8: a scope row or a snapshot carrying a health answer fails the write", () => {
  assert.throws(() => validateScopeRow({ gapKey: "death", state: "acted", note: null, recordedAt: "2026-10-27", healthNote: "x" }), LifeCaseFactsError);
  const r = computeFactFinder(SAMPLE_FAMILY);
  const scope = buildScopeStatement(r.closing.gaps, [scopeRow("death", "acted", "2026-10-27")]);
  assert.doesNotThrow(() => buildSnapshot({ closing: r.closing, scope, assumptionSetId: r.assumptionSetId, engineVersion: "abc" }));
  const poisoned = { ...r.closing, extra: { nested: [{ healthFlag: true }] } };
  assert.throws(() => buildSnapshot({ closing: poisoned, scope, assumptionSetId: r.assumptionSetId, engineVersion: "abc" }), LifeCaseFactsError);
  assert.throws(() => assertNoHealthKeys({ a: { b: { healthNote: "" } } }, "record"), LifeCaseFactsError);
});

test("guard 8: the engine's own outputs carry no health keys", () => {
  const r = computeFactFinder(SAMPLE_FAMILY);
  assert.doesNotThrow(() => assertNoHealthKeys(JSON.parse(JSON.stringify(r)), "fact-finder result"));
});

test("people are deduped by id only: duplicate person ids fail", () => {
  const f = clone(SAMPLE_FAMILY);
  f.parents[1].personId = f.parents[0].personId;
  assert.throws(() => validateLifeCaseFacts(f), LifeCaseFactsError);
  const g = clone(SAMPLE_FAMILY);
  g.parents[0].personId = "not-a-uuid";
  assert.throws(() => validateLifeCaseFacts(g), LifeCaseFactsError, "person ids are device UUIDv4");
});
