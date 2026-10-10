### removeXmlLeftovers

Removes XHTML-era leftovers that are meaningless in HTML documents (commonly found in CMS output):

- `xmlns="http://www.w3.org/1999/xhtml"` on `<html>`. The HTML parser ignores it — `<html>` is always in the HTML namespace regardless. Only the exact XHTML namespace value is removed, and only on the `<html>` tag; `xmlns` on `<svg>`, `<math>`, or any other value/element is left untouched.
- `xml:lang` when an identical (ASCII case-insensitive) `lang` attribute is present on the same element. If `lang` is absent or differs, `xml:lang` is left alone, since it may be the only language signal for XML tooling.

Attribute names are matched case-insensitively. Values are compared after decoding character references, without trimming whitespace. Namespace values are case-sensitive; language values use ASCII case-insensitive comparison. Case variants of duplicate attributes are preserved to avoid exposing a different value after removal. The module leaves documents processed with PostHTML's `xmlMode: true` untouched.

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
