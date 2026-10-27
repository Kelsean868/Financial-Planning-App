# RUN 2026-10-27 — fact-finder engine (Phase 1)

Brief: `docs/briefs/2026-10-27-fact-finder-one-shot.md` ("Phase 1 — what done means"), on `docs/fact-finder-specs`.
Specs: Section 1, Section 2 (§2.3–2.5, §2.8, §2.10 fence 7, §2.11, §2.13), care graph brief, closing engine brief and
addendum §11–15, pension calculators audit. Design reference: `docs/prototype/fact-finder-prototype-v17.html`.
Model: Opus 5.5, effort high. Owner away: every decision is recorded here.
Worktree `C:\Projects\FPA-wt-engine`, branch `feat/fact-finder-engine` from `feat/domain-core` at `596cfea`.

## 1. Risks and conflicts, flagged before any change

Written after reading the specs and tracing the prototype's model, before the first engine file was written.

Prototype trace (scratch copy of `static model(s)` run under Node against its own `samples`, nothing copied into the
repo): every Section 2 §2.8 golden and every care graph §3 golden reproduces from the prototype's own arithmetic
(full-precision values in §6). So no golden needs a re-baseline to be reproducible; the risks below are about what
the engine must keep from the prototype to stay on those numbers.

| # | Risk or conflict | Decision |
|---|---|---|
| R1 | **NIS in PAYE.** The prototype deducts 100% of the employee's NIS from chargeable income. The root table (`parameters/tt-parameters.json` `income_tax.nis_deductible_portion`, 0.7, `VERIFIED_PRACTICE_UNCITED`) and the pension audit say 70%. At 70% the family ceiling becomes about $711 (golden $725) and the young single's about $374 (golden $376). | The goldens are signed and only the §14.1 re-baseline is allowed, so the engine reproduces the prototype: a core row `ff.tax.nisDeductibleShare = 1`, status `assumed`, whose caveat names the conflict and is carried on every budget's provenance. Open item O-1 for Kyron: confirm 70% and re-baseline §2.8, or keep. |
| R2 | **Guard 7 vs §1.5(d).** Guard 7 says "a string field on a parent fails", but §1.5(d) allows an optional first name and a relationship label, both strings. | A closed key list for parents: `personId` (UUIDv4), `relationship` (enum), `firstName` (optional, a name pattern: letters, space, hyphen, apostrophe, at most 30 characters), `nisContributions` (enum) are the only strings. Any other key, or any other string value, fails. |
| R3 | **Funded below minimum.** The prototype's `ibGroup` and loved-one split fund a lone remaining plan below its minimum (`x.short`). Guard 16 forbids any funded plan below its minimum. | The engine moves that plan to "not yet" with the amount needed (§2.3 module 4's own wording). Deliberate deviation from the prototype, not a golden. |
| R4 | **Levers.** The care graph brief names "defer a milestone"; the prototype's lever is "drop a milestone" and the brief gives no deferral amount. | The engine follows the prototype (the §3 top-lever golden comes from it). Follow-up F-1: define a deferral lever. |
| R5 | **§14.1 re-baseline.** Addendum §13 adds per-vehicle floors and an advisor-set planning rate. | The care graph's return is the advisor-set planning rate, defaulted at 5.0% in assumption set `ff-2026-10-27`; floors feed only the stress lines. The goldens do not move, so §14.1 is recorded as checked and not triggered (§7). |
| R6 | **Parent age.** The prototype stores parent age; Section 1 allows birth year only. | Facts carry `birthYear`; the engine derives age as `asOfYear − birthYear`, with `asOfYear` passed in (the engine reads no clock). Goldens use `asOfYear` 2026, mother 1960, father 1955. |
| R7 | **Health surcharge at 60+.** The prototype charges every earner; the root table exempts 60 and over. | The engine applies the exemption. No golden moves (clients 38 and 24). |
| R8 | **Line endings.** `core.autocrlf=true` on this PC; a CRLF checkout of the built file would not hash to the committed blob. | `.gitattributes` marks `core/dist/fpa-core.js -text`. |
| R9 | **Build tool.** No build exists; `tsc` cannot emit one ES-module file. | devDependency `esbuild` 0.28.2 (exact): correct scope-hoisted ESM bundling, JSON import attributes and `.ts` specifiers, which a hand-written concatenator would get wrong silently. Zero runtime dependencies; a test proves the built file reproduces the goldens and matches a fresh build byte for byte. |
| R10 | **"Your mother's care continues."** In the sample the mother's light top-up is fully offset by her SCP, so she has no care cost line. | As the prototype does: every parent with `careTier > 0` gets an obligation line; a fully offset one is met and renders the brief's sentence. |
| R11 | **Retirement (fence 7).** O8 forbids refactoring the July modules; the fact-finder does not capture NIS contributions or lifetime earnings, which `needs/retirement.ts` needs. | `needs/retirement.ts` is not edited. Public-service rules go into `core/src/parameters/retirement-2026-10.ts` and `core/src/needs/work-pension.ts`; the fact-finder retirement gap (`retirement-income.ts`) uses the prototype's NIS minimum pension when the client pays NIS. Follow-up F-2: fold into `needs/retirement.ts` when F1 lands. |
| R12 | **`CareGraphInputError` for "study start before current age"** rejects a child who is already at university. | Implemented as the signed brief says. Follow-up F-3. |
| R13 | **Health question.** The prototype asks whether the client has health cover. | Stored as `hasHealthCover: "yes" \| "no" \| "unknown"` (cover held, not health), per Section 2 §2.6. |
| R14 | **Premium band.** The prototype gives one rough figure; §2.5 asks for a band. | Band = estimate × (1 ± 0.15), the spread an `assumed` row; a band whose top is under the plan minimum returns the minimum, labelled "the minimum premium". |
| R15 | **Parent funeral cover in the death need.** Adding it to the client's obligation stack would move the cover goldens, and it is a policy on the parent's life. | Kept out of the death stack; it is a tier 1 ladder item and a closing recommendation (closing §5). |
| R16 | **Ladder.** The prototype's five `items` are a simplification of addendum §11 (no tier 0, no CI or parent funeral in tier 1). | The engine implements §11 as signed. Its allocation therefore differs from the prototype's `items`; no golden depends on them. |

## 2. Decisions

(Filled in during the run; see §3 onwards.)
