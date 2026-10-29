/**
 * Guards G5 and G8 to G12, G14 of the real-life-rates spec (2026-10-29): the engine's premiums match
 * Tatil's own figures to the cent, the fallbacks say why they are fallbacks, and the inversion survives
 * the cover bands.
 *
 * The held-out quotes these check against are in the rate book's `held_out` list — real illustrations kept
 * out of the rate build on purpose, so they are evidence, not input.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ProvenanceBuilder, premiumQuote, premiumFor, coverForPremium, CORE_TABLES, type Rating,
} from "../src/index.ts";

const cents = (x: number | null): string => (x === null ? "null" : x.toFixed(2));
const M: Rating = { sex: "male", smoker: false, who: "You" };
const F: Rating = { sex: "female", smoker: false, who: "You" };

test("G5: the four held-out Tatil cases are exact to the cent", () => {
  const b = new ProvenanceBuilder();

  // Term to 65, male, ANB 36, non-smoker, $500,000: band 2 rate 3.374592.
  const term = premiumQuote(b, "term", 500000, 36, M);
  assert.equal(cents(term.yearly), "2047.30", "term yearly: 3.374592 x 500 + 360 fee");
  assert.equal(cents(term.monthly), "175.66", "term monthly: x 0.0858");
  assert.equal(term.band, 2);
  assert.equal(term.basis, "verified");

  // Life Span Gold to 65, female, ANB 36, non-smoker, $250,000: band 1 rate 10.867859.
  const ci = premiumQuote(b, "ci", 250000, 36, F);
  assert.equal(cents(ci.yearly), "3076.96", "Life Span Gold yearly: 2,716.96 + 360 fee");
  assert.equal(ci.band, 1);

  // Whole Life, female, ANB 35, non-smoker, $125,000: band 1 rate 20.49.
  const wl = premiumQuote(b, "whole-life", 125000, 35, F);
  assert.equal(cents(wl.yearly), "2921.25", "whole life yearly: 2,561.25 + 360 fee");
  assert.equal(wl.band, 1);

  // Life Span Gold at Tatil's minimum: female, ANB 26, non-smoker, $100,000 costs $1,212.77 a year,
  // under the $1,800 minimum, so the premium is raised and the cover stays (spec decision 6).
  const min = premiumQuote(b, "ci", 100000, 26, F);
  assert.equal(cents(min.yearly), "1800.00");
  assert.equal(cents(min.monthly), "154.44");
  assert.equal(min.minApplied, true, "the minimum premium bound");
  assert.match(b.build().caveats.join(" | "), /raised to \$1,800\.00 a year\. The cover stays at \$100,000/);
});

test("G12: interpolation between harvested ages lands within 1% of the held-out quote", () => {
  const b = new ProvenanceBuilder();
  // Rest Assured II, Payment to Age 100, female, ANB 56, $125,000. ANB 56 is off the 5-year grid, so the
  // rate is a straight line between ANB 55 (44.95) and 60 (52.82). Held-out quote: $5,788.75 a year.
  const q = premiumQuote(b, "rest-assured", 125000, 56, F);
  assert.equal(q.basis, "verified");
  assert.equal(cents(q.yearly), "5815.50");
  const off = Math.abs(q.yearly! - 5788.75) / 5788.75;
  assert.ok(off < 0.01, `within 1% of the held-out quote, was ${(off * 100).toFixed(2)}%`);
});

test("G11: the cover bands make the premium non-monotone, and the inversion handles it", () => {
  const b = new ProvenanceBuilder();
  // One dollar more of cover crosses into the cheaper band.
  const under = premiumQuote(b, "term", 499999, 36, M);
  const over = premiumQuote(b, "term", 500000, 36, M);
  assert.equal(cents(under.monthly), "262.23", "$499,999 is band 1");
  assert.equal(cents(over.monthly), "175.66", "$500,000 is band 2 and costs less");
  assert.ok(over.monthly! < under.monthly!, "more cover for less money across the band edge");

  // So a $200 budget must buy the band 2 answer, not the band 1 one.
  const cover = coverForPremium(b, "term", 200, 36, M);
  assert.ok(cover >= 500000, `the band 2 cover, was ${cover}`);
  assert.ok(cover > 580000 && cover < 590000, `about $584,000, was ${cover}`);
  // And it must be affordable: re-pricing it comes back inside the budget.
  assert.ok(premiumFor(b, "term", cover, 36, M)! <= 200.005, "the answer fits the budget");
});

test("G8: past Tatil's maximum issue age there is no premium at all", () => {
  const b = new ProvenanceBuilder();
  const q = premiumQuote(b, "term", 500000, 66, M);
  assert.equal(q.monthly, null, "no monthly figure");
  assert.equal(q.yearly, null, "no yearly figure");
  assert.equal(q.reason, "Not available at this age");
  assert.equal(premiumFor(b, "term", 500000, 66, M), null);
  assert.match(b.build().rulesFired.join(" | "), /maximum issue age is ANB 65/);
  // ANB 65 is the last age it can be issued at.
  assert.notEqual(premiumQuote(new ProvenanceBuilder(), "term", 500000, 65, M).monthly, null);
});

test("G9: outside the harvested ages the figure is a sample, and says so", () => {
  const b = new ProvenanceBuilder();
  const q = premiumQuote(b, "term", 500000, 58, M);
  assert.equal(q.basis, "estimate", "not a Tatil rate");
  assert.equal(q.yearly, null, "the sample curve gives a monthly figure only");
  assert.ok(q.monthly! > 0);
  assert.match(q.reason ?? "", /ANB 58 is outside the harvested ages \(ANB 26-56\)/);
  assert.match(b.build().caveats.join(" | "), /Sample rates, not Tatil's: ANB 58 is outside the harvested ages/);
});

test("G10: sex and the nicotine answer pick the rate table, and an unknown says so", () => {
  // Smoker rates are dearer than non-smoker ones, and both come from the book.
  const smoker = premiumQuote(new ProvenanceBuilder(), "term", 500000, 36, { sex: "male", smoker: true, who: "You" });
  assert.equal(cents(smoker.monthly), "270.02", "the M-S table");
  assert.ok(smoker.monthly! > premiumQuote(new ProvenanceBuilder(), "term", 500000, 36, M).monthly!);

  // Not asked: non-smoker rates, and the advisor is told to ask.
  const notAsked = new ProvenanceBuilder();
  const q = premiumQuote(notAsked, "term", 500000, 36, { sex: "male", smoker: null, who: "You" });
  assert.equal(cents(q.monthly), "175.66", "the same as a stated non-smoker");
  assert.match(notAsked.build().caveats.join(" | "), /Non-smoker rates — ask if they smoke/);

  // Sex not known: the male rate, the higher one, with a caveat.
  const unknown = new ProvenanceBuilder();
  const u = premiumQuote(unknown, "term", 500000, 36, { sex: null, smoker: false, who: "Your parent" });
  assert.equal(cents(u.monthly), cents(premiumQuote(new ProvenanceBuilder(), "term", 500000, 36, M).monthly));
  assert.match(unknown.build().caveats.join(" | "), /Your parent: sex not known, so the rate is the male one \(the higher\)/);

  // Rest Assured II has no smoker tables at all, so the answer cannot change.
  const ra = new ProvenanceBuilder();
  const withS = premiumQuote(ra, "rest-assured", 50000, 60, { sex: "female", smoker: true, who: "Your mother" });
  const withNS = premiumQuote(new ProvenanceBuilder(), "rest-assured", 50000, 60, { sex: "female", smoker: false, who: "Your mother" });
  assert.equal(cents(withS.monthly), cents(withNS.monthly));
  assert.match(ra.build().rulesFired.join(" | "), /Rest Assured II has no smoker rates: one rate for everyone/);
});

test("G14: no parameter row carries a smoker field (rule 8, Kyron 28 Oct 2026)", () => {
  // Nicotine use is allowed in the case facts and used only to pick a rate. It must never be stored as,
  // or alongside, a parameter.
  const hits: string[] = [];
  const walk = (node: unknown, path: string): void => {
    if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) {
        if (/smok|nicotine/i.test(k)) hits.push(`${path}.${k}`);
        walk(v, `${path}.${k}`);
      }
    }
  };
  walk(CORE_TABLES, "core");
  assert.deepEqual(hits, [], "a smoker field in a parameter table");
});
