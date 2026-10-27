/**
 * The core parameter registry. `ProvenanceBuilder` resolves any path that starts with
 * `core:` against these tables (review finding F3). The root `parameters/tt-parameters.json`
 * stays the source for the July modules and for the T&T statutory rows it already holds.
 */
import { FF, ASSUMPTION_SET_ID } from "./fact-finder-2026-10.ts";
import { PRODUCTS, RIDERS, VEHICLES, ANNUITY_LEVERS } from "./tatil-products-2026-10.ts";
import { RETIREMENT } from "./retirement-2026-10.ts";
import { isRow, type Row } from "./row.ts";

export const CORE_TABLES = Object.freeze({
  ff: FF,
  products: PRODUCTS,
  riders: RIDERS,
  vehicles: VEHICLES,
  annuityLevers: ANNUITY_LEVERS,
  retirement: RETIREMENT,
});

export const CORE_PREFIX = "core:";

/** Resolve `core:<table>.<path>` to its row. Throws on an unknown path or a non-row node. */
export function resolveCoreRow(path: string): Row<unknown> {
  if (!path.startsWith(CORE_PREFIX)) throw new Error(`Not a core parameter path: "${path}"`);
  let node: unknown = CORE_TABLES;
  for (const key of path.slice(CORE_PREFIX.length).split(".")) {
    if (node == null || typeof node !== "object" || !(key in (node as object))) {
      throw new Error(`Unknown parameter path: "${path}"`);
    }
    node = (node as Record<string, unknown>)[key];
  }
  if (!isRow(node)) throw new Error(`Parameter path "${path}" is a group, not a row`);
  return node;
}

/** Every row path in the core tables, for audits and the provenance tests. */
export function coreRowPaths(): string[] {
  const out: string[] = [];
  const walk = (node: unknown, path: string): void => {
    if (isRow(node)) { out.push(path); return; }
    if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k);
    }
  };
  walk(CORE_TABLES, "");
  return out.map((p) => CORE_PREFIX + p);
}

export { ASSUMPTION_SET_ID };
export type { Row, RowStatus } from "./row.ts";
