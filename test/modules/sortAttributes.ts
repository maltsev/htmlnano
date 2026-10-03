import { expect } from 'expect';
import posthtml from 'posthtml';
import htmlnano from '../../dist/index.mjs';
import { init, initIdempotent } from '../htmlnano.ts';

describe('sortAttributes', () => {
    for (const sortType of ['alphabetical', 'frequency'] as const) {
        it(`${sortType} preserves the first duplicate URL attribute`, () => {
            return initIdempotent(
                '<a title="link" HREF="/safe" href="javascript:alert(1)"></a><a title="link" href="/safe" HREF="javascript:alert(1)"></a>',
                '<a HREF="/safe" href="javascript:alert(1)" title="link"></a><a href="/safe" HREF="javascript:alert(1)" title="link"></a>',
                { sortAttributes: sortType }
            );
        });

        it(`${sortType} does not expose an executable duplicate script type`, () => {
            return initIdempotent(
                '<script src="app.js" TYPE="application/json" type="text/javascript"></script>',
                sortType === 'alphabetical'
                    ? '<script src="app.js" TYPE="application/json" type="text/javascript"></script>'
                    : '<script TYPE="application/json" type="text/javascript" src="app.js"></script>',
                { sortAttributes: sortType }
            );
        });

        it(`${sortType} preserves case-sensitive XML attribute names and values`, () => {
            return initIdempotent(
                '<svg z="" viewBox="first" viewbox="second" VIEWBOX="third" a="&amp;"></svg>',
                sortType === 'alphabetical'
                    ? '<svg a="&amp;" viewBox="first" viewbox="second" VIEWBOX="third" z=""></svg>'
                    : '<svg viewBox="first" viewbox="second" VIEWBOX="third" a="&amp;" z=""></svg>',
                { sortAttributes: sortType },
                { xmlMode: true }
            );
        });

        it(`${sortType} safely preserves attributes named after Object prototype properties`, async () => {
            // Supply an AST because PostHTML's parser drops __proto__ before plugins run.
            const attrs = Object.fromEntries([
                ['valueOf', 'value'], ['toString', 'string'], ['hasOwnProperty', 'own'],
                ['constructor', 'ctor'], ['__proto__', 'proto'], ['z', undefined], ['a', '']
            ]);
            const result = await posthtml([htmlnano({ sortAttributes: sortType }, {})])
                .process([{ tag: 'div', attrs }], { skipParse: true });

            expect(result.tree[0]).toStrictEqual({ tag: 'div', attrs });
            expect(result.html).toBe('<div __proto__="proto" a="" constructor="ctor" hasOwnProperty="own" toString="string" valueOf="value"></div>');
        });
    }

    it('alphabetical', () => {
        return init(
            '<input type="text" class="form-control" name="testInput" autofocus="" autocomplete="off" id="testId">',
            '<input autocomplete="off" autofocus="" class="form-control" id="testId" name="testInput" type="text">',
            {
                sortAttributes: 'alphabetical'
            }
        );
    });

    it('frequency', () => {
        return init(
            '<input type="text" class="form-control" name="testInput" autofocus="" autocomplete="off" id="testId"><a id="testId" href="#" class="testClass"></a><img width="20" src="../images/image.png" height="40" alt="image" class="cls" id="id2">',
            '<input class="form-control" id="testId" autocomplete="off" autofocus="" name="testInput" type="text"><a class="testClass" id="testId" href="#"></a><img class="cls" id="id2" alt="image" height="40" src="../images/image.png" width="20">',
            {
                sortAttributes: 'frequency'
            }
        );
    });

    it('true (alphabetical)', () => {
        return init(
            '<input type="text" class="form-control" name="testInput" autofocus="" autocomplete="off" id="testId">',
            '<input autocomplete="off" autofocus="" class="form-control" id="testId" name="testInput" type="text">',
            {
                sortAttributes: true
            }
        );
    });

    it('false (disabled)', () => {
        const html = '<input type="text" name="testInput" class="form-control" id="testId">';

        return init(html, html, {
            sortAttributes: false
        });
    });

    it('invalid configuration', () => {
        const input = '<input type="text" class="form-control" name="testInput" autofocus="" autocomplete="off" id="testId">';

        return init(input, input, {
            // @ts-expect-error invalid configuration
            sortAttributes: 100
        });
    });

    it('frequency preserves attribute name case and tie order', () => {
        return init(
            '<svg viewBox="0 0 10 10" preserveAspectRatio="xMidYMid meet" data-foo="1"></svg><svg data-foo="2" preserveAspectRatio="xMidYMid meet" viewBox="0 0 10 10"></svg>',
            '<svg data-foo="1" preserveAspectRatio="xMidYMid meet" viewBox="0 0 10 10"></svg><svg data-foo="2" preserveAspectRatio="xMidYMid meet" viewBox="0 0 10 10"></svg>',
            {
                sortAttributes: 'frequency'
            }
        );
    });

    // https://github.com/maltsev/htmlnano/issues/189
    it('issue #189', () => {
        return init(
            '<input id="name" name="name" autocomplete="name" type="text" required="">',
            '<input autocomplete="name" id="name" name="name" required="" type="text">',
            {
                sortAttributes: 'frequency'
            }
        );
    });
});
