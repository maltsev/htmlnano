import { expect } from 'expect';
import fc from 'fast-check';
import { parser } from 'posthtml-parser';
import { render } from 'posthtml-render';
import htmlnano from '../../dist/index.mjs';
import safePreset from '../../dist/presets/safe.mjs';
import maxPreset from '../../dist/presets/max.mjs';
import type { HtmlnanoPreset } from '../../src';

/*
 * Property-based fuzz tests
 *
 * Instead of feeding random strings (which mostly exercise the parser), we
 * generate a nested HTML *tree* from a fixed tag pool, render it to valid-ish
 * HTML with posthtml-render, and assert minifier invariants on the result.
 *
 * Runs are bounded and seeded so CI is deterministic and fast.
 */

const NUM_RUNS = 150;
const SEED = 424242;

fc.configureGlobal({
    numRuns: NUM_RUNS,
    seed: SEED,
    // fast-check's built-in per-property timeout would fight mocha's; leave it
    // to mocha via this.timeout()/it timeouts below.
    verbose: 1
});

// Regular (non-raw) container tags that may nest children.
const CONTAINER_TAGS = ['div', 'span', 'p', 'a', 'template'];
// Raw / whitespace-preserving tags whose text content must survive untouched
// through the SAFE preset (which does not touch pre/textarea text).
const PROTECTED_TEXT_TAGS = ['pre', 'textarea'];

// Text nodes that mix whitespace, entities and unicode. Kept free of raw '<'
// and '&' followed by entity-like sequences so the intent survives a
// parse -> render round-trip predictably.
const textArb = fc.constantFrom(
    'hello world',
    '  leading and trailing  ',
    'line1\n  line2\n\tline3',
    'unicode: café — naïve — 日本語 — 🚀',
    'entities: &amp; &lt; &gt; &#169; &copy;',
    'mixed   spaces\tand\ttabs',
    '',
    '   ',
    'a',
    'nested & text with spaces'
);

// Text safe to place inside <pre>/<textarea> and compare byte-for-byte.
// We avoid raw entity syntax here so what we put in is what we expect back
// after a parse/render round-trip of the *input* (see protectedTextsOf).
const protectedTextArb = fc.stringMatching(/^[ \t\n a-zA-Z0-9.,!?()-]{0,40}$/);

function attrsArb(): fc.Arbitrary<Record<string, string>> {
    const key = fc.constantFrom('class', 'id', 'href', 'title', 'data-foo', 'data-bar');
    const value = fc.constantFrom('', 'x', 'a b c', 'https://example.com/', '  spaced  ', 'café');
    return fc.dictionary(key, value, { maxKeys: 3 });
}

interface HtmlNode {
    tag: string;
    attrs: Record<string, string>;
    content: Array<HtmlNode | string>;
}

function nodeArb(): fc.Arbitrary<HtmlNode | string> {
    const leafText: fc.Arbitrary<HtmlNode | string> = textArb;

    const protectedNode: fc.Arbitrary<HtmlNode> = fc.record({
        tag: fc.constantFrom(...PROTECTED_TEXT_TAGS),
        attrs: attrsArb(),
        content: protectedTextArb.map(t => [t])
    });

    const treeArb: fc.Arbitrary<HtmlNode | string> = fc.letrec<{ node: HtmlNode | string }>(tie => ({
        node: fc.oneof(
            { depthSize: 'small', withCrossShrink: true },
            leafText,
            protectedNode,
            fc.record({
                tag: fc.constantFrom(...CONTAINER_TAGS),
                attrs: attrsArb(),
                content: fc.array(tie('node'), { maxLength: 4 })
            })
        )
    })).node;

    return treeArb;
}

// Full document: an array of top-level nodes.
function documentArb(): fc.Arbitrary<string> {
    return fc.array(nodeArb(), { minLength: 1, maxLength: 5 }).map(nodes => render(nodes as never));
}

// Extract the text inside <pre>/<textarea> from an HTML string, as the parser
// sees it. Comparing input-parsed vs output-parsed protected text sidesteps
// insignificant serialization differences while still catching any mutation of
// whitespace/entities inside protected regions.
function protectedTextsOf(html: string): string[] {
    const out: string[] = [];
    const tree = parser(html);
    const walk = (nodes: unknown): void => {
        if (!Array.isArray(nodes)) return;
        for (const node of nodes) {
            if (node && typeof node === 'object') {
                const n = node as { tag?: unknown; content?: unknown };
                if (typeof n.tag === 'string' && PROTECTED_TEXT_TAGS.includes(n.tag)) {
                    out.push(render(n.content as never));
                } else if (n.content) {
                    walk(n.content);
                }
            }
        }
    };
    walk(tree);
    return out;
}

function minify(html: string, preset: HtmlnanoPreset): Promise<string> {
    return htmlnano.process(html, {}, preset).then(r => r.html);
}

const PRESETS: Array<[string, HtmlnanoPreset]> = [
    ['safe', safePreset as HtmlnanoPreset],
    ['max', maxPreset as HtmlnanoPreset]
];

describe('[property] htmlnano fuzz', () => {
    for (const [name, preset] of PRESETS) {
        describe(`preset: ${name}`, () => {
            it('process() resolves to a string and never throws', function () {
                this.timeout(20000);
                return fc.assert(
                    fc.asyncProperty(documentArb(), async (html) => {
                        const output = await minify(html, preset);
                        expect(typeof output).toBe('string');
                    })
                );
            });

            // NOTE: The `max` preset is NOT strictly idempotent in a single
            // pass. `removeEmptyAttributes` runs in the walk phase (onAttrs),
            // which is AFTER `removeEmptyElements` (a `default` module) has
            // already decided which elements to keep. So `<div class=""></div>`
            // only loses its (now-empty) attribute in pass 1, and is not
            // recognized as empty and removed until pass 2. This is a
            // convergence quirk, not an oscillation: minification reaches a
            // fixed point within a small, bounded number of passes. We assert
            // exactly that (bounded convergence), which still catches genuine
            // non-terminating / oscillating minifier bugs. The concrete case is
            // pinned as a regression test in
            // test/modules/removeEmptyElements.ts.
            it('reaches a fixed point within a bounded number of passes', function () {
                this.timeout(20000);
                const MAX_PASSES = 5;
                return fc.assert(
                    fc.asyncProperty(documentArb(), async (html) => {
                        let current = await minify(html, preset);
                        for (let pass = 0; pass < MAX_PASSES; pass++) {
                            const next = await minify(current, preset);
                            if (next === current) {
                                return; // converged
                            }
                            current = next;
                        }
                        throw new Error(
                            `did not converge within ${MAX_PASSES} passes for input: ${JSON.stringify(html)}`
                        );
                    })
                );
            });

            it('output re-parses stably (parse -> render is a fixed point)', function () {
                this.timeout(20000);
                return fc.assert(
                    fc.asyncProperty(documentArb(), async (html) => {
                        const output = await minify(html, preset);
                        const roundTrip = render(parser(output));
                        // A second round-trip must be stable; the first parse may
                        // normalize serialization, so compare round-trip to itself.
                        const roundTrip2 = render(parser(roundTrip));
                        expect(roundTrip2).toBe(roundTrip);
                    })
                );
            });
        });
    }

    // Protected-content byte identity is only guaranteed for pre/textarea text
    // (script/style are intentionally minified by the safe preset).
    it('[safe] preserves <pre>/<textarea> text byte-for-byte', function () {
        this.timeout(20000);
        return fc.assert(
            fc.asyncProperty(documentArb(), async (html) => {
                const output = await minify(html, safePreset as HtmlnanoPreset);
                expect(protectedTextsOf(output)).toEqual(protectedTextsOf(html));
            })
        );
    });
});
