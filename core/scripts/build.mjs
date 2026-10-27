/**
 * Build the engine to ONE ES-module file with no runtime dependencies: `core/dist/fpa-core.js`
 * (Section 1 §1.10; review finding F4). The portal vendors this file pinned to a commit hash.
 *
 * Deterministic on purpose: no timestamp, no absolute path, no hash in the output, so the same
 * source gives the same bytes on any machine. `test/dist.test.ts` rebuilds in memory and compares.
 *
 *   node scripts/build.mjs           write dist/fpa-core.js
 *   buildBytes()                     the bytes, without writing (used by the test)
 */
import { build } from "esbuild";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const CORE = dirname(dirname(fileURLToPath(import.meta.url)));
export const OUTFILE = join(CORE, "dist", "fpa-core.js");

const BANNER = [
  "// fpa-core: the Financial-Planning-App planning engine (core/src/index.ts), one ES module, no dependencies.",
  "// Built by `npm run build` in core/. Do not edit: change core/src and rebuild.",
].join("\n");

export async function buildBytes() {
  const result = await build({
    absWorkingDir: CORE,
    entryPoints: ["src/index.ts"],
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    write: false,
    outfile: OUTFILE,
    legalComments: "none",
    charset: "utf8",
    banner: { js: BANNER },
    logLevel: "silent",
  });
  if (result.errors.length) throw new Error(result.errors.map((e) => e.text).join("\n"));
  const out = result.outputFiles.find((f) => f.path.endsWith("fpa-core.js"));
  if (!out) throw new Error("esbuild produced no fpa-core.js");
  return Buffer.from(out.contents);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const bytes = await buildBytes();
  mkdirSync(dirname(OUTFILE), { recursive: true });
  writeFileSync(OUTFILE, bytes);
  process.stdout.write(`wrote dist/fpa-core.js (${bytes.length} bytes)\n`);
}
