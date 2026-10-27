import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".ts") ? [p] : [];
  });
}

// Deviation from the brief: `import.meta.url` on Windows yields a
// `file:///C:/...` URL. `.pathname.replace(...)` hand-stripping is fragile
// there; `fileURLToPath` is the platform-correct way to turn a file URL into
// an OS path on both POSIX and Windows.
const SRC = fileURLToPath(new URL("../src", import.meta.url));
const files = walk(SRC);

test("the core reads no clock and rolls no dice — determinism is auditability", () => {
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    assert.ok(!/Date\.now\(\)/.test(src), `${f} must not call Date.now() — pass dates in`);
    assert.ok(!/Math\.random\(\)/.test(src), `${f} must not call Math.random()`);
    assert.ok(!/new Date\(\s*\)/.test(src), `${f} must not construct an empty Date()`);
  }
});

test("the core performs no I/O", () => {
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    assert.ok(!/from ["']node:fs["']/.test(src), `${f} must not import node:fs`);
    assert.ok(!/\bfetch\s*\(/.test(src), `${f} must not call fetch()`);
    assert.ok(!/console\.(log|warn|error)/.test(src), `${f} must not log — return caveats instead`);
  }
});

/**
 * The core depends on `parameters/` and on nothing else in the repo. `graphify-out/`,
 * `research/` and `tools/` are working material — generated graphs, source notes and
 * scripts. An import from any of them would make the engine's numbers depend on
 * artefacts that are not the single source of truth, and would drag I/O-shaped code
 * into a domain core that must stay pure.
 *
 * Matched against RAW source, not `codeOnly`: string-stripping blanks the module
 * specifier, which is the whole thing being tested here.
 */
const FORBIDDEN_IMPORT = /\bfrom\s*["'][^"']*\b(graphify-out|research|tools)\//;

test("the core imports nothing from graphify-out/, research/ or tools/", () => {
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    const hit = src.match(FORBIDDEN_IMPORT);
    assert.ok(!hit, `${f} imports from ${hit?.[1]}/ — the core may only depend on parameters/`);
  }
});

test("the forbidden-import guard actually catches a violation", () => {
  // A guard that cannot fail is not a guard.
  assert.ok(FORBIDDEN_IMPORT.test('import { g } from "../../graphify-out/graph.js";'),
    "must catch an import from graphify-out/");
  assert.ok(FORBIDDEN_IMPORT.test("import x from '../../research/factfinder-analysis.ts';"),
    "must catch an import from research/");
  assert.ok(FORBIDDEN_IMPORT.test('import { t } from "../../tools/ocr.js";'),
    "must catch an import from tools/");
  assert.ok(!FORBIDDEN_IMPORT.test('import { P } from "../../parameters/tt-parameters.js";'),
    "must NOT trip on the one dependency the core is allowed");
  assert.ok(!FORBIDDEN_IMPORT.test('// see research/factfinder-analysis.md for the formula'),
    "must NOT trip on prose citing a research document");
});

/**
 * Strip string literals BEFORE comments, then strip comments.
 * Prose LEGITIMATELY mentions these numbers — "group life reduces by 50% at 66
 * and terminates at 70" is documentation, not a hardcoded parameter. Only
 * executable code counts. (Caught during Task 3: the naive raw-source grep
 * failed on that exact doc-comment.)
 *
 * Order matters: a `//` inside a string literal (e.g. a URL in an error message)
 * is not a comment. Blanking strings first means the comment regexes only ever
 * see real comments. Doing it the other way round — comments first — lets a
 * `//` inside a string blind everything after it on the line, including real
 * code. Running string-stripping first is safe even for a string that happens
 * to sit inside a comment: it gets blanked either way, and the comment strip
 * still removes the (now-blanked) comment text around it.
 */
function codeOnly(src: string): string {
  return src
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')     // double-quoted strings
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")     // single-quoted strings
    .replace(/`(?:[^`\\]|\\.)*`/g, stripTemplateProse) // template literals
    .replace(/\/\*[\s\S]*?\*\//g, " ")       // block comments
    .replace(/\/\/.*$/gm, " ");              // line comments
}

/**
 * Blank a template literal's literal text but keep `${...}` interpolations —
 * a hardcoded parameter can be written as `${f(3000)}`, and that 3000 is code,
 * not prose. This is a simple bracket-depth scanner rather than a regex
 * because `${...}` can itself contain nested braces (e.g. an object literal);
 * a regex for balanced braces is the kind of clever that becomes unreadable.
 */
function stripTemplateProse(literal: string): string {
  let out = "`";
  let i = 1; // skip the opening backtick
  while (i < literal.length - 1) { // stop before the closing backtick
    if (literal[i] === "$" && literal[i + 1] === "{") {
      let depth = 1;
      let j = i + 2;
      while (j < literal.length && depth > 0) {
        if (literal[j] === "{") depth++;
        else if (literal[j] === "}") depth--;
        j++;
      }
      out += literal.slice(i, j); // keep the interpolation verbatim
      i = j;
    } else {
      i++; // drop the prose character
    }
  }
  return out + "`";
}

/**
 * The core parameter tables and the sample fixtures ARE where numbers live; every other file in
 * `src/` must read them. Only these two directories are exempt from the hard-coded-number guard.
 */
const DATA_DIRS = [join(SRC, "parameters"), join(SRC, "samples")];
const isDataFile = (f: string): boolean => DATA_DIRS.some((d) => f.startsWith(d + sep));
const engineFiles = files.filter((f) => !isDataFile(f));

test("only src/parameters/ and src/samples/ are exempt from the hard-coded-number guard", () => {
  const exempt = files.filter(isDataFile).map((f) => relative(SRC, f).split(sep)[0]);
  assert.deepEqual([...new Set(exempt)].sort(), ["parameters", "samples"]);
  assert.ok(engineFiles.length >= 20, `${engineFiles.length} engine files are scanned`);
});

test("no T&T parameter is hardcoded outside the parameters module", () => {
  const FORBIDDEN = [
    ["3000", "the NIS minimum pension"],
    ["13600", "the insurable earnings ceiling"],
    ["60000", "the combined deduction cap"],
    ["90000", "the personal allowance"],
    ["566.72", "a NIS benefit rate"],
    ["335.83", "a STALE NIS benefit rate"],
    ["120", "the rental-income replacement months"],
    ["66", "the group life reduction age"],
    ["70", "the group life termination age"],
  ] as const;
  for (const f of engineFiles) {
    const code = codeOnly(readFileSync(f, "utf8"));
    for (const [num, what] of FORBIDDEN) {
      assert.ok(!new RegExp(`\\b${num.replace(".", "\\.")}\\b`).test(code),
        `${f} hardcodes ${num} (${what}) in executable code — import it from parameters/tt-parameters.js instead`);
    }
  }
});

test("the hardcoded-parameter guard actually catches a violation", () => {
  // A guard that cannot fail is not a guard. Prove it fires on code and
  // stays quiet on prose.
  assert.ok(/\b3000\b/.test(codeOnly("const minPension = 3000;")),
    "must catch a hardcoded parameter in code");
  assert.ok(!/\b3000\b/.test(codeOnly("// the minimum pension is 3000/month")),
    "must NOT trip on a line comment");
  assert.ok(!/\b66\b/.test(codeOnly("/** reduces by 50% at 66 and ends at 70 */")),
    "must NOT trip on a block comment");
  assert.ok(!/\b3000\b/.test(codeOnly('const msg = "minimum is 3000";')),
    "must NOT trip on a string literal");
  assert.ok(/\b3000\b/.test(codeOnly('const label = "see http://x"; const minPension = 3000;')),
    "a // inside a string must not blind the rest of the line");
  assert.ok(/\b3000\b/.test(codeOnly("const x = `${f(3000)}`;")),
    "code inside a template interpolation must still be scanned");
});

/* ------------------------------------------------------------------------------------------
 * Section 1 guard 6 (review finding F2): the engine imports nothing but itself and the root
 * parameter table, and touches no network, storage, environment or UI. Every probe the Phase 0a
 * review found uncaught is listed below and sabotage-tested in the run record.
 * ---------------------------------------------------------------------------------------- */

const PARAMETERS_FILE = resolve(SRC, "..", "..", "parameters", "tt-parameters.js");

/** Every module specifier in a source file: static, export-from, side-effect, dynamic, require. */
export function specifiers(src: string): string[] {
  const out: string[] = [];
  const patterns = [
    /\bfrom\s*["']([^"']+)["']/g,
    /^\s*import\s*["']([^"']+)["']/gm,
    /\bimport\s*\(\s*["'`]([^"'`]+)["'`]/g,
    /\brequire\s*\(\s*["'`]([^"'`]+)["'`]/g,
  ];
  for (const re of patterns) for (const m of src.matchAll(re)) out.push(m[1]!);
  return out;
}

function classify(spec: string): string {
  if (/supabase/i.test(spec)) return "a Supabase client";
  if (/General-Rater-Portal|life-shapes|life-products|life-guided|life-case-store|portal-auth|offline-sync|fact-finder\.js/i.test(spec)) return "a portal file";
  if (/^(node:)?fs(\/|$)/.test(spec)) return "the file system";
  if (spec.startsWith("node:")) return `a Node built-in (${spec})`;
  if (!spec.startsWith(".")) return `a package (${spec})`;
  return "a file outside core/src and parameters/tt-parameters.js";
}

/** Null when allowed; otherwise why not. */
export function importViolation(file: string, spec: string): string | null {
  if (!spec.startsWith(".")) return classify(spec);
  const target = resolve(dirname(file), spec);
  if (target === PARAMETERS_FILE) return null;
  if (target.startsWith(SRC + sep)) return /life-shapes|life-products|portal/i.test(spec) ? classify(spec) : null;
  return classify(spec);
}

const FORBIDDEN_CODE: readonly (readonly [RegExp, string])[] = [
  [/\bfetch\b/, "the network (fetch)"],
  [/\b(XMLHttpRequest|WebSocket|EventSource)\b/, "the network"],
  [/\blocalStorage\b/, "localStorage"],
  [/\bsessionStorage\b/, "sessionStorage"],
  [/\bindexedDB\b/, "indexedDB"],
  [/\bprocess\s*\.\s*env\b/, "process.env"],
  [/\bprocess\b/, "the Node process object"],
  [/\bimport\s*\(/, "a dynamic import"],
  [/\brequire\s*\(/, "require()"],
  [/\b(window|document|navigator)\b/, "the browser (UI)"],
];

test("guard 6: the engine imports only itself and the root parameter table", () => {
  for (const f of files) {
    for (const spec of specifiers(readFileSync(f, "utf8"))) {
      const why = importViolation(f, spec);
      assert.ok(!why, `${f} imports ${why} ("${spec}") — core/ is pure: no I/O, no UI, no runtime dependencies`);
    }
  }
});

test("guard 6: the engine touches no network, storage, environment or UI", () => {
  for (const f of files) {
    const code = codeOnly(readFileSync(f, "utf8"));
    for (const [re, what] of FORBIDDEN_CODE) {
      assert.ok(!re.test(code), `${f} uses ${what} — core/ is pure`);
    }
  }
});

test("guard 6 catches every probe the Phase 0a review found uncaught", () => {
  const f = join(SRC, "gap.ts");
  const imports: [string, string][] = [
    ['import fs from "fs";', "the file system"],
    ['import { readFile } from "node:fs/promises";', "the file system"],
    ['import { createClient } from "@supabase/supabase-js";', "a Supabase client"],
    ['import { x } from "../../../General-Rater-Portal/life-shapes.js";', "a portal file"],
    ['import "../../research/x.js";', "a file outside core/src and parameters/tt-parameters.js"],
    ['const m = await import("../../tools/ocr.js");', "a file outside core/src and parameters/tt-parameters.js"],
    ['import { P } from "../../parameters/tt-parameters.js";', ""],
    ['import { row } from "./parameters/row.ts";', ""],
  ];
  for (const [line, expected] of imports) {
    const why = specifiers(line).map((s) => importViolation(f, s)).find((x) => x) ?? "";
    assert.equal(why, expected, `probe: ${line}`);
  }
  const code: [string, string][] = [
    ['localStorage.getItem("x")', "localStorage"],
    ['indexedDB.open("x")', "indexedDB"],
    ["sessionStorage.clear()", "sessionStorage"],
    ["const h = process.env.HOME;", "process.env"],
    ['const m = import("./x.ts");', "a dynamic import"],
    ["const g = globalThis.fetch;", "the network (fetch)"],
  ];
  for (const [line, expected] of code) {
    const hit = FORBIDDEN_CODE.find(([re]) => re.test(codeOnly(line)));
    assert.equal(hit?.[1], expected, `probe: ${line}`);
  }
  assert.ok(!FORBIDDEN_CODE.some(([re]) => re.test(codeOnly("// never read localStorage or process.env here"))), "prose is not code");
});
