# htmlnano
[![npm version](https://badge.fury.io/js/htmlnano.svg)](http://badge.fury.io/js/htmlnano)
![CI](https://github.com/posthtml/htmlnano/actions/workflows/ci.yml/badge.svg)

Modular HTML minifier, built on top of the [PostHTML](https://github.com/posthtml/posthtml). Inspired by [cssnano](https://github.com/cssnano/cssnano).

## Benchmarks

[html-minifier-terser]: https://www.npmjs.com/package/html-minifier-terser/v/7.2.0
[html-minifier-next]: https://www.npmjs.com/package/html-minifier-next/v/1.4.0
[htmlnano]: https://www.npmjs.com/package/htmlnano/v/2.1.3
[minify]: https://www.npmjs.com/package/@tdewolff/minify/v/2.24.2
[minify-html]: https://www.npmjs.com/package/@minify-html/node/v/0.16.4

| Website                                                     | Source (KB) | [html-minifier-terser] | [html-minifier-next] | [htmlnano] | [minify] | [minify-html] |
| ----------------------------------------------------------- | ----------: | ---------------------: | -------------------: | ---------: | -------: | ------------: |
| [stackoverflow.blog](https://stackoverflow.blog/)           |         166 |                   3.3% |                 3.3% |       8.3% |     4.6% |          4.0% |
| [github.com](https://github.com/)                           |         541 |                   3.7% |                 3.7% |      18.1% |     7.9% |          6.2% |
| [en.wikipedia.org](https://en.wikipedia.org/wiki/Main_Page) |         220 |                   4.6% |                 4.6% |       4.9% |     6.2% |          2.9% |
| [npmjs.com](https://www.npmjs.com/package/eslint)           |         460 |                   0.5% |                 0.5% |       0.9% |     3.6% |          0.7% |
| [tc39.es](https://tc39.es/ecma262/)                         |        7198 |                   8.5% |                 8.5% |       8.7% |     9.5% |          9.1% |
| [apple.com](https://www.apple.com/)                         |         190 |                   7.6% |                 7.6% |      12.1% |    10.5% |          8.1% |
| [w3.org](https://www.w3.org/)                               |          49 |                  18.9% |                18.9% |      23.0% |    24.1% |         19.9% |
| [weather.com](https://weather.com)                          |        1770 |                   0.2% |                 0.2% |      12.1% |    11.9% |          0.6% |
| **Avg. minify rate**                                        |             |               **5.9%** |             **5.9%** |  **11.0%** | **9.8%** |      **6.4%** |

Latest benchmarks: https://github.com/maltsev/html-minifiers-benchmark (updated daily).

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
```

More usage examples (PostHTML, Gulp, Webpack): https://htmlnano.netlify.app/next/usage
