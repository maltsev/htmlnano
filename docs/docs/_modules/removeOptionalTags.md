### removeOptionalTags
Remove certain tags that can be omitted, see [HTML Standard - 13.1.2.4 Optional tags](https://html.spec.whatwg.org/multipage/syntax.html#optional-tags).

The `safe` preset enables this module as `{ removeStartTags: false }`, and
`ampSafe` inherits that setting: both retain explicit start tags and remove only
eligible end tags. The `max` preset enables the module as `true` and removes
eligible start tags too.

Set the module to `true` (or `{ removeStartTags: true }`) to remove eligible
start-and-end-tag pairs as well as eligible end tags. Use
`{ removeStartTags: false }` to retain every explicit start tag while still
removing end tags that can be omitted safely. Set it to `false` to disable all
optional-tag removal.

#### Notes
- Attributes only block the start tag of the element that carries them:
  `<li class="x">…</li>` keeps its start tag but still loses `</li>`, and a
  `<html class="no-js">` still gets its `</html>` and the optional tags of
  everything inside it removed. An element whose start tag can be omitted must
  have no attributes at all.
- htmlnano can omit an end tag on its own, and it can omit a start and an end
  tag together, but it can’t omit *only* a start tag — posthtml-render has no way
  to express that, see [issue #99](https://github.com/maltsev/htmlnano/issues/99).
  When only the start tag is omissible, both tags are kept.
- Whitespace and comments between two elements count as content, so they block
  the omissions that require one element to *immediately* follow another. Run
  this module together with `collapseWhitespace: 'all'` (as the `max` preset
  does) to get the most out of it.
- The module runs after every other module, on the final tree.
- Nodes that another posthtml plugin left without a tag (posthtml-include builds
  those to splice a file in) render as their content only, and the elements
  inside them are minified as well.

##### Optional start tags

- `html` — Can be omitted when the first child is not a comment.
- `head` — Can be omitted when the element is empty or the first child is an element.
- `body` — Can be omitted when the element is empty or the first child is not ASCII whitespace or a comment. Can’t be omitted if the first child element is `meta`, `link`, `script`, `style`, or `template`.
- `colgroup` — Can be omitted when the first child element is `col`, and the element is not immediately preceded by another `colgroup` whose end tag was omitted.
- `tbody` — Can be omitted when the first child element is `tr`, and the element is not immediately preceded by a `tbody`, `thead`, or `tfoot` whose end tag was omitted.

##### Optional end tags

- `html`, `body` — when not immediately followed by a comment.
- `head`, `caption`, `colgroup` — when not immediately followed by ASCII whitespace or a comment.
- `li` — when immediately followed by another `li`, or last in its list.
- `dt` — when immediately followed by a `dt` or `dd`.
- `dd` — when immediately followed by a `dd` or `dt`, or last in its list.
- `p` — when immediately followed by one of `address`, `article`, `aside`,
  `blockquote`, `details`, `div`, `dl`, `fieldset`, `figcaption`, `figure`,
  `footer`, `form`, `h1`–`h6`, `header`, `hgroup`, `hr`, `main`, `menu`, `nav`,
  `ol`, `p`, `pre`, `section`, `ul`, or when it is the last child of a parent
  that closes it.
- `rt`, `rp` — when immediately followed by an `rt` or `rp`, or last in the `ruby`.
- `optgroup` — when immediately followed by another `optgroup`, or last in the `select`.
- `option` — when immediately followed by an `option` or `optgroup`, or last in its parent.
- `thead` — when immediately followed by a `tbody` or `tfoot`.
- `tbody` — when immediately followed by a `tbody` or `tfoot`, or last in the `table`.
- `tfoot` — when last in the `table`.
- `tr` — when immediately followed by another `tr`, or last in its table section.
- `td`, `th` — when immediately followed by a `td` or `th`, or last in the `tr`.

#### Notes on correctness

htmlnano is stricter than the specification in a few places, because the
specification’s wording assumes markup that already follows the content model:

- The “no more content in the parent element” rules are only applied when the
  parent is one the element is actually allowed to live in (`li` in a `ul`, `td`
  in a `tr`, …). In `<span><p>x</p></span>` the parser does not close the `p` on
  `</span>`, so `</p>` is kept.
- `</p>` before a `<table>` is only omitted in a document with an
  `<!doctype html>`: in quirks mode a `<table>` start tag does not close an open
  `p`.
- End tags are never omitted inside `<svg>` and `<math>`, where the parser
  requires every element to be closed explicitly.
- Ruby annotation end tags are omitted only under an explicit `<ruby>`, and
  `</optgroup>` only under an explicit `<select>`. Elsewhere, including fragments
  whose context is unknown, a following sibling can become nested instead.

#### Example

Source:

```html
<html><head><title>Title</title></head><body><ul><li>One</li><li>Two</li></ul></body></html>
```

Minified by the default `safe` preset:

```html
<html><head><title>Title</title><body><ul><li>One<li>Two</ul>
```

Minified by the `max` preset:

```html
<title>Title</title><ul><li>One<li>Two</ul>
```
