---
name: update-project
description: Bring a project up to date - dependencies, lockfile, pnpm catalog, CI action versions, Node/package-manager versions - then verify with the project's own check task and fix whatever broke. Interviews the user about newly-firing lint rules. Use when the user says "update this project", "update deps", "bump dependencies", "make this repo current", or runs /update-project.
disable-model-invocation: true
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - WebFetch
---

# update-project

Maintenance pass on a personal project. The goal is a repo that is current **and still
green**, with every judgement call surfaced to the user rather than silently made.

## Hard rules

- **Never commit, push, open a PR, merge, or close a PR without an explicit green light.**
  Edit files, report, stop, wait.
- **Every question goes through the `interview` skill.** Invoke it (Skill tool) before
  asking anything — lint rules, branch reuse, merge, squash-or-keep, closing PRs. It owns
  the format: one question at a time, numbered answers with a recommendation, free-text option.
- **Never blind-`--fix`.** Linter autofix can change semantics (sorted object keys,
  stripped assertions, rewritten matchers). Always read the diff before keeping it.
- **Never disable a lint rule on your own** — that is what the rule interview is for.

## Phase 0 — Sync, then detect

**Step 1 — Sync (always first).** Get the latest source before anything else, so the
baseline and the update run against current code:

- On any branch other than the default (`main` / `master`) → **do not pull or fetch
  anything.** Leave it as is.
- On the default branch (`main` / `master`) → `git fetch`, and if it is behind its
  upstream, `git pull --ff-only`. If already up to date, do nothing. If the working tree
  is dirty or it cannot fast-forward, stop and report.
- No remote/upstream configured → say so and continue.

**Step 2 — Detect.** Work out, and print in one line, before touching anything:

- Package manager — this skill is **pnpm-only**. Confirm `pnpm-lock.yaml` exists; if the
  lockfile is `package-lock.json` / `bun.lock` / `yarn.lock` instead, stop and say so.
- Verification command — prefer a `check` script; else combine the `lint*` / `test*` /
  `build*` scripts that exist; else look for a Makefile or CI steps.
- CI — `.github/workflows/*.yml`.
- Workspace/catalog — `pnpm-workspace.yaml`, workspace globs.
- Bot overlap — `renovate.json` / `.github/dependabot.yml`.

If there is **no verification command**, stop and offer to create a `check` script wiring
up whatever lint/test/build scripts do exist. Do not proceed unverified.

## Phase 1 — Baseline

Run the verification command **before changing anything**. If it is already red, stop and
report: a red baseline makes every later failure unattributable.

## Phase 2 — Branch

If on the default branch (already pulled in Phase 0), use the single, fixed branch name
`chore/update-deps` — never a dated or suffixed variant, so there is only ever one
update branch. If already on a feature branch, stay there. Never commit yet.

If `chore/update-deps` already exists locally, inspect it first (`git log <default>..chore/update-deps`,
`git branch -vv`, `git ls-remote --heads origin chore/update-deps`):

- **Stale** (its PR is merged/closed, its remote is gone, or its commits are already in the
  default branch, e.g. via squash) → delete it (`git branch -D chore/update-deps`) and
  recreate it from the default branch with the same name. No need to ask.
- **Still live** (open PR, or unpushed/unmerged commits not on the default branch) → do
  not delete or overwrite. Ask the user (one question) whether to continue on it, or
  discard it and start over.

## Phase 3 — Dependencies

Update in two layers so every failure is attributable:

1. **Patch + minor batch** — bump everything that stays within its current major. Run the
   verification command and fix what broke.
2. **Majors batch** — `pnpm update --latest`. Ranges are **not** preserved: everything goes
   to latest and normalizes to `^`, including `~` and exact pins. Run the verification
   command.
3. **If the majors batch is red**, bisect: revert the majors, then apply them one by one
   (check after each) to find the culprit.

Fix what broke:

- For each failure, read the offending package's release notes / migration guide before
  guessing from the error text.
- Bounded autonomy: try a few rounds. If still red, identify the culprit package, pin it
  back to its previous version, confirm green, continue. **Record every pin-back** — these
  go in the final report for the user to decide on.
- Exact dev-preview pins (e.g. `@typescript/native-preview`) get flattened by this policy
  and are a likely source of breakage — a pin-back here is normal, not a failure.

## Phase 4 — Lint rule interview

When a linter major lands, its preset enables new rules automatically. Find the ones that
**actually produce findings** in this codebase — rules that fire zero times need no
decision, just a mention in the report.

For each firing rule, interview the user (via the `interview` skill) with these answers:

1. Keep it on and fix the codebase.
2. Set it to `off` globally in the lint config.
3. Free text — something else.

Include in the question: what the rule checks, how many violations, a representative
example from the real code, and whether the fix is mechanical or a judgement call.

If a linter major changed its config file shape, run the tool's own migration command
rather than hand-editing.

## Phase 5 — Toolchain

- **Node**: track the current **LTS**. Write it to CI `node-version`. Sync `engines` /
  `.nvmrc` if present; do not create them if absent. Leave `@types/node` on its latest
  major even when that runs ahead of the LTS — it ships no code, and the newest line is
  the one actually tested against current TypeScript, so downgrading it to match trades
  a real risk of type errors for a theoretical one. Only align it to the LTS major when
  `@types/node` types code that ships to the runtime, rather than build tooling.
- **Package manager**: bump the `packageManager` field to the latest of that manager.
- **GitHub Actions**: bump every `uses:` to its latest tag. Before any **major** bump,
  fetch the action's release notes and check for breaking changes to the inputs this
  workflow actually passes, then adjust the workflow. Flag the runner image too.
- CI cannot be verified locally — that is what Phase 8 is for.

## Phase 6 — Extras

All of these are in scope:

- **Tool update notices** — read the output of the final verification run for maintenance
  banners (e.g. turbo's `Update available v2.11.6 ≫ v2.11.7 … Run "pnpm dlx @turbo/codemod@latest update"`).
  If one shows up, the tool is behind even after the dependency batches (the registry
  moved, or its config needs migrating): run the command the banner suggests, review the
  diff (config files like `turbo.json` may change), then re-run the verification command
  and confirm the banner is gone. Report it under extras.
  - The codemod prompts interactively; run it non-interactively as
    `pnpm dlx @turbo/codemod@latest update . --force --print </dev/null`.
  - If it fails with "package manager did not install the expected version", the target
    release is probably younger than pnpm's `minimumReleaseAge` supply-chain policy (check
    the publish time with `pnpm view <pkg> time --json`). Do **not** bypass or weaken the
    policy: leave the tool as is, make no changes, and report it as "not yet installable"
    with the date it will clear. If the codemod said "no codemods required", note that
    the bump is version-only.
- `pnpm audit` — fix known vulnerabilities.
- `pnpm dedupe` — collapse duplicate versions after updating.
- **Deprecated packages** — flag any dep marked deprecated by its author, name the
  modern replacement (often a stdlib/native feature now), and propose the swap.
- **Unused dependencies** — deps nothing imports anymore; propose removal.
- **Catalog sync** — keep `pnpm-workspace.yaml` catalog entries and the `catalog:`
  references in lockstep.
- **TypeScript `target`/`lib`** — bump when the minimum Node version rose.
- **Stale files** — dead `package.json` scripts, orphan workflow files, config for tools
  no longer installed.
- **CHANGELOG + VERSION** — record the update following the project's existing convention
  (check `CLAUDE.md`; some repos keep `VERSION` in sync with `package.json` and have a
  changelog generator CLI).

If a dependency bot is configured (`renovate.json`, dependabot), leave it in place as the
patch/minor safety net — this skill is the manual pass that handles majors, code fixes and
toolchain. Check its config is not itself stale, and flag once if its range policy
contradicts what this skill just did.

## Phase 7 — Report and stop

Verification command green. Then report:

- What moved, grouped: deps / lint rules / CI / toolchain / extras.
- **Pinned back** — package, target version, why, what broke.
- **Decisions taken** — every rule interview answer.
- **Unverified** — CI changes, anything not covered by the check task.
- Anything deliberately left alone.

Then **stop and wait for the green light.**

## Phase 8 — On green light only

Commit in logical groups — deps / lint rules / CI / toolchain — then push and open a PR
whose body is the Phase 7 report. Then verify the real CI run on that PR with
`gh run watch` (or `gh run list` + `gh run view --log-failed`). If CI is red, fix it and
report; the local check cannot catch workflow breakage.

When CI is green, **ask** whether to merge. Never merge without an answer. If the user
agrees, ask one follow-up question: **squash** the commits or **keep** them (merge commit
or rebase, per the repo's allowed methods). Then merge with the chosen approach
(`gh pr merge <n> --squash|--merge|--rebase --delete-branch`).

## Phase 9 — After merge

First, go back to the default branch locally: `git switch <default>` (`main` / `master`)
and `git pull --ff-only`. Then clean up useless branches: list local branches
(`git branch -vv`) and delete the ones that are merged, or whose remote is gone
(squash-merged branches are not seen as merged by `git branch --merged`, so also check
`[gone]` upstreams and whether their PR is merged/closed). Never delete a branch with
unmerged, unpushed work or an open PR — list those and ask instead.

Then list the other open dependency-related PRs (Renovate / Dependabot,
via `gh pr list`). Offer, in one question, to close the ones now superseded, with a short
comment saying why. Never close without confirmation.
