/**
 * The priority ladder (closing addendum §11, Option B): tier boundaries hard, order inside a tier soft.
 *
 * Tier 0 preconditions; tier 1 irreversible and losable (life to the ruin level, CI, parent funerals,
 * disability income, own final expense); the §11.3 token annuity; tier 2 reversible and
 * near-dated; tier 3 reversible and far-dated.
 * Two passes: minimums top down, then fulls top down. Insurance items together are capped at the
 * band's recommended figure (Kyron, Decision 5 = A, 27 Oct 2026), or at the insurance budget the client
 * set on the slider, inside the band (Decision 8 = B, 27 Oct 2026; guard 23: never above the cap in use),
 * so they never exceed the triage stage ceiling either (closing guard 3). An insurance item gets its minimum or nothing: when its
 * minimum does not fit, it is "not yet" and the ladder moves on to the next item (guard 22: no
 * unbuyable plan). Non-insurance items take what is left, in part if need be.
 * At stage 0 there is no basket, only what would change it.
 * A reorder across tiers is recorded as declined and the order is unchanged (closing guard 12).
 *
 * This is the only allocator for protection: the insurance budget's Protection group is built
 * from these items (guard 21).
 */
import { ProvenanceBuilder } from "./provenance.ts";
import type { HouseholdBudget } from "./household-budget.ts";
import { scopeRow, type ScopeRow } from "./scope.ts";
import { ClosingInputError } from "./errors.ts";
import type { ProductId } from "./parameters/tatil-products-2026-10.ts";

export type LadderTier = 0 | 1 | 1.5 | 2 | 3;

export interface LadderItemSpec {
  readonly key: string;
  readonly tier: LadderTier;
  readonly label: string;
  readonly min: number;
  readonly full: number;
  /** Insurance premiums share the stage ceiling. */
  readonly insurance: boolean;
  /** Insurance only: the item whose plan this one adds to; it gets nothing unless that item is funded. */
  readonly addsTo?: string;
  /** Insurance only: the product the plan is written on, chosen on the insured's rated age (guard 24). */
  readonly product?: ProductId;
}

export interface LadderItem extends LadderItemSpec {
  /** What this item gets a month. */
  readonly allocated: number;
  /** Insurance only: its minimum did not fit, so it waits with the minimum it needs. */
  readonly notYet: boolean;
}

export interface Ladder {
  readonly underwater: boolean;
  /** Stage 0 only: what would change the picture. */
  readonly whatWouldChange: { readonly shortfallMonthly: number; readonly hoursAtMinimumWage: number } | null;
  readonly items: readonly LadderItem[];
  readonly budgetMonthly: number;
  /** What insurance items may take together: the slider's amount, else the band's recommended figure. */
  readonly insuranceCapMonthly: number;
  /** The triage stage ceiling, kept as a guard (closing guard 3: insurance ≤ max(ceiling, floor) since Section 3). */
  readonly insuranceCeilingMonthly: number;
  /** The $200 floor, the slider's range, and the §5.3 / §5.4 states (Section 3 §5). */
  readonly insuranceRange: InsuranceRange;
  /** §5.3: the cap in use is above the stage ceiling (the ceiling is under $200, money left is $200 or more). */
  readonly aboveSafeRange: boolean;
  readonly insuranceAllocated: number;
  /** Precondition not captured by the fact-finder (compulsory motor third-party). */
  readonly preconditionsNotCaptured: readonly string[];
}

const TIER_ORDER: readonly LadderTier[] = [0, 1, 1.5, 2, 3];

/** Stable default order: by tier, then as given. */
export function defaultOrder(specs: readonly LadderItemSpec[]): string[] {
  return TIER_ORDER.flatMap((t) => specs.filter((s) => s.tier === t).map((s) => s.key));
}

/** Section 3 §5: the insurance budget the tool will plan, and why there is none. */
export interface InsuranceRange {
  /** `core:ff.insurance.floorMonthly`: $200. */
  readonly floorMonthly: number;
  /** Stage 0: costs above income. Unchanged by Section 3: no plan, only what would change the picture (§5.5). */
  readonly stage0: boolean;
  /** No insurance plan yet: stage 0, or money left after costs below the floor (§5.4). */
  readonly noPlan: boolean;
  /** §5.4: "To start the $200 minimum you need $X more a month." 0 unless money left is under the floor (stage > 0). */
  readonly shortByMonthly: number;
  /** The slider's range: the floor to max(ceiling, floor) (§5.2). Both 0 at stage 0. */
  readonly minMonthly: number;
  readonly maxMonthly: number;
  /** The cap with no slider: max(floor, recommended); 0 when there is no plan. */
  readonly defaultMonthly: number;
  readonly ceilingMonthly: number;
  readonly recommendedMonthly: number;
}

export function insuranceRange(budget: HouseholdBudget): InsuranceRange {
  const b = new ProvenanceBuilder();
  const floor = b.num("core:ff.insurance.floorMonthly");
  const stage0 = budget.stage === 0;
  const left = budget.surplusMonthly;
  const short = !stage0 && left < floor ? floor - left : 0;
  const noPlan = stage0 || short > 0;
  return {
    floorMonthly: floor, stage0, noPlan, shortByMonthly: short,
    minMonthly: stage0 ? 0 : floor,
    maxMonthly: stage0 ? 0 : Math.max(budget.ceilingMonthly, floor),
    defaultMonthly: noPlan ? 0 : Math.max(floor, budget.band.recommended),
    ceilingMonthly: budget.ceilingMonthly,
    recommendedMonthly: budget.band.recommended,
  };
}

/**
 * The insurance cap in use (F-18, Change 2; Section 3 §5). The slider's amount when given, else max($200, the band's
 * recommended figure). Guard 27 (Section 3 §14.3): an amount that is not a finite number, below the $200 floor, or above
 * max(ceiling, $200) throws `ClosingInputError`; it is never clamped. With money left under $200 there is no plan (§5.4):
 * a valid amount is accepted and the cap is 0. Stage 0 is unchanged (§5.5): the only amount it accepts is 0.
 */
export function insuranceCap(budget: HouseholdBudget, budgetMonthly?: number | null): number {
  const r = insuranceRange(budget);
  if (budgetMonthly === undefined || budgetMonthly === null) return r.stage0 ? budget.band.recommended : r.defaultMonthly;
  if (typeof budgetMonthly !== "number" || !Number.isFinite(budgetMonthly)) {
    throw new ClosingInputError(`The insurance budget must be a finite number of dollars a month; got ${String(budgetMonthly)}.`);
  }
  const lo = r.stage0 ? budget.band.floor : r.minMonthly;
  const hi = r.stage0 ? budget.band.ceiling : r.maxMonthly;
  if (budgetMonthly < lo - CAP_TOLERANCE || budgetMonthly > hi + CAP_TOLERANCE) {
    throw new ClosingInputError(`The insurance budget of ${budgetMonthly.toFixed(2)} a month is outside the range ${lo.toFixed(2)} to ${hi.toFixed(2)}.`);
  }
  return r.noPlan && !r.stage0 ? 0 : budgetMonthly;
}

/** Float noise only (a slider at its end stop returns the band figure as a decimal string). Not a clamp. */
const CAP_TOLERANCE = 1e-9;

/**
 * A stored order with the keys it lacks put back at their default place, after the nearest key that comes before them
 * in the default order. The spec list depends on the chosen card (life-beyond-ruin drops out when its full is 0), so an
 * order saved under one card can lack a key another card needs.
 */
export function completeOrder(specs: readonly LadderItemSpec[], order: readonly string[]): string[] {
  const def = defaultOrder(specs);
  const out = order.filter((k) => def.includes(k));
  for (const [i, k] of def.entries()) {
    if (out.includes(k)) continue;
    const prev = def.slice(0, i).reverse().find((p) => out.includes(p));
    out.splice(prev === undefined ? 0 : out.indexOf(prev) + 1, 0, k);
  }
  return out;
}

export function allocateLadder(budget: HouseholdBudget, specs: readonly LadderItemSpec[], order?: readonly string[], capMonthly?: number): Ladder {
  const b = new ProvenanceBuilder();
  const range = insuranceRange(budget);
  if (budget.stage === 0) {
    return {
      underwater: true,
      whatWouldChange: { shortfallMonthly: budget.shortfallMonthly, hoursAtMinimumWage: budget.hoursAtMinimumWage },
      items: [], budgetMonthly: 0, insuranceCapMonthly: 0, insuranceCeilingMonthly: 0, insuranceRange: range, aboveSafeRange: false,
      insuranceAllocated: 0, preconditionsNotCaptured: ["Compulsory motor third-party cover"],
    };
  }
  const keys = order ?? defaultOrder(specs);
  const byKey = new Map(specs.map((s) => [s.key, s]));
  const ordered = keys.map((k) => byKey.get(k)!).filter(Boolean);
  let left = Math.max(0, budget.surplusMonthly);
  const cap = range.noPlan ? 0 : capMonthly ?? range.defaultMonthly;
  let capLeft = cap;
  const got = new Map<string, number>(ordered.map((s) => [s.key, 0]));
  const notYet = new Set<string>();
  const roomFor = (s: LadderItemSpec): number => (s.insurance ? Math.min(left, capLeft) : left);
  const give = (s: LadderItemSpec, x: number): void => {
    got.set(s.key, got.get(s.key)! + x);
    left -= x;
    if (s.insurance) capLeft -= x;
  };
  /** An insurance plan exists once its minimum is paid (or it has none and the plan it adds to exists). */
  const planFunded = (s: LadderItemSpec): boolean =>
    s.min > 0 ? got.get(s.key)! > 0 : s.addsTo === undefined || (got.get(s.addsTo) ?? 0) > 0;
  for (const s of ordered) {
    if (s.min <= 0) continue;
    const room = roomFor(s);
    if (!s.insurance) give(s, Math.max(0, Math.min(room, s.min)));
    else if (s.min <= room + 1e-9) give(s, Math.min(room, s.min));
    else notYet.add(s.key);
  }
  for (const s of ordered) {
    if (s.insurance && !planFunded(s)) continue;
    give(s, Math.max(0, Math.min(roomFor(s), s.full - got.get(s.key)!)));
  }
  b.rule("pass one fills minimums top down; an insurance item gets its minimum or waits as 'not yet', and the ladder moves on; pass two fills fulls top down");
  const items = ordered.map((s) => ({ ...s, allocated: got.get(s.key)!, notYet: notYet.has(s.key) }));
  return {
    underwater: false,
    whatWouldChange: null,
    items,
    budgetMonthly: Math.max(0, budget.surplusMonthly),
    insuranceCapMonthly: cap,
    insuranceCeilingMonthly: budget.ceilingMonthly,
    insuranceRange: range,
    aboveSafeRange: cap > budget.ceilingMonthly + CAP_TOLERANCE,
    insuranceAllocated: items.filter((i) => i.insurance).reduce((a, i) => a + i.allocated, 0),
    preconditionsNotCaptured: ["Compulsory motor third-party cover"],
  };
}

export interface ReorderResult {
  readonly order: readonly string[];
  /** A declined scope record when the request crossed a tier; empty otherwise. */
  readonly declined: readonly ScopeRow[];
}

/**
 * Option B: move `itemKey` to `toIndex` in the order. Inside a tier it moves; across a tier it does
 * not, and a declined record is written instead (addendum §11.5, Section 1: a `life_case_scope` row).
 */
export function requestReorder(
  specs: readonly LadderItemSpec[], order: readonly string[], itemKey: string, toIndex: number, recordedAt: string,
): ReorderResult {
  const tierOf = new Map(specs.map((s) => [s.key, s.tier]));
  const from = order.indexOf(itemKey);
  const target = order[toIndex];
  if (from < 0 || target === undefined) throw new Error(`Unknown ladder item or position: ${itemKey} → ${toIndex}`);
  if (tierOf.get(target) !== tierOf.get(itemKey)) {
    return {
      order: [...order],
      declined: [scopeRow(`reorder:${itemKey}`, "declined", recordedAt, `Asked to move "${itemKey}" across a tier (to before "${target}"). Tiers are fixed; recorded as declined.`)],
    };
  }
  const next = [...order];
  next.splice(from, 1);
  next.splice(toIndex, 0, itemKey);
  return { order: next, declined: [] };
}

export { TIER_ORDER };
