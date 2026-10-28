/**
 * The prototype v17 sample cases (its `samples` object: `fam` and `young`) as `LifeCaseFacts`.
 * They are the golden fixtures (Section 2 §2.8, care graph brief §3) and the cases the Phase 2
 * page loads for the smoke walk. Data, not engine code: exempt from the hard-coded-number guard.
 *
 * Parents are by birth year (Section 1): the prototype's mother aged 66 and father aged 71 in
 * 2026 are birth years 1960 and 1955.
 */
import type { LifeCaseFacts, MilestoneFacts } from "../life-case-facts.ts";
import { deepFreeze } from "../parameters/row.ts";

const id = (n: number): string => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;

const milestones = (vehicleOn: boolean, weddingOn: boolean): MilestoneFacts[] => [
  { key: "vehicle", on: vehicleOn, atAge: 22, amountToday: 60000 },
  { key: "wedding", on: weddingOn, atAge: 28, amountToday: 60000 },
  { key: "business", on: false, atAge: 25, amountToday: 50000 },
  { key: "home", on: false, atAge: 30, amountToday: 100000 },
];

const COVER_DEFAULT: LifeCaseFacts["existingCover"] = [
  { policyId: id(0x101), label: "Group life through work", kind: "life", group: true, amount: null },
  { policyId: id(0x102), label: "Individual life", kind: "life", group: false, amount: 0 },
  { policyId: id(0x103), label: "Critical illness", kind: "ci", group: false, amount: 0 },
];

export const SAMPLE_FAMILY: LifeCaseFacts = deepFreeze<LifeCaseFacts>({
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
  existingCover: COVER_DEFAULT,
  wishes: { funeral: 50000, finalMedical: 0, legacy: 150000, retireAge: 65, retireIncomeMonthly: 8000 },
  workPension: { kind: "none" },
});

export const SAMPLE_YOUNG_SINGLE: LifeCaseFacts = deepFreeze<LifeCaseFacts>({
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
  existingCover: COVER_DEFAULT,
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
