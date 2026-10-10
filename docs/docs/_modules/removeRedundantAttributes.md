### removeRedundantAttributes
Removes redundant attributes from tags when they match HTML defaults:
- `method="get"` from `<form>`
- `type="text"` from `<input>`
- `type="submit"` from `<button>` without `command` or `commandfor`, unless it is directly inside `<select>`
- `language="javascript"` and redundant JS `type` values from `<script>`
- `charset` from inline `<script>` (only when `src` is not present)
- `media="all"` from `<style>` and `<link>`
- `type="text/css"` from `<style>`
- `type="text/css"` from `<link rel="stylesheet">`
- `loading="eager"` from `<img>` and `<iframe>`
- `decoding="auto"` from `<img>`
- `fetchpriority="auto"` from `<img>`, `<link>` and `<script>`
- `kind="subtitles"` from `<track>`
- `wrap="soft"` from `<textarea>`
- `shape="rect"` from `<area>`
- `dir="ltr"` from `<html>`

Attribute values are matched using ASCII case-insensitive comparisons. Surrounding ASCII whitespace is ignored for script MIME types and `media` values; meaningful whitespace in other values is preserved.
`dir="ltr"` is only removed from `<html>`: an element without a `dir` attribute inherits the direction of its parent, and the direction of an element without a parent is `ltr` — so the attribute is redundant on the root element, but not anywhere else.
Script `type="module"` is preserved. A JavaScript `type` is also preserved when removing it would let a legacy `language` value disable the script. Inert script and style types are preserved.
`link[rel]` is treated as an ASCII whitespace-separated token list. CSS `type` is removed only when the relationships are `stylesheet` and optionally `alternate`, since other relationships can use `type` to control resource fetching.

#### Options
This module is disabled by default, change option to true to enable this module.

#### Side effects
This module could break your styles or JS if you use selectors with attributes:
```CSS
form[method="get"] {
    color: red;
}
```

#### Example
Source:
```html
<form method="get">
    <input type="text">
</form>
<script type="module"></script>
<script type="text/javascript" charset="utf-8"></script>
<script src="app.js" charset="utf-8"></script>
```

Minified:
```html
<form>
    <input>
</form>
<script type="module"></script>
<script></script>
<script src="app.js" charset="utf-8"></script>
```
