# Config

There are two main ways to configure htmlnano:

## Passing options to `htmlnano` directly
This is the way described above in the examples.
These options take the highest precedence.

## Using configuration file
Alternatively, you might create a configuration file (e.g., `.htmlnanorc.json` or `htmlnano.config.js`) or save options to `package.json` under the `htmlnano` key.
`htmlnano` uses `cosmiconfig`, so refer to [its documentation](https://github.com/davidtheclark/cosmiconfig/blob/main/README.md) for more detail.

If you want to specify a preset that way, use `preset` key:

```json
{
    "preset": "max",
    "collapseWhitespace": "conservative",
    "removeComments": false
}
```

Configuration files have lower precedence than passing options to `htmlnano` directly.
If you provide both, direct options override config values. A `preset` passed to
`htmlnano.process` also overrides a `preset` defined in the config file.

### Custom path

You can also pass a configuration file path in `options`:

```js
htmlnano.process(html, {
    configPath: 'config.json'
})
```

### Disabling config loading

If you want to ignore any config files entirely, set `skipConfigLoading`:

```js
htmlnano.process(html, {
    skipConfigLoading: true
})
```

### Optional dependency warnings

Some modules depend on optional peer dependencies (for example, `minifyCss` or `minifyJs`).
If you want to silence missing dependency warnings, set `skipInternalWarnings` to `true`.
