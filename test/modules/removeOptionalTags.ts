// this file has trailing whitespaces that should be kept

import { init, initWithPostHtmlOptions } from '../htmlnano.ts';
import type { PostHTMLTreeLike } from '../../src/types.js';

describe('removeOptionalTags', () => {
    const options = {
        removeOptionalTags: true
    };

    it('shouldn\'t omit an optional start tag if the element has attributes', () => {
        const input = `
        <html lang="en">
            <p>Welcome to this example.</p>
        </html>`;
        // Attributes only block the start tag, </html> may still be omitted
        const expected = `
        <html lang="en">
            <p>Welcome to this example.</p>
        `;

        return init(input, expected, options);
    });

    it('document example', () => {
        const input = '<html><head><title>Title</title></head><body><p>Hi</p></body></html>';
        const expected = '<title>Title</title><p>Hi';

        return init(input, expected, options);
    });

    context('attributes only block the start tag of their own element', () => {
        it('omits the tags of the descendants of an element with attributes', () => {
            const input = '<html class="no-js"><head><title>Title</title></head><body class="page"><ul><li>one</li><li>two</li></ul></body></html>';
            const expected = '<html class="no-js"><title>Title</title><body class="page"><ul><li>one<li>two</ul>';

            return init(input, expected, options);
        });

        it('omits </head> and </body> of elements with attributes', () => {
            const input = '<html><head class="h"><title>Title</title></head><body class="b"><p>Hi</p></body></html>';
            const expected = '<head class="h"><title>Title</title><body class="b"><p>Hi';

            return init(input, expected, options);
        });

        it('omits </tbody> of an element with attributes', () => {
            const input = '<table><tbody class="x"><tr><td>a</td></tr></tbody></table>';
            const expected = '<table><tbody class="x"><tr><td>a</table>';

            return init(input, expected, options);
        });

        it('omits </colgroup> of an element with attributes', () => {
            const input = '<table><colgroup class="c"><col></colgroup><tr><td>a</td></tr></table>';
            const expected = '<table><colgroup class="c"><col><tr><td>a</table>';

            return init(input, expected, options);
        });
    });

    it('omits the tags below a node without a tag', () => {
        // posthtml-include and friends splice a parsed document in as such a node
        function wrapContentInATaglessNode(tree: PostHTMLTreeLike) {
            tree.walk((node) => {
                if (typeof node !== 'string' && node.tag === 'div') {
                    // @ts-expect-error -- a node without a tag renders as its content only
                    node.content = [{ tag: false, content: node.content }];
                }

                return node;
            });

            return tree;
        }

        const input = '<div><ul><li>one</li><li>two</li></ul></div>';
        const expected = '<div><ul><li>one<li>two</ul></div>';

        return init(input, expected, { ...options, custom: wrapContentInATaglessNode });
    });

    context('omit optional <html>', () => {
        it('default', () => {
            const input = `
            <html>
                <p>Welcome to this example.</p>
            </html>
            `;

            const expected = `
            
                <p>Welcome to this example.</p>
            
            `;

            return init(input, expected, options);
        });

        it('first thing inside <html> is a comment', () => {
            const input = `
            <html>
                <!-- where is this comment in the DOM? -->
            </html>`;
            const expected = `
            
                <!-- where is this comment in the DOM? -->
            `;

            return init(input, expected, options);
        });

        it('first thing inside <html> is whitespace then comment', () => {
            const input = '<html> <!-- where is this comment in the DOM? --><p>Hi</p></html>';
            const expected = ' <!-- where is this comment in the DOM? --><p>Hi</p>';

            return init(input, expected, options);
        });

        it('<html> is not immediately followed by a comment', () => {
            const input = `
            <html>
                <p>Welcome to this example.</p>
            </html><!-- where is this comment in the DOM? -->`;

            return init(input, input, options);
        });

        it('<html> followed by whitespace then comment', () => {
            const input = '<html><p>Hi</p></html> <!-- comment -->';
            const expected = '<p>Hi</p> <!-- comment -->';

            return init(input, expected, options);
        });
    });

    context('omit optional <head>', () => {
        it('<head> has elements', () => {
            const input = '<head><title>Title</title>';
            const expected = '<title>Title</title>';

            return init(input, expected, options);
        });

        it('<head> first child is whitespace', () => {
            const input = '<head> <title>Title</title></head>';
            // The start tag has to stay, but nothing follows </head>
            const expected = '<head> <title>Title</title>';

            return init(input, expected, options);
        });

        it('<head> surrouned by whitespaces', () => {
            const input = `
            <!DOCTYPE HTML>
            <html>
                <!-- prevent <html> being removed -->
                <head>
                    <title>Hello</title>
                </head>
            </html>`;
            const expected = `
            <!DOCTYPE HTML>
            
                <!-- prevent <html> being removed -->
                <head>
                    <title>Hello</title>
                </head>
            `;

            return init(input, expected, options);
        });

        it('empty <head>', () => {
            const input = `
            <!DOCTYPE HTML>
            <html>
                <!-- prevent <html> being removed -->
                <head>
    
                </head></html>`;

            const expected = `
            <!DOCTYPE HTML>
            
                <!-- prevent <html> being removed -->
                
    
                `;

            return init(input, expected, options);
        });

        it('the first node inside <head> element is text', () => {
            const input = `
            <!DOCTYPE HTML>
            <html><!-- prevent <html> being removed --><head>Example</head></html>`;
            const expected = `
            <!DOCTYPE HTML>
            <html><!-- prevent <html> being removed --><head>Example`;

            return init(input, expected, options);
        });

        it('<head> is followed by whitespaces', () => {
            const input = `
            <!DOCTYPE HTML>
            <html><!-- prevent <html> being removed --><head></head>
            </html>`;
            const expected = `
            <!DOCTYPE HTML>
            <html><!-- prevent <html> being removed --><head></head>
            `;

            return init(input, expected, options);
        });

        it('<head> is followed by comment', () => {
            const input = `
            <!DOCTYPE HTML>
            <html><!-- prevent <html> being removed --><head></head><!-- prevent <html> being removed -->
            </html>`;
            const expected = `
            <!DOCTYPE HTML>
            <html><!-- prevent <html> being removed --><head></head><!-- prevent <html> being removed -->
            `;

            return init(input, expected, options);
        });
    });

    context('omit optional <body>', () => {
        it('default', () => {
            const input = `
            <body>
                <p>htmlnano</p>
            </body>
            `;

            // There is whitespace after <body>, thus its start tag can't be omitted
            const expected = `
            <body>
                <p>htmlnano</p>
            
            `;

            return init(input, expected, options);
        });

        it('no white spaces nearby', () => {
            const input = '<body><p>htmlnano</p></body>';
            const expected = '<p>htmlnano';

            return init(input, expected, options);
        });

        it('empty <body>', () => {
            const input = '<body></body>';
            const expected = '';

            return init(input, expected, options);
        });

        it('first child meta keeps the <body> start tag', () => {
            const input = '<body><meta charset="utf-8"><p>htmlnano</p></body>';
            const expected = '<body><meta charset="utf-8"><p>htmlnano';

            return init(input, expected, options);
        });

        it('first child link keeps the <body> start tag', () => {
            const input = '<body><link rel="stylesheet"><p>htmlnano</p></body>';
            const expected = '<body><link rel="stylesheet"><p>htmlnano';

            return init(input, expected, options);
        });

        it('first child script keeps the <body> start tag', () => {
            const input = '<body><script></script><p>htmlnano</p></body>';
            const expected = '<body><script></script><p>htmlnano';

            return init(input, expected, options);
        });

        it('first child template keeps the <body> start tag', () => {
            const input = '<body><template></template><p>htmlnano</p></body>';
            const expected = '<body><template></template><p>htmlnano';

            return init(input, expected, options);
        });

        it('first child comment keeps the <body> start tag', () => {
            const input = '<body><!-- comment --><p>htmlnano</p></body>';
            const expected = '<body><!-- comment --><p>htmlnano';

            return init(input, expected, options);
        });

        it('<body> followed by comment keeps its end tag', () => {
            const input = '<body><p>htmlnano</p></body><!-- comment -->';
            const expected = '<body><p>htmlnano</body><!-- comment -->';

            return init(input, expected, options);
        });

        it('<body> followed by whitespace can be omitted', () => {
            const input = '<body><p>htmlnano</p></body> \n';
            const expected = '<p>htmlnano \n';

            return init(input, expected, options);
        });
    });

    it('html spec example 1', () => {
        const input = `
<!DOCTYPE HTML>
<html>
    <head>
        <title>Hello</title>
    </head>
    <body>
        <p>Welcome to this example.</p>
    </body>
</html>`;
        // <head> keeps both tags because it is surrounded by whitespace, and
        // <body> keeps its start tag for the same reason
        const expected = `
<!DOCTYPE HTML>

    <head>
        <title>Hello</title>
    </head>
    <body>
        <p>Welcome to this example.</p>
    
`;

        return init(input, expected, options);
    });

    it('html spec example 2', () => {
        const input = '<!DOCTYPE HTML><html><head><title>Hello</title></head><body><p>Welcome to this example.</p></body></html>';
        const expected = '<!DOCTYPE HTML><title>Hello</title><p>Welcome to this example.';

        return init(input, expected, options);
    });

    context('omit optional <colgroup>', () => {
        it('default', () => {
            const input = '<colgroup><col><col><col></colgroup>';
            const expected = '<col><col><col>';

            return init(input, expected, options);
        });

        it('empty <colgroup>', () => {
            const input = '<colgroup></colgroup>';
            // The start tag has to stay, but nothing follows </colgroup>
            const expected = '<colgroup>';

            return init(input, expected, options);
        });

        it('first child node is not <col>', () => {
            const input = '<colgroup><div></div><col><col></colgroup>';
            const expected = '<colgroup><div></div><col><col>';

            return init(input, expected, options);
        });

        it('first child is whitespace then <col>', () => {
            const input = '<colgroup> <col></colgroup>';
            const expected = '<colgroup> <col>';

            return init(input, expected, options);
        });

        it('<colgroup> followed by comment', () => {
            const input = '<colgroup><div></div><col><col></colgroup><!-- comment -->';

            return init(input, input, options);
        });

        it('<colgroup> with comment after keeps tag', () => {
            const input = '<colgroup><col></colgroup><!-- comment -->';

            return init(input, input, options);
        });

        it('<colgroup> followed by space', () => {
            const input = '<colgroup><div></div><col><col></colgroup> ';

            return init(input, input, options);
        });

        it('<colgroup> preceded by <colgroup>', () => {
            const input = '<colgroup><col></colgroup><colgroup><col></colgroup>';
            const expected = '<col><colgroup><col>';

            return init(input, expected, options);
        });
    });

    context('omit optional <tbody>', () => {
        it('omit <tbody>', () => {
            const input = '<table><tbody><tr></tr></tbody></table>';
            const expected = '<table><tr></table>';

            return init(input, expected, options);
        });

        it('<tbody> followed by another <tbody>', () => {
            const input = '<table><tbody><tr></tr></tbody><tbody><tr></tr></tbody></table>';
            // The second <tbody> is preceded by a <tbody> whose end tag has been
            // omitted, so its own start tag has to stay
            const expected = '<table><tr><tbody><tr></table>';

            return init(input, expected, options);
        });

        it('<tbody> followed by <tfoot>', () => {
            const input = '<table><tbody><tr></tr></tbody><tfoot></tfoot></table>';
            const expected = '<table><tr><tfoot></table>';

            return init(input, expected, options);
        });

        it('empty <tbody>', () => {
            const input = '<tbody></tbody>';

            return init(input, input, options);
        });

        it('<tbody> preceded by <thead>', () => {
            const input = '<table><thead></thead><tbody><tr></tr></tbody></table>';
            const expected = '<table><thead><tbody><tr></table>';

            return init(input, expected, options);
        });

        it('first child is whitespace then <tr>', () => {
            const input = '<table><tbody> <tr></tr></tbody></table>';
            const expected = '<table><tbody> <tr></table>';

            return init(input, expected, options);
        });

        it('first child is comment keeps the <tbody> start tag', () => {
            const input = '<table><tbody><!-- comment --><tr></tr></tbody></table>';
            const expected = '<table><tbody><!-- comment --><tr></table>';

            return init(input, expected, options);
        });
    });

    context('omit optional end tags', () => {
        it('</li> before another <li> and at the end of the list', () => {
            const input = '<ul><li>one</li><li>two</li></ul>';
            const expected = '<ul><li>one<li>two</ul>';

            return init(input, expected, options);
        });

        it('keeps </li> when the next sibling is not an <li>', () => {
            const input = '<ul><li>one</li>text<li>two</li></ul>';
            const expected = '<ul><li>one</li>text<li>two</ul>';

            return init(input, expected, options);
        });

        it('keeps </li> when whitespace separates the list items', () => {
            const input = '<ul><li>one</li> <li>two</li></ul>';
            const expected = '<ul><li>one</li> <li>two</ul>';

            return init(input, expected, options);
        });

        it('keeps </li> when a comment separates the list items', () => {
            const input = '<ul><li>one</li><!-- c --><li>two</li></ul>';
            const expected = '<ul><li>one</li><!-- c --><li>two</ul>';

            return init(input, expected, options);
        });

        it('omits </li> of an element with attributes', () => {
            const input = '<ul><li class="a">one</li><li>two</li></ul>';
            const expected = '<ul><li class="a">one<li>two</ul>';

            return init(input, expected, options);
        });

        it('</p> before a listed block element', () => {
            const input = '<div><p>one</p><div>two</div><p>three</p></div>';
            const expected = '<div><p>one<div>two</div><p>three</div>';

            return init(input, expected, options);
        });

        it('keeps </p> before an element that does not close it', () => {
            const input = '<div><p>one</p><span>two</span></div>';

            return init(input, input, options);
        });

        it('keeps </p> inside the parents listed by the specification', () => {
            const input = '<a><p>one</p></a><del><p>two</p></del><video><p>three</p></video>';

            return init(input, input, options);
        });

        it('keeps </p> inside a parent that would not close it', () => {
            const input = '<span><p>one</p></span><my-widget><p>two</p></my-widget>';

            return init(input, input, options);
        });

        it('keeps </p> when it is the last child of a table cell', () => {
            const input = '<table><tr><td><p>one</p></td><th><p>two</p></th></tr>'
                + '<tr><td>three</td></tr></table>';
            const expected = '<table><tr><td><p>one</p><th><p>two</p>'
                + '<tr><td>three</table>';

            return init(input, expected, options);
        });

        it('keeps </p> before a <table> in a document without a doctype', () => {
            const input = '<div><p>one</p><table><tr><td>x</td></tr></table></div>';
            const expected = '<div><p>one</p><table><tr><td>x</table></div>';

            return init(input, expected, options);
        });

        it('omits </p> before a <table> in a no-quirks document', () => {
            const input = '<!doctype html><div><p>one</p><table><tr><td>x</td></tr></table></div>';
            const expected = '<!doctype html><div><p>one<table><tr><td>x</table></div>';

            return init(input, expected, options);
        });

        it('</dt> and </dd>', () => {
            const input = '<dl><dt>one</dt><dd>two</dd><dt>three</dt><dd>four</dd></dl>';
            const expected = '<dl><dt>one<dd>two<dt>three<dd>four</dl>';

            return init(input, expected, options);
        });

        it('keeps </dt> when it is the last child of the list', () => {
            const input = '<dl><dd>one</dd><dt>two</dt></dl>';
            const expected = '<dl><dd>one<dt>two</dt></dl>';

            return init(input, expected, options);
        });

        it('</rt> and </rp>', () => {
            const input = '<ruby>base<rp>(</rp><rt>note</rt><rp>)</rp></ruby>';
            const expected = '<ruby>base<rp>(<rt>note<rp>)</ruby>';

            return init(input, expected, options);
        });

        it('</option> and </optgroup>', () => {
            const input = '<select><optgroup label="a"><option>one</option><option>two</option></optgroup><optgroup label="b"><option>three</option></optgroup></select>';
            const expected = '<select><optgroup label="a"><option>one<option>two<optgroup label="b"><option>three</select>';

            return init(input, expected, options);
        });

        it('</caption>, </thead>, </tr>, </th> and </td>', () => {
            const input = '<table><caption>c</caption><thead><tr><th>a</th><th>b</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>';
            const expected = '<table><caption>c<thead><tr><th>a<th>b<tbody><tr><td>1<td>2</table>';

            return init(input, expected, options);
        });

        it('keeps </caption> when it is followed by whitespace', () => {
            const input = '<table><caption>c</caption> <tr><td>1</td></tr></table>';
            const expected = '<table><caption>c</caption> <tr><td>1</table>';

            return init(input, expected, options);
        });

        it('keeps </thead> when it is not followed by <tbody> or <tfoot>', () => {
            const input = '<table><thead><tr><th>a</th></tr></thead><tr><td>1</td></tr></table>';
            const expected = '<table><thead><tr><th>a</thead><tr><td>1</table>';

            return init(input, expected, options);
        });

        it('</tfoot> at the end of the table', () => {
            const input = '<table><tbody><tr><td>1</td></tr></tbody><tfoot><tr><td>2</td></tr></tfoot></table>';
            const expected = '<table><tr><td>1<tfoot><tr><td>2</table>';

            return init(input, expected, options);
        });

        it('keeps end tags when the parent may not contain the element', () => {
            const input = '<div><td>1</td></div><div><li>2</li></div><ruby><option>3</option></ruby>';

            return init(input, input, options);
        });

        it('keeps end tags inside foreign content', () => {
            const input = '<svg><foreignObject><p>one</p></foreignObject></svg>';

            return init(input, input, options);
        });

        it('keeps end tags at the top level, where the parent is unknown', () => {
            const input = '<li>one</li>';

            return init(input, input, options);
        });

        it('does not omit end tags when the renderer closes void elements itself', () => {
            const input = '<ul><li>one</li><li>two</li></ul>';

            return initWithPostHtmlOptions(input, input, options, { closingSingleTag: 'slash' });
        });
    });

    it('html spec example 3', () => {
        const input = `
<table>
 <caption>37547 TEE Electric Powered Rail Car Train Functions (Abbreviated)</caption>
 <colgroup><col><col><col></colgroup>
 <thead>
  <tr>
   <th>Function</th>
   <th>Control Unit</th>
   <th>Central Station</th>
  </tr>
 </thead>
 <tbody>
  <tr>
   <td>Headlights</td>
   <td>✔</td>
   <td>✔</td>
  </tr>
  <tr>
   <td>Interior Lights</td>
   <td>✔</td>
   <td>✔</td>
  </tr>
  <tr>
   <td>Electric locomotive operating sounds</td>
   <td>✔</td>
   <td>✔</td>
  </tr>
  <tr>
   <td>Engineer's cab lighting</td>
   <td></td>
   <td>✔</td>
  </tr>
  <tr>
   <td>Station Announcements - Swiss</td>
   <td></td>
   <td>✔</td>
  </tr>
 </tbody>
</table>`;
        // Every element here is followed by whitespace, which the specification
        // does not allow the end tags to be omitted in front of
        const expected = `
<table>
 <caption>37547 TEE Electric Powered Rail Car Train Functions (Abbreviated)</caption>
 <colgroup><col><col><col></colgroup>
 <thead>
  <tr>
   <th>Function</th>
   <th>Control Unit</th>
   <th>Central Station</th>
  </tr>
 </thead>
 <tbody>
  <tr>
   <td>Headlights</td>
   <td>✔</td>
   <td>✔</td>
  </tr>
  <tr>
   <td>Interior Lights</td>
   <td>✔</td>
   <td>✔</td>
  </tr>
  <tr>
   <td>Electric locomotive operating sounds</td>
   <td>✔</td>
   <td>✔</td>
  </tr>
  <tr>
   <td>Engineer's cab lighting</td>
   <td></td>
   <td>✔</td>
  </tr>
  <tr>
   <td>Station Announcements - Swiss</td>
   <td></td>
   <td>✔</td>
  </tr>
 </tbody>
</table>`;

        return init(input, expected, options);
    });
});
