/**
 * Module 4 — insurance budget (Section 2 §2.3).
 *
 * Protection: the priority ladder (closing-ladder.ts, addendum §11) is the only allocator. The
 * Protection group is the ladder's insurance items, in ladder order, each mapped to its plan
 * (guard 21: item for item and to the cent), capped at the band's recommended figure (guard 23).
 * An item whose minimum did not fit is "not yet" with the amount it needs. No funded plan is ever
 * below its minimum (guards 16 and 22) or outside its product's issue ages (guard 24).
 *
 * Savings plans: split the savings budget across recommended plans, fit each to its minimum, and
 * move plans that do not fit to "not yet" (`fitToMinimums`; unchanged this run, follow-up F-13).
 *
 * The Disability Income Rider is only ever recommended on Cashbuilder II (guard 17).
 */
import { ProvenanceBuilder } from "./provenance.ts";
import type { Provenance } from "./types.ts";
import type { EngineFacts } from "./engine-facts.ts";
import { parentAge, parentSex } from "./life-case-facts.ts";
import type { HouseholdBudget, BudgetBuckets } from "./household-budget.ts";
import type { Ladder, LadderItemSpec } from "./closing-ladder.ts";
import { parentLabel } from "./care-graph.ts";
import type { ProductId, ProductSpec, RiderId, RiderSpec } from "./parameters/tatil-products-2026-10.ts";
import { fitToMinimums, ratePer1000, roughBand, restAssuredCoverFor, type PremiumBand, type FitRow, type RestAssuredInsured } from "./premiums.ts";

export type Profile = "single" | "family" | "later";

/** How a plan's premium buys cover, for the minimum-premium arithmetic. */
type CoverBasis = "term" | "whole-life" | "ci" | "cashbuilder" | "endowment" | "none";

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
  /** Protection only: the ladder items this plan is funded from (guard 21). Empty for savings plans. */
  readonly ladderKeys: readonly string[];
}

export interface NotYetPlan {
  readonly key: string;
  readonly name: string;
  readonly product: ProductId;
  readonly riders: readonly { readonly id: RiderId; readonly name: string; readonly underwriting: string }[];
  /** The minimum a month this plan needs. */
  readonly needsMonthly: number;
  readonly why: string;
  /** Protection only: the ladder item that waits. Empty for savings plans. */
  readonly ladderKeys: readonly string[];
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

/** The closing ladder the Protection group is built from. */
export interface ProtectionLadder {
  readonly ladder: Ladder;
  readonly ladderSpecs: readonly LadderItemSpec[];
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

export function profileFor(facts: EngineFacts): Profile {
  if (facts.client.age >= 50) return "later";
  return facts.partner || facts.children.length > 0 ? "family" : "single";
}

function savingsRows(facts: EngineFacts, profile: Profile): PlanRow[] {
  const age = facts.client.age;
  const r = (key: string, name: string, product: ProductId, weight: number, why: string, basis: CoverBasis): PlanRow =>
    ({ key, name, product, riders: [], weight, why, costTier: "you choose", basis, insuredAge: age });
  if (profile === "single") {
    return [
      r("annuity", "Retirement annuity (Destiny, unregistered)", "destiny", 0.55, "Starting in your 20s is the biggest money advantage you will ever have. An unregistered plan is easier to reach if life changes.", "none"),
      r("endowment", "Endowment plan", "endowment", 0.45, "Forced saving for a set date, such as a house deposit or a car, with life cover built in.", "endowment"),
    ];
  }
  if (profile === "family") {
    return [
      r("annuity", "Retirement annuity (Destiny)", "destiny", 0.5, "NIS and the SCP stop at $5,500 a month. This tops it up.", "none"),
      facts.children.length
        ? r("endowment", "Education endowment", "endowment", 0.5, "Saves for each child's degree by the date it is needed, with cover built in.", "endowment")
        : r("endowment", "Endowment plan", "endowment", 0.5, "Forced saving for a goal with a date.", "endowment"),
    ];
  }
  return [
    r("annuity-registered", "Registered annuity (Destiny)", "destiny", 0.6, "Up to 25% back in tax while you still earn.", "none"),
    r("annuity-unregistered", "Unregistered annuity", "destiny", 0.4, "Retirement money you can reach more easily, with no tax-relief limit.", "none"),
  ];
}

/** A ladder insurance item as a plan (Fix B.6 product mapping). */
interface ProtectionPlan {
  readonly name: string;
  readonly product: ProductId;
  readonly riders: readonly RiderId[];
  readonly why: string;
  /** Rough cover a monthly amount buys. */
  readonly cover: (monthly: number) => number;
}

const fmt = (n: number): string => `$${Math.round(n).toLocaleString("en-US")}`;

function protectionPlanFor(b: ProvenanceBuilder, facts: EngineFacts, profile: Profile, item: LadderItemSpec): ProtectionPlan {
  const { key } = item;
  const age = facts.client.age;
  const capped = (product: ProductId, cover: number): number => Math.min(b.get<ProductSpec>(`core:products.${product}`).cover?.max ?? Infinity, cover);
  const at = (basis: CoverBasis, product: ProductId) => (monthly: number): number => capped(product, monthly * coverPerDollar(b, basis, age));
  const ra = (insured: RestAssuredInsured) => (monthly: number): number => capped("rest-assured-ii", restAssuredCoverFor(b, insured, monthly));
  // Life to the ruin level is term, or whole life once term cannot be issued at the client's rated age (guard 24).
  const life = item.product === "whole-life" ? { product: "whole-life" as const, name: "Whole life" } : { product: "term" as const, name: "Term life" };
  if (key === "life-ruin") {
    const why = profile === "later" ? "Clears what you still owe so it does not pass to the family."
      : profile === "single" ? "Clears what you owe and pays your funeral, so nothing falls on your family. The most cover for each dollar."
      : "Replaces your income for the people who depend on you. The most cover for each dollar.";
    return { name: profile === "later" ? `${life.name} to clear debts` : life.name, product: life.product, riders: [], why, cover: at(life.product, life.product) };
  }
  const goalId = key.startsWith("loan-cover:") ? key.slice("loan-cover:".length) : null;
  const goal = facts.goals.find((g) => g.goalId === goalId);
  if (goal) {
    const loan = item.product === "whole-life" ? { product: "whole-life" as const, name: "Whole life" } : { product: "term" as const, name: "Term life" };
    return { name: `${loan.name} for your ${goal.kind === "home" ? "home" : "car"} loan`, product: loan.product, riders: [],
      why: `Your lender will want this from year ${goal.years}. It costs about ${fmt(item.min)} a month if you start now.`, cover: at(loan.product, loan.product) };
  }
  // Section 3 §7.5 (closes F-16): cover for a debt someone co-signed, so it does not fall on them.
  const cosigned = key.startsWith("cosigned-cover:") ? facts.debts.items[Number(key.slice("cosigned-cover:".length))] : undefined;
  if (cosigned) {
    const loan = item.product === "whole-life" ? { product: "whole-life" as const, name: "Whole life" } : { product: "term" as const, name: "Term life" };
    const who = cosigned.cosignerName ?? "The person who co-signed";
    return { name: `${loan.name} for the ${cosigned.label.toLowerCase()} ${cosigned.cosignerName ?? "someone"} co-signed`, product: loan.product, riders: [],
      why: `${who} would owe the ${fmt(cosigned.balance)} if you died. This clears it. It costs about ${fmt(item.min)} a month.`, cover: at(loan.product, loan.product) };
  }
  if (key === "critical-illness") {
    const why = profile === "single" ? "At your age a serious illness or injury is far more likely than death. This pays a lump sum to live on while you recover."
      : profile === "family" ? "Keeps the family going while you recover." : "Illness is the biggest money risk from 50.";
    return { name: "Critical illness (Life Span Gold)", product: "life-span-gold", riders: [], why, cover: at("ci", "life-span-gold") };
  }
  if (key === "disability-income") {
    const why = profile === "single"
      ? "The rider pays a monthly income if illness or injury stops you working. The plan locks in lifelong cover while you are young and healthy, and builds cash value."
      : "Pays a monthly income if illness or injury stops you working, on top of lifelong cover.";
    return { name: "Cashbuilder II with disability income rider", product: "cashbuilder-ii", riders: ["disability-income"], why, cover: at("cashbuilder", "cashbuilder-ii") };
  }
  if (key === "own-final-expense") {
    return { name: "Final expense (Rest Assured II)", product: "rest-assured-ii", riders: [], why: "Pays the funeral, with no medical questions, up to age 80 at the start.",
      cover: ra({ age, sex: facts.client.sex, who: "You" }) };
  }
  const parentId = key.startsWith("parent-funeral:") ? key.slice("parent-funeral:".length) : null;
  const p = facts.parents.find((x) => x.personId === parentId);
  if (p) {
    return { name: `${parentLabel(p)}'s funeral cover (Rest Assured II)`, product: "rest-assured-ii", riders: [], why: "Pays the funeral home directly, with no probate wait.",
      cover: ra({ age: parentAge(p, facts.asOfYear), sex: parentSex(p), who: parentLabel(p) }) };
  }
  throw new Error(`No protection plan maps to the ladder item "${key}"`);
}

const ridersOf = (b: ProvenanceBuilder, riders: readonly RiderId[]): FundedPlan["riders"] =>
  riders.map((id) => { const rs = b.get<RiderSpec>(`core:riders.${id}`); return { id, name: rs.name, underwriting: rs.underwriting }; });

const notYetNote = (notYet: readonly NotYetPlan[]): string => notYet.length
  ? ` Not yet: ${notYet.map((x) => `${x.name} (needs about $${Math.round(x.needsMonthly).toLocaleString("en-US")} a month)`).join(", ")}. Add it when the budget grows.`
  : "";

/** The Protection group: the ladder's insurance items, in ladder order. "Life cover beyond the ruin level" adds to the term plan. */
function protectionGroup(b: ProvenanceBuilder, facts: EngineFacts, profile: Profile, from: ProtectionLadder, note: string): InsuranceBudgetGroup {
  type Draft = { plan: ProtectionPlan; key: string; monthly: number; min: number; keys: string[] };
  const drafts: Draft[] = [];
  const notYet: NotYetPlan[] = [];
  const wait = (s: LadderItemSpec): void => {
    const plan = protectionPlanFor(b, facts, profile, s);
    assertRidersAllowed(b, plan.product, plan.riders);
    notYet.push({ key: s.key, name: plan.name, product: plan.product, riders: ridersOf(b, plan.riders), needsMonthly: s.min, why: plan.why, ladderKeys: [s.key] });
  };
  if (from.ladder.underwater) {
    for (const s of from.ladderSpecs) if (s.insurance && s.min > 0) wait(s);
  }
  for (const it of from.ladder.items) {
    if (!it.insurance) continue;
    if (it.addsTo !== undefined) {
      if (it.allocated <= 0) continue;
      const host = drafts.find((d) => d.keys.includes(it.addsTo!));
      if (!host) throw new Error(`Ladder item "${it.key}" is funded but the plan it adds to ("${it.addsTo}") is not`);
      host.monthly += it.allocated;
      host.keys.push(it.key);
      continue;
    }
    if (it.allocated > 0) {
      const plan = protectionPlanFor(b, facts, profile, it);
      assertRidersAllowed(b, plan.product, plan.riders);
      drafts.push({ plan, key: it.key, monthly: it.allocated, min: it.min, keys: [it.key] });
    } else if (it.notYet) {
      wait(it);
    }
  }
  const funded: FundedPlan[] = drafts.map(({ plan, key, monthly, min, keys }) => {
    const spec = b.get<ProductSpec>(`core:products.${plan.product}`);
    const band: PremiumBand = roughBand(b, monthly, spec.minPremiumMonthly);
    const atMinimum = monthly <= min + 0.5;
    return {
      key, name: plan.name, product: plan.product, riders: ridersOf(b, plan.riders),
      monthly, minimumMonthly: min, atMinimum, roughCover: plan.cover(monthly), why: plan.why,
      disclosure: spec.disclosure, label: band.label === "the minimum premium" || atMinimum ? "the minimum premium" : "rough",
      ladderKeys: keys,
    };
  });
  const total = funded.reduce((a, p) => a + p.monthly, 0);
  return { title: "Protection", totalMonthly: total, funded, notYet, note: note + notYetNote(notYet) };
}

function fitGroup(b: ProvenanceBuilder, title: InsuranceBudgetGroup["title"], total: number, rows: readonly PlanRow[], note: string): InsuranceBudgetGroup {
  for (const r0 of rows) assertRidersAllowed(b, r0.product, r0.riders);
  const fitRows: FitRow<PlanRow>[] = rows.map((r0) => ({ key: r0, min: minimumFor(b, r0), weight: r0.weight }));
  const fit = fitToMinimums(fitRows, total);
  const funded: FundedPlan[] = fit.funded.map(({ key: r0, monthly, min }) => {
    const spec = b.get<ProductSpec>(`core:products.${r0.product}`);
    const per = coverPerDollar(b, r0.basis, r0.insuredAge);
    const cover = per > 0 ? Math.min(spec.cover?.max ?? Infinity, monthly * per) : null;
    const band: PremiumBand = roughBand(b, monthly, spec.minPremiumMonthly);
    return {
      key: r0.key, name: r0.name, product: r0.product,
      riders: ridersOf(b, r0.riders),
      monthly, minimumMonthly: min, atMinimum: monthly <= min + 0.5, roughCover: cover, why: r0.why,
      disclosure: spec.disclosure, label: band.label === "the minimum premium" || monthly <= min + 0.5 ? "the minimum premium" : "rough",
      ladderKeys: [],
    };
  });
  const notYet: NotYetPlan[] = fit.notYet.map(({ key: r0, needs }) => ({ key: r0.key, name: r0.name, product: r0.product, riders: ridersOf(b, r0.riders), needsMonthly: needs, why: r0.why, ladderKeys: [] }));
  return { title, totalMonthly: Math.max(0, total), funded, notYet, note: note + notYetNote(notYet) };
}

export function computeInsuranceBudget(facts: EngineFacts, budget: HouseholdBudget, buckets: BudgetBuckets, from: ProtectionLadder): InsuranceBudgetResult {
  const b = new ProvenanceBuilder();
  const profile = profileFor(facts);
  const fromBuilder = buckets.retirement + buckets.goals;
  const savTotal = fromBuilder > 1 ? fromBuilder : Math.round(budget.netPay.householdNetMonthly * b.num("core:ff.budget.savingsDefaultShareOfNet"));
  const protNote = budget.stage === 0
    ? "Costs are bigger than income, so we hold new protection until the gap is closed."
    : from.ladder.insuranceCapMonthly === budget.band.recommended
      ? `Your safe range is ${fmt(budget.band.floor)} to ${fmt(budget.band.ceiling)}. We plan to ${fmt(budget.band.recommended)}, the recommended amount, and fund plans in priority order.`
      : `Your safe range is ${fmt(budget.band.floor)} to ${fmt(budget.band.ceiling)}. We plan to ${fmt(from.ladder.insuranceCapMonthly)}, the amount you chose, and fund plans in priority order.`;
  const savNote = fromBuilder > 1 ? "From your pay-yourself-first plan." : "About 10% of take-home, once your emergency fund is full.";
  b.rule("protection follows the priority ladder: each insurance plan gets its minimum or waits as 'not yet', inside the recommended figure");
  b.rule("each savings plan gets its minimum first; plans that cannot reach their minimum wait as 'not yet'");
  return {
    profile,
    groups: [protectionGroup(b, facts, profile, from, protNote), fitGroup(b, "Savings plans", savTotal, savingsRows(facts, profile), savNote)],
    note: "A budget, not a quote. Kyron turns it into real prices, and checks what fits your health and your goals.",
    provenance: b.build(),
  };
}
