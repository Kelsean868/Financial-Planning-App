/**
 * `LifeCaseFacts`: the captured facts of one case, as stored in `life_cases.facts` (Section 1 §1.1)
 * and as the fact-finder engine reads them. Validated at the JS/TS seam before every write.
 *
 * Privacy rules enforced here (engine side):
 * - Guard 7: no free text on a parent. A parent has a closed key list; its only strings are an id,
 *   an enumerated relationship, an optional first name (a name, not a sentence) and an enumerated
 *   NIS status (run record R2).
 * - Guard 8: no health answer anywhere. A `healthFlag` or `healthNote` key at any depth fails.
 */
import { LifeCaseFactsError } from "./errors.ts";
import type { EducationRoute, CostLevel } from "./parameters/fact-finder-2026-10.ts";

export type Sex = "male" | "female";
export type Tristate = "yes" | "no" | "unknown";
export type CareTier = 0 | 1 | 2 | 3 | 4;
export type ParentRelationship =
  | "mother" | "father" | "grandmother" | "grandfather" | "mother-in-law" | "father-in-law" | "other-elder";
export type MilestoneKey = "vehicle" | "wedding" | "business" | "home";
export type HousingKind = "mortgage" | "rent" | "contribution" | "own";
export type GoalKind = "home" | "vehicle" | "study" | "business" | "own";
export type GoalRoute = "mortgage" | "cash" | "loan" | "save";

export interface ClientFacts {
  personId: string;
  firstName?: string;
  lastName?: string;
  /** Whole years. The page computes it from the date of birth; the engine reads no clock. */
  age: number;
  sex: Sex;
  /** Family history of long lives: plan five years longer. */
  longLived: boolean;
  grossMonthly: number;
  nisPaying: boolean;
  selfEmployed: boolean;
  /** Whether the client holds health insurance. Cover held, not a health answer (Section 2 §2.6). */
  hasHealthCover: Tristate;
}

export interface PartnerFacts {
  personId: string;
  firstName?: string;
  age: number;
  incomeMonthly: number;
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

/** Section 1 §1.5(d): birth year only, `careTier` 0–4, no free text, ever. */
export interface ParentFacts {
  personId: string;
  relationship: ParentRelationship;
  firstName?: string;
  birthYear: number;
  careTier: CareTier;
  /** Age care starts; defaults to the parent's current age. */
  careFromAge?: number;
  receivesSCP: boolean;
  /** 25 or more NIS contributions (the funeral grant test). */
  nisContributions: Tristate;
}

export interface CostLine { label: string; monthly: number }

export interface BudgetFacts {
  costs: CostLine[];
  irregularAnnual: number;
  housing: HousingKind;
  /** Rent, mortgage payment or contribution a month; it is also one of the cost lines. */
  housingPaymentMonthly: number;
  mortgage: { balance: number; yearsLeft: number; clearOnDeath: boolean } | null;
  savings: number;
}

export interface DebtFacts { label: string; balance: number; ratePct: number; minimumMonthly: number }

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

export interface CoverFacts {
  policyId: string;
  label: string;
  kind: "life" | "ci";
  group: boolean;
  /** null: not captured. Never read as zero (closing guard 2). */
  amount: number | null;
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

export interface LifeCaseFacts {
  schemaVersion: 1;
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

const PARENT_KEYS = new Set([
  "personId", "relationship", "firstName", "birthYear", "careTier", "careFromAge", "receivesSCP", "nisContributions",
]);
const PARENT_STRING_KEYS = new Set(["personId", "relationship", "firstName", "nisContributions"]);
const PARENT_RELATIONSHIPS = new Set<ParentRelationship>([
  "mother", "father", "grandmother", "grandfather", "mother-in-law", "father-in-law", "other-elder",
]);
const LOVED_ONE_KEYS = new Set(["personId", "firstName", "age", "relation"]);
const TRISTATE = new Set(["yes", "no", "unknown"]);

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

function checkPerson(where: string, p: Record<string, unknown>, problems: string[]): void {
  if (typeof p.personId !== "string" || !UUID_V4.test(p.personId)) problems.push(`${where}.personId must be a UUIDv4`);
  if (p.firstName !== undefined && (typeof p.firstName !== "string" || !FIRST_NAME.test(p.firstName))) {
    problems.push(`${where}.firstName must be one first name (letters, hyphen or apostrophe, at most 20 characters)`);
  }
}

/** Guard 7: a parent is a closed shape with no free text. */
function checkParent(where: string, p: unknown, problems: string[]): void {
  if (!isObj(p)) { problems.push(`${where} must be an object`); return; }
  for (const [k, v] of Object.entries(p)) {
    if (!PARENT_KEYS.has(k)) problems.push(`${where}.${k} is not allowed on a parent (no free text on a parent, ever)`);
    else if (typeof v === "string" && !PARENT_STRING_KEYS.has(k)) problems.push(`${where}.${k} must not be text`);
  }
  checkPerson(where, p, problems);
  if (!PARENT_RELATIONSHIPS.has(p.relationship as ParentRelationship)) problems.push(`${where}.relationship must be one of the listed labels`);
  if (!Number.isInteger(p.birthYear)) problems.push(`${where}.birthYear must be a whole year`);
  if (!Number.isInteger(p.careTier) || (p.careTier as number) < 0 || (p.careTier as number) > 4) problems.push(`${where}.careTier must be an integer 0–4`);
  if (p.careFromAge !== undefined && !Number.isInteger(p.careFromAge)) problems.push(`${where}.careFromAge must be a whole age`);
  if (typeof p.receivesSCP !== "boolean") problems.push(`${where}.receivesSCP must be true or false`);
  if (!TRISTATE.has(p.nisContributions as string)) problems.push(`${where}.nisContributions must be yes, no or unknown`);
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

/**
 * Validate unknown input as `LifeCaseFacts`. Returns the facts unchanged when valid; throws
 * `LifeCaseFactsError` listing every problem otherwise. Structural checks are deliberately
 * shallow except where privacy is at stake (parents, loved ones, health keys), where they are closed.
 */
export function validateLifeCaseFacts(input: unknown): LifeCaseFacts {
  const problems: string[] = [];
  for (const h of findHealthKeys(input)) problems.push(`health answer at ${h}; health answers live only in the intake row`);
  if (!isObj(input)) throw new LifeCaseFactsError(["facts must be an object", ...problems]);
  const f = input;
  if (f.schemaVersion !== 1) problems.push("schemaVersion must be 1");
  if (!Number.isInteger(f.asOfYear)) problems.push("asOfYear must be a whole year");

  if (!isObj(f.client)) problems.push("client is required");
  else {
    checkPerson("client", f.client, problems);
    for (const k of ["age", "grossMonthly"]) if (!isNum(f.client[k])) problems.push(`client.${k} must be a number`);
    if (!["male", "female"].includes(f.client.sex as string)) problems.push("client.sex must be male or female");
    if (!TRISTATE.has(f.client.hasHealthCover as string)) problems.push("client.hasHealthCover must be yes, no or unknown");
  }
  if (f.partner !== null) {
    if (!isObj(f.partner)) problems.push("partner must be an object or null");
    else {
      checkPerson("partner", f.partner, problems);
      if (!isNum(f.partner.age) || !isNum(f.partner.incomeMonthly)) problems.push("partner.age and partner.incomeMonthly must be numbers");
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
  if (Array.isArray(f.parents)) f.parents.forEach((p, i) => checkParent(`parents[${i}]`, p, problems));
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
  if (problems.length) throw new LifeCaseFactsError(problems);
  return input as unknown as LifeCaseFacts;
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
