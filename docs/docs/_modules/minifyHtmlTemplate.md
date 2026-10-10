### minifyHtmlTemplate
Minifies HTML inside template containers (for example `<script type="text/x-handlebars-template">` or `<template>`).
It runs htmlnano on the inner HTML using the current minification and PostHTML parsing/rendering options.

#### Options
`minifyHtmlTemplate: true` enables the default template rules.

You can pass an array of object rules:
```js
htmlnano.process(html, {
    minifyHtmlTemplate: [
        { tag: 'template', attrs: { id: 'my-template' } },
        { tag: 'script', attrs: { type: 'text/x-handlebars-template' } },
    ]
});
```

Passing any array replaces the built-in rules. To keep defaults and add more, spread them in:
```js
import { modules } from 'htmlnano';

htmlnano.process(html, {
    minifyHtmlTemplate: [
        ...modules.minifyHtmlTemplate.defaultRules,
        { tag: 'script', attrs: { id: 'my-template' } }
    ]
});
```

#### Notes
- The built-in rules include common script template MIME types and the `<template>` tag.
- Rules are objects: `{ tag, attrs? }`.
- Attribute name matching is case-insensitive. For `type`, matching ignores MIME parameters and casing.
- Any tag with an `integrity` attribute is skipped, and `<script src="...">` is not processed.
- Text-only template content is preserved if minification would introduce a closing container tag. Script templates also preserve content that would introduce a double-escaped script sequence.
- Apparent templates inside text-only elements (such as `<textarea>`) or after `<plaintext>` are not processed. Nested templates are left to the inner run, where `minifyHtmlTemplate` is disabled.
- The actual changes depend on the enabled modules (for example `collapseWhitespace`).

#### Example
Source:
```html
<script type="text/x-handlebars-template">
    <div class="entry">
        <h1>{{title}}</h1>
    </div>
</script>
```

Minified:
```html
<script type="text/x-handlebars-template"><div class="entry"><h1>{{title}}</h1></div></script>
```
