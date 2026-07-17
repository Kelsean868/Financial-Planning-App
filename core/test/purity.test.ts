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
 * Strip comments and string literals before checking for hardcoded values.
 * Prose LEGITIMATELY mentions these numbers — "group life reduces by 50% at 66
 * and terminates at 70" is documentation, not a hardcoded parameter. Only
 * executable code counts. (Caught during Task 3: the naive raw-source grep
 * failed on that exact doc-comment.)
 */
function codeOnly(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")   // block comments
    .replace(/\/\/.*$/gm, " ")            // line comments
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')  // double-quoted strings
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")  // single-quoted strings
    .replace(/`(?:[^`\\]|\\.)*`/g, "``"); // template literals
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
});
