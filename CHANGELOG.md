# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2026-08-16

### Added

- `src/compress-all-images.sh` — batch image compressor: backs each file up, then re-compresses it in place. JPEG stays JPEG and PNG stays PNG so transparency is never flattened, lossy PNG candidates must clear a PSNR gate, and EXIF is kept unless `--strip-metadata` is passed. Supports `--dry-run`, `--quality`, `--gate`, and parallel jobs.
- `src/compress-all-images.bats` — 23 black-box tests covering the CLI surface, compression behaviour, transparency, files the script must not touch, and re-run safety
- `test:shell` task (bats) wired into `pnpm check`, turbo, and CI, with ImageMagick/pngquant/jpegoptim installed in the CI job

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
