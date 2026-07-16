/**
 * Canonical Trinidad & Tobago parameter tables — shared loader.
 *
 * ONE source of truth for BOTH the planning engine and the public calculators.
 * The public calculators are Meeting Zero: the client reaches their own conclusion
 * there and refers in. If those numbers are wrong, the client builds conviction on
 * a bad figure — which is harder to correct than no figure at all. So this file is
 * load-bearing, not hygiene.
 *
 * RULES
 *  1. Never hardcode a T&T parameter anywhere else. Import from here.
 *  2. Every value carries: effective date, source URL, retrieved date, status.
 *  3. Provenance is PER-PARAMETER, not per-page. Agencies contradict themselves.
 *  4. Never silently use a value whose status is BLOCKING_UNRESOLVED or PROVISIONAL.
 *     Surface the uncertainty to the user instead.
 *
 * Usage (browser / calculators):
 *     <script type="module">
 *       import { P, nisPension, incomeTax, healthSurcharge, scpBenefit } from './tt-parameters.js';
 *     </script>
 *
 * Usage (node / engine):
 *     import { P, nisPension } from './parameters/tt-parameters.js';
 */

import DATA from "./tt-parameters.json" with { type: "json" };

/**
 * Freeze the parameter tables at load.
 *
 * These values are the project's source of truth and several are objects or
 * arrays (rate tables, SCP bands, PAYE bands). A caller mutating one in place
 * would silently corrupt every other consumer in the process. Freezing makes
 * that a TypeError in strict mode (all ESM is strict) instead of a silent,
 * process-wide data corruption.
 */
function deepFreeze(o) {
  if (o && typeof o === "object" && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
}
deepFreeze(DATA);

export const P = DATA;

/** Statuses that must never be used silently. */
const UNSAFE = new Set(["BLOCKING_UNRESOLVED", "PROVISIONAL", "UNVERIFIED_1995_SOURCE", "STALE_DO_NOT_USE"]);

export class ParameterError extends Error {}

/** Throw if a parameter node is not safe to compute with. */
export function assertSafe(node, name) {
  if (node && UNSAFE.has(node.status)) {
    throw new ParameterError(
      `Parameter "${name}" has status ${node.status} and must not be used silently. ` +
      (node.warning ?? "See tt-parameters.json.")
    );
  }
  return node;
}

const ROMAN = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV","XV","XVI"];

/* ------------------------------------------------------------------ NIS */

/** Map monthly insurable earnings to an NIS earnings class (roman numeral). */
export function nisClassForMonthly(monthly, tableDate = "2016-09-05") {
  const t = P.nis.contribution_tables[tableDate];
  if (!t) throw new ParameterError(`No NIS contribution table for ${tableDate}`);
  for (const c of t.classes) {
    const lo = c.monthly_min ?? -Infinity;
    const hi = c.monthly_max ?? Infinity;
    if (monthly >= lo && monthly <= hi) return c.class;
  }
  return "XVI"; // above the ceiling
}

/**
 * NIS retirement pension.
 *
 * IMPORTANT: averaging is WHOLE WORKING LIFE, not final salary and not the last
 * 7 years. Pass the lifetime average of monthly insurable earnings.
 *
 * Increments are BLOCKING_UNRESOLVED — the 2016 schedule publishes basics only.
 * By default we compute basic + minimum and REPORT that increments are unconfirmed,
 * rather than guessing. Pass { allowIncrements: true } only once NIBTT confirms.
 */
export function nisPension(lifetimeAvgMonthlyEarnings, totalContributions, opts = {}) {
  const { allowIncrements = false } = opts;
  const min = P.nis.minimum_pension.value;
  const threshold = P.nis.qualifying_conditions.value.pension.contributions; // 750

  if (totalContributions < threshold) {
    return {
      type: "GRANT",
      note: `Fewer than ${threshold} contributions — a one-time Retirement Grant, not a pension.`,
      formula: P.nis.retirement_grant.value,
      minimum: P.nis.retirement_grant.minimum,
      countsTowardScp: false, // a grant is not monthly income
    };
  }

  const cls = nisClassForMonthly(lifetimeAvgMonthlyEarnings);
  const cur = P.nis.benefit_rates.current;
  const basic = cur.basic_monthly[cls];

  const incNode = P.nis.benefit_rates.increments;
  const excess = Math.max(0, totalContributions - threshold);
  const increments = Math.floor(excess / 25);

  let amount = basic;
  let incrementApplied = false;
  let caveat = null;

  if (increments > 0) {
    if (allowIncrements) {
      const inc2013 = incNode.known.find((k) => k.effective === "2013-03-04");
      const incVal = inc2013?.monthly?.[cls];
      if (incVal == null) {
        caveat = `Increment value for class ${cls} is not published. Basic pension only.`;
      } else {
        amount = basic + increments * incVal;
        incrementApplied = true;
        caveat = "Increments computed from the 2013 schedule — UNCONFIRMED for 2016+. See tt-parameters.json.";
      }
    } else {
      caveat =
        `This person has ${increments} increment${increments === 1 ? "" : "s"} ` +
        `(${excess} contributions above ${threshold}), but NIBTT has not published a 2016 increment schedule. ` +
        `Showing the basic pension and minimum only — the true figure may be higher.`;
    }
  }

  const applied = Math.max(amount, min);
  return {
    type: "PENSION",
    class: cls,
    basic,
    increments,
    incrementApplied,
    beforeMinimum: amount,
    monthly: applied,
    minimumApplied: applied === min && amount < min,
    caveat,
    countsTowardScp: true, // confirmed: SCP form items 6 & 31
    effective: cur.effective,
    source: cur.source,
  };
}

/* ------------------------------------------------------------------ SCP */

/** Senior Citizens' Pension from assessed monthly income. NIS pension counts. */
export function scpBenefit(assessedMonthlyIncome, age) {
  const elig = P.scp.eligibility;
  if (age < elig.age) {
    return { eligible: false, monthly: 0, reason: `SCP requires age ${elig.age}.` };
  }
  for (const b of P.scp.bands.value) {
    if (b.assessed_income_up_to === null || assessedMonthlyIncome <= b.assessed_income_up_to) {
      const cliffs = P.scp.cliff_edges.value;
      const nearCliff = cliffs.find((c) => assessedMonthlyIncome > c - 100 && assessedMonthlyIncome <= c);
      return {
        eligible: b.pays > 0,
        monthly: b.pays,
        residencyRequirement: elig.residency,
        nearCliff: nearCliff ?? null,
        cliffWarning: nearCliff
          ? `Assessed income is within $100 of the ${nearCliff} threshold. Crossing it reduces SCP.`
          : null,
        source: P.scp.bands.source,
      };
    }
  }
  return { eligible: false, monthly: 0 };
}

/** Combined NIS + SCP retirement floor — these MUST be modelled together. */
export function retirementFloor(lifetimeAvgMonthlyEarnings, totalContributions, age, otherMonthlyIncome = 0) {
  const nis = nisPension(lifetimeAvgMonthlyEarnings, totalContributions);
  const nisMonthly = nis.type === "PENSION" ? nis.monthly : 0;
  const assessed = otherMonthlyIncome + (nis.countsTowardScp ? nisMonthly : 0);
  const scp = scpBenefit(assessed, age);
  return {
    nis,
    scp,
    assessedIncome: assessed,
    totalMonthly: nisMonthly + scp.monthly + otherMonthlyIncome,
    note:
      "NIS retirement pension counts as SCP assessed income (grant does not). " +
      "A 3,000 NIS pension typically delivers 2,000 net of the SCP reduction.",
  };
}

/* ------------------------------------------------------- Income tax & levies */

/** Health surcharge. Returns 0 for exempt persons — MATERIAL for retirement clients. */
export function healthSurcharge(monthlyEmoluments, age, onlyIncomeIsPension = false) {
  if (age < 16) return { weekly: 0, exempt: "under 16" };
  if (age >= 60) return { weekly: 0, exempt: "aged 60 and over" };
  if (onlyIncomeIsPension) return { weekly: 0, exempt: "only income is pension" };
  const [hi, lo] = P.health_surcharge.rates.value;
  return {
    weekly: monthlyEmoluments > hi.monthly_emoluments_over ? hi.weekly_rate : lo.weekly_rate,
    exempt: null,
    source: P.health_surcharge.rates.source,
  };
}

/** Chargeable income and PAYE. */
export function incomeTax({ grossAnnual, nisContributionsAnnual = 0, approvedContributionsAnnual = 0, otherDeductions = 0 }) {
  const allowance = P.income_tax.personal_allowance.value;
  const nisPortion = P.income_tax.nis_deductible_portion.value; // 0.70
  const cap = P.income_tax.combined_deduction_cap.value;        // 60,000

  const nisDeductible = nisContributionsAnnual * nisPortion;
  const cappedCombined = Math.min(nisDeductible + approvedContributionsAnnual, cap);

  const chargeable = Math.max(0, grossAnnual - allowance - cappedCombined - otherDeductions);

  let tax = 0, remaining = chargeable, prev = 0;
  for (const band of P.income_tax.paye_bands.value) {
    const ceiling = band.up_to ?? Infinity;
    const slice = Math.max(0, Math.min(remaining, ceiling - prev));
    tax += slice * band.rate;
    remaining -= slice;
    prev = ceiling;
    if (remaining <= 0) break;
  }

  return {
    chargeable,
    tax,
    allowance,
    nisDeductible,
    combinedDeductionUsed: cappedCombined,
    combinedDeductionCap: cap,
    headroom: Math.max(0, cap - cappedCombined),
    capReached: cappedCombined >= cap,
    note: "Combined cap is a SINGLE AGGREGATE across pension, approved annuity and 70% of NIS — not per-product.",
  };
}

/* ------------------------------------------------------------- Annuities */

/** Validate a proposed annuity maturity age. Floor is legal; 70 is the exemption edge. */
export function checkAnnuityMaturity(age, { registered = true } = {}) {
  const floor = P.annuities.statutory_maturity_floor.value; // 50
  const win = P.annuities.exemption_window.value;           // {50,70}
  if (age < floor) {
    return { ok: false, severity: "ILLEGAL", message: `An approved plan cannot mature before age ${floor}.` };
  }
  if (registered && age > win.max_age) {
    return {
      ok: true,
      severity: "WARN",
      message: `Maturity at ${age} is legal but falls outside the ${win.min_age}-${win.max_age} window, forfeiting the s.8(1)(ta) income-tax exemption.`,
    };
  }
  return { ok: true, severity: "OK", message: null };
}

/* --------------------------------------------------------- Provenance API */

/** Walk the tree and return every parameter whose status is not clean. */
export function auditParameters(node = P, path = []) {
  const out = [];
  if (node && typeof node === "object") {
    if (typeof node.status === "string" && node.status !== "VERIFIED") {
      out.push({ path: path.join("."), status: node.status, warning: node.warning ?? null });
    }
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith("_")) continue;
      if (v && typeof v === "object") out.push(...auditParameters(v, [...path, k]));
    }
  }
  return out;
}

export default P;
