### removeEmptyElements

Removes elements that have no meaningful content.

#### Options

- `true` — removes empty elements without attributes.
- `{ removeWithAttributes: 'presentational' }` — also removes empty elements whose
  attributes are all *presentational*: `class`, `style` and `aria-hidden`.
  Used by the `max` preset.
- `{ removeWithAttributes: ['data-decoration', 'class'] }` — same as `'presentational'`,
  but with your own list of attributes that don't prevent the removal.
- `{ removeWithAttributes: true }` — removes empty elements no matter what they carry.

Empty elements are defined as elements with no child elements and no text content;
ordinary comments do not count as content, but IE conditional comments do.
Whitespace is text content and is preserved because it can separate inline content or be significant in preformatted text.
Text joined across a removed element is escaped when necessary to avoid creating
new markup or changing a character reference.
Comment-looking content in text-only elements such as `script`, `style`, `title`
and `textarea` is literal text. Their contents are preserved, as are those of
`noscript` (which is text with scripting enabled), SVG and MathML subtrees, and
everything from a `plaintext` start tag to the end of the document.
Void elements (like `<img>` or `<br>`) are never removed, and neither are elements that
keep doing their job while empty, whatever `removeWithAttributes` says:

- `td`, `th`, `tr`, `caption`, `colgroup` — they hold a position in the table grid.
  Dropping an empty cell shifts every following cell of the row into the wrong column.
- `textarea`, `select`, `option` — form controls that are submitted and scripted while
  empty; an empty `<textarea>` is simply one the user hasn't typed into yet.
- `canvas`, `iframe`, `audio`, `video`, `object`, `slot` — they are painted or filled by something
  other than their own markup: scripts, a nested document, the resource of their `src`,
  or the light DOM projected into them.
- `script` with a `src` attribute — it executes an external resource even without
  inline content.

##### The `'presentational'` mode

An element is removed only when every attribute it has is in the list, so anything
that gives the element a meaning beyond its looks keeps it: `id`, `name`, `role`,
`aria-*` (except `aria-hidden`), `data-*`, event handlers, `href`, `src`, `title`,
framework attributes like `x-data` or `hx-get`, and the geometry attributes of SVG
shapes (`<path d="…">` is empty markup-wise, but it is the drawing).
`aria-hidden` is in the list because an element that is hidden from the accessibility
tree contributes nothing to it once it's empty.

On top of the elements that are never removed, this mode also keeps custom elements —
any tag with a dash in it, like `<my-widget class="widget"></my-widget>`, which builds
its own content once the element definition is upgraded — and the interactive elements
`a`, `button`, `details`, `label` and `summary`, whose icon is often drawn by CSS while
a script binds the behaviour through the very class that would allow the removal
(`<button class="hamburger-menu"></button>`). Note that `removeWithAttributes: true`
doesn't make either exception: it removes every empty element except the ones listed
above.

#### Side effects

This module removes elements that are used for styling or scripting, so it's disabled
in the `safe` preset.

`removeWithAttributes: 'presentational'` is **lossy on purpose**: it drops empty
elements that are only there to be *seen* — carousel dots, skeleton loaders, spinner
bars, gradient overlays, spacers. If your page relies on those, the rendering will
change. The removal is safe for the meaning and the accessibility of the page, but
`class` is a behaviour hook as much as a styling one: a script that looks an element
up by class (`document.querySelector('.spinner')`) will no longer find it. Interactive
elements are kept for exactly that reason, and you can use `removeEmptyElements: true`
(or a narrower `removeWithAttributes` list) if you want the rest of the decorations
back.

#### Example

Source:

```html
<div>hello<span><b></b></span></div>
<div><span class="icon"></span>Download</div>
<div><span id="anchor"></span><my-widget class="widget"></my-widget>Widget</div>
```

Minified (`removeEmptyElements: true`):

```html
<div>hello</div>
<div><span class="icon"></span>Download</div>
<div><span id="anchor"></span><my-widget class="widget"></my-widget>Widget</div>
```

Minified (`removeEmptyElements: { removeWithAttributes: 'presentational' }`):

```html
<div>hello</div>
<div>Download</div>
<div><span id="anchor"></span><my-widget class="widget"></my-widget>Widget</div>
```

Minified (`removeEmptyElements: { removeWithAttributes: true }`):

```html
<div>hello</div>
<div>Download</div>
<div>Widget</div>
```
