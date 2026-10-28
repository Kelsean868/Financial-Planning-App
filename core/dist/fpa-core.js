// fpa-core: the Financial-Planning-App planning engine (core/src/index.ts), one ES module, no dependencies.
// Built by `npm run build` in core/. Do not edit: change core/src and rebuild.

// src/household.ts
var MS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1e3;
function ageAt(dateOfBirth, on) {
  const b = new Date(dateOfBirth);
  const d = new Date(on);
  let age = d.getUTCFullYear() - b.getUTCFullYear();
  const beforeBirthday = d.getUTCMonth() < b.getUTCMonth() || d.getUTCMonth() === b.getUTCMonth() && d.getUTCDate() < b.getUTCDate();
  if (beforeBirthday) age -= 1;
  return age;
}
function yearsToPayoff(debt, on) {
  const ms = new Date(debt.endDate).getTime() - new Date(on).getTime();
  return ms <= 0 ? 0 : ms / MS_PER_YEAR;
}
function totalDebtBalance(h) {
  return h.debts.reduce((sum, d) => sum + d.balance, 0);
}
function mortgageBalance(h) {
  return h.debts.filter((d) => d.kind === "mortgage").reduce((s, d) => s + d.balance, 0);
}
function nonMortgageDebtBalance(h) {
  return h.debts.filter((d) => d.kind !== "mortgage").reduce((s, d) => s + d.balance, 0);
}
function dependents(h) {
  return h.dependents;
}
function youngestDependentChild(h, _on) {
  const kids = h.dependents.filter((p) => p.relationship === "child");
  if (kids.length === 0) return null;
  return kids.reduce(
    (youngest, p) => new Date(p.dateOfBirth).getTime() > new Date(youngest.dateOfBirth).getTime() ? p : youngest
  );
}
function yearsUntilLastChildReaches(h, targetAge, on) {
  const youngest = youngestDependentChild(h, on);
  if (!youngest) return 0;
  const b = new Date(youngest.dateOfBirth);
  const target = new Date(Date.UTC(b.getUTCFullYear() + targetAge, b.getUTCMonth(), b.getUTCDate()));
  const ms = target.getTime() - new Date(on).getTime();
  return ms <= 0 ? 0 : ms / MS_PER_YEAR;
}
function obligationDeclineSchedule(h, on) {
  const horizons = h.debts.map((d) => yearsToPayoff(d, on));
  const last = Math.ceil(Math.max(0, ...horizons));
  const out = [];
  for (let year = 0; year <= last; year++) {
    const remaining = h.debts.filter((d) => yearsToPayoff(d, on) > year).reduce((s, d) => s + d.balance, 0);
    out.push({ year, remainingDebt: remaining });
  }
  return out;
}

// ../parameters/tt-parameters.json
var tt_parameters_default = {
  $schema: "./tt-parameters.schema.json",
  _readme: "CANONICAL Trinidad & Tobago parameter tables. Single source of truth for BOTH the planning engine and the public calculators. Never hardcode any of these values anywhere else. Every parameter carries value + effective date + source URL + retrieved date + verification status. See README.md for the rules.",
  _generated: "2026-07-16",
  _rule: "Provenance is PER-PARAMETER, not per-page. Agencies contradict themselves: NIBTT publishes benefit rates in two places with ~69% different values; the Ministry of Finance publishes a TT$30,000 cap that is two increases and 17 years out of date; the SCP application form says $4,500 where the Ministry page says $5,500. Trust the maintained page over the linked PDF, and record where each number came from.",
  income_tax: {
    personal_allowance: {
      value: 9e4,
      unit: "TTD/year",
      effective: "2023-01-01",
      basis: "s.18 Income Tax Act Chap. 75:01, as amended by Finance Act 2022",
      source: "https://www.ird.gov.tt/individual/deductions-and-required-supporting-documents",
      retrieved: "2026-07-16",
      status: "VERIFIED",
      vote: "3-0",
      history: [
        { value: 72e3, effective: "2018-01-01" },
        { value: 84e3, effective: "2021-01-01" },
        { value: 9e4, effective: "2023-01-01" }
      ],
      notes: "Also extends to non-residents receiving T&T pension income. Budget 2026 announced no further increase."
    },
    paye_bands: {
      value: [
        { up_to: 1e6, rate: 0.25 },
        { up_to: null, rate: 0.3 }
      ],
      unit: "TTD chargeable income / rate",
      effective: "2026-01-01",
      source: "https://taxsummaries.pwc.com/trinidad-and-tobago/individual/taxes-on-personal-income",
      retrieved: "2026-07-16",
      status: "VERIFIED",
      notes: "Finance Act 2026 does not amend these. Confirmed unchanged for TY2026."
    },
    nis_deductible_portion: {
      value: 0.7,
      unit: "fraction of NIS contributions allowable",
      effective: null,
      basis: "BIR administrative practice — NO STATUTORY SECTION LOCATED",
      source: "https://www.ird.gov.tt/individual/deductions-and-required-supporting-documents",
      retrieved: "2026-07-16",
      status: "VERIFIED_PRACTICE_UNCITED",
      vote: "2-1",
      notes: "Safe to compute with; CANNOT be cited to a section. Appears on IRD's deductions page and Form T.D.-1 but no verifier located a statutory basis. Do not claim a legal citation."
    },
    combined_deduction_cap: {
      value: 6e4,
      unit: "TTD/year",
      effective: "2022-01-01",
      basis: "s.28(15) Income Tax Act Chap. 75:01, raised by Finance (No. 2) Act 2021",
      aggregates: [
        "approved pension fund plan contributions",
        "approved deferred annuity premiums",
        "70% of NIS contributions",
        "tax savings plan",
        "Widows' & Orphans' fund"
      ],
      source: "https://www.ird.gov.tt/individual/deductions-and-required-supporting-documents",
      retrieved: "2026-07-16",
      status: "VERIFIED",
      vote: "3-0",
      history: [
        { value: 3e4, effective: "2009-01-01" },
        { value: 5e4, effective: "2018-01-01" },
        { value: 6e4, effective: "2022-01-01" }
      ],
      warning: "The Ministry of Finance annuities page STILL PUBLISHES TT$30,000. It is two increases and 17 years stale. A verification panel killed that figure 0-3. Never source this from finance.gov.tt.",
      notes: "SINGLE AGGREGATE ceiling, not per-product."
    },
    other_deductions: {
      tertiary_education: {
        value: 72e3,
        unit: "TTD/year",
        effective: "2019-01-01",
        status: "VERIFIED",
        vote: "2-1",
        notes: "FOREIGN institutions only."
      },
      first_time_homeowner: {
        value: 3e4,
        unit: "TTD/year",
        effective: "2022-01-01",
        basis: "s.18A ITA",
        status: "VERIFIED",
        vote: "2-1",
        notes: "Property acquired on/after 2011-01-01; claimable for five years from year of acquisition."
      },
      covenanted_donations: { value: 0.15, unit: "fraction of total income", status: "VERIFIED", vote: "2-1" },
      alimony_maintenance: { value: 1, unit: "fraction", status: "VERIFIED", vote: "2-1", notes: "Lesser of payments made and the court-ordered amount." },
      travelling_expenses: { value: 0.6667, unit: "fraction of expenses", status: "VERIFIED", vote: "2-1" },
      s18D_fund_donations: {
        value: { lesser_of_fraction_of_income: 0.2, or_cap: 2e4 },
        unit: "TTD/year",
        effective: "2026-01-01",
        basis: "s.18D ITA, inserted by Finance Act 2026 cl.21(b)",
        status: "VERIFIED",
        vote: "3-0",
        warning: "NOT a retirement provision. This is for donations to a Fund established under s.43 of the Exchequer and Audit Act Chap. 69:01. It sits BESIDE the retirement sections and shares a plausible-looking cap, which invites misreading. It has NO interaction with the combined_deduction_cap."
      }
    }
  },
  corporation_tax: {
    ordinary_rate: {
      value: 0.3,
      unit: "fraction of chargeable profits",
      source: "https://taxsummaries.pwc.com/trinidad-and-tobago/corporate/taxes-on-corporate-income",
      retrieved: "2026-08-11",
      status: "VERIFIED_SINGLE_SOURCE",
      notes: "Ordinary companies. Banks, other licensed financial institutions and petrochemical companies pay 35%."
    },
    financial_and_petrochemical_rate: { value: 0.35, status: "VERIFIED_SINGLE_SOURCE", retrieved: "2026-08-11" },
    business_levy: {
      value: 6e-3,
      unit: "fraction of gross sales/receipts",
      status: "VERIFIED",
      vote: "3-0",
      retrieved: "2026-08-11",
      sources: [
        "https://www.ird.gov.tt/corporations",
        "https://www.ird.gov.tt/Media/Default/IRDForms/2016/I-500CTR--2016.pdf",
        "https://fitzwilliamstone.com/legal-insight/company-tax-regime-in-trinidad-and-tobago/"
      ],
      exemptions: {
        new_company_years: 3,
        new_company_basis: "Not charged until the expiry of three years from the date of registration, for a corporation registered after 1 January 1999.",
        turnover_threshold: 36e4,
        turnover_basis: "Exempt where gross sales or receipts do not exceed TT$360,000."
      },
      mechanism: "NOT a simple 'only if it exceeds corporation tax'. The company gets a credit against its business levy for corporation tax paid, capped at the levy. The net effect is that it pays the GREATER of corporation tax and business levy.",
      engine_rule: "A deduction only saves money while corporation tax stays ABOVE the business levy. Once corporation tax falls to the levy, further deduction saves nothing — structurally the same floor as the personal side, where relief is capped by tax payable. A company in its first three years, or under the 360,000 turnover threshold, has no levy floor and is unaffected."
    },
    green_fund_levy: {
      value: 3e-3,
      unit: "fraction of gross sales/receipts",
      status: "VERIFIED",
      vote: "3-0",
      retrieved: "2026-08-11",
      sources: [
        "https://www.ird.gov.tt/corporations",
        "https://fitzwilliamstone.com/legal-insight/company-tax-regime-in-trinidad-and-tobago/"
      ],
      exemptions: "NONE. There is no first-three-years exemption and no turnover threshold. It applies even where the company IS exempt from the business levy — the two must not be reasoned about together.",
      creditable: false,
      engine_rule: "Charged on gross receipts, not on profit, and creditable against nothing. A s.134(6) contribution does not change it at all. Exclude it from any annuity comparison — mentioning it only invites the reader to think it moves."
    }
  },
  health_surcharge: {
    rates: {
      value: [
        { monthly_emoluments_over: 469.99, weekly_rate: 8.25 },
        { monthly_emoluments_over: null, weekly_rate: 4.8 }
      ],
      unit: "TTD/week",
      source: "https://www.ird.gov.tt/health-surcharge",
      retrieved: "2026-07-16",
      status: "VERIFIED",
      vote: "3-0",
      notes: "Equivalent weekly test: >109.00/week => 8.25."
    },
    exemptions: {
      value: ["under_16", "aged_60_and_over", "only_income_is_pension"],
      source: "https://www.ird.gov.tt/health-surcharge",
      retrieved: "2026-07-16",
      status: "VERIFIED",
      vote: "3-0",
      warning: "MATERIAL for a retirement app: never charge health surcharge to a 60+ client. IRD wording is 'sixty (60) years and over' (i.e. 60+); one secondary source renders it 'over 60'. IRD governs. Do NOT cross-wire with the NIS 'under 16 / 65 and over' rule — different levy."
    }
  },
  nis: {
    contribution_rate: {
      value: 0.162,
      effective: "2026-01-05",
      split: { employee: 0.3333, employer: 0.6667 },
      source: "https://www.nibtt.net/Contribution_Rates/rates.html",
      retrieved: "2026-07-16",
      status: "VERIFIED",
      vote: "3-0",
      history: [
        { value: 0.132, effective: "2016-09-05" },
        { value: 0.12, effective: "2014-03-03" },
        { value: 0.117, effective: "2013-03-04" },
        { value: 0.114, effective: "2012-01-02" },
        { value: 0.108, effective: "2010-01-04" },
        { value: 0.105, effective: "2008-01-07" }
      ],
      future: {
        value: 0.192,
        effective: "2027-01-01",
        status: "PROVISIONAL",
        vote: "2-1",
        warning: "Rests on a Ministry of Finance budget announcement plus arithmetic (16.2 + 3). NO gazetted earnings-class schedule exists for 2027. Any 2027 class table is necessarily derived. NEVER present 2027 figures to a client as settled."
      }
    },
    insurable_earnings_ceiling: {
      value: 13600,
      unit: "TTD/month",
      effective: "2016-09-05",
      source: "https://www.nibtt.net/Contribution_Rates/rates_sep2016.html",
      retrieved: "2026-07-16",
      status: "VERIFIED",
      vote: "3-0",
      client_insight: "Earnings above this contribute at Class XVI but do NOT increase the pension. High earners hit a hard benefit ceiling. This is an honest, rules-based argument for private provision."
    },
    contribution_tables: {
      _rule: "ERA-SELECTED. Contributions are computed at the rate in force WHEN THEY WERE PAID. Select by contribution date, never by claim date.",
      _weeks_per_year: { value: 52, unit: "contribution weeks per year", status: "MARKET_CONVENTION", notes: "NIS is a weekly contribution; annualise at 52. Some calendar years contain 53 contribution weeks and payroll practice varies. Material only at the margin." },
      _source_note: "NIBTT publishes dated sets: 1972-2006, 2008-2012, 2013-2014, 2016, 2026. The 2016 page remaining live is CORRECT — contributions paid Sept 2016 to Jan 2026 were made at 13.2%.",
      "2026-01-05": {
        rate: 0.162,
        source: "https://www.nibtt.net/Contribution_Rates/NISContributions_20260105.pdf",
        status: "VERIFIED",
        classes: [
          { class: "I", monthly_min: 867, monthly_max: 1472.99, assumed_awe: 270, weekly_total: 43.8, weekly_employee: 14.6, weekly_employer: 29.2 },
          { class: "II", monthly_min: 1473, monthly_max: 1949.99, assumed_awe: 395, weekly_total: 63.9, weekly_employee: 21.3, weekly_employer: 42.6 },
          { class: "III", monthly_min: 1950, monthly_max: 2642.99, assumed_awe: 530, weekly_total: 85.8, weekly_employee: 28.6, weekly_employer: 57.2 },
          { class: "IV", monthly_min: 2643, monthly_max: 3292.99, assumed_awe: 685, weekly_total: 111, weekly_employee: 37, weekly_employer: 74 },
          { class: "V", monthly_min: 3293, monthly_max: 4029.99, assumed_awe: 845, weekly_total: 136.8, weekly_employee: 45.6, weekly_employer: 91.2 },
          { class: "VI", monthly_min: 4030, monthly_max: 4852.99, assumed_awe: 1025, weekly_total: 166.2, weekly_employee: 55.4, weekly_employer: 110.8 },
          { class: "VII", monthly_min: 4853, monthly_max: 5632.99, assumed_awe: 1210, weekly_total: 195.9, weekly_employee: 65.3, weekly_employer: 130.6 },
          { class: "VIII", monthly_min: 5633, monthly_max: 6456.99, assumed_awe: 1395, weekly_total: 225.9, weekly_employee: 75.3, weekly_employer: 150.6 },
          { class: "IX", monthly_min: 6457, monthly_max: 7409.99, assumed_awe: 1600, weekly_total: 259.2, weekly_employee: 86.4, weekly_employer: 172.8 },
          { class: "X", monthly_min: 7410, monthly_max: 8276.99, assumed_awe: 1810, weekly_total: 293.1, weekly_employee: 97.7, weekly_employer: 195.4 },
          { class: "XI", monthly_min: 8277, monthly_max: 9272.99, assumed_awe: 2025, weekly_total: 328.2, weekly_employee: 109.4, weekly_employer: 218.8 },
          { class: "XII", monthly_min: 9273, monthly_max: 10312.99, assumed_awe: 2260, weekly_total: 366, weekly_employee: 122, weekly_employer: 244 },
          { class: "XIII", monthly_min: 10313, monthly_max: 11396.99, assumed_awe: 2505, weekly_total: 405.9, weekly_employee: 135.3, weekly_employer: 270.6 },
          { class: "XIV", monthly_min: 11397, monthly_max: 12652.99, assumed_awe: 2775, weekly_total: 449.7, weekly_employee: 149.9, weekly_employer: 299.8 },
          { class: "XV", monthly_min: 12653, monthly_max: 13599.99, assumed_awe: 3029, weekly_total: 490.8, weekly_employee: 163.6, weekly_employer: 327.2 },
          { class: "XVI", monthly_min: 13600, monthly_max: null, assumed_awe: 3138, weekly_total: 508.5, weekly_employee: 169.5, weekly_employer: 339 }
        ],
        retrieved: "2026-08-11",
        vote: "2-0",
        transcription_note: "Classes II-XV transcribed 2026-08-11 from NISContributions_20260105.pdf. Two independent reads of the source agreed on every cell, and both reproduced the previously-VERIFIED Class I and Class XVI rows exactly. Gates applied to all 16 rows: employee + employer = total; total / assumed_awe = 16.2%; employee share = 1/3; bands contiguous with no gaps or overlaps.",
        client_insight: "The employee pays one third. At Class XVI that is 169.50/week = 8,814.00/year, of which 70% (6,169.80) is the most NIS can ever consume of the 60,000 combined deduction cap — so a ceiling earner with no company pension has 53,830.20 of annuity room, not 60,000."
      },
      "2016-09-05": {
        rate: 0.132,
        source: "https://www.nibtt.net/Contribution_Rates/rates_sep2016.html",
        retrieved: "2026-07-16",
        status: "VERIFIED",
        classes: [
          { class: "I", weekly_min: 200, weekly_max: 339.99, monthly_min: 867, monthly_max: 1472.99, assumed_awe: 270, weekly_employee: 11.9, weekly_employer: 23.8, weekly_total: 35.7, class_z: 1.79 },
          { class: "II", weekly_min: 340, weekly_max: 449.99, monthly_min: 1473, monthly_max: 1949.99, assumed_awe: 395, weekly_employee: 17.4, weekly_employer: 34.8, weekly_total: 52.2, class_z: 2.61 },
          { class: "III", weekly_min: 450, weekly_max: 609.99, monthly_min: 1950, monthly_max: 2642.99, assumed_awe: 530, weekly_employee: 23.3, weekly_employer: 46.6, weekly_total: 69.9, class_z: 3.5 },
          { class: "IV", weekly_min: 610, weekly_max: 759.99, monthly_min: 2643, monthly_max: 3292.99, assumed_awe: 685, weekly_employee: 30.1, weekly_employer: 60.2, weekly_total: 90.3, class_z: 4.52 },
          { class: "V", weekly_min: 760, weekly_max: 929.99, monthly_min: 3293, monthly_max: 4029.99, assumed_awe: 845, weekly_employee: 37.2, weekly_employer: 74.4, weekly_total: 111.6, class_z: 5.58 },
          { class: "VI", weekly_min: 930, weekly_max: 1119.99, monthly_min: 4030, monthly_max: 4852.99, assumed_awe: 1025, weekly_employee: 45.1, weekly_employer: 90.2, weekly_total: 135.3, class_z: 6.77 },
          { class: "VII", weekly_min: 1120, weekly_max: 1299.99, monthly_min: 4853, monthly_max: 5632.99, assumed_awe: 1210, weekly_employee: 53.2, weekly_employer: 106.4, weekly_total: 159.6, class_z: 7.98 },
          { class: "VIII", weekly_min: 1300, weekly_max: 1489.99, monthly_min: 5633, monthly_max: 6456.99, assumed_awe: 1395, weekly_employee: 61.4, weekly_employer: 122.8, weekly_total: 184.2, class_z: 9.21 },
          { class: "IX", weekly_min: 1490, weekly_max: 1709.99, monthly_min: 6457, monthly_max: 7409.99, assumed_awe: 1600, weekly_employee: 70.4, weekly_employer: 140.8, weekly_total: 211.2, class_z: 10.56 },
          { class: "X", weekly_min: 1710, weekly_max: 1909.99, monthly_min: 7410, monthly_max: 8276.99, assumed_awe: 1810, weekly_employee: 79.6, weekly_employer: 159.2, weekly_total: 238.8, class_z: 11.94 },
          { class: "XI", weekly_min: 1910, weekly_max: 2139.99, monthly_min: 8277, monthly_max: 9272.99, assumed_awe: 2025, weekly_employee: 89.1, weekly_employer: 178.2, weekly_total: 267.3, class_z: 13.37 },
          { class: "XII", weekly_min: 2140, weekly_max: 2379.99, monthly_min: 9273, monthly_max: 10312.99, assumed_awe: 2260, weekly_employee: 99.4, weekly_employer: 198.8, weekly_total: 298.2, class_z: 14.91 },
          { class: "XIII", weekly_min: 2380, weekly_max: 2629.99, monthly_min: 10313, monthly_max: 11396.99, assumed_awe: 2505, weekly_employee: 110.2, weekly_employer: 220.4, weekly_total: 330.6, class_z: 16.53 },
          { class: "XIV", weekly_min: 2630, weekly_max: 2919.99, monthly_min: 11397, monthly_max: 12652.99, assumed_awe: 2775, weekly_employee: 122.1, weekly_employer: 244.2, weekly_total: 366.3, class_z: 18.32 },
          { class: "XV", weekly_min: 2920, weekly_max: 3137.99, monthly_min: 12653, monthly_max: 13599.99, assumed_awe: 3029, weekly_employee: 133.3, weekly_employer: 266.6, weekly_total: 399.9, class_z: 20 },
          { class: "XVI", weekly_min: 3138, weekly_max: null, monthly_min: 13600, monthly_max: null, assumed_awe: 3138, weekly_employee: 138.1, weekly_employer: 276.2, weekly_total: 414.3, class_z: 20.72, class_z_correction: "NIBTT's page prints 220.72. That is a typo — a stray leading '2'. Class Z is exactly 5.00% of weekly_total for every class I-XV (XV: 20.00/399.90). 414.30 x 0.05 = 20.72. DO NOT propagate NIBTT's typo." }
        ]
      }
    },
    class_z: {
      value: "employment injury coverage only, employer-paid, ~5.00% of the class weekly total",
      applies_to: ["employed person under 16", "employed person in receipt of retirement pension", "employed person aged 65 and over"],
      unpaid_apprentice: { value: 1, unit: "TTD/week" },
      source: "https://www.nibtt.net/Contribution_Rates/rates.html",
      retrieved: "2026-07-16",
      status: "VERIFIED",
      notes: "Confirmed by the founder: a retiree drawing NIS pension who returns to work pays the reduced Class Z rate. It buys employment-injury cover only — no further retirement benefit accrues, which is why it is ~5%."
    },
    benefit_rates: {
      _rule: "SINGLE CURRENT TABLE, applied at QUALIFICATION date — NOT era-selected like contributions. NIBTT's own wording proves it: 'Rates ... for persons qualifying on or after 7th January 2008.'",
      _critical_warning: "NIBTT PUBLISHES BENEFIT RATES IN TWO PLACES WITH DIFFERENT VALUES AND DOES NOT RECONCILE THEM. The Benefits section (/benefits_09/tables/retire_invalidity_rates.htm) serves a STALE 2008 table and is the one its own Retirement pages link to. The CURRENT table lives under /Contribution_Rates/. Always use the 2016 table.",
      current: {
        effective: "2016-09-05",
        source: "https://www.nibtt.net/Contribution_Rates/Benefit_rates_retire_and_invalid_sep2016.html",
        retrieved: "2026-07-16",
        status: "VERIFIED",
        title: "Basic Retirement and Invalidity Pension Rates 2016",
        basic_monthly: {
          I: 566.72,
          II: 733.83,
          III: 870.18,
          IV: 1011.07,
          V: 1135.12,
          VI: 1332.5,
          VII: 1573,
          VIII: 1813.5,
          IX: 2080,
          X: 2353,
          XI: 2632.5,
          XII: 2938,
          XIII: 3256.5,
          XIV: 3607.5,
          XV: 3938,
          XVI: 4079.4
        },
        basic_weekly: {
          I: 130.78,
          II: 169.35,
          III: 200.81,
          IV: 233.32,
          V: 261.95,
          VI: 307.5,
          VII: 363,
          VIII: 418.5,
          IX: 480,
          X: 543,
          XI: 607.5,
          XII: 678,
          XIII: 751.5,
          XIV: 832.5,
          XV: 908.77,
          XVI: 941.4
        }
      },
      superseded_2008: {
        effective: "2008-01-07",
        ran_through: "2013",
        source: "https://www.nibtt.net/benefits_09/tables/retire_invalidity_rates.htm",
        status: "STALE_DO_NOT_USE",
        basic_monthly: { I: 335.83, XVI: 2475.7 },
        increment_monthly: { I: 4.9, XVI: 46.76 },
        warning: "THE PUBLIC CALCULATORS CURRENTLY HOLD THESE VALUES. They understate the pension ~40%, which OVERSTATES the retirement gap, which sells more product. That is the self-serving direction, wearing the client's own authority in a self-serve model. THIS IS THE PRIORITY FIX.",
        _history_note: "The 2014 Benefit Tables PDF prints 2013 and 2014 side by side; its 2013 column equals this table exactly, proving the 2008 rates ran through 2013. Progression Class I monthly: 335.83 (2008-13) -> 419.79 (2014) -> 566.72 (2016)."
      },
      increments: {
        status: "BLOCKING_UNRESOLVED",
        _problem: "The 2016 table publishes BASICS ONLY — no increment column. The 2013 table (benefits_09/tables/2013/retire_invalidity_rates.htm) publishes INCREMENTS ONLY. NIBTT appears to publish only what changed in each revision.",
        known: [
          { effective: "2008-01-07", monthly: { I: 4.9, XVI: 46.76 }, weekly: { I: 1.13, XVI: 10.79 } },
          { effective: "2013-03-04", monthly: { I: 6.11, XVI: 56.33 }, weekly: { I: 1.41, XVI: 13 } }
        ],
        readings: {
          a: "2013 increments still stand — 2014 and 2016 revised only basics. Current = 2016 basics + 2013 increments.",
          b: "Increments were revised in 2016 but not published on the site."
        },
        warning: "DO NOT GUESS. Reading (a) fits the publish-only-what-changed pattern, but this project has twice been burned by a plausible inference. Confirm with NIBTT directly or from the Legal Notices (Amendments/NIBTTAct_amend.html, Legal Notices 25-30) before the pension formula ships.",
        engine_behaviour: "Until resolved: compute the BASIC pension and the minimum, and REFUSE to compute increments rather than guess. Surface 'increment value unconfirmed' rather than silently using 2013."
      },
      formula: {
        value: "monthly_pension = basic_monthly[class] + floor(max(0, contributions - 750) / 25) * increment_monthly[class]",
        then: "monthly_pension = max(monthly_pension, minimum_pension)",
        status: "VERIFIED",
        vote: "3-0",
        source: "NIBTT retirement pages + NIBTT training transcript"
      }
    },
    averaging_basis: {
      value: "WHOLE_WORKING_LIFE",
      status: "VERIFIED",
      source: "NIBTT training session transcript (June 2022), verbatim",
      quote: "the manner in which we calculate the averages. Do you guys understand that it's not based on your last value of contributions, but your average value throughout your lifetime?",
      warning: "NOT final salary. NOT last 7 years. The '7 years' rule people remember is a QUALIFYING condition (employed 5 of the last 7 years), not the averaging window. Two different rules — implement both, separately."
    },
    qualifying_conditions: {
      value: {
        pension: { contributions: 750, note: "may include paid, Voluntary, Age Credits and/or Benefit Credits — not just paid weeks" },
        alternative_a: "150 total contributions with 50 in the last 3 years",
        alternative_b: "employed 5 of the last 7 years"
      },
      status: "VERIFIED",
      source: "NIBTT retirement pages + training transcript"
    },
    minimum_pension: {
      value: 3e3,
      unit: "TTD/month",
      effective: "2012-02-01",
      source: "https://www.nibtt.net/benefits_09/ben_retirement_II.html",
      retrieved: "2026-07-16",
      status: "VERIFIED",
      vote: "3-0",
      quote: "The board shall pay with effect from February 1, 2012 the sum of $3,000.00 monthly, as a pension to each person qualifying for a Retirement Pension",
      notes: "Applies only to persons QUALIFYING for a Retirement Pension (750+ contributions). Unindexed since 2012 — the 9th Actuarial Review explicitly recommended holding it there. Binds for classes I-XII; XIII-XVI now exceed it on basics alone. A challenge claiming the minimum attaches to the GRANT rather than the PENSION was refuted 0-3."
    },
    retirement_grant: {
      value: "3 x monetary value of total contributions",
      minimum: 3e3,
      unit: "TTD lump sum",
      effective: "2008-07-01",
      status: "VERIFIED",
      vote: "3-0",
      notes: "For persons with FEWER than 750 contributions. Excluded from SCP assessed income (not monthly income)."
    },
    retirement_age: {
      value: 60,
      claim_rules: {
        "60_to_64": "must cease insurable employment to claim; may return to insurable employment before 65 and keep the pension",
        "65": "payable whether or not the person retires"
      },
      phase_up: {
        from: "2028-01-01",
        rule: "+1 year every 2 years",
        to: 65,
        reaching_65: 2036,
        status: "VERIFIED",
        vote: "3-0"
      },
      source: "https://www.nibtt.net/benefits_09/ben_retirement.html",
      retrieved: "2026-07-16"
    }
  },
  scp: {
    _name: "Senior Citizens' Pension",
    _regulator: "Ministry of the People, Social Development and Family Services",
    bands: {
      value: [
        { assessed_income_up_to: 2500, pays: 3500 },
        { assessed_income_up_to: 3500, pays: 2500 },
        { assessed_income_up_to: 4500, pays: 1500 },
        { assessed_income_up_to: 5500, pays: 500 },
        { assessed_income_up_to: null, pays: 0 }
      ],
      unit: "TTD/month",
      source: "https://www.social.gov.tt/senior-citizens-pension",
      retrieved: "2026-07-16",
      status: "VERIFIED_SINGLE_SOURCE",
      warning: "Income must not exceed 5,500/month — above that is a HARD DISQUALIFICATION, not a taper to zero. NOTE: this rests on ONE Ministry page. An earlier verification round refuted these exact bands 1-2 before the source was scraped. A second source would be welcome.",
      form_discrepancy: "The linked SCP application form (2020) still states income must not exceed $4,500. The maintained page says $5,500. Prefer the page over the PDF."
    },
    assessed_income_includes_nis_pension: {
      value: true,
      source: "https://www.social.gov.tt/wp-content/uploads/2020/10/Senior-Citizens-Pension-Form-updated.pdf",
      retrieved: "2026-07-16",
      status: "VERIFIED",
      evidence: "Application form requires 'Evidence of National Insurance Benefits / other Pension / Benefits' (item 6) and asks 'Are you a Government or other pensioner? If so, how much is your monthly pension?' (item 31).",
      excludes: ["one-time NIS Retirement Grant (not monthly income)"],
      notes: "Confirmed by the founder. An earlier research round declared this unanswerable; the answer was on the Ministry's own form."
    },
    eligibility: {
      age: 65,
      residency: "20 years immediately preceding the claim (absences not exceeding 5 years in aggregate) OR 50 years in aggregate (not necessarily consecutive)",
      basis: "s.4(1) Senior Citizens' Pension Act Chap. 32:02",
      status: "VERIFIED",
      vote: "3-0"
    },
    cliff_edges: {
      value: [2500, 3500, 4500, 5500],
      unit: "TTD/month assessed income",
      status: "DERIVED",
      warning: "Hard thresholds. At 5,501 assessed income SCP goes to ZERO — one extra dollar costs 500/month. The engine MUST refuse to land a client just over a cliff without flagging it.",
      modal_case: "No NIS -> SCP 3,500 -> total 3,500. NIS minimum 3,000 -> SCP 2,500 -> total 5,500. A 3,000 NIS pension delivers 2,000. Since classes I-XII land at the 3,000 minimum, this is the COMMON case, not an edge case. Note SCP's maximum (3,500) EXCEEDS the NIS minimum pension (3,000)."
    }
  },
  group_life: {
    _note: "Employer-sponsored group life terms. T&T-specific and materially affects the protection gap: most employed clients are underinsured AND about to lose what they have.",
    reduction_age: {
      value: 66,
      unit: "age",
      source: "https://www.sagicor.com/en-tt/business-solutions/employee-benefits",
      retrieved: "2026-07-16",
      status: "VERIFIED_SINGLE_SOURCE",
      notes: "Sagicor T&T CariCARE group life. Coverage reduces by 50% at this age."
    },
    reduction_factor: {
      value: 0.5,
      unit: "fraction of face remaining",
      source: "https://www.sagicor.com/en-tt/business-solutions/employee-benefits",
      retrieved: "2026-07-16",
      status: "VERIFIED_SINGLE_SOURCE"
    },
    termination_age: {
      value: 70,
      unit: "age",
      source: "https://www.sagicor.com/en-tt/business-solutions/employee-benefits",
      retrieved: "2026-07-16",
      status: "VERIFIED_SINGLE_SOURCE",
      client_insight: "Group life terminates at 70 with NO post-retirement cover. This is the single best prospecting insight for the individual-cover conversation: what you have through work vanishes exactly when you may still have dependents.",
      warning: "Sourced from Sagicor's terms. Other T&T carriers' group schemes may differ — confirm per scheme before relying on it for a specific client. An engine that counts group cover as permanent is mis-selling."
    }
  },
  annuities: {
    statutory_maturity_floor: {
      value: 50,
      unit: "age",
      basis: "Income Tax Act — an approved pension fund plan or approved deferred annuity plan cannot provide for retirement or maturity before age 50",
      status: "VERIFIED",
      vote: "3-0",
      engine_rule: "REFUSE to model maturity below 50 — it is not legal, not merely disadvantageous."
    },
    exemption_window: {
      value: { min_age: 50, max_age: 70 },
      basis: "s.8(1)(ta) ITA, inserted by Finance Act 2026 cl.21(a)",
      status: "VERIFIED",
      vote: "3-0",
      engine_rule: "WARN (do not refuse) when a proposed annuity maturity exceeds 70 — legal, but forfeits the exemption. NOTE: this rule cannot fire on a Registered Destiny, whose only maturity options are 50/55/60/65/70. It matters for Unregistered."
    },
    income_exemption: {
      value: "exempt from income tax",
      effective: "2026-01-01",
      basis: "Act No. 16 of 2026 (Finance Act 2026), assented 2026-06-25, gazetted 2026-06-29, Gazette Vol. 65 No. 111",
      status: "VERIFIED",
      vote: "3-0",
      variants: {
        s8_1_ta_annuity: {
          applies_to: "approved deferred annuity plan under s.28",
          conditions: ["purchased by an individual resident in Trinidad and Tobago", "matures between the ages of fifty and seventy"]
        },
        s8_1_tb_pension_fund: {
          applies_to: "approved pension fund plan under s.28, upon maturity",
          conditions: ["purchased by a T&T resident"],
          warning: "NO AGE WINDOW. The two exemptions are DIFFERENT SHAPES. A planner treating them alike will get one wrong."
        }
      },
      retroactive_scope: {
        basis: "s.8(1B) ITA",
        value: "applies to plans approved BEFORE, ON, or AFTER 2026-01-01",
        commercial_note: "The exemption is NOT limited to new business. Every approved annuity already on the book falls inside the new treatment if it meets the conditions. This is a review trigger across the whole book."
      }
    },
    early_surrender_tax: {
      value: 0.25,
      basis: "s.28(10) Income Tax Act — obliges a trustee/trust corporation/company to deduct or withhold",
      status: "VERIFIED",
      vote: "3-0",
      warning: "The 25% CANNOT be cited to s.28(9). Finance Act 2026 cl.21(c) replaced s.28(9) with a bare avoidance-of-doubt provision specifying NO rate: 'any sum received when an approved pension fund plan or an approved deferred annuity plan is surrendered before the date of retirement or maturity shall be subject to tax.'",
      notes: "Only premiums refunded; accumulated gains forfeited; BIR approval required for surrender."
    },
    bir_approval_required: {
      value: true,
      basis: "s.28 ITA",
      status: "VERIFIED",
      vote: "3-0",
      notes: "Approved vs non-approved must be a first-class distinction in the data model. Only BIR-approved annuities qualify for the deduction and the exemption."
    },
    s134_6a_deferred_compensation: {
      limit: { chargeable_income_divisor: 3, gross_emoluments_share: 0.2, take: "greater" },
      unit: "TTD/year, per employee",
      status: "VERIFIED",
      vote: "3-0",
      authority: "BIR Computation Form 134 — see limit_source below. Was VERIFIED_MARKET_STANDARD while only insurer material supported it.",
      retrieved: "2026-08-11",
      basis: "NOT read from the statute. Three independent implementations agree on the shape: the greater of one-third of chargeable income, or 20% of gross emoluments.",
      sources: [
        "Tatil Cashbuilder III Product Specification (1995) — 'The maximum premium is one-third of the chargeable income of the employee.'",
        "Sagicor Business Tax Secure Annuity Plan (live, retrieved 2026-08-11) — 'up to 1/3 of assessable income or 20% of the employee's gross income (whichever is greater)', stated to operate under s.134(6).",
        "Kelsean868/T-T-Financial-Insurance-Hub corporate-annuity-calculator.html (live) — max(gross * 0.20, chargeable * 1/3)."
      ],
      basis_of_the_fraction: "CHARGEABLE income. Confirmed 2026-08-11 by the practitioner from his own quotation practice, and consistent with the 1995 Tatil spec and the live calculator. Sagicor's marketing page says 'assessable', which is the looser (larger) reading; it is not followed here. Chargeable is net of all deductions, so this is both the confirmed and the conservative basis.",
      employer_owned: true,
      maturity_exemption_applies: false,
      warning: "Employer-owned and employer-funded, so it FAILS the 'purchased by an individual who is a resident' condition in s.8(1)(ta). Income from a s.134(6) plan is therefore NOT covered by the Finance Act 2026 maturity exemption. Source: ATTIC guidance reported in the Trinidad Express, 2026. Do not present s.134(6) as a strictly larger version of a personal registered annuity — the deduction is bigger, the maturity treatment is worse.",
      employee_taxable_benefit: {
        value: false,
        status: "VERIFIED",
        confirmed: "2026-08-11",
        statutory_basis: "s.134(6) Income Tax Act Chap. 75:01 — see statutory_text below. The practitioner confirmed it from practice first; the section was located afterwards and agrees.",
        basis: "Confirmed by the practitioner, and now grounded in statute. The employer's contribution to a s.134(6) approved deferred compensation plan is NOT assessed as a taxable benefit in the employee's hands; the employee is taxed when the benefit is paid out, not when it is funded.",
        do_not_generalise: "This is specific to s.134(6). The e-Tax individual return carries a distinct line, 'Employer's contribution to Fund (Taxable Benefit)', which is non-zero for OTHER fund types. Never infer from this that employer contributions are untaxed generally - model the fund type, not the payer.",
        engine_rule: "Show the corporation-tax saving gross. Do NOT net a personal benefit charge against it."
      },
      combines_with_personal_cap: {
        value: true,
        confirmed: "2026-08-11",
        status: "VERIFIED_PRACTICE_UNCITED",
        basis: "Confirmed by the practitioner from his own quotation practice: a client may hold a personal approved annuity up to the 60,000 combined cap AND have a company fund a s.134(6) plan in the same year. They are not alternatives.",
        interaction: "They are not independent either. The one-third limb is measured on CHARGEABLE income, and the personal annuity is deducted in arriving at it - so every dollar of personal contribution reduces the s.134(6) ceiling by one third of a dollar. The practitioner's own live corporate calculator already models this, deducting the personal annuity before taking the third.",
        ordering_rule: "RECOMMEND PERSONAL FIRST, then company, then unregistered - but NOT because it maximises this year's relief. On this year's tax alone the optimum is to use personal only up to the crossover where the company ceiling exactly absorbs the remainder, P* = (3*desired - chargeable)/2, because beyond that point each personal dollar swaps 30% corporate relief for 25% personal relief. Worked at 600,000 gross placing 200,000: the true this-year optimum is 48,084.90 personal / 151,915.10 company saving 57,595.75, against 57,308.49 for filling personal first - a difference of only 287.26.",
        why_personal_first_still_wins: "The maturity treatment reverses it decisively. Personal registered income is exempt under s.8(1)(ta); a s.134(6) plan is employer-owned and taxable at maturity. Per dollar of net cost, personal returns 1/(1-0.25) = 1.3333 tax-free while company returns 1/(1-0.30) x (1-r) where r is the retirement tax rate. Breakeven r = 6.67%. T&T taxes retirement income above the 90,000 allowance at 25%, so all but the smallest retirement incomes are far past breakeven. In the worked case the 5,745.30 shifted into the personal plan costs 287.26 this year and gains 1,436.32 at maturity with NO growth at all, 2,872.65 if the fund doubles.",
        engine_rule: "Fill personal to its cap, then company, then unregistered. Do not present this as this-year-relief maximisation - it is not, by a small margin. If a client will genuinely pay no tax in retirement (retirement income under the personal allowance), the ordering reverses and company-first is better.",
        company_only_is_always_worst: "Skipping the personal plan entirely is the weakest of the three options on both axes: 50,383.02 against 57,308.49 in the worked case, a shortfall of 7,212.73, and it forfeits the maturity exemption on the whole amount.",
        floor_note: "The 20%-of-gross limb does not shrink with the personal deduction, so once one third of chargeable falls below it the personal contribution costs no corporate ceiling at all."
      },
      statutory_text: {
        status: "VERIFIED",
        retrieved: "2026-08-11",
        source: "Income Tax Act Chap. 75:01, s.134, via https://www.oas.org/juridico/english/mesicic3_tto_income_tax.pdf",
        section_heading: "s.134 — Benefits in kind to be taken into account",
        s134_6: "Subsection (1) shall not apply to expense incurred by the company in or in connection with the provision for a director or employee himself or for his spouse, children or dependants of any pension, annuity, lump sum, gratuity or other like benefit to be given on his death or retirement.",
        s134_6A: "Subsection (6) shall not apply where the employer contributes to a fund or contracts with any person to provide the benefit referred to in that subsection unless the fund or contract is approved by the Board.",
        what_it_actually_does: "s.134(1) charges company expenditure on a director or employee to that person as income in kind. s.134(6) EXCLUDES retirement provision from that charge; s.134(6A) withdraws the exclusion unless the fund or contract is BIR-approved. So the subsection the market names the product after is the one that stops the EMPLOYEE being taxed on the contribution — it is not the employer's deduction provision and it is not a contribution limit.",
        citable_for: [
          "the employer contribution not being a taxable benefit in the employee's hands (s.134(6)) — this is the statutory basis for employee_taxable_benefit above, which was previously practice-only",
          "the requirement that the fund or contract be BIR-approved (s.134(6A))"
        ],
        NOT_citable_for: "THE LIMIT. Neither subsection contains any numerical cap — no one third, no 20%, no figure at all. The one-third/20% rule therefore does NOT come from s.134(6). It is most likely a condition of Board approval under s.134(6A), or it sits in the employer's deduction rules. Never attribute the limit to s.134(6) in client-facing material."
      },
      limit_source: {
        status: "VERIFIED",
        found: "2026-08-11",
        document: "BIR COMPUTATION FORM 134 — 'GOVERNMENT OF THE REPUBLIC OF TRINIDAD AND TOBAGO / REQUEST FOR BOARD OF INLAND REVENUE APPROVAL / DETAILS OF CONTRIBUTIONS TO FUND OR CONTRACT IN ACCORDANCE WITH SECTION 134(6A) AND (6B) OF THE INCOME TAX ACT CHAPTER 75:01'",
        held_at: "C:/Users/noryk/Downloads/BIR COMPUTATION FORM 134 - Formatted - Open with Libre 1.xlsx (practitioner's copy of the BIR-issued form)",
        the_rule: "Front of form, note under line 12: 'Maximum Contributions to be made are the greater of Line 9 OR Line 11.' Line 9 = one third of chargeable income; Line 11 = 20% of total emolument income. This is the source of the one-third/20% rule — it is a BOARD APPROVAL condition under s.134(6A)/(6B), exactly as suspected, not a provision of s.134(6).",
        note: "The form also cites s.134(6B), which this module has not yet read. Locate it.",
        supersedes: "This displaces the 1995 Tatil spec and the insurer marketing pages as the authority for the limit."
      },
      form_logic_DIVERGES_FROM_THIS_MODULE: {
        status: "RESOLVED",
        resolved: "2026-08-11",
        resolution: "s134FormCeiling() now reproduces the form line by line and is what the calculators call. s134MaxContribution() is deprecated and must not be used. Both readings below were confirmed by the practitioner: the employee's 70% NIS does count inside line 8, and line 1(b) means contributions the company is ALREADY making, not the one being applied for — so the limit is not self-referential.",
        warning: "HISTORICAL — kept so the correction stays visible. The former s134MaxContribution() did not reproduce the BIR form.",
        difference_1_combined_ceiling: "The form tests ONE combined figure. Line 8 = line 6 (company contributions) + line 7 (employee contributions to approved plans, which the form defines as overleaf 6(a)(i)-(iii) AND 6(b), i.e. INCLUDING the employee's 70% NIS). That total is compared against the greater of the two limbs. This module instead treats the company ceiling as available ON TOP of the personal contribution.",
        difference_2_emolument_feedback: "Overleaf line 1 is 'Emolument Income (Inclusive of contributions to S.134(6) plans)', and the sheet sets 1(b) = the company contribution. So the company's own contribution inflates the base for the 20% limb — the limit is self-referential and must be solved iteratively, not evaluated once.",
        worked_impact: "Salary 600,000, personal annuity at the full 53,830.20 headroom. This module: company ceiling 150,000, total registered 203,830.20. The form: company ceiling 135,000, total registered 188,830.20 — this module OVERSTATES by 15,000. But with NO personal annuity the form gives 242,660.40 against this module's 167,943.40, an UNDERSTATEMENT of 74,717. The error changes sign, so it cannot be patched with a margin.",
        open_questions_for_the_practitioner: [
          "Does the employee's 70% NIS really count inside line 8? The form's own cross-reference to '6(a)(i) to (iii) and 6(b)' says yes, and 6(b) is NIS.",
          "Does the company contribution really inflate emolument income for the 20% limb, as cell I65=I37 implies?"
        ]
      },
      conditions: [
        "Employer owns the policy and is the applicant; employer takes the deduction against corporation tax",
        "Each policy must be BIR-approved before issue",
        "Cannot be borrowed against, assigned or surrendered (BIR conditions for deductibility)"
      ]
    }
  },
  estate: {
    estate_tax: { value: 0, status: "VERIFIED", vote: "3-0", notes: "T&T has NO inheritance, estate, or gift taxes. Estate duty repealed." },
    capital_gains_tax: { value: "none on most assets", status: "VERIFIED", notes: "Do not import US/AU estate-liquidity or CGT planning framings — they do not apply here." },
    engine_rule: "OMIT the US estate-tax liquidity driver from the needs formula. The T&T estate pitch is PROBATE BYPASS and asset titling/succession (Succession Act Ch. 9:02), not liquidity for tax. Optional: a stamp-duty calculator for gifts/conveyances."
  },
  conventions: {
    _note: "T&T market conventions — local norms, not universal truths. Sourced from the standard fact-finding instruments.",
    rental_income_months: { value: 120, source: "Tatil Life Client Financial Profile (needs formula)", status: "MARKET_CONVENTION" },
    income_continuation_to_age: { value: 21, source: "Tatil Life Client Financial Profile — 'Continuation of Income until Last child attains age 21'", status: "MARKET_CONVENTION" },
    funeral_cost_default: {
      value: 5e4,
      unit: "TTD",
      source: "Founder (Kyron Marchan, CBTT-registered Tatil Life agent, 13+ years T&T practice), 2026-07-17",
      status: "VERIFIED_PRACTICE_UNCITED",
      notes: "A DEFAULT, not a floor. Used when the client has no figure of their own; a stated figure overrides it in EITHER direction. Contrast medical_cost_minimum, which is a floor."
    },
    medical_cost_minimum: {
      value: 1e5,
      unit: "TTD",
      source: "Founder (Kyron Marchan, CBTT-registered Tatil Life agent, 13+ years T&T practice), 2026-07-17",
      status: "VERIFIED_PRACTICE_UNCITED",
      notes: "A FLOOR, not a default. A client's own lower estimate does NOT override it — final-illness costs in T&T are systematically underestimated by clients, and understating this is the direction that leaves a family short. Rationale is professional judgement, not a published schedule; revisit if a costing source is found."
    },
    emergency_fund_multiple: { value: 6, unit: "x gross monthly income", source: "Maritime Financial Fact Finder", status: "MARKET_CONVENTION", notes: "Note: 6x GROSS INCOME, not months of expenses as in US convention." },
    benchmark_allocation: {
      value: { tax: 0.15, loans: 0.25, retirement: 0.1, life_insurance: 0.05, general_insurance: 0.05, savings_investment: 0.1, living_expenses: 0.3 },
      status: "VERIFIED_MARKET_STANDARD",
      source: "Identical across PALIG Personal Net Worth Calculator (2012) and Maritime Financial Fact Finder",
      notes: "Two independent T&T insurers, thirteen years apart, identical. This is convention, not house style."
    },
    budget_bands: {
      value: [{ label: "5-9%", note: "tight budget" }, { label: "10-15%", note: "most clients — the anchor" }, { label: "16-25%", note: "a fortunate few" }],
      unit: "fraction of income toward solving needs",
      source: "Guardian Life Confidential Financial Questionnaire",
      status: "MARKET_CONVENTION",
      notes: "Elicit budget as a PERCENTAGE BAND with this social-proof anchor, not as a dollar figure. The middle band reads as the norm, the top flatters, the bottom gives permission."
    }
  },
  life_underwriting: {
    _note: "Tatil Life underwriting requirements by age and sum assured. Insurer-specific, NOT a T&T statutory parameter — kept here because this module is where provenance lives and the recommendation engine needs it to know whether a proposed cover triggers a medical.",
    _twin: "MIRRORED in AgencyTrack at src/config/medicalLimits/2026-04.js, which carries the derivation (requirementsFor / headroomFor). The two are checked against the shared figures in key_figures below. Cross-repo drift cannot be caught automatically from inside either repo — if you change one, change the other, and both suites will tell you the numbers moved.",
    medical_limits: {
      effective: "2026-04-01",
      source: "TATIL LIFE REVISED MEDICAL LIMITS (Effective April 1st, 2026) - Individual Life Insurance; internal memo 'Revision of Rates - LifeSpan Gold', A. Shaw (General Manager), 25-MAR-2026",
      retrieved: "2026-08-30",
      status: "VERIFIED_SINGLE_SOURCE",
      applies_to: ["life", "critical_illness"],
      age_basis: "age next birthday (attained age + 1)",
      age_basis_confirmed: "2026-08-30",
      age_basis_note: "CONFIRMED by the operator 30 Aug 2026: Tatil reckons AGE NEXT BIRTHDAY, for premiums and for these medical requirements alike. ANB is always attained age + 1 - a constant offset, not a mid-year switch. NEVER read this table with a raw attained age: the boundary that costs money is 50/51, where the non-medical band disappears entirely, so a client aged 50 is underwritten at 51 and a quote taken off their attained age promises a non-medical case and delivers a paramedical. AgencyTrack derives it with ageNextBirthday() in src/utils/medicalRequirements.js.",
      band_mapping_confirmed: "2026-08-30",
      band_mapping_note: "The source PDF's text layer emits its five age headings AFTER their five requirement blocks, so the age-to-block pairing was originally inferred from layout. It has since been checked against the printed table by the operator (30 Aug 2026) and stands as written - including the 16-40 / 41-50 pair (identical but for the chest X-ray at the top tier), the 750,000 breakpoint used only by 51-60, and the urine screen applying to ages 16-60 only.",
      exam_levels: {
        "Non-Medical": "A FORM, not the absence of a requirement: the questionnaire the agent completes with the client, internally life application part 2. Display it as 'Non-Medical form (life application part 2)' - 'Non-Medical' alone reads as 'no medical requirement', which is a different promise.",
        Paramedical: "Examiner visit, not a physician.",
        Medical: "Full medical examination."
      },
      bands: [
        { min_age: 0, max_age: 15, tiers: [
          { up_to: 5e5, exam: "Non-Medical", requirements: ["Non-Medical"] },
          { up_to: 75e4, exam: "Non-Medical", requirements: ["Non-Medical", "HIV", "APS"] },
          { up_to: 1e6, exam: "Paramedical", requirements: ["Paramedical", "HIV", "APS"] },
          { up_to: null, exam: "Medical", requirements: ["Medical", "HIV", "ECG", "APS"] }
        ] },
        { min_age: 16, max_age: 40, tiers: [
          { up_to: 5e5, exam: "Non-Medical", requirements: ["Non-Medical"] },
          { up_to: 1e6, exam: "Paramedical", requirements: ["Paramedical", "Micro", "Nicotine", "HIV", "Cholesterol", "HDL", "Fasting Blood Sugar"] },
          { up_to: 2e6, exam: "Medical", requirements: ["Medical", "Micro", "Nicotine", "HIV", "Fasting Lipid Blood Profile (Cholesterol, Trigs, HDL, LDL, VLDL)", "Fasting Blood Sugar"] },
          { up_to: null, exam: "Medical", requirements: ["Medical", "ECG", "Micro", "Nicotine", "HIV", "Complete Blood Profile (fasting): Alkaline Phosphatase, SGOT, SGPT, GGTP, Creatinine, Cholesterol, Trigs, HDL, LDL, VLDL, Fasting Blood Sugar"] }
        ] },
        { min_age: 41, max_age: 50, tiers: [
          { up_to: 5e5, exam: "Non-Medical", requirements: ["Non-Medical"] },
          { up_to: 1e6, exam: "Paramedical", requirements: ["Paramedical", "Micro", "Nicotine", "HIV", "Cholesterol", "HDL", "Fasting Blood Sugar"] },
          { up_to: 2e6, exam: "Medical", requirements: ["Medical", "Micro", "Nicotine", "HIV", "Fasting Lipid Blood Profile (Cholesterol, Trigs, HDL, LDL, VLDL)", "Fasting Blood Sugar"] },
          { up_to: null, exam: "Medical", requirements: ["Medical", "ECG", "Micro", "Nicotine", "HIV", "Complete Blood Profile (fasting): Alkaline Phosphatase, SGOT, SGPT, GGTP, Creatinine, Cholesterol, Trigs, HDL, LDL, VLDL, Fasting Blood Sugar", "Chest X-ray"] }
        ] },
        { min_age: 51, max_age: 60, tiers: [
          { up_to: 5e5, exam: "Paramedical", requirements: ["Paramedical", "Micro", "Cholesterol", "HDL", "Fasting Blood Sugar"] },
          { up_to: 75e4, exam: "Medical", requirements: ["Medical", "ECG", "Micro", "Nicotine", "HIV", "Fasting Lipid Blood Profile (Cholesterol, Trigs, HDL, LDL)", "Fasting Blood Sugar", "PSA (males only)"] },
          { up_to: 2e6, exam: "Medical", requirements: ["Medical", "ECG", "Micro", "Nicotine", "HIV", "Complete Blood Profile (fasting): Alkaline Phosphatase, SGOT, SGPT, GGTP, Creatinine, Cholesterol, Trigs, HDL, LDL, VLDL, Fasting Blood Sugar", "PSA (males only)"] },
          { up_to: null, exam: "Medical", requirements: ["Medical", "ECG", "Micro", "Nicotine", "HIV", "Complete Blood Profile (fasting): Alkaline Phosphatase, SGOT, SGPT, GGTP, Creatinine, Cholesterol, Trigs, HDL, LDL, VLDL, Fasting Blood Sugar", "PSA (males only)", "Chest X-ray"] }
        ] },
        { min_age: 61, max_age: null, tiers: [
          { up_to: 5e5, exam: "Medical", requirements: ["Medical", "Micro", "Fasting Lipid Blood Profile (Cholesterol, Trigs, HDL, LDL)", "Fasting Blood Sugar"] },
          { up_to: 15e5, exam: "Medical", requirements: ["Medical", "ECG", "Micro", "Nicotine", "HIV", "Complete Blood Profile (fasting): Alkaline Phosphatase, SGOT, SGPT, GGTP, Creatinine, Cholesterol, Trigs, HDL, LDL, VLDL, Fasting Blood Sugar", "PSA (males only)"] },
          { up_to: null, exam: "Medical", requirements: ["Medical", "ECG", "Micro", "Nicotine", "HIV", "Complete Blood Profile (fasting): Alkaline Phosphatase, SGOT, SGPT, GGTP, Creatinine, Cholesterol, Trigs, HDL, LDL, VLDL, Fasting Blood Sugar", "PSA (males only)", "Chest X-ray"] }
        ] }
      ],
      universal: [
        { from: 3e6, min_age: 16, max_age: 60, requirement: "Urine screen for marijuana and cocaine" },
        { from: 15e5, min_age: 0, max_age: null, requirement: "Financial Statement" },
        { from: 15e5, min_age: 0, max_age: null, requirement: "Inspection report" }
      ],
      determined_at_underwriting_from: 5e6,
      disability_income_rider_requires_medical: true,
      notes: "The DIR rule is the quiet one: a 100,000 case that is otherwise Non-Medical becomes a Medical the moment a Disability Income Rider is attached. 'Routine requirements' is a floor - underwriting may always ask for more, so never present this to a client as a promise."
    },
    key_figures: {
      _note: "The cross-repo contract. Both this file and AgencyTrack's src/config/medicalLimits/2026-04.js assert these same figures in their own suites, so a change to either side fails there and names what moved. This is NOT automatic cross-repo enforcement - no test inside one repo can read the other - it is a deliberate, checkable handshake.",
      non_medical_limit_16_to_50: 5e5,
      non_medical_limit_child_with_hiv_aps: 75e4,
      first_age_with_no_non_medical_band: 51,
      first_age_requiring_medical_from_first_dollar: 61,
      financial_statement_and_inspection_from: 15e5,
      urine_screen_from_ages_16_to_60: 3e6,
      determined_at_underwriting_from: 5e6,
      disability_income_rider_requires_medical: true
    }
  }
};

// ../parameters/tt-parameters.js
function deepFreeze(o) {
  if (o && typeof o === "object" && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
}
deepFreeze(tt_parameters_default);
var P = tt_parameters_default;
var UNSAFE = /* @__PURE__ */ new Set(["BLOCKING_UNRESOLVED", "PROVISIONAL", "UNVERIFIED_1995_SOURCE", "STALE_DO_NOT_USE"]);
var ParameterError = class extends Error {
};
function assertSafe(node, name) {
  if (node && UNSAFE.has(node.status)) {
    throw new ParameterError(
      `Parameter "${name}" has status ${node.status} and must not be used silently. ` + (node.warning ?? "See tt-parameters.json.")
    );
  }
  return node;
}
function nisClassForMonthly(monthly, tableDate = "2016-09-05") {
  const t = P.nis.contribution_tables[tableDate];
  if (!t) throw new ParameterError(`No NIS contribution table for ${tableDate}`);
  for (const c of t.classes) {
    const lo = c.monthly_min ?? -Infinity;
    const hi = c.monthly_max ?? Infinity;
    if (monthly >= lo && monthly <= hi) return c.class;
  }
  return "XVI";
}
function nisPension(lifetimeAvgMonthlyEarnings, totalContributions, opts = {}) {
  const { allowIncrements = false } = opts;
  const min = P.nis.minimum_pension.value;
  const threshold = P.nis.qualifying_conditions.value.pension.contributions;
  if (totalContributions < threshold) {
    return {
      type: "GRANT",
      note: `Fewer than ${threshold} contributions — a one-time Retirement Grant, not a pension.`,
      formula: P.nis.retirement_grant.value,
      minimum: P.nis.retirement_grant.minimum,
      countsTowardScp: false
      // a grant is not monthly income
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
      caveat = `This person has ${increments} increment${increments === 1 ? "" : "s"} (${excess} contributions above ${threshold}), but NIBTT has not published a 2016 increment schedule. Showing the basic pension and minimum only — the true figure may be higher.`;
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
    countsTowardScp: true,
    // confirmed: SCP form items 6 & 31
    effective: cur.effective,
    source: cur.source
  };
}
function scpBenefit(assessedMonthlyIncome, age) {
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
        cliffWarning: nearCliff ? `Assessed income is within $100 of the ${nearCliff} threshold. Crossing it reduces SCP.` : null,
        source: P.scp.bands.source
      };
    }
  }
  return { eligible: false, monthly: 0 };
}
function retirementFloor(lifetimeAvgMonthlyEarnings, totalContributions, age, otherMonthlyIncome = 0) {
  const nis = nisPension(lifetimeAvgMonthlyEarnings, totalContributions);
  const nisMonthly = nis.type === "PENSION" ? nis.monthly : 0;
  const assessed = otherMonthlyIncome + (nis.countsTowardScp ? nisMonthly : 0);
  const scp = scpBenefit(assessed, age);
  return {
    nis,
    scp,
    assessedIncome: assessed,
    totalMonthly: nisMonthly + scp.monthly + otherMonthlyIncome,
    note: "NIS retirement pension counts as SCP assessed income (grant does not). A 3,000 NIS pension typically delivers 2,000 net of the SCP reduction."
  };
}

// src/policy-ledger.ts
var GROUP_LIFE_REDUCTION_AGE = P.group_life.reduction_age.value;
var GROUP_LIFE_TERMINATION_AGE = P.group_life.termination_age.value;
var GROUP_LIFE_REDUCTION_FACTOR = P.group_life.reduction_factor.value;
function isActive(p) {
  return p.status === "in-force" || p.status === "paid-up";
}
function isDeathCover(p) {
  return isActive(p) && p.type !== "annuity" && p.type !== "critical-illness";
}
function inForceCoverAt(policies, age) {
  let individual = 0;
  let group = 0;
  let groupFaceTotal = 0;
  for (const p of policies) {
    if (!isDeathCover(p)) continue;
    if (p.isGroupCover) {
      groupFaceTotal += p.coverAmount;
      if (age >= GROUP_LIFE_TERMINATION_AGE) continue;
      group += age >= GROUP_LIFE_REDUCTION_AGE ? p.coverAmount * GROUP_LIFE_REDUCTION_FACTOR : p.coverAmount;
    } else {
      individual += p.coverAmount;
    }
  }
  return { individual, group, groupFaceTotal, total: individual + group };
}
function totalMonthlyPremium(policies) {
  return policies.filter(isActive).reduce((s, p) => s + p.monthlyPremium, 0);
}
function totalCashValue(policies) {
  return policies.filter(isActive).reduce((s, p) => s + (p.cashValue ?? 0), 0);
}
function policiesByType(policies, type) {
  return policies.filter((p) => p.type === type);
}
function universalLifePolicies(policies) {
  return policies.filter((p) => p.type === "universal-life" && isActive(p));
}

// src/parameters/row.ts
function row(value, status, source, asOf, extra = {}) {
  return { value, status, source, asOf, ...extra };
}
function unverified(source, asOf, note) {
  return { value: null, status: "unverified", source, asOf, note };
}
function deepFreeze2(o) {
  if (o && typeof o === "object" && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze2(v);
  }
  return o;
}
function isRow(node) {
  return !!node && typeof node === "object" && "status" in node && "asOf" in node && "source" in node && "value" in node;
}

// src/parameters/fact-finder-2026-10.ts
var D = "2026-10-27";
var PROTO = "Fact-Finder Prototype v17 (docs/prototype/fact-finder-prototype-v17.html), 27 Oct 2026";
var CG = "Care graph brief §4–§5 (signed 27 Oct 2026)";
var CLOSE = "Closing engine brief and addendum §11–15 (signed 27 Oct 2026)";
var ASSUMPTION_SET_ID = "ff-2026-10-28-cards1";
var FF = deepFreeze2({
  assumptionSetId: row(ASSUMPTION_SET_ID, "rule", "Section 1 §1.2: the assumption set is a versioned constant in the engine", D),
  rates: {
    inflation: row(0.03, "assumed", `${CG}: ILO ultimate for T&T, reached 2035`, D),
    careBasket: row(0.055, "assumed", `${CG}: deviation, headline + 2.5 points (food is the main driver)`, D),
    foreignTuition: row(0.04, "assumed", `${CG}: deviation, FX- and host-fee-driven`, D),
    medicalTrend: row(0.07, "assumed", `${CG}: deviation, no ILO equivalent`, D),
    realWageGrowth: row(0.0125, "assumed", `${CG}: ILO base scenario`, D),
    planningReturn: row(0.05, "advisor-set", `${CG} (return on savings 5.0%) and addendum §13 (planning rate, advisor-set). Care graph goldens are pinned at this default.`, D),
    survivorRealReturn: row(0.027, "assumed", `${PROTO}: real return on a survivor's capital`, D)
  },
  careGraph: {
    horizonYears: row(35, "assumed", "Care graph brief §3: horizon 35", D),
    minimumHorizonYears: row(10, "rule", "Care graph brief §8: horizon under 10 is an input error", D),
    careToParentAge: row(88, "assumed", `${PROTO}: a parent's care stream ends at 88`, D),
    currentGoalMaxStart: row(1, "rule", "Care graph brief §2.1: start <= 1 is a current budget line, no sinking fund", D),
    leverMinimumMonthly: row(50, "assumed", `${PROTO}: levers worth $50 a month or less are not shown`, D),
    leverShownAboveLoad: row(0.18, "rule", "Care graph brief §2.2: every verdict above 18% carries the top lever", D),
    topLeversShown: row(2, "rule", "Care graph brief §2.2: show the top two", D),
    verdictBands: row(
      [
        { upTo: 0.1, verdict: "Comfortable" },
        { upTo: 0.25, verdict: "Tight but real" },
        { upTo: 0.45, verdict: "Something has to give" },
        { upTo: null, verdict: "Not a savings problem" }
      ],
      "rule",
      "Care graph brief §2.2",
      D
    ),
    routes: row(
      {
        local: { label: "Local (UWI/UTT/COSTAATT)", years: 3, lean: 5200, typical: 27900, full: 50700, foreign: false, home: true },
        regional: { label: "Regional (Cave Hill/Mona)", years: 3, lean: 26300, typical: 44700, full: 63e3, foreign: false, home: false },
        uk: { label: "United Kingdom", years: 3, lean: 29e4, typical: 373300, full: 456700, foreign: true, home: false },
        canada: { label: "Canada", years: 4, lean: 285e3, typical: 368800, full: 452500, foreign: true, home: false },
        usa: { label: "United States", years: 4, lean: 365e3, typical: 402500, full: 44e4, foreign: true, home: false },
        none: { label: "Not funding", years: 0, lean: 0, typical: 0, full: 0, foreign: false, home: false }
      },
      "estimate",
      `${CG} §5: annual cost in TTD today, lean / typical / full`,
      D
    ),
    homeSupportMonthly: row(1800, "estimate", `${CG} §5: home support while studying locally, inflated at the care basket rate`, D),
    careTiers: row(
      [
        { tier: 0, label: "No support", monthly: 0 },
        { tier: 1, label: "Light top-up", monthly: 1500 },
        { tier: 2, label: "Help at home", monthly: 4e3 },
        { tier: 3, label: "Private residential", monthly: 5600 },
        { tier: 4, label: "High-dependency", monthly: 12e3 }
      ],
      "estimate",
      `${CG} §5: parent care tiers, TTD a month today. Caregiver cost cross-check: Paylab 2026, $2,772–$7,808 a month (Section 2 risk 4)`,
      D
    )
  },
  offsets: {
    scpMonthly: row(3750, "verified", "Senior Citizens' Pension $3,750 a month from 1 Jan 2027 (Budget Statement 12 Oct 2026; pension audit)", "2027-01-01"),
    nisPlusScpCap: row(5500, "verified", "NIS plus SCP capped at $5,500 a month combined (Trinidad Guardian, 17 Oct 2026; pension audit)", "2026-10-17"),
    nisSurvivorSpouseMonthly: row(600, "verified", "NIBTT survivors' minimum: $600 a month to the spouse (care graph brief §6.1)", D),
    nisSurvivorChildMonthly: row(600, "verified", "NIBTT survivors' minimum: $600 a month per child (care graph brief §6.1)", D),
    nisSurvivorChildToAge: row(19, "verified", "NIBTT survivors' benefit for a child to age 19 (care graph brief §6.1)", D),
    nisFuneralGrant: row(7500, "verified", `${CLOSE} §5.2: NIS funeral grant TT$7,500, held flat`, D),
    nisFuneralGrantContributions: row(25, "verified", `${CLOSE} §5.2: the deceased needs 25 or more contributions`, D),
    probateFreePayment: row(25e3, "verified", `${CLOSE} §5.1: Insurance Act s.193, TT$25,000 payable without probate`, D)
  },
  tax: {
    nisEmployeeRate: row(0.054, "verified", "NIBTT contribution rates from 5 Jan 2026: 16.2% of insurable earnings, one third (5.4%) paid by the employee (root nis.contribution_rate)", "2026-01-05"),
    nisDeductibleShare: row(0.7, "verified", `IRD form TD1 2023, line 4(b) "N.I.S (70% of Employees Contribution)": taxable pay deducts 70% of the employee's NIS. Kyron's ruling 27 Oct 2026 (Decision 1 = A) replaced the prototype's 100%; the §2.8 goldens were re-baselined (docs/audit/RUN-2026-10-27-fix-nis70.md).`, D),
    surchargeWeeksPerYear: row(52, "verified", "Health surcharge is a weekly charge (root health_surcharge.rates)", D),
    surchargeExemptFromAge: row(60, "verified", "Root health_surcharge.exemptions: aged 60 and over", D),
    paysTaxAbove: row(0.5, "assumed", `${PROTO}: monthly PAYE above $0.50 counts as paying tax`, D)
  },
  budget: {
    stagePercents: row(
      [
        { stage: 0, ofNet: 0, ofSurplus: 0 },
        { stage: 1, ofNet: 0.05, ofSurplus: 0.2 },
        { stage: 2, ofNet: 0.08, ofSurplus: 0.25 },
        { stage: 3, ofNet: 0.1, ofSurplus: 0.3 },
        { stage: 4, ofNet: 0.12, ofSurplus: 0.35 }
      ],
      "rule",
      `${PROTO}: triage stage and safe insurance ceiling = min(share of net, share of surplus)`,
      D
    ),
    emergencyMonthsAlone: row(3, "assumed", `${PROTO}: emergency fund, no dependants`, D),
    emergencyMonthsDependants: row(6, "assumed", `${PROTO}: emergency fund with dependants`, D),
    emergencyMonthsSelfEmployed: row(9, "assumed", `${PROTO}: emergency fund, self-employed`, D),
    badDebtAbovePct: row(10, "rule", `${PROTO}: debt above 10% a year is expensive debt`, D),
    hardballNeedsRatio: row(0.85, "assumed", `${PROTO}: needs above 85% of take-home is the hardball case`, D),
    minimumWageHourly: row(20.5, "verified", "T&T national minimum wage $20.50 an hour (prototype v17)", D),
    weeksPerMonth: row(4.33, "assumed", "52 weeks over 12 months, rounded (prototype v17)", D),
    payYourselfFirstPct: row(15, "advisor-set", `${PROTO}: pay-yourself-first slider default 15% of take-home`, D),
    bufferTargetMonths: row(3, "rule", `${CLOSE} §11.2: buffer out to three months (tier 2)`, D),
    bufferPreconditionMonths: row(1, "rule", `${CLOSE} §11.2: one month of buffer cash (tier 0)`, D),
    bufferBuildMonths: row(24, "assumed", `${PROTO}: the buffer shortfall is built over 24 months in the plan`, D),
    builderBufferBuildMonths: row(12, "assumed", `${PROTO}: the budget builder fills the emergency fund over 12 months`, D),
    savingsDefaultShareOfNet: row(0.1, "assumed", `${PROTO}: savings plans default to 10% of take-home`, D)
  },
  deathNeed: {
    survivorYears: row(30, "assumed", `${PROTO}: survivor cashflow runs 30 years`, D),
    partnerWorksToAge: row(60, "assumed", `${PROTO}: partner income counted to age 60`, D),
    householdShareWithChildren: row(0.6, "assumed", `${PROTO}: with children, 60% of living costs is the household and 40% is split across the children`, D),
    incomeToYoungestAge: row(19, "rule", "Closing engine brief §2.0: household income gap to youngest age 19", D),
    underwritingMultiples: row(
      [
        { toAge: 35, times: 30 },
        { toAge: 45, times: 25 },
        { toAge: 60, times: 20 },
        { toAge: 65, times: 10 },
        { toAge: null, times: 5 }
      ],
      "assumed",
      `${PROTO}: underwriting ceiling, times annual gross by age. No method recommends more.`,
      D
    ),
    metTolerance: row(1, "assumed", `${PROTO}: an obligation within $1 of funded is met`, D),
    tatilEducationPerChild: row(15e4, "assumed", `${PROTO}: Tatil standard formula, education per child (cross-check only)`, D),
    crossCheckMethods: row(
      {
        incomeShareOfGross: 0.7,
        retentionRate: 0.08,
        spendDownRealRate: 0.027,
        yearsWithChildren: 10,
        yearsWithoutChildren: 5,
        atticTimes: 7,
        ageMultiples: [{ toAge: 40, times: 30 }, { toAge: 50, times: 20 }, { toAge: 60, times: 15 }, { toAge: 65, times: 10 }, { toAge: null, times: 0 }]
      },
      "assumed",
      `${PROTO}: the six cross-check methods other fact finds use (shown beside the stack, never used to size cover)`,
      D
    ),
    tatilIncomeToYoungestAge: row(21, "assumed", `${PROTO}: Tatil standard formula, income to youngest age 21 (cross-check only)`, D)
  },
  premiumRates: {
    baseAge: row(38, "estimate", `${PROTO}: sample rates are anchored at age 38`, D),
    termPer1000: row(0.29, "estimate", `${PROTO}: SAMPLE term rate per $1,000 a month at the base age. Rough, never a quote.`, D),
    termAgeGrowth: row(1.08, "estimate", `${PROTO}: term rate grows 8% a year of age`, D),
    wholeLifePer1000: row(0.934, "estimate", `${PROTO}: SAMPLE whole life rate per $1,000 a month`, D),
    wholeLifeAgeGrowth: row(1.07, "estimate", PROTO, D),
    ciPer1000: row(0.85, "estimate", `${PROTO}: SAMPLE critical illness rate per $1,000 a month`, D),
    ciAgeGrowth: row(1.07, "estimate", PROTO, D),
    // Was one row, restAssuredPer1000 1.6 (estimate, the prototype's), until 27 Oct 2026 (docs/audit/RUN-2026-10-27-fix-one-allocator.md).
    restAssuredMale: row(
      { per1000: 8.7627, ratedAge: 72 },
      "verified",
      "ApplyOn quote, lead TTRA-9WZE859: Rest Assured II, male, rated age 72 (next birthday), Pay to Age 100, monthly, taxes and stamp duty included: $262.88 on $30,000, $438.14 on $50,000",
      D
    ),
    restAssuredFemale: row(
      { per1000: 5.952, ratedAge: 67 },
      "verified",
      "ApplyOn quote, lead TTRA-9DWVJ3Y: Rest Assured II, female, rated age 67 (next birthday), Pay to Age 100, monthly, taxes and stamp duty included: $297.60 on $50,000 ($178.56 on $30,000 by proportion)",
      D
    ),
    restAssuredAgeGrowth: row(
      1.05,
      "estimate",
      `${PROTO}: Rest Assured II rate grows 5% a year of age away from each quoted anchor`,
      D,
      { caveat: "The Rest Assured II rate at an age other than the two quoted ages (male 72, female 67) uses a 5% a year age factor that is not yet checked against a quote." }
    ),
    cashbuilderCoverShare: row(0.7, "estimate", `${PROTO}: Cashbuilder II buys cover with 70% of its premium at the whole life rate`, D),
    endowmentCoverYears: row(20, "estimate", `${PROTO}: endowment cover is about 20 years of premium`, D),
    endowmentCoverShare: row(0.9, "estimate", PROTO, D),
    bandSpread: row(0.15, "assumed", "Section 2 §2.5: a rough band, estimate ± 15% (run record R14)", D)
  },
  goals: {
    savingReturn: row(0.03, "assumed", `${PROTO}: goal saving in a fund growing about 3% a year`, D),
    homeLoanToValue: row(0.9, "assumed", "Section 2 §2.3: lenders lend up to about 90%", D),
    homeClosingCosts: row(0.05, "assumed", `${PROTO}: closing costs, rough 5% (legal, valuation)`, D),
    mortgageRatePct: row(6, "assumed", `${PROTO}: mortgage illustrated at 6%`, D),
    mortgageMinYears: row(5, "assumed", PROTO, D),
    mortgageMaxYears: row(30, "assumed", PROTO, D),
    mortgageEndsByAge: row(65, "assumed", PROTO, D),
    affordabilityShareOfGross: row(0.35, "assumed", `${PROTO}: all loan payments under about a third of gross pay`, D),
    stampDutyReliefBelow: row(2e6, "assumed", "Section 2 §2.3: first-time buyer stamp duty relief under $2M. Not checked against the Stamp Duty Act this run.", D),
    loanCoverMinimumMonthly: row(150, "rule", "Kyron 27 Oct 2026 (Section 2 §2.4): life cover on a loan costs at least the $150 minimum", D)
  },
  carLoan: {
    ratePct: row(7.5, "assumed", "Section 2 risk 4: car loan rate 7.5% is an assumption", D),
    defaultTermYears: row(8, "assumed", "Section 2 risk 4: 8–10 year term is an assumption", D),
    maxTermYears: row(10, "assumed", "Section 2 risk 4: 8–10 year term is an assumption", D),
    newMaxFinancing: row(1, "verified", "Republic Bank: up to 100% financing on new cars (Section 2 risk 4)", D),
    usedMinDepositPct: row(20, "assumed", "Section 2 §2.3: used cars 70–80% financing, so a deposit of at least 20%", D),
    depreciationPerYear: row(0.15, "assumed", `${PROTO}: a car loses about 15% of its value a year`, D),
    cushionPayments: row(3, "assumed", `${PROTO}: with no deposit, save three payments first`, D)
  },
  debts: {
    maxMonths: row(600, "assumed", `${PROTO}: a payoff that has not finished in 50 years is stalled`, D),
    clearedBelow: row(5e-3, "assumed", "Half a cent counts as cleared", D)
  },
  healthScore: {
    partMax: row(20, "rule", `${PROTO}: five parts of 20 points`, D),
    needsRatioSpan: row(0.5, "assumed", `${PROTO}: spending scores full when needs are 50% of take-home or less, falling to zero at 100%`, D),
    bufferFullMonths: row(6, "assumed", `${PROTO}: savings cushion scores full at six months`, D),
    badDebtFactor: row(40, "assumed", `${PROTO}: debt part loses 40 points per year of take-home owed`, D),
    labels: row(
      [
        { from: 80, label: "Strong" },
        { from: 60, label: "Good" },
        { from: 40, label: "Getting there" },
        { from: 0, label: "Needs work" }
      ],
      "assumed",
      PROTO,
      D
    )
  },
  startEarly: {
    targetAge: row(65, "assumed", `${PROTO}: start-early runs to 65`, D),
    drawdownRate: row(0.03, "assumed", `${PROTO}: income for life, roughly 3% a year of the pot`, D),
    illustrativeReturns: row(
      { bank: { label: "Bank savings", pct: 0.5 }, balanced: { label: "Balanced fund", pct: 5 }, growth: { label: "Growth fund", pct: 7 } },
      "estimate",
      `${PROTO}: illustrations of a kind of account, not product figures (addendum §13)`,
      D
    )
  },
  lovedOnes: {
    childSavingToAge: row(18, "assumed", `${PROTO}: child savings run to age 18`, D),
    adultEndowmentYears: row(15, "assumed", PROTO, D),
    elderCareFundYears: row(5, "assumed", PROTO, D),
    retireAtAge: row(65, "assumed", PROTO, D),
    minimumAnnuityYears: row(5, "assumed", PROTO, D),
    illustrativeGrowth: row(0.03, "assumed", `${PROTO}: "at an assumed 3% a year ... Not promised"`, D),
    successorOwnerFromAge: row(65, "assumed", `${PROTO}: name a successor owner when the buyer is 65 or over`, D)
  },
  business: {
    keyPersonMultiple: row(5, "assumed", `${PROTO}: key person cover about five times what they bring in`, D),
    keyPersonMultipleHigh: row(10, "assumed", `${PROTO}: some businesses use up to ten times`, D),
    overheadMonths: row(12, "assumed", `${PROTO}: a year of overheads`, D),
    groupPlanFromStaff: row(3, "assumed", `${PROTO}: with 3 or more staff a group plan is possible`, D)
  },
  closing: {
    bandShares: row({ floor: 0.5, recommended: 0.75, ceiling: 1 }, "rule", "Care graph brief §0.4, closing brief §3: Floor 50 / Recommended 75 / Ceiling 100, anchored at the ceiling", D),
    nearDatedYears: row(3, "rule", `${CLOSE} §11.2: anything due inside three years is tier 2`, D),
    parentFuneralCost: row(5e4, "advisor-set", `${CLOSE} §5.2: funeral cost is advisor-set; default seeded from root conventions.funeral_cost_default`, D),
    minimumCoverOnPlan: row(15e4, "rule", "Term Life minimum cover (Section 2 §2.4): a proposed life plan is at least $150,000", D),
    registeredWithdrawalTax: row(0.25, "rule", `${CLOSE} §12.2: a registered withdrawal before maturity is taxed at 25% of the amount withdrawn`, D),
    unregisteredMaturityTo: row(85, "rule", `${CLOSE} §12.1: unregistered maturity to 85`, D),
    retirementCapitalRate: row(0.03, "assumed", `${PROTO}: capital needed for a retirement gap, at a 3% draw`, D),
    reliefRate: row(0.25, "assumed", `${PROTO}: relief on approved annuity premiums at the 25% band`, D),
    ciIncomeYears: row(10, "rule", "Care graph brief §9.1 and closing brief §2: CI = 10 x income", D),
    planToAge: row({ male: 85, female: 90, longLivedExtra: 5 }, "assumed", `${PROTO}: plan to 85 (men) or 90 (women), five more for a long-lived family, not to the average`, D),
    nisPensionAge: row(65, "verified", "NIS retirement pension age 65 (root nis.retirement_age; pension audit)", D)
  }
});

// src/parameters/tatil-products-2026-10.ts
var D2 = "2026-10-27";
var SHAPES = "General-Rater-Portal life-shapes.js PRODUCTS";
var PRODUCTS_JS = "General-Rater-Portal life-products.js";
var KYRON = "Kyron, 27 Oct 2026 (Section 2 §2.4, signed)";
var REST_ASSURED_GRADING = "Rest Assured II has a graded death benefit: in year one it returns the premiums paid; in year two it pays the greater of 25% of the sum assured or the premiums paid; full cover from year three. Accidental death pays in full from day one.";
function product(spec, status, source) {
  return row(spec, status, source, D2);
}
var PRODUCTS = deepFreeze2({
  term: product({
    id: "term",
    name: "Term Life",
    cover: { min: 15e4, max: 1e7 },
    issueAge: { min: null, max: 65 },
    minPremiumMonthly: 150,
    singleDeposit: null,
    riders: ["add"],
    disclosure: null
  }, "rule", `${SHAPES}; ${KYRON}`),
  "whole-life": product({
    id: "whole-life",
    name: "Whole Life",
    cover: { min: 65e3, max: null },
    issueAge: { min: null, max: null },
    minPremiumMonthly: 150,
    singleDeposit: null,
    riders: ["add"],
    disclosure: null
  }, "rule", `${SHAPES}; ${KYRON}`),
  endowment: product({
    id: "endowment",
    name: "Endowment",
    cover: { min: 55e3, max: null },
    issueAge: { min: null, max: null },
    minPremiumMonthly: 150,
    singleDeposit: null,
    riders: ["add"],
    disclosure: null
  }, "rule", `${SHAPES}; ${KYRON}`),
  "life-span-gold": product({
    id: "life-span-gold",
    name: "Life Span Gold (critical illness)",
    cover: { min: 1e5, max: 2e6 },
    issueAge: { min: null, max: null },
    minPremiumMonthly: 150,
    singleDeposit: null,
    riders: [],
    disclosure: null
  }, "rule", `Kyron's rule (Section 2 §2.4): $100,000 floor; OIPA allows $50,000, not used`),
  goldspoon: product({
    id: "goldspoon",
    name: "Goldspoon",
    cover: { min: 1e4, max: 15e4 },
    issueAge: { min: 1, max: 12 },
    minPremiumMonthly: 150,
    singleDeposit: null,
    riders: [],
    disclosure: null
  }, "verified", SHAPES),
  "rest-assured-ii": product({
    id: "rest-assured-ii",
    name: "Rest Assured II",
    cover: { min: 3e4, max: 15e4 },
    issueAge: { min: null, max: 80 },
    minPremiumMonthly: null,
    singleDeposit: null,
    riders: [],
    disclosure: REST_ASSURED_GRADING
  }, "rule", `${KYRON}; grading: research/tatil-product-specifications.md (Rest Assured 2024), Section 1 appendix`),
  "cashbuilder-ii": product({
    id: "cashbuilder-ii",
    name: "Cashbuilder II (universal life)",
    cover: { min: 1e4, max: null },
    issueAge: { min: null, max: null },
    minPremiumMonthly: 300,
    singleDeposit: null,
    riders: ["disability-income", "add"],
    disclosure: null
  }, "rule", KYRON),
  destiny: product({
    id: "destiny",
    name: "Destiny (annuity)",
    cover: null,
    issueAge: { min: null, max: null },
    minPremiumMonthly: 200,
    singleDeposit: null,
    riders: [],
    disclosure: null
  }, "rule", KYRON),
  "platinum-edge": product({
    id: "platinum-edge",
    name: "Platinum Edge",
    cover: null,
    issueAge: { min: null, max: null },
    minPremiumMonthly: null,
    singleDeposit: { min: 5e4, max: 1e6 },
    riders: [],
    disclosure: "Platinum Edge needs a single deposit. Whether it has a graded benefit is not yet confirmed (open item 5.3a)."
  }, "verified", PRODUCTS_JS),
  spia: product({
    id: "spia",
    name: "SPIA (single premium immediate annuity)",
    cover: null,
    issueAge: { min: 50, max: null },
    minPremiumMonthly: null,
    singleDeposit: { min: 5e4, max: 2e6 },
    riders: [],
    disclosure: "A SPIA cannot be surrendered."
  }, "verified", PRODUCTS_JS)
});
var RIDERS = deepFreeze2({
  "disability-income": row({
    id: "disability-income",
    name: "Disability Income Rider",
    allowedOn: ["cashbuilder-ii"],
    underwriting: "Medical at any amount",
    incomeProtection: true
  }, "rule", "Kyron, 27 Oct 2026: Cashbuilder II only, Medical at any amount (Section 2 §2.4 rider rule 1)", D2),
  add: row({
    id: "add",
    name: "Accidental Death and Dismemberment",
    allowedOn: ["term", "whole-life", "endowment", "cashbuilder-ii"],
    underwriting: "As the base plan",
    incomeProtection: false
  }, "rule", "Section 2 §2.4 rider rule 2: AD&D pays on accident only; never income protection", D2)
});
var VEHICLES = deepFreeze2({
  "destiny-settler": row(
    { id: "destiny-settler", product: "destiny", name: "Destiny Settler", floor: 0.02, capitalProtected: false },
    "rule",
    "Addendum §13: Destiny Settler floor 2%",
    D2
  ),
  "destiny-explorer": row(
    { id: "destiny-explorer", product: "destiny", name: "Destiny Explorer", floor: 0.01, capitalProtected: false },
    "rule",
    "Addendum §13: Destiny Explorer floor 1%",
    D2
  ),
  "destiny-adventurer": row(
    { id: "destiny-adventurer", product: "destiny", name: "Destiny Adventurer", floor: 0, capitalProtected: true },
    "rule",
    "Addendum §13: Destiny Adventurer floor 0%, capital protected",
    D2
  ),
  "platinum-edge": row(
    { id: "platinum-edge", product: "platinum-edge", name: "Platinum Edge", floor: 0.025, capitalProtected: false },
    "rule",
    "Addendum §13: Platinum Edge floor 2.5%",
    D2
  )
});
var ANNUITY_LEVERS = deepFreeze2({
  destinyGuaranteedYears: row([5, 10, 15], "rule", "Closing brief §4.1", D2),
  destinySpousalShares: row([0.5, 1], "rule", "Closing brief §4.1", D2),
  spiaSpousalShares: row([0.5, 0.6, 0.6667, 1], "rule", "Closing brief §4.1", D2),
  destinyLumpAtVesting: row([0, 0.25], "rule", "Closing brief §4.1", D2),
  taxExemptNote: row(
    "Approved annuity and pension income is tax-exempt from 1 Jan 2026 (Finance Act 2026) where the maturity is between 50 and 70.",
    "verified",
    "Closing brief §4.1; root annuities.income_exemption",
    "2026-01-01"
  )
});

// src/parameters/retirement-2026-10.ts
var D3 = "2026-10-27";
var AUDIT = "Pension calculators audit (docs/superpowers/specs/2026-10-27-pension-calculators-audit.md)";
var RETIREMENT = deepFreeze2({
  publicService: {
    accrualPerMonth: row(1 / 600, "verified", `${AUDIT}: 1/600 of salary per month of service`, D3),
    maxMonths: row(400, "verified", `${AUDIT}: 400-month cap`, D3),
    minimumMonthly: row(3500, "verified", `${AUDIT}: $3,500 minimum`, D3),
    retireAgeCap: row(60, "verified", `${AUDIT}: retirement capped at 60`, D3),
    minimumMonthsService: row(120, "verified", `${AUDIT}: 10-year minimum`, D3),
    reducedShare: row(0.75, "verified", `${AUDIT}: reduced pension, three quarters, plus gratuity`, D3),
    commutedShare: row(0.25, "verified", `${AUDIT}: one quarter commuted`, D3),
    commutationFactor: row(12.5, "verified", `${AUDIT}: ¼ commuted × 12.5`, D3),
    excludes: row("Protective services (police, fire, prisons) are excluded from these rules.", "verified", AUDIT, D3)
  },
  nis: {
    pensionAgeRiseFrom: row(2028, "verified", `${AUDIT}: from Jan 2028 the full NIS pension age rises one year every two years, to 65 by 2036`, D3),
    earlyPensionReduction: unverified(AUDIT, D3, "NIS early-pension reduction rate is not published. Do not invent one."),
    classTable2027: unverified(AUDIT, D3, "The 2027 NIS class table (rate rises about 3 points from 4 Jan 2027) is unpublished.")
  },
  scp: {
    incomeBands2027: unverified(AUDIT, D3, "SCP income bands for the $3,750 rate are not published.")
  },
  publicServiceSalaryAveraging: unverified(AUDIT, D3, "The public-service salary averaging rule could not be verified; the engine uses the salary the advisor enters."),
  annuityConversionRates: unverified(AUDIT, D3, "Annuity conversion rates could not be verified.")
});

// src/parameters/index.ts
var CORE_TABLES = Object.freeze({
  ff: FF,
  products: PRODUCTS,
  riders: RIDERS,
  vehicles: VEHICLES,
  annuityLevers: ANNUITY_LEVERS,
  retirement: RETIREMENT
});
var CORE_PREFIX = "core:";
function resolveCoreRow(path) {
  if (!path.startsWith(CORE_PREFIX)) throw new Error(`Not a core parameter path: "${path}"`);
  let node = CORE_TABLES;
  for (const key of path.slice(CORE_PREFIX.length).split(".")) {
    if (node == null || typeof node !== "object" || !(key in node)) {
      throw new Error(`Unknown parameter path: "${path}"`);
    }
    node = node[key];
  }
  if (!isRow(node)) throw new Error(`Parameter path "${path}" is a group, not a row`);
  return node;
}
function coreRowPaths() {
  const out = [];
  const walk = (node, path) => {
    if (isRow(node)) {
      out.push(path);
      return;
    }
    if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k);
    }
  };
  walk(CORE_TABLES, "");
  return out.map((p) => CORE_PREFIX + p);
}

// src/provenance.ts
function resolveParameter(path) {
  if (path.startsWith(CORE_PREFIX)) {
    const r = resolveCoreRow(path);
    return { node: r, value: r.value };
  }
  let node = P;
  for (const key of path.split(".")) {
    if (node == null || typeof node !== "object" || !(key in node)) {
      throw new Error(`Unknown parameter path: "${path}"`);
    }
    node = node[key];
  }
  return { node, value: node?.value };
}
var ProvenanceBuilder = class {
  #params = /* @__PURE__ */ new Map();
  #caveats = [];
  #rules = [];
  /**
   * Read a parameter, record its provenance, and refuse unsafe statuses —
   * returning the whole node, not just its value.
   *
   * Some parameters carry a `warning` the client must be told (group life's
   * "other T&T carriers' schemes may differ"). Reaching for that warning via a
   * second, unrecorded read of `P` is exactly the bypass this class exists to
   * close, so the recorded read hands the node back instead.
   */
  useNode(path) {
    const { node, value } = resolveParameter(path);
    assertSafe(node, path);
    if (node?.status === "unverified") {
      throw new ParameterError(
        `Parameter "${path}" is unverified and has no value; the engine must not use it. ${node.note ?? ""}`.trim()
      );
    }
    if (!this.#params.has(path)) {
      this.#params.set(path, {
        path,
        effective: node.effective ?? node.asOf ?? null,
        source: node.source ?? null,
        status: node.status ?? "UNMARKED"
      });
    }
    if (typeof node?.caveat === "string") this.caveat(node.caveat);
    return { node, value };
  }
  /** Read a numeric parameter, recording its provenance. Throws if the row is not a finite number. */
  num(path) {
    const v = this.use(path);
    if (typeof v !== "number" || !Number.isFinite(v)) {
      throw new ParameterError(`Parameter "${path}" is not a finite number`);
    }
    return v;
  }
  /** Read a structured parameter (a table or a spec), recording its provenance. */
  get(path) {
    return this.use(path);
  }
  /** Read a parameter's value, recording its provenance. */
  use(path) {
    return this.useNode(path).value;
  }
  caveat(msg) {
    if (!this.#caveats.includes(msg)) this.#caveats.push(msg);
  }
  rule(msg) {
    if (!this.#rules.includes(msg)) this.#rules.push(msg);
  }
  /**
   * Fold another engine's provenance into this one.
   *
   * Engines compose (needs -> gap), so their provenance must compose too. A Gap
   * that dropped the death engine's housing-inference caveat would present a
   * number without the uncertainty that qualifies it — which is the failure the
   * provenance system exists to prevent.
   */
  merge(p) {
    for (const param of p.parameters) {
      if (!this.#params.has(param.path)) this.#params.set(param.path, { ...param });
    }
    for (const c of p.caveats) this.caveat(c);
    for (const r of p.rulesFired) this.rule(r);
    return this;
  }
  build() {
    const parameters = [...this.#params.values()].sort((a, b) => a.path.localeCompare(b.path)).map((p) => Object.freeze({ ...p }));
    return Object.freeze({
      parameters: Object.freeze(parameters),
      caveats: Object.freeze([...this.#caveats]),
      rulesFired: Object.freeze([...this.#rules])
    });
  }
};

// src/needs/death.ts
function computeDeathNeeds(h, on, opts = {}) {
  const b = new ProvenanceBuilder();
  const continuationToAge = b.use("conventions.income_continuation_to_age");
  const funeralDefault = b.use("conventions.funeral_cost_default");
  const funeral = h.expectedFuneralCost ?? funeralDefault;
  if (h.expectedFuneralCost === void 0) {
    b.rule(`funeral cost defaulted to ${funeralDefault} — the client gave no figure`);
  }
  const medicalMinimum = b.use("conventions.medical_cost_minimum");
  const medicalStated = h.expectedMedicalCost ?? 0;
  const medical = Math.max(medicalStated, medicalMinimum);
  if (medical > medicalStated) {
    b.rule(
      `medical cost raised from ${medicalStated} to the ${medicalMinimum} minimum` + (h.expectedMedicalCost === void 0 ? " — the client gave no figure" : " — the client's own estimate was below the floor")
    );
  }
  const outstandingLoans = nonMortgageDebtBalance(h);
  const mortgage = mortgageBalance(h);
  const liquidates = h.housingStrategy === "liquidate-mortgage" || h.housingStrategy === "both";
  const replacesRent = h.housingStrategy === "replace-rent" || h.housingStrategy === "both";
  const mortgageLiquidation = liquidates ? mortgage : 0;
  let housingRentReplacement = 0;
  if (replacesRent) {
    const rentalMonths = b.use("conventions.rental_income_months");
    housingRentReplacement = (h.monthlyRent ?? 0) * rentalMonths;
    b.rule(`housing: ${rentalMonths} months rent replacement`);
    if (!h.monthlyRent) {
      b.caveat(
        "housing strategy asks for rent replacement, but no monthlyRent is recorded — the rent component computed to zero. Capture the rent or correct the strategy."
      );
    }
  }
  if (liquidates) {
    b.rule("housing: mortgage liquidation");
    if (mortgage === 0) {
      b.caveat(
        "housing strategy asks to liquidate a mortgage, but no mortgage debt is recorded — the liquidation component computed to zero. Capture the mortgage or correct the strategy."
      );
    }
  }
  if (h.housingStrategy === "none") b.rule("housing: no provision requested");
  if (h.housingStrategy === "both") {
    b.rule("housing: mortgage liquidation and rent replacement are ADDITIVE for this household");
  }
  const education = h.educationCost ?? 0;
  const years = yearsUntilLastChildReaches(h, continuationToAge, on);
  const survivorMonthly = opts.nisSurvivorMonthly ?? 0;
  const netMonthlyNeed = Math.max(0, h.monthlyExpenses - survivorMonthly);
  const incomeContinuation = netMonthlyNeed * 12 * years;
  if (years > 0) b.rule(`income continuation for ${years.toFixed(2)} years to age ${continuationToAge}`);
  if (opts.nisSurvivorMonthly === void 0) {
    b.caveat(
      "NIS survivors' benefit is NOT modelled — the NIBTT survivors' rate table has not been extracted, so it is treated as zero. This OVERSTATES the income-continuation need for any client with NIS contributions. Do not present this as the client's true need until the table is sourced or the benefit is entered explicitly."
    );
  } else if (survivorMonthly > 0) {
    b.rule(`NIS survivors' benefit of ${survivorMonthly}/month nets off the income need`);
  } else {
    b.rule("NIS survivors' benefit confirmed as nil — no offset applied");
  }
  const totalNeeds = funeral + medical + outstandingLoans + mortgageLiquidation + housingRentReplacement + education + incomeContinuation;
  const lifeInsurance = 0;
  const assets = {
    savings: h.savings,
    lifeInsurance,
    otherInvestments: h.otherInvestments,
    total: h.savings + lifeInsurance + h.otherInvestments
  };
  const insuranceNeed = Math.max(0, totalNeeds - assets.total);
  if (totalNeeds - assets.total < 0) b.rule("assets exceed needs — insurance need floored at zero");
  return {
    funeral,
    medical,
    outstandingLoans,
    mortgageLiquidation,
    housingRentReplacement,
    education,
    incomeContinuation,
    totalNeeds,
    assets,
    insuranceNeed,
    provenance: b.build()
  };
}

// src/needs/retirement.ts
var NIS_CONTRIBUTION_TABLE = "2016-09-05";
function computeRetirementNeeds(input) {
  const b = new ProvenanceBuilder();
  const other = input.otherMonthlyIncome ?? 0;
  const floor = retirementFloor(
    input.lifetimeAvgMonthlyEarnings,
    input.totalContributions,
    input.retirementAge,
    other
  );
  const nisMonthly = floor.nis.type === "PENSION" ? floor.nis.monthly ?? 0 : 0;
  const scpMonthly = floor.scp.monthly;
  b.use("nis.averaging_basis");
  b.rule(
    "NIS is averaged over the WHOLE WORKING LIFE of insurable earnings — not final salary, and not the last 7 years"
  );
  b.use("nis.qualifying_conditions");
  b.use("nis.minimum_pension");
  if (floor.nis.type === "GRANT") {
    b.use("nis.retirement_grant");
    b.rule("fewer than 750 contributions — Retirement Grant (lump sum), not a pension");
    b.rule("the grant is excluded from SCP assessed income");
  } else {
    b.use(`nis.contribution_tables.${NIS_CONTRIBUTION_TABLE}`);
    b.use("nis.benefit_rates.current");
    b.rule(`NIS pension: class ${floor.nis.class}`);
    if (floor.nis.minimumApplied) b.rule("the 3,000/month minimum pension binds");
    if (nisMonthly > 0 && scpMonthly > 0) {
      b.use("scp.assessed_income_includes_nis_pension");
      b.rule("NIS pension counts as SCP assessed income — SCP reduced accordingly");
    }
  }
  const scpQualifyingAge = b.useNode("scp.eligibility").node.age;
  if (input.retirementAge >= scpQualifyingAge) {
    b.use("scp.bands");
    b.use("scp.cliff_edges");
  }
  if (!floor.scp.eligible && floor.scp.reason) {
    b.rule(`SCP not payable: ${floor.scp.reason}`);
    b.caveat(
      `No Senior Citizens' Pension is included in this floor: ${floor.scp.reason} Retiring earlier therefore lowers the guaranteed floor by the whole SCP amount.`
    );
  }
  if (floor.nis.caveat) b.caveat(floor.nis.caveat);
  if (floor.scp.cliffWarning) b.caveat(floor.scp.cliffWarning);
  const guaranteedFloorMonthly = nisMonthly + scpMonthly + other;
  const monthlyShortfall = Math.max(0, input.targetMonthlyIncome - guaranteedFloorMonthly);
  return {
    targetMonthlyIncome: input.targetMonthlyIncome,
    nisMonthly,
    scpMonthly,
    otherMonthlyIncome: other,
    guaranteedFloorMonthly,
    monthlyShortfall,
    provenance: b.build()
  };
}

// src/gap.ts
function computeGap(needs, policies, atAge) {
  const b = new ProvenanceBuilder();
  b.merge(needs.provenance);
  const cover = inForceCoverAt(policies, atAge);
  const groupFaceTotal = cover.groupFaceTotal;
  const groupCoverExcluded = groupFaceTotal - cover.group;
  if (groupFaceTotal > 0) {
    b.use("group_life.reduction_age");
    b.use("group_life.reduction_factor");
    const termination = b.useNode("group_life.termination_age");
    if (typeof termination.node.warning === "string") b.caveat(termination.node.warning);
    if (atAge >= GROUP_LIFE_TERMINATION_AGE) {
      b.rule(`group cover of ${groupFaceTotal} has terminated at age ${GROUP_LIFE_TERMINATION_AGE} — excluded in full`);
    } else if (groupCoverExcluded > 0) {
      b.rule(`group cover reduced by ${groupCoverExcluded} at attained age ${atAge}`);
    } else {
      b.rule(`group cover of ${groupFaceTotal} counted in full, but it halves at 66 and ends at 70`);
    }
  }
  const gap = Math.max(0, needs.insuranceNeed - cover.total);
  if (needs.insuranceNeed - cover.total < 0) b.rule("cover exceeds need — gap floored at zero");
  return {
    need: needs.insuranceNeed,
    inForceCover: cover.total,
    groupCoverExcluded,
    gap,
    provenance: b.build()
  };
}

// src/errors.ts
var CareGraphInputError = class extends Error {
  name = "CareGraphInputError";
};
var ClosingInputError = class extends Error {
  name = "ClosingInputError";
};
var LifeCaseFactsError = class extends Error {
  name = "LifeCaseFactsError";
  problems;
  constructor(problems) {
    super(`LifeCaseFacts invalid: ${problems.join("; ")}`);
    this.problems = Object.freeze([...problems]);
  }
};
var RegisteredRoutingError = class extends Error {
  name = "RegisteredRoutingError";
};

// src/life-case-facts.ts
var UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
var FIRST_NAME = /^\p{L}[\p{L}'-]{0,19}$/u;
var HEALTH_KEY = /^health(flag|note)$/i;
var PARENT_KEYS = /* @__PURE__ */ new Set([
  "personId",
  "relationship",
  "firstName",
  "birthYear",
  "careTier",
  "careFromAge",
  "receivesSCP",
  "nisContributions"
]);
var PARENT_STRING_KEYS = /* @__PURE__ */ new Set(["personId", "relationship", "firstName", "nisContributions"]);
var PARENT_RELATIONSHIPS = /* @__PURE__ */ new Set([
  "mother",
  "father",
  "grandmother",
  "grandfather",
  "mother-in-law",
  "father-in-law",
  "other-elder"
]);
var LOVED_ONE_KEYS = /* @__PURE__ */ new Set(["personId", "firstName", "age", "relation"]);
var TRISTATE = /* @__PURE__ */ new Set(["yes", "no", "unknown"]);
function findHealthKeys(value, path = "$") {
  const hits = [];
  if (Array.isArray(value)) {
    value.forEach((v, i) => hits.push(...findHealthKeys(v, `${path}[${i}]`)));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (HEALTH_KEY.test(k)) hits.push(`${path}.${k}`);
      hits.push(...findHealthKeys(v, `${path}.${k}`));
    }
  }
  return hits;
}
function assertNoHealthKeys(value, what) {
  const hits = findHealthKeys(value);
  if (hits.length) {
    throw new LifeCaseFactsError(hits.map((h) => `${what} carries a health answer at ${h}; health answers live only in the intake row`));
  }
}
function isObj(v) {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
function isNum(v) {
  return typeof v === "number" && Number.isFinite(v);
}
function checkPerson(where, p, problems) {
  if (typeof p.personId !== "string" || !UUID_V4.test(p.personId)) problems.push(`${where}.personId must be a UUIDv4`);
  if (p.firstName !== void 0 && (typeof p.firstName !== "string" || !FIRST_NAME.test(p.firstName))) {
    problems.push(`${where}.firstName must be one first name (letters, hyphen or apostrophe, at most 20 characters)`);
  }
}
function checkParent(where, p, problems) {
  if (!isObj(p)) {
    problems.push(`${where} must be an object`);
    return;
  }
  for (const [k, v] of Object.entries(p)) {
    if (!PARENT_KEYS.has(k)) problems.push(`${where}.${k} is not allowed on a parent (no free text on a parent, ever)`);
    else if (typeof v === "string" && !PARENT_STRING_KEYS.has(k)) problems.push(`${where}.${k} must not be text`);
  }
  checkPerson(where, p, problems);
  if (!PARENT_RELATIONSHIPS.has(p.relationship)) problems.push(`${where}.relationship must be one of the listed labels`);
  if (!Number.isInteger(p.birthYear)) problems.push(`${where}.birthYear must be a whole year`);
  if (!Number.isInteger(p.careTier) || p.careTier < 0 || p.careTier > 4) problems.push(`${where}.careTier must be an integer 0–4`);
  if (p.careFromAge !== void 0 && !Number.isInteger(p.careFromAge)) problems.push(`${where}.careFromAge must be a whole age`);
  if (typeof p.receivesSCP !== "boolean") problems.push(`${where}.receivesSCP must be true or false`);
  if (!TRISTATE.has(p.nisContributions)) problems.push(`${where}.nisContributions must be yes, no or unknown`);
}
function checkLovedOne(where, o, problems) {
  if (!isObj(o)) {
    problems.push(`${where} must be an object`);
    return;
  }
  for (const [k, v] of Object.entries(o)) {
    if (!LOVED_ONE_KEYS.has(k)) problems.push(`${where}.${k} is not allowed on a loved one`);
    else if (typeof v === "string" && k !== "personId" && k !== "firstName" && k !== "relation") problems.push(`${where}.${k} must not be text`);
  }
  checkPerson(where, o, problems);
  if (!isNum(o.age) || o.age < 0) problems.push(`${where}.age must be a number`);
  if (!["child", "adult", "elder"].includes(o.relation)) problems.push(`${where}.relation must be child, adult or elder`);
}
function validateLifeCaseFacts(input) {
  const problems = [];
  for (const h of findHealthKeys(input)) problems.push(`health answer at ${h}; health answers live only in the intake row`);
  if (!isObj(input)) throw new LifeCaseFactsError(["facts must be an object", ...problems]);
  const f = input;
  if (f.schemaVersion !== 1) problems.push("schemaVersion must be 1");
  if (!Number.isInteger(f.asOfYear)) problems.push("asOfYear must be a whole year");
  if (!isObj(f.client)) problems.push("client is required");
  else {
    checkPerson("client", f.client, problems);
    for (const k of ["age", "grossMonthly"]) if (!isNum(f.client[k])) problems.push(`client.${k} must be a number`);
    if (!["male", "female"].includes(f.client.sex)) problems.push("client.sex must be male or female");
    if (!TRISTATE.has(f.client.hasHealthCover)) problems.push("client.hasHealthCover must be yes, no or unknown");
  }
  if (f.partner !== null) {
    if (!isObj(f.partner)) problems.push("partner must be an object or null");
    else {
      checkPerson("partner", f.partner, problems);
      if (!isNum(f.partner.age) || !isNum(f.partner.incomeMonthly)) problems.push("partner.age and partner.incomeMonthly must be numbers");
    }
  }
  for (const key of ["children", "parents", "goals", "existingCover"]) {
    if (!Array.isArray(f[key])) problems.push(`${key} must be a list`);
  }
  if (Array.isArray(f.children)) f.children.forEach((c, i) => {
    if (!isObj(c)) {
      problems.push(`children[${i}] must be an object`);
      return;
    }
    checkPerson(`children[${i}]`, c, problems);
    if (!isNum(c.age) || !isNum(c.studyStartAge)) problems.push(`children[${i}].age and studyStartAge must be numbers`);
    if (!Array.isArray(c.milestones)) problems.push(`children[${i}].milestones must be a list`);
  });
  if (Array.isArray(f.parents)) f.parents.forEach((p, i) => checkParent(`parents[${i}]`, p, problems));
  if (Array.isArray(f.existingCover)) f.existingCover.forEach((c, i) => {
    if (!isObj(c)) {
      problems.push(`existingCover[${i}] must be an object`);
      return;
    }
    if (typeof c.policyId !== "string" || !UUID_V4.test(c.policyId)) problems.push(`existingCover[${i}].policyId must be a UUIDv4`);
    if (c.amount !== null && !isNum(c.amount)) problems.push(`existingCover[${i}].amount must be a number or null (not captured)`);
  });
  const ids = [
    ...Array.isArray(f.parents) ? f.parents : [],
    ...Array.isArray(f.children) ? f.children : []
  ].map((p) => isObj(p) ? p.personId : void 0);
  if (new Set(ids).size !== ids.length) problems.push("personId must be unique (dedupe is by id only)");
  if (!isObj(f.budget)) problems.push("budget is required");
  if (!isObj(f.debts) || !Array.isArray(f.debts.items)) problems.push("debts.items must be a list");
  if (!isObj(f.wishes)) problems.push("wishes is required");
  if (!isObj(f.workPension)) problems.push("workPension is required");
  if (f.lovedOnes !== void 0) {
    if (!isObj(f.lovedOnes) || !Array.isArray(f.lovedOnes.ones)) problems.push("lovedOnes.ones must be a list");
    else f.lovedOnes.ones.forEach((o, i) => checkLovedOne(`lovedOnes.ones[${i}]`, o, problems));
  }
  if (problems.length) throw new LifeCaseFactsError(problems);
  return input;
}
function parentAge(p, asOfYear) {
  return asOfYear - p.birthYear;
}
function parentSex(p) {
  if (p.relationship === "mother" || p.relationship === "grandmother" || p.relationship === "mother-in-law") return "female";
  if (p.relationship === "father" || p.relationship === "grandfather" || p.relationship === "father-in-law") return "male";
  return null;
}

// src/household-budget.ts
function payeAnnual(chargeable, bands) {
  let tax = 0;
  let lower = 0;
  for (const band of bands) {
    const upper = band.up_to ?? Infinity;
    if (chargeable > lower) tax += (Math.min(chargeable, upper) - lower) * band.rate;
    lower = upper;
  }
  return tax;
}
function computeNetPay(facts) {
  const b = new ProvenanceBuilder();
  const c = facts.client;
  const g = c.grossMonthly;
  const ceilingNis = b.num("nis.insurable_earnings_ceiling");
  const nis = c.nisPaying ? b.num("core:ff.tax.nisEmployeeRate") * Math.min(g, ceilingNis) : 0;
  let surchargeWeekly = 0;
  if (c.age < b.num("core:ff.tax.surchargeExemptFromAge")) {
    const rates = b.get("health_surcharge.rates");
    const hit = rates.find((r) => r.monthly_emoluments_over === null || g > r.monthly_emoluments_over);
    surchargeWeekly = hit ? hit.weekly_rate : 0;
  } else {
    b.use("health_surcharge.exemptions");
    b.rule("no health surcharge from age 60");
  }
  const hs = surchargeWeekly * b.num("core:ff.tax.surchargeWeeksPerYear") / 12;
  const allowance = b.num("income_tax.personal_allowance");
  const cap = b.num("income_tax.combined_deduction_cap");
  const nisDeductible = nis * 12 * b.num("core:ff.tax.nisDeductibleShare");
  const chargeable = Math.max(0, g * 12 - allowance - Math.min(cap, nisDeductible));
  const paye = payeAnnual(chargeable, b.get("income_tax.paye_bands")) / 12;
  const net = g - nis - hs - paye;
  const partnerNet = facts.partner ? facts.partner.incomeMonthly : 0;
  return {
    grossMonthly: g,
    nisMonthly: nis,
    healthSurchargeMonthly: hs,
    payeMonthly: paye,
    netMonthly: net,
    partnerNetMonthly: partnerNet,
    householdNetMonthly: net + partnerNet,
    deductionHeadroomAnnual: Math.max(0, cap - nisDeductible),
    paysTax: paye > b.num("core:ff.tax.paysTaxAbove"),
    provenance: b.build()
  };
}
function computeHouseholdBudget(input) {
  const b = new ProvenanceBuilder();
  b.merge(input.netPay.provenance);
  const { facts, netPay, debts } = input;
  const bud = facts.budget;
  const costs = bud.costs.reduce((a, c) => a + c.monthly, 0);
  const irregular = bud.irregularAnnual / 12;
  const needs = costs + debts.minimumsMonthly + input.carePaidMonthly + irregular;
  const housingStops = bud.housing === "mortgage" && !!bud.mortgage && bud.mortgage.clearOnDeath && bud.mortgage.balance > 0;
  const living = needs - (housingStops ? bud.housingPaymentMonthly : 0) - debts.minimumsMonthly - input.carePaidMonthly;
  const hhNet = netPay.householdNetMonthly;
  const surplus = hhNet - needs;
  const buffer = needs > 0 ? bud.savings / needs : 0;
  const deps = facts.children.length + facts.parents.filter((p) => p.careTier > 0).length;
  const ef = facts.client.selfEmployed ? b.num("core:ff.budget.emergencyMonthsSelfEmployed") : deps > 0 ? b.num("core:ff.budget.emergencyMonthsDependants") : b.num("core:ff.budget.emergencyMonthsAlone");
  const bad = debts.expensiveDebt;
  const stage = surplus <= 0 ? 0 : buffer < 1 ? 1 : bad > 0 ? 2 : buffer < ef ? 3 : 4;
  const pcts = b.get("core:ff.budget.stagePercents");
  const pct = pcts[stage];
  const ceiling = stage === 0 ? 0 : Math.max(0, Math.min(pct.ofNet * hhNet, pct.ofSurplus * surplus));
  const shares = b.get("core:ff.closing.bandShares");
  const needsRatio = needs / hhNet;
  const hardballRatio = b.num("core:ff.budget.hardballNeedsRatio");
  const shortfall = surplus <= 0 ? -surplus : Math.max(0, needs - hardballRatio * hhNet);
  const hours = Math.ceil(shortfall / b.num("core:ff.budget.minimumWageHourly") / b.num("core:ff.budget.weeksPerMonth"));
  b.rule(`stage ${stage}: ${stage === 0 ? "costs exceed income" : stage === 1 ? "under one month saved" : stage === 2 ? "expensive debt" : stage === 3 ? "emergency fund not full" : "stable"}`);
  return {
    netPay,
    costsMonthly: costs,
    irregularMonthly: irregular,
    debtMinimumsMonthly: debts.minimumsMonthly,
    carePaidMonthly: input.carePaidMonthly,
    needsMonthly: needs,
    livingMonthly: living,
    housingStopsOnDeath: housingStops,
    surplusMonthly: surplus,
    bufferMonths: buffer,
    dependants: deps,
    emergencyFundMonths: ef,
    stage,
    ceilingMonthly: ceiling,
    band: { floor: ceiling * shares.floor, recommended: ceiling * shares.recommended, ceiling: ceiling * shares.ceiling },
    needsRatio,
    hardball: stage === 0 || needsRatio > hardballRatio,
    shortfallMonthly: shortfall,
    hoursAtMinimumWage: hours,
    expensiveDebt: bad,
    provenance: b.build()
  };
}
function buildBudgetBuckets(budget, facts, savePct, protectionMonthly) {
  const b = new ProvenanceBuilder();
  const pctUsed = savePct ?? b.num("core:ff.budget.payYourselfFirstPct");
  const s0 = Math.max(0, budget.surplusMonthly);
  const payFirst = Math.min(s0, budget.netPay.householdNetMonthly * pctUsed / 100);
  let left = payFirst;
  const take = (amt) => {
    const x = Math.max(0, Math.min(left, amt));
    left -= x;
    return x;
  };
  const protection = take(budget.stage === 0 ? 0 : protectionMonthly ?? budget.band.recommended);
  const debt = take(budget.expensiveDebt > 0 ? facts.debts.extraMonthly : 0);
  const months = b.num("core:ff.budget.bufferTargetMonths");
  const em = take(Math.max(0, budget.needsMonthly * months - facts.budget.savings) / b.num("core:ff.budget.builderBufferBuildMonths"));
  const retirement = take(left / 2);
  const goals = take(left);
  return {
    payYourselfFirstPct: pctUsed,
    payYourselfFirstMonthly: payFirst,
    protection,
    expensiveDebtExtra: debt,
    emergencyFund: em,
    retirement,
    goals,
    guiltFreeSpending: Math.max(0, s0 - payFirst)
  };
}

// src/debts.ts
function summariseDebts(b, items) {
  const badAbove = b.num("core:ff.budget.badDebtAbovePct");
  const isBad = (d) => d.ratePct > badAbove;
  const expensive = items.filter((d) => d.balance > 0 && isBad(d)).slice().sort((a, c) => c.ratePct - a.ratePct);
  return {
    minimumsMonthly: items.reduce((a, d) => a + (d.balance > 0 ? d.minimumMonthly : 0), 0),
    expensiveDebt: items.reduce((a, d) => a + (isBad(d) ? d.balance : 0), 0),
    otherDebt: items.reduce((a, d) => a + (isBad(d) ? 0 : d.balance), 0),
    expensiveOrder: expensive.map((d) => ({ label: d.label, balance: d.balance, ratePct: d.ratePct })),
    expensiveInterestMonthly: expensive.reduce((a, d) => a + d.balance * d.ratePct / 1200, 0)
  };
}
function simulate(b, items, extra, mode) {
  const maxMonths = b.num("core:ff.debts.maxMonths");
  const cleared = b.num("core:ff.debts.clearedBelow");
  const ds = items.filter((d) => d.balance > 0).map((d) => ({ label: d.label, bal: d.balance, rate: d.ratePct, min: d.minimumMonthly }));
  const minSum = ds.reduce((a, d) => a + d.min, 0);
  let m = 0;
  let interest = 0;
  let firstCleared = null;
  const balances = [ds.reduce((a, d) => a + d.bal, 0)];
  while (ds.some((d) => d.bal > cleared) && m < maxMonths) {
    m++;
    for (const d of ds) if (d.bal > 0) {
      const it = d.bal * d.rate / 1200;
      d.bal += it;
      interest += it;
    }
    let pool = minSum + extra;
    for (const d of ds) if (d.bal > 0) {
      const pmt = Math.min(d.min, d.bal, pool);
      d.bal -= pmt;
      pool -= pmt;
    }
    const live = ds.filter((d) => d.bal > cleared).sort((a, c) => mode === "avalanche" ? c.rate - a.rate : a.bal - c.bal);
    for (const d of live) {
      if (pool <= 0) break;
      const pmt = Math.min(pool, d.bal);
      d.bal -= pmt;
      pool -= pmt;
    }
    if (!firstCleared) {
      const w = ds.find((d) => d.bal <= cleared);
      if (w) firstCleared = { label: w.label, month: m };
    }
    balances.push(Math.max(0, ds.reduce((a, d) => a + d.bal, 0)));
  }
  return { months: m, interest, firstCleared, stalled: m >= maxMonths, balances };
}
function computeDebts(items, extraMonthly) {
  const b = new ProvenanceBuilder();
  const summary = summariseDebts(b, items);
  const payoff = {
    minimumsOnly: simulate(b, items, 0, "avalanche"),
    avalanche: simulate(b, items, extraMonthly, "avalanche"),
    snowball: simulate(b, items, extraMonthly, "snowball")
  };
  b.rule("payoff runs month by month: interest first, then minimums, then the extra to the target debt");
  return { summary, payoff, extraMonthly, provenance: b.build() };
}
function amortisedPayment(loan, ratePct, years) {
  const m = ratePct / 1200;
  const n = Math.max(1, years * 12);
  return loan <= 0 ? 0 : loan * m / (1 - Math.pow(1 + m, -n));
}
function carLoan(b, input) {
  const ratePct = b.num("core:ff.carLoan.ratePct");
  const maxTerm = b.num("core:ff.carLoan.maxTermYears");
  const usedMin = b.num("core:ff.carLoan.usedMinDepositPct");
  const newMaxFinancing = b.num("core:ff.carLoan.newMaxFinancing");
  const depreciation = b.num("core:ff.carLoan.depreciationPerYear");
  const cushion = b.num("core:ff.carLoan.cushionPayments");
  const entered = input.depositPct ?? 0;
  const floorPct = input.newVehicle ? (1 - newMaxFinancing) * 100 : usedMin;
  const depositPct = Math.max(floorPct, entered);
  const termYears = Math.max(1, Math.min(maxTerm, input.termYears ?? b.num("core:ff.carLoan.defaultTermYears")));
  const deposit = input.price * depositPct / 100;
  const loan = input.price - deposit;
  const pay = amortisedPayment(loan, ratePct, termYears);
  const totalInterest = pay * termYears * 12 - loan;
  const mr = ratePct / 1200;
  let bal = loan;
  let underwaterYears = 0;
  for (let yy = 1; yy <= termYears; yy++) {
    for (let mm = 0; mm < 12; mm++) bal = bal * (1 + mr) - pay;
    if (Math.max(0, bal) > input.price * Math.pow(1 - depreciation, yy)) underwaterYears = yy;
  }
  const saveFirst = deposit > 0 ? Math.max(0, deposit - input.saved) : Math.max(0, pay * cushion - input.saved);
  b.caveat("The car loan rate and term are assumptions. Check the real rate with your bank or credit union.");
  return {
    depositPct,
    deposit,
    loan,
    termYears,
    ratePct,
    monthlyPayment: pay,
    totalInterest,
    underwaterYears,
    saveFirst,
    usedMinimumApplied: !input.newVehicle && entered < usedMin
  };
}

// src/care-graph.ts
var MILESTONE_NAMES = {
  vehicle: "First vehicle",
  wedding: "Wedding",
  business: "Business start",
  home: "Home deposit"
};
var PARENT_LABELS = {
  mother: "Your mother",
  father: "Your father",
  grandmother: "Your grandmother",
  grandfather: "Your grandfather",
  "mother-in-law": "Your mother-in-law",
  "father-in-law": "Your father-in-law",
  "other-elder": "Your elder"
};
function childLabel(c, index) {
  return c.firstName && c.firstName.trim() ? c.firstName : `Child ${String.fromCharCode(65 + index)}`;
}
function parentLabel(p) {
  return PARENT_LABELS[p.relationship];
}
function careGraphInputFromFacts(facts) {
  return { clientAge: facts.client.age, asOfYear: facts.asOfYear, children: facts.children, parents: facts.parents };
}
function validate(b, input, H) {
  const minH = b.num("core:ff.careGraph.minimumHorizonYears");
  if (H < minH) throw new CareGraphInputError(`Horizon ${H} is under ${minH} years`);
  input.children.forEach((k, ix) => {
    if (k.route !== "none" && k.studyStartAge < k.age) {
      throw new CareGraphInputError(`${childLabel(k, ix)}: study starts at ${k.studyStartAge}, before the current age ${k.age}`);
    }
  });
  for (const p of input.parents) {
    const age = parentAge(p, input.asOfYear);
    if (p.careFromAge !== void 0 && p.careFromAge < age) {
      throw new CareGraphInputError(`${parentLabel(p)}: care starts at ${p.careFromAge}, before the current age ${age}`);
    }
  }
}
function run(b, input) {
  const i = b.num("core:ff.rates.inflation");
  const f = b.num("core:ff.rates.careBasket");
  const gt = b.num("core:ff.rates.foreignTuition");
  const r = b.num("core:ff.rates.planningReturn");
  const H = b.num("core:ff.careGraph.horizonYears");
  const careTo = b.num("core:ff.careGraph.careToParentAge");
  const currentMax = b.num("core:ff.careGraph.currentGoalMaxStart");
  const routes = b.get("core:ff.careGraph.routes");
  const homeSupport = b.num("core:ff.careGraph.homeSupportMonthly");
  const tiers = b.get("core:ff.careGraph.careTiers");
  const scp = b.num("core:ff.offsets.scpMonthly");
  const scpAge = b.useNode("scp.eligibility").node.age;
  validate(b, input, H);
  const yrs = Array.from({ length: H + 1 }, (_, y) => ({
    age: input.clientAge + y,
    edu: 0,
    par: 0,
    lump: 0,
    kid: false,
    parOn: false,
    lumps: []
  }));
  const disc = (v, y) => v / Math.pow(1 + r, y);
  const goals = [];
  input.children.forEach((k, ix) => {
    const who = childLabel(k, ix);
    const R = routes[k.route];
    const base = R[k.costLevel];
    const rate = R.foreign ? gt : i;
    let pv = 0;
    let start = null;
    let studyYears = 0;
    for (let j = 0; j < R.years; j++) {
      const y = k.studyStartAge + j - k.age;
      if (y < 0 || y > H) continue;
      const tu = base * Math.pow(1 + rate, y);
      const hm = R.home ? homeSupport * 12 * Math.pow(1 + f, y) : 0;
      yrs[y].edu += (tu + hm) / 12;
      yrs[y].kid = true;
      pv += disc(tu + hm, y);
      studyYears++;
      if (start === null) start = y;
    }
    if (start !== null) goals.push({ key: `${k.personId}:edu`, personId: k.personId, who, what: "degree", kind: "edu", pv, start, years: studyYears });
    for (const m of k.milestones) {
      if (!m.on) continue;
      const y = m.atAge - k.age;
      if (y < 0 || y > H) {
        b.caveat(`${who}'s ${MILESTONE_NAMES[m.key].toLowerCase()} falls outside the plan years and is not counted.`);
        continue;
      }
      const v = m.amountToday * Math.pow(1 + i, y);
      yrs[y].lump += v;
      yrs[y].kid = true;
      yrs[y].lumps.push(`${who} · ${MILESTONE_NAMES[m.key]}`);
      goals.push({ key: `${k.personId}:${m.key}`, personId: k.personId, who, what: MILESTONE_NAMES[m.key].toLowerCase(), kind: "milestone", pv: disc(v, y), start: y, years: 0 });
    }
  });
  for (const p of input.parents) {
    const age = parentAge(p, input.asOfYear);
    const from = p.careFromAge ?? age;
    const monthly = tiers[p.careTier].monthly;
    let pv = 0;
    let start = null;
    let yearsOn = 0;
    for (let y = Math.max(0, from - age); y <= H && age + y <= careTo; y++) {
      const gross = monthly * Math.pow(1 + f, y);
      const off = p.receivesSCP && age + y >= scpAge ? scp * Math.pow(1 + i, y) : 0;
      const nt = Math.max(0, gross - off);
      yrs[y].par += nt;
      if (nt > 0) {
        yrs[y].parOn = true;
        yearsOn++;
      }
      pv += disc(12 * nt, y);
      if (start === null) start = y;
    }
    if (start !== null && pv > 0) {
      goals.push({ key: `${p.personId}:care`, personId: p.personId, who: parentLabel(p), what: "care", kind: "care", pv, start, years: yearsOn });
    }
  }
  const rm = Math.pow(1 + r, 1 / 12) - 1;
  let save = 0;
  let pvTotal = 0;
  const out = goals.map((gl) => {
    pvTotal += gl.pv;
    if (gl.start <= currentMax) {
      return { key: gl.key, personId: gl.personId, who: gl.who, what: gl.what, kind: gl.kind, presentValue: gl.pv, start: gl.start, current: true, monthlySaving: 0, yearsOn: gl.kind === "care" ? gl.years : 0, durationYears: gl.years };
    }
    const target = gl.pv * Math.pow(1 + r, gl.start);
    const m = Math.round(gl.start * 12);
    const monthly = target * rm / (Math.pow(1 + rm, m) - 1);
    save += monthly;
    return { key: gl.key, personId: gl.personId, who: gl.who, what: gl.what, kind: gl.kind, presentValue: gl.pv, start: gl.start, current: false, monthlySaving: monthly, yearsOn: gl.kind === "care" ? gl.years : 0, durationYears: gl.years };
  });
  let peak = 0;
  let peakAge = input.clientAge;
  let sandwich = 0;
  let finish = input.clientAge;
  let nominal = 0;
  const years = yrs.map((Y, y) => {
    const rec = Y.edu + Y.par;
    if (rec > peak) {
      peak = rec;
      peakAge = Y.age;
    }
    if (Y.kid && Y.parOn) sandwich++;
    if (rec > 0 || Y.lump > 0) finish = Y.age;
    nominal += 12 * rec + Y.lump;
    return { yearIndex: y, age: Y.age, eduMonthly: Y.edu, parentMonthly: Y.par, lumpTotal: Y.lump, lumps: Y.lumps, isSandwich: Y.kid && Y.parOn };
  });
  return {
    years,
    goals: out,
    peak: { monthly: peak, atAge: peakAge },
    sandwichYears: sandwich,
    finishAge: finish,
    save,
    already: yrs[0].edu + yrs[0].par,
    pv: pvTotal,
    nominal
  };
}
function applyLever(input, lever) {
  const children = input.children.map((k) => {
    if (k.personId !== lever.childId) return k;
    if (lever.kind === "route-local") return { ...k, route: "local" };
    if (lever.kind === "lean-cost") return { ...k, costLevel: "lean" };
    return { ...k, milestones: k.milestones.map((m) => m.key === lever.milestone ? { ...m, on: false } : m) };
  });
  return { ...input, children };
}
function verdictFor(b, load) {
  const bands = b.get("core:ff.careGraph.verdictBands");
  return bands.find((x) => x.upTo === null || load <= x.upTo).verdict;
}
function careGraph(input, householdNetMonthly) {
  const b = new ProvenanceBuilder();
  const core = run(b, input);
  b.rule("goals starting within a year are current budget lines; later goals are funded by a level monthly saving");
  let load = null;
  let verdict = null;
  let levers = [];
  if (householdNetMonthly !== void 0 && householdNetMonthly > 0) {
    load = (core.save + core.already) / householdNetMonthly;
    verdict = verdictFor(b, load);
    if (load > b.num("core:ff.careGraph.leverShownAboveLoad")) {
      const scratch = new ProvenanceBuilder();
      const delta = (lever) => core.save - run(scratch, applyLever(input, lever)).save;
      input.children.forEach((k, ix) => {
        const who = childLabel(k, ix);
        if (k.route !== "local" && k.route !== "none") {
          const l = { kind: "route-local", childId: k.personId };
          levers.push({ ...l, label: `Send ${who} locally`, monthlyReduction: delta(l) });
        }
        if (k.costLevel !== "lean" && k.route !== "none") {
          const l = { kind: "lean-cost", childId: k.personId };
          levers.push({ ...l, label: `${who}: lean cost level`, monthlyReduction: delta(l) });
        }
        for (const m of k.milestones) {
          if (!m.on) continue;
          const l = { kind: "drop-milestone", childId: k.personId, milestone: m.key };
          levers.push({ ...l, label: `Drop ${who}'s ${MILESTONE_NAMES[m.key].toLowerCase()}`, monthlyReduction: delta(l) });
        }
      });
      levers = levers.sort((a, c) => c.monthlyReduction - a.monthlyReduction);
    }
  }
  const minLever = b.num("core:ff.careGraph.leverMinimumMonthly");
  const topN = b.num("core:ff.careGraph.topLeversShown");
  return {
    years: core.years,
    goals: core.goals,
    peak: core.peak,
    sandwichYears: core.sandwichYears,
    finishAge: core.finishAge,
    funding: { saveFromToday: core.save, alreadyPaying: core.already, ifYouDieTomorrow: core.pv },
    nominalTotal: core.nominal,
    load,
    verdict,
    levers,
    topLevers: levers.filter((l) => l.monthlyReduction > minLever).slice(0, topN),
    provenance: b.build()
  };
}

// src/death-need.ts
function coverHeld(b, facts) {
  const redAge = b.num("group_life.reduction_age");
  const endAge = b.num("group_life.termination_age");
  const factor = b.num("group_life.reduction_factor");
  const age = facts.client.age;
  const known = facts.existingCover.filter((c) => c.amount !== null && c.kind === "life").reduce((a, c) => {
    const amt = c.amount;
    return a + (c.group ? age >= endAge ? 0 : age >= redAge ? amt * factor : amt : amt);
  }, 0);
  const unknown = facts.existingCover.filter((c) => c.amount === null);
  if (unknown.length) b.caveat("We did not capture this. It is not counted either way.");
  return {
    knownLife: known,
    unknownCount: unknown.length,
    unknownLabels: unknown.map((c) => c.label),
    knownCI: facts.existingCover.filter((c) => c.kind === "ci" && c.amount !== null).reduce((a, c) => a + c.amount, 0)
  };
}
function survivorCashflow(b, facts, livingMonthly, usePartner, useNis, capital) {
  const N = b.num("core:ff.deathNeed.survivorYears");
  const rr = b.num("core:ff.rates.survivorRealReturn");
  const hhShare = b.num("core:ff.deathNeed.householdShareWithChildren");
  const toAge = b.num("core:ff.deathNeed.incomeToYoungestAge");
  const partnerTo = b.num("core:ff.deathNeed.partnerWorksToAge");
  const sSpouse = b.num("core:ff.offsets.nisSurvivorSpouseMonthly");
  const sChild = b.num("core:ff.offsets.nisSurvivorChildMonthly");
  const kids = facts.children.map((k) => k.age).sort((a, c) => a - c);
  const nK = kids.length;
  const partner = facts.partner;
  const perChild = nK ? livingMonthly * (1 - hhShare) / nK : 0;
  let pool = capital;
  let pvGap = 0;
  let monthOfShortfall = null;
  const rows = [];
  for (let t = 0; t < N; t++) {
    const dep = kids.filter((a) => a + t < toAge).length;
    const need = partner || nK > 0 ? (livingMonthly * (nK ? hhShare : 1) + perChild * dep) * 12 : 0;
    const pT = usePartner && partner && partner.age + t < partnerTo ? partner.incomeMonthly * 12 : 0;
    const nT = useNis && facts.client.nisPaying ? ((partner ? sSpouse : 0) + sChild * dep) * 12 : 0;
    const gap = Math.max(0, need - pT - nT);
    const fc = Math.min(pool, gap);
    pool = Math.max(0, (pool - fc) * (1 + rr));
    const short = gap - fc;
    rows.push({ t, need, partnerIncome: pT, nisSurvivors: nT, fromCapital: fc, short });
    if (monthOfShortfall === null && short > 1) {
      const perMonth = gap / 12;
      monthOfShortfall = t * 12 + Math.floor(fc / perMonth) + 1;
    }
    pvGap += gap / Math.pow(1 + rr, t);
  }
  return { rows, pvGap, firstShortYear: rows.findIndex((w) => w.short > 1), monthOfShortfall };
}
function computeDeathNeed(ctx) {
  const b = new ProvenanceBuilder();
  const { facts, budget, debts, careGraph: careGraph2 } = ctx;
  const w = facts.wishes;
  const survFull = survivorCashflow(b, facts, budget.livingMonthly, true, true, 0);
  const cover = coverHeld(b, facts);
  const ob = [];
  ob.push({ key: "funeral", label: "Your funeral", amount: w.funeral, tier: "essential", kind: "lump" });
  ob.push({ key: "medical", label: "Final medical bills", amount: Math.max(b.num("conventions.medical_cost_minimum"), w.finalMedical), tier: "essential", kind: "lump" });
  if (debts.expensiveDebt > 0) ob.push({ key: "debt", label: "Expensive debt", amount: debts.expensiveDebt, tier: "essential", kind: "lump" });
  if (budget.housingStopsOnDeath && facts.budget.mortgage) {
    ob.push({ key: "mortgage", label: "The mortgage", amount: facts.budget.mortgage.balance, tier: "essential", kind: "lump" });
  }
  ob.push({ key: "income", label: "Household income, to youngest age 19", amount: survFull.pvGap, tier: "essential", kind: "income" });
  const byStart = (xs) => xs.slice().sort((a, c) => a.start - c.start);
  for (const gl of byStart(careGraph2.goals.filter((g2) => g2.kind === "care"))) {
    ob.push({ key: gl.key, label: `${gl.who}'s care`, amount: gl.presentValue, tier: "recommended", kind: "care", who: gl.who, personId: gl.personId });
  }
  for (const gl of byStart(careGraph2.goals.filter((g2) => g2.kind === "edu"))) {
    ob.push({ key: gl.key, label: `${gl.who}'s degree`, amount: gl.presentValue, tier: "recommended", kind: "edu", who: gl.who, personId: gl.personId });
  }
  for (const gl of byStart(careGraph2.goals.filter((g2) => g2.kind === "milestone"))) {
    ob.push({ key: gl.key, label: `${gl.who}'s ${gl.what}`, amount: gl.presentValue, tier: "full", kind: "milestone", who: gl.who, personId: gl.personId });
  }
  if (w.legacy > 0) ob.push({ key: "legacy", label: "What you leave behind", amount: w.legacy, tier: "full", kind: "lump" });
  const sumTier = (ts) => ob.filter((o) => ts.includes(o.tier)).reduce((a, o) => a + o.amount, 0);
  const assets = facts.budget.savings + cover.knownLife;
  const mults = b.get("core:ff.deathNeed.underwritingMultiples");
  const age = facts.client.age;
  const uwMult = mults.find((m) => m.toAge === null || age <= m.toAge).times;
  const g = facts.client.grossMonthly;
  const uw = g * 12 * uwMult;
  const tiers = {
    essential: Math.min(uw, Math.max(0, sumTier(["essential"]) - assets)),
    recommended: Math.min(uw, Math.max(0, sumTier(["essential", "recommended"]) - assets)),
    full: Math.min(uw, Math.max(0, sumTier(["essential", "recommended", "full"]) - assets))
  };
  b.rule("obligations are funded in stack order; cover is capped at the underwriting ceiling");
  const kids = facts.children;
  const partnerNet = budget.netPay.partnerNetMonthly;
  const M = b.get("core:ff.deathNeed.crossCheckMethods");
  const yrsRep = kids.length ? M.yearsWithChildren : M.yearsWithoutChildren;
  const inc = g * 12;
  const annNeed = Math.max(0, g * M.incomeShareOfGross - partnerNet) * 12;
  const eduT = kids.length * b.num("core:ff.deathNeed.tatilEducationPerChild");
  const off = cover.knownLife + facts.budget.savings;
  const af = (1 - Math.pow(1 + M.spendDownRealRate, -yrsRep)) / M.spendDownRealRate;
  const gM = M.ageMultiples.find((m) => m.toAge === null || age <= m.toAge).times;
  const youngest = kids.length ? Math.min(...kids.map((k) => k.age)) : null;
  const sSpouse = b.num("core:ff.offsets.nisSurvivorSpouseMonthly");
  const sChild = b.num("core:ff.offsets.nisSurvivorChildMonthly");
  const childTo = b.num("core:ff.offsets.nisSurvivorChildToAge");
  const nisSurv = facts.client.nisPaying ? sSpouse * (facts.partner ? 1 : 0) + sChild * kids.filter((k) => k.age < childTo).length : 0;
  const tatilYears = youngest === null ? 0 : Math.max(0, b.num("core:ff.deathNeed.tatilIncomeToYoungestAge") - youngest);
  const medical = Math.max(b.num("conventions.medical_cost_minimum"), w.finalMedical);
  const mortgageBal = facts.budget.mortgage ? facts.budget.mortgage.balance : 0;
  const clears = !!facts.budget.mortgage && facts.budget.mortgage.clearOnDeath;
  const tatil = Math.max(0, w.funeral + medical + debts.expensiveDebt + (clears ? mortgageBal : 0) + eduT + Math.max(0, budget.livingMonthly + budget.carePaidMonthly - nisSurv) * 12 * tatilYears - facts.budget.savings);
  const otherDebt = debts.otherDebt + mortgageBal;
  const bad = debts.expensiveDebt;
  const methods = [
    { key: "stack", name: "Everything we captured (this tool)", value: tiers.recommended },
    { key: "tatil", name: "Tatil standard formula", value: tatil },
    { key: "retention", name: "Capital retention at 8%", value: Math.max(0, annNeed / M.retentionRate + bad + otherDebt + eduT - off) },
    { key: "spend-down", name: "Capital spent down (2.7% real)", value: Math.max(0, annNeed * af + bad + otherDebt + eduT - off) },
    { key: "dime", name: "DIME", value: Math.max(0, bad + inc * yrsRep + otherDebt + eduT - off) },
    { key: "age-multiple", name: "Age-banded multiple", value: inc * gM },
    { key: "attic", name: "ATTIC rule of thumb", value: inc * M.atticTimes }
  ];
  b.rule("the Tatil standard formula and the other methods are a cross-check only");
  return { obligations: ob, survivorFull: survFull, cover, assets, underwritingMultiple: uwMult, underwritingCeiling: uw, tiers, methods, provenance: b.build() };
}

// src/needs/work-pension.ts
function workPension(b, wp, retireAge) {
  if (wp.kind === "public-service") {
    const cap = b.num("core:retirement.publicService.retireAgeCap");
    const psRetire = Math.min(retireAge, cap);
    const months = Math.max(0, (psRetire - (wp.startAge ?? psRetire)) * 12);
    const calc = (wp.salaryMonthly ?? 0) * Math.min(months, b.num("core:retirement.publicService.maxMonths")) * b.num("core:retirement.publicService.accrualPerMonth");
    const ok = months >= b.num("core:retirement.publicService.minimumMonthsService");
    const min = b.num("core:retirement.publicService.minimumMonthly");
    const full = ok ? Math.max(min, calc) : 0;
    const reduced = ok ? Math.max(min, calc * b.num("core:retirement.publicService.reducedShare")) : 0;
    const gratuity = ok ? calc * b.num("core:retirement.publicService.commutedShare") * 12 * b.num("core:retirement.publicService.commutationFactor") : 0;
    b.use("core:retirement.publicService.excludes");
    b.caveat("Public-service pension uses the salary entered; the salary averaging rule could not be verified.");
    return {
      kind: wp.kind,
      monthly: wp.takeReduced ? reduced : full,
      startsAtAge: psRetire,
      publicService: { monthsOfService: months, qualifies: ok, fullMonthly: full, reducedMonthly: reduced, gratuity }
    };
  }
  if (wp.kind === "company") {
    return { kind: wp.kind, monthly: wp.companyMonthly ?? 0, startsAtAge: retireAge, publicService: null };
  }
  return { kind: "none", monthly: 0, startsAtAge: retireAge, publicService: null };
}

// src/annuity-routing.ts
function registeredEligible(b, goal, client) {
  const floorAge = b.num("annuities.statutory_maturity_floor");
  return client.paysTax && goal.ageAtGoal >= floorAge && client.capHeadroomAnnual > 0;
}
function belowAllowance(b, client) {
  return client.grossAnnual <= b.num("income_tax.personal_allowance");
}
function routeAnnuity(b, goal, client) {
  const reasons = [];
  const blocked = belowAllowance(b, client);
  const exemption = b.get("annuities.exemption_window");
  const unregTo = b.num("core:ff.closing.unregisteredMaturityTo");
  if (blocked) reasons.push("Income is below the personal allowance, so a registered plan gives no relief. Registered is not offered.");
  const eligible = !blocked && registeredEligible(b, goal, client);
  if (!blocked && !client.paysTax) reasons.push("No income tax is paid, so there is no relief to claim.");
  if (!blocked && goal.ageAtGoal < exemption.min_age) reasons.push("The money is needed before 50. A registered withdrawal before maturity is taxed at 25%, so registered always loses here.");
  if (!blocked && client.capHeadroomAnnual <= 0) reasons.push("The TT$60,000 deduction limit is already used.");
  const mode = eligible ? "registered" : "unregistered";
  return {
    mode,
    registeredEligible: eligible,
    hardBlocked: blocked,
    reasons,
    maturityRange: mode === "registered" ? { from: exemption.min_age, to: exemption.max_age } : { from: exemption.min_age, to: unregTo }
  };
}
function requireRegistered(b, goal, client) {
  const r = routeAnnuity(b, goal, client);
  if (r.mode !== "registered") throw new RegisteredRoutingError(`Registered routing refused: ${r.reasons.join(" ")}`);
  return r;
}
function registeredWithdrawalGrossUp(b, need) {
  return need / (1 - b.num("core:ff.closing.registeredWithdrawalTax"));
}
var ADVENTURER_WORDING = "Your money cannot go down. There is no promised growth, which is why the upside is the highest of the three.";
function vehicleFigures(b, vehicleId) {
  const v = b.get(`core:vehicles.${vehicleId}`);
  return {
    vehicle: v,
    guaranteedFloor: v.floor,
    planningRate: b.num("core:ff.rates.planningReturn"),
    planningRateLabel: "advisor-set",
    wording: v.capitalProtected ? ADVENTURER_WORDING : null
  };
}
function monthlyToReach(rate, target, years) {
  const m = rate / 12;
  const n = years * 12;
  return m === 0 ? target / n : target * m / (Math.pow(1 + m, n) - 1);
}
function valueOfSaving(rate, monthly, years) {
  const m = rate / 12;
  const n = years * 12;
  return m === 0 ? monthly * n : monthly * (Math.pow(1 + m, n) - 1) / m;
}
function stressAgainstFloor(b, vehicleId, monthly, target, years) {
  const f = vehicleFigures(b, vehicleId);
  const reached = valueOfSaving(f.guaranteedFloor, monthly, years);
  const shortBy = Math.max(0, target - reached);
  const extraMonthly = Math.max(0, monthlyToReach(f.guaranteedFloor, target, years) - monthly);
  const pct = `${Math.round(f.guaranteedFloor * 1e3) / 10}%`;
  return {
    vehicleId,
    floor: f.guaranteedFloor,
    shortBy,
    extraMonthly,
    sentence: `If this delivers only the guaranteed ${pct}, you would be short $${Math.round(shortBy).toLocaleString("en-US")}, or need $${Math.round(extraMonthly).toLocaleString("en-US")} more each month.`
  };
}

// src/retirement-income.ts
function computeRetirementIncome(facts, netPay) {
  const b = new ProvenanceBuilder();
  const w = facts.wishes;
  const wp = workPension(b, facts.workPension, w.retireAge);
  const nis = facts.client.nisPaying ? b.num("nis.minimum_pension") : 0;
  if (facts.client.nisPaying) b.caveat(`NIS is taken at the $${nis.toLocaleString("en-US")} minimum pension; the fact-finder does not capture contributions or earnings history.`);
  const scpMax = b.num("core:ff.offsets.scpMonthly");
  const cap = b.num("core:ff.offsets.nisPlusScpCap");
  const scpAge = b.useNode("scp.eligibility").node.age;
  const scpAt65 = Math.max(0, Math.min(scpMax, cap - nis - wp.monthly));
  const floor = nis + wp.monthly + (w.retireAge >= scpAge ? scpAt65 : 0);
  const gap = Math.max(0, w.retireIncomeMonthly - floor);
  const yrs = Math.max(1, w.retireAge - facts.client.age);
  const capToday = gap * 12 / b.num("core:ff.closing.retirementCapitalRate");
  const capThen = capToday * Math.pow(1 + b.num("core:ff.rates.inflation"), yrs);
  const plan = b.num("core:ff.rates.planningReturn");
  const save = monthlyToReach(plan, capThen, yrs);
  const destinyMin = b.get("core:products.destiny").minPremiumMonthly;
  const routing = routeAnnuity(b, { ageAtGoal: w.retireAge }, {
    paysTax: netPay.paysTax,
    grossAnnual: facts.client.grossMonthly * 12,
    capHeadroomAnnual: netPay.deductionHeadroomAnnual
  });
  const relief = routing.mode === "registered" ? Math.min(save * 12, netPay.deductionHeadroomAnnual) * b.num("core:ff.closing.reliefRate") : 0;
  const destinyMonthly = gap > 0 ? Math.max(destinyMin, save) : 0;
  const stress = gap > 0 ? ["destiny-settler", "destiny-explorer", "destiny-adventurer"].map((v) => stressAgainstFloor(b, v, save, capThen, yrs)) : [];
  const pt = b.get("core:ff.closing.planToAge");
  const planTo = (facts.client.sex === "female" ? pt.female : pt.male) + (facts.client.longLived ? pt.longLivedExtra : 0);
  b.rule("retirement saving is sized on the advisor-set planning rate and stressed against each Destiny floor");
  return {
    retireAge: w.retireAge,
    wantedMonthly: w.retireIncomeMonthly,
    nisMonthly: nis,
    scpMonthly: w.retireAge >= scpAge ? scpAt65 : 0,
    workPension: wp,
    floorMonthly: floor,
    gapMonthly: gap,
    yearsToRetirement: yrs,
    capitalNeededToday: capToday,
    capitalNeededAtRetirement: capThen,
    saveMonthly: save,
    destinyMonthly,
    routing,
    reliefAnnual: relief,
    stress,
    planToAge: planTo,
    provenance: b.build()
  };
}

// src/premiums.ts
var RATE_PATHS = {
  term: ["core:ff.premiumRates.termPer1000", "core:ff.premiumRates.termAgeGrowth"],
  "whole-life": ["core:ff.premiumRates.wholeLifePer1000", "core:ff.premiumRates.wholeLifeAgeGrowth"],
  ci: ["core:ff.premiumRates.ciPer1000", "core:ff.premiumRates.ciAgeGrowth"]
};
function ratePer1000(b, kind, age) {
  const [base, growth] = RATE_PATHS[kind];
  return b.num(base) * Math.pow(b.num(growth), age - b.num("core:ff.premiumRates.baseAge"));
}
function roughBand(b, estimate, minimumMonthly) {
  const spread = b.num("core:ff.premiumRates.bandSpread");
  const low = estimate * (1 - spread);
  const high = estimate * (1 + spread);
  if (minimumMonthly !== null && high < minimumMonthly) {
    return Object.freeze({ low: minimumMonthly, high: minimumMonthly, label: "the minimum premium" });
  }
  return Object.freeze({
    low: minimumMonthly !== null ? Math.max(minimumMonthly, low) : low,
    high,
    label: "rough"
  });
}
function premiumFor(b, kind, cover, age) {
  return cover * ratePer1000(b, kind, age) / 1e3;
}
function coverForPremium(b, kind, monthly, age) {
  const r = ratePer1000(b, kind, age);
  return r > 0 ? monthly / r * 1e3 : 0;
}
function ratedAge(age) {
  return age + 1;
}
function canIssue(b, id2, age) {
  const { min, max } = b.get(`core:products.${id2}`).issueAge;
  const rated = ratedAge(age);
  return (min === null || rated >= min) && (max === null || rated <= max);
}
function restAssuredRatedAge(age) {
  return ratedAge(age);
}
function restAssuredEligible(b, age) {
  return canIssue(b, "rest-assured-ii", age);
}
function restAssuredPer1000(b, insured) {
  if (insured.sex === null) {
    b.caveat(`${insured.who}: sex not known, so Rest Assured II is priced on the male rate (the higher one).`);
  }
  const anchor = b.get(insured.sex === "female" ? "core:ff.premiumRates.restAssuredFemale" : "core:ff.premiumRates.restAssuredMale");
  const years = restAssuredRatedAge(insured.age) - anchor.ratedAge;
  return years === 0 ? anchor.per1000 : anchor.per1000 * Math.pow(b.num("core:ff.premiumRates.restAssuredAgeGrowth"), years);
}
function restAssuredPremium(b, insured, cover) {
  return cover * restAssuredPer1000(b, insured) / 1e3;
}
function restAssuredCoverFor(b, insured, monthly) {
  const r = restAssuredPer1000(b, insured);
  return r > 0 ? monthly / r * 1e3 : 0;
}
function fitToMinimums(rows, total) {
  if (total <= 0) {
    return { funded: [], notYet: rows.filter((r) => r.min > 0).map((r) => ({ key: r.key, needs: r.min })) };
  }
  const fund = [...rows];
  const later = [];
  const sumMin = (xs) => xs.reduce((a, x) => a + x.min, 0);
  while (sumMin(fund) > total) {
    let k = fund.length - 1;
    while (k >= 0 && fund[k].min <= 0) k--;
    if (k < 0) break;
    later.unshift(fund.splice(k, 1)[0]);
  }
  for (let k = 0; k < later.length; k++) {
    if (sumMin(fund) + later[k].min <= total) {
      fund.push(later[k]);
      later.splice(k, 1);
      k--;
    }
  }
  fund.sort((a, b) => rows.indexOf(a) - rows.indexOf(b));
  const rem = total - sumMin(fund);
  const shares = fund.reduce((a, x) => a + x.weight, 0) || 1;
  return {
    funded: fund.map((x) => ({ key: x.key, monthly: x.min + rem * x.weight / shares, min: x.min })),
    notYet: later.map((x) => ({ key: x.key, needs: x.min }))
  };
}

// src/goals.ts
var TITLES = {
  home: "House",
  vehicle: "Car",
  study: "Your own studies",
  business: "Start a business",
  own: "Your own goal"
};
function pvOfPayment(pay, ratePct, years) {
  const m = ratePct / 1200;
  const n = Math.max(1, years * 12);
  return pay <= 0 ? 0 : pay * (1 - Math.pow(1 + m, -n)) / m;
}
function monthlyToSave(b, target, years) {
  const m = b.num("core:ff.goals.savingReturn") / 12;
  const n = Math.max(1, years * 12);
  return target <= 0 ? 0 : target * m / (Math.pow(1 + m, n) - 1);
}
function homePlan(b, facts, budget, g) {
  const ltv = b.num("core:ff.goals.homeLoanToValue");
  const dep = g.price * (1 - ltv);
  const close = g.price * b.num("core:ff.goals.homeClosingCosts");
  const loan = g.price - dep;
  const target = Math.max(0, dep + close - g.saved);
  const age = facts.client.age;
  const term = Math.max(b.num("core:ff.goals.mortgageMinYears"), Math.min(b.num("core:ff.goals.mortgageMaxYears"), b.num("core:ff.goals.mortgageEndsByAge") - age - g.years));
  const ratePct = b.num("core:ff.goals.mortgageRatePct");
  const pay = amortisedPayment(loan, ratePct, term);
  const mortgage = facts.budget.mortgage;
  const maxPay = Math.max(0, facts.client.grossMonthly * b.num("core:ff.goals.affordabilityShareOfGross") - budget.debtMinimumsMonthly - (mortgage && mortgage.balance > 0 ? facts.budget.housingPaymentMonthly : 0));
  const minCover = b.num("core:ff.goals.loanCoverMinimumMonthly");
  return {
    target,
    plan: {
      deposit: dep,
      closingCosts: close,
      loan,
      termYears: term,
      ratePct,
      monthlyPayment: pay,
      affordableMonthly: maxPay,
      fits: pay <= maxPay,
      likelyLoan: pvOfPayment(maxPay, ratePct, term),
      stampDutyReliefPossible: g.price < b.num("core:ff.goals.stampDutyReliefBelow"),
      loanCoverMonthly: {
        atPurchase: Math.max(minCover, premiumFor(b, "term", loan, age + g.years)),
        tenYearsLater: Math.max(minCover, premiumFor(b, "term", loan, age + g.years + 10)),
        label: "rough"
      }
    }
  };
}
function computeGoals(facts, budget) {
  const b = new ProvenanceBuilder();
  const plans = facts.goals.filter((g) => g.on).map((g) => {
    let target;
    let home = null;
    let car = null;
    if (g.kind === "home" && g.route === "mortgage") {
      const h = homePlan(b, facts, budget, g);
      home = h.plan;
      target = h.target;
    } else if (g.kind === "vehicle" && g.route === "loan") {
      const loanInput = {
        price: g.price,
        newVehicle: g.newVehicle !== false,
        saved: g.saved,
        ...g.depositPct !== void 0 ? { depositPct: g.depositPct } : {},
        ...g.termYears !== void 0 ? { termYears: g.termYears } : {}
      };
      car = carLoan(b, loanInput);
      target = car.saveFirst;
    } else {
      target = Math.max(0, g.price - g.saved);
    }
    const title = g.kind === "own" && g.label && g.label.trim() ? g.label : TITLES[g.kind];
    return { goalId: g.goalId, kind: g.kind, title, route: g.route, target, years: g.years, monthlySaving: monthlyToSave(b, target, g.years), home, car };
  });
  const total = plans.reduce((a, p) => a + p.monthlySaving, 0);
  const available = Math.max(0, budget.surplusMonthly);
  b.rule("goal saving is sized in a fund growing about 3% a year");
  return { plans, totalMonthly: total, available, fits: total <= available + 0.5, provenance: b.build() };
}

// src/insurance-budget.ts
function assertRidersAllowed(b, product2, riders) {
  for (const r of riders) {
    const spec = b.get(`core:riders.${r}`);
    const onProduct = b.get(`core:products.${product2}`).riders;
    if (!spec.allowedOn.includes(product2) || !onProduct.includes(r)) {
      throw new Error(`${spec.name} is not offered on ${product2}; it is only on ${spec.allowedOn.join(", ")}`);
    }
  }
}
function coverPerDollar(b, basis, age) {
  switch (basis) {
    case "term":
      return 1e3 / ratePer1000(b, "term", age);
    case "whole-life":
      return 1e3 / ratePer1000(b, "whole-life", age);
    case "ci":
      return 1e3 / ratePer1000(b, "ci", age);
    case "cashbuilder":
      return b.num("core:ff.premiumRates.cashbuilderCoverShare") * 1e3 / ratePer1000(b, "whole-life", age);
    case "endowment":
      return 12 * b.num("core:ff.premiumRates.endowmentCoverYears") * b.num("core:ff.premiumRates.endowmentCoverShare");
    case "none":
      return 0;
  }
}
function minimumFor(b, row2) {
  const spec = b.get(`core:products.${row2.product}`);
  const minPrem = spec.minPremiumMonthly ?? 0;
  const per = coverPerDollar(b, row2.basis, row2.insuredAge);
  const coverMin = spec.cover && per > 0 ? spec.cover.min / per : 0;
  return Math.max(minPrem, coverMin);
}
function profileFor(facts) {
  if (facts.client.age >= 50) return "later";
  return facts.partner || facts.children.length > 0 ? "family" : "single";
}
function savingsRows(facts, profile) {
  const age = facts.client.age;
  const r = (key, name, product2, weight, why, basis) => ({ key, name, product: product2, riders: [], weight, why, costTier: "you choose", basis, insuredAge: age });
  if (profile === "single") {
    return [
      r("annuity", "Retirement annuity (Destiny, unregistered)", "destiny", 0.55, "Starting in your 20s is the biggest money advantage you will ever have. An unregistered plan is easier to reach if life changes.", "none"),
      r("endowment", "Endowment plan", "endowment", 0.45, "Forced saving for a set date, such as a house deposit or a car, with life cover built in.", "endowment")
    ];
  }
  if (profile === "family") {
    return [
      r("annuity", "Retirement annuity (Destiny)", "destiny", 0.5, "NIS and the SCP stop at $5,500 a month. This tops it up.", "none"),
      facts.children.length ? r("endowment", "Education endowment", "endowment", 0.5, "Saves for each child's degree by the date it is needed, with cover built in.", "endowment") : r("endowment", "Endowment plan", "endowment", 0.5, "Forced saving for a goal with a date.", "endowment")
    ];
  }
  return [
    r("annuity-registered", "Registered annuity (Destiny)", "destiny", 0.6, "Up to 25% back in tax while you still earn.", "none"),
    r("annuity-unregistered", "Unregistered annuity", "destiny", 0.4, "Retirement money you can reach more easily, with no tax-relief limit.", "none")
  ];
}
var fmt = (n) => `$${Math.round(n).toLocaleString("en-US")}`;
function protectionPlanFor(b, facts, profile, item) {
  const { key } = item;
  const age = facts.client.age;
  const capped = (product2, cover) => Math.min(b.get(`core:products.${product2}`).cover?.max ?? Infinity, cover);
  const at = (basis, product2) => (monthly) => capped(product2, monthly * coverPerDollar(b, basis, age));
  const ra = (insured) => (monthly) => capped("rest-assured-ii", restAssuredCoverFor(b, insured, monthly));
  const life = item.product === "whole-life" ? { product: "whole-life", name: "Whole life" } : { product: "term", name: "Term life" };
  if (key === "life-ruin") {
    const why = profile === "later" ? "Clears what you still owe so it does not pass to the family." : profile === "single" ? "Clears what you owe and pays your funeral, so nothing falls on your family. The most cover for each dollar." : "Replaces your income for the people who depend on you. The most cover for each dollar.";
    return { name: profile === "later" ? `${life.name} to clear debts` : life.name, product: life.product, riders: [], why, cover: at(life.product, life.product) };
  }
  const goalId = key.startsWith("loan-cover:") ? key.slice("loan-cover:".length) : null;
  const goal = facts.goals.find((g) => g.goalId === goalId);
  if (goal) {
    const loan = item.product === "whole-life" ? { product: "whole-life", name: "Whole life" } : { product: "term", name: "Term life" };
    return {
      name: `${loan.name} for your ${goal.kind === "home" ? "home" : "car"} loan`,
      product: loan.product,
      riders: [],
      why: `Your lender will want this from year ${goal.years}. It costs about ${fmt(item.min)} a month if you start now.`,
      cover: at(loan.product, loan.product)
    };
  }
  if (key === "critical-illness") {
    const why = profile === "single" ? "At your age a serious illness or injury is far more likely than death. This pays a lump sum to live on while you recover." : profile === "family" ? "Keeps the family going while you recover." : "Illness is the biggest money risk from 50.";
    return { name: "Critical illness (Life Span Gold)", product: "life-span-gold", riders: [], why, cover: at("ci", "life-span-gold") };
  }
  if (key === "disability-income") {
    const why = profile === "single" ? "The rider pays a monthly income if illness or injury stops you working. The plan locks in lifelong cover while you are young and healthy, and builds cash value." : "Pays a monthly income if illness or injury stops you working, on top of lifelong cover.";
    return { name: "Cashbuilder II with disability income rider", product: "cashbuilder-ii", riders: ["disability-income"], why, cover: at("cashbuilder", "cashbuilder-ii") };
  }
  if (key === "own-final-expense") {
    return {
      name: "Final expense (Rest Assured II)",
      product: "rest-assured-ii",
      riders: [],
      why: "Pays the funeral, with no medical questions, up to age 80 at the start.",
      cover: ra({ age, sex: facts.client.sex, who: "You" })
    };
  }
  const parentId = key.startsWith("parent-funeral:") ? key.slice("parent-funeral:".length) : null;
  const p = facts.parents.find((x) => x.personId === parentId);
  if (p) {
    return {
      name: `${parentLabel(p)}'s funeral cover (Rest Assured II)`,
      product: "rest-assured-ii",
      riders: [],
      why: "Pays the funeral home directly, with no probate wait.",
      cover: ra({ age: parentAge(p, facts.asOfYear), sex: parentSex(p), who: parentLabel(p) })
    };
  }
  throw new Error(`No protection plan maps to the ladder item "${key}"`);
}
var ridersOf = (b, riders) => riders.map((id2) => {
  const rs = b.get(`core:riders.${id2}`);
  return { id: id2, name: rs.name, underwriting: rs.underwriting };
});
var notYetNote = (notYet) => notYet.length ? ` Not yet: ${notYet.map((x) => `${x.name} (needs about $${Math.round(x.needsMonthly).toLocaleString("en-US")} a month)`).join(", ")}. Add it when the budget grows.` : "";
function protectionGroup(b, facts, profile, from, note) {
  const drafts = [];
  const notYet = [];
  const wait = (s) => {
    const plan = protectionPlanFor(b, facts, profile, s);
    assertRidersAllowed(b, plan.product, plan.riders);
    notYet.push({ key: s.key, name: plan.name, product: plan.product, riders: ridersOf(b, plan.riders), needsMonthly: s.min, why: plan.why, ladderKeys: [s.key] });
  };
  if (from.ladder.underwater) {
    for (const s of from.ladderSpecs) if (s.insurance && s.min > 0) wait(s);
  }
  for (const it of from.ladder.items) {
    if (!it.insurance) continue;
    if (it.addsTo !== void 0) {
      if (it.allocated <= 0) continue;
      const host = drafts.find((d) => d.keys.includes(it.addsTo));
      if (!host) throw new Error(`Ladder item "${it.key}" is funded but the plan it adds to ("${it.addsTo}") is not`);
      host.monthly += it.allocated;
      host.keys.push(it.key);
      continue;
    }
    if (it.allocated > 0) {
      const plan = protectionPlanFor(b, facts, profile, it);
      assertRidersAllowed(b, plan.product, plan.riders);
      drafts.push({ plan, key: it.key, monthly: it.allocated, min: it.min, keys: [it.key] });
    } else if (it.notYet) {
      wait(it);
    }
  }
  const funded = drafts.map(({ plan, key, monthly, min, keys }) => {
    const spec = b.get(`core:products.${plan.product}`);
    const band = roughBand(b, monthly, spec.minPremiumMonthly);
    const atMinimum = monthly <= min + 0.5;
    return {
      key,
      name: plan.name,
      product: plan.product,
      riders: ridersOf(b, plan.riders),
      monthly,
      minimumMonthly: min,
      atMinimum,
      roughCover: plan.cover(monthly),
      why: plan.why,
      disclosure: spec.disclosure,
      label: band.label === "the minimum premium" || atMinimum ? "the minimum premium" : "rough",
      ladderKeys: keys
    };
  });
  const total = funded.reduce((a, p) => a + p.monthly, 0);
  return { title: "Protection", totalMonthly: total, funded, notYet, note: note + notYetNote(notYet) };
}
function fitGroup(b, title, total, rows, note) {
  for (const r0 of rows) assertRidersAllowed(b, r0.product, r0.riders);
  const fitRows = rows.map((r0) => ({ key: r0, min: minimumFor(b, r0), weight: r0.weight }));
  const fit = fitToMinimums(fitRows, total);
  const funded = fit.funded.map(({ key: r0, monthly, min }) => {
    const spec = b.get(`core:products.${r0.product}`);
    const per = coverPerDollar(b, r0.basis, r0.insuredAge);
    const cover = per > 0 ? Math.min(spec.cover?.max ?? Infinity, monthly * per) : null;
    const band = roughBand(b, monthly, spec.minPremiumMonthly);
    return {
      key: r0.key,
      name: r0.name,
      product: r0.product,
      riders: ridersOf(b, r0.riders),
      monthly,
      minimumMonthly: min,
      atMinimum: monthly <= min + 0.5,
      roughCover: cover,
      why: r0.why,
      disclosure: spec.disclosure,
      label: band.label === "the minimum premium" || monthly <= min + 0.5 ? "the minimum premium" : "rough",
      ladderKeys: []
    };
  });
  const notYet = fit.notYet.map(({ key: r0, needs }) => ({ key: r0.key, name: r0.name, product: r0.product, riders: ridersOf(b, r0.riders), needsMonthly: needs, why: r0.why, ladderKeys: [] }));
  return { title, totalMonthly: Math.max(0, total), funded, notYet, note: note + notYetNote(notYet) };
}
function computeInsuranceBudget(facts, budget, buckets, from) {
  const b = new ProvenanceBuilder();
  const profile = profileFor(facts);
  const fromBuilder = buckets.retirement + buckets.goals;
  const savTotal = fromBuilder > 1 ? fromBuilder : Math.round(budget.netPay.householdNetMonthly * b.num("core:ff.budget.savingsDefaultShareOfNet"));
  const protNote = budget.stage === 0 ? "Costs are bigger than income, so we hold new protection until the gap is closed." : from.ladder.insuranceCapMonthly === budget.band.recommended ? `Your safe range is ${fmt(budget.band.floor)} to ${fmt(budget.band.ceiling)}. We plan to ${fmt(budget.band.recommended)}, the recommended amount, and fund plans in priority order.` : `Your safe range is ${fmt(budget.band.floor)} to ${fmt(budget.band.ceiling)}. We plan to ${fmt(from.ladder.insuranceCapMonthly)}, the amount you chose, and fund plans in priority order.`;
  const savNote = fromBuilder > 1 ? "From your pay-yourself-first plan." : "About 10% of take-home, once your emergency fund is full.";
  b.rule("protection follows the priority ladder: each insurance plan gets its minimum or waits as 'not yet', inside the recommended figure");
  b.rule("each savings plan gets its minimum first; plans that cannot reach their minimum wait as 'not yet'");
  return {
    profile,
    groups: [protectionGroup(b, facts, profile, from, protNote), fitGroup(b, "Savings plans", savTotal, savingsRows(facts, profile), savNote)],
    note: "A budget, not a quote. Kyron turns it into real prices, and checks what fits your health and your goals.",
    provenance: b.build()
  };
}

// src/health-score.ts
function computeHealthScore(input) {
  const b = new ProvenanceBuilder();
  const max = b.num("core:ff.healthScore.partMax");
  const span = b.num("core:ff.healthScore.needsRatioSpan");
  const full = b.num("core:ff.healthScore.bufferFullMonths");
  const factor = b.num("core:ff.healthScore.badDebtFactor");
  const { budget, deathNeed, retirement } = input;
  const clamp = (x) => Math.max(0, Math.min(max, x));
  const sc1 = clamp(max * (1 - budget.needsRatio) / span);
  const sc2 = clamp(budget.bufferMonths / full * max);
  const sc3 = budget.expensiveDebt <= 0 ? max : Math.max(0, max - budget.expensiveDebt / Math.max(1, budget.netPay.householdNetMonthly * 12) * factor);
  const sc4 = retirement.wantedMonthly > 0 ? Math.min(max, max * retirement.floorMonthly / retirement.wantedMonthly) : max;
  const held = deathNeed.cover.knownLife + input.savings;
  const sc5 = max * held / Math.max(1, held + deathNeed.tiers.essential);
  const score = Math.round(sc1 + sc2 + sc3 + sc4 + sc5);
  const labels = b.get("core:ff.healthScore.labels");
  return {
    score,
    label: labels.find((l) => score >= l.from).label,
    parts: [
      { key: "spending", label: "Spending", points: sc1, explains: "Needs as a share of take-home" },
      { key: "cushion", label: "Savings cushion", points: sc2, explains: "Months of costs saved, out of 6" },
      { key: "debt", label: "Debt", points: sc3, explains: "Expensive debt against a year's pay" },
      { key: "retirement", label: "Retirement", points: sc4, explains: "Income you can count on, against what you want" },
      { key: "protection", label: "Protection", points: sc5, explains: "What your family would get, against what they would need" }
    ],
    provenance: b.build()
  };
}

// src/scope.ts
var STATES = /* @__PURE__ */ new Set(["acted", "declined", "out_of_scope"]);
var ISO = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:\d{2})?)?$/;
function scopeRow(gapKey, state, recordedAt, note = null) {
  const r = { gapKey, state, note, recordedAt };
  validateScopeRow(r);
  return Object.freeze(r);
}
function validateScopeRow(r) {
  assertNoHealthKeys(r, "scope row");
  const x = r;
  if (typeof x.gapKey !== "string" || !x.gapKey) throw new ClosingInputError("scope row needs a gapKey");
  if (!STATES.has(x.state)) throw new ClosingInputError(`scope row state must be acted, declined or out_of_scope, not ${String(x.state)}`);
  if (typeof x.recordedAt !== "string" || !ISO.test(x.recordedAt)) throw new ClosingInputError("scope row needs an ISO recordedAt date");
}
function buildScopeStatement(gaps, rows) {
  const known = new Set(gaps.map((g) => g.gapKey));
  if (known.size !== gaps.length) throw new ClosingInputError("gap keys must be unique");
  const latest = /* @__PURE__ */ new Map();
  const requests = [];
  for (const r of rows) {
    validateScopeRow(r);
    if (r.gapKey.startsWith("reorder:")) {
      requests.push(r);
      continue;
    }
    if (!known.has(r.gapKey)) throw new ClosingInputError(`scope row for an unknown gap: ${r.gapKey}`);
    const prev = latest.get(r.gapKey);
    if (!prev || r.recordedAt >= prev.recordedAt) latest.set(r.gapKey, r);
  }
  const lines = gaps.map((g) => {
    const r = latest.get(g.gapKey);
    return { ...g, state: r ? r.state : "not_reviewed", recordedAt: r ? r.recordedAt : null, note: r ? r.note : null };
  });
  return {
    lines,
    acted: lines.filter((l) => l.state === "acted"),
    declined: lines.filter((l) => l.state === "declined"),
    outOfScope: lines.filter((l) => l.state === "out_of_scope"),
    notReviewed: lines.filter((l) => l.state === "not_reviewed"),
    declinedRequests: requests.filter((r) => r.state === "declined")
  };
}
function buildSnapshot(input) {
  if (!input.engineVersion) throw new ClosingInputError("a snapshot needs the pinned engine version");
  const snap = JSON.parse(JSON.stringify({
    kind: "life_case_snapshot",
    assumptionSetId: input.assumptionSetId,
    engineVersion: input.engineVersion,
    closing: input.closing,
    scope: input.scope
  }));
  assertNoHealthKeys(snap, "snapshot");
  return snap;
}

// src/closing-ladder.ts
var TIER_ORDER = [0, 1, 1.5, 2, 3];
function defaultOrder(specs) {
  return TIER_ORDER.flatMap((t) => specs.filter((s) => s.tier === t).map((s) => s.key));
}
function insuranceCap(budget, budgetMonthly) {
  if (budgetMonthly === void 0 || budgetMonthly === null) return budget.band.recommended;
  if (typeof budgetMonthly !== "number" || !Number.isFinite(budgetMonthly)) {
    throw new ClosingInputError(`The insurance budget must be a finite number of dollars a month; got ${String(budgetMonthly)}.`);
  }
  const { floor, ceiling } = budget.band;
  if (budgetMonthly < floor - CAP_TOLERANCE || budgetMonthly > ceiling + CAP_TOLERANCE) {
    throw new ClosingInputError(`The insurance budget of ${budgetMonthly.toFixed(2)} a month is outside the safe range ${floor.toFixed(2)} to ${ceiling.toFixed(2)}.`);
  }
  return budgetMonthly;
}
var CAP_TOLERANCE = 1e-9;
function completeOrder(specs, order) {
  const def = defaultOrder(specs);
  const out = order.filter((k) => def.includes(k));
  for (const [i, k] of def.entries()) {
    if (out.includes(k)) continue;
    const prev = def.slice(0, i).reverse().find((p) => out.includes(p));
    out.splice(prev === void 0 ? 0 : out.indexOf(prev) + 1, 0, k);
  }
  return out;
}
function allocateLadder(budget, specs, order, capMonthly) {
  const b = new ProvenanceBuilder();
  if (budget.stage === 0) {
    return {
      underwater: true,
      whatWouldChange: { shortfallMonthly: budget.shortfallMonthly, hoursAtMinimumWage: budget.hoursAtMinimumWage },
      items: [],
      budgetMonthly: 0,
      insuranceCapMonthly: 0,
      insuranceCeilingMonthly: 0,
      insuranceAllocated: 0,
      preconditionsNotCaptured: ["Compulsory motor third-party cover"]
    };
  }
  const keys = order ?? defaultOrder(specs);
  const byKey = new Map(specs.map((s) => [s.key, s]));
  const ordered = keys.map((k) => byKey.get(k)).filter(Boolean);
  let left = Math.max(0, budget.surplusMonthly);
  const cap = capMonthly ?? budget.band.recommended;
  let capLeft = cap;
  const got = new Map(ordered.map((s) => [s.key, 0]));
  const notYet = /* @__PURE__ */ new Set();
  const roomFor = (s) => s.insurance ? Math.min(left, capLeft) : left;
  const give = (s, x) => {
    got.set(s.key, got.get(s.key) + x);
    left -= x;
    if (s.insurance) capLeft -= x;
  };
  const planFunded = (s) => s.min > 0 ? got.get(s.key) > 0 : s.addsTo === void 0 || (got.get(s.addsTo) ?? 0) > 0;
  for (const s of ordered) {
    if (s.min <= 0) continue;
    const room = roomFor(s);
    if (!s.insurance) give(s, Math.max(0, Math.min(room, s.min)));
    else if (s.min <= room + 1e-9) give(s, Math.min(room, s.min));
    else notYet.add(s.key);
  }
  for (const s of ordered) {
    if (s.insurance && !planFunded(s)) continue;
    give(s, Math.max(0, Math.min(roomFor(s), s.full - got.get(s.key))));
  }
  b.rule("pass one fills minimums top down; an insurance item gets its minimum or waits as 'not yet', and the ladder moves on; pass two fills fulls top down");
  const items = ordered.map((s) => ({ ...s, allocated: got.get(s.key), notYet: notYet.has(s.key) }));
  return {
    underwater: false,
    whatWouldChange: null,
    items,
    budgetMonthly: Math.max(0, budget.surplusMonthly),
    insuranceCapMonthly: cap,
    insuranceCeilingMonthly: budget.ceilingMonthly,
    insuranceAllocated: items.filter((i) => i.insurance).reduce((a, i) => a + i.allocated, 0),
    preconditionsNotCaptured: ["Compulsory motor third-party cover"]
  };
}
function requestReorder(specs, order, itemKey, toIndex, recordedAt) {
  const tierOf = new Map(specs.map((s) => [s.key, s.tier]));
  const from = order.indexOf(itemKey);
  const target = order[toIndex];
  if (from < 0 || target === void 0) throw new Error(`Unknown ladder item or position: ${itemKey} → ${toIndex}`);
  if (tierOf.get(target) !== tierOf.get(itemKey)) {
    return {
      order: [...order],
      declined: [scopeRow(`reorder:${itemKey}`, "declined", recordedAt, `Asked to move "${itemKey}" across a tier (to before "${target}"). Tiers are fixed; recorded as declined.`)]
    };
  }
  const next = [...order];
  next.splice(from, 1);
  next.splice(toIndex, 0, itemKey);
  return { order: next, declined: [] };
}

// src/closing.ts
var LAYER_NAMES = {
  1: "What they need",
  2: "Partner's income",
  3: "NIS survivors",
  4: "Cover in force",
  5: "Your plan"
};
var UNKNOWN_SENTENCE = "We did not capture this. It is not counted either way.";
function money(n) {
  const s = Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (n < 0 ? "-$" : "$") + s;
}
function requireUpstream(ctx) {
  for (const k of ["facts", "budget", "debts", "careGraph", "deathNeed", "retirement", "goals"]) {
    if (!ctx[k]) throw new ClosingInputError(`The closing comparison needs the ${k} result; that engine did not run.`);
  }
  return ctx;
}
function computeClosing(ctxIn, options = {}) {
  const ctx = requireUpstream(ctxIn);
  const { facts, budget, debts, careGraph: careGraph2, deathNeed, retirement, goals } = ctx;
  const b = new ProvenanceBuilder();
  for (const p of [budget.provenance, careGraph2.provenance, deathNeed.provenance, retirement.provenance]) b.merge(p);
  const age = facts.client.age;
  const TR = ratePer1000(b, "term", age);
  const WL = ratePer1000(b, "whole-life", age);
  const term = b.get("core:products.term");
  const whole = b.get("core:products.whole-life");
  const minCover = b.num("core:ff.closing.minimumCoverOnPlan");
  const tol = b.num("core:ff.deathNeed.metTolerance");
  const uw = deathNeed.underwritingCeiling;
  const w = facts.wishes;
  const floorCover = (v) => v > 0 ? Math.max(minCover, v) : 0;
  const cap = insuranceCap(budget, options.budgetMonthly);
  const parentsOffset = facts.parents.filter((p) => p.careTier > 0 && !careGraph2.goals.some((g) => g.key === `${p.personId}:care`));
  const careGoal = new Map(careGraph2.goals.map((g) => [g.key, g]));
  const pronoun = (p) => /mother|grandmother/.test(p.relationship) ? "Her" : /father|grandfather/.test(p.relationship) ? "His" : "Their";
  const lineSentence = (o, paid, met, sv) => {
    switch (o.key) {
      case "funeral":
        return met ? "Your funeral is paid for. The funeral home can be paid directly, without waiting on probate." : "Your funeral falls on the family.";
      case "medical":
        return met ? "Final medical bills are paid." : "Final medical bills fall on the family.";
      case "debt":
        return met ? "The expensive debt is cleared." : `The ${money(o.amount)} of expensive debt stays with the family.`;
      case "mortgage":
        return met ? "The mortgage clears. The family keeps the house." : `The mortgage of ${money(o.amount)} stays.`;
      case "income":
        return met || sv.monthOfShortfall === null ? "The household has enough to live on until the youngest is 19." : `The household money runs out in month ${sv.monthOfShortfall}.`;
      case "legacy":
        return met ? `${money(o.amount)} is left behind, outside your estate.` : "Nothing is left behind.";
    }
    if (o.kind === "care" || o.kind === "edu") {
      const what = o.kind === "care" ? "care" : "degree";
      if (met) return `${o.who}'s ${what} continues.`;
      const dur = careGoal.get(o.key)?.durationYears ?? 0;
      const month = Math.floor(o.amount > 0 ? paid / o.amount * dur * 12 : 0) + 1;
      return `${o.who}'s ${what} stops in month ${month}.`;
    }
    return met ? `${o.label} is funded.` : `${o.label} is not funded.`;
  };
  const layerAt = (L, cover) => {
    const usePartner = L >= 2;
    const useNis = L >= 3;
    const sv0 = survivorCashflow(b, facts, budget.livingMonthly, usePartner, useNis, 0);
    let lump = 0;
    if (L >= 4) lump += deathNeed.cover.knownLife + facts.budget.savings;
    if (L >= 5) lump += Math.min(uw, cover);
    let left = lump;
    const paidLines = deathNeed.obligations.map((o) => {
      const amount = o.key === "income" ? sv0.pvGap : o.amount;
      const paid = Math.min(left, amount);
      left -= paid;
      return { o: { ...o, amount }, paid, met: amount <= tol || paid >= amount - tol };
    });
    const incPaid = paidLines.find((x) => x.o.key === "income")?.paid ?? 0;
    const sv = survivorCashflow(b, facts, budget.livingMonthly, usePartner, useNis, incPaid);
    const lines = paidLines.map(({ o, paid, met }) => ({
      key: o.key,
      label: o.label,
      kind: o.kind,
      tier: o.tier,
      amount: o.amount,
      paid,
      met,
      sentence: lineSentence(o, paid, met, sv),
      note: null
    }));
    for (const p of parentsOffset) {
      const insertAt = Math.min(5, lines.length);
      lines.splice(insertAt, 0, {
        key: `${p.personId}:care`,
        label: `${parentLabel(p)}'s care`,
        kind: "care-offset",
        tier: "recommended",
        amount: 0,
        paid: 0,
        met: true,
        sentence: `${parentLabel(p)}'s care continues.`,
        note: `${pronoun(p)} Senior Citizens' Pension covers it.`
      });
    }
    const notes = [];
    const partner = facts.partner;
    const spouseName = partner?.firstName ?? "Your partner";
    if (L >= 2) notes.push(partner ? `${spouseName}'s income: ${money(partner.incomeMonthly)} a month, to age ${b.num("core:ff.deathNeed.partnerWorksToAge")}.` : "No partner income.");
    if (L >= 3) notes.push(facts.client.nisPaying ? `NIS survivors' benefit: ${money(b.num("core:ff.offsets.nisSurvivorSpouseMonthly"))} a month to your spouse, and ${money(b.num("core:ff.offsets.nisSurvivorChildMonthly"))} a month for each child to ${b.num("core:ff.offsets.nisSurvivorChildToAge")}.` : "No NIS record, so no survivors' benefit.");
    const unknowns = L >= 4 ? deathNeed.cover.unknownLabels : [];
    if (L >= 4) {
      notes.push(`Savings of ${money(facts.budget.savings)} are counted.`);
      for (const u of unknowns) notes.push(`${u}: ${UNKNOWN_SENTENCE}`);
    }
    if (L >= 5) notes.push(`Your plan adds ${money(Math.min(uw, cover))} of cover.`);
    const mort = lines.find((l) => l.key === "mortgage");
    const inc = lines.find((l) => l.key === "income");
    const head = [`Your family receives ${money(lump)}.`];
    if (mort) head.push(mort.met ? "The mortgage clears." : `The mortgage of ${money(mort.amount)} stays.`);
    if (L >= 5 && partner && inc?.met) head.push(`${spouseName}'s income is replaced to age ${partner.age + b.num("core:ff.deathNeed.survivorYears")}.`);
    else if (sv.monthOfShortfall !== null && !inc?.met) head.push(`The money runs out in month ${sv.monthOfShortfall}.`);
    const sentences = [...head, ...lines.map((l) => l.sentence), ...unknowns.length ? [UNKNOWN_SENTENCE] : []];
    const r0 = sv.rows[0];
    return {
      layer: L,
      name: LAYER_NAMES[L],
      need: lines.reduce((a, l) => a + l.amount, 0),
      lines,
      notes,
      survivor: sv,
      outcome: {
        lumpAvailable: lump,
        monthlyAvailable: r0 ? (r0.partnerIncome + r0.nisSurvivors) / 12 : 0,
        monthsUntilShortfall: sv.monthOfShortfall,
        obligationsMet: lines.filter((l) => l.met).map((l) => l.label),
        obligationsFailed: lines.filter((l) => !l.met).map((l) => l.label),
        sentences,
        unknowns
      }
    };
  };
  const t = deathNeed.tiers;
  const packages = {
    essential: floorCover(Math.min(uw, t.essential)),
    recommended: floorCover(Math.min(uw, t.recommended)),
    full: floorCover(Math.min(uw, t.full))
  };
  const pkg = options.package ?? "essential";
  const wanted = packages[pkg];
  const notCoveredAt = (cover) => layerAt(5, cover).lines.filter((l) => !l.met).map((l) => l.label);
  const lsg = b.get("core:products.life-span-gold");
  const ciNeed = Math.max(0, facts.client.grossMonthly * 12 * b.num("core:ff.closing.ciIncomeYears") - deathNeed.cover.knownCI);
  const ciCover = ciNeed > 0 ? Math.max(lsg.cover.min, Math.min(ciNeed, lsg.cover.max ?? ciNeed)) : 0;
  const needs = budget.needsMonthly;
  const ciUnknown = facts.existingCover.filter((c) => c.kind === "ci" && c.amount === null).map((c) => c.label);
  const ciOutcome = (lump, planSentence) => {
    const cash = facts.budget.savings + lump;
    const met = cash >= ciNeed + deathNeed.cover.knownCI || ciNeed <= 0;
    const s = [];
    if (planSentence) s.push(planSentence);
    else s.push(deathNeed.cover.knownCI > 0 ? `Your critical illness cover pays ${money(deathNeed.cover.knownCI)}.` : "No critical illness cover.");
    s.push(`Recovery is paid from ${money(cash)}, about ${(needs > 0 ? cash / needs : 0).toFixed(1)} months of costs.`);
    if (ciUnknown.length) s.push(UNKNOWN_SENTENCE);
    return {
      lumpAvailable: lump,
      monthlyAvailable: 0,
      monthsUntilShortfall: needs > 0 ? Math.floor(cash / needs) + 1 : null,
      obligationsMet: met ? ["Income while you recover"] : [],
      obligationsFailed: met ? [] : ["Income while you recover"],
      sentences: s,
      unknowns: ciUnknown
    };
  };
  const criticalIllness = {
    coverSuggested: ciCover,
    today: ciOutcome(deathNeed.cover.knownCI, null),
    plan: ciOutcome(deathNeed.cover.knownCI + ciCover, ciCover > 0 ? `Life Span Gold pays ${money(ciCover)} as one lump sum on diagnosis, to use as you need while you recover.` : "Your cover in force already meets the critical illness need.")
  };
  const ri = retirement;
  const sources = ri.workPension.monthly > 0 ? ri.workPension.kind === "public-service" ? "NIS, the Senior Citizens' Pension and your public service pension" : "NIS, the Senior Citizens' Pension and your work pension" : "NIS and the Senior Citizens' Pension";
  const longToday = {
    lumpAvailable: 0,
    monthlyAvailable: ri.floorMonthly,
    monthsUntilShortfall: ri.gapMonthly > 0 ? 1 : null,
    obligationsMet: ri.gapMonthly > 0 ? [] : ["Income for life"],
    obligationsFailed: ri.gapMonthly > 0 ? ["Income for life"] : [],
    sentences: [ri.gapMonthly > 0 ? `At ${ri.retireAge} you can count on ${money(ri.floorMonthly)} a month from ${sources}. You want ${money(ri.wantedMonthly)}. The gap is ${money(ri.gapMonthly)} a month, for life.` : `At ${ri.retireAge} you can count on ${money(ri.floorMonthly)} a month from ${sources}. You want ${money(ri.wantedMonthly)}. Your pensions cover it.`],
    unknowns: []
  };
  const explorer = ri.stress.find((s) => s.vehicleId === "destiny-explorer");
  const longPlan = {
    lumpAvailable: 0,
    monthlyAvailable: ri.floorMonthly + ri.gapMonthly,
    monthsUntilShortfall: null,
    obligationsMet: ["Income for life"],
    obligationsFailed: [],
    sentences: ri.gapMonthly > 0 ? [
      `Saving ${money(ri.destinyMonthly)} a month into Destiny ${ri.routing.mode === "registered" ? "Registered" : "Unregistered"} closes the gap, and a life annuity at retirement pays it for as long as you live.`,
      ...ri.reliefAnnual > 0 ? [`About ${money(ri.reliefAnnual)} a year comes back in tax.`] : [],
      ...explorer ? [explorer.sentence] : []
    ] : ["No extra retirement saving is needed for the income you want."],
    unknowns: []
  };
  const ra = b.get("core:products.rest-assured-ii");
  const pe = b.get("core:products.platinum-edge");
  const f = b.num("core:ff.rates.careBasket");
  const H = b.num("core:ff.careGraph.horizonYears");
  const careTo = b.num("core:ff.careGraph.careToParentAge");
  const grant = b.num("core:ff.offsets.nisFuneralGrant");
  b.use("core:ff.offsets.nisFuneralGrantContributions");
  b.use("core:ff.offsets.probateFreePayment");
  const parentFuneral = facts.parents.map((p) => {
    const pa = parentAge(p, facts.asOfYear);
    const yearsToEnd = Math.max(0, Math.min(H, careTo - pa));
    const costToday = b.num("core:ff.closing.parentFuneralCost");
    const costAtEnd = costToday * Math.pow(1 + f, yearsToEnd);
    const g = p.nisContributions === "yes" ? grant : 0;
    const flag = p.nisContributions === "unknown" ? `${parentLabel(p)}'s NIS record is not known, so no funeral grant is counted. Ask whether they paid 25 or more contributions.` : null;
    const eligible = restAssuredEligible(b, pa);
    if (!eligible) b.rule(`${parentLabel(p)}: rated age ${restAssuredRatedAge(pa)} is past Rest Assured II's issue ages, so there is no funeral cover item`);
    const sex = parentSex(p);
    const insured = { age: pa, sex, who: parentLabel(p) };
    const cover = eligible ? Math.min(ra.cover.max ?? Infinity, Math.max(ra.cover.min, costAtEnd - g)) : 0;
    const est = eligible ? restAssuredPremium(b, insured, cover) : 0;
    return {
      personId: p.personId,
      who: parentLabel(p),
      age: pa,
      ratedAge: restAssuredRatedAge(pa),
      costToday,
      costAtEnd,
      yearsToEnd,
      nisGrant: g,
      nisGrantFlag: flag,
      cover,
      product: eligible ? "rest-assured-ii" : null,
      premium: eligible ? roughBand(b, est, ra.minPremiumMonthly) : null,
      minimumMonthly: eligible ? restAssuredPremium(b, insured, ra.cover.min) : 0,
      fullMonthly: est,
      sexFlag: eligible && sex === null ? `${parentLabel(p)}: the relationship does not tell us their sex, so Rest Assured II is priced on the male rate (the higher one).` : null,
      disclosure: eligible ? ra.disclosure : null,
      alternative: { product: "platinum-edge", deposit: { min: pe.singleDeposit.min, max: pe.singleDeposit.max }, disclosure: pe.disclosure },
      sentence: `${parentLabel(p)}'s funeral is covered. The funeral home can be paid directly, without waiting on probate.`,
      ownership: "You own the policy on your parent's life, pay for it, and receive the money."
    };
  });
  const dependants = facts.partner !== null || facts.children.length > 0 || careGraph2.goals.some((g) => g.kind === "care" && g.presentValue > 0);
  if (!dependants) b.rule("no partner, no children, no parent care paid: no ruin-level life cover");
  const lifeProduct = canIssue(b, "term", age) ? "term" : "whole-life";
  if (dependants && lifeProduct === "whole-life") b.rule(`term life cannot be issued at rated age ${ratedAge(age)}, so the ruin-level life plan is whole life`);
  const lifeSpec = lifeProduct === "term" ? term : whole;
  const lifeRate = lifeProduct === "term" ? TR : WL;
  const lifePremium = (cover) => cover > 0 ? Math.max(lifeSpec.minPremiumMonthly ?? 0, cover * lifeRate / 1e3) : 0;
  const essPrem = lifePremium(packages.essential);
  const recPrem = lifePremium(packages.recommended);
  const cardPrem = (k) => lifePremium(packages[k]);
  const issuable = (id2, insuredAge, what) => {
    const ok = canIssue(b, id2, insuredAge);
    if (!ok) b.rule(`${what}: ${id2} cannot be issued at rated age ${ratedAge(insuredAge)}, so there is no ladder item`);
    return ok;
  };
  const ciRate = ratePer1000(b, "ci", age);
  const ciMin = Math.max(lsg.minPremiumMonthly ?? 0, lsg.cover.min * ciRate / 1e3);
  const ciFull = Math.max(ciMin, ciCover * ciRate / 1e3);
  const build = b.num("core:ff.budget.bufferBuildMonths");
  const oneMonth = Math.max(0, needs * b.num("core:ff.budget.bufferPreconditionMonths") - facts.budget.savings) / build;
  const threeMonths = Math.max(0, needs * b.num("core:ff.budget.bufferTargetMonths") - facts.budget.savings) / build;
  const near = b.num("core:ff.closing.nearDatedYears");
  const futureGoals = careGraph2.goals.filter((g) => !g.current);
  const sum = (xs) => xs.reduce((a, x) => a + x, 0);
  const token = ri.routing.mode === "registered" && ri.gapMonthly > 0 ? b.get("core:products.destiny").minPremiumMonthly ?? 0 : 0;
  const profile = profileFor(facts);
  const funerals = parentFuneral.filter((x) => x.product).sort((x, y) => y.age - x.age);
  const ciOn = ciNeed > 0 && issuable("life-span-gold", age, "Critical illness cover");
  const di = profile !== "later" && issuable("cashbuilder-ii", age, "Disability income") ? minimumFor(b, { product: "cashbuilder-ii", basis: "cashbuilder", insuredAge: age }) : 0;
  const own = { age, sex: facts.client.sex, who: "You" };
  const ownCover = Math.min(ra.cover.max ?? Infinity, Math.max(ra.cover.min, w.funeral));
  const ownFinal = profile === "later" && issuable("rest-assured-ii", age, "Your own final expense") ? { min: restAssuredPremium(b, own, ra.cover.min), full: restAssuredPremium(b, own, ownCover) } : null;
  const loanCover = goals.plans.flatMap((p) => {
    const loan = p.home?.loan ?? p.car?.loan ?? 0;
    if (loan <= 0) return [];
    const id2 = canIssue(b, "term", age + p.years) ? "term" : "whole-life";
    const spec = id2 === "term" ? term : whole;
    const cover = Math.min(spec.cover.max ?? Infinity, Math.max(spec.cover.min, loan));
    const prem = Math.max(spec.minPremiumMonthly ?? 0, premiumFor(b, id2, cover, ratedAge(age)));
    return [{ key: `loan-cover:${p.goalId}`, tier: p.years <= near ? 2 : 3, label: `Life cover for the ${p.kind === "home" ? "home" : "car"} loan`, min: prem, full: prem, insurance: true, product: id2 }];
  });
  const specsFor = (chosen) => [
    { key: "buffer-one-month", tier: 0, label: "One month of buffer cash", min: oneMonth, full: oneMonth, insurance: false },
    ...dependants ? [{ key: "life-ruin", tier: 1, label: "Life cover to the ruin level", min: essPrem, full: Math.max(essPrem, cardPrem(chosen)), insurance: true, product: lifeProduct }] : [],
    { key: "critical-illness", tier: 1, label: "Critical illness cover", min: ciOn ? ciMin : 0, full: ciOn ? ciFull : 0, insurance: true, product: "life-span-gold" },
    ...funerals.map((x) => ({
      key: `parent-funeral:${x.personId}`,
      tier: 1,
      label: `${x.who}'s funeral cover`,
      min: x.minimumMonthly,
      full: Math.max(x.minimumMonthly, x.fullMonthly),
      insurance: true,
      product: "rest-assured-ii"
    })),
    // The engine sizes no disability income need yet, so the item is funded at its minimum (F-17).
    { key: "disability-income", tier: 1, label: "Disability income (Cashbuilder II with the Disability Income Rider)", min: di, full: di, insurance: true, product: "cashbuilder-ii" },
    ...ownFinal ? [{ key: "own-final-expense", tier: 1, label: "Your own final expense (Rest Assured II)", min: ownFinal.min, full: ownFinal.full, insurance: true, product: "rest-assured-ii" }] : [],
    ...token > 0 ? [{ key: "token-annuity", tier: 1.5, label: "Token registered annuity (unused tax relief)", min: token, full: token, insurance: false }] : [],
    { key: "buffer-three-months", tier: 2, label: "Buffer out to three months", min: 0, full: Math.max(0, threeMonths - oneMonth), insurance: false },
    { key: "expensive-debt", tier: 2, label: "Expensive debt, extra", min: 0, full: debts.summary.expensiveDebt > 0 ? debts.extraMonthly : 0, insurance: false },
    { key: "near-dated", tier: 2, label: "Anything due inside three years", min: 0, full: sum(futureGoals.filter((g) => g.start <= near).map((g) => g.monthlySaving)) + sum(goals.plans.filter((p) => p.years <= near).map((p) => p.monthlySaving)), insurance: false },
    ...loanCover,
    ...dependants ? [{ key: "life-beyond-ruin", tier: 3, label: "Life cover beyond the ruin level", min: 0, full: Math.max(0, recPrem - cardPrem(chosen)), insurance: true, addsTo: "life-ruin", product: lifeProduct }] : [],
    { key: "retirement", tier: 3, label: "Retirement", min: 0, full: Math.max(0, ri.saveMonthly - token), insurance: false },
    { key: "education", tier: 3, label: "Education", min: 0, full: sum(futureGoals.filter((g) => g.kind === "edu" && g.start > near).map((g) => g.monthlySaving)), insurance: false },
    { key: "milestones", tier: 3, label: "Milestones and your own goals", min: 0, full: sum(futureGoals.filter((g) => g.kind === "milestone" && g.start > near).map((g) => g.monthlySaving)) + sum(goals.plans.filter((p) => p.years > near).map((p) => p.monthlySaving)), insurance: false }
  ];
  const order = options.ladderOrder;
  const runLadder = (chosen, capMonthly) => {
    const s = specsFor(chosen).filter((x) => x.full > 0 || x.min > 0);
    return { specs: s, ladder: allocateLadder(budget, s, order ? completeOrder(s, order) : defaultOrder(s), capMonthly) };
  };
  const { specs: ladderSpecs, ladder } = runLadder(pkg, cap);
  const lifeCoverFunded = (lad, chosen) => {
    const ruin = lad.items.find((i) => i.key === "life-ruin");
    const beyond = lad.items.find((i) => i.key === "life-beyond-ruin");
    if (budget.stage === 0 || !ruin || ruin.allocated <= 0) return 0;
    const target = Math.max(packages.essential, packages[chosen]);
    const toCard = ruin.allocated >= ruin.full - 1e-9 ? target : Math.max(packages.essential, Math.min(target, lifeRate > 0 ? ruin.allocated / lifeRate * 1e3 : 0));
    const share = beyond && beyond.full > 0 ? beyond.allocated / beyond.full : 0;
    return toCard + share * Math.max(0, packages.recommended - target);
  };
  const buildBasket = (lad) => {
    const ruin = lad.items.find((i) => i.key === "life-ruin");
    const beyond = lad.items.find((i) => i.key === "life-beyond-ruin");
    const prem = (ruin?.allocated ?? 0) + (beyond?.allocated ?? 0);
    if (budget.stage === 0 || !ruin || prem <= 0) {
      return { cover: 0, items: [], totalMonthly: 0, totalHighMonthly: 0, partial: !!ruin && wanted > 0, permanentDropped: false, notCovered: notCoveredAt(0), notYet: ruin?.notYet ?? false };
    }
    const cover = lifeCoverFunded(lad, pkg);
    const band = roughBand(b, cover * lifeRate / 1e3, lifeSpec.minPremiumMonthly);
    const items = [{ product: lifeProduct, cover, premiumMonthly: prem, band }];
    return { cover, items, totalMonthly: prem, totalHighMonthly: band.high, partial: cover < wanted - 0.5, permanentDropped: false, notCovered: notCoveredAt(cover), notYet: false };
  };
  const basket = buildBasket(ladder);
  b.rule("the life basket is the ladder's life allocation; when the need costs more than the cap, partial cover is shown and what is not covered is named");
  const cards = ["essential", "recommended", "full"].map((k) => {
    const cover = packages[k];
    const premiumMonthly = cardPrem(k);
    const L5 = layerAt(5, cover);
    const ruin = runLadder(k, cap).ladder.items.find((i) => i.key === "life-ruin");
    const lifeMonthly = ruin?.allocated ?? 0;
    const base = {
      package: k,
      cover,
      premiumMonthly,
      lifeMonthly,
      covers: L5.lines.filter((l) => l.met).map((l) => l.label),
      doesNotCover: L5.lines.filter((l) => !l.met).map((l) => l.label)
    };
    if (!ruin || budget.stage === 0) {
      const statusText = budget.stage === 0 ? "No life plan yet: costs are bigger than income." : "No life plan: no one depends on you, so no life cover is planned.";
      return { ...base, status: "no-life-plan", needsMonthly: 0, statusText };
    }
    const short = Math.max(0, ruin.full - lifeMonthly);
    if (short <= 1e-9) return { ...base, status: "in-plan", needsMonthly: 0, statusText: "In your plan" };
    return { ...base, status: "needs-more", needsMonthly: premiumMonthly - lifeMonthly, statusText: `Needs ${money(premiumMonthly - lifeMonthly)} more a month` };
  });
  b.rule("each package card's status is a ladder run with that card chosen, at the insurance budget in use");
  const shares = b.get("core:ff.closing.bandShares");
  const bands = ["floor", "recommended", "ceiling"].map((k) => {
    const monthly = budget.ceilingMonthly * shares[k];
    const cover = monthly > 0 ? lifeCoverFunded(runLadder(pkg, monthly).ladder, pkg) : 0;
    const L5 = layerAt(5, cover);
    return {
      name: k === "floor" ? "Floor" : k === "recommended" ? "Recommended" : "Ceiling",
      monthly,
      cover,
      covers: L5.lines.filter((l) => l.met).map((l) => l.label),
      doesNotCover: L5.lines.filter((l) => !l.met).map((l) => l.label)
    };
  });
  const layers = [1, 2, 3, 4, 5].map((L) => layerAt(L, basket.cover));
  const today = layers[3].outcome;
  const plan = layers[4].outcome;
  const legLine = layers[4].lines.find((l) => l.key === "legacy");
  const legacy = {
    today: {
      lumpAvailable: 0,
      monthlyAvailable: 0,
      monthsUntilShortfall: null,
      obligationsMet: [],
      obligationsFailed: w.legacy > 0 ? ["What you leave behind"] : [],
      sentences: [w.legacy > 0 ? "Money in your own name is frozen until probate, which in T&T can take years." : "No legacy goal was set."],
      unknowns: []
    },
    plan: {
      lumpAvailable: legLine?.paid ?? 0,
      monthlyAvailable: 0,
      monthsUntilShortfall: null,
      obligationsMet: legLine?.met ? ["What you leave behind"] : [],
      obligationsFailed: legLine && !legLine.met ? ["What you leave behind"] : [],
      sentences: [w.legacy <= 0 ? "No legacy goal was set." : legLine?.met ? `${money(w.legacy)} goes straight to the person you name. It does not form part of your estate, and creditors cannot reach it (Insurance Act s.187).` : "The plan does not yet reach what you want to leave behind."],
      unknowns: []
    }
  };
  const gaps = [
    { gapKey: "death", label: "If you die too soon" },
    { gapKey: "critical-illness", label: "If you get seriously ill" },
    { gapKey: "retirement", label: "If you live long" },
    ...w.legacy > 0 ? [{ gapKey: "legacy", label: "What you leave behind" }] : [],
    ...facts.parents.map((p) => ({ gapKey: `parent-funeral:${p.personId}`, label: `${parentLabel(p)}'s funeral` })),
    ...facts.client.hasHealthCover !== "yes" ? [{ gapKey: "health-cover", label: "Health cover" }] : []
  ];
  const lev = (k) => b.get(`core:annuityLevers.${k}`);
  return {
    assumptionSetId: ASSUMPTION_SET_ID,
    stage: budget.stage,
    underwater: budget.stage === 0,
    packages,
    cards,
    chosen: { package: pkg, cover: basket.cover, basket },
    layers,
    scenarios: { death: { today, plan }, criticalIllness, liveLong: { today: longToday, plan: longPlan }, legacy },
    bands,
    parentFuneral,
    ladder,
    ladderSpecs,
    gaps,
    crossCheck: { stack: deathNeed.tiers.recommended, tatilStandard: deathNeed.methods.find((m) => m.key === "tatil").value },
    annuity: {
      mode: ri.routing.mode,
      controls: {
        destinyGuaranteedYears: lev("destinyGuaranteedYears"),
        destinySpousalShares: lev("destinySpousalShares"),
        spiaSpousalShares: lev("spiaSpousalShares"),
        destinyLumpAtVesting: lev("destinyLumpAtVesting")
      },
      notes: [b.get("core:annuityLevers.taxExemptNote"), b.get("core:products.spia").disclosure, ...ri.routing.reasons]
    },
    provenance: b.build()
  };
}

// src/start-early.ts
function futureValueMonthly(amt, years, real) {
  const m = Math.pow(1 + real, 1 / 12) - 1;
  const n = Math.max(0, years) * 12;
  return n <= 0 ? 0 : Math.abs(m) < 1e-9 ? amt * n : amt * (Math.pow(1 + m, n) - 1) / m;
}
function computeStartEarly(input) {
  const b = new ProvenanceBuilder();
  const infl = b.num("core:ff.rates.inflation");
  const rets = b.get("core:ff.startEarly.illustrativeReturns");
  const ret = rets[input.returnKind];
  const real = (1 + ret.pct / 100) / (1 + infl) - 1;
  const to = b.num("core:ff.startEarly.targetAge");
  const yrs = Math.max(0, to - input.age);
  const lateYrs = Math.max(0, yrs - input.delayYears);
  const now = futureValueMonthly(input.monthly, yrs, real);
  const late = futureValueMonthly(input.monthly, lateYrs, real);
  const paid = input.monthly * 12 * yrs;
  const step = Math.max(1, Math.ceil(yrs / 18));
  const ages = [];
  for (let a = input.age; a <= to; a += step) ages.push(a);
  if (ages[ages.length - 1] !== to && yrs > 0) ages.push(to);
  const destinyMin = b.get("core:products.destiny").minPremiumMonthly;
  b.rule("illustration only: the return is a kind of account, not a product figure");
  return {
    toAge: to,
    years: yrs,
    realReturn: real,
    returnLabel: ret.label,
    returnPct: ret.pct,
    valueStartNow: now,
    valueStartLater: late,
    costOfWaiting: now - late,
    paidIn: paid,
    growth: Math.max(0, now - paid),
    incomeForLifeMonthly: now * b.num("core:ff.startEarly.drawdownRate") / 12,
    losesToInflation: real <= 0,
    belowDestinyMinimum: input.monthly < destinyMin,
    byAge: ages.map((a) => ({
      age: a,
      startNow: futureValueMonthly(input.monthly, a - input.age, real),
      startLater: futureValueMonthly(input.monthly, a - input.age - input.delayYears, real)
    })),
    provenance: b.build()
  };
}

// src/loved-ones.ts
function eligibleAt(spec, age) {
  return (spec.issueAge.min === null || age >= spec.issueAge.min) && (spec.issueAge.max === null || age <= spec.issueAge.max);
}
function candidates(b, lv, o) {
  const out = [];
  const gold = b.get("core:products.goldspoon");
  const ra = b.get("core:products.rest-assured-ii");
  const retireAt = b.num("core:ff.lovedOnes.retireAtAge");
  if (o.relation === "child") {
    const yrs = Math.max(1, b.num("core:ff.lovedOnes.childSavingToAge") - o.age);
    if (lv.aims.save) {
      out.push(eligibleAt(gold, o.age) ? { name: "Goldspoon (child savings and life plan)", product: "goldspoon", why: `Savings for their future with life cover on the child. For ages ${gold.issueAge.min} to ${gold.issueAge.max}; cover from $${gold.cover.min.toLocaleString("en-US")} to $${gold.cover.max.toLocaleString("en-US")}.`, years: yrs } : { name: "Education endowment", product: "endowment", why: "Saves until they turn 18, then pays out for school, a first car or a home deposit. Life cover is built in.", years: yrs });
    }
    if (lv.aims.life) out.push({ name: "Children's whole life", product: "whole-life", why: "Cover for life at a child's price. They take it over as an adult, and it builds cash value.", years: 0 });
    if (lv.aims.retire) out.push({ name: "Retirement annuity (Destiny)", product: "destiny", why: "Started in childhood, even a small amount has decades to grow.", years: retireAt - o.age });
  } else if (o.relation === "adult") {
    if (lv.aims.save) out.push({ name: "Endowment plan", product: "endowment", why: "Saving to a set date, such as a house deposit, with life cover built in.", years: b.num("core:ff.lovedOnes.adultEndowmentYears") });
    if (lv.aims.life) out.push({ name: "Whole life", product: "whole-life", why: "Lifelong cover, locked in at today's age and health. They must agree to be insured.", years: 0 });
    if (lv.aims.retire) out.push({ name: "Retirement annuity (Destiny, unregistered)", product: "destiny", why: "A head start on their retirement that you fund now.", years: Math.max(b.num("core:ff.lovedOnes.minimumAnnuityYears"), retireAt - o.age) });
  } else {
    if (lv.aims.funeral || lv.aims.life) {
      out.push(restAssuredEligible(b, o.age) ? { name: "Funeral cover (Rest Assured II)", product: "rest-assured-ii", why: `No medical questions, up to age ${ra.issueAge.max} at the start. Pays the funeral home directly, with no probate wait. Full cover from year three; accidents from day one.`, years: 0 } : { name: "Savings for the funeral", product: null, why: `Most funeral plans start only up to age ${ra.issueAge.max}. A savings fund for the funeral may be the better route.`, years: 0 });
    }
    if (lv.aims.save) out.push({ name: "Savings for their care", product: null, why: "A fund set aside for care costs, kept in your name.", years: b.num("core:ff.lovedOnes.elderCareFundYears") });
  }
  return out;
}
function minimumOf(b, c, o) {
  if (c.product === null) return 0;
  const spec = b.get(`core:products.${c.product}`);
  if (c.product === "rest-assured-ii") return restAssuredPremium(b, { age: o.age, sex: null, who: o.firstName?.trim() || "Your parent or elder" }, spec.cover.min);
  return spec.minPremiumMonthly ?? 0;
}
function computeLovedOnes(lv) {
  const b = new ProvenanceBuilder();
  const growth = b.num("core:ff.lovedOnes.illustrativeGrowth");
  const per = lv.ones.map((o) => candidates(b, lv, o));
  const all = [];
  per.forEach((cs, oi) => cs.forEach((c, pi) => all.push({ oi, pi, min: minimumOf(b, c, lv.ones[oi]) })));
  all.sort((a, c) => a.pi - c.pi || a.oi - c.oi);
  const fit = fitToMinimums(all.map((x) => ({ key: x, min: x.min, weight: 1 })), lv.budgetMonthly);
  const slot = /* @__PURE__ */ new Map();
  for (const f of fit.funded) slot.set(`${f.key.oi}-${f.key.pi}`, { monthly: f.monthly, status: "funded", min: f.min });
  for (const n of fit.notYet) slot.set(`${n.key.oi}-${n.key.pi}`, { monthly: 0, status: "not-yet", min: n.needs });
  const endowMin = b.get("core:products.endowment").cover.min;
  const endowShare = b.num("core:ff.premiumRates.endowmentCoverShare");
  const fmt2 = (n) => `$${Math.round(n).toLocaleString("en-US")}`;
  const ones = lv.ones.map((o, oi) => ({
    personId: o.personId,
    title: o.firstName && o.firstName.trim() ? o.firstName : o.relation === "child" ? "Your grandchild" : o.relation === "elder" ? "Your parent or elder" : "Your loved one",
    relation: o.relation,
    plans: per[oi].map((c, pi) => {
      const s = slot.get(`${oi}-${pi}`) ?? { monthly: 0, status: "not-yet", min: 0 };
      const spec = c.product ? b.get(`core:products.${c.product}`) : null;
      const needE = c.product === "endowment" && c.years > 0 ? endowMin / endowShare / (12 * c.years) : 0;
      const warning = s.status === "not-yet" ? `Not yet: this plan needs at least ${fmt2(s.min)} a month. Raise the budget, or start with the plans above.` : needE > s.monthly + 0.5 ? `Tatil's endowment starts at ${fmt2(endowMin)} of cover. Over ${c.years} years that needs about ${fmt2(needE)} a month.` : null;
      return {
        name: c.name,
        product: c.product,
        why: c.why,
        years: c.years,
        status: s.status,
        monthly: s.monthly,
        minimumMonthly: s.min,
        paidIn: s.monthly * 12 * c.years,
        illustrativeValue: c.years > 0 ? futureValueMonthly(s.monthly, c.years, growth) : 0,
        warning,
        disclosure: spec?.disclosure ?? null
      };
    })
  }));
  b.rule("loved-one plans get their minimum first; the rest of the budget is shared equally");
  return {
    buyerNeedsSuccessorOwner: lv.buyerAge >= b.num("core:ff.lovedOnes.successorOwnerFromAge"),
    budgetMonthly: lv.budgetMonthly,
    ones,
    notes: [
      "You own the policy and pay for it. For a child, ownership can pass to them at 18 or 21.",
      "Add a payor benefit: if you die or become disabled, the premiums stop and the plan carries on.",
      "Name a successor owner, so someone takes over the plan if you are no longer here.",
      "An adult must agree to be insured. For a child, a parent or guardian signs.",
      "You can insure someone only if losing them would affect you, as close family usually does. This is called insurable interest."
    ],
    provenance: b.build()
  };
}

// src/business.ts
var WHY = {
  type: "The structure decides who owns the policies and who receives the money.",
  owners: "With more than one owner, a buy-sell agreement protects everyone.",
  sharePct: "Your share is what your family would sell, and the cover needed on your life.",
  value: "It sets how much buy-sell cover the owners need.",
  profitAnnual: "It shows what the business can afford, and what is lost if it stops.",
  keyPersonAnnual: "Key person cover is sized from it.",
  loans: "Lenders often take personal guarantees. Cover stops the debt landing on your family.",
  overheadsMonthly: "These bills keep coming if you are off sick, so they size the cover for time off work.",
  staff: "With 3 or more staff, a group plan is possible and usually cheaper per person."
};
var TYPE_NOTE = {
  sole: "Sole trader: the business is you. Your health is the business's health, and business debts are your personal debts. Cover on you comes first.",
  partnership: "Partnership: the partners share the business and its debts. If one dies, their family inherits their share, so a buy-sell agreement matters.",
  company: "Company: the business is a separate legal person. It can own policies on its key people, pay for them, and receive the money."
};
function computeBusiness(bz) {
  const b = new ProvenanceBuilder();
  const fmt2 = (n) => `$${Math.round(n).toLocaleString("en-US")}`;
  const multi = bz.type !== "sole" && bz.owners >= 2;
  const share = multi ? bz.sharePct / 100 : 1;
  const keyX = b.num("core:ff.business.keyPersonMultiple");
  const keyHigh = b.num("core:ff.business.keyPersonMultipleHigh");
  const months = b.num("core:ff.business.overheadMonths");
  const needs = [];
  if (multi) needs.push({
    tag: "BUY-SELL AGREEMENT",
    title: "If an owner dies",
    amount: bz.value,
    what: `Life cover on each owner, equal to their share: about ${fmt2(bz.value * share)} on you and ${fmt2(bz.value * (1 - share))} across your partners. If an owner dies, the others use it to buy the share from the family at a fair price.`,
    how: "Set it up with a written agreement, and hold the policies in a way that fits it (each owner on the others, or a trust). Kyron specialises in this."
  });
  needs.push({
    tag: "KEY PERSON",
    title: "If the key person is lost",
    amount: bz.keyPersonAnnual * keyX,
    what: `Cover of about ${keyX} times what they bring in (${fmt2(bz.keyPersonAnnual)} a year) gives the business time to recover, hire and retrain. Some businesses use up to ${keyHigh} times.`,
    how: "The business owns the policy, pays for it and receives the money."
  });
  if (bz.loans > 0) needs.push({
    tag: "BUSINESS LOANS",
    title: "So the debt does not pass on",
    amount: bz.loans,
    what: "Clears the business loans if an owner dies, so the bank does not call in personal guarantees or the family home.",
    how: "Decreasing term or credit life, matched to the loan."
  });
  needs.push({
    tag: "OVERHEADS",
    title: "If you cannot work for a while",
    amount: bz.overheadsMonthly * months,
    what: `A year of overheads (${fmt2(bz.overheadsMonthly)} a month), so rent and salaries are paid while you recover.`,
    how: "Critical illness or disability cover on the owner. Kyron confirms what is available."
  });
  if (bz.staff >= b.num("core:ff.business.groupPlanFromStaff")) needs.push({
    tag: "YOUR STAFF",
    title: "Benefits that keep good people",
    amount: null,
    what: "Group life and group health cover help you hire and keep good staff, and cost less per person than individual plans.",
    how: "Kyron can quote a group plan for your team."
  });
  needs.push({
    tag: "YOUR RETIREMENT",
    title: "Paying yourself for later",
    amount: null,
    what: "A company can pay into a corporate annuity for its owners and staff, and claim it as a business expense. The payout is taxed later.",
    how: "The limit depends on income. Check the exact limit with your accountant."
  });
  needs.push({
    tag: "PROPERTY AND LIABILITY",
    title: "The building, stock and claims",
    amount: null,
    what: "Building, contents, stock and public liability cover protect what the business owns and what it could be sued for.",
    how: "Priced in the rater."
  });
  return { multiOwner: multi, yourShare: share, typeNote: TYPE_NOTE[bz.type], needs, whyAsked: WHY, provenance: b.build() };
}

// src/fact-finder.ts
function computeFactFinder(input, options = {}) {
  const facts = validateLifeCaseFacts(input);
  const netPay = computeNetPay(facts);
  const debts = computeDebts(facts.debts.items, facts.debts.extraMonthly);
  const cg = careGraph(careGraphInputFromFacts(facts), netPay.householdNetMonthly);
  const budget = computeHouseholdBudget({ facts, netPay, debts: debts.summary, carePaidMonthly: cg.funding.alreadyPaying });
  const deathNeed = computeDeathNeed({ facts, budget, debts: debts.summary, careGraph: cg });
  const retirement = computeRetirementIncome(facts, netPay);
  const goals = computeGoals(facts, budget);
  const buckets = buildBudgetBuckets(budget, facts, options.savePct, insuranceCap(budget, options.budgetMonthly));
  const healthScore = computeHealthScore({ budget, deathNeed, retirement, savings: facts.budget.savings });
  const closing = computeClosing({ facts, budget, debts, careGraph: cg, deathNeed, retirement, goals }, options);
  const insuranceBudget = computeInsuranceBudget(facts, budget, buckets, closing);
  return {
    assumptionSetId: ASSUMPTION_SET_ID,
    facts,
    debts,
    careGraph: cg,
    budget,
    buckets,
    deathNeed,
    retirement,
    goals,
    insuranceBudget,
    healthScore,
    closing,
    lovedOnes: facts.lovedOnes ? computeLovedOnes(facts.lovedOnes) : null,
    business: facts.business ? computeBusiness(facts.business) : null
  };
}

// src/samples/index.ts
var id = (n) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
var milestones = (vehicleOn, weddingOn) => [
  { key: "vehicle", on: vehicleOn, atAge: 22, amountToday: 6e4 },
  { key: "wedding", on: weddingOn, atAge: 28, amountToday: 6e4 },
  { key: "business", on: false, atAge: 25, amountToday: 5e4 },
  { key: "home", on: false, atAge: 30, amountToday: 1e5 }
];
var COVER_DEFAULT = [
  { policyId: id(257), label: "Group life through work", kind: "life", group: true, amount: null },
  { policyId: id(258), label: "Individual life", kind: "life", group: false, amount: 0 },
  { policyId: id(259), label: "Critical illness", kind: "ci", group: false, amount: 0 }
];
var SAMPLE_FAMILY = deepFreeze2({
  schemaVersion: 1,
  asOfYear: 2026,
  client: { personId: id(1), age: 38, sex: "male", longLived: false, grossMonthly: 17e3, nisPaying: true, selfEmployed: false, hasHealthCover: "unknown" },
  partner: { personId: id(2), age: 36, incomeMonthly: 4e3 },
  children: [
    { personId: id(3), age: 4, route: "local", costLevel: "typical", studyStartAge: 18, milestones: milestones(false, false) },
    { personId: id(4), age: 11, route: "local", costLevel: "typical", studyStartAge: 18, milestones: milestones(true, true) }
  ],
  parents: [
    { personId: id(5), relationship: "mother", birthYear: 1960, careTier: 1, careFromAge: 66, receivesSCP: true, nisContributions: "yes" },
    { personId: id(6), relationship: "father", birthYear: 1955, careTier: 2, careFromAge: 71, receivesSCP: false, nisContributions: "unknown" }
  ],
  budget: {
    costs: [
      { label: "Mortgage payment", monthly: 3e3 },
      { label: "Groceries", monthly: 2e3 },
      { label: "Utilities", monthly: 600 },
      { label: "Transport", monthly: 1100 },
      { label: "Phone and internet", monthly: 400 },
      { label: "School and childcare", monthly: 800 },
      { label: "Insurance premiums", monthly: 300 }
    ],
    irregularAnnual: 18e3,
    housing: "mortgage",
    housingPaymentMonthly: 3e3,
    mortgage: { balance: 42e4, yearsLeft: 18, clearOnDeath: true },
    savings: 2e4
  },
  debts: {
    items: [
      { label: "Credit card", balance: 18e3, ratePct: 24, minimumMonthly: 540 },
      { label: "Personal loan", balance: 45e3, ratePct: 14, minimumMonthly: 900 }
    ],
    extraMonthly: 600
  },
  goals: [
    { goalId: id(513), kind: "home", on: false, price: 9e5, years: 5, saved: 0, route: "mortgage" },
    { goalId: id(514), kind: "vehicle", on: false, price: 18e4, years: 2, saved: 0, route: "loan", newVehicle: true, depositPct: 0, termYears: 8 },
    { goalId: id(515), kind: "study", on: false, price: 12e4, years: 3, saved: 0, route: "save" },
    { goalId: id(516), kind: "business", on: false, price: 1e5, years: 3, saved: 0, route: "save" }
  ],
  existingCover: COVER_DEFAULT,
  wishes: { funeral: 5e4, finalMedical: 0, legacy: 15e4, retireAge: 65, retireIncomeMonthly: 8e3 },
  workPension: { kind: "none" }
});
var SAMPLE_YOUNG_SINGLE = deepFreeze2({
  schemaVersion: 1,
  asOfYear: 2026,
  client: { personId: id(17), age: 24, sex: "female", longLived: false, grossMonthly: 8e3, nisPaying: true, selfEmployed: false, hasHealthCover: "unknown" },
  partner: null,
  children: [],
  parents: [],
  budget: {
    costs: [
      { label: "Rent", monthly: 2500 },
      { label: "Groceries", monthly: 900 },
      { label: "Utilities", monthly: 300 },
      { label: "Transport", monthly: 800 },
      { label: "Phone and internet", monthly: 300 },
      { label: "School and childcare", monthly: 0 },
      { label: "Insurance premiums", monthly: 0 }
    ],
    irregularAnnual: 6e3,
    housing: "rent",
    housingPaymentMonthly: 2500,
    mortgage: null,
    savings: 4e3
  },
  debts: { items: [{ label: "Credit card", balance: 3e3, ratePct: 24, minimumMonthly: 150 }], extraMonthly: 200 },
  goals: [
    { goalId: id(529), kind: "home", on: true, price: 85e4, years: 6, saved: 0, route: "mortgage" },
    { goalId: id(530), kind: "vehicle", on: true, price: 15e4, years: 2, saved: 0, route: "loan", newVehicle: true, depositPct: 0, termYears: 8 },
    { goalId: id(531), kind: "study", on: false, price: 12e4, years: 3, saved: 0, route: "save" },
    { goalId: id(532), kind: "business", on: false, price: 1e5, years: 3, saved: 0, route: "save" }
  ],
  existingCover: COVER_DEFAULT,
  wishes: { funeral: 5e4, finalMedical: 0, legacy: 0, retireAge: 65, retireIncomeMonthly: 6e3 },
  workPension: { kind: "none" }
});
var CARE_GRAPH_FIXTURE_NET_MONTHLY = 14e3;
function withChildBInUK(facts) {
  return { ...facts, children: facts.children.map((c, i) => i === 1 ? { ...c, route: "uk" } : c) };
}
var SAMPLE_LOVED_ONE = deepFreeze2({
  buyerRole: "grandparent",
  buyerAge: 62,
  budgetMonthly: 300,
  aims: { save: true, life: true, funeral: false, retire: false },
  ones: [{ personId: id(49), age: 3, relation: "child" }]
});
var SAMPLE_BUSINESS = deepFreeze2({
  type: "company",
  owners: 2,
  sharePct: 50,
  value: 15e5,
  profitAnnual: 6e5,
  keyPersonAnnual: 24e4,
  loans: 3e5,
  overheadsMonthly: 4e4,
  staff: 6
});
export {
  ADVENTURER_WORDING,
  ASSUMPTION_SET_ID,
  CARE_GRAPH_FIXTURE_NET_MONTHLY,
  CORE_TABLES,
  CareGraphInputError,
  ClosingInputError,
  GROUP_LIFE_REDUCTION_AGE,
  GROUP_LIFE_REDUCTION_FACTOR,
  GROUP_LIFE_TERMINATION_AGE,
  LAYER_NAMES,
  LifeCaseFactsError,
  ProvenanceBuilder,
  REST_ASSURED_GRADING,
  VEHICLES as RETURN_VEHICLES,
  RegisteredRoutingError,
  SAMPLE_BUSINESS,
  SAMPLE_FAMILY,
  SAMPLE_LOVED_ONE,
  SAMPLE_YOUNG_SINGLE,
  PRODUCTS as TATIL_PRODUCTS,
  RIDERS as TATIL_RIDERS,
  UNKNOWN_SENTENCE,
  ageAt,
  allocateLadder,
  amortisedPayment,
  applyLever,
  assertNoHealthKeys,
  assertRidersAllowed,
  belowAllowance,
  buildBudgetBuckets,
  buildScopeStatement,
  buildSnapshot,
  canIssue,
  carLoan,
  careGraph,
  careGraphInputFromFacts,
  childLabel,
  completeOrder,
  computeBusiness,
  computeClosing,
  computeDeathNeed,
  computeDeathNeeds,
  computeDebts,
  computeFactFinder,
  computeGap,
  computeGoals,
  computeHealthScore,
  computeHouseholdBudget,
  computeInsuranceBudget,
  computeLovedOnes,
  computeNetPay,
  computeRetirementIncome,
  computeRetirementNeeds,
  computeStartEarly,
  coreRowPaths,
  coverForPremium,
  coverHeld,
  defaultOrder,
  dependents,
  findHealthKeys,
  fitToMinimums,
  futureValueMonthly,
  inForceCoverAt,
  insuranceCap,
  minimumFor,
  money,
  mortgageBalance,
  nonMortgageDebtBalance,
  obligationDeclineSchedule,
  parentAge,
  parentLabel,
  parentSex,
  policiesByType,
  premiumFor,
  profileFor,
  ratePer1000,
  ratedAge,
  registeredEligible,
  registeredWithdrawalGrossUp,
  requestReorder,
  requireRegistered,
  resolveCoreRow,
  resolveParameter,
  restAssuredCoverFor,
  restAssuredEligible,
  restAssuredPer1000,
  restAssuredPremium,
  restAssuredRatedAge,
  roughBand,
  routeAnnuity,
  scopeRow,
  stressAgainstFloor,
  summariseDebts,
  survivorCashflow,
  totalCashValue,
  totalDebtBalance,
  totalMonthlyPremium,
  universalLifePolicies,
  validateLifeCaseFacts,
  validateScopeRow,
  vehicleFigures,
  withChildBInUK,
  workPension,
  yearsToPayoff,
  yearsUntilLastChildReaches,
  youngestDependentChild
};
