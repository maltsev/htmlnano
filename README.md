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

Updated: 2026-10-11

[html-minifier-terser]: https://www.npmjs.com/package/html-minifier-terser/v/7.2.0
[html-minifier-next]: https://www.npmjs.com/package/html-minifier-next/v/8.10.7
[htmlnano]: https://www.npmjs.com/package/htmlnano/v/3.6.0
[minify]: https://www.npmjs.com/package/@tdewolff/minify/v/2.24.8
[minify-html]: https://www.npmjs.com/package/@minify-html/node/v/0.18.1
[swc-html]: https://www.npmjs.com/package/@swc/html/v/1.16.18

| Website                                                         | Source (KB) | [html-minifier-terser] | [html-minifier-next] |           [htmlnano] | [minify] | [minify-html] |          [swc-html] |
| --------------------------------------------------------------- | ----------: | ---------------------: | -------------------: | -------------------: | -------: | ------------: | ------------------: |
| [developer.mozilla.org](https://developer.mozilla.org/en-US/)   |         119 |                  39.1% | **<ins>41.9%</ins>** |                  N/A |    41.2% |         41.1% |               41.6% |
| [alistapart.com](https://alistapart.com/)                       |          64 |                   6.8% |                11.0% | **<ins>35.6%</ins>** |    10.3% |          8.0% |               11.0% |
| [css-tricks.com](https://css-tricks.com/)                       |         150 |                    N/A |                14.1% | **<ins>25.2%</ins>** |    12.6% |          9.1% |               13.3% |
| [en.wikipedia.org](https://en.wikipedia.org/wiki/Main_Page)     |         247 |                   4.7% |                 7.7% |  **<ins>9.8%</ins>** |     6.0% |          6.1% |                6.3% |
| [html.spec.whatwg.org](https://html.spec.whatwg.org/multipage/) |         151 |                  -3.9% |                 0.3% |                 0.2% |     0.3% |          0.2% | **<ins>1.5%</ins>** |
| [edri.org](https://edri.org/)                                   |          84 |                   7.4% |                13.0% | **<ins>32.1%</ins>** |    12.1% |          7.9% |               12.6% |
| [home.cern](https://home.cern/)                                 |         292 |                    N/A |                11.7% | **<ins>24.5%</ins>** |     8.0% |          4.7% |               10.2% |
| [mastodon.social](https://mastodon.social/explore)              |          50 |                   3.8% | **<ins>13.3%</ins>** | **<ins>13.3%</ins>** |     5.7% |          7.0% |                8.3% |
| [leanpub.com](https://leanpub.com/)                             |         524 |                   1.2% |                 8.9% |  **<ins>9.5%</ins>** |     5.3% |          1.7% |                5.8% |
| [stackoverflow.blog](https://stackoverflow.blog/)               |         134 |                   4.0% |                 7.0% |  **<ins>7.1%</ins>** |     4.6% |          4.9% |                5.5% |
| [weather.com](https://weather.com/)                             |         360 |                   0.5% |                 8.3% |  **<ins>8.6%</ins>** |     6.4% |          0.9% |                6.4% |
| [eff.org](https://eff.org/)                                     |          54 |                   8.6% | **<ins>15.6%</ins>** |                14.9% |    13.1% |         11.1% |               13.1% |
| [apple.com](https://apple.com/)                                 |         248 |                   6.1% |                 8.6% |  **<ins>9.1%</ins>** |     7.6% |          6.7% |                7.0% |
| [w3.org](https://w3.org/)                                       |          50 |                  17.9% | **<ins>23.3%</ins>** |                23.0% |    22.9% |         19.0% |               22.9% |
| [bbc.co.uk](https://bbc.co.uk/)                                 |         752 |                   0.8% |                 7.1% |  **<ins>7.3%</ins>** |     4.8% |          1.2% |                6.3% |
| [un.org](https://un.org/en/)                                    |         161 |                  13.5% |                22.4% | **<ins>42.2%</ins>** |    19.1% |         14.3% |               16.7% |
| [github.com](https://github.com/)                               |         564 |                   1.5% | **<ins>15.2%</ins>** |                  N/A |     5.2% |          4.1% |                4.6% |
| [faz.net](https://faz.net/aktuell/)                             |        1366 |                   3.9% |                10.6% | **<ins>16.6%</ins>** |     4.3% |          4.3% |                9.4% |
| [tc39.es](https://tc39.es/ecma262/)                             |        7450 |                   5.7% |  **<ins>8.1%</ins>** |                 7.5% |     6.6% |          6.2% |                7.9% |
| [lafrenchtech.gouv.fr](https://lafrenchtech.gouv.fr/)           |         184 |                  26.4% |                30.6% | **<ins>68.3%</ins>** |    29.8% |         26.9% |               30.5% |
| **Avg. minify rate**                                            |             |               **6.7%** |            **12.2%** |            **19.1%** | **9.9%** |      **7.9%** |           **10.7%** |

Latest benchmarks: <https://github.com/maltsev/html-minifiers-benchmark> (updated daily).
