export interface ParameterNode {
  value?: unknown;
  status?: string;
  effective?: string | null;
  source?: string;
  retrieved?: string;
  warning?: string;
  [key: string]: unknown;
}

export interface NisPensionResult {
  type: "PENSION" | "GRANT";
  class?: string;
  basic?: number;
  increments?: number;
  incrementApplied?: boolean;
  beforeMinimum?: number;
  monthly?: number;
  minimumApplied?: boolean;
  caveat: string | null;
  countsTowardScp: boolean;
  effective?: string;
  source?: string;
  note?: string;
  formula?: string;
  minimum?: number;
}

export interface ScpResult {
  eligible: boolean;
  monthly: number;
  reason?: string;
  residencyRequirement?: string;
  nearCliff?: number | null;
  cliffWarning?: string | null;
  source?: string;
}

export interface RetirementFloorResult {
  nis: NisPensionResult;
  scp: ScpResult;
  assessedIncome: number;
  totalMonthly: number;
  note: string;
}

export interface IncomeTaxResult {
  chargeable: number;
  tax: number;
  allowance: number;
  nisDeductible: number;
  combinedDeductionUsed: number;
  combinedDeductionCap: number;
  headroom: number;
  capReached: boolean;
  note: string;
}

export interface MaturityCheck {
  ok: boolean;
  severity: "OK" | "WARN" | "ILLEGAL";
  message: string | null;
}

export interface AuditEntry {
  path: string;
  status: string;
  warning: string | null;
}

export declare const P: any;
export declare class ParameterError extends Error {}
export declare function assertSafe<T>(node: T, name: string): T;
export declare function nisClassForMonthly(monthly: number, tableDate?: string): string;
export declare function nisPension(
  lifetimeAvgMonthlyEarnings: number,
  totalContributions: number,
  opts?: { allowIncrements?: boolean }
): NisPensionResult;
export declare function scpBenefit(assessedMonthlyIncome: number, age: number): ScpResult;
export declare function retirementFloor(
  lifetimeAvgMonthlyEarnings: number,
  totalContributions: number,
  age: number,
  otherMonthlyIncome?: number
): RetirementFloorResult;
export declare function healthSurcharge(
  monthlyEmoluments: number,
  age: number,
  onlyIncomeIsPension?: boolean
): { weekly: number; exempt: string | null; source?: string };
export declare function incomeTax(input: {
  grossAnnual: number;
  nisContributionsAnnual?: number;
  approvedContributionsAnnual?: number;
  otherDeductions?: number;
}): IncomeTaxResult;
export declare function checkAnnuityMaturity(age: number, opts?: { registered?: boolean }): MaturityCheck;
export declare function auditParameters(node?: unknown, path?: string[]): AuditEntry[];
