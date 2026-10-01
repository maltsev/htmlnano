import { expect } from 'expect';
import { init } from '../htmlnano.ts';
import htmlnano from '../../dist/index.mjs';
import safePreset from '../../dist/presets/safe.mjs';
import maxPreset from '../../dist/presets/max.mjs';
import { parse } from 'parse5';
import type { DefaultTreeAdapterTypes } from 'parse5';
import type { HtmlnanoOptions } from '../../src/types.ts';
import type { Config as SvgoConfig, PluginInfo } from 'svgo';

describe('minifySvg', () => {
    const options = {
        minifySvg: safePreset.minifySvg as SvgoConfig
    };
    const svg = `<svg version="1.1" baseProfile="full" width="300" height="200" xmlns="http://www.w3.org/2000/svg">
        <g>
            <rect width="100%" height="100%" fill="red" />

            <circle cx="150" cy="100" r="80" fill="green" />

            <text id="myText" x="150" y="125" font-size="60" text-anchor="middle" fill="white">SVG</text>

            <use href="#myText" x="2" y="2"></use>
        </g>
    </svg>`;

    const svgContainsCDATA = `<svg xmlns='http://www.w3.org/2000/svg'>
        <style><![CDATA[
            .label {
                color: red
            }
        ]]></style>
        <text class="label">example</text>
        <text class="label">example</text>
    </svg>
    <svg xmlns='http://www.w3.org/2000/svg'>
        <script>//<![CDATA[
            const x = '<>';
        //]]></script>
    </svg>`;

    const svgContainsForeignObject = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
    <foreignObject width="256" height="256">
        <input/>
    </foreignObject>
  </svg>`;
    const minifiedSvgContainsForeignObject = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><foreignObject width="256" height="256"><input/></foreignObject></svg>';

    const sprite = '<symbol id="icon-sun" viewBox="0 0 16 16"><circle cx="8" cy="8" r="4"/></symbol>';
    const sharedDefinitions = [
        {
            name: 'hidden sprite',
            html: `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${sprite}</svg><svg width="16" height="16"><use href="#icon-sun"/></svg>`,
            id: 'icon-sun',
            tag: 'symbol',
            reference: '#icon-sun'
        },
        {
            name: 'zero-size sprite',
            html: `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0">${sprite}</svg><svg width="16" height="16"><use href="#icon-sun"/></svg>`,
            id: 'icon-sun',
            tag: 'symbol',
            reference: '#icon-sun'
        },
        {
            name: 'shared gradient',
            html: '<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"><stop offset="0" stop-color="red"/></linearGradient></defs></svg><svg width="16" height="16"><rect width="16" height="16" fill="url(#g)"/></svg>',
            id: 'g',
            tag: 'linearGradient',
            reference: 'url(#g)'
        },
        {
            name: 'sprite with xlink references',
            html: `<svg xmlns="http://www.w3.org/2000/svg" display="none">${sprite}</svg><svg xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="#icon-sun"/></svg>`,
            id: 'icon-sun',
            tag: 'symbol',
            reference: '#icon-sun'
        },
        {
            name: 'sprite styled by an ID selector',
            html: `<svg><style>#icon-sun{fill:red}</style>${sprite}</svg><svg><use href="#icon-sun"/></svg>`,
            id: 'icon-sun',
            tag: 'symbol',
            reference: '#icon-sun'
        }
    ];
    const configurations: { name: string; options: HtmlnanoOptions; preset?: Record<string, never> }[] = [
        { name: 'default safe preset', options: {} },
        { name: 'safe SVG options', options, preset: {} },
        { name: 'max SVG options', options: { minifySvg: maxPreset.minifySvg }, preset: {} },
        { name: 'boolean SVG options', options: { minifySvg: true }, preset: {} },
        { name: 'string SVGO preset', options: { minifySvg: { plugins: ['preset-default'] } }, preset: {} },
        { name: 'object SVGO preset', options: { minifySvg: { plugins: [{ name: 'preset-default' }] } }, preset: {} }
    ];

    // https://github.com/maltsev/htmlnano/issues/464
    for (const configuration of configurations) {
        for (const fixture of sharedDefinitions) {
            it(`should preserve ${fixture.name} with ${configuration.name}`, async () => {
                const { html } = await htmlnano.process(fixture.html, {
                    ...configuration.options,
                    skipConfigLoading: true
                }, configuration.preset);
                const elements = parseElements(html);
                const definition = elements.find(node => node.attrs.some(attr => attr.name === 'id' && attr.value === fixture.id));

                expect(definition?.tagName).toBe(fixture.tag);
                expect(definition?.childNodes.length).toBeGreaterThan(0);
                expect(elements.some(node => node.attrs.some(attr => attr.value === fixture.reference))).toBe(true);
            });
        }
    }

    it('should preserve distinct IDs and local references across SVGs and HTML', async () => {
        function gradient(id: string, color: string): string {
            return `<svg><defs><linearGradient id="${id}"><stop stop-color="${color}"/></linearGradient></defs><rect width="16" height="16" fill="url(#${id})"/></svg>`;
        }
        const input = `<div id="a"></div>${gradient('first', 'red')}${gradient('second', 'blue')}`;
        const { html } = await htmlnano.process(input, { skipConfigLoading: true });
        const attributes = parseElements(html).flatMap(node => node.attrs);

        expect(attributes.filter(attr => attr.name === 'id').map(attr => attr.value)).toEqual(['a', 'first', 'second']);
        expect(attributes.filter(attr => attr.name === 'fill').map(attr => attr.value)).toEqual(['url(#first)', 'url(#second)']);
    });

    it('should preserve SVG IDs referenced from HTML, CSS, and JavaScript', async () => {
        const input = '<a href="#icon">Icon</a><style>#icon{fill:red}</style><script>document.getElementById("icon")</script><svg><circle id="icon" r="4"/></svg>';
        const { html } = await htmlnano.process(input, { minifySvg: {}, skipConfigLoading: true }, {});
        const elements = parseElements(html);

        expect(elements.find(node => node.tagName === 'circle')?.attrs).toContainEqual({ name: 'id', value: 'icon' });
        expect(elements.find(node => node.tagName === 'a')?.attrs).toContainEqual({ name: 'href', value: '#icon' });
        expect(html).toContain('#icon{fill:red}');
        expect(html).toContain('document.getElementById("icon")');
    });

    it('should honor explicit preset overrides without changing caller options', async () => {
        const svgoOptions: SvgoConfig = Object.freeze({
            multipass: false,
            plugins: [Object.freeze({
                name: 'preset-default',
                params: Object.freeze({
                    floatPrecision: 1,
                    overrides: Object.freeze({ convertColors: false })
                })
            })]
        });
        const input = '<svg><circle id="icon" cx="1.23456" r="4" fill="#ff0000"/></svg>';
        const { html } = await htmlnano.process(input, { minifySvg: svgoOptions, skipConfigLoading: true }, {});
        const circle = parseElements(html).find(node => node.tagName === 'circle');

        expect(circle?.attrs).toEqual(expect.arrayContaining([
            { name: 'id', value: 'icon' },
            { name: 'cx', value: '1.2' },
            { name: 'fill', value: '#ff0000' }
        ]));
        expect(svgoOptions.plugins).toEqual([{
            name: 'preset-default',
            params: { floatPrecision: 1, overrides: { convertColors: false } }
        }]);
    });

    for (const plugins of [
        [{ name: 'preset-default', params: { overrides: { cleanupIds: {} } } }],
        ['preset-default', 'cleanupIds']
    ] as NonNullable<SvgoConfig['plugins']>[]) {
        it(`should allow explicitly enabling ID cleanup with ${typeof plugins[0]} plugin options`, async () => {
            const input = '<svg><circle id="icon" r="4"/><use href="#icon"/></svg>';
            const { html } = await htmlnano.process(input, { minifySvg: { plugins }, skipConfigLoading: true }, {});
            const attributes = parseElements(html).flatMap(node => node.attrs);

            expect(attributes).toContainEqual({ name: 'id', value: 'a' });
            expect(attributes).toContainEqual({ name: 'href', value: '#a' });
        });
    }

    it('should allow explicitly enabling removal of hidden elements', async () => {
        const { html } = await htmlnano.process(sharedDefinitions[0].html, {
            minifySvg: {
                plugins: [{ name: 'preset-default', params: { overrides: { removeHiddenElems: {} } } }]
            },
            skipConfigLoading: true
        }, {});

        expect(parseElements(html).some(node => node.tagName === 'symbol')).toBe(false);
    });

    it('should allow explicitly enabling removal of useless definitions', () => {
        return init(
            '<svg><defs><circle r="4"/></defs></svg>',
            '<svg/>',
            { minifySvg: { plugins: [{ name: 'preset-default', params: { overrides: { removeUselessDefs: {} } } }] } }
        );
    });

    it('should honor an empty plugin list', () => {
        const input = '<svg><circle id="icon" r="4" fill="#ff0000"/></svg>';
        return init(input, input, { minifySvg: { plugins: [] } });
    });

    it('should honor custom plugins and disabled multipass', async () => {
        let calls = 0;
        await init('<svg/>', '<svg/>', {
            minifySvg: {
                multipass: false,
                plugins: [{
                    name: 'preset-default',
                    params: { marker: 'custom' },
                    fn(_root, params: { marker: string }, info: PluginInfo) {
                        expect(params).toEqual({ marker: 'custom' });
                        expect(info.multipassCount).toBe(0);
                        calls += 1;
                    }
                }]
            }
        });
        expect(calls).toBe(1);
    });

    it('should minify SVG inside <svg>', () => {
        return init(
            svg,

            '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" baseProfile="full"><g><rect width="100%" height="100%" fill="red"/><circle cx="150" cy="100" r="80" fill="green"/><text id="myText" x="150" y="125" fill="#fff" font-size="60" text-anchor="middle">SVG</text><use x="2" y="2" href="#myText"/></g></svg>',

            options
        );
    });

    it('should not minify SVG colors if this option is disabled', () => {
        return init(
            svg,

            '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" baseProfile="full"><rect width="100%" height="100%" fill="red"/><circle cx="150" cy="100" r="80" fill="green"/><text id="myText" x="150" y="125" fill="white" font-size="60" text-anchor="middle">SVG</text><use x="2" y="2" href="#myText"/></svg>',

            {
                minifySvg: {
                    plugins: [
                        {
                            name: 'preset-default',
                            params: {
                                overrides: {
                                    convertColors: false
                                }
                            }
                        }
                    ]
                } as SvgoConfig
            }
        );
    });

    it('should collapse useless <g> groups with max preset', () => {
        return init(
            svg,

            '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" baseProfile="full"><rect width="100%" height="100%" fill="red"/><circle cx="150" cy="100" r="80" fill="green"/><text id="myText" x="150" y="125" fill="#fff" font-size="60" text-anchor="middle">SVG</text><use x="2" y="2" href="#myText"/></svg>',

            { minifySvg: maxPreset.minifySvg as SvgoConfig }
        );
    });

    it('should support boolean minifySvg options', () => {
        return init(
            svg,

            '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" baseProfile="full"><rect width="100%" height="100%" fill="red"/><circle cx="150" cy="100" r="80" fill="green"/><text id="myText" x="150" y="125" fill="#fff" font-size="60" text-anchor="middle">SVG</text><use x="2" y="2" href="#myText"/></svg>',

            { minifySvg: true }
        );
    });

    // https://github.com/maltsev/htmlnano/issues/88
    it('should work with <svg> with <script> inside (issue #88)', () => {
        return init(
            svgContainsCDATA,
            // The CDATA inside <style> has been stripped by SVGO, because SVGO determines that there is no CSS that needs to be escaped, thus no CDATA is required.
            '<svg xmlns="http://www.w3.org/2000/svg"><style>.label{color:red}</style><text class="label">example</text><text class="label">example</text></svg>\n    <svg xmlns="http://www.w3.org/2000/svg"><script>/*<![CDATA[*/const x="<>";/*]]>*/</script></svg>',

            {
                minifyCss: {
                    preset: 'default'
                },
                minifyJs: {},
                minifySvg: maxPreset.minifySvg as SvgoConfig
            }
        );
    });

    // https://github.com/maltsev/htmlnano/issues/129
    it('should work with <foreignObject>', () => {
        return init(
            svgContainsForeignObject,
            minifiedSvgContainsForeignObject,
            options
        );
    });

    // https://github.com/maltsev/htmlnano/issues/197
    it('shouldn\'t choke on svg errors', () => {
        const input = `
        <!doctype html>
        <svg viewBox="0 0 100 100">
            <text x="20" y="20" style="fill: black;">&cross;</text>
        </svg>
        `;
        return init(
            input,
            input,
            {
                minifySvg: {}
            }
        );
    });

    it('should return original svg and report non-parser errors', async () => {
        const input = '<svg xmlns="http://www.w3.org/2000/svg"><path d=""/></svg>';
        const originalConsoleError = console.error;
        let errorCalls = 0;
        console.error = () => {
            errorCalls += 1;
        };

        try {
            await init(
                input,
                input,
                {
                    minifySvg: {
                        plugins: [
                            {
                                name: 'nonexistent-plugin'
                            }
                        ]
                    } as SvgoConfig
                }
            );
        } finally {
            console.error = originalConsoleError;
        }

        expect(errorCalls).toBe(2);
    });

    it('should skip svg error reporting when skipInternalWarnings is true', async () => {
        const input = '<svg xmlns="http://www.w3.org/2000/svg"><path d=""/></svg>';
        const originalConsoleError = console.error;
        let errorCalls = 0;
        console.error = () => {
            errorCalls += 1;
        };

        try {
            await init(
                input,
                input,
                {
                    skipInternalWarnings: true,
                    minifySvg: {
                        plugins: [
                            {
                                name: 'nonexistent-plugin'
                            }
                        ]
                    } as SvgoConfig
                }
            );
        } finally {
            console.error = originalConsoleError;
        }

        expect(errorCalls).toBe(0);
    });
});

function parseElements(html: string): DefaultTreeAdapterTypes.Element[] {
    const elements: DefaultTreeAdapterTypes.Element[] = [];

    function visit(node: DefaultTreeAdapterTypes.Node): void {
        if ('tagName' in node) {
            elements.push(node);
        }
        if ('childNodes' in node) {
            node.childNodes.forEach(visit);
        }
    }

    visit(parse(html));
    return elements;
}
