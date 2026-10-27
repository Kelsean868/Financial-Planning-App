/**
 * Pension from work as a retirement income source (pension audit 27 Oct 2026; Section 2 fence 7).
 * Public service: 1/600 of salary per month of service, 400-month cap, $3,500 minimum, retirement
 * capped at 60, 10-year minimum; the full pension, or a reduced pension plus a gratuity.
 * Values are rows in `core/src/parameters/retirement-2026-10.ts`. `needs/retirement.ts` is not
 * changed in this run (run record R11).
 */
import { ProvenanceBuilder } from "../provenance.ts";
import type { WorkPensionFacts } from "../life-case-facts.ts";

export interface WorkPension {
  readonly kind: WorkPensionFacts["kind"];
  /** Monthly pension paid from `startsAtAge`. */
  readonly monthly: number;
  readonly startsAtAge: number;
  /** Public service only. */
  readonly publicService: {
    readonly monthsOfService: number;
    readonly qualifies: boolean;
    readonly fullMonthly: number;
    readonly reducedMonthly: number;
    readonly gratuity: number;
  } | null;
}

export function workPension(b: ProvenanceBuilder, wp: WorkPensionFacts, retireAge: number): WorkPension {
  if (wp.kind === "public-service") {
    const cap = b.num("core:retirement.publicService.retireAgeCap");
    const psRetire = Math.min(retireAge, cap);
    const months = Math.max(0, (psRetire - (wp.startAge ?? psRetire)) * 12);
    const calc = (wp.salaryMonthly ?? 0) * Math.min(months, b.num("core:retirement.publicService.maxMonths")) * b.num("core:retirement.publicService.accrualPerMonth");
    const ok = months >= b.num("core:retirement.publicService.minimumMonthsService");
    const min = b.num("core:retirement.publicService.minimumMonthly");
    const full = ok ? Math.max(min, calc) : 0;
    const reduced = ok ? Math.max(min, calc * b.num("core:retirement.publicService.reducedShare")) : 0;
    const gratuity = ok ? calc * b.num("core:retirement.publicService.commutedShare") * 12 * b.num("core:retirement.publicService.commutationFactor") : 0;
    b.use("core:retirement.publicService.excludes");
    b.caveat("Public-service pension uses the salary entered; the salary averaging rule could not be verified.");
    return {
      kind: wp.kind, monthly: wp.takeReduced ? reduced : full, startsAtAge: psRetire,
      publicService: { monthsOfService: months, qualifies: ok, fullMonthly: full, reducedMonthly: reduced, gratuity },
    };
  }
  if (wp.kind === "company") {
    return { kind: wp.kind, monthly: wp.companyMonthly ?? 0, startsAtAge: retireAge, publicService: null };
  }
  return { kind: "none", monthly: 0, startsAtAge: retireAge, publicService: null };
}
