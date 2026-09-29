import { expect } from 'expect';
import { performance } from 'node:perf_hooks';
import { init } from '../htmlnano.ts';
import { process as processHtml } from '../../dist/index.mjs';
import safePreset from '../../dist/presets/safe.mjs';
import type { HtmlnanoOptions } from '../../src/types.js';

describe('minifyConditionalComments', () => {
    const safePresetOptions = safePreset as HtmlnanoOptions;
    const safeOptionsWithConditionalComments = {
        ...safePresetOptions,
        minifyConditionalComments: true
    } satisfies HtmlnanoOptions;
    const fixture = {
        fullHtml: `
<!DOCTYPE html>
<html class="no-js">
    <head>
        <meta content="IE=edge,chrome=1" http-equiv="X-UA-Compatible">
        <meta charset="utf-8">
        <!--[if lte IE 7]>
            <style type="text/css">
                .title {
                    color: red;
                }
            </style>
        <![endif]-->
    </head>
</html>`,
        fullHtmlMinified: '<!doctype html><html class=no-js><head><meta content="IE=edge,chrome=1" http-equiv=X-UA-Compatible><meta charset=utf-8><!--[if lte IE 7]><style type=text/css>.title{color:red}</style><![endif]-->',
        multipleConditionalComment: `
<!--[if lt IE 7 ]>
    <div class="ie6">
    </div>
<![endif]-->
<!--[if IE 7 ]>
    <div class="ie7">
    </div>
<![endif]-->
<!--[if IE 8 ]>
    <div class="ie8">
    </div>
<![endif]-->
<!--[if IE 9 ]>
    <div class="ie9">
    </div>
<![endif]-->
<!--[if (gt IE 9)|!(IE)]><!-->
    <div class="w3c">
    </div>
<!--<![endif]-->`,
        multipleConditionalCommentMinified: '<!--[if lt IE 7 ]><div class=ie6> </div><![endif]--><!--[if IE 7 ]><div class=ie7> </div><![endif]--><!--[if IE 8 ]><div class=ie8> </div><![endif]--><!--[if IE 9 ]><div class=ie9> </div><![endif]--><!--[if (gt IE 9)|!(IE)]><!--><div class=w3c> </div><!--<![endif]-->',
        singleLineMultipleConditionalComment: `
<!--[if lt IE 7 ]><div class="ie6"></div><![endif]--><!--[if IE 7 ]><div class="ie7"></div><![endif]--><!--[if IE 8 ]><div class="ie8"></div><![endif]--><!--[if IE 9 ]><div class="ie9"></div><![endif]--><!--[if (gt IE 9)|!(IE)]><!--><div class="w3c"></div><!--<![endif]-->`,
        htmlTagIncludedConditionalComment: `
        <!--[if lt IE 7]><html class="no-js ie6"><![endif]-->
        <!--[if IE 7]><html class="no-js ie7"><![endif]-->
        <!--[if IE 8]><html class="no-js ie8"><![endif]-->
        <!--[if gt IE 8]><!--><html class="no-js"><!--<![endif]-->`,
        htmlTagIncludedConditionalCommentMinified: `
        <!--[if lt IE 7]><html class="no-js ie6"><![endif]-->
        <!--[if IE 7]><html class="no-js ie7"><![endif]-->
        <!--[if IE 8]><html class="no-js ie8"><![endif]-->
        <!--[if gt IE 8]><!--><html class="no-js"><!--<![endif]--></html>`,
        revealedConditionalComment: `
<!--[if gt IE 8]><!-->
    <div class="w3c">
        <span>Text</span>
    </div>
<!--<![endif]-->`,
        revealedConditionalCommentMinified: '<!--[if gt IE 8]><!--><div class=w3c> <span>Text</span> </div><!--<![endif]-->',
        multipleConditionalCommentWithText: '<!--[if IE 7]><div> a </div><![endif]-->X<!--[if IE 8]><div> b </div><![endif]-->',
        multipleConditionalCommentWithTextMinified: '<!--[if IE 7]><div> a </div><![endif]-->X<!--[if IE 8]><div> b </div><![endif]-->',
        emptyConditionalComment: '<!--[if IE 7]><![endif]-->',
        endConditionalComment: '<!--<![endif]-->'
    };

    const evaluationFixtures = [
        {
            name: 'downlevel-hidden nested markup',
            input: '<!--[if IE]><div class="legacy">  <span> Old IE </span> </div><![endif]-->',
            expected: '<!--[if IE]><div class=legacy> <span> Old IE </span> </div><![endif]-->'
        },
        {
            name: 'downlevel-revealed nested markup',
            input: '<!--[if !IE]><!--><section class="modern">  <strong> Modern </strong> </section><!--<![endif]-->',
            expected: '<!--[if !IE]><!--><section class=modern> <strong> Modern </strong> </section><!--<![endif]-->'
        },
        {
            name: 'styles and scripts',
            input: '<!--[if IE]><style type="text/css"> .legacy { color: red; } </style><script type="text/javascript"> var total = 1 + 2; </script><![endif]-->',
            expected: '<!--[if IE]><style type=text/css>.legacy{color:red}</style><script type=text/javascript>var total=3;</script><![endif]-->'
        },
        {
            name: 'malformed partial wrapper',
            input: '<!--[if IE]><div class="legacy"> partial </div>-->',
            expected: '<!--[if IE]><div class="legacy"> partial </div>-->'
        },
        {
            name: 'opening html without a closing tag',
            input: '<!--[if IE]><html class="no-js ie"><body><p> Old IE </p><![endif]-->',
            expected: '<!--[if IE]><html class="ie no-js"><body><p> Old IE <![endif]-->'
        },
        {
            name: 'multiple comments in one text node',
            input: 'A<!--[if IE 7]><div> seven </div><![endif]-->B<!--[if IE 8]><div> eight </div><![endif]-->C',
            expected: 'A<!--[if IE 7]><div> seven </div><![endif]-->B<!--[if IE 8]><div> eight </div><![endif]-->C'
        },
        {
            name: 'nested conditional comments',
            input: '<!--[if IE]><div> outer </div><!--[if IE 8]><span> inner </span><![endif]--><p> end </p><![endif]-->',
            // PostHTML treats the inner close as the outer comment's close. The
            // module must not recursively parse and further alter that result.
            expected: '<!--[if IE]><div> outer </div><!--[if IE 8]><span> inner </span><![endif]--><p> end </p>'
        },
        {
            name: 'invalid inner html',
            input: '<!--[if IE]><div data-label="unterminated>content</div><![endif]-->',
            expected: '<!--[if IE]><div data-label="unterminated>content</div><![endif]-->'
        }
    ];

    async function processWithSafeOptions(input: string, minifyConditionalComments: boolean) {
        const options = minifyConditionalComments ? safeOptionsWithConditionalComments : safePresetOptions;
        const result = await processHtml(input, options, {}, {});
        return String(result.html);
    }

    async function measureFixtures(minifyConditionalComments: boolean) {
        const start = performance.now();
        let outputBytes = 0;

        for (const { input } of evaluationFixtures) {
            outputBytes += Buffer.byteLength(await processWithSafeOptions(input, minifyConditionalComments));
        }

        return {
            outputBytes,
            processingTimeMs: performance.now() - start
        };
    }

    it('common html', () => {
        return init(
            fixture.fullHtml,
            fixture.fullHtmlMinified,
            {
                ...safePresetOptions,
                minifyConditionalComments: true
            }
        );
    });

    it('multiple conditional comment', () => {
        return init(
            fixture.multipleConditionalComment,
            fixture.multipleConditionalCommentMinified,
            {
                ...safePresetOptions,
                minifyConditionalComments: true
            }
        );
    });

    it('multiple conditional comment in single line', () => {
        return init(
            fixture.singleLineMultipleConditionalComment,
            fixture.singleLineMultipleConditionalComment,
            {
                minifyConditionalComments: true
            }
        );
    });

    it('<html> in conditional comment', () => {
        return init(
            fixture.htmlTagIncludedConditionalComment,
            fixture.htmlTagIncludedConditionalCommentMinified,
            {
                minifyConditionalComments: true
            }
        );
    });

    it('downlevel-revealed conditional comment', () => {
        return init(
            fixture.revealedConditionalComment,
            fixture.revealedConditionalCommentMinified,
            {
                ...safePresetOptions,
                minifyConditionalComments: true
            }
        );
    });

    it('multiple conditional comments with text between', () => {
        return init(
            fixture.multipleConditionalCommentWithText,
            fixture.multipleConditionalCommentWithTextMinified,
            {
                ...safePresetOptions,
                minifyConditionalComments: true
            }
        );
    });

    it('empty conditional comment', () => {
        return init(
            fixture.emptyConditionalComment,
            fixture.emptyConditionalComment,
            {
                minifyConditionalComments: true
            }
        );
    });

    it('end conditional comment only', () => {
        return init(
            fixture.endConditionalComment,
            fixture.endConditionalComment,
            {
                minifyConditionalComments: true
            }
        );
    });

    describe('safe preset evaluation', () => {
        for (const { name, input, expected } of evaluationFixtures) {
            it(name, async () => {
                expect(await processWithSafeOptions(input, true)).toBe(expected);
            });
        }

        it('measures aggregate size and processing time with the actual safe options', async () => {
            const disabled = await measureFixtures(false);
            const enabled = await measureFixtures(true);

            expect({
                disabledBytes: disabled.outputBytes,
                enabledBytes: enabled.outputBytes,
                rawBytesSaved: disabled.outputBytes - enabled.outputBytes
            }).toStrictEqual({
                disabledBytes: 671,
                enabledBytes: 645,
                rawBytesSaved: 26
            });
            expect(disabled.processingTimeMs).toBeGreaterThan(0);
            expect(enabled.processingTimeMs).toBeGreaterThan(0);
        });
    });
});
