/**
 * Module 1 — household budget (Section 2 §2.3): net pay (PAYE, NIS, health surcharge), household
 * net, costs, housing, surplus, buffer, emergency fund, financial stage and the safe insurance ceiling.
 * Plus the budget builder (pay yourself first) the insurance budget reads its savings total from.
 */
import { ProvenanceBuilder } from "./provenance.ts";
import type { Provenance } from "./types.ts";
import type { LifeCaseFacts } from "./life-case-facts.ts";
import type { DebtSummary } from "./debts.ts";

export interface NetPay {
  readonly grossMonthly: number;
  readonly nisMonthly: number;
  readonly healthSurchargeMonthly: number;
  readonly payeMonthly: number;
  readonly netMonthly: number;
  readonly partnerNetMonthly: number;
  readonly householdNetMonthly: number;
  /** Unused room in the TT$60,000 combined deduction cap, a year. */
  readonly deductionHeadroomAnnual: number;
  readonly paysTax: boolean;
  readonly provenance: Provenance;
}

export type Stage = 0 | 1 | 2 | 3 | 4;

export interface HouseholdBudget {
  readonly netPay: NetPay;
  readonly costsMonthly: number;
  readonly irregularMonthly: number;
  readonly debtMinimumsMonthly: number;
  /** Care already being paid now (care graph `alreadyPaying`). */
  readonly carePaidMonthly: number;
  /** Real monthly needs: costs + debt minimums + care paid + irregular bills. */
  readonly needsMonthly: number;
  /** What the household lives on if the client dies: needs less a mortgage that clears, debt minimums and care. */
  readonly livingMonthly: number;
  readonly housingStopsOnDeath: boolean;
  readonly surplusMonthly: number;
  /** Months of needs the savings cover. */
  readonly bufferMonths: number;
  readonly dependants: number;
  readonly emergencyFundMonths: number;
  readonly stage: Stage;
  /** The safe insurance ceiling, a month. */
  readonly ceilingMonthly: number;
  /** Floor 50 / Recommended 75 / Ceiling 100, anchored at the ceiling. */
  readonly band: { readonly floor: number; readonly recommended: number; readonly ceiling: number };
  readonly needsRatio: number;
  /** Stage 0, or needs above the hardball ratio of take-home. */
  readonly hardball: boolean;
  readonly shortfallMonthly: number;
  /** Extra hours a week at the minimum wage that would close the shortfall. */
  readonly hoursAtMinimumWage: number;
  readonly expensiveDebt: number;
  readonly provenance: Provenance;
}

type PayeBand = { up_to: number | null; rate: number };
type SurchargeRate = { monthly_emoluments_over: number | null; weekly_rate: number };

function payeAnnual(chargeable: number, bands: readonly PayeBand[]): number {
  let tax = 0;
  let lower = 0;
  for (const band of bands) {
    const upper = band.up_to ?? Infinity;
    if (chargeable > lower) tax += (Math.min(chargeable, upper) - lower) * band.rate;
    lower = upper;
  }
  return tax;
}

export function computeNetPay(facts: Pick<LifeCaseFacts, "client" | "partner">): NetPay {
  const b = new ProvenanceBuilder();
  const c = facts.client;
  const g = c.grossMonthly;
  const ceilingNis = b.num("nis.insurable_earnings_ceiling");
  const nis = c.nisPaying ? b.num("core:ff.tax.nisEmployeeRate") * Math.min(g, ceilingNis) : 0;

  let surchargeWeekly = 0;
  if (c.age < b.num("core:ff.tax.surchargeExemptFromAge")) {
    const rates = b.get<readonly SurchargeRate[]>("health_surcharge.rates");
    const hit = rates.find((r) => r.monthly_emoluments_over === null || g > r.monthly_emoluments_over);
    surchargeWeekly = hit ? hit.weekly_rate : 0;
  } else {
    b.use("health_surcharge.exemptions");
    b.rule("no health surcharge from age 60");
  }
  const hs = surchargeWeekly * b.num("core:ff.tax.surchargeWeeksPerYear") / 12;

  const allowance = b.num("income_tax.personal_allowance");
  const cap = b.num("income_tax.combined_deduction_cap");
  const nisDeductible = nis * 12 * b.num("core:ff.tax.nisDeductibleShare");
  const chargeable = Math.max(0, g * 12 - allowance - Math.min(cap, nisDeductible));
  const paye = payeAnnual(chargeable, b.get<readonly PayeBand[]>("income_tax.paye_bands")) / 12;
  const net = g - nis - hs - paye;
  const partnerNet = facts.partner ? facts.partner.incomeMonthly : 0;
  return {
    grossMonthly: g,
    nisMonthly: nis,
    healthSurchargeMonthly: hs,
    payeMonthly: paye,
    netMonthly: net,
    partnerNetMonthly: partnerNet,
    householdNetMonthly: net + partnerNet,
    deductionHeadroomAnnual: Math.max(0, cap - nisDeductible),
    paysTax: paye > b.num("core:ff.tax.paysTaxAbove"),
    provenance: b.build(),
  };
}

export interface BudgetInputs {
  readonly facts: LifeCaseFacts;
  readonly netPay: NetPay;
  readonly debts: DebtSummary;
  /** Care graph `alreadyPaying`: care and study costs leaving the account now. */
  readonly carePaidMonthly: number;
}

export function computeHouseholdBudget(input: BudgetInputs): HouseholdBudget {
  const b = new ProvenanceBuilder();
  b.merge(input.netPay.provenance);
  const { facts, netPay, debts } = input;
  const bud = facts.budget;
  const costs = bud.costs.reduce((a, c) => a + c.monthly, 0);
  const irregular = bud.irregularAnnual / 12;
  const needs = costs + debts.minimumsMonthly + input.carePaidMonthly + irregular;
  const housingStops = bud.housing === "mortgage" && !!bud.mortgage && bud.mortgage.clearOnDeath && bud.mortgage.balance > 0;
  const living = needs - (housingStops ? bud.housingPaymentMonthly : 0) - debts.minimumsMonthly - input.carePaidMonthly;
  const hhNet = netPay.householdNetMonthly;
  const surplus = hhNet - needs;
  const buffer = needs > 0 ? bud.savings / needs : 0;
  const deps = facts.children.length + facts.parents.filter((p) => p.careTier > 0).length;
  const ef = facts.client.selfEmployed
    ? b.num("core:ff.budget.emergencyMonthsSelfEmployed")
    : deps > 0 ? b.num("core:ff.budget.emergencyMonthsDependants") : b.num("core:ff.budget.emergencyMonthsAlone");
  const bad = debts.expensiveDebt;
  const stage: Stage = surplus <= 0 ? 0 : buffer < 1 ? 1 : bad > 0 ? 2 : buffer < ef ? 3 : 4;
  const pcts = b.get<readonly { stage: number; ofNet: number; ofSurplus: number }[]>("core:ff.budget.stagePercents");
  const pct = pcts[stage]!;
  const ceiling = stage === 0 ? 0 : Math.max(0, Math.min(pct.ofNet * hhNet, pct.ofSurplus * surplus));
  const shares = b.get<{ floor: number; recommended: number; ceiling: number }>("core:ff.closing.bandShares");
  const needsRatio = needs / hhNet;
  const hardballRatio = b.num("core:ff.budget.hardballNeedsRatio");
  const shortfall = surplus <= 0 ? -surplus : Math.max(0, needs - hardballRatio * hhNet);
  const hours = Math.ceil(shortfall / b.num("core:ff.budget.minimumWageHourly") / b.num("core:ff.budget.weeksPerMonth"));
  b.rule(`stage ${stage}: ${stage === 0 ? "costs exceed income" : stage === 1 ? "under one month saved" : stage === 2 ? "expensive debt" : stage === 3 ? "emergency fund not full" : "stable"}`);
  return {
    netPay,
    costsMonthly: costs,
    irregularMonthly: irregular,
    debtMinimumsMonthly: debts.minimumsMonthly,
    carePaidMonthly: input.carePaidMonthly,
    needsMonthly: needs,
    livingMonthly: living,
    housingStopsOnDeath: housingStops,
    surplusMonthly: surplus,
    bufferMonths: buffer,
    dependants: deps,
    emergencyFundMonths: ef,
    stage,
    ceilingMonthly: ceiling,
    band: { floor: ceiling * shares.floor, recommended: ceiling * shares.recommended, ceiling: ceiling * shares.ceiling },
    needsRatio,
    hardball: stage === 0 || needsRatio > hardballRatio,
    shortfallMonthly: shortfall,
    hoursAtMinimumWage: hours,
    expensiveDebt: bad,
    provenance: b.build(),
  };
}

/* ------------------------------------------------------------------ budget builder */

export interface BudgetBuckets {
  readonly payYourselfFirstPct: number;
  readonly payYourselfFirstMonthly: number;
  readonly protection: number;
  readonly expensiveDebtExtra: number;
  readonly emergencyFund: number;
  readonly retirement: number;
  readonly goals: number;
  readonly guiltFreeSpending: number;
}

/** The prototype's pay-yourself-first builder: the saving share is split in order, the rest is spending. */
export function buildBudgetBuckets(budget: HouseholdBudget, facts: LifeCaseFacts, savePct?: number): BudgetBuckets {
  const b = new ProvenanceBuilder();
  const pctUsed = savePct ?? b.num("core:ff.budget.payYourselfFirstPct");
  const s0 = Math.max(0, budget.surplusMonthly);
  const payFirst = Math.min(s0, budget.netPay.householdNetMonthly * pctUsed / 100);
  let left = payFirst;
  const take = (amt: number): number => { const x = Math.max(0, Math.min(left, amt)); left -= x; return x; };
  const protection = take(budget.stage === 0 ? 0 : budget.band.recommended);
  const debt = take(budget.expensiveDebt > 0 ? facts.debts.extraMonthly : 0);
  const months = b.num("core:ff.budget.bufferTargetMonths");
  const em = take(Math.max(0, budget.needsMonthly * months - facts.budget.savings) / b.num("core:ff.budget.builderBufferBuildMonths"));
  const retirement = take(left / 2);
  const goals = take(left);
  return {
    payYourselfFirstPct: pctUsed,
    payYourselfFirstMonthly: payFirst,
    protection,
    expensiveDebtExtra: debt,
    emergencyFund: em,
    retirement,
    goals,
    guiltFreeSpending: Math.max(0, s0 - payFirst),
  };
}
