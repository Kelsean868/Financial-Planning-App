/**
 * Debts (Section 3 §7): each debt's payoff date from balance, rate and payment; the "never clears" flag when the
 * payment does not cover the interest; the mismatch flag when the client's end date and the payoff date differ by more
 * than 3 months; and the debt-free date for minimums only, highest rate first and smallest balance first.
 *
 * The engine reads no clock: dates count from `asOfMonth` ("YYYY-MM"), which the page passes. Without it, January of
 * the facts' year is used and `asOfMonthAssumed` says so.
 */
import { ProvenanceBuilder } from "./provenance.ts";
import type { Provenance } from "./types.ts";
import type { DebtFacts, DebtType } from "./life-case-facts.ts";
import type { DebtPayoffRuns, PayoffRun } from "./debts.ts";

export interface DebtPayoffLine {
  readonly index: number;
  readonly label: string;
  readonly type: DebtType;
  readonly lender: string | null;
  readonly balance: number;
  readonly ratePct: number;
  readonly minimumMonthly: number;
  /** Interest a month on today's balance. */
  readonly interestMonthly: number;
  /** Above the expensive-debt rate (`core:ff.budget.badDebtAbovePct`). */
  readonly expensive: boolean;
  /** Payments to clear it at the minimum; 0 when there is no balance; null when it never clears. */
  readonly months: number | null;
  /** The month of the last payment, "YYYY-MM"; null when it never clears. */
  readonly payoffMonth: string | null;
  /** §7.3: "This payment never clears the debt." */
  readonly neverClears: boolean;
  /** The end date the client gave. */
  readonly endDate: string | null;
  /** Payoff month less the end date, in months (positive: later than they said); null without both. */
  readonly endDateDiffMonths: number | null;
  /** §7.2: the two differ by more than 3 months: "You said March 2028; at this payment it ends June 2029." */
  readonly mismatch: boolean;
  readonly cosigned: boolean;
  readonly cosignerName: string | null;
}

export interface DebtFreeDate {
  /** Months to debt-free; null when the debts never clear. 0: no debt today. */
  readonly months: number | null;
  readonly month: string | null;
}

export interface DebtPayoff {
  readonly asOfMonth: string;
  readonly asOfMonthAssumed: boolean;
  readonly debts: readonly DebtPayoffLine[];
  /** Any debt whose payment does not cover its interest. */
  readonly anyNeverClears: boolean;
  /** §7.4: minimums only (each debt at its own payment); and with the extra, in each order. */
  readonly debtFree: {
    readonly minimumsOnly: DebtFreeDate;
    readonly highestRateFirst: DebtFreeDate;
    readonly smallestBalanceFirst: DebtFreeDate;
  };
  readonly extraMonthly: number;
  readonly provenance: Provenance;
}

const YEAR_MONTH = /^(\d{4})-(\d{2})$/;
const MONTHS_A_YEAR = 12;
/** A payment within a hundredth of a cent of the interest still does not clear it. */
const PAYMENT_TOLERANCE = 1e-6;

/** Months since year 0 of a "YYYY-MM" string. */
export function monthIndex(ym: string): number {
  const m = YEAR_MONTH.exec(ym);
  if (!m) throw new Error(`Not a "YYYY-MM" month: ${ym}`);
  return Number(m[1]) * MONTHS_A_YEAR + Number(m[2]) - 1;
}

export function monthLabel(index: number): string {
  const y = Math.floor(index / MONTHS_A_YEAR);
  const mo = index - y * MONTHS_A_YEAR + 1;
  return `${y}-${String(mo).padStart(2, "0")}`;
}

export function addMonths(ym: string, n: number): string {
  return monthLabel(monthIndex(ym) + n);
}

/**
 * Payments to clear a balance at a rate and a level payment: n = −ln(1 − r·B/P) / ln(1 + r), rounded up (guard 32).
 * 0 with no balance; null when the payment does not cover the interest (it never clears).
 */
export function payoffMonths(balance: number, ratePct: number, payment: number): number | null {
  if (balance <= 0) return 0;
  const r = ratePct / 1200;
  if (payment <= balance * r + PAYMENT_TOLERANCE) return null;
  if (r === 0) return Math.ceil(balance / payment - PAYMENT_TOLERANCE);
  return Math.ceil(-Math.log(1 - r * balance / payment) / Math.log(1 + r) - PAYMENT_TOLERANCE);
}

function freeDate(asOf: string, months: number | null): DebtFreeDate {
  return { months, month: months === null ? null : addMonths(asOf, months) };
}

function runDate(asOf: string, run: PayoffRun): DebtFreeDate {
  return freeDate(asOf, run.stalled ? null : run.months);
}

export function computeDebtPayoff(
  items: readonly DebtFacts[], runs: DebtPayoffRuns, extraMonthly: number, asOfYear: number, asOfMonth?: string,
): DebtPayoff {
  const b = new ProvenanceBuilder();
  if (asOfMonth !== undefined && !YEAR_MONTH.test(asOfMonth)) throw new Error(`asOfMonth must be "YYYY-MM"; got ${asOfMonth}`);
  const asOf = asOfMonth ?? monthLabel(asOfYear * MONTHS_A_YEAR);
  const badAbove = b.num("core:ff.budget.badDebtAbovePct");
  const tolerance = b.num("core:ff.debts.mismatchMonths");
  const debts: DebtPayoffLine[] = items.map((d, index) => {
    const months = payoffMonths(d.balance, d.ratePct, d.minimumMonthly);
    const payoffMonth = months === null ? null : addMonths(asOf, months);
    const diff = payoffMonth !== null && d.endDate !== null ? monthIndex(payoffMonth) - monthIndex(d.endDate) : null;
    return {
      index, label: d.label, type: d.type, lender: d.lender, balance: d.balance, ratePct: d.ratePct, minimumMonthly: d.minimumMonthly,
      interestMonthly: d.balance * d.ratePct / 1200, expensive: d.ratePct > badAbove,
      months, payoffMonth, neverClears: months === null, endDate: d.endDate, endDateDiffMonths: diff,
      mismatch: diff !== null && Math.abs(diff) > tolerance, cosigned: d.cosigned, cosignerName: d.cosignerName,
    };
  });
  const each = debts.map((d) => d.months);
  b.rule("each payoff date is worked from balance, rate and payment; a payment that does not cover the interest never clears the debt");
  return {
    asOfMonth: asOf,
    asOfMonthAssumed: asOfMonth === undefined,
    debts,
    anyNeverClears: debts.some((d) => d.neverClears),
    debtFree: {
      minimumsOnly: freeDate(asOf, each.some((m) => m === null) ? null : Math.max(0, ...(each as number[]))),
      highestRateFirst: runDate(asOf, runs.avalanche),
      smallestBalanceFirst: runDate(asOf, runs.snowball),
    },
    extraMonthly,
    provenance: b.build(),
  };
}
