/**
 * One call for the page: validate the facts, run every fact-finder module in dependency order, and
 * return all results. Pure: the same facts and options give the same result (no clock, no I/O).
 *
 * Order: net pay → debts → care graph (needs household net for its verdict) → budget (needs the
 * care already paid) → death need → retirement → goals → budget builder → health score → closing →
 * insurance budget (its Protection group is the closing ladder's insurance items, guard 21).
 *
 * Section 3: the facts are version 2 (a version-1 case is upgraded on read); `toEngineFacts` works out the monthly
 * figures once. Then pay, the budget analysis, debt payoff dates and the retirement figure. Make room is separate
 * (`computeRoomPlan`), so a stale plan cannot stop the rest from running.
 */
import { validateLifeCaseFacts, type LifeCaseFacts } from "./life-case-facts.ts";
import { computeNetPay, computeHouseholdBudget, buildBudgetBuckets, type HouseholdBudget, type BudgetBuckets } from "./household-budget.ts";
import { computeDebts, type DebtsResult } from "./debts.ts";
import { careGraph, careGraphInputFromFacts, type CareGraphResult } from "./care-graph.ts";
import { computeDeathNeed, type DeathNeedResult } from "./death-need.ts";
import { computeRetirementIncome, type RetirementIncome } from "./retirement-income.ts";
import { computeGoals, type GoalsResult } from "./goals.ts";
import { computeInsuranceBudget, type InsuranceBudgetResult } from "./insurance-budget.ts";
import { computeHealthScore, type HealthScore } from "./health-score.ts";
import { computeClosing, type ClosingComparison, type ClosingOptions } from "./closing.ts";
import { insuranceCap } from "./closing-ladder.ts";
import { computeLovedOnes, type LovedOnesResult } from "./loved-ones.ts";
import { computeBusiness, type BusinessResult } from "./business.ts";
import { ASSUMPTION_SET_ID } from "./parameters/fact-finder-2026-10.ts";
import { toEngineFacts } from "./engine-facts.ts";
import { computePayPlan, type PayPlan } from "./pay.ts";
import { computeBudgetAnalysis, type BudgetAnalysis } from "./budget-analysis.ts";
import { computeDebtPayoff, type DebtPayoff } from "./debt-payoff.ts";
import { computeRetirementFigure, type RetirementFigure } from "./retirement-figure.ts";
import { insuranceRange, type InsuranceRange } from "./closing-ladder.ts";

export interface FactFinderOptions extends ClosingOptions {
  /** Pay-yourself-first share of take-home, percent. Default from the assumption set (15). */
  readonly savePct?: number;
  /** This month, "YYYY-MM": payoff dates count from it (the engine reads no clock). Default January of `asOfYear`. */
  readonly asOfMonth?: string;
}

export interface FactFinderResult {
  readonly assumptionSetId: string;
  readonly facts: LifeCaseFacts;
  readonly debts: DebtsResult;
  readonly careGraph: CareGraphResult;
  readonly budget: HouseholdBudget;
  readonly buckets: BudgetBuckets;
  readonly deathNeed: DeathNeedResult;
  readonly retirement: RetirementIncome;
  readonly goals: GoalsResult;
  readonly insuranceBudget: InsuranceBudgetResult;
  readonly healthScore: HealthScore;
  readonly closing: ClosingComparison;
  readonly lovedOnes: LovedOnesResult | null;
  readonly business: BusinessResult | null;
  /* Section 3 (Build A) */
  /** Pay in the client's rhythm (§2). */
  readonly pay: PayPlan;
  /** Where the money goes, against the common guides (§1.4, §6.1, §6.2). */
  readonly budgetAnalysis: BudgetAnalysis;
  /** Payoff dates, flags and debt-free dates (§7). */
  readonly debtPayoff: DebtPayoff;
  /** The recommended retirement income (§9). */
  readonly retirementFigure: RetirementFigure;
  /** The $200 floor, the slider's range, and the §5.3 / §5.4 states. */
  readonly insuranceRange: InsuranceRange;
}

export function computeFactFinder(input: unknown, options: FactFinderOptions = {}): FactFinderResult {
  const v2 = validateLifeCaseFacts(input);
  const facts = toEngineFacts(v2);
  const netPay = computeNetPay(facts);
  const debts = computeDebts(facts.debts.items, facts.debts.extraMonthly);
  const cg = careGraph(careGraphInputFromFacts(v2), netPay.householdNetMonthly);
  const budget = computeHouseholdBudget({ facts, netPay, debts: debts.summary, carePaidMonthly: cg.funding.alreadyPaying });
  const deathNeed = computeDeathNeed({ facts, budget, debts: debts.summary, careGraph: cg });
  const retirement = computeRetirementIncome(facts, netPay);
  const goals = computeGoals(facts, budget);
  // The slider's insurance budget is checked once here, before any screen uses it (guard 27), and the budget card's
  // Protection bucket follows it (F-18, Change 2).
  const buckets = buildBudgetBuckets(budget, facts, options.savePct, insuranceCap(budget, options.budgetMonthly));
  const healthScore = computeHealthScore({ budget, deathNeed, retirement, savings: facts.budget.savings });
  const closing = computeClosing({ facts, budget, debts, careGraph: cg, deathNeed, retirement, goals }, options);
  const insuranceBudget = computeInsuranceBudget(facts, budget, buckets, closing);
  return {
    assumptionSetId: ASSUMPTION_SET_ID,
    facts: v2, debts, careGraph: cg, budget, buckets, deathNeed, retirement, goals, insuranceBudget, healthScore, closing,
    lovedOnes: facts.lovedOnes ? computeLovedOnes(facts.lovedOnes) : null,
    business: facts.business ? computeBusiness(facts.business) : null,
    pay: computePayPlan(facts, netPay, buckets),
    budgetAnalysis: computeBudgetAnalysis({ facts: v2, budget, debts: debts.summary, careGraph: cg }),
    debtPayoff: computeDebtPayoff(facts.debts.items, debts.payoff, facts.debts.extraMonthly, facts.asOfYear, options.asOfMonth),
    retirementFigure: computeRetirementFigure({ facts, budget, careGraph: cg, retirement }),
    insuranceRange: insuranceRange(budget),
  };
}
