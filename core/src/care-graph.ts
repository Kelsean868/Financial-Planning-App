/**
 * Module 7 — the care graph (care graph brief §2–§5, with Section 1's changes).
 *
 * careGraph(input) -> { years[], goals[], peak, sandwichYears, finishAge, funding, verdict, levers }
 *
 * Inflation comes only from the assumption set's rows: no spot rate is reachable from here
 * (guard 1). Parents are read by birth year (Section 1 §1.5(d)).
 */
import { ProvenanceBuilder } from "./provenance.ts";
import type { Provenance } from "./types.ts";
import { CareGraphInputError } from "./errors.ts";
import type { ChildFacts, ParentFacts, LifeCaseFacts, MilestoneKey, ParentRelationship } from "./life-case-facts.ts";
import { parentAge } from "./life-case-facts.ts";
import { splitBudget } from "./engine-facts.ts";
import type { RouteSpec, EducationRoute, CostLevel } from "./parameters/fact-finder-2026-10.ts";

/**
 * A parent on the care graph (Section 3 §1.3): today's care from the budget, then, when `growth` is true, the larger of
 * today's amount and the future level (`careTier` from `careFromAge`) less the pension.
 */
export interface CareParent extends ParentFacts {
  /** The budget's Family you support lines for this parent, a month, today. */
  readonly todayMonthly: number;
}

export interface CareGraphInput {
  readonly clientAge: number;
  readonly asOfYear: number;
  readonly children: readonly ChildFacts[];
  readonly parents: readonly CareParent[];
}

export interface CareYear {
  readonly yearIndex: number;
  readonly age: number;
  readonly eduMonthly: number;
  readonly parentMonthly: number;
  readonly lumpTotal: number;
  /** One-off lumps in this year (rendered as markers above the stack, never inside it). */
  readonly lumps: readonly string[];
  readonly isSandwich: boolean;
}

export type CareGoalKind = "edu" | "milestone" | "care";

export interface CareGoal {
  readonly key: string;
  readonly personId: string;
  /** Display name: the child's name or "Child A"; a parent's is "Your mother". */
  readonly who: string;
  readonly what: string;
  readonly kind: CareGoalKind;
  /** Present value today at the planning rate. */
  readonly presentValue: number;
  /** Years from now until the goal starts. */
  readonly start: number;
  /** start <= 1: a current budget line, no sinking fund (§2.1). */
  readonly current: boolean;
  /** Level monthly saving from today; 0 for a current line. */
  readonly monthlySaving: number;
  /** Care goals: years in which a net care cost is paid. */
  readonly yearsOn: number;
  /** Years the goal runs: study years in the plan, care years paid, 0 for a one-off lump. */
  readonly durationYears: number;
}

export type Verdict = "Comfortable" | "Tight but real" | "Something has to give" | "Not a savings problem";

export type LeverKind = "route-local" | "lean-cost" | "drop-milestone";

export interface Lever {
  readonly kind: LeverKind;
  readonly childId: string;
  readonly milestone?: MilestoneKey;
  readonly label: string;
  /** Reduction in `funding.saveFromToday`, a month. */
  readonly monthlyReduction: number;
}

export interface CareGraphResult {
  readonly years: readonly CareYear[];
  readonly goals: readonly CareGoal[];
  readonly peak: { readonly monthly: number; readonly atAge: number };
  readonly sandwichYears: number;
  readonly finishAge: number;
  readonly funding: {
    /** "Save from today": the monthly standing order, future goals only. */
    readonly saveFromToday: number;
    /** "Already paying": care and study costs in year 0, a month. */
    readonly alreadyPaying: number;
    /** "If you die tomorrow": PV of the whole graph, current and future. */
    readonly ifYouDieTomorrow: number;
  };
  /** Total care bill, nominal: every recurring month and lump, undiscounted. */
  readonly nominalTotal: number;
  /** (saveFromToday + alreadyPaying) / household net; null when no income was given. */
  readonly load: number | null;
  readonly verdict: Verdict | null;
  /** Every lever, highest value first. Computed only when the load is above the lever threshold. */
  readonly levers: readonly Lever[];
  /** The top two levers worth showing. */
  readonly topLevers: readonly Lever[];
  /** Each parent's care in year 0: the budget amount and the amount the graph uses (§1.3; Your people shows the first). */
  readonly parentsToday: readonly { readonly personId: string; readonly budgetMonthly: number; readonly graphMonthly: number }[];
  readonly provenance: Provenance;
}

const MILESTONE_NAMES: Record<MilestoneKey, string> = {
  vehicle: "First vehicle", wedding: "Wedding", business: "Business start", home: "Home deposit",
};

const PARENT_LABELS: Record<ParentRelationship, string> = {
  mother: "Your mother", father: "Your father", grandmother: "Your grandmother", grandfather: "Your grandfather",
  "mother-in-law": "Your mother-in-law", "father-in-law": "Your father-in-law", "other-elder": "Your elder",
};

export function childLabel(c: Pick<ChildFacts, "firstName">, index: number): string {
  return c.firstName && c.firstName.trim() ? c.firstName : `Child ${String.fromCharCode(65 + index)}`;
}

export function parentLabel(p: Pick<ParentFacts, "relationship">): string {
  return PARENT_LABELS[p.relationship];
}

/** The care graph input from the facts: each parent's care today is the sum of the budget lines with its personId (§1.3). */
export function careGraphInputFromFacts(facts: LifeCaseFacts): CareGraphInput {
  const today = splitBudget(new ProvenanceBuilder(), facts).parentToday;
  return {
    clientAge: facts.client.age, asOfYear: facts.asOfYear, children: facts.children,
    parents: facts.parents.map((p) => ({ ...p, todayMonthly: today.get(p.personId) ?? 0 })),
  };
}

interface Core {
  years: CareYear[];
  goals: CareGoal[];
  peak: { monthly: number; atAge: number };
  sandwichYears: number;
  finishAge: number;
  save: number;
  already: number;
  pv: number;
  nominal: number;
  parentsToday: { personId: string; budgetMonthly: number; graphMonthly: number }[];
}

function validate(b: ProvenanceBuilder, input: CareGraphInput, H: number): void {
  const minH = b.num("core:ff.careGraph.minimumHorizonYears");
  if (H < minH) throw new CareGraphInputError(`Horizon ${H} is under ${minH} years`);
  input.children.forEach((k, ix) => {
    if (k.route !== "none" && k.studyStartAge < k.age) {
      throw new CareGraphInputError(`${childLabel(k, ix)}: study starts at ${k.studyStartAge}, before the current age ${k.age}`);
    }
  });
  for (const p of input.parents) {
    const age = parentAge(p, input.asOfYear);
    if (p.careFromAge !== undefined && p.careFromAge < age) {
      throw new CareGraphInputError(`${parentLabel(p)}: care starts at ${p.careFromAge}, before the current age ${age}`);
    }
  }
}

/** The arithmetic, ported from the prototype's `model()` operation for operation so the goldens hold. */
function run(b: ProvenanceBuilder, input: CareGraphInput): Core {
  const i = b.num("core:ff.rates.inflation");
  const f = b.num("core:ff.rates.careBasket");
  const gt = b.num("core:ff.rates.foreignTuition");
  const r = b.num("core:ff.rates.planningReturn");
  const H = b.num("core:ff.careGraph.horizonYears");
  const careTo = b.num("core:ff.careGraph.careToParentAge");
  const currentMax = b.num("core:ff.careGraph.currentGoalMaxStart");
  const routes = b.get<Readonly<Record<EducationRoute, RouteSpec>>>("core:ff.careGraph.routes");
  const homeSupport = b.num("core:ff.careGraph.homeSupportMonthly");
  const tiers = b.get<readonly { tier: number; monthly: number }[]>("core:ff.careGraph.careTiers");
  const scp = b.num("core:ff.offsets.scpMonthly");
  const scpAge = (b.useNode("scp.eligibility").node as { age: number }).age;
  validate(b, input, H);

  const yrs = Array.from({ length: H + 1 }, (_, y) => ({
    age: input.clientAge + y, edu: 0, par: 0, lump: 0, kid: false, parOn: false, lumps: [] as string[],
  }));
  const disc = (v: number, y: number): number => v / Math.pow(1 + r, y);
  const goals: { key: string; personId: string; who: string; what: string; kind: CareGoalKind; pv: number; start: number; years: number }[] = [];

  input.children.forEach((k, ix) => {
    const who = childLabel(k, ix);
    const R = routes[k.route];
    const base = R[k.costLevel as CostLevel];
    const rate = R.foreign ? gt : i;
    let pv = 0;
    let start: number | null = null;
    let studyYears = 0;
    for (let j = 0; j < R.years; j++) {
      const y = k.studyStartAge + j - k.age;
      if (y < 0 || y > H) continue;
      const tu = base * Math.pow(1 + rate, y);
      const hm = R.home ? homeSupport * 12 * Math.pow(1 + f, y) : 0;
      yrs[y]!.edu += (tu + hm) / 12;
      yrs[y]!.kid = true;
      pv += disc(tu + hm, y);
      studyYears++;
      if (start === null) start = y;
    }
    if (start !== null) goals.push({ key: `${k.personId}:edu`, personId: k.personId, who, what: "degree", kind: "edu", pv, start, years: studyYears });
    for (const m of k.milestones) {
      if (!m.on) continue;
      const y = m.atAge - k.age;
      if (y < 0 || y > H) { b.caveat(`${who}'s ${MILESTONE_NAMES[m.key].toLowerCase()} falls outside the plan years and is not counted.`); continue; }
      const v = m.amountToday * Math.pow(1 + i, y);
      yrs[y]!.lump += v;
      yrs[y]!.kid = true;
      yrs[y]!.lumps.push(`${who} · ${MILESTONE_NAMES[m.key]}`);
      goals.push({ key: `${k.personId}:${m.key}`, personId: k.personId, who, what: MILESTONE_NAMES[m.key].toLowerCase(), kind: "milestone", pv: disc(v, y), start: y, years: 0 });
    }
  });

  const parentsToday: Core["parentsToday"] = [];
  for (const p of input.parents) {
    const age = parentAge(p, input.asOfYear);
    const from = p.careFromAge ?? age;
    const monthly = tiers[p.careTier]!.monthly;
    const today = p.todayMonthly;
    let pv = 0;
    let start: number | null = null;
    let yearsOn = 0;
    let graphToday = 0;
    // §1.3: today's budget amount (grown at the care basket rate) until the age chosen; then, if care will grow, the
    // larger of today's amount and the future level less the pension; stopping at 88. No care today and no growth: none.
    const first = today > 0 ? 0 : p.growth ? Math.max(0, from - age) : H + 1;
    for (let y = first; y <= H && age + y <= careTo; y++) {
      const todayY = today * Math.pow(1 + f, y);
      let nt = todayY;
      if (p.growth && y >= from - age) {
        const gross = monthly * Math.pow(1 + f, y);
        const off = p.receivesSCP && age + y >= scpAge ? scp * Math.pow(1 + i, y) : 0;
        nt = Math.max(todayY, Math.max(0, gross - off));
      }
      if (y === 0) graphToday = nt;
      yrs[y]!.par += nt;
      if (nt > 0) { yrs[y]!.parOn = true; yearsOn++; }
      pv += disc(12 * nt, y);
      if (start === null) start = y;
    }
    if (start !== null && pv > 0) {
      goals.push({ key: `${p.personId}:care`, personId: p.personId, who: parentLabel(p), what: "care", kind: "care", pv, start, years: yearsOn });
    }
    parentsToday.push({ personId: p.personId, budgetMonthly: today, graphMonthly: graphToday });
  }

  const rm = Math.pow(1 + r, 1 / 12) - 1;
  let save = 0;
  let pvTotal = 0;
  const out: CareGoal[] = goals.map((gl) => {
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
  const years: CareYear[] = yrs.map((Y, y) => {
    const rec = Y.edu + Y.par;
    if (rec > peak) { peak = rec; peakAge = Y.age; }
    if (Y.kid && Y.parOn) sandwich++;
    if (rec > 0 || Y.lump > 0) finish = Y.age;
    nominal += 12 * rec + Y.lump;
    return { yearIndex: y, age: Y.age, eduMonthly: Y.edu, parentMonthly: Y.par, lumpTotal: Y.lump, lumps: Y.lumps, isSandwich: Y.kid && Y.parOn };
  });
  return {
    years, goals: out, peak: { monthly: peak, atAge: peakAge }, sandwichYears: sandwich, finishAge: finish,
    save, already: yrs[0]!.edu + yrs[0]!.par, pv: pvTotal, nominal, parentsToday,
  };
}

/** Apply one lever to a copy of the input. Pure: the original is untouched. */
export function applyLever(input: CareGraphInput, lever: Pick<Lever, "kind" | "childId" | "milestone">): CareGraphInput {
  const children = input.children.map((k) => {
    if (k.personId !== lever.childId) return k;
    if (lever.kind === "route-local") return { ...k, route: "local" as const };
    if (lever.kind === "lean-cost") return { ...k, costLevel: "lean" as const };
    return { ...k, milestones: k.milestones.map((m) => (m.key === lever.milestone ? { ...m, on: false } : m)) };
  });
  return { ...input, children };
}

function verdictFor(b: ProvenanceBuilder, load: number): Verdict {
  const bands = b.get<readonly { upTo: number | null; verdict: Verdict }[]>("core:ff.careGraph.verdictBands");
  return bands.find((x) => x.upTo === null || load <= x.upTo)!.verdict;
}

/**
 * Run the care graph. `householdNetMonthly` sets the load and verdict; levers are computed by
 * counterfactual (clone, apply one change, re-run) when the load is above the lever threshold.
 */
export function careGraph(input: CareGraphInput, householdNetMonthly?: number): CareGraphResult {
  const b = new ProvenanceBuilder();
  const core = run(b, input);
  b.rule("goals starting within a year are current budget lines; later goals are funded by a level monthly saving");
  let load: number | null = null;
  let verdict: Verdict | null = null;
  let levers: Lever[] = [];
  if (householdNetMonthly !== undefined && householdNetMonthly > 0) {
    load = (core.save + core.already) / householdNetMonthly;
    verdict = verdictFor(b, load);
    if (load > b.num("core:ff.careGraph.leverShownAboveLoad")) {
      const scratch = new ProvenanceBuilder();
      const delta = (lever: Omit<Lever, "monthlyReduction" | "label">): number => core.save - run(scratch, applyLever(input, lever)).save;
      input.children.forEach((k, ix) => {
        const who = childLabel(k, ix);
        if (k.route !== "local" && k.route !== "none") {
          const l = { kind: "route-local" as const, childId: k.personId };
          levers.push({ ...l, label: `Send ${who} locally`, monthlyReduction: delta(l) });
        }
        if (k.costLevel !== "lean" && k.route !== "none") {
          const l = { kind: "lean-cost" as const, childId: k.personId };
          levers.push({ ...l, label: `${who}: lean cost level`, monthlyReduction: delta(l) });
        }
        for (const m of k.milestones) {
          if (!m.on) continue;
          const l = { kind: "drop-milestone" as const, childId: k.personId, milestone: m.key };
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
    parentsToday: core.parentsToday,
    provenance: b.build(),
  };
}
