/**
 * Make room (Section 3 §6.3). One target per budget group; "Freed up" is what the targets take off today's amounts.
 * Freed money is filled in plan order by default — the §11 ladder applied to the freed money:
 *   (0. costs above income: close that first — stage 0 only)
 *   1. one month of costs saved (the ladder's buffer item, unfilled part);
 *   2. the $200 insurance floor, then the insurance budget (up to the cap the new budget allows);
 *   3. expensive debt (what clears it inside the near-dated horizon, less what is already paid);
 *   4. the emergency fund to three months (the ladder's buffer-to-three-months item, unfilled part);
 *   5. retirement, then goals (unfilled parts); anything left goes to retirement.
 * The client or advisor can change the split (Kyron, 28 Oct 2026): any destination, and "Spend more on" any spending
 * group. It is validated: never more than was freed (`LifeCaseFactsError`); what is not given a job shows as such.
 * Nothing changes the facts: `applyRoomPlan` builds the "With your plan" facts and options beside the real numbers.
 */
import { ProvenanceBuilder } from "./provenance.ts";
import type { Provenance } from "./types.ts";
import { LifeCaseFactsError } from "./errors.ts";
import { isRoomDestination, catalogueGroup, type BudgetGroupKey, type RoomDestination, type LifeCaseFacts, type BudgetGroupFacts, type BudgetLineFacts } from "./life-case-facts.ts";
import { toMonthly } from "./engine-facts.ts";
import { stageAndCeiling } from "./household-budget.ts";
import { amortisedPayment } from "./debts.ts";
import { payoffMonths, addMonths } from "./debt-payoff.ts";
import { computeFactFinder, type FactFinderResult, type FactFinderOptions } from "./fact-finder.ts";
import type { GroupKind } from "./parameters/budget-catalogue-2026-10.ts";

export interface RoomPlanInput {
  /** New monthly amount per group. A target above today's amount frees nothing (use "Spend more on" to raise a group). */
  readonly groupTargets: Partial<Record<BudgetGroupKey, number>>;
  /** A custom split, monthly per destination. Absent, null or empty: the default split in plan order. */
  readonly split?: Partial<Record<RoomDestination, number>> | null;
}

export interface RoomGroupRow {
  readonly key: BudgetGroupKey;
  readonly label: string;
  readonly kind: GroupKind;
  readonly todayMonthly: number;
  readonly targetMonthly: number;
  readonly freedMonthly: number;
  /** §6.3.2: "Bring to the top of the range" — the guide's top in dollars; null without a guide or when not above it. */
  readonly suggestedMonthly: number | null;
  readonly aboveByMonthly: number;
}

export type RoomStep = 0 | 1 | 2 | 3 | 4 | 5;

export interface RoomDestinationRow {
  readonly key: RoomDestination;
  readonly label: string;
  /** The plan-order step; null for "Spend more on" a group ("Your choice"). */
  readonly step: RoomStep | null;
  /** What the step can still use, a month (the default split fills to it); null for a group. */
  readonly neededMonthly: number | null;
  readonly monthly: number;
}

export interface RoomPlanEffects {
  /** Each group after the plan: its target plus any "Spend more on" money. */
  readonly groupsAfter: readonly { readonly key: BudgetGroupKey; readonly todayMonthly: number; readonly afterMonthly: number }[];
  readonly insuranceBudgetBeforeMonthly: number;
  /** The insurance budget with the plan: before plus protection, inside the new range (0 when still no plan). */
  readonly insuranceBudgetMonthly: number;
  readonly debtExtraBeforeMonthly: number;
  readonly debtExtraMonthly: number;
  /** The debt the extra goes to (highest rate first), with its payoff month before and after. */
  readonly debtTarget: { readonly index: number; readonly label: string; readonly payoffBefore: string | null; readonly payoffAfter: string | null } | null;
  readonly shortfallMonthly: number;
  readonly bufferMonthly: number;
  readonly emergencyMonthly: number;
  readonly retirementMonthly: number;
  readonly goalsMonthly: number;
}

export interface RoomPlanResult {
  readonly groups: readonly RoomGroupRow[];
  /** Groups above their guide, furthest first (§6.3.2). */
  readonly suggestions: readonly RoomGroupRow[];
  readonly freedMonthly: number;
  /** The default split in plan order (§6.3.3). */
  readonly defaultSplit: readonly RoomDestinationRow[];
  /** The split in use: the custom one when given, else the default. */
  readonly split: readonly RoomDestinationRow[];
  readonly custom: boolean;
  readonly assignedMonthly: number;
  /** "Not yet given a job". */
  readonly notGivenAJobMonthly: number;
  readonly effects: RoomPlanEffects;
  readonly provenance: Provenance;
}

const STEP_LABELS: Readonly<Record<Exclude<RoomDestination, `group:${string}`>, readonly [RoomStep, string]>> = {
  shortfall: [0, "Costs above income"],
  buffer: [1, "One month of costs saved"],
  protection: [2, "Protection: the $200 floor, then the insurance budget"],
  debt: [3, "Expensive debt"],
  emergency: [4, "Emergency fund to three months"],
  retirement: [5, "Retirement"],
  goals: [5, "Your goals"],
};

/** Plan order (§6.3.3). Guard 31 holds the engine to it. */
export const ROOM_ORDER: readonly Exclude<RoomDestination, `group:${string}`>[] = ["shortfall", "buffer", "protection", "debt", "emergency", "retirement", "goals"];

/** Split money tolerance: half a cent. */
const SPLIT_TOLERANCE = 0.005;
const MONEY_TOLERANCE = 1e-9;

function unfilled(r: FactFinderResult, keys: readonly string[]): number {
  return keys.reduce((a, k) => {
    const spec = r.closing.ladderSpecs.find((s) => s.key === k);
    const got = r.closing.ladder.items.find((s) => s.key === k)?.allocated ?? 0;
    return a + (spec ? Math.max(0, spec.full - got) : 0);
  }, 0);
}

/** The insurance range the budget would have with needs changed by `deltaNeeds` (Make room re-runs the stage table). */
function rangeAfter(b: ProvenanceBuilder, r: FactFinderResult, deltaNeeds: number): { noPlan: boolean; min: number; max: number; defaultCap: number } {
  const bud = r.budget;
  const needs = bud.needsMonthly + deltaNeeds;
  const surplus = bud.netPay.householdNetMonthly - needs;
  const { stage, ceiling } = stageAndCeiling(b, {
    hhNet: bud.netPay.householdNetMonthly, surplus, buffer: needs > 0 ? r.facts.budget.savings / needs : 0,
    expensiveDebt: bud.expensiveDebt, emergencyFundMonths: bud.emergencyFundMonths,
  });
  const floor = b.num("core:ff.insurance.floorMonthly");
  const rec = ceiling * b.get<{ recommended: number }>("core:ff.closing.bandShares").recommended;
  const noPlan = stage === 0 || surplus < floor;
  return { noPlan, min: floor, max: Math.max(ceiling, floor), defaultCap: noPlan ? 0 : Math.max(floor, rec) };
}

export function computeRoomPlan(r: FactFinderResult, input: RoomPlanInput): RoomPlanResult {
  const b = new ProvenanceBuilder();
  const take = r.budgetAnalysis.takeHomeMonthly;
  const groups: RoomGroupRow[] = r.budgetAnalysis.groups.flatMap((row): RoomGroupRow[] => {
    if (row.key === "debts" || row.key === "study") return [];
    const key = row.key;
    const want = input.groupTargets[key];
    if (want !== undefined && (typeof want !== "number" || !Number.isFinite(want) || want < 0)) {
      throw new LifeCaseFactsError([`Make room: the target for ${key} must be a number, not negative`]);
    }
    const target = want === undefined ? row.monthly : Math.min(want, row.monthly);
    const top = row.guide && take > 0 ? row.guide.max * take : null;
    return [{
      key, label: row.label, kind: row.kind as GroupKind, todayMonthly: row.monthly, targetMonthly: target,
      freedMonthly: Math.max(0, row.monthly - target),
      suggestedMonthly: top !== null && row.aboveByMonthly > 0 ? top : null, aboveByMonthly: row.aboveByMonthly,
    }];
  });
  for (const k of Object.keys(input.groupTargets)) {
    if (!groups.some((g) => g.key === k)) throw new LifeCaseFactsError([`Make room: ${k} is not a group in this budget`]);
  }
  const freed = groups.reduce((a, g) => a + g.freedMonthly, 0);
  const freedNeeds = groups.filter((g) => g.kind !== "saving").reduce((a, g) => a + g.freedMonthly, 0);

  // ---- what each step can still use
  const surplus = r.budget.surplusMonthly;
  const capNow = r.closing.ladder.insuranceCapMonthly;
  const near = b.num("core:ff.closing.nearDatedYears");
  const expensive = r.facts.debts.items.filter((d) => d.balance > 0 && d.ratePct > b.num("core:ff.budget.badDebtAbovePct"));
  const clearPay = expensive.reduce((a, d) => a + amortisedPayment(d.balance, d.ratePct, near), 0);
  const expMins = expensive.reduce((a, d) => a + d.minimumMonthly, 0);
  const needed: Record<(typeof ROOM_ORDER)[number], number> = {
    shortfall: Math.max(0, -surplus),
    buffer: unfilled(r, ["buffer-one-month"]),
    protection: Math.max(0, rangeAfter(b, r, -freedNeeds).defaultCap - capNow),
    debt: expensive.length ? Math.max(0, clearPay - expMins - allocatedTo(r, "expensive-debt")) : 0,
    emergency: unfilled(r, ["buffer-three-months"]),
    retirement: unfilled(r, ["retirement"]),
    goals: unfilled(r, ["near-dated", "education", "milestones"]),
  };
  let left = freed;
  const defaults = new Map<RoomDestination, number>();
  for (const k of ROOM_ORDER) {
    const x = Math.max(0, Math.min(left, needed[k]));
    defaults.set(k, x);
    left -= x;
  }
  defaults.set("retirement", defaults.get("retirement")! + Math.max(0, left));
  const destRow = (k: RoomDestination, monthly: number): RoomDestinationRow => {
    if (k.startsWith("group:")) {
      const g = k.slice("group:".length) as BudgetGroupKey;
      return { key: k, label: `Spend more on ${catalogueGroup(g).label}`, step: null, neededMonthly: null, monthly };
    }
    const [step, label] = STEP_LABELS[k as (typeof ROOM_ORDER)[number]];
    return { key: k, label, step, neededMonthly: needed[k as (typeof ROOM_ORDER)[number]], monthly };
  };
  const defaultSplit = ROOM_ORDER.filter((k) => k !== "shortfall" || needed.shortfall > 0).map((k) => destRow(k, defaults.get(k)!));

  // ---- the custom split, validated
  const customIn = input.split ?? null;
  const custom = !!customIn && Object.keys(customIn).length > 0;
  let split = defaultSplit;
  if (custom) {
    const problems: string[] = [];
    for (const [k, v] of Object.entries(customIn!)) {
      if (!isRoomDestination(k)) problems.push(`Make room: ${k} is not a destination`);
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0) problems.push(`Make room: the amount for ${k} must be a number, not negative`);
    }
    if (problems.length) throw new LifeCaseFactsError(problems);
    const total = Object.values(customIn!).reduce((a: number, v) => a + (v ?? 0), 0);
    if (total > freed + SPLIT_TOLERANCE) {
      throw new LifeCaseFactsError([`Make room: the split gives $${total.toFixed(2)} a month, more than the $${freed.toFixed(2)} freed`]);
    }
    const keys = [...ROOM_ORDER.filter((k) => k in customIn!), ...Object.keys(customIn!).filter((k) => k.startsWith("group:"))] as RoomDestination[];
    split = keys.map((k) => destRow(k, customIn![k] ?? 0));
  }
  const assigned = split.reduce((a, d) => a + d.monthly, 0);
  const get = (k: RoomDestination): number => split.find((d) => d.key === k)?.monthly ?? 0;

  // ---- what "Use this plan" does
  const spendMore = (k: BudgetGroupKey): number => get(`group:${k}`);
  const groupsAfter = groups.map((g) => ({ key: g.key, todayMonthly: g.todayMonthly, afterMonthly: g.targetMonthly + spendMore(g.key) }));
  for (const d of split) {
    if (!d.key.startsWith("group:")) continue;
    const k = d.key.slice("group:".length) as BudgetGroupKey;
    if (!groupsAfter.some((g) => g.key === k)) groupsAfter.push({ key: k, todayMonthly: 0, afterMonthly: d.monthly });
  }
  const spendMoreNeeds = split.filter((d) => d.key.startsWith("group:")).reduce((a, d) => a + d.monthly, 0);
  const after = rangeAfter(b, r, -freedNeeds + spendMoreNeeds);
  const insAfter = after.noPlan ? 0 : Math.min(after.max, Math.max(after.min, capNow + get("protection")));
  const target = [...expensive].sort((x, y) => y.ratePct - x.ratePct)[0];
  const extraBefore = r.facts.debts.extraMonthly;
  const debtTarget = target ? (() => {
    const index = r.facts.debts.items.indexOf(target);
    const at = (pay: number): string | null => { const n = payoffMonths(target.balance, target.ratePct, pay); return n === null ? null : addMonths(r.debtPayoff.asOfMonth, n); };
    return { index, label: target.label, payoffBefore: at(target.minimumMonthly + extraBefore), payoffAfter: at(target.minimumMonthly + extraBefore + get("debt")) };
  })() : null;
  b.rule("freed money is filled in plan order: one month saved, the insurance floor and budget, expensive debt, three months saved, retirement and goals");
  return {
    groups,
    suggestions: groups.filter((g) => g.suggestedMonthly !== null).sort((x, y) => y.aboveByMonthly - x.aboveByMonthly),
    freedMonthly: freed,
    defaultSplit,
    split,
    custom,
    assignedMonthly: assigned,
    notGivenAJobMonthly: Math.max(0, freed - assigned),
    effects: {
      groupsAfter,
      insuranceBudgetBeforeMonthly: capNow,
      insuranceBudgetMonthly: insAfter,
      debtExtraBeforeMonthly: extraBefore,
      debtExtraMonthly: extraBefore + get("debt"),
      debtTarget,
      shortfallMonthly: get("shortfall"),
      bufferMonthly: get("buffer"),
      emergencyMonthly: get("emergency"),
      retirementMonthly: get("retirement"),
      goalsMonthly: get("goals"),
    },
    provenance: b.build(),
  };
}

/** What the ladder already gives an item (the expensive-debt extra already paid). */
function allocatedTo(r: FactFinderResult, key: string): number {
  return r.closing.ladder.items.find((s) => s.key === key)?.allocated ?? 0;
}

/**
 * Scale a group's lines to a new monthly figure. Lines without a stop tag or a parent are cut first; tagged lines (the
 * mortgage, children, work, a parent's care) only when those are used up. A raise adds one "More from Make room" line.
 */
function resizeGroup(b: ProvenanceBuilder, g: BudgetGroupFacts, afterMonthly: number): BudgetGroupFacts {
  if (g.skip) return { ...g, total: afterMonthly, totalFrequency: "monthly" };
  const monthly = (l: BudgetLineFacts): number => toMonthly(b, l.amount, l.frequency);
  const today = g.lines.reduce((a, l) => a + monthly(l), 0);
  if (afterMonthly > today + MONEY_TOLERANCE) {
    return { ...g, lines: [...g.lines, { label: "More from Make room", amount: afterMonthly - today, frequency: "monthly" }] };
  }
  let cut = Math.max(0, today - afterMonthly);
  const free = (l: BudgetLineFacts): boolean => !l.stop && l.personId === undefined;
  const scale = (lines: BudgetLineFacts[], pick: (l: BudgetLineFacts) => boolean): BudgetLineFacts[] => {
    const pool = lines.filter(pick).reduce((a, l) => a + monthly(l), 0);
    if (pool <= 0 || cut <= 0) return lines;
    const take = Math.min(cut, pool);
    cut -= take;
    const k = (pool - take) / pool;
    return lines.map((l) => (pick(l) ? { ...l, amount: l.amount * k } : l));
  };
  return { ...g, lines: scale(scale([...g.lines], free), (l) => !free(l)) };
}

/**
 * "Use this plan" (§6.3.4): the facts and options for the "With your plan" run, beside the real numbers. Money given to
 * a group raises that group; protection raises the insurance budget (`options.budgetMonthly`, inside the new range);
 * extra on expensive debt raises `debts.extraMonthly`; buffer, emergency fund, retirement and goals money is shown from
 * `RoomPlanResult.effects`. The real facts are not changed.
 */
export function applyRoomPlan(facts: LifeCaseFacts, plan: RoomPlanResult): { readonly facts: LifeCaseFacts; readonly options: Pick<FactFinderOptions, "budgetMonthly"> } {
  const b = new ProvenanceBuilder();
  const byKey = new Map(plan.effects.groupsAfter.map((g) => [g.key, g]));
  const groups = facts.budget.groups.map((g) => {
    const a = byKey.get(g.key);
    return a && Math.abs(a.afterMonthly - a.todayMonthly) > MONEY_TOLERANCE ? resizeGroup(b, g, a.afterMonthly - (a.todayMonthly - lineMonthly(b, g))) : g;
  });
  for (const a of plan.effects.groupsAfter) {
    if (!facts.budget.groups.some((g) => g.key === a.key) && a.afterMonthly > 0) {
      groups.push({ key: a.key, skip: false, total: null, totalFrequency: null, lines: [{ label: "More from Make room", amount: a.afterMonthly, frequency: "monthly" }] });
    }
  }
  const applied: LifeCaseFacts = {
    ...facts,
    budget: { ...facts.budget, groups, roomPlan: facts.budget.roomPlan ? { ...facts.budget.roomPlan, applied: true } : null },
    debts: { ...facts.debts, extraMonthly: plan.effects.debtExtraMonthly },
  };
  const ins = plan.effects.insuranceBudgetMonthly;
  if (ins <= 0) return { facts: applied, options: { budgetMonthly: null } };
  const range = computeFactFinder(applied).closing.ladder.insuranceRange;
  return { facts: applied, options: { budgetMonthly: range.noPlan ? null : Math.min(range.maxMonthly, Math.max(range.minMonthly, ins)) } };
}

/** A group's lines a month, as entered (a parent's line at its budget amount). */
function lineMonthly(b: ProvenanceBuilder, g: BudgetGroupFacts): number {
  if (g.skip) return toMonthly(b, g.total ?? 0, g.totalFrequency ?? "monthly");
  return g.lines.reduce((a, l) => a + toMonthly(b, l.amount, l.frequency), 0);
}
