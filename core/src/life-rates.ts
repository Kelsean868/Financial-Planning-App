/**
 * Tatil's harvested life rates, read from `core:lifeRates` (spec 2026-10-29-real-life-rates-design.md).
 *
 * One place does the premium arithmetic for the whole engine, so the quick quote and the close cannot
 * disagree:
 *
 *   yearly  = band rate per $1,000 x cover / 1,000 + the annual fee   (Rest Assured II: no fee)
 *   monthly = yearly x 0.0858                                          (semi 0.5125, quarterly 0.2585)
 *
 * Rates are keyed by age next birthday (ANB). Between two harvested ANBs the rate per $1,000 follows a
 * straight line. Outside the harvested grid, or in a cell nobody harvested, the figure falls back to the
 * SAMPLE curve (or, for Rest Assured II, to the two quoted ApplyOn rates) and is labelled `estimate` with
 * the reason — the fact-finder must still show a plan, which is where this differs on purpose from the
 * portal's `life-rates.js`, which refuses (spec R10). Past a product's maximum issue age there is no
 * premium at all.
 *
 * Rounding follows `life-rates.js` to the cent: the yearly figure is rounded, the minimum premium is then
 * applied, and the modal figure is rounded again, half to even (spec §5.4).
 */
import { ProvenanceBuilder } from "./provenance.ts";
import { coreGroupKeys } from "./parameters/index.ts";
import type { ProductId, ProductSpec } from "./parameters/tatil-products-2026-10.ts";
import type { RestAssuredAnchor } from "./parameters/fact-finder-2026-10.ts";
import type { Sex } from "./life-case-facts.ts";

/** The engine's premium kinds. `rest-assured` was added with the rate book (spec decision 3). */
export type RateKind = "term" | "whole-life" | "ci" | "rest-assured";

/** The kinds that have a SAMPLE fallback curve; Rest Assured II falls back to its quoted rates instead. */
export type SampleKind = "term" | "whole-life" | "ci";

/** What the rate tables are keyed by, beyond cover and age. */
export interface Rating {
  /** Null when it cannot be told: the male rate (the higher one) is used, with a caveat. */
  readonly sex: Sex | null;
  /** Null when the nicotine question was not answered: non-smoker rates, with a caveat. */
  readonly smoker: boolean | null;
  /** Who, for the caveat. */
  readonly who: string;
}

export interface PremiumQuote {
  /** Null only when the age next birthday is past the product's maximum issue age. */
  readonly yearly: number | null;
  readonly monthly: number | null;
  readonly ratePer1000: number | null;
  readonly band: number | null;
  /** "verified" when the rate came from the book; "estimate" from a fallback. */
  readonly basis: "verified" | "estimate";
  /** True when Tatil's minimum premium bound. The cover stays as asked (fence F2). */
  readonly minApplied: boolean;
  /** Why there is no premium, or why it is a fallback. Null when the book priced it. */
  readonly reason: string | null;
  /** The arithmetic in words, for the run record and the portal's parity test. */
  readonly working: string;
}

/** Which product and variant in the book each kind prices against (spec §5.3). */
interface BookRef {
  readonly product: string;
  readonly variant: string;
  readonly productId: ProductId;
}

const BOOK: Readonly<Record<RateKind, BookRef>> = Object.freeze({
  term: { product: "term", variant: "levelConvertibleTermTo65", productId: "term" },
  "whole-life": { product: "wholeLife", variant: "wholeLife", productId: "whole-life" },
  ci: { product: "lifespanGold", variant: "toAge65", productId: "life-span-gold" },
  "rest-assured": { product: "restAssured", variant: "paymentToAge100", productId: "rest-assured-ii" },
});

const SAMPLE_PATHS: Readonly<Record<SampleKind, readonly [string, string]>> = Object.freeze({
  term: ["core:ff.premiumRates.termPer1000", "core:ff.premiumRates.termAgeGrowth"],
  "whole-life": ["core:ff.premiumRates.wholeLifePer1000", "core:ff.premiumRates.wholeLifeAgeGrowth"],
  ci: ["core:ff.premiumRates.ciPer1000", "core:ff.premiumRates.ciAgeGrowth"],
});

interface CoverBand {
  readonly band: number;
  readonly from: number;
  readonly to: number | null;
}

/* --------------------------------------------------------------- arithmetic helpers */

/**
 * Cents, half to even — ApplyOn's rule, and the reason the parity cases land on the cent.
 * The tolerance absorbs float noise such as 1481.1249999 (copied from `life-rates.js`).
 */
export function cents(x: number): number {
  const y = x * 100;
  const f = Math.floor(y);
  const d = y - f;
  if (Math.abs(d - 0.5) < 1e-6) return (f % 2 === 0 ? f : f + 1) / 100;
  return Math.round(y) / 100;
}

const money = (x: number): string => `$${x.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
const whole = (x: number): string => `$${Math.round(x).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
const rateText = (r: number): string => `$${(Math.round(r * 10000) / 10000).toFixed(4)}`;

/* --------------------------------------------------------------- the fallback curves */

/**
 * The SAMPLE monthly rate per $1,000 at an age next birthday. Fallback only: it prices a cell the rate
 * book has not harvested. Before the rate book these curves priced everything (Section 2 §2.5).
 */
export function ratePer1000(b: ProvenanceBuilder, kind: SampleKind, anb: number): number {
  const [base, growth] = SAMPLE_PATHS[kind];
  return b.num(base) * Math.pow(b.num(growth), anb - b.num("core:ff.premiumRates.baseAge"));
}

/**
 * Rest Assured II's monthly rate per $1,000 from the two quoted ApplyOn rates, moved by the estimated age
 * factor. Fallback only: ANB 71 to 80 sits past the harvested grid, and the two quotes themselves are at
 * rated ages 72 and 67 (spec R3).
 */
export function restAssuredAnchorPer1000(b: ProvenanceBuilder, anb: number, sex: Sex | null): number {
  const anchor = restAssuredAnchor(b, sex);
  const years = anb - anchor.ratedAge;
  return years === 0 ? anchor.per1000 : anchor.per1000 * Math.pow(b.num("core:ff.premiumRates.restAssuredAgeGrowth"), years);
}

function restAssuredAnchor(b: ProvenanceBuilder, sex: Sex | null): RestAssuredAnchor {
  return b.get<RestAssuredAnchor>(
    sex === "female" ? "core:ff.premiumRates.restAssuredFemale" : "core:ff.premiumRates.restAssuredMale",
  );
}

/**
 * Whether this is one of the two ages ApplyOn actually quoted (male rated 72, female rated 67). At those
 * ages the fallback is not an estimate at all — it is the quote itself, so it carries no estimate caveat.
 */
function isQuotedRestAssuredAge(b: ProvenanceBuilder, anb: number, sex: Sex | null): boolean {
  return restAssuredAnchor(b, sex).ratedAge === anb;
}

/* --------------------------------------------------------------- the book lookup */

function seriesFor(b: ProvenanceBuilder, kind: RateKind, rating: Rating): string {
  const sexKey = rating.sex === "female" ? "F" : "M";
  if (rating.sex === null) {
    // Rest Assured II keeps the wording it has carried since the two quotes were added (fix run 3).
    b.caveat(kind === "rest-assured"
      ? `${rating.who}: sex not known, so Rest Assured II is priced on the male rate (the higher one).`
      : `${rating.who}: sex not known, so the rate is the male one (the higher).`);
  }
  if (kind === "rest-assured") {
    b.rule("Rest Assured II has no smoker rates: one rate for everyone.");
    return `${sexKey}-NS`;
  }
  if (rating.smoker === null) b.caveat("Non-smoker rates — ask if they smoke.");
  return `${sexKey}-${rating.smoker === true ? "S" : "NS"}`;
}

function bandFor(b: ProvenanceBuilder, product: string, cover: number): CoverBand | null {
  const bands = b.get<readonly CoverBand[]>(`core:lifeRates.products.${product}.bands`);
  for (const x of bands) {
    if (cover >= x.from && (x.to === null || cover <= x.to)) return x;
  }
  return null;
}

interface RateHit {
  readonly rate: number;
  /** How the rate was reached, for `working`. Empty when the cell was harvested exactly. */
  readonly how: string;
  /** Years between the two harvested ages a straight line crossed; 0 for an exact cell. */
  readonly gap: number;
}

/** No rate: either the table is empty, or the ANB is outside it (the harvested ends are given). */
interface RateMiss {
  readonly grid: readonly [number, number] | null;
}

const isMiss = (x: RateHit | RateMiss): x is RateMiss => "grid" in x;

/**
 * The rate per $1,000 a year at this ANB: the harvested cell, or a straight line between the two nearest
 * harvested ANBs. Never extrapolated — past either end this is a miss, and the caller falls back.
 */
function rateAt(b: ProvenanceBuilder, base: string, anb: number): RateHit | RateMiss {
  const ages = coreGroupKeys(base).map(Number).sort((x, y) => x - y);
  if (ages.length === 0) return { grid: null };
  if (ages.includes(anb)) return { rate: b.num(`${base}.${anb}`), how: "", gap: 0 };
  let lo: number | null = null;
  let hi: number | null = null;
  for (const a of ages) {
    if (a < anb) lo = a;
    else if (a > anb && hi === null) hi = a;
  }
  if (lo === null || hi === null) return { grid: [ages[0]!, ages[ages.length - 1]!] };
  const rLo = b.num(`${base}.${lo}`);
  const rHi = b.num(`${base}.${hi}`);
  const rate = rLo + (rHi - rLo) * (anb - lo) / (hi - lo);
  return {
    rate,
    how: `ANB ${anb} between ${lo} (${rateText(rLo)}) and ${hi} (${rateText(rHi)}): `,
    gap: hi - lo,
  };
}

/* --------------------------------------------------------------- the quote */

function fallbackQuote(
  b: ProvenanceBuilder, kind: RateKind, cover: number, anb: number, rating: Rating, reason: string,
): PremiumQuote {
  const quoted = kind === "rest-assured" && isQuotedRestAssuredAge(b, anb, rating.sex);
  if (quoted) {
    b.rule(`Rest Assured II at ANB ${anb} is the ApplyOn quote for that exact age: ${reason}`);
  } else {
    b.caveat(kind === "rest-assured"
      ? `Rest Assured II is priced from the two quoted ApplyOn rates moved by an age factor: ${reason}.`
      : `Sample rates, not Tatil's: ${reason}.`);
  }
  const which = kind === "rest-assured"
    ? (quoted ? "the ApplyOn quote for this age" : "the two quoted ApplyOn rates and the age factor")
    : "the SAMPLE curve";
  const per1000 = kind === "rest-assured"
    ? restAssuredAnchorPer1000(b, anb, rating.sex)
    : ratePer1000(b, kind, anb);
  const monthly = cover * per1000 / 1000;
  return Object.freeze({
    yearly: null, monthly, ratePer1000: per1000, band: null,
    basis: quoted ? ("verified" as const) : ("estimate" as const), minApplied: false, reason,
    working: `${which}: ${rateText(per1000)} per $1,000 a month x ${cover / 1000} = ${money(monthly)} / mth (${reason})`,
  });
}

/**
 * The full premium working for an amount of cover at an age next birthday.
 *
 * Callers that build a plan item have already asked `canIssue`; the maximum-issue-age branch here is the
 * backstop that keeps a price off the screen when they have not (spec §5.4 step 1).
 */
export function premiumQuote(
  b: ProvenanceBuilder, kind: RateKind, cover: number, anb: number, rating: Rating,
): PremiumQuote {
  const ref = BOOK[kind];
  const vPath = `core:lifeRates.products.${ref.product}.variants.${ref.variant}`;
  const name = b.get<string>(`core:lifeRates.products.${ref.product}.name`);
  const maxIssue = b.get<number | null>(`${vPath}.maxIssueAnb`);

  if (maxIssue !== null && anb > maxIssue) {
    const reason = "Not available at this age";
    b.rule(`${rating.who}: ${name} is not issued at ANB ${anb} (Tatil's maximum issue age is ANB ${maxIssue})`);
    return Object.freeze({
      yearly: null, monthly: null, ratePer1000: null, band: null,
      basis: "verified" as const, minApplied: false, reason,
      working: `${name}: ${reason} (maximum issue age ANB ${maxIssue})`,
    });
  }

  const series = seriesFor(b, kind, rating);
  const band = bandFor(b, ref.product, cover);
  if (band === null) {
    return fallbackQuote(b, kind, cover, anb, rating, `${whole(cover)} falls between two rate bands`);
  }

  const hit = rateAt(b, `${vPath}.rates.${series}.${band.band}`, anb);
  if (isMiss(hit)) {
    const where = `${name}, ${series}, band ${band.band}`;
    const reason = hit.grid === null
      ? `${where} has not been harvested yet`
      : `ANB ${anb} is outside the harvested ages (${hit.grid[0] === hit.grid[1] ? `only ANB ${hit.grid[0]}` : `ANB ${hit.grid[0]}-${hit.grid[1]}`}) for ${where}`;
    return fallbackQuote(b, kind, cover, anb, rating, reason);
  }
  if (hit.gap > 5) {
    b.caveat(`Straight line across a ${hit.gap}-year gap in the harvested ages: rougher than usual.`);
  }

  const fee = b.num(`core:lifeRates.products.${ref.product}.feeAnnual`);
  const minAnnual = b.get<number | null>(`core:lifeRates.products.${ref.product}.minPremiumAnnual`);
  let yearly = cents(hit.rate * cover / 1000 + fee);
  let working = `${hit.how}${rateText(hit.rate)} per $1,000 x ${cover / 1000}${fee ? ` + ${whole(fee)} fee` : ""} = ${money(yearly)} / yr`;
  let minApplied = false;
  if (minAnnual !== null && yearly < minAnnual) {
    minApplied = true;
    b.caveat(`Below Tatil's minimum premium: raised to ${money(minAnnual)} a year. The cover stays at ${whole(cover)}.`);
    working += `; raised to the ${money(minAnnual)} minimum`;
    yearly = minAnnual;
  }
  const factor = b.num("core:lifeRates.meta.modal.monthly");
  const monthly = cents(yearly * factor);
  working += `; x ${factor} = ${money(monthly)} / mth`;

  return Object.freeze({
    yearly, monthly, ratePer1000: hit.rate, band: band.band,
    basis: "verified" as const, minApplied, reason: null, working,
  });
}

/* --------------------------------------------------------------- the inversion */

/**
 * The cover a monthly premium buys (spec §5.6).
 *
 * The $360 fee and the cover bands make this non-monotone: term, male, ANB 36, non-smoker costs $262.23 a
 * month at $499,999 and $175.66 at $500,000, because the higher band is cheaper per $1,000. So the cover is
 * worked out in every band, only the answers that land inside their own band survive, each survivor is
 * re-priced to prove it fits the budget, and the largest one wins.
 */
export function coverForPremium(
  b: ProvenanceBuilder, kind: RateKind, monthly: number, anb: number, rating: Rating,
): number {
  const ref = BOOK[kind];
  const vPath = `core:lifeRates.products.${ref.product}.variants.${ref.variant}`;
  const spec = b.get<ProductSpec>(`core:products.${ref.productId}`);
  const name = b.get<string>(`core:lifeRates.products.${ref.product}.name`);
  const maxIssue = b.get<number | null>(`${vPath}.maxIssueAnb`);
  if (monthly <= 0) return 0;
  if (maxIssue !== null && anb > maxIssue) {
    b.rule(`${rating.who}: ${name} is not issued at ANB ${anb}, so no budget buys cover`);
    return 0;
  }

  const minAnnual = b.get<number | null>(`core:lifeRates.products.${ref.product}.minPremiumAnnual`);
  const factor = b.num("core:lifeRates.meta.modal.monthly");
  if (minAnnual !== null && monthly + 0.005 < cents(minAnnual * factor)) {
    b.caveat(`A budget of ${money(monthly)} a month is under ${name}'s minimum premium of ${money(cents(minAnnual * factor))} a month, so it buys no cover.`);
    return 0;
  }

  const series = seriesFor(b, kind, rating);
  const bands = b.get<readonly CoverBand[]>(`core:lifeRates.products.${ref.product}.bands`);
  const fee = b.num(`core:lifeRates.products.${ref.product}.feeAnnual`);
  const minCover = spec.cover?.min ?? 0;
  const maxCover = spec.cover?.max ?? Infinity;
  const yearly = monthly / factor;

  let best = 0;
  let sawBand = false;
  let underMinCover = 0;
  for (const band of bands) {
    const hit = rateAt(b, `${vPath}.rates.${series}.${band.band}`, anb);
    if (isMiss(hit)) continue;
    sawBand = true;
    const cover = Math.floor((yearly - fee) / hit.rate * 1000);
    if (cover <= 0) continue;
    if (cover < band.from || (band.to !== null && cover > band.to)) continue;
    if (cover > maxCover) continue;
    if (cover < minCover) { underMinCover = Math.max(underMinCover, cover); continue; }
    const priced = premiumQuote(b, kind, cover, anb, rating).monthly;
    if (priced === null || priced > monthly + 0.005) continue;
    best = Math.max(best, cover);
  }

  if (!sawBand) {
    // No harvested band at this age: the SAMPLE inversion, exactly as before the rate book.
    b.caveat(`Sample rates, not Tatil's: ${name} has no harvested rate at ANB ${anb}.`);
    const per1000 = kind === "rest-assured"
      ? restAssuredAnchorPer1000(b, anb, rating.sex)
      : ratePer1000(b, kind, anb);
    return per1000 > 0 ? monthly / per1000 * 1000 : 0;
  }
  if (best === 0 && underMinCover > 0) {
    const needs = premiumQuote(b, kind, minCover, anb, rating).monthly;
    b.caveat(`${money(monthly)} a month buys ${whole(underMinCover)}, under ${name}'s minimum cover of ${whole(minCover)}; that needs about ${needs === null ? "more" : money(needs)} a month.`);
  }
  return best;
}
