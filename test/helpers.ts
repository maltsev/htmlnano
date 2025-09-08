import { expect } from 'expect'
import { isAmpBoilerplate, isComment, isConditionalComment, isStyleNode, extractCssFromStyleNode, optionalImport } from '../dist/helpers.mjs'

describe('[helpers]', () => {
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
            const imported = await optionalImport('expect');
            // In Node 20, expect module has both default and named exports
            // In Node 21+, the structure might be different
            // Check if we got the module object with expect property or the expect function directly
            // TODO: Maybe there is a better way to handle that?
            if (typeof imported === 'function' && imported.name === 'expect') {
                expect(imported).toBe(expect);
            } else {
                expect(imported.expect).toBe(expect);
            }
        });

        it('should return null when module not found', async () => {
            expect(await optionalImport('null')).toBe(null);
        });
    });
});
