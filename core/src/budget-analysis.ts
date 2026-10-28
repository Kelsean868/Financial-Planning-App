/**
 * Where the money goes (Section 3 §1.4, §6.1, §6.2): each budget group as a share of household take-home, against its
 * common guide (a parameter row with its source and date), the debt payments row, the "So far: $X going out · $Y left"
 * bar, and the biggest gaps in dollars a month. Guides are "common guides", never a pass or fail.
 *
 * Guard 29: the rows add to the totals the rest of the engine uses. The spending rows plus the debt row equal the
 * budget's needs; debts appear only in the debt row; a parent's care appears once, in Family you support, at the care
 * graph's year-0 amount (the figure the budget's needs use).
 */
import { ProvenanceBuilder } from "./provenance.ts";
import type { Provenance } from "./types.ts";
import type { LifeCaseFacts, BudgetGroupKey, LineFrequency, StopTag } from "./life-case-facts.ts";
import { catalogueGroup } from "./life-case-facts.ts";
import { toMonthly, toYearly, splitBudget } from "./engine-facts.ts";
import type { HouseholdBudget } from "./household-budget.ts";
import type { DebtSummary } from "./debts.ts";
import type { CareGraphResult } from "./care-graph.ts";
import type { GroupKind, GuideKey } from "./parameters/budget-catalogue-2026-10.ts";
import type { GuideRange } from "./parameters/fact-finder-2026-10.ts";

export type GuideStatus = "no-guide" | "below" | "within" | "above" | "far-above";

export interface GuideRow {
  readonly key: GuideKey;
  readonly min: number | null;
  readonly max: number;
  readonly source: string;
  readonly asOf: string;
}

export interface BudgetLineRow {
  readonly label: string;
  readonly amount: number;
  readonly frequency: LineFrequency;
  readonly monthly: number;
  readonly stop: StopTag | null;
  readonly personId: string | null;
}

export interface BudgetGroupRow {
  /** A budget group, or `debts` (loan and card payments, from Debts), or `study` (a child studying now, care graph year 0). */
  readonly key: BudgetGroupKey | "debts" | "study";
  readonly label: string;
  readonly kind: GroupKind | "debts" | "study";
  readonly monthly: number;
  /** Share of household take-home; null when take-home is 0 or less. */
  readonly share: number | null;
  readonly guide: GuideRow | null;
  /** Inside the range: neutral; above: amber; far above (more than 1.5 × the top): red (§6.2). */
  readonly status: GuideStatus;
  /** Dollars a month above the top of the guide; 0 when not above. */
  readonly aboveByMonthly: number;
  /** A skipped group: one total, marked "estimated" (§1.2). */
  readonly estimated: boolean;
  readonly lines: readonly BudgetLineRow[];
}

export interface BudgetGap {
  readonly key: BudgetGroupRow["key"];
  readonly label: string;
  readonly monthly: number;
  readonly aboveByMonthly: number;
}

export interface BudgetAnalysis {
  /** Household take-home a month (the client's on the plan's month, plus the partner's). */
  readonly takeHomeMonthly: number;
  readonly groups: readonly BudgetGroupRow[];
  /** Spending: needs less debt payments (costs, once-a-year set-aside, care paid today). */
  readonly spendingMonthly: number;
  /** "Saving you already do": not spending (§1.1). */
  readonly savingMonthly: number;
  readonly debtPaymentsMonthly: number;
  /** Care and study paid today (the care graph's year 0). */
  readonly careMonthly: number;
  /** The budget's needs: the figure the stage, the ceiling and the death need use. */
  readonly needsMonthly: number;
  /** §1.4 bar: "So far: $X a month going out" = needs plus saving. */
  readonly outgoingMonthly: number;
  /** §1.4 bar: "· $Y left" = take-home less going out. */
  readonly leftMonthly: number;
  /** §6.2: the biggest gaps above the guides, at most three, largest first. */
  readonly gaps: readonly BudgetGap[];
  readonly estimatedGroups: readonly BudgetGroupKey[];
  /** Monthly totals of lines tagged with each stop (§9). */
  readonly stopMonthly: Readonly<Record<StopTag, number>>;
  /** Parents whose care in the plan (a future level starting now) is above the budget line. */
  readonly careAboveBudget: readonly { readonly personId: string; readonly budgetMonthly: number; readonly graphMonthly: number }[];
  readonly provenance: Provenance;
}

export interface BudgetAnalysisInputs {
  readonly facts: LifeCaseFacts;
  readonly budget: HouseholdBudget;
  readonly debts: DebtSummary;
  readonly careGraph: CareGraphResult;
}

const MONEY_TOLERANCE = 1e-6;

export function computeBudgetAnalysis(input: BudgetAnalysisInputs): BudgetAnalysis {
  const b = new ProvenanceBuilder();
  const { facts, budget, debts, careGraph } = input;
  const take = budget.netPay.householdNetMonthly;
  const far = b.num("core:ff.guides.farAboveFactor");
  const graphToday = new Map(careGraph.parentsToday.map((p) => [p.personId, p.graphMonthly]));
  const guideRow = (key: GuideKey | null): GuideRow | null => {
    if (!key) return null;
    const node = b.useNode(`core:ff.guides.${key}`).node as { value: GuideRange; source: string; asOf: string };
    return { key, min: node.value.min, max: node.value.max, source: node.source, asOf: node.asOf };
  };
  const row = (key: BudgetGroupRow["key"], label: string, kind: BudgetGroupRow["kind"], monthly: number, guide: GuideRow | null, estimated: boolean, lines: BudgetLineRow[]): BudgetGroupRow => {
    const share = take > 0 ? monthly / take : null;
    let status: GuideStatus = "no-guide";
    let above = 0;
    if (guide && share !== null) {
      above = Math.max(0, monthly - guide.max * take);
      status = share > guide.max * far ? "far-above" : share > guide.max ? "above" : guide.min !== null && share < guide.min ? "below" : "within";
    }
    return { key, label, kind, monthly, share, guide, status, aboveByMonthly: above, estimated, lines };
  };

  const rows: BudgetGroupRow[] = [];
  const order = ["quick", ...facts.budget.groups.map((g) => g.key).filter((k) => k !== "quick")];
  const groups = [...facts.budget.groups].sort((x, y) => order.indexOf(x.key) - order.indexOf(y.key));
  /** Each parent's care is counted once, in the first group that holds one of its lines. */
  const counted = new Set<string>();
  for (const g of groups) {
    const cat = catalogueGroup(g.key);
    if (g.skip) {
      const m = toMonthly(b, g.total ?? 0, g.totalFrequency ?? "monthly");
      // A skipped Family you support group is one total for relatives: no parent's care is read from it (§1.3).
      rows.push(row(g.key, cat.label, cat.kind, m, guideRow(cat.guide), true, []));
      continue;
    }
    const lines: BudgetLineRow[] = g.lines.map((l) => ({
      label: l.label, amount: l.amount, frequency: l.frequency, monthly: toMonthly(b, l.amount, l.frequency),
      stop: l.stop ?? null, personId: l.personId ?? null,
    }));
    // A parent's care counts at the care graph's year-0 amount (what needs use); every other line at its own amount.
    const parents = [...new Set(lines.filter((l) => l.personId !== null).map((l) => l.personId!))].filter((id) => !counted.has(id));
    for (const id of parents) counted.add(id);
    const ownLines = g.lines.filter((l) => l.personId === undefined);
    const ownMonthly = cat.kind === "yearly"
      ? ownLines.reduce((a, l) => a + toYearly(b, l.amount, l.frequency), 0) / MONTHS
      : ownLines.reduce((a, l) => a + toMonthly(b, l.amount, l.frequency), 0);
    const monthly = ownMonthly + parents.reduce((a, id) => a + (graphToday.get(id) ?? 0), 0);
    rows.push(row(g.key, cat.label, cat.kind, monthly, guideRow(cat.guide), false, lines));
  }
  // A parent whose care is in a line of a group that is not in the facts cannot happen (the line is in a group); a
  // parent with no line but care in the graph today (a future level starting now) is shown with Family you support.
  const inLines = new Set(groups.filter((g) => !g.skip).flatMap((g) => g.lines.map((l) => l.personId)).filter((x): x is string => !!x));
  const unlisted = careGraph.parentsToday.filter((p) => !inLines.has(p.personId) && p.graphMonthly > 0);
  if (unlisted.length) {
    const extra = unlisted.reduce((a, p) => a + p.graphMonthly, 0);
    const at = rows.findIndex((r) => r.key === "family");
    if (at >= 0) rows[at] = row("family", rows[at]!.label, "support", rows[at]!.monthly + extra, null, rows[at]!.estimated, [...rows[at]!.lines]);
    else rows.push(row("family", catalogueGroup("family").label, "support", extra, null, false, []));
  }
  const study = careGraph.years[0]?.eduMonthly ?? 0;
  if (study > MONEY_TOLERANCE) rows.push(row("study", "Study costs today", "study", study, null, false, []));
  rows.push(row("debts", "Loan and card payments", "debts", debts.minimumsMonthly, guideRow("debt"), false, []));

  const split = splitBudget(b, facts);
  const saving = rows.filter((r) => r.kind === "saving").reduce((a, r) => a + r.monthly, 0);
  const gapsShown = b.num("core:ff.guides.gapsShown");
  const gaps = rows.filter((r) => r.aboveByMonthly > MONEY_TOLERANCE)
    .sort((x, y) => y.aboveByMonthly - x.aboveByMonthly)
    .slice(0, gapsShown)
    .map((r) => ({ key: r.key, label: r.label, monthly: r.monthly, aboveByMonthly: r.aboveByMonthly }));
  b.rule("each group is a share of household take-home against its common guide; above the top is amber, more than 1.5 times the top is red");
  return {
    takeHomeMonthly: take,
    groups: rows,
    spendingMonthly: budget.needsMonthly - budget.debtMinimumsMonthly,
    savingMonthly: saving,
    debtPaymentsMonthly: budget.debtMinimumsMonthly,
    careMonthly: budget.carePaidMonthly,
    needsMonthly: budget.needsMonthly,
    outgoingMonthly: budget.needsMonthly + saving,
    leftMonthly: take - budget.needsMonthly - saving,
    gaps,
    estimatedGroups: facts.budget.groups.filter((g) => g.skip).map((g) => g.key),
    stopMonthly: split.stopMonthly,
    careAboveBudget: careGraph.parentsToday.filter((p) => p.graphMonthly > p.budgetMonthly + MONEY_TOLERANCE),
    provenance: b.build(),
  };
}

const MONTHS = 12;
