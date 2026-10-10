### removeUnusedCss

Removes unused CSS inside `<style>` tags with either [uncss](https://github.com/uncss/uncss) or [PurgeCSS](https://github.com/FullHuman/purgecss).
PurgeCSS is the default and only extracts selectors from the HTML as strings.

**Security warning:** the `tool: 'uncss'` option renders the HTML you are minifying in a real DOM ([jsdom](https://github.com/jsdom/jsdom)) **with script execution enabled**, which means any `<script>` in that HTML runs inside your build process.
uncss is also abandoned, and installing it pulls a chain of known-vulnerable dependencies into your project.
Never use `tool: 'uncss'` on HTML you don't fully trust — see [With uncss](#with-uncss) below.

#### With PurgeCSS (recommended)

Use PurgeCSS instead of uncss by adding `tool: 'purgeCSS'` to the options.

You have to install `purgecss` in order to use this feature:

```bash
npm install --save-dev purgecss
# if you prefer yarn
# yarn add --dev purgecss
# if you prefer pnpm
# pnpm install --save-dev purgecss
```

##### Options

See [the documentation of PurgeCSS](https://purgecss.com) for all supported options.

PurgeCSS options can be passed directly to the `removeUnusedCss` module:

```js
htmlnano.process(html, {
    removeUnusedCss: {
        tool: 'purgeCSS',
        safelist: ['.do-not-remove']
    }
});
```

The following PurgeCSS options are ignored if passed to the module:

- `content`
- `css`
- `extractors`

#### With uncss

**Security warning: uncss executes the scripts of the HTML you are minifying.**

To find out which selectors are used, uncss loads the HTML into [jsdom](https://github.com/jsdom/jsdom) with `runScripts: 'dangerously'` and script fetching enabled.
uncss offers no option to turn that off, so with `tool: 'uncss'` the HTML passed to htmlnano is not just parsed, it is *executed*:

- **Arbitrary code execution:** every inline `<script>` in the HTML runs in the build process, with the privileges of whoever runs the build.
- **Local file read:** `<script src="/absolute/path">` is read from your filesystem (relative to the `htmlroot` option) and executed, so the script can read local files and leak them.
- **Outbound network requests:** other `<script src="...">` URLs and other external resources are fetched over the network (SSRF).

Only use `tool: 'uncss'` on HTML that you fully control and trust, in an environment where running that HTML's scripts is acceptable.
For anything else — user-supplied HTML, templates rendering untrusted content, HTML from third-party packages — use `tool: 'purgeCSS'` (the default), which only extracts selectors from the HTML as strings and never builds a DOM or runs JavaScript.

htmlnano prints this warning once per process when `tool: 'uncss'` is used; set [`skipInternalWarnings: true`](./config#optional-dependency-warnings) to silence it.

**Security warning: uncss is abandoned and depends on packages with known vulnerabilities.**

The last uncss release, 0.17.3, is from February 2020, and the project isn't maintained anymore.
Its dependencies are therefore pinned to versions with published advisories that will never be fixed upstream:

- [jsdom](https://github.com/jsdom/jsdom) 14 depends on `request`, which is itself deprecated and unmaintained, and drags in `form-data` (**critical**: unsafe random function for the multipart boundary, CRLF injection via unescaped field names), `tough-cookie` < 4.1.3 (prototype pollution), `qs` (denial of service) and `uuid` (missing buffer bounds check).
- `postcss` 7 (**high**: XSS via an unescaped `</style>` in the stringifier, and arbitrary `.map` file read through an attacker-controlled `sourceMappingURL`).

So installing `uncss` adds all of those to your dependency tree, and `npm audit` will report them.
`tool: 'purgeCSS'` (the default) depends on none of this; uncss is still supported only for backwards compatibility.

You have to install `uncss` in order to use this feature (please read the warnings above first):

```bash
npm install --save-dev uncss
# if you prefer yarn
# yarn add --dev uncss
# if you prefer pnpm
# pnpm install --save-dev uncss
```

##### Options

See [the documentation of uncss](https://github.com/uncss/uncss) for all supported options.

uncss options can be passed directly to the `removeUnusedCss` module:

```js
htmlnano.process(html, {
    removeUnusedCss: {
        tool: 'uncss',
        ignore: ['.do-not-remove']
    }
});
```

The following uncss options are ignored if passed to the module:

- `stylesheets`
- `ignoreSheets`
- `raw`

#### Notes

- Only `<style>` tags with a CSS type (`text/css` or no `type` attribute) are processed. Other style types are left untouched.
- CDATA wrappers in `<style>` tags are preserved after removing unused rules.
- Empty styles are removed entirely when all rules are stripped.
- AMP boilerplate styles (`amp-boilerplate`, `amp4ads-boilerplate`, `amp4email-boilerplate`) are not touched.
- PurgeCSS reads decoded class names and IDs from the HTML. Attribute selectors are retained whenever their attribute is present, regardless of its value, to preserve case-insensitive matches.
- PurgeCSS keeps tag selectors based on the HTML (for example `section {}`), including omitted document elements. Classes are split on ASCII whitespace; IDs are kept as complete values.
- PurgeCSS's optional `keyframes`, `fontFace`, and `variables` cleanup is disabled when there are multiple CSS style blocks or nonempty inline styles, because definitions can be used outside the block being processed. Unused selectors are still removed.

#### Example

Source:

```html
<div class="b">
    <style>
        .a {
            margin: 10px 10px 10px 10px;
        }
        .b {
            color: #ff0000;
        }
    </style>
</div>
```

Optimized:

```html
<div class="b">
    <style>
        .b {
            color: #ff0000;
        }
    </style>
</div>
```
