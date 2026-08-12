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

/** The NIS contribution table in force today. Contributions are era-selected. */
export const CURRENT_NIS_TABLE = "2026-01-05";

/** Normalise a pay figure to monthly. */
export function toMonthly(amount, period = "month") {
  const per = String(period).toLowerCase();
  if (per.startsWith("week") || per === "w") return (amount * 52) / 12;
  if (per.startsWith("fortnight") || per.startsWith("biweek") || per === "f") return (amount * 26) / 12;
  if (per.startsWith("month") || per === "m") return amount;
  if (per.startsWith("year") || per.startsWith("annual") || per === "y" || per === "a") return amount / 12;
  throw new ParameterError(`Unknown pay period "${period}"`);
}

/**
 * Employee NIS contribution derived from earnings alone.
 *
 * WHY THIS EXISTS: a prospect almost never knows their NIS figure. It is on the
 * TD4 and the payslip, and neither is in the room. Earnings they always know.
 * NIS is a step function of earnings class, so this is exact for anyone paid a
 * regular wage — not an approximation — provided the earnings are their
 * *insurable* earnings.
 *
 * LIMITS, which the caller should surface rather than bury:
 *  - Exact only for the classed weekly contribution. Irregular earnings that move
 *    between classes week to week will differ.
 *  - Assumes a full contribution year (52 weeks). Part-year employment is lower.
 *  - Self-employed and unemployed persons are not in this table at all.
 *
 * @returns {{class:string, weeklyEmployee:number, annualEmployee:number,
 *            deductible70:number, atCeiling:boolean, monthly:number,
 *            weeksPerYear:number, tableDate:string, source:string}}
 */
export function nisFromEarnings(amount, period = "month", tableDate = CURRENT_NIS_TABLE) {
  const t = assertSafe(P.nis.contribution_tables[tableDate], `nis.contribution_tables.${tableDate}`);
  if (!t) throw new ParameterError(`No NIS contribution table for ${tableDate}`);
  if (t._incomplete) {
    throw new ParameterError(
      `NIS table ${tableDate} is incomplete and must not be used: ${t._incomplete}`
    );
  }

  const monthly = toMonthly(amount, period);
  const weeks = P.nis.contribution_tables._weeks_per_year.value;

  // Below Class I there is no insurable earnings class.
  const first = t.classes[0];
  if (monthly < first.monthly_min) {
    return {
      class: null, weeklyEmployee: 0, annualEmployee: 0, deductible70: 0,
      atCeiling: false, monthly, weeksPerYear: weeks, tableDate, source: t.source,
      note: `Monthly earnings below the Class I floor of ${first.monthly_min} — no insurable earnings class.`,
    };
  }

  const row =
    t.classes.find((c) => monthly >= (c.monthly_min ?? -Infinity) && monthly <= (c.monthly_max ?? Infinity)) ??
    t.classes[t.classes.length - 1];

  const annualEmployee = row.weekly_employee * weeks;
  return {
    class: row.class,
    weeklyEmployee: row.weekly_employee,
    annualEmployee,
    deductible70: annualEmployee * P.income_tax.nis_deductible_portion.value,
    atCeiling: row.monthly_max === null,
    monthly,
    weeksPerYear: weeks,
    tableDate,
    source: t.source,
  };
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

/**
 * s.134(6) contribution ceiling, computed the way BIR COMPUTATION FORM 134 does.
 *
 * The form is "Request for Board of Inland Revenue Approval — Details of
 * Contributions to Fund or Contract in accordance with Section 134(6A) and (6B)".
 * Its own line numbers are used below so a result can be checked against a filed
 * form line by line.
 *
 * THE RULE (front of form, note under line 12):
 *   "Maximum Contributions to be made are the greater of Line 9 OR Line 11."
 *
 * TWO THINGS THAT ARE EASY TO GET WRONG, both confirmed with the practitioner:
 *  1. Line 8 is a COMBINED total — company contributions PLUS the employee's own
 *     contributions to approved plans, and the form defines the employee figure as
 *     overleaf "6(a)(i) to (iii) and 6(b)", which INCLUDES the employee's 70% NIS.
 *     The company allowance is therefore NOT stacked on top of the personal cap;
 *     they share one ceiling.
 *  2. Overleaf line 1(b), "Emolument Income (inclusive of contributions to S.134(6)
 *     plans)", means contributions the company is ALREADY making — not the new one
 *     being applied for. The limit is not self-referential.
 *
 * @param {object} i
 * @param {number} i.salary                  overleaf line 1(a)
 * @param {number} [i.existingCompanyContribs] overleaf line 1(b) — already in force
 * @param {number} [i.otherIncome]           overleaf line 2
 * @param {number} [i.tertiary]              overleaf line 4(2)
 * @param {number} [i.firstTimeHome]         overleaf line 4(3)
 * @param {number} [i.widowsOrphans]         overleaf line 6(a)(i)
 * @param {number} [i.approvedPension]       overleaf line 6(a)(ii)
 * @param {number} [i.approvedAnnuity]       overleaf line 6(a)(iii) — the personal annuity
 * @param {number} [i.nisAnnual]             employee's full NIS; 70% goes to line 6(b)
 */
export function s134FormCeiling(i) {
  const node = P.annuities.s134_6a_deferred_compensation;
  assertSafe(node, "annuities.s134_6a_deferred_compensation");

  const salary   = Math.max(0, i.salary || 0);
  const existing = Math.max(0, i.existingCompanyContribs || 0);

  const line1  = salary + existing;                       // TOTAL EMOLUMENT INCOME
  const line3  = line1 + (i.otherIncome || 0);            // TOTAL NET INCOME
  const line5  = Math.max(0, line3                        // ASSESSABLE INCOME
                   - P.income_tax.personal_allowance.value
                   - (i.tertiary || 0)
                   - (i.firstTimeHome || 0));

  const nis70  = (i.nisAnnual || 0) * P.income_tax.nis_deductible_portion.value;  // 6(b)
  const line6  = (i.widowsOrphans || 0) + (i.approvedPension || 0)
                 + (i.approvedAnnuity || 0) + nis70;
  const line7  = Math.min(line6, P.income_tax.combined_deduction_cap.value);      // capped at 60,000
  const line8  = Math.max(0, line5 - line7);                                      // CHARGEABLE INCOME
  const line9  = line8 / node.limit.chargeable_income_divisor;                    // one third
  const line10 = line1 * node.limit.gross_emoluments_share;                       // 20% of emoluments

  const ceiling = Math.max(line9, line10);
  // Front line 7 is the RAW employee total (not the 60,000-capped figure).
  const employeeContribs = line6;
  const maxTotalCompany  = Math.max(0, ceiling - employeeContribs);

  return {
    ceiling,
    maxNewCompany: Math.max(0, maxTotalCompany - existing),
    maxTotalCompany,
    employeeContribs,
    binding: line10 >= line9 ? "gross_emoluments" : "chargeable_income",
    maturityExemptionApplies: node.maturity_exemption_applies, // false
    employerOwned: node.employer_owned,                        // true
    form: { line1, line5, line6, line7, line8, line9, line10 },
  };
}

/**
 * @deprecated Superseded by s134FormCeiling(), which reproduces BIR Form 134.
 * This treated the company allowance as stacking on top of the personal cap and
 * ignored the employee's contributions entirely. Retained only so the difference
 * stays visible in the diff; do not call it.
 */
export function s134MaxContribution({ grossAnnual, chargeableIncome }) {
  const node = P.annuities.s134_6a_deferred_compensation;
  const byChargeable = Math.max(0, chargeableIncome) / node.limit.chargeable_income_divisor;
  const byGross      = Math.max(0, grossAnnual) * node.limit.gross_emoluments_share;
  return { max: Math.max(byChargeable, byGross), byChargeable, byGross,
           binding: byGross >= byChargeable ? "gross_emoluments" : "chargeable_income",
           maturityExemptionApplies: node.maturity_exemption_applies,
           employerOwned: node.employer_owned };
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
