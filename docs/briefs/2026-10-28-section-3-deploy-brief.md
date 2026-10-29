# BRIEF 28 Oct 2026 — Section 3: catch up with main, then deploy

Model: **Claude Opus 5.5, effort medium.** One session, no subagents. Do not use `/model` mid-session.
Start in `C:\Projects`. Use the worktree `C:\Projects\GRP-wt-section3` (`feat/section3-page`, PR #161).
GRP `CLAUDE.md` holds, including Phase 5 (deploy) and "`main` = what is live".

Approved by Kyron, 28 Oct 2026: Section 3 and its fix run are reviewed; deploy it.

## Why this run

`feat/section3-page` (head `83324ee`) is **9 commits behind `origin/main`** (head `3e069d1`). Those 9 are today's motor
and print work: the approval pop-up, the manager's motor loadings, the motor proposal and life forms print fixes,
shell v346, and the TATIL forms amendment note. They are probably live on the portal. A deploy from the branch as it
stands would roll them back.

## Steps

1. Fetch. Merge `origin/main` into `feat/section3-page`. Use a merge commit, not a rebase.
2. **Conflicts:** keep both sides. The service worker or shell version takes the **higher** number, plus one. If a
   conflict is in fact-finder code and the right answer is not clear, stop and report it.
3. Run guards 13 and 15, then the full portal suite once. **0 fail** is the gate. The 30 live-database skips stay
   as they are.
4. Short smoke walk at 390, Supabase stubbed, ZZ clients:
   1. The fact-finder sample family, start to final report.
   2. One motor quote through to send-for-approval (today's pop-up).
   Evidence goes in `docs/audit/evidence-2026-10-28-section3/deploy/`.
5. Push the branch (PR #161 updates).
6. Deploy per `CLAUDE.md` Phase 5: `node build-deploy.js`, then `wrangler pages deploy` for **tatil-portal**
   (`dist/portal`) and **tatil-intake** (`dist/public`). Use the account that holds the tatil projects.
7. Verify each live `build-info.json` shows the new branch head, using node `fetch`. Retry for up to 3 minutes while
   the edge updates. Read the portal through Access the same way as the last deploy.
8. Fast-forward `main` to the deployed commit and push. This marks PR #161 as merged.

## Hard stops

1. A fact-finder conflict with no clear answer.
2. Any test fails, or can pass only by being deleted or skipped.
3. A live `build-info.json` does not show the new head after 3 minutes.
4. Any database change. None is needed for Section 3.

## Report

Write `docs/audit/RUN-2026-10-28-section3-deploy.md` with:
- the merge, and every conflict and how it was resolved;
- the test result;
- the smoke walk;
- the live sha for both sites;
- the new `main` head.
