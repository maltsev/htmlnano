# Modules

By default the modules should only perform safe transforms, see the module documentation below for details.
You can disable modules by passing `false` as option, and enable them by passing `true`.

The order in which the modules are documented is also the order in which they are applied.

## Attributes

### normalizeAttributeValues

- Normalize casing of specific attribute values that are case-insensitive (for example `form[method]`, `img[crossorigin]`, `script[type]`, `link[sizes]`, `img[fetchpriority]`).
- Trim surrounding whitespace for normalized values.
- Apply the [invalid value default](https://html.spec.whatwg.org/#invalid-value-default) for specific attributes (for example `img[loading]`, `img[decoding]`, `img[fetchpriority]`, `link[fetchpriority]`, `script[fetchpriority]`, `track[kind]`, `button[type]`, `textarea[wrap]`, `crossorigin`, `referrerpolicy`, `hidden`, `autocapitalize`, `marquee[behavior]`, `marquee[direction]`).

Invalid value defaults are only applied to the specific elements listed above
(for example `button[type]` is normalized, but `input[type]` is not changed).

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
<button type="submit"></button>
```

### removeEmptyAttributes
Removes empty attributes when it is safe, based on the tag and attribute name.
The removal rules are a fixed [allowlist](https://github.com/maltsev/htmlnano/blob/master/src/_modules/removeEmptyAttributes.ts) in the module.

#### Notes
- Attributes are removed when the value is empty or whitespace-only.
- Event handler attributes (for example `onclick`, `onfocus`) are always removed when empty.
- Some attributes are only removed on specific tags, such as `cols` on `<textarea>` or `minlength`/`maxlength` on `<input>` and `<textarea>`.
- Attributes like `alt` are intentionally not removed, even when empty.

#### Side effects
This module could break your styles or JS if you use selectors with attributes:
```CSS
img[style=""] {
    margin: 10px;
}
```

#### Example
Source:
```html
<div id="" class="" title=""></div>
<button onclick="" onfocus=" "></button>
<textarea cols=""></textarea>
<img src="foo.jpg" alt="" style="">
```

Minified:
```html
<div></div>
<button></button>
<textarea></textarea>
<img src="foo.jpg" alt="">
```

### collapseAttributeWhitespace
Collapse redundant whitespace in attribute values where it is safe:
- List-like attributes are normalized by collapsing internal whitespace and trimming ends (`class`, `rel`, `ping`, `sandbox`, `headers`, `dropzone`, `sizes` on `<link>`).
- Single-value attributes are trimmed (for example `href`, `style`, `src`, `width`, `height`) when they are on the correct elements.
- Event handler attributes (like `onclick`) are trimmed only at the ends; inner whitespace is preserved.

`sizes` on `<img>` is not modified.

#### Example
Source:
```html
<a class=" content  page  " style="  display: block;    " href="   https://example.com"></a>
```

Minified:
```html
<a class="content page" style="display: block;" href="https://example.com"></a>
```

### removeRedundantAttributes
Removes redundant attributes from tags when they match HTML defaults:
- `method="get"` from `<form>`
- `type="text"` from `<input>`
- `type="submit"` from `<button>`
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

Attribute values are matched case-insensitively with surrounding whitespace ignored.
Script `type="module"` is preserved, and `link[rel]` is treated as a space-separated token list when checking for `rel="stylesheet"`.

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

### removeXmlLeftovers
Removes XHTML-era leftovers that are meaningless in HTML documents (commonly found in CMS output):
- `xmlns="http://www.w3.org/1999/xhtml"` on `<html>`. The HTML parser ignores it — `<html>` is always in the HTML namespace regardless. Only the exact XHTML namespace value is removed, and only on the `<html>` tag; `xmlns` on `<svg>`, `<math>`, or any other value/element is left untouched.
- `xml:lang` when an identical (case-insensitive) `lang` attribute is present on the same element. If `lang` is absent or differs, `xml:lang` is left alone, since it may be the only language signal for XML tooling.

Attribute names and values are matched case-insensitively.

#### Options
This module is only enabled in the `max` preset (disabled by default). Set the option to `true` to enable it explicitly.

#### Side effects
This changes documents that are re-served as XHTML/XML: the `xmlns` declaration and `xml:lang` are significant in true XML processing. Only enable this if your document is served and consumed as HTML.

#### Example
Source:
```html
<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en"></html>
```

Minified:
```html
<html lang="en"></html>
```

### collapseBooleanAttributes

- Collapses HTML boolean attributes (like `disabled`, `checked`, `readonly`) to the minimized form, regardless of their string value (for example `checked="false"` still becomes `checked`).
- Collapses attributes whose value is an empty string to the minimized form (for example `href=""` becomes `href`).
- Collapses [missing value default](https://html.spec.whatwg.org/#missing-value-default) attributes when they match the default, currently `audio[preload=auto]` and `video[preload=auto]`.
- Collapses `crossorigin="anonymous"` (case-insensitive) to `crossorigin`.
- Collapses `popover="auto"` (case-insensitive) to `popover`, since the empty string maps to the same state. `popover="manual"` and `popover="hint"` are left untouched.
- Collapses the declarative shadow DOM template booleans `shadowrootclonable`, `shadowrootdelegatesfocus`, and `shadowrootserializable` (but not the enumerated `shadowrootmode`).
- Leaves `hidden="until-found"` untouched, since it is a distinct state from the collapsed `hidden`.
- Leaves `visible` untouched on A-Frame elements (`<a-*>`) to avoid breaking `visible="false"`.

#### Options
If your document uses [AMP](https://www.ampproject.org/), set the `amphtml` flag
to collapse additional, AMP-specific boolean attributes:
```json
"collapseBooleanAttributes": {
    "amphtml": true
}
```
When `amphtml` is enabled, AMP boolean attributes are collapsed when their
value is empty, `true`, or matches the attribute name.

#### Side effects
This module could break your styles or JS if you use selectors with attributes:
```CSS
button[disabled="disabled"] {
    color: red;
}
```

#### Example
Source:
```html
<button disabled="disabled">click</button>
<script defer=""></script>
<a href=""></a>
<script src="example-framework.js" crossorigin="anonymous"></script>
<video preload="auto"></video>
<a-entity visible="false"></a-entity>
```

Minified:
```html
<button disabled>click</button>
<script defer></script>
<a href></a>
<script src="example-framework.js" crossorigin></script>
<video preload></video>
<a-entity visible="false"></a-entity>
```

### deduplicateAttributeValues
Remove duplicate values from list-like attributes (`class`, `rel`, `ping`, `sandbox`, `dropzone`, `sizes` on `link`, `headers`).
For case-insensitive token lists (`rel`, `sandbox`, `dropzone`, `sizes`), duplicates are removed regardless of casing (first occurrence kept).
Whitespace is preserved where possible: repeated tokens are removed, but existing spacing between remaining tokens is kept.

Non-list-like attributes are not modified.

#### Example
Source:
```html
<link rel="nofollow NoFoLlOw noopener">
<a class="foo  foo   bar">click</a>
```

Minified:
```html
<link rel="nofollow noopener">
<a class="foo    bar">click</a>
```

### minifyAttributes
Minify specific attribute values. This module targets
`meta[http-equiv="refresh"]` by removing the `url=` prefix when present,
trimming whitespace, and dropping empty URLs. It also minifies
`meta[name="viewport"]` content by normalizing whitespace around separators
(commas/semicolons) and `=`, and by dropping redundant trailing zeros in
numeric values (e.g. `initial-scale=1.0` → `initial-scale=1`). The author's
separator characters (`,` or `;`) are preserved.

#### Options
- `metaContent` (`boolean`) - enable minification for `meta[http-equiv="refresh"]` and `meta[name="viewport"]` content.
- `redundantWhitespaces` - remove redundant whitespace from attribute values.
  - `safe` - collapse whitespace in list-like attributes and trim single-value attributes (similar to `collapseAttributeWhitespace`).
  - `aggressive` - also trims other attribute values. (`agressive` is a deprecated alias kept for backwards compatibility.)
  - `false` - disable this behavior.

#### Example
Source:
```html
<meta http-equiv="refresh" content="5; url=">
<meta http-equiv="refresh" content="5; url=http://example.com/">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

Minified:
```html
<meta http-equiv="refresh" content="5">
<meta http-equiv="refresh" content="5; http://example.com/">
<meta name="viewport" content="width=device-width,initial-scale=1">
```

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
- Hash-only (`#...`) and query-only (`?...`) URLs are left untouched.
- A default port matching the scheme is stripped (`https://example.com:443/x` → `https://example.com/x`, `http://example.com:80/x` → `http://example.com/x`). A mismatched port is kept (e.g. `:443` is not removed for `http`, nor `:8443` for `https`).
- A trailing empty query (`?`) or empty fragment (`#`) is removed (`foo?` and `foo#` → `foo`). A non-empty query (`?x=1`) or fragment (`#top`) is kept.
- `link[rel="canonical"]` is never rewritten.
- `srcset` and `imagesrcset` are processed when `srcset` is installed; invalid `srcset` strings are left unchanged.
- `javascript:` URLs are minified with `terser` when available, preserving leading whitespace and normalizing the protocol to lowercase.
- This module is not enabled by the default presets; you must pass a base URL to turn it on.

#### Example

**Basic Usage**

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

**With sub-directory**

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

**Srcset**

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


### sortAttributes
Sort attributes inside elements.

The module won't impact the plain-text size of the output.
However it will improve the compression ratio of gzip/brotli used in HTTP compression.

#### Options

- `alphabetical`: Default option. Sort attributes in alphabetical order.
- `frequency`: Sort attributes by frequency across the whole document.
- `true`: Alias for `alphabetical`.
- `false`: Disable the module.

Frequency sorting preserves the original attribute name casing (for example `viewBox` stays `viewBox`)
and uses alphabetical ordering on lowercased attribute names to break ties.
When attribute names collide by case, the first occurrence wins.

#### Example

**alphabetical**

Source:
```html
<input type="text" class="form-control" name="testInput" autofocus="" autocomplete="off" id="testId">
```

Processed:
```html
<input autocomplete="off" autofocus="" class="form-control" id="testId" name="testInput" type="text">
```

**frequency**

Source:
```html
<input type="text" class="form-control" name="testInput" id="testId">
<a id="testId" href="#" class="testClass"></a>
<img width="20" src="../images/image.png" height="40" alt="image" class="cls" id="id2">
```

Processed:
```html
<input class="form-control" id="testId" type="text" name="testInput">
<a class="testClass" id="testId" href="#"></a>
<img class="cls" id="id2" alt="image" height="40" src="../images/image.png" width="20">
```



### sortAttributesWithLists
Sort values in list-like attributes (`class`, `rel`, `ping`, `sandbox`, `dropzone`, `headers`, and `sizes` on `<link>`). `sizes` on `<img>` is not modified.

The module won't impact the plain-text size of the output.
However it will improve the compression ratio of gzip/brotli used in HTTP compression.

#### Options

- `alphabetical`: Default option. Sort attribute values in alphabetical order.
- `frequency`: Sort attribute values by frequency across the document.
- `true`: Alias for `alphabetical`.
- `false`: Disable the module.

Frequency sorting preserves duplicates, ignores redundant whitespace in the attribute value, and uses alphabetical ordering to break ties.
Attribute name casing is preserved.

#### Example

**alphabetical**

Source:
```html
<div class="foo baz bar">click</div>
```

Processed:
```html
<div class="bar baz foo">click</div>
```

**frequency**

Source:
```html
<div class="foo baz bar"></div><div class="bar foo"></div>
```

Processed:
```html
<div class="foo bar baz"></div><div class="foo bar"></div>
```




## HTML Content

### collapseWhitespace
Collapses redundant white spaces (including new lines).
It doesn’t affect white spaces in the elements `<style>`, `<textarea>`, `<script>`, `<pre>`, and `<template>`.

#### Options
- `conservative` — collapses all redundant whitespace to 1 space (default). Whitespace around inline elements (like `<a>`, `<span>`, `<code>`) is preserved when possible.
- `aggressive` — collapses redundant whitespace and trims around nodes when it is safe. This may remove indentation and drop whitespace-only text nodes between comments and non-inline elements.
- `all` — collapses all redundant whitespace and trims text nodes. This is the most aggressive behavior and can remove meaningful spacing between inline elements.

#### Notes
- Comments are preserved, but whitespace around them can be collapsed depending on the option.
- Template content is left untouched.
- Elements carrying an inline `white-space` style that preserves whitespace (`white-space: pre`, `pre-wrap`, `pre-line`, or `break-spaces`) are treated like `<pre>`: their content and their whole subtree are left untouched, so layout is not broken. The check is a simple regexp on the `style` attribute value (no full CSS parsing), and `pre-line` (which technically collapses spaces but keeps newlines) is treated as fully protected as the conservative choice.

#### Side effects

*all*
`<i>hello</i> <i>world</i>` or `<i>hello</i><br><i>world</i>` after minification will be rendered as `helloworld`.
To prevent that use either the default `conservative` option, or the `aggressive` option.

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
<div>hello world!<a href="#">answer</a><style>div  { color: red; }  </style><main></main></div>
```

Minified (with `aggressive`):
```html
<div>hello world! <a href="#">answer</a><style>div  { color: red; }  </style><main></main></div>
```

Minified (with `conservative`):
```html
<div> hello world! <a href="#">answer</a> <style>div  { color: red; }  </style> <main></main> </div>
```


### minifyCharacterReferences
Decodes HTML character references (entities) into shorter literal UTF-8
characters in text nodes and attribute values. Most named references are
5–8 bytes, while the equivalent character is only 2–3 bytes as UTF-8
(`&mdash;` → `—`, `&hellip;` → `…`, `&copy;` → `©`). Decimal (`&#8212;`)
and hexadecimal (`&#x2014;`) numeric references are decoded as well.

#### Options
- `true` — decode a conservative allowlist of common typographic/symbol named
  references plus safe numeric references (default in the `safe` preset).
- `{ decodeAll: true }` — decode every named reference the module knows about
  (default in the `max` preset). The module never adds a runtime dependency,
  so unknown named references are always left untouched.

#### Notes
- The syntactically required references are **never** decoded, because
  posthtml-render does not re-escape text: `&amp;`, `&lt;`, `&gt;` in text
  nodes, and `&amp;`, `&quot;`, `&apos;`/`&#39;` in attribute values.
- Any reference (named or numeric) whose decoded form would be `&`, `<`, `>`
  (or a quote inside an attribute value) is left as-is. This also prevents
  double-encoded input like `&amp;mdash;` from collapsing into `&mdash;`.
- Content of `<script>`, `<style>`, and `<textarea>` is left untouched, since
  browsers do not entity-decode raw-text element content.
- Invalid, unknown, or non-terminated references (for example `&fake;` or
  `&mdash` without a semicolon) are left untouched.

#### Example
Source:
```html
<p title="a &mdash; b">Copyright &copy; 2024 &#8212; the end&hellip;</p>
```

Minified:
```html
<p title="a — b">Copyright © 2024 — the end…</p>
```


### removeComments
#### Options
- `safe` – removes HTML comments but keeps:
  - conditional comments (`<!--[if ...]>...<![endif]-->` and downlevel-revealed forms)
  - `<!--noindex-->...<!--/noindex-->` (case/spacing tolerant)
  - `<!--sse-->...<!--/sse-->` Server-Side Excludes markers (case/spacing tolerant)
  - excerpt markers that start with `more` (case/spacing tolerant), e.g. `<!-- more -->`, `<!-- MORE -->`, `<!-- more Read more -->`
  - license comments `<!--! ... -->` (the HTML analogue of the `/*! ... */` comments kept by Terser/cssnano)
  (default)
- `all` — removes all HTML comments, including conditional/noindex/sse/excerpt comments
- A `RegExp` — removes HTML comments that match the regexp (non-matching comments are kept)
- A string — treated as a regexp pattern. Supports `/pattern/flags` or a plain pattern string (useful in JSON config files)
- A `Function` that returns boolean — removes HTML comments for which the callback returns a truthy value

#### Example

Source:

```js
{
    removeComments: 'all'
}
```

```html
<div><!-- test --></div>
```

Minified:

```html
<div></div>
```

Source:

```js
{
    removeComments: 'safe'
}
```

```html
<!--noindex-->indexed?<!--/noindex-->
<!--[if IE 8]><link href="ie8only.css" rel="stylesheet"><![endif]-->
Lorem ipsum <!-- more --> dolor sit amet <!-- comment -->
```

Minified:

```html
<!--noindex-->indexed?<!--/noindex-->
<!--[if IE 8]><link href="ie8only.css" rel="stylesheet"><![endif]-->
Lorem ipsum <!-- more --> dolor sit amet
```

Source:

```js
{
    removeComments: /<!--(\/)?noindex-->/
}
```

```html
<div><!--noindex-->this text will not be indexed<!--/noindex-->Lorem ipsum dolor sit amet<!--more-->Lorem ipsum dolor sit amet</div>
```

Minified:

```html
<div>this text will not be indexedLorem ipsum dolor sit amet<!--more-->Lorem ipsum dolor sit amet</div>
```

Source (JSON config):

```json
{
    "removeComments": "/<!--(\\/)?noindex-->/"
}
```

Source:

```js
{
    removeComments: (comment) => {
        if (comment.includes('noindex')) return true;
        return false;
    }
}
```

```html
<div><!--noindex-->this text will not be indexed<!--/noindex-->Lorem ipsum dolor sit amet<!--more-->Lorem ipsum dolor sit amet</div>
```

Minified:

```html
<div>this text will not be indexedLorem ipsum dolor sit amet<!--more-->Lorem ipsum dolor sit amet</div>
```

### removeEmptyElements
Removes elements that have no meaningful content.

#### Options
- `true` — removes empty elements without attributes.
- `{ removeWithAttributes: true }` — removes empty elements even if they have attributes.

Empty elements are defined as elements with no child elements and only whitespace/comments as content.
Void elements (like `<img>` or `<br>`) are never removed.

#### Side effects
This module can remove elements that are used for styling or scripting (for example `<span class="icon"></span>`).
It is disabled by default.

#### Example
Source:
```html
<div>hello<span><b></b></span></div>
<div><span class="icon"></span></div>
```

Minified (`removeEmptyElements: true`):
```html
<div>hello</div>
<div><span class="icon"></span></div>
```

Minified (`removeEmptyElements: { removeWithAttributes: true }`):
```html
<div>hello</div>
<div></div>
```

### minifyConditionalComments
Minifies HTML inside IE conditional comments (both downlevel-hidden and downlevel-revealed forms).
The conditional comment wrappers are preserved while the inner HTML is processed with the same htmlnano options,
so other modules (like `collapseWhitespace`, `minifyCss`, or `minifyJs`) can apply within the conditional block.

#### Notes
- Empty conditional comments and standalone `<!--<![endif]-->` markers are left untouched.
- If the comment content includes an opening `<html>` without a closing tag, any auto-inserted
  `</html>` from the internal parse step is removed so it is not injected into the conditional block.

#### Example
Source:

```html
<!--[if lte IE 7]>
    <style type="text/css">
        .title {
            color: red;
        }
    </style>
<![endif]-->
```

Minified:

```html
<!--[if lte IE 7]><style type="text/css">.title{color:red}</style><![endif]-->
```

### removeOptionalTags
Remove certain tags that can be omitted, see [HTML Standard - 13.1.2.4 Optional tags](https://html.spec.whatwg.org/multipage/syntax.html#optional-tags).

Only tags without attributes are eligible.
If the element has any attributes, the tag is preserved.

#### Notes
- htmlnano can only remove a tag when both its start and end tags can be omitted.
- Due to [the limitation of PostHTML](https://github.com/maltsev/htmlnano/issues/99), htmlnano can’t remove only the start tag or only the end tag of an element.
- Supported optional tags are limited to the ones that can be removed as a pair.

Supported tags and key rules:

- `html`
  - Start tag can be omitted when the first child is not a comment.
  - End tag can be omitted when the `html` element is not immediately followed by a comment.
- `head`
  - Start tag can be omitted when the element is empty or the first child is an element.
  - End tag can be omitted when `head` is not immediately followed by ASCII whitespace or a comment.
- `body`
  - Start tag can be omitted when the element is empty or the first child is not ASCII whitespace or a comment.
  - Start tag can’t be omitted if the first child element is `meta`, `link`, `script`, `style`, or `template`.
  - End tag can be omitted when `body` is not immediately followed by a comment.
- `colgroup`
  - Start tag can be omitted when the first child element is `col`, and the element is not immediately preceded by another `colgroup`.
  - End tag can be omitted when `colgroup` is not immediately followed by ASCII whitespace or a comment.
- `tbody`
  - Start tag can be omitted when the first child element is `tr`, and the element is not immediately preceded by `tbody`, `thead`, or `tfoot`.
  - End tag can be omitted when the element is not immediately followed by `tbody` or `tfoot`.

#### Example

Source:

```html
<html><head><title>Title</title></head><body><p>Hi</p></body></html>
```

Minified:

```html
<title>Title</title><p>Hi</p>
```

### normalizeDoctype
Normalize a legacy doctype to the short HTML5 form `<!doctype html>`.

Legacy XHTML 1.0 / HTML 4.01 doctypes carry a `PUBLIC`/`SYSTEM` identifier and
are typically 90–120 bytes; the short form is only 15 bytes.

This module is **enabled only in the `max` preset** (or by explicitly setting
`normalizeDoctype: true`). It is not part of the `safe` preset.

#### Notes
- Only the top-level doctype string node is inspected; posthtml-parser emits the
  doctype as a raw string, so no DOM node is created for it.
- **Quirks-mode caveat:** rewriting an HTML 4.01 / XHTML 1.0 `PUBLIC` doctype to
  the short form can subtly change how a browser renders the page. Different
  legacy doctypes can trigger *standards*, *almost-standards*, or *quirks* mode,
  and the short form always selects full standards mode. This may alter, for
  example, inline image spacing inside table cells. Because that change is not
  guaranteed to be visually neutral, this module is `max`-only.
- The XML declaration (`<?xml ...?>`) is never treated as a doctype.
- An already-short doctype is normalized to lowercase (`<!DOCTYPE html>` becomes
  `<!doctype html>`); a document without a doctype is left unchanged.

#### Example
Source:
```html
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html></html>
```

Minified:
```html
<!doctype html>
<html></html>
```

### removeAttributeQuotes
Remove quotes around attributes when possible, see
[HTML Standard - 12.1.2.3 Attributes - Unquoted attribute value syntax](https://html.spec.whatwg.org/multipage/syntax.html#attributes-2).

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
`removeAttributeQuotes` sets this option to `false` only when it is not already defined, so other PostHTML plugins and configuration can override it.

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

`removeAttributeQuotes` will not work because PostHTML's `quoteAllAttributes` takes the priority.

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


## `<style>`, `<script>` and `<svg>` Tags
### mergeStyles
Merges multiple `<style>` with the same normalized `media` and `type` into one tag,
as long as all other attributes match (for example: `nonce`, `title`, `data-*`).
Attribute matching is strict: any differing attribute (including `nonce`) prevents merging.

Normalization details:
- Missing or empty `type` is treated as `text/css` (case-insensitive).
- Missing or empty `media` is treated as `all`, and internal whitespace is collapsed.
- Boolean attributes like `amp-custom` and `disabled` are treated as present when set.

Skipped styles:
- `<style scoped>...</style>`
- `<style integrity>...</style>`
- AMP boilerplate styles (`amp-boilerplate`, `amp4ads-boilerplate`, `amp4email-boilerplate`)

#### Source order is preserved

CSS rules of equal specificity resolve by their source order, so moving a
`<style>` past another stylesheet can silently change which rules win. To stay
safe, only styles that form a **contiguous run** in document order are merged:
the merge group is closed whenever a stylesheet source appears between two
otherwise-mergeable styles, namely:

- a `<link rel="stylesheet">` (any other `rel`, such as `preload`, is not a
  stylesheet source and does not break a group);
- a `<style>` with different group attributes (e.g. a different `media` or
  `type`), or a skipped `scoped`/`integrity` style.

Non-stylesheet content between styles (plain elements, text, comments, AMP
boilerplate, preload links) does not break a group. When a group is closed a new
one starts, so a document can produce several independent merged groups.

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


### mergeScripts
Merge adjacent inline `<script>` tags when they share the same normalized attributes (all except `src`, `integrity`, and `type`).
The merged content is appended into the last script in the group and the earlier scripts are removed.

#### Notes
- Only inline scripts with mergeable types are considered: `text/javascript` and `application/javascript` (default is `text/javascript`). Other types (including `type="module"`) are left untouched.
- Scripts with `src` or `integrity` are never merged and they break a merge group, so code on each side stays separate.
- Boolean attributes (`async`, `defer`, `nomodule`) are normalized and treated as present, so `defer` and `defer="defer"` match.
- Scripts are separated by `nonce` value, by `nomodule`, and by `async`/`defer` differences.
- A missing trailing semicolon is added when concatenating. If a script ends with a line comment, the merger inserts `\n;` before the next script to avoid comment swallowing.

#### Side effects
Merging changes where the code physically lives in the document.
This can break code when different attribute sets must remain isolated (for example `async` or `nomodule`), or when external tools rely on script boundaries.

#### Example
Source:
```html
<script>const foo = 'A:1';</script>
<script class="test">foo = 'B:1';</script>
<script type="text/javascript">foo = 'A:2';</script>
<script defer>foo = 'C:1';</script>
<script>foo = 'A:3';</script>
<script defer="defer">foo = 'C:2';</script>
<script class="test" type="text/javascript">foo = 'B:2';</script>
```

Minified:
```html
<script>const foo = 'A:1';foo = 'A:2';foo = 'A:3';</script>
<script defer="defer">foo = 'C:1';foo = 'C:2';</script>
<script class="test" type="text/javascript">foo = 'B:1';foo = 'B:2';</script>
```


### minifyCss
Minifies CSS with [cssnano](http://cssnano.co/) inside `<style>` tags and `style` attributes.

Only `<style>` tags with a CSS type (`text/css` or no `type` attribute) are minified.
Other style types (for example `text/less`) are left untouched.
CDATA wrappers are preserved, even when surrounded by whitespace.

Skipped nodes:
- Any element with an `integrity` attribute (covers both `<style>` tags and `style` attributes).
- AMP boilerplate styles (`amp-boilerplate`, `amp4ads-boilerplate`, `amp4email-boilerplate`).

Notes:
- `style` attributes are wrapped in a temporary selector (`a{...}`) before minification so cssnano can parse them, then the wrapper is removed.
- When htmlnano uses cssnano's `default` preset for `style` attributes, it disables inline-irrelevant optimizations such as `mergeRules`, `minifySelectors`, `minifyParams`, `normalizeCharset`, `uniqueSelectors`, and `normalizeUnicode`.
- If you explicitly configure any of those plugins in `preset: ['default', ...]`, or pass a custom cssnano `plugins` list, htmlnano keeps your settings instead of overwriting them.

You have to install `cssnano` and `postcss` in order to use this feature:

```bash
npm install --save-dev cssnano postcss
# if you prefer yarn
# yarn add --dev cssnano postcss
# if you prefer pnpm
# pnpm install --save-dev cssnano postcss
```

#### Options
See [the documentation of cssnano](http://cssnano.co/docs/optimisations/) for all supported optimizations.
By default CSS is minified with preset `default`, which shouldn't have any side-effects.

To use another preset or disable some optimizations pass options to `minifyCss` module:
```js
htmlnano.process(html, {
    minifyCss: {
        preset: ['default', {
            discardComments: {
                removeAll: true,
            },
        }]
    }
});
```

#### Example
Source:
```html
<div>
    <style>
        h1 {
            margin: 10px 10px 10px 10px;
            color: #ff0000;
        }
    </style>
</div>
```

Minified:
```html
<div>
    <style>h1{margin:10px;color:red}</style>
</div>
```


### minifyJs
Minifies JS using [Terser](https://github.com/fabiosantoscode/terser) inside `<script>` tags.

You have to install `terser` in order to use this feature:

```bash
npm install --save-dev terser
# if you prefer yarn
# yarn add --dev terser
# if you prefer pnpm
# pnpm install --save-dev terser
```

#### Options
See [the documentation of Terser](https://github.com/fabiosantoscode/terser#api-reference) for all supported options.
Terser options can be passed directly to the `minifyJs` module:
```js
htmlnano.process(html, {
    minifyJs: {
        output: { quote_style: 1 },
    },
});
```

The module treats script types with parameters (for example `text/javascript; charset=utf-8`) as JavaScript.
For `type="module"` scripts, it enables Terser's `module` option unless you explicitly set `module` yourself.

#### Notes
- Only JavaScript script types are processed: the default type, `text/javascript`, `application/javascript`, and legacy `text/ecmascript`. Other types (for example `application/json`) are left untouched.
- Any `<script>` with an `integrity` attribute is skipped to preserve SRI safety. Generate SRI after minification if you rely on it.
- Inline event handler attributes (like `onclick` or `onClick`) are minified as JavaScript.
- CDATA wrappers inside `<script>` in SVG are preserved; the inner JS is minified and re-wrapped.
- For AMP documents, inline handlers like `on="tap:..."` are not modified when using the AMP-safe preset.



#### Example
Source:
```html
<div>
    <script>
        /* comment */
        const foo = function () {

        };
    </script>
</div>
```

Minified:
```html
<div>
    <script>const foo=function(){};</script>
</div>
```


### minifyJson
Minifies JSON inside `<script>` tags whose `type` ends in `/json` or `+json` (case-insensitive), including when MIME parameters are present.

#### Notes
- Only `<script>` tags with an explicit JSON MIME type are processed. Tags without a `type` attribute are left untouched.
- MIME parameters are allowed (`application/json; charset=utf-8`) and casing is ignored.
- Tags with `integrity` are skipped to preserve SRI safety.
- Invalid JSON is left unchanged.
- JSON-like suffixes such as `application/jsonp` are not considered JSON and are skipped.

#### Example
Source:
```html
<script type="application/json">
{
    "user": "me"
}
</script>
```

Minified:
```html
<script type="application/json">{"user":"me"}</script>
```

Source:
```html
<script type="application/ld+json; charset=UTF-8">
{
    "id": 1
}
</script>
```

Minified:
```html
<script type="application/ld+json; charset=UTF-8">{"id":1}</script>
```


### minifyHtmlTemplate
Minifies HTML inside template containers (for example `<script type="text/x-handlebars-template">` or `<template>`).
It runs htmlnano on the inner HTML using the current options.

#### Options
`minifyHtmlTemplate: true` enables the default template rules.

You can pass an array of object rules:
```js
htmlnano.process(html, {
    minifyHtmlTemplate: [
        { tag: 'template', attrs: { id: 'my-template' } },
        { tag: 'script', attrs: { type: 'text/x-handlebars-template' } },
    ]
});
```

Passing any array replaces the built-in rules. To keep defaults and add more, spread them in:
```js
import { modules } from 'htmlnano';

htmlnano.process(html, {
    minifyHtmlTemplate: [
        ...modules.minifyHtmlTemplate.defaultRules,
        { tag: 'script', attrs: { id: 'my-template' } }
    ]
});
```

#### Notes
- The built-in rules include common script template MIME types and the `<template>` tag.
- Rules are objects: `{ tag, attrs? }`.
- Attribute name matching is case-insensitive. For `type`, matching ignores MIME parameters and casing.
- Any tag with an `integrity` attribute is skipped, and `<script src="...">` is not processed.
- The actual changes depend on the enabled modules (for example `collapseWhitespace`).

#### Example
Source:
```html
<script type="text/x-handlebars-template">
    <div class="entry">
        <h1>{{title}}</h1>
    </div>
</script>
```

Minified:
```html
<script type="text/x-handlebars-template"><div class="entry"><h1>{{title}}</h1></div></script>
```


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

`minifySvg: true` enables SVGO with its default configuration.
htmlnano enables SVGO multipass by default; set `multipass: false` to disable it.

#### Notes
- SVGs are rendered with quoted attributes before SVGO runs to keep the output stable.
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

### removeUnusedCss

Removes unused CSS inside `<style>` tags with either [uncss](https://github.com/uncss/uncss) or [PurgeCSS](https://github.com/FullHuman/purgecss).

#### With PurgeCSS (recommended)

Use PurgeCSS instead of uncss by adding `tool: 'purgeCSS'` to the options.

You have to install `purgecss` in order to use this feature:

```bash
npm install --save-dev purgecss
# if you prefer yarn
# yarn add --dev purgecss
# if you prefer pnpm
# pnpm install --save-dev purgecss
```

##### Options

See [the documentation of PurgeCSS](https://purgecss.com) for all supported options.

PurgeCSS options can be passed directly to the `removeUnusedCss` module:
```js
htmlnano.process(html, {
    removeUnusedCss: {
        tool: 'purgeCSS',
        safelist: ['.do-not-remove']
    }
});
```

The following PurgeCSS options are ignored if passed to the module:

-   `content`
-   `css`
-   `extractors`

#### With uncss

`uncss` isn't maintained anymore, so I don't recommend using it.
You have to install `uncss` in order to use this feature:

```bash
npm install --save-dev uncss
# if you prefer yarn
# yarn add --dev uncss
# if you prefer pnpm
# pnpm install --save-dev uncss
```


##### Options
See [the documentation of uncss](https://github.com/uncss/uncss) for all supported options.

uncss options can be passed directly to the `removeUnusedCss` module:
```js
htmlnano.process(html, {
    removeUnusedCss: {
        ignore: ['.do-not-remove']
    }
});
```

The following uncss options are ignored if passed to the module:

-   `stylesheets`
-   `ignoreSheets`
-   `raw`

#### Notes

- Only `<style>` tags with a CSS type (`text/css` or no `type` attribute) are processed. Other style types are left untouched.
- CDATA wrappers in `<style>` tags are preserved after removing unused rules.
- Empty styles are removed entirely when all rules are stripped.
- AMP boilerplate styles (`amp-boilerplate`, `amp4ads-boilerplate`, `amp4email-boilerplate`) are not touched.
- PurgeCSS keeps tag selectors based on the HTML (for example `section {}`), and class/id extraction treats whitespace and newlines as separators.

#### Example
Source:
```html
<div class="b">
    <style>
        .a {
            margin: 10px 10px 10px 10px;
        }
        .b {
            color: #ff0000;
        }
    </style>
</div>
```

Optimized:
```html
<div class="b">
    <style>
        .b {
            color: #ff0000;
        }
    </style>
</div>
```

## Miscellaneous

### custom
It's also possible to pass custom modules in the minifier.
As a function:
```js
const options = {
    custom: function (tree, options) {
        // Some minification
        return tree;
    }
};
```

Or as a list of functions:
```js
const options = {
    custom: [
        function (tree, options) {
            // Some minification
            return tree;
        },

        function (tree, options) {
            // Some other minification
            return tree;
        }
    ]
};
```

htmlnano's options are passed to your custom plugin by the second parameter `options`.

Custom functions may be asynchronous. If a custom function returns a `Promise`, htmlnano awaits it before running the next custom function:
```js
const options = {
    custom: async function (tree, options) {
        await someAsyncMinification(tree);
        return tree;
    }
};
```

Errors thrown (or rejected promises) from a custom function propagate to the caller of `htmlnano.process()` and are not swallowed.
