### removeEmptyAttributes

Removes empty attributes when it is safe, based on the tag and attribute name.
The removal rules are a fixed [allowlist](https://github.com/maltsev/htmlnano/blob/master/src/_modules/removeEmptyAttributes.ts) in the module.

#### Notes

- Allowlisted attributes are removed when empty. Whitespace-only values are also removed for token lists, styles and numeric attributes, using HTML's ASCII whitespace rules. Meaningful whitespace in text, identifiers and URLs is preserved.
- Known event handler attributes (for example `onclick`, `onfocus`) are removed when empty or whitespace-only. Unknown `on*` attributes are preserved, and window handlers such as `onmessage` are only removed on `<body>` and `<frameset>`.
- Some attributes are only removed on specific tags, such as `cols` on `<textarea>` or `minlength`/`maxlength` on `<input>` and `<textarea>`.
- Empty attributes with distinct browser behavior are preserved, including `alt`, `title`, `lang`, `form`, `formaction`, `headers`, `pattern`, checkbox/radio/submit/reset input `value`, resource `src`/`href`, and `<meta charset>`.
- Empty `dir` is preserved on `<bdi>`, where removing it enables automatic direction detection.
- Whitespace-only script/style `type` values are preserved because removing them can enable execution or styling. Empty script `type` is also preserved when a legacy `language` attribute is present. Resource MIME types on `<link>`, `<source>`, `<embed>` and `<object>` are preserved.

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
<div title=""></div>
<button></button>
<textarea></textarea>
<img src="foo.jpg" alt="">
```
