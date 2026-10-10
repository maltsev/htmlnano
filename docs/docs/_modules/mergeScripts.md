### mergeScripts
Merge adjacent sibling inline `<script>` tags, separated only by whitespace, when they share the same normalized attributes (all except `src`, `integrity`, and `type`).
The merged content is appended into the last script in the group and the earlier scripts are removed.

#### Notes
- Only inline scripts with mergeable types are considered: `text/javascript` and `application/javascript` (default is `text/javascript`). Other types (including `type="module"`) are left untouched.
- Scripts with `src` or `integrity`, scripts with different attributes or types, and intervening markup break a merge group, so code on each side stays separate. Groups never cross parent boundaries.
- Scripts inside `<noscript>`, `<template>`, `<svg>`, or `<math>` are left untouched. These elements also break the surrounding merge group.
- Boolean attributes (`async`, `defer`, `nomodule`) are normalized and treated as present, so `defer` and `defer="defer"` match.
- Tag and attribute names are compared without ASCII case distinctions, and attribute character references are decoded for comparison. The first attribute wins when names are duplicated with different casing. Script type detection follows the [HTML rules for `type` and legacy `language`](https://html.spec.whatwg.org/multipage/scripting.html#prepare-the-script-element).
- Scripts are separated by `nonce` value, by `nomodule`, and by `async`/`defer` differences.
- Concatenated scripts are separated by `\n;\n` to preserve line comments and prevent expressions from joining across script boundaries.
- Scripts containing a quoted `use strict`, a leading hashbang, or HTML tokenizer markers (`<!--` or `<script`/`</script`) are conservatively left untouched and break a merge group. This preserves strict mode and avoids changes to [HTML script parsing](https://html.spec.whatwg.org/multipage/scripting.html#restrictions-for-contents-of-script-elements) without parsing JavaScript.

#### Side effects
Merging changes where the code physically lives in the document.
Code must tolerate sharing a script: merging can change declaration hoisting, lexical bindings, and error isolation. Code that inspects `document.currentScript`, uses `document.write()`, or depends on individual script elements can also behave differently. Generate CSP hashes after minification, since merging changes script text. This module is disabled in the safe preset.

#### Example
Source:
```html
<script>window.foo = 1;</script>
<script type="text/javascript">window.bar = 2;</script>
<script defer>window.baz = 3;</script>
<script defer="defer">window.qux = 4;</script>
```

Minified:
```html
<script type="text/javascript">window.foo = 1;
;
window.bar = 2;</script>
<script defer="defer">window.baz = 3;
;
window.qux = 4;</script>
```
