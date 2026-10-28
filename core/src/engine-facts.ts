/**
 * The engine's view of a case (Section 3 Build A). Version 2 facts are what is stored and validated; the modules that
 * existed before Section 3 read monthly figures (gross pay, cost lines, once-a-year bills, the mortgage payment, a
 * parent's care today). `toEngineFacts` works those out from the version 2 facts once, so every module reads the same
 * numbers and none recomputes them (guard 29: budget lines add to the totals the rest of the engine uses; debts and
 * parent care are never counted twice).
 *
 * Frequency maths (guard 28): weekly ×52/12, fortnightly ×26/12, twice a month ×2, monthly ×1, yearly ÷12.
 */
import { ProvenanceBuilder } from "./provenance.ts";
import type {
  LifeCaseFacts, ClientFacts, PartnerFacts, ParentFacts, PayFacts, BudgetGroupFacts, ChildFacts, GoalFacts, CoverFacts,
  WishFacts, WorkPensionFacts, LovedOnesFacts, BusinessFacts, DebtFacts, HousingKind, CostLineV1, StopTag,
} from "./life-case-facts.ts";
import { catalogueGroup, type AssetKind } from "./life-case-facts.ts";
import type { Frequency } from "./parameters/fact-finder-2026-10.ts";

const MONTHS_A_YEAR = 12;

/** The kinds that count as cash: "unit trusts and money market funds" are one kind (§6.4), so unit-trust is cash. */
export const CASH_KINDS: readonly AssetKind[] = ["bank", "credit-union", "unit-trust"];

/** Cash today: the cash asset rows when there are any, else the version 1 `budget.savings`. */
export function cashFromFacts(facts: Pick<LifeCaseFacts, "assets" | "budget">): number {
  const rows = facts.assets.filter((a) => CASH_KINDS.includes(a.kind));
  return rows.length > 0 ? rows.reduce((s, a) => s + a.value, 0) : facts.budget.savings;
}


/** Turn an amount at a frequency into a monthly figure (guard 28). Exact for monthly; yearly is ÷12. */
export function toMonthly(b: ProvenanceBuilder, amount: number, frequency: Frequency): number {
  if (frequency === "monthly") return amount;
  const perYear = b.get<Readonly<Record<Frequency, number>>>("core:ff.frequency.perYear")[frequency];
  return perYear === 1 ? amount / MONTHS_A_YEAR : amount * perYear / MONTHS_A_YEAR;
}

/** Turn an amount at a frequency into a yearly figure. */
export function toYearly(b: ProvenanceBuilder, amount: number, frequency: Frequency): number {
  return amount * b.get<Readonly<Record<Frequency, number>>>("core:ff.frequency.perYear")[frequency];
}

/** Pay a month: the usual month, and the month the plan uses (the lowest when pay changes, §2.5). */
export function payMonthly(b: ProvenanceBuilder, pay: PayFacts): { readonly usual: number; readonly plan: number } {
  const usual = toMonthly(b, pay.amountPerPay, pay.frequency);
  return { usual, plan: pay.varies && pay.lowestMonthly !== null ? pay.lowestMonthly : usual };
}

/** A group's monthly figure: its total when skipped, else the sum of its lines. */
export function groupMonthly(b: ProvenanceBuilder, g: BudgetGroupFacts): number {
  if (g.skip) return toMonthly(b, g.total ?? 0, g.totalFrequency ?? "monthly");
  return g.lines.reduce((a, l) => a + toMonthly(b, l.amount, l.frequency), 0);
}

/** How the budget splits for the engine (§1.1): every line counted once, in one place. */
export interface BudgetSplit {
  /** Spending lines, monthly: every line not saving, not once-a-year and not a parent's care. Skipped groups as one line. */
  readonly costs: readonly CostLineV1[];
  /** Once-a-year costs, a year (the `yearly` group). */
  readonly irregularAnnual: number;
  /** "Saving you already do", a month. Not spending (§1.1). */
  readonly savingMonthly: number;
  /** A parent's care today, a month: the lines whose `personId` is that parent (§1.3). */
  readonly parentToday: ReadonlyMap<string, number>;
  /** The mortgage payment a month: lines tagged `stop: mortgage`, when the home is on a mortgage. */
  readonly mortgagePaymentMonthly: number;
  /** Monthly totals of the lines tagged with each stop (§9). Parent care lines are under `care`. */
  readonly stopMonthly: Readonly<Record<StopTag, number>>;
}

export function splitBudget(b: ProvenanceBuilder, facts: Pick<LifeCaseFacts, "budget" | "parents">): BudgetSplit {
  const costs: CostLineV1[] = [];
  let irregularAnnual = 0;
  let saving = 0;
  let mortgage = 0;
  const parentToday = new Map<string, number>(facts.parents.map((p) => [p.personId, 0]));
  const stops: Record<StopTag, number> = { mortgage: 0, kids: 0, work: 0, care: 0 };
  for (const g of facts.budget.groups) {
    const kind = catalogueGroup(g.key).kind;
    if (g.skip) {
      const m = groupMonthly(b, g);
      if (kind === "saving") saving += m;
      else if (kind === "yearly") irregularAnnual += toYearly(b, g.total ?? 0, g.totalFrequency ?? "monthly");
      else costs.push({ label: catalogueGroup(g.key).label, monthly: m });
      continue;
    }
    for (const l of g.lines) {
      const m = toMonthly(b, l.amount, l.frequency);
      if (l.personId !== undefined) {
        parentToday.set(l.personId, (parentToday.get(l.personId) ?? 0) + m);
        stops.care += m;
        continue;
      }
      if (l.stop) {
        if (l.stop !== "mortgage" || facts.budget.housing === "mortgage") stops[l.stop] += m;
        if (l.stop === "mortgage" && facts.budget.housing === "mortgage") mortgage += m;
      }
      if (kind === "saving") saving += m;
      else if (kind === "yearly") irregularAnnual += toYearly(b, l.amount, l.frequency);
      else costs.push({ label: l.label, monthly: m });
    }
  }
  return { costs, irregularAnnual, savingMonthly: saving, parentToday, mortgagePaymentMonthly: mortgage, stopMonthly: stops };
}

/** A parent as the engine reads it: the facts plus today's care from the budget. */
export interface EngineParent extends ParentFacts {
  readonly todayMonthly: number;
}

/**
 * A parent the client supports: care paid today, or a future care level that will grow (§1.3). Replaces the version-1
 * test `careTier > 0`.
 */
export function parentSupported(p: Pick<EngineParent, "todayMonthly" | "growth" | "careTier">): boolean {
  return p.todayMonthly > 0 || (p.growth && p.careTier > 0);
}

/** The case in the monthly figures the pre-Section-3 modules read. Built only by `toEngineFacts`. */
export interface EngineFacts {
  readonly schemaVersion: 2;
  readonly asOfYear: number;
  readonly client: ClientFacts & { readonly grossMonthly: number; readonly usualGrossMonthly: number };
  readonly partner: (PartnerFacts & { readonly incomeMonthly: number }) | null;
  readonly children: readonly ChildFacts[];
  readonly parents: readonly EngineParent[];
  readonly budget: {
    readonly costs: readonly CostLineV1[];
    readonly irregularAnnual: number;
    readonly savingMonthly: number;
    /** Monthly totals of the lines tagged with each stop (§9). */
    readonly stopMonthly: Readonly<Record<StopTag, number>>;
    readonly housing: HousingKind;
    /** The mortgage payment a month (only used while there is a mortgage). */
    readonly housingPaymentMonthly: number;
    readonly mortgage: { readonly balance: number; readonly yearsLeft: number; readonly clearOnDeath: boolean } | null;
    /** Cash today: the cash asset rows, or the version 1 `savings` when there are none (`cashFromFacts`). */
    readonly savings: number;
  };
  readonly debts: { readonly items: readonly DebtFacts[]; readonly extraMonthly: number };
  readonly goals: readonly GoalFacts[];
  readonly existingCover: readonly CoverFacts[];
  readonly wishes: WishFacts;
  readonly workPension: WorkPensionFacts;
  readonly lovedOnes?: LovedOnesFacts;
  readonly business?: BusinessFacts;
}

export function toEngineFacts(facts: LifeCaseFacts): EngineFacts {
  const b = new ProvenanceBuilder();
  const split = splitBudget(b, facts);
  const pay = payMonthly(b, facts.client.pay);
  return {
    schemaVersion: 2,
    asOfYear: facts.asOfYear,
    client: { ...facts.client, grossMonthly: pay.plan, usualGrossMonthly: pay.usual },
    partner: facts.partner ? { ...facts.partner, incomeMonthly: payMonthly(b, facts.partner.pay).plan } : null,
    children: facts.children,
    parents: facts.parents.map((p) => ({ ...p, todayMonthly: split.parentToday.get(p.personId) ?? 0 })),
    budget: {
      costs: split.costs,
      irregularAnnual: split.irregularAnnual,
      savingMonthly: split.savingMonthly,
      stopMonthly: split.stopMonthly,
      housing: facts.budget.housing,
      housingPaymentMonthly: split.mortgagePaymentMonthly,
      mortgage: facts.budget.mortgage,
      savings: cashFromFacts(facts),
    },
    debts: facts.debts,
    goals: facts.goals,
    existingCover: facts.existingCover,
    wishes: facts.wishes,
    workPension: facts.workPension,
    ...(facts.lovedOnes ? { lovedOnes: facts.lovedOnes } : {}),
    ...(facts.business ? { business: facts.business } : {}),
  };
}
