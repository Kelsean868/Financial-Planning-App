/** Shared helpers for the source-scanning guards. Not a test file itself. */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const SRC = fileURLToPath(new URL("../src", import.meta.url));

export function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".ts") ? [p] : [];
  });
}

/** Path relative to `core/src`, with forward slashes. */
export function rel(file: string): string {
  return relative(SRC, file).split(sep).join("/");
}

export function read(file: string): string {
  return readFileSync(file, "utf8");
}

/** Blank string literals, then comments; keep template interpolations (same rules as purity.test.ts). */
export function codeOnly(src: string): string {
  return src
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/`(?:[^`\\]|\\.)*`/g, stripTemplateProse)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/.*$/gm, " ");
}

function stripTemplateProse(literal: string): string {
  let out = "`";
  let i = 1;
  while (i < literal.length - 1) {
    if (literal[i] === "$" && literal[i + 1] === "{") {
      let depth = 1;
      let j = i + 2;
      while (j < literal.length && depth > 0) {
        if (literal[j] === "{") depth++;
        else if (literal[j] === "}") depth--;
        j++;
      }
      out += literal.slice(i, j);
      i = j;
    } else i++;
  }
  return out + "`";
}
