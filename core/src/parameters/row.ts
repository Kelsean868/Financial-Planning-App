/**
 * One row of a core parameter table. Every value the fact-finder engine computes with
 * is a row: it carries where it came from (`source`), the date it was true on (`asOf`)
 * and how far it can be trusted (`status`). Section 2 §2.4.
 *
 * The engine reads rows only through `ProvenanceBuilder.use("core:<table>.<path>")`,
 * so reading a number and recording its provenance are one act for the new modules.
 */
export type RowStatus =
  /** A published fact, with its source. */
  | "verified"
  /** A decision by Kyron recorded in a signed spec. */
  | "rule"
  /** A planning assumption. Its source says whose. */
  | "assumed"
  /** A rough figure for shape only. Never a price. */
  | "estimate"
  /** A default the advisor may change. Shown as "advisor-set". */
  | "advisor-set"
  /** Could not be verified. The value is null and the engine refuses to read it. */
  | "unverified";

export interface Row<T> {
  readonly value: T;
  readonly source: string;
  /** ISO date the value was true on, or the date it was recorded. */
  readonly asOf: string;
  readonly status: RowStatus;
  /** Told to the reader wherever the row is used (e.g. a conflict with another table). */
  readonly caveat?: string;
  readonly note?: string;
}

export function row<T>(
  value: T,
  status: RowStatus,
  source: string,
  asOf: string,
  extra: { caveat?: string; note?: string } = {},
): Row<T> {
  return { value, status, source, asOf, ...extra };
}

/** A row the audit could not verify: no value, and the builder refuses to read it. */
export function unverified(source: string, asOf: string, note: string): Row<null> {
  return { value: null, status: "unverified", source, asOf, note };
}

export function deepFreeze<T>(o: T): T {
  if (o && typeof o === "object" && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as object)) deepFreeze(v);
  }
  return o;
}

export function isRow(node: unknown): node is Row<unknown> {
  return !!node && typeof node === "object" && "status" in node && "asOf" in node && "source" in node && "value" in node;
}
