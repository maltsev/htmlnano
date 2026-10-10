### mergeStyles
Merges multiple `<style>` with the same normalized `media` and `type` into one tag,
as long as all other attributes match (for example: `nonce`, `title`, `data-*`).
Attribute matching is strict: any differing attribute (including `nonce`) prevents merging.

Normalization details:
- Attribute names are compared without ASCII case, and character references in values are decoded for matching. The first duplicate attribute wins, as in HTML.
- Missing or empty `type` is treated as `text/css` (case-insensitive). Other types, including whitespace-padded values, are left separate.
- Missing or empty `media` is treated as `all`. ASCII whitespace and case are normalized for simple queries; queries containing strings, escapes or custom identifiers are matched conservatively.
- Boolean attributes like `amp-custom` and `disabled` are treated as present when set.

Skipped styles:
- `<style scoped>...</style>`
- `<style integrity>...</style>`
- AMP boilerplate styles (`amp-boilerplate`, `amp4ads-boilerplate`, `amp4email-boilerplate`)
- Styles containing `@import` or `@namespace`, which depend on stylesheet boundaries
- Styles with unfinished CSS constructs, escapes outside strings or legacy HTML comment wrappers. These are kept separate conservatively so one stylesheet cannot consume or reinterpret another's rules.

#### Source order is preserved

CSS rules of equal specificity resolve by their source order, so moving a
`<style>` past another stylesheet can silently change which rules win. To stay
safe, only styles that form a **contiguous run** in document order are merged:
the merge group is closed whenever a stylesheet source appears between two
otherwise-mergeable styles, namely:

- a `<link rel="stylesheet">` (any other `rel`, such as `preload`, is not a
  stylesheet source and does not break a group);
- a `<style>` with different group attributes (e.g. a different `media` or
  `type`), or a skipped style, including AMP boilerplate;
- a CSP `<meta>`, `<script>` or `<base>` element, to preserve authorization,
  script observations and relative URL resolution;
- `<svg>` or `<math>` content, whose styles are left untouched.

Ordinary content between styles (plain elements, text, comments, preload links)
does not break a group. When a group is closed a new
one starts, so a document can produce several independent merged groups.

#### `<noscript>` and `<template>` are separate scopes

Styles inside `<noscript>` only apply when scripting is disabled, and styles
inside `<template>` are inert until the template is cloned. Their styles are
merged among themselves, but never with the styles of the surrounding document
in either direction. A `<noscript>` also closes an open group, because with
scripting disabled its styles do apply at that exact position:

```html
<style>h1 { color: red }</style>
<style>div { color: blue }</style>
<noscript>
    <style>h1 { color: green }</style>
    <style>div { color: black }</style>
</noscript>
```

becomes:

```html
<style>h1 { color: red } div { color: blue }</style>
<noscript>
    <style>h1 { color: green } div { color: black }</style>
</noscript>
```

#### Example
Source:
```html
<style>h1 { color: red }</style>
<style>div { font-size: 20px }</style>
<style media="print">div { color: blue }</style>
<style type="text/css" media="print">a {}</style>
```

Minified:
```html
<style>h1 { color: red } div { font-size: 20px }</style>
<style media="print">div { color: blue } a {}</style>
```

The following is **not** merged, because the external stylesheet sits between the
two inline styles and could change the cascade:
```html
<style>p { color: red }</style>
<link rel="stylesheet" href="theme.css">
<style>p { color: green }</style>
```
