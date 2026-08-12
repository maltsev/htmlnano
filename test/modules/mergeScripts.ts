import { init } from '../htmlnano.ts';
import maxPreset from '../../dist/presets/max.mjs';

describe('mergeScripts', () => {
    const options = {
        mergeScripts: maxPreset.mergeScripts
    };

    it('should merge <script> with the same attributes', () => {
        return init(
            `<script>var foo = 1;</script>
            <script class="test">foo = 2;</script>
            <script type="text/javascript">foo = 3;</script>
            <script defer>foo = 4;</script>
            <script>foo = 5;</script>
            <script></script>
            <script defer="defer">foo = 6;</script>
            <script class="test" type="text/javascript">foo = 7;</script>`,

            '\n            \n            \n            \n            \n            '
            + `<script>var foo = 1;foo = 3;foo = 5;</script>
            <script defer="defer">foo = 4;foo = 6;</script>
            <script class="test" type="text/javascript">foo = 2;foo = 7;</script>`,

            options
        );
    });

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

            `
            <script async>window.async = true</script>
            <script>window.foo1 = 'foo';window.foo2 = 'bar'</script>`,

            options
        );
    });

    it('should merge application/javascript scripts separately', () => {
        return init(
            `<script type="application/javascript">window.foo1 = 'foo'</script>
            <script>window.bar = 'bar'</script>
            <script type="application/javascript">window.foo2 = 'baz'</script>`,

            `
            <script>window.bar = 'bar'</script>
            <script type="application/javascript">window.foo1 = 'foo';window.foo2 = 'baz'</script>`,

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

            '<noscript><script>window.bar = 2</script></noscript>'
            + '<script>window.foo = 1;window.baz = 3</script>',

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

            '<template><script>window.bar = 2</script></template>'
            + '<script>window.foo = 1;window.baz = 3</script>',

            options
        );
    });
});
