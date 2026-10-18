### minifyJson

Minifies JSON in `<script>` tags with a `type` ending in `/json` or `+json`, ignoring case and MIME parameters. Optionally minifies selected JSON attributes.

#### Options

`true` (default) minifies scripts only; `false` disables the module. To include attributes:

```js
htmlnano.process(html, {
    minifyJson: {
        attributes: [
            'data-current-styles',
            { name: 'data-current-context', tag: 'section' }
        ]
    }
});
```

A string selects an attribute on any element; an object optionally restricts it to a tag. Names and tags match exactly, ignoring case. An omitted or empty list processes scripts only.

Select only attributes consumed as JSON whose formatting is unimportant. Presets select none, and attributes are skipped in XML mode.

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
