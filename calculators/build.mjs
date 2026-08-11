/**
 * Build the standalone annuity illustrator.
 *
 * The source file never contains a T&T parameter. This script inlines the
 * canonical tables and the shared helper functions verbatim, so the standalone
 * page computes with exactly the same code and data as the planning engine.
 * That is what keeps rule #1 true for a file that has to be openable offline.
 *
 *   node calculators/build.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const json = readFileSync(join(root, "parameters/tt-parameters.json"), "utf8");
const js   = readFileSync(join(root, "parameters/tt-parameters.js"), "utf8");
// Every *.src.html in this folder is a skin over the same engine. Add a file,
// get a build; no change here needed.
const sources = readdirSync(here).filter((f) => f.endsWith(".src.html")).sort();
if (!sources.length) throw new Error("no *.src.html files to build");

// Strip the module plumbing: the JSON import becomes an inline literal, and the
// export keywords go, leaving plain top-level declarations in the page scope.
const body = js
  .replace(/^\s*import\s+DATA\s+from\s+["'][^"']+["']\s+with\s+\{[^}]*\}\s*;?\s*$/m, "")
  .replace(/^export\s+default\s+.*$/m, "")
  .replace(/^export\s+/gm, "");

/**
 * Escape any "</" so an embedded "</script>" cannot terminate the host <script>
 * tag early. tt-parameters.js documents its own browser usage inside a block
 * comment that literally contains </script>, which silently truncates the page
 * mid-comment. "<\/" is equivalent in JS source, comments and string literals.
 */
const scriptSafe = (s) => s.replace(/<\//g, "<\\/");

const inlined = [
  "/* ------------------------------------------------------------------",
  "   GENERATED FILE - DO NOT EDIT.",
  "   Source:  calculators/annuity-illustrator.src.html",
  "   Params:  parameters/tt-parameters.json  (inlined verbatim below)",
  "   Helpers: parameters/tt-parameters.js    (inlined verbatim below)",
  "   Rebuild: node calculators/build.mjs",
  "   ------------------------------------------------------------------ */",
  `const DATA = ${scriptSafe(json.trim())};`,
  scriptSafe(body.trim()),
].join("\n");

if (inlined.includes("</script")) {
  throw new Error("inlined payload still contains a literal </script>");
}

mkdirSync(join(here, "dist"), { recursive: true });

for (const file of sources) {
  const src = readFileSync(join(here, file), "utf8");
  if (src.indexOf("/*__PARAMETERS__*/") === -1) {
    throw new Error(`${file} is missing the /*__PARAMETERS__*/ token`);
  }
// NOTE: replacer must be a FUNCTION. The parameter tables contain dollar signs
// ("TT$30,000", "$4,500"), and String.replace would interpret $&, $', $1 etc in
// a string replacement as substitution patterns and silently corrupt the output.
  const out = src.replace("/*__PARAMETERS__*/", () => inlined);

// Guard: the generated page must not still contain a static import STATEMENT.
// Match only at the start of a line, so prose like "Import from here." in the
// module's own doc comment does not trip it.
const leftoverImport = inlined
  .split("\n")
  .find((l) => /^\s*(import\s+[^(]|export\s)/.test(l));
if (leftoverImport) {
  throw new Error(
    `generated file still contains module syntax - it will not run standalone:\n  ${leftoverImport.trim()}`
  );
}

  const dest = join(here, "dist", file.replace(".src.html", ".html"));
  writeFileSync(dest, out);
  console.log(`built ${dest.split("/").pop()}  (${(out.length / 1024).toFixed(0)} KB)`);
}
