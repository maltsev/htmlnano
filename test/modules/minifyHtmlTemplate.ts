import { init } from '../htmlnano.ts';
import type { HtmlnanoOptions } from '../../src/types.js';

const scriptTypes = [
    'text/html',
    'text/template',
    'text/x-template',
    'text/x-handlebars-template',
    'text/x-handlebars',
    'text/x-mustache-template',
    'text/x-underscore-template',
    'text/x-jsrender',
    'text/x-jquery-tmpl',
    'text/x-kendo-template',
    'text/ng-template'
];

describe('minifyHtmlTemplate', () => {
    it('should minify script templates using built-in rules', () => {
        return init(
            `<script type="Text/X-Handlebars-Template; charset=utf-8">
                <div class="entry">
                    <h1>{{title}}</h1>
                </div>
            </script>`,
            '<script type="Text/X-Handlebars-Template; charset=utf-8"><div class="entry"> <h1>{{title}}</h1> </div></script>',
            {
                collapseWhitespace: 'conservative',
                minifyHtmlTemplate: true
            }
        );
    });

    it('should replace default rules when custom rules are provided', () => {
        return init(
            '<script type="text/x-handlebars-template"> <div> One </div> </script><template id="tpl"> <div> Two </div> </template>',
            '<script type="text/x-handlebars-template"> <div> One </div> </script><template id="tpl"><div> Two </div></template>',
            {
                collapseWhitespace: 'conservative',
                minifyHtmlTemplate: [{ tag: 'template', attrs: { id: 'tpl' } }]
            }
        );
    });

    scriptTypes.forEach((type) => {
        it(`should minify script templates of type "${type}"`, () => {
            return init(
                `<script type="${type}"> <div>  <b>x</b>  </div> </script>`,
                `<script type="${type}"><div> <b>x</b> </div></script>`,
                {
                    collapseWhitespace: 'conservative',
                    minifyHtmlTemplate: true
                }
            );
        });
    });

    it('should leave unknown script types untouched', () => {
        return init(
            '<script type="text/javascript"> var  x  =  1; </script>',
            '<script type="text/javascript"> var  x  =  1; </script>',
            {
                collapseWhitespace: 'conservative',
                minifyHtmlTemplate: true
            }
        );
    });

    it('should minify <template> content', () => {
        return init(
            '<template> <div>   <span>hi</span>   </div> </template>',
            '<template><div> <span>hi</span> </div></template>',
            {
                collapseWhitespace: 'conservative',
                minifyHtmlTemplate: true
            }
        );
    });

    it('should minify nested <template> inside <template>', () => {
        // The recursion disables minifyHtmlTemplate, so an inner <template>'s own
        // content is left untouched while the outer template content is minified.
        return init(
            '<template> <div> <template> <span>  a  </span> </template> </div> </template>',
            '<template><div> <template> <span>  a  </span> </template> </div></template>',
            {
                collapseWhitespace: 'conservative',
                minifyHtmlTemplate: true
            }
        );
    });

    it('should skip templates with an integrity attribute', () => {
        return init(
            '<script type="text/html" integrity="sha256-abc"> <div>   x   </div> </script>',
            '<script type="text/html" integrity="sha256-abc"> <div>   x   </div> </script>',
            {
                collapseWhitespace: 'conservative',
                minifyHtmlTemplate: true
            }
        );
    });

    it('should skip script templates with a src attribute', () => {
        return init(
            '<script type="text/html" src="tpl.html"></script>',
            '<script type="text/html" src="tpl.html"></script>',
            {
                collapseWhitespace: 'conservative',
                minifyHtmlTemplate: true
            }
        );
    });

    it('should match custom rules by tag and attrs, leaving non-matching alone', () => {
        return init(
            '<div data-tpl="1"> <span>  a  </span> </div><div> <span>  b  </span> </div>',
            '<div data-tpl="1"><span> a </span></div><div> <span> b </span> </div>',
            {
                collapseWhitespace: 'conservative',
                minifyHtmlTemplate: [{ tag: 'div', attrs: { 'data-tpl': '1' } }]
            }
        );
    });

    it('should match custom rules case-insensitively for attr names and tags', () => {
        return init(
            '<DIV Data-Tpl="1"> <span>  a  </span> </DIV>',
            '<DIV Data-Tpl="1"><span> a </span></DIV>',
            {
                collapseWhitespace: 'conservative',
                minifyHtmlTemplate: [{ tag: 'DIV', attrs: { 'Data-Tpl': '1' } }]
            }
        );
    });

    it('should keep mustache/handlebars syntax intact after minification', () => {
        return init(
            '<template> {{#each items}} <li>  {{name}}  </li> {{/each}} </template>',
            '<template>{{#each items}}<li> {{name}} </li>{{/each}}</template>',
            {
                collapseWhitespace: 'conservative',
                minifyHtmlTemplate: true
            }
        );
    });

    it('should propagate options such as removeComments inside the template', () => {
        return init(
            '<template><div><!-- gone -->x</div></template>',
            '<template><div>x</div></template>',
            {
                minifyHtmlTemplate: true,
                removeComments: 'all'
            }
        );
    });

    it('should terminate (not recurse infinitely) on deeply nested templates', () => {
        // Recursion disables minifyHtmlTemplate, so inner templates are not re-processed;
        // the important part is that processing completes without hanging.
        return init(
            '<template><template><template> <span>  x  </span> </template></template></template>',
            '<template><template><template> <span>  x  </span> </template></template></template>',
            {
                collapseWhitespace: 'conservative',
                minifyHtmlTemplate: true
            }
        );
    });

    it('should skip empty templates', () => {
        return init(
            '<template>   </template>',
            '<template>   </template>',
            { minifyHtmlTemplate: true }
        );
    });

    it('should do nothing when custom rules are an empty array', () => {
        return init(
            '<template> <div>  x  </div> </template>',
            '<template> <div>  x  </div> </template>',
            { minifyHtmlTemplate: [] }
        );
    });

    it('should not modify content when a custom rule value does not match', () => {
        return init(
            '<script type="text/html"> <div>  x  </div> </script>',
            '<script type="text/html"> <div>  x  </div> </script>',
            {
                collapseWhitespace: 'conservative',
                minifyHtmlTemplate: [{ tag: 'script', attrs: { type: 'text/template' } }] as HtmlnanoOptions['minifyHtmlTemplate']
            }
        );
    });
});
