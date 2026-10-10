### minifyJson
Minifies JSON inside `<script>` tags whose `type` ends in `/json` or `+json` (case-insensitive), including when MIME parameters are present.

#### Notes
- Only `<script>` tags with an explicit JSON MIME type are processed. Tags without a `type` attribute are left untouched.
- MIME parameters are allowed (`application/json; charset=utf-8`) and casing is ignored.
- Tags with `integrity` are skipped to preserve SRI safety.
- Invalid JSON is left unchanged.
- Number literals, duplicate keys and member order are preserved; whitespace outside strings and unnecessary string escapes are removed.
- Less-than signs in JSON strings are escaped as `\u003C` to prevent the payload from closing the script or changing HTML parsing.
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
