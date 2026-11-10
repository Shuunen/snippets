---
name: fix-projects
description: Run repo-checker with --fix over every project in ~/Projects/github, plan and apply fixes for every non-destructive issue it still reports (batched by rule or project by project), let the user review, commit on master, then watch each project's CI and fix red ones. Teaches repo-checker's docs/checks.md the fixes it learns. Use whenever the user types /fix-projects or asks to fix, clean up, sync, or bring all their projects/repos in line with repo-checker, even if they don't name the tool.
---

# fix-projects

Bring every project in `~/Projects/github` to a clean `repo-check` report, with the user reviewing before anything is committed.

Paths: `$HOME/Projects/github/repo-checker` is the tool, `$HOME/Projects/github` is the target. Resolve `$HOME` on Windows via Git Bash (`~`).

## Scope: what is and is not fixed

Why this matters: a fix run over dirty clones or deleted branches can silently destroy or commit unfinished work. Respect these limits even when a fix looks obvious.

**Done automatically** (the user pre-approved these):

- `git fetch`, rebase onto the default branch when the clone is clean, and cloning repos that are `not-cloned`.
- Deleting stale local branches (merged, or confirmed by repo-check), deleting remote branches that are already merged, and dropping stashes (`forgotten-stash`). Before dropping a stash, glance at `git stash show -p` and keep it if it looks like real unfinished work, and tell the user.
- Every other file-level finding: dependency bumps (minor and major), config files, scripts, renovate, oxlint/oxfmt, etc.

**Report only, never touch:** the whole Sync group except cloning (`archived-clone`, `pristine-fork`, `archived-with-unsaved-work`, `broken-clone`), unarchiving or deleting anything on GitHub, and anything that needs the user's taste (for example `multiple-lockfiles`: ask via the interview skill).

**Dirty clones:** if a project has `uncommitted-files` or `unpushed-commits` before you start, do not mix your fixes into it. Look at what the dirty files are (`git status --short`). If they are trivial and unrelated, say so and ask once whether to proceed or skip that project. Never `git stash` or reset the user's work to make room.

## Workflow

1. **Preflight.** `gh auth status` must pass. In repo-checker run `git pull --ff-only` and, if `dist/` is stale or missing, `pnpm run build`; otherwise use `bun src/cli.ts`. Note which projects are dirty (see above).
2. **Fix pass.** `cd ~/Projects/github/repo-checker && bun src/cli.ts --target=$HOME/Projects/github --fix --nitpick`, saving the output to the scratchpad. `--fix` edits files and commits nothing. Read the report: lines are `project  check-id  message` under error / warning / info headings. Then rerun without `--fix` to get what remains.
3. **Plan.** Group the remaining findings by check id, then by project. Decide per group:
   - **Batch by rule** when the same mechanical fix applies to 2+ projects (bump a dependency to the same version, add the same config key or script). Do one project first, verify it, then replay the same change on the others. One consistent change set is easier to review and cheaper.
   - **Project by project** when the fix needs reading that project's code, or a batched fix broke something (failing `pnpm check`). Use one subagent per project, because repos do not interfere.
   - Order: housekeeping (fetch, rebase, branch and stash cleanup, cloning) first, then batches, then per-project work.
     Show the plan briefly before executing. If a rule has no autofix and you are unsure how the user wants it fixed, use the `interview` skill (one question at a time) instead of guessing.
4. **Execute.** Apply all the fixes planned for a project, then, once that project is done, run `pnpm check` if its `package.json` has a `check` script (it mirrors the CI, so a pass here is the best predictor that the CI will pass, and it also runs repo-check). Fix what breaks and rerun until green. Do not run it after every single fix, once per project at the end is enough, and run projects one at a time, never in parallel (parallel runs cause worker timeouts and port clashes that look like real failures). `--fix` writes config files unformatted, so run `pnpm run lint:format:fix` after it. When oxlint `typeCheck` reports `TS2591` on `playwright.config.ts`, add that file to `tsconfig.node.json` `include`. A project without a `check` script falls back to whichever of `lint`, `build` and `test` exist, and a repo without a `package.json` has nothing to run, so skip the check and commit once its window is closed. A project must pass before it goes into review. This does not replace step 7: the real CI is still watched after the push. Never disable a lint rule to get green: fix the code, or ask.
5. **Learn.** Every time you solve a finding that repo-check cannot fix itself, add the recipe to `repo-checker/docs/checks.md` on that check's own line, as a `Fix:` sentence in the same style as the other checks (for example `No fix, ...` becomes `Fix: ...`, saying what to change and the pitfalls you hit). Never add sub-lines or a separate section, the file is one line per check. Keep the check's emoji, id and detection text untouched. Commit that on repo-checker's master as its own commit, like the rest, only after the user's go-ahead.
6. **Review, one project at a time.** First show a compact table (project, rules fixed, files touched, CI status before, one line per batch) so the user sees the whole picture. Then go through the projects that need approval one by one, never all at once. For each: open it with `code -n --wait <project path>` in the background (`run_in_background`), tell the user which project is open and what changed, and do nothing else on that project. The user reviews and edits freely; closing the VS Code window is the signal that they are done. The user's existing uncommitted work (README, docs, etc.) is part of the review and gets committed as its own commit. Offer the full diff on request.
7. **Commit and push, per project, after its review window closes.** Run `pnpm run lint:format:fix` first, since edits made in the window often leave config files unformatted, then `pnpm check` (one project, not in parallel) and fix what the user's edits broke. If green and the project is on its default branch: commit (one commit per rule for batches, the user's own work in a separate commit, conventional message matching that repo's history, no attribution lines), push, then watch CI with `gh run list --branch <default> --limit 1 -R Shuunen/<repo>` and `gh run watch` in the background while the next project's window opens. If the project is on another branch, or `pnpm check` stays red, stop and ask the user (interview skill) what to do instead of committing. Never commit before that project's window was closed.
8. **Red CI.** Read the failing logs (`gh run view --log-failed`), fix in that project, commit, push, watch again. If it is still red after two attempts, stop and report what you tried instead of looping.
9. **Final report.** Per project: green / fixed after retry / red. List everything left alone and why (report-only items, skipped dirty clones, rules awaiting a decision), and the `checks.md` notes added.

## Self-improvement

This skill should get better with every run. While working, notice what the skill did not tell you and you had to figure out, or what the user corrected:

- the user corrects or overrules a decision (scope, batch vs project, review format, commit style)
- you hit a pitfall that cost time (a repo that needs a special step, a `pnpm check` quirk, a CI failure pattern, a Windows path problem)
- a rule, a project type, or a situation the workflow does not cover
- a step that was useless or that you had to do differently to succeed

Do not edit the skill silently. Collect the candidates during the run, and at the final report (step 9) propose them in one short list, each with the exact sentence you would add or change and the step it lands in. Ask the user, one proposal at a time (use the `interview` skill), whether to apply it. Apply only the accepted ones, keeping the skill lean: fold a new lesson into the step it belongs to, generalize it instead of recording a one-off, and drop an instruction that turned out to be wrong rather than piling on exceptions. Per-rule fix recipes still go to `repo-checker/docs/checks.md` (step 5), not here: this section is for the behaviour of the skill itself.

After editing `~/.claude/skills/fix-projects/SKILL.md`, mirror it to `~/Projects/github/snippets/configs/files/claude-skill-fix-projects.md` and run `pnpm run lint:format:fix` and `pnpm check` there, then copy the formatted file back so both stay identical. Leave committing that repo to the user's go-ahead.

## Conventions to honor in the projects

Projects follow the user's global rules: camelCase constants, `undefined` not `null`, no disabled lint rules without asking, `pnpm check` after any code change. Read a project's own `CLAUDE.md` if present before editing its code.
