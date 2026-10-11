### collapseAttributeWhitespace

Collapse redundant whitespace in attribute values where it is safe:

- List-like attributes are normalized by collapsing internal ASCII whitespace and trimming ends: `class` globally, `rel` on `<a>`, `<area>`, `<form>` and `<link>`, `ping` on `<a>` and `<area>`, `sandbox` on `<iframe>`, `headers` on `<td>` and `<th>`, and `sizes` on `<link>`. Legacy `dropzone` values are normalized except on custom elements.
- Single-value attributes have leading and trailing ASCII whitespace removed (for example `href`, `style`, `src`, `width`, `height`) when they are on the correct elements. Nonbreaking spaces and other significant characters are preserved.
- Known event handler attributes (like `onclick`) are trimmed only at the ends; inner whitespace is preserved. Unknown `on*` attributes are kept as data, and window event handlers such as `onmessage` are only trimmed on `<body>` and `<frameset>`.
- `srcset` (on `<img>` and `<source>`) and `imagesrcset` (on `<link>`) are re-serialized with a single whitespace between an URL and its descriptors, and without any whitespace after the commas separating the image candidates. A whitespace is kept after the comma when the preceding candidate has no descriptor, since the parser would otherwise read the comma and the next URL as a part of the URL. Malformed descriptors are retained so rejected candidates stay rejected. Values containing encoded character references, or with no candidates to tokenize, are left untouched.

`sizes` on `<img>` is not modified.
`usemap` is preserved because image-map references require an exact match. Whitespace-only
single-value attributes and padded `step="any"` keywords are preserved to avoid changing
browser behavior. For `style` values containing quotes or backslashes (including encoded
ones), only leading ASCII whitespace is removed; trailing whitespace might belong to
a CSS string or escape.

#### Example

Source:

```html
<a class=" content  page  " style="  display: block;    " href="   https://example.com"></a>
<img srcset="image.png   480w ,  image2.png 2x">
```

Minified:

```html
<a class="content page" style="display: block;" href="https://example.com"></a>
<img srcset="image.png 480w,image2.png 2x">
```
