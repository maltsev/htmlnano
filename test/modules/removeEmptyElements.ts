import { expect } from 'expect';
import htmlnano from '../../dist/index.mjs';
import { init } from '../htmlnano.ts';

describe('removeEmptyElements', () => {
    it('should remove empty elements without attributes by default', () => {
        return init(
            '<div>hello<span><b></b></span></div>',
            '<div>hello</div>',
            { removeEmptyElements: true }
        );
    });

    it('should keep empty elements with attributes by default', () => {
        return init(
            '<div><span class="icon"></span></div>',
            '<div><span class="icon"></span></div>',
            { removeEmptyElements: true }
        );
    });

    it('should remove empty elements with attributes when enabled', () => {
        return init(
            '<div>hello<span class="icon"></span></div>',
            '<div>hello</div>',
            { removeEmptyElements: { removeWithAttributes: true } }
        );
    });

    it('should keep void elements', () => {
        return init(
            '<div><img></div>',
            '<div><img></div>',
            { removeEmptyElements: { removeWithAttributes: true } }
        );
    });

    it('should treat whitespace-only content as empty', () => {
        return init(
            '<div>text<span>   </span></div>',
            '<div>text</div>',
            { removeEmptyElements: true }
        );
    });

    // Regression for a convergence quirk found by the property-based fuzz tests
    // (test/property/fuzz.ts). When both removeEmptyAttributes and
    // removeEmptyElements are enabled (as in the `max` preset),
    // `removeEmptyAttributes` runs in the walk phase (onAttrs), i.e. AFTER
    // `removeEmptyElements` (a `default` module) has already run. So an element
    // that only becomes "empty" once its empty attribute is stripped is not
    // removed until a second minification pass. The result still converges to a
    // fixed point within two passes; it is simply not idempotent in one pass.
    it('needs a second pass to remove an element emptied by removeEmptyAttributes', () => {
        const options = { removeEmptyAttributes: true, removeEmptyElements: true };
        const minify = (html: string) => htmlnano.process(html, options).then(r => r.html);
        return minify('<div><div class=""></div></div>hello world')
            .then((once) => {
                // Pass 1: class="" is stripped but the (now empty) divs remain.
                expect(once).toBe('<div><div></div></div>hello world');
                return minify(once);
            })
            .then((twice) => {
                // Pass 2: the empty divs are removed and the output is stable.
                expect(twice).toBe('hello world');
                return minify(twice);
            })
            .then((thrice) => {
                expect(thrice).toBe('hello world');
            });
    });
});
