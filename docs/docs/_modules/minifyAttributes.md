### minifyAttributes

Minify specific attribute values. This module targets
`meta[http-equiv="refresh"]` by removing the `url=` prefix when safe and
trimming ASCII whitespace. Explicit empty URLs and prefixes needed to preserve
the destination are retained. Refresh content containing character references
is left unchanged. It also minifies
`meta[name="viewport"]` content by normalizing whitespace around separators
(commas/semicolons) and `=`, and by dropping redundant trailing zeros in
numeric values (e.g. `initial-scale=1.0` → `initial-scale=1`). The author's
separator characters (`,` or `;`) are preserved.
Viewport whitespace normalization follows its ASCII grammar and leaves content
containing character references unchanged. If a meta element also declares a
refresh, only the refresh rewrite is applied to preserve its destination.

#### Options

- `metaContent` (`boolean`) - enable minification for `meta[http-equiv="refresh"]` and `meta[name="viewport"]` content.
- `redundantWhitespaces` - remove redundant whitespace from attribute values.
  - `safe` - collapse whitespace in list-like attributes and trim single-value attributes (similar to `collapseAttributeWhitespace`).
  - `aggressive` - also trims other attribute values. (`agressive` is a deprecated alias kept for backwards compatibility.)
  - `false` - disable this behavior.

#### Example

Source:

```html
<meta http-equiv="refresh" content=" 5; ">
<meta http-equiv="refresh" content="5; url=http://example.com/">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

Minified:

```html
<meta http-equiv="refresh" content="5">
<meta http-equiv="refresh" content="5; http://example.com/">
<meta name="viewport" content="width=device-width,initial-scale=1">
```
