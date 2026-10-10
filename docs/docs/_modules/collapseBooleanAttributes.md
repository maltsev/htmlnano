### collapseBooleanAttributes

- Collapses HTML boolean attributes (like `disabled`, `checked`, `readonly`) to the minimized form, regardless of their string value (for example `checked="false"` still becomes `checked`).
- Collapses attributes whose value is an empty string to the minimized form (for example `href=""` becomes `href`).
- Collapses [missing value default](https://html.spec.whatwg.org/#missing-value-default) attributes when they match the default, currently `audio[preload=auto]` and `video[preload=auto]`.
- Collapses `crossorigin="anonymous"` (case-insensitive) to `crossorigin`.
- Collapses `popover="auto"` (case-insensitive) to `popover`, since the empty string maps to the same state. `popover="manual"` and `popover="hint"` are left untouched.
- Collapses the declarative shadow DOM template booleans `shadowrootclonable`, `shadowrootdelegatesfocus`, and `shadowrootserializable` (but not the enumerated `shadowrootmode`).
- Leaves `hidden="until-found"` untouched (including case variants and character references), since it is a distinct state from the collapsed `hidden`. Surrounding whitespace makes this keyword invalid, selecting the ordinary hidden state.
- Preserves attribute values on custom elements, including A-Frame's
  `visible="false"` and attributes such as `enabled` or `disabled`. Global HTML
  states (`autofocus`, `hidden`, `inert`, `itemscope`, and `popover`) still
  collapse, as do AMP flags when `amphtml` is enabled.

#### Options
If your document uses [AMP](https://www.ampproject.org/), set the `amphtml` flag
to collapse additional, AMP-specific boolean attributes:
```json
"collapseBooleanAttributes": {
    "amphtml": true
}
```
When `amphtml` is enabled, AMP boolean attributes are collapsed when their
value is empty, `true`, or matches the attribute name.
Native `input[placeholder]` and `textarea[placeholder]` text and nonempty AMP
`lightbox` group names are preserved. Consent-policy values such as
`data-block-on-consent="_auto_reject"` are also preserved.

#### Side effects
This module could break your styles or JS if you use selectors with attributes:
```CSS
button[disabled="disabled"] {
    color: red;
}
```

#### Example
Source:
```html
<button disabled="disabled">click</button>
<script defer=""></script>
<a href=""></a>
<script src="example-framework.js" crossorigin="anonymous"></script>
<video preload="auto"></video>
<a-entity visible="false"></a-entity>
```

Minified:
```html
<button disabled>click</button>
<script defer></script>
<a href></a>
<script src="example-framework.js" crossorigin></script>
<video preload></video>
<a-entity visible="false"></a-entity>
```
