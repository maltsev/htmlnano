### minifyJs

Minifies JS using [Terser](https://github.com/fabiosantoscode/terser) inside `<script>` tags.

You have to install `terser` in order to use this feature:

```bash
npm install --save-dev terser
# if you prefer yarn
# yarn add --dev terser
# if you prefer pnpm
# pnpm install --save-dev terser
```

#### Options

See [the documentation of Terser](https://github.com/fabiosantoscode/terser#api-reference) for all supported options.
Terser options can be passed directly to the `minifyJs` module:

```js
htmlnano.process(html, {
    minifyJs: {
        output: { quote_style: 1 },
    },
});
```

Script types follow HTML's script type detection: values with parameters (for example
`text/javascript; charset=utf-8`) and whitespace-only values are data blocks and are left untouched.
Tag and attribute names are matched case-insensitively, character references in type values are decoded,
and the legacy `language` attribute is considered when `type` is absent.
For `type="module"` scripts, it enables Terser's `module` option unless you explicitly set `module` yourself.

#### Legal comments (`@license`, `@preserve`, `/*!`)

By default Terser keeps "legal" comments — those matching `@license`, `@preserve`, `@cc_on` or starting with `/*!`
(this covers `@licstart`/`@licend` blocks as well). The `safe` and `ampSafe` presets keep that default,
so license notices stay in the output.

The [`max` preset](./presets) turns them off with Terser's own option:

```js
minifyJs: {
    format: { comments: false }
}
```

**This is a legal decision, not a technical one.** Many JS licenses (MIT, Apache-2.0, GPL, …) require the
copyright notice to be distributed with the code, and dropping the comment can put you in breach of them.
Only use it when you ship the notices elsewhere (a `LICENSE`/`NOTICE` file, a separate license page, a preserved
bundle header), or when the inlined scripts are your own.

To keep legal comments while still using the `max` preset, override the module:

```js
htmlnano.process(html, { minifyJs: { format: { comments: 'some' } } }, htmlnano.presets.max);
```

#### Notes

- Only JavaScript script types are processed: the default type, `text/javascript`, `application/javascript`, and legacy `text/ecmascript`. Other types (for example `application/json`) are left untouched.
- Any `<script>` with an `integrity` attribute is skipped to preserve SRI safety. Generate SRI after minification if you rely on it.
- Content of scripts with a `src` attribute is left untouched; their event handlers can still be minified.
- If Terser output would introduce a closing script tag or a double-escaped script sequence, the original
  content is preserved. This also applies to custom preambles and `inline_script: false`.
- Inline event handler attributes (like `onclick` or `onClick`) are minified as JavaScript.
- Handler bodies support `return` and trailing line comments, and character references are decoded before
  minification and escaped for HTML afterward. Invalid handlers are preserved. For handlers, `module`,
  `toplevel` (including nested compressor/mangler options), and `enclose` are disabled to preserve their
  implicit parameters and execution context; nested functions can still be compressed and mangled.
- CDATA wrappers in boundary comments inside `<script>` in SVG are preserved; the inner JS is minified
  and re-wrapped. CDATA markers inside JavaScript strings and template literals are left intact.
- For AMP documents, inline handlers like `on="tap:..."` are not modified when using the AMP-safe preset.

#### Example

Source:

```html
<div>
    <script>
        /* comment */
        const foo = function () {

        };
    </script>
</div>
```

Minified:

```html
<div>
    <script>const foo=function(){};</script>
</div>
```
