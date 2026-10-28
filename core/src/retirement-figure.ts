/**
 * The recommended retirement income (Section 3 §9): "Plan for about $X a month when you retire in 2053."
 *
 *   A. Income rule:    70% of today's household take-home
 *   B. Lifestyle rule: today's spending less the costs that stop by retirement (the mortgage if it ends by then,
 *                      children's costs once the youngest is grown, work costs, parent care that ends at 88, study
 *                      paid today, debt payments). Saving is not in today's spending (§1.1), so nothing is taken off.
 *   Use the larger, in today's money; grow it by inflation for the years to retirement: max(A, B) × (1 + i)^n (guard 33).
 *   NIS and the pensions pay part of it (taken at today's figures, kept level with inflation); the rest is the gap.
 */
import { ProvenanceBuilder } from "./provenance.ts";
import type { Provenance } from "./types.ts";
import { parentAge } from "./life-case-facts.ts";
import type { EngineFacts } from "./engine-facts.ts";
import type { HouseholdBudget } from "./household-budget.ts";
import type { CareGraphResult } from "./care-graph.ts";
import type { RetirementIncome } from "./retirement-income.ts";
import { parentLabel } from "./care-graph.ts";

export type RetirementStopKind = "mortgage" | "kids" | "work" | "care" | "study" | "debts";

export interface RetirementStop {
  readonly kind: RetirementStopKind;
  readonly label: string;
  readonly monthly: number;
  /** The calendar year it ends, when known (the mortgage, a parent's care). */
  readonly endsYear: number | null;
}

export interface RetirementFigure {
  readonly retireAge: number;
  readonly retireYear: number;
  readonly yearsToRetirement: number;
  readonly inflationRate: number;
  readonly replacementRate: number;
  /** A: household take-home today × the replacement rate. */
  readonly takeHomeMonthly: number;
  readonly incomeRuleMonthly: number;
  /** B: today's spending (the budget's needs) less what stops. */
  readonly spendingMonthly: number;
  readonly stops: readonly RetirementStop[];
  readonly stopsMonthly: number;
  readonly lifestyleRuleMonthly: number;
  readonly rule: "income" | "lifestyle";
  /** max(A, B), in today's money. */
  readonly todayMonthly: number;
  /** (1 + i)^n. */
  readonly factor: number;
  /** The headline: in dollars of the year you retire. */
  readonly atRetirementMonthly: number;
  /** What NIS, the SCP and a work pension pay (today's figures). */
  readonly pensionsTodayMonthly: number;
  readonly gapTodayMonthly: number;
  readonly gapAtRetirementMonthly: number;
  /** The income the client said they want (today's money); the "want" field stays editable. */
  readonly wantedMonthly: number;
  /** §9: a note when the want is lower than the recommended figure. */
  readonly wantBelowRecommended: boolean;
  readonly provenance: Provenance;
}

export interface RetirementFigureInputs {
  readonly facts: EngineFacts;
  readonly budget: HouseholdBudget;
  readonly careGraph: CareGraphResult;
  readonly retirement: RetirementIncome;
}

export function computeRetirementFigure(input: RetirementFigureInputs): RetirementFigure {
  const b = new ProvenanceBuilder();
  const { facts, budget, careGraph, retirement } = input;
  const i = b.num("core:ff.rates.inflation");
  const rate = b.num("core:ff.retirementFigure.replacementRate");
  const careTo = b.num("core:ff.careGraph.careToParentAge");
  const kidsStopAge = b.num("core:ff.retirementFigure.childCostsStopAge");
  const retireAge = facts.wishes.retireAge;
  const n = Math.max(0, retireAge - facts.client.age);
  const year = facts.asOfYear + n;
  const take = budget.netPay.householdNetMonthly;
  const A = rate * take;

  const stops: RetirementStop[] = [];
  const m = facts.budget.mortgage;
  if (facts.budget.housing === "mortgage" && m && m.balance > 0 && m.yearsLeft <= n && facts.budget.housingPaymentMonthly > 0) {
    stops.push({ kind: "mortgage", label: "The mortgage", monthly: facts.budget.housingPaymentMonthly, endsYear: facts.asOfYear + m.yearsLeft });
  }
  const tagged = (stop: "kids" | "work"): number => facts.budget.stopMonthly[stop];
  const youngest = facts.children.reduce((a, c) => Math.min(a, c.age), Infinity);
  const kids = tagged("kids");
  if (kids > 0 && (youngest === Infinity || youngest + n >= kidsStopAge)) stops.push({ kind: "kids", label: "Children's costs", monthly: kids, endsYear: null });
  const work = tagged("work");
  if (work > 0) stops.push({ kind: "work", label: "Work costs", monthly: work, endsYear: null });
  const today = new Map(careGraph.parentsToday.map((p) => [p.personId, p.graphMonthly]));
  for (const p of facts.parents) {
    const now = today.get(p.personId) ?? 0;
    const age = parentAge(p, facts.asOfYear);
    if (now > 0 && age + n > careTo) stops.push({ kind: "care", label: `${parentLabel(p)}'s care`, monthly: now, endsYear: facts.asOfYear + careTo - age });
  }
  const study = careGraph.years[0]?.eduMonthly ?? 0;
  if (study > 0) stops.push({ kind: "study", label: "Study costs paid today", monthly: study, endsYear: null });
  if (budget.debtMinimumsMonthly > 0) stops.push({ kind: "debts", label: "Loan and card payments", monthly: budget.debtMinimumsMonthly, endsYear: null });
  const stopsMonthly = stops.reduce((a, s) => a + s.monthly, 0);
  const B = Math.max(0, budget.needsMonthly - stopsMonthly);

  const todayMonthly = Math.max(A, B);
  const factor = Math.pow(1 + i, n);
  const pensions = retirement.floorMonthly;
  const gapToday = Math.max(0, todayMonthly - pensions);
  b.rule("the recommended retirement income is the larger of the income rule and the lifestyle rule, grown by inflation to the year you retire");
  return {
    retireAge, retireYear: year, yearsToRetirement: n, inflationRate: i, replacementRate: rate,
    takeHomeMonthly: take, incomeRuleMonthly: A,
    spendingMonthly: budget.needsMonthly, stops, stopsMonthly, lifestyleRuleMonthly: B,
    rule: A >= B ? "income" : "lifestyle",
    todayMonthly, factor, atRetirementMonthly: todayMonthly * factor,
    pensionsTodayMonthly: pensions, gapTodayMonthly: gapToday, gapAtRetirementMonthly: gapToday * factor,
    wantedMonthly: facts.wishes.retireIncomeMonthly,
    wantBelowRecommended: facts.wishes.retireIncomeMonthly < todayMonthly,
    provenance: b.build(),
  };
}
