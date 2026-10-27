/**
 * Module 4 — insurance budget (Section 2 §2.3): splits the monthly protection and savings budgets
 * across recommended plans, fits each plan to its minimum premium, and moves plans that do not fit
 * to "not yet" with the amount needed. No funded plan is ever below its minimum (guard 16).
 * The Disability Income Rider is only ever recommended on Cashbuilder II (guard 17).
 */
import { ProvenanceBuilder } from "./provenance.ts";
import type { Provenance } from "./types.ts";
import type { LifeCaseFacts } from "./life-case-facts.ts";
import { parentAge } from "./life-case-facts.ts";
import type { HouseholdBudget, BudgetBuckets } from "./household-budget.ts";
import type { ProductId, ProductSpec, RiderId, RiderSpec } from "./parameters/tatil-products-2026-10.ts";
import { fitToMinimums, ratePer1000, roughBand, type PremiumBand, type FitRow } from "./premiums.ts";

export type Profile = "single" | "family" | "later";

/** How a plan's premium buys cover, for the minimum-premium arithmetic. */
type CoverBasis = "term" | "whole-life" | "ci" | "rest-assured" | "cashbuilder" | "endowment" | "none";

export interface PlanRow {
  readonly key: string;
  readonly name: string;
  readonly product: ProductId;
  readonly riders: readonly RiderId[];
  /** Share of the budget left after minimums. */
  readonly weight: number;
  readonly why: string;
  readonly costTier: string;
  readonly basis: CoverBasis;
  /** Age of the person insured. */
  readonly insuredAge: number;
}

export interface FundedPlan {
  readonly key: string;
  readonly name: string;
  readonly product: ProductId;
  readonly riders: readonly { readonly id: RiderId; readonly name: string; readonly underwriting: string }[];
  readonly monthly: number;
  readonly minimumMonthly: number;
  readonly atMinimum: boolean;
  /** Rough cover the monthly amount buys; null for savings plans. */
  readonly roughCover: number | null;
  readonly why: string;
  readonly disclosure: string | null;
  readonly label: string;
}

export interface NotYetPlan {
  readonly key: string;
  readonly name: string;
  readonly product: ProductId;
  readonly riders: readonly { readonly id: RiderId; readonly name: string; readonly underwriting: string }[];
  /** The minimum a month this plan needs. */
  readonly needsMonthly: number;
}

export interface InsuranceBudgetGroup {
  readonly title: "Protection" | "Savings plans";
  readonly totalMonthly: number;
  readonly funded: readonly FundedPlan[];
  readonly notYet: readonly NotYetPlan[];
  readonly note: string;
}

export interface InsuranceBudgetResult {
  readonly profile: Profile;
  readonly groups: readonly [InsuranceBudgetGroup, InsuranceBudgetGroup];
  readonly note: string;
  readonly provenance: Provenance;
}

/** Guard 17: a rider may only sit on a product its row allows. Throws otherwise. */
export function assertRidersAllowed(b: ProvenanceBuilder, product: ProductId, riders: readonly RiderId[]): void {
  for (const r of riders) {
    const spec = b.get<RiderSpec>(`core:riders.${r}`);
    const onProduct = b.get<ProductSpec>(`core:products.${product}`).riders;
    if (!spec.allowedOn.includes(product) || !onProduct.includes(r)) {
      throw new Error(`${spec.name} is not offered on ${product}; it is only on ${spec.allowedOn.join(", ")}`);
    }
  }
}

/** Cover $1 a month of premium buys, for the minimum-sum arithmetic. */
function coverPerDollar(b: ProvenanceBuilder, basis: CoverBasis, age: number): number {
  switch (basis) {
    case "term": return 1000 / ratePer1000(b, "term", age);
    case "whole-life": return 1000 / ratePer1000(b, "whole-life", age);
    case "ci": return 1000 / ratePer1000(b, "ci", age);
    case "rest-assured": return 1000 / ratePer1000(b, "rest-assured", age);
    case "cashbuilder": return b.num("core:ff.premiumRates.cashbuilderCoverShare") * 1000 / ratePer1000(b, "whole-life", age);
    case "endowment": return 12 * b.num("core:ff.premiumRates.endowmentCoverYears") * b.num("core:ff.premiumRates.endowmentCoverShare");
    case "none": return 0;
  }
}

/** The plan's minimum a month: its minimum premium, or what its minimum cover costs, whichever is more. */
export function minimumFor(b: ProvenanceBuilder, row: Pick<PlanRow, "product" | "basis" | "insuredAge">): number {
  const spec = b.get<ProductSpec>(`core:products.${row.product}`);
  const minPrem = spec.minPremiumMonthly ?? 0;
  const per = coverPerDollar(b, row.basis, row.insuredAge);
  const coverMin = spec.cover && per > 0 ? spec.cover.min / per : 0;
  return Math.max(minPrem, coverMin);
}

export function profileFor(facts: LifeCaseFacts): Profile {
  if (facts.client.age >= 50) return "later";
  return facts.partner || facts.children.length > 0 ? "family" : "single";
}

function planRows(b: ProvenanceBuilder, facts: LifeCaseFacts, profile: Profile): { prot: PlanRow[]; sav: PlanRow[] } {
  const age = facts.client.age;
  const raMaxAge = b.get<ProductSpec>("core:products.rest-assured-ii").issueAge.max ?? Infinity;
  const eligibleParents = facts.parents.map((p) => parentAge(p, facts.asOfYear));
  const r = (key: string, name: string, product: ProductId, riders: RiderId[], weight: number, why: string, costTier: string, basis: CoverBasis, insuredAge = age): PlanRow =>
    ({ key, name, product, riders, weight, why, costTier, basis, insuredAge });
  const cbdi = (w: number, why: string): PlanRow =>
    r("cashbuilder-di", "Cashbuilder II with disability income rider", "cashbuilder-ii", ["disability-income"], w, why, "$$$", "cashbuilder");
  if (profile === "single") {
    return {
      prot: [
        r("ci", "Critical illness (Life Span Gold)", "life-span-gold", [], 0.5, "At your age a serious illness or injury is far more likely than death. This pays a lump sum to live on while you recover.", "$$", "ci"),
        cbdi(0.5, "The rider pays a monthly income if illness or injury stops you working. The plan locks in lifelong cover while you are young and healthy, and builds cash value."),
      ],
      sav: [
        r("annuity", "Retirement annuity (Destiny, unregistered)", "destiny", [], 0.55, "Starting in your 20s is the biggest money advantage you will ever have. An unregistered plan is easier to reach if life changes.", "you choose", "none"),
        r("endowment", "Endowment plan", "endowment", [], 0.45, "Forced saving for a set date, such as a house deposit or a car, with life cover built in.", "you choose", "endowment"),
      ],
    };
  }
  if (profile === "family") {
    const hasParents = facts.parents.length > 0;
    // Rest Assured II is priced on the eldest parent who can still be issued it (run record D7).
    const oldest = Math.max(...eligibleParents.filter((a) => a <= raMaxAge), -1);
    const funeral = hasParents && oldest >= 0
      ? r("parent-funeral", "Parents' funeral cover (Rest Assured II)", "rest-assured-ii", [], 0.1, "Pays the funeral home directly, with no probate wait.", "$$", "rest-assured", oldest)
      : r("whole-life-small", "Whole life, small", "whole-life", [], 0.1, "Cover that never ends, for the funeral and what you leave.", "$$", "whole-life");
    return {
      prot: [
        r("term", "Term life", "term", [], 0.45, "Replaces your income for the people who depend on you. The most cover for each dollar.", "$", "term"),
        r("ci", "Critical illness (Life Span Gold)", "life-span-gold", [], 0.25, "Keeps the family going while you recover.", "$$", "ci"),
        cbdi(0.2, "Pays a monthly income if illness or injury stops you working, on top of lifelong cover."),
        funeral,
      ],
      sav: [
        r("annuity", "Retirement annuity (Destiny)", "destiny", [], 0.5, "NIS and the SCP stop at $5,500 a month. This tops it up.", "you choose", "none"),
        facts.children.length
          ? r("endowment", "Education endowment", "endowment", [], 0.5, "Saves for each child's degree by the date it is needed, with cover built in.", "you choose", "endowment")
          : r("endowment", "Endowment plan", "endowment", [], 0.5, "Forced saving for a goal with a date.", "you choose", "endowment"),
      ],
    };
  }
  return {
    prot: [
      r("ci", "Critical illness (Life Span Gold)", "life-span-gold", [], 0.35, "Illness is the biggest money risk from 50.", "$$", "ci"),
      r("final-expense", "Final expense (Rest Assured II)", "rest-assured-ii", [], 0.35, "Pays the funeral, with no medical questions, up to age 80 at the start.", "$$", "rest-assured"),
      r("term-debts", "Term life to clear debts", "term", [], 0.3, "Clears what you still owe so it does not pass to the family.", "$", "term"),
    ],
    sav: [
      r("annuity-registered", "Registered annuity (Destiny)", "destiny", [], 0.6, "Up to 25% back in tax while you still earn.", "you choose", "none"),
      r("annuity-unregistered", "Unregistered annuity", "destiny", [], 0.4, "Retirement money you can reach more easily, with no tax-relief limit.", "you choose", "none"),
    ],
  };
}

function fitGroup(b: ProvenanceBuilder, title: InsuranceBudgetGroup["title"], total: number, rows: readonly PlanRow[], note: string): InsuranceBudgetGroup {
  for (const r0 of rows) assertRidersAllowed(b, r0.product, r0.riders);
  const fitRows: FitRow<PlanRow>[] = rows.map((r0) => ({ key: r0, min: minimumFor(b, r0), weight: r0.weight }));
  const fit = fitToMinimums(fitRows, total);
  const ridersOf = (r0: PlanRow): FundedPlan["riders"] =>
    r0.riders.map((id) => { const rs = b.get<RiderSpec>(`core:riders.${id}`); return { id, name: rs.name, underwriting: rs.underwriting }; });
  const funded: FundedPlan[] = fit.funded.map(({ key: r0, monthly, min }) => {
    const spec = b.get<ProductSpec>(`core:products.${r0.product}`);
    const per = coverPerDollar(b, r0.basis, r0.insuredAge);
    const cover = per > 0 ? Math.min(spec.cover?.max ?? Infinity, monthly * per) : null;
    const band: PremiumBand = roughBand(b, monthly, spec.minPremiumMonthly);
    return {
      key: r0.key, name: r0.name, product: r0.product,
      riders: ridersOf(r0),
      monthly, minimumMonthly: min, atMinimum: monthly <= min + 0.5, roughCover: cover, why: r0.why,
      disclosure: spec.disclosure, label: band.label === "the minimum premium" || monthly <= min + 0.5 ? "the minimum premium" : "rough",
    };
  });
  const notYet: NotYetPlan[] = fit.notYet.map(({ key: r0, needs }) => ({ key: r0.key, name: r0.name, product: r0.product, riders: ridersOf(r0), needsMonthly: needs }));
  const laterNote = notYet.length
    ? ` Not yet: ${notYet.map((x) => `${x.name} (needs about $${Math.round(x.needsMonthly).toLocaleString("en-US")} a month)`).join(", ")}. Add it when the budget grows.`
    : "";
  return { title, totalMonthly: Math.max(0, total), funded, notYet, note: note + laterNote };
}

export function computeInsuranceBudget(facts: LifeCaseFacts, budget: HouseholdBudget, buckets: BudgetBuckets): InsuranceBudgetResult {
  const b = new ProvenanceBuilder();
  const profile = profileFor(facts);
  const rows = planRows(b, facts, profile);
  const protTotal = budget.stage === 0 ? 0 : budget.band.recommended;
  const fromBuilder = buckets.retirement + buckets.goals;
  const savTotal = fromBuilder > 1 ? fromBuilder : Math.round(budget.netPay.householdNetMonthly * b.num("core:ff.budget.savingsDefaultShareOfNet"));
  const fmt = (n: number): string => `$${Math.round(n).toLocaleString("en-US")}`;
  const protNote = budget.stage === 0
    ? "Costs are bigger than income, so we hold new protection until the gap is closed."
    : `This is the recommended amount from your safe range (${fmt(budget.band.floor)} to ${fmt(budget.band.ceiling)}).`;
  const savNote = fromBuilder > 1 ? "From your pay-yourself-first plan." : "About 10% of take-home, once your emergency fund is full.";
  b.rule("each plan gets its minimum first; plans that cannot reach their minimum wait as 'not yet'");
  return {
    profile,
    groups: [fitGroup(b, "Protection", protTotal, rows.prot, protNote), fitGroup(b, "Savings plans", savTotal, rows.sav, savNote)],
    note: "A budget, not a quote. Kyron turns it into real prices, and checks what fits your health and your goals.",
    provenance: b.build(),
  };
}
