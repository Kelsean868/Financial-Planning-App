/**
 * The prototype v17 sample cases (its `samples` object: `fam` and `young`) as `LifeCaseFacts`.
 * They are the golden fixtures (Section 2 §2.8, care graph brief §3) and the cases the Phase 2
 * page loads for the smoke walk. Data, not engine code: exempt from the hard-coded-number guard.
 *
 * Parents are by birth year (Section 1): the prototype's mother aged 66 and father aged 71 in
 * 2026 are birth years 1960 and 1955.
 *
 * Section 3 Build A (28 Oct 2026): the samples are schema version 2. The mapping keeps every total of version 1 (the
 * inverted gate: no golden moves): monthly pay; the cost lines spread across the budget groups to the same totals; the
 * once-a-year bills across once-a-year lines to the same yearly total; the father has a $4,000 Family you support line
 * and no growth; the mother has a $0 line and her future level is her current one (Light top-up from 66, which her
 * pension covers). The version 1 originals stay (`*_V1`) for the upgrade test.
 */
import type { LifeCaseFacts, LifeCaseFactsV1, MilestoneFacts, BudgetGroupFacts, BudgetLineFacts, PayFacts } from "../life-case-facts.ts";
import { deepFreeze } from "../parameters/row.ts";

const id = (n: number): string => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;

const milestones = (vehicleOn: boolean, weddingOn: boolean): MilestoneFacts[] => [
  { key: "vehicle", on: vehicleOn, atAge: 22, amountToday: 60000 },
  { key: "wedding", on: weddingOn, atAge: 28, amountToday: 60000 },
  { key: "business", on: false, atAge: 25, amountToday: 50000 },
  { key: "home", on: false, atAge: 30, amountToday: 100000 },
];

const COVER_DEFAULT_V1: LifeCaseFactsV1["existingCover"] = [
  { policyId: id(0x101), label: "Group life through work", kind: "life", group: true, amount: null },
  { policyId: id(0x102), label: "Individual life", kind: "life", group: false, amount: 0 },
  { policyId: id(0x103), label: "Critical illness", kind: "ci", group: false, amount: 0 },
];

const COVER_DEFAULT: LifeCaseFacts["existingCover"] = [
  { policyId: id(0x101), label: "Group life through work", kind: "life", group: true, amount: null, status: "unsure" },
  { policyId: id(0x102), label: "Individual life", kind: "life", group: false, amount: 0, status: "none" },
  { policyId: id(0x103), label: "Critical illness", kind: "ci", group: false, amount: 0, status: "none" },
];

const monthlyPay = (amountPerPay: number): PayFacts => ({ frequency: "monthly", amountPerPay, varies: false, lowestMonthly: null });
const grp = (key: BudgetGroupFacts["key"], lines: BudgetLineFacts[]): BudgetGroupFacts => ({ key, skip: false, total: null, totalFrequency: null, lines });
const mo = (label: string, amount: number, extra: Partial<BudgetLineFacts> = {}): BudgetLineFacts => ({ label, amount, frequency: "monthly", ...extra });
const yr = (label: string, amount: number): BudgetLineFacts => ({ label, amount, frequency: "yearly" });
const NO_OPENER: LifeCaseFacts["opener"] = { worries: [], dreams: [], ownWorries: [], ownDreams: [] };

export const SAMPLE_FAMILY: LifeCaseFacts = deepFreeze<LifeCaseFacts>({
  schemaVersion: 2,
  asOfYear: 2026,
  client: { personId: id(1), age: 38, sex: "male", longLived: false, pay: monthlyPay(17000), nisPaying: true, selfEmployed: false, hasHealthCover: "unknown" },
  partner: { personId: id(2), age: 36, pay: monthlyPay(4000) },
  children: [
    { personId: id(3), age: 4, route: "local", costLevel: "typical", studyStartAge: 18, milestones: milestones(false, false) },
    { personId: id(4), age: 11, route: "local", costLevel: "typical", studyStartAge: 18, milestones: milestones(true, true) },
  ],
  parents: [
    { personId: id(5), relationship: "mother", birthYear: 1960, careTier: 1, careFromAge: 66, growth: true, receivesSCP: true, nisContributions: "yes" },
    { personId: id(6), relationship: "father", birthYear: 1955, careTier: 2, careFromAge: 71, growth: false, receivesSCP: false, nisContributions: "unknown" },
  ],
  budget: {
    // Version 1: Mortgage payment 3,000; Groceries 2,000; Utilities 600; Transport 1,100; Phone and internet 400;
    // School and childcare 800; Insurance premiums 300 (8,200 a month); once-a-year bills 18,000 a year.
    groups: [
      grp("home", [mo("Mortgage", 3000, { stop: "mortgage" })]),
      grp("util", [mo("T&TEC", 600), mo("Home internet and cable", 400)]),
      grp("food", [mo("Groceries and market", 2000)]),
      grp("move", [mo("Fuel", 1100)]),
      grp("kids", [mo("School fees", 800, { stop: "kids" })]),
      grp("family", [mo("Mother", 0, { stop: "care", personId: id(5) }), mo("Father", 4000, { stop: "care", personId: id(6) })]),
      grp("ins", [mo("Other premiums", 300)]),
      grp("yearly", [yr("Christmas", 6000), yr("Back to school", 4000), yr("Motor renewal", 5000), yr("Home repairs", 3000)]),
    ],
    housing: "mortgage",
    mortgage: { balance: 420000, yearsLeft: 18, clearOnDeath: true },
    savings: 0,
    roomPlan: null,
  },
  debts: {
    items: [
      { label: "Credit card", type: "credit-card", lender: null, balance: 18000, ratePct: 24, minimumMonthly: 540, endDate: null, cosigned: false, cosignerName: null },
      { label: "Personal loan", type: "personal", lender: null, balance: 45000, ratePct: 14, minimumMonthly: 900, endDate: null, cosigned: false, cosignerName: null },
    ],
    extraMonthly: 600,
  },
  goals: [
    { goalId: id(0x201), kind: "home", on: false, price: 900000, years: 5, saved: 0, route: "mortgage" },
    { goalId: id(0x202), kind: "vehicle", on: false, price: 180000, years: 2, saved: 0, route: "loan", newVehicle: true, depositPct: 0, termYears: 8 },
    { goalId: id(0x203), kind: "study", on: false, price: 120000, years: 3, saved: 0, route: "save" },
    { goalId: id(0x204), kind: "business", on: false, price: 100000, years: 3, saved: 0, route: "save" },
  ],
  existingCover: COVER_DEFAULT,
  wishes: { funeral: 50000, finalMedical: 0, legacy: 150000, retireAge: 65, retireIncomeMonthly: 8000 },
  workPension: { kind: "none" },
  opener: NO_OPENER,
  // Build C: the version 1 cash ($20,000) is one bank row, so the emergency fund sees the same cash; the rest is what the
  // family owns (none of it is cash, so no golden moves).
  assets: [
    { kind: "bank", value: 20000 },
    { kind: "pension-cash", value: 60000 },
    { kind: "property", value: 950000 },
    { kind: "vehicle", value: 85000 },
    { kind: "furniture", value: 40000 },
  ],
});

export const SAMPLE_YOUNG_SINGLE: LifeCaseFacts = deepFreeze<LifeCaseFacts>({
  schemaVersion: 2,
  asOfYear: 2026,
  client: { personId: id(0x11), age: 24, sex: "female", longLived: false, pay: monthlyPay(8000), nisPaying: true, selfEmployed: false, hasHealthCover: "unknown" },
  partner: null,
  children: [],
  parents: [],
  budget: {
    // Version 1: Rent 2,500; Groceries 900; Utilities 300; Transport 800; Phone and internet 300 (4,800 a month);
    // once-a-year bills 6,000 a year.
    groups: [
      grp("home", [mo("Rent", 2500)]),
      grp("util", [mo("T&TEC", 300), mo("Mobile phone (bMobile / Digicel)", 300)]),
      grp("food", [mo("Groceries and market", 900)]),
      grp("move", [mo("Maxi taxi, taxi, bus or ferry", 800)]),
      grp("yearly", [yr("Christmas", 3000), yr("Carnival season (if not above)", 2000), yr("Medical and dental not covered", 1000)]),
    ],
    housing: "rent",
    mortgage: null,
    savings: 0,
    roomPlan: null,
  },
  debts: { items: [{ label: "Credit card", type: "credit-card", lender: null, balance: 3000, ratePct: 24, minimumMonthly: 150, endDate: null, cosigned: false, cosignerName: null }], extraMonthly: 200 },
  goals: [
    { goalId: id(0x211), kind: "home", on: true, price: 850000, years: 6, saved: 0, route: "mortgage" },
    { goalId: id(0x212), kind: "vehicle", on: true, price: 150000, years: 2, saved: 0, route: "loan", newVehicle: true, depositPct: 0, termYears: 8 },
    { goalId: id(0x213), kind: "study", on: false, price: 120000, years: 3, saved: 0, route: "save" },
    { goalId: id(0x214), kind: "business", on: false, price: 100000, years: 3, saved: 0, route: "save" },
  ],
  existingCover: COVER_DEFAULT,
  wishes: { funeral: 50000, finalMedical: 0, legacy: 0, retireAge: 65, retireIncomeMonthly: 6000 },
  workPension: { kind: "none" },
  opener: NO_OPENER,
  // Build C: the version 1 cash ($4,000) is one bank row; she also owns a small vehicle and some furniture.
  assets: [
    { kind: "bank", value: 4000 },
    { kind: "vehicle", value: 35000 },
    { kind: "furniture", value: 8000 },
  ],
});

/**
 * Section 3 smoke-walk case 2 (Build B): a weekly-paid single who rents, with "My pay changes" on and two groups skipped
 * (Fun and lifestyle, Pets and other). His recommended insurance figure is under $200, so the floor sets the cap (§5.2),
 * and his card's end date is months before its payoff date (§7.2). Not one of the 37 golden fixtures; its own goldens
 * are in section3-goldens.test.ts.
 */
export const SAMPLE_WEEKLY_RENTER: LifeCaseFacts = deepFreeze<LifeCaseFacts>({
  schemaVersion: 2,
  asOfYear: 2026,
  client: {
    personId: id(0x21), age: 29, sex: "male", longLived: false, nisPaying: true, selfEmployed: false, hasHealthCover: "no",
    pay: { frequency: "weekly", amountPerPay: 2000, varies: true, lowestMonthly: 7500 },
  },
  partner: null,
  children: [],
  parents: [],
  budget: {
    groups: [
      grp("home", [mo("Rent", 2500), yr("Home insurance", 1200)]),
      grp("util", [mo("T&TEC", 250), yr("WASA", 600), mo("Mobile phone (bMobile / Digicel)", 200)]),
      grp("food", [{ label: "Groceries and market", amount: 180, frequency: "weekly" }, { label: "Work and school lunches, snacks", amount: 100, frequency: "weekly", stop: "work" }]),
      grp("move", [{ label: "Maxi taxi, taxi, bus or ferry", amount: 100, frequency: "weekly" }]),
      { key: "fun", skip: true, total: 400, totalFrequency: "monthly", lines: [] },
      { key: "other", skip: true, total: 300, totalFrequency: "fortnightly", lines: [] },
      grp("save", [mo("Credit union shares", 300)]),
      grp("yearly", [yr("Christmas", 2400)]),
    ],
    housing: "rent",
    mortgage: null,
    savings: 0,
    roomPlan: null,
  },
  debts: {
    items: [{ label: "Credit card", type: "credit-card", lender: "Republic Bank", balance: 6000, ratePct: 24, minimumMonthly: 250, endDate: "2028-06", cosigned: false, cosignerName: null }],
    extraMonthly: 0,
  },
  goals: [],
  existingCover: COVER_DEFAULT,
  wishes: { funeral: 50000, finalMedical: 0, legacy: 0, retireAge: 65, retireIncomeMonthly: 5000 },
  workPension: { kind: "none" },
  opener: NO_OPENER,
  // Build C: the version 1 cash ($7,000) is one bank row, and her credit union shares ($300 a month) count as cash.
  assets: [
    { kind: "bank", value: 7000 },
  ],
});

/** Version 1 of the sample family, as signed (the upgrade test reads it). */
export const SAMPLE_FAMILY_V1: LifeCaseFactsV1 = deepFreeze<LifeCaseFactsV1>({
  schemaVersion: 1,
  asOfYear: 2026,
  client: { personId: id(1), age: 38, sex: "male", longLived: false, grossMonthly: 17000, nisPaying: true, selfEmployed: false, hasHealthCover: "unknown" },
  partner: { personId: id(2), age: 36, incomeMonthly: 4000 },
  children: [
    { personId: id(3), age: 4, route: "local", costLevel: "typical", studyStartAge: 18, milestones: milestones(false, false) },
    { personId: id(4), age: 11, route: "local", costLevel: "typical", studyStartAge: 18, milestones: milestones(true, true) },
  ],
  parents: [
    { personId: id(5), relationship: "mother", birthYear: 1960, careTier: 1, careFromAge: 66, receivesSCP: true, nisContributions: "yes" },
    { personId: id(6), relationship: "father", birthYear: 1955, careTier: 2, careFromAge: 71, receivesSCP: false, nisContributions: "unknown" },
  ],
  budget: {
    costs: [
      { label: "Mortgage payment", monthly: 3000 }, { label: "Groceries", monthly: 2000 }, { label: "Utilities", monthly: 600 },
      { label: "Transport", monthly: 1100 }, { label: "Phone and internet", monthly: 400 },
      { label: "School and childcare", monthly: 800 }, { label: "Insurance premiums", monthly: 300 },
    ],
    irregularAnnual: 18000,
    housing: "mortgage",
    housingPaymentMonthly: 3000,
    mortgage: { balance: 420000, yearsLeft: 18, clearOnDeath: true },
    savings: 20000,
  },
  debts: {
    items: [
      { label: "Credit card", balance: 18000, ratePct: 24, minimumMonthly: 540 },
      { label: "Personal loan", balance: 45000, ratePct: 14, minimumMonthly: 900 },
    ],
    extraMonthly: 600,
  },
  goals: [
    { goalId: id(0x201), kind: "home", on: false, price: 900000, years: 5, saved: 0, route: "mortgage" },
    { goalId: id(0x202), kind: "vehicle", on: false, price: 180000, years: 2, saved: 0, route: "loan", newVehicle: true, depositPct: 0, termYears: 8 },
    { goalId: id(0x203), kind: "study", on: false, price: 120000, years: 3, saved: 0, route: "save" },
    { goalId: id(0x204), kind: "business", on: false, price: 100000, years: 3, saved: 0, route: "save" },
  ],
  existingCover: COVER_DEFAULT_V1,
  wishes: { funeral: 50000, finalMedical: 0, legacy: 150000, retireAge: 65, retireIncomeMonthly: 8000 },
  workPension: { kind: "none" },
});

/** Version 1 of the young single, as signed. */
export const SAMPLE_YOUNG_SINGLE_V1: LifeCaseFactsV1 = deepFreeze<LifeCaseFactsV1>({
  schemaVersion: 1,
  asOfYear: 2026,
  client: { personId: id(0x11), age: 24, sex: "female", longLived: false, grossMonthly: 8000, nisPaying: true, selfEmployed: false, hasHealthCover: "unknown" },
  partner: null,
  children: [],
  parents: [],
  budget: {
    costs: [
      { label: "Rent", monthly: 2500 }, { label: "Groceries", monthly: 900 }, { label: "Utilities", monthly: 300 },
      { label: "Transport", monthly: 800 }, { label: "Phone and internet", monthly: 300 },
      { label: "School and childcare", monthly: 0 }, { label: "Insurance premiums", monthly: 0 },
    ],
    irregularAnnual: 6000,
    housing: "rent",
    housingPaymentMonthly: 2500,
    mortgage: null,
    savings: 4000,
  },
  debts: { items: [{ label: "Credit card", balance: 3000, ratePct: 24, minimumMonthly: 150 }], extraMonthly: 200 },
  goals: [
    { goalId: id(0x211), kind: "home", on: true, price: 850000, years: 6, saved: 0, route: "mortgage" },
    { goalId: id(0x212), kind: "vehicle", on: true, price: 150000, years: 2, saved: 0, route: "loan", newVehicle: true, depositPct: 0, termYears: 8 },
    { goalId: id(0x213), kind: "study", on: false, price: 120000, years: 3, saved: 0, route: "save" },
    { goalId: id(0x214), kind: "business", on: false, price: 100000, years: 3, saved: 0, route: "save" },
  ],
  existingCover: COVER_DEFAULT_V1,
  wishes: { funeral: 50000, finalMedical: 0, legacy: 0, retireAge: 65, retireIncomeMonthly: 6000 },
  workPension: { kind: "none" },
});

/** Care graph brief §3: the canonical case is the sample family's people, household net $14,000 a month. */
export const CARE_GRAPH_FIXTURE_NET_MONTHLY = 14000;

/** Care graph brief §3 variant: Child B to the United Kingdom, everything else held. */
export function withChildBInUK(facts: LifeCaseFacts): LifeCaseFacts {
  return { ...facts, children: facts.children.map((c, i) => (i === 1 ? { ...c, route: "uk" as const } : c)) };
}

/** A loved-one case for the smoke walk: a grandparent buying for a grandchild (Goldspoon). */
export const SAMPLE_LOVED_ONE: NonNullable<LifeCaseFacts["lovedOnes"]> = deepFreeze({
  buyerRole: "grandparent" as const,
  buyerAge: 62,
  budgetMonthly: 300,
  aims: { save: true, life: true, funeral: false, retire: false },
  ones: [{ personId: id(0x31), age: 3, relation: "child" as const }],
});

/** A business case for the smoke walk (the prototype's default business inputs). */
export const SAMPLE_BUSINESS: NonNullable<LifeCaseFacts["business"]> = deepFreeze({
  type: "company" as const, owners: 2, sharePct: 50, value: 1500000, profitAnnual: 600000,
  keyPersonAnnual: 240000, loans: 300000, overheadsMonthly: 40000, staff: 6,
});
