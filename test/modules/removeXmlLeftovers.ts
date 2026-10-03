import { init, initIdempotent, initWithPostHtmlOptions } from '../htmlnano.ts';
import maxPreset from '../../dist/presets/max.mjs';

describe('removeXmlLeftovers', () => {
    const options = {
        removeXmlLeftovers: maxPreset.removeXmlLeftovers
    };

    it('should remove xmlns and matching xml:lang from <html>', () => {
        return init(
            '<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en"></html>',
            '<html lang="en"></html>',
            options
        );
    });

    it('should remove xml:lang regardless of case when it matches lang', () => {
        return init(
            '<html lang="en" XML:LANG="EN"></html>',
            '<html lang="en"></html>',
            options
        );
    });

    it('should keep xml:lang when lang differs', () => {
        return init(
            '<html lang="en" xml:lang="fr"></html>',
            '<html lang="en" xml:lang="fr"></html>',
            options
        );
    });

    it('should keep xml:lang when lang is missing', () => {
        return init(
            '<p xml:lang="en"></p>',
            '<p xml:lang="en"></p>',
            options
        );
    });

    it('should remove matching xml:lang on any element that also has lang', () => {
        return init(
            '<p lang="de" xml:lang="de"></p>',
            '<p lang="de"></p>',
            options
        );
    });

    it('should keep xmlns with a different value on <html>', () => {
        return init(
            '<html xmlns="http://example.com/ns"></html>',
            '<html xmlns="http://example.com/ns"></html>',
            options
        );
    });

    it('should keep xmlns on <svg>', () => {
        return init(
            '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
            '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
            options
        );
    });

    it('should not touch the XHTML xmlns on non-html elements', () => {
        return init(
            '<div xmlns="http://www.w3.org/1999/xhtml"></div>',
            '<div xmlns="http://www.w3.org/1999/xhtml"></div>',
            options
        );
    });

    for (const value of ['HTTP://www.w3.org/1999/xhtml', 'http://www.w3.org/1999/XHTML', ' http://www.w3.org/1999/xhtml ']) {
        it(`should preserve a namespace that is not an exact match: ${JSON.stringify(value)}`, () => {
            const html = `<html xmlns="${value}"></html>`;
            return initIdempotent(html, html, options);
        });
    }

    for (const [lang, xmlLang] of [
        ['en', ' en '],
        ['', '\u00a0'],
        ['k', '\u212a'],
        ['&eth;', '&ETH;']
    ]) {
        it(`should preserve different language values: ${JSON.stringify([lang, xmlLang])}`, () => {
            // In foreign content xml:lang takes precedence over lang, so dropping it
            // must not change the language, even when one of the values is invalid.
            const html = `<svg lang="${lang}" xml:lang="${xmlLang}"></svg>`;
            return initIdempotent(html, html, options);
        });
    }

    it('should compare decoded language values using ASCII case folding', () => {
        return initIdempotent(
            '<svg lang="en-US" xml:lang="&#69;n-us"></svg><p lang="" xml:lang=""></p>',
            '<svg lang="en-US"></svg><p lang=""></p>',
            options
        );
    });

    it('should not decode language values twice when the parser decodes entities', () => {
        return initWithPostHtmlOptions(
            '<svg lang="&amp;#101;n" xml:lang="en"></svg>',
            '<svg lang="&#101;n" xml:lang="en"></svg>',
            options,
            { decodeEntities: true }
        );
    });

    for (const attributes of [
        'lang="en" xml:lang="en" XML:LANG="fr"',
        'lang="fr" LANG="en" xml:lang="en"',
        'xmlns="http://www.w3.org/1999/xhtml" XMLNS="http://example.com/ns"'
    ]) {
        it(`should preserve case variants of duplicate attributes: ${attributes}`, () => {
            const html = `<html ${attributes}></html>`;
            return initIdempotent(html, html, options);
        });
    }

    it('should preserve XML declarations and case-sensitive attributes in XML mode', () => {
        const xml = '<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en" XML:LANG="fr"></html>';
        return initIdempotent(xml, xml, options, { xmlMode: true });
    });

    it('should only modify XML leftovers and preserve other attribute names', () => {
        return initIdempotent(
            '<HTML XMLNS="http://www.w3.org/1999/xhtml" LANG="en" XML:LANG="EN"><svg viewBox="0 0 10 10"></svg></HTML>',
            '<HTML LANG="en"><svg viewBox="0 0 10 10"></svg></HTML>',
            options
        );
    });

    it('should not expose an executable type from duplicate script attributes', () => {
        const html = '<script type="application/json" TYPE="text/javascript">alert(1)</script>';
        return initIdempotent(html, html, options);
    });

    it('should preserve valueless language attributes', () => {
        const html = '<p lang xml:lang></p>';
        return initIdempotent(html, html, options, { recognizeNoValueAttribute: true });
    });

    it('should be enabled by the max preset', () => {
        return init(
            '<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en"></html>',
            '<html lang="en"></html>',
            { removeXmlLeftovers: maxPreset.removeXmlLeftovers }
        );
    });
});
