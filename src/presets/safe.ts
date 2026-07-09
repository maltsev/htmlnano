import type { HtmlnanoPreset } from '../types';

/**
 * Minify HTML in a safe way without breaking anything.
 */
export default {
    /* ----------------------------------------
     * Attributes
     * ---------------------------------------- */
    // normalize the case of attribute names and values
    // normalizeAttributeValues will also normalize property value with invalid value default
    // See https://html.spec.whatwg.org/#invalid-value-default
    normalizeAttributeValues: true,
    removeEmptyAttributes: true,
    collapseAttributeWhitespace: true,
    // removeRedundantAttributes will remove attributes when missing value default matches the attribute's value
    // See https://html.spec.whatwg.org/#missing-value-default
    removeRedundantAttributes: false,
    // collapseBooleanAttributes will also collapse those default state can be omitted
    collapseBooleanAttributes: {
        amphtml: false
    },
    deduplicateAttributeValues: true,

    minifyAttributes: {
        metaContent: true,
        redundantWhitespaces: 'safe'
    },
    minifyUrls: false,

    sortAttributes: false,
    sortAttributesWithLists: 'alphabetical',

    /* ----------------------------------------
     * Minify HTML content
     * ---------------------------------------- */
    collapseWhitespace: 'conservative',
    minifyCharacterReferences: true,
    removeComments: 'safe',
    removeEmptyElements: false,
    minifyConditionalComments: false,
    removeOptionalTags: false,
    normalizeDoctype: false,
    removeAttributeQuotes: false,
    /* ----------------------------------------
     * Minify inline <style>, <script> and <svg> tag
     * ---------------------------------------- */
    mergeStyles: false,
    mergeScripts: false,
    minifyCss: {
        preset: 'default'
    },
    minifyHtmlTemplate: true,
    minifyJs: {},
    minifyJson: true,
    minifySvg: {
        plugins: [
            {
                name: 'preset-default',
                params: {
                    overrides: {
                        collapseGroups: false,
                        convertShapeToPath: false
                    }
                }
            }
        ]
    },
    removeUnusedCss: false,

    /* ----------------------------------------
     * Miscellaneous
     * ---------------------------------------- */
    custom: (tree, _options) => tree
} as HtmlnanoPreset;
