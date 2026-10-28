/**
 * Module 3 — goals (Section 2 §2.3): named goals and own goals, target, years, monthly saving;
 * the home deposit (lenders up to 90%; first-time buyer stamp duty relief under $2M) and the car loan.
 */
import { ProvenanceBuilder } from "./provenance.ts";
import type { Provenance } from "./types.ts";
import type { GoalFacts } from "./life-case-facts.ts";
import type { EngineFacts } from "./engine-facts.ts";
import type { HouseholdBudget } from "./household-budget.ts";
import { amortisedPayment, carLoan, type CarLoanResult } from "./debts.ts";
import { premiumFor } from "./premiums.ts";

export interface HomePlan {
  readonly deposit: number;
  readonly closingCosts: number;
  readonly loan: number;
  readonly termYears: number;
  readonly ratePct: number;
  readonly monthlyPayment: number;
  /** What a bank would likely allow a month on this pay. */
  readonly affordableMonthly: number;
  readonly fits: boolean;
  /** What a bank may lend at the affordable payment. */
  readonly likelyLoan: number;
  /** First-time buyer stamp duty relief may apply (price under the threshold). */
  readonly stampDutyReliefPossible: boolean;
  /** Rough life cover premium on the loan, at the purchase age and ten years later. */
  readonly loanCoverMonthly: { readonly atPurchase: number; readonly tenYearsLater: number; readonly label: "rough" };
}

export interface GoalPlan {
  readonly goalId: string;
  readonly kind: GoalFacts["kind"];
  readonly title: string;
  readonly route: GoalFacts["route"];
  /** What is still to save before the goal. */
  readonly target: number;
  readonly years: number;
  readonly monthlySaving: number;
  readonly home: HomePlan | null;
  readonly car: CarLoanResult | null;
}

export interface GoalsResult {
  readonly plans: readonly GoalPlan[];
  readonly totalMonthly: number;
  /** Left after costs, a month. */
  readonly available: number;
  readonly fits: boolean;
  readonly provenance: Provenance;
}

const TITLES: Record<GoalFacts["kind"], string> = {
  home: "House", vehicle: "Car", study: "Your own studies", business: "Start a business", own: "Your own goal",
};

export function pvOfPayment(pay: number, ratePct: number, years: number): number {
  const m = ratePct / 1200;
  const n = Math.max(1, years * 12);
  return pay <= 0 ? 0 : pay * (1 - Math.pow(1 + m, -n)) / m;
}

function monthlyToSave(b: ProvenanceBuilder, target: number, years: number): number {
  const m = b.num("core:ff.goals.savingReturn") / 12;
  const n = Math.max(1, years * 12);
  return target <= 0 ? 0 : target * m / (Math.pow(1 + m, n) - 1);
}

function homePlan(b: ProvenanceBuilder, facts: EngineFacts, budget: HouseholdBudget, g: GoalFacts): { plan: HomePlan; target: number } {
  const ltv = b.num("core:ff.goals.homeLoanToValue");
  const dep = g.price * (1 - ltv);
  const close = g.price * b.num("core:ff.goals.homeClosingCosts");
  const loan = g.price - dep;
  const target = Math.max(0, dep + close - g.saved);
  const age = facts.client.age;
  const term = Math.max(b.num("core:ff.goals.mortgageMinYears"), Math.min(b.num("core:ff.goals.mortgageMaxYears"), b.num("core:ff.goals.mortgageEndsByAge") - age - g.years));
  const ratePct = b.num("core:ff.goals.mortgageRatePct");
  const pay = amortisedPayment(loan, ratePct, term);
  const mortgage = facts.budget.mortgage;
  const maxPay = Math.max(0, facts.client.grossMonthly * b.num("core:ff.goals.affordabilityShareOfGross") - budget.debtMinimumsMonthly - (mortgage && mortgage.balance > 0 ? facts.budget.housingPaymentMonthly : 0));
  const minCover = b.num("core:ff.goals.loanCoverMinimumMonthly");
  return {
    target,
    plan: {
      deposit: dep, closingCosts: close, loan, termYears: term, ratePct, monthlyPayment: pay,
      affordableMonthly: maxPay, fits: pay <= maxPay, likelyLoan: pvOfPayment(maxPay, ratePct, term),
      stampDutyReliefPossible: g.price < b.num("core:ff.goals.stampDutyReliefBelow"),
      loanCoverMonthly: {
        atPurchase: Math.max(minCover, premiumFor(b, "term", loan, age + g.years)),
        tenYearsLater: Math.max(minCover, premiumFor(b, "term", loan, age + g.years + 10)),
        label: "rough",
      },
    },
  };
}

export function computeGoals(facts: EngineFacts, budget: HouseholdBudget): GoalsResult {
  const b = new ProvenanceBuilder();
  const plans: GoalPlan[] = facts.goals.filter((g) => g.on).map((g) => {
    let target: number;
    let home: HomePlan | null = null;
    let car: CarLoanResult | null = null;
    if (g.kind === "home" && g.route === "mortgage") {
      const h = homePlan(b, facts, budget, g);
      home = h.plan;
      target = h.target;
    } else if (g.kind === "vehicle" && g.route === "loan") {
      const loanInput = {
        price: g.price, newVehicle: g.newVehicle !== false, saved: g.saved,
        ...(g.depositPct !== undefined ? { depositPct: g.depositPct } : {}),
        ...(g.termYears !== undefined ? { termYears: g.termYears } : {}),
      };
      car = carLoan(b, loanInput);
      target = car.saveFirst;
    } else {
      target = Math.max(0, g.price - g.saved);
    }
    const title = g.kind === "own" && g.label && g.label.trim() ? g.label : TITLES[g.kind];
    return { goalId: g.goalId, kind: g.kind, title, route: g.route, target, years: g.years, monthlySaving: monthlyToSave(b, target, g.years), home, car };
  });
  const total = plans.reduce((a, p) => a + p.monthlySaving, 0);
  const available = Math.max(0, budget.surplusMonthly);
  b.rule("goal saving is sized in a fund growing about 3% a year");
  return { plans, totalMonthly: total, available, fits: total <= available + 0.5, provenance: b.build() };
}
