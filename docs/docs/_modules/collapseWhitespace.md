### collapseWhitespace
Collapses redundant white spaces (including new lines).
It doesn’t affect white spaces in the elements `<style>`, `<textarea>`, `<script>`, `<pre>`, `<template>`, or the legacy preformatted elements `<listing>`, `<plaintext>`, and `<xmp>`.

#### Options
- `conservative` — collapses all redundant whitespace to 1 space (default). Whitespace around inline elements (like `<a>`, `<span>`, `<code>`) is preserved when possible.
- `aggressive` — collapses redundant whitespace and trims around nodes when it is safe. This may remove indentation and drop whitespace-only text nodes between comments and non-inline elements.
- `all` — collapses all redundant whitespace and trims every text node, except where the
  whitespace is rendered: between two pieces of inline content exactly one space is kept,
  so the text still reads the same. This is the most aggressive behavior.

#### Notes
- Comments are preserved, but whitespace around them can be collapsed depending on the option.
- Non-rendering elements such as `<script>`, `<style>`, and `<template>` do not interrupt word separators between surrounding text or inline elements.
- Custom elements with hyphenated names are treated as inline elements when deciding whether to keep word separators.
- Template content is left untouched.
- Element and attribute names are matched case-insensitively, so uppercase or mixed-case markup receives the same whitespace protection.
- Character references in inline styles are decoded for the whitespace-preservation check. Whitespace inside a protected element does not replace a separator outside it.
- Elements carrying an inline `white-space` style that preserves whitespace (`white-space: pre`, `pre-wrap`, `pre-line`, or `break-spaces`) are treated like `<pre>`: their content and their whole subtree are left untouched, so layout is not broken. The check is a simple regexp on the `style` attribute value (no full CSS parsing), and `pre-line` (which technically collapses spaces but keeps newlines) is treated as fully protected as the conservative choice.

#### Notes on `all`

`all` trims every text node, but keeps exactly one space wherever the trimmed
whitespace is what separates two pieces of inline content — that is what makes it
lossless for text. Compared to `aggressive` it looks through those boundaries
instead of leaving whitespace alone as soon as an inline element is involved,
so it can trim *inside* inline elements too:

```html
<!-- source -->
<p>Read the <a href="#"> docs </a> first</p>

<!-- all -->
<p>Read the <a href="#">docs</a> first</p>

<!-- aggressive -->
<p>Read the <a href="#">docs </a>first</p>
```

The whitespace of an inline element that another module removes afterwards
(`removeEmptyElements`) is not reconsidered, so such a removal can leave a space
behind where nothing needs one anymore.

#### Example
Source:
```html
<div>
    hello  world!
    <a href="#">answer</a>
    <style>div  { color: red; }  </style>
    <main></main>
</div>
```

Minified (with `all`):
```html
<div>hello world! <a href="#">answer</a><style>div  { color: red; }  </style><main></main></div>
```

Minified (with `aggressive`):
```html
<div>hello world! <a href="#">answer</a><style>div  { color: red; }  </style><main></main></div>
```

Minified (with `conservative`):
```html
<div> hello world! <a href="#">answer</a> <style>div  { color: red; }  </style> <main></main> </div>
```
