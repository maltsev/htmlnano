### custom
It's also possible to pass custom modules in the minifier.
As a function:
```js
const options = {
    custom: function (tree, options) {
        // Some minification
        return tree;
    }
};
```

Or as a list of functions:
```js
const options = {
    custom: [
        function (tree, options) {
            // Some minification
            return tree;
        },

        function (tree, options) {
            // Some other minification
            return tree;
        }
    ]
};
```

htmlnano's options are passed to your custom plugin by the second parameter `options`.

Custom functions may be asynchronous. If a custom function returns a `Promise`, htmlnano awaits it before running the next custom function:
```js
const options = {
    custom: async function (tree, options) {
        await someAsyncMinification(tree);
        return tree;
    }
};
```

Errors thrown (or rejected promises) from a custom function propagate to the caller of `htmlnano.process()` and are not swallowed.
