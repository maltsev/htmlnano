const { expect } = require('expect') as typeof import('expect');
const posthtml = require('posthtml') as typeof import('posthtml');
const htmlnano = require('../dist/index.js') as typeof import('../src').default;

describe('[commonjs usage]', () => {
    const html = ' <div><!-- foo --><i>Hello</i> <i>world!</i></div> ';
    const minifiedHtml = '<div><i>Hello</i> <i>world!</i></div>';

    it('javascript', () => {
        return htmlnano.process(html).then((result) => {
            expect(result.html).toBe(minifiedHtml);
        });
    });

    it('PostHTML plugin', () => {
        return posthtml([htmlnano()]).process(html).then((result) => {
            expect(result.html).toBe(minifiedHtml);
        });
    });

    it('default export', () => {
        // assigning module.exports drops the bundler's exports.default, which breaks interop
        // consumers and the modules that reach back into htmlnano itself
        expect((htmlnano as unknown as { default: unknown }).default).toBe(htmlnano);
    });

    it('minifyHtmlTemplate module', () => {
        return htmlnano.process('<template> <div>Hello</div> </template>').then((result) => {
            expect(result.html).toBe('<template><div>Hello</div></template>');
        });
    });

    it('minifyHtmlTemplate module - raw text template', () => {
        return htmlnano.process('<script type="text/html"> <div>  <b>Hi</b>  </div> </script>', {
            collapseWhitespace: 'conservative',
            minifyHtmlTemplate: true
        }).then((result) => {
            expect(result.html).toBe('<script type="text/html"><div> <b>Hi</b> </div></script>');
        });
    });

    it('minifyConditionalComments module', () => {
        return htmlnano.process('<!--[if IE 6]><p>You are   using IE 6</p><![endif]-->', {
            collapseWhitespace: 'conservative',
            minifyConditionalComments: true
        }).then((result) => {
            expect(result.html).toBe('<!--[if IE 6]><p>You are using IE 6</p><![endif]-->');
        });
    });
});
