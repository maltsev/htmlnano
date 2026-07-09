import { init } from '../htmlnano.ts';
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

    it('should be enabled by the max preset', () => {
        return init(
            '<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en"></html>',
            '<html lang="en"></html>',
            { removeXmlLeftovers: maxPreset.removeXmlLeftovers }
        );
    });
});
