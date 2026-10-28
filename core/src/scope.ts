/**
 * The scope statement — the liability record (closing brief §6; Section 1 §1.1 `life_case_scope`).
 * Every gap ends in exactly one state: acted on, declined (with date), or out of scope; a gap with no
 * record is "not reviewed". Rows are append-only; the latest row for a gap decides its state.
 *
 * Also the snapshot written at "start the application" (`life_case_snapshots`, insert-only).
 * Neither a scope row nor a snapshot may carry a health answer (Section 1 guard 8).
 */
import { ClosingInputError } from "./errors.ts";
import { assertNoHealthKeys } from "./life-case-facts.ts";
import type { RoomPlanRecord } from "./room-plan.ts";

export type ScopeState = "acted" | "declined" | "out_of_scope";
export type ScopeLineState = ScopeState | "not_reviewed";

export interface ScopeRow {
  readonly gapKey: string;
  readonly state: ScopeState;
  readonly note: string | null;
  /** ISO timestamp, passed in (the engine reads no clock). */
  readonly recordedAt: string;
}

export interface ScopeGap {
  readonly gapKey: string;
  readonly label: string;
}

export interface ScopeLine extends ScopeGap {
  readonly state: ScopeLineState;
  readonly recordedAt: string | null;
  readonly note: string | null;
}

export interface ScopeStatement {
  /** Every gap, exactly once, in gap order. */
  readonly lines: readonly ScopeLine[];
  readonly acted: readonly ScopeLine[];
  readonly declined: readonly ScopeLine[];
  readonly outOfScope: readonly ScopeLine[];
  readonly notReviewed: readonly ScopeLine[];
  /** Requests recorded as declined that are not gaps (cross-tier reorders). */
  readonly declinedRequests: readonly ScopeRow[];
}

const STATES = new Set<ScopeState>(["acted", "declined", "out_of_scope"]);
const ISO = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:\d{2})?)?$/;

export function scopeRow(gapKey: string, state: ScopeState, recordedAt: string, note: string | null = null): ScopeRow {
  const r: ScopeRow = { gapKey, state, note, recordedAt };
  validateScopeRow(r);
  return Object.freeze(r);
}

export function validateScopeRow(r: unknown): asserts r is ScopeRow {
  assertNoHealthKeys(r, "scope row");
  const x = r as Partial<ScopeRow>;
  if (typeof x.gapKey !== "string" || !x.gapKey) throw new ClosingInputError("scope row needs a gapKey");
  if (!STATES.has(x.state as ScopeState)) throw new ClosingInputError(`scope row state must be acted, declined or out_of_scope, not ${String(x.state)}`);
  if (typeof x.recordedAt !== "string" || !ISO.test(x.recordedAt)) throw new ClosingInputError("scope row needs an ISO recordedAt date");
}

export function buildScopeStatement(gaps: readonly ScopeGap[], rows: readonly ScopeRow[]): ScopeStatement {
  const known = new Set(gaps.map((g) => g.gapKey));
  if (known.size !== gaps.length) throw new ClosingInputError("gap keys must be unique");
  const latest = new Map<string, ScopeRow>();
  const requests: ScopeRow[] = [];
  for (const r of rows) {
    validateScopeRow(r);
    if (r.gapKey.startsWith("reorder:")) { requests.push(r); continue; }
    if (!known.has(r.gapKey)) throw new ClosingInputError(`scope row for an unknown gap: ${r.gapKey}`);
    const prev = latest.get(r.gapKey);
    if (!prev || r.recordedAt >= prev.recordedAt) latest.set(r.gapKey, r);
  }
  const lines: ScopeLine[] = gaps.map((g) => {
    const r = latest.get(g.gapKey);
    return { ...g, state: r ? r.state : "not_reviewed", recordedAt: r ? r.recordedAt : null, note: r ? r.note : null };
  });
  return {
    lines,
    acted: lines.filter((l) => l.state === "acted"),
    declined: lines.filter((l) => l.state === "declined"),
    outOfScope: lines.filter((l) => l.state === "out_of_scope"),
    notReviewed: lines.filter((l) => l.state === "not_reviewed"),
    declinedRequests: requests.filter((r) => r.state === "declined"),
  };
}

/* ------------------------------------------------------------------ snapshot */

export interface LifeCaseSnapshot<C> {
  readonly kind: "life_case_snapshot";
  readonly assumptionSetId: string;
  /** The pinned engine hash the page vendored (its PINNED.txt). */
  readonly engineVersion: string;
  readonly closing: C;
  readonly scope: ScopeStatement;
}

/**
 * Freeze what was shown at the close. Premium figures inside are bands with their label, never prices
 * (Section 2 §2.5.4). Throws if anything carries a health answer.
 *
 * With a Make room plan in use, `roomPlan` (from `roomPlanRecord`) is kept inside the closing JSON as
 * `closing.roomPlan`, so the one-page plan prints both versions from the snapshot (Section 3 fix run, Change 4).
 * No new column: it is part of `closing`.
 */
export function buildSnapshot<C>(input: { closing: C; scope: ScopeStatement; assumptionSetId: string; engineVersion: string; roomPlan?: RoomPlanRecord | null }): LifeCaseSnapshot<C & { roomPlan?: RoomPlanRecord }> {
  if (!input.engineVersion) throw new ClosingInputError("a snapshot needs the pinned engine version");
  const closing = input.roomPlan ? { ...(input.closing as object), roomPlan: input.roomPlan } : input.closing;
  const snap = JSON.parse(JSON.stringify({
    kind: "life_case_snapshot", assumptionSetId: input.assumptionSetId, engineVersion: input.engineVersion,
    closing, scope: input.scope,
  })) as LifeCaseSnapshot<C & { roomPlan?: RoomPlanRecord }>;
  assertNoHealthKeys(snap, "snapshot");
  return snap;
}
