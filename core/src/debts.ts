/**
 * Module 2 — debts (Section 2 §2.3): the debt list, minimums, payoff order and time, and car loans.
 * Ported from the prototype v17 debts screen and goal planner; numbers read from rows.
 */
import { ProvenanceBuilder } from "./provenance.ts";
import type { Provenance } from "./types.ts";
import type { DebtFacts } from "./life-case-facts.ts";

export interface DebtSummary {
  /** Minimum payments a month on debts with a balance. */
  readonly minimumsMonthly: number;
  /** Balances on expensive debt (rate above the threshold). */
  readonly expensiveDebt: number;
  /** Balances on cheaper debt, not counting the mortgage. */
  readonly otherDebt: number;
  /** Expensive debts, highest rate first: the order to clear them. */
  readonly expensiveOrder: readonly { readonly label: string; readonly balance: number; readonly ratePct: number }[];
  /** Interest a month on expensive debt today. */
  readonly expensiveInterestMonthly: number;
}

export interface PayoffRun {
  readonly months: number;
  readonly interest: number;
  /** The first debt cleared and the month it clears. */
  readonly firstCleared: { readonly label: string; readonly month: number } | null;
  readonly stalled: boolean;
  /** Total balance at month 0, 1, 2 ... */
  readonly balances: readonly number[];
}

/** The three payoff runs (was `DebtPayoff` until Section 3; the name is now the per-debt result in debt-payoff.ts). */
export interface DebtPayoffRuns {
  readonly minimumsOnly: PayoffRun;
  /** Highest rate first, with the extra. */
  readonly avalanche: PayoffRun;
  /** Smallest balance first, with the extra. */
  readonly snowball: PayoffRun;
}

export interface DebtsResult {
  readonly summary: DebtSummary;
  readonly payoff: DebtPayoffRuns;
  readonly extraMonthly: number;
  readonly provenance: Provenance;
}

export function summariseDebts(b: ProvenanceBuilder, items: readonly DebtFacts[]): DebtSummary {
  const badAbove = b.num("core:ff.budget.badDebtAbovePct");
  const isBad = (d: DebtFacts): boolean => d.ratePct > badAbove;
  const expensive = items.filter((d) => d.balance > 0 && isBad(d)).slice().sort((a, c) => c.ratePct - a.ratePct);
  return {
    minimumsMonthly: items.reduce((a, d) => a + (d.balance > 0 ? d.minimumMonthly : 0), 0),
    expensiveDebt: items.reduce((a, d) => a + (isBad(d) ? d.balance : 0), 0),
    otherDebt: items.reduce((a, d) => a + (isBad(d) ? 0 : d.balance), 0),
    expensiveOrder: expensive.map((d) => ({ label: d.label, balance: d.balance, ratePct: d.ratePct })),
    expensiveInterestMonthly: expensive.reduce((a, d) => a + d.balance * d.ratePct / 1200, 0),
  };
}

function simulate(b: ProvenanceBuilder, items: readonly DebtFacts[], extra: number, mode: "avalanche" | "snowball"): PayoffRun {
  const maxMonths = b.num("core:ff.debts.maxMonths");
  const cleared = b.num("core:ff.debts.clearedBelow");
  const ds = items.filter((d) => d.balance > 0).map((d) => ({ label: d.label, bal: d.balance, rate: d.ratePct, min: d.minimumMonthly }));
  const minSum = ds.reduce((a, d) => a + d.min, 0);
  let m = 0;
  let interest = 0;
  let firstCleared: { label: string; month: number } | null = null;
  const balances = [ds.reduce((a, d) => a + d.bal, 0)];
  while (ds.some((d) => d.bal > cleared) && m < maxMonths) {
    m++;
    for (const d of ds) if (d.bal > 0) { const it = d.bal * d.rate / 1200; d.bal += it; interest += it; }
    let pool = minSum + extra;
    for (const d of ds) if (d.bal > 0) { const pmt = Math.min(d.min, d.bal, pool); d.bal -= pmt; pool -= pmt; }
    const live = ds.filter((d) => d.bal > cleared).sort((a, c) => (mode === "avalanche" ? c.rate - a.rate : a.bal - c.bal));
    for (const d of live) { if (pool <= 0) break; const pmt = Math.min(pool, d.bal); d.bal -= pmt; pool -= pmt; }
    if (!firstCleared) { const w = ds.find((d) => d.bal <= cleared); if (w) firstCleared = { label: w.label, month: m }; }
    balances.push(Math.max(0, ds.reduce((a, d) => a + d.bal, 0)));
  }
  return { months: m, interest, firstCleared, stalled: m >= maxMonths, balances };
}

export function computeDebts(items: readonly DebtFacts[], extraMonthly: number): DebtsResult {
  const b = new ProvenanceBuilder();
  const summary = summariseDebts(b, items);
  const payoff: DebtPayoffRuns = {
    minimumsOnly: simulate(b, items, 0, "avalanche"),
    avalanche: simulate(b, items, extraMonthly, "avalanche"),
    snowball: simulate(b, items, extraMonthly, "snowball"),
  };
  b.rule("payoff runs month by month: interest first, then minimums, then the extra to the target debt");
  return { summary, payoff, extraMonthly, provenance: b.build() };
}

/* ------------------------------------------------------------------- car loan */

export interface CarLoanInput {
  readonly price: number;
  readonly newVehicle: boolean;
  readonly depositPct?: number;
  readonly termYears?: number;
  readonly saved: number;
}

export interface CarLoanResult {
  readonly depositPct: number;
  readonly deposit: number;
  readonly loan: number;
  readonly termYears: number;
  /** Assumed rate (Section 2 risk 4); the client checks the real rate with the lender. */
  readonly ratePct: number;
  readonly monthlyPayment: number;
  readonly totalInterest: number;
  /** Years in which the loan balance is above the car's value. */
  readonly underwaterYears: number;
  /** What to save before buying: the deposit less savings, or a cushion of payments when there is no deposit. */
  readonly saveFirst: number;
  /** True when the used-car minimum deposit was applied to a lower entry. */
  readonly usedMinimumApplied: boolean;
}

export function amortisedPayment(loan: number, ratePct: number, years: number): number {
  const m = ratePct / 1200;
  const n = Math.max(1, years * 12);
  return loan <= 0 ? 0 : loan * m / (1 - Math.pow(1 + m, -n));
}

export function carLoan(b: ProvenanceBuilder, input: CarLoanInput): CarLoanResult {
  const ratePct = b.num("core:ff.carLoan.ratePct");
  const maxTerm = b.num("core:ff.carLoan.maxTermYears");
  const usedMin = b.num("core:ff.carLoan.usedMinDepositPct");
  const newMaxFinancing = b.num("core:ff.carLoan.newMaxFinancing");
  const depreciation = b.num("core:ff.carLoan.depreciationPerYear");
  const cushion = b.num("core:ff.carLoan.cushionPayments");
  const entered = input.depositPct ?? 0;
  const floorPct = input.newVehicle ? (1 - newMaxFinancing) * 100 : usedMin;
  const depositPct = Math.max(floorPct, entered);
  const termYears = Math.max(1, Math.min(maxTerm, input.termYears ?? b.num("core:ff.carLoan.defaultTermYears")));
  const deposit = input.price * depositPct / 100;
  const loan = input.price - deposit;
  const pay = amortisedPayment(loan, ratePct, termYears);
  const totalInterest = pay * termYears * 12 - loan;
  const mr = ratePct / 1200;
  let bal = loan;
  let underwaterYears = 0;
  for (let yy = 1; yy <= termYears; yy++) {
    for (let mm = 0; mm < 12; mm++) bal = bal * (1 + mr) - pay;
    if (Math.max(0, bal) > input.price * Math.pow(1 - depreciation, yy)) underwaterYears = yy;
  }
  const saveFirst = deposit > 0 ? Math.max(0, deposit - input.saved) : Math.max(0, pay * cushion - input.saved);
  b.caveat("The car loan rate and term are assumptions. Check the real rate with your bank or credit union.");
  return {
    depositPct, deposit, loan, termYears, ratePct, monthlyPayment: pay, totalInterest, underwaterYears, saveFirst,
    usedMinimumApplied: !input.newVehicle && entered < usedMin,
  };
}
