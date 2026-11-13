<h1><img src="docs/static/logo.png" alt="htmlnano logo" width="90" align="absmiddle">&nbsp;htmlnano</h1>

[![npm version](https://badge.fury.io/js/htmlnano.svg)](http://badge.fury.io/js/htmlnano)
![CI](https://github.com/maltsev/htmlnano/actions/workflows/ci.yml/badge.svg)

Modular HTML minifier, built on top of the [PostHTML](https://github.com/posthtml/posthtml). Inspired by [cssnano](https://github.com/cssnano/cssnano).

## Documentation

<https://htmlnano.netlify.app>

## Usage

```bash
npm install htmlnano
```

```js
const htmlnano = require('htmlnano');
const options = {
    removeEmptyAttributes: false, // Disable the module "removeEmptyAttributes"
    collapseWhitespace: 'conservative' // Pass options to the module "collapseWhitespace"
};
// posthtml, posthtml-render, and posthtml-parse options
const postHtmlOptions = {
    sync: true, // https://github.com/posthtml/posthtml#usage
    lowerCaseTags: true, // https://github.com/posthtml/posthtml-parser#options
    quoteAllAttributes: false, // https://github.com/posthtml/posthtml-render#options
};

htmlnano
    // "preset" arg might be skipped (see "Presets" section below for more info)
    // "postHtmlOptions" arg might be skipped
    .process(html, options, preset, postHtmlOptions)
    .then(function (result) {
        // result.html is minified
    })
    .catch(function (err) {
        console.error(err);
    });
```

Also, you can use it as CLI tool:

```bash
node_modules/.bin/htmlnano --help

# STDIN -> STDOUT
cat test.html | node_modules/.bin/htmlnano > test.min.html

# Single file
node_modules/.bin/htmlnano test.html -o test.min.html

# Multiple files / globs (quote globs so htmlnano expands them itself)
node_modules/.bin/htmlnano "dist/**/*.html" --output-dir minified
node_modules/.bin/htmlnano "dist/**/*.html" --in-place
```

More usage examples (PostHTML, CLI, Webpack): <https://htmlnano.netlify.app/usage>

## Benchmarks

Updated: 2026-11-13

[html-minifier-terser]: https://www.npmjs.com/package/html-minifier-terser/v/7.2.0
[html-minifier-next]: https://www.npmjs.com/package/html-minifier-next/v/9.1.2
[htmlnano]: https://www.npmjs.com/package/htmlnano/v/3.6.1
[minify]: https://www.npmjs.com/package/@tdewolff/minify/v/2.24.8
[minify-html]: https://www.npmjs.com/package/@minify-html/node/v/0.18.1
[swc-html]: https://www.npmjs.com/package/@swc/html/v/1.16.22

| Website                                                         | Source (KB) | [html-minifier-terser] | [html-minifier-next] |           [htmlnano] |  [minify] | [minify-html] | [swc-html] |
| --------------------------------------------------------------- | ----------: | ---------------------: | -------------------: | -------------------: | --------: | ------------: | ---------: |
| [alistapart.com](https://alistapart.com/)                       |          65 |                  13.9% |                25.2% | **<ins>38.1%</ins>** |     10.1% |         11.3% |      10.7% |
| [developer.mozilla.org](https://developer.mozilla.org/en-US/)   |         119 |                  44.4% |                43.0% | **<ins>47.9%</ins>** |     41.2% |         41.2% |      41.2% |
| [css-tricks.com](https://css-tricks.com/)                       |         183 |   **<ins>41.5%</ins>** |                19.6% |                25.6% |     11.1% |         11.3% |      12.7% |
| [mastodon.social](https://mastodon.social/explore)              |          45 |   **<ins>22.7%</ins>** |                14.4% |                14.0% |      5.7% |          6.9% |       7.9% |
| [en.wikipedia.org](https://en.wikipedia.org/wiki/Main_Page)     |         259 |                  11.3% |                12.6% | **<ins>12.7%</ins>** |      5.8% |          6.1% |       6.0% |
| [lafrenchtech.gouv.fr](https://lafrenchtech.gouv.fr/)           |         186 |                  32.5% | **<ins>70.1%</ins>** | **<ins>70.1%</ins>** |     29.9% |         30.6% |      30.7% |
| [stackoverflow.blog](https://stackoverflow.blog/)               |         135 |   **<ins>28.8%</ins>** |                 7.9% |                 7.6% |      4.6% |          5.0% |       5.5% |
| [edri.org](https://edri.org/)                                   |          85 |                  24.6% | **<ins>34.7%</ins>** |                33.8% |     11.3% |         10.6% |      11.7% |
| [eff.org](https://eff.org/)                                     |          54 |                  18.1% | **<ins>19.5%</ins>** |                18.3% |     13.4% |         12.3% |      13.0% |
| [w3.org](https://w3.org/)                                       |          48 |   **<ins>28.7%</ins>** | **<ins>28.7%</ins>** |                28.3% |     23.7% |         23.6% |      23.6% |
| [html.spec.whatwg.org](https://html.spec.whatwg.org/multipage/) |         152 |    **<ins>1.6%</ins>** |                 0.4% |                 0.4% |      0.3% |          0.3% |       0.3% |
| [un.org](https://un.org/en/)                                    |         161 |                  23.6% | **<ins>45.4%</ins>** |                44.9% |     19.2% |         16.9% |      16.7% |
| [apple.com](https://apple.com/)                                 |         250 |   **<ins>19.7%</ins>** |                11.8% |                10.8% |      7.6% |          6.7% |       6.5% |
| [home.cern](https://home.cern/)                                 |         292 |                    N/A |                23.8% | **<ins>26.3%</ins>** |      8.1% |          9.8% |      10.2% |
| [weather.com](https://weather.com/)                             |         455 |   **<ins>14.2%</ins>** |                 9.7% |                 9.0% |      7.2% |          7.0% |       7.1% |
| [github.com](https://github.com/)                               |         513 |   **<ins>32.2%</ins>** |                18.1% |                18.0% |      4.8% |          4.3% |       4.4% |
| [leanpub.com](https://leanpub.com/)                             |         523 |   **<ins>16.7%</ins>** |                 9.0% |                 9.5% |      5.0% |          5.4% |       5.5% |
| [bbc.co.uk](https://bbc.co.uk/)                                 |         684 |                   7.8% |  **<ins>8.2%</ins>** |  **<ins>8.2%</ins>** |      4.7% |          6.4% |       6.5% |
| [faz.net](https://faz.net/aktuell/)                             |        1353 |                   7.7% |                13.3% | **<ins>18.1%</ins>** |      4.3% |          4.6% |       9.2% |
| [tc39.es](https://tc39.es/ecma262/)                             |        7637 |    **<ins>9.1%</ins>** |                 7.9% |                 7.3% |      6.5% |          6.0% |       6.1% |
| **Avg. minify rate**                                            |             |              **21.0%** |            **21.0%** |            **22.2%** | **11.4%** |     **11.4%** |  **11.9%** |

Latest benchmarks: <https://github.com/maltsev/html-minifiers-benchmark> (updated daily).
