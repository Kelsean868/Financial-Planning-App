/**
 * The death need, decided 27 Oct 2026 (closing brief §2.0): the obligation stack — funeral, final
 * medical (floor), expensive debt, the mortgage if the client clears it, the household income gap to
 * youngest age 19 (after partner income and NIS survivors), each parent's care PV, each degree PV,
 * then milestones and legacy, funded in that order. The Tatil standard formula and the other methods
 * are shown beside it as a cross-check only.
 */
import { ProvenanceBuilder } from "./provenance.ts";
import type { Provenance } from "./types.ts";
import type { EngineFacts } from "./engine-facts.ts";
import type { HouseholdBudget } from "./household-budget.ts";
import type { DebtSummary } from "./debts.ts";
import type { CareGraphResult } from "./care-graph.ts";

export type CoverTier = "essential" | "recommended" | "full";
export type ObligationKind = "lump" | "income" | "care" | "edu" | "milestone";

export interface Obligation {
  readonly key: string;
  readonly label: string;
  readonly amount: number;
  readonly tier: CoverTier;
  readonly kind: ObligationKind;
  /** The person it is for: a child's or parent's label. */
  readonly who?: string;
  readonly personId?: string;
}

export interface SurvivorYear {
  readonly t: number;
  readonly need: number;
  readonly partnerIncome: number;
  readonly nisSurvivors: number;
  readonly fromCapital: number;
  readonly short: number;
}

export interface SurvivorCashflow {
  readonly rows: readonly SurvivorYear[];
  /** PV of the yearly gaps at the survivor real return. */
  readonly pvGap: number;
  /** Index of the first year with a shortfall, or -1. */
  readonly firstShortYear: number;
  /** Month (1-based) the money first runs short, or null when it never does. */
  readonly monthOfShortfall: number | null;
}

export interface CoverHeld {
  /** Life cover known to be in force, with group cover reduced at 66 and ended at 70. */
  readonly knownLife: number;
  /** Policies whose amount was not captured. Never counted as zero. */
  readonly unknownCount: number;
  readonly unknownLabels: readonly string[];
  readonly knownCI: number;
}

export interface NeedMethod {
  readonly key: "stack" | "tatil" | "retention" | "spend-down" | "dime" | "age-multiple" | "attic";
  readonly name: string;
  readonly value: number;
}

export interface DeathNeedResult {
  readonly obligations: readonly Obligation[];
  readonly survivorFull: SurvivorCashflow;
  readonly cover: CoverHeld;
  /** Savings plus known cover. */
  readonly assets: number;
  readonly underwritingMultiple: number;
  readonly underwritingCeiling: number;
  /** Cover by tier: essential (ruin level), recommended, full; each capped at the underwriting ceiling. */
  readonly tiers: { readonly essential: number; readonly recommended: number; readonly full: number };
  readonly methods: readonly NeedMethod[];
  readonly provenance: Provenance;
}

export interface DeathNeedContext {
  readonly facts: EngineFacts;
  readonly budget: HouseholdBudget;
  readonly debts: DebtSummary;
  readonly careGraph: CareGraphResult;
}

export function coverHeld(b: ProvenanceBuilder, facts: EngineFacts): CoverHeld {
  const redAge = b.num("group_life.reduction_age");
  const endAge = b.num("group_life.termination_age");
  const factor = b.num("group_life.reduction_factor");
  const age = facts.client.age;
  const known = facts.existingCover.filter((c) => c.amount !== null && c.kind === "life").reduce((a, c) => {
    const amt = c.amount as number;
    return a + (c.group ? (age >= endAge ? 0 : age >= redAge ? amt * factor : amt) : amt);
  }, 0);
  const unknown = facts.existingCover.filter((c) => c.amount === null);
  if (unknown.length) b.caveat("We did not capture this. It is not counted either way.");
  return {
    knownLife: known,
    unknownCount: unknown.length,
    unknownLabels: unknown.map((c) => c.label),
    knownCI: facts.existingCover.filter((c) => c.kind === "ci" && c.amount !== null).reduce((a, c) => a + (c.amount as number), 0),
  };
}

/**
 * The survivor cashflow: the household need each year, less partner income (layer 2) and NIS
 * survivors' benefit (layer 3), paid from `capital` growing at the survivor real return.
 */
export function survivorCashflow(
  b: ProvenanceBuilder, facts: EngineFacts, livingMonthly: number,
  usePartner: boolean, useNis: boolean, capital: number,
): SurvivorCashflow {
  const N = b.num("core:ff.deathNeed.survivorYears");
  const rr = b.num("core:ff.rates.survivorRealReturn");
  const hhShare = b.num("core:ff.deathNeed.householdShareWithChildren");
  const toAge = b.num("core:ff.deathNeed.incomeToYoungestAge");
  const partnerTo = b.num("core:ff.deathNeed.partnerWorksToAge");
  const sSpouse = b.num("core:ff.offsets.nisSurvivorSpouseMonthly");
  const sChild = b.num("core:ff.offsets.nisSurvivorChildMonthly");
  const kids = facts.children.map((k) => k.age).sort((a, c) => a - c);
  const nK = kids.length;
  const partner = facts.partner;
  const perChild = nK ? livingMonthly * (1 - hhShare) / nK : 0;
  let pool = capital;
  let pvGap = 0;
  let monthOfShortfall: number | null = null;
  const rows: SurvivorYear[] = [];
  for (let t = 0; t < N; t++) {
    const dep = kids.filter((a) => a + t < toAge).length;
    const need = partner || nK > 0 ? (livingMonthly * (nK ? hhShare : 1) + perChild * dep) * 12 : 0;
    const pT = usePartner && partner && partner.age + t < partnerTo ? partner.incomeMonthly * 12 : 0;
    const nT = useNis && facts.client.nisPaying ? ((partner ? sSpouse : 0) + sChild * dep) * 12 : 0;
    const gap = Math.max(0, need - pT - nT);
    const fc = Math.min(pool, gap);
    pool = Math.max(0, (pool - fc) * (1 + rr));
    const short = gap - fc;
    rows.push({ t, need, partnerIncome: pT, nisSurvivors: nT, fromCapital: fc, short });
    if (monthOfShortfall === null && short > 1) {
      const perMonth = gap / 12;
      monthOfShortfall = t * 12 + Math.floor(fc / perMonth) + 1;
    }
    pvGap += gap / Math.pow(1 + rr, t);
  }
  return { rows, pvGap, firstShortYear: rows.findIndex((w) => w.short > 1), monthOfShortfall };
}

export function computeDeathNeed(ctx: DeathNeedContext): DeathNeedResult {
  const b = new ProvenanceBuilder();
  const { facts, budget, debts, careGraph } = ctx;
  const w = facts.wishes;
  const survFull = survivorCashflow(b, facts, budget.livingMonthly, true, true, 0);
  const cover = coverHeld(b, facts);

  const ob: Obligation[] = [];
  ob.push({ key: "funeral", label: "Your funeral", amount: w.funeral, tier: "essential", kind: "lump" });
  ob.push({ key: "medical", label: "Final medical bills", amount: Math.max(b.num("conventions.medical_cost_minimum"), w.finalMedical), tier: "essential", kind: "lump" });
  if (debts.expensiveDebt > 0) ob.push({ key: "debt", label: "Expensive debt", amount: debts.expensiveDebt, tier: "essential", kind: "lump" });
  if (budget.housingStopsOnDeath && facts.budget.mortgage) {
    ob.push({ key: "mortgage", label: "The mortgage", amount: facts.budget.mortgage.balance, tier: "essential", kind: "lump" });
  }
  ob.push({ key: "income", label: "Household income, to youngest age 19", amount: survFull.pvGap, tier: "essential", kind: "income" });
  const byStart = <T extends { start: number }>(xs: readonly T[]): T[] => xs.slice().sort((a, c) => a.start - c.start);
  for (const gl of byStart(careGraph.goals.filter((g) => g.kind === "care"))) {
    ob.push({ key: gl.key, label: `${gl.who}'s care`, amount: gl.presentValue, tier: "recommended", kind: "care", who: gl.who, personId: gl.personId });
  }
  for (const gl of byStart(careGraph.goals.filter((g) => g.kind === "edu"))) {
    ob.push({ key: gl.key, label: `${gl.who}'s degree`, amount: gl.presentValue, tier: "recommended", kind: "edu", who: gl.who, personId: gl.personId });
  }
  for (const gl of byStart(careGraph.goals.filter((g) => g.kind === "milestone"))) {
    ob.push({ key: gl.key, label: `${gl.who}'s ${gl.what}`, amount: gl.presentValue, tier: "full", kind: "milestone", who: gl.who, personId: gl.personId });
  }
  if (w.legacy > 0) ob.push({ key: "legacy", label: "What you leave behind", amount: w.legacy, tier: "full", kind: "lump" });

  const sumTier = (ts: readonly CoverTier[]): number => ob.filter((o) => ts.includes(o.tier)).reduce((a, o) => a + o.amount, 0);
  const assets = facts.budget.savings + cover.knownLife;
  const mults = b.get<readonly { toAge: number | null; times: number }[]>("core:ff.deathNeed.underwritingMultiples");
  const age = facts.client.age;
  const uwMult = mults.find((m) => m.toAge === null || age <= m.toAge)!.times;
  const g = facts.client.grossMonthly;
  const uw = g * 12 * uwMult;
  const tiers = {
    essential: Math.min(uw, Math.max(0, sumTier(["essential"]) - assets)),
    recommended: Math.min(uw, Math.max(0, sumTier(["essential", "recommended"]) - assets)),
    full: Math.min(uw, Math.max(0, sumTier(["essential", "recommended", "full"]) - assets)),
  };
  b.rule("obligations are funded in stack order; cover is capped at the underwriting ceiling");

  // Cross-check methods (shown beside the stack, never used to size cover).
  const kids = facts.children;
  const partnerNet = budget.netPay.partnerNetMonthly;
  const M = b.get<{
    incomeShareOfGross: number; retentionRate: number; spendDownRealRate: number; yearsWithChildren: number;
    yearsWithoutChildren: number; atticTimes: number; ageMultiples: readonly { toAge: number | null; times: number }[];
  }>("core:ff.deathNeed.crossCheckMethods");
  const yrsRep = kids.length ? M.yearsWithChildren : M.yearsWithoutChildren;
  const inc = g * 12;
  const annNeed = Math.max(0, g * M.incomeShareOfGross - partnerNet) * 12;
  const eduT = kids.length * b.num("core:ff.deathNeed.tatilEducationPerChild");
  const off = cover.knownLife + facts.budget.savings;
  const af = (1 - Math.pow(1 + M.spendDownRealRate, -yrsRep)) / M.spendDownRealRate;
  const gM = M.ageMultiples.find((m) => m.toAge === null || age <= m.toAge)!.times;
  const youngest = kids.length ? Math.min(...kids.map((k) => k.age)) : null;
  const sSpouse = b.num("core:ff.offsets.nisSurvivorSpouseMonthly");
  const sChild = b.num("core:ff.offsets.nisSurvivorChildMonthly");
  const childTo = b.num("core:ff.offsets.nisSurvivorChildToAge");
  const nisSurv = facts.client.nisPaying ? sSpouse * (facts.partner ? 1 : 0) + sChild * kids.filter((k) => k.age < childTo).length : 0;
  const tatilYears = youngest === null ? 0 : Math.max(0, b.num("core:ff.deathNeed.tatilIncomeToYoungestAge") - youngest);
  const medical = Math.max(b.num("conventions.medical_cost_minimum"), w.finalMedical);
  const mortgageBal = facts.budget.mortgage ? facts.budget.mortgage.balance : 0;
  const clears = !!facts.budget.mortgage && facts.budget.mortgage.clearOnDeath;
  const tatil = Math.max(0, w.funeral + medical + debts.expensiveDebt + (clears ? mortgageBal : 0) + eduT
    + Math.max(0, budget.livingMonthly + budget.carePaidMonthly - nisSurv) * 12 * tatilYears - facts.budget.savings);
  const otherDebt = debts.otherDebt + mortgageBal;
  const bad = debts.expensiveDebt;
  const methods: NeedMethod[] = [
    { key: "stack", name: "Everything we captured (this tool)", value: tiers.recommended },
    { key: "tatil", name: "Tatil standard formula", value: tatil },
    { key: "retention", name: "Capital retention at 8%", value: Math.max(0, annNeed / M.retentionRate + bad + otherDebt + eduT - off) },
    { key: "spend-down", name: "Capital spent down (2.7% real)", value: Math.max(0, annNeed * af + bad + otherDebt + eduT - off) },
    { key: "dime", name: "DIME", value: Math.max(0, bad + inc * yrsRep + otherDebt + eduT - off) },
    { key: "age-multiple", name: "Age-banded multiple", value: inc * gM },
    { key: "attic", name: "ATTIC rule of thumb", value: inc * M.atticTimes },
  ];
  b.rule("the Tatil standard formula and the other methods are a cross-check only");

  return { obligations: ob, survivorFull: survFull, cover, assets, underwritingMultiple: uwMult, underwritingCeiling: uw, tiers, methods, provenance: b.build() };
}
