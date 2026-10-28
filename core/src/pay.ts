/**
 * Pay in the client's own rhythm (Section 3 §2): pays a year, the monthly figures, "My pay changes" (the plan uses the
 * lowest month; the usual month shows as "in a good month"), "Save each payday" per pay, and the extra-pay months
 * ("Plan on 4 pays (or 2). Send the extra pay straight to savings.").
 */
import { ProvenanceBuilder } from "./provenance.ts";
import type { Provenance } from "./types.ts";
import type { PayFacts, PayFrequency } from "./life-case-facts.ts";
import { payMonthly, type EngineFacts } from "./engine-facts.ts";
import { computeNetPay, type NetPay, type BudgetBuckets } from "./household-budget.ts";

export interface PayRhythm {
  readonly frequency: PayFrequency;
  readonly paysPerYear: number;
  readonly amountPerPay: number;
  readonly varies: boolean;
  /** The usual month (§2.5: "in a good month" when pay changes). */
  readonly usualMonthly: number;
  /** The month the plan uses: the lowest when pay changes, else the usual. */
  readonly planMonthly: number;
}

export interface PayPlan {
  readonly client: PayRhythm;
  /** Partner pay is take-home (as version 1's partner income). */
  readonly partner: PayRhythm | null;
  /** The client's take-home a month on the plan's month. */
  readonly planNetMonthly: number;
  /** The client's take-home a month in a good month; null unless pay changes. */
  readonly goodMonthNetMonthly: number | null;
  /** The client's take-home on one pay, on the plan's month. */
  readonly takeHomePerPay: number;
  /** §2.3: pay yourself first, per pay: "Save $650 every Friday." */
  readonly savePerPay: number;
  /** §2.4: pays to plan a month on (4 weekly, 2 fortnightly or twice a month, 1 monthly). */
  readonly planPaysPerMonth: number;
  /** §2.4: pays a year above `planPaysPerMonth` × 12 (4 weekly, 2 fortnightly, else 0): send these to savings. */
  readonly extraPaysPerYear: number;
  readonly provenance: Provenance;
}

function rhythm(b: ProvenanceBuilder, pay: PayFacts): PayRhythm {
  const m = payMonthly(b, pay);
  return {
    frequency: pay.frequency,
    paysPerYear: b.get<Readonly<Record<PayFrequency, number>>>("core:ff.frequency.perYear")[pay.frequency],
    amountPerPay: pay.amountPerPay, varies: pay.varies, usualMonthly: m.usual, planMonthly: m.plan,
  };
}

const MONTHS = 12;

export function computePayPlan(facts: EngineFacts, netPay: NetPay, buckets: BudgetBuckets): PayPlan {
  const b = new ProvenanceBuilder();
  const client = rhythm(b, facts.client.pay);
  const partner = facts.partner ? rhythm(b, facts.partner.pay) : null;
  const good = client.varies ? computeNetPay({ client: { ...facts.client, grossMonthly: client.usualMonthly }, partner: facts.partner }).netMonthly : null;
  const planPays = b.get<Readonly<Record<PayFrequency, number>>>("core:ff.frequency.planPaysPerMonth")[client.frequency];
  b.rule("the plan uses the lowest month when pay changes; saving is shown per pay in the client's own rhythm");
  return {
    client, partner,
    planNetMonthly: netPay.netMonthly,
    goodMonthNetMonthly: good,
    takeHomePerPay: netPay.netMonthly * MONTHS / client.paysPerYear,
    savePerPay: buckets.payYourselfFirstMonthly * MONTHS / client.paysPerYear,
    planPaysPerMonth: planPays,
    extraPaysPerYear: Math.max(0, client.paysPerYear - planPays * MONTHS),
    provenance: b.build(),
  };
}
