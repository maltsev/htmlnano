import type { HtmlnanoPreset } from '../types';

/**
 * Preserve browser-parsed HTML behavior under standards-compliant HTML parsing.
 * Source serialization and XHTML/XML compatibility are not guaranteed.
 */
export default {
    /* ----------------------------------------
     * Attributes
     * ---------------------------------------- */
    // normalize the case of attribute names and values
    // normalizeAttributeValues will also normalize property value with invalid value default
    // See https://html.spec.whatwg.org/#invalid-value-default
    normalizeAttributeValues: true,
    // Attribute presence and source spelling are not guaranteed when browser behavior is unchanged.
    removeEmptyAttributes: true,
    collapseAttributeWhitespace: true,
    // removeRedundantAttributes will remove attributes when missing value default matches the attribute's value
    // See https://html.spec.whatwg.org/#missing-value-default
    removeRedundantAttributes: false,
    // removeXmlLeftovers removes XHTML-era leftovers meaningless in HTML documents.
    // It remains disabled here, but the safe contract does not guarantee XHTML/XML compatibility.
    removeXmlLeftovers: false,
    // Equivalent HTML syntax changes, including collapsed boolean attributes, are allowed.
    // collapseBooleanAttributes will also collapse those default state can be omitted.
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
    // Empty/redundant whitespace may be removed when browser-parsed behavior is preserved.
    collapseWhitespace: 'conservative',
    // Character-reference spelling is source serialization, not part of the compatibility promise.
    minifyCharacterReferences: true,
    // Comments covered by the safe mode are an explicit exception to DOM/source preservation.
    removeComments: 'safe',
    removeEmptyElements: false,
    minifyConditionalComments: false,
    // Omit eligible end tags, but retain every explicit start tag.
    removeOptionalTags: {
        removeStartTags: false
    },
    normalizeDoctype: false,
    removeAttributeQuotes: true,
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
