/**
 * Module 10 — business (Section 2 §2.3): buy-sell, key person, business loans, overheads, staff,
 * the owners' retirement and property; and why each figure is asked.
 */
import { ProvenanceBuilder } from "./provenance.ts";
import type { Provenance } from "./types.ts";
import type { BusinessFacts } from "./life-case-facts.ts";

export type BusinessNeedTag =
  | "BUY-SELL AGREEMENT" | "KEY PERSON" | "BUSINESS LOANS" | "OVERHEADS" | "YOUR STAFF" | "YOUR RETIREMENT" | "PROPERTY AND LIABILITY";

export interface BusinessNeed {
  readonly tag: BusinessNeedTag;
  readonly title: string;
  /** A cover amount in TTD, or null when the need is not a sum (staff, retirement, property). */
  readonly amount: number | null;
  readonly what: string;
  readonly how: string;
}

export interface BusinessResult {
  readonly multiOwner: boolean;
  readonly yourShare: number;
  readonly typeNote: string;
  readonly needs: readonly BusinessNeed[];
  /** Why each input is asked, keyed by input. */
  readonly whyAsked: Readonly<Record<keyof BusinessFacts, string>>;
  readonly provenance: Provenance;
}

const WHY: Record<keyof BusinessFacts, string> = {
  type: "The structure decides who owns the policies and who receives the money.",
  owners: "With more than one owner, a buy-sell agreement protects everyone.",
  sharePct: "Your share is what your family would sell, and the cover needed on your life.",
  value: "It sets how much buy-sell cover the owners need.",
  profitAnnual: "It shows what the business can afford, and what is lost if it stops.",
  keyPersonAnnual: "Key person cover is sized from it.",
  loans: "Lenders often take personal guarantees. Cover stops the debt landing on your family.",
  overheadsMonthly: "These bills keep coming if you are off sick, so they size the cover for time off work.",
  staff: "With 3 or more staff, a group plan is possible and usually cheaper per person.",
};

const TYPE_NOTE: Record<BusinessFacts["type"], string> = {
  sole: "Sole trader: the business is you. Your health is the business's health, and business debts are your personal debts. Cover on you comes first.",
  partnership: "Partnership: the partners share the business and its debts. If one dies, their family inherits their share, so a buy-sell agreement matters.",
  company: "Company: the business is a separate legal person. It can own policies on its key people, pay for them, and receive the money.",
};

export function computeBusiness(bz: BusinessFacts): BusinessResult {
  const b = new ProvenanceBuilder();
  const fmt = (n: number): string => `$${Math.round(n).toLocaleString("en-US")}`;
  const multi = bz.type !== "sole" && bz.owners >= 2;
  const share = multi ? bz.sharePct / 100 : 1;
  const keyX = b.num("core:ff.business.keyPersonMultiple");
  const keyHigh = b.num("core:ff.business.keyPersonMultipleHigh");
  const months = b.num("core:ff.business.overheadMonths");
  const needs: BusinessNeed[] = [];
  if (multi) needs.push({
    tag: "BUY-SELL AGREEMENT", title: "If an owner dies", amount: bz.value,
    what: `Life cover on each owner, equal to their share: about ${fmt(bz.value * share)} on you and ${fmt(bz.value * (1 - share))} across your partners. If an owner dies, the others use it to buy the share from the family at a fair price.`,
    how: "Set it up with a written agreement, and hold the policies in a way that fits it (each owner on the others, or a trust). Kyron specialises in this.",
  });
  needs.push({
    tag: "KEY PERSON", title: "If the key person is lost", amount: bz.keyPersonAnnual * keyX,
    what: `Cover of about ${keyX} times what they bring in (${fmt(bz.keyPersonAnnual)} a year) gives the business time to recover, hire and retrain. Some businesses use up to ${keyHigh} times.`,
    how: "The business owns the policy, pays for it and receives the money.",
  });
  if (bz.loans > 0) needs.push({
    tag: "BUSINESS LOANS", title: "So the debt does not pass on", amount: bz.loans,
    what: "Clears the business loans if an owner dies, so the bank does not call in personal guarantees or the family home.",
    how: "Decreasing term or credit life, matched to the loan.",
  });
  needs.push({
    tag: "OVERHEADS", title: "If you cannot work for a while", amount: bz.overheadsMonthly * months,
    what: `A year of overheads (${fmt(bz.overheadsMonthly)} a month), so rent and salaries are paid while you recover.`,
    how: "Critical illness or disability cover on the owner. Kyron confirms what is available.",
  });
  if (bz.staff >= b.num("core:ff.business.groupPlanFromStaff")) needs.push({
    tag: "YOUR STAFF", title: "Benefits that keep good people", amount: null,
    what: "Group life and group health cover help you hire and keep good staff, and cost less per person than individual plans.",
    how: "Kyron can quote a group plan for your team.",
  });
  needs.push({
    tag: "YOUR RETIREMENT", title: "Paying yourself for later", amount: null,
    what: "A company can pay into a corporate annuity for its owners and staff, and claim it as a business expense. The payout is taxed later.",
    how: "The limit depends on income. Check the exact limit with your accountant.",
  });
  needs.push({
    tag: "PROPERTY AND LIABILITY", title: "The building, stock and claims", amount: null,
    what: "Building, contents, stock and public liability cover protect what the business owns and what it could be sued for.",
    how: "Priced in the rater.",
  });
  return { multiOwner: multi, yourShare: share, typeNote: TYPE_NOTE[bz.type], needs, whyAsked: WHY, provenance: b.build() };
}
