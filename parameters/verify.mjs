// Sanity + drift checks for the canonical parameter tables.
//   node parameters/verify.mjs
import { P, nisPension, scpBenefit, retirementFloor, healthSurcharge, incomeTax, checkAnnuityMaturity, auditParameters } from "./tt-parameters.js";

let fails = 0;
const eq = (a, b, msg) => {
  const ok = Math.abs(a - b) < 0.01;
  console.log(`${ok ? "  ok  " : "  FAIL"} ${msg}  (got ${a}, want ${b})`);
  if (!ok) fails++;
};
const is = (a, b, msg) => {
  const ok = a === b;
  console.log(`${ok ? "  ok  " : "  FAIL"} ${msg}  (got ${JSON.stringify(a)})`);
  if (!ok) fails++;
};

console.log("\n=== THE DRIFT FIX: NIS benefit rates ===");
is(P.nis.benefit_rates.current.effective, "2016-09-05", "current benefit table is the 2016 schedule");
eq(P.nis.benefit_rates.current.basic_monthly.I, 566.72, "Class I basic = 566.72 (was 335.83 in the calculators)");
eq(P.nis.benefit_rates.current.basic_monthly.XVI, 4079.40, "Class XVI basic = 4,079.40 (was 2,475.70)");
is(P.nis.benefit_rates.superseded_2008.status, "STALE_DO_NOT_USE", "2008 table is marked stale");
const understate = (566.72 - 335.83) / 335.83;
console.log(`  note  the stale table understates Class I by ${(understate * 100).toFixed(0)}% -> overstates the gap -> sells more product`);

console.log("\n=== Class Z typo correction ===");
const xvi = P.nis.contribution_tables["2016-09-05"].classes.find((c) => c.class === "XVI");
const xv = P.nis.contribution_tables["2016-09-05"].classes.find((c) => c.class === "XV");
eq(xvi.class_z, 20.72, "Class XVI Class Z = 20.72, not NIBTT's printed 220.72");
eq(xv.class_z / xv.weekly_total, 0.05, "Class Z is exactly 5.00% of the class weekly total (XV)");
eq(xvi.class_z / xvi.weekly_total, 0.05, "...and the corrected XVI fits the same 5.00% pattern");

console.log("\n=== Increments are BLOCKING — must not be guessed ===");
const withIncrements = nisPension(6000, 1050); // 300 over the threshold = 12 increments
is(withIncrements.incrementApplied, false, "increments NOT silently applied by default");
console.log(`  note  caveat surfaced: ${withIncrements.caveat?.slice(0, 78)}...`);

console.log("\n=== NIS + SCP must be modelled together ===");
const noNis = retirementFloor(0, 0, 66);
const minNis = retirementFloor(1000, 750, 66); // Class I, exactly at threshold -> minimum applies
eq(noNis.scp.monthly, 3500, "no NIS -> SCP pays 3,500");
eq(minNis.nis.monthly, 3000, "Class I at 750 contributions -> the 3,000 minimum binds");
eq(minNis.scp.monthly, 2500, "NIS 3,000 counts as assessed income -> SCP drops to 2,500");
eq(minNis.totalMonthly - noNis.totalMonthly, 2000, "a 3,000 NIS pension delivers only 2,000 net");

console.log("\n=== SCP cliff edges ===");
is(scpBenefit(5501, 66).monthly, 0, "5,501 assessed income -> SCP zero (hard disqualification)");
eq(scpBenefit(5500, 66).monthly, 500, "5,500 -> 500");
console.log(`  note  one extra dollar of income costs $500/month at the 5,500 cliff`);

console.log("\n=== Health surcharge exemption (material for retirement clients) ===");
is(healthSurcharge(8000, 62).weekly, 0, "62-year-old is EXEMPT (was being charged before)");
eq(healthSurcharge(8000, 45).weekly, 8.25, "45-year-old over 469.99/mo pays 8.25/wk");
eq(healthSurcharge(400, 45).weekly, 4.80, "45-year-old at/below 469.99/mo pays 4.80/wk");

console.log("\n=== Income tax: the TT$60,000 cap is a single aggregate ===");
const t = incomeTax({ grossAnnual: 240000, nisContributionsAnnual: 20000, approvedContributionsAnnual: 60000 });
eq(t.combinedDeductionUsed, 60000, "70% of NIS + annuity is capped at 60,000 in aggregate");
is(t.capReached, true, "cap correctly flagged as reached");
eq(t.headroom, 0, "no headroom left");
const t2 = incomeTax({ grossAnnual: 240000, nisContributionsAnnual: 20000, approvedContributionsAnnual: 0 });
eq(t2.combinedDeductionUsed, 14000, "NIS alone: 20,000 x 70% = 14,000");
eq(t2.headroom, 46000, "46,000 of headroom remains for an annuity");

console.log("\n=== Annuity maturity rules ===");
is(checkAnnuityMaturity(45).severity, "ILLEGAL", "maturity below 50 is refused, not warned");
is(checkAnnuityMaturity(65).severity, "OK", "65 is inside the window");
is(checkAnnuityMaturity(75).severity, "WARN", "75 warns — legal but forfeits the exemption");

console.log("\n=== Parameters needing attention (audit) ===");
for (const a of auditParameters()) console.log(`  [${a.status}] ${a.path}`);

console.log(`\n${fails === 0 ? "ALL CHECKS PASSED" : fails + " CHECK(S) FAILED"}\n`);
process.exit(fails === 0 ? 0 : 1);
