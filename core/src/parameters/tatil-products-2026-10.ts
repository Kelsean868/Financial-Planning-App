/**
 * Tatil Life product rules, Section 2 §2.4. Every row carries `source` and `asOf`.
 *
 * The portal's `life-shapes.js` keeps its own copy for the e-App; guard 15 (portal side)
 * compares the two. Read in the engine only through `ProvenanceBuilder.use("core:products.…")`.
 */
import { row, deepFreeze } from "./row.ts";

const D = "2026-10-27";
const SHAPES = "General-Rater-Portal life-shapes.js PRODUCTS";
const PRODUCTS_JS = "General-Rater-Portal life-products.js";
const KYRON = "Kyron, 27 Oct 2026 (Section 2 §2.4, signed)";

export type ProductId =
  | "term" | "whole-life" | "endowment" | "life-span-gold" | "goldspoon"
  | "rest-assured-ii" | "cashbuilder-ii" | "destiny" | "platinum-edge" | "spia";

export type RiderId = "disability-income" | "add";

export interface ProductSpec {
  readonly id: ProductId;
  readonly name: string;
  /** Cover range in TTD; `max` null means no stated maximum. Null when cover does not apply. */
  readonly cover: { readonly min: number; readonly max: number | null } | null;
  /** Issue ages, inclusive; null bounds are unstated. */
  readonly issueAge: { readonly min: number | null; readonly max: number | null };
  /** Minimum premium a month; null when there is none or the product is a single deposit. */
  readonly minPremiumMonthly: number | null;
  /** Single deposit range, for deposit products. */
  readonly singleDeposit: { readonly min: number; readonly max: number } | null;
  readonly riders: readonly RiderId[];
  /** Printed wherever the product is recommended. */
  readonly disclosure: string | null;
}

export interface RiderSpec {
  readonly id: RiderId;
  readonly name: string;
  readonly allowedOn: readonly ProductId[];
  readonly underwriting: string;
  /** Whether the engine may count it as income protection. */
  readonly incomeProtection: boolean;
}

export const REST_ASSURED_GRADING =
  "Rest Assured II has a graded death benefit: in year one it returns the premiums paid; in year two it pays the greater of 25% of the sum assured or the premiums paid; full cover from year three. Accidental death pays in full from day one.";

function product(spec: ProductSpec, status: "verified" | "rule", source: string) {
  return row(spec, status, source, D);
}

export const PRODUCTS = deepFreeze({
  term: product({
    id: "term", name: "Term Life", cover: { min: 150000, max: 10000000 }, issueAge: { min: null, max: 65 },
    minPremiumMonthly: 150, singleDeposit: null, riders: ["add"], disclosure: null,
  }, "rule", `${SHAPES}; ${KYRON}`),
  "whole-life": product({
    id: "whole-life", name: "Whole Life", cover: { min: 65000, max: null }, issueAge: { min: null, max: null },
    minPremiumMonthly: 150, singleDeposit: null, riders: ["add"], disclosure: null,
  }, "rule", `${SHAPES}; ${KYRON}`),
  endowment: product({
    id: "endowment", name: "Endowment", cover: { min: 55000, max: null }, issueAge: { min: null, max: null },
    minPremiumMonthly: 150, singleDeposit: null, riders: ["add"], disclosure: null,
  }, "rule", `${SHAPES}; ${KYRON}`),
  "life-span-gold": product({
    id: "life-span-gold", name: "Life Span Gold (critical illness)", cover: { min: 100000, max: 2000000 }, issueAge: { min: null, max: null },
    minPremiumMonthly: 150, singleDeposit: null, riders: [], disclosure: null,
  }, "rule", `Kyron's rule (Section 2 §2.4): $100,000 floor; OIPA allows $50,000, not used`),
  goldspoon: product({
    id: "goldspoon", name: "Goldspoon", cover: { min: 10000, max: 150000 }, issueAge: { min: 1, max: 12 },
    minPremiumMonthly: 150, singleDeposit: null, riders: [], disclosure: null,
  }, "verified", SHAPES),
  "rest-assured-ii": product({
    id: "rest-assured-ii", name: "Rest Assured II", cover: { min: 30000, max: 150000 }, issueAge: { min: null, max: 80 },
    minPremiumMonthly: null, singleDeposit: null, riders: [], disclosure: REST_ASSURED_GRADING,
  }, "rule", `${KYRON}; grading: research/tatil-product-specifications.md (Rest Assured 2024), Section 1 appendix`),
  "cashbuilder-ii": product({
    id: "cashbuilder-ii", name: "Cashbuilder II (universal life)", cover: { min: 10000, max: null }, issueAge: { min: null, max: null },
    minPremiumMonthly: 300, singleDeposit: null, riders: ["disability-income", "add"], disclosure: null,
  }, "rule", KYRON),
  destiny: product({
    id: "destiny", name: "Destiny (annuity)", cover: null, issueAge: { min: null, max: null },
    minPremiumMonthly: 200, singleDeposit: null, riders: [], disclosure: null,
  }, "rule", KYRON),
  "platinum-edge": product({
    id: "platinum-edge", name: "Platinum Edge", cover: null, issueAge: { min: null, max: null },
    minPremiumMonthly: null, singleDeposit: { min: 50000, max: 1000000 }, riders: [],
    disclosure: "Platinum Edge needs a single deposit. Whether it has a graded benefit is not yet confirmed (open item 5.3a).",
  }, "verified", PRODUCTS_JS),
  spia: product({
    id: "spia", name: "SPIA (single premium immediate annuity)", cover: null, issueAge: { min: 50, max: null },
    minPremiumMonthly: null, singleDeposit: { min: 50000, max: 2000000 }, riders: [],
    disclosure: "A SPIA cannot be surrendered.",
  }, "verified", PRODUCTS_JS),
});

export const RIDERS = deepFreeze({
  "disability-income": row<RiderSpec>({
    id: "disability-income", name: "Disability Income Rider", allowedOn: ["cashbuilder-ii"],
    underwriting: "Medical at any amount", incomeProtection: true,
  }, "rule", "Kyron, 27 Oct 2026: Cashbuilder II only, Medical at any amount (Section 2 §2.4 rider rule 1)", D),
  add: row<RiderSpec>({
    id: "add", name: "Accidental Death and Dismemberment", allowedOn: ["term", "whole-life", "endowment", "cashbuilder-ii"],
    underwriting: "As the base plan", incomeProtection: false,
  }, "rule", "Section 2 §2.4 rider rule 2: AD&D pays on accident only; never income protection", D),
});

/** Return-floor vehicles, addendum §13. Only the contractual floor is held; the planning rate is advisor-set elsewhere. */
export interface VehicleSpec {
  readonly id: string;
  readonly product: ProductId;
  readonly name: string;
  /** Contractual guaranteed rate, a fraction. */
  readonly floor: number;
  readonly capitalProtected: boolean;
}

export const VEHICLES = deepFreeze({
  "destiny-settler": row<VehicleSpec>({ id: "destiny-settler", product: "destiny", name: "Destiny Settler", floor: 0.02, capitalProtected: false },
    "rule", "Addendum §13: Destiny Settler floor 2%", D),
  "destiny-explorer": row<VehicleSpec>({ id: "destiny-explorer", product: "destiny", name: "Destiny Explorer", floor: 0.01, capitalProtected: false },
    "rule", "Addendum §13: Destiny Explorer floor 1%", D),
  "destiny-adventurer": row<VehicleSpec>({ id: "destiny-adventurer", product: "destiny", name: "Destiny Adventurer", floor: 0, capitalProtected: true },
    "rule", "Addendum §13: Destiny Adventurer floor 0%, capital protected", D),
  "platinum-edge": row<VehicleSpec>({ id: "platinum-edge", product: "platinum-edge", name: "Platinum Edge", floor: 0.025, capitalProtected: false },
    "rule", "Addendum §13: Platinum Edge floor 2.5%", D),
});

/** Annuity controls, closing brief §4.1. Controls, not text. */
export const ANNUITY_LEVERS = deepFreeze({
  destinyGuaranteedYears: row([5, 10, 15] as const, "rule", "Closing brief §4.1", D),
  destinySpousalShares: row([0.5, 1] as const, "rule", "Closing brief §4.1", D),
  spiaSpousalShares: row([0.5, 0.6, 0.6667, 1] as const, "rule", "Closing brief §4.1", D),
  destinyLumpAtVesting: row([0, 0.25] as const, "rule", "Closing brief §4.1", D),
  taxExemptNote: row("Approved annuity and pension income is tax-exempt from 1 Jan 2026 (Finance Act 2026) where the maturity is between 50 and 70.",
    "verified", "Closing brief §4.1; root annuities.income_exemption", "2026-01-01"),
});
