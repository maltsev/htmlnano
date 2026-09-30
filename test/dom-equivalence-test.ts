import { expect } from 'expect';
import { assertSafeDomEquivalent } from './dom-equivalence.ts';

describe('DOM equivalence helper', () => {
    describe('boolean attribute scope', () => {
        const differentCases = [
            ['<a-box visible="false"></a-box>', '<a-box visible="true"></a-box>'],
            ['<x-widget enabled="true"></x-widget>', '<x-widget enabled="false"></x-widget>'],
            ['<x-widget disabled="false"></x-widget>', '<x-widget disabled></x-widget>'],
            ['<div checked="true"></div>', '<div checked></div>'],
            ['<svg><g disabled="false"></g></svg>', '<svg><g disabled></g></svg>'],
            ['<math><mi hidden="false">x</mi></math>', '<math><mi hidden>x</mi></math>'],
            ['<x-widget hidden="until-found"></x-widget>', '<x-widget hidden></x-widget>']
        ];

        for (const [source, output] of differentCases) {
            for (const preset of ['safe', 'ampSafe'] as const) {
                it(`${preset} rejects value changes in ${source}`, () => {
                    expect(() => assertSafeDomEquivalent(source, output, preset, { kind: 'fragment' }))
                        .toThrow('DOM mismatch');
                });
            }
        }

        const equivalentCases = [
            ['<input disabled="disabled" checked="false">', '<input disabled checked>'],
            ['<select multiple="multiple"><option selected="selected">One</option></select>', '<select multiple><option selected>One</option></select>'],
            ['<details open="open">Text</details>', '<details open>Text</details>'],
            ['<x-widget hidden="hidden" inert="inert"></x-widget>', '<x-widget hidden inert></x-widget>']
        ];

        for (const [source, output] of equivalentCases) {
            it(`accepts native boolean spelling changes in ${source}`, () => {
                expect(() => assertSafeDomEquivalent(source, output, 'safe', { kind: 'fragment' }))
                    .not.toThrow();
            });
        }
    });

    describe('text whitespace', () => {
        const differentCases = [
            ['<p>Hello <em>world</em></p>', '<p>Hello<em>world</em></p>'],
            ['<span>Hello</span> <span>world</span>', '<span>Hello</span><span>world</span>'],
            ['<p><em>Hello</em> world</p>', '<p><em>Hello</em>world</p>'],
            ['<p>Hello<!--!keep--> <em>world</em></p>', '<p>Hello<!--!keep--><em>world</em></p>'],
            ['<p>Hello<x-word> world</x-word></p>', '<p>Hello<x-word>world</x-word></p>'],
            ['<svg><text>Hello <tspan>world</tspan></text></svg>', '<svg><text>Hello<tspan>world</tspan></text></svg>'],
            ['<pre> one  two </pre>', '<pre>one two</pre>'],
            ['<textarea> one  two </textarea>', '<textarea>one two</textarea>']
        ];

        for (const [source, output] of differentCases) {
            it(`rejects whitespace loss in ${source}`, () => {
                expect(() => assertSafeDomEquivalent(source, output, 'safe', { kind: 'fragment' }))
                    .toThrow('DOM mismatch');
            });
        }

        const equivalentCases = [
            ['<p>Hello  \n <em>world</em></p>', '<p>Hello <em>world</em></p>'],
            ['<p>Hello <!-- removable --> world</p>', '<p>Hello world</p>'],
            ['\n<div>one</div>\n<div>two</div>\n', '<div>one</div><div>two</div>'],
            ['<div>\n<p>one</p>\n<p>two</p>\n</div>', '<div><p>one</p><p>two</p></div>'],
            ['<svg>\n<path d="M0 0h1"/>\n</svg>', '<svg><path d="M0 0h1"/></svg>']
        ];

        for (const [source, output] of equivalentCases) {
            it(`accepts redundant whitespace in ${source}`, () => {
                expect(() => assertSafeDomEquivalent(source, output, 'safe', { kind: 'fragment' }))
                    .not.toThrow();
            });
        }

        it('accepts indentation between head metadata elements', () => {
            const source = '<!doctype html><head>\n<meta charset=utf-8>\n<title>Page</title>\n</head><body>Text</body>';
            const output = '<!doctype html><head><meta charset=utf-8><title>Page</title></head><body>Text</body>';
            expect(() => assertSafeDomEquivalent(source, output, 'safe', { kind: 'document' }))
                .not.toThrow();
        });
    });
});
