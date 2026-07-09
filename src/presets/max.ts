import type { HtmlnanoPreset } from '../types.js';
import safePreset from './safe';

/**
 * Maximal minification (might break some pages)
 */
export default {
    ...safePreset,
    removeRedundantAttributes: true,
    sortAttributes: true,
    collapseWhitespace: 'all',
    minifyCharacterReferences: {
        decodeAll: true
    },
    removeComments: 'all',
    removeEmptyElements: true,
    minifyConditionalComments: true,
    removeOptionalTags: true,
    removeAttributeQuotes: true,
    minifyAttributes: {
        metaContent: true,
        redundantWhitespaces: 'aggressive'
    },
    mergeScripts: true,
    mergeStyles: true,
    removeUnusedCss: {
        tool: 'purgeCSS'
    },
    minifyCss: {
        preset: 'default'
    },
    minifySvg: {}
} as HtmlnanoPreset;
