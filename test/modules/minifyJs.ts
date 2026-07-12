import { init } from '../htmlnano.ts';
import safePreset from '../../dist/presets/safe.mjs';
import ampSafePreset from '../../dist/presets/ampSafe.mjs';

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

    it('should minify JS with script type parameters', () => {
        return init(
            '<script type="text/javascript; charset=utf-8"> /* test */ var foob = function () {}; </script>',
            '<script type="text/javascript; charset=utf-8">var foob=function(){};</script>',
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
            '<a href="#" onclick="return function(){}">click</a>',
            options
        );
    });

    it('should minify JS inside mixed-case on* attributes', () => {
        return init(
            '<a href="#" onClick="return function () {};">click</a>',
            '<a href="#" onClick="return function(){}">click</a>',
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

    it('should minify JS with `this` inside on* attributes ', () => {
        return init(
            '<video oncanplay="this.currentTime = 1.2; this.oncanplay=null;"></video>',
            '<video oncanplay="this.currentTime=1.2,this.oncanplay=null"></video>',
            options
        );
    });

    it('should minify JS with `this` inside on* attributes with `module` option', () => {
        return init(
            '<video oncanplay="this.currentTime = 1.2; this.oncanplay=null;"></video>',
            '<video oncanplay="this.currentTime=1.2,this.oncanplay=null"></video>',
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

            `<a href="#" onclick="myFunc('my string')"></a>
            <a href="#" onclick='myFunc("my string")'></a>`,
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
            `<a href="#" onclick='alert("hi")'>x</a>`,
            options
        );
    });

    it('should apply smart quotes even when boolean attributes are present', () => {
        return init(
            `<button hidden onclick='alert("hi")'>x</button>`,
            `<button hidden="" onclick='alert("hi")'>x</button>`,
            options
        );
    });

    it('should skip smart quotes when an attribute mixes single and double quotes', () => {
        return init(
            `<a title="it's &quot;x&quot;" onclick='f("a")'>y</a>`,
            `<a title="it's &quot;x&quot;" onclick="f(&quot;a&quot;)">y</a>`,
            options
        );
    });

    it('should keep user-provided quote_style in Terser format option', () => {
        return init(
            `<a onclick="f('s')"></a>`,
            `<a onclick="f('s')"></a>`,
            // eslint-disable-next-line camelcase -- Terser format option name
            { minifyJs: { format: { quote_style: 1 } } }
        );
    });

    it('should resolve on* Terser options with an empty output option', () => {
        return init(
            `<a onclick="f('s')"></a>`,
            `<a onclick="f('s')"></a>`,
            { minifyJs: { output: {} } }
        );
    });

    it('should resolve on* Terser options with an empty format option', () => {
        return init(
            `<a onclick="f('s')"></a>`,
            `<a onclick="f('s')"></a>`,
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
});
