# RUN 28 Oct 2026 — Section 3, Build A (engine)

Spec: `docs/superpowers/specs/2026-10-28-section-3-budget-ux-design.md` (signed by Kyron 28 Oct 2026, 08:41). Brief:
`docs/briefs/2026-10-28-section-3-build-brief.md`, "Build A". Branch `feat/section3-engine` from `origin/master`
(`2ec9aa4`). Claude Opus 5.5, effort high, one session (builder subagent). Nothing merged, deployed or applied; no live
database access.

## 1. Flagged before the change

Written before any engine code changed (CLAUDE.md rule 5). Each is decided inside the spec; the decision is in §2.

1. **The engine does not use the NIS class table.** Spec §2.2 says "the engine already works from the class table".
   It does not: `computeNetPay` takes 5.4% of gross up to the $13,600 monthly insurable ceiling. Moving to the class
   table would move golden 2 (family ceiling) and golden 16 (young single ceiling): hard stop 1. Decision: keep the
   flat rate; a weekly-paid client's NIS is worked per week on the weekly figure (5.4% of the week's pay up to the
   weekly ceiling, then × 52/12), which is the same number the monthly sum gives. Open item for Kyron (ties to F-20).
2. **Partner pay is take-home.** v1 `partner.incomeMonthly` was used as take-home (no tax maths). `partner.pay` keeps
   that meaning; the client's `pay.amountPerPay` is gross, as `grossMonthly` was.
3. **"Saving you already do" is not in needs.** §1.1 says "counted as saving, not spending". Needs (and so the stage,
   the ceiling and "money left after costs") leave it out; the "going out" bar and the analysis count it. Risk: the
   insurance ceiling is a share of money that already goes to a sou-sou or credit union. Make room is where it is
   redirected. §9 subtracts saving from "today's spending", so the two readings agree on the retirement figure.
4. **The floor also lifts the close screen's Floor / Recommended / Ceiling bands** (guard 30: insurance never below
   $200 except stage 0). For the young single the Floor band's monthly moves $187.07 → $200 (its life cover stays $0:
   no one depends on her). Not one of the 37 goldens.
5. **The version-1 upgrade is exact except one case.** A v1 parent whose care has already started and who is under the
   SCP age: v1 dropped the care cost when the pension started; v2 keeps today's budget amount when it is larger (§1.3
   rule). `life_cases` held 0 rows on 28 Oct 2026, so no stored case is affected.
6. **Payoff dates need a month; the engine reads no clock.** The page passes `asOfMonth` ("YYYY-MM"); without it the
   engine uses January of `asOfYear` and says so on the result.
7. **Co-signed debt cover tier.** §7.5 says "a loan cover item in its tier". By Decision 7's rule (tier by when the
   loan is taken: inside 3 years is Tier 2) an existing loan is Tier 2.
8. **Make room's expensive-debt step has no size in the spec.** Decision: it takes what would clear all expensive debt
   inside the near-dated horizon (3 years, the Tier 2 rule), less the minimums and the extra already funded.
9. **Spec and prototype clashes (rules, not looks).** Followed the spec (hard stop 5 is "record and continue"):
   (a) the prototype's insurance band is 5% of take-home / 25% of money left; the engine keeps its stage table;
   (b) the prototype's "no plan" test uses money left after saving; the engine uses money left after costs (item 3);
   (c) the prototype lists co-signed loan cover after Tier 1 items; the engine puts it in Tier 2 (item 7);
   (d) the prototype tags saving lines `stop: 'save'`; §14.1 allows only mortgage, kids, work, care, so saving is told
   by its group; (e) the prototype's sample parents (father: future "Day care" from 80) differ from the brief's mapping
   (father: no growth); the brief's mapping is used.
10. **Name clash.** `DebtPayoff` already exists in `debts.ts` (the three payoff runs). §14.4 needs the name for the new
    result. The old type is renamed `DebtPayoffRuns`; the runtime shape (`debts.payoff`) is unchanged.
11. **Origin/master's dist hash.** `origin/master` `core/dist/fpa-core.js` hashes `0c052d55…128aab`, not the GRP pin
    `e3e38f7d…b100`. Cause: merge `9903799` rebuilt the dist after master's `parameters/tt-parameters.json` gained rows
    (e.g. `corporation_tax`), which esbuild inlines. Not line endings (`.gitattributes` marks the file `-text`). The
    engine code is the same as `0a332cf`. Not chased further.

The "before" values (all 37 goldens with full precision, and a flat dump of both samples) are in
`docs/audit/evidence-2026-10-28-section3-a/goldens-before.json`, written by `goldens.mjs` beside it from the untouched
branch (`2d7fd58`, dist SHA-256 `0c052d55341e50ca3e1812cc2c493ac7435a7483b5ed9d48684241edbc128aab`; `npm test` 161/161,
typecheck exit 0).
