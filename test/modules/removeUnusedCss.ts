import { expect } from 'expect';
import { init, initWithPostHtmlOptions } from '../htmlnano.ts';

// The warning is printed only once per process, so these tests have to run before
// any other test that uses `tool: 'uncss'`.
describe('removeUnusedCss (uncss security warning)', function () {
    this.timeout(3000);

    const html = '<div class="b"><style>.b{color:red}</style></div>';
    const minifiedHtml = '<div class="b"><style>.b{color:red}</style></div>';

    async function countWarnings(options: Parameters<typeof init>[2]) {
        const originalConsoleWarn = console.warn;
        let warnCalls = 0;
        console.warn = () => {
            warnCalls += 1;
        };

        try {
            await init(html, minifiedHtml, options);
        } finally {
            console.warn = originalConsoleWarn;
        }

        return warnCalls;
    }

    it('should not warn when skipInternalWarnings is true', async () => {
        expect(await countWarnings({
            skipInternalWarnings: true,
            removeUnusedCss: { tool: 'uncss' }
        })).toBe(0);
    });

    it('should not warn when purgeCSS is used', async () => {
        expect(await countWarnings({
            removeUnusedCss: { tool: 'purgeCSS' }
        })).toBe(0);
    });

    it('should warn about script execution once per process when uncss is used', async () => {
        expect(await countWarnings({
            removeUnusedCss: { tool: 'uncss' }
        })).toBe(1);

        // The second run doesn't warn again.
        expect(await countWarnings({
            removeUnusedCss: { tool: 'uncss' }
        })).toBe(0);
    });
});

describe('removeUnusedCss (uncss)', function () {
    this.timeout(3000);

    const options = {
        removeUnusedCss: {
            tool: 'uncss' as const
        }
    };
    const html = `<div><style>
        div.b {
            padding: 10px;
            border-radius: 10px;
        }
        .b {
            color: red;
        }
        .c {
            color: #123;
        }
    </style></div><p class="b">hello</p><style>.d{margin:auto}</style>`;

    it('should remove unused CSS inside <style>', () => {
        return init(
            html,
            `<div><style>
        .b {
            color: red;
        }
    </style></div><p class="b">hello</p>`,
            options
        );
    });

    it('should pass options to uncss', () => {
        return init(
            html,
            `<div><style>
        .b {
            color: red;
        }
        .c {
            color: #123;
        }
    </style></div><p class="b">hello</p>`,
            {
                removeUnusedCss: {
                    tool: 'uncss',
                    ignore: ['.c']
                }
            }
        );
    });

    it('should work with minifyCss', () => {
        return init(
            html,
            '<div><style>.b{color:red}</style></div><p class="b">hello</p>',
            {
                removeUnusedCss: options.removeUnusedCss,
                minifyCss: {}
            }
        );
    });

    it('should ignore amp boilerplate styles', () => {
        const ampHtml = '<style amp-boilerplate="">.unused{color:red}</style><div></div>';

        return init(
            ampHtml,
            ampHtml,
            {
                removeUnusedCss: options.removeUnusedCss
            }
        );
    });

    it('should preserve CDATA wrappers when removing rules', () => {
        const cdataHtml = '<div class="b"><style><![CDATA[.b{color:red}.c{color:blue}]]></style></div>';

        return init(
            cdataHtml,
            '<div class="b"><style><![CDATA[.b{color:red}]]></style></div>',
            options
        );
    });

    it('should remove empty CDATA styles without rejecting', () => {
        return init('<style><![CDATA[]]></style><div></div>', '<div></div>', options);
    });

    it('should skip non-css style types', () => {
        const lessHtml = '<style type="text/less">.unused{color:red}</style><div></div>';

        return init(
            lessHtml,
            lessHtml,
            options
        );
    });
});

describe('removeUnusedCss (purgeCSS)', function () {
    const options = {
        removeUnusedCss: {
            tool: 'purgeCSS' as const
        }
    };
    const html = `<div><style>
        div.r {
            padding: 10px;
            border-radius: 10px;
        }
        .b {
            color: red;
        }
        .c {
            color: #123;
        }
    </style></div><p class="b">hello</p><style>.d{margin:auto}</style>`;

    it('should remove unused CSS inside <style>', () => {
        return init(
            html,
            `<div><style>
        .b {
            color: red;
        }
    </style></div><p class="b">hello</p>`,
            options
        );
    });

    it('should pass options to purgeCSS', () => {
        return init(
            html,
            `<div><style>
        .b {
            color: red;
        }
        .c {
            color: #123;
        }
    </style></div><p class="b">hello</p>`,
            {
                removeUnusedCss: {
                    tool: 'purgeCSS',
                    safelist: ['c']
                }
            }
        );
    });

    it('should use purgeCSS by default when tool is omitted', () => {
        return init(
            html,
            `<div><style>
        .b {
            color: red;
        }
    </style></div><p class="b">hello</p>`,
            {
                removeUnusedCss: {
                    ignore: ['.c']
                }
            }
        );
    });

    it('should work with minifyCss', () => {
        return init(
            html,
            '<div><style>.b{color:red}</style></div><p class="b">hello</p>',
            {
                removeUnusedCss: options.removeUnusedCss,
                minifyCss: {}
            }
        );
    });

    it('should keep tag selectors based on the HTML', () => {
        const tagHtml = '<section><style>section{color:red}.unused{color:blue}</style></section><section>hi</section>';

        return init(
            tagHtml,
            '<section><style>section{color:red}</style></section><section>hi</section>',
            options
        );
    });

    it('should keep selectors from class names with newlines', () => {
        const newlineHtml = '<div class="a\nb"><style>.a{color:red}.b{color:blue}.c{color:green}</style></div>';

        return init(
            newlineHtml,
            '<div class="a\nb"><style>.a{color:red}.b{color:blue}</style></div>',
            options
        );
    });

    it('should retain attribute selectors, including boolean and case-insensitive attributes', () => {
        return init(
            '<style>[disabled]{color:red}[data-state="READY" i]{color:blue}[type="TEXT"]{margin:0}[missing]{color:green}</style><input disabled data-state="ready" type="text">',
            '<style>[disabled]{color:red}[data-state="READY" i]{color:blue}[type="TEXT"]{margin:0}</style><input disabled="" data-state="ready" type="text">',
            options
        );
    });

    it('should decode character references in classes and IDs', () => {
        return init(
            '<style>.a{color:red}.b{color:blue}#a\\&b{margin:0}.unused{color:green}</style><div class="a&#32;b" id="a&amp;b"></div>',
            '<style>.a{color:red}.b{color:blue}#a\\&b{margin:0}</style><div class="a&#32;b" id="a&amp;b"></div>',
            options
        );
    });

    it('should not decode attributes twice when the parser decodes entities', () => {
        return initWithPostHtmlOptions(
            '<style>.a\\&copy\\;{color:red}.unused{color:blue}</style><div class="a&amp;copy;"></div>',
            '<style>.a\\&copy\\;{color:red}</style><div class="a&copy;"></div>',
            options,
            { decodeEntities: true }
        );
    });

    it('should use only ASCII whitespace to split classes and keep IDs intact', () => {
        return init(
            '<style>.a\\a0 b{color:red}#a\\ b{margin:0}.a{color:blue}#b{color:green}</style><div class="a&nbsp;b" id="a b"></div>',
            '<style>.a\\a0 b{color:red}#a\\ b{margin:0}</style><div class="a&nbsp;b" id="a b"></div>',
            options
        );
    });

    it('should retain selectors for omitted document elements', () => {
        return init(
            '<style>html body div{color:red}head{margin:0}.unused{color:blue}</style><div></div>',
            '<style>html body div{color:red}head{margin:0}</style><div></div>',
            options
        );
    });

    it('should handle large class lists without exceeding the argument limit', () => {
        const classes = 'a '.repeat(150000);
        return init(
            `<style>.a{color:red}.unused{color:blue}</style><div class="${classes}"></div>`,
            `<style>.a{color:red}</style><div class="${classes}"></div>`,
            options
        );
    });

    it('should not execute scripts while extracting selectors', () => {
        const script = '<script>document.querySelector("div").className="unused"</script>';
        return init(
            `<style>.a{color:red}.unused{color:blue}</style><div class="a"></div>${script}`,
            `<style>.a{color:red}</style><div class="a"></div>${script}`,
            options
        );
    });

    const resourceOptions = {
        removeUnusedCss: {
            tool: 'purgeCSS' as const,
            keyframes: true,
            fontFace: true,
            variables: true
        }
    };
    const definitions = '@keyframes spin{to{opacity:0}}@font-face{font-family:Foo;src:url(foo.woff)}:root{--color:red}';
    const declarations = 'animation:spin 1s;font-family:Foo;color:var(--color)';

    it('should preserve definitions used in another style block', () => {
        return init(
            `<style>${definitions}.unused{color:blue}</style><style>div{${declarations}}</style><div></div>`,
            `<style>${definitions}</style><style>div{${declarations}}</style><div></div>`,
            resourceOptions
        );
    });

    it('should preserve definitions used in style attributes', () => {
        return init(
            `<style>${definitions}.unused{color:blue}</style><div style="${declarations}"></div>`,
            `<style>${definitions}</style><div style="${declarations}"></div>`,
            resourceOptions
        );
    });

    it('should still remove unused definitions in a single style block', () => {
        return init(
            `<style>${definitions}@keyframes unused{to{opacity:1}}@font-face{font-family:Unused;src:url(unused.woff)}:root{--unused:blue}div{${declarations}}</style><div></div>`,
            `<style>${definitions}:root{}div{${declarations}}</style><div></div>`,
            resourceOptions
        );
    });

    it('should remove empty CDATA styles without rejecting', () => {
        return init('<style><![CDATA[]]></style><div></div>', '<div></div>', options);
    });

    it('should skip non-css style types', () => {
        const lessHtml = '<style type="text/less">.unused{color:red}</style><div></div>';

        return init(
            lessHtml,
            lessHtml,
            options
        );
    });
});
