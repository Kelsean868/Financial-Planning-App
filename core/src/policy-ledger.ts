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

/**
 * Does this policy pay a death benefit at all?
 *
 * Annuities and critical-illness riders do not. Group CI riders are common on T&T
 * group schemes, so any caller reasoning about group cover must apply the SAME
 * exclusion the cover calculation applies — a caller that re-derived the filter
 * and forgot this counted a CI rider's face as death cover that had "vanished",
 * inventing a reduction that never happened. The filter therefore lives here once
 * and is never restated by a caller.
 */
function isDeathCover(p: Policy): boolean {
  return isActive(p) && p.type !== "annuity" && p.type !== "critical-illness";
}

/**
 * Cover actually available at a given attained age, with group cover correctly decayed.
 *
 * `groupFaceTotal` is the eligible group face BEFORE decay. It is returned rather
 * than left for the caller to recompute: the excluded amount is `groupFaceTotal - group`,
 * and that subtraction is only correct if both sides applied the same eligibility filter.
 */
export function inForceCoverAt(
  policies: Policy[],
  age: number
): { individual: TTD; group: TTD; groupFaceTotal: TTD; total: TTD } {
  let individual = 0;
  let group = 0;
  let groupFaceTotal = 0;
  for (const p of policies) {
    if (!isDeathCover(p)) continue;
    if (p.isGroupCover) {
      groupFaceTotal += p.coverAmount;
      if (age >= GROUP_LIFE_TERMINATION_AGE) continue;
      group += age >= GROUP_LIFE_REDUCTION_AGE
        ? p.coverAmount * GROUP_LIFE_REDUCTION_FACTOR
        : p.coverAmount;
    } else {
      individual += p.coverAmount;
    }
  }
  return { individual, group, groupFaceTotal, total: individual + group };
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
