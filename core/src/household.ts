import type { Debt, Household, ISODate, Person, TTD } from "./types.ts";

const MS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000;

/** Whole years completed on `on`. Both dates are supplied — the core never reads a clock. */
export function ageAt(dateOfBirth: ISODate, on: ISODate): number {
  const b = new Date(dateOfBirth);
  const d = new Date(on);
  let age = d.getUTCFullYear() - b.getUTCFullYear();
  const beforeBirthday =
    d.getUTCMonth() < b.getUTCMonth() ||
    (d.getUTCMonth() === b.getUTCMonth() && d.getUTCDate() < b.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/** Fractional years until this debt's final payment. Never negative. */
export function yearsToPayoff(debt: Debt, on: ISODate): number {
  const ms = new Date(debt.endDate).getTime() - new Date(on).getTime();
  return ms <= 0 ? 0 : ms / MS_PER_YEAR;
}

export function totalDebtBalance(h: Household): TTD {
  return h.debts.reduce((sum, d) => sum + d.balance, 0);
}

export function mortgageBalance(h: Household): TTD {
  return h.debts.filter((d) => d.kind === "mortgage").reduce((s, d) => s + d.balance, 0);
}

export function nonMortgageDebtBalance(h: Household): TTD {
  return h.debts.filter((d) => d.kind !== "mortgage").reduce((s, d) => s + d.balance, 0);
}

export function dependents(h: Household): Person[] {
  return h.dependents;
}

/** The youngest person whose relationship is "child". Non-children are ignored. */
export function youngestDependentChild(h: Household, on: ISODate): Person | null {
  const kids = h.dependents.filter((p) => p.relationship === "child");
  if (kids.length === 0) return null;
  return kids.reduce((youngest, p) =>
    ageAt(p.dateOfBirth, on) < ageAt(youngest.dateOfBirth, on) ? p : youngest
  );
}

/** Fractional years until the youngest child reaches `targetAge`. Zero if no children or already past. */
export function yearsUntilLastChildReaches(h: Household, targetAge: number, on: ISODate): number {
  const youngest = youngestDependentChild(h, on);
  if (!youngest) return 0;
  const b = new Date(youngest.dateOfBirth);
  const target = new Date(Date.UTC(b.getUTCFullYear() + targetAge, b.getUTCMonth(), b.getUTCDate()));
  const ms = target.getTime() - new Date(on).getTime();
  return ms <= 0 ? 0 : ms / MS_PER_YEAR;
}

/**
 * Remaining debt at each whole year from now until the last debt retires.
 * This is the decline schedule the term ladder steps down against.
 */
export function obligationDeclineSchedule(
  h: Household,
  on: ISODate
): Array<{ year: number; remainingDebt: TTD }> {
  const horizons = h.debts.map((d) => yearsToPayoff(d, on));
  const last = Math.ceil(Math.max(0, ...horizons));
  const out: Array<{ year: number; remainingDebt: TTD }> = [];
  for (let year = 0; year <= last; year++) {
    const remaining = h.debts
      .filter((d) => yearsToPayoff(d, on) > year)
      .reduce((s, d) => s + d.balance, 0);
    out.push({ year, remainingDebt: remaining });
  }
  return out;
}
