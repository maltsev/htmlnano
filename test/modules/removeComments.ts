import { init, initIdempotent } from '../htmlnano.ts';
import { expect } from 'expect';
import { assertSafeDomEquivalent } from '../dom-equivalence.ts';
import type { RemoveCommentsOptions } from '../../src/_modules/removeComments';
import safePreset from '../../dist/presets/safe.mjs';
import maxPreset from '../../dist/presets/max.mjs';

describe('removeComments', () => {
    context('Astro hydration', () => {
        const island = '<!--xs--><astro-island ssr="" await-children=""><div data-hk="s00">'
            + '<table><thead><tr><!--$--><th>name</th><!--/--></tr></thead></table>'
            + '<!--generated-hydration-id--><button>Next</button><!--/--></div>'
            + '<!--astro:end--></astro-island>';

        for (const removeComments of ['safe', true] as const) {
            it(`keeps Astro and renderer hydration comments with ${removeComments}`, () => {
                return initIdempotent(
                    '<!-- remove --><main>' + island + '<!-- remove --></main><!-- remove -->',
                    '<main>' + island + '</main>',
                    { removeComments }
                );
            });
        }

        it('keeps leading comment blocks separated from an island by whitespace', () => {
            const input = '<div><!--xs--> \n<!--generated-id-->\t<ASTRO-ISLAND><!--astro:end--></ASTRO-ISLAND></div>';
            return initIdempotent(input, input, { removeComments: 'safe' });
        });

        it('handles nested and sibling islands without preserving trailing comments', () => {
            const input = '<div><astro-island><!--outer--><section><astro-island><!--inner--><!--astro:end--></astro-island>'
                + '<!--still outer--></section><!--astro:end--></astro-island><!--remove--><p>x</p>'
                + island + '<!--remove--></div>';
            return initIdempotent(input, input.replace(/<!--remove-->/g, ''), { removeComments: 'safe' });
        });

        it('does not require an end marker to preserve island comments', () => {
            const input = '<astro-island><div><!--generated-id--></div></astro-island><!--remove-->';
            return initIdempotent(input, input.replace('<!--remove-->', ''), { removeComments: 'safe' });
        });

        it('removes matching comments outside islands and across text or element boundaries', () => {
            return initIdempotent(
                '<!--xs-->text<!--$--><span></span><!--/-->text<astro-island></astro-island><!--astro:end-->',
                'text<span></span>text<astro-island></astro-island>',
                { removeComments: 'safe' }
            );
        });

        it('still honors plaintext inside an island for the rest of the document', () => {
            const input = '<astro-island><plaintext><!--literal--></plaintext></astro-island><!--also literal-->';
            return init(input, input, { removeComments: 'safe' });
        });

        const explicitModes: RemoveCommentsOptions[] = ['all', /./, '/./', () => true];
        for (const removeComments of explicitModes) {
            it(`allows explicit removal of hydration comments with ${String(removeComments)}`, () => {
                return init(island, island.replace(/<!--[\s\S]*?-->/g, ''), { removeComments });
            });
        }
    });

    context('literal text and comment boundaries', () => {
        const modes: RemoveCommentsOptions[] = ['safe', 'all', /./, () => true];

        it('keeps comment-looking content in text elements in every removal mode', async () => {
            const textElements = ['script', 'style', 'textarea', 'title', 'xmp', 'iframe', 'noembed', 'noframes', 'noscript'];
            const input = textElements.map(tag => `<${tag}><!-- literal -->text</${tag}>`).join('')
                + '<NOSCRIPT><div><!-- also literal with scripting enabled --></div></NOSCRIPT>';

            for (const removeComments of modes) {
                await init(input + '<div><!-- remove --></div>', input + '<div></div>', { removeComments });
            }
        });

        it('keeps everything after plaintext, including outside its apparent ancestors', async () => {
            const input = '<!-- remove --><div><plaintext><!-- literal --></plaintext></div><!-- also literal -->';
            const output = '<div><plaintext><!-- literal --></plaintext></div><!-- also literal -->';

            for (const removeComments of modes) {
                await init(input, output, { removeComments });
            }
        });

        const boundaries = [
            ['<<!-- remove -->img src=x onerror=alert(1)>', '&lt;img src=x onerror=alert(1)>'],
            ['<div><<!-- one --><!-- two -->script>alert(1)</div>', '<div>&lt;script>alert(1)</div>'],
            ['&co<!-- remove -->py;', '&amp;copy;'],
            ['&not<!-- remove -->in;', '¬in;'],
            ['&#6<!-- remove -->5;', '\u00065;'],
            ['&#x3<!-- remove -->c;', '\u0003c;'],
            ['&#13<!-- remove -->0;', '&#13;0;'],
            ['&amp;<!-- remove -->copy;', '&amp;copy;']
        ];
        for (const [input, output] of boundaries) {
            it(`preserves text when deleting comments from ${JSON.stringify(input)}`, async () => {
                for (const removeComments of modes) {
                    await initIdempotent(input, output, { removeComments });
                }
                assertSafeDomEquivalent(input, output, 'safe', { kind: 'fragment' });
            });
        }
    });

    context('safe (default)', () => {
        const options = {
            removeComments: safePreset.removeComments as 'safe'
        };

        it('should remove HTML comments', () => {
            return init(
                '<div><!-- hello --></div> <!-- oo -->',
                '<div></div> ',
                options
            );
        });

        it('should not remove <!--noindex--> and <!--/noindex-->', () => {
            return init(
                '<!--noindex-->this text will not be indexed<!--/noindex-->',
                '<!--noindex-->this text will not be indexed<!--/noindex-->',
                options
            );
        });

        it('should not remove <!-- noindex --> with casing/spacing variations', () => {
            return init(
                '<!-- NoIndex -->this text will not be indexed<!-- /NoIndex -->',
                '<!-- NoIndex -->this text will not be indexed<!-- /NoIndex -->',
                options
            );
        });

        it('should not remove <!--sse--> and <!--/sse-->', () => {
            return init(
                '<!--sse-->Bad visitors won\'t see my phone number, 555-555-5555<!--/sse-->',
                '<!--sse-->Bad visitors won\'t see my phone number, 555-555-5555<!--/sse-->',
                options
            );
        });

        it('should not remove <!-- sse --> with casing/spacing variations', () => {
            return init(
                '<!-- SSe -->Bad visitors won\'t see my phone number, 555-555-5555<!-- /SSE -->',
                '<!-- SSe -->Bad visitors won\'t see my phone number, 555-555-5555<!-- /SSE -->',
                options
            );
        });

        it('should not remove conditional comments <!--[if expression]><!-->..<!--<![endif]-->', () => {
            return init(
                '<!--[if !mso]><!--><meta http-equiv="X-UA-Compatible" content="IE=edge"><!--<![endif]-->',
                '<!--[if !mso]><!--><meta http-equiv="X-UA-Compatible" content="IE=edge"><!--<![endif]-->',
                options
            );
        });

        it('should not remove conditional comments <!--[if expression]>..<![endif]-->', () => {
            return init(
                '<!--[if IE 8]><link href="ie8only.css" rel="stylesheet"><![endif]-->',
                '<!--[if IE 8]><link href="ie8only.css" rel="stylesheet"><![endif]-->',
                options
            );
        });

        it('should not remove excerpt comments <!-- more -->', () => {
            return init(
                'Lorem ipsum dolor sit amet <!-- more --> consectetur adipiscing elit',
                'Lorem ipsum dolor sit amet <!-- more --> consectetur adipiscing elit',
                options
            );
        });

        it('should not remove excerpt comments with casing/spacing variations', () => {
            return init(
                'Lorem ipsum <!-- MORE --> dolor sit amet',
                'Lorem ipsum <!-- MORE --> dolor sit amet',
                options
            );
        });

        it('should not remove excerpt comments with extra text', () => {
            return init(
                'Lorem ipsum <!-- more Read more --> dolor sit amet',
                'Lorem ipsum <!-- more Read more --> dolor sit amet',
                options
            );
        });

        it('should not remove license comments <!--! ... -->', () => {
            return init(
                '<!--! Copyright 2024 Example --><div>x</div>',
                '<!--! Copyright 2024 Example --><div>x</div>',
                options
            );
        });

        // https://github.com/maltsev/htmlnano/issues/137
        it('issue #137', () => {
            return init(
                '<div id="baz">Some text which... <!-- a comment --> ...surrounds a comment.</div>',
                '<div id="baz">Some text which...  ...surrounds a comment.</div>',
                options
            );
        });
    });

    context('all', () => {
        const options = {
            removeComments: maxPreset.removeComments as 'all'
        };

        it('should remove <!--noindex--> and <!--/noindex-->', () => {
            return init(
                '<!--noindex-->this text will not be indexed<!--/noindex-->',
                'this text will not be indexed',
                options
            );
        });

        it('should remove <!-- noindex --> with casing/spacing variations', () => {
            return init(
                '<!-- NoIndex -->this text will not be indexed<!-- /NoIndex -->',
                'this text will not be indexed',
                options
            );
        });

        it('should remove <!--sse--> and <!--/sse-->', () => {
            return init(
                '<!--sse-->Bad visitors won\'t see my phone number, 555-555-5555<!--/sse-->',
                'Bad visitors won\'t see my phone number, 555-555-5555',
                options
            );
        });

        it('should remove conditional comments', () => {
            return init(
                '<!--[if IE 8]><link href="ie8only.css" rel="stylesheet"><![endif]-->',
                '',
                options
            );
        });

        it('should remove excerpt comments <!-- more -->', () => {
            return init(
                'Lorem ipsum dolor sit amet <!-- more --> consectetur adipiscing elit',
                'Lorem ipsum dolor sit amet  consectetur adipiscing elit',
                options
            );
        });

        it('should remove license comments <!--! ... -->', () => {
            return init(
                '<!--! Copyright 2024 Example --><div>x</div>',
                '<div>x</div>',
                options
            );
        });
    });

    context('custom matcher', () => {
        it('calls the matcher once per HTML comment and never for literal text', async () => {
            const comments: string[] = [];
            await init(
                '<!-- root --><div><!-- remove --><!-- keep --><script><!-- literal --></script></div>',
                '<div><!-- keep --><script><!-- literal --></script></div>',
                {
                    removeComments: (comment) => {
                        comments.push(comment);
                        return !comment.includes('keep');
                    }
                }
            );
            expect(comments).toEqual(['<!-- root -->', '<!-- remove -->', '<!-- keep -->']);
        });

        for (const flags of ['g', 'y', 'gy']) {
            for (const asString of [false, true]) {
                it(`matches each comment independently with ${flags} flags (${asString ? 'string' : 'RegExp'})`, async () => {
                    const matcher = new RegExp('<!--remove-->', flags);
                    matcher.lastIndex = 5;
                    const options = { removeComments: asString ? matcher.toString() : matcher };
                    const input = '<!--remove--><!--keep--><!--remove--><div><!--remove--><!--keep--><!--remove--></div>';
                    const output = '<!--keep--><div><!--keep--></div>';

                    await init(input, output, options);
                    await init(input, output, options);
                    expect(matcher.lastIndex).toBe(5);
                });
            }
        }

        it('RegExp', () => {
            return init(
                '<!--noindex-->this text will not be indexed<!--/noindex-->Lorem ipsum dolor sit amet<!--more-->Lorem ipsum dolor sit amet',
                'this text will not be indexedLorem ipsum dolor sit amet<!--more-->Lorem ipsum dolor sit amet',
                {
                    removeComments: /<!--(\/)?noindex-->/
                }
            );
        });

        it('RegExp string', () => {
            return init(
                '<!--noindex-->this text will not be indexed<!--/noindex-->Lorem ipsum dolor sit amet<!--more-->Lorem ipsum dolor sit amet',
                'this text will not be indexedLorem ipsum dolor sit amet<!--more-->Lorem ipsum dolor sit amet',
                {
                    removeComments: '/<!--(\\/)?noindex-->/'
                }
            );
        });

        it('Function', () => {
            return init(
                '<!--noindex-->this text will not be indexed<!--/noindex-->Lorem ipsum dolor sit amet<!--more-->Lorem ipsum dolor sit amet',
                'this text will not be indexedLorem ipsum dolor sit amet<!--more-->Lorem ipsum dolor sit amet',
                {
                    removeComments: (comment) => {
                        if (comment.includes('noindex')) return true;
                        return false;
                    }
                }
            );
        });
    });

    context('invalid option', () => {
        it('falls back to safe behavior', () => {
            return init(
                '<!--noindex-->Keep<!--/noindex--><!-- removed -->',
                '<!--noindex-->Keep<!--/noindex-->',
                {
                    removeComments: '/[a-/' as unknown as RemoveCommentsOptions
                }
            );
        });
    });
});
