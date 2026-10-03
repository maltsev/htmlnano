import { init } from '../htmlnano.ts';
import maxPreset from '../../dist/presets/max.mjs';

describe('mergeScripts', () => {
    const options = {
        mergeScripts: maxPreset.mergeScripts
    };

    it('should merge adjacent <script> with the same normalized attributes', () => {
        return init(
            '<script>var foo = 1;</script>\n<script type="text/javascript">foo = 2;</script>'
            + '<script defer>foo = 3;</script><script defer="defer">foo = 4;</script>'
            + '<script class="test">foo = 5;</script><script class="test">foo = 6;</script>',
            '\n<script type="text/javascript">var foo = 1;foo = 2;</script>'
            + '<script defer="defer">foo = 3;foo = 4;</script>'
            + '<script class="test">foo = 5;foo = 6;</script>',
            options
        );
    });

    it('should not reorder scripts with different attributes', () => {
        const html = '<script>window.order = [1]</script>'
            + '<script class="test">window.order.push(2)</script>'
            + '<script>window.order.push(3)</script>';
        return init(html, html, options);
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
            '<div><script>foo();bar()</script></div><script>baz()</script>',
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
            '<script>document.write("Hello, ");document.write("World!")</script>',
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
                var b = a + 6;

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

            `<script>window.foo1 = 'foo';window.foo2 = 'foo'</script>
            <script src="./script-need-foo-variable.js"></script>
            <script>window.bar1 = 'foo';window.bar2 = 'bar'</script>`,
            options
        );
    });

    it('should not merge script with SRI', () => {
        return init(
            `<script>window.foo1 = 'foo'</script><script>window.foo2 = 'foo'</script>
            <script integrity="example">window.foo2 = 'foo'</script><script>window.foo3 = 'baz'</script>
            <script>window.bar1 = 'foo'</script><script>window.bar2 = 'bar'</script>`,

            `<script>window.foo1 = 'foo';window.foo2 = 'foo'</script>
            <script integrity="example">window.foo2 = 'foo'</script>
            <script>window.foo3 = 'baz';window.bar1 = 'foo';window.bar2 = 'bar'</script>`,
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
            '<SCRIPT nonce="trusted">foo();bar()</SCRIPT>',
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
            '<script type="text/javascript" language="vbscript">foo();bar()</script>',
            options
        );
    });

    it('should match character references in type and nonce values', () => {
        return init(
            '<script type="text/java&#115;cript" nonce="trus&#116;ed">foo()</script>'
            + '<script nonce="trusted">bar()</script>',
            '<script nonce="trusted">foo();bar()</script>',
            options
        );
    });

    it('should keep nomodule scripts separate from default scripts', () => {
        return init(
            '<script>window.foo = 1</script><script nomodule>window.bar = 2</script><script nomodule>window.baz = 3</script>',
            '<script>window.foo = 1</script><script nomodule>window.bar = 2;window.baz = 3</script>',
            options
        );
    });

    it('should separate scripts ending with line comments', () => {
        return init(
            '<script>foo()\n// comment</script><script>(bar())</script>',
            '<script>foo()\n// comment\n;(bar())</script>',
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
