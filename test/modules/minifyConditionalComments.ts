import { init } from '../htmlnano.ts';
import safePreset from '../../dist/presets/safe.mjs';
import type { HtmlnanoOptions } from '../../src/types.js';

describe('minifyConditionalComments', () => {
    const safePresetOptions = safePreset as HtmlnanoOptions;
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
        fullHtmlMinified: '<!DOCTYPE html><html class=no-js><head><meta content="IE=edge,chrome=1" http-equiv=X-UA-Compatible><meta charset=utf-8><!--[if lte IE 7]><style type=text/css>.title{color:red}</style><![endif]-->',
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
});
