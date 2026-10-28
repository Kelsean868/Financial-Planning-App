// Usage: node goldens.mjs <path-to-module> <out-prefix>
// Writes <out>-goldens.json (37 goldens, full values) and <out>-dump.json (flat dump, both samples).
import { pathToFileURL } from "node:url";
import { writeFileSync } from "node:fs";
const [,, modPath, out] = process.argv;
const d = await import(pathToFileURL(modPath).href);
const fam = d.computeFactFinder(d.SAMPLE_FAMILY);
const young = d.computeFactFinder(d.SAMPLE_YOUNG_SINGLE);
const cg = d.careGraph(d.careGraphInputFromFacts(d.SAMPLE_FAMILY), d.CARE_GRAPH_FIXTURE_NET_MONTHLY);
const uk = d.careGraph(d.careGraphInputFromFacts(d.withChildBInUK(d.SAMPLE_FAMILY)), d.CARE_GRAPH_FIXTURE_NET_MONTHLY);
const T = (x) => Math.round(x / 1000) * 1000;
const R = Math.round;
const g = [
  ["§2.8 family: stage", fam.budget.stage, fam.budget.stage],
  ["§2.8 family: ceiling", R(fam.budget.ceilingMonthly), fam.budget.ceilingMonthly],
  ["§2.8 family: care save a month", R(fam.careGraph.funding.saveFromToday), fam.careGraph.funding.saveFromToday],
  ["§2.8 family: already paying", R(fam.careGraph.funding.alreadyPaying), fam.careGraph.funding.alreadyPaying],
  ["§2.8 family: care present value", R(fam.careGraph.funding.ifYouDieTomorrow), fam.careGraph.funding.ifYouDieTomorrow],
  ["§2.8 family: peak a month", R(fam.careGraph.peak.monthly), fam.careGraph.peak.monthly],
  ["§2.8 family: peak at age", fam.careGraph.peak.atAge, fam.careGraph.peak.atAge],
  ["§2.8 family: sandwich years", fam.careGraph.sandwichYears, fam.careGraph.sandwichYears],
  ["§2.8 family: finish age", fam.careGraph.finishAge, fam.careGraph.finishAge],
  ["§2.8 family: cover essential", R(fam.deathNeed.tiers.essential), fam.deathNeed.tiers.essential],
  ["§2.8 family: cover recommended", R(fam.deathNeed.tiers.recommended), fam.deathNeed.tiers.recommended],
  ["§2.8 family: cover full", R(fam.deathNeed.tiers.full), fam.deathNeed.tiers.full],
  ["§2.8 family: needs", R(fam.budget.needsMonthly), fam.budget.needsMonthly],
  ["§2.8 family: living", R(fam.budget.livingMonthly), fam.budget.livingMonthly],
  ["§2.8 young single: stage", young.budget.stage, young.budget.stage],
  ["§2.8 young single: ceiling", R(young.budget.ceilingMonthly), young.budget.ceilingMonthly],
  ["§2.8 young single: care goals (no care)", young.careGraph.goals.length, young.careGraph.goals.length],
  ["§2.8 young single: cover essential", R(young.deathNeed.tiers.essential), young.deathNeed.tiers.essential],
  ["§2.8 young single: cover recommended", R(young.deathNeed.tiers.recommended), young.deathNeed.tiers.recommended],
  ["§2.8 young single: cover full", R(young.deathNeed.tiers.full), young.deathNeed.tiers.full],
  ["§2.8 young single: needs", R(young.budget.needsMonthly), young.budget.needsMonthly],
  ["§2.8 young single: living", R(young.budget.livingMonthly), young.budget.livingMonthly],
  ["care graph §3: peak a month", R(cg.peak.monthly), cg.peak.monthly],
  ["care graph §3: peak at age", cg.peak.atAge, cg.peak.atAge],
  ["care graph §3: sandwich years", cg.sandwichYears, cg.sandwichYears],
  ["care graph §3: finish age", cg.finishAge, cg.finishAge],
  ["care graph §3: nominal total (to the thousand)", T(cg.nominalTotal), cg.nominalTotal],
  ["care graph §3: save from today", R(cg.funding.saveFromToday), cg.funding.saveFromToday],
  ["care graph §3: already paying", R(cg.funding.alreadyPaying), cg.funding.alreadyPaying],
  ["care graph §3: present value (to the thousand)", T(cg.funding.ifYouDieTomorrow), cg.funding.ifYouDieTomorrow],
  ["care graph §3 UK: peak a month", R(uk.peak.monthly), uk.peak.monthly],
  ["care graph §3 UK: sandwich years", uk.sandwichYears, uk.sandwichYears],
  ["care graph §3 UK: nominal total (to the thousand)", T(uk.nominalTotal), uk.nominalTotal],
  ["care graph §3 UK: save from today", R(uk.funding.saveFromToday), uk.funding.saveFromToday],
  ["care graph §3 UK: present value (to the thousand)", T(uk.funding.ifYouDieTomorrow), uk.funding.ifYouDieTomorrow],
  ["care graph §3 UK: top lever", uk.topLevers[0].label, null],
  ["care graph §3 UK: top lever worth a month", R(uk.topLevers[0].monthlyReduction), uk.topLevers[0].monthlyReduction],
];
writeFileSync(`${out}-goldens.json`, JSON.stringify(g, null, 1));
const flat = {};
const walk = (v, p) => {
  if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`));
  else if (v && typeof v === "object") { for (const [k, x] of Object.entries(v)) if (k !== "provenance" && k !== "facts") walk(x, `${p}.${k}`); }
  else flat[p] = v;
};
walk({ family: fam, young, cg, uk }, "$");
writeFileSync(`${out}-dump.json`, JSON.stringify(flat, null, 0));
console.log(`goldens ${g.length}, dump lines ${Object.keys(flat).length}, id ${d.ASSUMPTION_SET_ID}`);
