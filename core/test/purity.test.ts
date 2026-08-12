import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
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
  for (const f of files) {
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
