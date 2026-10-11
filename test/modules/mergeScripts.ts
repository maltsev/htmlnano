import { createContext, runInContext } from 'node:vm';
import { expect } from 'expect';
import { parseFragment } from 'parse5';
import { init } from '../htmlnano.ts';
import htmlnano from '../../dist/index.mjs';
import maxPreset from '../../dist/presets/max.mjs';

function executeScripts(html: string) {
    const values: number[] = [];
    const context = createContext({ values });
    for (const node of parseFragment(html).childNodes) {
        if (node.nodeName === 'script' && 'childNodes' in node) {
            const source = node.childNodes.map(child => 'value' in child ? child.value : '').join('');
            runInContext(source, context, { timeout: 1000 });
        }
    }

    return values;
}

describe('mergeScripts', () => {
    for (const declaration of ['let value = 1;', 'const value = 1;', 'class Value {}']) {
        it(`should keep conflicting ${declaration} scripts separate and merge other scripts`, async () => {
            const input = `<script>${declaration} values.push(1);</script><script>${declaration} values.push(2);</script>`
                + '<script>values.push(3);</script><script>values.push(4);</script>';
            const { html } = await htmlnano.process(input, { skipConfigLoading: true }, maxPreset);
            const scripts = parseFragment(html).childNodes.filter(node => node.nodeName === 'script');
            expect(scripts).toHaveLength(3);

            function executeWithErrors(source: string) {
                const values: number[] = [];
                const context = createContext({ values });
                const errors: string[] = [];
                for (const node of parseFragment(source).childNodes) {
                    if (node.nodeName !== 'script' || !('childNodes' in node)) continue;
                    try {
                        runInContext(node.childNodes.map(child => 'value' in child ? child.value : '').join(''), context);
                    } catch (error) {
                        errors.push((error as Error).name);
                    }
                }
                return { values, errors };
            }

            expect(executeWithErrors(html)).toEqual(executeWithErrors(input));
            expect(executeWithErrors(html)).toEqual({ values: [1, 3, 4], errors: ['SyntaxError'] });
        });

        it(`should retain ${declaration} boundaries with mergeScripts alone`, () => {
            const input = `<script>${declaration}</script><script>${declaration}</script>`;
            return init(input, input, { mergeScripts: true });
        });
    }

    const options = {
        mergeScripts: maxPreset.mergeScripts
    };

    it('should merge adjacent <script> with the same normalized attributes', () => {
        return init(
            '<script>var foo = 1;</script>\n<script type="text/javascript">foo = 2;</script>'
            + '<script defer>foo = 3;</script><script defer="defer">foo = 4;</script>'
            + '<script class="test">foo = 5;</script><script class="test">foo = 6;</script>',
            '\n<script type="text/javascript">var foo = 1;\n;\nfoo = 2;</script>'
            + '<script defer="defer">foo = 3;\n;\nfoo = 4;</script>'
            + '<script class="test">foo = 5;\n;\nfoo = 6;</script>',
            options
        );
    });

    it('should not reorder scripts with different attributes', () => {
        const html = '<script>window.order = [1]</script>'
            + '<script class="test">window.order.push(2)</script>'
            + '<script>window.order.push(3)</script>';
        return init(html, html, options);
    });

    it('should handle empty scripts without losing surrounding code', () => {
        return init(
            '<script> </script><script>foo()</script><script></script><script>bar()</script>',
            '<script>foo()\n;\n;\nbar()</script>',
            options
        );
    });

    for (const barrier of [
        '<div id="later"></div>',
        '<meta http-equiv="Content-Security-Policy" content="script-src \'none\'">',
        'visible text',
        '<!-- comment -->',
        '<script type="module">window.module = true</script>',
        '<script type="application/json">{}</script>',
        '<script index="same" src="external.js"></script>'
    ]) {
        it(`should not merge across ${barrier}`, () => {
            const html = '<script index="same">window.before = true</script>'
                + barrier + '<script index="same">window.after = true</script>';
            return init(html, html, options);
        });
    }

    it('should merge scripts within a parent without crossing parent boundaries', () => {
        return init(
            '<div><script>foo()</script><script>bar()</script></div><script>baz()</script>',
            '<div><script>foo()\n;\nbar()</script></div><script>baz()</script>',
            options
        );
    });

    for (const tag of ['svg', 'math', 'SVG', 'MATH', 'NOSCRIPT', 'TEMPLATE']) {
        it(`should leave scripts inside <${tag}> untouched`, () => {
            const html = `<${tag}><script>foo()</script><script>bar()</script></${tag}>`;
            return init(html, html, options);
        });
    }

    it('should add trailing ; when it\'s missing in oneline <script>', () => {
        return init(
            '<script>document.write("Hello, ")</script><script>document.write("World!")</script>',
            '<script>document.write("Hello, ")\n;\ndocument.write("World!")</script>',
            options
        );
    });

    it('should add trailing ; when it\'s missing in multiline <script>', () => {
        return init(
            `<script>

                // Some comment
                var a = 5;
                var b = a + 6

            </script><script>

                var c = 10

            </script>`,
            `<script>// Some comment
                var a = 5;
                var b = a + 6
;


                var c = 10

            </script>`,
            options
        );
    });

    it('should not change order of JS code', () => {
        return init(
            `<script>window.foo1 = 'foo'</script><script>window.foo2 = 'foo'</script>
            <script src="./script-need-foo-variable.js"></script>
            <script>window.bar1 = 'foo'</script><script>window.bar2 = 'bar'</script>`,

            `<script>window.foo1 = 'foo'\n;\nwindow.foo2 = 'foo'</script>
            <script src="./script-need-foo-variable.js"></script>
            <script>window.bar1 = 'foo'\n;\nwindow.bar2 = 'bar'</script>`,
            options
        );
    });

    it('should not merge script with SRI', () => {
        return init(
            `<script>window.foo1 = 'foo'</script><script>window.foo2 = 'foo'</script>
            <script integrity="example">window.foo2 = 'foo'</script><script>window.foo3 = 'baz'</script>
            <script>window.bar1 = 'foo'</script><script>window.bar2 = 'bar'</script>`,

            `<script>window.foo1 = 'foo'\n;\nwindow.foo2 = 'foo'</script>
            <script integrity="example">window.foo2 = 'foo'</script>
            <script>window.foo3 = 'baz'\n;\nwindow.bar1 = 'foo'\n;\nwindow.bar2 = 'bar'</script>`,
            options
        );
    });

    it('should keep async scripts separate from sync scripts', () => {
        return init(
            `<script>window.foo1 = 'foo'</script>
            <script async>window.async = true</script>
            <script>window.foo2 = 'bar'</script>`,

            `<script>window.foo1 = 'foo'</script>
            <script async>window.async = true</script>
            <script>window.foo2 = 'bar'</script>`,

            options
        );
    });

    it('should merge application/javascript scripts separately', () => {
        return init(
            `<script type="application/javascript">window.foo1 = 'foo'</script>
            <script>window.bar = 'bar'</script>
            <script type="application/javascript">window.foo2 = 'baz'</script>`,

            `<script type="application/javascript">window.foo1 = 'foo'</script>
            <script>window.bar = 'bar'</script>
            <script type="application/javascript">window.foo2 = 'baz'</script>`,

            options
        );
    });

    it('should not merge scripts with different nonce values', () => {
        return init(
            '<script nonce="a">window.foo = 1</script><script nonce="b">window.bar = 2</script>',
            '<script nonce="a">window.foo = 1</script><script nonce="b">window.bar = 2</script>',
            options
        );
    });

    for (const attrs of [
        'SRC="external.js"', 'SrC=""', 'INTEGRITY="hash"',
        'TYPE="module"', 'TYPE="application/json"', 'language="vbscript"',
        'TYPE="module" type="text/javascript"', 'type="&#32;" language="javascript"'
    ]) {
        it(`should preserve scripts with ${attrs}`, () => {
            const html = `<script ${attrs}>foo()</script><script ${attrs}>bar()</script>`;
            return init(html, html, options);
        });
    }

    it('should match attribute names regardless of ASCII case', () => {
        return init(
            '<script NoNcE="trusted" TYPE=" TEXT/JAVASCRIPT ">foo()</script>'
            + '<SCRIPT nonce="trusted">bar()</SCRIPT>',
            '<SCRIPT nonce="trusted">foo()\n;\nbar()</SCRIPT>',
            options
        );
    });

    it('should preserve the first of case-insensitive duplicate nonce attributes', () => {
        const html = '<script NONCE="untrusted" nonce="trusted">foo()</script>'
            + '<script nonce="trusted">bar()</script>';
        return init(html, html, options);
    });

    it('should keep nonce-bearing scripts separate from scripts without a nonce', () => {
        const html = '<script NONCE="trusted">foo()</script><script>bar()</script>';
        return init(html, html, options);
    });

    it('should respect an explicit empty type over a non-JavaScript language', () => {
        return init(
            '<script type="" language="vbscript">foo()</script>'
            + '<script type="text/javascript" language="vbscript">bar()</script>',
            '<script type="text/javascript" language="vbscript">foo()\n;\nbar()</script>',
            options
        );
    });

    it('should match character references in type and nonce values', () => {
        return init(
            '<script type="text/java&#115;cript" nonce="trus&#116;ed">foo()</script>'
            + '<script nonce="trusted">bar()</script>',
            '<script nonce="trusted">foo()\n;\nbar()</script>',
            options
        );
    });

    it('should keep nomodule scripts separate from default scripts', () => {
        return init(
            '<script>window.foo = 1</script><script nomodule>window.bar = 2</script><script nomodule>window.baz = 3</script>',
            '<script>window.foo = 1</script><script nomodule>window.bar = 2\n;\nwindow.baz = 3</script>',
            options
        );
    });

    it('should separate scripts ending with line comments', () => {
        return init(
            '<script>foo()\n// comment</script><script>(bar())</script>',
            '<script>foo()\n// comment\n;\n(bar())</script>',
            options
        );
    });

    for (const [first, second] of [
        ['values.push(1)// trailing;', '[2].forEach(value => values.push(value))'],
        ['values.push(1)', '--> legacy comment\nvalues.push(2)'],
        ['values.push(1)\n--> legacy comment;', 'values.push(2)'],
        ['values.push(1)\n// trailing\n', 'values.push(2)'],
        ['values.push(1)\u2028// trailing', 'values.push(2)'],
        ['values.push(1)/* trailing */', '(values.push(2))']
    ]) {
        it(`should preserve execution across the boundary after ${JSON.stringify(first)}`, async () => {
            const input = `<script>${first}</script><script>${second}</script>`;
            const { html } = await htmlnano.process(input, options, {});
            expect(parseFragment(html).childNodes).toHaveLength(1);
            expect(executeScripts(input)).toEqual([1, 2]);
            expect(executeScripts(html)).toEqual([1, 2]);
        });
    }

    for (const source of [
        '"use strict"; values.push(1)',
        '// comment\n\'other directive\';\n\'use strict\'\nvalues.push(1)',
        '#!/usr/bin/env node\nvalues.push(1)',
        'var comment = "<!--";',
        'var tag = "<ScRiPt>";'
    ]) {
        it(`should preserve script boundaries around ${JSON.stringify(source)}`, async () => {
            const plain = '<script>values.push(2)</script>';
            const guarded = `<script>${source}</script>`;
            await init(plain + guarded + plain, plain + guarded + plain, options);
        });
    }

    it('should not combine HTML tokenizer states across scripts', async () => {
        const input = '<script>var comment = "<!--";</script>'
            + '<script>var tag = "<script>";</script><p>Visible</p>';
        const { html } = await htmlnano.process(input, options, {});
        expect(html).toBe(input);
        expect(parseFragment(html).childNodes.map(node => node.nodeName)).toEqual(['script', 'script', 'p']);
    });

    for (const strictFirst of [true, false]) {
        it(`should preserve strict mode with the strict script ${strictFirst ? 'first' : 'last'}`, async () => {
            const strict = '<script>"use strict"; values.push((function () { return this === undefined; })() ? 1 : 0)</script>';
            const sloppy = '<script>values.push((function () { return this === undefined; })() ? 0 : 2)</script>';
            const input = strictFirst ? strict + sloppy : sloppy + strict;
            const { html } = await htmlnano.process(input, options, {});
            expect(executeScripts(input)).toEqual(strictFirst ? [1, 2] : [2, 1]);
            expect(executeScripts(html)).toEqual(executeScripts(input));
        });
    }

    it('should keep ordinary adjacent scripts mergeable on either side of a guarded script', () => {
        return init(
            '<script>foo()</script><script>bar()</script><script>"use strict";strict()</script>'
            + '<script>baz()</script><script>qux()</script>',
            '<script>foo()\n;\nbar()</script><script>"use strict";strict()</script>'
            + '<script>baz()\n;\nqux()</script>',
            options
        );
    });

    it('should not merge <script> inside <noscript> with the document scripts', () => {
        return init(
            '<script>window.foo = 1</script>'
            + '<noscript><script>window.bar = 2</script></noscript>'
            + '<script>window.baz = 3</script>',

            '<script>window.foo = 1</script>'
            + '<noscript><script>window.bar = 2</script></noscript>'
            + '<script>window.baz = 3</script>',

            options
        );
    });

    it('should not merge <script> inside <noscript> with each other', () => {
        const html = '<noscript>'
            + '<script>window.foo = 1</script>'
            + '<script>window.bar = 2</script>'
            + '</noscript>';
        return init(
            html, html, options
        );
    });

    it('should not merge <script> inside <template> with the document scripts', () => {
        return init(
            '<script>window.foo = 1</script>'
            + '<template><script>window.bar = 2</script></template>'
            + '<script>window.baz = 3</script>',

            '<script>window.foo = 1</script>'
            + '<template><script>window.bar = 2</script></template>'
            + '<script>window.baz = 3</script>',

            options
        );
    });
});
