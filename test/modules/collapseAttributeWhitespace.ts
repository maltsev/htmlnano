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

    it('should not trim single value attributes on unrelated tags', () => {
        return init(
            '<div href="  https://example.com  ">click</div>',
            '<div href="  https://example.com  ">click</div>',
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
});
