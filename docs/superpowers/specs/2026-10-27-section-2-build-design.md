# Section 2: From prototype to the real fact-finder

Date: 2026-10-27
Builds on: Section 1 (`2026-10-27-section-1-data-storage-design.md`, rev 2, signed), the care graph brief, the
closing engine brief and addendum §11–13, the prototype findings, and the Design canvas prototype "Fact-Finder
Prototype" v17.
Status: **signed by Kyron, 27 Oct 2026 (15:39).** Also confirmed: a Disability Income Rider on Cashbuilder II is
Medical at any amount. Kyron chose a one-shot run of Phases 0 to 3 (§2.13).

---

## 2.0 Sign-off checkpoint

One chosen answer per item. Do not proceed without an explicit yes.

| # | Item | Chosen |
|---|---|---|
| 2.1 | Build order | **Five phases, in order: 0 prerequisites, 1 engine, 2 advisor page, 3 close and records, 4 self-serve (fenced).** Phases 0 to 3 run in one shot on stacked branches; Kyron merges afterwards, in order (§2.13). |
| 2.2 | Prototype status | **Reference only.** Its screens and wording are the design. Its code is not copied; its numbers become golden tests. |
| 2.3 | Engine scope | **Ten modules in `Financial-Planning-App/core`** (§2.3), all pure, all with goldens from the prototype. |
| 2.4 | Product rules | **One product-rules table in `core/src/parameters/`**, with a source and date on every row (§2.4). The portal's `life-shapes.js` keeps its own copy for the e-App; a parity test ties them (guard 15). |
| 2.5 | Premium numbers | **The engine gives premium bands, labelled "rough", never a quote.** A firm price comes only from a rater the portal already has (§2.5). |
| 2.6 | Page mode | **Advisor mode only in v1.** The prototype's self-serve parts are left out (§2.6). |
| 2.7 | Education layer | **Kept** (glossary, "?" help, quiz), in advisor mode, with the wording reviewed in Phase 2 (§2.7). |
| 2.8 | Models | As in §2.9. |
| 2.9 | Scope fences | As in §2.10. |

---

## Risks and conflicts, flagged before any change

1. **Self-serve conflicts with Section 1.** The prototype has "On my own" mode, "Send to Kyron", a "save and finish
   later" link and WhatsApp share. Section 1 fences these out: §1.4.4 (no client accounts), §1.8.1 (no
   client-facing case links) and guard 12 (the page never reaches the public build). So self-serve is Phase 4,
   and Phase 4 needs a Section 1 amendment and a compliance read first. Nothing in Phases 0 to 3 builds it.
2. **`feat/domain-core` is not merged.** `master` is at `7949d9d`. Section 1 §1.10 says it merges first. Phase 1
   cannot start until it does.
3. **The prototype's premiums are rough.** Its term, whole life and CI rates are smoothed estimates, made to show
   the shape. They must never reach a client as a price (§2.5).
4. **Assumed figures in the prototype.** Car loan rate 7.5% and the 8–10 year term are assumptions; Republic Bank's
   up-to-100% on new cars is verified. Caregiver cost uses Paylab 2026 ($2,772–$7,808 a month). Each goes into a
   parameter table with its source and date, and "assumed" where it is.
5. **A live rule was wrong.** The portal lists the Disability Income Rider on Whole Life and Endowment. Kyron ruled
   27 Oct 2026 that it is only on Cashbuilder II. Phase 0 fixes it before the engine copies any rider list.
6. **The quiz promotes products.** Questions that favour endowments, whole life and unregistered annuities are
   sales content. The page must say who is asking (Kyron, a Tatil Life agent). Wording review is a Phase 2
   deliverable, not a legal sign-off; legal or Tatil compliance review stays open (fence 6).

---

## 2.1 Build order

| Phase | What | Where | Gate to start |
|---|---|---|---|
| 0 | Prerequisites (below) | both repos | this section's Phase 0 list only; may run before sign-off |
| 1 | Engine modules | `Financial-Planning-App/core`, branch `feat/fact-finder-engine` from `master` | `feat/domain-core` merged; §2.0 signed |
| 2 | Advisor page | `General-Rater-Portal`, `fact-finder.html` / `fact-finder.js`, branch `feat/fact-finder` from `main` | Phase 1 merged and vendored with `PINNED.txt` |
| 3 | Close and records | same branch as Phase 2, second run | Phase 2 smoke walk passed |
| 4 | Self-serve | not designed | Section 1 amendment signed; compliance read done |

**Phase 0 prerequisites.**
1. **Review and merge `feat/domain-core`.** A CC review run reads the branch against its July spec and plan,
   runs the tests, and writes a review record. Kyron merges; CC does not.
2. **GRP fixes** (brief `General-Rater-Portal/docs/briefs/2026-10-27-life-phase0-fixes.md`): the Disability
   Income Rider on Cashbuilder II only, the intake `queueStrip` fix, and the Rest Assured II grading line.
3. **Specs and prototype into the repo.** Section 1, this section, and the prototype file go to
   `Financial-Planning-App/docs/superpowers/specs/` and `docs/prototype/`, committed in the review run.

## 2.2 Prototype status

1. The prototype is the design: its screen order, smart path, wording, motion and mobile layout.
2. Its JavaScript is not copied into either repo. It is one file that mixes model and view; the engine must be
   pure TypeScript with provenance (Section 1, guard 6).
3. Its sample cases become fixtures, and its outputs become goldens (§2.8).
4. File: `Financial-Planning-App/docs/prototype/fact-finder-prototype-v17.html`. It is a Design canvas file and
   does not run on its own. Read it as text: the model is `static model(s)` inside the `data-dc-script` block,
   and the screens are the markup above it. The live version is the canvas artifact "Fact-Finder Prototype".

## 2.3 Engine modules (Phase 1)

Each is a new file under `core/src/`, uses `ProvenanceBuilder` and the parameter tables, and exports its result
type for the JS/TS seam. Existing briefs already cover modules 7 and 8; this section adds the rest.

| # | Module | Does | From the prototype |
|---|---|---|---|
| 1 | `household-budget.ts` | Net pay (PAYE, NIS, health surcharge), household net, costs, housing (mortgage / rent / contribution / own), surplus, buffer, emergency fund, financial stage, safe insurance ceiling | Budget screen, stage, ceiling |
| 2 | `debts.ts` | Debt list, minimums, payoff order and years, car loan (new up to 100%, used 70–80%, term 8–10 years) | Debts screen, car loan |
| 3 | `goals.ts` | Named goals and own goals, target, years, monthly saving, home deposit (lenders up to 90%; first-time buyer stamp duty relief under $2M) | Goals screen |
| 4 | `insurance-budget.ts` | Splits the monthly insurance budget across recommended plans; fits each plan to its minimum premium; plans that do not fit go to "not yet" with the amount needed | `ibGroup`, the loved-one allocation |
| 5 | `health-score.ts` | The 0–100 financial health score and its parts | Score ring |
| 6 | `start-early.ts` | Compound growth, cost of waiting, early retirement | Start-early screen |
| 7 | care graph | As the care graph brief, with Section 1's changes | Parents, care costs |
| 8 | closing comparison | As the closing engine brief and addendum | Close |
| 9 | `loved-ones.ts` | Plans bought for a child, grandchild or parent; eligibility by age (Goldspoon 1–12, Rest Assured II to 80) | Loved-one door |
| 10 | `business.ts` | Key person, buy-sell, business loan cover; why each is asked | Business door |

The prototype's smart path (which screens show, from the start-screen picks) is page logic, not engine. It goes
to Phase 2 as a pure function in `fact-finder.js` with its own tests.

## 2.4 Product rules table

File: `core/src/parameters/tatil-products-2026-10.ts`. Every row carries `source` and `asOf`.

| Plan | Cover | Minimum premium a month | Source |
|---|---|---|---|
| Term Life | $150,000 to $10,000,000; issue to age 65 | $150 | GRP `life-shapes.js`; Kyron 27 Oct 2026 |
| Whole Life | from $65,000 | $150 | as above |
| Endowment | from $55,000 | $150 | as above |
| Life Span Gold (CI) | $100,000 to $2,000,000 | $150 | Kyron's rule; OIPA allows $50,000, not used |
| Goldspoon | $10,000 to $150,000; ages 1–12 | $150 | GRP `life-shapes.js` |
| Rest Assured II | $30,000 to $150,000; to age 80 | none | Kyron 27 Oct 2026 |
| Cashbuilder II | from $10,000 | $300 | Kyron 27 Oct 2026 |
| Destiny (annuities) | n/a | $200 | Kyron 27 Oct 2026 |
| Platinum Edge | single deposit $50,000 to $1,000,000 | n/a | GRP `life-products.js` |
| SPIA | $50,000 to $2,000,000; age 50+ | n/a | GRP `life-products.js` |

Rider rules in the same file:
1. **Disability Income Rider: Cashbuilder II only** (Kyron, 27 Oct 2026). Medical at any amount.
2. **AD&D pays on accident only.** The engine never counts it as income protection. Income protection in the
   engine means the Disability Income Rider on Cashbuilder II.

## 2.5 Premium numbers

1. The engine returns a **band** (low, high) per plan, labelled "rough", from a rates table marked `estimate`.
2. When a band's top is under the plan's minimum, it returns the minimum, labelled "the minimum premium".
3. The page's quick quote gives a firm price **only** for a product the portal already rates. The Phase 2
   brief's first step lists those products; every other product shows the rough band.
4. No band is ever written to a snapshot as a price. A snapshot stores bands with their label.

## 2.6 Page mode (Phase 2)

Advisor mode only: Kyron drives, the client watches. Built from the prototype:

**Kept:** the start screen with multi-pick doors and the smart path; names and dates of birth (age computed);
budget with housing types; debts and car loans; goals and own goals; protection; parents and care costs; loved
ones; business; insurance budget fitted to minimums; health score; start early; plan; quick quote; motion and
title animations (fades only under reduced motion); the mobile layout at 390.

**Left out of v1** (they are self-serve, see Risk 1): "On my own" mode, "Send to Kyron", the save-and-resume link
and banner, WhatsApp share, the lead preview screen, the reminder. Resume is Section 1's: Kyron reopens the case
in the portal.

**Data rules from Section 1 apply unchanged:** parents by birth year, `careTier` 0–4, no parent free text; no
health answer anywhere in a case. The prototype's health insurance question asks whether the client **has** health
cover, not about health. It stays, as a yes/no on cover held.

## 2.7 Education layer

Kept: glossary sheet, "?" help on terms, the quiz. The page names the asker on the quiz card: "From Kyron, your
Tatil Life agent." Phase 2 delivers a wording table (every quiz question and answer) in the run record for Kyron
to approve. No quiz answer states a return or a guarantee the product does not give.

## 2.8 Goldens

Taken from the prototype v17 on 27 Oct 2026. Each moves only with a recorded reason (Section 1 addendum §14.1).

**Sample family:** stage 2; ceiling $725; care save $3,837 a month; already paying $4,000; care present value
$1,263,107; peak $17,391 at age 54; 8 sandwich years; finish at 55; cover essential $823,567, recommended
$1,994,846, full $2,236,674; needs $15,140; living $6,700.

**Sample young single (age 24, $8,000 gross, renting):** stage 1; ceiling $376; no care; cover $149,000 at all
three tiers; needs $5,450; living $5,300.

**Minimums:** for every recommendation set, no funded plan is below its minimum premium (guard 16).

## 2.9 Models and effort

| Run | Model | Effort |
|---|---|---|
| Phase 0 review of `feat/domain-core` | Opus 5.5 | high |
| Phase 0 GRP fixes | Opus 5.5 | medium |
| Phase 1 engine | Opus 5.5 | high |
| Phase 2 page | Opus 5.5 | medium |
| Phase 3 close and records | Sonnet 5.5 | medium |

## 2.10 Scope fences, recorded as follow-ups

1. No self-serve, client links or client accounts (Phase 4, needs a Section 1 amendment).
2. No firm prices from the engine (§2.5).
3. No change to the e-App or `life-guided.js` beyond Phase 0.
4. No AgencyTrack integration (Section 1, fence 7).
5. No automatic Pipeline lead in Phase 2; Phase 3 links a case to an existing lead only.
6. No legal or Tatil compliance sign-off is claimed; the quiz and plan wording review is Kyron's.
7. Old pension calculator repos are not merged in; the public servants' pension rules move into
   `needs/retirement.ts` parameters in Phase 1 (audit doc, 27 Oct 2026).

## 2.11 New guards (each sabotage-tested before trusted)

14. **Goldens.** §2.8 numbers asserted exactly. Sabotage: change one rate in the parameter table.
15. **Product parity.** In the portal, a test compares the vendored engine's product table with `life-shapes.js`
    `PRODUCTS` cover ranges and riders. Sabotage: change one cover floor on one side.
16. **Minimum premiums.** A property test over many budgets: every funded plan is at or above its minimum.
    Sabotage: lower Cashbuilder II to $150 in the allocation code only.
17. **Disability Income Rider.** The engine never recommends it on any plan but Cashbuilder II. Sabotage: add it
    to Whole Life.
18. **No self-serve in v1.** The portal build fails if `fact-finder.*` contains `wa.me`, "Send to Kyron" or a
    resume link. Sabotage: add one `wa.me` link.

## 2.12 Phase 3 (close and records), in short

1. "Start the application" writes one `life_case_snapshots` row (Section 1).
2. The one-page plan prints from the snapshot, not from live numbers.
3. Scope outcomes write to `life_case_scope`.
4. A case can link to an existing Pipeline lead by id. Creating leads stays in the existing intake.

## 2.13 One-shot run (Kyron, 27 Oct 2026)

Kyron asked for Phases 0 to 3 to run to completion in one Claude Code session. This replaces the "merged before
the next phase" gates in §2.1 with these rules:

1. **Stacked branches.** Each phase branches from the branch before it, not from `master` / `main`:
   - FPA: `docs/fact-finder-specs` (from `master`); `feat/domain-core` (review fixes); `feat/fact-finder-engine`
     (from `feat/domain-core`).
   - GRP: `fix/life-phase0` (from `main`); `feat/fact-finder` (from `fix/life-phase0`, so guard 15 sees the rider
     fix).
2. **No merges, no deploys, no live database change.** Each branch ends in a PR. Kyron merges afterwards, in this
   order: FPA specs, `feat/domain-core`, `feat/fact-finder-engine`; then GRP `fix/life-phase0`, `feat/fact-finder`.
3. **Vendoring from a branch.** Phase 2 vendors the engine built from the `feat/fact-finder-engine` head commit.
   `PINNED.txt` holds that hash. After the engine merges, the hash still resolves (the commit is the same).
4. **Migrations are written, not applied.** The three Section 1 tables get migration and rollback files. Guards 9
   and 10 run against a local Supabase (`supabase start`) if Docker is available. If not, they are written, and
   the run record gives Kyron the exact commands to apply the migrations and run the two guards. The page's smoke
   walk stubs the Supabase calls in Playwright (`page.route`). No test-only switch goes into page code.
5. **Hard stops.** The chain stops (later phases do not start) when: a golden cannot be reproduced and the cause
   is not a recorded re-baseline; a test can pass only by deleting or skipping it; a privacy guard (7, 8, 11) fails;
   or a step would need a merge, a deploy or a live database change. At a stop, the progress file says why.
6. **Progress file.** `Financial-Planning-App/docs/audit/ONE-SHOT-PROGRESS.md` is updated at the end of every phase:
   branch, head commit, PR link, guards passed, open items. A new session resumes from it.
