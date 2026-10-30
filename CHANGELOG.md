# Changelog

All notable changes to this project will be documented in this file.

## [0.6.1] - 2026-10-30

### Changed

- Dependencies updated: `es-toolkit` 1.52 → 1.53, `exiftool-vendored` 39.0 → 39.1, `knip` 6.42 → 6.44, `oxfmt` 0.74 → 0.75, `oxlint` 1.89 → 1.90, `@types/node` 26.6.6
- `packageManager` bumped to pnpm 12.16.1, `.nvmrc` and CI to Node 26 (new LTS)
- TypeScript target and lib of the Node config bumped to ES2025

## [0.6.0] - 2026-10-30

### Added

- `net-scan` scans every active network of the machine (wifi, ethernet...) and lists the living devices with their IP, response time and MAC address, like SoftPerfect Network Scanner does
- Names come from mDNS, NetBIOS and reverse DNS, the vendor from the IEEE MAC database, and the names you give to devices are stored in a text file (`MAC=name`) that is backed up before the first save
- Live mode scans again every 30 seconds and shows a desktop notification and a sound when a new device appears, `l` turns it on or off, `--once` prints the report and leaves
- Select a device with the arrow keys and press enter to rename it, new devices are shown in green and unknown ones in yellow
- Optional `hints` (`h`) and `network` (`n`) columns show everything else known about a device: other names, vendor, open services, random MAC address and tracking, `--hints` and `--network` start with them shown
- The table fits the terminal: names end with an ellipsis, the rows scroll around the selected device with a count of the hidden ones, and emoji and wide characters are measured correctly
- Arguments are checked, `--help` shows the usage and the keys

## [0.5.0] - 2026-10-30

### Added

- `bench-drive` benchmarks a drive or USB key and shows sequential and random read/write speeds, sustained write speed (size of the fast write cache), and small files rate, without touching existing data: a temporary 1 GB file is written, read back with a content check, then deleted
- Pick the drive interactively or pass a folder to benchmark the drive hosting it, drives with too little free space or no writable folder are not selectable
- Warns when a USB 3 drive runs in a slower USB 2 mode
- Results can be copied as a tab-separated row ready to paste in the drives spreadsheet, with brand, model, serial, size, OS and filesystem detected automatically on Linux and Windows

## [0.4.1] - 2026-10-24

### Changed

- Dependencies updated: `shuutils` 11 → 12, `oxfmt` 0.73 → 0.74, `oxlint` 1.88 → 1.89, `turbo`, `vite`, `bun` and other patch bumps
- `packageManager` bumped to pnpm 12.15.0, `.nvmrc` to Node 24.22.1
- Code adjusted for new oxlint rules `prefer-string-raw` and `prefer-string-replace-all`

## [0.4.0] - 2026-10-23

### Added

- `catalog-media` scans your movie and tv show folders (local paths or `smb://` shares) and builds one `catalog-media.html` page with posters, ratings and the best resolution found for each title
- When a title lives in several folders, the copy with the best quality is the one listed
- Posters and video resolutions are cached between runs, `--no-cache` forces a fresh scan

## [0.3.1] - 2026-10-20

### Changed

- Dependencies updated: `exiftool-vendored` 38 → 39, `oxfmt` 0.71 → 0.73, `oxlint` 1.86 → 1.88, `vitest` 5.0.3 → 5.0.5, `turbo`, `vite`, `bun` and other patch bumps
- `packageManager` bumped to pnpm 12.14.0

## [0.3.0] - 2026-09-20

### Added

- `pnpm cs` now opens a full-screen terminal merge UI (à la Meld) for any config file that's out of sync on both sides: side-by-side boxes with syntax highlighting, block-by-block navigation and left/right selection, live color-coded diff gutters, text wrapping, and a fallback to an external tool (meld, kdiff3, diffuse, bcompare, araxis merge) when you'd rather use one

### Changed

- `configs/bin/*` rewritten from JS to TypeScript, split into small focused modules (sync, merge)
- Config sync writes are now crash-safe: the merge UI and CRLF-fix pass write through a temp-file-then-rename instead of truncating in place, and the sync CLI now exits non-zero on a failed run instead of silently reporting success

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
