### minifyJson

Minifies JSON in `<script>` tags with a `type` ending in `/json` or `+json`, ignoring case and MIME parameters. Optionally minifies selected JSON attributes.

#### Options

`true` (the `safe` default) minifies scripts only; `false` disables the module. To include attributes:

```js
htmlnano.process(html, {
    minifyJson: {
        attributes: [
            'data-current-styles',
            'data-current-context'
        ]
    }
});
```

`attributes` accepts exact attribute-name strings, ignoring case, and supports any valid JSON value, including scalars. Names apply to all elements; patterns are not supported.

`autoDetect: true` checks all `data-*` attributes for valid JSON objects and arrays, regardless of their names, and rewrites them only when the rendered HTML becomes smaller. Explicit `attributes` rules retain their behavior alongside detection. `max` enables it:

```js
minifyJson: {
    autoDetect: true
}
```

Attribute minification assumes consumers parse JSON and do not depend on its formatting. `safe` and `ampSafe` keep it disabled. Attributes are skipped in XML mode. With no rules or detection, only scripts are processed; override `max` with `minifyJson: true` for this behavior.

Selected values are entity-decoded and safely escaped for HTML. Keep PostHTML's default `decodeEntities: false` for input containing `&amp;quot;`: enabling decoding can corrupt it before this module runs.

#### Notes

- Invalid JSON and unselected attributes are unchanged.
- String contents, number spelling, duplicate keys and member order are preserved. Whitespace outside strings and unnecessary string escapes are removed.
- Scripts without a JSON MIME type (including `application/jsonp`) or with `integrity` are skipped.
- In scripts, `<` is escaped as `\u003C` to preserve HTML parsing.

#### Script example

Source:

```html
<script type="application/ld+json; charset=UTF-8">
{
    "user": "me"
}
</script>
```

Minified:

```html
<script type="application/ld+json; charset=UTF-8">{"user":"me"}</script>
```

#### Attribute example

With the attribute options above:

```html
<section data-current-context='{ "message": "a  b", "count": 2 }'></section>
```

Minified (preserving both spaces in `"a  b"`):

```html
<section data-current-context='{"message":"a  b","count":2}'></section>
```
