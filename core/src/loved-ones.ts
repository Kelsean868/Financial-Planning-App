/**
 * Module 9 — loved ones (Section 2 §2.3): plans bought for a child, grandchild, adult relative or
 * parent; eligibility by age (Goldspoon 1–12, Rest Assured II to 80, from the product table); the
 * budget fitted to minimums (guard 16: no funded plan below its minimum).
 */
import { ProvenanceBuilder } from "./provenance.ts";
import type { Provenance } from "./types.ts";
import type { LovedOnesFacts, LovedOneFacts } from "./life-case-facts.ts";
import type { ProductId, ProductSpec } from "./parameters/tatil-products-2026-10.ts";
import { fitToMinimums, ratePer1000 } from "./premiums.ts";
import { futureValueMonthly } from "./start-early.ts";

export interface LovedOnePlan {
  readonly name: string;
  readonly product: ProductId | null;
  readonly why: string;
  /** Saving years; 0 for cover plans. */
  readonly years: number;
  readonly status: "funded" | "not-yet";
  readonly monthly: number;
  readonly minimumMonthly: number;
  readonly paidIn: number;
  /** At an assumed rate, "not promised". 0 for cover plans. */
  readonly illustrativeValue: number;
  readonly warning: string | null;
  readonly disclosure: string | null;
}

export interface LovedOneResult {
  readonly personId: string;
  readonly title: string;
  readonly relation: LovedOneFacts["relation"];
  readonly plans: readonly LovedOnePlan[];
}

export interface LovedOnesResult {
  readonly buyerNeedsSuccessorOwner: boolean;
  readonly budgetMonthly: number;
  readonly ones: readonly LovedOneResult[];
  readonly notes: readonly string[];
  readonly provenance: Provenance;
}

interface Candidate { name: string; product: ProductId | null; why: string; years: number }

function eligibleAt(spec: ProductSpec, age: number): boolean {
  return (spec.issueAge.min === null || age >= spec.issueAge.min) && (spec.issueAge.max === null || age <= spec.issueAge.max);
}

function candidates(b: ProvenanceBuilder, lv: LovedOnesFacts, o: LovedOneFacts): Candidate[] {
  const out: Candidate[] = [];
  const gold = b.get<ProductSpec>("core:products.goldspoon");
  const ra = b.get<ProductSpec>("core:products.rest-assured-ii");
  const retireAt = b.num("core:ff.lovedOnes.retireAtAge");
  if (o.relation === "child") {
    const yrs = Math.max(1, b.num("core:ff.lovedOnes.childSavingToAge") - o.age);
    if (lv.aims.save) {
      out.push(eligibleAt(gold, o.age)
        ? { name: "Goldspoon (child savings and life plan)", product: "goldspoon", why: `Savings for their future with life cover on the child. For ages ${gold.issueAge.min} to ${gold.issueAge.max}; cover from $${gold.cover!.min.toLocaleString("en-US")} to $${gold.cover!.max!.toLocaleString("en-US")}.`, years: yrs }
        : { name: "Education endowment", product: "endowment", why: "Saves until they turn 18, then pays out for school, a first car or a home deposit. Life cover is built in.", years: yrs });
    }
    if (lv.aims.life) out.push({ name: "Children's whole life", product: "whole-life", why: "Cover for life at a child's price. They take it over as an adult, and it builds cash value.", years: 0 });
    if (lv.aims.retire) out.push({ name: "Retirement annuity (Destiny)", product: "destiny", why: "Started in childhood, even a small amount has decades to grow.", years: retireAt - o.age });
  } else if (o.relation === "adult") {
    if (lv.aims.save) out.push({ name: "Endowment plan", product: "endowment", why: "Saving to a set date, such as a house deposit, with life cover built in.", years: b.num("core:ff.lovedOnes.adultEndowmentYears") });
    if (lv.aims.life) out.push({ name: "Whole life", product: "whole-life", why: "Lifelong cover, locked in at today's age and health. They must agree to be insured.", years: 0 });
    if (lv.aims.retire) out.push({ name: "Retirement annuity (Destiny, unregistered)", product: "destiny", why: "A head start on their retirement that you fund now.", years: Math.max(b.num("core:ff.lovedOnes.minimumAnnuityYears"), retireAt - o.age) });
  } else {
    if (lv.aims.funeral || lv.aims.life) {
      out.push(eligibleAt(ra, o.age)
        ? { name: "Funeral cover (Rest Assured II)", product: "rest-assured-ii", why: `No medical questions, up to age ${ra.issueAge.max} at the start. Pays the funeral home directly, with no probate wait. Full cover from year three; accidents from day one.`, years: 0 }
        : { name: "Savings for the funeral", product: null, why: `Most funeral plans start only up to age ${ra.issueAge.max}. A savings fund for the funeral may be the better route.`, years: 0 });
    }
    if (lv.aims.save) out.push({ name: "Savings for their care", product: null, why: "A fund set aside for care costs, kept in your name.", years: b.num("core:ff.lovedOnes.elderCareFundYears") });
  }
  return out;
}

function minimumOf(b: ProvenanceBuilder, c: Candidate, age: number): number {
  if (c.product === null) return 0;
  const spec = b.get<ProductSpec>(`core:products.${c.product}`);
  if (c.product === "rest-assured-ii") return spec.cover!.min * ratePer1000(b, "rest-assured", age) / 1000;
  return spec.minPremiumMonthly ?? 0;
}

export function computeLovedOnes(lv: LovedOnesFacts): LovedOnesResult {
  const b = new ProvenanceBuilder();
  const growth = b.num("core:ff.lovedOnes.illustrativeGrowth");
  const per = lv.ones.map((o) => candidates(b, lv, o));
  const all: { oi: number; pi: number; min: number }[] = [];
  per.forEach((cs, oi) => cs.forEach((c, pi) => all.push({ oi, pi, min: minimumOf(b, c, lv.ones[oi]!.age) })));
  all.sort((a, c) => a.pi - c.pi || a.oi - c.oi);
  const fit = fitToMinimums(all.map((x) => ({ key: x, min: x.min, weight: 1 })), lv.budgetMonthly);
  const slot = new Map<string, { monthly: number; status: "funded" | "not-yet"; min: number }>();
  for (const f of fit.funded) slot.set(`${f.key.oi}-${f.key.pi}`, { monthly: f.monthly, status: "funded", min: f.min });
  for (const n of fit.notYet) slot.set(`${n.key.oi}-${n.key.pi}`, { monthly: 0, status: "not-yet", min: n.needs });
  const endowMin = b.get<ProductSpec>("core:products.endowment").cover!.min;
  const endowShare = b.num("core:ff.premiumRates.endowmentCoverShare");
  const fmt = (n: number): string => `$${Math.round(n).toLocaleString("en-US")}`;

  const ones: LovedOneResult[] = lv.ones.map((o, oi) => ({
    personId: o.personId,
    title: o.firstName && o.firstName.trim() ? o.firstName : o.relation === "child" ? "Your grandchild" : o.relation === "elder" ? "Your parent or elder" : "Your loved one",
    relation: o.relation,
    plans: per[oi]!.map((c, pi) => {
      const s = slot.get(`${oi}-${pi}`) ?? { monthly: 0, status: "not-yet" as const, min: 0 };
      const spec = c.product ? b.get<ProductSpec>(`core:products.${c.product}`) : null;
      const needE = c.product === "endowment" && c.years > 0 ? endowMin / endowShare / (12 * c.years) : 0;
      const warning = s.status === "not-yet"
        ? `Not yet: this plan needs at least ${fmt(s.min)} a month. Raise the budget, or start with the plans above.`
        : needE > s.monthly + 0.5 ? `Tatil's endowment starts at ${fmt(endowMin)} of cover. Over ${c.years} years that needs about ${fmt(needE)} a month.` : null;
      return {
        name: c.name, product: c.product, why: c.why, years: c.years, status: s.status, monthly: s.monthly, minimumMonthly: s.min,
        paidIn: s.monthly * 12 * c.years,
        illustrativeValue: c.years > 0 ? futureValueMonthly(s.monthly, c.years, growth) : 0,
        warning, disclosure: spec?.disclosure ?? null,
      };
    }),
  }));
  b.rule("loved-one plans get their minimum first; the rest of the budget is shared equally");
  return {
    buyerNeedsSuccessorOwner: lv.buyerAge >= b.num("core:ff.lovedOnes.successorOwnerFromAge"),
    budgetMonthly: lv.budgetMonthly,
    ones,
    notes: [
      "You own the policy and pay for it. For a child, ownership can pass to them at 18 or 21.",
      "Add a payor benefit: if you die or become disabled, the premiums stop and the plan carries on.",
      "Name a successor owner, so someone takes over the plan if you are no longer here.",
      "An adult must agree to be insured. For a child, a parent or guardian signs.",
      "You can insure someone only if losing them would affect you, as close family usually does. This is called insurable interest.",
    ],
    provenance: b.build(),
  };
}
