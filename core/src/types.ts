/** Trinidad & Tobago dollars. Never rounded until presentation. */
export type TTD = number;

/** ISO-8601 date, e.g. "1985-03-17". All dates are passed in — the core never reads a clock. */
export type ISODate = string;

export type Sex = "male" | "female";
export type SmokerStatus = "smoker" | "non-smoker";

/**
 * Relationship to the client.
 * "other" exists deliberately: T&T households include supported nephews,
 * outside children and relatives overseas. The fact-find's promise is
 * "it doesn't have to be official" — this type must not force a nuclear family.
 */
export type RelationshipKind = "self" | "spouse" | "child" | "parent" | "sibling" | "other";

export interface Person {
  id: string;
  name: string;
  sex: Sex;
  dateOfBirth: ISODate;
  relationship: RelationshipKind;
  /** false for informally supported dependents — they still count. */
  isFormalDependent: boolean;
  /** What the client provides this person each month, if anything. */
  monthlySupport?: TTD;
}

export type DebtKind =
  | "mortgage"
  | "vehicle"
  | "credit-union"
  | "credit-card"
  | "hire-purchase"
  | "tertiary-education"
  | "first-time-home-owner"
  | "other";

export interface Debt {
  kind: DebtKind;
  balance: TTD;
  monthlyInstallment: TTD;
  /** Final payment date. Drives the obligation decline schedule for the term ladder. */
  endDate: ISODate;
}

/**
 * How the household's housing need is to be met on death. The client's own
 * answer — the fact-find asks it, the engine never infers it.
 *
 * Founder-confirmed 2026-07-17: this can legitimately be EITHER/OR **or BOTH**
 * (a household can carry a mortgage on one property while paying rent on
 * another). Because "both" is real, no rule over the mortgage and rent balances
 * can recover the client's intent — the old `owns = mortgage > 0` inference was
 * unsound in both directions, and this field replaces it.
 */
export type HousingStrategy =
  /** Owner: clear the outstanding mortgage. */
  | "liquidate-mortgage"
  /** Renter: fund `conventions.rental_income_months` of rent. */
  | "replace-rent"
  /** Both apply — they are ADDITIVE, not alternatives. */
  | "both"
  /** No housing provision needed (e.g. owned outright, no rent). */
  | "none";

export interface Household {
  client: Person;
  dependents: Person[];
  monthlyIncome: TTD;
  monthlyExpenses: TTD;
  debts: Debt[];
  savings: TTD;
  otherInvestments: TTD;
  /**
   * How to meet the housing need. REQUIRED and never inferred — see HousingStrategy.
   * Tenure is the client's to state, not the engine's to guess from a debt balance.
   */
  housingStrategy: HousingStrategy;
  /** Monthly rent. Required in practice when housingStrategy includes rent replacement. */
  monthlyRent?: TTD;
  /** Total expected education cost across all dependents. */
  educationCost?: TTD;
  /**
   * Expected final medical costs. Subject to a FLOOR — `conventions.medical_cost_minimum`
   * wins if this is lower or absent. Clients systematically underestimate this.
   */
  expectedMedicalCost?: TTD;
  /** Expected funeral cost. Defaults to `conventions.funeral_cost_default` if absent. */
  expectedFuneralCost?: TTD;
  /** First date of insurable employment — drives NIS contribution weeks. */
  workStartDate?: ISODate;
}

export type PolicyType =
  | "term"
  | "whole-life"
  | "limited-pay"
  | "endowment"
  | "universal-life"
  | "final-expense"
  | "annuity"
  | "group-life"
  | "critical-illness";

export type PolicyStatus = "in-force" | "lapsed" | "paid-up";

export interface Policy {
  id: string;
  insurer: string;
  productName: string;
  type: PolicyType;
  coverAmount: TTD;
  monthlyPremium: TTD;
  cashValue?: TTD;
  status: PolicyStatus;
  /**
   * Group cover reduces 50% at 66 and terminates at 70.
   * Counting it as permanent cover is a real mis-selling risk.
   */
  isGroupCover: boolean;
  beneficiary?: string;
}

/** One parameter's audit entry: what was read, and where it came from. */
export interface ProvenanceParameter {
  readonly path: string;
  readonly effective: string | null;
  readonly source: string | null;
  readonly status: string;
}

/**
 * Why a number is what it is. Attached to every engine result.
 *
 * `ProvenanceBuilder.build()` deep-freezes what it returns, so these fields are
 * declared `readonly`: a type that advertised mutable arrays over a frozen object
 * would let `gap.provenance.caveats.push(x)` type-check and then throw at runtime.
 * The audit trail is evidence — it is immutable by construction, and the type says so.
 */
export interface Provenance {
  /** Parameter paths used, with their effective dates and sources. */
  readonly parameters: readonly ProvenanceParameter[];
  /** Anything the engine could not compute confidently. */
  readonly caveats: readonly string[];
  /** Rules that fired, in order. */
  readonly rulesFired: readonly string[];
}

export interface DeathNeedsProfile {
  funeral: TTD;
  medical: TTD;
  outstandingLoans: TTD;
  mortgageLiquidation: TTD;
  housingRentReplacement: TTD;
  education: TTD;
  incomeContinuation: TTD;
  totalNeeds: TTD;
  assets: { savings: TTD; lifeInsurance: TTD; otherInvestments: TTD; total: TTD };
  insuranceNeed: TTD;
  provenance: Provenance;
}

export interface RetirementNeedsProfile {
  targetMonthlyIncome: TTD;
  nisMonthly: TTD;
  scpMonthly: TTD;
  otherMonthlyIncome: TTD;
  guaranteedFloorMonthly: TTD;
  monthlyShortfall: TTD;
  provenance: Provenance;
}

export interface Gap {
  need: TTD;
  inForceCover: TTD;
  groupCoverExcluded: TTD;
  gap: TTD;
  provenance: Provenance;
}
