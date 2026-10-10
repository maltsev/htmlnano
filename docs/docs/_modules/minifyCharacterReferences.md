### minifyCharacterReferences

Decodes HTML character references (entities) into shorter literal UTF-8
characters in text nodes and attribute values. Most named references are
5–8 bytes, while the equivalent character is only 2–3 bytes as UTF-8
(`&mdash;` → `—`, `&hellip;` → `…`, `&copy;` → `©`). Decimal (`&#8212;`)
and hexadecimal (`&#x2014;`) numeric references are decoded as well.

#### Options

- `true` — decode a conservative allowlist of common typographic/symbol named
  references plus safe numeric references (default in the `safe` preset).
- `{ decodeAll: true }` — additionally decode every named reference of the
  HTML standard, such as `&hearts;` or `&Longleftrightarrow;`
  (default in the `max` preset).

#### Notes

- The decoding is lossless: a reference is only decoded when the literal
  character is parsed back into exactly the same character in that context.
- Carriage-return references (`&#13;` and `&#xD;`) are kept because literal
  carriage returns are normalized to line feeds by the HTML parser. Decoding
  also preserves nearby incomplete references and existing line breaks.
- `&amp;` becomes a bare `&` unless that would create an [ambiguous
  ampersand](https://html.spec.whatwg.org/multipage/syntax.html#syntax-ambiguous-ampersand),
  i.e. unless the following text would turn it back into a character
  reference. `&amp;copy;`, `&amp;copy` and `&amp;#169;` are therefore kept,
  while `?a=1&amp;b=2` becomes `?a=1&b=2`. At the very end of a text node the
  following context is not known yet, so `&amp;` is kept there as well.
- `&lt;` is never decoded in text nodes, since posthtml-render does not
  re-escape text and a literal `<` would open a tag. `&gt;` is decoded, and
  both are decoded in attribute values — values containing `<` or `>` are
  always rendered quoted.
- `&quot;` and `&#34;` are kept in attribute values (posthtml-render would
  re-encode or break on a literal `"`), but decoded in text nodes.
  `&apos;`/`&#39;`/`&#x27;` are decoded in attribute values, except in the
  ones posthtml-render renders single-quoted (JSON-ish values, or every value
  when the `quoteStyle` render option asks for single quotes).
- Raw-text content (`<script>`, `<style>`, `<xmp>`, `<iframe>`, `<noembed>`,
  and `<noframes>`) is left untouched, including markup parsed by PostHTML
  as descendants. Tag names are matched regardless of case. `<noscript>`
  content is preserved for both scripting modes, and everything after
  `<plaintext>` is preserved through the end of the document.
  `<textarea>` content is also conservatively left untouched, although
  browsers do decode its character references.
- Invalid, unknown, or non-terminated references (for example `&fake;` or
  `&mdash` without a semicolon) are left untouched, and double-encoded input
  like `&amp;mdash;` never collapses into `&mdash;`.

#### Example

Source:

```html
<p title="a &mdash; b">Copyright &copy; 2024 &#8212; the end&hellip;</p>
<a href="/search?q=1&amp;page=2">R &amp; D</a>
```

Minified:

```html
<p title="a — b">Copyright © 2024 — the end…</p>
<a href="/search?q=1&page=2">R & D</a>
```
