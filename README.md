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

Updated: 2026-10-02

[html-minifier-terser]: https://www.npmjs.com/package/html-minifier-terser/v/7.2.0
[html-minifier-next]: https://www.npmjs.com/package/html-minifier-next/v/8.10.1
[htmlnano]: https://www.npmjs.com/package/htmlnano/v/3.5.1
[minify]: https://www.npmjs.com/package/@tdewolff/minify/v/2.24.8
[minify-html]: https://www.npmjs.com/package/@minify-html/node/v/0.18.1
[swc-html]: https://www.npmjs.com/package/@swc/html/v/1.16.13

| Website                                                         | Source (KB) | [html-minifier-terser] | [html-minifier-next] |           [htmlnano] |  [minify] | [minify-html] |          [swc-html] |
| --------------------------------------------------------------- | ----------: | ---------------------: | -------------------: | -------------------: | --------: | ------------: | ------------------: |
| [alistapart.com](https://alistapart.com/)                       |          64 |                   6.8% |                11.0% | **<ins>35.9%</ins>** |     10.3% |          8.0% |               11.0% |
| [developer.mozilla.org](https://developer.mozilla.org/en-US/)   |         119 |                  39.0% |                41.8% | **<ins>49.7%</ins>** |     41.2% |         41.1% |               41.6% |
| [en.wikipedia.org](https://en.wikipedia.org/wiki/Main_Page)     |         253 |                   4.6% |                 7.6% |  **<ins>9.6%</ins>** |      5.9% |          6.0% |                6.2% |
| [html.spec.whatwg.org](https://html.spec.whatwg.org/multipage/) |         151 |                  -3.9% |                 0.3% |                 0.3% |      0.3% |          0.2% | **<ins>1.5%</ins>** |
| [stackoverflow.blog](https://stackoverflow.blog/)               |         131 |                   4.0% |                 7.0% |  **<ins>7.6%</ins>** |      4.5% |          4.9% |                5.5% |
| [leanpub.com](https://leanpub.com/)                             |         506 |                   1.2% |                 8.9% | **<ins>10.0%</ins>** |      5.2% |          1.7% |                5.7% |
| [apple.com](https://apple.com/)                                 |         248 |                   6.1% |                 8.6% |  **<ins>9.2%</ins>** |      7.6% |          6.7% |                7.0% |
| [edri.org](https://edri.org/)                                   |          84 |                   7.4% |                13.0% | **<ins>33.0%</ins>** |     12.1% |          7.9% |               12.6% |
| [lafrenchtech.gouv.fr](https://lafrenchtech.gouv.fr/)           |         181 |                  26.5% |                30.6% | **<ins>69.0%</ins>** |     29.8% |         27.0% |               30.4% |
| [w3.org](https://w3.org/)                                       |          48 |                  18.6% | **<ins>24.1%</ins>** |                23.9% |     23.7% |         19.7% |               23.8% |
| [mastodon.social](https://mastodon.social/explore)              |          50 |                   3.8% |                13.3% | **<ins>13.5%</ins>** |      5.7% |          7.0% |                8.3% |
| [css-tricks.com](https://css-tricks.com/)                       |         178 |                    N/A |                15.1% | **<ins>27.6%</ins>** |     13.7% |          8.4% |               14.4% |
| [un.org](https://un.org/en/)                                    |         161 |                  13.5% |                22.5% | **<ins>42.3%</ins>** |     19.1% |         14.4% |               16.8% |
| [weather.com](https://weather.com/)                             |         326 |                   0.5% |                 9.3% |  **<ins>9.4%</ins>** |      6.7% |          0.6% |                6.5% |
| [home.cern](https://home.cern/)                                 |         291 |                    N/A |                11.8% | **<ins>25.6%</ins>** |      8.1% |          4.7% |               10.2% |
| [eff.org](https://eff.org/)                                     |          54 |                   8.6% | **<ins>15.6%</ins>** | **<ins>15.6%</ins>** |     13.1% |         11.1% |               13.1% |
| [bbc.co.uk](https://bbc.co.uk/)                                 |         754 |                   0.8% |  **<ins>7.1%</ins>** |                 6.7% |      4.7% |          1.2% |                6.3% |
| [github.com](https://github.com/)                               |         563 |                   1.5% |                15.2% | **<ins>15.5%</ins>** |      5.2% |          4.1% |                4.6% |
| [faz.net](https://faz.net/aktuell/)                             |        1591 |                   3.4% |                10.9% | **<ins>16.0%</ins>** |      4.6% |          3.7% |                8.7% |
| [tc39.es](https://tc39.es/ecma262/)                             |        7447 |                   5.7% |                 8.1% |  **<ins>8.3%</ins>** |      6.6% |          6.2% |                7.9% |
| **Avg. minify rate**                                            |             |               **8.2%** |            **14.2%** |            **20.9%** | **11.5%** |      **9.5%** |           **12.1%** |

Latest benchmarks: <https://github.com/maltsev/html-minifiers-benchmark> (updated daily).
