import { expect } from 'expect';
import posthtml from 'posthtml';
import { init } from '../htmlnano.ts';
import safePreset from '../../dist/presets/safe.mjs';
import minifyCssModule, { getInlineCssnanoOptions } from '../../src/_modules/minifyCss.ts';
import type { PostHTMLTreeLike } from '../../src/types.ts';
import type { Options as CssnanoOptions } from 'cssnano';

describe('minifyCss', function () {
    this.timeout(3000);

    const options = {
        minifyCss: safePreset.minifyCss
    };
    const html = `<div><style>
        h1 {
            margin: 10px 10px 10px 10px;
            color: #ff0000;
            -moz-border-radius: 10px;
            border-radius: 10px;
        }
    </style></div>`;
    const svg = `<svg><style>
        <![CDATA[
            h1 {
                margin: 10px 10px 10px 10px;
                color: #ff0000;
                -moz-border-radius: 10px;
                border-radius: 10px;
            }
        ]]>
    </style></svg>`;

    it('should minify CSS inside <style>', () => {
        return init(
            html,
            '<div><style>h1{margin:10px;color:red;-moz-border-radius:10px;border-radius:10px}</style></div>',
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

    it('should pass options to cssnano', () => {
        return init(
            html,
            '<div><style>h1{margin:10px;color:#ff0000;-moz-border-radius:10px;border-radius:10px}</style></div>',
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
                normalizeUnicode: false
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
                normalizeUnicode: false
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
                normalizeUnicode: false
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
                normalizeUnicode: false
            }]
        });
    });

    it('should leave non-default presets untouched', () => {
        const customPresetOptions = {
            preset: ['lite', {}]
        };

        expect(getInlineCssnanoOptions(customPresetOptions)).toBe(customPresetOptions);
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
                normalizeUnicode: false
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
            '<svg><style><![CDATA[h1{margin:10px;color:red;-moz-border-radius:10px;border-radius:10px}]]></style></svg>',
            options
        );
    });
});
