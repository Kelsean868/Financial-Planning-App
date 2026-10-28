import { P, assertSafe } from "../../parameters/tt-parameters.js";
import type { Provenance, ProvenanceParameter } from "./types.ts";

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
  #params = new Map<string, ProvenanceParameter>();
  #caveats: string[] = [];
  #rules: string[] = [];

  /**
   * Read a parameter, record its provenance, and refuse unsafe statuses —
   * returning the whole node, not just its value.
   *
   * Some parameters carry a `warning` the client must be told (group life's
   * "other T&T carriers' schemes may differ"). Reaching for that warning via a
   * second, unrecorded read of `P` is exactly the bypass this class exists to
   * close, so the recorded read hands the node back instead.
   */
  useNode(path: string): { node: any; value: unknown } {
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
    return { node, value };
  }

  /** Read a parameter's value, recording its provenance. */
  use(path: string): unknown {
    return this.useNode(path).value;
  }

  caveat(msg: string): void {
    if (!this.#caveats.includes(msg)) this.#caveats.push(msg);
  }

  rule(msg: string): void {
    if (!this.#rules.includes(msg)) this.#rules.push(msg);
  }

  /**
   * Fold another engine's provenance into this one.
   *
   * Engines compose (needs -> gap), so their provenance must compose too. A Gap
   * that dropped the death engine's housing-inference caveat would present a
   * number without the uncertainty that qualifies it — which is the failure the
   * provenance system exists to prevent.
   */
  merge(p: Provenance): this {
    for (const param of p.parameters) {
      if (!this.#params.has(param.path)) this.#params.set(param.path, { ...param });
    }
    for (const c of p.caveats) this.caveat(c);
    for (const r of p.rulesFired) this.rule(r);
    return this;
  }

  build(): Provenance {
    const parameters = [...this.#params.values()]
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((p) => Object.freeze({ ...p }));
    return Object.freeze({
      parameters: Object.freeze(parameters),
      caveats: Object.freeze([...this.#caveats]),
      rulesFired: Object.freeze([...this.#rules]),
    });
  }
}
