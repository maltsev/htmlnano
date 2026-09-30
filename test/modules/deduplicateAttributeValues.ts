import { init } from '../htmlnano.ts';
import safePreset from '../../dist/presets/safe.mjs';

describe('deduplicateAttributeValues', () => {
    const options = {
        deduplicateAttributeValues: safePreset.deduplicateAttributeValues
    };

    it('it remove duplicate values from list-like attributes', () => {
        return init(
            '<a class=" foo  bar foo ">click</a>',
            '<a class=" foo  bar ">click</a>',
            options
        );
    });

    it('should not alter non-list-like attributes', () => {
        return init(
            '<a id="foo foo" href="bar  bar">click</a>',
            '<a id="foo foo" href="bar  bar">click</a>',
            options
        );
    });

    it('should treat non-ASCII whitespace as part of a token', () => {
        return init(
            '<div class="foo\u00a0bar foo\u00a0bar foo\u000bbar"></div>',
            '<div class="foo\u00a0bar foo\u000bbar"></div>',
            options
        );
    });

    it('should preserve whitespace around middle duplicates', () => {
        return init(
            '<a class="foo  foo   bar">click</a>',
            '<a class="foo    bar">click</a>',
            options
        );
    });

    it('should deduplicate rel attribute values', () => {
        return init(
            '<link rel="nofollow noopener nofollow">',
            '<link rel="nofollow noopener">',
            options
        );
    });

    it('should deduplicate rel values case-insensitively', () => {
        return init(
            '<link rel="nofollow NoFoLlOw">',
            '<link rel="nofollow">',
            options
        );
    });

    it('should deduplicate sandbox values case-insensitively', () => {
        return init(
            '<iframe sandbox="ALLOW-SCRIPTS allow-scripts allow-forms"></iframe>',
            '<iframe sandbox="ALLOW-SCRIPTS allow-forms"></iframe>',
            options
        );
    });
});
