/**
 * Fact-finder assumption set `ff-2026-10-27-ladder1`: every number the fact-finder modules
 * compute with that is not a Tatil product rule (those are in tatil-products-2026-10.ts)
 * and not already in the root `parameters/tt-parameters.json` (read from there).
 *
 * Read only through `ProvenanceBuilder.use("core:ff.<path>")`.
 */
import { row, deepFreeze } from "./row.ts";

const D = "2026-10-27";
const PROTO = "Fact-Finder Prototype v17 (docs/prototype/fact-finder-prototype-v17.html), 27 Oct 2026";
const CG = "Care graph brief §4–§5 (signed 27 Oct 2026)";
const CLOSE = "Closing engine brief and addendum §11–15 (signed 27 Oct 2026)";
const S3 = "Section 3 spec (signed by Kyron 28 Oct 2026)";
const S3D = "2026-10-28";
const PENNY = "The Penny Hoarder budget percentages (take-home basis)";
const PALIG = "PALIG personal net worth calculator 2012 benchmarks";

/** A common guide: a share of household take-home (Section 3 §6.1). `min` null: "at most". */
export interface GuideRange {
  readonly min: number | null;
  readonly max: number;
}

/** How often an amount comes: pay frequencies and budget-line frequencies (Section 3 §0 rows 3.2, 3.3). */
export type Frequency = "weekly" | "fortnightly" | "semimonthly" | "monthly" | "yearly";

// Was "ff-2026-10-27" until the NIS 70% re-baseline (27 Oct 2026, docs/audit/RUN-2026-10-27-fix-nis70.md), then
// "ff-2026-10-27-nis70" until the one-allocator fix (27 Oct 2026, docs/audit/RUN-2026-10-27-fix-one-allocator.md), then
// "ff-2026-10-27-ladder1" until fix run 3 (27 Oct 2026, docs/audit/RUN-2026-10-27-fix-ladder-advice.md), then
// "ff-2026-10-27-ladder2" until fix run 4, the package cards (28 Oct 2026, docs/audit/RUN-2026-10-28-f18-package-cards.md), then
// "ff-2026-10-28-cards1" until Section 3 Build A (28 Oct 2026, docs/audit/RUN-2026-10-28-section3-a.md), then
// "ff-2026-10-28-s3" until the Section 3 fix run, the debt payments guide row (28 Oct 2026, docs/audit/RUN-2026-10-28-section3-fix.md).
export const ASSUMPTION_SET_ID = "ff-2026-10-28-s3fix";

export type EducationRoute = "local" | "regional" | "uk" | "canada" | "usa" | "none";
export type CostLevel = "lean" | "typical" | "full";

/** A quoted Rest Assured II rate: monthly premium per $1,000 of cover at a rated age (age next birthday). */
export interface RestAssuredAnchor {
  readonly per1000: number;
  readonly ratedAge: number;
}

export interface RouteSpec {
  readonly label: string;
  readonly years: number;
  readonly lean: number;
  readonly typical: number;
  readonly full: number;
  /** Tuition inflates at the foreign-tuition rate when true, general inflation when false. */
  readonly foreign: boolean;
  /** The child lives at home: add the home-support line while studying. */
  readonly home: boolean;
}

export const FF = deepFreeze({
  assumptionSetId: row(ASSUMPTION_SET_ID, "rule", "Section 1 §1.2: the assumption set is a versioned constant in the engine", D),

  rates: {
    inflation: row(0.03, "assumed", `${CG}: ILO ultimate for T&T, reached 2035`, D),
    careBasket: row(0.055, "assumed", `${CG}: deviation, headline + 2.5 points (food is the main driver)`, D),
    foreignTuition: row(0.04, "assumed", `${CG}: deviation, FX- and host-fee-driven`, D),
    medicalTrend: row(0.07, "assumed", `${CG}: deviation, no ILO equivalent`, D),
    realWageGrowth: row(0.0125, "assumed", `${CG}: ILO base scenario`, D),
    planningReturn: row(0.05, "advisor-set", `${CG} (return on savings 5.0%) and addendum §13 (planning rate, advisor-set). Care graph goldens are pinned at this default.`, D),
    survivorRealReturn: row(0.027, "assumed", `${PROTO}: real return on a survivor's capital`, D),
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
        { upTo: 0.10, verdict: "Comfortable" },
        { upTo: 0.25, verdict: "Tight but real" },
        { upTo: 0.45, verdict: "Something has to give" },
        { upTo: null, verdict: "Not a savings problem" },
      ] as const,
      "rule", "Care graph brief §2.2", D),
    routes: row<Readonly<Record<EducationRoute, RouteSpec>>>(
      {
        local: { label: "Local (UWI/UTT/COSTAATT)", years: 3, lean: 5200, typical: 27900, full: 50700, foreign: false, home: true },
        regional: { label: "Regional (Cave Hill/Mona)", years: 3, lean: 26300, typical: 44700, full: 63000, foreign: false, home: false },
        uk: { label: "United Kingdom", years: 3, lean: 290000, typical: 373300, full: 456700, foreign: true, home: false },
        canada: { label: "Canada", years: 4, lean: 285000, typical: 368800, full: 452500, foreign: true, home: false },
        usa: { label: "United States", years: 4, lean: 365000, typical: 402500, full: 440000, foreign: true, home: false },
        none: { label: "Not funding", years: 0, lean: 0, typical: 0, full: 0, foreign: false, home: false },
      },
      "estimate", `${CG} §5: annual cost in TTD today, lean / typical / full`, D),
    homeSupportMonthly: row(1800, "estimate", `${CG} §5: home support while studying locally, inflated at the care basket rate`, D),
    careTiers: row(
      [
        { tier: 0, label: "No support", monthly: 0 },
        { tier: 1, label: "Light top-up", monthly: 1500 },
        { tier: 2, label: "Help at home", monthly: 4000 },
        { tier: 3, label: "Day care", monthly: 5600 },
        { tier: 4, label: "Full-time", monthly: 12000 },
      ] as const,
      "estimate", `${CG} §5: parent care tiers, TTD a month today. Caregiver cost cross-check: Paylab 2026, $2,772–$7,808 a month (Section 2 risk 4). Labels for tiers 3 and 4 follow Section 3 §1.3 (were "Private residential" and "High-dependency"; amounts unchanged)`, D),
  },

  /** Section 3 §2 and §0 row 3.2: every amount is turned into a monthly figure. */
  frequency: {
    perYear: row<Readonly<Record<Frequency, number>>>(
      { weekly: 52, fortnightly: 26, semimonthly: 24, monthly: 12, yearly: 1 },
      "rule", `${S3} §2.1: weekly ×52/12, fortnightly ×26/12, twice a month ×2, monthly ×1; §0 row 3.2: yearly ÷12`, S3D),
    planPaysPerMonth: row<Readonly<Record<"weekly" | "fortnightly" | "semimonthly" | "monthly", number>>>(
      { weekly: 4, fortnightly: 2, semimonthly: 2, monthly: 1 },
      "rule", `${S3} §2.4: "Plan on 4 pays (or 2). Send the extra pay straight to savings."`, S3D),
  },

  /** Section 3 §5: the lowest insurance budget the tool plans, except at stage 0. */
  insurance: {
    floorMonthly: row(200, "advisor-set", "Kyron, 28 Oct 2026 (Section 3 spec §5.1): the $200 insurance floor", S3D),
  },

  /** Section 3 §6.1: common guides, share of household take-home. Shown as guides, never as a pass or fail. */
  guides: {
    home: row<GuideRange>({ min: 0.25, max: 0.30 }, "advisor-set", `${PENNY} (Section 3 §6.1: Home, incl. mortgage or rent)`, S3D),
    food: row<GuideRange>({ min: 0.10, max: 0.15 }, "advisor-set", `${PENNY} (Section 3 §6.1: Food)`, S3D),
    move: row<GuideRange>({ min: 0.10, max: 0.15 }, "advisor-set", `${PENNY} (Section 3 §6.1: Getting around)`, S3D),
    util: row<GuideRange>({ min: 0.05, max: 0.10 }, "advisor-set", `${PENNY} (Section 3 §6.1: Utilities and bills)`, S3D),
    health: row<GuideRange>({ min: 0.05, max: 0.10 }, "advisor-set", `${PENNY} (Section 3 §6.1: Health and personal care)`, S3D),
    debt: row<GuideRange>({ min: null, max: 0.20 }, "advisor-set", `${PALIG}: "Loans 25%" of gross, restated on take-home (Section 3 §6.1: debt payments, not mortgage, at most 20%)`, S3D),
    insurance: row<GuideRange>({ min: 0.05, max: 0.10 }, "advisor-set", `${PALIG}: life 5%, general 5% (Section 3 §6.1: Insurance, life and general)`, S3D),
    saving: row<GuideRange>({ min: 0.10, max: 0.20 }, "advisor-set", `${PENNY}; ${PALIG}: "Savings + Investment 10%", "Pension 10%" (Section 3 §6.1)`, S3D),
    fun: row<GuideRange>({ min: 0.05, max: 0.10 }, "advisor-set", `${PENNY} (Section 3 §6.1: Fun and lifestyle, 5–10% each)`, S3D),
    giving: row<GuideRange>({ min: 0.05, max: 0.10 }, "advisor-set", `${PENNY} (Section 3 §6.1: Giving, 5–10% each)`, S3D),
    farAboveFactor: row(1.5, "rule", `${S3} §6.2: far above the guide is more than 1.5 times its top`, S3D),
    gapsShown: row(3, "rule", `${S3} §6.2: three lines at most under the graph`, S3D),
  },

  /** Section 3 §6.4, What you own and owe (Decision 11, Kyron, 28 Oct 2026). A common guide, never a pass or fail. */
  netWorth: {
    debtPaymentsGuide: row<GuideRange>({ min: null, max: 0.25 }, "advisor-set", "PALIG net worth calculator benchmark, Loans 25%", S3D,
      { note: "Debt payments, including the mortgage, as a share of pay before deductions (the partner's pay is take-home)" }),
  },

  /** Section 3 §9: the recommended retirement income. Inflation is the assumption set's projected rate (rates block). */
  retirementFigure: {
    replacementRate: row(0.7, "advisor-set", `${S3} §9 rule A: 70% of today's household take-home (advisor-editable)`, S3D),
    childCostsStopAge: row(19, "assumed", `${S3} §9: children's costs stop by retirement once the youngest is 19 (the closing brief §2.0 age)`, S3D),
  },

  offsets: {
    scpMonthly: row(3750, "verified", "Senior Citizens' Pension $3,750 a month from 1 Jan 2027 (Budget Statement 12 Oct 2026; pension audit)", "2027-01-01"),
    nisPlusScpCap: row(5500, "verified", "NIS plus SCP capped at $5,500 a month combined (Trinidad Guardian, 17 Oct 2026; pension audit)", "2026-10-17"),
    nisSurvivorSpouseMonthly: row(600, "verified", "NIBTT survivors' minimum: $600 a month to the spouse (care graph brief §6.1)", D),
    nisSurvivorChildMonthly: row(600, "verified", "NIBTT survivors' minimum: $600 a month per child (care graph brief §6.1)", D),
    nisSurvivorChildToAge: row(19, "verified", "NIBTT survivors' benefit for a child to age 19 (care graph brief §6.1)", D),
    nisFuneralGrant: row(7500, "verified", `${CLOSE} §5.2: NIS funeral grant TT$7,500, held flat`, D),
    nisFuneralGrantContributions: row(25, "verified", `${CLOSE} §5.2: the deceased needs 25 or more contributions`, D),
    probateFreePayment: row(25000, "verified", `${CLOSE} §5.1: Insurance Act s.193, TT$25,000 payable without probate`, D),
  },

  tax: {
    nisEmployeeRate: row(0.054, "verified", "NIBTT contribution rates from 5 Jan 2026: 16.2% of insurable earnings, one third (5.4%) paid by the employee (root nis.contribution_rate)", "2026-01-05"),
    nisDeductibleShare: row(0.7, "verified", `IRD form TD1 2023, line 4(b) "N.I.S (70% of Employees Contribution)": taxable pay deducts 70% of the employee's NIS. Kyron's ruling 27 Oct 2026 (Decision 1 = A) replaced the prototype's 100%; the §2.8 goldens were re-baselined (docs/audit/RUN-2026-10-27-fix-nis70.md).`, D),
    surchargeWeeksPerYear: row(52, "verified", "Health surcharge is a weekly charge (root health_surcharge.rates)", D),
    surchargeExemptFromAge: row(60, "verified", "Root health_surcharge.exemptions: aged 60 and over", D),
    paysTaxAbove: row(0.5, "assumed", `${PROTO}: monthly PAYE above $0.50 counts as paying tax`, D),
  },

  budget: {
    stagePercents: row(
      [
        { stage: 0, ofNet: 0, ofSurplus: 0 },
        { stage: 1, ofNet: 0.05, ofSurplus: 0.2 },
        { stage: 2, ofNet: 0.08, ofSurplus: 0.25 },
        { stage: 3, ofNet: 0.10, ofSurplus: 0.30 },
        { stage: 4, ofNet: 0.12, ofSurplus: 0.35 },
      ] as const,
      "rule", `${PROTO}: triage stage and safe insurance ceiling = min(share of net, share of surplus)`, D),
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
    savingsDefaultShareOfNet: row(0.10, "assumed", `${PROTO}: savings plans default to 10% of take-home`, D),
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
        { toAge: null, times: 5 },
      ] as const,
      "assumed", `${PROTO}: underwriting ceiling, times annual gross by age. No method recommends more.`, D),
    metTolerance: row(1, "assumed", `${PROTO}: an obligation within $1 of funded is met`, D),
    tatilEducationPerChild: row(150000, "assumed", `${PROTO}: Tatil standard formula, education per child (cross-check only)`, D),
    crossCheckMethods: row(
      {
        incomeShareOfGross: 0.7, retentionRate: 0.08, spendDownRealRate: 0.027,
        yearsWithChildren: 10, yearsWithoutChildren: 5, atticTimes: 7,
        ageMultiples: [{ toAge: 40, times: 30 }, { toAge: 50, times: 20 }, { toAge: 60, times: 15 }, { toAge: 65, times: 10 }, { toAge: null, times: 0 }],
      } as const,
      "assumed", `${PROTO}: the six cross-check methods other fact finds use (shown beside the stack, never used to size cover)`, D),
    tatilIncomeToYoungestAge: row(21, "assumed", `${PROTO}: Tatil standard formula, income to youngest age 21 (cross-check only)`, D),
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
    restAssuredMale: row<RestAssuredAnchor>({ per1000: 8.7627, ratedAge: 72 }, "verified",
      "ApplyOn quote, lead TTRA-9WZE859: Rest Assured II, male, rated age 72 (next birthday), Pay to Age 100, monthly, taxes and stamp duty included: $262.88 on $30,000, $438.14 on $50,000", D),
    restAssuredFemale: row<RestAssuredAnchor>({ per1000: 5.952, ratedAge: 67 }, "verified",
      "ApplyOn quote, lead TTRA-9DWVJ3Y: Rest Assured II, female, rated age 67 (next birthday), Pay to Age 100, monthly, taxes and stamp duty included: $297.60 on $50,000 ($178.56 on $30,000 by proportion)", D),
    restAssuredAgeGrowth: row(1.05, "estimate", `${PROTO}: Rest Assured II rate grows 5% a year of age away from each quoted anchor`, D,
      { caveat: "The Rest Assured II rate at an age other than the two quoted ages (male 72, female 67) uses a 5% a year age factor that is not yet checked against a quote." }),
    cashbuilderCoverShare: row(0.7, "estimate", `${PROTO}: Cashbuilder II buys cover with 70% of its premium at the whole life rate`, D),
    endowmentCoverYears: row(20, "estimate", `${PROTO}: endowment cover is about 20 years of premium`, D),
    endowmentCoverShare: row(0.9, "estimate", PROTO, D),
    bandSpread: row(0.15, "assumed", "Section 2 §2.5: a rough band, estimate ± 15% (run record R14)", D),
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
    stampDutyReliefBelow: row(2000000, "assumed", "Section 2 §2.3: first-time buyer stamp duty relief under $2M. Not checked against the Stamp Duty Act this run.", D),
    loanCoverMinimumMonthly: row(150, "rule", "Kyron 27 Oct 2026 (Section 2 §2.4): life cover on a loan costs at least the $150 minimum", D),
  },

  carLoan: {
    ratePct: row(7.5, "assumed", "Section 2 risk 4: car loan rate 7.5% is an assumption", D),
    defaultTermYears: row(8, "assumed", "Section 2 risk 4: 8–10 year term is an assumption", D),
    maxTermYears: row(10, "assumed", "Section 2 risk 4: 8–10 year term is an assumption", D),
    newMaxFinancing: row(1, "verified", "Republic Bank: up to 100% financing on new cars (Section 2 risk 4)", D),
    usedMinDepositPct: row(20, "assumed", "Section 2 §2.3: used cars 70–80% financing, so a deposit of at least 20%", D),
    depreciationPerYear: row(0.15, "assumed", `${PROTO}: a car loses about 15% of its value a year`, D),
    cushionPayments: row(3, "assumed", `${PROTO}: with no deposit, save three payments first`, D),
  },

  debts: {
    mismatchMonths: row(3, "rule", `${S3} §7.2: the payoff date and the end date the client gave differ by more than 3 months`, S3D),
    maxMonths: row(600, "assumed", `${PROTO}: a payoff that has not finished in 50 years is stalled`, D),
    clearedBelow: row(0.005, "assumed", "Half a cent counts as cleared", D),
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
        { from: 0, label: "Needs work" },
      ] as const,
      "assumed", PROTO, D),
  },

  startEarly: {
    targetAge: row(65, "assumed", `${PROTO}: start-early runs to 65`, D),
    drawdownRate: row(0.03, "assumed", `${PROTO}: income for life, roughly 3% a year of the pot`, D),
    illustrativeReturns: row(
      { bank: { label: "Bank savings", pct: 0.5 }, balanced: { label: "Balanced fund", pct: 5 }, growth: { label: "Growth fund", pct: 7 } } as const,
      "estimate", `${PROTO}: illustrations of a kind of account, not product figures (addendum §13)`, D),
  },

  lovedOnes: {
    childSavingToAge: row(18, "assumed", `${PROTO}: child savings run to age 18`, D),
    adultEndowmentYears: row(15, "assumed", PROTO, D),
    elderCareFundYears: row(5, "assumed", PROTO, D),
    retireAtAge: row(65, "assumed", PROTO, D),
    minimumAnnuityYears: row(5, "assumed", PROTO, D),
    illustrativeGrowth: row(0.03, "assumed", `${PROTO}: "at an assumed 3% a year ... Not promised"`, D),
    successorOwnerFromAge: row(65, "assumed", `${PROTO}: name a successor owner when the buyer is 65 or over`, D),
  },

  business: {
    keyPersonMultiple: row(5, "assumed", `${PROTO}: key person cover about five times what they bring in`, D),
    keyPersonMultipleHigh: row(10, "assumed", `${PROTO}: some businesses use up to ten times`, D),
    overheadMonths: row(12, "assumed", `${PROTO}: a year of overheads`, D),
    groupPlanFromStaff: row(3, "assumed", `${PROTO}: with 3 or more staff a group plan is possible`, D),
  },

  closing: {
    bandShares: row({ floor: 0.5, recommended: 0.75, ceiling: 1 } as const, "rule", "Care graph brief §0.4, closing brief §3: Floor 50 / Recommended 75 / Ceiling 100, anchored at the ceiling", D),
    nearDatedYears: row(3, "rule", `${CLOSE} §11.2: anything due inside three years is tier 2`, D),
    parentFuneralCost: row(50000, "advisor-set", `${CLOSE} §5.2: funeral cost is advisor-set; default seeded from root conventions.funeral_cost_default`, D),
    minimumCoverOnPlan: row(150000, "rule", "Term Life minimum cover (Section 2 §2.4): a proposed life plan is at least $150,000", D),
    registeredWithdrawalTax: row(0.25, "rule", `${CLOSE} §12.2: a registered withdrawal before maturity is taxed at 25% of the amount withdrawn`, D),
    unregisteredMaturityTo: row(85, "rule", `${CLOSE} §12.1: unregistered maturity to 85`, D),
    retirementCapitalRate: row(0.03, "assumed", `${PROTO}: capital needed for a retirement gap, at a 3% draw`, D),
    reliefRate: row(0.25, "assumed", `${PROTO}: relief on approved annuity premiums at the 25% band`, D),
    ciIncomeYears: row(10, "rule", "Care graph brief §9.1 and closing brief §2: CI = 10 x income", D),
    planToAge: row({ male: 85, female: 90, longLivedExtra: 5 } as const, "assumed", `${PROTO}: plan to 85 (men) or 90 (women), five more for a long-lived family, not to the average`, D),
    nisPensionAge: row(65, "verified", "NIS retirement pension age 65 (root nis.retirement_age; pension audit)", D),
  },
});

export type FFTable = typeof FF;
