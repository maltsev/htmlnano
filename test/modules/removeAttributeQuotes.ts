import { init } from '../htmlnano.ts';
import safePreset from '../../dist/presets/safe.mjs';
import type { HtmlnanoOptions } from '../../src/types.js';

import posthtml from 'posthtml';
import htmlnano from '../../dist/index.mjs';
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
        return posthtml([
            htmlnano(options, {})
        ]).process(
            html,
            // @ts-expect-error unknown option
            { quoteAllAttributes: true }
        ).then((result) => {
            expect(result.html).toBe(html);
        });
    });

    it('should force override quoteAllAttributes', () => {
        const forceOptions = { ...safePreset, removeAttributeQuotes: { force: true } } as HtmlnanoOptions;

        return posthtml([
            htmlnano(forceOptions, {})
        ]).process(
            html,
            // @ts-expect-error unknown option
            { quoteAllAttributes: true }
        ).then((result) => {
            expect(result.html).toBe('<div class=foo title="hello world"></div>');
        });
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

        return posthtml([
            htmlnano(forceOptions, {})
        ]).process(
            '<div class="foo"></div>',
            // @ts-expect-error unknown option
            { quoteAllAttributes: true }
        ).then((result) => {
            expect(result.html).toBe('<div class=foo></div>');
        });
    });

    it('without force, the user-provided quoteAllAttributes:true wins', () => {
        return posthtml([
            htmlnano(options, {})
        ]).process(
            '<div class="foo"></div>',
            // @ts-expect-error unknown option
            { quoteAllAttributes: true }
        ).then((result) => {
            expect(result.html).toBe('<div class="foo"></div>');
        });
    });

    it('should interact with removeEmptyAttributes', () => {
        // safe preset removes empty style/class-like attributes; remaining ones stay quoted when empty
        return init(
            '<div style="" class="foo"></div>',
            '<div class=foo></div>',
            options
        );
    });

    it('should interact with collapseBooleanAttributes', () => {
        return init(
            '<input disabled="disabled" name="foo">',
            '<input disabled name=foo>',
            options
        );
    });

    it('should handle event-handler output', () => {
        return init(
            '<button onclick="alert(1); return false"></button>',
            '<button onclick="return alert(1),!1"></button>',
            options
        );
    });

    it('should keep JSON-like attribute values quoted', () => {
        return init(
            '<div data-config=\'{"enabled":true}\'></div>',
            '<div data-config=\'{"enabled":true}\'></div>',
            options
        );
    });

    it('should preserve quotes added by SVG minification', () => {
        return init(
            '<svg viewBox="0 0 10 10"><path d="M0 0h10v10z" fill="red"/></svg>',
            '<svg viewBox="0 0 10 10"><path fill="red" d="M0 0h10v10z"/></svg>',
            options
        );
    });

    it('should remove optional quotes from custom and data attributes', () => {
        return init(
            '<x-card custom-attribute="enabled" data-state="ready"></x-card>',
            '<x-card custom-attribute=enabled data-state=ready></x-card>',
            options
        );
    });
});
