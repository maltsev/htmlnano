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
Values with conflicting `dropzone` operations (`copy`, `move`, `link`) are left unchanged because the first operation takes precedence.

#### Example

##### alphabetical

Source:

```html
<div class="foo baz bar">click</div>
```

Processed:

```html
<div class="bar baz foo">click</div>
```

##### frequency

Source:

```html
<div class="foo baz bar"></div><div class="bar foo"></div>
```

Processed:

```html
<div class="foo bar baz"></div><div class="foo bar"></div>
```
