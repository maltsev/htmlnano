# Presets

A preset is just an object with modules config.

Currently the following presets are available:
- [safe](https://github.com/maltsev/htmlnano/blob/master/src/presets/safe.ts) — default preset for safe minification.
- [ampSafe](https://github.com/maltsev/htmlnano/blob/master/src/presets/ampSafe.ts) — same as `safe` but tailored for [AMP pages](https://www.ampproject.org/).
- [max](https://github.com/maltsev/htmlnano/blob/master/src/presets/max.ts) — maximal minification (might break some pages).


You can use them the following way:
```js
const htmlnano = require('htmlnano');
const ampSafePreset = require('htmlnano').presets.ampSafe;

htmlnano.process(html, { collapseWhitespace: 'conservative' }, ampSafePreset)
    .then((result) => {
        // result.html is minified
    })
    .catch((err) => {
        console.error(err);
    });
```

You can also import presets directly:

```js
import htmlnano from 'htmlnano';
import ampSafe from 'htmlnano/presets/ampSafe';

const result = await htmlnano.process(html, {}, ampSafe);
```

If you skip `preset` argument, [`safe`](https://github.com/maltsev/htmlnano/blob/master/src/presets/safe.ts) is used by default.


If you'd like to define your very own config without any presets pass an empty object as a preset:
```js
const htmlnano = require('htmlnano');
const options = {
    // Your options
};

htmlnano
    .process(html, options, {})
    .then(function (result) {
        // result.html is minified
    })
    .catch(function (err) {
        console.error(err);
    });
```


You might create your own presets by starting from a built-in one:
```js
const htmlnano = require('htmlnano');
const emailPreset = {
    ...htmlnano.presets.safe,
    mergeStyles: true,
    minifyCss: {
        safe: true
    }
};

htmlnano.process(html, { removeComments: false }, emailPreset)
    .then((result) => {
        // result.html is minified
    })
    .catch((err) => {
        console.error(err);
    });
```

Feel free [to submit a PR](https://github.com/maltsev/htmlnano/issues/new) with your preset if it might be useful for other developers as well.
