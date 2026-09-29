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
    // Opt-in: removing a redundant attribute changes selectors and hasAttribute(),
    // while the cached corpus showed only about 0.03% raw savings.
    removeRedundantAttributes: false,
    // Opt-in: XML leftovers do not affect browser HTML behavior, but removing them
    // erases source compatibility metadata.
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
    // URL rewriting is context-dependent and requires a caller-supplied base URL.
    minifyUrls: false,

    // Attribute sorting left raw size unchanged but hurt cached-corpus compression:
    // alphabetical was about +0.94% gzip/+0.65% Brotli; frequency also regressed both.
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
    // Whether an empty element is unused depends on application behavior.
    removeEmptyElements: false,
    minifyConditionalComments: false,
    // Omit eligible end tags, but retain every explicit start tag.
    removeOptionalTags: {
        removeStartTags: false
    },
    // Canonicalize only an already-short HTML5 doctype, preserving document mode.
    normalizeDoctype: 'html5',
    removeAttributeQuotes: true,
    /* ----------------------------------------
     * Minify inline <style>, <script> and <svg> tag
     * ---------------------------------------- */
    // Merging changes DOM node boundaries and observable CSSOM/script execution;
    // special at-rules and script-boundary behavior can also prevent safe merging.
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
    // Determining whether CSS is unused requires application-level knowledge.
    removeUnusedCss: false,

    /* ----------------------------------------
     * Miscellaneous
     * ---------------------------------------- */
    custom: (tree, _options) => tree
} as HtmlnanoPreset;
