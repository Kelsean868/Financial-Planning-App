/**
 * What you own and owe (Section 3 §6.4, "net worth"): the assets list minus what is owed, plus two ratios.
 *
 *   assetsTotal = every asset value; owedTotal = every debt balance (Debts, §7) + the mortgage balance;
 *   netWorth = assetsTotal - owedTotal.
 *   debtsShareOfGrossPay = owedTotal / the household's gross yearly pay. The client's pay is gross (the usual month,
 *     not the lowest); the partner's pay is stored as take-home (Build A, D2), so it is added as it is stored.
 *   cashTotal = bank, credit union and unit trusts / money market funds (`CASH_KINDS`); monthsCovered = cashTotal /
 *     the budget's monthly costs total (`budget.needsMonthly`, the figure the emergency fund and the stage use).
 *
 * One cash figure (§6.4 "No asset is typed twice"): `cashFromFacts` is what the emergency fund, the stage, the death
 * need and the health score read. It is the cash asset rows when there are any; the version 1 field `budget.savings`
 * counts only when there are none (a case saved before assets existed).
 * Pure: the same facts give the same result.
 */
import { ProvenanceBuilder } from "./provenance.ts";
import type { Provenance } from "./types.ts";
import type { AssetKind, LifeCaseFacts } from "./life-case-facts.ts";
import { payMonthly, cashFromFacts, CASH_KINDS, type EngineFacts } from "./engine-facts.ts";
export { cashFromFacts, CASH_KINDS };
import type { HouseholdBudget } from "./household-budget.ts";

const MONTHS_A_YEAR = 12;

/** §6.4 order and plain-words label of each asset kind. */
export const ASSET_KIND_LABELS: Readonly<Record<AssetKind, string>> = {
  "bank": "Bank and fixed deposits",
  "credit-union": "Credit union shares",
  "unit-trust": "Unit trusts and money market funds",
  "shares-bonds": "Shares and bonds",
  "pension-cash": "Pension and annuity cash value",
  "life-cash": "Life insurance cash value",
  "property": "Home and other property",
  "vehicle": "Vehicles",
  "furniture": "Furniture and equipment",
  "other": "Other",
};

const isCash = (kind: AssetKind): boolean => CASH_KINDS.includes(kind);

export interface NetWorthAsset {
  readonly kind: AssetKind;
  readonly label: string;
  /** The sum of the rows of this kind (0 when none). */
  readonly value: number;
  readonly cash: boolean;
}

export interface NetWorthOwed {
  readonly label: string;
  readonly balance: number;
  readonly kind: "mortgage" | "debt";
}

export interface NetWorth {
  /** Every asset kind, in §6.4 order, with its value. */
  readonly assets: readonly NetWorthAsset[];
  readonly assetsTotal: number;
  /** The mortgage first (when there is one), then each debt. */
  readonly owed: readonly NetWorthOwed[];
  readonly owedTotal: number;
  readonly netWorth: number;
  /** The household's gross yearly pay (client gross, usual month; partner as stored, which is take-home). */
  readonly grossYearlyPay: number;
  /** owedTotal / grossYearlyPay; null when there is no pay. */
  readonly debtsShareOfGrossPay: number | null;
  readonly cashTotal: number;
  /** The monthly costs total the cash is measured against (`budget.needsMonthly`). */
  readonly costsMonthly: number;
  /** cashTotal / costsMonthly; null when there are no costs. */
  readonly monthsCovered: number | null;
  /** True when the partner's pay is take-home, so the share is slightly higher than on gross pay. */
  readonly partnerPayIsTakeHome: boolean;
  readonly provenance: Provenance;
}

export interface NetWorthInputs {
  readonly facts: LifeCaseFacts;
  readonly engine: EngineFacts;
  readonly budget: HouseholdBudget;
}

export function computeNetWorth({ facts, engine, budget }: NetWorthInputs): NetWorth {
  const b = new ProvenanceBuilder();
  const assets: NetWorthAsset[] = (Object.keys(ASSET_KIND_LABELS) as AssetKind[]).map((kind) => ({
    kind, label: ASSET_KIND_LABELS[kind], cash: isCash(kind),
    value: facts.assets.filter((a) => a.kind === kind).reduce((s, a) => s + a.value, 0),
  }));
  const assetsTotal = assets.reduce((s, a) => s + a.value, 0);
  const mortgage = facts.budget.mortgage;
  const owed: NetWorthOwed[] = [
    ...(mortgage && mortgage.balance > 0 ? [{ label: "Mortgage", balance: mortgage.balance, kind: "mortgage" as const }] : []),
    ...facts.debts.items.map((d) => ({ label: d.label, balance: d.balance, kind: "debt" as const })),
  ];
  const owedTotal = owed.reduce((s, o) => s + o.balance, 0);
  const partnerPay = facts.partner ? payMonthly(b, facts.partner.pay).usual : 0;
  const grossYearlyPay = (engine.client.usualGrossMonthly + partnerPay) * MONTHS_A_YEAR;
  const cashTotal = cashFromFacts(facts);
  const costsMonthly = budget.needsMonthly;
  b.rule("net worth = assets - (debts + mortgage); debts share = owed / household gross yearly pay; months covered = cash / monthly costs");
  b.rule("cash = bank + credit union + unit trusts and money market funds; the version 1 savings field counts only when there are no cash rows");
  return {
    assets, assetsTotal, owed, owedTotal, netWorth: assetsTotal - owedTotal,
    grossYearlyPay,
    debtsShareOfGrossPay: grossYearlyPay > 0 ? owedTotal / grossYearlyPay : null,
    cashTotal, costsMonthly,
    monthsCovered: costsMonthly > 0 ? cashTotal / costsMonthly : null,
    partnerPayIsTakeHome: facts.partner !== null,
    provenance: b.build(),
  };
}
