import { expect } from 'expect';
import posthtml from 'posthtml';
import htmlnano, { loadConfig } from '../dist/index.mjs';
import safePreset from '../dist/presets/safe.mjs';
import ampSafePreset from '../dist/presets/ampSafe.mjs';
import maxPreset from '../dist/presets/max.mjs';
import { HtmlnanoOptions } from '../src';

describe('[htmlnano]', () => {
    it('should do nothing if all modules are disabled', () => {
        return init(
            ' <div>      <!-- t --> </div> ',
            ' <div>      <!-- t --> </div> '
        );
    });

    it('should throw an error if the module is not defined', () => {
        return init(
            '<div></div>',
            '<b></b>',
            // @ts-expect-error invalid type
            { notDefinedModule: true }
        ).catch((error: unknown) => {
            expect((error as Error).message).toBe('Module "notDefinedModule" is not defined');
        });
    });

    it('getRequiredOptionalDependencies', () => {
        expect(htmlnano.getRequiredOptionalDependencies({
            minifyUrls: true,
            minifyJs: {}
        })).toStrictEqual(['relateurl', 'srcset', 'terser']);
    });

    it('htmlMinimizerWebpackPluginMinify', () => {
        return htmlnano.htmlMinimizerWebpackPluginMinify({
            'index.html': '<div></div>'
        }, {})
            .then(result => expect(result).toStrictEqual({
                code: '<div></div>'
            }));
    });

    it('should not treat skipConfigLoading as a module name', () => {
        return init('<div></div>', '<div></div>', { skipConfigLoading: true });
    });

    it('should not treat configFile as a module name', () => {
        return init('<div></div>', '<div></div>', { skipConfigLoading: true, configPath: './test/testrc.json' });
    });
});

describe('loadConfig()', () => {
    it('should return empty options and safe preset if nothing set', () => {
        expect(loadConfig()).toEqual([
            {},
            safePreset
        ]);
    });

    it('should not override the run options or preset', () => {
        expect(loadConfig({ foo: 'bar', configPath: './test/testrc.json' }, ampSafePreset)).toEqual([
            { foo: 'bar' },
            ampSafePreset
        ]);
    });

    it('should load options and preset from RC files', () => {
        expect(loadConfig({ configPath: './test/testrc.json' }, undefined)).toEqual([
            { foo: 'baz' },
            maxPreset
        ]);
    });

    it('should not load options and preset from RC files if skipConfigLoading is true', () => {
        const options = { skipConfigLoading: true, configPath: './test/testrc.json' };
        const loaded = loadConfig(options, undefined);

        expect(loaded).toEqual([{}, safePreset]);
        expect(options).toEqual({ skipConfigLoading: true, configPath: './test/testrc.json' });
    });
});

export function init(html: string, minifiedHtml: string, options?: HtmlnanoOptions): Promise<void> {
    return posthtml([htmlnano(options, {})]).process(html).then((result) => {
        expect(result.html).toBe(minifiedHtml);
    });
}
