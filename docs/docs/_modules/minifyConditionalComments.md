### minifyConditionalComments
Minifies HTML inside IE conditional comments (both downlevel-hidden and downlevel-revealed forms).
The conditional comment wrappers are preserved while the inner HTML is processed with the same htmlnano options,
so other modules (like `collapseWhitespace`, `minifyCss`, or `minifyJs`) can apply within the conditional block.

This module is disabled in the `safe` and `ampSafe` presets. On the evaluated
pages it changed very little output while adding another recursive htmlnano
pass, so it remains an opt-in there. The `max` preset enables it.

#### Notes
- Empty conditional comments and standalone `<!--<![endif]-->` markers are left untouched.
- Hidden blocks are left untouched if minification would introduce `-->` or `--!>`
  inside them, preventing hidden markup from becoming active in other browsers.
- Comment-like text inside raw-text and RCDATA elements (such as `script`, `style`,
  `textarea`, and `title`), or after `plaintext`, is not processed as conditional HTML.
- Blocks containing nested conditional wrappers are preserved rather than reparsed,
  including nested downlevel-revealed `<![if ...]>` conditions.
- If the comment content includes an opening `<html>` without a closing tag, any auto-inserted
  `</html>` from the internal parse step is removed so it is not injected into the conditional block.

#### Example
Source:

```html
<!--[if lte IE 7]>
    <style type="text/css">
        .title {
            color: red;
        }
    </style>
<![endif]-->
```

Minified with `minifyConditionalComments: true`:

```html
<!--[if lte IE 7]><style type="text/css">.title{color:red}</style><![endif]-->
```
