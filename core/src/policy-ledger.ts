import type { Policy, PolicyType, TTD } from "./types.ts";
import { P } from "../../parameters/tt-parameters.js";

/**
 * Group life reduces by 50% at 66 and terminates at 70, with no post-retirement cover.
 * Source: Sagicor T&T CariCARE group life terms (parameters/tt-parameters.json, group_life).
 * Counting group cover as permanent is a real mis-selling risk — it vanishes exactly
 * when the client may still have dependents.
 *
 * These are T&T parameters, not engine constants — they are read from the shared
 * parameter table rather than hardcoded so the engine never diverges from the
 * single source of truth.
 */
export const GROUP_LIFE_REDUCTION_AGE: number = P.group_life.reduction_age.value;
export const GROUP_LIFE_TERMINATION_AGE: number = P.group_life.termination_age.value;
export const GROUP_LIFE_REDUCTION_FACTOR: number = P.group_life.reduction_factor.value;

function isActive(p: Policy): boolean {
  return p.status === "in-force" || p.status === "paid-up";
}

/** Cover actually available at a given attained age, with group cover correctly decayed. */
export function inForceCoverAt(
  policies: Policy[],
  age: number
): { individual: TTD; group: TTD; total: TTD } {
  let individual = 0;
  let group = 0;
  for (const p of policies) {
    if (!isActive(p)) continue;
    if (p.type === "annuity" || p.type === "critical-illness") continue; // not death cover
    if (p.isGroupCover) {
      if (age >= GROUP_LIFE_TERMINATION_AGE) continue;
      group += age >= GROUP_LIFE_REDUCTION_AGE
        ? p.coverAmount * GROUP_LIFE_REDUCTION_FACTOR
        : p.coverAmount;
    } else {
      individual += p.coverAmount;
    }
  }
  return { individual, group, total: individual + group };
}

export function totalMonthlyPremium(policies: Policy[]): TTD {
  return policies.filter(isActive).reduce((s, p) => s + p.monthlyPremium, 0);
}

export function totalCashValue(policies: Policy[]): TTD {
  return policies.filter(isActive).reduce((s, p) => s + (p.cashValue ?? 0), 0);
}

export function policiesByType(policies: Policy[], type: PolicyType): Policy[] {
  return policies.filter((p) => p.type === type);
}

/**
 * Universal life policies on a client's book are the Policy X-ray's highest-value target:
 * a Cashbuilder sold in the 1990s on a 10.5% credited assumption against a 4% guarantee
 * may be silently heading for lapse. Flag them for an in-force illustration.
 */
export function universalLifePolicies(policies: Policy[]): Policy[] {
  return policies.filter((p) => p.type === "universal-life" && isActive(p));
}
