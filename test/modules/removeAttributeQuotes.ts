import { init, initIdempotent } from '../htmlnano.ts';
import safePreset from '../../dist/presets/safe.mjs';
import htmlnano from '../../dist/index.mjs';
import type { HtmlnanoOptions } from '../../src/types.js';
import { parseFragment } from 'parse5';
import type { DefaultTreeAdapterTypes } from 'parse5';

import { expect } from 'expect';

describe('removeAttributeQuotes', () => {
    const options = safePreset as HtmlnanoOptions;
    const html = '<div class="foo" title="hello world"></div>';

    it('should be enabled in the safe preset', () => {
        expect(safePreset.removeAttributeQuotes).toBe(true);
    });

    it('default behavior', () => {
        return init(
            html,
            '<div class=foo title="hello world"></div>',
            options
        );
    });

    it('shouldn\'t override exists options', () => {
        return initIdempotent(
            html,
            html,
            options,
            { quoteAllAttributes: true }
        );
    });

    it('should force override quoteAllAttributes', () => {
        const forceOptions = { ...safePreset, removeAttributeQuotes: { force: true } } as HtmlnanoOptions;

        return initIdempotent(
            html,
            '<div class=foo title="hello world"></div>',
            forceOptions,
            { quoteAllAttributes: true }
        );
    });

    it('should keep quotes around values containing spaces', () => {
        return init(
            '<div title="hello world"></div>',
            '<div title="hello world"></div>',
            options
        );
    });

    it('should keep quotes around values containing quotes', () => {
        return init(
            '<div data-x="it\'s"></div>',
            '<div data-x="it\'s"></div>',
            options
        );
    });

    it('should keep quotes around values containing ">"', () => {
        return init(
            '<div data-x="a>b"></div>',
            '<div data-x="a>b"></div>',
            options
        );
    });

    it('should keep quotes around values containing "="', () => {
        return init(
            '<div data-x="a=b"></div>',
            '<div data-x="a=b"></div>',
            options
        );
    });

    it('should render empty values safely (bare attribute)', () => {
        // posthtml-render emits empty-valued attributes without a value, which is safe
        return init(
            '<div data-x=""></div>',
            '<div data-x></div>',
            options
        );
    });

    it('should remove quotes for safe values', () => {
        return init(
            '<div class="foo" id="bar"></div>',
            '<div class=foo id=bar></div>',
            options
        );
    });

    for (const removeAttributeQuotes of [true, { force: true }] as const) {
        it(`keeps required XML quotes with ${JSON.stringify(removeAttributeQuotes)}`, () => {
            const xml = '<root value="safe" empty=""><child value="other"></child></root>';
            return initIdempotent(xml, xml, { removeAttributeQuotes }, { xmlMode: true });
        });
    }

    it('preserves all HTML whitespace and delimiters inside attribute values', () => {
        const values = ['a b', 'a\tb', 'a\nb', 'a\fb', 'a\rb', 'a"b', 'a\'b', 'a`b', 'a=b', 'a<b', 'a>b'];
        const html = '<div' + values.map((value, index) => ` data-${index}="${value.replace(/"/g, '&quot;')}"`).join('') + '></div>';

        return initIdempotent(html, html, { removeAttributeQuotes: true });
    });

    it('separates unquoted URL values from a self-closing slash', () => {
        return initIdempotent(
            '<img src="/images/icon/" />',
            '<img src=/images/icon/ />',
            { removeAttributeQuotes: true },
            { closingSingleTag: 'slash' }
        );
    });

    it('force:true should override a user-provided quoteAllAttributes:true', () => {
        const forceOptions = { ...safePreset, removeAttributeQuotes: { force: true } } as HtmlnanoOptions;

        return initIdempotent(
            '<div class="foo"></div>',
            '<div class=foo></div>',
            forceOptions,
            { quoteAllAttributes: true }
        );
    });

    it('without force, the user-provided quoteAllAttributes:true wins', () => {
        return initIdempotent(
            '<div class="foo"></div>',
            '<div class="foo"></div>',
            options,
            { quoteAllAttributes: true }
        );
    });

    it('should interact with removeEmptyAttributes', () => {
        // safe preset removes empty style/class-like attributes; remaining ones stay quoted when empty
        return initIdempotent(
            '<div style="" class="foo"></div>',
            '<div class=foo></div>',
            options
        );
    });

    it('should interact with collapseBooleanAttributes', () => {
        return initIdempotent(
            '<input disabled="disabled" name="foo">',
            '<input disabled name=foo>',
            options
        );
    });

    it('should handle event-handler output', () => {
        return initIdempotent(
            '<button onclick="alert(1); return false"></button>',
            '<button onclick="return alert(1),!1;"></button>',
            options
        );
    });

    it('should keep JSON-like attribute values quoted', () => {
        return initIdempotent(
            '<div data-config=\'{"enabled":true}\'></div>',
            '<div data-config=\'{"enabled":true}\'></div>',
            options
        );
    });

    it('should preserve quotes added by SVG minification', () => {
        return initIdempotent(
            '<svg viewBox="0 0 10 10"><path d="M0 0h10v10z" fill="red"/></svg>',
            '<svg viewBox="0 0 10 10"><path fill="red" d="M0 0h10v10z"/></svg>',
            options
        );
    });

    it('should remove optional quotes from custom and data attributes', () => {
        return initIdempotent(
            '<x-card custom-attribute="enabled" data-state="ready"></x-card>',
            '<x-card custom-attribute=enabled data-state=ready></x-card>',
            options
        );
    });

    it('keeps reference-minified delimiters quoted and removes safe attribute quotes', () => {
        const input = '<div title="it&#39;s" data-double="say &quot;hi&quot;"'
            + ' data-amp="rock&amp;roll" data-lt="a&lt;b" data-gt="a&gt;b"'
            + ' data-json="{&quot;a&quot;:&#39;b&#39;}"></div>';
        const expected = '<div title="it\'s" data-double="say &quot;hi&quot;"'
            + ' data-amp=rock&roll data-lt="a<b" data-gt="a>b"'
            + ' data-json=\'{"a":&#39;b&#39;}\'></div>';

        return initIdempotent(input, expected, {
            minifyCharacterReferences: true,
            removeAttributeQuotes: true
        });
    });

    const quoteStyleCases = [
        {
            name: 'smart quotes without replacement',
            postHtmlOptions: { quoteStyle: 0, replaceQuote: false },
            expected: '<div title=\'it&#39;s "quoted"\' data-json=\'{"a":&#39;b&#39;}\'></div>'
        },
        {
            name: 'single quotes with replacement',
            postHtmlOptions: { quoteStyle: 1, replaceQuote: true },
            expected: '<div title=\'it&#39;s &quot;quoted&quot;\' data-json=\'{"a":&#39;b&#39;}\'></div>'
        },
        {
            name: 'double quotes with replacement',
            postHtmlOptions: { quoteStyle: 2, replaceQuote: true },
            expected: '<div title="it\'s &quot;quoted&quot;" data-json=\'{"a":&#39;b&#39;}\'></div>'
        }
    ] as const;

    for (const { name, postHtmlOptions, expected } of quoteStyleCases) {
        it(`respects ${name} after character-reference minification`, () => {
            const input = '<div title="it&#39;s &quot;quoted&quot;"'
                + ' data-json="{&quot;a&quot;:&#39;b&#39;}"></div>';

            return initIdempotent(input, expected, {
                minifyCharacterReferences: true,
                removeAttributeQuotes: true
            }, postHtmlOptions);
        });
    }

    const injectionCases = [
        {
            name: 'single quotes',
            input: '<div data-x="\' onmouseover=alert(1) x=\'"></div>',
            postHtmlOptions: { quoteStyle: 1 }
        },
        {
            name: 'JSON values',
            input: '<div data-x="{&quot;a&quot;:&quot;\' onmouseover=alert(1) x=\'&quot;}"></div>',
            postHtmlOptions: {}
        },
        {
            name: 'smart quotes with decoded entities',
            input: '<div data-x="&quot;\' onmouseover=alert(1) x=\'"></div>',
            postHtmlOptions: { quoteStyle: 0, replaceQuote: false, decodeEntities: true }
        },
        {
            name: 'double quotes without replacement',
            input: '<div data-x="&quot; onmouseover=alert(1) x=&quot;"></div>',
            postHtmlOptions: { replaceQuote: false, decodeEntities: true }
        },
        {
            name: 'explicitly quoted attributes',
            input: '<div data-x="\' onmouseover=alert(1) x=\'"></div>',
            postHtmlOptions: { quoteStyle: 1, quoteAllAttributes: true }
        }
    ];

    for (const { name, input, postHtmlOptions } of injectionCases) {
        it(`prevents attribute injection with ${name}`, async () => {
            const moduleOptions = { removeAttributeQuotes: true };
            const result = await htmlnano.process(input, moduleOptions, {}, { ...postHtmlOptions });
            const sourceNode = parseFragment(input).childNodes[0] as DefaultTreeAdapterTypes.Element;
            const outputNode = parseFragment(result.html).childNodes[0] as DefaultTreeAdapterTypes.Element;

            // Compare browser-parsed values and the entire attribute set: a
            // leaked delimiter must never create an event-handler attribute.
            expect(outputNode.attrs).toEqual(sourceNode.attrs);
            await initIdempotent(input, result.html, moduleOptions, postHtmlOptions);
        });
    }

    it('escapes delimiters produced by other modules regardless of option order', async () => {
        const input = '<button onclick="alert(&quot;it\'s&quot;)"></button>';
        const moduleOptions: HtmlnanoOptions = {
            removeOptionalTags: true,
            removeAttributeQuotes: { force: true },
            minifyJs: {}
        };
        const postHtmlOptions = { quoteStyle: 1 };
        const expected = '<button onclick=\'alert(&quot;it&#39;s&quot;);\'></button>';

        await initIdempotent(input, expected, moduleOptions, postHtmlOptions);
        const sourceNode = parseFragment(input).childNodes[0] as DefaultTreeAdapterTypes.Element;
        const outputNode = parseFragment(expected).childNodes[0] as DefaultTreeAdapterTypes.Element;
        expect(outputNode.attrs).toEqual([{ name: 'onclick', value: `${sourceNode.attrs[0].value};` }]);
    });
});
