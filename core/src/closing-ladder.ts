/**
 * The priority ladder (closing addendum §11, Option B): tier boundaries hard, order inside a tier soft.
 *
 * Tier 0 preconditions; tier 1 irreversible and losable (life to the ruin level, parent funerals,
 * CI, disability income, own final expense); the §11.3 token annuity; tier 2 reversible and
 * near-dated; tier 3 reversible and far-dated.
 * Two passes: minimums top down, then fulls top down. Insurance items together never exceed the
 * triage stage ceiling (closing guard 3). An insurance item gets its minimum or nothing: when its
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
  readonly insuranceCeilingMonthly: number;
  readonly insuranceAllocated: number;
  /** Precondition not captured by the fact-finder (compulsory motor third-party). */
  readonly preconditionsNotCaptured: readonly string[];
}

const TIER_ORDER: readonly LadderTier[] = [0, 1, 1.5, 2, 3];

/** Stable default order: by tier, then as given. */
export function defaultOrder(specs: readonly LadderItemSpec[]): string[] {
  return TIER_ORDER.flatMap((t) => specs.filter((s) => s.tier === t).map((s) => s.key));
}

export function allocateLadder(budget: HouseholdBudget, specs: readonly LadderItemSpec[], order?: readonly string[]): Ladder {
  const b = new ProvenanceBuilder();
  if (budget.stage === 0) {
    return {
      underwater: true,
      whatWouldChange: { shortfallMonthly: budget.shortfallMonthly, hoursAtMinimumWage: budget.hoursAtMinimumWage },
      items: [], budgetMonthly: 0, insuranceCeilingMonthly: 0, insuranceAllocated: 0,
      preconditionsNotCaptured: ["Compulsory motor third-party cover"],
    };
  }
  const keys = order ?? defaultOrder(specs);
  const byKey = new Map(specs.map((s) => [s.key, s]));
  const ordered = keys.map((k) => byKey.get(k)!).filter(Boolean);
  let left = Math.max(0, budget.surplusMonthly);
  let capLeft = budget.ceilingMonthly;
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
    insuranceCeilingMonthly: budget.ceilingMonthly,
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
