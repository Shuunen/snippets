# Webpack Bundle Analyzer

1. Generate statistics from build : `ng build --prod --build-optimizer --aot --stats-json`
2. Use binary webpack-bundle-analyzer : `npx webpack-bundle-analyzer dist/stats.json`
3. Check the [report on 127.0.0.1:8888](http://127.0.0.1:8888) that should look like this :

![webpack-bundle-analyzer](https://i.imgur.com/iO5MyHt.png)
