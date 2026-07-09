import { expect } from 'expect';
import { init } from '../htmlnano.ts';
import safePreset from '../../dist/presets/safe.mjs';
import maxPreset from '../../dist/presets/max.mjs';
import ampSafePreset from '../../dist/presets/ampSafe.mjs';

describe('minifyUrls', () => {
    it('shouldn\'t be enabled with safe preset', () => {
        const html = '<a href="https://example.com/foo/bar/baz">bar</a>';
        expect(safePreset.minifyUrls).toBe(false);
        return init(html, html, {
            minifyUrls: false
        });
    });

    it('shouldn\'t be enabled with max preset', () => {
        const html = '<a href="https://example.com/foo/bar/baz">bar</a>';
        expect(maxPreset.minifyUrls).toBe(false);
        return init(html, html, { minifyUrls: false });
    });

    it('shouldn\'t be enabled with ampSafe preset', () => {
        const html = '<a href="https://example.com/foo/bar/baz">bar</a>';
        expect(ampSafePreset.minifyUrls).toBe(false);
        return init(html, html, { minifyUrls: false });
    });

    it('shouldn\'t be enabled with invalid configuration', () => {
        const html = '<a href="https://example.com/foo/bar/baz">bar</a>';
        return Promise.all([
            // @ts-expect-error invalid configuration is ignored at runtime
            init(html, html, { minifyUrls: 1000 }),
            // "true" is not allowed since relateurl requires a URL instance for base
            // @ts-expect-error invalid configuration is ignored at runtime
            init(html, html, { minifyUrls: true })
        ]);
    });

    it('should work with URL', () => {
        const html = '<a href="https://example.com/foo/bar/baz">bar</a>';
        const expected = '<a href="foo/bar/baz">bar</a>';

        return init(
            html,
            expected,
            { minifyUrls: new URL('https://example.com') }
        );
    });

    it('should work with string', () => {
        const html = '<a href="https://example.com/foo/bar/baz">bar</a>';
        const expected = '<a href="foo/bar/baz">bar</a>';

        return init(
            html,
            expected,
            { minifyUrls: 'https://example.com' }
        );
    });

    it('should work with sub-directory', () => {
        return Promise.all([
            init(
                '<a href="https://example.com/foo/bar/baz">bar</a>',
                '<a href="bar/baz">bar</a>',
                { minifyUrls: 'https://example.com/foo/' }
            ),
            init(
                '<a href="https://example.com/foo/bar">bar</a>',
                '<a href="../bar">bar</a>',
                { minifyUrls: 'https://example.com/foo/baz/' }
            ),
            init(
                '<a href="https://example.com/foo/bar/baz">bar</a>',
                '<a href="/foo/bar/baz">bar</a>',
                { minifyUrls: 'https://example.com/baz/' }
            ),
            init(
                '<a href="https://example.com/foo/bar/index.html">bar</a>',
                '<a href="/foo/bar/">bar</a>',
                { minifyUrls: 'https://example.com/bar/baz/' }
            )
        ]);
    });

    it('should produce protocol-relative urls for same-scheme cross-host links', () => {
        return init(
            '<a href="https://other.com/foo">bar</a>',
            '<a href="//other.com/foo">bar</a>',
            { minifyUrls: 'https://example.com/' }
        );
    });

    it('shouldn\'t process link[rel=canonical] tag', () => {
        const html = '<link href="https://example.com/baz/" rel="canonical">';

        return init(html, html, { minifyUrls: 'https://example.com/' });
    });

    it('should process srcset', () => {
        return init(
            '<img srcset="https://example.com/foo/bar/image.png 1x, https://example.com/foo/bar/image2.png.png 2x">',
            '<img srcset="../bar/image.png 1x, ../bar/image2.png.png 2x">',
            { minifyUrls: 'https://example.com/foo/baz/' }
        );
    });

    it('shouldn\'t process "invalid" srcset', () => {
        const html = '<img srcset="https://example.com/foo/bar/image.png 1y ,https://example.com/foo/bar/image2.png.png 2y">';

        return init(
            html,
            html,
            { minifyUrls: 'https://example.com/foo/baz/' }
        );
    });

    it('should minify javascript url', () => {
        return init(
            '<img src="javascript:alert(true)">',
            '<img src="javascript:alert(!0)">',
            { minifyUrls: 'https://example.com/foo/baz/' }
        );
    });

    it('should minify javascript url with mixed case protocol', () => {
        return init(
            '<img src="JaVaScRiPt:alert(true)">',
            '<img src="javascript:alert(!0)">',
            { minifyUrls: 'https://example.com/foo/baz/' }
        );
    });

    it('should minify javascript url with leading whitespace', () => {
        return init(
            '<img src="  JaVaScRiPt:alert(true)">',
            '<img src="  javascript:alert(!0)">',
            { minifyUrls: 'https://example.com/foo/baz/' }
        );
    });

    it('should skip non-http schemes', () => {
        const html = '<a href="mailto:user@example.com">mail</a><a href="tel:+123">tel</a><a href="data:text/plain,hi">data</a>';
        return init(html, html, { minifyUrls: 'https://example.com/' });
    });

    it('should skip hash and query only urls', () => {
        const html = '<a href="#section">hash</a><a href="?foo=bar">query</a>';
        return init(html, html, { minifyUrls: 'https://example.com/' });
    });

    it('should process link imagesrcset', () => {
        return init(
            '<link rel="preload" imagesrcset="https://example.com/foo/bar.png 1x, https://example.com/foo/baz.png 2x">',
            '<link rel="preload" imagesrcset="bar.png 1x, baz.png 2x">',
            { minifyUrls: 'https://example.com/foo/' }
        );
    });

    it('should strip the default port for the matching scheme', () => {
        return Promise.all([
            init(
                '<a href="https://example.com:443/foo/bar">bar</a>',
                '<a href="bar">bar</a>',
                { minifyUrls: 'https://example.com/foo/' }
            ),
            init(
                '<a href="http://other.com:80/foo/bar">bar</a>',
                '<a href="http://other.com/foo/bar">bar</a>',
                { minifyUrls: 'https://example.com/foo/' }
            )
        ]);
    });

    it('shouldn\'t strip a non-default port', () => {
        return Promise.all([
            init(
                '<a href="https://other.com:8443/foo/bar">bar</a>',
                '<a href="//other.com:8443/foo/bar">bar</a>',
                { minifyUrls: 'https://example.com/foo/' }
            ),
            init(
                '<a href="http://other.com:443/foo/bar">bar</a>',
                '<a href="http://other.com:443/foo/bar">bar</a>',
                { minifyUrls: 'https://example.com/foo/' }
            )
        ]);
    });

    it('should remove a trailing empty query or fragment', () => {
        return Promise.all([
            init(
                '<a href="https://example.com/foo/bar?">bar</a>',
                '<a href="bar">bar</a>',
                { minifyUrls: 'https://example.com/foo/' }
            ),
            init(
                '<a href="https://example.com/foo/bar#">bar</a>',
                '<a href="bar">bar</a>',
                { minifyUrls: 'https://example.com/foo/' }
            ),
            init(
                '<a href="https://example.com/foo/bar?#">bar</a>',
                '<a href="bar">bar</a>',
                { minifyUrls: 'https://example.com/foo/' }
            )
        ]);
    });

    it('shouldn\'t remove a non-empty query or fragment', () => {
        return Promise.all([
            init(
                '<a href="https://example.com/foo/bar?x=1">bar</a>',
                '<a href="bar?x=1">bar</a>',
                { minifyUrls: 'https://example.com/foo/' }
            ),
            init(
                '<a href="https://example.com/foo/bar#top">bar</a>',
                '<a href="bar#top">bar</a>',
                { minifyUrls: 'https://example.com/foo/' }
            )
        ]);
    });

    it('should normalize srcset urls', () => {
        return init(
            '<img srcset="https://example.com:443/foo/bar.png 1x, https://example.com/foo/baz.png# 2x">',
            '<img srcset="bar.png 1x, baz.png 2x">',
            { minifyUrls: 'https://example.com/foo/' }
        );
    });

    it('shouldn\'t normalize canonical link or javascript urls', () => {
        return Promise.all([
            init(
                '<link href="https://example.com:443/foo/bar#" rel="canonical">',
                '<link href="https://example.com:443/foo/bar#" rel="canonical">',
                { minifyUrls: 'https://example.com/foo/' }
            ),
            init(
                '<a href="javascript:alert(true)">js</a>',
                '<a href="javascript:alert(!0)">js</a>',
                { minifyUrls: 'https://example.com/foo/' }
            )
        ]);
    });
});
