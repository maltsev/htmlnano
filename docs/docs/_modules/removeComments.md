### removeComments
#### Options
- `safe` – removes HTML comments but keeps:
  - conditional comments (`<!--[if ...]>...<![endif]-->` and downlevel-revealed forms)
  - `<!--noindex-->...<!--/noindex-->` (case/spacing tolerant)
  - `<!--sse-->...<!--/sse-->` Server-Side Excludes markers (case/spacing tolerant)
  - excerpt markers that start with `more` (case/spacing tolerant), e.g. `<!-- more -->`, `<!-- MORE -->`, `<!-- more Read more -->`
  - license comments `<!--! ... -->` (the HTML analogue of the `/*! ... */` comments kept by Terser/cssnano)
  (default)
- `all` — removes all HTML comments, including conditional/noindex/sse/excerpt comments
- A `RegExp` — removes HTML comments that match the regexp (non-matching comments are kept)
- A string — treated as a regexp pattern. Supports `/pattern/flags` or a plain pattern string (useful in JSON config files)
- A `Function` that returns boolean — removes HTML comments for which the callback returns a truthy value

Regexp matching starts at the beginning of each comment, including with `g` or `y`
flags. The supplied regexp's `lastIndex` is left unchanged.

Only HTML comments are removed. Comment-looking text inside `script`, `style`,
`textarea`, `title`, `xmp`, `iframe`, `noembed`, `noframes`, and `noscript`, and
everything after `plaintext`, is kept. When removing a comment would join text
into HTML markup or change a character reference, the text boundary is escaped
to preserve its meaning.

**Security warning: the `removeComments` option must come from a source you trust.**
A string option is compiled into a `RegExp` and then tested against every comment, so a
pattern crafted to backtrack catastrophically turns comment-heavy input into a hang
(ReDoS). A function option is called for every comment, so it runs arbitrary code by
definition. Both are fine for options you write yourself — that is what the API is for —
but don't build the option out of user input, and keep in mind that a
[config file discovered on the filesystem](./config#security-note-config-auto-discovery-runs-code)
counts as developer input too. The HTML being minified never influences which pattern is
compiled, only how often it is run.

#### Example

Source:

```js
{
    removeComments: 'all'
}
```

```html
<div><!-- test --></div>
```

Minified:

```html
<div></div>
```

Source:

```js
{
    removeComments: 'safe'
}
```

```html
<!--noindex-->indexed?<!--/noindex-->
<!--[if IE 8]><link href="ie8only.css" rel="stylesheet"><![endif]-->
Lorem ipsum <!-- more --> dolor sit amet <!-- comment -->
```

Minified:

```html
<!--noindex-->indexed?<!--/noindex-->
<!--[if IE 8]><link href="ie8only.css" rel="stylesheet"><![endif]-->
Lorem ipsum <!-- more --> dolor sit amet
```

Source:

```js
{
    removeComments: /<!--(\/)?noindex-->/
}
```

```html
<div><!--noindex-->this text will not be indexed<!--/noindex-->Lorem ipsum dolor sit amet<!--more-->Lorem ipsum dolor sit amet</div>
```

Minified:

```html
<div>this text will not be indexedLorem ipsum dolor sit amet<!--more-->Lorem ipsum dolor sit amet</div>
```

Source (JSON config):

```json
{
    "removeComments": "/<!--(\\/)?noindex-->/"
}
```

Source:

```js
{
    removeComments: (comment) => {
        if (comment.includes('noindex')) return true;
        return false;
    }
}
```

```html
<div><!--noindex-->this text will not be indexed<!--/noindex-->Lorem ipsum dolor sit amet<!--more-->Lorem ipsum dolor sit amet</div>
```

Minified:

```html
<div>this text will not be indexedLorem ipsum dolor sit amet<!--more-->Lorem ipsum dolor sit amet</div>
```
