const fs = require("fs");
const [,, a, b] = process.argv;
const A = JSON.parse(fs.readFileSync(a, "utf8")), B = JSON.parse(fs.readFileSync(b, "utf8"));
console.log("top keys", Object.keys(A));
const ga = A.goldens ?? A, gb = B.goldens ?? B;
let moved = 0;
for (let i = 0; i < ga.length; i++) if (JSON.stringify(ga[i]) !== JSON.stringify(gb[i])) { moved++; console.log("MOVED", JSON.stringify(ga[i]), JSON.stringify(gb[i])); }
console.log(`${ga.length} goldens, ${moved} moved`);
for (const k of Object.keys(A)) if (k !== "goldens") console.log(k, JSON.stringify(A[k]), "->", JSON.stringify(B[k]));
