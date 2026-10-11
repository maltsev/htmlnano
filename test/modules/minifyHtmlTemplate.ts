import { init, initWithPostHtmlOptions } from '../htmlnano.ts';
import type { HtmlnanoOptions } from '../../src/types.js';
import { expect } from 'expect';
import { parseFragment } from 'parse5';
import { presets, process as processHtml } from '../../dist/index.mjs';

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
    for (const payload of [
        '&lt;/ScRiPt&gt;&lt;img src=x onerror=alert(1)&gt;',
        '&lt;/script&#9;&gt;&lt;img src=x onerror=alert(1)&gt;',
        '&lt;/script/&gt;&lt;img src=x onerror=alert(1)&gt;',
        '&lt;!--&lt;ScRiPt&gt;'
    ]) {
        it(`should preserve script templates when decoding would change script parsing: ${payload}`, async () => {
            const html = `<SCRIPT type="text/html"><div title="${payload}"> x </div></SCRIPT><p>after</p>`;
            const result = await processHtml(html, {
                minifyHtmlTemplate: true,
                minifyCharacterReferences: true
            }, {});

            expect(result.html).toBe(html);
            expect(parseFragment(result.html)).toEqual(parseFragment(html));
        });
    }

    it('should still decode harmless references inside script templates', () => {
        return init(
            '<script type="text/html"><div title="&lt;/scripted&gt;">&copy;</div></script>',
            '<script type="text/html"><div title="</scripted>">©</div></script>',
            { minifyHtmlTemplate: true, minifyCharacterReferences: true }
        );
    });

    it('should prevent closing-tag injection in custom raw-text templates', async () => {
        const html = '<style><div title="&lt;/style&gt;&lt;img src=x onerror=alert(1)&gt;">x</div></style>';
        const result = await processHtml(html, {
            minifyHtmlTemplate: [{ tag: 'style' }],
            minifyCharacterReferences: true
        }, {});

        expect(result.html).toBe(html);
        expect(parseFragment(result.html)).toEqual(parseFragment(html));
    });

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

    const svgTemplate = '<template><svg viewBox="0 0 10 10"><path d="M 0 0 h 10 v 10 z" /></svg></template>';
    const optimizedSvgTemplate = '<template><svg viewBox="0 0 10 10"><path d="M0 0h10v10z"/></svg></template>';

    for (const presetName of ['safe', 'max'] as const) {
        it(`should preserve optimized SVG inside native templates with the ${presetName} preset`, async () => {
            const result = await processHtml(svgTemplate, presets[presetName]);
            expect(result.html).toBe(optimizedSvgTemplate);
        });
    }

    const outerPasses: HtmlnanoOptions[] = [
        { minifyJs: true },
        { minifyUrls: 'https://example.com/' },
        { removeXmlLeftovers: true },
        { removeUnusedCss: { tool: 'purgeCSS', keyframes: true } }
    ];

    for (const outerPass of outerPasses) {
        it(`should handle tagless SVG wrappers in the outer ${Object.keys(outerPass)[0]} pass`, async () => {
            const result = await processHtml(svgTemplate, {
                minifyHtmlTemplate: true,
                minifySvg: true,
                ...outerPass
            }, {});
            expect(result.html).toBe(optimizedSvgTemplate);
        });
    }

    it('should handle tagless SVG wrappers created before the template pass', async () => {
        const result = await processHtml(svgTemplate, {
            minifySvg: true,
            minifyHtmlTemplate: true
        }, {});
        expect(result.html).toBe(optimizedSvgTemplate);
    });

    it('should handle removed styles inside native templates in subsequent outer passes', async () => {
        const result = await processHtml('<template><style>.unused { color: red }</style><b>x</b></template>', presets.max);
        expect(result.html).toBe('<template><b>x</b></template>');
    });

    it('should preserve XML parsing and rendering options inside templates', () => {
        const html = '<template><svg><path /></svg><br /></template>';
        return initWithPostHtmlOptions(html, html, { minifyHtmlTemplate: true }, {
            xmlMode: true,
            closingSingleTag: 'slash',
            singleTags: ['path']
        });
    });

    it('should respect explicit attribute quoting inside templates', () => {
        return initWithPostHtmlOptions(
            '<template><div title="x"> y </div></template>',
            '<template><div title="x"> y </div></template>',
            { minifyHtmlTemplate: true, removeAttributeQuotes: true },
            { quoteAllAttributes: true }
        );
    });

    it('should keep encoded apostrophes when single-quoting template attributes', () => {
        return initWithPostHtmlOptions(
            '<template><div title="a&#39;b">&copy;</div></template>',
            '<template><div title=\'a&#39;b\'>©</div></template>',
            { minifyHtmlTemplate: true, minifyCharacterReferences: true },
            { quoteStyle: 1 }
        );
    });

    it('should not decode template attribute delimiters as text in the outer pass', async () => {
        const html = '<template><img title="&#34; onerror=&#34;alert(1)" src="x"></template>';
        const result = await processHtml(html, {
            minifyHtmlTemplate: true,
            minifyCharacterReferences: true
        }, {});

        expect(result.html).toBe(html);
        expect(parseFragment(result.html)).toEqual(parseFragment(html));
    });

    it('should preserve raw-text descendants when character references runs first', () => {
        const html = '<template><textarea><b title="&lt;/textarea&gt;&lt;img src=x onerror=alert(1)&gt;">x</b></textarea></template>';
        return init(html, html, { minifyCharacterReferences: true, minifyHtmlTemplate: true });
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

    for (const attr of ['INTEGRITY="hash"', 'Integrity', 'SRC="tpl.html"', 'Src=""']) {
        it(`should skip mixed-case script templates with ${attr}`, () => {
            const html = `<SCRIPT TYPE="text/html" ${attr}> <div>  x  </div> </SCRIPT>`;
            return init(html, html.replace(' Integrity>', ' Integrity="">'), {
                collapseWhitespace: 'conservative',
                minifyHtmlTemplate: true
            });
        });
    }

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

    for (const tag of ['textarea', 'iframe', 'noscript']) {
        it(`should preserve apparent templates inside <${tag}>`, () => {
            const html = `<${tag}><template> <b>  x  </b> </template></${tag}>`;
            return init(html, html, { minifyHtmlTemplate: true });
        });
    }

    for (const parent of ['div', 'template']) {
        it(`should preserve apparent templates after plaintext inside <${parent}>`, () => {
            const html = `<${parent}><plaintext>text</plaintext></${parent}><template> <b>  x  </b> </template>`;
            return init(html, html, { minifyHtmlTemplate: true });
        });
    }

    it('should not process descendants of a skipped template', () => {
        const html = '<template integrity="hash"><template> <b>  x  </b> </template></template>';
        return init(html, html, { minifyHtmlTemplate: true, collapseWhitespace: 'conservative' });
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
