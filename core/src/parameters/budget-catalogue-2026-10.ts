/**
 * The budget catalogue (Section 3 §1.1): the twelve groups of the line-by-line budget, their lines, which common guide
 * (§6.1) each group is measured against, and which lines carry a `stop` tag (§9). Plus the quick 7-line form (§1.2),
 * which writes the same shape as one group, key `quick`.
 *
 * The page renders the budget from this table and computes nothing itself (§14.4). Keys are stable: facts store the
 * group key; a line stores its label (§14.1), so the line keys here are for rendering and tests only.
 * Data, not engine code (exempt from the hard-coded-number guard).
 */
import { deepFreeze } from "./row.ts";
import type { Frequency } from "./fact-finder-2026-10.ts";

export type BudgetGroupKey =
  | "home" | "util" | "food" | "move" | "kids" | "health" | "family" | "giving" | "ins" | "save" | "fun" | "yearly" | "other"
  | "quick";

/** The §6.1 guide a group is measured against; null: no guide (shown as a share only). */
export type GuideKey = "home" | "food" | "move" | "util" | "health" | "debt" | "insurance" | "saving" | "fun" | "giving";

/** §9: what stops by retirement. `care` is set on Family you support lines tied to a parent. */
export type StopTag = "mortgage" | "kids" | "work" | "care";

export type LineFrequency = Exclude<Frequency, "semimonthly">;

/**
 * How the engine counts a group:
 * - `spending`: in needs.
 * - `saving`: "Saving you already do" — counted as saving, not spending (§1.1); not in needs.
 * - `yearly`: once-a-year costs, entered per year; the monthly set-aside is in needs.
 * - `support`: Family you support; a line with a parent's `personId` is that parent's care today (§1.3), counted once,
 *   through the care graph. A line without one (a relative, a grown child) is spending.
 */
export type GroupKind = "spending" | "saving" | "yearly" | "support";

export interface CatalogueLine {
  readonly key: string;
  readonly label: string;
  readonly frequency: LineFrequency;
  readonly stop?: StopTag;
}

export interface CatalogueGroup {
  readonly key: BudgetGroupKey;
  readonly label: string;
  readonly kind: GroupKind;
  readonly guide: GuideKey | null;
  readonly lines: readonly CatalogueLine[];
  /** "Other (name it)" can be added to any group (§1.1). */
  readonly otherLabel: string;
  readonly hint?: string;
}

const L = (key: string, label: string, frequency: LineFrequency = "monthly", stop?: StopTag): CatalogueLine =>
  stop ? { key, label, frequency, stop } : { key, label, frequency };

/** The Home group's first line, "Your home": its label follows the housing choice. Own it outright has no payment line. */
export const HOUSING_LINE_LABELS = deepFreeze({
  mortgage: "Mortgage", rent: "Rent", contribution: "Household contribution", own: null,
} as const);

export const BUDGET_CATALOGUE: readonly CatalogueGroup[] = deepFreeze<CatalogueGroup[]>([
  {
    key: "home", label: "Home", kind: "spending", guide: "home", otherLabel: "Other home cost",
    lines: [
      // The first line: Mortgage (stop: mortgage), Rent, or Household contribution; none when the home is owned outright.
      L("housing", "Mortgage", "monthly", "mortgage"),
      L("land-tax", "Land and building tax", "yearly"),
      L("home-insurance", "Home insurance", "yearly"),
      L("repairs", "Repairs and maintenance"),
      L("security", "Security"),
      L("domestic-help", "Domestic help and yard work"),
      L("furniture", "Furniture and appliances (cash; hire purchase in Debts)"),
    ],
  },
  {
    key: "util", label: "Utilities and bills", kind: "spending", guide: "util", otherLabel: "Other bill",
    lines: [
      L("ttec", "T&TEC"), L("wasa", "WASA", "yearly"), L("gas", "Cooking gas"), L("mobile", "Mobile phone (bMobile / Digicel)"),
      L("internet", "Home internet and cable"), L("streaming", "Streaming and apps"),
    ],
  },
  {
    key: "food", label: "Food", kind: "spending", guide: "food", otherLabel: "Other food",
    lines: [
      L("groceries", "Groceries and market", "weekly"), L("lunches", "Work and school lunches, snacks", "weekly", "work"),
      L("eating-out", "Eating out, doubles and takeaway", "weekly"), L("drinks", "Drinks"),
    ],
  },
  {
    key: "move", label: "Getting around", kind: "spending", guide: "move", otherLabel: "Other travel",
    lines: [
      L("fuel", "Fuel", "weekly"), L("public-transport", "Maxi taxi, taxi, bus or ferry", "weekly"),
      L("motor-insurance", "Motor insurance", "yearly"), L("licence", "Licence and inspection", "yearly"),
      L("servicing", "Servicing and tyres", "yearly"), L("parking", "Parking and car wash"),
    ],
  },
  {
    key: "kids", label: "Children", kind: "spending", guide: null, otherLabel: "Other child cost",
    lines: [
      L("school-fees", "School fees", "yearly", "kids"), L("books-uniforms", "Books and uniforms", "yearly", "kids"),
      L("lunch-money", "Lunch money", "weekly", "kids"), L("school-transport", "Transport to school", "monthly", "kids"),
      L("lessons", "Lessons and extra classes", "monthly", "kids"), L("daycare", "Daycare or babysitter", "monthly", "kids"),
      L("activities", "Sport and activities", "monthly", "kids"), L("allowances", "Allowances", "weekly", "kids"),
    ],
  },
  {
    key: "health", label: "Health and personal care", kind: "spending", guide: "health", otherLabel: "Other personal cost",
    lines: [
      L("health-insurance", "Health insurance premium"), L("doctor", "Doctor, dentist, optician (not covered)", "yearly"),
      L("medication", "Medication"), L("gym", "Gym"), L("hair", "Hair and barber"), L("nails", "Nails and beauty"),
      L("toiletries", "Toiletries"), L("clothing", "Clothing and shoes"),
    ],
  },
  {
    key: "family", label: "Family you support", kind: "support", guide: null, otherLabel: "A relative",
    hint: "Count only money not already in the lines above. If you buy their groceries with yours, leave them in Food.",
    // One line per person, added with "+ Add a person": Mother, Father, a relative, a grown child. A parent's line carries
    // that parent's personId and `stop: care`.
    lines: [],
  },
  {
    key: "giving", label: "Giving", kind: "spending", guide: "giving", otherLabel: "Other giving",
    lines: [L("church", "Church, tithes and offerings"), L("gifts", "Gifts and birthdays", "yearly"), L("child-support", "Child support")],
  },
  {
    key: "ins", label: "Insurance you pay now", kind: "spending", guide: "insurance", otherLabel: "Other premium",
    hint: "Motor and home insurance are in their own groups.",
    lines: [L("life", "Life"), L("other-premiums", "Other premiums")],
  },
  {
    key: "save", label: "Saving you already do", kind: "saving", guide: "saving", otherLabel: "Other saving",
    hint: "Counted as saving, not spending.",
    lines: [
      L("sou-sou", "Sou-sou hand"), L("credit-union", "Credit union shares"), L("pension", "Pension or annuity contributions"),
      L("unit-trust", "Unit trust or standing orders"),
    ],
  },
  {
    key: "fun", label: "Fun and lifestyle", kind: "spending", guide: "fun", otherLabel: "Other fun",
    lines: [
      L("entertainment", "Entertainment and outings"), L("hobbies", "Hobbies"), L("travel", "Travel and vacation", "yearly"),
      L("carnival", "Carnival and fetes", "yearly"), L("lotto", "Lotto and betting", "weekly"),
    ],
  },
  {
    key: "yearly", label: "Once-a-year costs", kind: "yearly", guide: null, otherLabel: "Other yearly cost",
    hint: "Enter each one per year; we show the monthly set-aside.",
    lines: [
      L("christmas", "Christmas", "yearly"), L("back-to-school", "Back to school", "yearly"),
      L("carnival-season", "Carnival season (if not above)", "yearly"), L("motor-renewal", "Motor renewal", "yearly"),
      L("home-repairs", "Home repairs", "yearly"), L("medical", "Medical and dental not covered", "yearly"),
    ],
  },
  {
    key: "other", label: "Pets and other", kind: "spending", guide: null, otherLabel: "Anything else",
    lines: [L("pets", "Pet food and vet"), L("bank-fees", "Bank fees"), L("anything-else", "Anything else")],
  },
]);

/**
 * The quick 7-line form for the doors that do not need a full budget (§1.2). It writes one group, key `quick`. Its once-a-
 * year figure goes in a `yearly` group with one yearly line, as the version-1 upgrade does, so it is a set-aside, not a cost.
 */
export const QUICK_GROUP: CatalogueGroup = deepFreeze<CatalogueGroup>({
  key: "quick", label: "Your costs", kind: "spending", guide: null, otherLabel: "Other cost",
  lines: [
    L("housing", "Mortgage, rent or contribution", "monthly", "mortgage"), L("groceries", "Groceries"), L("utilities", "Utilities"),
    L("transport", "Transport"), L("phone", "Phone and internet"), L("school", "School and childcare", "monthly", "kids"),
    L("insurance", "Insurance premiums"),
  ],
});

/** The once-a-year line the quick form and the version-1 upgrade write, in the `yearly` group. */
export const QUICK_YEARLY_LABEL = "Once-a-year bills";

export const GROUP_KEYS: readonly BudgetGroupKey[] = deepFreeze([...BUDGET_CATALOGUE.map((g) => g.key), "quick" as const]);
