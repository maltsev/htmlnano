### minifyUrls

Convert absolute URL to relative URL using [relateurl](https://www.npmjs.com/package/relateurl).

You have to install `relateurl`, `terser` and `srcset` in order to use this feature:

```bash
npm install --save-dev relateurl terser srcset
# if you prefer yarn
# yarn add --dev relateurl terser srcset
# if you prefer pnpm
# pnpm install --save-dev relateurl terser srcset
```

#### Options

The base URL to resolve against. Support `String` & `URL`.

```js
htmlnano.process(html, {
    minifyUrls: 'https://example.com' // Valid configuration
});
```

```js
htmlnano.process(html, {
    minifyUrls: new URL('https://example.com') // Valid configuration
});
```

```js
htmlnano.process(html, {
    minifyUrls: false // The module will be disabled
});
```

```js
htmlnano.process(html, {
    minifyUrls: true // Invalid configuration, the module will be disabled
});
```

#### Notes

- Only `http(s)` and relative URLs are related. Non-HTTP schemes (e.g. `mailto:`, `tel:`, `data:`) are left untouched.
- Hash-only (`#...`) and query-only (`?...`) URLs are left untouched. Identifier attributes such as `usemap` and `script[for]` are never treated as URLs.
- A default port matching the scheme is stripped (`https://example.com:443/x` → `https://example.com/x`, `http://example.com:80/x` → `http://example.com/x`). A mismatched port is kept (e.g. `:443` is not removed for `http`, nor `:8443` for `https`).
- URL destinations are preserved, including explicit `index.html` resources and query/fragment delimiters. Rewrites that change the browser-resolved URL are skipped.
- Documents containing `<base href>` are left unchanged because their base can override the configured URL.
- Canonical links are never rewritten; `canonical` is recognized as a case-insensitive token in `rel`.
- `srcset` (including on `<source>`) and `imagesrcset` are processed when `srcset` is installed; invalid strings or inputs the dependency cannot tokenize faithfully are left unchanged. Resource URLs are never shortened to empty strings.
- `javascript:` URLs are minified with `terser` when available, preserving global scope and completion values, decoding HTML/URL escapes, and protecting the output from further decoding. Invalid or ambiguous inputs are left unchanged; leading ASCII whitespace is preserved and the protocol is normalized to lowercase.
- This module is not enabled by the default presets; you must pass a base URL to turn it on.

#### Example

##### Basic Usage

Configuration:

```js
htmlnano.process(html, {
    minifyUrls: 'https://example.com'
});
```

Source:

```html
<a href="https://example.com/foo/bar/baz">bar</a>
```

Minified:

```html
<a href="foo/bar/baz">bar</a>
```

##### With sub-directory

Configuration:

```js
htmlnano.process(html, {
    minifyUrls: 'https://example.com/foo/baz/'
});
```

Source:

```html
<a href="https://example.com/foo/bar">bar</a>
```

Minified:

```html
<a href="../bar">bar</a>
```

##### `srcset`

Configuration:

```js
htmlnano.process(html, {
    minifyUrls: 'https://example.com/foo/baz/'
});
```

Source:

```html
<img srcset="https://example.com/foo/bar/image.png 1x, https://example.com/foo/bar/image2.png.png 2x">
```

Minified:

```html
<img srcset="../bar/image.png 1x, ../bar/image2.png.png 2x">
```
