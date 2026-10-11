import { expect } from 'expect';
import posthtml from 'posthtml';
import { init } from '../htmlnano.ts';
import safePreset from '../../dist/presets/safe.mjs';
import maxPreset from '../../dist/presets/max.mjs';
import htmlnano from '../../dist/index.mjs';
import { CssSyntaxError } from 'postcss';
import minifyCssModule, { getInlineCssnanoOptions } from '../../src/_modules/minifyCss.ts';
import type { PostHTMLTreeLike } from '../../src/types.ts';
import type { Options as CssnanoOptions } from 'cssnano';
import type { Plugin, Result } from 'postcss';

describe('minifyCss', function () {
    this.timeout(3000);

    const options = {
        minifyCss: safePreset.minifyCss
    };
    const html = `<div><style>
        h1 {
            -moz-border-radius: 10px;
            border-radius: 10px;
            color: #ff0000;
            margin: 10px 10px 10px 10px;
        }
    </style></div>`;
    const svg = `<svg><style>
        <![CDATA[
            h1 {
                -moz-border-radius: 10px;
                border-radius: 10px;
                color: #ff0000;
                margin: 10px 10px 10px 10px;
            }
        ]]>
    </style></svg>`;

    it('should minify CSS inside <style>', () => {
        return init(
            html,
            '<div><style>h1{-moz-border-radius:10px;border-radius:10px;color:red;margin:10px}</style></div>',
            options
        );
    });

    it('should not minify CSS inside <style> + SRI', () => {
        const html = `<div><style integrity="example">
        h1 {
            margin: 10px 10px 10px 10px;
            color: #ff0000;
            -moz-border-radius: 10px;
            border-radius: 10px;
        }
    </style></div>`;
        return init(
            html,
            html,
            options
        );
    });

    it('should not minify style attributes when integrity is present', () => {
        const html = '<div integrity="example" style="color: #ff0000; margin: 10px 10px 10px 10px"></div>';
        return init(
            html,
            html,
            options
        );
    });

    it('should minify CSS inside style attribute', () => {
        return init(
            '<div style="color: #ff0000; margin: 10px 10px 10px 10px"></div>',
            '<div style="color:red;margin:10px"></div>',
            options
        );
    });

    it('should do nothing if style attribute is empty', () => {
        return init(
            '<div style=""></div>',
            '<div style=""></div>',
            options
        );
    });

    it('should preserve independent inline styles when batching the default preset', async () => {
        const styles = [
            'color: #ff0000; margin: 10px 10px 10px 10px',
            'color: #0000ff; margin: 20px 20px 20px 20px',
            'color: #ff0000; margin: 10px 10px 10px 10px',
            '/* empty */',
            'color: red; color: blue; color: red !important',
            'column-width: 10px; column-count: 2',
            'column-width: auto',
            '--color: #ff0000; color: var(--color)',
            '--gap: ; margin: var(--gap, 0px)',
            'background: url("data:image/svg+xml,<svg>{;}</svg>")',
            'width: calc(100% - 10px); transform: translate(0px, 0px)',
            '/*! keep */ font-weight: normal; padding: 0px 0px 0px 0px'
        ];
        const html = styles.map(style => `<div style='${style}'></div>`).join('');
        const { tree } = await posthtml([]).process(html);
        const sourceTree = tree as PostHTMLTreeLike;
        // An explicit per-plugin options object retains separate processing.
        await minifyCssModule.default!(sourceTree, {}, { preset: ['default', {}] });

        await init(html, sourceTree.render(sourceTree), options);
    });

    it('should keep stylesheet and inline caches separate and preserve CDATA per node', () => {
        return init(
            '<style>a { color: #ff0000; }</style><svg><style><![CDATA[a { color: #ff0000; }]]></style></svg><div style="color: #ff0000;"></div><div style="color: #0000ff;"></div><div style="color: #ff0000;"></div>',
            '<style>a{color:red}</style><svg><style><![CDATA[a{color:red}]]></style></svg><div style="color:red"></div><div style="color:#00f"></div><div style="color:red"></div>',
            options
        );
    });

    it('should process nested inline rules separately', async () => {
        const html = '<div style="color: #ff0000; @media print { color: #0000ff; }"></div><div style="margin: 10px 10px 10px 10px"></div>';
        const { tree } = await posthtml([]).process(html);
        const sourceTree = tree as PostHTMLTreeLike;
        await minifyCssModule.default!(sourceTree, {}, { preset: ['default', {}] });

        await init(html, sourceTree.render(sourceTree), options);
    });

    it('should preserve invalid inline CSS while minifying valid styles in a batch', () => {
        return init(
            '<div style="color: #ff0000"></div><div style="color: blue; /* unclosed"></div><div style="margin: 10px 10px 10px 10px"></div><div style="color: blue; /* unclosed"></div>',
            '<div style="color:red"></div><div style="color: blue; /* unclosed"></div><div style="margin:10px"></div><div style="color: blue; /* unclosed"></div>',
            options
        );
    });

    for (const css of [
        ':root { --post-list medium-homepage-titleFont: normal 18px sans-serif; }',
        'a { color: red;',
        'a { color: "unterminated; }',
        '/* unclosed'
    ]) {
        it(`should preserve unparseable stylesheet CSS: ${css}`, () => {
            return init(
                `<style>${css}</style><style>a { color: #ff0000; }</style>`,
                `<style>${css}</style><style>a{color:red}</style>`,
                options
            );
        });
    }

    it('should preserve the original CDATA wrapper around invalid CSS', () => {
        const invalidStyle = '<svg><style> \n<![CDATA[a { color: red;]]> \n</style></svg>';
        return init(invalidStyle, invalidStyle, options);
    });

    it('should preserve invalid inline CSS when only one style needs processing', () => {
        const input = '<div style="color: blue; /* unclosed"></div>';
        return init(input, input, options);
    });

    it('should preserve invalid inline CSS with a custom preset', () => {
        return init(
            '<div style="color: #ff0000"></div><div style="color: blue; /* unclosed"></div>',
            '<div style="color:red"></div><div style="color: blue; /* unclosed"></div>',
            { minifyCss: { preset: ['default', {}] } }
        );
    });

    for (const error of [new Error('Plugin failed'), new CssSyntaxError('Plugin failed')]) {
        it(`should propagate ${error.name} from CSS plugins`, () => {
            function plugin(): Plugin {
                return {
                    postcssPlugin: 'throw-error',
                    Once() {
                        throw error;
                    }
                };
            }

            return expect(init('<style>a { color: red; }</style>', '', {
                minifyCss: { preset: { plugins: [] }, plugins: [plugin] }
            })).rejects.toBe(error);
        });
    }

    for (const [name, preset] of [['safe', safePreset], ['max', maxPreset]] as const) {
        it(`should preserve the malformed website declaration with the ${name} preset`, async () => {
            // Reduced from genocidewatch.com's inline stylesheet.
            const invalidCss = ':root { --post-list medium-homepage-titleFont: normal 18px sans-serif; }';
            const input = `<style media=screen>${invalidCss}</style><style media=print>a { color: #ff0000; }</style><a>Content</a>`;
            const result = await htmlnano.process(input, { skipConfigLoading: true }, preset);

            expect(result.html).toContain(invalidCss);
            expect(result.html).toContain('a{color:red}');
            expect(result.html).toContain('Content');
        });
    }

    for (const preset of [undefined, { plugins: [] }]) {
        it(`should preserve separate results for custom plugins and deduplicate identical inputs ${preset ? 'with' : 'without'} a preset`, async () => {
            const rootTypes: string[] = [];
            function plugin(): Plugin {
                return {
                    postcssPlugin: 'check-root',
                    prepare(result: Result) {
                        rootTypes.push(result.root.type);
                        return {
                            OnceExit(root) {
                                root.walkDecls((decl) => {
                                    decl.value = 'green';
                                });
                            }
                        };
                    }
                };
            }

            const cssnanoOptions = { plugins: [plugin], preset };
            const originalOptions = { plugins: [plugin], preset: preset ? { plugins: [] } : undefined };

            await init(
                '<style>a{color:red}</style><style>a{color:blue}</style><div style="color:red"></div><div style="color:blue"></div><div style="color:red"></div>',
                '<style>a{color:green}</style><style>a{color:green}</style><div style="color:green"></div><div style="color:green"></div><div style="color:green"></div>',
                { minifyCss: cssnanoOptions }
            );
            expect(rootTypes).toEqual(['root', 'root', 'root', 'root']);
            expect(cssnanoOptions).toEqual(originalOptions);
        });
    }

    for (const [description, html, expectedCalls] of [
        ['no CSS', '<p>Hello</p>', 0],
        ['skipped CSS', '<style amp-boilerplate="">body{color:red}</style><style type="text/less">a{color:red}</style><div integrity="x" style="color:red"></div>', 0],
        ['empty CSS', '<style> </style><div style=" "></div>', 0],
        ['only a stylesheet', '<style>a{color:red}</style>', 1],
        ['only inline CSS', '<div style="color:red"></div>', 1]
    ] as const) {
        it(`should initialize only the needed processors for ${description}`, async () => {
            let calls = 0;
            function presetFactory() {
                calls++;
                return { plugins: [] };
            }

            await init(html, html, { minifyCss: { preset: presetFactory } });
            expect(calls).toBe(expectedCalls);
        });
    }

    it('should pass options to cssnano', () => {
        return init(
            html,
            '<div><style>h1{-moz-border-radius:10px;border-radius:10px;color:#ff0000;margin:10px}</style></div>',
            {
                minifyCss: {
                    preset: ['default', {
                        colormin: false
                    }]
                }
            }
        );
    });

    it('should pass options to cssnano for style attributes', () => {
        return init(
            '<div style="color: #ff0000; margin: 10px 10px 10px 10px"></div>',
            '<div style="color:#ff0000;margin:10px"></div>',
            {
                minifyCss: {
                    preset: ['default', {
                        colormin: false
                    }]
                }
            }
        );
    });

    it('should preserve explicit inline plugin config overrides for default preset', () => {
        expect(getInlineCssnanoOptions({
            preset: ['default', {
                mergeRules: {},
                minifySelectors: {},
                uniqueSelectors: {}
            }]
        })).toEqual({
            preset: ['default', {
                mergeRules: {},
                minifySelectors: {},
                minifyParams: false,
                normalizeCharset: false,
                uniqueSelectors: {},
                normalizeUnicode: false,
                reduceIdents: false,
                zindex: false
            }]
        });
    });

    it('should leave custom cssnano plugins config untouched', () => {
        const customPluginsConfig = {
            plugins: [['postcss-discard-comments', { removeAll: true }]]
        };

        expect(getInlineCssnanoOptions(customPluginsConfig)).toBe(customPluginsConfig);
    });

    it('should use inline exclusions when cssnano options are missing', () => {
        expect(getInlineCssnanoOptions(undefined)).toEqual({
            preset: ['default', {
                mergeRules: false,
                minifySelectors: false,
                minifyParams: false,
                normalizeCharset: false,
                uniqueSelectors: false,
                normalizeUnicode: false,
                reduceIdents: false,
                zindex: false
            }]
        });
    });

    it('should add inline exclusions when preset is omitted', () => {
        expect(getInlineCssnanoOptions({
            discardComments: {
                removeAll: true
            }
        })).toEqual({
            discardComments: {
                removeAll: true
            },
            preset: ['default', {
                mergeRules: false,
                minifySelectors: false,
                minifyParams: false,
                normalizeCharset: false,
                uniqueSelectors: false,
                normalizeUnicode: false,
                reduceIdents: false,
                zindex: false
            }]
        });
    });

    it('should normalize shorthand default preset config for inline styles', () => {
        expect(getInlineCssnanoOptions({
            preset: 'default'
        })).toEqual({
            preset: ['default', {
                mergeRules: false,
                minifySelectors: false,
                minifyParams: false,
                normalizeCharset: false,
                uniqueSelectors: false,
                normalizeUnicode: false,
                reduceIdents: false,
                zindex: false
            }]
        });
    });

    it('should add inline exclusions to non-default presets', () => {
        expect(getInlineCssnanoOptions({
            preset: ['advanced', { zindex: {} }]
        })).toEqual({
            preset: ['advanced', {
                mergeRules: false,
                minifySelectors: false,
                minifyParams: false,
                normalizeCharset: false,
                uniqueSelectors: false,
                normalizeUnicode: false,
                reduceIdents: false,
                zindex: {}
            }]
        });
    });

    it('should add inline exclusions to a shorthand non-default preset', () => {
        expect(getInlineCssnanoOptions({
            preset: 'advanced'
        })).toEqual({
            preset: ['advanced', {
                mergeRules: false,
                minifySelectors: false,
                minifyParams: false,
                normalizeCharset: false,
                uniqueSelectors: false,
                normalizeUnicode: false,
                reduceIdents: false,
                zindex: false
            }]
        });
    });

    it('should add inline exclusions to a preset passed as a factory', () => {
        function presetFactory() {
            return { plugins: [] };
        }

        expect(getInlineCssnanoOptions({ preset: presetFactory })).toEqual({
            preset: [presetFactory, {
                mergeRules: false,
                minifySelectors: false,
                minifyParams: false,
                normalizeCharset: false,
                uniqueSelectors: false,
                normalizeUnicode: false,
                reduceIdents: false,
                zindex: false
            }]
        });
    });

    it('should leave a preset given as a plugin list untouched', () => {
        const customPresetOptions = {
            preset: { plugins: [] }
        };

        expect(getInlineCssnanoOptions(customPresetOptions)).toBe(customPresetOptions);
    });

    it('should pass the inline exclusions to a custom preset for style attributes only', async () => {
        const receivedOptions: unknown[] = [];

        function presetFactory(presetOptions: unknown) {
            receivedOptions.push(presetOptions);
            return { plugins: [] };
        }

        await init(
            '<style>h1{color:red}</style><div style="z-index:9999"></div>',
            '<style>h1{color:red}</style><div style="z-index:9999"></div>',
            { minifyCss: { preset: presetFactory } }
        );

        expect(receivedOptions).toContainEqual({
            mergeRules: false,
            minifySelectors: false,
            minifyParams: false,
            normalizeCharset: false,
            uniqueSelectors: false,
            normalizeUnicode: false,
            reduceIdents: false,
            zindex: false
        });
        expect(receivedOptions).toContainEqual({});
    });

    it('should ignore non-object default preset options when building inline config', () => {
        const invalidPresetOptions = {
            preset: ['default', true]
        } as unknown as CssnanoOptions;

        expect(getInlineCssnanoOptions(invalidPresetOptions)).toEqual({
            preset: ['default', {
                mergeRules: false,
                minifySelectors: false,
                minifyParams: false,
                normalizeCharset: false,
                uniqueSelectors: false,
                normalizeUnicode: false,
                reduceIdents: false,
                zindex: false
            }]
        });
    });

    it('should skip empty inline and style-node content in source module execution', async () => {
        const html = '<style>   </style><div style=""></div><div integrity="example" style="color: #ff0000"></div>';
        const { tree } = await posthtml([]).process(html);
        const sourceTree = tree as PostHTMLTreeLike;

        const result = await minifyCssModule.default!(sourceTree, {}, safePreset.minifyCss);

        expect(result.render(result)).toBe(html);
    });

    it('should process style nodes and style attributes in source module execution', async () => {
        const html = '<style>h1 { color: #ff0000; margin: 10px 10px 10px 10px; }</style><div style="color: #ff0000; margin: 10px 10px 10px 10px"></div><div style="color: #ff0000; margin: 10px 10px 10px 10px"></div>';
        const { tree } = await posthtml([]).process(html);
        const sourceTree = tree as PostHTMLTreeLike;

        await minifyCssModule.default!(sourceTree, {}, safePreset.minifyCss);

        expect(sourceTree.render(sourceTree)).toBe('<style>h1{color:red;margin:10px}</style><div style="color:red;margin:10px"></div><div style="color:red;margin:10px"></div>');
    });

    it('should not minify CSS inside HTML comments', () => {
        return init(
            '<div><!-- <style>h1 { color: red; }</style> --></div>',
            '<div><!-- <style>h1 { color: red; }</style> --></div>',
            options
        );
    });

    it('should ignore AMP boilerplate', () => {
        const amphtml = '<style amp-boilerplate="">\nh1{color:red}</style>';
        return init(
            amphtml,
            amphtml,
            options
        );
    });

    it('should skip non-css <style> types', () => {
        const html = '<style type="text/less">h1 { color: #ff0000; margin: 10px 10px 10px 10px; }</style>';
        return init(
            html,
            html,
            options
        );
    });

    it('should minify <style> with text/css type', () => {
        return init(
            '<style type="text/css; charset=utf-8">h1 { color: #ff0000; margin: 10px 10px 10px 10px; }</style>',
            '<style type="text/css; charset=utf-8">h1{color:red;margin:10px}</style>',
            options
        );
    });

    it('should keep CSS inside SVG wrapped in CDATA', () => {
        return init(
            svg,
            '<svg><style><![CDATA[h1{-moz-border-radius:10px;border-radius:10px;color:red;margin:10px}]]></style></svg>',
            options
        );
    });
});
