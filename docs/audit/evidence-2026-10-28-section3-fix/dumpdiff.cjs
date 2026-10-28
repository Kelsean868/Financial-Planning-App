const fs = require("fs");
const [,, a, b, out] = process.argv;
const A = JSON.parse(fs.readFileSync(a, "utf8")), B = JSON.parse(fs.readFileSync(b, "utf8"));
const flat = (o) => (Array.isArray(o) ? Object.fromEntries(o.map((x) => [x[0] ?? x.k ?? x.key, x[1] ?? x.v])) : o);
const fa = flat(A), fb = flat(B);
const changed = [], added = [], dropped = [];
for (const k of Object.keys(fa)) { if (!(k in fb)) dropped.push(k); else if (JSON.stringify(fa[k]) !== JSON.stringify(fb[k])) changed.push([k, fa[k], fb[k]]); }
for (const k of Object.keys(fb)) if (!(k in fa)) added.push([k, fb[k]]);
fs.writeFileSync(out, JSON.stringify({ changed, added, dropped }, null, 1));
console.log(`changed ${changed.length}, added ${added.length}, dropped ${dropped.length}`);
for (const c of changed) console.log("CHANGED", JSON.stringify(c));
for (const c of added) console.log("ADDED", JSON.stringify(c));
