#!/usr/bin/env bash
# Bootstrap rtk + Headroom on a fresh machine.
#
# Run this right after `pnpm cs --setup`, and BEFORE launching Claude Code.
# The restored claude-settings.json sets ANTHROPIC_BASE_URL=http://127.0.0.1:8787,
# so if Headroom is not installed and deployed, every API call fails with a
# connection refused. This script is what makes the restored settings usable.
#
# Safe to re-run: every step is idempotent.

set -euo pipefail

port=8787
ok() { printf '  \033[0;32m✓\033[0m %s\n' "$1"; }
info() { printf '  \033[0;36m·\033[0m %s\n' "$1"; }
fail() { printf '  \033[0;31m✗\033[0m %s\n' "$1" >&2; }

printf '\n\033[1m═══ Token savers bootstrap ═══\033[0m\n\n'

# ── PATH ───────────────────────────────────────────────────────────────────
# Both tools install to ~/.local/bin. The Claude Code hooks reference it
# explicitly via $HOME/.local/bin, but the checks below need it on PATH too.
export PATH="$HOME/.local/bin:$PATH"

# ── rtk ────────────────────────────────────────────────────────────────────
printf '\033[1mrtk\033[0m\n'
if command -v rtk >/dev/null 2>&1 && rtk gain >/dev/null 2>&1; then
  ok "already installed ($(rtk --version 2>/dev/null))"
else
  # Do NOT use `cargo install rtk` — that pulls an unrelated crate of the same
  # name (Rust Type Kit). The install script drops a static binary in ~/.local/bin.
  info 'installing via official install script…'
  curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh
  command -v rtk >/dev/null 2>&1 || { fail 'rtk install failed'; exit 1; }
  ok "installed ($(rtk --version 2>/dev/null))"
fi

# The PreToolUse hook comes from the restored claude-settings.json as
# "$HOME/.local/bin/rtk hook claude". Since rtk 0.37.2 that is a native binary
# call — no rtk-rewrite.sh, no bash, no jq. Only warn if it went missing.
if [[ -f "$HOME/.claude/settings.json" ]] && grep -q 'rtk hook claude' "$HOME/.claude/settings.json"; then
  ok 'PreToolUse hook wired'
else
  fail 'hook missing from ~/.claude/settings.json — run: rtk init -g'
fi

# ── Headroom ───────────────────────────────────────────────────────────────
printf '\n\033[1mHeadroom\033[0m\n'
if command -v headroom >/dev/null 2>&1; then
  ok "already installed ($(headroom --version 2>/dev/null))"
else
  # The CLI ships only in the PyPI package; the npm "headroom-ai" is a different,
  # CLI-less library. Python 3.13 or older — the dollar-savings tile needs LiteLLM,
  # which cannot install on 3.14+.
  info 'installing headroom-ai[all]…'
  if command -v uv >/dev/null 2>&1; then
    uv tool install --python 3.13 "headroom-ai[all]"
  else
    python3 -m pip install --user "headroom-ai[all]"
  fi
  command -v headroom >/dev/null 2>&1 || { fail 'headroom install failed'; exit 1; }
  ok "installed ($(headroom --version 2>/dev/null))"
fi

# This is the step that cannot be restored from a config file. It creates the
# deployment under ~/.headroom/deploy/init-user/ that the "init hook ensure
# --profile init-user" hooks in settings.json start the proxy from. Without it
# those hooks exit 0 silently and nothing ever listens on the port.
if [[ -f "$HOME/.headroom/deploy/init-user/manifest.json" ]]; then
  ok 'deployment "init-user" already present'
else
  info 'creating deployment + routing (headroom init claude -g)…'
  headroom init claude -g
  ok 'deployment created'
fi

# Never leave a machine with ANTHROPIC_BASE_URL pointing at a dead port.
info 'starting proxy…'
headroom init hook ensure --profile init-user --marker headroom-init-claude || true
for _ in $(seq 1 30); do
  curl -sf -m 2 "http://127.0.0.1:${port}/health" >/dev/null 2>&1 && break
  sleep 1
done

if curl -sf -m 2 "http://127.0.0.1:${port}/health" >/dev/null 2>&1; then
  ok "proxy healthy on :${port}"
else
  fail "proxy did NOT come up on :${port}"
  fail 'ANTHROPIC_BASE_URL in settings.json points at a dead port — Claude Code will'
  fail 'fail to reach the API. Fix Headroom or remove the env block before launching.'
  exit 1
fi

# ── Ponytail ─────────────────────────────────────────────────────────────────
printf '\n\033[1mPonytail\033[0m\n'

# Ponytail is not a proxy or a filter, it is a Claude Code plugin holding a ruleset that
# keeps the model from over-building. It saves tokens upstream of both other tools, in
# output that never gets generated, so it has no ledger and nothing to keep running.
if ! command -v claude >/dev/null 2>&1; then
  fail 'claude CLI not found, skipping — install it then re-run this script'
elif claude plugin list 2>/dev/null | grep -q 'ponytail@ponytail'; then
  ok 'plugin already installed'
else
  # Two separate commands, the marketplace has to be registered before the install resolves it.
  info 'installing plugin ponytail@ponytail…'
  claude plugin marketplace add DietrichGebert/ponytail >/dev/null
  claude plugin install ponytail@ponytail >/dev/null
  if claude plugin list 2>/dev/null | grep -q 'ponytail@ponytail'; then
    ok 'plugin installed'
  else
    fail 'ponytail install failed'
  fi
fi

# The plugin runs two Node lifecycle hooks. Without node the skills still work, the
# always-on activation just stays quiet, so this is a warning and never a hard failure.
command -v node >/dev/null 2>&1 || info 'node is not on PATH, ponytail activation will stay quiet'

# ── Verify ─────────────────────────────────────────────────────────────────
printf '\n\033[1mVerify\033[0m\n'
headroom doctor || true
printf '\nThe "claude" and "shell env" rows above must both pass.\n'
printf 'Then restart Claude Code and confirm savings accrue: headroom savings\n'
printf 'For the combined picture across the three tools: token-saved\n\n'
