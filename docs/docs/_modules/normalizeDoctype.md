### normalizeDoctype
Normalize doctypes to the short HTML5 form `<!doctype html>`.

The option has two enabled modes:

- `'html5'` canonicalizes casing and redundant ASCII whitespace only when the
  complete input is already the short HTML5 doctype. This conservative mode is
  used by the `safe` preset and inherited by `ampSafe`.
- `true` rewrites complete top-level doctype strings beginning with `<!doctype`
  and ASCII whitespace, including legacy `PUBLIC`/`SYSTEM` and malformed doctypes.
  This broad, backward-compatible mode is used by the `max` preset.

#### Notes
- Only the top-level doctype string node is inspected; posthtml-parser emits the
  doctype as a raw string, so no DOM node is created for it.
- The `'html5'` mode cannot change standards/quirks mode because it leaves
  `about:legacy-compat`, legacy HTML/XHTML, malformed, and quirks-triggering
  doctypes unchanged.
- **Quirks-mode caveat for `true`:** rewriting a legacy doctype can change a
  document from *almost-standards* or *quirks* mode to full standards mode. This
  can subtly alter rendering, such as inline image spacing inside table cells.
- XML declarations and non-doctype strings are never treated as doctypes. A
  document without a doctype is left unchanged.
- Neither mode rewrites strings with content after the declaration, an absent
  closing `>`, or non-ASCII whitespace immediately after `<!doctype`.

#### Example
Source:
```html
<!DOCTYPE   HTML >
<html></html>
```

Minified with either `'html5'` or `true`:
```html
<!doctype html>
<html></html>
```
