### normalizeAttributeValues

- Normalize ASCII casing of specific attribute values that are case-insensitive (for example `form[method]`, `img[crossorigin]`, `script[type]`, `link[sizes]`, `img[fetchpriority]`).
- Enumerated values are matched after decoding character references, without trimming whitespace. Invalid padded keywords retain their invalid value default.
- Apply the [invalid value default](https://html.spec.whatwg.org/#invalid-value-default) for specific attributes (for example `img[loading]`, `img[decoding]`, `img[fetchpriority]`, `link[fetchpriority]`, `script[fetchpriority]`, `track[kind]`, `button[type]`, `textarea[wrap]`, `crossorigin`, `referrerpolicy`, `hidden`, `autocapitalize`, `marquee[behavior]`, `marquee[direction]`).

Invalid value defaults are only applied to the specific elements listed above
(for example invalid `button[type]` values are normalized, but invalid `input[type]` values are not changed).
`crossorigin` and `referrerpolicy` are only normalized on elements that support them.
Surrounding ASCII whitespace is trimmed only for token lists, charset labels, and
nonempty script types. Whitespace-only script types remain inactive data blocks.
Outside the enumerated defaults, values containing character references and MIME
types containing parameters are preserved to avoid changing case-sensitive data.
Invalid button types become the empty Auto state, preserving command behavior.
Empty `autocapitalize` values are kept so they can inherit the form's setting.

#### Example

Source:

```html
<form method="GET"></form>
<img loading="">
<button type="EXAMPLE"></button>
```

Minified:

```html
<form method="get"></form>
<img loading="eager">
<button type=""></button>
```
