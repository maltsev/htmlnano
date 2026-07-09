import { expect } from 'expect';
import posthtml from 'posthtml';
import htmlnano from '../../dist/index.mjs';
import { init } from '../htmlnano.ts';
import type { PostHTMLTreeLike, HtmlnanoOptions } from '../../src/types.js';

describe('custom', () => {
    it('should apply a custom minifier module', () => {
        return init(
            '<div><span>hello</span></div>',
            '<div>hello</div>',
            { custom: getRemoveTagFunction('span') }
        );
    });

    it('should apply multiple custom minifier modules', () => {
        return init(
            '<div><span>hello</span></div>',
            '<div>hello</div>',
            { custom: [getRemoveTagFunction('span'), getRemoveTagFunction('span')] }
        );
    });

    it('should ignore falsy custom modules', () => {
        const customModules = [null, getRemoveTagFunction('span'), false] as unknown as
            HtmlnanoOptions['custom'];

        return init(
            '<div><span>hello</span></div>',
            '<div>hello</div>',
            { custom: customModules }
        );
    });

    it('should apply custom modules in order', () => {
        const order: string[] = [];

        function first(tree: PostHTMLTreeLike): PostHTMLTreeLike {
            order.push('first');
            return tree;
        }

        function second(tree: PostHTMLTreeLike): PostHTMLTreeLike {
            order.push('second');
            return tree;
        }

        return init(
            '<div></div>',
            '<div></div>',
            { custom: [first, second] }
        ).then(() => {
            expect(order).toEqual(['first', 'second']);
        });
    });

    it('should pass htmlnano options to the custom function', () => {
        let received: Partial<HtmlnanoOptions> | undefined;

        function capture(tree: PostHTMLTreeLike, options: Partial<HtmlnanoOptions>): PostHTMLTreeLike {
            received = options;
            return tree;
        }

        return init(
            '<div></div>',
            '<div></div>',
            { custom: capture, collapseWhitespace: 'conservative' }
        ).then(() => {
            expect(received).toBeTruthy();
            expect(received!.custom).toBe(capture);
            expect(received!.collapseWhitespace).toBe('conservative');
        });
    });

    it('should await a custom function that returns a promise', () => {
        function asyncRemoveSpan(tree: PostHTMLTreeLike): Promise<PostHTMLTreeLike> {
            return new Promise((resolve) => {
                setTimeout(() => {
                    tree.match({ tag: 'span' }, (node) => {
                        // @ts-expect-error tag should be a string
                        node.tag = false;
                        return node;
                    });
                    resolve(tree);
                }, 5);
            });
        }

        return init(
            '<div><span>hello</span></div>',
            '<div>hello</div>',
            { custom: asyncRemoveSpan as unknown as HtmlnanoOptions['custom'] }
        );
    });

    it('should await multiple promise-returning custom functions in order', () => {
        const order: string[] = [];

        function asyncStep(name: string) {
            return (tree: PostHTMLTreeLike): Promise<PostHTMLTreeLike> => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        order.push(name);
                        resolve(tree);
                    }, 5);
                });
            };
        }

        return init(
            '<div></div>',
            '<div></div>',
            { custom: [asyncStep('a'), asyncStep('b')] as unknown as HtmlnanoOptions['custom'] }
        ).then(() => {
            expect(order).toEqual(['a', 'b']);
        });
    });

    it('should propagate errors thrown from a custom function', () => {
        function throwing(): PostHTMLTreeLike {
            throw new Error('custom boom');
        }

        return posthtml([
            htmlnano({ custom: throwing as unknown as HtmlnanoOptions['custom'] }, {})
        ]).process('<div></div>').then(
            () => {
                throw new Error('should have thrown');
            },
            (error: unknown) => {
                expect((error as Error).message).toBe('custom boom');
            }
        );
    });

    it('should propagate rejected promises from a custom function', () => {
        function rejecting(): Promise<PostHTMLTreeLike> {
            return Promise.reject(new Error('async boom'));
        }

        return posthtml([
            htmlnano({ custom: rejecting as unknown as HtmlnanoOptions['custom'] }, {})
        ]).process('<div></div>').then(
            () => {
                throw new Error('should have rejected');
            },
            (error: unknown) => {
                expect((error as Error).message).toBe('async boom');
            }
        );
    });
});

function getRemoveTagFunction(tag: string) {
    return (tree: PostHTMLTreeLike, options?: HtmlnanoOptions): PostHTMLTreeLike => {
        expect(options?.custom).toBeTruthy();

        tree.match({ tag }, (node) => {
            // @ts-expect-error tag should be a string
            node.tag = false;
            return node;
        });

        return tree;
    };
}
