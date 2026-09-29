import { init } from '../htmlnano.ts';
import { expect } from 'expect';
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

    it('should do nothing when the module is disabled', () => {
        const legacy = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html></html>';
        return init(
            legacy,
            legacy,
            { normalizeDoctype: false }
        );
    });
});
