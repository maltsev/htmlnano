import { expect } from 'expect';
import type { Expect } from 'expect';
import {
    extractCssFromStyleNode,
    extractTextContentFromNode,
    isAmpBoilerplate,
    isComment,
    isConditionalComment,
    isCssStyleType,
    isEventHandler,
    isStyleNode,
    normalizeMimeType,
    optionalImport,
    stripCssCdata,
    wrapCssCdata
} from '../src/helpers.ts';

describe('[helpers]', () => {
    context('isEventHandler()', () => {
        it('should recognize global handlers independently of attribute and tag casing', () => {
            expect(isEventHandler('OnClick', 'MY-WIDGET')).toBe(true);
            expect(isEventHandler('onanimationend', 'div')).toBe(true);
            expect(isEventHandler('ontouchstart', 'div')).toBe(true);
        });

        it('should preserve unknown on-prefixed attributes', () => {
            expect(isEventHandler('onstate', 'my-widget')).toBe(false);
            expect(isEventHandler('onion')).toBe(false);
            expect(isEventHandler('')).toBe(false);
        });

        it('should scope window handlers when an element name is provided', () => {
            expect(isEventHandler('onmessage')).toBe(true);
            expect(isEventHandler('onmessage', 'BODY')).toBe(true);
            expect(isEventHandler('onmessage', 'frameset')).toBe(true);
            expect(isEventHandler('onmessage', 'div')).toBe(false);
        });
    });

    context('isAmpBoilerplate()', () => {
        it('should detect AMP boilerplate', () => {
            expect(isAmpBoilerplate({
                tag: 'style',
                attrs: { 'amp-boilerplate': '' }
            })).toBe(true);
            expect(isAmpBoilerplate({ tag: 'style' })).toBe(false);
        });
    });

    context('isComment()', () => {
        it('should detect HTML comments', () => {
            expect(isComment(' <!-- comment --> ')).toBe(true);
            expect(isComment(' <!--[if IE 6]><p>You are using IE 6<![endif]-->')).toBe(true);
            expect(isComment('Some text')).toBe(false);
        });
    });

    context('isConditionalComment()', () => {
        it('should detect conditional HTML comments', () => {
            expect(isConditionalComment(' <!--[if IE 6]><p>You are using IE 6<![endif]-->')).toBe(true);
            expect(isConditionalComment(' <!-- comment --> ')).toBe(false);
            expect(isConditionalComment('Some text')).toBe(false);
        });
    });

    context('isStyleNode()', () => {
        it('should detect <style> nodes', () => {
            expect(isStyleNode({ tag: 'style', content: 'abc' })).toBe(true);
            expect(isStyleNode({ tag: 'style', content: ['a', 'b'] })).toBe(true);
            expect(isStyleNode({ tag: 'style' })).toBe(false);
            expect(isStyleNode({ tag: 'div' })).toBe(false);
            expect(isStyleNode({
                tag: 'style',
                content: 'abc',
                attrs: { 'amp-boilerplate': '' }
            })).toBe(false);
        });
    });

    context('extractCssFromStyleNode()', () => {
        it('should extract CSS from <style> node', () => {
            expect(extractCssFromStyleNode({
                tag: 'style',
                content: 'abc'
            })).toBe('abc');
            expect(extractCssFromStyleNode({
                tag: 'style',
                content: [
                    'abc',
                    'def'
                ]
            })).toBe('abc def');
        });
    });

    context('optionalImport()', () => {
        it('should return the dependency when resolved', async () => {
            const imported = await optionalImport('expect') as Expect | { expect: Expect };
            // In Node 20, expect module has both default and named exports
            // In Node 21+, the structure might be different
            // Check if we got the module object with expect property or the expect function directly
            // TODO: Maybe there is a better way to handle that?
            if (typeof imported === 'function' && imported.name === 'expect') {
                expect(imported).toBe(expect);
            } else {
                expect((imported as { expect: Expect }).expect).toBe(expect);
            }
        });

        it('should return null when module not found', async () => {
            expect(await optionalImport('null')).toBe(null);
        });

        it('should rethrow non-module-not-found errors', async () => {
            const moduleUrl = `${process.cwd()}/test/fixtures/optionalImportThrows.cjs`;

            await expect(optionalImport(moduleUrl)).rejects.toThrow('optional import boom');
        });
    });

    context('extractTextContentFromNode()', () => {
        it('should extract only string children from node content arrays', () => {
            expect(extractTextContentFromNode({
                tag: 'div',
                content: ['hello', { tag: 'span', content: ['ignored'] }, ' world']
            })).toBe('hello world');
        });

        it('should return empty string for missing or non-array content', () => {
            expect(extractTextContentFromNode({ tag: 'div' })).toBe('');
            expect(extractTextContentFromNode({ tag: 'div', content: 'hello' })).toBe('');
        });
    });

    context('stripCssCdata()', () => {
        it('should unwrap CDATA when present', () => {
            expect(stripCssCdata('<![CDATA[.a { color: red; }]]>')).toEqual({
                strippedCss: '.a { color: red; }',
                isCdataWrapped: true
            });
        });

        it('should keep input when no CDATA is present', () => {
            expect(stripCssCdata('.a { color: red; }')).toEqual({
                strippedCss: '.a { color: red; }',
                isCdataWrapped: false
            });
        });
    });

    context('wrapCssCdata()', () => {
        it('should wrap CSS when requested', () => {
            expect(wrapCssCdata('body{}', true)).toBe('<![CDATA[body{}]]>');
        });

        it('should keep CSS when no wrapping is requested', () => {
            expect(wrapCssCdata('body{}', false)).toBe('body{}');
        });
    });

    context('isCssStyleType()', () => {
        it('should treat missing type as CSS', () => {
            expect(isCssStyleType({ tag: 'style' })).toBe(true);
            expect(isCssStyleType({ tag: 'style', attrs: {} })).toBe(true);
        });

        it('should treat empty type as CSS', () => {
            expect(isCssStyleType({ tag: 'style', attrs: { type: '' } })).toBe(true);
        });

        it('should reject non-string types', () => {
            expect(isCssStyleType({ tag: 'style', attrs: { type: true } })).toBe(false);
        });

        it('should detect text/css types with parameters', () => {
            expect(isCssStyleType({ tag: 'style', attrs: { type: 'text/css; charset=utf-8' } })).toBe(true);
        });

        it('should reject non-CSS types', () => {
            expect(isCssStyleType({ tag: 'style', attrs: { type: 'text/plain' } })).toBe(false);
        });
    });

    context('normalizeMimeType()', () => {
        it('should normalize and lowercase mime types', () => {
            expect(normalizeMimeType(' Text/HTML; charset=utf-8 ')).toBe('text/html');
        });

        it('should return empty string for blank values', () => {
            expect(normalizeMimeType('   ')).toBe('');
        });
    });
});
