import { P, assertSafe } from "../../parameters/tt-parameters.js";
import type { Provenance } from "./types.ts";

/** Read a dotted parameter path, returning both the node (for provenance) and its value. */
export function resolveParameter(path: string): { node: any; value: unknown } {
  let node: any = P;
  for (const key of path.split(".")) {
    if (node == null || typeof node !== "object" || !(key in node)) {
      throw new Error(`Unknown parameter path: "${path}"`);
    }
    node = node[key];
  }
  return { node, value: node?.value };
}

/**
 * Accumulates the audit trail for one computation.
 * Every parameter read goes through `.use()` so nothing enters a result
 * without its effective date, source and status coming with it.
 */
export class ProvenanceBuilder {
  #params = new Map<string, Provenance["parameters"][number]>();
  #caveats: string[] = [];
  #rules: string[] = [];

  /** Read a parameter, record its provenance, and refuse unsafe statuses. */
  use(path: string): unknown {
    const { node, value } = resolveParameter(path);
    assertSafe(node, path);
    if (!this.#params.has(path)) {
      this.#params.set(path, {
        path,
        effective: node.effective ?? null,
        source: node.source ?? null,
        status: node.status ?? "UNMARKED",
      });
    }
    return value;
  }

  caveat(msg: string): void {
    if (!this.#caveats.includes(msg)) this.#caveats.push(msg);
  }

  rule(msg: string): void {
    if (!this.#rules.includes(msg)) this.#rules.push(msg);
  }

  build(): Provenance {
    const parameters = [...this.#params.values()]
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((p) => Object.freeze({ ...p }));
    return Object.freeze({
      parameters: Object.freeze(parameters),
      caveats: Object.freeze([...this.#caveats]),
      rulesFired: Object.freeze([...this.#rules]),
    }) as Provenance;
  }
}
