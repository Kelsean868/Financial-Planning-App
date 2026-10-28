/**
 * The fixture sweep the ladder guards share (guards 21 to 25): both samples and their variants, each with the default
 * order and every Tier 1 item moved to the top of Tier 1. A helper, not a test file.
 */
import {
  computeFactFinder, requestReorder, SAMPLE_FAMILY, SAMPLE_YOUNG_SINGLE, type LifeCaseFacts, type FactFinderResult,
} from "../src/index.ts";

export type Mutable<T> = { -readonly [K in keyof T]: T[K] };
export const clone = (f: LifeCaseFacts): Mutable<LifeCaseFacts> => JSON.parse(JSON.stringify(f));
export const CENT = 0.005;

export function variants(): LifeCaseFacts[] {
  const out: LifeCaseFacts[] = [SAMPLE_FAMILY, SAMPLE_YOUNG_SINGLE];
  const parentSets = [
    SAMPLE_FAMILY.parents,
    [],
    // Care starts at each parent's current age (careFromAge left out).
    [{ ...SAMPLE_FAMILY.parents[1]!, birthYear: 1947, careFromAge: undefined }, { ...SAMPLE_FAMILY.parents[0]!, birthYear: 1950, relationship: "other-elder" as const, careFromAge: undefined }],
  ];
  for (const base of [SAMPLE_FAMILY, SAMPLE_YOUNG_SINGLE]) {
    for (const age of [24, 38, 52, 62, 65]) {
      for (const gross of [9000, 12000, 17000, 30000, 60000]) {
        for (const parents of parentSets) {
          const f = clone(base);
          f.client = { ...f.client, age, grossMonthly: gross };
          // Loan goals on for the better-paid families too, so loan cover items are checked with dependants.
          if (base === SAMPLE_FAMILY && gross >= 30000) f.goals = f.goals.map((g) => ({ ...g, on: g.kind === "home" || g.kind === "vehicle" }));
          f.parents = JSON.parse(JSON.stringify(parents));
          out.push(f);
        }
      }
    }
  }
  return out;
}

/** The default order, and each Tier 1 item moved to the top of Tier 1. */
function orders(r: FactFinderResult): (readonly string[] | undefined)[] {
  const order = r.closing.ladder.items.map((i) => i.key);
  const tier1 = order.filter((k) => r.closing.ladderSpecs.find((s) => s.key === k)!.tier === 1);
  return [undefined, ...tier1.slice(1).map((k) => requestReorder(r.closing.ladderSpecs, order, k, order.indexOf(tier1[0]!), "2026-10-27T12:00:00Z").order)];
}

export function eachCase(fn: (r: FactFinderResult, label: string) => void): number {
  let n = 0;
  for (const [i, f] of variants().entries()) {
    const base = computeFactFinder(f);
    if (base.closing.ladder.underwater) { fn(base, `variant ${i} (stage 0)`); n++; continue; }
    for (const [j, ladderOrder] of orders(base).entries()) {
      fn(ladderOrder ? computeFactFinder(f, { ladderOrder }) : base, `variant ${i}, order ${j}`);
      n++;
    }
  }
  return n;
}

