import { init, initWithPostHtmlOptions } from '../htmlnano.ts';
import safePreset from '../../dist/presets/safe.mjs';
import maxPreset from '../../dist/presets/max.mjs';

describe('minifyCharacterReferences', () => {
    const options = {
        minifyCharacterReferences: safePreset.minifyCharacterReferences
    };

    const maxOptions = {
        minifyCharacterReferences: maxPreset.minifyCharacterReferences
    };

    it('should decode named references in text', () => {
        return init(
            '<p>&mdash;&hellip;&copy;&nbsp;end</p>',
            '<p>—…© end</p>',
            options
        );
    });

    it('should decode decimal numeric references in text', () => {
        return init(
            '<p>&#8212;&#169;</p>',
            '<p>—©</p>',
            options
        );
    });

    it('should decode hexadecimal numeric references in text', () => {
        return init(
            '<p>&#x2014;&#X2026;</p>',
            '<p>—…</p>',
            options
        );
    });

    it('should decode references in attribute values', () => {
        return init(
            '<a title="a&mdash;b&#8212;c&#x2014;d">x</a>',
            '<a title="a—b—c—d">x</a>',
            options
        );
    });

    it('should decode &gt; and &quot; but NOT &lt; in text', () => {
        return init(
            '<p>a &gt; b &quot;c&quot;, &apos;d&apos; &lt; e</p>',
            '<p>a > b "c", \'d\' &lt; e</p>',
            options
        );
    });

    it('should NOT decode numeric references that map to "<" in text', () => {
        return init(
            '<p>&#60;&#x3C;</p>',
            '<p>&#60;&#x3C;</p>',
            options
        );
    });

    it('should decode &lt; and &gt; in attribute values', () => {
        return init(
            '<a title="a&lt;b&gt;c">x</a>',
            '<a title="a<b>c">x</a>',
            options
        );
    });

    it('should decode apostrophe references but NOT &quot; in attribute values', () => {
        return init(
            '<a title="&#39;&apos;&#x27;&quot;&#34;">x</a>',
            '<a title="\'\'\'&quot;&#34;">x</a>',
            options
        );
    });

    it('should decode &amp; in URL query strings', () => {
        return init(
            '<a href="/search?q=1&amp;page=2&amp;sort=asc">x</a>',
            '<a href="/search?q=1&page=2&sort=asc">x</a>',
            options
        );
    });

    it('should NOT decode &amp; into an ambiguous ampersand', () => {
        return init(
            '<p>&amp;copy; &amp;copy &amp;#169; &amp;amp;</p>',
            '<p>&amp;copy; &amp;copy &amp;#169; &amp;amp;</p>',
            options
        );
    });

    it('should follow the attribute rule for semicolon-less references', () => {
        // "&copy=" is a character reference in text, but not in an attribute value
        return init(
            '<a href="?x&amp;copy=1" title="x&amp;copy=1">a&amp;copy=1</a>',
            '<a href="?x&copy=1" title="x&copy=1">a&amp;copy=1</a>',
            options
        );
    });

    it('should keep &amp; at the end of a text node, but decode it in an attribute value', () => {
        return init(
            '<a title="a&amp;">b&amp;</a>',
            '<a title="a&">b&amp;</a>',
            options
        );
    });

    it('should keep the whole string when a decoded "&" would combine with a neighbour', () => {
        // "&amp;no" is unambiguous on its own, but "&#116;" decodes into "t",
        // which would turn the result into "&not;"
        return init(
            '<p>&amp;no&#116;;</p>',
            '<p>&amp;no&#116;;</p>',
            options
        );
    });

    it('should keep double-encoded references intact ("&amp;mdash;" stays)', () => {
        return init(
            '<p>&amp;mdash;</p>',
            '<p>&amp;mdash;</p>',
            options
        );
    });

    it('should not touch <script> content', () => {
        return init(
            '<script>var a = "&mdash;&copy;";</script>',
            '<script>var a = "&mdash;&copy;";</script>',
            options
        );
    });

    it('should not touch <style> content', () => {
        return init(
            '<style>a::after{content:"&mdash;"}</style>',
            '<style>a::after{content:"&mdash;"}</style>',
            options
        );
    });

    it('should not touch <textarea> content', () => {
        return init(
            '<textarea>&mdash;&copy;</textarea>',
            '<textarea>&mdash;&copy;</textarea>',
            options
        );
    });

    it('should leave unknown named references untouched', () => {
        return init(
            '<p>&fake;&notanentity;</p>',
            '<p>&fake;&notanentity;</p>',
            options
        );
    });

    it('should leave references without a trailing semicolon untouched', () => {
        return init(
            '<p>&mdash &copy</p>',
            '<p>&mdash &copy</p>',
            options
        );
    });

    it('should leave out-of-range / control numeric references untouched', () => {
        return init(
            '<p>&#0;&#1;&#x7F;&#xD800;&#x110000;</p>',
            '<p>&#0;&#1;&#x7F;&#xD800;&#x110000;</p>',
            options
        );
    });

    it('should keep apostrophe references in JSON-ish attribute values', () => {
        // posthtml-render renders JSON-ish attribute values single-quoted
        return init(
            '<div data-config="{&quot;a&quot;:&#39;b&#39;}">x</div>',
            '<div data-config=\'{"a":&#39;b&#39;}\'>x</div>',
            options
        );
    });

    it('should keep apostrophe references when attributes are single-quoted', () => {
        return initWithPostHtmlOptions(
            '<a title="it&#39;s &mdash; here">x</a>',
            '<a title=\'it&#39;s — here\'>x</a>',
            options,
            { quoteStyle: 1 }
        );
    });

    it('should keep values with "\'", "<" and ">" quoted for removeAttributeQuotes', () => {
        return init(
            '<a title="it&#39;s" data-a="a&lt;b" data-b="a&gt;b" href="/a&amp;b">x</a>',
            '<a title="it\'s" data-a="a<b" data-b="a>b" href=/a&b>x</a>',
            { ...options, removeAttributeQuotes: true }
        );
    });

    it('should be idempotent', () => {
        const source = '<p title="&mdash;">&hellip;&amp;x&copy;&#8212;</p>';
        const expected = '<p title="—">…&x©—</p>';
        return init(source, expected, options).then(() =>
            init(expected, expected, options)
        );
    });

    it('should not decode unknown named references even with decodeAll', () => {
        return init(
            '<p>&fake;&notanentity;</p>',
            '<p>&fake;&notanentity;</p>',
            maxOptions
        );
    });

    it('should decode the full named reference table with decodeAll', () => {
        return init(
            '<p>&hearts;&NestedGreaterGreater;&Aring;&Longleftrightarrow;</p>',
            '<p>♥≫Å⟺</p>',
            maxOptions
        );
    });

    it('should not decode the full table without decodeAll', () => {
        return init(
            '<p>&hearts;&Aring;</p>',
            '<p>&hearts;&Aring;</p>',
            options
        );
    });

    it('should still protect syntax characters with decodeAll', () => {
        return init(
            '<a title="&amp;quot;&quot;">&lt;&amp;lt;</a>',
            '<a title="&amp;quot;&quot;">&lt;&amp;lt;</a>',
            maxOptions
        );
    });
});
