export type {
  TTD, ISODate, Sex, SmokerStatus, RelationshipKind, Person, Debt, DebtKind,
  Household, HousingStrategy, Policy, PolicyType, PolicyStatus, Provenance, ProvenanceParameter,
  DeathNeedsProfile, RetirementNeedsProfile, Gap,
} from "./types.ts";

export {
  ageAt, yearsToPayoff, totalDebtBalance, mortgageBalance, nonMortgageDebtBalance,
  dependents, youngestDependentChild, yearsUntilLastChildReaches, obligationDeclineSchedule,
} from "./household.ts";

export {
  inForceCoverAt, totalMonthlyPremium, totalCashValue, policiesByType, universalLifePolicies,
  GROUP_LIFE_REDUCTION_AGE, GROUP_LIFE_TERMINATION_AGE, GROUP_LIFE_REDUCTION_FACTOR,
} from "./policy-ledger.ts";

export { ProvenanceBuilder, resolveParameter } from "./provenance.ts";
export { computeDeathNeeds } from "./needs/death.ts";
export { computeRetirementNeeds } from "./needs/retirement.ts";
export { computeGap } from "./gap.ts";

/* ------------------------------------------------------------------ fact-finder engine (Phase 1) */

export { computeFactFinder } from "./fact-finder.ts";
export type { FactFinderResult, FactFinderOptions } from "./fact-finder.ts";

export { validateLifeCaseFacts, assertNoHealthKeys, findHealthKeys, parentAge, parentSex } from "./life-case-facts.ts";
export type {
  LifeCaseFacts, ClientFacts, PartnerFacts, ChildFacts, MilestoneFacts, ParentFacts, BudgetFacts, CostLine,
  DebtFacts, GoalFacts, CoverFacts, WishFacts, WorkPensionFacts, LovedOnesFacts, LovedOneFacts, BusinessFacts,
  CareTier, Tristate, ParentRelationship, MilestoneKey, HousingKind, GoalKind, GoalRoute, LovedOneRelation, BuyerRole,
} from "./life-case-facts.ts";
export { CareGraphInputError, ClosingInputError, LifeCaseFactsError, RegisteredRoutingError } from "./errors.ts";

export { computeNetPay, computeHouseholdBudget, buildBudgetBuckets } from "./household-budget.ts";
export type { NetPay, HouseholdBudget, BudgetBuckets, BudgetInputs, Stage } from "./household-budget.ts";
export { computeDebts, summariseDebts, carLoan, amortisedPayment } from "./debts.ts";
export type { DebtsResult, DebtSummary, DebtPayoff, PayoffRun, CarLoanInput, CarLoanResult } from "./debts.ts";
export { computeGoals } from "./goals.ts";
export type { GoalsResult, GoalPlan, HomePlan } from "./goals.ts";
export { computeInsuranceBudget, profileFor, minimumFor, assertRidersAllowed } from "./insurance-budget.ts";
export type { InsuranceBudgetResult, InsuranceBudgetGroup, FundedPlan, NotYetPlan, Profile, ProtectionLadder } from "./insurance-budget.ts";
export { computeHealthScore } from "./health-score.ts";
export type { HealthScore, ScorePart } from "./health-score.ts";
export { computeStartEarly, futureValueMonthly } from "./start-early.ts";
export type { StartEarlyInput, StartEarlyResult, IllustrativeReturn } from "./start-early.ts";
export { careGraph, careGraphInputFromFacts, applyLever, childLabel, parentLabel } from "./care-graph.ts";
export type { CareGraphInput, CareGraphResult, CareYear, CareGoal, Lever, LeverKind, Verdict } from "./care-graph.ts";
export { computeDeathNeed, survivorCashflow, coverHeld } from "./death-need.ts";
export type { DeathNeedResult, Obligation, SurvivorCashflow, SurvivorYear, CoverHeld, NeedMethod, CoverTier } from "./death-need.ts";
export { computeRetirementIncome } from "./retirement-income.ts";
export type { RetirementIncome } from "./retirement-income.ts";
export { workPension } from "./needs/work-pension.ts";
export type { WorkPension } from "./needs/work-pension.ts";
export {
  routeAnnuity, requireRegistered, registeredEligible, belowAllowance, registeredWithdrawalGrossUp,
  vehicleFigures, stressAgainstFloor, ADVENTURER_WORDING,
} from "./annuity-routing.ts";
export type { AnnuityRouting, AnnuityMode, VehicleFigures, FloorStress, RegisteredClient, RegisteredGoal } from "./annuity-routing.ts";
export { computeClosing, money, LAYER_NAMES, UNKNOWN_SENTENCE } from "./closing.ts";
export type {
  ClosingComparison, ClosingContext, ClosingOptions, ScenarioOutcome, ScenarioPair, DeathLayer, ObligationLine,
  LifeBasket, BasketItem, CloseBand, ParentFuneralCover, Package, RevealLayer,
} from "./closing.ts";
export { allocateLadder, requestReorder, defaultOrder } from "./closing-ladder.ts";
export type { Ladder, LadderItem, LadderItemSpec, LadderTier, ReorderResult } from "./closing-ladder.ts";
export { buildScopeStatement, scopeRow, validateScopeRow, buildSnapshot } from "./scope.ts";
export type { ScopeRow, ScopeState, ScopeLine, ScopeLineState, ScopeGap, ScopeStatement, LifeCaseSnapshot } from "./scope.ts";
export { computeLovedOnes } from "./loved-ones.ts";
export type { LovedOnesResult, LovedOneResult, LovedOnePlan } from "./loved-ones.ts";
export { computeBusiness } from "./business.ts";
export type { BusinessResult, BusinessNeed, BusinessNeedTag } from "./business.ts";
export {
  roughBand, fitToMinimums, ratePer1000, premiumFor, coverForPremium,
  restAssuredPremium, restAssuredPer1000, restAssuredCoverFor, restAssuredRatedAge, restAssuredEligible,
} from "./premiums.ts";
export type { PremiumBand, FitRow, FitResult, RateKind, RestAssuredInsured } from "./premiums.ts";

export { CORE_TABLES, coreRowPaths, resolveCoreRow, ASSUMPTION_SET_ID } from "./parameters/index.ts";
export type { Row, RowStatus } from "./parameters/index.ts";
export { PRODUCTS as TATIL_PRODUCTS, RIDERS as TATIL_RIDERS, VEHICLES as RETURN_VEHICLES, REST_ASSURED_GRADING } from "./parameters/tatil-products-2026-10.ts";
export type { ProductId, ProductSpec, RiderId, RiderSpec, VehicleSpec } from "./parameters/tatil-products-2026-10.ts";
export type { EducationRoute, CostLevel } from "./parameters/fact-finder-2026-10.ts";

export {
  SAMPLE_FAMILY, SAMPLE_YOUNG_SINGLE, SAMPLE_LOVED_ONE, SAMPLE_BUSINESS, CARE_GRAPH_FIXTURE_NET_MONTHLY, withChildBInUK,
} from "./samples/index.ts";
