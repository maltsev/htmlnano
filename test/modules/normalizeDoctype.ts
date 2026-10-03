import { init } from '../htmlnano.ts';
import { expect } from 'expect';
import { parse, serialize } from 'parse5';
import { render } from 'posthtml-render';
import normalizeDoctypeModule from '../../src/_modules/normalizeDoctype.ts';
import type { PostHTMLTreeLike } from '../../src/types.ts';

describe('normalizeDoctype', () => {
    describe('true', () => {
        const options = {
            normalizeDoctype: true
        };

        it('should normalize XHTML 1.0 Strict doctype', () => {
            return init(
                '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html></html>',
                '<!doctype html><html></html>',
                options
            );
        });

        it('should normalize XHTML 1.0 Transitional doctype', () => {
            return init(
                '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html></html>',
                '<!doctype html><html></html>',
                options
            );
        });

        it('should normalize HTML 4.01 Strict doctype', () => {
            return init(
                '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd"><html></html>',
                '<!doctype html><html></html>',
                options
            );
        });

        it('should lowercase an already-short uppercase doctype', () => {
            return init(
                '<!DOCTYPE html><html></html>',
                '<!doctype html><html></html>',
                options
            );
        });

        it('should leave an already-short lowercase doctype unchanged', () => {
            return init(
                '<!doctype html><html></html>',
                '<!doctype html><html></html>',
                options
            );
        });

        it('should normalize a doctype with extra whitespace', () => {
            return init(
                '<!DOCTYPE   html   PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">',
                '<!doctype html>',
                options
            );
        });

        it('should normalize all HTML whitespace characters', () => {
            return init(
                '<!DOCTYPE\t\n\f\r html\t\n\f\r>',
                '<!doctype html>',
                options
            );
        });

        it('should continue to normalize complete malformed doctypes', () => {
            return init('<!DOCTYPE html PUBLIC>', '<!doctype html>', options);
        });

        for (const whitespace of ['\u00a0', '\u000b', '\ufeff']) {
            it(`should preserve a non-HTML whitespace separator U+${whitespace.charCodeAt(0).toString(16)}`, () => {
                const html = `<!DOCTYPE${whitespace}html><p>text</p>`;
                return init(html, html, options);
            });
        }

        it('should leave a document without a doctype unchanged', () => {
            return init(
                '<html><head></head><body>foo</body></html>',
                '<html><head></head><body>foo</body></html>',
                options
            );
        });

        it('should preserve content after the doctype exactly', () => {
            return init(
                '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">\n<html><head></head><body>  Hello <b>World</b>  </body></html>',
                '<!doctype html>\n<html><head></head><body>  Hello <b>World</b>  </body></html>',
                options
            );
        });

        it('should not treat an XML declaration as a doctype (posthtml drops the XML declaration itself)', () => {
            // The module leaves `<?xml ...?>` alone; posthtml's own renderer does
            // not emit the XML declaration, so only the doctype gets normalized.
            return init(
                '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html></html>',
                '\n<!doctype html><html></html>',
                options
            );
        });
    });

    describe('html5', () => {
        const cases: Array<{ name: string; input: PostHTMLTreeLike; expected: unknown }> = [
            {
                name: 'canonical lowercase input',
                input: ['<!doctype html>'] as PostHTMLTreeLike,
                expected: ['<!doctype html>']
            },
            {
                name: 'uppercase and mixed-case input',
                input: ['<!DoCtYpE HtMl>'] as PostHTMLTreeLike,
                expected: ['<!doctype html>']
            },
            {
                name: 'extra allowed ASCII whitespace',
                input: ['<!DOCTYPE \t\n\f\r html \t\n\f\r>'] as PostHTMLTreeLike,
                expected: ['<!doctype html>']
            },
            {
                name: 'about:legacy-compat doctype',
                input: ['<!DOCTYPE html SYSTEM "about:legacy-compat">'] as PostHTMLTreeLike,
                expected: ['<!DOCTYPE html SYSTEM "about:legacy-compat">']
            },
            {
                name: 'HTML 4.01 doctype',
                input: ['<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">'] as PostHTMLTreeLike,
                expected: ['<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">']
            },
            {
                name: 'XHTML doctype',
                input: ['<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">'] as PostHTMLTreeLike,
                expected: ['<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">']
            },
            {
                name: 'quirks-triggering doctype',
                input: ['<!DOCTYPE HTML PUBLIC "-//W3O//DTD W3 HTML Strict 3.0//EN//">'] as PostHTMLTreeLike,
                expected: ['<!DOCTYPE HTML PUBLIC "-//W3O//DTD W3 HTML Strict 3.0//EN//">']
            },
            {
                name: 'malformed doctype',
                input: ['<!DOCTYPE html PUBLIC>'] as PostHTMLTreeLike,
                expected: ['<!DOCTYPE html PUBLIC>']
            },
            {
                name: 'non-doctype string containing doctype markup',
                input: ['prefix <!DOCTYPE html> suffix'] as PostHTMLTreeLike,
                expected: ['prefix <!DOCTYPE html> suffix']
            },
            {
                name: 'nested doctype-like string',
                input: [{ tag: 'div', content: ['<!DOCTYPE html>'] }] as PostHTMLTreeLike,
                expected: [{ tag: 'div', content: ['<!DOCTYPE html>'] }]
            },
            {
                name: 'XML declaration',
                input: ['<?xml version="1.0" encoding="UTF-8"?>'] as PostHTMLTreeLike,
                expected: ['<?xml version="1.0" encoding="UTF-8"?>']
            }
        ];

        for (const { name, input, expected } of cases) {
            it(`handles ${name}`, () => {
                const result = normalizeDoctypeModule.default!(input, {}, 'html5');

                expect(result).toStrictEqual(expected);
            });
        }
    });

    for (const mode of [true, 'html5'] as const) {
        describe(`${mode} boundaries`, () => {
            // A custom parser or an earlier plugin may put a declaration and
            // other content in the same string node.
            const cases = [
                { name: 'trailing text', input: '<!DOCTYPE html>text' },
                { name: 'trailing markup', input: '<!DOCTYPE html><script>alert(1)</script>' },
                { name: 'trailing whitespace', input: '<!DOCTYPE html>\n' },
                { name: 'unterminated declaration', input: '<!DOCTYPE html' },
                { name: 'multiple declarations', input: '<!DOCTYPE html><!DOCTYPE html>' }
            ];

            for (const { name, input } of cases) {
                it(`should preserve a string containing ${name}`, () => {
                    const tree = [input] as PostHTMLTreeLike;
                    const result = normalizeDoctypeModule.default!(tree, {}, mode);

                    expect(result).toBe(tree);
                    expect(result).toStrictEqual([input]);
                });
            }

            it('should not activate markup following an unfinished declaration in a supplied tree', () => {
                const tree = [
                    '<!DOCTYPE html',
                    { tag: 'script', content: ['alert(1)'] }
                ] as PostHTMLTreeLike;
                const original = render(tree);
                const normalized = render(normalizeDoctypeModule.default!(tree, {}, mode));

                expect(normalized).toBe(original);
                expect(serialize(parse(normalized))).toBe(
                    '<!DOCTYPE html<script><html><head></head><body>alert(1)</body></html>'
                );
            });

            it('should preserve doctype-like markup in comments and raw text', () => {
                const content = '<!-- <!DOCTYPE html> --><script>const doctype = "<!DOCTYPE html>";</script><style>p::before { content: "<!DOCTYPE html>"; }</style>';
                return init(
                    `<!DOCTYPE html>${content}`,
                    `<!doctype html>${content}`,
                    { normalizeDoctype: mode }
                );
            });
        });
    }

    it('should do nothing when the module is disabled', () => {
        const legacy = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html></html>';
        return init(
            legacy,
            legacy,
            { normalizeDoctype: false }
        );
    });
});
