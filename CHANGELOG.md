# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-05-25

### Added

- `src/bin/lint.cli.ts` — custom markdown linter for manuals (single H1, has content, no TODOs, kebab-case filenames)
- `src/plugins/unique-mark.ts` — vitest plugin ensuring unique test markers
- `src/http-proxy.cli.ts` — local HTTP proxy for forwarding webhook POST requests
- `src/check-souvenirs.cli.ts` — media file checker with timezone offset formatting and MKV metadata editing
- `src/clean-ytdl.cli.ts` — youtube-dl output cleaner
- `src/stock-infos.cli.ts` — stock information fetcher
- `src/eslint-cleaner.cli.ts` — removes unused ESLint disable comments
- New manuals: `epomaker-split65-keyboard.md`, `fnirsi-fnb58-usb-meter.md`, `google-photos-takeout.md`, `preventing-sleep-wake.md`, `sizes.md`, `tx401-v2.md`
- New ComfyUI workflow configs and phomemo printer PPD
- pnpm workspace + turbo pipeline replacing bun workspaces and nx

### Changed

- Renamed `one-file/` directory to `src/` for all scripts
- Switched package manager from bun to pnpm (`pnpm@10.30.3`)
- Replaced biome with oxlint + oxfmt for linting and formatting
- Replaced nx with turbo for task orchestration
- Upgraded to TypeScript 6, Vite 8, Vitest 4
- CI updated to Node 24, pnpm cache, and `pnpm run check`
- Updated configs: vscode settings, espanso, qBittorrent, mpv, gitconfig, bashrc, bash aliases

### Removed

- `one-file/` directory (all files moved to `src/`)
- `biome.json`, `.nvmrc`, `vitest.config.ts` (replaced by `vite.config.ts`)
- nx configuration and bun.lock
