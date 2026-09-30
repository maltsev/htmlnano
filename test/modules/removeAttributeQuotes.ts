import { init, initIdempotent } from '../htmlnano.ts';
import safePreset from '../../dist/presets/safe.mjs';
import type { HtmlnanoOptions } from '../../src/types.js';

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
            '<button onclick="return alert(1),!1"></button>',
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
});
