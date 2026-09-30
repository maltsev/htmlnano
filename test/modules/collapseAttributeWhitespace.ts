import { init } from '../htmlnano.ts';
import safePreset from '../../dist/presets/safe.mjs';

describe('collapseAttributeWhitespace', () => {
    const options = {
        collapseAttributeWhitespace: safePreset.collapseAttributeWhitespace
    };

    it('should collapse whitespaces inside list-like attributes', () => {
        return init(
            '<a class=" foo  bar baz ">click</a>',
            '<a class="foo bar baz">click</a>',
            options
        );
    });

    it('should collapse all ASCII whitespace in token lists', () => {
        return init(
            '<a class="\t\n\f\r foo\t\n\f\r bar\t\n\f\r ">click</a>',
            '<a class="foo bar">click</a>',
            options
        );
    });

    for (const whitespace of ['\u00a0', '\u2003', '\u2028', '\u2029', '\ufeff', '\u000b']) {
        it(`should preserve significant U+${whitespace.charCodeAt(0).toString(16)} in lists, URLs, numbers and CSS`, () => {
            const input = `<a class=" ${whitespace}foo${whitespace}bar${whitespace} " href=" ${whitespace}/page${whitespace} " style=" color:red${whitespace} "></a><input size=" ${whitespace}2 ">`;
            const expected = `<a class="${whitespace}foo${whitespace}bar${whitespace}" href="${whitespace}/page${whitespace}" style="color:red${whitespace}"></a><input size="${whitespace}2">`;
            return init(input, expected, options);
        });
    }

    it('should preserve non-ASCII token characters when attribute modules run together', () => {
        return init(
            '<div class=" b\u00a0a  b\u00a0a  c "></div>',
            '<div class="b\u00a0a c"></div>',
            {
                ...options,
                minifyAttributes: { redundantWhitespaces: 'safe' },
                deduplicateAttributeValues: true,
                sortAttributesWithLists: 'alphabetical'
            }
        );
    });

    it('should still trim JavaScript whitespace in event handlers', () => {
        return init(
            '<button onclick="\u00a0\u2028 return false; \ufeff">click</button>',
            '<button onclick="return false;">click</button>',
            options
        );
    });

    it('should collapse whitespaces inside link sizes attribute', () => {
        return init(
            '<link rel="icon" sizes=" 16x16  32x32 " href="/icon.png">',
            '<link rel="icon" sizes="16x16 32x32" href="/icon.png">',
            options
        );
    });

    it('should not alter img sizes attribute', () => {
        return init(
            '<img sizes=" 100vw  50vw " src="foo.jpg">',
            '<img sizes=" 100vw  50vw " src="foo.jpg">',
            options
        );
    });

    it('should collapse whitespaces inside single value attributes', () => {
        return init(
            '<a href="   https://example.com" style="display: none     ">click</a>',
            '<a href="https://example.com" style="display: none">click</a>',
            options
        );
    });

    for (const whitespaceOptions of [options, { minifyAttributes: { redundantWhitespaces: 'safe' as const } }, {
        ...options,
        minifyAttributes: { redundantWhitespaces: 'safe' as const }
    }]) {
        context(`syntax-sensitive trimming with ${Object.keys(whitespaceOptions).join(' and ')}`, () => {
            for (const usemap of [' #map', '#map ', '\t#map\n']) {
                it(`should preserve exact usemap references: ${JSON.stringify(usemap)}`, () => {
                    const input = `<img usemap="${usemap}"><map name="map"><area href="/page"></map>`;
                    return init(input, input, whitespaceOptions);
                });
            }

            for (const step of [' any ', '\tANY\n', 'any ', ' &#97;ny ']) {
                it(`should not turn padded step keywords into valid keywords: ${JSON.stringify(step)}`, () => {
                    const input = `<input type="number" step="${step}">`;
                    return init(input, input, whitespaceOptions);
                });
            }

            it('should still trim padded numeric step values', () => {
                return init('<input type="number" step="  0.5  ">', '<input type="number" step="0.5">', whitespaceOptions);
            });

            it('should preserve whitespace-only URL values', () => {
                const input = '<base href="https://example.com/other/"><form action=" "><button formaction="\t ">go</button></form><iframe src=" "></iframe><img src=" "><object data=" "></object>';
                return init(input, input, whitespaceOptions);
            });

            for (const style of ['--x:foo\\ ', '--x:\'foo  ', '--x:foo&#92; ', '--x:&apos;foo  ']) {
                it(`should preserve CSS whitespace in escapes and strings: ${style}`, () => {
                    return init(`<div style="  ${style}"></div>`, `<div style="${style}"></div>`, whitespaceOptions);
                });
            }
        });
    }

    it('should not alter non-list-like nor single value attributes', () => {
        return init(
            '<a id=" foo  bar " href=" baz  bar ">click</a>',
            '<a id=" foo  bar " href="baz  bar">click</a>',
            options
        );
    });

    it('should trim event handler attributes without collapsing inner whitespace', () => {
        return init(
            '<button onclick="  foo  bar  ">click</button>',
            '<button onclick="foo  bar">click</button>',
            options
        );
    });

    it('should preserve custom on-prefixed attributes when attribute modules run together', () => {
        const input = '<my-widget onstate=" return false; " ondata="   " onmessage=" return false; "></my-widget><div onstate=" return false; " onmessage=" return false; "></div>';
        return init(input, input, {
            ...options,
            minifyAttributes: { redundantWhitespaces: 'safe' },
            minifyJs: true,
            removeEmptyAttributes: true
        });
    });

    it('should still trim global event handlers on custom elements', () => {
        return init(
            '<my-widget onclick=" return false; " onpointerdown=" return false; "></my-widget>',
            '<my-widget onclick="return false;" onpointerdown="return false;"></my-widget>',
            options
        );
    });

    it('should trim window event handlers on body and frameset elements', () => {
        return init(
            '<body onmessage=" return false; "></body><frameset onbeforeunload=" return false; "></frameset>',
            '<body onmessage="return false;"></body><frameset onbeforeunload="return false;"></frameset>',
            options
        );
    });

    it('should not trim single value attributes on unrelated tags', () => {
        return init(
            '<div href="  https://example.com  ">click</div>',
            '<div href="  https://example.com  ">click</div>',
            options
        );
    });

    for (const tagName of ['div', 'my-widget']) {
        it(`should preserve nonglobal list attributes on <${tagName}>`, () => {
            const input = `<${tagName} rel=" foo  bar " ping=" foo  bar " sandbox=" foo  bar " headers=" foo  bar " sizes=" foo  bar "></${tagName}>`;
            return init(input, input, {
                ...options,
                minifyAttributes: { redundantWhitespaces: 'safe' },
                deduplicateAttributeValues: true,
                sortAttributesWithLists: 'alphabetical'
            });
        });
    }

    it('should preserve custom dropzone values while collapsing global class values', () => {
        return init(
            '<my-widget dropzone=" foo  bar " class=" foo  bar "></my-widget>',
            '<my-widget dropzone=" foo  bar " class="foo bar"></my-widget>',
            { ...options, minifyAttributes: { redundantWhitespaces: 'safe' } }
        );
    });

    it('should still collapse scoped token lists on native elements', () => {
        return init(
            '<a rel=" foo  bar " ping=" /foo  /bar "></a><form rel=" foo  bar "></form><iframe sandbox=" allow-scripts  allow-forms "></iframe><table><tr><td headers=" foo  bar "></td><th headers=" foo  bar "></th></tr></table>',
            '<a rel="foo bar" ping="/foo /bar"></a><form rel="foo bar"></form><iframe sandbox="allow-scripts allow-forms"></iframe><table><tr><td headers="foo bar"></td><th headers="foo bar"></th></tr></table>',
            options
        );
    });

    it('should collapse whitespaces inside srcset', () => {
        return init(
            '<img srcset="  image.png   480w ,\n  image2.png 2x  " src="image.png">',
            '<img srcset="image.png 480w,image2.png 2x" src="image.png">',
            options
        );
    });

    it('should collapse whitespaces inside source srcset and link imagesrcset', () => {
        return init(
            '<link rel="preload" as="image" imagesrcset="image.png 480w, image2.png 2x"><picture><source srcset="image.png 480w, image2.png 2x"></picture>',
            '<link rel="preload" as="image" imagesrcset="image.png 480w,image2.png 2x"><picture><source srcset="image.png 480w,image2.png 2x"></picture>',
            options
        );
    });

    it('should keep a whitespace after the comma when a candidate has no descriptor', () => {
        // "image.png,image2.png 2x" would be parsed as a single URL
        return init(
            '<img srcset="image.png,   image2.png 2x">',
            '<img srcset="image.png, image2.png 2x">',
            options
        );
    });

    it('should keep the commas inside URLs and descriptors', () => {
        return init(
            '<img srcset="image,1.png 480w, image,2.png 2x">',
            '<img srcset="image,1.png 480w,image,2.png 2x">',
            options
        );
    });

    it('should not alter srcset on unrelated tags', () => {
        return init(
            '<div srcset="image.png 480w, image2.png 2x"></div>',
            '<div srcset="image.png 480w, image2.png 2x"></div>',
            options
        );
    });

    it('should not alter an empty srcset', () => {
        return init(
            '<img srcset=" " src="image.png">',
            '<img srcset=" " src="image.png">',
            options
        );
    });

    it('should retain an unfinished parenthesized descriptor at EOF', () => {
        return init(
            '<img srcset="  good.png 2x,  bad.png  (unfinished, other.png 3x  ">',
            '<img srcset="good.png 2x,bad.png (unfinished, other.png 3x  ">',
            options
        );
    });

    it('should not turn a malformed srcset candidate into a valid fallback', () => {
        return init(
            '<img srcset=" bad.png 1x ( ">',
            '<img srcset="bad.png 1x ( ">',
            options
        );
    });

    it('should preserve whitespace and commas inside parenthesized descriptors', () => {
        return init(
            '<img srcset="bad.png  (foo,  bar)  ,  good.png 2x">',
            '<img srcset="bad.png (foo,  bar),good.png 2x">',
            options
        );
    });

    for (const srcset of [
        'a.png&#44; 1x , b.png 2x',
        'a.png&comma; 1x , b.png 2x',
        'bad.png &#40;  ,  good.png 2x',
        'a.png &#49;x , b.png 2x'
    ]) {
        it(`should leave encoded srcset syntax untouched: ${srcset}`, () => {
            const input = `<img srcset="${srcset}">`;
            return init(input, input, options);
        });
    }

    it('should preserve non-ASCII whitespace within srcset URLs and descriptors', () => {
        return init(
            '<img srcset="  image\u00a0name.png  2x, bad.png \u00a02x, good.png 3x  ">',
            '<img srcset="image\u00a0name.png 2x,bad.png \u00a02x,good.png 3x">',
            options
        );
    });

    it('should preserve data URLs, extra commas and consecutive descriptorless candidates', () => {
        return init(
            '<img srcset=" , data:image/png;base64,AAAA,  image.png,,,  image2.png 2x, ">',
            '<img srcset="data:image/png;base64,AAAA, image.png, image2.png 2x">',
            options
        );
    });
});
