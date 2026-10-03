import { expect } from 'expect';
import posthtml from 'posthtml';
import { parseFragment } from 'parse5';
import htmlnano from '../../dist/index.mjs';
import { init, initIdempotent } from '../htmlnano.ts';
import { describe, it } from 'mocha';

describe('sortAttributesWithLists', () => {
    for (const sortType of ['alphabetical', 'frequency'] as const) {
        it(`${sortType} prevents attribute injection when sorting creates a JSON-like value`, async () => {
            const input = '<div class="onmouseover=\'alert(1)\'&quot;} {&quot;x&quot;:&quot;foo\'"></div>';
            const expected = '<div class=\'{"x":"foo&#39; onmouseover=&#39;alert(1)&#39;"}\'></div>';
            await initIdempotent(input, expected, { sortAttributesWithLists: sortType });

            const result = await posthtml([htmlnano({ sortAttributesWithLists: sortType }, {})]).process(input);
            const element = parseFragment(result.html).childNodes[0];
            if (!('attrs' in element)) throw new Error('Expected an element');
            expect(element.attrs).toEqual([
                { name: 'class', value: '{"x":"foo\' onmouseover=\'alert(1)\'"}' }
            ]);
        });

        it(`${sortType} preserves non-ASCII whitespace within tokens`, () => {
            return init(
                '<div class="c b\u00a0a"></div>',
                '<div class="b\u00a0a c"></div>',
                { sortAttributesWithLists: sortType }
            );
        });
    }

    it('alphabetical', () => {
        return init(
            '<a class="foo baz bar">click</a><a class="foo bar">click</a>',
            '<a class="bar baz foo">click</a><a class="bar foo">click</a>',
            {
                sortAttributesWithLists: 'alphabetical'
            }
        );
    });

    it('issue #180', () => {
        return init(
            '<img sizes="(min-width: 300px) 200px, 100px">',
            '<img sizes="(min-width: 300px) 200px, 100px">',
            {
                sortAttributesWithLists: 'alphabetical'
            }
        );
    });

    it('frequency', () => {
        return init(
            '<div class="foo baz bar"></div><div class="bar foo"></div>',
            '<div class="bar foo baz"></div><div class="bar foo"></div>',
            {
                sortAttributesWithLists: 'frequency'
            }
        );
    });

    it('frequency preserves duplicates', () => {
        return init(
            '<div class="foo foo bar"></div><div class="bar foo"></div>',
            '<div class="foo foo bar"></div><div class="foo bar"></div>',
            {
                sortAttributesWithLists: 'frequency'
            }
        );
    });

    it('frequency alphabetical tie-break', () => {
        return init(
            '<div class="b a"></div><div class="a b"></div>',
            '<div class="a b"></div><div class="a b"></div>',
            {
                sortAttributesWithLists: 'frequency'
            }
        );
    });

    it('attribute name casing', () => {
        return init(
            '<a CLASS="foo baz bar">click</a>',
            '<a CLASS="bar baz foo">click</a>',
            {
                sortAttributesWithLists: 'alphabetical'
            }
        );
    });

    it('alphabetical trims redundant whitespace', () => {
        return init(
            '<div class="  foo   bar "></div>',
            '<div class="bar foo"></div>',
            {
                sortAttributesWithLists: 'alphabetical'
            }
        );
    });

    it('true (alphabetical)', () => {
        return init(
            '<a class="foo baz bar">click</a><a class="foo bar">click</a>',
            '<a class="bar baz foo">click</a><a class="bar foo">click</a>',
            {
                sortAttributesWithLists: true
            }
        );
    });

    it('false (disabled)', () => {
        const input = '<a class="foo baz bar">click</a><a class="foo bar">click</a>';
        return init(
            input,
            input,
            {
                sortAttributesWithLists: false
            }
        );
    });

    it('invalid configuration', () => {
        const input = '<a class="foo baz bar">click</a><a class="foo bar">click</a>';
        return init(
            input,
            input,
            {
                // @ts-expect-error invalid type
                sortAttributesWithLists: 100
            }
        );
    });
});
