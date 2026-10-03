import { expect } from 'expect';
import { runInNewContext } from 'node:vm';
import { parseFragment } from 'parse5';
import type { DefaultTreeAdapterTypes } from 'parse5';
import { init, initWithPostHtmlOptions } from '../htmlnano.ts';
import { process as processHtml } from '../../dist/index.mjs';
import safePreset from '../../dist/presets/safe.mjs';
import ampSafePreset from '../../dist/presets/ampSafe.mjs';
import maxPreset from '../../dist/presets/max.mjs';

describe('minifyJs', () => {
    const options = {
        minifyJs: safePreset.minifyJs
    };

    it('should minify JS inside <script>', () => {
        return init(
            `<div>
                <script> /* test */ var foob = function () {}; </script>
                <script type="module"> /* test */ var foob = function () {}; </script>
                <script type="text/javascript"> /* test */ var foob = function () {}; </script>
                <script type="application/javascript"> /* test */ var foob = function () {}; </script>
             </div>`,

            `<div>
                <script>var foob=function(){};</script>
                <script type="module">var foob=function(){};</script>
                <script type="text/javascript">var foob=function(){};</script>
                <script type="application/javascript">var foob=function(){};</script>
             </div>`,

            options
        );
    });

    it('should minify JS for legacy script types', () => {
        return init(
            '<script type="text/ecmascript"> /* test */ var foob = function () {}; </script>',
            '<script type="text/ecmascript">var foob=function(){};</script>',
            options
        );
    });

    it('should preserve data blocks with script type parameters', () => {
        return init(
            '<script type="text/javascript; charset=utf-8"> /* test */ var foob = function () {}; </script>',
            '<script type="text/javascript; charset=utf-8"> /* test */ var foob = function () {}; </script>',
            options
        );
    });

    for (const attrs of ['type=" "', 'type="module; charset=utf-8"', 'type="&#32;"', 'language="vbscript"', 'TYPE="application/json" type="text/javascript"', 'SRC="file.js"', 'INTEGRITY="example"']) {
        it(`should preserve script content with ${attrs}`, () => {
            const html = `<SCRIPT ${attrs}>not JavaScript at all</SCRIPT>`;
            return init(html, html, options);
        });
    }

    for (const attrs of ['TYPE=" TEXT/JAVASCRIPT "', 'type="text&#47;javascript"', 'language="JavaScript"', 'type="" language="vbscript"']) {
        it(`should recognize JavaScript scripts with ${attrs}`, () => {
            return init(
                `<SCRIPT ${attrs}> var foo = 1; </SCRIPT>`,
                `<SCRIPT ${attrs}>var foo=1;</SCRIPT>`,
                options
            );
        });
    }

    it('should still minify handlers on external scripts', () => {
        return init(
            '<script src="file.js" onload="foo (1 + 2)">not JavaScript</script>',
            '<script src="file.js" onload="foo(3);">not JavaScript</script>',
            options
        );
    });

    it('should not minify JS with <script> + SRI', () => {
        return init(
            `<div>
                <script integrity="example"> /* test */ var foob = function () {}; </script>
                <script integrity="example" type="module"> /* test */ var foob = function () {}; </script>
                <script integrity="example" type="text/javascript"> /* test */ var foob = function () {}; </script>
                <script integrity="example" type="application/javascript"> /* test */ var foob = function () {}; </script>
             </div>`,
            `<div>
                <script integrity="example"> /* test */ var foob = function () {}; </script>
                <script integrity="example" type="module"> /* test */ var foob = function () {}; </script>
                <script integrity="example" type="text/javascript"> /* test */ var foob = function () {}; </script>
                <script integrity="example" type="application/javascript"> /* test */ var foob = function () {}; </script>
             </div>`,
            options
        );
    });

    it('should minify ES6 inside <script>', () => {
        return init(
            `<script>
                const f  =  5 + 10;
                let a = (b) => { return b * 5; };
            </script>`,
            '<script>const f=15;let a=t=>5*t;</script>',
            options
        );
    });

    it('should minify module scripts with ES module syntax', () => {
        return init(
            '<script type="module">export const foo = 1;</script>',
            '<script type="module">export const foo=1;</script>',
            options
        );
    });

    it('should minify JS inside on* attributes', () => {
        return init(
            '<a href="#" onclick="return function () {};">click</a>',
            '<a href="#" onclick="return function(){};">click</a>',
            options
        );
    });

    it('should minify JS inside mixed-case on* attributes', () => {
        return init(
            '<a href="#" onClick="return function () {};">click</a>',
            '<a href="#" onClick="return function(){};">click</a>',
            options
        );
    });

    it('should skip invalid JS inside on* attributes', () => {
        return init(
            '<a href="#" onclick="return = ;">click</a>',
            '<a href="#" onclick="return = ;">click</a>',
            options
        );
    });

    it('should minify handlers ending in line comments', () => {
        return init(
            '<button onclick="return 1 + 2; // comment"></button>',
            '<button onclick="return 3;"></button>',
            options
        );
    });

    for (const minifyJs of [{ compress: false, mangle: false }, { format: { beautify: true } }, { module: true, toplevel: true, compress: { module: true, toplevel: true }, mangle: { module: true, toplevel: true } }]) {
        it(`should preserve handler semantics with ${JSON.stringify(minifyJs)}`, async () => {
            const result = await processHtml('<button onclick="var event; var arguments; return event.value + arguments[0].value + this.value;"></button>', { minifyJs }, {});
            const code = getHandlerCode(result.html);
            expect(runInNewContext(`(function(event) { ${code} }).call({value: 4}, {value: 3})`)).toBe(10);
        });
    }

    it('should preserve window.onerror parameters', async () => {
        const result = await processHtml('<body onerror="var source; var lineno; var colno; var error; return [event, source, lineno, colno, error];"></body>', options, {});
        const code = getHandlerCode(result.html, 'onerror');
        expect(runInNewContext(`(function(event, source, lineno, colno, error) { ${code} })(1, 2, 3, 4, 5)`)).toEqual([1, 2, 3, 4, 5]);
    });

    it('should decode character references in handler code', () => {
        return init(
            '<button onclick="if (a &amp;&amp; b) foo (1 + 2)"></button>',
            '<button onclick="a&amp;&amp;b&amp;&amp;foo(3);"></button>',
            options
        );
    });

    it('should respect already decoded handler values', () => {
        return initWithPostHtmlOptions(
            '<button onclick="return \'&amp;lt;\'"></button>',
            '<button onclick="return\'&amp;lt;\';"></button>',
            options,
            { decodeEntities: true }
        );
    });

    it('should not turn printed character references into handler code', async () => {
        const result = await processHtml(String.raw`<button onclick="return '\x26quot;); injected(); //'"></button>`, options, {});
        const code = getHandlerCode(result.html);
        expect(runInNewContext(`(function() { ${code} })()`)).toBe('&quot;); injected(); //');
    });

    it('should empty handlers containing only removable comments', () => {
        return init('<button onclick="/* comment */"></button>', '<button onclick=""></button>', options);
    });

    it('should preserve required semicolons in handlers', () => {
        return init('<button onclick="if (foo()) ;"></button>', '<button onclick="if(foo());"></button>', { minifyJs: { compress: false } });
    });

    it('should minify JS with `this` inside on* attributes ', () => {
        return init(
            '<video oncanplay="this.currentTime = 1.2; this.oncanplay=null;"></video>',
            '<video oncanplay="this.currentTime=1.2,this.oncanplay=null;"></video>',
            options
        );
    });

    it('should minify JS with `this` inside on* attributes with `module` option', () => {
        return init(
            '<video oncanplay="this.currentTime = 1.2; this.oncanplay=null;"></video>',
            '<video oncanplay="this.currentTime=1.2,this.oncanplay=null;"></video>',
            { minifyJs: { module: true } }
        );
    });

    it('should not minify JS inside HTML comments', () => {
        return init(
            '<div><!-- <script> var foob = function () {}; </script> --></div>',
            '<div><!-- <script> var foob = function () {}; </script> --></div>',
            options
        );
    });

    it('should skip <script> with non JS media type', () => {
        return init(
            '<script type="application/json">var foob = function () {};</script>',
            '<script type="application/json">var foob = function () {};</script>',
            options
        );
    });

    it('should pass minifyJs options to Terser', () => {
        return init(
            '<script>foo["bar"] = 5;</script>',
            '<script>foo["bar"]=5;</script>',
            {
                minifyJs: {
                    compress: {
                        properties: false
                    }
                }
            });
    });

    it('should not break quotes inside on* attributes code', () => {
        return init(
            `<a href="#" onclick="myFunc('my string')"></a>
            <a href="#" onclick='myFunc("my string")'></a>`,

            `<a href="#" onclick="myFunc('my string');"></a>
            <a href="#" onclick='myFunc("my string");'></a>`,
            options
        );
    });

    it('should not minify inline JS on AMP pages', () => {
        return init(
            '<button on="tap:something">Click</button>',
            '<button on="tap:something">Click</button>',
            { minifyJs: ampSafePreset.minifyJs }
        );
    });

    it('should keep JS inside SVG wrapped in CDATA', () => {
        return init(
            `<svg><script>
                // <![CDATA[
                const x = "test" + "2";
                //  ]]>
            </script></svg>
            <svg><script>
                /* <![CDATA[  */
                const x = "test" + "2";
                /* ]]>*/
            </script></svg>`,
            `<svg><script>/*<![CDATA[*/const x="test2";/*]]>*/</script></svg>
            <svg><script>/*<![CDATA[*/const x="test2";/*]]>*/</script></svg>`,
            options
        );
    });

    it('should not treat a "CDATA" substring without markers as CDATA', () => {
        return init(
            '<script>var x = "CDATA" + 1;</script>',
            '<script>var x="CDATA1";</script>',
            options
        );
    });

    it('should switch to single quotes when an on* handler contains double quotes', () => {
        return init(
            `<a href="#" onclick='alert("hi")'>x</a>`,
            `<a href="#" onclick='alert("hi");'>x</a>`,
            options
        );
    });

    it('should apply smart quotes even when boolean attributes are present', () => {
        return init(
            `<button hidden onclick='alert("hi")'>x</button>`,
            `<button hidden="" onclick='alert("hi");'>x</button>`,
            options
        );
    });

    it('should skip smart quotes when an attribute mixes single and double quotes', () => {
        return init(
            `<a title="it's &quot;x&quot;" onclick='f("a")'>y</a>`,
            `<a title="it's &quot;x&quot;" onclick="f(&quot;a&quot;);">y</a>`,
            options
        );
    });

    it('should keep user-provided quote_style in Terser format option', () => {
        return init(
            `<a onclick="f('s')"></a>`,
            `<a onclick="f('s');"></a>`,
            // eslint-disable-next-line camelcase -- Terser format option name
            { minifyJs: { format: { quote_style: 1 } } }
        );
    });

    it('should resolve on* Terser options with an empty output option', () => {
        return init(
            `<a onclick="f('s')"></a>`,
            `<a onclick="f('s');"></a>`,
            { minifyJs: { output: {} } }
        );
    });

    it('should resolve on* Terser options with an empty format option', () => {
        return init(
            `<a onclick="f('s')"></a>`,
            `<a onclick="f('s');"></a>`,
            { minifyJs: { format: {} } }
        );
    });

    it('should respect an explicit module option on module scripts', () => {
        return init(
            '<script type="module">export const foo = 1;</script>',
            '<script type="module">export const foo=1;</script>',
            { minifyJs: { module: false } }
        );
    });

    it('should honor explicit toplevel/mangle/compress on module scripts', () => {
        return init(
            '<script type="module">const foo = 1; export { foo };</script>',
            '<script type="module">const o=1;export{o as foo};</script>',
            { minifyJs: { toplevel: true, mangle: true, compress: true } }
        );
    });

    it('should keep legal comments with the safe preset', () => {
        return init(
            '<script>/*! @license MIT */\n/* @licstart notice */\nvar foob = 1;\n/* @licend */</script>',
            '<script>/*! @license MIT */\n/* @licstart notice */\nvar foob=1;\n/* @licend */</script>',
            options
        );
    });

    it('should drop legal comments with the max preset', () => {
        return init(
            '<script>/*! @license MIT */\n/* @licstart notice */\nvar foob = 1;\n/* @licend */</script>',
            '<script>var foob=1;</script>',
            { minifyJs: maxPreset.minifyJs }
        );
    });

    it('should drop legal comments from on* attributes with the max preset', () => {
        return init(
            '<a onclick="/*! @license MIT */ foob()"></a>',
            '<a onclick="foob();"></a>',
            { minifyJs: maxPreset.minifyJs }
        );
    });
});

function getHandlerCode(html: string, attrName = 'onclick') {
    // Use a native element because parseFragment omits the <body> wrapper.
    const fragment = parseFragment(html.replace(/<\/?body/g, tag => tag.replace('body', 'div')));
    const element = fragment.childNodes[0] as DefaultTreeAdapterTypes.Element;
    return element.attrs.find(attr => attr.name === attrName)!.value;
}
