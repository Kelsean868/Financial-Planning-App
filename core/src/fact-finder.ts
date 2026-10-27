/**
 * One call for the page: validate the facts, run every fact-finder module in dependency order, and
 * return all results. Pure: the same facts and options give the same result (no clock, no I/O).
 *
 * Order: net pay → debts → care graph (needs household net for its verdict) → budget (needs the
 * care already paid) → death need → retirement → goals → budget builder → insurance budget →
 * health score → closing.
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
import { computeLovedOnes, type LovedOnesResult } from "./loved-ones.ts";
import { computeBusiness, type BusinessResult } from "./business.ts";
import { ASSUMPTION_SET_ID } from "./parameters/fact-finder-2026-10.ts";

export interface FactFinderOptions extends ClosingOptions {
  /** Pay-yourself-first share of take-home, percent. Default from the assumption set (15). */
  readonly savePct?: number;
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
}

export function computeFactFinder(input: unknown, options: FactFinderOptions = {}): FactFinderResult {
  const facts = validateLifeCaseFacts(input);
  const netPay = computeNetPay(facts);
  const debts = computeDebts(facts.debts.items, facts.debts.extraMonthly);
  const cg = careGraph(careGraphInputFromFacts(facts), netPay.householdNetMonthly);
  const budget = computeHouseholdBudget({ facts, netPay, debts: debts.summary, carePaidMonthly: cg.funding.alreadyPaying });
  const deathNeed = computeDeathNeed({ facts, budget, debts: debts.summary, careGraph: cg });
  const retirement = computeRetirementIncome(facts, netPay);
  const goals = computeGoals(facts, budget);
  const buckets = buildBudgetBuckets(budget, facts, options.savePct);
  const insuranceBudget = computeInsuranceBudget(facts, budget, buckets);
  const healthScore = computeHealthScore({ budget, deathNeed, retirement, savings: facts.budget.savings });
  const closing = computeClosing({ facts, budget, debts, careGraph: cg, deathNeed, retirement, goals }, options);
  return {
    assumptionSetId: ASSUMPTION_SET_ID,
    facts, debts, careGraph: cg, budget, buckets, deathNeed, retirement, goals, insuranceBudget, healthScore, closing,
    lovedOnes: facts.lovedOnes ? computeLovedOnes(facts.lovedOnes) : null,
    business: facts.business ? computeBusiness(facts.business) : null,
  };
}
