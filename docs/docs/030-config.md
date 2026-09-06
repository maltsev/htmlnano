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

From the CLI, pass `--no-config-search`:

```bash
npx htmlnano test.html --no-config-search
```

### Security note: config auto-discovery runs code

Unless `skipConfigLoading` is set, every `htmlnano()` / `htmlnano.process()` call
searches for a config file, walking up from `process.cwd()` until one is found.
The search accepts executable config forms as well as static ones: `.htmlnanorc.js`,
`.htmlnanorc.cjs`, `htmlnano.config.js`, and a `htmlnano` key in `package.json` are
`require()`d, so their top-level code runs inside your build process with your
privileges.

This means a directory you did not write can influence — or take over — a run that
passed no config at all. If htmlnano may run with the working directory inside an
untrusted tree (a checked-out repository, an unpacked upload, a per-tenant build
directory), turn the lookup off:

* library: `htmlnano.process(html, { skipConfigLoading: true })`
* CLI: `npx htmlnano --no-config-search`

`--no-config-search` disables only the implicit lookup. An explicit
`-c`/`--config <file>` still loads exactly the file you named, so the two can be
combined to load a trusted config while ignoring anything planted nearby.

The values inside a config file are treated as trusted developer input as well, not
just the file that carries them: options such as
[`removeComments`](./modules#removecomments) accept regexp strings and functions that
htmlnano compiles and runs.

### Optional dependency warnings

Some modules depend on optional peer dependencies (for example, `minifyCss` or `minifyJs`).
If you want to silence missing dependency warnings, set `skipInternalWarnings` to `true`.
