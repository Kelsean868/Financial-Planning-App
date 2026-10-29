// Guards G1-G4 of the real-life-rates spec §6: the generated life rate table is the book, and only the book.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { LIFE_RATES } from "../src/parameters/tatil-life-rates-2026-10.ts";
import type { LifeRates } from "../src/parameters/tatil-life-rates-2026-10.ts";
import { rateChecksum, rateLine } from "../src/parameters/rate-checksum.ts";

const BOOK_PATH = "C:\\Projects\\General-Rater-Portal\\rates\\life\\life-rate-book.json";
const ISO = /^\d{4}-\d{2}-\d{2}$/;

interface Cell {
  readonly product: string;
  readonly slug: string;
  readonly series: string;
  readonly band: string;
  readonly anb: string;
  readonly rate: { readonly value: number; readonly status: string; readonly source: string; readonly asOf: string };
}

type LifeProduct = LifeRates["products"]["term"];

function productOf(table: LifeRates, key: string): LifeProduct {
  const p = (table.products as Record<string, LifeProduct | undefined>)[key];
  assert.ok(p, `the parameter table has no product "${key}"`);
  return p;
}

/** The slug of the variant the book calls `name`; the table is the only place the slug rule lives. */
function slugOfVariant(product: LifeProduct, name: string): string | undefined {
  return Object.keys(product.variants).find((s) => product.variants[s]?.name.value === name);
}

function cellsOf(table: LifeRates): Cell[] {
  const out: Cell[] = [];
  for (const [product, p] of Object.entries(table.products)) {
    for (const [slug, v] of Object.entries(p.variants)) {
      for (const [series, bands] of Object.entries(v.rates)) {
        for (const [band, anbs] of Object.entries(bands)) {
          for (const [anb, rate] of Object.entries(anbs)) out.push({ product, slug, series, band, anb, rate });
        }
      }
    }
  }
  return out;
}

const summarise = (cells: readonly Cell[]): { count: number; checksum: string } => ({
  count: cells.length,
  checksum: rateChecksum(cells.map((c) => rateLine(c.product, c.slug, c.series, c.band, c.anb, c.rate.value))),
});

/** The cells of the raw book, with each variant's slug read from the table (one slug rule, in the script only). */
function cellsOfBook(book: any, table: LifeRates): Cell[] {
  const out: Cell[] = [];
  for (const [product, p] of Object.entries<any>(book.products)) {
    const tableProduct = productOf(table, product);
    for (const [vname, v] of Object.entries<any>(p.variants)) {
      const slug = slugOfVariant(tableProduct, vname);
      assert.ok(slug, `book variant "${product}/${vname}" is not in the parameter table`);
      for (const [series, bands] of Object.entries<any>(v.rates)) {
        for (const [band, anbs] of Object.entries<any>(bands)) {
          for (const [anb, value] of Object.entries<number>(anbs)) {
            out.push({ product, slug, series, band, anb, rate: { value, status: "", source: "", asOf: "" } });
          }
        }
      }
    }
  }
  return out;
}

function guardChecksumAndCount(table: LifeRates): void {
  const { count, checksum } = summarise(cellsOf(table));
  assert.equal(count, table.meta.cellCount.value, `G1: table holds ${count} rate cells but meta.cellCount says ${table.meta.cellCount.value}`);
  assert.equal(checksum, table.meta.checksum.value, `G1: table checksum is ${checksum} but meta.checksum says ${table.meta.checksum.value}`);
}

function guardProvenance(table: LifeRates): void {
  for (const c of cellsOf(table)) {
    const at = `${c.product}/${c.slug}/${c.series}/${c.band}/${c.anb}`;
    assert.equal(c.rate.status, "verified", `G2: ${at} has status "${c.rate.status}", not "verified"`);
    assert.match(c.rate.asOf, ISO, `G2: ${at} has asOf "${c.rate.asOf}", not an ISO date`);
    assert.ok(c.rate.source.includes("harvested"), `G2: ${at} source "${c.rate.source}" does not say "harvested"`);
  }
}

function guardMissingAbsent(table: LifeRates): void {
  const missing = table.meta.missing.value;
  assert.ok(missing.length > 0, "G3: meta.missing is empty");
  for (const m of missing) {
    const product = productOf(table, m.product);
    const slug = slugOfVariant(product, m.variant);
    assert.ok(slug, `G3: missing entry names unknown variant "${m.product}/${m.variant}"`);
    const cells = product.variants[slug]?.rates[m.series]?.[String(m.band)] ?? {};
    for (const anb of m.anbs) {
      assert.ok(
        !(String(anb) in cells),
        `G3: ${m.product}/${m.variant}/${m.series}/band ${m.band} lists ANB ${anb} as missing but the table has a rate for it`,
      );
    }
  }
}

function guardHeldOutNotRates(table: LifeRates): void {
  const quoted = new Map<number, string>();
  for (const q of table.meta.heldOut.value) {
    for (const k of ["annual", "semi", "quarterly", "monthly"] as const) {
      const v = q[k];
      if (typeof v === "number") quoted.set(v, `${q.product}/${q.variant}/${q.series} ANB ${q.anb} ${k}`);
    }
  }
  assert.ok(quoted.size > 0, "G4: meta.heldOut carries no quote figures");
  for (const c of cellsOf(table)) {
    const hit = quoted.get(c.rate.value);
    assert.equal(hit, undefined, `G4: rate ${c.product}/${c.slug}/${c.series}/${c.band}/${c.anb} = ${c.rate.value} equals the held-out quote ${hit}`);
  }
}

/** A deep, unfrozen copy to break on purpose. */
const copyOf = (): any => structuredClone(LIFE_RATES);

function messageOf(fn: () => void): string {
  try {
    fn();
  } catch (e) {
    return (e as Error).message;
  }
  return "DID NOT FAIL";
}

test("G1 the table's own cell count and checksum equal meta.cellCount and meta.checksum", () => {
  guardChecksumAndCount(LIFE_RATES);
  assert.equal(LIFE_RATES.meta.checksum.value.length, 8);
});

test("G1 the table matches the book when the book is on this machine", (t) => {
  if (!existsSync(BOOK_PATH)) {
    t.skip("life-rate-book.json is in another repo and is not on this machine");
    return;
  }
  const book = JSON.parse(readFileSync(BOOK_PATH, "utf8"));
  const { count, checksum } = summarise(cellsOfBook(book, LIFE_RATES));
  assert.equal(count, LIFE_RATES.meta.cellCount.value, "G1: the book and meta.cellCount disagree on the cell count");
  assert.equal(checksum, LIFE_RATES.meta.checksum.value, "G1: the book and meta.checksum disagree on the checksum");
  assert.deepEqual(LIFE_RATES.meta.missing.value, book.missing);
  assert.deepEqual(LIFE_RATES.meta.heldOut.value, book.held_out);
});

test("G2 every rate cell is verified, has an ISO asOf and a source that says harvested", () => {
  guardProvenance(LIFE_RATES);
});

test("G3 no cell the book lists as missing carries a rate", () => {
  guardMissingAbsent(LIFE_RATES);
});

test("G4 no rate equals a held-out quote figure", () => {
  guardHeldOutNotRates(LIFE_RATES);
});

test("sabotage: each guard fails on a deliberately broken table", () => {
  const edited = copyOf();
  edited.products.term.variants.levelConvertibleTermTo65.rates["M-NS"]["2"]["36"].value += 0.001;
  assert.match(messageOf(() => guardChecksumAndCount(edited)), /^G1: table checksum is [0-9a-f]{8} but meta\.checksum says /);

  const unverified = copyOf();
  unverified.products.term.variants.levelConvertibleTermTo65.rates["M-NS"]["2"]["36"].status = "estimate";
  assert.match(messageOf(() => guardProvenance(unverified)), /^G2: term\/levelConvertibleTermTo65\/M-NS\/2\/36 has status "estimate"/);

  const filled = copyOf();
  const m = filled.meta.missing.value[0];
  const gap = filled.products[m.product].variants;
  const slug = Object.keys(gap).find((s) => gap[s].name.value === m.variant) as string;
  gap[slug].rates[m.series][String(m.band)][String(m.anbs[0])] = structuredClone(gap[slug].rates[m.series][String(m.band)][String(m.harvested[0])]);
  assert.match(messageOf(() => guardMissingAbsent(filled)), /^G3: wholeLife\/Whole Life\/F-NS\/band 2 lists ANB 20 as missing/);

  const quoted = copyOf();
  const q = quoted.meta.heldOut.value.find((h: { annual?: number }) => typeof h.annual === "number");
  quoted.products.term.variants.levelConvertibleTermTo65.rates["M-NS"]["2"]["36"].value = q.annual;
  assert.match(messageOf(() => guardHeldOutNotRates(quoted)), /^G4: rate term\/levelConvertibleTermTo65\/M-NS\/2\/36 = .* equals the held-out quote /);
});
