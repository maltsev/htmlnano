import type { Options as CssNanoOptions } from 'cssnano';
import type { UserDefinedOptions as PurgeCSSOptions } from 'purgecss';
import type { Config as SvgoOptimizeOptions } from 'svgo';
import type { MinifyOptions } from 'terser';

import type {
    HtmlnanoMinifyCssOptions,
    HtmlnanoMinifyJsOptions,
    HtmlnanoMinifySvgOptions,
    HtmlnanoOptions,
    HtmlnanoPurgeCssOptions,
    RemoveOptionalTagsOptions
} from '../../src/types.js';

type AssertTrue<T extends true> = T;
type AssertAllTrue<T extends Record<string, true>> = T;
type IsAssignable<From, To> = [From] extends [To] ? true : false;
type IsMutuallyAssignable<Left, Right> = IsAssignable<Left, Right> extends true
    ? IsAssignable<Right, Left>
    : false;
type IsEqual<Left, Right> = IsMutuallyAssignable<Left, Right>;

type UpstreamPurgeCssOptions = Omit<PurgeCSSOptions, 'content' | 'css' | 'extractors'>;
type LocalPurgeCssOptions = Omit<HtmlnanoPurgeCssOptions, 'tool'>;
type ExactPurgeCssKeys
    = | 'fontFace'
        | 'keyframes'
        | 'output'
        | 'rejected'
        | 'rejectedCss'
        | 'stdin'
        | 'stdout'
        | 'variables'
        | 'blocklist'
        | 'skippedContentGlobs'
        | 'dynamicAttributes';
type CompatiblePurgeCssKeys = 'defaultExtractor' | 'safelist' | 'sourceMap';

export type CssnanoOptionsAcceptedByAlias = AssertTrue<IsAssignable<CssNanoOptions, HtmlnanoMinifyCssOptions>>;
export type TerserOptionsAcceptedByAlias = AssertTrue<IsAssignable<MinifyOptions, HtmlnanoMinifyJsOptions>>;
export type SvgoOptionsAcceptedByAlias = AssertTrue<IsAssignable<SvgoOptimizeOptions, HtmlnanoMinifySvgOptions>>;

export type HtmlnanoAcceptsCssnanoOptions = AssertTrue<IsAssignable<{
    minifyCss: CssNanoOptions;
}, HtmlnanoOptions>>;
export type HtmlnanoAcceptsTerserOptions = AssertTrue<IsAssignable<{
    minifyJs: MinifyOptions;
}, HtmlnanoOptions>>;
export type HtmlnanoAcceptsSvgoOptions = AssertTrue<IsAssignable<{
    minifySvg: SvgoOptimizeOptions;
}, HtmlnanoOptions>>;

export type PurgeCssToolIsLiteral = AssertTrue<IsEqual<HtmlnanoPurgeCssOptions['tool'], 'purgeCSS'>>;
export type PurgeCssLocalKeysAreCovered = AssertTrue<IsEqual<keyof LocalPurgeCssOptions, ExactPurgeCssKeys | CompatiblePurgeCssKeys>>;
export type PurgeCssLocalKeysExistUpstream = AssertTrue<IsAssignable<keyof LocalPurgeCssOptions, keyof UpstreamPurgeCssOptions>>;

export type PurgeCssExactFieldCompatibility = AssertAllTrue<{
    [Key in ExactPurgeCssKeys]: IsMutuallyAssignable<LocalPurgeCssOptions[Key], UpstreamPurgeCssOptions[Key]>;
}>;

export type PurgeCssCompatibleFieldCompatibility = AssertAllTrue<{
    defaultExtractor: AssertTrue<IsMutuallyAssignable<LocalPurgeCssOptions['defaultExtractor'], UpstreamPurgeCssOptions['defaultExtractor']>>;
    safelist: AssertTrue<IsMutuallyAssignable<LocalPurgeCssOptions['safelist'], UpstreamPurgeCssOptions['safelist']>>;
    sourceMap: AssertTrue<IsAssignable<LocalPurgeCssOptions['sourceMap'], UpstreamPurgeCssOptions['sourceMap']>>;
}>;

export type HtmlnanoAcceptsPurgeCssOptions = AssertTrue<IsAssignable<{
    removeUnusedCss: HtmlnanoPurgeCssOptions;
}, HtmlnanoOptions>>;

export type RemoveOptionalTagsOptionShape = AssertTrue<IsEqual<
    NonNullable<HtmlnanoOptions['removeOptionalTags']>,
    boolean | RemoveOptionalTagsOptions
>>;
export type HtmlnanoAcceptsConservativeOptionalTags = AssertTrue<IsAssignable<{
    removeOptionalTags: { removeStartTags: false };
}, HtmlnanoOptions>>;
