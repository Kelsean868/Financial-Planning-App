/**
 * `LifeCaseFacts`: the captured facts of one case, as stored in `life_cases.facts` (Section 1 §1.1)
 * and as the fact-finder engine reads them. Validated at the JS/TS seam before every write.
 *
 * Schema version 2 (Section 3 §14.1, signed 28 Oct 2026): pay with a frequency, the line-by-line budget, debts with
 * type, lender, end date and co-signer, a parent's future care level, cover status, the opener and assets. A version-1
 * case is upgraded when it is read (§14.1); anything else that does not validate throws `LifeCaseFactsError` (§14.3).
 *
 * Privacy rules enforced here (engine side):
 * - Guard 7: no free text on a parent. A parent has a closed key list; its only strings are an id,
 *   an enumerated relationship, an optional first name (a name, not a sentence) and an enumerated
 *   NIS status (run record R2).
 * - Guard 8: no health answer anywhere. A `healthFlag` or `healthNote` key at any depth fails.
 */
import { LifeCaseFactsError } from "./errors.ts";
import { ProvenanceBuilder } from "./provenance.ts";
import type { EducationRoute, CostLevel } from "./parameters/fact-finder-2026-10.ts";
import {
  BUDGET_CATALOGUE, GROUP_KEYS, QUICK_GROUP, QUICK_YEARLY_LABEL,
  type BudgetGroupKey, type LineFrequency, type StopTag,
} from "./parameters/budget-catalogue-2026-10.ts";

export type { BudgetGroupKey, LineFrequency, StopTag } from "./parameters/budget-catalogue-2026-10.ts";

export type Sex = "male" | "female";
export type Tristate = "yes" | "no" | "unknown";
export type CareTier = 0 | 1 | 2 | 3 | 4;
export type ParentRelationship =
  | "mother" | "father" | "grandmother" | "grandfather" | "mother-in-law" | "father-in-law" | "other-elder";
export type MilestoneKey = "vehicle" | "wedding" | "business" | "home";
export type HousingKind = "mortgage" | "rent" | "contribution" | "own";
export type GoalKind = "home" | "vehicle" | "study" | "business" | "own";
export type GoalRoute = "mortgage" | "cash" | "loan" | "save";

/** Section 3 §2.1: how often pay comes. */
export type PayFrequency = "weekly" | "fortnightly" | "semimonthly" | "monthly";

/** Section 3 §2: pay in the client's own rhythm. */
export interface PayFacts {
  frequency: PayFrequency;
  /** Gross for the client (tax maths runs on it); take-home for a partner, as version 1's partner income was. */
  amountPerPay: number;
  /** "My pay changes" (§2.5): the plan uses the lowest month. */
  varies: boolean;
  /** The lowest month in the last year, a month; required when `varies`. */
  lowestMonthly: number | null;
}

interface ClientBase {
  personId: string;
  firstName?: string;
  lastName?: string;
  /** Whole years. The page computes it from the date of birth; the engine reads no clock. */
  age: number;
  sex: Sex;
  /** Family history of long lives: plan five years longer. */
  longLived: boolean;
  nisPaying: boolean;
  selfEmployed: boolean;
  /** Whether the client holds health insurance. Cover held, not a health answer (Section 2 §2.6). */
  hasHealthCover: Tristate;
  /**
   * Nicotine use in the past 5 years. The one health-related fact allowed in the case facts, by Kyron's
   * decision of 28 Oct 2026, used only to pick premium rates. Absent until the client answers it; then the
   * rates are non-smoker ones with a caveat. It never appears in a parameter table, and fixtures use
   * synthetic people. Every other health answer stays out (rule 8).
   */
  smoker?: boolean;
}

export interface ClientFacts extends ClientBase {
  pay: PayFacts;
}

export interface PartnerFacts {
  personId: string;
  firstName?: string;
  age: number;
  pay: PayFacts;
}

export interface MilestoneFacts {
  key: MilestoneKey;
  on: boolean;
  atAge: number;
  amountToday: number;
}

export interface ChildFacts {
  personId: string;
  firstName?: string;
  age: number;
  route: EducationRoute;
  costLevel: CostLevel;
  studyStartAge: number;
  milestones: MilestoneFacts[];
}

/**
 * Section 1 §1.5(d): birth year only, `careTier` 0–4, no free text, ever. Section 3 §1.3 / §14.1: `careTier` and
 * `careFromAge` are the **future** care level and its starting age, used when `growth` is true. Today's amount is the
 * sum of the budget lines whose `personId` is this parent.
 */
export interface ParentFacts {
  personId: string;
  relationship: ParentRelationship;
  firstName?: string;
  birthYear: number;
  careTier: CareTier;
  /** Age the future care level starts; defaults to the parent's current age. */
  careFromAge?: number;
  /** "Will her care needs grow?" */
  growth: boolean;
  receivesSCP: boolean;
  /** 25 or more NIS contributions (the funeral grant test). */
  nisContributions: Tristate;
}

/** One budget line (§14.1). Amounts are never negative. */
export interface BudgetLineFacts {
  label: string;
  amount: number;
  frequency: LineFrequency;
  stop?: StopTag;
  /** A parent's personId: this line is that parent's care today (§1.3). */
  personId?: string;
}

/** One budget group (§14.1). A skipped group takes one total and is marked "estimated" (§1.2). */
export interface BudgetGroupFacts {
  key: BudgetGroupKey;
  skip: boolean;
  total: number | null;
  totalFrequency: LineFrequency | null;
  lines: BudgetLineFacts[];
}

/** Where Make room sends freed money (§6.3). `group:<key>` is "Spend more on" that group. */
export type RoomDestination =
  | "shortfall" | "buffer" | "protection" | "debt" | "emergency" | "retirement" | "goals" | `group:${BudgetGroupKey}`;

/** §14.1: the Make room plan sits beside the real numbers; replaced whole, never merged (§14.2). */
export interface RoomPlanFacts {
  /** New monthly amount per group key. */
  groupTargets: Partial<Record<BudgetGroupKey, number>>;
  /** Monthly amount per destination; empty for the default split. */
  split: Partial<Record<RoomDestination, number>>;
  applied: boolean;
}

export interface BudgetFacts {
  groups: BudgetGroupFacts[];
  housing: HousingKind;
  mortgage: { balance: number; yearsLeft: number; clearOnDeath: boolean } | null;
  /**
   * Version 1 cash. Since Section 3 Build C the cash is the bank, credit union and unit trust rows of `assets`; this field
   * counts only when there are none (a case saved before assets existed), and the upgrade and the page leave it at 0.
   */
  savings: number;
  roomPlan: RoomPlanFacts | null;
}

export type DebtType = "credit-card" | "car-loan" | "personal" | "hire-purchase" | "student-loan" | "informal" | "other";

export interface DebtFacts {
  label: string;
  type: DebtType;
  lender: string | null;
  balance: number;
  ratePct: number;
  minimumMonthly: number;
  /** The end date the client gave, "YYYY-MM", or null. */
  endDate: string | null;
  /** "Did anyone co-sign or guarantee this?" (§7.1; closes F-16). */
  cosigned: boolean;
  cosignerName: string | null;
}

export interface GoalFacts {
  goalId: string;
  kind: GoalKind;
  label?: string;
  on: boolean;
  price: number;
  years: number;
  saved: number;
  route: GoalRoute;
  /** Vehicle goals only. */
  newVehicle?: boolean;
  depositPct?: number;
  termYears?: number;
}

/** §4: None = 0 and confirmed; Not sure = not counted either way, and flagged; I have this = the amount. */
export type CoverStatus = "none" | "unsure" | "have";

export interface CoverFacts {
  policyId: string;
  label: string;
  kind: "life" | "ci";
  group: boolean;
  /** null: not captured. Never read as zero (closing guard 2). */
  amount: number | null;
  status: CoverStatus;
}

export interface WishFacts {
  funeral: number;
  finalMedical: number;
  legacy: number;
  retireAge: number;
  retireIncomeMonthly: number;
}

export interface WorkPensionFacts {
  kind: "none" | "public-service" | "company";
  startAge?: number;
  salaryMonthly?: number;
  /** Public service: take the reduced pension plus gratuity. */
  takeReduced?: boolean;
  companyMonthly?: number;
}

export type LovedOneRelation = "child" | "adult" | "elder";
export type BuyerRole = "grandparent" | "parent" | "aunt-uncle" | "sibling" | "godparent" | "adult-child";

export interface LovedOneFacts {
  personId: string;
  firstName?: string;
  age: number;
  relation: LovedOneRelation;
}

export interface LovedOnesFacts {
  buyerRole: BuyerRole;
  buyerAge: number;
  budgetMonthly: number;
  aims: { save: boolean; life: boolean; funeral: boolean; retire: boolean };
  ones: LovedOneFacts[];
}

export interface BusinessFacts {
  type: "sole" | "partnership" | "company";
  owners: number;
  sharePct: number;
  value: number;
  profitAnnual: number;
  keyPersonAnnual: number;
  loans: number;
  overheadsMonthly: number;
  staff: number;
}

/** §3: the opener, "What matters to you". Own items: at most 3, 80 characters each. Never sent to a lead email. */
export interface OpenerFacts {
  worries: string[];
  dreams: string[];
  ownWorries: string[];
  ownDreams: string[];
}

/** §6.4 asset kinds. */
export type AssetKind =
  | "bank" | "credit-union" | "unit-trust" | "shares-bonds" | "pension-cash" | "life-cash" | "property" | "vehicle" | "furniture" | "other";

export interface AssetFacts {
  kind: AssetKind;
  value: number;
}

export interface LifeCaseFacts {
  schemaVersion: 2;
  /** Calendar year the facts were captured in. Parent ages come from birth years against it. */
  asOfYear: number;
  client: ClientFacts;
  partner: PartnerFacts | null;
  children: ChildFacts[];
  parents: ParentFacts[];
  budget: BudgetFacts;
  debts: { items: DebtFacts[]; extraMonthly: number };
  goals: GoalFacts[];
  existingCover: CoverFacts[];
  wishes: WishFacts;
  workPension: WorkPensionFacts;
  opener: OpenerFacts;
  assets: AssetFacts[];
  lovedOnes?: LovedOnesFacts;
  business?: BusinessFacts;
}

/* ------------------------------------------------------------------ version 1 (read only, upgraded on read) */

export interface CostLineV1 { label: string; monthly: number }
export type ParentFactsV1 = Omit<ParentFacts, "growth">;
export interface LifeCaseFactsV1 {
  schemaVersion: 1;
  asOfYear: number;
  client: ClientBase & { grossMonthly: number };
  partner: { personId: string; firstName?: string; age: number; incomeMonthly: number } | null;
  children: ChildFacts[];
  parents: ParentFactsV1[];
  budget: {
    costs: CostLineV1[];
    irregularAnnual: number;
    housing: HousingKind;
    housingPaymentMonthly: number;
    mortgage: { balance: number; yearsLeft: number; clearOnDeath: boolean } | null;
    savings: number;
  };
  debts: { items: { label: string; balance: number; ratePct: number; minimumMonthly: number }[]; extraMonthly: number };
  goals: GoalFacts[];
  existingCover: Omit<CoverFacts, "status">[];
  wishes: WishFacts;
  workPension: WorkPensionFacts;
  lovedOnes?: LovedOnesFacts;
  business?: BusinessFacts;
}

/* ------------------------------------------------------------------ validation */

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/**
 * A first name: one word of letters, hyphens or apostrophes, at most 20 characters ("Mary-Ann",
 * "O'Neil"). One word on purpose: a space would let a sentence in where only a name may go.
 */
const FIRST_NAME = /^\p{L}[\p{L}'-]{0,19}$/u;
const HEALTH_KEY = /^health(flag|note)$/i;
const YEAR_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

const PARENT_KEYS_V1 = new Set([
  "personId", "relationship", "firstName", "birthYear", "careTier", "careFromAge", "receivesSCP", "nisContributions",
]);
const PARENT_KEYS = new Set([...PARENT_KEYS_V1, "growth"]);
const PARENT_STRING_KEYS = new Set(["personId", "relationship", "firstName", "nisContributions"]);
const PARENT_RELATIONSHIPS = new Set<ParentRelationship>([
  "mother", "father", "grandmother", "grandfather", "mother-in-law", "father-in-law", "other-elder",
]);
const LOVED_ONE_KEYS = new Set(["personId", "firstName", "age", "relation"]);
const TRISTATE = new Set(["yes", "no", "unknown"]);
const PAY_FREQUENCIES = new Set<PayFrequency>(["weekly", "fortnightly", "semimonthly", "monthly"]);
const LINE_FREQUENCIES = new Set<LineFrequency>(["weekly", "fortnightly", "monthly", "yearly"]);
const STOP_TAGS = new Set<StopTag>(["mortgage", "kids", "work", "care"]);
const HOUSING = new Set<HousingKind>(["mortgage", "rent", "contribution", "own"]);
const DEBT_TYPES = new Set<DebtType>(["credit-card", "car-loan", "personal", "hire-purchase", "student-loan", "informal", "other"]);
const COVER_STATUS = new Set<CoverStatus>(["none", "unsure", "have"]);
const ASSET_KINDS = new Set<AssetKind>(["bank", "credit-union", "unit-trust", "shares-bonds", "pension-cash", "life-cash", "property", "vehicle", "furniture", "other"]);
const ROOM_DESTINATIONS = new Set(["shortfall", "buffer", "protection", "debt", "emergency", "retirement", "goals"]);

/** §3.2: at most 3 own items, 80 characters each. */
export const OWN_ITEMS_MAX = 3;
export const OWN_ITEM_MAX_CHARS = 80;
/** A line label, a lender or a co-signer's name: short text, never a sentence about health. */
const LABEL_MAX_CHARS = 60;

/** Every path at which a `healthFlag` / `healthNote` key appears (guard 8). */
export function findHealthKeys(value: unknown, path = "$"): string[] {
  const hits: string[] = [];
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

/**
 * Guard 8 for any record bound for a case, a scope row or a snapshot.
 * Throws `LifeCaseFactsError` naming every offending path.
 */
export function assertNoHealthKeys(value: unknown, what: string): void {
  const hits = findHealthKeys(value);
  if (hits.length) {
    throw new LifeCaseFactsError(hits.map((h) => `${what} carries a health answer at ${h}; health answers live only in the intake row`));
  }
}

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}
function isAmount(v: unknown): v is number {
  return isNum(v) && v >= 0;
}
function isShortText(v: unknown): v is string {
  return typeof v === "string" && v.length <= LABEL_MAX_CHARS;
}

function checkPerson(where: string, p: Record<string, unknown>, problems: string[]): void {
  if (typeof p.personId !== "string" || !UUID_V4.test(p.personId)) problems.push(`${where}.personId must be a UUIDv4`);
  if (p.firstName !== undefined && (typeof p.firstName !== "string" || !FIRST_NAME.test(p.firstName))) {
    problems.push(`${where}.firstName must be one first name (letters, hyphen or apostrophe, at most 20 characters)`);
  }
}

/** Guard 7: a parent is a closed shape with no free text. */
function checkParent(where: string, p: unknown, problems: string[], keys: ReadonlySet<string>): void {
  if (!isObj(p)) { problems.push(`${where} must be an object`); return; }
  for (const [k, v] of Object.entries(p)) {
    if (!keys.has(k)) problems.push(`${where}.${k} is not allowed on a parent (no free text on a parent, ever)`);
    else if (typeof v === "string" && !PARENT_STRING_KEYS.has(k)) problems.push(`${where}.${k} must not be text`);
  }
  checkPerson(where, p, problems);
  if (!PARENT_RELATIONSHIPS.has(p.relationship as ParentRelationship)) problems.push(`${where}.relationship must be one of the listed labels`);
  if (!Number.isInteger(p.birthYear)) problems.push(`${where}.birthYear must be a whole year`);
  if (!Number.isInteger(p.careTier) || (p.careTier as number) < 0 || (p.careTier as number) > 4) problems.push(`${where}.careTier must be an integer 0–4`);
  if (p.careFromAge !== undefined && !Number.isInteger(p.careFromAge)) problems.push(`${where}.careFromAge must be a whole age`);
  if (typeof p.receivesSCP !== "boolean") problems.push(`${where}.receivesSCP must be true or false`);
  if (!TRISTATE.has(p.nisContributions as string)) problems.push(`${where}.nisContributions must be yes, no or unknown`);
  if (keys.has("growth") && typeof p.growth !== "boolean") problems.push(`${where}.growth must be true or false`);
}

function checkLovedOne(where: string, o: unknown, problems: string[]): void {
  if (!isObj(o)) { problems.push(`${where} must be an object`); return; }
  for (const [k, v] of Object.entries(o)) {
    if (!LOVED_ONE_KEYS.has(k)) problems.push(`${where}.${k} is not allowed on a loved one`);
    else if (typeof v === "string" && k !== "personId" && k !== "firstName" && k !== "relation") problems.push(`${where}.${k} must not be text`);
  }
  checkPerson(where, o, problems);
  if (!isNum(o.age) || o.age < 0) problems.push(`${where}.age must be a number`);
  if (!["child", "adult", "elder"].includes(o.relation as string)) problems.push(`${where}.relation must be child, adult or elder`);
}

function checkPay(where: string, p: unknown, problems: string[]): void {
  if (!isObj(p)) { problems.push(`${where} is required`); return; }
  if (!PAY_FREQUENCIES.has(p.frequency as PayFrequency)) problems.push(`${where}.frequency must be weekly, fortnightly, semimonthly or monthly`);
  if (!isAmount(p.amountPerPay)) problems.push(`${where}.amountPerPay must be a number, not negative`);
  if (typeof p.varies !== "boolean") problems.push(`${where}.varies must be true or false`);
  if (p.lowestMonthly !== null && !isAmount(p.lowestMonthly)) problems.push(`${where}.lowestMonthly must be a number, not negative, or null`);
  if (p.varies === true && p.lowestMonthly === null) problems.push(`${where}.lowestMonthly is required when pay changes`);
}

/** The structure shared by both versions (people, goals, wishes, loved ones); version-specific parts are checked apart. */
function checkCommon(f: Record<string, unknown>, problems: string[], parentKeys: ReadonlySet<string>): void {
  if (!Number.isInteger(f.asOfYear)) problems.push("asOfYear must be a whole year");
  if (!isObj(f.client)) problems.push("client is required");
  else {
    checkPerson("client", f.client, problems);
    if (!isNum(f.client.age)) problems.push("client.age must be a number");
    if (!["male", "female"].includes(f.client.sex as string)) problems.push("client.sex must be male or female");
    if (!TRISTATE.has(f.client.hasHealthCover as string)) problems.push("client.hasHealthCover must be yes, no or unknown");
    if (f.client.smoker !== undefined && typeof f.client.smoker !== "boolean") problems.push("client.smoker must be true or false when it is given");
  }
  if (f.partner !== null) {
    if (!isObj(f.partner)) problems.push("partner must be an object or null");
    else {
      checkPerson("partner", f.partner, problems);
      if (!isNum(f.partner.age)) problems.push("partner.age must be a number");
    }
  }
  for (const key of ["children", "parents", "goals", "existingCover"] as const) {
    if (!Array.isArray(f[key])) problems.push(`${key} must be a list`);
  }
  if (Array.isArray(f.children)) f.children.forEach((c, i) => {
    if (!isObj(c)) { problems.push(`children[${i}] must be an object`); return; }
    checkPerson(`children[${i}]`, c, problems);
    if (!isNum(c.age) || !isNum(c.studyStartAge)) problems.push(`children[${i}].age and studyStartAge must be numbers`);
    if (!Array.isArray(c.milestones)) problems.push(`children[${i}].milestones must be a list`);
  });
  if (Array.isArray(f.parents)) f.parents.forEach((p, i) => checkParent(`parents[${i}]`, p, problems, parentKeys));
  if (Array.isArray(f.existingCover)) f.existingCover.forEach((c, i) => {
    if (!isObj(c)) { problems.push(`existingCover[${i}] must be an object`); return; }
    if (typeof c.policyId !== "string" || !UUID_V4.test(c.policyId)) problems.push(`existingCover[${i}].policyId must be a UUIDv4`);
    if (c.amount !== null && !isNum(c.amount)) problems.push(`existingCover[${i}].amount must be a number or null (not captured)`);
  });
  const ids = [
    ...(Array.isArray(f.parents) ? f.parents : []),
    ...(Array.isArray(f.children) ? f.children : []),
  ].map((p) => (isObj(p) ? p.personId : undefined));
  if (new Set(ids).size !== ids.length) problems.push("personId must be unique (dedupe is by id only)");
  if (!isObj(f.budget)) problems.push("budget is required");
  if (!isObj(f.debts) || !Array.isArray(f.debts.items)) problems.push("debts.items must be a list");
  if (!isObj(f.wishes)) problems.push("wishes is required");
  if (!isObj(f.workPension)) problems.push("workPension is required");
  if (f.lovedOnes !== undefined) {
    if (!isObj(f.lovedOnes) || !Array.isArray(f.lovedOnes.ones)) problems.push("lovedOnes.ones must be a list");
    else f.lovedOnes.ones.forEach((o, i) => checkLovedOne(`lovedOnes.ones[${i}]`, o, problems));
  }
}

function checkLine(where: string, l: unknown, parentIds: ReadonlySet<string>, problems: string[]): void {
  if (!isObj(l)) { problems.push(`${where} must be an object`); return; }
  if (!isShortText(l.label)) problems.push(`${where}.label must be text of at most ${LABEL_MAX_CHARS} characters`);
  if (!isAmount(l.amount)) problems.push(`${where}.amount must be a number, not negative`);
  if (!LINE_FREQUENCIES.has(l.frequency as LineFrequency)) problems.push(`${where}.frequency must be weekly, fortnightly, monthly or yearly`);
  if (l.stop !== undefined && !STOP_TAGS.has(l.stop as StopTag)) problems.push(`${where}.stop must be mortgage, kids, work or care`);
  if (l.personId !== undefined && (typeof l.personId !== "string" || !parentIds.has(l.personId))) {
    problems.push(`${where}.personId must be one of the parents' personIds`);
  }
}

function checkBudgetV2(b: Record<string, unknown>, parentIds: ReadonlySet<string>, problems: string[]): void {
  if (!Array.isArray(b.groups)) { problems.push("budget.groups must be a list"); }
  else {
    const seen = new Set<string>();
    b.groups.forEach((g, i) => {
      const w = `budget.groups[${i}]`;
      if (!isObj(g)) { problems.push(`${w} must be an object`); return; }
      if (!GROUP_KEYS.includes(g.key as BudgetGroupKey)) problems.push(`${w}.key must be a catalogue group key`);
      else if (seen.has(g.key as string)) problems.push(`${w}.key "${String(g.key)}" appears twice`);
      seen.add(g.key as string);
      if (typeof g.skip !== "boolean") problems.push(`${w}.skip must be true or false`);
      if (g.total !== null && !isAmount(g.total)) problems.push(`${w}.total must be a number, not negative, or null`);
      if (g.totalFrequency !== null && !LINE_FREQUENCIES.has(g.totalFrequency as LineFrequency)) problems.push(`${w}.totalFrequency must be weekly, fortnightly, monthly or yearly, or null`);
      if (g.skip === true && (g.total === null || g.totalFrequency === null)) problems.push(`${w} is skipped, so it needs a total and how often`);
      if (!Array.isArray(g.lines)) problems.push(`${w}.lines must be a list`);
      else g.lines.forEach((l, j) => checkLine(`${w}.lines[${j}]`, l, parentIds, problems));
    });
  }
  if (!HOUSING.has(b.housing as HousingKind)) problems.push("budget.housing must be mortgage, rent, contribution or own");
  if (b.mortgage !== null) {
    if (!isObj(b.mortgage) || !isAmount(b.mortgage.balance) || !isAmount(b.mortgage.yearsLeft) || typeof b.mortgage.clearOnDeath !== "boolean") {
      problems.push("budget.mortgage must be null or { balance, yearsLeft, clearOnDeath }");
    }
  }
  if (!isAmount(b.savings)) problems.push("budget.savings must be a number, not negative");
  if (b.roomPlan !== null) {
    const r = b.roomPlan;
    if (!isObj(r) || !isObj(r.groupTargets) || !isObj(r.split) || typeof r.applied !== "boolean") {
      problems.push("budget.roomPlan must be null or { groupTargets, split, applied }");
    } else {
      for (const [k, v] of Object.entries(r.groupTargets)) {
        if (!GROUP_KEYS.includes(k as BudgetGroupKey)) problems.push(`budget.roomPlan.groupTargets.${k} is not a group key`);
        if (!isAmount(v)) problems.push(`budget.roomPlan.groupTargets.${k} must be a number, not negative`);
      }
      for (const [k, v] of Object.entries(r.split)) {
        if (!isRoomDestination(k)) problems.push(`budget.roomPlan.split.${k} is not a Make room destination`);
        if (!isAmount(v)) problems.push(`budget.roomPlan.split.${k} must be a number, not negative`);
      }
    }
  }
}

/** A Make room destination key: a plan step, or "group:<key>" for "Spend more on" a spending group. */
export function isRoomDestination(k: string): k is RoomDestination {
  if (ROOM_DESTINATIONS.has(k)) return true;
  const m = /^group:(.+)$/.exec(k);
  return !!m && GROUP_KEYS.includes(m[1] as BudgetGroupKey) && m[1] !== "save";
}

function checkDebtV2(where: string, d: unknown, problems: string[]): void {
  if (!isObj(d)) { problems.push(`${where} must be an object`); return; }
  if (!isShortText(d.label)) problems.push(`${where}.label must be text of at most ${LABEL_MAX_CHARS} characters`);
  if (!DEBT_TYPES.has(d.type as DebtType)) problems.push(`${where}.type must be one of the listed debt types`);
  if (d.lender !== null && !isShortText(d.lender)) problems.push(`${where}.lender must be text of at most ${LABEL_MAX_CHARS} characters, or null`);
  for (const k of ["balance", "ratePct", "minimumMonthly"]) if (!isAmount(d[k])) problems.push(`${where}.${k} must be a number, not negative`);
  if (d.endDate !== null && (typeof d.endDate !== "string" || !YEAR_MONTH.test(d.endDate))) problems.push(`${where}.endDate must be "YYYY-MM" or null`);
  if (typeof d.cosigned !== "boolean") problems.push(`${where}.cosigned must be true or false`);
  if (d.cosignerName !== null && !isShortText(d.cosignerName)) problems.push(`${where}.cosignerName must be text of at most ${LABEL_MAX_CHARS} characters, or null`);
}

function checkOwnItems(where: string, v: unknown, problems: string[]): void {
  if (!Array.isArray(v)) { problems.push(`${where} must be a list`); return; }
  if (v.length > OWN_ITEMS_MAX) problems.push(`${where} has ${v.length} items; at most ${OWN_ITEMS_MAX}`);
  v.forEach((x, i) => {
    if (typeof x !== "string" || x.length > OWN_ITEM_MAX_CHARS) problems.push(`${where}[${i}] must be text of at most ${OWN_ITEM_MAX_CHARS} characters`);
  });
}

function checkV2(f: Record<string, unknown>, problems: string[]): void {
  checkCommon(f, problems, PARENT_KEYS);
  if (isObj(f.client)) checkPay("client.pay", f.client.pay, problems);
  if (isObj(f.partner)) checkPay("partner.pay", f.partner.pay, problems);
  const parentIds = new Set((Array.isArray(f.parents) ? f.parents : []).map((p) => (isObj(p) ? String(p.personId) : "")));
  if (isObj(f.budget)) checkBudgetV2(f.budget, parentIds, problems);
  if (isObj(f.debts) && Array.isArray(f.debts.items)) {
    f.debts.items.forEach((d, i) => checkDebtV2(`debts.items[${i}]`, d, problems));
    if (!isAmount(f.debts.extraMonthly)) problems.push("debts.extraMonthly must be a number, not negative");
  }
  if (Array.isArray(f.existingCover)) f.existingCover.forEach((c, i) => {
    if (!isObj(c)) return;
    const w = `existingCover[${i}]`;
    if (!COVER_STATUS.has(c.status as CoverStatus)) problems.push(`${w}.status must be none, unsure or have`);
    else if (c.status === "none" && c.amount !== 0) problems.push(`${w}: status none means an amount of 0`);
    else if (c.status === "unsure" && c.amount !== null) problems.push(`${w}: status unsure means the amount is not captured (null)`);
    else if (c.status === "have" && !isAmount(c.amount)) problems.push(`${w}: status have needs an amount`);
  });
  if (!isObj(f.opener)) problems.push("opener is required");
  else {
    for (const k of ["worries", "dreams"]) {
      if (!Array.isArray(f.opener[k]) || !(f.opener[k] as unknown[]).every((x) => typeof x === "string")) problems.push(`opener.${k} must be a list of keys`);
    }
    checkOwnItems("opener.ownWorries", f.opener.ownWorries, problems);
    checkOwnItems("opener.ownDreams", f.opener.ownDreams, problems);
  }
  if (!Array.isArray(f.assets)) problems.push("assets must be a list");
  else f.assets.forEach((a, i) => {
    if (!isObj(a) || !ASSET_KINDS.has(a.kind as AssetKind) || !isAmount(a.value)) problems.push(`assets[${i}] must be { kind (a §6.4 kind), value (not negative) }`);
  });
}

function checkV1(f: Record<string, unknown>, problems: string[]): void {
  checkCommon(f, problems, PARENT_KEYS_V1);
  if (isObj(f.client) && !isNum(f.client.grossMonthly)) problems.push("client.grossMonthly must be a number");
  if (isObj(f.partner) && !isNum(f.partner.incomeMonthly)) problems.push("partner.incomeMonthly must be a number");
  if (isObj(f.budget)) {
    const b = f.budget;
    if (!Array.isArray(b.costs) || !b.costs.every((c) => isObj(c) && typeof c.label === "string" && isNum(c.monthly))) problems.push("budget.costs must be a list of { label, monthly }");
    for (const k of ["irregularAnnual", "housingPaymentMonthly", "savings"]) if (!isNum(b[k])) problems.push(`budget.${k} must be a number`);
    if (!HOUSING.has(b.housing as HousingKind)) problems.push("budget.housing must be mortgage, rent, contribution or own");
  }
}

/**
 * Validate unknown input as `LifeCaseFacts`. Version 2 is returned unchanged when valid. Version 1 is validated as
 * version 1, upgraded (`upgradeLifeCaseFacts`), and the upgrade is validated as version 2 (Section 3 §14.1). Anything
 * else throws `LifeCaseFactsError` listing every problem. Structural checks are shallow except where privacy is at
 * stake (parents, loved ones, health keys) and for the Section 3 parts (§14.3), where they are closed.
 */
export function validateLifeCaseFacts(input: unknown): LifeCaseFacts {
  const problems: string[] = [];
  for (const h of findHealthKeys(input)) problems.push(`health answer at ${h}; health answers live only in the intake row`);
  if (!isObj(input)) throw new LifeCaseFactsError(["facts must be an object", ...problems]);
  if (input.schemaVersion === 1) {
    checkV1(input, problems);
    if (problems.length) throw new LifeCaseFactsError(problems);
    return validateLifeCaseFacts(upgradeChecked(input as unknown as LifeCaseFactsV1));
  }
  if (input.schemaVersion !== 2) problems.push("schemaVersion must be 2 (or 1, which is upgraded on read)");
  else checkV2(input, problems);
  if (problems.length) throw new LifeCaseFactsError(problems);
  return input as unknown as LifeCaseFacts;
}

/* ------------------------------------------------------------------ the version-1 upgrade (§14.1) */

const PARENT_LINE_LABEL: Readonly<Record<ParentRelationship, string>> = {
  mother: "Mother", father: "Father", grandmother: "Grandmother", grandfather: "Grandfather",
  "mother-in-law": "Mother-in-law", "father-in-law": "Father-in-law", "other-elder": "A relative",
};

function debtTypeFromLabel(label: string): DebtType {
  if (/credit card/i.test(label)) return "credit-card";
  if (/hire purchase/i.test(label)) return "hire-purchase";
  if (/student/i.test(label)) return "student-loan";
  if (/\b(car|vehicle)\b/i.test(label)) return "car-loan";
  if (/personal|credit union/i.test(label)) return "personal";
  return "other";
}

/**
 * The care a version-1 parent was paid for today: the care level less the pension, when care had already started.
 * Version 1 had no budget line for it; it came from the care graph's first year. Read from the same rows.
 */
function v1CareShareToday(b: ProvenanceBuilder, p: ParentFactsV1, asOfYear: number): number {
  const age = parentAge(p, asOfYear);
  if ((p.careFromAge ?? age) > age) return 0;
  const tier = b.get<readonly { tier: number; monthly: number }[]>("core:ff.careGraph.careTiers")[p.careTier]!.monthly;
  const scpAge = (b.useNode("scp.eligibility").node as { age: number }).age;
  const off = p.receivesSCP && age >= scpAge ? b.num("core:ff.offsets.scpMonthly") : 0;
  return Math.max(0, tier - off);
}

function upgradeChecked(v1: LifeCaseFactsV1): LifeCaseFacts {
  const b = new ProvenanceBuilder();
  const problems: string[] = [];
  const bud = v1.budget;
  const quickStops = new Map(QUICK_GROUP.lines.filter((l) => l.stop && l.stop !== "mortgage").map((l) => [l.label, l.stop!]));
  let mortgageTagged = false;
  const costLines: BudgetLineFacts[] = bud.costs.map((c) => {
    const line: BudgetLineFacts = { label: c.label, amount: c.monthly, frequency: "monthly" };
    if (!mortgageTagged && bud.housing === "mortgage" && bud.housingPaymentMonthly > 0 && c.monthly === bud.housingPaymentMonthly) {
      mortgageTagged = true;
      return { ...line, stop: "mortgage" };
    }
    const stop = quickStops.get(c.label);
    return stop ? { ...line, stop } : line;
  });
  if (bud.housing === "mortgage" && bud.housingPaymentMonthly > 0 && !mortgageTagged) {
    problems.push("version 1 housingPaymentMonthly is not one of the cost lines, so the mortgage line cannot be found");
  }
  if (problems.length) throw new LifeCaseFactsError(problems);
  const group = (key: BudgetGroupKey, lines: BudgetLineFacts[]): BudgetGroupFacts => ({ key, skip: false, total: null, totalFrequency: null, lines });
  const groups: BudgetGroupFacts[] = [
    group("quick", costLines),
    group("yearly", bud.irregularAnnual > 0 ? [{ label: QUICK_YEARLY_LABEL, amount: bud.irregularAnnual, frequency: "yearly" }] : []),
    group("family", v1.parents.map((p) => ({
      label: PARENT_LINE_LABEL[p.relationship], amount: v1CareShareToday(b, p, v1.asOfYear), frequency: "monthly" as const, stop: "care" as const, personId: p.personId,
    }))),
  ];
  const { grossMonthly, ...client } = v1.client;
  const monthlyPay = (amount: number): PayFacts => ({ frequency: "monthly", amountPerPay: amount, varies: false, lowestMonthly: null });
  return {
    schemaVersion: 2,
    asOfYear: v1.asOfYear,
    client: { ...client, pay: monthlyPay(grossMonthly) },
    partner: v1.partner ? { personId: v1.partner.personId, ...(v1.partner.firstName !== undefined ? { firstName: v1.partner.firstName } : {}), age: v1.partner.age, pay: monthlyPay(v1.partner.incomeMonthly) } : null,
    children: v1.children,
    // careTier / careFromAge are kept as the future level; growth when a level was set.
    parents: v1.parents.map((p) => ({ ...p, growth: p.careTier > 0 })),
    // Build C: version 1 cash becomes one bank asset row; `budget.savings` is then 0 (assets are the one source).
    budget: { groups, housing: bud.housing, mortgage: bud.mortgage, savings: 0, roomPlan: null },
    debts: {
      items: v1.debts.items.map((d) => ({ ...d, type: debtTypeFromLabel(d.label), lender: null, endDate: null, cosigned: false, cosignerName: null })),
      extraMonthly: v1.debts.extraMonthly,
    },
    goals: v1.goals,
    existingCover: v1.existingCover.map((c) => ({ ...c, status: c.amount === null ? "unsure" as const : c.amount === 0 ? "none" as const : "have" as const })),
    wishes: v1.wishes,
    workPension: v1.workPension,
    opener: { worries: [], dreams: [], ownWorries: [], ownDreams: [] },
    assets: bud.savings > 0 ? [{ kind: "bank" as const, value: bud.savings }] : [],
    ...(v1.lovedOnes ? { lovedOnes: v1.lovedOnes } : {}),
    ...(v1.business ? { business: v1.business } : {}),
  };
}

/**
 * Section 3 §14.1: upgrade a version-1 case to version 2. Its cost lines become one `quick` group (the line equal to the
 * housing payment is tagged `stop: mortgage`), its once-a-year bills one `yearly` line, pay becomes monthly,
 * `careTier`/`careFromAge` are kept as the future level, and each parent's care share today becomes a Family you support
 * line. Throws `LifeCaseFactsError` when the input is not valid version 1.
 */
export function upgradeLifeCaseFacts(input: unknown): LifeCaseFacts {
  if (!isObj(input) || input.schemaVersion !== 1) throw new LifeCaseFactsError(["upgradeLifeCaseFacts takes version 1 facts"]);
  return validateLifeCaseFacts(input);
}

/** Parent age in `asOfYear`. Section 1 keeps birth year only, so this is the age the parent turns that year. */
export function parentAge(p: Pick<ParentFacts, "birthYear">, asOfYear: number): number {
  return asOfYear - p.birthYear;
}

/** A parent's sex as told by the relationship; null when it cannot be told ("other-elder"). */
export function parentSex(p: Pick<ParentFacts, "relationship">): Sex | null {
  if (p.relationship === "mother" || p.relationship === "grandmother" || p.relationship === "mother-in-law") return "female";
  if (p.relationship === "father" || p.relationship === "grandfather" || p.relationship === "father-in-law") return "male";
  return null;
}

/** The catalogue group for a key (the quick form included). */
export function catalogueGroup(key: BudgetGroupKey): (typeof BUDGET_CATALOGUE)[number] {
  return key === "quick" ? QUICK_GROUP : BUDGET_CATALOGUE.find((g) => g.key === key)!;
}
