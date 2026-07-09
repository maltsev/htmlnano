<h1><img src="docs/static/logo.png" alt="htmlnano logo" width="90" align="absmiddle">&nbsp;htmlnano</h1>

[![npm version](https://badge.fury.io/js/htmlnano.svg)](http://badge.fury.io/js/htmlnano)
![CI](https://github.com/maltsev/htmlnano/actions/workflows/ci.yml/badge.svg)

Modular HTML minifier, built on top of the [PostHTML](https://github.com/posthtml/posthtml). Inspired by [cssnano](https://github.com/cssnano/cssnano).

## Documentation
https://htmlnano.netlify.app


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

More usage examples (PostHTML, CLI, Webpack): https://htmlnano.netlify.app/usage


## Benchmarks

[html-minifier-terser]: https://www.npmjs.com/package/html-minifier-terser/v/7.2.0
[html-minifier-next]: https://www.npmjs.com/package/html-minifier-next/v/5.0.3
[htmlnano]: https://www.npmjs.com/package/htmlnano/v/3.1.0
[minify]: https://www.npmjs.com/package/@tdewolff/minify/v/2.24.8
[minify-html]: https://www.npmjs.com/package/@minify-html/node/v/0.18.1

| Website                                                         | Source (KB) | [html-minifier-terser] | [html-minifier-next] | [htmlnano] |  [minify] | [minify-html] |
| --------------------------------------------------------------- | ----------: | ---------------------: | -------------------: | ---------: | --------: | ------------: |
| [alistapart.com](https://alistapart.com/)                       |          63 |                   7.6% |                11.6% |      34.6% |     11.1% |          8.6% |
| [developer.mozilla.org](https://developer.mozilla.org/en-US/)   |         109 |                  38.0% |                41.7% |      52.8% |     40.1% |         39.9% |
| [css-tricks.com](https://css-tricks.com)                        |          11 |                   8.2% |                34.1% |      37.2% |     18.8% |          8.5% |
| [en.wikipedia.org](https://en.wikipedia.org/wiki/Main_Page)     |         224 |                   4.5% |                 7.4% |       7.2% |     60.6% |          2.9% |
| [github.com](https://github.com/)                               |         546 |                   3.0% |                 9.7% |      16.7% |      7.3% |          5.7% |
| [edri.org](https://edri.org)                                    |          80 |                   7.7% |                12.3% |      30.6% |     12.3% |          8.2% |
| [leanpub.com](https://leanpub.com)                              |         251 |                   1.3% |                 6.9% |       6.3% |      6.0% |          1.7% |
| [stackoverflow.blog](https://stackoverflow.blog/)               |         139 |                   3.9% |                 5.7% |       7.0% |      4.6% |          4.7% |
| [html.spec.whatwg.org](https://html.spec.whatwg.org/multipage/) |         149 |                  -3.9% |                 0.7% |      -2.6% |      0.3% |          0.2% |
| [eff.org](https://eff.org)                                      |          54 |                   8.8% |                14.7% |      10.9% |     13.4% |          9.7% |
| [apple.com](https://apple.com/)                                 |         229 |                   8.9% |                12.5% |      11.5% |     10.4% |          9.5% |
| [w3.org](https://w3.org/)                                       |          50 |                  19.0% |                24.6% |      23.4% |     24.4% |         20.3% |
| [mastodon.social](https://mastodon.social/explore)              |          37 |                   3.4% |                 6.8% |      14.6% |      5.9% |          3.6% |
| [bbc.co.uk](https://bbc.co.uk)                                  |         694 |                   0.8% |                 6.3% |       5.9% |      4.7% |          1.2% |
| [un.org](https://un.org/en/)                                    |         151 |                  14.2% |                22.5% |      41.2% |     20.0% |         15.0% |
| [lafrenchtech.gouv.fr](https://lafrenchtech.gouv.fr/)           |         152 |                  13.2% |                17.9% |      64.1% |     17.0% |         13.8% |
| [sitepoint.com](https://sitepoint.com)                          |         497 |                   0.8% |                 7.4% |      12.9% |      6.1% |          0.9% |
| [faz.net](https://faz.net/aktuell/)                             |        1572 |                   3.4% |                 8.0% |      15.8% |      4.8% |          3.6% |
| [weather.com](https://weather.com)                              |        2395 |                   0.3% |                11.4% |      18.1% |     11.0% |          0.6% |
| [tc39.es](https://tc39.es/ecma262/)                             |        7254 |                   8.5% |                11.3% |       9.3% |      9.5% |          9.1% |
| [home.cern](https://home.cern)                                  |         151 |                  37.1% |                46.4% |      40.2% |     38.9% |         39.5% |
| **Avg. minify rate**                                            |             |               **9.0%** |            **15.2%** |  **21.8%** | **15.6%** |      **9.9%** |

Latest benchmarks: https://github.com/maltsev/html-minifiers-benchmark (updated daily).
