/**
 * Registered against unregistered (addendum §12) and return assumptions (addendum §13).
 *
 * - §12.3: registered only when the client pays tax, is 50+ at the goal, and has cap headroom.
 *   Below the personal allowance it is a hard block: the engine refuses (guard 9).
 * - §12.2: a registered withdrawal before maturity is taxed at 25% of the amount; gross-up need / 0.75 (guard 10).
 * - §13: two figures per vehicle — the contractual floor ("guaranteed") and the advisor-set planning
 *   rate. No projected return is ever shown as a product figure (guard 11).
 */
import { ProvenanceBuilder } from "./provenance.ts";
import { RegisteredRoutingError } from "./errors.ts";
import type { VehicleSpec } from "./parameters/tatil-products-2026-10.ts";

export interface RegisteredClient {
  readonly paysTax: boolean;
  /** Gross employment income a year; the allowance test (§12.3 hard block). */
  readonly grossAnnual: number;
  /** Unused room in the TT$60,000 aggregate, a year. */
  readonly capHeadroomAnnual: number;
}

export interface RegisteredGoal {
  /** Client's age when the money is needed. */
  readonly ageAtGoal: number;
}

export type AnnuityMode = "registered" | "unregistered";

export interface AnnuityRouting {
  readonly mode: AnnuityMode;
  readonly registeredEligible: boolean;
  /** True below the personal allowance: registered is refused, not warned. */
  readonly hardBlocked: boolean;
  readonly reasons: readonly string[];
  readonly maturityRange: { readonly from: number; readonly to: number };
}

/** §12.3, exactly: paysTax && ageAtGoal >= 50 && capHeadroom > 0. */
export function registeredEligible(b: ProvenanceBuilder, goal: RegisteredGoal, client: RegisteredClient): boolean {
  const floorAge = b.num("annuities.statutory_maturity_floor");
  return client.paysTax && goal.ageAtGoal >= floorAge && client.capHeadroomAnnual > 0;
}

/** §12.3 hard block: below the personal allowance there is no registered routing at all. */
export function belowAllowance(b: ProvenanceBuilder, client: RegisteredClient): boolean {
  return client.grossAnnual <= b.num("income_tax.personal_allowance");
}

export function routeAnnuity(b: ProvenanceBuilder, goal: RegisteredGoal, client: RegisteredClient): AnnuityRouting {
  const reasons: string[] = [];
  const blocked = belowAllowance(b, client);
  const exemption = b.get<{ min_age: number; max_age: number }>("annuities.exemption_window");
  const unregTo = b.num("core:ff.closing.unregisteredMaturityTo");
  if (blocked) reasons.push("Income is below the personal allowance, so a registered plan gives no relief. Registered is not offered.");
  const eligible = !blocked && registeredEligible(b, goal, client);
  if (!blocked && !client.paysTax) reasons.push("No income tax is paid, so there is no relief to claim.");
  if (!blocked && goal.ageAtGoal < exemption.min_age) reasons.push("The money is needed before 50. A registered withdrawal before maturity is taxed at 25%, so registered always loses here.");
  if (!blocked && client.capHeadroomAnnual <= 0) reasons.push("The TT$60,000 deduction limit is already used.");
  const mode: AnnuityMode = eligible ? "registered" : "unregistered";
  return {
    mode, registeredEligible: eligible, hardBlocked: blocked, reasons,
    maturityRange: mode === "registered" ? { from: exemption.min_age, to: exemption.max_age } : { from: exemption.min_age, to: unregTo },
  };
}

/** Force a registered routing; refuses (throws) for any client the rules exclude. */
export function requireRegistered(b: ProvenanceBuilder, goal: RegisteredGoal, client: RegisteredClient): AnnuityRouting {
  const r = routeAnnuity(b, goal, client);
  if (r.mode !== "registered") throw new RegisteredRoutingError(`Registered routing refused: ${r.reasons.join(" ")}`);
  return r;
}

/** §12.2: to net `need` from a registered withdrawal before maturity, withdraw need / (1 − 25%). */
export function registeredWithdrawalGrossUp(b: ProvenanceBuilder, need: number): number {
  return need / (1 - b.num("core:ff.closing.registeredWithdrawalTax"));
}

/* ------------------------------------------------------------------ §13 floors */

export interface VehicleFigures {
  readonly vehicle: VehicleSpec;
  /** Contractual, shown as "guaranteed". */
  readonly guaranteedFloor: number;
  /** Advisor-set, shown as "advisor-set". Never a product figure. */
  readonly planningRate: number;
  readonly planningRateLabel: "advisor-set";
  readonly wording: string | null;
}

export const ADVENTURER_WORDING =
  "Your money cannot go down. There is no promised growth, which is why the upside is the highest of the three.";

export function vehicleFigures(b: ProvenanceBuilder, vehicleId: "destiny-settler" | "destiny-explorer" | "destiny-adventurer" | "platinum-edge"): VehicleFigures {
  const v = b.get<VehicleSpec>(`core:vehicles.${vehicleId}`);
  return {
    vehicle: v,
    guaranteedFloor: v.floor,
    planningRate: b.num("core:ff.rates.planningReturn"),
    planningRateLabel: "advisor-set",
    wording: v.capitalProtected ? ADVENTURER_WORDING : null,
  };
}

/** Monthly saving that reaches `target` in `years` at an annual rate, monthly compounding at rate/12. */
export function monthlyToReach(rate: number, target: number, years: number): number {
  const m = rate / 12;
  const n = years * 12;
  return m === 0 ? target / n : target * m / (Math.pow(1 + m, n) - 1);
}

/** Value of a level monthly saving after `years` at an annual rate, monthly compounding at rate/12. */
export function valueOfSaving(rate: number, monthly: number, years: number): number {
  const m = rate / 12;
  const n = years * 12;
  return m === 0 ? monthly * n : monthly * (Math.pow(1 + m, n) - 1) / m;
}

export interface FloorStress {
  readonly vehicleId: string;
  readonly floor: number;
  /** "If this delivers only the guaranteed X%, you would be short $shortBy ..." */
  readonly shortBy: number;
  /** "... or need $extraMonthly more each month." */
  readonly extraMonthly: number;
  readonly sentence: string;
}

/** Size on the planning rate; stress against the floor (§13). */
export function stressAgainstFloor(b: ProvenanceBuilder, vehicleId: Parameters<typeof vehicleFigures>[1], monthly: number, target: number, years: number): FloorStress {
  const f = vehicleFigures(b, vehicleId);
  const reached = valueOfSaving(f.guaranteedFloor, monthly, years);
  const shortBy = Math.max(0, target - reached);
  const extraMonthly = Math.max(0, monthlyToReach(f.guaranteedFloor, target, years) - monthly);
  const pct = `${Math.round(f.guaranteedFloor * 1000) / 10}%`;
  return {
    vehicleId, floor: f.guaranteedFloor, shortBy, extraMonthly,
    sentence: `If this delivers only the guaranteed ${pct}, you would be short $${Math.round(shortBy).toLocaleString("en-US")}, or need $${Math.round(extraMonthly).toLocaleString("en-US")} more each month.`,
  };
}
