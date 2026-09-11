@RTK.md
# graphify
- **graphify** (`~/.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, invoke the Skill tool with `skill: "graphify"` before doing anything else.

# headroom
Headroom is wired by `headroom init claude -g` only. Never create a `headroom-autostart.sh`
SessionStart hook: it sets `ANTHROPIC_BASE_URL` via `$CLAUDE_ENV_FILE`, which Claude Code never
sets, so it routes nothing — and it races the real deployment for port 8787.
