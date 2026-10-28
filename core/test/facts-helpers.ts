/**
 * Version 2 fact edits the tests share (Section 3 Build A). The version 1 tests changed `client.grossMonthly`,
 * `budget.costs` and `parents` directly; in version 2 pay has a frequency, costs are budget lines, and a parent's care
 * today is a Family you support line with that parent's personId (a line naming a parent who is not in the case fails
 * validation, §14.3). A helper, not a test file.
 */
import { catalogueGroup, type LifeCaseFacts, type ParentFacts } from "../src/index.ts";

export type Mutable<T> = { -readonly [K in keyof T]: T[K] };
export const clone = (f: LifeCaseFacts): Mutable<LifeCaseFacts> => JSON.parse(JSON.stringify(f));

/** Monthly gross pay, paid monthly (version 1's `grossMonthly`). */
export function setGross(f: Mutable<LifeCaseFacts>, gross: number): void {
  f.client = { ...f.client, pay: { frequency: "monthly", amountPerPay: gross, varies: false, lowestMonthly: null } };
}

/** Partner take-home a month, paid monthly (version 1's `incomeMonthly`). */
export function setPartnerIncome(f: Mutable<LifeCaseFacts>, monthly: number): void {
  if (f.partner) f.partner = { ...f.partner, pay: { frequency: "monthly", amountPerPay: monthly, varies: false, lowestMonthly: null } };
}

/**
 * Set the parents. Family you support lines of parents no longer in the case go; a new parent gets a line of
 * `todayMonthly[personId]` (0 when not given), as version 1's care paid today.
 */
export function setParents(f: Mutable<LifeCaseFacts>, parents: readonly ParentFacts[], todayMonthly: Readonly<Record<string, number>> = {}): void {
  f.parents = JSON.parse(JSON.stringify(parents));
  const ids = new Set(parents.map((p) => p.personId));
  const groups = f.budget.groups.map((g) => ({ ...g, lines: g.lines.filter((l) => l.personId === undefined || ids.has(l.personId)) }));
  const fam = groups.find((g) => g.key === "family");
  const have = new Set(groups.flatMap((g) => g.lines.map((l) => l.personId)).filter(Boolean));
  const add = parents.filter((p) => !have.has(p.personId)).map((p) => ({
    label: p.relationship, amount: todayMonthly[p.personId] ?? 0, frequency: "monthly" as const, stop: "care" as const, personId: p.personId,
  }));
  if (fam) fam.lines.push(...add);
  else if (add.length) groups.push({ key: "family", skip: false, total: null, totalFrequency: null, lines: add });
  f.budget = { ...f.budget, groups };
}

/**
 * Scale the monthly costs (version 1's `budget.costs`): every spending line, not the once-a-year lines, not saving and
 * not a parent's care.
 */
export function scaleCosts(f: Mutable<LifeCaseFacts>, k: number): void {
  f.budget = {
    ...f.budget,
    groups: f.budget.groups.map((g) => {
      const kind = catalogueGroup(g.key).kind;
      if (kind === "yearly" || kind === "saving") return g;
      if (g.skip) return { ...g, total: (g.total ?? 0) * k };
      return { ...g, lines: g.lines.map((l) => (l.personId === undefined ? { ...l, amount: l.amount * k } : l)) };
    }),
  };
}
