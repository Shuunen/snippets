# CLAUDE

## Skill routing

Always invoke a skill FIRST for matching requests — do not answer directly.

- Brainstorm / product idea → office-hours
- Bug / error → investigate
- Ship / deploy / PR → ship
- QA / find bugs → qa
- Code review → review
- Update docs → document-release
- Weekly retro → retro
- Design system → design-consultation
- Visual audit → design-review
- Architecture review → plan-eng-review
- Save / resume progress → context-save / context-restore
- Code quality → health

## Project docs

- `CHANGELOG.md` — release history
- `TODOS.md` — open work items
- Design doc: `~/.gstack/projects/Shuunen-snippets/`

## After any codebase change

Run `pnpm check` (types, formatting, lint, build, tests). Fix all failures before done.

## Linting rules

Never disable a lint rule without asking the user. Try to fix the code first then if too complex, ask the user if they want to disable the rule for that line/file.

## Code practices

- **Constants**: camelCase only, never UPPER_SNAKE_CASE
- **Absent values**: `undefined`, never `null`; use `isNil` from es-toolkit to check
- **Null coercion in Zod**: `.nullish().transform(x => x ?? undefined)`
- **Narrowing**: use `invariant(x, "msg")` from es-toolkit — never `x!` or silent `if (!x) return`

## Testing practices

- **Globals**: `describe`, `it`, `expect` are global — do not import them
- **File naming**: `.test.ts` / `.test.tsx` only, never `.spec.ts`
- **Spacing in tests**: in unit and e2e files, inside `test`/`it` blocks, do not include empty lines for visual spacing
- **Selectors**: `getByTestId` / `queryByTestId` / `getAllByTestId` only — no role/text/label queries
- **testid format**: kebab-case; use `kebabCase` from es-toolkit for dynamic ids
- **Assertions**: never `toBeInTheDocument()` after `getByTestId` (redundant); use `toHaveTextContent`, `toHaveClass`, `toHaveAttribute` instead
- **Fail loudly**: pair `expect(x).toBeDefined()` with `invariant(x, "msg")` — never `if (!x) return`
- **Type checks**: `toBeTypeOf("number")` over `expect(typeof x).toBe("number")`
