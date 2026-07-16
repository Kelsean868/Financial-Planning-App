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

export interface Household {
  client: Person;
  dependents: Person[];
  monthlyIncome: TTD;
  monthlyExpenses: TTD;
  debts: Debt[];
  savings: TTD;
  otherInvestments: TTD;
  /** Monthly rent, if the household rents rather than owns. */
  monthlyRent?: TTD;
  /** Total expected education cost across all dependents. */
  educationCost?: TTD;
  /** Expected final medical costs. */
  expectedMedicalCost?: TTD;
  /** Expected funeral cost. */
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

/** Why a number is what it is. Attached to every engine result. */
export interface Provenance {
  /** Parameter paths used, with their effective dates and sources. */
  parameters: Array<{ path: string; effective: string | null; source: string | null; status: string }>;
  /** Anything the engine could not compute confidently. */
  caveats: string[];
  /** Rules that fired, in order. */
  rulesFired: string[];
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
