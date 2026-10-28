/**
 * What you own and owe (Section 3 §6.4, "net worth"): the assets list minus what is owed, plus two ratios.
 *
 *   assetsTotal = every asset value; owedTotal = every debt balance (Debts, §7) + the mortgage balance;
 *   netWorth = assetsTotal - owedTotal.
 *   debtPaymentsShareOfPay (Decision 11, 28 Oct 2026) = (loan and card payments + the mortgage payment) / pay before
 *     deductions a month. Loan and card payments are the budget's "Loan and card payments" row (the minimums); the
 *     mortgage payment is the budget's mortgage line. Pay before deductions = the client's gross (the usual month, not
 *     the lowest) + the partner's pay as stored, which is take-home (gross is not asked; Build A, D2). Its guide
 *     (`core:ff.netWorth.debtPaymentsGuide`, at most 25%) is a common guide, never a pass or fail.
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
import type { GuideRange } from "./parameters/fact-finder-2026-10.ts";

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
  /** Loan and card payments a month (the budget's debt row: the minimums). */
  readonly loanAndCardPaymentsMonthly: number;
  /** The mortgage payment a month (0 when the home is not on a mortgage). */
  readonly mortgagePaymentMonthly: number;
  /** Loan and card payments + the mortgage payment. */
  readonly debtPaymentsMonthly: number;
  /** Pay before deductions a month: client gross (usual month) + partner pay as stored (take-home). */
  readonly payBeforeDeductionsMonthly: number;
  /** debtPaymentsMonthly / payBeforeDeductionsMonthly (0.21 = 21%); null when there is no pay. */
  readonly debtPaymentsShareOfPay: number | null;
  /** The common guide: at most `max` of pay before deductions, with its source and date. */
  readonly debtPaymentsGuide: { readonly max: number; readonly source: string; readonly asOf: string };
  readonly cashTotal: number;
  /** The monthly costs total the cash is measured against (`budget.needsMonthly`). */
  readonly costsMonthly: number;
  /** cashTotal / costsMonthly; null when there are no costs. */
  readonly monthsCovered: number | null;
  /** True when there is a partner: their pay is counted after deductions, so the share is a little high (call 7). */
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
  const payBeforeDeductions = engine.client.usualGrossMonthly + partnerPay;
  const loanAndCard = budget.debtMinimumsMonthly;
  const mortgagePayment = engine.budget.housing === "mortgage" ? engine.budget.housingPaymentMonthly : 0;
  const debtPayments = loanAndCard + mortgagePayment;
  const guideNode = b.useNode("core:ff.netWorth.debtPaymentsGuide").node as { value: GuideRange; source: string; asOf: string };
  const cashTotal = cashFromFacts(facts);
  const costsMonthly = budget.needsMonthly;
  b.rule("net worth = assets - (debts + mortgage); debt payments share = (loan and card payments + mortgage payment) / pay before deductions; months covered = cash / monthly costs");
  b.rule("cash = bank + credit union + unit trusts and money market funds; the version 1 savings field counts only when there are no cash rows");
  return {
    assets, assetsTotal, owed, owedTotal, netWorth: assetsTotal - owedTotal,
    loanAndCardPaymentsMonthly: loanAndCard,
    mortgagePaymentMonthly: mortgagePayment,
    debtPaymentsMonthly: debtPayments,
    payBeforeDeductionsMonthly: payBeforeDeductions,
    debtPaymentsShareOfPay: payBeforeDeductions > 0 ? debtPayments / payBeforeDeductions : null,
    debtPaymentsGuide: { max: guideNode.value.max, source: guideNode.source, asOf: guideNode.asOf },
    cashTotal, costsMonthly,
    monthsCovered: costsMonthly > 0 ? cashTotal / costsMonthly : null,
    partnerPayIsTakeHome: facts.partner !== null,
    provenance: b.build(),
  };
}
