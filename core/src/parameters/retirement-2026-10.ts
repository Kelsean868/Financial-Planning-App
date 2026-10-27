/**
 * Retirement parameters for the fact-finder (Section 2 fence 7, pension calculators audit 27 Oct 2026).
 * The old pension calculator repos are not merged in; their still-current rules are rows here.
 * What the audit could not verify is a row with status `unverified` and no value.
 */
import { row, unverified, deepFreeze } from "./row.ts";

const D = "2026-10-27";
const AUDIT = "Pension calculators audit (docs/superpowers/specs/2026-10-27-pension-calculators-audit.md)";

export const RETIREMENT = deepFreeze({
  publicService: {
    accrualPerMonth: row(1 / 600, "verified", `${AUDIT}: 1/600 of salary per month of service`, D),
    maxMonths: row(400, "verified", `${AUDIT}: 400-month cap`, D),
    minimumMonthly: row(3500, "verified", `${AUDIT}: $3,500 minimum`, D),
    retireAgeCap: row(60, "verified", `${AUDIT}: retirement capped at 60`, D),
    minimumMonthsService: row(120, "verified", `${AUDIT}: 10-year minimum`, D),
    reducedShare: row(0.75, "verified", `${AUDIT}: reduced pension, three quarters, plus gratuity`, D),
    commutedShare: row(0.25, "verified", `${AUDIT}: one quarter commuted`, D),
    commutationFactor: row(12.5, "verified", `${AUDIT}: ¼ commuted × 12.5`, D),
    excludes: row("Protective services (police, fire, prisons) are excluded from these rules.", "verified", AUDIT, D),
  },
  nis: {
    pensionAgeRiseFrom: row(2028, "verified", `${AUDIT}: from Jan 2028 the full NIS pension age rises one year every two years, to 65 by 2036`, D),
    earlyPensionReduction: unverified(AUDIT, D, "NIS early-pension reduction rate is not published. Do not invent one."),
    classTable2027: unverified(AUDIT, D, "The 2027 NIS class table (rate rises about 3 points from 4 Jan 2027) is unpublished."),
  },
  scp: {
    incomeBands2027: unverified(AUDIT, D, "SCP income bands for the $3,750 rate are not published."),
  },
  publicServiceSalaryAveraging: unverified(AUDIT, D, "The public-service salary averaging rule could not be verified; the engine uses the salary the advisor enters."),
  annuityConversionRates: unverified(AUDIT, D, "Annuity conversion rates could not be verified."),
});
