### deduplicateAttributeValues
Remove duplicate values from list-like attributes (`class`, `rel`, `sandbox`, `dropzone`, `sizes` on `link`, `headers`).
For case-insensitive token lists (`rel`, `sandbox`, `dropzone`, `sizes`), duplicates are removed using ASCII case-insensitive comparison (first occurrence kept).
Character references are decoded for comparison, while the first occurrence's source spelling is preserved.
Whitespace is preserved where possible: repeated tokens are removed, but existing spacing between remaining tokens is kept.

Non-list-like attributes are not modified.
Repeated `ping` URLs are preserved because each occurrence triggers a separate request.

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
