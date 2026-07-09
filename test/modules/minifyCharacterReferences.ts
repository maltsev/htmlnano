import { init } from '../htmlnano.ts';
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

    it('should NOT decode &amp; / &lt; / &gt; in text', () => {
        return init(
            '<p>&amp;&lt;&gt;</p>',
            '<p>&amp;&lt;&gt;</p>',
            options
        );
    });

    it('should NOT decode numeric references that map to syntax characters', () => {
        return init(
            '<p>&#38;&#60;&#62;</p>',
            '<p>&#38;&#60;&#62;</p>',
            options
        );
    });

    it('should NOT decode &amp; or quote references in attribute values', () => {
        return init(
            '<a title="&amp;&quot;&#34;&#39;&apos;">x</a>',
            '<a title="&amp;&quot;&#34;&#39;&apos;">x</a>',
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

    it('should be idempotent', () => {
        const source = '<p title="&mdash;">&hellip;&amp;&copy;&#8212;</p>';
        const expected = '<p title="—">…&amp;©—</p>';
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

    it('should decode known named references with decodeAll', () => {
        return init(
            '<p>&mdash;&copy;&#8212;</p>',
            '<p>—©—</p>',
            maxOptions
        );
    });

    it('should still protect syntax characters with decodeAll', () => {
        return init(
            '<a title="&amp;&quot;">&lt;&gt;</a>',
            '<a title="&amp;&quot;">&lt;&gt;</a>',
            maxOptions
        );
    });
});
