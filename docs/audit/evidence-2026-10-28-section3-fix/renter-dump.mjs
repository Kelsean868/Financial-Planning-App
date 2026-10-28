// Usage: node renter-dump.mjs <path-to-module> <out.json>
// Flat dump of computeFactFinder(SAMPLE_WEEKLY_RENTER) and its default Make room plan (Food cut by $300), provenance left out.
import { pathToFileURL } from "node:url";
import { writeFileSync } from "node:fs";
const [,, modPath, out] = process.argv;
const d = await import(pathToFileURL(modPath).href);
const r = d.computeFactFinder(d.SAMPLE_WEEKLY_RENTER);
const food = r.budgetAnalysis.groups.find((g) => g.key === "food");
const room = food ? d.computeRoomPlan(r, { groupTargets: { food: Math.max(0, food.monthly - 300) } }) : null;
const flat = {};
const walk = (o, p) => {
  if (o === null || typeof o !== "object") { flat[p] = o; return; }
  for (const [k, v] of Object.entries(o)) { if (k === "provenance" || k === "facts") continue; walk(v, Array.isArray(o) ? `${p}[${k}]` : `${p}.${k}`); }
};
walk({ renter: r, renterRoom: room }, "$");
writeFileSync(out, JSON.stringify(flat, null, 1));
console.log(`renter dump lines ${Object.keys(flat).length}`);
