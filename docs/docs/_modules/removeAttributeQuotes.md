### removeAttributeQuotes
Remove quotes around attributes when possible, see
[HTML Standard - 12.1.2.3 Attributes - Unquoted attribute value syntax](https://html.spec.whatwg.org/multipage/syntax.html#attributes-2).

This module is enabled by the `safe` preset, inherited by `ampSafe`, and remains
enabled in `max`. It only removes quotes when the PostHTML renderer considers
them optional and its configuration permits unquoted attributes.
In PostHTML's `xmlMode`, this module leaves quoting options unchanged, even
with `force: true`, because XML requires quotes around attribute values.
When quotes are required, literal quote delimiters are escaped as needed to
preserve the value and prevent it from introducing additional attributes.

#### Options
- `force` — if `true`, forces `quoteAllAttributes` to `false` even when other PostHTML options or plugins set it to `true`.

#### Example
Source:
```html
<div class="foo" title="hello world"></div>
```

Minified:
```html
<div class=foo title="hello world"></div>
```

#### Notice
The feature is implemented by [posthtml-render's `quoteAllAttributes`](https://github.com/posthtml/posthtml-render#options), which is a PostHTML option.
With `removeAttributeQuotes: true` (including the preset default), htmlnano sets
this renderer option to `false` only when it is not already defined. An explicit
PostHTML setting or an earlier plugin can therefore override the preset.

For example:

```js
posthtml([
    htmlnano({
        removeAttributeQuotes: true
    })
]).process(html, {
    quoteAllAttributes: true
})
```

The quotes remain because PostHTML's `quoteAllAttributes` setting takes priority.

If you need to ensure quotes are removed even when `quoteAllAttributes` is already `true`, enable the `force` option:

```js
posthtml([
    htmlnano({
        removeAttributeQuotes: { force: true }
    })
]).process(html, {
    quoteAllAttributes: true
})
```
