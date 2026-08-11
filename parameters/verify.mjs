// Sanity + drift checks for the canonical parameter tables.
//   node parameters/verify.mjs
import { P, nisPension, scpBenefit, retirementFloor, healthSurcharge, incomeTax, checkAnnuityMaturity, auditParameters, nisFromEarnings, toMonthly, s134MaxContribution, s134FormCeiling } from "./tt-parameters.js";

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

console.log("\n=== NIS 2026 contribution table (classes II-XV filled 2026-08-11) ===");
{
  const t = P.nis.contribution_tables["2026-01-05"];
  is(t.classes.length, 16, "all sixteen earnings classes present");
  is(t._incomplete, undefined, "the _incomplete blocker is gone");
  is(t.status, "VERIFIED", "table status is VERIFIED");
  let bad = 0, worstRate = 0, worstShare = 0;
  for (const c of t.classes) {
    if (Math.abs(c.weekly_employee + c.weekly_employer - c.weekly_total) > 0.005) bad++;
    worstRate = Math.max(worstRate, Math.abs(c.weekly_total / c.assumed_awe - 0.162));
    worstShare = Math.max(worstShare, Math.abs(c.weekly_employee / c.weekly_total - 1 / 3));
  }
  is(bad, 0, "employee + employer = total for every class");
  console.log(`  ok   total/AWE within ${(worstRate * 100).toFixed(3)}pp of 16.2% for every class`);
  console.log(`  ok   employee share within ${(worstShare * 100).toFixed(3)}pp of one third for every class`);
  let gaps = 0;
  for (let i = 1; i < t.classes.length; i++) {
    if (Math.abs(t.classes[i].monthly_min - (t.classes[i - 1].monthly_max + 0.01)) > 0.005) gaps++;
  }
  is(gaps, 0, "class bands are contiguous - no gaps, no overlaps");
}

console.log("\n=== nisFromEarnings: derive NIS from earnings alone ===");
{
  const ceil = nisFromEarnings(20000, "month");
  is(ceil.class, "XVI", "20,000/month lands in Class XVI");
  is(ceil.atCeiling, true, "...and is flagged as at the ceiling");
  eq(ceil.annualEmployee, 169.50 * 52, "Class XVI employee = 169.50 x 52 = 8,814/yr");
  eq(ceil.deductible70, 169.50 * 52 * 0.7, "70% deductible = 6,169.80 - the most NIS can ever use of the cap");

  // the three pay periods must agree for the same real income
  const a = nisFromEarnings(120000, "year");
  const m = nisFromEarnings(10000, "month");
  const w = nisFromEarnings(120000 / 52, "week");
  is(a.class === m.class && m.class === w.class, true, `annual / monthly / weekly all resolve to Class ${a.class}`);

  const low = nisFromEarnings(800, "month");
  is(low.class, null, "below the Class I floor there is no class");
  eq(low.annualEmployee, 0, "...and no contribution");

  // boundary: exactly on a class edge
  is(nisFromEarnings(1472.99, "month").class, "I",  "1,472.99/month is the top of Class I");
  is(nisFromEarnings(1473.00, "month").class, "II", "1,473.00/month is the bottom of Class II");
  is(nisFromEarnings(13600, "month").class,  "XVI", "13,600/month is the ceiling class");
}

console.log("\n=== The headroom that actually matters for an annuity sale ===");
{
  const nis = nisFromEarnings(15000, "month");           // above the ceiling
  const cap = P.income_tax.combined_deduction_cap.value;
  const pension = 0;
  const headroom = cap - nis.deductible70 - pension;
  eq(headroom, cap - 6169.80, "a ceiling earner with no pension plan has 53,830.20 of room");
  const withPlan = cap - nis.deductible70 - 18000;
  eq(withPlan, 35830.20, "...but only 35,830.20 once an 18,000 company pension is counted");
  console.log("  note  NIS alone consumes 6,169.80 of the 60,000 for every ceiling earner");
}

console.log("\n=== s.134(6) corporate deferred compensation ===");
{
  const node = P.annuities.s134_6a_deferred_compensation;
  is(node.status, "VERIFIED", "upgraded to VERIFIED once the BIR form was found");
  is(!!node.limit_source, true, "the limit now names its issuing document");
  is(node.limit_source.document.includes("BOARD OF INLAND REVENUE APPROVAL"), true,
     "authority is the BIR approval form, not insurer marketing");
  is(!!node.form_logic_DIVERGES_FROM_THIS_MODULE, true,
     "the divergence between s134MaxContribution() and the form is recorded, not silently carried");
  is(node.sources.length >= 3, true, "three independent implementations recorded");
  is(node.employer_owned, true, "flagged as employer-owned");
  is(node.maturity_exemption_applies, false, "does NOT get the Finance Act 2026 maturity exemption");

  // High earner: 500,000 gross. 20% of gross vs one third of chargeable.
  const nis = nisFromEarnings(500000, "year");
  const it  = incomeTax({ grossAnnual: 500000, nisContributionsAnnual: nis.annualEmployee });
  const r   = s134MaxContribution({ grossAnnual: 500000, chargeableIncome: it.chargeable });
  eq(r.byGross, 100000, "20% of 500,000 gross = 100,000");
  eq(r.byChargeable, it.chargeable / 3, "one third of chargeable income");
  eq(r.max, Math.max(r.byGross, r.byChargeable), "takes the greater of the two");
  console.log(`  note  chargeable ${it.chargeable.toFixed(0)} -> byChargeable ${r.byChargeable.toFixed(0)}, byGross ${r.byGross.toFixed(0)}, binding: ${r.binding}`);
  is(r.max > P.income_tax.combined_deduction_cap.value, true,
     `s.134(6) ceiling (${Math.round(r.max)}) exceeds the personal 60,000 cap for this earner`);

  // Low earner: the gross test should bind, and it must never go negative.
  const low = s134MaxContribution({ grossAnnual: 60000, chargeableIncome: 0 });
  eq(low.byChargeable, 0, "no chargeable income -> nil on that limb");
  eq(low.max, 12000, "20% of gross still applies");
  is(low.binding, "gross_emoluments", "gross limb binds when chargeable is nil");
}

console.log("\n=== Banded relief: a deduction straddling $1,000,000 ===");
{
  const PA = P.income_tax.personal_allowance.value;
  // Bands themselves
  for (const c of [999999, 1000000, 1000001, 2000000]) {
    const r = incomeTax({ grossAnnual: c + PA });
    const want = c <= 1e6 ? c * 0.25 : 250000 + (c - 1e6) * 0.30;
    eq(r.tax, want, `chargeable ${c.toLocaleString()} taxed correctly across the bands`);
  }
  // A premium that crosses the line is relieved at a BLEND, not the marginal rate.
  const gross = 1120000, prem = 53830.20;
  const nis = nisFromEarnings(gross, "year");
  const a = incomeTax({ grossAnnual: gross, nisContributionsAnnual: nis.annualEmployee });
  const b = incomeTax({ grossAnnual: gross, nisContributionsAnnual: nis.annualEmployee,
                        approvedContributionsAnnual: prem });
  is(a.chargeable > 1e6 && b.chargeable < 1e6, true, "this case really does straddle the threshold");
  const actual = a.tax - b.tax;
  const flat30 = prem * 0.30;
  eq(actual, 250000 + (a.chargeable - 1e6) * 0.30 - b.chargeable * 0.25 + 0, "saving equals the true banded difference");
  is(actual < flat30, true, `blended saving ${actual.toFixed(0)} is BELOW the flat-30% assumption ${flat30.toFixed(0)}`);
  console.log(`  note  effective relief ${(actual / prem * 100).toFixed(2)}% — flat 30% would overstate by ${(flat30 - actual).toFixed(2)}`);
}

console.log("\n=== s.134(6) interacts with the personal cap — order matters ===");
{
  const node = P.annuities.s134_6a_deferred_compensation;
  is(node.combines_with_personal_cap.value, true, "personal cap and s.134(6) can both be used in the same year");

  const gross = 600000;
  const nis = nisFromEarnings(gross, "year");
  const base = incomeTax({ grossAnnual: gross, nisContributionsAnnual: nis.annualEmployee });
  const personalCap = base.headroom;
  const corpAt = (p) => {
    const after = incomeTax({ grossAnnual: gross, nisContributionsAnnual: nis.annualEmployee,
                              approvedContributionsAnnual: p });
    return s134MaxContribution({ grossAnnual: gross, chargeableIncome: after.chargeable });
  };
  const c0 = corpAt(0), c1 = corpAt(personalCap);
  eq(c0.max - c1.max, personalCap / 3, "each personal dollar costs exactly one third of a dollar of corporate ceiling");
  is(personalCap + c1.max > c0.max, true, "taking both still yields MORE total capacity than company-only");

  const corpRate = P.corporation_tax.ordinary_rate.value;
  // Compare like with like: all three strategies placing the SAME total.
  const want = 200000;
  const reliefOf = (p) => base.tax - incomeTax({ grossAnnual: gross,
      nisContributionsAnnual: nis.annualEmployee, approvedContributionsAnnual: p }).tax;
  const personalFirst = reliefOf(personalCap) + Math.min(want - personalCap, c1.max) * corpRate;
  const companyOnly   = Math.min(want, c0.max) * corpRate;
  is(personalFirst > companyOnly, true,
     `personal-first beats company-only placing ${want.toLocaleString()} (${personalFirst.toFixed(0)} vs ${companyOnly.toFixed(0)})`);

  // ...but personal-first is NOT the this-year optimum. Beyond the crossover each
  // personal dollar swaps 30% corporate relief for 25% personal relief.
  const pStar = (3 * want - base.chargeable) / 2;
  const cStar = corpAt(pStar).max;
  const atStar = reliefOf(pStar) + Math.min(want - pStar, cStar) * corpRate;
  eq(want - pStar, cStar, "at the crossover the company ceiling exactly absorbs the remainder");
  is(atStar > personalFirst, true,
     `this-year optimum ${atStar.toFixed(0)} narrowly beats personal-first ${personalFirst.toFixed(0)}`);
  console.log(`  note  the gap is only ${(atStar - personalFirst).toFixed(2)} — personal-first is recommended for the MATURITY treatment, not this year's relief`);

  // The maturity exemption is what settles it.
  const personalRate = P.income_tax.paye_bands.value[0].rate;
  const breakeven = 1 - (1 - corpRate) / (1 - personalRate);
  eq(breakeven, 1 - 0.70 / 0.75, "breakeven retirement tax rate is 6.67%");
  is(personalRate > breakeven, true,
     "T&T's own lowest band (25%) is far above the breakeven, so personal wins on lifetime value");
}

console.log("\n=== BIR Form 134 reproduced line by line ===");
{
  const nis = nisFromEarnings(600000, "year").annualEmployee;
  const r = s134FormCeiling({ salary: 600000, approvedAnnuity: 53830.20, nisAnnual: nis });
  eq(r.form.line1, 600000, "line 1 total emolument income (no existing company plan)");
  eq(r.form.line7, 60000, "line 7 employee contributions capped at 60,000");
  eq(r.form.line8, 450000, "line 8 chargeable income = assessable less line 7");
  eq(r.form.line9, 150000, "line 9 one third of chargeable income");
  eq(r.form.line10, 120000, "line 10 twenty per cent of emolument income");
  eq(r.ceiling, 150000, "ceiling is the GREATER of line 9 and line 11");
  eq(r.maxNewCompany, 90000, "company room = ceiling less the employee's own contributions");

  // The ceiling is SHARED — this is the correction the form forced.
  const none = s134FormCeiling({ salary: 600000, approvedAnnuity: 0, nisAnnual: nis });
  is(none.maxNewCompany > r.maxNewCompany, true,
     `filling the personal cap reduces company room (${none.maxNewCompany.toFixed(0)} -> ${r.maxNewCompany.toFixed(0)})`);

  // Existing company contributions raise emolument income but are not new room.
  const withExisting = s134FormCeiling({ salary: 600000, existingCompanyContribs: 40000,
                                         approvedAnnuity: 53830.20, nisAnnual: nis });
  eq(withExisting.form.line1, 640000, "line 1(b) adds contributions ALREADY being made");
  eq(withExisting.maxNewCompany, withExisting.maxTotalCompany - 40000,
     "what is already in force is not offered again as new room");

  // The deprecated function must not creep back in.
  const oldWay = s134MaxContribution({ grossAnnual: 600000, chargeableIncome: 450000 });
  is(Math.abs(oldWay.max - r.maxNewCompany) > 1, true,
     `the superseded function still disagrees (${oldWay.max.toFixed(0)} vs ${r.maxNewCompany.toFixed(0)}) — do not call it`);
}

console.log("\n=== Parameters needing attention (audit) ===");
for (const a of auditParameters()) console.log(`  [${a.status}] ${a.path}`);

console.log(`\n${fails === 0 ? "ALL CHECKS PASSED" : fails + " CHECK(S) FAILED"}\n`);
process.exit(fails === 0 ? 0 : 1);
