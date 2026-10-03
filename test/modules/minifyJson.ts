import { expect } from 'expect';
import { parseFragment } from 'parse5';
import { init } from '../htmlnano.ts';
import { process as processHtml } from '../../dist/index.mjs';
import safePreset from '../../dist/presets/safe.mjs';

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
