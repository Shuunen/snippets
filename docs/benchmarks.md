# Benchmarks

## Eslint

`hyperfine --runs 3 --warmup 1 'npx eslint --ext .js,.ts .'`

|     date     | delay |  node   |      machine      | comment      |
| :----------: | :---: | :-----: | :---------------: | ------------ |
| 2024-04-15#1 | 8.5s  | 20.12.1 | romain nzxl win11 | actual setup |

Note 1 : to show time taken by rules : `TIMING=1 npx eslint --ext .js,.ts .`

Note 2 : to view final config : `npx eslint --print-config configs/bin/files.js > eslint-js.config.json && npx eslint --print-config utils/add.utils.ts > eslint-ts.config.json`

Note 3 : to list eslint scanned files : `DEBUG=eslint:cli-engine npx eslint --ext .js,.ts .`
