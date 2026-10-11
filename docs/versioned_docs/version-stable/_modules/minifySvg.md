### minifySvg

Minifies SVG inside `<svg>` tags using [SVGO](https://github.com/svg/svgo/).

SVGO is an optional dependency. If it is not installed, SVG content is left untouched.

#### Options

See [the documentation of SVGO](https://github.com/svg/svgo/blob/master/README.md) for all supported options.
SVGO options can be passed directly to the `minifySvg` module:

```js
htmlnano.process(html, {
    minifySvg: {
        plugins: [
            {
                name: 'preset-default',
                params: {
                    overrides: {
                        builtinPluginName: {
                            optionName: 'optionValue'
                        },
                    },
                },
            }
        ]
    }
});
```

`minifySvg: true` and `minifySvg: {}` enable SVGO with htmlnano's inline SVG defaults.
htmlnano enables SVGO multipass by default; set `multipass: false` to disable it.

#### Notes

- htmlnano disables `cleanupIds`, `removeUselessDefs`, and `removeHiddenElems` in SVGO's `preset-default`. Each SVG is optimized separately, but its IDs, symbols, gradients, and other definitions can be referenced elsewhere in the HTML document. These defaults preserve shared sprites and definitions and prevent ID renaming from creating duplicate IDs across SVGs.
- SVGO's `inlineStyles` uses `removeMatchedSelectors: false` so inlining local CSS rules does not remove IDs or classes used elsewhere in the page.
- Explicit `preset-default` overrides take precedence over these defaults. For example, `params: { overrides: { cleanupIds: {} } }` re-enables ID cleanup. Plugins explicitly listed outside the preset, custom plugins, and an empty plugin list are passed through as configured.
- SVGs are rendered with quoted attributes before SVGO runs to keep the output stable.
- SVGs containing `foreignObject`, or HTML markup inside `title`/`desc`, are left to the other HTML minification modules. SVGO's XML parsing and serialization can change embedded HTML structure, raw-text content, and whitespace, and can turn escaped text into executable markup.
- HTML tags that [cause browsers to leave SVG content](https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inforeign), such as `p`, also cause the enclosing SVG to bypass SVGO, preserving content that PostHTML represents as SVG descendants.
- SVGs containing numeric references with different HTML/XML meanings (such as `&#128;`), or carriage-return references (`&#13;`), also bypass SVGO to preserve their browser-parsed values.
- Parser errors from SVGO leave the original `<svg>` as-is. Other SVGO errors are logged and the module falls back to a no-plugin SVGO run; if that also fails, the original SVG is preserved.
- Set `skipInternalWarnings: true` to suppress SVGO error logging.

#### Example

Source:

```html
<svg version="1.1" baseProfile="full" width="300" height="200" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="red" />

    <circle cx="150" cy="100" r="80" fill="green" />

    <text x="150" y="125" font-size="60" text-anchor="middle" fill="white">SVG</text>
</svg>
```

Minified:

```html
<svg baseProfile="full" width="300" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="red"/><circle cx="150" cy="100" r="80" fill="green"/><text x="150" y="125" font-size="60" text-anchor="middle" fill="#fff">SVG</text></svg>
```
