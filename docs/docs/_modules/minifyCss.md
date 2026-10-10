### minifyCss
Minifies CSS with [cssnano](http://cssnano.co/) inside `<style>` tags and `style` attributes.

Only `<style>` tags with a CSS type (`text/css` or no `type` attribute) are minified.
Other style types (for example `text/less`) are left untouched.
CDATA wrappers are preserved, even when surrounded by whitespace.

Skipped nodes:
- Any element with an `integrity` attribute (covers both `<style>` tags and `style` attributes).
- AMP boilerplate styles (`amp-boilerplate`, `amp4ads-boilerplate`, `amp4email-boilerplate`).

Notes:
- Identical CSS is minified once per document. Processors are initialized only for CSS that needs minification.
- With the built-in `default` preset and no custom options, distinct inline declaration lists are processed
  together as independent PostCSS roots, sharing plugin setup without merging styles. Custom presets,
  plugin lists, and per-plugin options retain separate processing.
- `style` attributes are wrapped in a temporary selector (`a{...}`) before minification so cssnano can parse them, then the wrapper is removed.
- For `style` attributes htmlnano disables the optimizations that a single declaration list can't give
  enough context for: `mergeRules`, `minifySelectors`, `minifyParams`, `normalizeCharset`,
  `uniqueSelectors`, `normalizeUnicode`, and (for the `advanced` preset) `reduceIdents` and `zindex`.
  This happens for every preset, including custom preset factories.
- If you explicitly configure any of those plugins in `preset: [..., { ... }]`, or pass a custom cssnano
  `plugins` list, htmlnano keeps your settings instead of overwriting them.

You have to install `cssnano` and `postcss` in order to use this feature:

```bash
npm install --save-dev cssnano postcss
# if you prefer yarn
# yarn add --dev cssnano postcss
# if you prefer pnpm
# pnpm install --save-dev cssnano postcss
```

#### Options
See [the documentation of cssnano](http://cssnano.co/docs/optimisations/) for all supported optimizations.
By default CSS is minified with preset `default`, which shouldn't have any side-effects.

To use another preset or disable some optimizations pass options to `minifyCss` module:
```js
htmlnano.process(html, {
    minifyCss: {
        preset: ['default', {
            discardComments: {
                removeAll: true,
            },
        }]
    }
});
```

##### The `advanced` preset

cssnano also ships an [`advanced` preset](https://cssnano.github.io/cssnano/docs/what-are-optimisations/).
htmlnano does not use it in any preset, including `max`, and does not depend on it — install
`cssnano-preset-advanced` yourself if you want it:

```js
htmlnano.process(html, {
    minifyCss: {
        preset: 'advanced'
    }
});
```

Be aware of what you are opting into. htmlnano minifies every `<style>` tag and every `style`
attribute on its own, and it never sees the page's external stylesheets or its scripts, so the
`advanced` plugins that reason about a whole document are unsound here:

- `discardUnused` drops `@font-face`, `@keyframes` and `@counter-style` rules that nothing in the same `<style>` tag references — including fonts and animations used by an external stylesheet or added at runtime. On a real page this silently changes the rendering.
- `reduceIdents` and `mergeIdents` rename those identifiers, which breaks the same cross-stylesheet
  and JavaScript references (`element.style.animationName`, `grid-template-areas`, …).
- `zindex` rebases `z-index` values, which is only safe for a self-contained stylesheet.
- `autoprefixer` (in `add: false` mode) removes vendor prefixes according to the Browserslist
  configuration and caniuse-lite version found on the *build* machine, so the output is no longer a
  function of the input alone.

htmlnano does disable `reduceIdents` and `zindex` for `style` attributes, where they are always
wrong (see the notes above), but it cannot make the `<style>`-tag transformations safe for you.

#### Example
Source:
```html
<div>
    <style>
        h1 {
            margin: 10px 10px 10px 10px;
            color: #ff0000;
        }
    </style>
</div>
```

Minified:
```html
<div>
    <style>h1{margin:10px;color:red}</style>
</div>
```
