# Usage

```bash
npm install htmlnano
```

## JavaScript API

### ESM
```js
import htmlnano, { presets } from 'htmlnano';

const options = {
    removeEmptyAttributes: false,
    collapseWhitespace: 'conservative'
};

// See PostHTML docs
const postHtmlOptions = {
    sync: true,
    lowerCaseTags: true,
    quoteAllAttributes: false
};

// "preset" arg might be skipped (see "Presets" section below for more info)
// "postHtmlOptions" arg might be skipped
const result = await htmlnano.process(html, options, presets.safe, postHtmlOptions);
// result.html is minified
```

### CommonJS
```js
const htmlnano = require('htmlnano');

const options = {
    removeEmptyAttributes: false,
    collapseWhitespace: 'conservative'
};

htmlnano
    .process(html, options)
    .then((result) => {
        // result.html is minified
    })
    .catch((err) => {
        console.error(err);
    });
```


## PostHTML
Add `htmlnano` as a final plugin:
```js
const posthtml = require('posthtml');
const options = {
    removeComments: false,
    collapseWhitespace: 'conservative'
};
const posthtmlPlugins = [
    /* other PostHTML plugins */

    require('htmlnano')(options)
];

const posthtmlOptions = {
    // See PostHTML docs
};

posthtml(posthtmlPlugins)
    .process(html, posthtmlOptions)
    .then((result) => {
        // result.html is minified
    })
    .catch((err) => {
        console.error(err);
    });
```

## CLI

You can use `htmlnano` as a CLI tool:

```bash
npx htmlnano --help
```

The options can be passed via the configuration file:

```bash
echo '{"collapseWhitespace": "all", "removeComments": "all"}' > config.json
npx htmlnano test.html -c config.json
```

### Input and output

With no input (or `-`) `htmlnano` reads from STDIN and writes to STDOUT:

```bash
cat test.html | npx htmlnano > test.min.html
```

A single input with `-o`/`--output` writes to a file:

```bash
npx htmlnano test.html -o test.min.html
```

You can pass multiple inputs and/or glob patterns. Quote glob patterns so they
are expanded by `htmlnano` itself (this makes them behave the same on shells
that don't expand globs, such as on Windows):

```bash
npx htmlnano "dist/**/*.html" extra.html --output-dir minified
```

With `--output-dir <dir>` every input is written under `<dir>`, preserving its
path relative to the deepest common parent directory of all inputs. For
example, given `pages/a.html` and `pages/nested/b.html`, the output is written
to `<dir>/a.html` and `<dir>/nested/b.html`.

Use `--in-place` to rewrite each input file in place (mutually exclusive with
`-o`/`--output` and `--output-dir`):

```bash
npx htmlnano "dist/**/*.html" --in-place
```

Per-file progress is reported on STDERR. When more than one input is given,
`--output-dir` or `--in-place` is required.


## Webpack

```sh
npm install html-minimizer-webpack-plugin --save-dev
```

```js
// webpack.config.js
const HtmlMinimizerWebpackPlugin = require('html-minimizer-webpack-plugin');
const htmlnano = require('htmlnano');

module.exports = {
    optimization: {
        minimize: true,
        minimizer: [
                // For webpack@5 you can use the `...` syntax to extend existing minimizers (i.e. `terser-webpack-plugin`).
                // `...`,
                new HtmlMinimizerWebpackPlugin({
                    // Add HtmlMinimizerWebpackPlugin options here.
                    // test: /\.html(\?.*)?$/i,

                    // Use htmlnano as HtmlMinimizerWebpackPlugin's minimizer.
                    minify: htmlnano.htmlMinimizerWebpackPluginMinify,
                    minimizerOptions: {
                        // Add htmlnano options here.
                        removeComments: false,
                        collapseWhitespace: 'conservative'
                    }
                })
            ]
    }
}
```



## Gulp
```bash
npm i -D gulp-posthtml
```

```js
const gulp = require('gulp');
const posthtml = require('gulp-posthtml');
const htmlnano = require('htmlnano');
const options = {
  removeComments: false
};

gulp.task('default', function () {
    return gulp
        .src('./index.html')
        .pipe(posthtml([
            // Add `htmlnano` as a final plugin
            htmlnano(options)
        ]))
        .pipe(gulp.dest('./build'));
});
```
