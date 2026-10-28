/**
 * Module 8 — the closing comparison (closing engine brief and addendum §11–15; engine parts only,
 * the reveal UI is Phase 2). A presentation layer over engines that already ran: it never recomputes
 * an upstream number (guard 1) and throws `ClosingInputError` when an upstream result is missing.
 *
 * Four scenarios in two states (today = reveal layer 4, with the plan = layer 5); the five reveal
 * layers; deterministic slot-template sentences (guard 4); the Floor / Recommended / Ceiling bands;
 * the life basket bounded by the stage ceiling (guard 3); parent funeral cover (§5, guards 6–7);
 * the priority ladder (§11); the gaps the scope statement records (§6).
 */
import { ProvenanceBuilder } from "./provenance.ts";
import type { Provenance } from "./types.ts";
import { ClosingInputError } from "./errors.ts";
import type { LifeCaseFacts, ParentFacts } from "./life-case-facts.ts";
import { parentAge, parentSex } from "./life-case-facts.ts";
import type { HouseholdBudget } from "./household-budget.ts";
import type { DebtsResult } from "./debts.ts";
import { parentLabel, type CareGraphResult } from "./care-graph.ts";
import { survivorCashflow, type DeathNeedResult, type Obligation, type SurvivorCashflow } from "./death-need.ts";
import type { RetirementIncome } from "./retirement-income.ts";
import type { GoalsResult } from "./goals.ts";
import { ratePer1000, roughBand, restAssuredEligible, restAssuredPremium, restAssuredRatedAge, canIssue, ratedAge, premiumFor, type PremiumBand } from "./premiums.ts";
import { allocateLadder, defaultOrder, type Ladder, type LadderItemSpec } from "./closing-ladder.ts";
import { minimumFor, profileFor } from "./insurance-budget.ts";
import type { ScopeGap } from "./scope.ts";
import type { ProductId, ProductSpec } from "./parameters/tatil-products-2026-10.ts";
import { ASSUMPTION_SET_ID } from "./parameters/fact-finder-2026-10.ts";

export type Package = "essential" | "recommended" | "full";
export type RevealLayer = 1 | 2 | 3 | 4 | 5;

export const LAYER_NAMES: Readonly<Record<RevealLayer, string>> = {
  1: "What they need", 2: "Partner's income", 3: "NIS survivors", 4: "Cover in force", 5: "Your plan",
};

export const UNKNOWN_SENTENCE = "We did not capture this. It is not counted either way.";

export interface ClosingContext {
  readonly facts?: LifeCaseFacts;
  readonly budget?: HouseholdBudget;
  readonly debts?: DebtsResult;
  readonly careGraph?: CareGraphResult;
  readonly deathNeed?: DeathNeedResult;
  readonly retirement?: RetirementIncome;
  readonly goals?: GoalsResult;
}

export interface ClosingOptions {
  /** Default "recommended". Ignored when `budgetMonthly` is set. */
  readonly package?: Package;
  /** A monthly amount the client chose instead of a package. */
  readonly budgetMonthly?: number | null;
  /** Ladder order (Option B); see `requestReorder`. */
  readonly ladderOrder?: readonly string[];
}

export interface ScenarioOutcome {
  readonly lumpAvailable: number;
  readonly monthlyAvailable: number;
  readonly monthsUntilShortfall: number | null;
  readonly obligationsMet: readonly string[];
  readonly obligationsFailed: readonly string[];
  readonly sentences: readonly string[];
  /** What was not captured. Rendered with the unknown sentence, never as $0 (guard 2). */
  readonly unknowns: readonly string[];
}

export interface ObligationLine {
  readonly key: string;
  readonly label: string;
  readonly kind: Obligation["kind"] | "care-offset";
  readonly tier: Obligation["tier"];
  readonly amount: number;
  readonly paid: number;
  readonly met: boolean;
  readonly sentence: string;
  readonly note: string | null;
}

export interface DeathLayer {
  readonly layer: RevealLayer;
  readonly name: string;
  readonly need: number;
  readonly lines: readonly ObligationLine[];
  readonly notes: readonly string[];
  readonly survivor: SurvivorCashflow;
  readonly outcome: ScenarioOutcome;
}

export interface BasketItem {
  readonly product: "term" | "whole-life";
  readonly cover: number;
  readonly premiumMonthly: number;
  readonly band: PremiumBand;
}

export interface LifeBasket {
  readonly cover: number;
  readonly items: readonly BasketItem[];
  /** Sum of the items' rough mid figures. */
  readonly totalMonthly: number;
  /** Sum of the items' band tops; never above the stage ceiling (guard 3). */
  readonly totalHighMonthly: number;
  readonly partial: boolean;
  readonly permanentDropped: boolean;
  /** Obligations this cover does not reach. */
  readonly notCovered: readonly string[];
  /** No plan fits under the ceiling at its minimum. */
  readonly notYet: boolean;
}

export interface CloseBand {
  readonly name: "Floor" | "Recommended" | "Ceiling";
  readonly monthly: number;
  readonly cover: number;
  readonly covers: readonly string[];
  readonly doesNotCover: readonly string[];
}

export interface ParentFuneralCover {
  readonly personId: string;
  readonly who: string;
  readonly age: number;
  /** Rest Assured II's rated age: age next birthday. Eligibility and price use it. */
  readonly ratedAge: number;
  readonly costToday: number;
  /** Cost at the end of the parent's care stream, inflated at the care basket rate. */
  readonly costAtEnd: number;
  readonly yearsToEnd: number;
  /** NIS funeral grant applied: only where 25+ contributions are affirmatively captured (guard 7). */
  readonly nisGrant: number;
  readonly nisGrantFlag: string | null;
  readonly cover: number;
  readonly product: "rest-assured-ii" | null;
  readonly premium: PremiumBand | null;
  /** Premium a month on the product minimum cover ($30,000): the ladder item's minimum. 0 when not eligible. */
  readonly minimumMonthly: number;
  /** Premium a month on `cover`: the ladder item's full amount. 0 when not eligible. */
  readonly fullMonthly: number;
  /** Set when the parent's sex cannot be told from the relationship (priced on the male rate). */
  readonly sexFlag: string | null;
  /** Rest Assured II grading, printed wherever it is recommended (guard 6). */
  readonly disclosure: string | null;
  readonly alternative: { readonly product: "platinum-edge"; readonly deposit: { readonly min: number; readonly max: number }; readonly disclosure: string | null };
  readonly sentence: string;
  readonly ownership: string;
}

export interface ScenarioPair { readonly today: ScenarioOutcome; readonly plan: ScenarioOutcome }

export interface ClosingComparison {
  readonly assumptionSetId: string;
  readonly stage: HouseholdBudget["stage"];
  readonly underwater: boolean;
  readonly packages: Readonly<Record<Package, number>>;
  readonly chosen: { readonly package: Package | null; readonly cover: number; readonly basket: LifeBasket };
  readonly layers: readonly DeathLayer[];
  readonly scenarios: {
    readonly death: ScenarioPair;
    readonly criticalIllness: ScenarioPair & { readonly coverSuggested: number };
    readonly liveLong: ScenarioPair;
    readonly legacy: ScenarioPair;
  };
  readonly bands: readonly CloseBand[];
  readonly parentFuneral: readonly ParentFuneralCover[];
  readonly ladder: Ladder;
  readonly ladderSpecs: readonly LadderItemSpec[];
  readonly gaps: readonly ScopeGap[];
  readonly crossCheck: { readonly stack: number; readonly tatilStandard: number };
  readonly annuity: {
    readonly mode: RetirementIncome["routing"]["mode"];
    readonly controls: { readonly destinyGuaranteedYears: readonly number[]; readonly destinySpousalShares: readonly number[]; readonly spiaSpousalShares: readonly number[]; readonly destinyLumpAtVesting: readonly number[] };
    readonly notes: readonly string[];
  };
  readonly provenance: Provenance;
}

/** Thousands separators without ICU, so sentences are byte-identical everywhere (guard 4). */
export function money(n: number): string {
  const s = Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (n < 0 ? "-$" : "$") + s;
}

function requireUpstream(ctx: ClosingContext): Required<ClosingContext> {
  for (const k of ["facts", "budget", "debts", "careGraph", "deathNeed", "retirement", "goals"] as const) {
    if (!ctx[k]) throw new ClosingInputError(`The closing comparison needs the ${k} result; that engine did not run.`);
  }
  return ctx as Required<ClosingContext>;
}

export function computeClosing(ctxIn: ClosingContext, options: ClosingOptions = {}): ClosingComparison {
  const ctx = requireUpstream(ctxIn);
  const { facts, budget, debts, careGraph, deathNeed, retirement, goals } = ctx;
  const b = new ProvenanceBuilder();
  for (const p of [budget.provenance, careGraph.provenance, deathNeed.provenance, retirement.provenance]) b.merge(p);
  const age = facts.client.age;
  const TR = ratePer1000(b, "term", age);
  const WL = ratePer1000(b, "whole-life", age);
  const term = b.get<ProductSpec>("core:products.term");
  const whole = b.get<ProductSpec>("core:products.whole-life");
  const minCover = b.num("core:ff.closing.minimumCoverOnPlan");
  const tol = b.num("core:ff.deathNeed.metTolerance");
  const uw = deathNeed.underwritingCeiling;
  const w = facts.wishes;
  const floorCover = (v: number): number => (v > 0 ? Math.max(minCover, v) : 0);
  const permOf = (full: boolean): number => w.funeral + (full ? w.legacy : 0);
  const coverFor = (prem: number, full: boolean): number => {
    const pm = permOf(full);
    const permP = pm * WL / 1000;
    if (prem <= permP) return prem / WL * 1000;
    return pm + (TR > 0 ? (prem - permP) / TR * 1000 : 0);
  };

  /* -------------------------------------------------------------- reveal layers */
  const parentsOffset = facts.parents.filter((p) => p.careTier > 0 && !careGraph.goals.some((g) => g.key === `${p.personId}:care`));
  const careGoal = new Map(careGraph.goals.map((g) => [g.key, g]));
  const pronoun = (p: ParentFacts): string => (/mother|grandmother/.test(p.relationship) ? "Her" : /father|grandfather/.test(p.relationship) ? "His" : "Their");

  const lineSentence = (o: Obligation, paid: number, met: boolean, sv: SurvivorCashflow): string => {
    switch (o.key) {
      case "funeral": return met ? "Your funeral is paid for. The funeral home can be paid directly, without waiting on probate." : "Your funeral falls on the family.";
      case "medical": return met ? "Final medical bills are paid." : "Final medical bills fall on the family.";
      case "debt": return met ? "The expensive debt is cleared." : `The ${money(o.amount)} of expensive debt stays with the family.`;
      case "mortgage": return met ? "The mortgage clears. The family keeps the house." : `The mortgage of ${money(o.amount)} stays.`;
      case "income": return met || sv.monthOfShortfall === null ? "The household has enough to live on until the youngest is 19." : `The household money runs out in month ${sv.monthOfShortfall}.`;
      case "legacy": return met ? `${money(o.amount)} is left behind, outside your estate.` : "Nothing is left behind.";
    }
    if (o.kind === "care" || o.kind === "edu") {
      const what = o.kind === "care" ? "care" : "degree";
      if (met) return `${o.who}'s ${what} continues.`;
      const dur = careGoal.get(o.key)?.durationYears ?? 0;
      const month = Math.floor(o.amount > 0 ? paid / o.amount * dur * 12 : 0) + 1;
      return `${o.who}'s ${what} stops in month ${month}.`;
    }
    return met ? `${o.label} is funded.` : `${o.label} is not funded.`;
  };

  const layerAt = (L: RevealLayer, cover: number): DeathLayer => {
    const usePartner = L >= 2;
    const useNis = L >= 3;
    const sv0 = survivorCashflow(b, facts, budget.livingMonthly, usePartner, useNis, 0);
    let lump = 0;
    if (L >= 4) lump += deathNeed.cover.knownLife + facts.budget.savings;
    if (L >= 5) lump += Math.min(uw, cover);
    let left = lump;
    const paidLines = deathNeed.obligations.map((o) => {
      const amount = o.key === "income" ? sv0.pvGap : o.amount;
      const paid = Math.min(left, amount);
      left -= paid;
      return { o: { ...o, amount }, paid, met: amount <= tol || paid >= amount - tol };
    });
    const incPaid = paidLines.find((x) => x.o.key === "income")?.paid ?? 0;
    const sv = survivorCashflow(b, facts, budget.livingMonthly, usePartner, useNis, incPaid);
    const lines: ObligationLine[] = paidLines.map(({ o, paid, met }) => ({
      key: o.key, label: o.label, kind: o.kind, tier: o.tier, amount: o.amount, paid, met, sentence: lineSentence(o, paid, met, sv), note: null,
    }));
    for (const p of parentsOffset) {
      const insertAt = Math.min(5, lines.length);
      lines.splice(insertAt, 0, {
        key: `${p.personId}:care`, label: `${parentLabel(p)}'s care`, kind: "care-offset", tier: "recommended", amount: 0, paid: 0, met: true,
        sentence: `${parentLabel(p)}'s care continues.`, note: `${pronoun(p)} Senior Citizens' Pension covers it.`,
      });
    }
    const notes: string[] = [];
    const partner = facts.partner;
    const spouseName = partner?.firstName ?? "Your partner";
    if (L >= 2) notes.push(partner ? `${spouseName}'s income: ${money(partner.incomeMonthly)} a month, to age ${b.num("core:ff.deathNeed.partnerWorksToAge")}.` : "No partner income.");
    if (L >= 3) notes.push(facts.client.nisPaying ? `NIS survivors' benefit: ${money(b.num("core:ff.offsets.nisSurvivorSpouseMonthly"))} a month to your spouse, and ${money(b.num("core:ff.offsets.nisSurvivorChildMonthly"))} a month for each child to ${b.num("core:ff.offsets.nisSurvivorChildToAge")}.` : "No NIS record, so no survivors' benefit.");
    const unknowns = L >= 4 ? deathNeed.cover.unknownLabels : [];
    if (L >= 4) {
      notes.push(`Savings of ${money(facts.budget.savings)} are counted.`);
      for (const u of unknowns) notes.push(`${u}: ${UNKNOWN_SENTENCE}`);
    }
    if (L >= 5) notes.push(`Your plan adds ${money(Math.min(uw, cover))} of cover.`);

    const mort = lines.find((l) => l.key === "mortgage");
    const inc = lines.find((l) => l.key === "income");
    const head: string[] = [`Your family receives ${money(lump)}.`];
    if (mort) head.push(mort.met ? "The mortgage clears." : `The mortgage of ${money(mort.amount)} stays.`);
    if (L >= 5 && partner && inc?.met) head.push(`${spouseName}'s income is replaced to age ${partner.age + b.num("core:ff.deathNeed.survivorYears")}.`);
    else if (sv.monthOfShortfall !== null && !inc?.met) head.push(`The money runs out in month ${sv.monthOfShortfall}.`);
    const sentences = [...head, ...lines.map((l) => l.sentence), ...(unknowns.length ? [UNKNOWN_SENTENCE] : [])];
    const r0 = sv.rows[0];
    return {
      layer: L, name: LAYER_NAMES[L], need: lines.reduce((a, l) => a + l.amount, 0), lines, notes, survivor: sv,
      outcome: {
        lumpAvailable: lump,
        monthlyAvailable: r0 ? (r0.partnerIncome + r0.nisSurvivors) / 12 : 0,
        monthsUntilShortfall: sv.monthOfShortfall,
        obligationsMet: lines.filter((l) => l.met).map((l) => l.label),
        obligationsFailed: lines.filter((l) => !l.met).map((l) => l.label),
        sentences,
        unknowns,
      },
    };
  };

  /* -------------------------------------------------------------- packages and basket */
  const shares = b.get<{ floor: number; recommended: number; ceiling: number }>("core:ff.closing.bandShares");
  const t = deathNeed.tiers;
  const packages: Record<Package, number> = {
    essential: floorCover(t.essential),
    recommended: floorCover(Math.min(uw, t.recommended, coverFor(budget.band.recommended, false))),
    full: floorCover(t.full),
  };
  const usingBudget = options.budgetMonthly !== undefined && options.budgetMonthly !== null;
  const pkg: Package = options.package ?? "recommended";
  const wanted = usingBudget ? floorCover(Math.min(uw, coverFor(options.budgetMonthly as number, false))) : packages[pkg];
  const notCoveredAt = (cover: number): string[] => layerAt(5, cover).lines.filter((l) => !l.met).map((l) => l.label);

  /* -------------------------------------------------------------- bands */
  const bands: CloseBand[] = (["floor", "recommended", "ceiling"] as const).map((k) => {
    const monthly = budget.ceilingMonthly * shares[k];
    const cover = monthly > 0 ? floorCover(Math.min(uw, coverFor(monthly, false))) : 0;
    const L5 = layerAt(5, cover);
    return {
      name: k === "floor" ? "Floor" : k === "recommended" ? "Recommended" : "Ceiling",
      monthly, cover,
      covers: L5.lines.filter((l) => l.met).map((l) => l.label),
      doesNotCover: L5.lines.filter((l) => !l.met).map((l) => l.label),
    };
  });

  /* -------------------------------------------------------------- critical illness */
  const lsg = b.get<ProductSpec>("core:products.life-span-gold");
  const ciNeed = Math.max(0, facts.client.grossMonthly * 12 * b.num("core:ff.closing.ciIncomeYears") - deathNeed.cover.knownCI);
  const ciCover = ciNeed > 0 ? Math.max(lsg.cover!.min, Math.min(ciNeed, lsg.cover!.max ?? ciNeed)) : 0;
  const needs = budget.needsMonthly;
  const ciUnknown = facts.existingCover.filter((c) => c.kind === "ci" && c.amount === null).map((c) => c.label);
  const ciOutcome = (lump: number, planSentence: string | null): ScenarioOutcome => {
    const cash = facts.budget.savings + lump;
    const met = cash >= ciNeed + deathNeed.cover.knownCI || ciNeed <= 0;
    const s: string[] = [];
    if (planSentence) s.push(planSentence);
    else s.push(deathNeed.cover.knownCI > 0 ? `Your critical illness cover pays ${money(deathNeed.cover.knownCI)}.` : "No critical illness cover.");
    s.push(`Recovery is paid from ${money(cash)}, about ${(needs > 0 ? cash / needs : 0).toFixed(1)} months of costs.`);
    if (ciUnknown.length) s.push(UNKNOWN_SENTENCE);
    return {
      lumpAvailable: lump, monthlyAvailable: 0, monthsUntilShortfall: needs > 0 ? Math.floor(cash / needs) + 1 : null,
      obligationsMet: met ? ["Income while you recover"] : [], obligationsFailed: met ? [] : ["Income while you recover"],
      sentences: s, unknowns: ciUnknown,
    };
  };
  const criticalIllness = {
    coverSuggested: ciCover,
    today: ciOutcome(deathNeed.cover.knownCI, null),
    plan: ciOutcome(deathNeed.cover.knownCI + ciCover, ciCover > 0 ? `Life Span Gold pays ${money(ciCover)} as one lump sum on diagnosis, to use as you need while you recover.` : "Your cover in force already meets the critical illness need."),
  };

  /* -------------------------------------------------------------- live long */
  const ri = retirement;
  const sources = ri.workPension.monthly > 0
    ? (ri.workPension.kind === "public-service" ? "NIS, the Senior Citizens' Pension and your public service pension" : "NIS, the Senior Citizens' Pension and your work pension")
    : "NIS and the Senior Citizens' Pension";
  const longToday: ScenarioOutcome = {
    lumpAvailable: 0, monthlyAvailable: ri.floorMonthly, monthsUntilShortfall: ri.gapMonthly > 0 ? 1 : null,
    obligationsMet: ri.gapMonthly > 0 ? [] : ["Income for life"], obligationsFailed: ri.gapMonthly > 0 ? ["Income for life"] : [],
    sentences: [ri.gapMonthly > 0
      ? `At ${ri.retireAge} you can count on ${money(ri.floorMonthly)} a month from ${sources}. You want ${money(ri.wantedMonthly)}. The gap is ${money(ri.gapMonthly)} a month, for life.`
      : `At ${ri.retireAge} you can count on ${money(ri.floorMonthly)} a month from ${sources}. You want ${money(ri.wantedMonthly)}. Your pensions cover it.`],
    unknowns: [],
  };
  const explorer = ri.stress.find((s) => s.vehicleId === "destiny-explorer");
  const longPlan: ScenarioOutcome = {
    lumpAvailable: 0, monthlyAvailable: ri.floorMonthly + ri.gapMonthly, monthsUntilShortfall: null,
    obligationsMet: ["Income for life"], obligationsFailed: [],
    sentences: ri.gapMonthly > 0
      ? [
        `Saving ${money(ri.destinyMonthly)} a month into Destiny ${ri.routing.mode === "registered" ? "Registered" : "Unregistered"} closes the gap, and a life annuity at retirement pays it for as long as you live.`,
        ...(ri.reliefAnnual > 0 ? [`About ${money(ri.reliefAnnual)} a year comes back in tax.`] : []),
        ...(explorer ? [explorer.sentence] : []),
      ]
      : ["No extra retirement saving is needed for the income you want."],
    unknowns: [],
  };

  /* -------------------------------------------------------------- parent funeral cover (§5) */
  const ra = b.get<ProductSpec>("core:products.rest-assured-ii");
  const pe = b.get<ProductSpec>("core:products.platinum-edge");
  const f = b.num("core:ff.rates.careBasket");
  const H = b.num("core:ff.careGraph.horizonYears");
  const careTo = b.num("core:ff.careGraph.careToParentAge");
  const grant = b.num("core:ff.offsets.nisFuneralGrant");
  b.use("core:ff.offsets.nisFuneralGrantContributions");
  b.use("core:ff.offsets.probateFreePayment");
  const parentFuneral: ParentFuneralCover[] = facts.parents.map((p) => {
    const pa = parentAge(p, facts.asOfYear);
    const yearsToEnd = Math.max(0, Math.min(H, careTo - pa));
    const costToday = b.num("core:ff.closing.parentFuneralCost");
    const costAtEnd = costToday * Math.pow(1 + f, yearsToEnd);
    const g = p.nisContributions === "yes" ? grant : 0;
    const flag = p.nisContributions === "unknown" ? `${parentLabel(p)}'s NIS record is not known, so no funeral grant is counted. Ask whether they paid 25 or more contributions.` : null;
    const eligible = restAssuredEligible(b, pa);
    if (!eligible) b.rule(`${parentLabel(p)}: rated age ${restAssuredRatedAge(pa)} is past Rest Assured II's issue ages, so there is no funeral cover item`);
    const sex = parentSex(p);
    const insured = { age: pa, sex, who: parentLabel(p) };
    const cover = eligible ? Math.min(ra.cover!.max ?? Infinity, Math.max(ra.cover!.min, costAtEnd - g)) : 0;
    const est = eligible ? restAssuredPremium(b, insured, cover) : 0;
    return {
      personId: p.personId, who: parentLabel(p), age: pa, ratedAge: restAssuredRatedAge(pa), costToday, costAtEnd, yearsToEnd, nisGrant: g, nisGrantFlag: flag,
      cover, product: eligible ? "rest-assured-ii" : null, premium: eligible ? roughBand(b, est, ra.minPremiumMonthly) : null,
      minimumMonthly: eligible ? restAssuredPremium(b, insured, ra.cover!.min) : 0,
      fullMonthly: est,
      sexFlag: eligible && sex === null ? `${parentLabel(p)}: the relationship does not tell us their sex, so Rest Assured II is priced on the male rate (the higher one).` : null,
      disclosure: eligible ? ra.disclosure : null,
      alternative: { product: "platinum-edge", deposit: { min: pe.singleDeposit!.min, max: pe.singleDeposit!.max }, disclosure: pe.disclosure },
      sentence: `${parentLabel(p)}'s funeral is covered. The funeral home can be paid directly, without waiting on probate.`,
      ownership: "You own the policy on your parent's life, pay for it, and receive the money.",
    };
  });

  /* -------------------------------------------------------------- ladder (§11) */
  // Change 3 (Kyron, Decision 7 = A, 27 Oct 2026): ruin-level life cover only when someone depends on the client.
  const dependants = facts.partner !== null || facts.children.length > 0 || careGraph.goals.some((g) => g.kind === "care" && g.presentValue > 0);
  if (!dependants) b.rule("no partner, no children, no parent care paid: no ruin-level life cover");
  // Change 5: every plan is issued on rated age. Term stops at rated age 65; past it the ruin-level plan is whole life.
  // Life to the ruin level is one plan; cover beyond the ruin level adds to it. Each cover is at least $150,000 (floorCover).
  const lifeProduct: "term" | "whole-life" = canIssue(b, "term", age) ? "term" : "whole-life";
  if (dependants && lifeProduct === "whole-life") b.rule(`term life cannot be issued at rated age ${ratedAge(age)}, so the ruin-level life plan is whole life`);
  const lifeSpec = lifeProduct === "term" ? term : whole;
  const lifeRate = lifeProduct === "term" ? TR : WL;
  const lifePremium = (cover: number): number => (cover > 0 ? Math.max(lifeSpec.minPremiumMonthly ?? 0, cover * lifeRate / 1000) : 0);
  const essPrem = lifePremium(packages.essential);
  const recPrem = lifePremium(packages.recommended);
  const issuable = (id: ProductId, insuredAge: number, what: string): boolean => {
    const ok = canIssue(b, id, insuredAge);
    if (!ok) b.rule(`${what}: ${id} cannot be issued at rated age ${ratedAge(insuredAge)}, so there is no ladder item`);
    return ok;
  };
  const ciRate = ratePer1000(b, "ci", age);
  const ciMin = Math.max(lsg.minPremiumMonthly ?? 0, lsg.cover!.min * ciRate / 1000);
  const ciFull = Math.max(ciMin, ciCover * ciRate / 1000);
  const build = b.num("core:ff.budget.bufferBuildMonths");
  const oneMonth = Math.max(0, needs * b.num("core:ff.budget.bufferPreconditionMonths") - facts.budget.savings) / build;
  const threeMonths = Math.max(0, needs * b.num("core:ff.budget.bufferTargetMonths") - facts.budget.savings) / build;
  const near = b.num("core:ff.closing.nearDatedYears");
  const futureGoals = careGraph.goals.filter((g) => !g.current);
  const sum = (xs: readonly number[]): number => xs.reduce((a, x) => a + x, 0);
  const token = ri.routing.mode === "registered" && ri.gapMonthly > 0 ? b.get<ProductSpec>("core:products.destiny").minPremiumMonthly ?? 0 : 0;
  const profile = profileFor(facts);
  // Tier 1 default order (Kyron, Decision 6 = A, 27 Oct 2026): life, CI, parent funerals oldest first, disability income, own final expense.
  const funerals = parentFuneral.filter((x) => x.product).sort((x, y) => y.age - x.age);
  const ciOn = ciNeed > 0 && issuable("life-span-gold", age, "Critical illness cover");
  const di = profile !== "later" && issuable("cashbuilder-ii", age, "Disability income") ? minimumFor(b, { product: "cashbuilder-ii", basis: "cashbuilder", insuredAge: age }) : 0;
  const own = { age, sex: facts.client.sex, who: "You" };
  const ownCover = Math.min(ra.cover!.max ?? Infinity, Math.max(ra.cover!.min, w.funeral));
  const ownFinal = profile === "later" && issuable("rest-assured-ii", age, "Your own final expense") ? { min: restAssuredPremium(b, own, ra.cover!.min), full: restAssuredPremium(b, own, ownCover) } : null;
  // Change 4 (Decision 7 = A): life cover follows each loan goal not yet taken (home on a mortgage, a car on a loan).
  // A family's existing mortgage stays inside life-ruin. Term if it can still be issued at the goal date, else whole life;
  // priced today, at today's rated age. Business loans stay in the business section.
  const loanCover = goals.plans.flatMap((p): LadderItemSpec[] => {
    const loan = p.home?.loan ?? p.car?.loan ?? 0;
    if (loan <= 0) return [];
    const id: "term" | "whole-life" = canIssue(b, "term", age + p.years) ? "term" : "whole-life";
    const spec = id === "term" ? term : whole;
    const cover = Math.min(spec.cover!.max ?? Infinity, Math.max(spec.cover!.min, loan));
    const prem = Math.max(spec.minPremiumMonthly ?? 0, premiumFor(b, id, cover, ratedAge(age)));
    return [{ key: `loan-cover:${p.goalId}`, tier: p.years <= near ? 2 : 3, label: `Life cover for the ${p.kind === "home" ? "home" : "car"} loan`, min: prem, full: prem, insurance: true, product: id }];
  });
  const specs: LadderItemSpec[] = [
    { key: "buffer-one-month", tier: 0, label: "One month of buffer cash", min: oneMonth, full: oneMonth, insurance: false },
    ...(dependants ? [{ key: "life-ruin", tier: 1 as const, label: "Life cover to the ruin level", min: essPrem, full: essPrem, insurance: true, product: lifeProduct }] : []),
    { key: "critical-illness", tier: 1, label: "Critical illness cover", min: ciOn ? ciMin : 0, full: ciOn ? ciFull : 0, insurance: true, product: "life-span-gold" },
    ...funerals.map((x) => ({
      key: `parent-funeral:${x.personId}`, tier: 1 as const, label: `${x.who}'s funeral cover`, min: x.minimumMonthly, full: Math.max(x.minimumMonthly, x.fullMonthly), insurance: true, product: "rest-assured-ii" as const,
    })),
    // The engine sizes no disability income need yet, so the item is funded at its minimum (F-17).
    { key: "disability-income", tier: 1, label: "Disability income (Cashbuilder II with the Disability Income Rider)", min: di, full: di, insurance: true, product: "cashbuilder-ii" },
    ...(ownFinal ? [{ key: "own-final-expense", tier: 1 as const, label: "Your own final expense (Rest Assured II)", min: ownFinal.min, full: ownFinal.full, insurance: true, product: "rest-assured-ii" as const }] : []),
    ...(token > 0 ? [{ key: "token-annuity", tier: 1.5 as const, label: "Token registered annuity (unused tax relief)", min: token, full: token, insurance: false }] : []),
    { key: "buffer-three-months", tier: 2, label: "Buffer out to three months", min: 0, full: Math.max(0, threeMonths - oneMonth), insurance: false },
    { key: "expensive-debt", tier: 2, label: "Expensive debt, extra", min: 0, full: debts.summary.expensiveDebt > 0 ? debts.extraMonthly : 0, insurance: false },
    { key: "near-dated", tier: 2, label: "Anything due inside three years", min: 0, full: sum(futureGoals.filter((g) => g.start <= near).map((g) => g.monthlySaving)) + sum(goals.plans.filter((p) => p.years <= near).map((p) => p.monthlySaving)), insurance: false },
    ...loanCover,
    ...(dependants ? [{ key: "life-beyond-ruin", tier: 3 as const, label: "Life cover beyond the ruin level", min: 0, full: Math.max(0, recPrem - essPrem), insurance: true, addsTo: "life-ruin", product: lifeProduct }] : []),
    { key: "retirement", tier: 3, label: "Retirement", min: 0, full: Math.max(0, ri.saveMonthly - token), insurance: false },
    { key: "education", tier: 3, label: "Education", min: 0, full: sum(futureGoals.filter((g) => g.kind === "edu" && g.start > near).map((g) => g.monthlySaving)), insurance: false },
    { key: "milestones", tier: 3, label: "Milestones and your own goals", min: 0, full: sum(futureGoals.filter((g) => g.kind === "milestone" && g.start > near).map((g) => g.monthlySaving)) + sum(goals.plans.filter((p) => p.years > near).map((p) => p.monthlySaving)), insurance: false },
  ];
  const ladderSpecs = specs.filter((s) => s.full > 0 || s.min > 0);
  const ladder = allocateLadder(budget, ladderSpecs, options.ladderOrder ?? defaultOrder(ladderSpecs));

  /* -------------------------------------------------------------- the life basket (Change 6) */
  // The life package on the close is the ladder's life allocation (life-ruin plus life-beyond-ruin); it does not split term
  // and whole life on its own (guard 25). Its cover is what each item was sized to buy: the ruin level, plus the funded
  // share of the step from the ruin level to the recommended cover.
  const buildBasket = (lad: Ladder): LifeBasket => {
    const ruin = lad.items.find((i) => i.key === "life-ruin");
    const beyond = lad.items.find((i) => i.key === "life-beyond-ruin");
    const prem = (ruin?.allocated ?? 0) + (beyond?.allocated ?? 0);
    if (budget.stage === 0 || !ruin || prem <= 0) {
      return { cover: 0, items: [], totalMonthly: 0, totalHighMonthly: 0, partial: !!ruin && wanted > 0, permanentDropped: false, notCovered: notCoveredAt(0), notYet: ruin?.notYet ?? false };
    }
    const share = beyond && beyond.full > 0 ? beyond.allocated / beyond.full : 0;
    const cover = packages.essential + share * Math.max(0, packages.recommended - packages.essential);
    const band = roughBand(b, cover * lifeRate / 1000, lifeSpec.minPremiumMonthly);
    const items: BasketItem[] = [{ product: lifeProduct, cover, premiumMonthly: prem, band }];
    return { cover, items, totalMonthly: prem, totalHighMonthly: band.high, partial: cover < wanted - 0.5, permanentDropped: false, notCovered: notCoveredAt(cover), notYet: false };
  };
  const basket = buildBasket(ladder);
  b.rule("the life basket is the ladder's life allocation; when the need costs more than the cap, partial cover is shown and what is not covered is named");

  const layers = ([1, 2, 3, 4, 5] as const).map((L) => layerAt(L, basket.cover));
  const today = layers[3]!.outcome;
  const plan = layers[4]!.outcome;

  /* -------------------------------------------------------------- legacy */
  const legLine = layers[4]!.lines.find((l) => l.key === "legacy");
  const legacy: ScenarioPair = {
    today: {
      lumpAvailable: 0, monthlyAvailable: 0, monthsUntilShortfall: null, obligationsMet: [],
      obligationsFailed: w.legacy > 0 ? ["What you leave behind"] : [],
      sentences: [w.legacy > 0 ? "Money in your own name is frozen until probate, which in T&T can take years." : "No legacy goal was set."], unknowns: [],
    },
    plan: {
      lumpAvailable: legLine?.paid ?? 0, monthlyAvailable: 0, monthsUntilShortfall: null,
      obligationsMet: legLine?.met ? ["What you leave behind"] : [], obligationsFailed: legLine && !legLine.met ? ["What you leave behind"] : [],
      sentences: [w.legacy <= 0 ? "No legacy goal was set."
        : legLine?.met ? `${money(w.legacy)} goes straight to the person you name. It does not form part of your estate, and creditors cannot reach it (Insurance Act s.187).`
        : "The plan does not yet reach what you want to leave behind."],
      unknowns: [],
    },
  };

  /* -------------------------------------------------------------- gaps for the scope statement */
  const gaps: ScopeGap[] = [
    { gapKey: "death", label: "If you die too soon" },
    { gapKey: "critical-illness", label: "If you get seriously ill" },
    { gapKey: "retirement", label: "If you live long" },
    ...(w.legacy > 0 ? [{ gapKey: "legacy", label: "What you leave behind" }] : []),
    ...facts.parents.map((p) => ({ gapKey: `parent-funeral:${p.personId}`, label: `${parentLabel(p)}'s funeral` })),
    ...(facts.client.hasHealthCover !== "yes" ? [{ gapKey: "health-cover", label: "Health cover" }] : []),
  ];

  const lev = (k: string): readonly number[] => b.get<readonly number[]>(`core:annuityLevers.${k}`);
  return {
    assumptionSetId: ASSUMPTION_SET_ID,
    stage: budget.stage,
    underwater: budget.stage === 0,
    packages,
    chosen: { package: usingBudget ? null : pkg, cover: basket.cover, basket },
    layers,
    scenarios: { death: { today, plan }, criticalIllness, liveLong: { today: longToday, plan: longPlan }, legacy },
    bands,
    parentFuneral,
    ladder,
    ladderSpecs,
    gaps,
    crossCheck: { stack: deathNeed.tiers.recommended, tatilStandard: deathNeed.methods.find((m) => m.key === "tatil")!.value },
    annuity: {
      mode: ri.routing.mode,
      controls: {
        destinyGuaranteedYears: lev("destinyGuaranteedYears"), destinySpousalShares: lev("destinySpousalShares"),
        spiaSpousalShares: lev("spiaSpousalShares"), destinyLumpAtVesting: lev("destinyLumpAtVesting"),
      },
      notes: [b.get<string>("core:annuityLevers.taxExemptNote"), b.get<ProductSpec>("core:products.spia").disclosure!, ...ri.routing.reasons],
    },
    provenance: b.build(),
  };
}
