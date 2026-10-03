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

    it('should compare case-insensitive tokens using ASCII casing only', () => {
        return init(
            '<link rel="K K k Ä ä Ä">',
            '<link rel="K K Ä ä">',
            options
        );
    });

    it('should preserve security tokens hidden behind character references', () => {
        return init(
            '<a href="/" target="example" rel="foo&tab;noopener foo&Tab;noopener foo&newline;noreferrer foo&NewLine;noreferrer">click</a>',
            '<a href="/" target="example" rel="foo&tab;noopener foo&Tab;noopener foo&newline;noreferrer foo&NewLine;noreferrer">click</a>',
            options
        );
    });

    it('should preserve distinct named references in case-insensitive lists', () => {
        return init(
            '<link rel="&Aacute; &aacute;">',
            '<link rel="&Aacute; &aacute;">',
            options
        );
    });

    it('should compare decoded tokens while keeping the first source spelling', () => {
        return init(
            '<div class="&#102;oo foo f&#111;o &amp; &amp; FOO"></div><link rel="&#78;OOPENER noopener">',
            '<div class="&#102;oo &amp; FOO"></div><link rel="&#78;OOPENER">',
            options
        );
    });

    it('should deduplicate matching groups containing encoded whitespace', () => {
        return init(
            '<div class="foo&#32;bar foo&#32;bar baz baz"></div><iframe sandbox="allow-scripts&#9;allow-forms allow-scripts&#9;allow-forms"></iframe>',
            '<div class="foo&#32;bar baz"></div><iframe sandbox="allow-scripts&#9;allow-forms"></iframe>',
            options
        );
    });
});
