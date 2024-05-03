# Benchmarks

## Eslint

`hyperfine --runs 3 --warmup 1 'npx eslint configs one-file'`

|     date     | delay |  node   |      machine      | comment               |
| :----------: | :---: | :-----: | :---------------: | --------------------- |
| 2024-04-15#1 | 8.5s  | 20.12.1 | romain nzxl win11 | actual setup          |
| 2024-04-15#2 | 8.0s  | 20.12.1 | romain nzxl win11 | super split override  |
| 2024-04-15#3 | 8.2s  | 20.12.1 | romain nzxl win11 | + hc for js/mjs files |
| 2024-05-03#1 | 5.3s  | 20.12.2 | romain duc win11  | nice cpu ^^           |

Note 1 : to show time taken by rules : `TIMING=1 npx eslint configs one-file`

Note 2 : to view final config : `npx eslint --print-config configs/bin/files.js > eslint-js.config.json && npx eslint --print-config utils/add.utils.ts > eslint-ts.config.json`

Note 3 : to list eslint scanned files : `DEBUG=eslint:cli-engine npx eslint configs one-file`
