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

    it('should remove empty elements with presentational attributes only', () => {
        return init(
            '<div>hello<span class="carousel-dot"></span><i style="width:4px"></i><b aria-hidden="true" class="bar"></b></div>',
            '<div>hello</div>',
            { removeEmptyElements: { removeWithAttributes: 'presentational' } }
        );
    });

    it('should keep empty elements with meaningful attributes in the presentational mode', () => {
        const html = '<div><span id="anchor"></span><span role="status"></span><span aria-label="loading"></span>'
            + '<span data-controller="tooltip"></span><span onclick="go()"></span><span title="hint"></span>'
            + '<input name="q"><a href="/next" class="link"></a></div>';
        return init(
            html,
            html,
            { removeEmptyElements: { removeWithAttributes: 'presentational' } }
        );
    });

    it('should keep scripted and custom elements in the presentational mode', () => {
        const html = '<div><canvas class="chart"></canvas><slot class="body"></slot><iframe class="frame"></iframe>'
            + '<my-widget class="widget"></my-widget></div>';
        return init(
            html,
            html,
            { removeEmptyElements: { removeWithAttributes: 'presentational' } }
        );
    });

    it('should keep empty interactive elements in the presentational mode', () => {
        const html = '<div><button class="hamburger-menu"></button><a class="icon-link"></a>'
            + '<label class="toggle"></label><details class="more"><summary class="head"></summary></details></div>';
        return init(
            html,
            html,
            { removeEmptyElements: { removeWithAttributes: 'presentational' } }
        );
    });

    it('should keep empty interactive elements with a custom attribute list', () => {
        const html = '<div><button class="hamburger-menu"></button><span class="icon"></span></div>';
        return init(
            html,
            '<div><button class="hamburger-menu"></button></div>',
            { removeEmptyElements: { removeWithAttributes: ['class'] } }
        );
    });

    it('should still remove interactive elements without attributes', () => {
        return init(
            '<div>hello<a></a><button></button></div>',
            '<div>hello</div>',
            { removeEmptyElements: true }
        );
    });

    it('should remove interactive elements with attributes when removeWithAttributes is true', () => {
        return init(
            '<div>hello<button class="hamburger-menu"></button></div>',
            '<div>hello</div>',
            { removeEmptyElements: { removeWithAttributes: true } }
        );
    });

    it('should keep svg shapes in the presentational mode', () => {
        const html = '<svg viewBox="0 0 8 8"><path class="icon" d="M0 0h8v8H0z"></path></svg>';
        return init(
            html,
            html,
            { removeEmptyElements: { removeWithAttributes: 'presentational' } }
        );
    });

    it('should still remove empty elements without attributes in the presentational mode', () => {
        return init(
            '<div>hello<span><b></b></span></div>',
            '<div>hello</div>',
            { removeEmptyElements: { removeWithAttributes: 'presentational' } }
        );
    });

    it('should accept a custom list of attributes that do not prevent the removal', () => {
        return init(
            '<div>hello<span data-decoration="dot"></span><span class="icon"></span></div>',
            '<div>hello<span class="icon"></span></div>',
            { removeEmptyElements: { removeWithAttributes: ['data-decoration'] } }
        );
    });

    it('should keep void elements', () => {
        return init(
            '<div><img></div>',
            '<div><img></div>',
            { removeEmptyElements: { removeWithAttributes: true } }
        );
    });

    it('should keep empty table cells, rows and captions', () => {
        const html = '<table><caption></caption><colgroup></colgroup>'
            + '<tr><td>1</td><td></td><td>3</td></tr><tr></tr></table>';
        return init(
            html,
            html,
            { removeEmptyElements: { removeWithAttributes: true } }
        );
    });

    it('should keep empty form controls and media elements', () => {
        const html = '<div><textarea></textarea><select><option></option></select>'
            + '<canvas></canvas><iframe></iframe><audio></audio><video></video><slot></slot></div>';
        return init(
            html,
            html,
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
