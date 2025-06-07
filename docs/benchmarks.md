# Benchmarks

## Eslint

`hyperfine --runs 3 --warmup 1 'npx eslint configs one-file'`

|     date     | delay | node  |      machine      | comment                                                            |
| :----------: | :---: | :---: | :---------------: | ------------------------------------------------------------------ |
| 2024-04-15#1 | 8.5s  | 20.12 | romain nzxl win11 | actual setup                                                       |
| 2024-04-15#2 | 8.0s  | 20.12 | romain nzxl win11 | super split override                                               |
| 2024-04-15#3 | 8.2s  | 20.12 | romain nzxl win11 | + hc for js/mjs files                                              |
| 2024-05-03#1 | 5.3s  | 20.12 | romain duc win11  | nice cpu ^^                                                        |
| 2024-07-06#1 | 5.6s  | 20.10 | romain gram zorin | nice cpu too ^^                                                    |
| 2024-07-06#2 | 4.2s  | 20.10 | romain gram zorin | after eslint-plugin-shuunen migration                              |
| 2025-03-01#1 | 5.5s  | 22.14 | romain duc win11  | gram & linux are often better                                      |
| 2025-06-07#1 | 5.2s  | 22.15 | romain duc win11  |                                                                    |
| 2025-06-07#2 | 4.1s  | 22.15 | romain duc win11  | using `bunx` instead of `npx`                                      |
| 2025-06-07#3 | 2.1s  | 22.15 | romain duc win11  | using `npx biome check configs one-file`                           |
| 2025-06-07#4 | 0.3s  | 22.15 | romain duc win11  | using `bunx biome check configs one-file` bye bye `eslint` & `npx` |

Note 1 : to show time taken by rules : `TIMING=1 npx eslint configs one-file`

Note 2 : to view final config : `npx eslint --print-config configs/bin/files.js > eslint-js.config.json && npx eslint --print-config utils/add.utils.ts > eslint-ts.config.json`

Note 3 : to list eslint scanned files : `DEBUG=eslint:cli-engine npx eslint configs one-file`
