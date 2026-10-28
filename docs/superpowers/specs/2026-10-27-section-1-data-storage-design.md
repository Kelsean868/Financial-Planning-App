# Section 1 — Where client data lives, and where the fact-finder lives

Date: 2026-10-27 (rev 2 — placement option A chosen by Kyron, 09:43)
Applies to: `claude/2026-10-27-care-graph-brief.md`, `claude/2026-10-27-closing-engine-brief.md`,
`claude/2026-10-27-closing-engine-addendum-s11-13.md`
Status: signed. A condensed copy of the claude.ai Project doc, made 27 Oct 2026; every decision, table and guard is kept; the Project copy is the master.

**Rev 2 changes:** the fact-finder is a **separate page** in the portal, built on a new branch;
the live life intake is not touched (§1.9). The engine comes from `Financial-Planning-App`
(§1.10). Rev 1 said `gap.ts` could not be found — **that was wrong**; it is on
`Financial-Planning-App` branch `feat/domain-core`.

---

## 1.0 Sign-off checkpoint

| # | Item | Chosen |
|---|---|---|
| 1.1 | Storage location | **Hosted. The existing General-Rater-Portal Supabase project** (`oujnscwyxwuzmgyszkxd`, region `us-east-2`, Pro plan, daily DB backups). Not local-first. |
| 1.2 | What is persisted | **Facts, assumption set, scope records, and one frozen advice snapshot per close.** Every engine output is recomputed, never stored, except inside the snapshot. |
| 1.3 | Where `healthFlag` lives | **Only in the intake row on the server** (`public.intakes`, owner-only). Never copied into a case, a snapshot, a scope record, an email, or the device. |
| 1.4 | Auth | **Inherit, add nothing.** The fact-finder runs on `portal.` only (Cloudflare Access + Supabase sign-in + owner-only RLS). No client login in v1. |
| 1.5 | DPA | **Build to s.6 (in force) as if it had teeth; shape the data so Part IV can be switched on without a schema change.** As of 27 Oct 2026. |
| 1.6 | Spec changes | As listed in §1.6. |
| 1.7 | Exit path | **One storage adapter; a pure engine.** Changing backend or region touches one file. |
| 1.8 | Scope fences | As listed in §1.8. |
| 1.9 | Placement | **New page `fact-finder.html` (+ `fact-finder.js`) in `General-Rater-Portal`, portal build only, on branch `feat/fact-finder` cut from `main`.** `life-guided.js` and the public intake are not changed by this work. |
| 1.10 | Engine source | **The engine lives in `Financial-Planning-App/core` (TypeScript, pure). The portal vendors one built ES-module file, pinned to a commit hash.** No engine code is written in the portal. |

---

## 1.1 Storage location — why hosted

1. The page lives in a repo whose backend is already locked: `General-Rater-Portal`'s `CLAUDE.md` locks Supabase.
   The life intake already writes leads into `public.intakes` through `submit-intake`. Life applications,
   quarantined medical answers (`life_medical_histories`) and payment details (`life_payment_details`) already live
   in the same project. A local-first page would put a second data layer in the same repo.
2. The repo has already paid for a local-first-then-migrate once (`CLAUDE.md` item 11, `pipeline-migrate.js`,
   `pipeline-reconcile.js`, `pipeline-tombstones.js`, the run-51 lesson).
3. The closing engine creates a liability record (every gap ends as acted / declined / out of scope, with dates).
   On one browser, that record dies with a lost phone or a cleared cache.

**Cost:** no new money (already on Pro); breach surface real but not new; region `us-east-2` (see §1.5 s.6(l));
DB rows backed up daily; no Storage objects, so the storage-backup gap does not widen.

**Three new tables, all owner-only (`owner_id = auth.uid()`), all in `public`.**

| Table | Holds | Write rule |
|---|---|---|
| `life_cases` | One row per case. `intake_id` (nullable FK to `intakes`), `facts jsonb`, `assumption_set_id text`, `engine_version text` (pinned engine hash), timestamps. | Insert / update by owner. |
| `life_case_scope` | One row per gap outcome: `case_id`, `gap_key`, `state` (`acted`/`declined`/`out_of_scope`), `note`, `recorded_at`. | **Append-only.** No UPDATE, no DELETE grant. |
| `life_case_snapshots` | One row per "start the application": the rendered `ClosingComparison`, scope statement, `assumption_set_id`, `engine_version`. | **Insert-only.** Immutable. |

- `facts` is validated at the JS/TS seam against an exported `LifeCaseFacts` type before every write. Invalid
  facts raise `LifeCaseStoreError`; the store never writes a partial case.
- `personId` and `policyId` are UUIDv4 generated **on the device** at creation. Dedupe by id only.
- **Merge rule on sync:** last write wins **per case row**, by `updated_at`. No field-level merge. Scope and
  snapshot rows never conflict (append-only).
- **Migrations:** additive only, each with a `supabase/rollback/*.down.sql` file.

**Risk — a branch isolates code, not the database.** One Supabase project. The migrations are additive and touch
no existing table, and are applied only after this section is signed and the engine is merged.

## 1.2 Persisted vs memory only

| Class | Where |
|---|---|
| Captured facts (client, `People[]` incl. parents, `goals[]`, `existingCover[]`, assets) | `life_cases.facts` |
| Assumption set in force | `assumption_set_id` → a versioned constant in the engine |
| Scope outcomes, incl. cross-tier reorder requests | `life_case_scope` (append-only) |
| What was shown at the close | `life_case_snapshots` |
| Engine outputs (care graph, levers, scenarios, sentences, premium band, ladder) | **Memory only**; recomputed |
| Reveal layer, counterfactual clones, UI state | **Memory only** |
| Health yes/no and note | `intakes.payload` only |

Offline writes to `life_cases` and `life_case_scope` use the existing IndexedDB `offlineQueue` and clear on sync.
Nothing is written to `localStorage`. The page holds the open case in memory only.

## 1.3 Where `healthFlag` lives

- Only in `intakes.payload.f.healthFlag` / `healthNote`, owner-only. The manager role has no intake access.
- **Never copied** into `life_cases.facts`, `life_case_scope`, `life_case_snapshots`, any `notify-*` email body,
  or the WhatsApp bot line. The fact-finder page never reads it.
- Live discrepancy: `life-guided.js` line 330 passes `queueStrip: ['healthNote']`. Fix:
  `['healthFlag', 'healthNote']`, thank-you line "Kyron will ask about your health on the call." Ships separately
  (GRP brief `2026-10-27-life-phase0-fixes.md`).

## 1.4 Auth

1. `portal.kqminsurance.com` — Cloudflare Access, Supabase sign-in, RLS owner-only on the three new tables.
   `fact-finder.html` lives here only.
2. `quote.kqminsurance.com` — open, capture-only, unchanged. It never reads a case back.
3. "Resume" means **the advisor** reopens the case in the portal. A case may start from a life intake
   (`intake_id` prefill) or blank.
4. No client accounts in v1.

## 1.5 Data Protection Act — as of 27 Oct 2026

**In force:** Part I and ss.7–18, 22, 23, 25(1), 26, 28 from 6 Jan 2012 (LN 2/2012); s.42(a)–(b) from 23 Aug 2021
(LN 220/2021, public bodies only). Part I includes s.6, the General Privacy Principles, binding "all persons who
handle, store or process personal information belonging to another person".
**Not in force:** Part III (except s.42(a)–(b)), **Part IV (private sector, incl. s.69 and s.76)**, Part V, Part VI.
No later proclamation found on 27 Oct 2026.

Sources: Data Protection Act Chap. 22:04 (LRO, updated to 31 Dec 2016) via ttcsirt.gov.tt; LN 2/2012
(ttparliament.org); LN 220/2021 (dataguidance.com); UWI data-protection resource page (Feb 2025); Governance Atlas,
Trinidad & Tobago (Aug 2026).

| s.6 | Principle | Decision |
|---|---|---|
| (a) | Responsible | Kyron is the controller. In the privacy notice. |
| (b) | Purpose | Dependants screen: "to work out what cover would protect your family". |
| (c) | Consent | Client consent on the first screen ("needs analysis and contact") or carried from the intake. Third parties captured from the client, so minimise. |
| (d) | Minimum | **Parents:** relationship label, optional first name, **birth year only**, `careTier`, `receivesSCP`, NIS contributions yes/no/unknown. Full DOB only at application. |
| (e) | Retention | With a snapshot: 7 years from snapshot. Without: 24 months after last update. v1 lists due rows; deletion manual and owner-confirmed. |
| (f) | Accurate | Facts edited in place; scope and snapshots frozen. |
| (g) | Safeguards | §1.3, §1.4. |
| (h) | Sensitive | `careTier` stored as integer `0–4` only; labels in UI copy; **no free-text field on any parent, ever**. |
| (i)–(k) | Notice, access, challenge | One-page privacy notice linked from the page and the intake footer. Access by printing the case and snapshots. |
| (l) | Cross-border | Data in the USA (`us-east-2`). v1 accepts it; notice states it; legal review open. |

## 1.6 Changes to the three existing specs

All three briefs: engine work in `Financial-Planning-App/core` after `feat/domain-core` merges; page work in
`General-Rater-Portal` `fact-finder.html` / `fact-finder.js` on `feat/fact-finder`.

**Care graph brief:** parents by `birthYear`, `careTier` 0–4, no parent free text; `personId` device UUIDv4;
`CareGraphResult` exported from core; §9.4/§9.5 fences replaced by §1.10 and this section; Rest Assured II grading
"year two the greater of 25% of sum assured or premiums returned; accidental death pays in full from day one";
add guards 6–8, 12–13.

**Closing engine brief:** scope statement to `life_case_scope`; "start the application" writes one snapshot;
§1.3 never-copied list; `ClosingComparison` exported from core; same grading correction; §9.4/§9.5 replaced; add
guards 9–11.

**Addendum §11–15:** cross-tier reorder declined record is a `life_case_scope` row; §14.1 goldens recorded
against `assumption_set_id`.

**New guards** (each sabotage-tested before trusted)

6. **Pure engine.** `core/test/purity.test.ts`: no engine file imports Supabase, `fetch`, `localStorage`,
   `indexedDB` or any portal file.
7. **No parent free text.** A string field on a `parent` person fails `LifeCaseFacts` validation.
8. **No health in a case.** `healthFlag` / `healthNote` keys in `facts`, a scope row or a snapshot fail the write.
9. **Owner-only RLS.** Publishable key and a second user see zero rows on each new table.
10. **Append-only.** UPDATE and DELETE on `life_case_scope` and `life_case_snapshots` rejected.
11. **No health on the device.** The queued copy of a life submission has neither `healthFlag` nor `healthNote`.
12. **Portal-only page.** The build fails if `fact-finder.*` or the vendored engine appears in `dist/public`.
13. **Pinned engine.** The build fails if the vendored engine's recorded hash does not match its contents.

## 1.7 Exit path

The engine is pure (guard 6). All reads and writes go through one adapter, `life-case-store.js`. A region move is
a whole-project move, recorded as a follow-up.

## 1.8 Scope fences

1. No client accounts or client-facing case links.
2. No automatic deletion job.
3. No field-level merge.
4. No region move; s.6(l) legal review open.
5. No change to `life-guided.js`, the public intake or any existing table in `feat/fact-finder`.
6. No Storage objects.
7. No AgencyTrack integration (it runs on Firebase and does not hold the gap engine).

## 1.9 Placement

`fact-finder.html` + `fact-finder.js` in the GRP repo root; portal build only (guard 12); branch
`feat/fact-finder` from `main`, merged after the smoke walk. Reuses read-only: `portal-auth.js`,
`offline-sync.js`, design tokens, the intake's `goals[]` / `People[]` shapes.

## 1.10 Engine source

Same engine, two repos, vendored and pinned. New modules in `Financial-Planning-App/core` beside `gap.ts`, using
`ProvenanceBuilder` and parameter tables. `core` builds to one ES-module file, copied to the portal's
`vendor/fpa-core/` with `PINNED.txt` (guard 13). Not an npm package (extra publish step), not a submodule (breaks
on Cloudflare Pages builds). **`feat/domain-core` merges to `master` first.**

## Appendix — Rest Assured II grading (27 Oct 2026)

From `research/tatil-product-specifications.md` (Rest Assured 2024): year 1 premiums returned; year 2 the greater
of 25% of sum assured or premiums returned; year 3+ 100%. Accidental death pays in full from day one. No grading
text exists in the portal today; fixed in the GRP Phase 0 brief.
