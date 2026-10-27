/**
 * The priority ladder (closing addendum §11, Option B): tier boundaries hard, order inside a tier soft.
 *
 * Tier 0 preconditions; tier 1 irreversible and losable (life to the ruin level, CI, parent funerals);
 * the §11.3 token annuity; tier 2 reversible and near-dated; tier 3 reversible and far-dated.
 * Two passes: minimums top down, then fulls top down. Insurance items together never exceed the
 * triage stage ceiling (closing guard 3). At stage 0 there is no basket, only what would change it.
 * A reorder across tiers is recorded as declined and the order is unchanged (closing guard 12).
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
}

export interface LadderItem extends LadderItemSpec {
  /** What this item gets a month. */
  readonly allocated: number;
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
  const give = (s: LadderItemSpec, want: number): void => {
    const room = s.insurance ? Math.min(left, capLeft) : left;
    const x = Math.max(0, Math.min(room, want));
    got.set(s.key, got.get(s.key)! + x);
    left -= x;
    if (s.insurance) capLeft -= x;
  };
  for (const s of ordered) give(s, s.min);
  for (const s of ordered) give(s, Math.max(0, s.full - got.get(s.key)!));
  b.rule("pass one fills minimums top down; pass two fills fulls top down");
  const items = ordered.map((s) => ({ ...s, allocated: got.get(s.key)! }));
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
