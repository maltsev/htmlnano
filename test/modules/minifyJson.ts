import { expect } from 'expect';
import { parseFragment } from 'parse5';
import { init } from '../htmlnano.ts';
import { process as processHtml } from '../../dist/index.mjs';
import safePreset from '../../dist/presets/safe.mjs';
import type { HtmlnanoOptions } from '../../dist/index.mjs';

describe('minifyJson', () => {
    const options = {
        minifyJson: safePreset.minifyJson
    };

    it('should minify JSON inside <script> tags with JSON mime type', () => {
        return init(
            `<script type="application/json">
                {
                    "test": 5
                }
             </script>
             <script type="application/ld+json">
                {
                    "test": 6
                }
             </script>`,

            `<script type="application/json">{"test":5}</script>
             <script type="application/ld+json">{"test":6}</script>`,
            options
        );
    });

    it('should minify JSON with mime parameters', () => {
        return init(
            `<script type="application/json; charset=utf-8">
                {
                    "test": 7
                }
             </script>`,

            '<script type="application/json; charset=utf-8">{"test":7}</script>',
            options
        );
    });

    it('should minify JSON with mixed case +json mime type', () => {
        return init(
            `<script type="Application/LD+JSON; charset=UTF-8">
                {
                    "test": 8
                }
             </script>`,

            '<script type="Application/LD+JSON; charset=UTF-8">{"test":8}</script>',
            options
        );
    });

    it('should recognize uppercase script tags and attribute names', () => {
        return init(
            '<SCRIPT TYPE="application/json"> { "test": 5 } </SCRIPT>',
            '<SCRIPT type="application/json">{"test":5}</SCRIPT>',
            options
        );
    });

    it('should leave non-script elements with JSON MIME types untouched', () => {
        const html = '<div type="application/json"> { "text": "hello world" } </div>'
            + '<textarea type="application/ld+json"> { "text": "&lt;" } </textarea>';
        return init(html, html, options);
    });

    it('should skip JSON inside <script> tags with SRI', () => {
        const fixtures = `<script type="application/json" integrity="example">
                {
                    "test": 5
                }
             </script>
             <script type="application/ld+json" integrity="example">
                {
                    "test": 6
                }
             </script>`;

        return init(
            fixtures,
            fixtures,
            options
        );
    });

    it('should skip <script> tags with non-JSON mime type', () => {
        return init(
            '<script>{"test": 5}</script>',
            '<script>{"test": 5}</script>',
            options
        );
    });

    it('should skip <script> tags with JSON-like mime type suffixes', () => {
        return init(
            '<script type="application/jsonp">{"test": 9}</script>',
            '<script type="application/jsonp">{"test": 9}</script>',
            options
        );
    });

    it('should skip <script> tags with invalid JSON', () => {
        return init(
            '<script type="application/json">{test: 5}</script>',
            '<script type="application/json">{test: 5}</script>',
            options
        );
    });

    it('should preserve numbers without rounding, overflow or loss of negative zero', () => {
        return init(
            '<script type="application/json"> [ 9007199254740993, 1.234567890123456789, 1e400, -1e400, 1e-400, -0 ] </script>'
            + '<script type="application/json"> -0 </script>',
            '<script type="application/json">[9007199254740993,1.234567890123456789,1e400,-1e400,1e-400,-0]</script>'
            + '<script type="application/json">-0</script>',
            options
        );
    });

    it('should preserve duplicate keys and member order, including prototype-like keys', () => {
        return init(
            '<script type="application/json"> { "2": 2, "1": 1, "a": 3, "a": 4, "__proto__": { "x": 5 }, "constructor": 6 } </script>',
            '<script type="application/json">{"2":2,"1":1,"a":3,"a":4,"__proto__":{"x":5},"constructor":6}</script>',
            options
        );
    });

    it('should preserve whitespace and escapes inside strings while shortening unnecessary escapes', () => {
        return init(
            String.raw`<script type="application/json"> { "text" : " space \t\n\r \"quoted\" \\ path , : { } ", "unicode": "\u0061\/\uD800" } </script>`,
            String.raw`<script type="application/json">{"text":" space \t\n\r \"quoted\" \\ path , : { } ","unicode":"a/\ud800"}</script>`,
            options
        );
    });

    it('should minify JSON scalars and arrays', () => {
        return init(
            '<script type="application/json"> true </script>'
            + '<script type="application/json"> null </script>'
            + '<script type="application/json"> "hello world" </script>'
            + '<script type="application/json"> [ false, null, {}, [] ] </script>',
            '<script type="application/json">true</script>'
            + '<script type="application/json">null</script>'
            + '<script type="application/json">"hello world"</script>'
            + '<script type="application/json">[false,null,{},[]]</script>',
            options
        );
    });

    it('should leave malformed JSON and empty data blocks unchanged', async () => {
        for (const content of ['', ' \n\t ', '[1,]', 'true false', '"unterminated', String.raw`"\x3c"`]) {
            const html = `<script type="application/json">${content}</script>`;
            await init(html, html, options);
        }
    });

    it('should keep `<` escaped so JSON payloads cannot terminate the <script> element', () => {
        return init(
            '<script type="application/json">{"c":"\\u003Cscript>alert(1)\\u003C\\u002Fscript>\\u003Cp>injected\\u003C\\u002Fp>"}</script>',
            '<script type="application/json">{"c":"\\u003Cscript>alert(1)\\u003C/script>\\u003Cp>injected\\u003C/p>"}</script>',
            options
        );
    });

    it('should keep hostile JSON strings inside the script without swallowing subsequent elements', async () => {
        const content = String.raw`{ "\u003C!--\u003Cscript>" : "\u003C/ScRiPt>\u003Cimg src=x onerror=alert(1)>" }`;
        const result = await processHtml(`<script type="application/json">${content}</script><p>after</p>`, options, {});
        const fragment = parseFragment(result.html);
        expect(fragment.childNodes.map(node => node.nodeName)).toEqual(['script', 'p']);

        const script = fragment.childNodes[0];
        if (!('childNodes' in script)) {
            throw new Error('Expected a script element');
        }
        const json = script.childNodes.map(node => 'value' in node ? node.value : '').join('');
        expect(JSON.parse(json)).toEqual(JSON.parse(content));
        expect(json).not.toContain('<');
    });
});

describe('minifyJson attributes', () => {
    const options: HtmlnanoOptions = { minifyJson: { attributes: ['data-json'] } };

    function readAttributes(html: string): Record<string, string> {
        const element = parseFragment(html).childNodes[0];
        if (!element || !('attrs' in element)) throw new Error('Expected an element');
        return Object.fromEntries(element.attrs.map(attr => [attr.name, attr.value]));
    }

    it('should preserve string spaces, number spelling, duplicate keys and unselected data', async () => {
        const html = `<div data-json='{ "message": "a  b", "large": 9007199254740993, "fraction": 1.234567890123456789, "zero": -0, "exp": 1E+400, "exp": 1e-400 }' data-other='{ "x": 1 }' data-message="a  b">X</div>`;
        const result = await processHtml(html, options, {});
        expect(readAttributes(result.html)).toEqual({
            'data-json': '{"message":"a  b","large":9007199254740993,"fraction":1.234567890123456789,"zero":-0,"exp":1E+400,"exp":1e-400}',
            'data-other': '{ "x": 1 }',
            'data-message': 'a  b'
        });
        expect((await processHtml(result.html, options, {})).html).toBe(result.html);
    });

    it('should require explicit selection, including with the safe preset', async () => {
        const html = `<div data-json='{ "x": 1 }'></div>`;
        for (const minifyJson of [true, false, {}, { attributes: [] }]) {
            const result = await processHtml(html, { minifyJson }, {});
            expect(readAttributes(result.html)['data-json']).toBe('{ "x": 1 }');
        }
        const result = await processHtml(html);
        expect(readAttributes(result.html)['data-json']).toBe('{ "x": 1 }');
    });

    it('should match names and optional tag restrictions without case distinctions', async () => {
        const html = `<DIV DATA-JSON='[ 1, 2 ]' data-state='[ 3 ]'></DIV><span data-json='[ 4 ]'></span>`;
        await init(html, '<DIV data-json="[1,2]" data-state="[3]"></DIV><span data-json="[ 4 ]"></span>', {
            minifyJson: { attributes: [{ name: 'DATA-JSON', tag: 'DiV' }, { name: 'data-state' }] }
        });
    });

    it('should leave invalid JSON, empty values and boolean attributes unchanged', async () => {
        for (const value of ['{bad: 1}', '[1,]', '{&quot;x&quot;: }', '', ' \n ', 'true false']) {
            const html = `<div data-json='${value}'></div>`;
            const result = await processHtml(html, options, {});
            expect(readAttributes(result.html)['data-json']).toBe(readAttributes(html)['data-json']);
        }
        await init('<div data-json></div>', '<div data-json=""></div>', options);
    });

    it('should still minify JSON scripts when attribute rules are supplied', () => {
        return init(`<script type="application/json"> { "x": 1 } </script><div data-json='[ 2 ]'></div>`,
            '<script type="application/json">{"x":1}</script><div data-json="[2]"></div>', options);
    });

    it('should skip attribute minification in XML mode', async () => {
        const html = `<div data-json='[ 1, 2 ]'></div>`;
        const result = await processHtml(html, options, {}, { xmlMode: true });
        expect(readAttributes(result.html)['data-json']).toBe('[ 1, 2 ]');
    });

    const payloads = [
        String.raw` { "text": "a  b \t\n\r \"quoted\" \\ path", "entity": "&amp;copy; &amp;#39; &copy; &notit;", "syntax": "&apos; &lt;/div&gt;&lt;img src=x&gt;", "escape": "\u0026quot; \u0027 \u0061\/\uD800" } `,
        String.raw` [ "\&quot;", "&#39;", "&amp;copy;" ] `,
        String.raw` "\&quot; &#39; &amp;copy;" `,
        ' true ', ' null ', ' -0 ', ' 1E+400 ', ' {} '
    ];
    for (const decodeEntities of [false, true]) {
        for (const quoteStyle of [undefined, 0, 1, 2] as const) {
            for (const replaceQuote of [false, true]) {
                it(`should preserve entities and quotes with decodeEntities=${decodeEntities}, quoteStyle=${quoteStyle}, replaceQuote=${replaceQuote}`, async () => {
                    for (const payload of payloads) {
                        const html = `<div data-json='${payload}'></div><p>after</p>`;
                        const original: unknown = JSON.parse(readAttributes(html)['data-json']);
                        const renderOptions = { decodeEntities, quoteStyle, replaceQuote };
                        const result = await processHtml(html, options, {}, { ...renderOptions });
                        expect(JSON.parse(readAttributes(result.html)['data-json'])).toEqual(original);
                        expect(parseFragment(result.html).childNodes.map(node => node.nodeName)).toEqual(['div', 'p']);
                        expect((await processHtml(result.html, options, {}, { ...renderOptions })).html).toBe(result.html);
                    }
                });
            }
        }
    }

    it('should compose with character reference minification and quote removal', async () => {
        const html = `<div data-json='{ &quot;text&quot;: &quot;&amp;copy; &#39; a  b&quot; }'></div>`;
        for (const decodeEntities of [false, true]) {
            const enabled = { ...options, minifyCharacterReferences: { decodeAll: true }, removeAttributeQuotes: true };
            const result = await processHtml(html, enabled, {}, { decodeEntities });
            expect(JSON.parse(readAttributes(result.html)['data-json'])).toEqual({ text: '&copy; \' a  b' });
            expect((await processHtml(result.html, enabled, {}, { decodeEntities })).html).toBe(result.html);
        }
    });

    it('should preserve double-encoded quotes with the default parser', async () => {
        const html = `<div data-json='{ "text": "&amp;quot; &amp;#34;" }'></div>`;
        const result = await processHtml(html, options, {});
        expect(JSON.parse(readAttributes(result.html)['data-json'])).toEqual({ text: '&quot; &#34;' });
        expect((await processHtml(result.html, options, {})).html).toBe(result.html);
    });

    it('should preserve selected JSON in native templates with entity decoding', async () => {
        const html = `<template><div data-json='{ "text": "&amp;copy; &#39;" }'></div></template>`;
        for (const decodeEntities of [false, true]) {
            const enabled = { ...options, minifyHtmlTemplate: true };
            const result = await processHtml(html, enabled, {}, { decodeEntities });
            const template = parseFragment(result.html).childNodes[0];
            if (!('content' in template) || !('childNodes' in template.content)) throw new Error('Expected a template');
            const child = template.content.childNodes[0];
            if (!('attrs' in child)) throw new Error('Expected an element');
            expect(JSON.parse(child.attrs[0].value)).toEqual({ text: '&copy; \'' });
            expect((await processHtml(result.html, enabled, {}, { decodeEntities })).html).toBe(result.html);
        }
    });
});
